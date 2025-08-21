import React, { useState, useEffect } from 'react'
import {
    Box,
    Button,
    ButtonStrip,
    Card,
    InputField,
    TextAreaField,
    SingleSelect,
    SingleSelectOption,
    MultiSelect,
    MultiSelectOption,
    Tag,
    NoticeBox,
    CircularLoader,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    TabBar,
    Tab,
    Divider,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    IconAdd16,
    IconEdit16,
    IconDelete16
} from '@dhis2/ui'
import { useDataEngine } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import ManualMetadataCreator from '../../components/ManualMetadataCreator/ManualMetadataCreator'
import { 
    loadAllManualMetadata
} from '../../utils/manualMetadataCreator'
import { 
    createAssessmentToolsFromManualMetadata,
    syncManualDatasetsWithDHIS2 
} from '../../utils/manualMetadataIntegration'

// Enhanced Manual metadata creation component with full DHIS2 integration
const ManualMetadataCreation = ({ onMetadataCreated, onClose }) => {
    const dataEngine = useDataEngine()
    const [activeTab, setActiveTab] = useState('overview')
    const [showCreator, setShowCreator] = useState(false)
    const [loading, setLoading] = useState(false)
    const [manualMetadata, setManualMetadata] = useState(null)
    const [progress, setProgress] = useState({ message: '', percentage: 0 })

    // Load existing manual metadata on component mount
    useEffect(() => {
        loadExistingMetadata()
    }, [])

    const loadExistingMetadata = async () => {
        try {
            setLoading(true)
            const metadata = await loadAllManualMetadata(dataEngine)
            setManualMetadata(metadata)
        } catch (error) {
            console.error('Error loading manual metadata:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMetadataCreated = (results) => {
        console.log('Manual metadata created:', results)
        // Reload metadata to reflect changes
        loadExistingMetadata()
        setShowCreator(false)
        
        if (onMetadataCreated) {
            onMetadataCreated(results)
        }
    }

    const handleCreateAssessmentTools = async () => {
        if (!manualMetadata || manualMetadata.datasets.length === 0) {
            alert(i18n.t('No manual datasets available for assessment tool creation'))
            return
        }

        try {
            setLoading(true)
            
            // Get datasets that are created in DHIS2
            const availableDatasets = manualMetadata.datasets.filter(ds => ds.createdInDHIS2)
            
            if (availableDatasets.length === 0) {
                alert(i18n.t('No datasets have been created in DHIS2 yet'))
                return
            }

            const config = {
                dataEngine,
                selectedDatasets: availableDatasets.map(ds => ds.id),
                orgUnits: [], // Could be enhanced to select org units
                onProgress: setProgress
            }

            const results = await createAssessmentToolsFromManualMetadata(config)
            
            if (results.success) {
                alert(i18n.t('Assessment tools created successfully!'))
                if (onMetadataCreated) {
                    onMetadataCreated(results)
                }
            } else {
                alert(i18n.t('Some assessment tools failed to create. Check console for details.'))
                console.error('Assessment tool creation errors:', results.errors)
            }

        } catch (error) {
            console.error('Error creating assessment tools:', error)
            alert(`Error creating assessment tools: ${error.message}`)
        } finally {
            setLoading(false)
            setProgress({ message: '', percentage: 0 })
        }
    }

    const handleSyncWithDHIS2 = async () => {
        try {
            setLoading(true)
            const syncResults = await syncManualDatasetsWithDHIS2(dataEngine, setProgress)
            
            if (syncResults.success) {
                alert(i18n.t(`Sync completed. Synced: ${syncResults.synced}, Removed: ${syncResults.removed}`))
                // Reload metadata to reflect sync changes
                loadExistingMetadata()
            } else {
                alert(i18n.t(`Sync failed: ${syncResults.error}`))
            }

        } catch (error) {
            console.error('Error syncing with DHIS2:', error)
            alert(`Sync error: ${error.message}`)
        } finally {
            setLoading(false)
            setProgress({ message: '', percentage: 0 })
        }
    }

    const handleExportMetadata = async () => {
        try {
            setLoading(true)
            const exportPackage = await loadAllManualMetadata(dataEngine)
            
            // Create and download file
            const blob = new Blob([JSON.stringify(exportPackage, null, 2)], {
                type: 'application/json'
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `dqa360-manual-metadata-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

        } catch (error) {
            console.error('Error exporting metadata:', error)
            alert(`Export error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    if (showCreator) {
        return (
            <ManualMetadataCreator
                onMetadataCreated={handleMetadataCreated}
                onClose={() => setShowCreator(false)}
            />
        )
    }

    const renderOverview = () => (
        <Box>
            <Card>
                <Box padding="16px">
                    <h3>{i18n.t('Manual Metadata Overview')}</h3>
                    
                    {loading ? (
                        <Box display="flex" justifyContent="center" padding="24px">
                            <CircularLoader />
                        </Box>
                    ) : manualMetadata ? (
                        <Box>
                            <Box display="flex" gap="16px" marginTop="16px" flexWrap="wrap">
                                <Box>
                                    <strong>{i18n.t('Datasets')}: </strong>
                                    <Tag>{manualMetadata.datasets.length}</Tag>
                                    <Box fontSize="12px" color="#6c757d">
                                        ({manualMetadata.datasets.filter(ds => ds.createdInDHIS2).length} in DHIS2)
                                    </Box>
                                </Box>
                                <Box>
                                    <strong>{i18n.t('Data Elements')}: </strong>
                                    <Tag>{manualMetadata.dataElements.length}</Tag>
                                    <Box fontSize="12px" color="#6c757d">
                                        ({manualMetadata.dataElements.filter(de => de.createdInDHIS2).length} in DHIS2)
                                    </Box>
                                </Box>
                                <Box>
                                    <strong>{i18n.t('Category Combos')}: </strong>
                                    <Tag>{manualMetadata.categoryCombos.length}</Tag>
                                    <Box fontSize="12px" color="#6c757d">
                                        ({manualMetadata.categoryCombos.filter(cc => cc.createdInDHIS2).length} in DHIS2)
                                    </Box>
                                </Box>
                                <Box>
                                    <strong>{i18n.t('Categories')}: </strong>
                                    <Tag>{manualMetadata.categories.length}</Tag>
                                    <Box fontSize="12px" color="#6c757d">
                                        ({manualMetadata.categories.filter(c => c.createdInDHIS2).length} in DHIS2)
                                    </Box>
                                </Box>
                                <Box>
                                    <strong>{i18n.t('Category Options')}: </strong>
                                    <Tag>{manualMetadata.categoryOptions.length}</Tag>
                                    <Box fontSize="12px" color="#6c757d">
                                        ({manualMetadata.categoryOptions.filter(co => co.createdInDHIS2).length} in DHIS2)
                                    </Box>
                                </Box>
                                <Box>
                                    <strong>{i18n.t('Attachments')}: </strong>
                                    <Tag>{manualMetadata.attachments.length}</Tag>
                                </Box>
                            </Box>

                            {progress.message && (
                                <Box marginTop="16px">
                                    <Box fontSize="14px" color="#6c757d" marginBottom="8px">
                                        {progress.message}
                                    </Box>
                                    {progress.percentage > 0 && (
                                        <Box width="100%" height="4px" backgroundColor="#f0f0f0" borderRadius="2px">
                                            <Box 
                                                width={`${progress.percentage}%`} 
                                                height="100%" 
                                                backgroundColor="#007bff" 
                                                borderRadius="2px"
                                                transition="width 0.3s ease"
                                            />
                                        </Box>
                                    )}
                                </Box>
                            )}

                            <ButtonStrip marginTop="24px">
                                <Button 
                                    primary 
                                    onClick={() => setShowCreator(true)}
                                    disabled={loading}
                                >
                                    {i18n.t('Create New Metadata')}
                                </Button>
                                <Button 
                                    onClick={handleCreateAssessmentTools}
                                    disabled={loading || !manualMetadata.datasets.some(ds => ds.createdInDHIS2)}
                                >
                                    {i18n.t('Create Assessment Tools')}
                                </Button>
                                <Button 
                                    onClick={handleSyncWithDHIS2}
                                    disabled={loading}
                                >
                                    {i18n.t('Sync with DHIS2')}
                                </Button>
                                <Button 
                                    onClick={handleExportMetadata}
                                    disabled={loading || !manualMetadata.datasets.length}
                                >
                                    {i18n.t('Export Metadata')}
                                </Button>
                            </ButtonStrip>
                        </Box>
                    ) : (
                        <Box>
                            <NoticeBox title={i18n.t('No Manual Metadata Found')}>
                                {i18n.t('No manual metadata has been created yet. Click "Create New Metadata" to get started.')}
                            </NoticeBox>
                            <ButtonStrip marginTop="16px">
                                <Button primary onClick={() => setShowCreator(true)}>
                                    {i18n.t('Create New Metadata')}
                                </Button>
                            </ButtonStrip>
                        </Box>
                    )}
                </Box>
            </Card>
        </Box>
    )

    const renderDatasets = () => (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                <h3>{i18n.t('Manual Datasets')}</h3>
                <Button small onClick={() => setShowCreator(true)}>
                    <IconAdd16 />
                    {i18n.t('Create Dataset')}
                </Button>
            </Box>
            
            {manualMetadata?.datasets.length > 0 ? (
                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Period Type')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Data Elements')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Created')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {manualMetadata.datasets.map(dataset => (
                            <DataTableRow key={dataset.id}>
                                <DataTableCell>{dataset.name}</DataTableCell>
                                <DataTableCell>{dataset.code}</DataTableCell>
                                <DataTableCell>{dataset.periodType}</DataTableCell>
                                <DataTableCell>{dataset.dataSetElements?.length || 0}</DataTableCell>
                                <DataTableCell>
                                    {dataset.createdInDHIS2 ? (
                                        <Tag positive>{i18n.t('In DHIS2')}</Tag>
                                    ) : (
                                        <Tag neutral>{i18n.t('Local Only')}</Tag>
                                    )}
                                </DataTableCell>
                                <DataTableCell>
                                    {new Date(dataset.createdAt).toLocaleDateString()}
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
            ) : (
                <NoticeBox>
                    {i18n.t('No datasets created yet. Use the metadata creator to create datasets.')}
                </NoticeBox>
            )}
        </Box>
    )

    return (
        <Box>
            <Box marginBottom="24px">
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#212934' }}>
                    {i18n.t('Manual Metadata Creation')}
                </h2>
                <Box marginTop="8px" fontSize="14px" color="#6c757d">
                    {i18n.t('Create and manage DHIS2 metadata manually with full datastore integration and attachment support')}
                </Box>
            </Box>

            <TabBar>
                <Tab selected={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                    {i18n.t('Overview')}
                </Tab>
                <Tab selected={activeTab === 'datasets'} onClick={() => setActiveTab('datasets')}>
                    {i18n.t('Datasets')} ({manualMetadata?.datasets.length || 0})
                </Tab>
            </TabBar>

            <Box marginTop="24px">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'datasets' && renderDatasets()}
            </Box>

            <ButtonStrip marginTop="24px">
                <Button onClick={onClose}>
                    {i18n.t('Close')}
                </Button>
            </ButtonStrip>
        </Box>
    )
}

export default ManualMetadataCreation
