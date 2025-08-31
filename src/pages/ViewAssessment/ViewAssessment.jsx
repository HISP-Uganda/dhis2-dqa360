import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'
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
    DropdownButton,
    FlyoutMenu,
    MenuItem,
    Divider,
    TabBar,
    Tab,
    NoticeBox,
    CircularLoader,
    IconArrowLeft24,
    IconEdit24,
    IconDelete24,
    IconView24,
    IconDownload24,
    IconMore24,
    IconChevronRight24
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

export const ViewAssessment = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { getAssessment, deleteAssessment } = useAssessmentDataStore()
    
    const [assessment, setAssessment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')

    // Load assessment data
    useEffect(() => {
        const loadAssessment = async () => {
            if (!id) {
                setError('No assessment ID provided')
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError(null)
                const data = await getAssessment(id)
                if (data) {
                    setAssessment(data)
                } else {
                    setError('Assessment not found')
                }
            } catch (err) {
                console.error('Error loading assessment:', err)
                setError(`Failed to load assessment: ${err.message}`)
            } finally {
                setLoading(false)
            }
        }

        loadAssessment()
    }, [id])

    // Handle delete
    const handleDelete = async () => {
        try {
            await deleteAssessment(id)
            navigate('/administration/assessments')
        } catch (err) {
            console.error('Error deleting assessment:', err)
            setError('Failed to delete assessment')
        }
    }

    // Handle navigation
    const handleBack = () => {
        navigate('/administration/assessments')
    }

    const handleEdit = () => {
        navigate(`/administration/assessments/edit/${id}`)
    }

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '400px',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <CircularLoader />
                <div style={{ color: '#6B7280', fontSize: '14px' }}>
                    Loading assessment details...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
                <NoticeBox error title="Error">
                    {error}
                </NoticeBox>
                <div style={{ marginTop: '20px' }}>
                    <Button onClick={handleBack}>
                        Back to Assessments
                    </Button>
                </div>
            </div>
        )
    }

    if (!assessment) {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
                <NoticeBox warning title="Assessment Not Found">
                    The requested assessment could not be found.
                </NoticeBox>
                <div style={{ marginTop: '20px' }}>
                    <Button onClick={handleBack}>
                        Back to Assessments
                    </Button>
                </div>
            </div>
        )
    }

    // Extract assessment information
    const assessmentInfo = assessment.details || assessment
    const dhis2Config = assessment.connection || assessment.Dhis2config || assessment.dhis2Config || {}
    const localDatasets = assessment.dqaDatasetsCreated || []

    return (
        <div style={{
            margin: '0 auto',
            backgroundColor: '#F9FAFB',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <Card style={{ marginBottom: '24px' }}>
                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <Button 
                                    small 
                                    secondary 
                                    icon={<IconArrowLeft24 />}
                                    onClick={handleBack}
                                >
                                    Back
                                </Button>
                                <div>
                                    <h1 style={{ 
                                        margin: 0, 
                                        fontSize: '28px', 
                                        fontWeight: '700',
                                        color: '#111827',
                                        lineHeight: '1.2'
                                    }}>
                                        {assessmentInfo.name || 'Unnamed Assessment'}
                                    </h1>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '16px', 
                                        marginTop: '8px',
                                        flexWrap: 'wrap'
                                    }}>
                                        <Tag positive={assessmentInfo.status === 'active'} neutral={assessmentInfo.status === 'draft'}>
                                            {assessmentInfo.status || 'Draft'}
                                        </Tag>
                                        <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                            ID: <code style={{ 
                                                backgroundColor: '#F3F4F6', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px',
                                                fontSize: '12px'
                                            }}>{assessment.id}</code>
                                        </span>
                                        <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                            Created: {new Date(assessmentInfo.createdAt || assessment.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {assessmentInfo.description && (
                                <p style={{ 
                                    margin: 0, 
                                    color: '#6B7280', 
                                    fontSize: '16px',
                                    lineHeight: '1.5'
                                }}>
                                    {assessmentInfo.description}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ButtonStrip>
                                <Button 
                                    secondary 
                                    icon={<IconEdit24 />}
                                    onClick={handleEdit}
                                >
                                    Edit
                                </Button>
                                
                                <DropdownButton 
                                    component={
                                        <FlyoutMenu>
                                            <MenuItem 
                                                icon={<IconView24 />}
                                                label="View Details"
                                                onClick={() => setActiveTab('overview')}
                                            />
                                            <MenuItem 
                                                icon={<IconDownload24 />}
                                                label="Export Data"
                                                onClick={() => {
                                                    const dataStr = JSON.stringify(assessment, null, 2)
                                                    const dataBlob = new Blob([dataStr], {type: 'application/json'})
                                                    const url = URL.createObjectURL(dataBlob)
                                                    const link = document.createElement('a')
                                                    link.href = url
                                                    link.download = `assessment-${assessment.id}.json`
                                                    link.click()
                                                }}
                                            />
                                            <Divider />
                                            <MenuItem 
                                                icon={<IconDelete24 />}
                                                label="Delete Assessment"
                                                destructive
                                                onClick={() => setDeleteModalOpen(true)}
                                            />
                                        </FlyoutMenu>
                                    }
                                    icon={<IconMore24 />}
                                >
                                    Actions
                                </DropdownButton>
                            </ButtonStrip>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content Tabs */}
            <Card>
                <TabBar>
                    <Tab 
                        selected={activeTab === 'overview'} 
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </Tab>
                    <Tab 
                        selected={activeTab === 'dhis2'} 
                        onClick={() => setActiveTab('dhis2')}
                    >
                        DHIS2 Configuration
                    </Tab>
                    <Tab 
                        selected={activeTab === 'datasets'} 
                        onClick={() => setActiveTab('datasets')}
                    >
                        Datasets ({localDatasets.length})
                    </Tab>
                    <Tab 
                        selected={activeTab === 'mapping'} 
                        onClick={() => setActiveTab('mapping')}
                    >
                        Organization Mapping
                    </Tab>
                    <Tab 
                        selected={activeTab === 'metadata'} 
                        onClick={() => setActiveTab('metadata')}
                    >
                        Raw Data
                    </Tab>
                </TabBar>

                <div style={{ padding: '32px' }}>
                    {activeTab === 'overview' && (
                        <OverviewTab assessment={assessment} assessmentInfo={assessmentInfo} />
                    )}
                    {activeTab === 'dhis2' && (
                        <DHIS2Tab assessment={assessment} dhis2Config={dhis2Config} />
                    )}
                    {activeTab === 'datasets' && (
                        <DatasetsTab assessment={assessment} localDatasets={localDatasets} />
                    )}
                    {activeTab === 'mapping' && (
                        <MappingTab assessment={assessment} dhis2Config={dhis2Config} />
                    )}
                    {activeTab === 'metadata' && (
                        <MetadataTab assessment={assessment} />
                    )}
                </div>
            </Card>

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <Modal onClose={() => setDeleteModalOpen(false)}>
                    <ModalTitle>Delete Assessment</ModalTitle>
                    <ModalContent>
                        <p>Are you sure you want to delete this assessment? This action cannot be undone.</p>
                        <div style={{ 
                            backgroundColor: '#FEF2F2', 
                            border: '1px solid #FECACA', 
                            borderRadius: '6px', 
                            padding: '12px',
                            marginTop: '16px'
                        }}>
                            <strong>Assessment:</strong> {assessmentInfo.name || 'Unnamed Assessment'}
                        </div>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button secondary onClick={() => setDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button destructive onClick={handleDelete}>
                                Delete Assessment
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </div>
    )
}

// Overview Tab Component
const OverviewTab = ({ assessment, assessmentInfo }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set'
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        } catch {
            return dateString
        }
    }

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return { bg: '#ECFDF5', text: '#065F46', border: '#10B981' }
            case 'draft': return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }
            case 'completed': return { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6' }
            case 'archived': return { bg: '#F3F4F6', text: '#374151', border: '#6B7280' }
            default: return { bg: '#F9FAFB', text: '#374151', border: '#D1D5DB' }
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return { bg: '#FEF2F2', text: '#991B1B', border: '#EF4444' }
            case 'medium': return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }
            case 'low': return { bg: '#ECFDF5', text: '#065F46', border: '#10B981' }
            default: return { bg: '#F9FAFB', text: '#374151', border: '#D1D5DB' }
        }
    }

    const StatusBadge = ({ status, type = 'status' }) => {
        const colors = type === 'priority' ? getPriorityColor(status) : getStatusColor(status)
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                textTransform: 'capitalize'
            }}>
                {status || 'Not set'}
            </span>
        )
    }

    const MetricCard = ({ title, value, subtitle, icon, color = '#3B82F6' }) => (
        <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease-in-out'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                }}>
                    {icon}
                </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                {value}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>
                {title}
            </div>
            {subtitle && (
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                    {subtitle}
                </div>
            )}
        </div>
    )

    const InfoSection = ({ title, icon, children, className = '' }) => (
        <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #F3F4F6',
                backgroundColor: '#F9FAFB'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#3B82F615',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px'
                    }}>
                        {icon}
                    </div>
                    <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        {title}
                    </h3>
                </div>
            </div>
            <div style={{ padding: '24px' }}>
                {children}
            </div>
        </div>
    )

    const DetailItem = ({ label, value, type = 'text' }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid #F3F4F6'
        }}>
            <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#6B7280'
            }}>
                {label}
            </span>
            <div style={{ textAlign: 'right' }}>
                {type === 'badge' ? (
                    value
                ) : type === 'code' ? (
                    <code style={{
                        fontSize: '12px',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                        backgroundColor: '#F3F4F6',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        color: '#374151'
                    }}>
                        {value || 'Not set'}
                    </code>
                ) : (
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#111827'
                    }}>
                        {value || 'Not specified'}
                    </span>
                )}
            </div>
        </div>
    )

    // Calculate metrics
    const localDatasets = assessment.localDatasets?.createdDatasets || []
    const localDataElements = assessment.localDataElementsCreated || []
    const localOrgUnits = assessment.localOrgUnitsCreated || []
    const dhis2Config = assessment.Info?.Dhis2config || assessment.Dhis2config || assessment.dhis2Config || {}

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Key Metrics */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <MetricCard
                    title="Local Datasets"
                    value={localDatasets.length}
                    subtitle="DQA datasets created"
                    icon="📊"
                    color="#10B981"
                />
                <MetricCard
                    title="Data Elements"
                    value={localDataElements.length}
                    subtitle="DQA elements attached"
                    icon="🔢"
                    color="#3B82F6"
                />
                <MetricCard
                    title="Organization Units"
                    value={localOrgUnits.length}
                    subtitle="Facilities assigned"
                    icon="🏢"
                    color="#8B5CF6"
                />
                <MetricCard
                    title="DHIS2 Connection"
                    value={dhis2Config.info?.configured ? "Connected" : "Not Connected"}
                    subtitle={dhis2Config.info?.baseUrl ? "External DHIS2" : "Local instance"}
                    icon="🔗"
                    color={dhis2Config.info?.configured ? "#10B981" : "#EF4444"}
                />
            </div>

            {/* Main Information Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
            }}>
                {/* Assessment Details */}
                <InfoSection title="Assessment Details" icon="📋">
                    <DetailItem label="Name" value={assessmentInfo.name} />
                    <DetailItem label="Type" value={assessmentInfo.assessmentType} />
                    <DetailItem 
                        label="Status" 
                        value={<StatusBadge status={assessmentInfo.status} />} 
                        type="badge" 
                    />
                    <DetailItem 
                        label="Priority" 
                        value={<StatusBadge status={assessmentInfo.priority} type="priority" />} 
                        type="badge" 
                    />
                    <DetailItem label="Methodology" value={assessmentInfo.methodology} />
                    <DetailItem label="Frequency" value={assessmentInfo.frequency} />
                </InfoSection>

                {/* Timeline & Dates */}
                <InfoSection title="Timeline & Dates" icon="📅">
                    <DetailItem label="Start Date" value={formatDate(assessmentInfo.startDate)} />
                    <DetailItem label="End Date" value={formatDate(assessmentInfo.endDate)} />
                    <DetailItem label="Period" value={assessmentInfo.period} />
                    <DetailItem label="Created" value={formatDate(assessmentInfo.createdAt)} />
                    <DetailItem label="Last Updated" value={formatDate(assessmentInfo.lastUpdated)} />
                </InfoSection>

                {/* Configuration */}
                <InfoSection title="Configuration" icon="⚙️">
                    <DetailItem label="Reporting Level" value={assessmentInfo.reportingLevel} />
                    <DetailItem label="Auto Sync" value={assessmentInfo.autoSync ? 'Enabled' : 'Disabled'} />
                    <DetailItem label="Notifications" value={assessmentInfo.notifications ? 'Enabled' : 'Disabled'} />
                    <DetailItem label="Confidentiality" value={assessmentInfo.confidentialityLevel} />
                    <DetailItem label="Public Access" value={assessmentInfo.publicAccess ? 'Yes' : 'No'} />
                </InfoSection>

                {/* System Information */}
                <InfoSection title="System Information" icon="💻">
                    <DetailItem label="Assessment ID" value={assessment.id || assessmentInfo.id} type="code" />
                    <DetailItem label="Version" value={assessment.version} type="code" />
                    <DetailItem label="Structure" value={assessment.structure} type="code" />
                    <DetailItem label="Created By" value={assessmentInfo.createdBy?.displayName || assessmentInfo.createdBy?.username} />
                    <DetailItem label="Modified By" value={assessmentInfo.lastModifiedBy?.displayName || assessmentInfo.lastModifiedBy?.username} />
                </InfoSection>
            </div>

            {/* Full-width sections */}
            {assessmentInfo.description && (
                <InfoSection title="Description" icon="📝" className="full-width" style={{ marginBottom: '24px' }}>
                    <p style={{
                        margin: 0,
                        lineHeight: '1.6',
                        color: '#374151',
                        fontSize: '14px'
                    }}>
                        {assessmentInfo.description}
                    </p>
                </InfoSection>
            )}

            {assessmentInfo.objectives && (
                <InfoSection title="Objectives" icon="🎯" className="full-width" style={{ marginBottom: '24px' }}>
                    <p style={{
                        margin: 0,
                        lineHeight: '1.6',
                        color: '#374151',
                        fontSize: '14px'
                    }}>
                        {assessmentInfo.objectives}
                    </p>
                </InfoSection>
            )}

            {assessmentInfo.dataQualityDimensions && assessmentInfo.dataQualityDimensions.length > 0 && (
                <InfoSection title="Data Quality Dimensions" icon="📊" className="full-width">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {assessmentInfo.dataQualityDimensions.map((dimension, index) => (
                            <Tag key={index} neutral>
                                {dimension}
                            </Tag>
                        ))}
                    </div>
                </InfoSection>
            )}
        </div>
    )
}

