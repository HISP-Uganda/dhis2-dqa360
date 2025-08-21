import { useDataEngine } from '@dhis2/app-runtime'
import { useAuditLog } from './auditService'

// Utility: parse CSV to rows of objects (simple, streaming-friendly for moderate files)
const parseCSV = async (file) => {
    const text = await file.text()
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean)
    const headers = headerLine.split(',').map(h => h.trim())
    return lines.map(line => {
        const cols = line.split(',')
        const row = {}
        headers.forEach((h, i) => (row[h] = (cols[i] ?? '').trim()))
        return row
    })
}

// Lazy import XLSX only when needed
const parseExcel = async (file) => {
    let XLSX
    try {
        XLSX = await import('xlsx')
    } catch (e) {
        throw new Error('xlsx package not installed. Run: yarn add xlsx')
    }
    const data = new Uint8Array(await file.arrayBuffer())
    const wb = XLSX.read(data, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

// Expected columns (flexible mapping handled by options)
// Minimal: dataElement, categoryOptionCombo, orgUnit, period, value

export const useImportExportService = () => {
    const engine = useDataEngine()
    const { logEvent } = useAuditLog()

    const saveRowsToRegister = async ({ assessmentId, datasetKey, rows }) => {
        // datasetKey: 'register' | 'summary' | 'reported' | 'corrections'
        // Save into unified 'dqa360' namespace under direct assessmentId key
        const namespace = 'dqa360'
        const key = `${assessmentId}`
        try {
            // Read current
            const res = await engine.query({ data: { resource: `dataStore/${namespace}/${key}` } })
            const assessment = res.data || { id: assessmentId }
            assessment.localDatasets = assessment.localDatasets || {}
            assessment.localDatasets[datasetKey] = assessment.localDatasets[datasetKey] || {}
            assessment.localDatasets[datasetKey].rows = rows
            assessment.lastUpdated = new Date().toISOString()

            await engine.mutate({ resource: `dataStore/${namespace}/${key}`, type: 'update', data: assessment })

            await logEvent({
                action: 'dqa.import',
                entityType: 'dataset',
                entityId: `${assessmentId}:${datasetKey}`,
                entityName: datasetKey,
                status: 'success',
                message: `Imported ${rows.length} rows into ${datasetKey}`,
            })
        } catch (error) {
            try {
                await logEvent({
                    action: 'dqa.import',
                    entityType: 'dataset',
                    entityId: `${assessmentId}:${datasetKey}`,
                    entityName: datasetKey,
                    status: 'failure',
                    message: error?.message || 'Import failed',
                })
            } catch (_) {}
            throw error
        }
    }

    const importFile = async ({ file, format, datasetKey, mapping, assessmentId }) => {
        // format: 'csv' | 'excel' | 'json'
        // mapping: { dataElement, categoryOptionCombo, orgUnit, period, value }
        let rows = []
        if (format === 'csv') rows = await parseCSV(file)
        else if (format === 'excel') rows = await parseExcel(file)
        else if (format === 'json') rows = JSON.parse(await file.text())
        else throw new Error(`Unsupported format: ${format}`)

        // Normalize rows using mapping
        const norm = rows.map(r => ({
            dataElement: r[mapping.dataElement] ?? r.dataElement,
            categoryOptionCombo: r[mapping.categoryOptionCombo] ?? r.categoryOptionCombo ?? 'default',
            orgUnit: r[mapping.orgUnit] ?? r.orgUnit,
            period: r[mapping.period] ?? r.period,
            value: Number(r[mapping.value] ?? r.value ?? 0),
        }))

        await saveRowsToRegister({ assessmentId, datasetKey, rows: norm })
        return { count: norm.length }
    }

    const exportData = async ({ assessmentId, datasetKey, format }) => {
        const namespace = 'dqa360'
        const key = `${assessmentId}`
        const res = await engine.query({ data: { resource: `dataStore/${namespace}/${key}` } })
        const assessment = res.data || {}
        const rows = assessment?.localDatasets?.[datasetKey]?.rows || []

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
            return blob
        }
        if (format === 'csv') {
            const headers = ['dataElement','categoryOptionCombo','orgUnit','period','value']
            const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => r[h]).join(','))).join('\n')
            return new Blob([csv], { type: 'text/csv' })
        }
        if (format === 'excel') {
            const XLSX = await import('xlsx')
            const ws = XLSX.utils.json_to_sheet(rows)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'DQA')
            // Return a Blob for browser download
            const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
            return new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        }
        throw new Error(`Unsupported export format: ${format}`)
    }

    return { importFile, exportData }
}