import React, { useState, useEffect } from 'react'
import { 
    Box, 
    Button, 
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    Tag,
    ButtonStrip,

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
    const { getAssessments } = useAssessmentDataStore()
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
                const data = await getAssessments()
                console.log('📊 Raw assessments data:', data)
                const assessmentsList = Array.isArray(data) ? data : Object.values(data || {})
                console.log('📊 Processed assessments list:', assessmentsList)
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
                {hasAuthority('DQA360_ADMIN') && (
                    <Button primary onClick={() => navigate('/administration/assessments/create')}>
                        {i18n.t('Create New Assessment')}
                    </Button>
                )}
            </Box>

            <Box>
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
                                        {i18n.t('DQA Datasets')}
                                    </DataTableColumnHeader>
                                    <DataTableColumnHeader>
                                        {i18n.t('Baseline ID')}
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
                                {assessments.map(assessment => {
                                    // Handle both new v3.0.0 structure and legacy structure
                                    const assessmentInfo = assessment.Info || assessment
                                    const dhis2Config = assessment.Dhis2config || assessment.dhis2Config || {}
                                    const localDatasets = assessment.localDatasetsCreated || []
                                    const orgUnitMapping = dhis2Config.orgUnitMapping || []
                                    const orgUnitCount = orgUnitMapping.length || 
                                                       dhis2Config.organisationUnits?.length || 
                                                       assessment.orgUnits?.length || 
                                                       assessment.facilities || 0

                                    // Calculate period display
                                    const getPeriodDisplay = () => {
                                        if (assessmentInfo.startDate && assessmentInfo.endDate) {
                                            const startDate = new Date(assessmentInfo.startDate).toLocaleDateString()
                                            const endDate = new Date(assessmentInfo.endDate).toLocaleDateString()
                                            return `${startDate} - ${endDate}`
                                        }
                                        return assessmentInfo.period || assessmentInfo.frequency || '-'
                                    }

                                    // Calculate datasets status
                                    const getDatasetsStatus = () => {
                                        const totalExpected = 4 // DQA typically has 4 datasets
                                        const created = localDatasets.length
                                        if (created === 0) {
                                            return {
                                                text: `${created}/${totalExpected} datasets created`,
                                                color: '#DC2626', // red
                                                action: 'Complete setup to create all 4'
                                            }
                                        } else if (created < totalExpected) {
                                            return {
                                                text: `${created}/${totalExpected} datasets created`,
                                                color: '#D97706', // orange
                                                action: `Create remaining ${totalExpected - created}`
                                            }
                                        } else {
                                            return {
                                                text: `${created}/${totalExpected} datasets created`,
                                                color: '#059669', // green
                                                action: 'Complete'
                                            }
                                        }
                                    }

                                    const datasetsStatus = getDatasetsStatus()
                                    
                                    return (
                                        <DataTableRow key={assessment.id}>
                                            <DataTableCell>
                                                <div>
                                                    <strong>{assessmentInfo.name || 'Unnamed Assessment'}</strong>
                                                    {assessmentInfo.description && (
                                                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                                            {assessmentInfo.description.length > 60 
                                                                ? `${assessmentInfo.description.substring(0, 60)}...` 
                                                                : assessmentInfo.description
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </DataTableCell>
                                            <DataTableCell>
                                                {getStatusTag(assessmentInfo.status)}
                                            </DataTableCell>
                                            <DataTableCell>
                                                {getPeriodDisplay()}
                                            </DataTableCell>
                                            <DataTableCell>
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>
                                                        {orgUnitCount} facilities mapped
                                                    </div>
                                                    {orgUnitMapping.length > 0 && (
                                                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                                                            {orgUnitMapping.slice(0, 2).map((mapping, index) => (
                                                                <div key={index} style={{ marginBottom: '2px' }}>
                                                                    <span style={{ fontWeight: '500' }}>
                                                                        {mapping.external?.name || 'Unknown External'}
                                                                    </span>
                                                                    <span style={{ color: '#9CA3AF' }}> → </span>
                                                                    <span>
                                                                        {mapping.dhis2?.name || 'Unknown DHIS2'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {orgUnitMapping.length > 2 && (
                                                                <div style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                                                                    +{orgUnitMapping.length - 2} more mappings
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {orgUnitMapping.length === 0 && orgUnitCount > 0 && (
                                                        <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px' }}>
                                                            Legacy format - no mapping details
                                                        </div>
                                                    )}
                                                </div>
                                            </DataTableCell>
                                            <DataTableCell>
                                                <div>
                                                    <div style={{ color: datasetsStatus.color, fontWeight: 'bold' }}>
                                                        {datasetsStatus.text}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                                        {datasetsStatus.action}
                                                    </div>
                                                    {localDatasets.length > 0 && (
                                                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                                                            {localDatasets.map(ds => ds.info?.name || ds.name).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </DataTableCell>
                                            <DataTableCell>
                                                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                                    {assessmentInfo.baselineAssessmentId || assessment.baselineAssessmentId || 
                                                     assessment.id?.substring(0, 8) || '-'}
                                                </div>
                                            </DataTableCell>
                                            <DataTableCell>
                                                {assessmentInfo.createdAt ? 
                                                    new Date(assessmentInfo.createdAt).toLocaleDateString() : 
                                                    (assessment.created ? 
                                                        new Date(assessment.created).toLocaleDateString() : 
                                                        (assessment.createdDate || '-')
                                                    )
                                                }
                                            </DataTableCell>
                                            <DataTableCell>
                                                <ButtonStrip>
                                                    <Button 
                                                        small 
                                                        onClick={() => navigate(`/administration/assessments/view/${assessment.id}`)}
                                                    >
                                                        {i18n.t('View')}
                                                    </Button>
                                                    {hasAuthority('DQA360_ADMIN') && (
                                                        <Button 
                                                            small 
                                                            secondary
                                                            onClick={() => navigate(`/administration/assessments/edit/${assessment.id}`)}
                                                        >
                                                            {i18n.t('Edit')}
                                                        </Button>
                                                    )}
                                                </ButtonStrip>
                                            </DataTableCell>
                                        </DataTableRow>
                                    )
                                })}
                            </DataTableBody>
                        </DataTable>
                    )}
                </Box>

        </Box>
    )
}