// DHIS2 Tab Component
const DHIS2Tab = ({ assessment, dhis2Config }) => {
    const connectionInfo = dhis2Config.info || {}
    const isConfigured = connectionInfo.configured && connectionInfo.baseUrl

    const InfoCard = ({ title, icon, children, status }) => (
        <div style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
            ...(status && {
                borderColor: status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : '#E5E7EB',
                backgroundColor: status === 'success' ? '#F0FDF4' : status === 'error' ? '#FEF2F2' : '#FFFFFF'
            })
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '20px'
            }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    {title}
                </h3>
                {status && (
                    <Tag positive={status === 'success'} negative={status === 'error'}>
                        {status === 'success' ? 'Connected' : 'Not Connected'}
                    </Tag>
                )}
            </div>
            {children}
        </div>
    )

    const DetailRow = ({ label, value, type = 'text' }) => (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '8px 0',
            borderBottom: '1px solid #F3F4F6'
        }}>
            <span style={{ 
                fontWeight: '500', 
                color: '#374151',
                minWidth: '140px'
            }}>
                {label}
            </span>
            <span style={{ 
                color: '#111827',
                textAlign: 'right',
                flex: 1,
                ...(type === 'code' && {
                    fontFamily: 'monospace',
                    backgroundColor: '#F3F4F6',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px'
                }),
                ...(type === 'url' && {
                    wordBreak: 'break-all'
                })
            }}>
                {value || 'Not configured'}
            </span>
        </div>
    )

    return (
        <div style={{ margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Connection Status */}
                <InfoCard 
                    title="Connection Status" 
                    icon="🔗" 
                    status={isConfigured ? 'success' : 'error'}
                >
                    <p style={{ 
                        margin: '0 0 16px 0', 
                        color: '#6B7280',
                        fontSize: '14px'
                    }}>
                        {isConfigured 
                            ? 'DHIS2 integration is properly configured and ready to use.'
                            : 'DHIS2 integration needs to be configured before data can be synchronized.'
                        }
                    </p>
                    <DetailRow label="Status" value={connectionInfo.connectionStatus || 'Not tested'} />
                    <DetailRow label="Last Tested" value={connectionInfo.lastTested || 'Never'} />
                    <DetailRow label="Last Successful" value={connectionInfo.lastSuccessfulConnection || 'Never'} />
                </InfoCard>

                {/* Connection Details */}
                <InfoCard title="Connection Details" icon="🌐">
                    <DetailRow label="Base URL" value={connectionInfo.baseUrl} type="url" />
                    <DetailRow label="Username" value={connectionInfo.username} />
                    <DetailRow label="Instance Type" value={connectionInfo.instanceType} />
                    <DetailRow label="Version" value={connectionInfo.version} />
                    <DetailRow label="API Version" value={connectionInfo.apiVersion} />
                    <DetailRow label="System Name" value={connectionInfo.systemName} />
                    <DetailRow label="Use SSL" value={connectionInfo.useSSL ? 'Yes' : 'No'} />
                    <DetailRow label="Timeout" value={connectionInfo.timeout ? `${connectionInfo.timeout}ms` : 'Default'} />
                </InfoCard>

                {/* Selected Data */}
                <InfoCard title="Selected Data" icon="📊">
                    <DetailRow 
                        label="Datasets" 
                        value={dhis2Config.datasetsSelected ? dhis2Config.datasetsSelected.length : 0} 
                    />
                    <DetailRow 
                        label="Data Elements" 
                        value={dhis2Config.datasetsSelected ? 
                            dhis2Config.datasetsSelected.reduce((total, ds) => total + (ds.dataElements?.length || 0), 0) : 0
                        } 
                    />
                    <DetailRow 
                        label="Organization Units" 
                        value={dhis2Config.orgUnitMapping ? dhis2Config.orgUnitMapping.length : 0} 
                    />
                </InfoCard>
            </div>
        </div>
    )
}

