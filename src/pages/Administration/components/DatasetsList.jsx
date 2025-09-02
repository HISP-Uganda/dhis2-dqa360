import React, { useEffect, useMemo, useState } from 'react'
import { Box, Card, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, Tag, CircularLoader, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useAssessmentDataStore } from '../../../services/assessmentDataStoreService'
import { useDataEngine } from '@dhis2/app-runtime'
import { Link } from 'react-router-dom'
import { extractDQAAttributes, filterDQAObjects, findAssessmentById, createDQAQueryFields, DQA_ATTRIBUTE_CODES } from '../../../services/dqaAttributeService'

/**
 * DatasetsList
 * - Aggregates all datasets created via assessment creation (dqaDatasetsCreated)
 * - Shows which assessment each dataset belongs to
 */
export const DatasetsList = () => {
    const { getAssessments } = useAssessmentDataStore()
    const engine = useDataEngine()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [assessments, setAssessments] = useState([])
    const [dhisDatasets, setDhisDatasets] = useState([])

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                // 1) Load assessments for dqaDatasetsCreated list
                const result = await getAssessments()
                if (mounted) setAssessments(Array.isArray(result) ? result : [])

                // 2) Fetch DHIS2 datasets that have DQA360 attributes
                const query = {
                    dataSets: {
                        resource: 'dataSets',
                        params: {
                            // Fetch attributeValues (code + value) to filter client-side
                            fields: createDQAQueryFields('id,displayName,name,code,periodType,description,created,lastUpdated,dataSetElements[dataElement[id,displayName,code]],organisationUnits[id,displayName]'),
                            pageSize: 500,
                            page: 1
                        }
                    }
                }
                const { dataSets } = await engine.query(query)
                const list = Array.isArray(dataSets?.dataSets) ? dataSets.dataSets : []
                
                // Filter to those having DQA attributes
                const filtered = filterDQAObjects(list)
                if (mounted) setDhisDatasets(filtered)
            } catch (e) {
                if (mounted) setError(e?.message || String(e))
            } finally {
                if (mounted) setLoading(false)
            }
        })()
        return () => { mounted = false }
    }, [])

    const datasets = useMemo(() => {
        const rows = []
        // From assessments store (created via app)
        for (const a of assessments) {
            const list = a.dqaDatasetsCreated || []
            for (const ds of list) {
                const info = ds.info || {}
                rows.push({
                    source: 'store',
                    datasetId: info.id || ds.id || '',
                    datasetName: info.name || info.displayName || ds.name || 'Unnamed Dataset',
                    assessmentId: a.id,
                    assessmentName: a.name || a.details?.name || 'Unnamed Assessment',
                    periodType: info.periodType || ds.periodType || 'Monthly',
                    elementsCount: Array.isArray(ds.dataElements) ? ds.dataElements.length : 0,
                    orgUnitsCount: Array.isArray(ds.orgUnits) ? ds.orgUnits.length : 0,
                    created: info.created || a.createdAt || '-',
                })
            }
        }
        // From DHIS2 live API (attribute-filtered)
        for (const ds of dhisDatasets) {
            // Extract DQA attribute values using service
            const { datasetId: dqaDatasetValue, assessmentId: dqaAssessmentValue } = extractDQAAttributes(ds)
            
            // Find linked assessment using service
            const linkedAssessment = findAssessmentById(assessments, dqaAssessmentValue)
            
            rows.push({
                source: 'dhis2',
                datasetId: ds.id,
                datasetName: ds.displayName || ds.name,
                assessmentId: dqaAssessmentValue || '',
                assessmentName: linkedAssessment 
                    ? (linkedAssessment.name || linkedAssessment.details?.name || 'Linked Assessment') 
                    : (dqaAssessmentValue ? 'Assessment Not Found' : '—'),
                periodType: ds.periodType || 'Monthly',
                elementsCount: Array.isArray(ds?.dataSetElements) ? ds.dataSetElements.length : 0,
                orgUnitsCount: Array.isArray(ds?.organisationUnits) ? ds.organisationUnits.length : 0,
                created: ds.created ? new Date(ds.created).toLocaleDateString() : '—',
                lastUpdated: ds.lastUpdated ? new Date(ds.lastUpdated).toLocaleDateString() : '—',
                description: ds.description || '',
                dqaDatasetValue: dqaDatasetValue,
                dqaAssessmentValue: dqaAssessmentValue,
                code: ds.code || '',
                isLinked: !!linkedAssessment
            })
        }
        // De-duplicate by datasetId (prefer store entry)
        const map = new Map()
        for (const r of rows) {
            if (!map.has(r.datasetId) || map.get(r.datasetId).source !== 'store') {
                map.set(r.datasetId, r)
            }
        }
        return Array.from(map.values())
    }, [assessments, dhisDatasets])

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
                            <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Created')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {datasets.map((row, idx) => (
                            <DataTableRow key={`${row.datasetId || 'ds'}-${idx}`}>
                                <DataTableCell>
                                    <div style={{ fontWeight: 600 }}>
                                        <Link to={`/administration/datasets/${row.datasetId}`} style={{ textDecoration: 'none' }}>
                                            {row.datasetName}
                                        </Link>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#888' }}>{row.datasetId}</div>
                                    {row.code && (
                                        <div style={{ fontSize: 10, color: '#666' }}>Code: {row.code}</div>
                                    )}
                                    {row.source === 'dhis2' && row.dqaDatasetValue && (
                                        <div style={{ fontSize: 10, color: '#1976d2' }}>DQA ID: {row.dqaDatasetValue}</div>
                                    )}
                                </DataTableCell>
                                <DataTableCell>
                                    <div style={{ fontWeight: 500, color: row.isLinked ? '#2e7d32' : (row.assessmentId ? '#d32f2f' : '#666') }}>
                                        {row.assessmentName}
                                    </div>
                                    {row.assessmentId && (
                                        <div style={{ fontSize: 11, color: '#888' }}>{row.assessmentId}</div>
                                    )}
                                    {row.source === 'dhis2' && row.dqaAssessmentValue && !row.isLinked && (
                                        <div style={{ fontSize: 10, color: '#d32f2f' }}>⚠️ Assessment not found</div>
                                    )}
                                </DataTableCell>
                                <DataTableCell>{row.periodType}</DataTableCell>
                                <DataTableCell>{row.elementsCount}</DataTableCell>
                                <DataTableCell>{row.orgUnitsCount}</DataTableCell>
                                <DataTableCell>
                                    {row.source === 'store' && (
                                        <Tag positive>Created via App</Tag>
                                    )}
                                    {row.source === 'dhis2' && row.isLinked && (
                                        <Tag positive>Linked</Tag>
                                    )}
                                    {row.source === 'dhis2' && !row.isLinked && row.dqaAssessmentValue && (
                                        <Tag negative>Link Broken</Tag>
                                    )}
                                    {row.source === 'dhis2' && !row.dqaAssessmentValue && (
                                        <Tag neutral>DQA Enabled</Tag>
                                    )}
                                </DataTableCell>
                                <DataTableCell>
                                    <div>{row.created}</div>
                                    {row.lastUpdated && row.lastUpdated !== row.created && (
                                        <div style={{ fontSize: 10, color: '#666' }}>Updated: {row.lastUpdated}</div>
                                    )}
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
            </Card>
        </Box>
    )
}

export default DatasetsList