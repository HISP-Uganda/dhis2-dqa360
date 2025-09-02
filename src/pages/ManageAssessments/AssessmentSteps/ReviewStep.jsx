import React, { useMemo, useState } from 'react'
import { Button, NoticeBox, Tag, AlertBar, Modal, ModalTitle, ModalContent, ModalActions } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useDataEngine } from '@dhis2/app-runtime'
import jsPDF from 'jspdf'
import { useNavigate } from 'react-router-dom'
import SmsCommandFixer from '../../../components/SmsCommandFixer'

/** ---------- FIX: helpers to safely render ids/names/counts ---------- */
const asId = (v) => (typeof v === 'string' ? v : (v?.id || v?.uid || v?.code || ''))
const asName = (v) => (typeof v === 'string' ? v : (v?.displayName || v?.name || v?.shortName || asId(v) || '—'))
const asLabel = (v) => {
    const id = asId(v)
    const nm = asName(v)
    return id && nm && nm !== id ? `${nm} (${id})` : (id || nm || '—')
}
const asCount = (x) => (Array.isArray(x) ? x.length : (typeof x === 'number' ? x : 0))
/** ------------------------------------------------------------------- */

const prettyType = (t) => {
    const map = { register: 'Register', summary: 'Summary', reported: 'Reported', corrected: 'Corrected' }
    return map[(t || '').toLowerCase()] || t
}

const gatherFrom = (data) => {
    const creation = data?.creationPayload || {}
    const mp = creation?.mappingPayload || data?.mappingPayload || data?.handoff?.mappingPayload || data?.savedPayload?.mappingPayload || {}
    const elementsMapping = mp?.elementsMapping || data?.dataElementMappings || creation?.dataElementMappings || []
    // Include all known places where created datasets may be stored
    const created =
        creation?.localDatasets?.createdDatasets ||
        data?.createdDatasets ||
        data?.dqaDatasetsCreated ||
        data?.localDatasets?.createdDatasets ||
        data?.handoff?.createdDatasets ||
        data?.localDatasetsMetadata?.createdDatasets ||
        data?.creationMetadata?.createdDatasets ||
        data?.savedPayload?.localDatasets?.createdDatasets ||
        []
    const smsCommands =
        (data?.sms?.commands) ||
        (creation?.sms?.commands) ||
        (Array.isArray(created) ? created : Object.values(created || {})).map((d) => d?.sms).filter(Boolean) ||
        []
    const selectedDatasets = Array.isArray(data?.selectedDatasets)
        ? data.selectedDatasets
        : (Array.isArray(data?.datasets) ? data.datasets : [])
    const selectedOrgUnits = Array.isArray(data?.selectedOrgUnits)
        ? data.selectedOrgUnits
        : (Array.isArray(data?.orgUnits) ? data.orgUnits : [])
    const selectedDataElements = Array.isArray(data?.selectedDataElements) ? data.selectedDataElements : (Array.isArray(data?.dataElements) ? data.dataElements : [])
    return { elementsMapping, created, smsCommands, selectedDatasets, selectedOrgUnits, selectedDataElements, mappingPayload: mp }
}

const ElementCell = ({ mappingForType }) => {
    if (!mappingForType) {
        return <div style={cellNoItem}>—</div>
    }
    const list = mappingForType.dataElements || []
    const transform = mappingForType.transform
    return (
        <div>
            {list.map((de, i) => {
                // Handle categoryOptionCombo safely - it could be an object with id, or just a string id
                const cocId = typeof de?.categoryOptionCombo === 'object'
                    ? de.categoryOptionCombo?.id
                    : de?.categoryOptionCombo
                const coc = cocId ? `@${cocId}` : ''
                const expr = de?.expression || (de?.id ? `#{${de.id}${cocId ? `.${cocId}` : ''}}` : '')
                return (
                    <div key={i} style={{ marginBottom: 6 }}>
                        <div><code>{String(de.code ?? '')}</code>{coc && <code>{coc}</code>} — “{de.name || '—'}”</div>
                        <div style={{ fontSize: 12, color: '#666' }}>• expr <code>{expr}</code></div>
                    </div>
                )
            })}
            {transform && (
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                    • <span>transform:</span>{' '}
                    <code>{transform.type === 'sum' ? 'sum' : transform.expr ? `expr = ${transform.expr}` : transform.type}</code>
                </div>
            )}
        </div>
    )
}

const cellNoItem = {
    padding: 8,
    border: '1px dashed #ddd',
    background: '#fafafa',
    textAlign: 'center',
    color: '#999',
}

