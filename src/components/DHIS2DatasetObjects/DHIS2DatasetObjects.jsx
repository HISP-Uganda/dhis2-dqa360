import React, { useState, useEffect } from 'react'
import { 
    Box, 
    Button, 
    Card, 
    CircularLoader,
    NoticeBox,
    ButtonStrip,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    Tag,
    IconDownload24,
    IconView24,
    IconCopy24
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'

export const DHIS2DatasetObjects = ({ assessmentId, assessment }) => {
    const { getAssessment } = useAssessmentDataStore()
    
    const [loading, setLoading] = useState(false)
    const [dhis2Objects, setDhis2Objects] = useState(null)
    const [datasetSummary, setDatasetSummary] = useState(null)
    const [error, setError] = useState(null)
    const [selectedDataset, setSelectedDataset] = useState(null)
    const [showObjectModal, setShowObjectModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [importPayload, setImportPayload] = useState(null)

    // Load dataset summary on component mount
    useEffect(() => {
        if (assessmentId) {
            loadDatasetSummary()
        }
    }, [assessmentId])

    const loadDatasetSummary = async () => {
        try {
            setLoading(true)
            const summary = await getAssessmentDatasetSummary(assessmentId)
            setDatasetSummary(summary)
        } catch (error) {
            console.error('Error loading dataset summary:', error)
            setError('Failed to load dataset summary')
        } finally {
            setLoading(false)
        }
    }

    const loadDHIS2Objects = async () => {
        try {
            setLoading(true)
            setError(null)
            const objects = await extractDHIS2DatasetObjects(assessmentId)
            setDhis2Objects(objects)
        } catch (error) {
            console.error('Error loading DHIS2 objects:', error)
            setError('Failed to load DHIS2 dataset objects')
        } finally {
            setLoading(false)
        }
    }

    const generateImportPayload = async () => {
        try {
            setLoading(true)
            setError(null)
            const payload = await generateDHIS2MetadataImport(assessmentId)
            setImportPayload(payload)
            setShowImportModal(true)
        } catch (error) {
            console.error('Error generating import payload:', error)
            setError('Failed to generate DHIS2 import payload')
        } finally {
            setLoading(false)
        }
    }

    const downloadImportPayload = () => {
        if (!importPayload) return

        const dataStr = JSON.stringify(importPayload, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${assessment?.name || 'assessment'}_dhis2_metadata_import.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!')
        }).catch(err => {
            console.error('Failed to copy:', err)
            alert('Failed to copy to clipboard')
        })
    }

    const viewDatasetObject = (dataset) => {
        setSelectedDataset(dataset)
        setShowObjectModal(true)
    }

    if (loading && !datasetSummary) {
        return (
            <Card>
                <Box padding="32px" textAlign="center">
                    <CircularLoader />
                    <div style={{ marginTop: '16px' }}>
                        {i18n.t('Loading DHIS2 dataset objects...')}
                    </div>
                </Box>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <Box padding="24px">
                    <NoticeBox error title="Error">
                        {error}
                    </NoticeBox>
                </Box>
            </Card>
        )
    }

    if (!datasetSummary || datasetSummary.totalDatasets === 0) {
        return (
            <Card>
                <Box padding="24px">
                    <div style={{ textAlign: 'center' }}>
                        <NoticeBox warning title={i18n.t('No DQA Datasets Created')}>
                            <p>{i18n.t('This assessment does not have the required 4 DQA datasets (Register, Summary, Reported, Corrected) created yet.')}</p>
                            <p>{i18n.t('To create the datasets, you need to complete the assessment setup through all required steps.')}</p>
                        </NoticeBox>
                        
                        <div style={{ marginTop: '20px' }}>
                            <Button 
                                primary 
                                large
                                onClick={() => window.location.href = `/administration/assessments/edit/${assessmentId}`}
                            >
                                {i18n.t('Complete Assessment Setup')}
                            </Button>
                        </div>
                        
                        <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                            <p><strong>{i18n.t('Required Steps:')}</strong></p>
                            <ul style={{ textAlign: 'left', display: 'inline-block', margin: '8px 0' }}>
                                <li>{i18n.t('Step 1: Basic Information')}</li>
                                <li>{i18n.t('Step 2: Source Dataset Selection')}</li>
                                <li>{i18n.t('Step 3: Data Elements Mapping')}</li>
                                <li>{i18n.t('Step 4: Dataset Preparation')}</li>
                                <li>{i18n.t('Step 5: Organisation Units Assignment')}</li>
                                <li>{i18n.t('Step 6: Review & Create Datasets')}</li>
                            </ul>
                        </div>
                    </div>
                </Box>
            </Card>
        )
    }

    return (
        <Card>
            <Box padding="24px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                        {i18n.t('DHIS2 Dataset Objects')}
                    </h3>
                    <ButtonStrip>
                        <Button 
                            secondary 
                            onClick={loadDHIS2Objects}
                            disabled={loading}
                        >
                            {i18n.t('Load Objects')}
                        </Button>
                        <Button 
                            primary 
                            icon={<IconDownload24 />}
                            onClick={generateImportPayload}
                            disabled={loading}
                        >
                            {i18n.t('Generate Import')}
                        </Button>
                    </ButtonStrip>
                </div>

                {/* Dataset Summary */}
                <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                        {i18n.t('Dataset Summary')}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1976d2' }}>
                                {datasetSummary.totalDatasets}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>Total Datasets</div>
                        </div>
                        <div style={{ padding: '12px', backgroundColor: '#e8f5e8', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#388e3c' }}>
                                {datasetSummary.totalDataElements}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>Total Data Elements</div>
                        </div>
                        <div style={{ padding: '12px', backgroundColor: '#fff3e0', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#f57c00' }}>
                                {datasetSummary.totalOrganisationUnits}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>Organisation Units</div>
                        </div>
                    </div>
                </div>

                {/* Dataset Types Table */}
                <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                        {i18n.t('Created Datasets')}
                    </h4>
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Type')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Data Elements')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Period Type')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {(datasetSummary?.datasetTypes || []).map((dataset, index) => (
                                <DataTableRow key={index}>
                                    <DataTableCell>
                                        <Tag positive={dataset.type === 'register'}
                                             neutral={dataset.type === 'summary'}
                                             negative={dataset.type === 'reported'}
                                             default={dataset.type === 'corrected'}>
                                            {dataset.type.charAt(0).toUpperCase() + dataset.type.slice(1)}
                                        </Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <div style={{ fontWeight: '500' }}>{dataset.name}</div>
                                        <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                                            {dataset.id}
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                            {dataset.code}
                                        </span>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <span style={{ fontWeight: '500' }}>{dataset.dataElements}</span>
                                    </DataTableCell>
                                    <DataTableCell>{dataset.periodType}</DataTableCell>
                                    <DataTableCell>
                                        <ButtonStrip>
                                            <Button 
                                                small 
                                                secondary 
                                                icon={<IconView24 />}
                                                onClick={() => viewDatasetObject(dataset)}
                                            >
                                                {i18n.t('View')}
                                            </Button>
                                        </ButtonStrip>
                                    </DataTableCell>
                                </DataTableRow>
                            ))}
                        </DataTableBody>
                    </DataTable>
                </div>

                {/* DHIS2 Objects Display */}
                {dhis2Objects && (
                    <div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                            {i18n.t('DHIS2 Objects Summary')}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontWeight: '600' }}>{dhis2Objects?.dataSets?.length || 0}</div>
                                <div style={{ fontSize: '12px' }}>Datasets</div>
                            </div>
                            <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontWeight: '600' }}>{dhis2Objects?.dataElements?.length || 0}</div>
                                <div style={{ fontSize: '12px' }}>Data Elements</div>
                            </div>
                            <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontWeight: '600' }}>{dhis2Objects?.organisationUnits?.length || 0}</div>
                                <div style={{ fontSize: '12px' }}>Org Units</div>
                            </div>
                            <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontWeight: '600' }}>{dhis2Objects?.categoryCombos?.length || 0}</div>
                                <div style={{ fontSize: '12px' }}>Category Combos</div>
                            </div>
                        </div>
                        
                        <ButtonStrip>
                            <Button 
                                secondary 
                                icon={<IconCopy24 />}
                                onClick={() => copyToClipboard(JSON.stringify(dhis2Objects, null, 2))}
                            >
                                {i18n.t('Copy Objects')}
                            </Button>
                        </ButtonStrip>
                    </div>
                )}

                {/* Dataset Object Modal */}
                {showObjectModal && selectedDataset && (
                    <Modal large onClose={() => setShowObjectModal(false)}>
                        <ModalTitle>
                            {i18n.t('Dataset Object: {{name}}', { name: selectedDataset.name })}
                        </ModalTitle>
                        <ModalContent>
                            <div style={{ marginBottom: '16px' }}>
                                <strong>Type:</strong> {selectedDataset.type}<br/>
                                <strong>ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedDataset.id}</span><br/>
                                <strong>Code:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedDataset.code}</span><br/>
                                <strong>Period Type:</strong> {selectedDataset.periodType}<br/>
                                <strong>Data Elements:</strong> {selectedDataset.dataElements}
                            </div>
                            
                            {assessment?.localDatasetsMetadata?.createdDatasets && (
                                <div>
                                    <h4>Complete Dataset Object:</h4>
                                    <div style={{ 
                                        backgroundColor: '#f8f9fa', 
                                        padding: '12px', 
                                        borderRadius: '4px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {JSON.stringify(
                                            assessment.localDatasetsMetadata.createdDatasets.find(ds => ds.type === selectedDataset.type), 
                                            null, 
                                            2
                                        )}
                                    </div>
                                </div>
                            )}
                        </ModalContent>
                        <ModalActions>
                            <ButtonStrip>
                                <Button 
                                    secondary 
                                    onClick={() => copyToClipboard(JSON.stringify(
                                        assessment.localDatasetsMetadata.createdDatasets.find(ds => ds.type === selectedDataset.type), 
                                        null, 
                                        2
                                    ))}
                                >
                                    {i18n.t('Copy Object')}
                                </Button>
                                <Button onClick={() => setShowObjectModal(false)}>
                                    {i18n.t('Close')}
                                </Button>
                            </ButtonStrip>
                        </ModalActions>
                    </Modal>
                )}

                {/* Import Payload Modal */}
                {showImportModal && importPayload && (
                    <Modal large onClose={() => setShowImportModal(false)}>
                        <ModalTitle>
                            {i18n.t('DHIS2 Metadata Import Payload')}
                        </ModalTitle>
                        <ModalContent>
                            <div style={{ marginBottom: '16px' }}>
                                <NoticeBox title="Import Instructions">
                                    <p>This payload can be imported into DHIS2 using:</p>
                                    <ul>
                                        <li>System Settings → Import/Export → Metadata Import</li>
                                        <li>API: POST /api/metadata with this JSON payload</li>
                                        <li>DHIS2 Import/Export app</li>
                                    </ul>
                                </NoticeBox>
                            </div>
                            
                            <div style={{ 
                                backgroundColor: '#f8f9fa', 
                                padding: '12px', 
                                borderRadius: '4px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {JSON.stringify(importPayload, null, 2)}
                            </div>
                        </ModalContent>
                        <ModalActions>
                            <ButtonStrip>
                                <Button 
                                    secondary 
                                    icon={<IconCopy24 />}
                                    onClick={() => copyToClipboard(JSON.stringify(importPayload, null, 2))}
                                >
                                    {i18n.t('Copy Payload')}
                                </Button>
                                <Button 
                                    primary 
                                    icon={<IconDownload24 />}
                                    onClick={downloadImportPayload}
                                >
                                    {i18n.t('Download JSON')}
                                </Button>
                                <Button onClick={() => setShowImportModal(false)}>
                                    {i18n.t('Close')}
                                </Button>
                            </ButtonStrip>
                        </ModalActions>
                    </Modal>
                )}
            </Box>
        </Card>
    )
}