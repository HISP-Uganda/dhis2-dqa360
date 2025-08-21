import React, { useState, useEffect } from 'react'
import { 
    Card, 
    Button, 
    CircularLoader, 
    NoticeBox,
    Box,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    Tag,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions
} from '@dhis2/ui'
import { useAssessmentDataStore } from '../services/assessmentDataStoreService'

export const DataStoreViewer = () => {
    const { getAssessments, getAssessment } = useAssessmentDataStore()
    const [assessments, setAssessments] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [selectedAssessment, setSelectedAssessment] = useState(null)
    const [detailsModalOpen, setDetailsModalOpen] = useState(false)

    const loadAssessments = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getAssessments()
            setAssessments(data || [])
            console.log('📋 Assessments loaded:', data)
        } catch (err) {
            console.error('Error loading assessments:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const viewAssessmentDetails = async (assessmentId) => {
        try {
            const assessment = await getAssessment(assessmentId)
            setSelectedAssessment(assessment)
            setDetailsModalOpen(true)
            console.log('📋 Assessment details:', assessment)
        } catch (err) {
            console.error('Error loading assessment details:', err)
            setError(err.message)
        }
    }

    useEffect(() => {
        loadAssessments()
    }, [])

    const renderAssessmentStructure = (assessment) => {
        if (!assessment) return null

        return (
            <div style={{ fontFamily: 'monospace', fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
                <h4>Assessment Structure (v{assessment.version})</h4>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify({
                        id: assessment.id,
                        version: assessment.version,
                        structure: assessment.structure,
                        Info: {
                            name: assessment.Info?.name,
                            description: assessment.Info?.description,
                            assessmentType: assessment.Info?.assessmentType,
                            priority: assessment.Info?.priority,
                            methodology: assessment.Info?.methodology,
                            frequency: assessment.Info?.frequency,
                            reportingLevel: assessment.Info?.reportingLevel,
                            dataQualityDimensions: assessment.Info?.dataQualityDimensions,
                            startDate: assessment.Info?.startDate,
                            endDate: assessment.Info?.endDate,
                            status: assessment.Info?.status,
                            createdBy: assessment.Info?.createdBy,
                            '...': '(and more fields)'
                        },
                        Dhis2config: {
                            info: {
                                baseUrl: assessment.Dhis2config?.info?.baseUrl,
                                username: assessment.Dhis2config?.info?.username,
                                configured: assessment.Dhis2config?.info?.configured,
                                connectionStatus: assessment.Dhis2config?.info?.connectionStatus,
                                version: assessment.Dhis2config?.info?.version,
                                '...': '(and more fields)'
                            },
                            datasetsSelected: assessment.Dhis2config?.datasetsSelected?.map(ds => ({
                                info: {
                                    id: ds.info?.id,
                                    name: ds.info?.name,
                                    periodType: ds.info?.periodType,
                                    '...': '(and more fields)'
                                },
                                dataElements: `${ds.dataElements?.length || 0} elements`,
                                organisationUnits: `${ds.organisationUnits?.length || 0} org units`
                            })) || [],
                            orgUnitMapping: `${assessment.Dhis2config?.orgUnitMapping?.length || 0} mappings`
                        },
                        localDatasetsCreated: assessment.localDatasetsCreated?.map(lds => ({
                            info: {
                                id: lds.info?.id,
                                name: lds.info?.name,
                                type: lds.info?.type,
                                dhis2Id: lds.info?.dhis2Id,
                                status: lds.info?.status,
                                '...': '(and more fields)'
                            },
                            dataElements: `${lds.dataElements?.length || 0} elements`,
                            orgUnits: `${lds.orgUnits?.length || 0} org units`,
                            sharingSettings: `${lds.sharingSettings?.length || 0} settings`
                        })) || []
                    }, null, 2)}
                </pre>
            </div>
        )
    }

    return (
        <Card>
            <Box padding="16px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>DataStore Viewer</h3>
                    <Button onClick={loadAssessments} loading={loading}>
                        Refresh
                    </Button>
                </div>

                {error && (
                    <NoticeBox error title="Error">
                        {error}
                    </NoticeBox>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <CircularLoader />
                    </div>
                ) : assessments.length === 0 ? (
                    <NoticeBox title="No Assessments">
                        No assessments found in the datastore. Create a new assessment to see the nested structure.
                    </NoticeBox>
                ) : (
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>ID</DataTableColumnHeader>
                                <DataTableColumnHeader>Name</DataTableColumnHeader>
                                <DataTableColumnHeader>Type</DataTableColumnHeader>
                                <DataTableColumnHeader>Status</DataTableColumnHeader>
                                <DataTableColumnHeader>Created</DataTableColumnHeader>
                                <DataTableColumnHeader>Structure</DataTableColumnHeader>
                                <DataTableColumnHeader>Actions</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {assessments.map((assessment) => (
                                <DataTableRow key={assessment.id}>
                                    <DataTableCell>{assessment.id}</DataTableCell>
                                    <DataTableCell>{assessment.name}</DataTableCell>
                                    <DataTableCell>
                                        <Tag>{assessment.assessmentType || 'baseline'}</Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Tag positive={assessment.status === 'active'}>
                                            {assessment.status || 'draft'}
                                        </Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        {new Date(assessment.createdAt).toLocaleDateString()}
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Tag neutral>v{assessment.version || '3.0.0'}</Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Button 
                                            small 
                                            onClick={() => viewAssessmentDetails(assessment.id)}
                                        >
                                            View Details
                                        </Button>
                                    </DataTableCell>
                                </DataTableRow>
                            ))}
                        </DataTableBody>
                    </DataTable>
                )}

                {detailsModalOpen && (
                    <Modal large onClose={() => setDetailsModalOpen(false)}>
                        <ModalTitle>Assessment Structure Details</ModalTitle>
                        <ModalContent>
                            {renderAssessmentStructure(selectedAssessment)}
                        </ModalContent>
                        <ModalActions>
                            <Button onClick={() => setDetailsModalOpen(false)}>
                                Close
                            </Button>
                        </ModalActions>
                    </Modal>
                )}
            </Box>
        </Card>
    )
}

export default DataStoreViewer