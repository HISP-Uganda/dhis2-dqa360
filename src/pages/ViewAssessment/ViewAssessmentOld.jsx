import React, { useState, useEffect, useCallback } from 'react'
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
    CircularLoader,
    NoticeBox,
    IconEdit24,
    IconDelete24,
    IconArrowLeft24,
    IconDownload24,
    IconSettings24,
    IconView24,
    IconMore24,
    IconUpload24,
    DropdownButton,
    FlyoutMenu,
    MenuItem,
    Divider,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Tab,
    TabBar,
    IconAdd24,
    IconChevronRight24,
    Chip
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
    }, [id]) // Only depend on id, not on getAssessment function

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

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified'
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Invalid date'
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Get assessment info for display
    const getAssessmentInfo = (assessment) => {
        // Handle createdBy which might be a string or user object
        const getCreatedByDisplay = (createdBy) => {
            if (!createdBy) return 'Unknown'
            if (typeof createdBy === 'string') return createdBy
            if (typeof createdBy === 'object') {
                return createdBy.displayName || createdBy.username || createdBy.email || createdBy.id || 'Unknown User'
            }
            return 'Unknown'
        }

        return {
            createdBy: getCreatedByDisplay(assessment.createdBy || assessment.Info?.createdBy),
            createdAt: assessment.createdAt || assessment.Info?.createdAt || null,
            lastUpdated: assessment.lastUpdated || assessment.Info?.lastUpdated || null
        }
    }

    // Get status color and label
    const getStatusInfo = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'completed':
                return { color: 'positive', label: status }
            case 'draft':
            case 'pending':
                return { color: 'warning', label: status }
            case 'archived':
            case 'cancelled':
                return { color: 'negative', label: status }
            default:
                return { color: 'default', label: status || 'Unknown' }
        }
    }

    // Get dataset count and completion status using new v3.0.0 structure
    const getDatasetInfo = (assessment) => {
        let count = 0
        let datasets = []
        
        // Check new v3.0.0 structure first - localDatasetsCreated array
        if (assessment.localDatasetsCreated && Array.isArray(assessment.localDatasetsCreated)) {
            datasets = assessment.localDatasetsCreated
            count = datasets.length
        }
        // Check for localDatasetsMetadata structure
        else if (assessment.localDatasetsMetadata?.createdDatasets) {
            if (Array.isArray(assessment.localDatasetsMetadata.createdDatasets)) {
                datasets = assessment.localDatasetsMetadata.createdDatasets
                count = datasets.length
            } else {
                datasets = Object.values(assessment.localDatasetsMetadata.createdDatasets)
                count = Object.keys(assessment.localDatasetsMetadata.createdDatasets).length
            }
        }
        // Check legacy datasets structure
        else if (assessment.datasets?.selected && Array.isArray(assessment.datasets.selected)) {
            datasets = assessment.datasets.selected
            count = datasets.length
        }
        // Check older localDatasets structure
        else if (assessment.localDatasets?.createdDatasets) {
            if (Array.isArray(assessment.localDatasets.createdDatasets)) {
                datasets = assessment.localDatasets.createdDatasets
                count = datasets.length
            } else {
                datasets = Object.values(assessment.localDatasets.createdDatasets)
                count = Object.keys(assessment.localDatasets.createdDatasets).length
            }
        }
        
        // Expected dataset types for DQA360
        const expectedTypes = ['register', 'summary', 'reported', 'verification']
        const createdTypes = datasets.map(ds => ds.info?.type || ds.type).filter(Boolean)
        const missingTypes = expectedTypes.filter(type => !createdTypes.includes(type))
        
        return {
            count,
            total: 4,
            percentage: Math.round((count / 4) * 100),
            isComplete: count >= 4 && missingTypes.length === 0,
            datasets,
            createdTypes,
            missingTypes
        }
    }

    // Get DHIS2 configuration info using new v3.0.0 structure
    const getDHIS2Info = (assessment) => {
        // Check new v3.0.0 structure first
        const dhis2Config = assessment.Dhis2config || assessment.dhis2Config || {}
        
        // Extract connection info
        const connectionInfo = dhis2Config.info || dhis2Config.connectionInfo || {}
        const baseUrl = connectionInfo.baseUrl || connectionInfo.url || 'Not configured'
        const version = connectionInfo.version || connectionInfo.systemName || 'Unknown'
        const configured = connectionInfo.configured || false
        const connectionStatus = connectionInfo.connectionStatus || 'unknown'
        const isConfigured = configured && baseUrl && baseUrl !== 'Not configured'
        
        // Extract selected datasets info
        let selectedDatasets = 0
        if (dhis2Config.datasetsSelected && Array.isArray(dhis2Config.datasetsSelected)) {
            selectedDatasets = dhis2Config.datasetsSelected.length
        } else if (dhis2Config.selectedDatasets && Array.isArray(dhis2Config.selectedDatasets)) {
            selectedDatasets = dhis2Config.selectedDatasets.length
        }
        
        // Extract org units info
        let orgUnits = 0
        if (dhis2Config.orgUnitMapping && Array.isArray(dhis2Config.orgUnitMapping)) {
            orgUnits = dhis2Config.orgUnitMapping.length
        } else if (dhis2Config.organisationUnits && Array.isArray(dhis2Config.organisationUnits)) {
            orgUnits = dhis2Config.organisationUnits.length
        } else if (dhis2Config.orgUnits && Array.isArray(dhis2Config.orgUnits)) {
            orgUnits = dhis2Config.orgUnits.length
        }
        
        return {
            baseUrl,
            version,
            isConfigured,
            configured,
            connectionStatus,
            selectedDatasets,
            orgUnits,
            username: connectionInfo.username || 'Not set',
            instanceType: connectionInfo.instanceType || 'Unknown',
            lastTested: connectionInfo.lastTested || 'Never'
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
                height: '400px' 
            }}>
                <CircularLoader />
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ padding: '20px' }}>
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
            <div style={{ padding: '20px' }}>
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

    // Extract data for display
    const assessmentInfo = getAssessmentInfo(assessment)
    const datasetInfo = getDatasetInfo(assessment)
    const dhis2Info = getDHIS2Info(assessment)

    return (
        <div style={{ 
            padding: '20px',
            maxWidth: '1400px',
            margin: '0 auto'
        }}>
            {/* Header Section */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '20px',
                padding: '16px 20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Button 
                            small 
                            secondary 
                            icon={<IconArrowLeft24 />}
                            onClick={handleBack}
                        >
                            Back
                        </Button>
                        <h1 style={{ 
                            margin: 0, 
                            fontSize: '24px', 
                            fontWeight: '600',
                            color: '#1F2937'
                        }}>
                            {assessment.Info?.name || assessment.name || 'Unnamed Assessment'}
                        </h1>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>
                            ID: <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{assessment.id}</span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>
                            Created: {formatDate(assessmentInfo.createdAt)}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>
                            By: {assessmentInfo.createdBy}
                        </div>
                    </div>
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

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <Modal onClose={() => setDeleteModalOpen(false)}>
                    <ModalTitle>Delete Assessment</ModalTitle>
                    <ModalContent>
                        <p>Are you sure you want to delete this assessment? This action cannot be undone.</p>
                        <p><strong>Assessment:</strong> {assessment.Info?.name || assessment.name || 'Unnamed Assessment'}</p>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button secondary onClick={() => setDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button destructive onClick={handleDelete}>
                                Delete
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}

            {/* Full Screen Tabbed Content */}
            <div style={{ 
                minHeight: 'calc(100vh - 140px)',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <TabBar>
                    <Tab 
                        selected={activeTab === 'overview'} 
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </Tab>
                    <Tab 
                        selected={activeTab === 'datasets'} 
                        onClick={() => setActiveTab('datasets')}
                    >
                        Datasets ({datasetInfo.count})
                    </Tab>
                    <Tab 
                        selected={activeTab === 'dhis2'} 
                        onClick={() => setActiveTab('dhis2')}
                    >
                        DHIS2 Configuration
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
                        <OverviewTab 
                            assessment={assessment} 
                            assessmentInfo={assessmentInfo}
                            datasetInfo={datasetInfo}
                            dhis2Info={dhis2Info}
                            formatDate={formatDate}
                        />
                    )}
                    {activeTab === 'datasets' && (
                        <DatasetsTab 
                            assessment={assessment} 
                            datasetInfo={datasetInfo}
                        />
                    )}
                    {activeTab === 'dhis2' && (
                        <DHIS2Tab 
                            assessment={assessment} 
                            dhis2Info={dhis2Info}
                        />
                    )}
                    {activeTab === 'metadata' && (
                        <MetadataTab assessment={assessment} />
                    )}
                </div>
            </div>
        </div>
    )
}

