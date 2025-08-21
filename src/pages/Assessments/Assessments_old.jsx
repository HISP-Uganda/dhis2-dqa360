import React, { useState, useEffect } from 'react'
import { 
    Box, 
    Button, 
    Card, 
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    Tag,
    ButtonStrip,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    CircularLoader,
    NoticeBox
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useNavigate } from 'react-router-dom'
import { usePageHeader } from '../../hooks/usePageHeader'
import { useUserAuthorities } from '../../hooks/useUserAuthorities'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'

export const Assessments = () => {
    const navigate = useNavigate()
    const { hasAuthority } = useUserAuthorities()
    
    // Load assessments from datastore
    const { loadAllAssessments } = useAssessmentDataStore()
    const [assessments, setAssessments] = useState([])
    const [loading, setLoading] = useState(true)

    usePageHeader({
        title: i18n.t('Assessments'),
        description: i18n.t('View and monitor data quality assessments')
    })

    useEffect(() => {
        const fetchAssessments = async () => {
            setLoading(true)
            try {
                const data = await loadAllAssessments()
                const assessmentsList = Array.isArray(data) ? data : Object.values(data || {})
                setAssessments(assessmentsList)
            } catch (error) {
                console.error('Error loading assessments:', error)
                setAssessments([])
            } finally {
                setLoading(false)
            }
        }
        fetchAssessments()
    }, []) // Remove loadAllAssessments dependency

    const getStatusTag = (status) => {
        const statusConfig = {
            active: { color: 'positive', text: i18n.t('Active') },
            completed: { color: 'neutral', text: i18n.t('Completed') },
            draft: { color: 'default', text: i18n.t('Draft') }
        }
        
        const config = statusConfig[status] || statusConfig.draft
        return <Tag positive={config.color === 'positive'} neutral={config.color === 'neutral'}>{config.text}</Tag>
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="24px">
                <div>
                    <h1>{i18n.t('DQA Assessments')}</h1>
                    <p>{i18n.t('Manage and monitor data quality assessments')}</p>
                </div>
                <Button primary onClick={() => setShowCreateModal(true)}>
                    {i18n.t('Create New Assessment')}
                </Button>
            </Box>

            <Card>
                <Box padding="16px">
                    <h3>{i18n.t('Assessment List')}</h3>
                    {loading ? (
                        <Box padding="32px" textAlign="center">
                            <CircularLoader />
                            <Box marginTop="16px">
                                {i18n.t('Loading assessments...')}
                            </Box>
                        </Box>
                    ) : assessments.length === 0 ? (
                        <Box padding="32px" textAlign="center">
                            <Box marginBottom="16px">
                                <h4 style={{ margin: 0, color: '#666' }}>
                                    {i18n.t('No assessments found')}
                                </h4>
                            </Box>
                            <p style={{ color: '#999', margin: 0 }}>
                                {i18n.t('Create your first assessment to get started')}
                            </p>
                        </Box>
                    ) : (
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>
                                        {i18n.t('Assessment Name')}
                                    </DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t('Status')}
                                    </DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t('Period')}
                                    </DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t('Facilities')}
                                    </DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t('Discrepancies')}
                                    </DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t('Created Date')}
                                    </DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t('Actions')}
                                    </DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {assessments.map(assessment => (
                                    <DataTableRow key={assessment.id}>
                                        <DataTableCell>{assessment.name}</DataTableCell>
                                        <DataTableCell>{getStatusTag(assessment.status)}</DataTableCell>
                                        <DataTableCell>{assessment.period}</DataTableCell>
                                        <DataTableCell>{assessment.orgUnits?.length || assessment.facilities || '-'}</DataTableCell>
                                        <DataTableCell>{assessment.discrepancies || '-'}</DataTableCell>
                                        <DataTableCell>{assessment.created ? assessment.created.split('T')[0] : assessment.createdDate || '-'}</DataTableCell>
                                        <DataTableCell>
                                            <ButtonStrip>
                                                <Button small>
                                                    {i18n.t('View')}
                                                </Button>
                                                <Button small secondary>
                                                    {i18n.t('Edit')}
                                                </Button>
                                            </ButtonStrip>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </DataTableBody>
                        </DataTable>
                    )}
                </Box>
            </Card>

            {showCreateModal && (
                <Modal large onClose={() => setShowCreateModal(false)}>
                    <ModalTitle>{i18n.t('Create New Assessment')}</ModalTitle>
                    <ModalContent>
                        <CreateAssessmentForm onClose={() => setShowCreateModal(false)} />
                    </ModalContent>
                </Modal>
            )}
        </Box>
    )
}