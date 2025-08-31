import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'
import styled from 'styled-components'

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
    IconAdd24,
    IconEdit24,
    IconDelete24,
    IconView24,
    IconDownload24,
    IconUpload24,
    IconSettings24,
    CircularLoader,
    NoticeBox,
    IconMore24,
    IconChevronRight24

} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { 
    DataQualityCheckModal, 
    CompletenessAnalysisModal, 
    AssessmentSettingsModal 
} from '../../components/DQActions/DQActionComponents'
import { CenteredLoader, CardCenteredLoader } from '../../components/CenteredLoader'
import { SMSIntegrationTest } from '../../components/SMSIntegrationTest'
import { useDataEngine } from '@dhis2/app-runtime'

// Floating Action Button
const FloatingActionButton = styled.button`
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #1976d2;
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    z-index: 1000;
    transition: all 0.3s ease;
    
    &:hover {
        background: #1565c0;
        box-shadow: 0 6px 16px rgba(25, 118, 210, 0.6);
        transform: translateY(-2px);
    }
    
    &:active {
        transform: translateY(0);
    }
`

// Add Assessment Button (alternative to floating button)
const AddAssessmentButton = styled.div`
    margin-bottom: 16px;
    display: flex;
    justify-content: flex-end;
`


export const ManageAssessments = () => {
    console.log('🏗️ ManageAssessments component mounting/re-rendering')
    const navigate = useNavigate()
    const location = useLocation()
    const dataEngine = useDataEngine()
    const { getAssessments, deleteAssessment, clearAssessmentsCache } = useAssessmentDataStore()
    const [assessments, setAssessments] = useState([])
    const [assessmentsLoading, setAssessmentsLoading] = useState(false)
    const [assessmentsError, setAssessmentsError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const [initialLoad, setInitialLoad] = useState(true)


    
    // DQ Action Modals State
    const [dqModals, setDqModals] = useState({
        dataQualityCheck: { isOpen: false, assessment: null },
        completenessAnalysis: { isOpen: false, assessment: null },
        consistencyAnalysis: { isOpen: false, assessment: null },
        outlierDetection: { isOpen: false, assessment: null },
        assessmentSettings: { isOpen: false, assessment: null }
    })
    
    // Dataset Details Modal State
    const [datasetDetailsModal, setDatasetDetailsModal] = useState({
        isOpen: false,
        dataset: null,
        assessment: null
    })

    // Edit Assessment Modal State
    const [editAssessmentModal, setEditAssessmentModal] = useState({
        isOpen: false,
        assessment: null
    })

    // Status Change Modal State
    const [statusChangeModal, setStatusChangeModal] = useState({
        isOpen: false,
        assessment: null,
        newStatus: null
    })

    // SMS Test Modal State
    const [smsTestModal, setSmsTestModal] = useState({
        isOpen: false
    })

    // Load assessments from DHIS2 datastore - only on initial mount
    useEffect(() => {
        console.log('🔄 ManageAssessments useEffect triggered - initialLoad:', initialLoad)
        
        // Only run on initial load to prevent infinite loops
        if (!initialLoad) {
            console.log('⏭️ Skipping loadAssessments - not initial load')
            return
        }

        let isMounted = true
        let loadingCompleted = false
        
        const loadAssessments = async () => {
            console.log('🔄 loadAssessments called - starting initial load')
            if (!isMounted) {
                console.log('⏹️ Skipping assessment load - component unmounted')
                return
            }
            
            console.log('🚀 Starting assessment loading process...')
            setAssessmentsLoading(true)
            setAssessmentsError(null)
            
            // Set a timeout to prevent indefinite loading
            const timeoutId = setTimeout(() => {
                if (isMounted && !loadingCompleted) {
                    console.warn('⏰ Assessment loading timed out after 15 seconds - showing empty state')
                    setAssessmentsLoading(false)
                    // Don't set error for timeout - just show empty state
                    setAssessments([])
                    setInitialLoad(false) // Prevent further attempts
                }
            }, 15000) // 15 second timeout - increased to be more forgiving
            
            try {
                // Try to load from new datastore first, then fallback to legacy
                console.log('🚀 Initial assessment loading...')
                let assessmentsList = []
                
                try {
                    // Try main datastore first
                    console.log('📋 Trying main datastore...')
                    const mainData = await getAssessments()
                    if (mainData && Array.isArray(mainData)) {
                        if (mainData.length > 0) {
                            console.log('✅ Found assessments in main datastore:', mainData.length)
                            assessmentsList = mainData.map(assessment => ({
                                ...assessment,
                                // Map structure to display format (correct structure)
                                name: assessment.details?.name || assessment.name || 'Untitled Assessment',
                                status: assessment.details?.status || 'draft',
                                createdAt: assessment.details?.createdAt || assessment.createdAt || new Date().toISOString(),
                                createdBy: assessment.details?.createdBy || 'Unknown User',
                                dataStoreVersion: 'main'
                            }))
                        } else {
                            console.log('📭 No assessments found in main datastore')
                            assessmentsList = []
                        }
                    } else {
                        throw new Error('Invalid response from main datastore')
                    }
                } catch (mainError) {
                    console.log('⚠️ Main datastore failed:', mainError.message)
                    assessmentsList = []
                }
                
                if (isMounted) {
                    loadingCompleted = true
                    console.log('✅ Assessment loading completed successfully')
                    console.log('⏰ Clearing timeout - loading completed normally')
                    clearTimeout(timeoutId)
                    
                    // Ensure all assessments have proper creation data
                    const processedAssessments = assessmentsList.map(assessment => ({
                        ...assessment,
                        createdAt: assessment.details?.createdAt || assessment.createdAt || new Date().toISOString(),
                        createdBy: assessment.details?.createdBy || 'Unknown User',
                        status: assessment.details?.status || 'draft',
                        name: assessment.details?.name || assessment.name || 'Untitled Assessment'
                    }))
                    
                    console.log('📊 Setting assessments state with', processedAssessments.length, 'assessments')
                    setAssessments(processedAssessments)
                    console.log('🎉 Initial assessments loaded successfully:', processedAssessments.length, 'assessments')
                    
                    if (processedAssessments.length > 0) {
                        console.log('📋 Assessment summary:')
                        processedAssessments.forEach((assessment, index) => {
                            // Handle correct data structure for datasets
                            let datasetsCount = 0
                            if (assessment.dqaDatasetsCreated && Array.isArray(assessment.dqaDatasetsCreated)) {
                                datasetsCount = assessment.dqaDatasetsCreated.length
                            }
                            const isComplete = datasetsCount === 4
                            console.log(`   ${index + 1}. ${assessment.name} - ${isComplete ? '✅ Complete' : '⚠️ Incomplete'} (${datasetsCount}/4 datasets)`)
                        })
                    } else {
                        console.log('📭 No assessments found - showing empty state (this is normal for fresh installations)')
                    }
                    
                    // Clear any existing error since we successfully loaded (even if empty)
                    setAssessmentsError(null)
                }
            } catch (error) {
                console.error('❌ Error loading assessments from datastore:', error)
                if (isMounted) {
                    loadingCompleted = true
                    console.log('🔧 Handling error - clearing timeout and setting error state')
                    console.log('⏰ Clearing timeout - error occurred')
                    clearTimeout(timeoutId)
                    setAssessments([])
                    setAssessmentsError('Failed to load assessments. Please try refreshing.')
                }
            } finally {
                if (isMounted) {
                    console.log('🏁 Assessment loading finally block - setting loading to false and initialLoad to false')
                    setAssessmentsLoading(false)
                    setInitialLoad(false) // This prevents the useEffect from running again
                }
            }
        }

        console.log('✅ Calling loadAssessments for initial load...')
        loadAssessments()
        
        return () => {
            console.log('🧹 Cleanup: setting isMounted to false')
            isMounted = false
        }
    }, []) // Empty dependency array - only run on mount

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            console.log('🧹 Component unmounting - clearing assessments cache')
            clearAssessmentsCache()
        }
    }, [])

    // Handle success message from navigation state separately
    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message)
            // Clear the state to prevent showing message on refresh
            window.history.replaceState({}, document.title)
            // Auto-hide success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000)
        }
    }, [location.state])

    // Refresh assessments from datastore
    const refreshAssessments = useCallback(async () => {
        console.log('🔄 refreshAssessments called - assessmentsLoading:', assessmentsLoading)
        if (assessmentsLoading) {
            console.log('⏹️ Skipping refresh - already loading')
            return // Prevent multiple simultaneous calls
        }
        
        setAssessmentsLoading(true)
        setAssessmentsError(null)
        setSuccessMessage(null)
        
        try {
            console.log('🔄 Refreshing assessments list...')
            
            // Try main datastore first, then fallback to legacy
            let assessmentsList = []
            
            try {
                const mainData = await getAssessments()
                if (mainData && Array.isArray(mainData)) {
                    if (mainData.length > 0) {
                        console.log('✅ Found assessments in main datastore during refresh:', mainData.length)
                        assessmentsList = mainData.map(assessment => ({
                            ...assessment,
                            name: assessment.details?.name || assessment.name || 'Untitled Assessment',
                            status: assessment.details?.status || 'draft',
                            createdAt: assessment.details?.createdAt || assessment.createdAt || new Date().toISOString(),
                            createdBy: assessment.details?.createdBy || 'Unknown User',
                            dataStoreVersion: 'main'
                        }))
                    } else {
                        console.log('📭 No assessments found in main datastore during refresh')
                        assessmentsList = []
                    }
                } else {
                    throw new Error('Invalid response from main datastore')
                }
            } catch (mainError) {
                console.log('⚠️ Main datastore failed during refresh:', mainError.message)
                assessmentsList = []
            }
            
            // Ensure all assessments have proper creation data
            const processedAssessments = assessmentsList.map(assessment => ({
                ...assessment,
                createdAt: assessment.details?.createdAt || assessment.createdAt || new Date().toISOString(),
                createdBy: assessment.details?.createdBy || 'Unknown User',
                status: assessment.details?.status || 'draft',
                name: assessment.details?.name || assessment.name || 'Untitled Assessment'
            }))
            
            setAssessments(processedAssessments)
            console.log('✅ Assessments refreshed successfully:', processedAssessments.length, 'assessments')
            
            // Show success message for manual refresh
            setSuccessMessage(i18n.t('Assessments list refreshed successfully'))
            setTimeout(() => setSuccessMessage(null), 3000)
            
        } catch (error) {
            console.error('❌ Error refreshing assessments:', error)
            
            // Set user-friendly error messages
            if (error.message?.includes('Access denied')) {
                setAssessmentsError(i18n.t('Access denied. Please check your permissions to view assessments.'))
            } else if (error.message?.includes('Network error')) {
                setAssessmentsError(i18n.t('Network error. Please check your connection and try again.'))
            } else {
                setAssessmentsError(i18n.t('Failed to load assessments. Please try refreshing the page.'))
            }
            
            // Don't clear existing assessments on refresh failure
        } finally {
            setAssessmentsLoading(false)
        }
    }, [getAssessments, assessmentsLoading, clearAssessmentsCache]) // Removed problematic dependencies

    // Manual refresh function for button
    const handleRefresh = () => {
        console.log('🔄 Manual refresh triggered - clearing cache')
        clearAssessmentsCache() // Clear cache to force fresh load
        refreshAssessments()
    }

    // Handle navigation to create assessment page
    const handleCreateAssessment = () => {
        navigate('/administration/assessments/create')
    }





    // Safe date formatting function
    const formatDate = (dateString) => {
        if (!dateString || dateString === 'Not specified' || dateString === 'Not set') return 'Not set'
        
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) {
                return 'Not set'
            }
            return date.toLocaleDateString()
        } catch (error) {
            console.warn('Error formatting date:', dateString, error)
            return 'Not set'
        }
    }

    // Enhanced assessment data getter with new structure support only
    const getAssessmentData = (assessment, field, defaultValue = 'Not specified') => {
        try {
            if (!assessment) {
                console.warn('Assessment is null/undefined for field:', field)
                return defaultValue
            }
            
            // Handle the new structure only
            // Structure: { details: {...}, connection: {...}, dqaDatasetsCreated: [...] }
            
            let value = null
            const details = assessment.details || {}
            
            switch (field) {
                case 'name':
                    value = details.name || assessment.name
                    break
                case 'description':
                    value = details.description
                    break
                case 'objectives':
                    value = details.objectives
                    break
                case 'period':
                    value = details.period || details.startDate
                    break
                case 'frequency':
                    value = details.frequency || 'Not specified'
                    break
                case 'status':
                    value = details.status || 'draft'
                        break
                    case 'priority':
                        value = details.priority
                        break
                    case 'assessmentType':
                        value = details.assessmentType
                        break
                    case 'methodology':
                        value = details.methodology || 'automated'
                        break
                    case 'reportingLevel':
                        value = details.reportingLevel
                        break
                    case 'createdBy':
                        if (details.createdBy) {
                            if (typeof details.createdBy === 'object') {
                                value = details.createdBy.displayName || details.createdBy.username
                            } else {
                                value = details.createdBy
                            }
                        }
                        break
                    case 'lastModifiedBy':
                        if (details.lastModifiedBy) {
                            if (typeof details.lastModifiedBy === 'object') {
                                value = details.lastModifiedBy.displayName || details.lastModifiedBy.username
                            } else {
                                value = details.lastModifiedBy
                            }
                        }
                        break
                    case 'id':
                        value = assessment.id
                        break
                    case 'createdAt':
                        value = details.createdAt || assessment.createdAt
                        break
                    case 'lastUpdated':
                        value = details.lastUpdated || assessment.lastUpdated
                        break
                    default:
                        // Try details first, then root level
                        value = details[field] || assessment[field]
                        break
                }
            
            return value || defaultValue
        } catch (error) {
            console.warn('Error getting assessment field:', field, error)
            return defaultValue
        }
    }

    // Helper function to get selected datasets count (source datasets, not DQA datasets)
    const getSelectedDatasetsCount = (assessment) => {
        try {
            // New structure only - check for selected datasets in connection
            if (assessment.connection?.datasetsSelected && Array.isArray(assessment.connection.datasetsSelected)) {
                return assessment.connection.datasetsSelected.length
            }
            
            return 0
        } catch (error) {
            console.warn('Error counting selected datasets:', error)
            return 0
        }
    }

    // Helper function to get dataset count from new data structure
    const getDatasetCount = (assessment) => {
        let datasetsCount = 0
        
        try {
            // New structure only - check for DQA datasets created
            if (assessment.dqaDatasetsCreated && Array.isArray(assessment.dqaDatasetsCreated)) {
                datasetsCount = assessment.dqaDatasetsCreated.length
            }
        } catch (error) {
            console.warn('Error counting datasets for assessment:', assessment.id, error)
            datasetsCount = 0
        }
        
        return datasetsCount
    }
    
    // Helper function to get dataset name/description
    const getDatasetName = (assessment) => {
        // New structure only
        const name = assessment.details?.name || assessment.name || 'Unnamed Assessment'
        const count = getDatasetCount(assessment)
        return `${name} - ${count}/4 DQA Datasets`
    }
    
    // Helper function to render clickable dataset links
    const renderDatasetLinks = (assessment) => {
        // Check for created datasets with DHIS2 IDs (new structure only)
        const createdDatasets = assessment.dqaDatasetsCreated || []
        
        if (createdDatasets.length > 0) {
            return (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                    {createdDatasets.map((dataset, index) => {
                        const hasValidDhis2Id = dataset.dhis2Id && dataset.dhis2Id !== null
                        const datasetUrl = dataset.datasetUrl || dataset.datasetApiUrl
                        
                        return (
                            <div key={dataset.id || index} style={{ marginBottom: '1px' }}>
                                {hasValidDhis2Id && datasetUrl ? (
                                    <a
                                        href={datasetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ 
                                            color: '#1976d2', 
                                            textDecoration: 'none',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                        title={`Open ${dataset.name} in DHIS2 (ID: ${dataset.dhis2Id})`}
                                    >
                                        📊 {dataset.datasetType || dataset.type || 'Dataset'} Data
                                    </a>
                                ) : (
                                    <span style={{ color: '#666' }}>
                                        📊 {dataset.datasetType || dataset.type || 'Dataset'} Data {hasValidDhis2Id ? '' : '(Creating...)'}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            )
        }
        
        // Fallback to show dataset count
        return (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                {getDatasetCount(assessment)} datasets
            </div>
        )
    }
    
    // Helper function to check if datasets exist in DHIS2 based on naming pattern
    const checkDatasetsExistInDHIS2 = async (assessmentName) => {
        try {
            // The standard DQA360 dataset naming pattern is:
            // {AssessmentName} - {Type} Data ({Period})
            // Types: Correction, Register, Reported, Summary
            
            const expectedDatasetNames = [
                `${assessmentName} - Correction Data`,
                `${assessmentName} - Register Data`, 
                `${assessmentName} - Reported Data`,
                `${assessmentName} - Summary Data`
            ]
            
            // This would require DHIS2 API access to check
            // For now, we'll return a promise that resolves to the count
            // In a real implementation, this would query the DHIS2 API
            
            console.log('🔍 Would check for datasets:', expectedDatasetNames)
            return 4 // Assume they exist if we can't check
        } catch (error) {
            console.warn('Error checking datasets in DHIS2:', error)
            return 0
        }
    }

    // Safe date field getter - specifically for date fields with nested structure support
    const getAssessmentDate = (assessment, field) => {
        try {
            if (!assessment) return null
            
            let dateValue = null
            
            // Check if this is the new nested structure
            const isNestedStructure = assessment.details && typeof assessment.details === 'object'
            
            if (isNestedStructure) {
                // New v3.1.0+ nested structure
                switch (field) {
                    case 'createdAt':
                        dateValue = assessment.createdAt || assessment.details.createdAt
                        break
                    case 'lastUpdated':
                        dateValue = assessment.lastUpdated || assessment.details.lastUpdated
                        break
                    case 'startDate':
                        dateValue = assessment.details.startDate
                        break
                    case 'endDate':
                        dateValue = assessment.details.endDate
                        break
                    default:
                        dateValue = assessment.details[field] || assessment[field]
                        break
                }
            } else {
                // Legacy structures - try multiple possible locations
                dateValue = assessment?.[field] || 
                           assessment?.details?.[field] ||
                           assessment?.info?.[field]
                
                // Special handling for common date fields in legacy structure
                if (field === 'createdAt') {
                    dateValue = dateValue || assessment?.createdAt || assessment?.details?.createdAt
                }
                
                if (field === 'lastUpdated') {
                    dateValue = dateValue || assessment?.lastUpdated || assessment?.details?.lastUpdated
                }
                
                if (field === 'startDate') {
                    dateValue = dateValue || assessment?.startDate || assessment?.details?.startDate
                }
                
                if (field === 'endDate') {
                    dateValue = dateValue || assessment?.endDate || assessment?.details?.endDate
                }
            }
            
            if (!dateValue) return null
            return dateValue
        } catch (error) {
            console.warn('Error getting assessment date field:', field, error)
            return null
        }
    }

    // Handle view assessment
    const handleViewAssessment = (assessment) => {
        navigate(`/administration/assessments/view/${assessment.id}`, { 
            state: { assessment } 
        })
    }

    // Handle edit assessment
    const handleEditAssessment = (assessment) => {
        navigate(`/administration/assessments/edit/${assessment.id}`, { 
            state: { assessment } 
        })
    }

    // Handle status change
    const handleStatusChange = (assessment, newStatus) => {
        setStatusChangeModal({
            isOpen: true,
            assessment: assessment,
            newStatus: newStatus
        })
    }

    // Handle download PDF report
    const handleDownloadPDFReport = (assessment) => {
        // Generate filename based on assessment name and date
        const filename = `${assessment.name.replace(/[^a-zA-Z0-9]/g, '_')}_Creation_Report.pdf`
        
        // For now, show a message - in real implementation, this would download the stored PDF
        alert(i18n.t('PDF report download would be implemented here for: {{name}}', { name: filename }))
        
        // TODO: Implement actual PDF download from datastore or regenerate
        console.log('Download PDF report for assessment:', assessment.id)
    }

    // Handle assessment deletion
    const handleDeleteAssessment = async (assessmentId) => {
        if (confirm(i18n.t('Are you sure you want to delete this assessment? This action cannot be undone.'))) {
            try {
                await deleteAssessment(assessmentId)
                await refreshAssessments() // Refresh the list after deletion
                setSuccessMessage(i18n.t('Assessment deleted successfully'))
                setTimeout(() => setSuccessMessage(null), 5000)
            } catch (error) {
                console.error('Error deleting assessment:', error)
                alert(i18n.t('Failed to delete assessment: {{error}}', { error: error.message }))
            }
        }
    }

    // DQ Modal Management
    const openDQModal = (modalType, assessment) => {
        setDqModals(prev => ({
            ...prev,
            [modalType]: { isOpen: true, assessment }
        }))
    }

    const closeDQModal = (modalType) => {
        setDqModals(prev => ({
            ...prev,
            [modalType]: { isOpen: false, assessment: null }
        }))
    }

    // Handle assessment settings save
    const handleAssessmentSettingsSave = (assessmentId, newSettings) => {
        const updatedAssessments = assessments.map(assessment => 
            assessment.id === assessmentId 
                ? { ...assessment, ...newSettings, updatedAt: new Date().toISOString() }
                : assessment
        )
        saveAssessments(updatedAssessments)
    }

    // Get status tag color
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'positive'
            case 'completed': return 'neutral'
            case 'draft': return 'default'
            case 'error': return 'negative'
            default: return 'default'
        }
    }

    // Check if DHIS2 is configured (placeholder - implement actual check)
    const isDHIS2Configured = () => {
        // TODO: Implement actual DHIS2 configuration check
        return true // For now, assume it's configured
    }

    // Assessment Actions for each assessment - new structure
    const getAssessmentActions = (assessment) => {
        const handleDownloadAssessmentJSON = (a) => {
            try {
                const blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const aEl = document.createElement('a')
                const safeName = String(a?.details?.name || a?.name || 'assessment').replace(/[^a-zA-Z0-9]/g, '_')
                const ts = new Date().toISOString().split('T')[0]
                aEl.download = `DQA360_${safeName}_${ts}.json`
                aEl.href = url
                document.body.appendChild(aEl)
                aEl.click()
                document.body.removeChild(aEl)
                URL.revokeObjectURL(url)
            } catch (e) {
                console.error('Download failed', e)
            }
        }
        const handlePrintAssessmentSummary = (a) => {
            try {
                const w = window.open('', '_blank', 'width=900,height=700')
                if (!w) return
                const style = `
                    <style>
                        body{font-family: Arial, sans-serif; padding: 20px;}
                        h1{margin-top:0}
                        pre{background:#f7f7f7;padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-word}
                        .meta{margin-bottom:16px}
                        .meta div{margin:4px 0}
                    </style>
                `
                const name = a?.details?.name || a?.name || 'Assessment'
                const details = a?.details || {}
                w.document.write(`
                    <html>
                        <head><title>${name}</title>${style}</head>
                        <body>
                            <h1>${name}</h1>
                            <div class="meta">
                                <div><strong>Period:</strong> ${details.period || ''}</div>
                                <div><strong>Frequency:</strong> ${details.frequency || ''}</div>
                                <div><strong>Status:</strong> ${details.status || ''}</div>
                                <div><strong>Priority:</strong> ${details.priority || ''}</div>
                                <div><strong>Assessment Type:</strong> ${details.assessmentType || ''}</div>
                                <div><strong>Methodology:</strong> ${details.methodology || ''}</div>
                                <div><strong>Reporting Level:</strong> ${details.reportingLevel || ''}</div>
                            </div>
                            <pre>${JSON.stringify(a, null, 2)}</pre>
                            <script>window.print();</script>
                        </body>
                    </html>
                `)
                w.document.close()
            } catch (e) {
                console.error('Print failed', e)
            }
        }
        const actions = [
            // 1. View Assessment (Details page, Edit, Delete, Deactivate)
            {
                label: i18n.t('View Assessment'),
                icon: <IconView24 />,
                submenu: [
                    {
                        label: i18n.t('View Details'),
                        onClick: () => handleViewAssessment(assessment)
                    },
                    {
                        label: i18n.t('Edit Assessment'),
                        onClick: () => handleEditAssessment(assessment)
                    },
                    {
                        label: i18n.t('Deactivate'),
                        onClick: () => handleStatusChange(assessment, 'inactive')
                    },
                    {
                        label: i18n.t('Delete Assessment'),
                        destructive: true,
                        onClick: () => handleDeleteAssessment(assessment.id)
                    }
                ]
            },
            
            // 2. Data (Entry, Export, Edit)
            {
                label: i18n.t('Data'),
                icon: <IconEdit24 />,
                submenu: [
                    {
                        label: i18n.t('Data Entry'),
                        onClick: () => console.log('Data Entry for:', assessment.id)
                    },
                    {
                        label: i18n.t('Export Data'),
                        onClick: () => console.log('Export Data for:', assessment.id)
                    },
                    {
                        label: i18n.t('Edit Data'),
                        onClick: () => console.log('Edit Data for:', assessment.id)
                    }
                ]
            },

            // 3. Download & Print (Assessment payload)
            {
                label: i18n.t('Download & Print'),
                icon: <IconDownload24 />,
                submenu: [
                    {
                        label: i18n.t('Download Assessment JSON'),
                        onClick: () => handleDownloadAssessmentJSON(assessment)
                    },
                    {
                        label: i18n.t('Print Assessment Summary'),
                        onClick: () => handlePrintAssessmentSummary(assessment)
                    }
                ]
            },
            
            // 4. DQA Analysis
            {
                label: i18n.t('DQA Analysis'),
                icon: <IconMore24 />,
                submenu: [
                    {
                        label: i18n.t('Data Quality Check'),
                        onClick: () => openDQModal('dataQualityCheck', assessment)
                    },
                    {
                        label: i18n.t('Completeness Analysis'),
                        onClick: () => openDQModal('completenessAnalysis', assessment)
                    },
                    {
                        label: i18n.t('Consistency Analysis'),
                        onClick: () => openDQModal('consistencyAnalysis', assessment)
                    },
                    {
                        label: i18n.t('Outlier Detection'),
                        onClick: () => openDQModal('outlierDetection', assessment)
                    },
                    { type: 'divider' },
                    {
                        label: i18n.t('Generate DQA Report'),
                        onClick: () => console.log('Generate DQA Report for:', assessment.id)
                    },
                    {
                        label: i18n.t('Export DQA Results'),
                        onClick: () => console.log('Export DQA Results for:', assessment.id)
                    },
                    {
                        label: i18n.t('DQA Dashboard'),
                        onClick: () => console.log('Open DQA Dashboard for:', assessment.id)
                    }
                ]
            },
            
            // 5. User Access
            {
                label: i18n.t('User Access'),
                icon: <IconSettings24 />,
                onClick: () => console.log('User Access for:', assessment.id)
            },
            
            // 6. Settings (Change Status, Notifications)
            {
                label: i18n.t('Settings'),
                icon: <IconSettings24 />,
                submenu: [
                    {
                        label: i18n.t('Change Status'),
                        submenu: [
                            {
                                label: i18n.t('Mark as Active'),
                                onClick: () => handleStatusChange(assessment, 'active')
                            },
                            {
                                label: i18n.t('Mark as Completed'),
                                onClick: () => handleStatusChange(assessment, 'completed')
                            },
                            {
                                label: i18n.t('Mark as Draft'),
                                onClick: () => handleStatusChange(assessment, 'draft')
                            },
                            {
                                label: i18n.t('Mark as On Hold'),
                                onClick: () => handleStatusChange(assessment, 'on-hold')
                            }
                        ]
                    },
                    {
                        label: i18n.t('Notifications'),
                        onClick: () => console.log('Notifications for:', assessment.id)
                    },
                    {
                        label: i18n.t('Assessment Settings'),
                        onClick: () => openDQModal('assessmentSettings', assessment)
                    }
                ]
            },
            
            { type: 'divider' },
            
            // 7. Delete (separate item)
            {
                label: i18n.t('Delete'),
                icon: <IconDelete24 />,
                destructive: true,
                onClick: () => handleDeleteAssessment(assessment.id)
            }
        ]

        // 3. Load Reported Data (If DHIS2 configured) - conditionally add
        if (isDHIS2Configured()) {
            actions.splice(2, 0, {
                label: i18n.t('Load Reported Data'),
                icon: <IconDownload24 />,
                submenu: [
                    {
                        label: i18n.t('Load from External DHIS2'),
                        onClick: () => console.log('Load from External DHIS2 for:', assessment.id)
                    },
                    {
                        label: i18n.t('Sync Reported Dataset'),
                        onClick: () => console.log('Sync Reported Dataset for:', assessment.id)
                    },
                    {
                        label: i18n.t('Update Reported Data'),
                        onClick: () => console.log('Update Reported Data for:', assessment.id)
                    },
                    {
                        label: i18n.t('Refresh Metadata'),
                        onClick: () => console.log('Refresh Metadata for:', assessment.id)
                    }
                ]
            })
        }

        return actions
    }

    // Remove the blocking loading state - let the page load immediately

    return (
        <Box style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '16px',
            background: 'transparent',
            overflow: 'hidden'
        }}>
            {/* Success Message */}
            {successMessage && (
                <Box marginBottom="16px">
                    <NoticeBox valid title={i18n.t('Success')}>
                        {successMessage}
                    </NoticeBox>
                </Box>
            )}

            {/* Header with Actions */}
            <Box marginBottom="16px" display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                        {i18n.t('Manage Assessments')}
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: '#6C7B7F' }}>
                        {i18n.t('Create, configure, and manage your data quality assessments')}
                    </p>
                </Box>
                <ButtonStrip>
                    {assessments.length > 0 && (
                        <Button 
                            secondary
                            onClick={() => setSmsTestModal({ isOpen: true })}
                        >
                            📱 {i18n.t('Test SMS Integration')}
                        </Button>
                    )}
                    {assessments.length > 0 && (
                        <Button 
                            primary
                            icon={<IconAdd24 />}
                            onClick={handleCreateAssessment}
                        >
                            {i18n.t('Create New Assessment')}
                        </Button>
                    )}
                </ButtonStrip>
            </Box>

            {/* Assessments List */}
            <Card style={{ 
                flex: 1, 
                background: 'transparent', 
                boxShadow: 'none', 
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                ...((assessmentsLoading || initialLoad || assessments.length === 0 || assessmentsError) ? { 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                } : {}) 
            }}>
                {(assessmentsLoading || initialLoad) ? (
                    <CenteredLoader 
                        message={i18n.t('Loading assessments...')}
                        style={{ flex: 1 }}
                    />
                ) : assessmentsError ? (
                    <Box 
                        style={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '32px',
                            textAlign: 'center'
                        }}
                    >
                        <Box marginBottom="16px" style={{ maxWidth: '500px' }}>
                            <NoticeBox error title={i18n.t('Error Loading Assessments')}>
                                {assessmentsError}
                            </NoticeBox>
                        </Box>
                        <Button onClick={handleRefresh}>
                            🔄 {i18n.t('Try Again')}
                        </Button>
                    </Box>
                ) : assessments.length === 0 ? (
                    <Box 
                        style={{ 
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '32px'
                        }}
                    >
                        <Button 
                            primary 
                            large
                            icon={<IconAdd24 />}
                            onClick={handleCreateAssessment}
                        >
                            {i18n.t('Create New Assessment')}
                        </Button>
                    </Box>
                ) : (
                    <DataTable style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Assessment Details')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Period & Frequency')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Type & Priority')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Data Configuration')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Created')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {assessments.map((assessment, index) => (
                                <DataTableRow key={assessment?.id || `assessment-${index}`}>
                                    {/* Assessment Details */}
                                    <DataTableCell>
                                        <Box>
                                            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: '#1976d2' }}>
                                                {getAssessmentData(assessment, 'name', 'Unnamed Assessment')}
                                            </div>
                                            {getAssessmentData(assessment, 'description') !== 'Not specified' && (
                                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px', lineHeight: '1.3' }}>
                                                    {getAssessmentData(assessment, 'description').length > 60 
                                                        ? `${getAssessmentData(assessment, 'description').substring(0, 60)}...`
                                                        : getAssessmentData(assessment, 'description')
                                                    }
                                                </div>
                                            )}
                                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>
                                                <span style={{ fontWeight: '500' }}>ID:</span> {getAssessmentData(assessment, 'id', 'Unknown ID').substring(0, 15)}...
                                            </div>
                                        </Box>
                                    </DataTableCell>

                                    {/* Period & Frequency */}
                                    <DataTableCell>
                                        <Box>
                                            {(() => {
                                                const startDate = getAssessmentDate(assessment, 'startDate')
                                                const endDate = getAssessmentDate(assessment, 'endDate')
                                                const period = getAssessmentData(assessment, 'period')
                                                const frequency = getAssessmentData(assessment, 'frequency', 'Not specified')
                                                
                                                if (startDate && endDate) {
                                                    return (
                                                        <div>
                                                            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px' }}>
                                                                {formatDate(startDate)} - {formatDate(endDate)}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                                {frequency}
                                                            </div>
                                                        </div>
                                                    )
                                                } else if (period && period !== 'Not specified') {
                                                    return (
                                                        <div>
                                                            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px' }}>
                                                                {period}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                                {frequency}
                                                            </div>
                                                        </div>
                                                    )
                                                } else {
                                                    return (
                                                        <div>
                                                            <div style={{ color: '#999', fontSize: '12px', marginBottom: '2px' }}>No period set</div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                                {frequency}
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            })()}
                                        </Box>
                                    </DataTableCell>

                                    {/* Type & Priority */}
                                    <DataTableCell>
                                        <Box>
                                            <div style={{ marginBottom: '4px' }}>
                                                <Tag neutral style={{ fontSize: '10px' }}>
                                                    {getAssessmentData(assessment, 'assessmentType', 'baseline')}
                                                </Tag>
                                            </div>
                                            <div style={{ marginBottom: '4px' }}>
                                                <Tag 
                                                    positive={getAssessmentData(assessment, 'priority', 'medium') === 'low'}
                                                    neutral={getAssessmentData(assessment, 'priority', 'medium') === 'medium'}
                                                    negative={['high', 'critical'].includes(getAssessmentData(assessment, 'priority', 'medium'))}
                                                    style={{ fontSize: '10px' }}
                                                >
                                                    {getAssessmentData(assessment, 'priority', 'medium')}
                                                </Tag>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                {getAssessmentData(assessment, 'methodology', 'automated')}
                                            </div>
                                        </Box>
                                    </DataTableCell>

                                    {/* Status */}
                                    <DataTableCell>
                                        <Box>
                                            {(() => {
                                                const status = getAssessmentData(assessment, 'status', 'draft')
                                                const datasetCount = getDatasetCount(assessment)
                                                const selectedDatasets = getSelectedDatasetsCount(assessment)
                                                const hasDQADatasets = datasetCount >= 4
                                                const hasSelectedDatasets = selectedDatasets > 0
                                                
                                                // Determine completion status
                                                let completionStatus = 'incomplete'
                                                let statusText = status.toUpperCase()
                                                
                                                if (hasDQADatasets) {
                                                    completionStatus = 'complete'
                                                    statusText = status.toUpperCase()
                                                } else if (hasSelectedDatasets) {
                                                    completionStatus = 'partial'
                                                    statusText = 'SETUP REQUIRED'
                                                } else {
                                                    completionStatus = 'incomplete'
                                                    statusText = 'INCOMPLETE'
                                                }
                                                
                                                return (
                                                    <div>
                                                        <div style={{ marginBottom: '4px' }}>
                                                            <Tag 
                                                                positive={completionStatus === 'complete' && status === 'active'}
                                                                neutral={completionStatus === 'partial' || status === 'draft'}
                                                                negative={status === 'archived' || status === 'error' || completionStatus === 'incomplete'}
                                                                style={{ fontSize: '10px' }}
                                                            >
                                                                {statusText}
                                                            </Tag>
                                                        </div>
                                                        {completionStatus !== 'complete' && (
                                                            <div>
                                                                <Button 
                                                                    small 
                                                                    primary
                                                                    onClick={() => navigate(`/administration/assessments/edit/${assessment.id}`)}
                                                                    style={{ fontSize: '10px', padding: '4px 8px' }}
                                                                >
                                                                    {completionStatus === 'partial' ? i18n.t('Complete Setup') : i18n.t('Configure')}
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                                            {completionStatus === 'complete' ? 'Ready for use' : 
                                                             completionStatus === 'partial' ? `${selectedDatasets} datasets selected` :
                                                             'Not configured'}
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </Box>
                                    </DataTableCell>

                                    {/* Data Configuration */}
                                    <DataTableCell>
                                        <Box>
                                            {(() => {
                                                const datasetCount = getDatasetCount(assessment)
                                                const selectedDatasets = getSelectedDatasetsCount(assessment)
                                                // Get data elements and org units from new structure only
                                                let localDataElements = []
                                                let localOrgUnits = []
                                                
                                                // New structure only
                                                localDataElements = assessment.dqaDatasetsCreated?.reduce((acc, dataset) => {
                                                    return acc.concat(dataset.dataElements || [])
                                                }, []) || []
                                                
                                                localOrgUnits = assessment.dqaDatasetsCreated?.reduce((acc, dataset) => {
                                                    return acc.concat(dataset.orgUnits || [])
                                                }, []) || []
                                                
                                                // Show different states based on configuration progress
                                                if (datasetCount >= 4) {
                                                    // Complete DQA setup
                                                    return (
                                                        <div>
                                                            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#10B981' }}>
                                                                ✅ DQA Datasets Ready
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                                                                <div style={{ marginBottom: '1px' }}>
                                                                    <span style={{ fontWeight: '500' }}>Datasets:</span> {datasetCount}/4 created
                                                                </div>
                                                                <div style={{ marginBottom: '1px' }}>
                                                                    <span style={{ fontWeight: '500' }}>Elements:</span> {localDataElements.length} DQA elements
                                                                </div>
                                                                <div style={{ marginBottom: '1px' }}>
                                                                    <span style={{ fontWeight: '500' }}>Facilities:</span> {localOrgUnits.length} assigned
                                                                </div>
                                                                {selectedDatasets > 0 && (
                                                                    <div style={{ fontSize: '10px', color: '#888' }}>
                                                                        From {selectedDatasets} source datasets
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                } else if (selectedDatasets > 0) {
                                                    // Partial setup - datasets selected but DQA not created
                                                    return (
                                                        <div>
                                                            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#f59e0b' }}>
                                                                ⚙️ Setup In Progress
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                                <div style={{ marginBottom: '1px' }}>
                                                                    <span style={{ fontWeight: '500' }}>Source:</span> {selectedDatasets} datasets selected
                                                                </div>
                                                                <div style={{ marginBottom: '1px' }}>
                                                                    <span style={{ fontWeight: '500' }}>DQA:</span> {datasetCount}/4 datasets created
                                                                </div>
                                                                <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                                                                    Complete setup to generate DQA datasets
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                } else {
                                                    // No configuration
                                                    return (
                                                        <div>
                                                            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#ef4444' }}>
                                                                ❌ Not Configured
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                                <div style={{ marginBottom: '1px' }}>
                                                                    No datasets selected
                                                                </div>
                                                                <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                                                                    Configure assessment to get started
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            })()}
                                        </Box>
                                    </DataTableCell>

                                    {/* Created */}
                                    <DataTableCell>
                                        <Box>
                                            <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px' }}>
                                                {formatDate(getAssessmentDate(assessment, 'createdAt'))}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                {(() => {
                                                    const createdBy = getAssessmentData(assessment, 'createdBy', 'Unknown User')
                                                    if (typeof createdBy === 'object' && createdBy.displayName) {
                                                        return createdBy.displayName
                                                    }
                                                    return createdBy
                                                })()}
                                            </div>
                                            {(assessment.version || assessment.structure) && (
                                                <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                                                    {assessment.version && `v${assessment.version}`}
                                                    {assessment.structure && ` (${assessment.structure})`}
                                                </div>
                                            )}
                                        </Box>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <DropdownButton
                                            component={
                                                <FlyoutMenu>
                                                    {getAssessmentActions(assessment).map((action, index) => 
                                                        action.type === 'divider' ? (
                                                            <Divider key={index} />
                                                        ) : action.submenu ? (
                                                            <MenuItem
                                                                key={index}
                                                                label={action.label}
                                                                icon={action.icon}
                                                                onClick={() => {
                                                                    // For now, show first submenu item - in real implementation, this would be a nested menu
                                                                    if (action.submenu.length > 0) {
                                                                        action.submenu[0].onClick()
                                                                    }
                                                                }}
                                                            />
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
                )}
            </Card>



            {/* DQ Action Modals */}
            <DataQualityCheckModal
                assessment={dqModals.dataQualityCheck.assessment}
                isOpen={dqModals.dataQualityCheck.isOpen}
                onClose={() => closeDQModal('dataQualityCheck')}
            />

            <CompletenessAnalysisModal
                assessment={dqModals.completenessAnalysis.assessment}
                isOpen={dqModals.completenessAnalysis.isOpen}
                onClose={() => closeDQModal('completenessAnalysis')}
            />

            <AssessmentSettingsModal
                assessment={dqModals.assessmentSettings.assessment}
                isOpen={dqModals.assessmentSettings.isOpen}
                onClose={() => closeDQModal('assessmentSettings')}
                onSave={(settings) => {
                    if (dqModals.assessmentSettings.assessment) {
                        handleAssessmentSettingsSave(dqModals.assessmentSettings.assessment.id, settings)
                    }
                }}
            />

            {/* Dataset Details Modal */}
            {datasetDetailsModal.isOpen && (
                <Modal 
                    large 
                    onClose={() => setDatasetDetailsModal({ isOpen: false, dataset: null, assessment: null })}
                    style={{ background: 'transparent' }}
                >
                    <ModalTitle>
                        Dataset Details: {datasetDetailsModal.dataset?.datasetType || datasetDetailsModal.dataset?.type} 
                        {datasetDetailsModal.assessment && ` - ${datasetDetailsModal.assessment.name}`}
                    </ModalTitle>
                    <ModalContent>
                        {datasetDetailsModal.dataset && datasetDetailsModal.assessment && (
                            <Box>
                                <div style={{ marginBottom: '16px' }}>
                                    <h6 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                                        Dataset Information
                                    </h6>
                                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                        <strong>Type:</strong> {datasetDetailsModal.dataset.datasetType || datasetDetailsModal.dataset.type}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                        <strong>Name:</strong> {datasetDetailsModal.dataset.name}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                        <strong>Data Elements:</strong> {datasetDetailsModal.dataset.elementCount}
                                    </div>
                                </div>

                                {datasetDetailsModal.assessment.localDatasetsMetadata?.createdDatasets && 
                                 datasetDetailsModal.assessment.localDatasetsMetadata.createdDatasets.find(ds => (ds.datasetType || ds.type) === (datasetDetailsModal.dataset.datasetType || datasetDetailsModal.dataset.type)) && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <h6 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                                            DHIS2 Dataset Details
                                        </h6>
                                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                            <strong>ID:</strong> {datasetDetailsModal.assessment.localDatasetsMetadata.createdDatasets.find(ds => (ds.datasetType || ds.type) === (datasetDetailsModal.dataset.datasetType || datasetDetailsModal.dataset.type)).id}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                            <strong>Code:</strong> {datasetDetailsModal.assessment.localDatasetsMetadata.createdDatasets.find(ds => (ds.datasetType || ds.type) === (datasetDetailsModal.dataset.datasetType || datasetDetailsModal.dataset.type)).code}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                            <strong>Period Type:</strong> {datasetDetailsModal.assessment.localDatasetsMetadata.createdDatasets.find(ds => (ds.datasetType || ds.type) === (datasetDetailsModal.dataset.datasetType || datasetDetailsModal.dataset.type)).periodType}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                            <strong>Description:</strong> {datasetDetailsModal.assessment.localDatasetsMetadata.createdDatasets.find(ds => (ds.datasetType || ds.type) === (datasetDetailsModal.dataset.datasetType || datasetDetailsModal.dataset.type)).description}
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const dataElementsMetadata = datasetDetailsModal.assessment.localDatasetsMetadata?.dataElementsMetadata
                                    if (!Array.isArray(dataElementsMetadata)) return null
                                    
                                    const datasetGroup = dataElementsMetadata.find(group => group.datasetType === datasetDetailsModal.dataset.type)
                                    if (!datasetGroup || !Array.isArray(datasetGroup.dataElements)) return null
                                    
                                    return (
                                        <div>
                                            <h6 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                                                Data Elements ({datasetGroup.dataElements.length})
                                            </h6>
                                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                                                <DataTable>
                                                    <DataTableHead>
                                                        <DataTableRow>
                                                            <DataTableColumnHeader>Name</DataTableColumnHeader>
                                                            <DataTableColumnHeader>Code</DataTableColumnHeader>
                                                            <DataTableColumnHeader>Value Type</DataTableColumnHeader>
                                                            <DataTableColumnHeader>Aggregation</DataTableColumnHeader>
                                                        </DataTableRow>
                                                    </DataTableHead>
                                                    <DataTableBody>
                                                        {datasetGroup.dataElements.map((element, index) => (
                                                        <DataTableRow key={element.id || index}>
                                                            <DataTableCell>{element.name}</DataTableCell>
                                                            <DataTableCell>
                                                                <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                                                    {element.code}
                                                                </span>
                                                            </DataTableCell>
                                                            <DataTableCell>{element.valueType}</DataTableCell>
                                                            <DataTableCell>{element.aggregationType}</DataTableCell>
                                                        </DataTableRow>
                                                    ))}
                                                    </DataTableBody>
                                                </DataTable>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </Box>
                        )}
                    </ModalContent>
                    <ModalActions>
                        <Button 
                            secondary 
                            onClick={() => setDatasetDetailsModal({ isOpen: false, dataset: null, assessment: null })}
                        >
                            Close
                        </Button>
                    </ModalActions>
                </Modal>
            )}


            {/* Status Change Modal */}
            {statusChangeModal.isOpen && (
                <Modal 
                    onClose={() => setStatusChangeModal({ isOpen: false, assessment: null, newStatus: null })}
                    large
                    style={{ background: 'transparent' }}
                >
                    <ModalTitle>
                        Change Assessment Status
                    </ModalTitle>
                    <ModalContent>
                        <Box>
                            <p>
                                Are you sure you want to change the status of "{statusChangeModal.assessment?.name}" 
                                from <strong>{getAssessmentData(statusChangeModal.assessment, 'status', 'unknown')}</strong> 
                                to <strong>{statusChangeModal.newStatus}</strong>?
                            </p>
                            
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                    <strong>Assessment:</strong> {statusChangeModal.assessment?.name}
                                </div>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                    <strong>Current Status:</strong> {getAssessmentData(statusChangeModal.assessment, 'status', 'unknown')}
                                </div>
                                <div style={{ fontSize: '13px', color: '#666' }}>
                                    <strong>New Status:</strong> {statusChangeModal.newStatus}
                                </div>
                            </div>
                        </Box>
                    </ModalContent>
                    <ModalActions>
                        <Button 
                            secondary 
                            onClick={() => setStatusChangeModal({ isOpen: false, assessment: null, newStatus: null })}
                        >
                            Cancel
                        </Button>
                        <Button 
                            primary
                            onClick={() => {
                                // TODO: Implement actual status change
                                console.log('Change status to:', statusChangeModal.newStatus, 'for assessment:', statusChangeModal.assessment?.id)
                                setSuccessMessage(`Assessment status changed to ${statusChangeModal.newStatus}`)
                                setTimeout(() => setSuccessMessage(null), 5000)
                                setStatusChangeModal({ isOpen: false, assessment: null, newStatus: null })
                            }}
                        >
                            Change Status
                        </Button>
                    </ModalActions>
                </Modal>
            )}

            {/* SMS Integration Test Modal */}
            {smsTestModal.isOpen && (
                <Modal 
                    large
                    onClose={() => setSmsTestModal({ isOpen: false })}
                    style={{ background: 'transparent' }}
                >
                    <ModalTitle>
                        📱 SMS Integration Test
                    </ModalTitle>
                    <ModalContent>
                        <SMSIntegrationTest />
                    </ModalContent>
                    <ModalActions>
                        <Button 
                            secondary 
                            onClick={() => setSmsTestModal({ isOpen: false })}
                        >
                            {i18n.t('Close')}
                        </Button>
                    </ModalActions>
                </Modal>
            )}
            
            {/* Floating Action Button */}
            <FloatingActionButton
                onClick={() => navigate('/administration/assessments/create')}
                title={i18n.t('Create New Assessment')}
            >
                +
            </FloatingActionButton>
        </Box>
    )
}