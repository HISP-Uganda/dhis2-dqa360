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
                        <Box marginTop="16px">{i18n.t('Loading assessments...')}</Box>
                    </Box>
                ) : assessments.length === 0 ? (
                    <Box padding="32px" textAlign="center">
                        <Box marginBottom="16px">
                            <h4 style={{ margin: 0, color: '#666' }}>{i18n.t('No assessments found')}</h4>
                        </Box>
                        <p style={{ color: '#999', margin: 0 }}>{i18n.t('Create your first assessment to get started')}</p>
                    </Box>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
                        {assessments.map((assessment) => {
                            const info = assessment.Info || assessment
                            const dhis2Config = assessment.Dhis2config || assessment.dhis2Config || {}
                            const dsSelected = Array.isArray(dhis2Config.datasetsSelected) ? dhis2Config.datasetsSelected : []
                            const localDatasets = Array.isArray(assessment.localDatasetsCreated) ? assessment.localDatasetsCreated : []
                            const orgUnitMapping = Array.isArray(dhis2Config.orgUnitMapping) ? dhis2Config.orgUnitMapping : []
                            const orgUnitCount = orgUnitMapping.length || dhis2Config.organisationUnits?.length || assessment.orgUnits?.length || assessment.facilities || 0

                            const createdBy = info?.createdBy?.displayName || info?.createdBy?.username || assessment.createdBy || 'system'
                            const createdDate = info?.createdAt || assessment.createdAt || assessment.created
                            const idShort = (assessment.id || '').toString().slice(0, 12)

                            const periodLabel = (() => {
                                if (info?.startDate && info?.endDate) {
                                    try {
                                        const s = new Date(info.startDate).toLocaleDateString()
                                        const e = new Date(info.endDate).toLocaleDateString()
                                        return `${s} - ${e}`
                                    } catch { /* ignore */ }
                                }
                                return info?.period || i18n.t('No period set')
                            })()

                            const frequency = info?.frequency || i18n.t('Not specified')
                            const type = info?.assessmentType || '-'
                            const priority = info?.priority || '-'
                            const methodology = info?.methodology || '-'

                            const connectionConfigured = !!(dhis2Config?.info?.configured)
                            const datasetsCreatedText = `${localDatasets.length}/4`

                            const selectedNames = dsSelected.map(d => d?.info?.name || d?.name).filter(Boolean)
                            const selectedSummary = selectedNames.length ? selectedNames.slice(0, 3).join(', ') + (selectedNames.length > 3 ? ` +${selectedNames.length - 3}` : '') : i18n.t('No datasets selected')

                            return (
                                <div key={assessment.id} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 16, background: '#fff' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 600 }}>{info?.name || i18n.t('Untitled Assessment')}</div>
                                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                                                {i18n.t('Created by')}: {createdBy} • ID: {idShort}
                                            </div>
                                        </div>
                                        <div>{getStatusTag(info?.status)}</div>
                                    </div>

                                    {/* Meta grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{i18n.t('Period')}</div>
                                            <div style={{ fontWeight: 600 }}>{periodLabel}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{i18n.t('Frequency')}</div>
                                            <div style={{ fontWeight: 600 }}>{frequency}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{i18n.t('Assessment Type')}</div>
                                            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{type}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{i18n.t('Priority')}</div>
                                            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{priority}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{i18n.t('Method')}</div>
                                            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{methodology}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{i18n.t('Facilities')}</div>
                                            <div style={{ fontWeight: 600 }}>{orgUnitCount}</div>
                                        </div>
                                    </div>

                                    {/* Config + datasets */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{i18n.t('DHIS2 Connection')}</div>
                                            <div style={{ fontWeight: 600 }}>
                                                {connectionConfigured ? '✅ ' + i18n.t('Configured') : '❌ ' + i18n.t('Not Configured')}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                                                {orgUnitMapping.length > 0 ? `${orgUnitMapping.length} ${i18n.t('mappings')}` : i18n.t('No mappings')}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>{i18n.t('Datasets')}</div>
                                            <div style={{ fontWeight: 600 }}>{selectedSummary}</div>
                                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                                                {i18n.t('Local datasets created')}: {datasetsCreatedText}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                                            {createdDate ? new Date(createdDate).toLocaleDateString() : ''}
                                        </div>
                                        <ButtonStrip>
                                            <Button small onClick={() => navigate(`/administration/assessments/view/${assessment.id}`)}>
                                                {i18n.t('View')}
                                            </Button>
                                            {hasAuthority('DQA360_ADMIN') && (
                                                <Button small secondary onClick={() => navigate(`/administration/assessments/edit/${assessment.id}`)}>
                                                    {i18n.t('Edit')}
                                                </Button>
                                            )}
                                        </ButtonStrip>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </Box>
        </Box>
    )
}