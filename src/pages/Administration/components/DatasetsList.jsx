import React, { useEffect, useMemo, useState } from 'react'
import { Box, Card, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, Tag, CircularLoader, NoticeBox, Button } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useAssessmentDataStore } from '../../../services/assessmentDataStoreService'

/**
 * DatasetsList
 * - Aggregates all datasets created via assessment creation (localDatasetsCreated)
 * - Shows which assessment each dataset belongs to
 */
export const DatasetsList = () => {
    const { getAssessments } = useAssessmentDataStore()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [assessments, setAssessments] = useState([])

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                const result = await getAssessments()
                if (mounted) {
                    setAssessments(Array.isArray(result) ? result : [])
                }
            } catch (e) {
                setError(e?.message || String(e))
            } finally {
                setLoading(false)
            }
        })()
        return () => { mounted = false }
    }, [])

    const datasets = useMemo(() => {
        const rows = []
        for (const a of assessments) {
            const list = a.localDatasetsCreated || []
            for (const ds of list) {
                const info = ds.info || {}
                rows.push({
                    datasetId: info.id || ds.id || '',
                    datasetName: info.name || info.displayName || ds.name || 'Unnamed Dataset',
                    assessmentId: a.id,
                    assessmentName: a.name || a.Info?.name || 'Unnamed Assessment',
                    periodType: info.periodType || 'Monthly',
                    elementsCount: Array.isArray(ds.dataElements) ? ds.dataElements.length : 0,
                    orgUnitsCount: Array.isArray(ds.orgUnits) ? ds.orgUnits.length : 0,
                    created: info.created || a.createdAt || '-',
                })
            }
        }
        return rows
    }, [assessments])

    if (loading) {
        return (
            <Box display="flex" alignItems="center" justifyContent="center" style={{ minHeight: 'calc(100vh - 200px)' }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                    <CircularLoader />
                    <Box marginTop="8px" style={{ color: '#666' }}>
                        {i18n.t('Loading datasets...')}
                    </Box>
                </Box>
            </Box>
        )
    }

    if (error) {
        return (
            <Box padding="16px">
                <NoticeBox error title={i18n.t('Failed to load datasets')}>
                    {error}
                </NoticeBox>
            </Box>
        )
    }

    if (datasets.length === 0) {
        return (
            <Box style={{ height: '100%', minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} padding="8px">
                <Card style={{ padding: 24 }}>
                    <Box textAlign="center" style={{ color: '#666' }}>
                        {i18n.t('No datasets have been created via assessments yet.')}
                    </Box>
                </Card>
            </Box>
        )
    }

    return (
        <Box padding="8px">
            <Card>
                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('Dataset')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Assessment')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Period Type')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Data Elements')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Organisation Units')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Created')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {datasets.map((row, idx) => (
                            <DataTableRow key={`${row.datasetId || 'ds'}-${idx}`}>
                                <DataTableCell>
                                    <div style={{ fontWeight: 600 }}>{row.datasetName}</div>
                                    <div style={{ fontSize: 11, color: '#888' }}>{row.datasetId}</div>
                                </DataTableCell>
                                <DataTableCell>
                                    <div style={{ fontWeight: 500 }}>{row.assessmentName}</div>
                                    <div style={{ fontSize: 11, color: '#888' }}>{row.assessmentId}</div>
                                </DataTableCell>
                                <DataTableCell>{row.periodType}</DataTableCell>
                                <DataTableCell>{row.elementsCount}</DataTableCell>
                                <DataTableCell>{row.orgUnitsCount}</DataTableCell>
                                <DataTableCell>{row.created}</DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
            </Card>
        </Box>
    )
}

export default DatasetsList