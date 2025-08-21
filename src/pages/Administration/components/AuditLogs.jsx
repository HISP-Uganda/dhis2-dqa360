import React, { useEffect, useState } from 'react'
import { Box, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, Input, SingleSelect, SingleSelectOption, CircularLoader, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'
import { useAuditLog } from '../../../services/auditService'

const Toolbar = styled.div`
    display: grid;
    grid-template-columns: 1fr 200px 200px 200px;
    gap: 8px;
    margin-bottom: 8px;
`

export const AuditLogs = () => {
    const { listLogs } = useAuditLog()
    const [filters, setFilters] = useState({ text: '', action: '', entityType: '', status: '' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [logs, setLogs] = useState([])

    const refresh = async () => {
        try {
            setLoading(true)
            setError(null)
            const items = await listLogs({ days: 30, limit: 500, filters })
            setLogs(items)
        } catch (e) {
            setError(e?.message || String(e))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { refresh() /* initial */ }, [])
    useEffect(() => { const id = setTimeout(refresh, 300); return () => clearTimeout(id) }, [filters])

    return (
        <Box>
            <h3 style={{ margin: '4px 0 8px 0' }}>{i18n.t('Audit Logs')}</h3>
            <Toolbar>
                <Input placeholder={i18n.t('Search text')} value={filters.text} onChange={({ value }) => setFilters(f => ({ ...f, text: value }))} />
                <SingleSelect selected={filters.action} onChange={({ selected }) => setFilters(f => ({ ...f, action: selected }))}>
                    <SingleSelectOption value="" label={i18n.t('All actions')} />
                    <SingleSelectOption value="assessment.save" label={i18n.t('Assessment saved')} />
                    <SingleSelectOption value="assessment.updateTab" label={i18n.t('Assessment tab updated')} />
                    <SingleSelectOption value="settings.save" label={i18n.t('Settings saved')} />
                    <SingleSelectOption value="comparison.run" label={i18n.t('Comparison run')} />
                    <SingleSelectOption value="notification.send" label={i18n.t('Notification sent')} />
                </SingleSelect>
                <SingleSelect selected={filters.entityType} onChange={({ selected }) => setFilters(f => ({ ...f, entityType: selected }))}>
                    <SingleSelectOption value="" label={i18n.t('All entities')} />
                    <SingleSelectOption value="assessment" label={i18n.t('Assessment')} />
                    <SingleSelectOption value="settings" label={i18n.t('Settings')} />
                    <SingleSelectOption value="dataset" label={i18n.t('Dataset')} />
                    <SingleSelectOption value="dataElement" label={i18n.t('Data Element')} />
                </SingleSelect>
                <SingleSelect selected={filters.status} onChange={({ selected }) => setFilters(f => ({ ...f, status: selected }))}>
                    <SingleSelectOption value="" label={i18n.t('All statuses')} />
                    <SingleSelectOption value="success" label={i18n.t('Success')} />
                    <SingleSelectOption value="failure" label={i18n.t('Failure')} />
                    <SingleSelectOption value="warning" label={i18n.t('Warning')} />
                    <SingleSelectOption value="info" label={i18n.t('Info')} />
                </SingleSelect>
            </Toolbar>

            {loading && <CircularLoader small />}    
            {error && (<NoticeBox error title={i18n.t('Error')} style={{ marginTop: 8 }}>{error}</NoticeBox>)}

            {!loading && (
                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('Time')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Action')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Entity')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Details')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Actor')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {logs.map(log => (
                            <DataTableRow key={log.id}>
                                <DataTableCell style={{ whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</DataTableCell>
                                <DataTableCell>{log.action}</DataTableCell>
                                <DataTableCell>{`${log.entityType}${log.entityName ? `: ${log.entityName}` : ''}`}</DataTableCell>
                                <DataTableCell>{log.message}</DataTableCell>
                                <DataTableCell>{log.status}</DataTableCell>
                                <DataTableCell>{log.actor?.username || 'system'}</DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
            )}
        </Box>
    )
}

export default AuditLogs