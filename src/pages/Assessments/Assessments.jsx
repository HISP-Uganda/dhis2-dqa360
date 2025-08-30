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
                
                // Debug: Log the structure of the first assessment
                if (assessmentsList.length > 0) {
                    console.log('🔍 First assessment structure:', {
                        id: assessmentsList[0].id,
                        hasInfo: !!assessmentsList[0].Info,
                        infoKeys: assessmentsList[0].Info ? Object.keys(assessmentsList[0].Info) : [],
                        rootKeys: Object.keys(assessmentsList[0]),
                        name: assessmentsList[0].name || assessmentsList[0].Info?.name,
                        period: assessmentsList[0].period || assessmentsList[0].Info?.period,
                        frequency: assessmentsList[0].frequency || assessmentsList[0].Info?.frequency,
                        assessmentType: assessmentsList[0].assessmentType || assessmentsList[0].Info?.assessmentType,
                        status: assessmentsList[0].status || assessmentsList[0].Info?.status
                    })
                }
                
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 20 }}>
                        {assessments.map((assessment) => {
                            // Enhanced data extraction with better fallback logic
                            const info = assessment.Info || assessment
                            const dhis2Config = info.Dhis2config || assessment.Dhis2config || assessment.dhis2Config || {}
                            const dsSelected = Array.isArray(dhis2Config.datasetsSelected) ? dhis2Config.datasetsSelected : []
                            const localDatasets = Array.isArray(assessment.localDatasetsCreated) ? assessment.localDatasetsCreated : (assessment.localDatasets?.createdDatasets || [])
                            const orgUnitMapping = Array.isArray(dhis2Config.orgUnitMapping) ? dhis2Config.orgUnitMapping : []
                            const elementMappings = Array.isArray(assessment.elementMappings) ? assessment.elementMappings : []

                            // Enhanced data extraction from nested structure with comprehensive fallbacks
                            const createdBy = info?.createdBy?.displayName || info?.createdBy?.username || assessment.createdBy || 'system'
                            const lastModifiedBy = info?.lastModifiedBy?.displayName || info?.lastModifiedBy?.username || info?.createdBy?.displayName || 'system'
                            const createdDate = info?.createdAt || assessment.createdAt || assessment.created
                            const lastUpdated = info?.lastUpdated || assessment.lastUpdated || assessment.updated
                            const idShort = (assessment.id || '').toString().slice(-8)

                            // Period and date handling with multiple fallback sources
                            const periodLabel = (() => {
                                // Try startDate/endDate first
                                if (info?.startDate && info?.endDate) {
                                    try {
                                        const s = new Date(info.startDate).toLocaleDateString()
                                        const e = new Date(info.endDate).toLocaleDateString()
                                        return `${s} - ${e}`
                                    } catch { /* ignore */ }
                                }
                                // Try period field from multiple sources
                                return info?.period || assessment.period || assessment.assessmentPeriod || i18n.t('No period set')
                            })()

                            // Assessment metadata with comprehensive fallbacks
                            const frequency = info?.frequency || assessment.frequency || assessment.assessmentFrequency || i18n.t('Not specified')
                            const type = info?.assessmentType || assessment.assessmentType || assessment.type || 'baseline'
                            const priority = info?.priority || assessment.priority || 'medium'
                            const methodology = info?.methodology || assessment.methodology || assessment.method || 'automated'
                            const scope = info?.scope || assessment.scope || assessment.assessmentScope || '-'
                            const reportingLevel = info?.reportingLevel || assessment.reportingLevel || assessment.level || '-'

                            // Data quality dimensions with fallbacks
                            const dimensions = info?.dataDimensionsQuality || info?.dataQualityDimensions || assessment.dataQualityDimensions || assessment.dimensions || []
                            const dimensionsText = dimensions.length > 0 ? dimensions.slice(0, 2).join(', ') + (dimensions.length > 2 ? ` +${dimensions.length - 2}` : '') : i18n.t('None specified')

                            // DHIS2 connection details with comprehensive fallbacks
                            const connectionConfigured = !!(dhis2Config?.info?.configured || dhis2Config?.configured || dhis2Config?.baseUrl)
                            const connectionStatus = dhis2Config?.info?.connectionStatus || dhis2Config?.connectionStatus || 'unknown'
                            const dhis2Version = dhis2Config?.info?.version || dhis2Config?.info?.apiVersion || dhis2Config?.version || dhis2Config?.apiVersion || '-'
                            const systemName = dhis2Config?.info?.systemName || dhis2Config?.systemName || 'DHIS2'

                            // Organization units
                            const orgUnitCount = orgUnitMapping.length || 
                                dsSelected.reduce((total, ds) => total + (ds?.organisationUnits?.length || 0), 0) ||
                                dhis2Config.organisationUnits?.length || 
                                assessment.orgUnits?.length || 
                                assessment.facilities || 0

                            // Datasets information with better fallbacks
                            const selectedNames = dsSelected.map(d => d?.info?.name || d?.name || d?.displayName).filter(Boolean)
                            const selectedSummary = selectedNames.length ? 
                                selectedNames.slice(0, 2).join(', ') + (selectedNames.length > 2 ? ` +${selectedNames.length - 2}` : '') : 
                                (assessment.datasets ? `${Object.keys(assessment.datasets).length} datasets configured` : i18n.t('No datasets selected'))

                            // Local datasets by type
                            const datasetsByType = localDatasets.reduce((acc, ds) => {
                                const type = ds.datasetType || 'unknown'
                                acc[type] = (acc[type] || 0) + 1
                                return acc
                            }, {})

                            const localDatasetsText = Object.entries(datasetsByType)
                                .map(([type, count]) => `${type.toUpperCase()}: ${count}`)
                                .join(', ') || i18n.t('None created')

                            // Element mappings count
                            const totalMappings = elementMappings.reduce((total, em) => total + (em.mappings?.length || 0), 0)

                            // Tags and additional metadata
                            const tags = info?.tags || assessment.tags || []
                            const tagsText = tags.length > 0 ? tags.slice(0, 3).join(', ') + (tags.length > 3 ? ` +${tags.length - 3}` : '') : ''
                            
                            // Assessment name and description with fallbacks
                            const assessmentName = info?.name || assessment.name || assessment.assessmentName || i18n.t('Untitled Assessment')
                            const assessmentDescription = info?.description || assessment.description || assessment.assessmentDescription || ''
                            
                            // Status with better fallback
                            const assessmentStatus = info?.status || assessment.status || assessment.assessmentStatus || 'draft'

                            return (
                                <div key={assessment.id} style={{ 
                                    border: '1px solid #E5E7EB', 
                                    borderRadius: 12, 
                                    padding: 20, 
                                    background: '#fff',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                                                {assessmentName}
                                            </div>
                                            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
                                                {assessmentDescription && (
                                                    <div style={{ marginBottom: 4 }}>
                                                        {assessmentDescription.length > 80 ? `${assessmentDescription.substring(0, 80)}...` : assessmentDescription}
                                                    </div>
                                                )}
                                                <div>
                                                    <span style={{ fontWeight: 500 }}>ID:</span> ...{idShort} • 
                                                    <span style={{ fontWeight: 500 }}> Created by:</span> {createdBy}
                                                </div>
                                            </div>
                                            {tagsText && (
                                                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
                                                    <span style={{ fontWeight: 500 }}>Tags:</span> {tagsText}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                            {getStatusTag(assessmentStatus)}
                                            <div style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'right' }}>
                                                v{assessment.version || '1.0.0'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assessment Details Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{i18n.t('Period & Scope')}</div>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{periodLabel}</div>
                                            <div style={{ fontSize: 12, color: '#374151' }}>
                                                {frequency} • {scope} • {reportingLevel}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{i18n.t('Assessment Config')}</div>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, textTransform: 'capitalize' }}>
                                                {type} • {priority}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#374151', textTransform: 'capitalize' }}>
                                                {methodology}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data Quality Dimensions */}
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 4 }}>
                                            {i18n.t('Data Quality Dimensions')}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                                            {dimensionsText}
                                        </div>
                                    </div>

                                    {/* DHIS2 Connection Status */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{i18n.t('DHIS2 Connection')}</div>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                                {connectionConfigured ? (
                                                    <span style={{ color: connectionStatus === 'ok' ? '#059669' : '#DC2626' }}>
                                                        {connectionStatus === 'ok' ? '✅ Connected' : '⚠️ Issues'}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#DC2626' }}>❌ Not Configured</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#374151' }}>
                                                {systemName} {dhis2Version && `(v${dhis2Version})`}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{i18n.t('Organization Units')}</div>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                                {orgUnitCount} {i18n.t('facilities')}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#374151' }}>
                                                {orgUnitMapping.length > 0 ? `${orgUnitMapping.length} mappings` : i18n.t('No mappings')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Datasets Information */}
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 4 }}>
                                            {i18n.t('Selected Datasets')} ({dsSelected.length})
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                                            {selectedSummary}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 2 }}>
                                            {i18n.t('Local Datasets Created')}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#374151' }}>
                                            {localDatasetsText}
                                        </div>
                                    </div>

                                    {/* Element Mappings */}
                                    {elementMappings.length > 0 && (
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 4 }}>
                                                {i18n.t('Element Mappings')}
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                                                {elementMappings.length} elements • {totalMappings} total mappings
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer with dates and actions */}
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        marginTop: 16,
                                        paddingTop: 16,
                                        borderTop: '1px solid #F3F4F6'
                                    }}>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                                            <div>
                                                <span style={{ fontWeight: 500 }}>Created:</span> {createdDate ? new Date(createdDate).toLocaleDateString() : '-'}
                                            </div>
                                            {lastUpdated && lastUpdated !== createdDate && (
                                                <div style={{ marginTop: 2 }}>
                                                    <span style={{ fontWeight: 500 }}>Updated:</span> {new Date(lastUpdated).toLocaleDateString()} by {lastModifiedBy}
                                                </div>
                                            )}
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