// Overview Tab Component
const OverviewTab = ({ assessment, assessmentInfo, datasetInfo, dhis2Info, formatDate }) => {
    // Extract data from new v3.0.0 structure
    const getAssessmentAttributes = (assessment) => {
        // Check for new structure first
        if (assessment.Info) {
            return {
                name: assessment.Info.name || 'Unnamed Assessment',
                description: assessment.Info.description || 'No description provided',
                frequency: assessment.Info.frequency || 'Not specified',
                methodology: assessment.Info.methodology || 'Not specified',
                priority: assessment.Info.priority || 'Not specified',
                startDate: assessment.Info.startDate || null,
                endDate: assessment.Info.endDate || null,
                scope: assessment.Info.scope || 'Not specified',
                objectives: assessment.Info.objectives || 'Not specified',
                status: assessment.Info.status || 'draft',
                assessmentType: assessment.Info.assessmentType || 'baseline',
                reportingLevel: assessment.Info.reportingLevel || 'facility',
                dataQualityDimensions: assessment.Info.dataQualityDimensions || [],
                confidentialityLevel: assessment.Info.confidentialityLevel || 'internal',
                autoSync: assessment.Info.autoSync || false
            }
        }
        
        // Fallback to legacy structure
        return {
            name: assessment.name || 'Unnamed Assessment',
            description: assessment.description || 'No description provided',
            frequency: assessment.frequency || 'Not specified',
            methodology: assessment.methodology || 'Not specified',
            priority: assessment.priority || 'Not specified',
            startDate: assessment.startDate || null,
            endDate: assessment.endDate || null,
            scope: assessment.scope || 'Not specified',
            objectives: assessment.objectives || 'Not specified',
            status: assessment.status || 'draft',
            assessmentType: assessment.assessmentType || 'baseline',
            reportingLevel: assessment.reportingLevel || 'facility',
            dataQualityDimensions: assessment.dataQualityDimensions || [],
            confidentialityLevel: assessment.confidentialityLevel || 'internal',
            autoSync: assessment.autoSync || false
        }
    }

    const attributes = getAssessmentAttributes(assessment)

    return (
        <div style={{ 
            maxWidth: '1000px',
            margin: '0 auto',
            lineHeight: '1.6'
        }}>
            {/* Summary Cards */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ 
                    textAlign: 'center',
                    marginBottom: '32px'
                }}>
                    <h2 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '28px', 
                        fontWeight: '700',
                        color: '#1F2937'
                    }}>
                        Assessment Overview
                    </h2>
                    <p style={{ 
                        margin: 0, 
                        fontSize: '16px', 
                        color: '#6B7280',
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>
                        {attributes.description}
                    </p>
                </div>

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '24px',
                    padding: '20px 0'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937' }}>
                            {datasetInfo.count}/4
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                            Datasets Created
                        </div>
                        <div style={{ 
                            width: '80px', 
                            height: '4px', 
                            backgroundColor: '#E5E7EB', 
                            borderRadius: '2px',
                            margin: '8px auto 0',
                            overflow: 'hidden'
                        }}>
                            <div style={{ 
                                width: `${datasetInfo.percentage}%`, 
                                height: '100%', 
                                backgroundColor: datasetInfo.isComplete ? '#10B981' : '#F59E0B',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        {datasetInfo.isComplete && (
                            <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: '500' }}>
                                ✓ Complete
                            </div>
                        )}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                            <Tag {...(dhis2Info.isConfigured ? { positive: true } : { negative: true })}>
                                {dhis2Info.isConfigured ? 'DHIS2 Connected' : 'DHIS2 Not Connected'}
                            </Tag>
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                            {dhis2Info.orgUnits} org units mapped
                        </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                            <Tag {...(attributes.status === 'active' ? { positive: true } : { default: true })}>
                                {attributes.status || 'Draft'}
                            </Tag>
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                            Assessment Status
                        </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                            <Chip>
                                {attributes.priority}
                            </Chip>
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                            Priority Level
                        </div>
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #E5E7EB'
                }}>
                    <span style={{ fontSize: '24px' }}>📋</span>
                    <h3 style={{ 
                        margin: 0, 
                        fontSize: '20px', 
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        Basic Information
                    </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <DetailRow label="Assessment Name" value={attributes.name} />
                    <DetailRow label="Description" value={attributes.description} />
                    <DetailRow label="Assessment Type" value={attributes.assessmentType} />
                    <DetailRow label="Reporting Level" value={attributes.reportingLevel} />
                    <DetailRow label="Scope" value={attributes.scope} />
                    <DetailRow label="Objectives" value={attributes.objectives} />
                    <DetailRow label="Frequency" value={attributes.frequency} />
                    <DetailRow label="Methodology" value={attributes.methodology} />
                    <DetailRow label="Data Quality Dimensions" value={attributes.dataQualityDimensions.join(', ') || 'None specified'} />
                    <DetailRow label="Confidentiality Level" value={attributes.confidentialityLevel} />
                    <DetailRow label="Auto Sync" value={attributes.autoSync ? 'Enabled' : 'Disabled'} />
                </div>
            </div>

            {/* Timeline & Dates */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #E5E7EB'
                }}>
                    <span style={{ fontSize: '24px' }}>📅</span>
                    <h3 style={{ 
                        margin: 0, 
                        fontSize: '20px', 
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        Timeline & Dates
                    </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <DetailRow label="Created At" value={formatDate(assessment.createdAt)} />
                    <DetailRow label="Created By" value={assessmentInfo.createdBy} />
                    <DetailRow label="Last Updated" value={formatDate(assessment.lastUpdated)} />
                    <DetailRow label="Start Date" value={formatDate(attributes.startDate)} />
                    <DetailRow label="End Date" value={formatDate(attributes.endDate)} />
                </div>
            </div>

            {/* Data Configuration */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #E5E7EB'
                }}>
                    <span style={{ fontSize: '24px' }}>🗄️</span>
                    <h3 style={{ 
                        margin: 0, 
                        fontSize: '20px', 
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        Data Configuration
                    </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <DetailRow label="Datasets Created" value={`${datasetInfo.count} of 4 (${datasetInfo.percentage}%)`} />
                    <DetailRow label="Dataset Types" value={datasetInfo.createdTypes.join(', ') || 'None'} />
                    <DetailRow label="Completion Status" value={datasetInfo.isComplete ? '✅ Complete' : '🔄 In Progress'} />
                    {datasetInfo.missingTypes.length > 0 && (
                        <DetailRow label="Missing Types" value={datasetInfo.missingTypes.join(', ')} />
                    )}
                    <DetailRow label="DHIS2 Integration" value={dhis2Info.isConfigured ? '✅ Configured' : '❌ Not Configured'} />
                    <DetailRow label="Organisation Units Mapped" value={dhis2Info.orgUnits} />
                    <DetailRow label="Connection Status" value={dhis2Info.connectionStatus} />
                </div>
            </div>

            {/* System Information */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #E5E7EB'
                }}>
                    <span style={{ fontSize: '24px' }}>🔧</span>
                    <h3 style={{ 
                        margin: 0, 
                        fontSize: '20px', 
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        System Information
                    </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <DetailRow label="Assessment ID" value={assessment.id} mono />
                    <DetailRow label="Version" value={assessment.version || 'v3.0.0'} />
                    <DetailRow label="Data Structure" value={assessment.structure || 'New Format'} />
                    <DetailRow label="Assessment Type" value={attributes.assessmentType || 'Unknown'} />
                    <DetailRow label="Reporting Level" value={attributes.reportingLevel || 'Unknown'} />
                    <DetailRow label="DHIS2 Base URL" value={dhis2Info.baseUrl} />
                    <DetailRow label="DHIS2 Username" value={dhis2Info.username} />
                    <DetailRow label="Instance Type" value={dhis2Info.instanceType} />
                </div>
            </div>
        </div>
    )
}

// Helper component for detail rows
const DetailRow = ({ label, value, mono = false }) => {
    // Handle different value types safely
    const getDisplayValue = (val) => {
        if (val === null || val === undefined) return 'Not specified'
        if (typeof val === 'string') return val || 'Not specified'
        if (typeof val === 'number') return val.toString()
        if (typeof val === 'boolean') return val ? 'Yes' : 'No'
        if (typeof val === 'object') {
            // Handle user objects
            if (val.displayName || val.username || val.email) {
                return val.displayName || val.username || val.email || 'Unknown User'
            }
            // Handle other objects by converting to JSON
            return JSON.stringify(val)
        }
        return String(val) || 'Not specified'
    }

    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '24px',
            padding: '16px 0',
            borderBottom: '1px solid #F3F4F6'
        }}>
            <div style={{ 
                minWidth: '180px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
            }}>
                {label}
            </div>
            <div style={{ 
                flex: 1,
                fontSize: '14px', 
                color: '#1F2937',
                wordBreak: 'break-word',
                ...(mono && { 
                    fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '12px',
                    backgroundColor: '#F3F4F6',
                    padding: '4px 8px',
                    borderRadius: '4px'
                })
            }}>
                {getDisplayValue(value)}
            </div>
        </div>
    )
}