// Datasets Tab Component
const DatasetsTab = ({ assessment, localDatasets }) => {
    // Extract locally created data elements from assessment
    const localDataElements = assessment.localDataElementsCreated || []
    const localOrgUnits = assessment.localOrgUnitsCreated || []
    if (!localDatasets || localDatasets.length === 0) {
        return (
            <div style={{ 
                textAlign: 'center', 
                padding: '80px 40px',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                <span style={{ fontSize: '64px', display: 'block', marginBottom: '24px' }}>🗄️</span>
                <h3 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '24px', 
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    No Datasets Created
                </h3>
                <p style={{ 
                    margin: '0 0 32px 0', 
                    fontSize: '16px', 
                    color: '#6B7280',
                    lineHeight: '1.6'
                }}>
                    This assessment doesn't have any datasets created yet. 
                    Datasets are typically created during the assessment setup process.
                </p>
            </div>
        )
    }

    const InfoCard = ({ title, icon, children }) => (
        <div style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px'
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid #F3F4F6'
            }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    {title}
                </h3>
            </div>
            {children}
        </div>
    )

    return (
        <div style={{ margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    Created Datasets ({localDatasets.length})
                </h2>
                <p style={{ 
                    margin: 0, 
                    color: '#6B7280', 
                    fontSize: '16px'
                }}>
                    DQA datasets containing the locally created data elements attached to each dataset. Each source data element generates four DQA variants.
                </p>
            </div>

            {localDatasets.map((dataset, index) => {
                // Get locally created elements for this dataset
                const datasetDataElements = dataset.dataElements || []
                const datasetOrgUnits = dataset.orgUnits || []
                
                // For datasets created by the system, the dataElements and orgUnits should already be the locally created ones
                // If they have .info properties, they're already properly structured
                const elementsToShow = datasetDataElements.length > 0 ? datasetDataElements : 
                    localDataElements.filter(de => 
                        datasetDataElements.some(dde => dde.id === de.id || dde.info?.id === de.id)
                    )
                
                const orgUnitsToShow = datasetOrgUnits.length > 0 ? datasetOrgUnits :
                    localOrgUnits.filter(ou => 
                        datasetOrgUnits.some(dou => dou.id === ou.id || dou.info?.id === ou.id)
                    )
                
                return (
                <InfoCard 
                    key={index}
                    title={dataset.info?.name || dataset.name || `Dataset ${index + 1}`} 
                    icon="📊"
                >
                    {/* Dataset Overview */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '16px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ 
                                backgroundColor: '#F9FAFB', 
                                padding: '12px', 
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Dataset ID</div>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                    {dataset.info?.id || dataset.id || 'Unknown'}
                                </div>
                            </div>
                            <div style={{ 
                                backgroundColor: '#F9FAFB', 
                                padding: '12px', 
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Period Type</div>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                    {dataset.info?.periodType || 'Monthly'}
                                </div>
                            </div>
                            <div style={{ 
                                backgroundColor: '#F9FAFB', 
                                padding: '12px', 
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Data Elements</div>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                    {elementsToShow.length}
                                </div>
                            </div>
                            <div style={{ 
                                backgroundColor: '#F9FAFB', 
                                padding: '12px', 
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Organization Units</div>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                    {orgUnitsToShow.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Elements Details */}
                    {(() => {
                        // Use the elementsToShow already calculated above
                        return elementsToShow && elementsToShow.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ 
                                margin: '0 0 16px 0', 
                                fontSize: '16px', 
                                fontWeight: '600',
                                color: '#111827',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '18px' }}>🔢</span>
                                Attached Data Elements ({elementsToShow.length})
                                <span style={{ 
                                    fontSize: '12px', 
                                    color: '#6B7280', 
                                    fontWeight: '400',
                                    backgroundColor: '#F3F4F6',
                                    padding: '2px 8px',
                                    borderRadius: '12px'
                                }}>
                                    Locally Created DQA Elements
                                </span>
                            </h4>
                            <div style={{ 
                                marginBottom: '12px',
                                padding: '12px',
                                backgroundColor: '#F0F9FF',
                                border: '1px solid #BAE6FD',
                                borderRadius: '6px'
                            }}>
                                <div style={{ fontSize: '13px', color: '#0369A1', lineHeight: '1.4' }}>
                                    💡 <strong>Note:</strong> These are the actual data elements attached to this dataset in DHIS2. 
                                    Each represents one of the four DQA source types (Register, Summary, Reported, Corrected) 
                                    created from the original source data elements.
                                </div>
                            </div>
                            <DataTable>
                                <DataTableHead>
                                    <DataTableRow>
                                        <DataTableColumnHeader>DQA Data Element Name</DataTableColumnHeader>
                                        <DataTableColumnHeader>ID</DataTableColumnHeader>
                                        <DataTableColumnHeader>Source Type</DataTableColumnHeader>
                                        <DataTableColumnHeader>Original Source</DataTableColumnHeader>
                                        <DataTableColumnHeader>Value Type</DataTableColumnHeader>
                                        <DataTableColumnHeader>Aggregation</DataTableColumnHeader>
                                    </DataTableRow>
                                </DataTableHead>
                                <DataTableBody>
                                    {elementsToShow.map((dataElement, deIndex) => {
                                        // Determine source type from name
                                        const getSourceType = (name) => {
                                            if (name.includes('Register')) return 'Register'
                                            if (name.includes('Summary')) return 'Summary'
                                            if (name.includes('Reported')) return 'Reported'
                                            if (name.includes('Corrected')) return 'Corrected'
                                            return 'Unknown'
                                        }

                                        // Extract original source name by removing the suffix
                                        const getOriginalSourceName = (name, sourceType) => {
                                            if (!name || sourceType === 'Unknown') return 'Unknown'
                                            // Remove the source type suffix to get the original name
                                            const suffixes = [' - Register', ' - Summary', ' - Reported', ' - Corrected']
                                            for (const suffix of suffixes) {
                                                if (name.includes(suffix)) {
                                                    return name.replace(suffix, '')
                                                }
                                            }
                                            return name
                                        }

                                        const sourceType = getSourceType(dataElement.info?.name || dataElement.name || '')
                                        const originalName = getOriginalSourceName(dataElement.info?.name || dataElement.name || '', sourceType)
                                        
                                        return (
                                            <DataTableRow key={deIndex}>
                                                <DataTableCell>
                                                    <div style={{ fontWeight: '500' }}>
                                                        {dataElement.info?.name || dataElement.name || `Data Element ${deIndex + 1}`}
                                                    </div>
                                                    {dataElement.info?.description && (
                                                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                                            {dataElement.info.description}
                                                        </div>
                                                    )}
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <code style={{ 
                                                        backgroundColor: '#F3F4F6', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px',
                                                        fontSize: '12px'
                                                    }}>
                                                        {dataElement.info?.id || dataElement.id || 'Unknown'}
                                                    </code>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <Tag 
                                                        positive={sourceType === 'Register'}
                                                        neutral={sourceType === 'Summary'}
                                                        warning={sourceType === 'Reported'}
                                                        critical={sourceType === 'Corrected'}
                                                        small
                                                    >
                                                        {sourceType}
                                                    </Tag>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <div style={{ 
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        color: '#374151'
                                                    }}>
                                                        {originalName}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                                        Source data element
                                                    </div>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    {dataElement.info?.valueType || 'INTEGER'}
                                                </DataTableCell>
                                                <DataTableCell>
                                                    {dataElement.info?.aggregationType || 'SUM'}
                                                </DataTableCell>
                                            </DataTableRow>
                                        )
                                    })}
                                </DataTableBody>
                            </DataTable>
                        </div>
                        )
                    })()}

                    {/* Organization Units Details */}
                    {(() => {
                        // Use the orgUnitsToShow already calculated above
                        return orgUnitsToShow && orgUnitsToShow.length > 0 && (
                        <div>
                            <h4 style={{ 
                                margin: '0 0 16px 0', 
                                fontSize: '16px', 
                                fontWeight: '600',
                                color: '#111827',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '18px' }}>🏢</span>
                                Assigned Organization Units ({orgUnitsToShow.length})
                                <span style={{ 
                                    fontSize: '12px', 
                                    color: '#6B7280', 
                                    fontWeight: '400',
                                    backgroundColor: '#F3F4F6',
                                    padding: '2px 8px',
                                    borderRadius: '12px'
                                }}>
                                    Dataset Assignment
                                </span>
                            </h4>
                            <div style={{ 
                                marginBottom: '12px',
                                padding: '12px',
                                backgroundColor: '#F0FDF4',
                                border: '1px solid #BBF7D0',
                                borderRadius: '6px'
                            }}>
                                <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.4' }}>
                                    🎯 <strong>Dataset Assignment:</strong> These organization units are assigned to this dataset 
                                    and can submit data for the attached data elements during the specified periods.
                                    {orgUnitsToShow.length > 0 && orgUnitsToShow[0].info && (
                                        <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#059669' }}>
                                            ✅ Showing locally assigned organization units
                                        </span>
                                    )}
                                </div>
                            </div>
                            <DataTable>
                                <DataTableHead>
                                    <DataTableRow>
                                        <DataTableColumnHeader>Name</DataTableColumnHeader>
                                        <DataTableColumnHeader>ID</DataTableColumnHeader>
                                        <DataTableColumnHeader>Level</DataTableColumnHeader>
                                        <DataTableColumnHeader>Code</DataTableColumnHeader>
                                    </DataTableRow>
                                </DataTableHead>
                                <DataTableBody>
                                    {orgUnitsToShow.slice(0, 10).map((orgUnit, ouIndex) => (
                                        <DataTableRow key={ouIndex}>
                                            <DataTableCell>
                                                <div style={{ fontWeight: '500' }}>
                                                    {orgUnit.info?.name || orgUnit.name || `Org Unit ${ouIndex + 1}`}
                                                </div>
                                                {orgUnit.info?.path && (
                                                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                                        Path: {orgUnit.info.path}
                                                    </div>
                                                )}
                                            </DataTableCell>
                                            <DataTableCell>
                                                <code style={{ 
                                                    backgroundColor: '#F3F4F6', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px',
                                                    fontSize: '12px'
                                                }}>
                                                    {orgUnit.info?.id || orgUnit.id || 'Unknown'}
                                                </code>
                                            </DataTableCell>
                                            <DataTableCell>
                                                <Tag neutral small>
                                                    Level {orgUnit.info?.level || orgUnit.level || 'N/A'}
                                                </Tag>
                                            </DataTableCell>
                                            <DataTableCell>
                                                {orgUnit.info?.code || orgUnit.code || 'N/A'}
                                            </DataTableCell>
                                        </DataTableRow>
                                    ))}
                                    {orgUnitsToShow.length > 10 && (
                                        <DataTableRow>
                                            <DataTableCell colSpan="4" style={{ textAlign: 'center', fontStyle: 'italic', color: '#6B7280' }}>
                                                ... and {orgUnitsToShow.length - 10} more organization units
                                            </DataTableCell>
                                        </DataTableRow>
                                    )}
                                </DataTableBody>
                            </DataTable>
                        </div>
                        )
                    })()}
                </InfoCard>
                )
            })}
        </div>
    )
}

// Organization Mapping Tab Component
const MappingTab = ({ assessment, dhis2Config }) => {
    const orgUnitMapping = dhis2Config.orgUnitMapping || []
    const datasetsSelected = dhis2Config.datasetsSelected || []

    if (orgUnitMapping.length === 0 && datasetsSelected.length === 0) {
        return (
            <div style={{ 
                textAlign: 'center', 
                padding: '80px 40px',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                <span style={{ fontSize: '64px', display: 'block', marginBottom: '24px' }}>🗺️</span>
                <h3 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '24px', 
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    No Mapping Data
                </h3>
                <p style={{ 
                    margin: '0 0 32px 0', 
                    fontSize: '16px', 
                    color: '#6B7280',
                    lineHeight: '1.6'
                }}>
                    This assessment doesn't have any organization unit mappings or dataset selections configured yet.
                </p>
            </div>
        )
    }

    const InfoCard = ({ title, icon, children }) => (
        <div style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px'
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid #F3F4F6'
            }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    {title}
                </h3>
            </div>
            {children}
        </div>
    )

    return (
        <div style={{ margin: '0 auto' }}>
            {/* Organization Unit Mappings */}
            {orgUnitMapping.length > 0 && (
                <InfoCard title={`Organization Unit Mappings (${orgUnitMapping.length})`} icon="🏢">
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ 
                            margin: 0, 
                            fontSize: '14px', 
                            color: '#6B7280',
                            lineHeight: '1.5'
                        }}>
                            Mapping between external source facilities and DHIS2 organization units
                        </p>
                    </div>
                    
                    {/* Source Facilities */}
                    <div style={{ marginBottom: '32px' }}>
                        <h4 style={{ 
                            margin: '0 0 16px 0', 
                            fontSize: '16px', 
                            fontWeight: '600',
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>🏥</span>
                            Source Facilities ({orgUnitMapping.length})
                        </h4>
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>Name</DataTableColumnHeader>
                                    <DataTableColumnHeader>ID</DataTableColumnHeader>
                                    <DataTableColumnHeader>Level</DataTableColumnHeader>
                                    <DataTableColumnHeader>Code</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {orgUnitMapping.map((mapping, index) => (
                                    <DataTableRow key={`source-${index}`}>
                                        <DataTableCell>
                                            <div style={{ fontWeight: '500' }}>
                                                {mapping.external?.name || 'Unknown'}
                                            </div>
                                            {mapping.external?.path && (
                                                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                                    Path: {mapping.external.path}
                                                </div>
                                            )}
                                        </DataTableCell>
                                        <DataTableCell>
                                            <code style={{ 
                                                backgroundColor: '#F3F4F6', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px',
                                                fontSize: '12px'
                                            }}>
                                                {mapping.external?.id || 'Unknown'}
                                            </code>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <Tag neutral small>
                                                Level {mapping.external?.level || 'N/A'}
                                            </Tag>
                                        </DataTableCell>
                                        <DataTableCell>
                                            {mapping.external?.code || 'N/A'}
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </DataTableBody>
                        </DataTable>
                    </div>

                    {/* DHIS2 Facilities */}
                    <div style={{ marginBottom: '32px' }}>
                        <h4 style={{ 
                            margin: '0 0 16px 0', 
                            fontSize: '16px', 
                            fontWeight: '600',
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>🎯</span>
                            DHIS2 Target Facilities ({orgUnitMapping.length})
                        </h4>
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>Name</DataTableColumnHeader>
                                    <DataTableColumnHeader>ID</DataTableColumnHeader>
                                    <DataTableColumnHeader>Level</DataTableColumnHeader>
                                    <DataTableColumnHeader>Code</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {orgUnitMapping.map((mapping, index) => (
                                    <DataTableRow key={`dhis2-${index}`}>
                                        <DataTableCell>
                                            <div style={{ fontWeight: '500' }}>
                                                {mapping.dhis2?.name || 'Unknown'}
                                            </div>
                                            {mapping.dhis2?.path && (
                                                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                                    Path: {mapping.dhis2.path}
                                                </div>
                                            )}
                                        </DataTableCell>
                                        <DataTableCell>
                                            <code style={{ 
                                                backgroundColor: '#F3F4F6', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px',
                                                fontSize: '12px'
                                            }}>
                                                {mapping.dhis2?.id || 'Unknown'}
                                            </code>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <Tag positive small>
                                                Level {mapping.dhis2?.level || 'N/A'}
                                            </Tag>
                                        </DataTableCell>
                                        <DataTableCell>
                                            {mapping.dhis2?.code || 'N/A'}
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </DataTableBody>
                        </DataTable>
                    </div>

                    {/* Mapping Details */}
                    <div>
                        <h4 style={{ 
                            margin: '0 0 16px 0', 
                            fontSize: '16px', 
                            fontWeight: '600',
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '18px' }}>🔗</span>
                            Mapping Details
                        </h4>
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>Source Facility</DataTableColumnHeader>
                                    <DataTableColumnHeader>DHIS2 Facility</DataTableColumnHeader>
                                    <DataTableColumnHeader>Mapping Type</DataTableColumnHeader>
                                    <DataTableColumnHeader>Status</DataTableColumnHeader>
                                    <DataTableColumnHeader>Created</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {orgUnitMapping.map((mapping, index) => (
                                    <DataTableRow key={`mapping-${index}`}>
                                        <DataTableCell>
                                            <div style={{ fontWeight: '500' }}>
                                                {mapping.external?.name || 'Unknown'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                                ID: {mapping.external?.id || 'N/A'}
                                            </div>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <div style={{ fontWeight: '500' }}>
                                                {mapping.dhis2?.name || 'Unknown'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                                ID: {mapping.dhis2?.id || 'N/A'}
                                            </div>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <Tag 
                                                positive={mapping.mappingType === 'automatic'}
                                                neutral={mapping.mappingType === 'manual'}
                                                small
                                            >
                                                {mapping.mappingType || 'Unknown'}
                                            </Tag>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <Tag 
                                                positive={mapping.status === 'active'}
                                                neutral={mapping.status === 'inactive'}
                                                small
                                            >
                                                {mapping.status || 'Unknown'}
                                            </Tag>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <div style={{ fontSize: '12px' }}>
                                                {mapping.createdAt ? 
                                                    new Date(mapping.createdAt).toLocaleDateString() : 
                                                    'N/A'
                                                }
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                                by {mapping.createdBy || 'Unknown'}
                                            </div>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </DataTableBody>
                        </DataTable>
                    </div>
                </InfoCard>
            )}

            {/* Selected Datasets */}
            {datasetsSelected.length > 0 && (
                <InfoCard title={`Selected Source Datasets (${datasetsSelected.length})`} icon="📊">
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ 
                            margin: 0, 
                            fontSize: '14px', 
                            color: '#6B7280',
                            lineHeight: '1.5'
                        }}>
                            Original DHIS2 datasets selected as sources for DQA assessment. Four data elements will be created from each selected data element.
                        </p>
                    </div>
                    
                    {datasetsSelected.map((dataset, index) => (
                        <div key={index} style={{ 
                            marginBottom: index < datasetsSelected.length - 1 ? '32px' : 0,
                            paddingBottom: index < datasetsSelected.length - 1 ? '32px' : 0,
                            borderBottom: index < datasetsSelected.length - 1 ? '1px solid #E5E7EB' : 'none'
                        }}>
                            {/* Dataset Header */}
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ 
                                    margin: '0 0 8px 0', 
                                    fontSize: '16px', 
                                    fontWeight: '600',
                                    color: '#111827',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '18px' }}>📋</span>
                                    {dataset.info?.name || dataset.name || `Dataset ${index + 1}`}
                                </h4>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                                    gap: '12px',
                                    marginTop: '12px'
                                }}>
                                    <div style={{ 
                                        backgroundColor: '#F9FAFB', 
                                        padding: '8px 12px', 
                                        borderRadius: '6px',
                                        border: '1px solid #E5E7EB'
                                    }}>
                                        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Dataset ID</div>
                                        <code style={{ fontSize: '12px', fontWeight: '500' }}>
                                            {dataset.info?.id || dataset.id}
                                        </code>
                                    </div>
                                    <div style={{ 
                                        backgroundColor: '#F9FAFB', 
                                        padding: '8px 12px', 
                                        borderRadius: '6px',
                                        border: '1px solid #E5E7EB'
                                    }}>
                                        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Period Type</div>
                                        <div style={{ fontSize: '12px', fontWeight: '500' }}>
                                            {dataset.info?.periodType || 'Unknown'}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        backgroundColor: '#F9FAFB', 
                                        padding: '8px 12px', 
                                        borderRadius: '6px',
                                        border: '1px solid #E5E7EB'
                                    }}>
                                        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Data Elements</div>
                                        <div style={{ fontSize: '12px', fontWeight: '500' }}>
                                            {dataset.dataElements?.length || 0}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        backgroundColor: '#F9FAFB', 
                                        padding: '8px 12px', 
                                        borderRadius: '6px',
                                        border: '1px solid #E5E7EB'
                                    }}>
                                        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>Org Units</div>
                                        <div style={{ fontSize: '12px', fontWeight: '500' }}>
                                            {dataset.organisationUnits?.length || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Elements Table */}
                            {dataset.dataElements && dataset.dataElements.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <h5 style={{ 
                                        margin: '0 0 12px 0', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <span style={{ fontSize: '16px' }}>🔢</span>
                                        Source Data Elements ({dataset.dataElements.length})
                                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '400' }}>
                                            → Will create {dataset.dataElements.length * 4} DQA data elements
                                        </span>
                                    </h5>
                                    <DataTable>
                                        <DataTableHead>
                                            <DataTableRow>
                                                <DataTableColumnHeader>Name</DataTableColumnHeader>
                                                <DataTableColumnHeader>ID</DataTableColumnHeader>
                                                <DataTableColumnHeader>Value Type</DataTableColumnHeader>
                                                <DataTableColumnHeader>DQA Elements Created</DataTableColumnHeader>
                                            </DataTableRow>
                                        </DataTableHead>
                                        <DataTableBody>
                                            {dataset.dataElements.map((de, deIndex) => (
                                                <DataTableRow key={deIndex}>
                                                    <DataTableCell>
                                                        <div style={{ fontWeight: '500' }}>
                                                            {de.name || de.displayName || 'Unknown'}
                                                        </div>
                                                        {de.description && (
                                                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                                                {de.description}
                                                            </div>
                                                        )}
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        <code style={{ 
                                                            backgroundColor: '#F3F4F6', 
                                                            padding: '2px 6px', 
                                                            borderRadius: '4px',
                                                            fontSize: '12px'
                                                        }}>
                                                            {de.id}
                                                        </code>
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        <Tag neutral small>
                                                            {de.valueType || 'INTEGER'}
                                                        </Tag>
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            <Tag positive small>Register</Tag>
                                                            <Tag neutral small>Summary</Tag>
                                                            <Tag warning small>Reported</Tag>
                                                            <Tag critical small>Corrected</Tag>
                                                        </div>
                                                    </DataTableCell>
                                                </DataTableRow>
                                            ))}
                                        </DataTableBody>
                                    </DataTable>
                                </div>
                            )}

                            {/* Organization Units Table */}
                            {dataset.organisationUnits && dataset.organisationUnits.length > 0 && (
                                <div>
                                    <h5 style={{ 
                                        margin: '0 0 12px 0', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <span style={{ fontSize: '16px' }}>🏢</span>
                                        Organization Units ({dataset.organisationUnits.length})
                                    </h5>
                                    <DataTable>
                                        <DataTableHead>
                                            <DataTableRow>
                                                <DataTableColumnHeader>Name</DataTableColumnHeader>
                                                <DataTableColumnHeader>ID</DataTableColumnHeader>
                                                <DataTableColumnHeader>Level</DataTableColumnHeader>
                                                <DataTableColumnHeader>Code</DataTableColumnHeader>
                                            </DataTableRow>
                                        </DataTableHead>
                                        <DataTableBody>
                                            {dataset.organisationUnits.slice(0, 10).map((ou, ouIndex) => (
                                                <DataTableRow key={ouIndex}>
                                                    <DataTableCell>
                                                        <div style={{ fontWeight: '500' }}>
                                                            {ou.name || ou.displayName || 'Unknown'}
                                                        </div>
                                                        {ou.path && (
                                                            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                                                Path: {ou.path}
                                                            </div>
                                                        )}
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        <code style={{ 
                                                            backgroundColor: '#F3F4F6', 
                                                            padding: '2px 6px', 
                                                            borderRadius: '4px',
                                                            fontSize: '12px'
                                                        }}>
                                                            {ou.id}
                                                        </code>
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        <Tag neutral small>
                                                            Level {ou.level || 'N/A'}
                                                        </Tag>
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        {ou.code || 'N/A'}
                                                    </DataTableCell>
                                                </DataTableRow>
                                            ))}
                                            {dataset.organisationUnits.length > 10 && (
                                                <DataTableRow>
                                                    <DataTableCell colSpan="4" style={{ textAlign: 'center', fontStyle: 'italic', color: '#6B7280' }}>
                                                        ... and {dataset.organisationUnits.length - 10} more organization units
                                                    </DataTableCell>
                                                </DataTableRow>
                                            )}
                                        </DataTableBody>
                                    </DataTable>
                                </div>
                            )}
                        </div>
                    ))}
                </InfoCard>
            )}
        </div>
    )
}

// Metadata Tab Component
const MetadataTab = ({ assessment }) => (
    <div style={{ margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
            <h2 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '24px', 
                fontWeight: '600',
                color: '#111827'
            }}>
                Raw Assessment Data
            </h2>
            <p style={{ 
                margin: 0, 
                color: '#6B7280', 
                fontSize: '16px'
            }}>
                Complete assessment data structure for debugging and analysis
            </p>
        </div>
        
        <div style={{ 
            backgroundColor: '#F9FAFB', 
            border: '1px solid #E5E7EB', 
            borderRadius: '8px', 
            padding: '24px',
            overflow: 'auto',
            maxHeight: '600px'
        }}>
            <pre style={{ 
                margin: 0, 
                fontSize: '12px', 
                fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: '#374151',
                lineHeight: '1.4'
            }}>
                {JSON.stringify(assessment, null, 2)}
            </pre>
        </div>
    </div>
)
