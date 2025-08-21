import React, { useState } from 'react'
import { Card, Box, SingleSelect, SingleSelectOption, Button, NoticeBox, Input, FileInput } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useImportExportService } from '../../../services/importExportService'

const ImportExport = () => {
    const [mode, setMode] = useState('export')
    const [datasetKey, setDatasetKey] = useState('register')
    const [format, setFormat] = useState('csv')
    const [file, setFile] = useState(null)
    const [status, setStatus] = useState(null)

    // Simple mapping controls (column names in upload)
    const [mapping, setMapping] = useState({
        dataElement: 'dataElement',
        categoryOptionCombo: 'categoryOptionCombo',
        orgUnit: 'orgUnit',
        period: 'period',
        value: 'value',
    })

    const { importFile, exportData } = useImportExportService()

    // TODO: wire to actual selected assessment context
    const assessmentId = 'current-assessment'

    const doImport = async () => {
        if (!file) return setStatus({ type: 'error', msg: i18n.t('Please select a file to import') })
        try {
            setStatus(null)
            const res = await importFile({ file, format: format === 'excel' ? 'excel' : format, datasetKey, mapping, assessmentId })
            setStatus({ type: 'success', msg: i18n.t('Imported {{n}} rows', { n: res.count }) })
        } catch (e) {
            setStatus({ type: 'error', msg: e.message })
        }
    }

    const doExport = async () => {
        try {
            setStatus(null)
            const blob = await exportData({ assessmentId, datasetKey, format })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `dqa-${datasetKey}.${format === 'excel' ? 'xlsx' : format}`
            a.click()
            URL.revokeObjectURL(url)
            setStatus({ type: 'success', msg: i18n.t('Export generated') })
        } catch (e) {
            setStatus({ type: 'error', msg: e.message })
        }
    }

    return (
        <Box>
            <Box marginBottom="12px">
                <h2>{i18n.t('Import/Export')}</h2>
                <p>{i18n.t('Move DQA data in and out of the system for the selected assessment, period and org unit')}</p>
            </Box>

            <Card>
                <Box padding="12px" display="flex" gap="12px" alignItems="center" flexWrap>
                    <SingleSelect selected={mode} onChange={({ selected }) => setMode(selected)}>
                        <SingleSelectOption value="import" label={i18n.t('Import')} />
                        <SingleSelectOption value="export" label={i18n.t('Export')} />
                    </SingleSelect>
                    <SingleSelect selected={datasetKey} onChange={({ selected }) => setDatasetKey(selected)}>
                        <SingleSelectOption value="register" label={i18n.t('Register')} />
                        <SingleSelectOption value="summary" label={i18n.t('Summary')} />
                        <SingleSelectOption value="reported" label={i18n.t('Reported')} />
                        <SingleSelectOption value="corrections" label={i18n.t('Corrections')} />
                    </SingleSelect>
                    <SingleSelect selected={format} onChange={({ selected }) => setFormat(selected)}>
                        <SingleSelectOption value="csv" label={i18n.t('CSV')} />
                        <SingleSelectOption value="json" label={i18n.t('JSON')} />
                        <SingleSelectOption value="excel" label={i18n.t('Excel (.xlsx)')} />
                    </SingleSelect>

                    {mode === 'import' && (
                        <>
                            <FileInput buttonLabel={i18n.t('Choose file')} onChange={({ files }) => setFile(files?.[0] || null)} />
                            {/* Column mapping */}
                            <Input dense placeholder={i18n.t('Data Element column')} value={mapping.dataElement} onChange={({ value }) => setMapping(m => ({ ...m, dataElement: value }))} />
                            <Input dense placeholder={i18n.t('COC column')} value={mapping.categoryOptionCombo} onChange={({ value }) => setMapping(m => ({ ...m, categoryOptionCombo: value }))} />
                            <Input dense placeholder={i18n.t('Org Unit column')} value={mapping.orgUnit} onChange={({ value }) => setMapping(m => ({ ...m, orgUnit: value }))} />
                            <Input dense placeholder={i18n.t('Period column')} value={mapping.period} onChange={({ value }) => setMapping(m => ({ ...m, period: value }))} />
                            <Input dense placeholder={i18n.t('Value column')} value={mapping.value} onChange={({ value }) => setMapping(m => ({ ...m, value: value }))} />
                        </>
                    )}

                    <Button onClick={mode === 'export' ? doExport : doImport}>
                        {mode === 'export' ? i18n.t('Export') : i18n.t('Import')}
                    </Button>
                </Box>
            </Card>

            {status && (
                <Box marginTop="12px">
                    <NoticeBox title={status.type === 'error' ? i18n.t('Error') : i18n.t('Success')} error={status.type === 'error'} valid={status.type === 'success'}>
                        {status.msg}
                    </NoticeBox>
                </Box>
            )}
        </Box>
    )
}

export default ImportExport