// Datasets Tab Component
const DatasetsTab = ({ assessment, datasetInfo }) => {
    if (datasetInfo.count === 0) {
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
                    color: '#1F2937'
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
                <Button secondary>
                    Create Datasets
                </Button>
            </div>
        )
    }

    return (
        <div style={{ 
            maxWidth: '1000px',
            margin: '0 auto'
        }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '600',
                    color: '#1F2937'
                }}>
                    Created Datasets ({datasetInfo.count})
                </h2>
                <p style={{ 
                    margin: 0, 
                    color: '#6B7280', 
                    fontSize: '16px'
                }}>
                    Datasets generated for this assessment
                </p>
            </div>

            <DataTable>
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>Dataset Name</DataTableColumnHeader>
                        <DataTableColumnHeader>Type</DataTableColumnHeader>
                        <DataTableColumnHeader>Data Elements</DataTableColumnHeader>
                        <DataTableColumnHeader>Org Units</DataTableColumnHeader>
                        <DataTableColumnHeader>Status</DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {datasetInfo.datasets.map((dataset, index) => (
                        <DataTableRow key={index}>
                            <DataTableCell>
                                <div style={{ fontWeight: '500' }}>
                                    {dataset.info?.name || dataset.name || `Dataset ${index + 1}`}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                    ID: {dataset.info?.id || dataset.id || 'Unknown'}
                                </div>
                            </DataTableCell>
                            <DataTableCell>
                                <Chip>
                                    {dataset.info?.type || dataset.type || 'Unknown'}
                                </Chip>
                            </DataTableCell>
                            <DataTableCell>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {dataset.dataElements?.length || 0}
                                </span>
                            </DataTableCell>
                            <DataTableCell>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {dataset.orgUnits?.length || dataset.organisationUnits?.length || 0}
                                </span>
                            </DataTableCell>
                            <DataTableCell>
                                <Tag positive>Created</Tag>
                            </DataTableCell>
                        </DataTableRow>
                    ))}
                </DataTableBody>
            </DataTable>
        </div>
    )
}

