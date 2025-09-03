import React, { useEffect, useMemo, useState } from 'react'
import { 
    Box, 
    Card, 
    DataTable, 
    DataTableHead, 
    DataTableRow, 
    DataTableColumnHeader, 
    DataTableBody, 
    DataTableCell, 
    Tag, 
    CircularLoader, 
    NoticeBox,
    DropdownButton,
    FlyoutMenu,
    MenuItem,
    Divider,
    IconView24,
    IconEdit24,
    IconDelete24,
    IconDownload24,
    IconLaunch24,
    IconSettings24,
    IconSync24,
    IconFileDocument24,
    IconShare24,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    ButtonStrip
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useAssessmentDataStore } from '../../../services/assessmentDataStoreService'
import { useDataEngine } from '@dhis2/app-runtime'
import { Link, useNavigate } from 'react-router-dom'
import { extractDQAAttributes, filterDQAObjects, findAssessmentById, createDQAQueryFields, DQA_ATTRIBUTE_CODES } from '../../../services/dqaAttributeService'

/**
 * DatasetsList
 * - Aggregates all datasets created via assessment creation (dqaDatasetsCreated)
 * - Shows which assessment each dataset belongs to
 */
export const DatasetsList = () => {
    const { getAssessments, getAssessment } = useAssessmentDataStore()
    const engine = useDataEngine()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [assessments, setAssessments] = useState([])
    const [dhisDatasets, setDhisDatasets] = useState([])
    
    // Modal states
    const [deleteModal, setDeleteModal] = useState({ open: false, dataset: null })
    const [syncModal, setSyncModal] = useState({ open: false, dataset: null })
    const [shareModal, setShareModal] = useState({ open: false, dataset: null })

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                // 1) Load assessment summaries first
                const summaries = await getAssessments()
                const assessmentSummaries = Array.isArray(summaries) ? summaries : []
                
                // 2) Load full assessment data for each assessment to get dqaDatasetsCreated
                const fullAssessments = []
                for (const summary of assessmentSummaries) {
                    try {
                        const fullAssessment = await getAssessment(summary.id)
                        if (fullAssessment) {
                            fullAssessments.push(fullAssessment)
                        }
                    } catch (e) {
                        console.warn(`Failed to load full assessment ${summary.id}:`, e)
                        // Include summary even if full data fails to load
                        fullAssessments.push(summary)
                    }
                }
                
                if (mounted) setAssessments(fullAssessments)

                // 3) Fetch DHIS2 datasets that have DQA360 attributes
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
            // Handle both old structure (dqaDatasetsCreated) and new structure (localDatasetsCreated)
            const list = a.dqaDatasetsCreated || a.localDatasetsCreated || []
            for (const ds of list) {
                const info = ds.info || {}
                rows.push({
                    source: 'store',
                    datasetId: info.id || ds.id || '',
                    datasetName: info.name || info.displayName || ds.name || ds.displayName || 'Unnamed Dataset',
                    assessmentId: a.id,
                    assessmentName: a.name || a.details?.name || a.Info?.name || 'Unnamed Assessment',
                    periodType: info.periodType || ds.periodType || 'Monthly',
                    elementsCount: Array.isArray(ds.dataElements) ? ds.dataElements.length : 0,
                    orgUnitsCount: Array.isArray(ds.orgUnits) ? ds.orgUnits.length : 0,
                    created: info.created || a.createdAt || '-',
                })
            }
        }
        // From DHIS2 live API (attribute-filtered) - only show datasets linked to existing assessments
        for (const ds of dhisDatasets) {
            // Extract DQA attribute values using service
            const { datasetId: dqaDatasetValue, assessmentId: dqaAssessmentValue } = extractDQAAttributes(ds)
            
            // Find linked assessment using service
            const linkedAssessment = findAssessmentById(assessments, dqaAssessmentValue)
            
            // Only include datasets that are linked to existing assessments
            if (linkedAssessment) {
                rows.push({
                    source: 'dhis2',
                    datasetId: ds.id,
                    datasetName: ds.displayName || ds.name,
                    assessmentId: dqaAssessmentValue || '',
                    assessmentName: linkedAssessment.name || linkedAssessment.details?.name || 'Linked Assessment',
                    periodType: ds.periodType || 'Monthly',
                    elementsCount: Array.isArray(ds?.dataSetElements) ? ds.dataSetElements.length : 0,
                    orgUnitsCount: Array.isArray(ds?.organisationUnits) ? ds.organisationUnits.length : 0,
                    created: ds.created ? new Date(ds.created).toLocaleDateString() : '—',
                    lastUpdated: ds.lastUpdated ? new Date(ds.lastUpdated).toLocaleDateString() : '—',
                    description: ds.description || '',
                    dqaDatasetValue: dqaDatasetValue,
                    dqaAssessmentValue: dqaAssessmentValue,
                    code: ds.code || '',
                    isLinked: true
                })
            }
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

    // Dataset action handlers
    const handleViewDataset = (dataset) => {
        navigate(`/administration/datasets/${dataset.datasetId}`)
    }

    const handleEditDataset = (dataset) => {
        if (dataset.source === 'store') {
            // Navigate to assessment edit for app-created datasets
            navigate(`/assessments/manage/${dataset.assessmentId}`)
        } else {
            // For DHIS2 datasets, open in DHIS2
            const dhis2Url = `${window.location.origin}/dhis2/dhis-web-maintenance/#/list/dataSetSection/dataSet`
            window.open(dhis2Url, '_blank')
        }
    }

    const handleViewInDHIS2 = (dataset) => {
        const dhis2Url = `${window.location.origin}/dhis2/dhis-web-maintenance/#/edit/dataSetSection/dataSet/${dataset.datasetId}`
        window.open(dhis2Url, '_blank')
    }

    const handleDownloadConfig = (dataset) => {
        const config = {
            id: dataset.datasetId,
            name: dataset.datasetName,
            assessmentId: dataset.assessmentId,
            assessmentName: dataset.assessmentName,
            periodType: dataset.periodType,
            elementsCount: dataset.elementsCount,
            orgUnitsCount: dataset.orgUnitsCount,
            source: dataset.source,
            created: dataset.created,
            lastUpdated: dataset.lastUpdated,
            description: dataset.description,
            exportedAt: new Date().toISOString(),
            exportedBy: 'DQA360 Administration'
        }
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dataset-${dataset.datasetName.replace(/[^a-zA-Z0-9]/g, '_')}-config.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleGenerateReport = (dataset) => {
        navigate(`/reports/dataset/${dataset.datasetId}`)
    }

    const handleSyncDataset = (dataset) => {
        setSyncModal({ open: true, dataset })
    }

    const handleDeleteDataset = (dataset) => {
        setDeleteModal({ open: true, dataset })
    }

    const handleShareDataset = (dataset) => {
        setShareModal({ open: true, dataset })
    }

    const confirmSync = async () => {
        // TODO: Implement actual sync logic
        console.log('Syncing dataset:', syncModal.dataset)
        setSyncModal({ open: false, dataset: null })
    }

    const confirmDelete = async () => {
        // TODO: Implement actual delete logic
        console.log('Deleting dataset:', deleteModal.dataset)
        setDeleteModal({ open: false, dataset: null })
    }

    // Get actions for a dataset
    const getDatasetActions = (dataset) => {
        const actions = []

        // Primary Actions
        actions.push(
            {
                label: i18n.t('View Details'),
                icon: <IconView24 />,
                onClick: () => handleViewDataset(dataset)
            }
        )

        // Edit action - different behavior based on source
        if (dataset.source === 'store') {
            actions.push({
                label: i18n.t('Edit in Assessment'),
                icon: <IconEdit24 />,
                onClick: () => handleEditDataset(dataset)
            })
        } else {
            actions.push({
                label: i18n.t('View in DHIS2'),
                icon: <IconLaunch24 />,
                onClick: () => handleViewInDHIS2(dataset)
            })
        }

        // Data & Reports
        actions.push(
            { type: 'divider' },
            {
                label: i18n.t('Download Configuration'),
                icon: <IconDownload24 />,
                onClick: () => handleDownloadConfig(dataset)
            },
            {
                label: i18n.t('Generate Report'),
                icon: <IconFileDocument24 />,
                onClick: () => handleGenerateReport(dataset)
            }
        )

        // Management Actions
        if (dataset.source === 'dhis2') {
            actions.push({
                label: i18n.t('Sync with DHIS2'),
                icon: <IconSync24 />,
                onClick: () => handleSyncDataset(dataset)
            })
        }

        actions.push(
            {
                label: i18n.t('Manage Sharing'),
                icon: <IconShare24 />,
                onClick: () => handleShareDataset(dataset)
            }
        )

        // Destructive Actions
        if (dataset.source === 'store') {
            actions.push(
                { type: 'divider' },
                {
                    label: i18n.t('Delete Dataset'),
                    icon: <IconDelete24 />,
                    destructive: true,
                    onClick: () => handleDeleteDataset(dataset)
                }
            )
        }

        return actions
    }

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
                        {i18n.t('No datasets linked to existing assessments found.')}
                        <div style={{ fontSize: '14px', marginTop: '8px', color: '#888' }}>
                            {i18n.t('Create an assessment to see its datasets here.')}
                        </div>
                    </Box>
                </Card>
            </Box>
        )
    }

    return (
        <Box padding="8px">
            <Box marginBottom="16px">
                <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                    {i18n.t('Assessment Datasets')}
                </h2>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    {i18n.t('Datasets created and linked to existing assessments')}
                </p>
            </Box>
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
                            <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
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
                                    <div style={{ fontWeight: 500, color: '#2e7d32' }}>
                                        {row.assessmentName}
                                    </div>
                                    {row.assessmentId && (
                                        <div style={{ fontSize: 11, color: '#888' }}>{row.assessmentId}</div>
                                    )}
                                </DataTableCell>
                                <DataTableCell>{row.periodType}</DataTableCell>
                                <DataTableCell>{row.elementsCount}</DataTableCell>
                                <DataTableCell>{row.orgUnitsCount}</DataTableCell>
                                <DataTableCell>
                                    {row.source === 'store' && (
                                        <Tag positive>Created via App</Tag>
                                    )}
                                    {row.source === 'dhis2' && (
                                        <Tag positive>Linked</Tag>
                                    )}
                                </DataTableCell>
                                <DataTableCell>
                                    <div>{row.created}</div>
                                    {row.lastUpdated && row.lastUpdated !== row.created && (
                                        <div style={{ fontSize: 10, color: '#666' }}>Updated: {row.lastUpdated}</div>
                                    )}
                                </DataTableCell>
                                <DataTableCell>
                                    <DropdownButton
                                        component={
                                            <FlyoutMenu>
                                                {getDatasetActions(row).map((action, index) => 
                                                    action.type === 'divider' ? (
                                                        <Divider key={index} />
                                                    ) : (
                                                        <MenuItem
                                                            key={index}
                                                            label={action.label}
                                                            icon={action.icon}
                                                            destructive={action.destructive}
                                                            onClick={action.onClick}
                                                        />
                                                    )
                                                )}
                                            </FlyoutMenu>
                                        }
                                    >
                                        {i18n.t('Actions')}
                                    </DropdownButton>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
            </Card>

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <Modal onClose={() => setDeleteModal({ open: false, dataset: null })}>
                    <ModalTitle>{i18n.t('Delete Dataset')}</ModalTitle>
                    <ModalContent>
                        <p>
                            {i18n.t('Are you sure you want to delete the dataset')} <strong>{deleteModal.dataset?.datasetName}</strong>?
                        </p>
                        <p style={{ color: '#d32f2f', fontSize: '14px' }}>
                            {i18n.t('This action cannot be undone. All data associated with this dataset will be permanently removed.')}
                        </p>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button secondary onClick={() => setDeleteModal({ open: false, dataset: null })}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button destructive onClick={confirmDelete}>
                                {i18n.t('Delete Dataset')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}

            {/* Sync Confirmation Modal */}
            {syncModal.open && (
                <Modal onClose={() => setSyncModal({ open: false, dataset: null })}>
                    <ModalTitle>{i18n.t('Sync Dataset with DHIS2')}</ModalTitle>
                    <ModalContent>
                        <p>
                            {i18n.t('Sync dataset')} <strong>{syncModal.dataset?.datasetName}</strong> {i18n.t('with DHIS2')}?
                        </p>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            {i18n.t('This will update the dataset configuration and metadata from DHIS2.')}
                        </p>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button secondary onClick={() => setSyncModal({ open: false, dataset: null })}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button primary onClick={confirmSync}>
                                {i18n.t('Sync Dataset')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}

            {/* Share Modal */}
            {shareModal.open && (
                <Modal onClose={() => setShareModal({ open: false, dataset: null })}>
                    <ModalTitle>{i18n.t('Manage Dataset Sharing')}</ModalTitle>
                    <ModalContent>
                        <p>
                            {i18n.t('Configure sharing settings for')} <strong>{shareModal.dataset?.datasetName}</strong>
                        </p>
                        <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginTop: '16px' }}>
                            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                                {i18n.t('Sharing configuration interface will be implemented here.')}
                            </p>
                        </div>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button primary onClick={() => setShareModal({ open: false, dataset: null })}>
                                {i18n.t('Close')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </Box>
    )
}

export default DatasetsList