const ReviewStep = ({
                        assessmentData,
                        onBack,
                        saving,
                        onSave,
                        userInfo,
                    }) => {
    const [saveStatus, setSaveStatus] = useState(null)
    const [saveMessage, setSaveMessage] = useState('')
    const [isDownloading, setIsDownloading] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)
    const [isSavingLocal, setIsSavingLocal] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewText, setPreviewText] = useState('')

    const {
        elementsMapping,
        created,
        smsCommands,
        selectedDatasets,
        selectedOrgUnits,
        selectedDataElements,
        mappingPayload,
    } = useMemo(() => {
        const result = gatherFrom(assessmentData || {})
        console.log('ReviewStep - gatherFrom result:', {
            created: result.created,
            createdLength: Array.isArray(result.created) ? result.created.length : Object.keys(result.created || {}).length,
            assessmentDataKeys: Object.keys(assessmentData || {}),
            dqaDatasetsCreated: assessmentData?.dqaDatasetsCreated,
            dataElementMappings: assessmentData?.dataElementMappings
        })
        return result
    }, [assessmentData])

    // Normalize created datasets to an array for consistent rendering
    const createdList = useMemo(() => (Array.isArray(created) ? created : Object.values(created || {})), [created])

    const engine = useDataEngine()
    const navigate = useNavigate()

    const isReady = useMemo(() => {
        const normCreated = Array.isArray(created) ? created : Object.values(created || {})
        
        // Check for all 4 dataset types
        const requiredTypes = ['register', 'summary', 'reported', 'corrected']
        const has4 = requiredTypes.every((t) => 
            normCreated.find((d) => (String(d.datasetType || d.type || '').toLowerCase()) === t && (d.id || d.datasetId))
        )
        
        // Check for element mappings
        const hasLinks = (elementsMapping || []).length > 0
        
        // Check for selected datasets and org units
        const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets
        const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
        
        // Check for org unit mappings
        const hasOrgUnitMappings = (
            Array.isArray(assessmentData?.orgUnitMapping?.mappings) && assessmentData.orgUnitMapping.mappings.length > 0
        ) || (
            Array.isArray(assessmentData?.orgUnitMappings) && assessmentData.orgUnitMappings.length > 0
        )
        
        // Basic requirements
        const hasName = !!assessmentData?.name
        const hasSelectedDatasets = (dsSel?.length || 0) > 0
        const hasSelectedOrgUnits = (ouSel?.length || 0) > 0
        
        // Debug logging
        console.log('ReviewStep isReady check:', {
            hasName,
            hasSelectedDatasets: hasSelectedDatasets,
            selectedDatasetsCount: dsSel?.length || 0,
            hasSelectedOrgUnits: hasSelectedOrgUnits,
            selectedOrgUnitsCount: ouSel?.length || 0,
            has4DatasetsCreated: has4,
            createdDatasetsCount: normCreated.length,
            createdDatasetTypes: normCreated.map(d => d.datasetType || d.type),
            hasElementMappings: hasLinks,
            elementMappingsCount: (elementsMapping || []).length,
            hasOrgUnitMappings,
            orgUnitMappingsCount: assessmentData?.orgUnitMapping?.mappings?.length || assessmentData?.orgUnitMappings?.length || 0
        })
        
        return !!(hasName && hasSelectedDatasets && hasSelectedOrgUnits && has4 && hasLinks && hasOrgUnitMappings)
    }, [assessmentData, created, elementsMapping, selectedDatasets, selectedOrgUnits])

    const rows = Array.isArray(elementsMapping) ? elementsMapping : []

    const buildFinalPayload = () => {
        const now = new Date().toISOString()
        const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : (Array.isArray(selectedDatasets) ? selectedDatasets : [])
        const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : (Array.isArray(selectedOrgUnits) ? selectedOrgUnits : [])
        const externalCfg = assessmentData?.externalConfig || assessmentData?.dhis2Config?.info || {}
        
        // Map created datasets to dqaDatasetsCreated shape (correct structure)
        console.log('ReviewStep - buildFinalPayload createdList:', createdList)
        const dqaDatasetsCreated = (createdList || []).map(d => ({
            id: d.id || d.datasetId || null,
            code: d.code,
            name: d.name,
            datasetType: d.datasetType || d.type,
            alias: d.alias || d.name,
            periodType: d.periodType || 'Monthly',
            categoryCombo: d.categoryCombo,
            version: d.version ?? 1,
            description: d.description || '',
            formType: d.formType || 'DEFAULT',
            formName: d.formName || d.name,
            timelyDays: d.timelyDays ?? 15,
            openFuturePeriods: d.openFuturePeriods ?? 0,
            expiryDays: d.expiryDays ?? 0,
            openPeriodsAfterCoEndDate: d.openPeriodsAfterCoEndDate ?? 0,
            aggregationType: d.aggregationType || 'SUM',
            dataElements: d.dataElements || [],
            orgUnits: d.orgUnits || [],
            sharing: d.sharing || {
                publicAccess: 'rw------',
                externalAccess: false,
                userAccesses: [],
                userGroupAccesses: []
            },
            // SMS command structure for new format
            sms: d.sms || {}
        }))

        // Convert mapping rows to dataElementMappings shape (correct structure)
        const dataElementMappings = rows.map((row, idx) => ({
            mappingId: row.mappingId || `map_${idx}`,
            mappingName: row.mappingName || row.dataElementName || row.name || 'Mapping',
            dataElementName: row.dataElementName || row.name || '—',
            valueType: row.valueType || 'NUMBER',
            mappings: (row.mappings || row.map || []).map(m => ({
                dataset: m.dataset || { type: m.datasetType, alias: m.alias, id: m.id },
                dataElements: m.dataElements || [],
                transform: m.transform
            }))
        }))

        // Build the new nested structure
        return {
            id: assessmentData?.id || `assessment_${Date.now()}`,
            structure: 'nested',
            version: '3.0.0',
            createdAt: assessmentData?.createdAt || now,
            lastUpdated: now,
            metadataSource: assessmentData?.metadataSource || 'local',

            // Main details section (correct structure)
            details: {
                name: assessmentData?.name || '',
                description: assessmentData?.description || '',
                assessmentType: assessmentData?.assessmentType || 'baseline',
                status: 'finished', // Always set to finished when saving
                priority: assessmentData?.priority || 'medium',
                frequency: assessmentData?.frequency || 'Monthly',
                period: assessmentData?.period || '',
                startDate: assessmentData?.startDate || '',
                endDate: assessmentData?.endDate || '',
                reportingLevel: assessmentData?.reportingLevel || '',
                dataQualityDimensions: assessmentData?.dataQualityDimensions || ['accuracy'],
                scope: assessmentData?.scope || '',
                objectives: assessmentData?.objectives || '',
                notes: assessmentData?.notes || '',
                tags: assessmentData?.tags || [],
                customFields: assessmentData?.customFields || {},
                notifications: assessmentData?.notifications !== undefined ? assessmentData.notifications : true,
                autoSync: assessmentData?.autoSync !== undefined ? assessmentData.autoSync : true,
                validationAlerts: assessmentData?.validationAlerts !== undefined ? assessmentData.validationAlerts : false,
                historicalComparison: assessmentData?.historicalComparison !== undefined ? assessmentData.historicalComparison : false,
                confidentialityLevel: assessmentData?.confidentialityLevel || 'internal',
                dataRetentionPeriod: assessmentData?.dataRetentionPeriod || '5years',
                baselineAssessmentId: assessmentData?.baselineAssessmentId || null,
                createdBy: userInfo?.displayName || userInfo?.name || null,
                lastModifiedBy: userInfo?.displayName || userInfo?.name || null
            },

            // Connection section (top-level)
            connection: {
                metadataSource: assessmentData?.metadataSource || 'external',
                local: {
                    systemName: 'DHIS2 Local Instance',
                    baseUrl: '',
                    version: '',
                    apiVersion: '',
                    configuredAt: now,
                    timeout: 30000,
                    useSSL: true
                },
                external: {
                    baseUrl: externalCfg.baseUrl || '',
                    version: externalCfg.version || '',
                    apiVersion: externalCfg.apiVersion || '',
                    auth: {
                        type: externalCfg.authType || 'token',
                        username: externalCfg.username || '',
                        tokenRef: externalCfg.tokenRef || ''
                    },
                    connectionStatus: externalCfg.connectionStatus || 'not_tested',
                    lastTested: externalCfg.lastTested || null,
                    lastSuccessfulConnection: externalCfg.lastSuccessfulConnection || null,
                    retryAttempts: externalCfg.retryAttempts || 3
                }
            },

            // Datasets selected (top-level)
            datasetsSelected: dsSel.map(ds => ({
                code: ds.code,
                name: ds.name || ds.displayName,
                shortName: ds.shortName || ds.name,
                periodType: ds.periodType,
                dataSetElements: ds.dataSetElements || ds.dataElements?.length || 0,
                categoryCombo: ds.categoryCombo,
                id: ds.id,
                organisationUnits: ds.organisationUnits || 0
            })),

            // Org unit mappings (top-level)
            orgUnitMappings: Array.isArray(assessmentData?.orgUnitMapping?.mappings)
                ? assessmentData.orgUnitMapping.mappings
                : (assessmentData?.orgUnitMappings || []),

            // DQA datasets created (top-level)
            dqaDatasetsCreated,
            
            // Data element mappings (top-level)
            dataElementMappings
        }
    }

    const downloadFinalPayload = async () => {
        if (isDownloading) return

        try {
            setIsDownloading(true)
            const payload = buildFinalPayload()
            const enhancedPayload = {
                ...payload,
                exportInfo: {
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'DQA360 Assessment Tool',
                    version: '1.0.0',
                    format: 'DQA360-Assessment-JSON',
                    description: 'Complete assessment configuration including datasets, mappings, and SMS commands'
                }
            }
            const blob = new Blob([JSON.stringify(enhancedPayload, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            const timestamp = new Date().toISOString().split('T')[0]
            const safeName = (payload.details?.name || 'assessment').replace(/[^a-zA-Z0-9]/g, '_')
            a.download = `DQA360_${safeName}_${timestamp}.json`
            a.href = url
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            setSaveStatus('success')
            setSaveMessage('Assessment payload downloaded successfully!')
            setTimeout(() => setSaveStatus(null), 3000)
        } catch (error) {
            console.error('Download failed:', error)
            setSaveStatus('error')
            setSaveMessage('Failed to download assessment payload')
            setTimeout(() => setSaveStatus(null), 5000)
        } finally {
            setIsDownloading(false)
        }
    }

    const handleSave = async () => {
        if (saving) return

        try {
            setSaveStatus(null)
            setSaveMessage('')
            const payload = buildFinalPayload()
            
            // Only use the new structure save function
            if (typeof onSave === 'function') {
                await onSave(payload)
                setSaveStatus('success')
                setSaveMessage(`Assessment "${payload.details?.name}" completed and saved successfully! Status: Finished.`)
                navigate('/administration/assessments')
                return
            }

            // Fallback error if no save function provided
            throw new Error('No save function provided')
        } catch (error) {
            console.error('Save failed:', error)
            setSaveStatus('error')
            setSaveMessage(`Failed to save assessment: ${error.message || 'Unknown error'}`)
        }
    }

    const handlePrintSummary = async () => {
        if (isPrinting) return

        try {
            setIsPrinting(true)
            const payload = buildFinalPayload()
            const doc = new jsPDF({ unit: 'pt', format: 'a4' })
            const pageW = doc.internal.pageSize.getWidth()
            const pageH = doc.internal.pageSize.getHeight()
            const margin = 50
            const contentW = pageW - margin * 2
            let y = margin
            const ensureSpace = (need = 20) => {
                if (y + need > pageH - margin) {
                    doc.addPage()
                    y = margin
                }
            }
            const addSpacing = (space = 12) => { y += space }
            const writeLines = (text, { bold = false, font = 'helvetica', size = 12, color = [0, 0, 0], spacing = 18 } = {}) => {
                doc.setFont(font, bold ? 'bold' : 'normal')
                doc.setFontSize(size)
                doc.setTextColor(color[0], color[1], color[2])
                const lines = doc.splitTextToSize(text, contentW)
                for (const ln of lines) {
                    ensureSpace(spacing)
                    doc.text(ln, margin, y)
                    y += spacing
                }
            }

            const primaryColor = [10, 94, 189]
            const secondaryColor = [0, 128, 96]
            const textColor = [60, 60, 60]
            const lightTextColor = [120, 120, 120]

            writeLines('DQA360 Assessment Summary Report', { bold: true, size: 20, color: primaryColor, spacing: 24 })
            addSpacing(8)
            writeLines(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { size: 10, color: lightTextColor, spacing: 14 })
            addSpacing(20)

            writeLines('Assessment Details', { bold: true, size: 16, color: primaryColor, spacing: 20 })
            addSpacing(8)
            const details = [
                { label: 'Name', value: payload.details?.name || '—' },
                { label: 'Description', value: payload.details?.description || '—' },
                { label: 'Period', value: payload.details?.period || '—' },
                { label: 'Frequency', value: payload.details?.frequency || '—' },
                { label: 'Start Date', value: payload.details?.startDate || '—' },
                { label: 'End Date', value: payload.details?.endDate || '—' },
                { label: 'Reporting Level', value: payload.details?.reportingLevel || '—' },
                { label: 'Status', value: 'Finished' },
                { label: 'Completed At', value: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString() }
            ]
            details.forEach(item => { writeLines(`${item.label}: ${item.value}`, { size: 11, color: textColor, spacing: 16 }) })
            addSpacing(20)

            writeLines('Connection Information', { bold: true, size: 16, color: primaryColor, spacing: 20 })
            addSpacing(8)
            writeLines(`Type: ${payload.connection?.metadataSource || 'local'}`, { size: 11, color: textColor, spacing: 16 })
            if (payload.connection?.external) {
                writeLines(`Base URL: ${payload.connection.external.baseUrl || '—'}`, { size: 11, color: textColor, spacing: 16 })
                writeLines(`Version: ${payload.connection.external.version || '—'}`, { size: 11, color: textColor, spacing: 16 })
            }
            addSpacing(20)

            writeLines('Summary Statistics', { bold: true, size: 16, color: primaryColor, spacing: 20 })
            addSpacing(8)
            const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets
            const deSel = Array.isArray(selectedDataElements?.selected) ? selectedDataElements.selected : selectedDataElements
            const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
            const stats = [
                { label: 'Datasets Selected', value: dsSel?.length || 0 },
                { label: 'Data Elements Selected', value: deSel?.length || 0 },
                { label: 'Organisation Units Selected', value: ouSel?.length || 0 },
                { label: 'DQA Datasets Created', value: `${createdList?.length || 0}/4` },
                { label: 'Data Element Mappings', value: rows.length },
                { label: 'SMS Commands', value: (smsCommands || []).length }
            ]
            stats.forEach(stat => { writeLines(`${stat.label}: ${stat.value}`, { size: 11, color: textColor, spacing: 16 }) })
            addSpacing(20)

            if (created && created.length > 0) {
                writeLines('Created DQA Datasets', { bold: true, size: 16, color: primaryColor, spacing: 20 })
                addSpacing(8)
                created.forEach((dataset, index) => {
                    writeLines(`${index + 1}. ${prettyType(dataset.datasetType)} Dataset`, { bold: true, size: 12, color: secondaryColor, spacing: 16 })
                    writeLines(`   Name: ${dataset.name || '—'}`, { size: 10, color: textColor, spacing: 14 })
                    writeLines(`   ID: ${dataset.id || '—'}`, { size: 10, color: textColor, spacing: 14 })
                    writeLines(`   Period Type: ${dataset.periodType || '—'}`, { size: 10, color: textColor, spacing: 14 })
                    addSpacing(8)
                })
                addSpacing(20)
            }

            if (smsCommands && smsCommands.length > 0) {
                writeLines('SMS Commands Summary', { bold: true, size: 16, color: primaryColor, spacing: 20 })
                addSpacing(8)
                smsCommands.forEach((cmd, index) => {
                    writeLines(`${index + 1}. ${prettyType(cmd.datasetType)} SMS Command`, { bold: true, size: 12, color: secondaryColor, spacing: 16 })
                    writeLines(`   Keyword: ${cmd.keyword || '—'}`, { size: 10, color: textColor, spacing: 14 })
                    writeLines(`   Codes: ${cmd.smsCodes?.length || 0}`, { size: 10, color: textColor, spacing: 14 })
                    writeLines(`   Status: ${cmd.created ? 'Created Successfully' : 'Creation Failed'}`, { size: 10, color: cmd.created ? [0, 128, 0] : [255, 0, 0], spacing: 14 })
                    addSpacing(8)
                })
                addSpacing(20)
            }

            if (rows && rows.length > 0) {
                writeLines('Data Element Mappings Summary', { bold: true, size: 16, color: primaryColor, spacing: 20 })
                addSpacing(8)
                writeLines(`Total mappings: ${rows.length}`, { size: 11, color: textColor, spacing: 16 })
                const groupedMappings = rows.reduce((acc, row) => {
                    const binderName = row.binderElement?.name || 'Unknown'
                    if (!acc[binderName]) acc[binderName] = []
                    acc[binderName].push(row)
                    return acc
                }, {})
                Object.entries(groupedMappings).forEach(([binderName, mappings]) => {
                    writeLines(`${binderName}:`, { bold: true, size: 11, color: secondaryColor, spacing: 16 })
                    mappings.forEach(mapping => {
                        const types = ['register', 'summary', 'reported', 'corrected']
                        const mappedTypes = types.filter(type => mapping[type]?.dataElements?.length > 0)
                        writeLines(`   → Mapped to: ${mappedTypes.map(prettyType).join(', ') || 'None'}`, { size: 10, color: textColor, spacing: 14 })
                    })
                    addSpacing(4)
                })
            }

            addSpacing(30)
            writeLines('This report was generated by DQA360 Assessment Tool', { size: 9, color: lightTextColor, spacing: 12 })
            writeLines('For more information, visit the DQA360 documentation', { size: 9, color: lightTextColor, spacing: 12 })

            const timestamp = new Date().toISOString().split('T')[0]
            const safeName = (payload.details?.name || 'assessment').replace(/[^a-zA-Z0-9]/g, '_')
            doc.save(`DQA360_Assessment_Summary_${safeName}_${timestamp}.pdf`)
            setSaveStatus('success')
            setSaveMessage('Assessment summary printed to PDF successfully!')
            setTimeout(() => setSaveStatus(null), 3000)
        } catch (error) {
            console.error('Print failed:', error)
            setSaveStatus('error')
            setSaveMessage('Failed to generate assessment summary')
            setTimeout(() => setSaveStatus(null), 5000)
        } finally {
            setIsPrinting(false)
        }
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16 }}>
            <h1 style={{ margin: '8px 0' }}>Assessment Review</h1>

            {!isReady && (
                <NoticeBox warning title="Not ready to save">
                    Please make sure: name, selected datasets, organisation units, 4 local datasets created, and element mappings are all present.
                </NoticeBox>
            )}

            {(() => {
                const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets
                const deSel = Array.isArray(selectedDataElements?.selected) ? selectedDataElements.selected : selectedDataElements
                const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 8, margin: '12px 0' }}>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Datasets selected</div><div><strong>{dsSel?.length || 0}</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Org Units</div><div><strong>{ouSel?.length || 0}</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Data Elements</div><div><strong>{deSel?.length || 0}</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Created Local datasets</div><div><strong>{createdList?.length || 0}/4</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Cross-dataset links</div><div><strong>{rows.length}</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>SMS Commands</div><div><strong>{(smsCommands || []).length}</strong></div></div>
                    </div>
                )
            })()}

            <h2 style={{ marginTop: 16 }}>Details</h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr>
                        <th style={th}>Field</th>
                        <th style={th}>Value</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr><td style={td}>Name</td><td style={td}>{assessmentData?.name || '—'}</td></tr>
                    <tr><td style={td}>Description</td><td style={td}>{assessmentData?.description || '—'}</td></tr>
                    <tr><td style={td}>Period</td><td style={td}>{assessmentData?.period || '—'}</td></tr>
                    <tr><td style={td}>Frequency</td><td style={td}>{assessmentData?.frequency || '—'}</td></tr>
                    <tr><td style={td}>Start</td><td style={td}>{assessmentData?.startDate || '—'}</td></tr>
                    <tr><td style={td}>End</td><td style={td}>{assessmentData?.endDate || '—'}</td></tr>
                    <tr><td style={td}>Reporting level</td><td style={td}>{assessmentData?.reportingLevel || '—'}</td></tr>
                    <tr><td style={td}>Status</td><td style={td}>
                        <Tag positive icon="✅">Finished</Tag>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                            Assessment will be marked as completed upon saving
                        </div>
                    </td></tr>
                    </tbody>
                </table>
            </div>

            <h2 style={{ marginTop: 16 }}>🎯 Completion Summary</h2>
            <div style={{ 
                background: '#f8f9fa', 
                border: '1px solid #e9ecef', 
                borderRadius: 8, 
                padding: 16, 
                marginBottom: 16 
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#28a745' }}>
                            {createdList?.length || 0}/4
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>DQA Datasets Created</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#007bff' }}>
                            {rows.length}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>Data Element Mappings</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#6f42c1' }}>
                            {(smsCommands || []).filter(cmd => cmd.created).length}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>SMS Commands Active</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fd7e14' }}>
                            {(() => {
                                const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
                                return ouSel?.length || 0
                            })()}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>Org Units Selected</div>
                    </div>
                </div>
                
                {createdList && createdList.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #dee2e6' }}>
                        <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>📊 Created Dataset Links</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                            {createdList.map((dataset, index) => {
                                const baseUrl = assessmentData?.dhis2Config?.info?.baseUrl || assessmentData?.externalConfig?.baseUrl || window.location.origin
                                const datasetUrl = `${baseUrl}/dhis-web-maintenance/#/list/dataSetSection/dataSet`
                                const dataEntryUrl = `${baseUrl}/dhis-web-dataentry/#/datasets/${dataset.id}`
                                
                                return (
                                    <div key={index} style={{ 
                                        background: 'white', 
                                        border: '1px solid #dee2e6', 
                                        borderRadius: 6, 
                                        padding: 12 
                                    }}>
                                        <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: 4 }}>
                                            {prettyType(dataset.datasetType)} Dataset
                                        </div>
                                        <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>
                                            {dataset.name}
                                        </div>
                                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6c757d', marginBottom: 8 }}>
                                            ID: {dataset.id}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <a 
                                                href={datasetUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ 
                                                    fontSize: 11, 
                                                    color: '#007bff', 
                                                    textDecoration: 'none',
                                                    padding: '2px 6px',
                                                    background: '#e7f3ff',
                                                    borderRadius: 3,
                                                    border: '1px solid #b3d9ff'
                                                }}
                                            >
                                                📝 Maintenance
                                            </a>
                                            <a 
                                                href={dataEntryUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ 
                                                    fontSize: 11, 
                                                    color: '#28a745', 
                                                    textDecoration: 'none',
                                                    padding: '2px 6px',
                                                    background: '#e8f5e8',
                                                    borderRadius: 3,
                                                    border: '1px solid #b3e5b3'
                                                }}
                                            >
                                                📊 Data Entry
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            <h2 style={{ marginTop: 16 }}>Connection</h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr>
                        <th style={th}>Field</th>
                        <th style={th}>Value</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr><td style={td}>Type</td><td style={td}>{(assessmentData?.metadataSource || 'local').toLowerCase()}</td></tr>
                    {assessmentData?.dhis2Config?.info && (
                        <>
                            <tr><td style={td}>Base URL</td><td style={td}>{assessmentData.dhis2Config.info.baseUrl || '—'}</td></tr>
                            <tr><td style={td}>Version</td><td style={td}>{assessmentData.dhis2Config.info.version || '—'}</td></tr>
                            <tr><td style={td}>API</td><td style={td}>{assessmentData.dhis2Config.info.apiVersion || '—'}</td></tr>
                        </>
                    )}
                    </tbody>
                </table>
            </div>

            <h2 style={{ marginTop: 16 }}>Datasets Selected</h2>
            {(() => {
                const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets
                return !dsSel || dsSel.length === 0 ? (
                    <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                <th style={th}>ID</th>
                                <th style={th}>Code</th>
                                <th style={th}>Name</th>
                                <th style={th}>PeriodType</th>
                            </tr>
                            </thead>
                            <tbody>
                            {dsSel.map((d, i) => (
                                <tr key={i}>
                                    <td style={td}><code>{d.id || '—'}</code></td>
                                    <td style={td}><code>{d.code || '—'}</code></td>
                                    <td style={td}>{d.name || d.displayName || '—'}</td>
                                    <td style={td}>{d.periodType || '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            <h2 style={{ marginTop: 16 }}>DataElements Selected</h2>
            {(() => {
                const deSel = Array.isArray(selectedDataElements?.selected) ? selectedDataElements.selected : selectedDataElements
                return !deSel || deSel.length === 0 ? (
                    <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                <th style={th}>ID</th>
                                <th style={th}>Code</th>
                                <th style={th}>Name</th>
                                <th style={th}>Value Type</th>
                            </tr>
                            </thead>
                            <tbody>
                            {deSel.slice(0, 200).map((d, i) => (
                                <tr key={i}>
                                    <td style={td}><code>{d.id || '—'}</code></td>
                                    <td style={td}><code>{d.code || '—'}</code></td>
                                    <td style={td}>{d.name || '—'}</td>
                                    <td style={td}>{d.valueType || '—'}</td>
                                </tr>
                            ))}
                            {deSel.length > 200 && (
                                <tr><td style={td} colSpan={4}>… {deSel.length - 200} more</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            <h2 style={{ marginTop: 16 }}>OrganisationUnits Selected</h2>
            {(() => {
                const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
                return !ouSel || ouSel.length === 0 ? (
                    <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                <th style={th}>ID</th>
                                <th style={th}>Code</th>
                                <th style={th}>Name</th>
                                <th style={th}>Level</th>
                            </tr>
                            </thead>
                            <tbody>
                            {ouSel.slice(0, 200).map((o, i) => (
                                <tr key={i}>
                                    <td style={td}><code>{o.id || '—'}</code></td>
                                    <td style={td}><code>{o.code || '—'}</code></td>
                                    <td style={td}>{o.name || '—'}</td>
                                    <td style={td}>{o.level ?? '—'}</td>
                                </tr>
                            ))}
                            {ouSel.length > 200 && (
                                <tr><td style={td} colSpan={4}>… {ouSel.length - 200} more</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            <h2 style={{ marginTop: 16 }}>OrgUnit Mapping</h2>
            {(() => {
                const mappings = assessmentData?.orgUnitMapping?.mappings || assessmentData?.orgUnitMappings || []
                const metaSource = (assessmentData?.metadataSource || 'local').toLowerCase()
                
                if (mappings.length === 0) {
                    return (
                        <div style={{ padding: 8, border: '1px solid #eee', color: '#666' }}>
                            {metaSource === 'external' ? 'No mappings configured' : 'Not required for local metadata source'}
                        </div>
                    )
                }
                
                return (
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                            {mappings.length} mapping{mappings.length !== 1 ? 's' : ''} configured ({metaSource} metadata source)
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                <th style={th}>Source OrgUnit</th>
                                <th style={th}>Target OrgUnit</th>
                                <th style={th}>Details</th>
                            </tr>
                            </thead>
                            <tbody>
                            {mappings.slice(0, 500).map((m, i) => {
                                // Handle both simple and enriched mapping formats
                                const sourceId = m.source || m.sourceId || m.external?.id
                                const targetId = m.target || m.targetId || m.local?.id
                                const sourceDetails = m.external || (typeof m.source === 'object' ? m.source : null)
                                const targetDetails = m.local || (typeof m.target === 'object' ? m.target : null)
                                
                                return (
                                    <tr key={i}>
                                        <td style={td}>
                                            <div style={{ fontWeight: 500 }}>
                                                {sourceDetails?.name || sourceDetails?.displayName || sourceId || '—'}
                                            </div>
                                            {sourceDetails?.code && (
                                                <div style={{ fontSize: 11, color: '#666' }}>Code: {sourceDetails.code}</div>
                                            )}
                                            <div style={{ fontSize: 11, color: '#888' }}>{sourceId}</div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ fontWeight: 500 }}>
                                                {targetDetails?.name || targetDetails?.displayName || targetId || '—'}
                                            </div>
                                            {targetDetails?.code && (
                                                <div style={{ fontSize: 11, color: '#666' }}>Code: {targetDetails.code}</div>
                                            )}
                                            <div style={{ fontSize: 11, color: '#888' }}>{targetId}</div>
                                        </td>
                                        <td style={td}>
                                            {sourceDetails?.level && (
                                                <div style={{ fontSize: 11, color: '#666' }}>Level: {sourceDetails.level}</div>
                                            )}
                                            {sourceDetails?.parent?.name && (
                                                <div style={{ fontSize: 11, color: '#666' }}>Parent: {sourceDetails.parent.name}</div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {mappings.length > 500 && (
                                <tr><td style={td} colSpan={3}>… {mappings.length - 500} more</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            <h2 style={{ marginTop: 16 }}>Created Local Datasets ({createdList?.length || 0})</h2>
            {(!createdList || createdList.length === 0) ? (
                <div style={{ padding: 8, border: '1px solid #eee' }}>No created datasets</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                        Complete dataset objects with full metadata and configuration
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={th}>Type</th>
                            <th style={th}>Dataset Details</th>
                            <th style={th}>Configuration</th>
                            <th style={th}>Elements & Org Units</th>
                            <th style={th}>Status & Metadata</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(createdList || []).map((d, i) => {
                            // Extract full dataset information
                            const datasetInfo = d.info || d
                            const elementsCount = d.elementsCount ?? asCount(d.dataElements) ?? asCount(d.elements) ?? asCount(datasetInfo.dataElements)
                            const orgUnitsCount = d.orgUnitsCount ?? asCount(d.orgUnits) ?? asCount(datasetInfo.orgUnits)
                            
                            return (
                                <tr key={i}>
                                    <td style={td}>
                                        <div style={{ fontWeight: 600, color: '#1976d2' }}>
                                            {prettyType(d.datasetType || d.type)}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                                            {d.alias || d.formName || 'Default'}
                                        </div>
                                    </td>
                                    <td style={td}>
                                        <div style={{ fontWeight: 500 }}>{datasetInfo.name || d.name}</div>
                                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                                            Code: <code>{datasetInfo.code || d.code}</code>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                                            UID: <code>{datasetInfo.id || d.id || d.datasetId || '—'}</code>
                                        </div>
                                        {(datasetInfo.description || d.description) && (
                                            <div style={{ fontSize: 11, color: '#666', marginTop: 2, fontStyle: 'italic' }}>
                                                {datasetInfo.description || d.description}
                                            </div>
                                        )}
                                    </td>
                                    <td style={td}>
                                        <div style={{ fontSize: 12 }}>
                                            <div><strong>Period:</strong> {datasetInfo.periodType || d.periodType || 'Monthly'}</div>
                                            <div><strong>Form:</strong> {datasetInfo.formType || d.formType || 'DEFAULT'}</div>
                                            {(datasetInfo.timelyDays ?? d.timelyDays) && (
                                                <div><strong>Timely Days:</strong> {datasetInfo.timelyDays ?? d.timelyDays}</div>
                                            )}
                                            {(datasetInfo.expiryDays ?? d.expiryDays) && (
                                                <div><strong>Expiry Days:</strong> {datasetInfo.expiryDays ?? d.expiryDays}</div>
                                            )}
                                            {(datasetInfo.categoryCombo || d.categoryCombo) && (
                                                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                                                    Category: {typeof (datasetInfo.categoryCombo || d.categoryCombo) === 'object' 
                                                        ? (datasetInfo.categoryCombo || d.categoryCombo).name 
                                                        : (datasetInfo.categoryCombo || d.categoryCombo)}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={td}>
                                        <div style={{ fontSize: 12 }}>
                                            <div><strong>Data Elements:</strong> {elementsCount}</div>
                                            <div><strong>Org Units:</strong> {orgUnitsCount}</div>
                                            {(datasetInfo.aggregationType || d.aggregationType) && (
                                                <div><strong>Aggregation:</strong> {datasetInfo.aggregationType || d.aggregationType}</div>
                                            )}
                                            {d.sms && Object.keys(d.sms).length > 0 && (
                                                <div style={{ color: '#1976d2', fontSize: 11, marginTop: 2 }}>
                                                    📱 SMS Configured
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={td}>
                                        <div style={{ fontSize: 12 }}>
                                            <div style={{ marginBottom: 4 }}>
                                                {(d.status === 'completed' || datasetInfo.created) ? '✅ Created' : '❌ Pending'}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#666' }}>
                                                Version: {datasetInfo.version ?? d.version ?? 1}
                                            </div>
                                            {(datasetInfo.created || d.created) && (
                                                <div style={{ fontSize: 11, color: '#666' }}>
                                                    Created: {new Date(datasetInfo.created || d.created).toLocaleDateString()}
                                                </div>
                                            )}
                                            {(datasetInfo.sharing || d.sharing) && (
                                                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                                                    Sharing: {(datasetInfo.sharing || d.sharing).publicAccess || 'rw------'}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            <h2 style={{ marginTop: 24 }}>🔗 Cross-Dataset Element Mappings ({rows.length})</h2>
            <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
                Each binder (<code>mappingId</code>) links related data elements across the 4 DQA datasets.
                The table shows codes, optional COC suffixes, expressions, and transforms.
            </div>
            {rows.length === 0 ? (
                <div style={{ padding: 8, border: '1px solid #eee' }}>
                    No mappings<br/>Run dataset creation to populate this table.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={th}>Binder (<code>mappingId</code>)</th>
                            <th style={th}>Register (dsA)</th>
                            <th style={th}>Summary (dsB)</th>
                            <th style={th}>Reported (dsC)</th>
                            <th style={th}>Corrected (dsD)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row, i) => {
                            const byType = {}
                            ;(row.mappings || []).forEach((m) => { byType[m.dataset?.type] = m })
                            return (
                                <tr key={row.mappingId || i}>
                                    <td style={td}>
                                        <div style={{ fontWeight: 600 }}>{row.mappingId}</div>
                                        <div style={{ fontSize: 12, color: '#666' }}>{row.dataElementName || '—'}</div>
                                        {row.valueType && <div style={{ fontSize: 12, color: '#999' }}>{row.valueType}</div>}
                                    </td>
                                    <td style={td}><ElementCell mappingForType={byType.register} /></td>
                                    <td style={td}><ElementCell mappingForType={byType.summary} /></td>
                                    <td style={td}><ElementCell mappingForType={byType.reported} /></td>
                                    <td style={td}><ElementCell mappingForType={byType.corrected} /></td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            <h2 style={{ marginTop: 24 }}>📱 SMS Commands ({(smsCommands || []).length})</h2>
            {(!smsCommands || smsCommands.length === 0) ? (
                <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={th}>Dataset</th>
                            <th style={th}>Keyword</th>
                            <th style={th}>Separator</th>
                            <th style={th}>Template</th>
                            <th style={th}>Codes</th>
                            <th style={th}>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {smsCommands.map((c, i) => {
                            const keywordDataSep = (c.keywordDataSeparator ?? c.separator ?? ' ')
                            const codeCodeSep = (c.codeSeparator ?? '.')
                            const codeValueSep = (c.codeValueSeparator ?? '.')
                            const sepLabel =
                                keywordDataSep === ' ' ? 'Space' :
                                    keywordDataSep === ',' ? 'Comma' :
                                        keywordDataSep === '.' ? 'Dot' :
                                            keywordDataSep === ';' ? 'Semicolon' :
                                                keywordDataSep === ':' ? 'Colon' :
                                                    keywordDataSep === '|' ? 'Pipe' :
                                                        keywordDataSep === '/' ? 'Slash' :
                                                            keywordDataSep === '-' ? 'Dash' :
                                                                keywordDataSep === '_' ? 'Underscore' :
                                                                    keywordDataSep === '\t' ? 'Tab' : keywordDataSep

                            let entries = []
                            if (Array.isArray(c.smsCodes)) {
                                entries = c.smsCodes.map(sc => ({
                                    code: String(sc.code || ''),
                                    deName: String(sc.dataElement?.name || sc.dataElement?.displayName || sc.dataElement?.shortName || ''),
                                    cocName: String(sc.categoryOptionCombo?.displayName || sc.categoryOptionCombo?.name || '')
                                }))
                            } else if (Array.isArray(c.expandedCodes)) {
                                entries = c.expandedCodes.map(ec => ({
                                    code: String(ec.code || ec.smsCode || ''),
                                    deName: String(ec.dataElement?.name || ec.dataElement?.displayName || ''),
                                    cocName: String(ec.categoryOptionCombo?.name || '')
                                }))
                            } else if (Array.isArray(c.codes)) {
                                entries = c.codes.map(k => ({ code: String(k || '') }))
                            } else if (c.codes && typeof c.codes === 'object') {
                                entries = Object.keys(c.codes).map(k => ({ code: String(k || '') }))
                            }
                            if ((!entries || entries.length === 0) && Array.isArray(created)) {
                                const match = created.find(d => d?.sms?.smsCodes && (!c.datasetType || d.datasetType === c.datasetType))
                                if (match?.sms?.smsCodes) {
                                    entries = match.sms.smsCodes.map(sc => ({
                                        code: String(sc.code || ''),
                                        deName: String(sc.dataElement?.name || ''),
                                        cocName: String(sc.categoryOptionCombo?.name || '')
                                    }))
                                }
                            }

                            const codeList = entries.map(e => e.code)
                            const values = codeList.map((_, idx) => String((idx + 1) * 5))
                            const body = codeList.map((k, idx) => `${k}${codeValueSep}${values[idx]}`).join(codeCodeSep)
                            const finalCmd = `${c.keyword}${keywordDataSep}${body}`
                            const shortBody = codeList.slice(0, 3).map((k, idx) => `${k}${codeValueSep}<v${idx + 1}>`).join(codeCodeSep)
                            const template = `${c.keyword}${keywordDataSep}${shortBody}${codeList.length > 3 ? `${codeCodeSep}…` : ''}`

                            return (
                                <tr key={i}>
                                    <td style={td}>
                                        <Tag>{c.datasetType ? prettyType(c.datasetType) : '—'}</Tag>
                                    </td>
                                    <td style={td}><code>{c.keyword}</code></td>
                                    <td style={td}><code>{sepLabel}</code></td>
                                    <td style={td}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 520 }} title={finalCmd}>
                                            <code>{template}</code>
                                        </div>
                                    </td>
                                    <td style={td}>
                                        {codeList.length}
                                        {codeList.length ? ` (${entries.slice(0, 6).map(e => e.cocName ? `${String(e.code)}→${String(e.cocName)}` : String(e.code)).join(', ')}${codeList.length > 6 ? ', …' : ''})` : ''}
                                    </td>
                                    <td style={td}>{c.created ? '✅ created' : '❌ failed'}</td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            {created && created.length > 0 && smsCommands && smsCommands.length > 0 && (
                <SmsCommandFixer
                    createdDatasets={created}
                    onFixed={(results) => {
                        console.log('SMS commands fixed:', results)
                    }}
                />
            )}

            {saveStatus && (
                <div style={{ marginTop: 16 }}>
                    <AlertBar
                        success={saveStatus === 'success'}
                        critical={saveStatus === 'error'}
                        onHidden={() => setSaveStatus(null)}
                    >
                        {saveMessage}
                    </AlertBar>
                </div>
            )}

            {/* Assessment Readiness Status */}
            <div style={{ marginTop: 24, padding: 16, border: '1px solid #e0e0e0', borderRadius: 4, backgroundColor: '#f9f9f9' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Assessment Completion Status</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{!!assessmentData?.name ? '✅' : '❌'}</span>
                        <span>Assessment Name: {assessmentData?.name || 'Missing'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{(Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets)?.length > 0 ? '✅' : '❌'}</span>
                        <span>Selected Datasets: {(Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets)?.length || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{(Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits)?.length > 0 ? '✅' : '❌'}</span>
                        <span>Selected Org Units: {(Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits)?.length || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{createdList?.length >= 4 ? '✅' : '❌'}</span>
                        <span>Datasets Created: {createdList?.length || 0}/4 types</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{(elementsMapping || []).length > 0 ? '✅' : '❌'}</span>
                        <span>Element Mappings: {(elementsMapping || []).length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{(assessmentData?.orgUnitMapping?.mappings?.length || assessmentData?.orgUnitMappings?.length || 0) > 0 ? '✅' : '❌'}</span>
                        <span>Org Unit Mappings: {assessmentData?.orgUnitMapping?.mappings?.length || assessmentData?.orgUnitMappings?.length || 0}</span>
                    </div>
                </div>
                {!isReady && (
                    <div style={{ marginTop: 12, padding: 8, backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: 4, fontSize: 12 }}>
                        <strong>⚠️ Assessment not ready:</strong> Please complete all required steps before saving.
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
                {onBack && (
                    <Button secondary onClick={onBack}>
                        ← Back
                    </Button>
                )}

                <Button
                    onClick={downloadFinalPayload}
                    disabled={isDownloading}
                    loading={isDownloading}
                    icon={isDownloading ? undefined : '📥'}
                >
                    {isDownloading ? 'Downloading...' : 'Download JSON Payload'}
                </Button>

                <Button
                    onClick={handlePrintSummary}
                    disabled={isPrinting}
                    loading={isPrinting}
                    icon={isPrinting ? undefined : '🖨️'}
                >
                    {isPrinting ? 'Generating PDF...' : 'Print Summary'}
                </Button>

                <Button
                    onClick={() => {
                        try {
                            const payload = buildFinalPayload()
                            const pretty = JSON.stringify(payload, null, 2)
                            setPreviewText(pretty)
                            setShowPreview(true)
                        } catch (e) {
                            setPreviewText(`Error building payload: ${e?.message || e}`)
                            setShowPreview(true)
                        }
                    }}
                    icon="👁️"
                >
                    Preview JSON
                </Button>

                <Button
                    primary
                    onClick={handleSave}
                    disabled={!isReady || saving}
                    loading={saving}
                    icon={saving ? undefined : '✅'}
                >
                    {saving ? 'Completing Assessment...' : '✅ Complete & Save Assessment'}
                </Button>
            </div>

            {showPreview && (
                <Modal large onClose={() => setShowPreview(false)} style={{ background: '#fff' }}>
                    <ModalTitle>{i18n.t('Assessment JSON Preview')}</ModalTitle>
                    <ModalContent>
                        <div style={{
                            maxHeight: 520,
                            overflow: 'auto',
                            background: '#0a0f1a',
                            color: '#e6edf3',
                            padding: 12,
                            borderRadius: 4,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
                            fontSize: 12,
                            lineHeight: 1.5
                        }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{previewText}</pre>
                        </div>
                    </ModalContent>
                    <ModalActions>
                        <Button onClick={() => setShowPreview(false)} secondary>{i18n.t('Close')}</Button>
                        <Button
                            onClick={() => {
                                try {
                                    const blob = new Blob([previewText], { type: 'application/json' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    const ts = new Date().toISOString().split('T')[0]
                                    const name = (assessmentData?.name || 'assessment').replace(/[^a-zA-Z0-9]/g, '_')
                                    a.download = `DQA360_${name}_preview_${ts}.json`
                                    a.href = url
                                    document.body.appendChild(a)
                                    a.click()
                                    document.body.removeChild(a)
                                    URL.revokeObjectURL(url)
                                } catch (e) {
                                    console.error('Preview download failed', e)
                                }
                            }}
                            primary
                        >
                            {i18n.t('Download Preview JSON')}
                        </Button>
                    </ModalActions>
                </Modal>
            )}

            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4, fontSize: 12, color: '#666' }}>
                <strong>Actions Help:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    <li><strong>Download JSON Payload:</strong> Downloads the complete assessment configuration as a JSON file for backup or sharing</li>
                    <li><strong>Print Summary:</strong> Generates a comprehensive PDF report with all assessment details, statistics, and configurations</li>
                    <li><strong>Preview JSON:</strong> Shows the full datastore payload before saving</li>
                    <li><strong>Complete & Save Assessment:</strong> Marks the assessment as finished and saves it to DHIS2 dataStore with completion details and dataset links</li>
                </ul>
            </div>
        </div>
    )
}

const th = { textAlign: 'left', borderBottom: '2px solid #ccc', padding: '10px 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.4px' }
const td = { borderBottom: '1px solid #eee', padding: '10px 8px', verticalAlign: 'top', fontSize: 14 }

export default ReviewStep