// DHIS2 Tab Component
const DHIS2Tab = ({ assessment, dhis2Info }) => {
    const dhis2Config = assessment.Dhis2config || assessment.dhis2Config || {}
    
    return (
        <div style={{ 
            maxWidth: '1000px',
            margin: '0 auto',
            lineHeight: '1.6'
        }}>
            {/* DHIS2 Configuration Header */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px', 
                    marginBottom: '24px',
                    paddingBottom: '16px',
                    borderBottom: '2px solid #E5E7EB'
                }}>
                    <span style={{ fontSize: '32px' }}>🔗</span>
                    <div>
                        <h2 style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '24px', 
                            fontWeight: '600',
                            color: '#1F2937'
                        }}>
                            DHIS2 Integration
                        </h2>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '16px' }}>
                            Configuration and connection details for DHIS2 integration
                        </p>
                    </div>
                </div>

                {/* Connection Status */}
                <div style={{ 
                    padding: '20px',
                    backgroundColor: dhis2Info.isConfigured ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${dhis2Info.isConfigured ? '#BBF7D0' : '#FECACA'}`,
                    borderRadius: '8px',
                    marginBottom: '32px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>
                            {dhis2Info.isConfigured ? '✅' : '❌'}
                        </span>
                        <h3 style={{ 
                            margin: 0, 
                            fontSize: '18px', 
                            fontWeight: '600',
                            color: dhis2Info.isConfigured ? '#166534' : '#DC2626'
                        }}>
                            {dhis2Info.isConfigured ? 'DHIS2 Connected' : 'DHIS2 Not Connected'}
                        </h3>
                    </div>
                    <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        color: dhis2Info.isConfigured ? '#166534' : '#DC2626'
                    }}>
                        {dhis2Info.isConfigured 
                            ? 'DHIS2 integration is properly configured and ready to use.'
                            : 'DHIS2 integration needs to be configured before data can be synchronized.'
                        }
                    </p>
                </div>
            </div>

            {/* Connection Details */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #E5E7EB'
                }}>
                    <span style={{ fontSize: '24px' }}>🌐</span>
                    <h3 style={{ 
                        margin: 0, 
                        fontSize: '20px', 
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        Connection Details
                    </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <DetailRow label="Base URL" value={dhis2Info.baseUrl} />
                    <DetailRow label="Username" value={dhis2Info.username} />
                    <DetailRow label="Instance Type" value={dhis2Info.instanceType} />
                    <DetailRow label="Connection Status" value={dhis2Info.connectionStatus} />
                    <DetailRow label="Last Tested" value={dhis2Info.lastTested} />
                    <DetailRow label="Version" value={dhis2Info.version} />
                </div>
            </div>

            {/* Organization Units */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #E5E7EB'
                }}>
                    <span style={{ fontSize: '24px' }}>🏢</span>
                    <h3 style={{ 
                        margin: 0, 
                        fontSize: '20px', 
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        Organization Units
                    </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <DetailRow label="Mapped Units" value={dhis2Info.orgUnits} />
                    <DetailRow label="Selected Datasets" value={dhis2Info.selectedDatasets} />
                </div>

                {dhis2Config.orgUnitMapping && dhis2Config.orgUnitMapping.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                        <h4 style={{ 
                            margin: '0 0 16px 0', 
                            fontSize: '16px', 
                            fontWeight: '600',
                            color: '#1F2937'
                        }}>
                            Organization Unit Mappings
                        </h4>
                        <div style={{ 
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            padding: '16px'
                        }}>
                            {dhis2Config.orgUnitMapping.map((mapping, index) => (
                                <div key={index} style={{ 
                                    padding: '8px 0',
                                    borderBottom: index < dhis2Config.orgUnitMapping.length - 1 ? '1px solid #E5E7EB' : 'none'
                                }}>
                                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                        {mapping.name || mapping.displayName || 'Unknown'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace' }}>
                                        ID: {mapping.id}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Raw Configuration */}
            {Object.keys(dhis2Config).length > 0 && (
                <div style={{ marginBottom: '48px' }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '24px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid #E5E7EB'
                    }}>
                        <span style={{ fontSize: '24px' }}>⚙️</span>
                        <h3 style={{ 
                            margin: 0, 
                            fontSize: '20px', 
                            fontWeight: '600',
                            color: '#1F2937'
                        }}>
                            Raw Configuration
                        </h3>
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
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: '#374151'
                        }}>
                            {JSON.stringify(dhis2Config, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    )
}

// Metadata Tab Component
const MetadataTab = ({ assessment }) => (
    <div style={{ 
        maxWidth: '1000px',
        margin: '0 auto',
        lineHeight: '1.6'
    }}>
        <div style={{ marginBottom: '32px' }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '2px solid #E5E7EB'
            }}>
                <span style={{ fontSize: '32px' }}>📄</span>
                <div>
                    <h2 style={{ 
                        margin: '0 0 8px 0', 
                        fontSize: '24px', 
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        Raw Assessment Data
                    </h2>
                    <p style={{ margin: 0, color: '#6B7280', fontSize: '16px' }}>
                        Complete JSON structure of the assessment object for technical inspection
                    </p>
                </div>
            </div>
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
                lineHeight: '1.5'
            }}>
                {JSON.stringify(assessment, null, 2)}
            </pre>
        </div>
    </div>
)

export default ViewAssessment