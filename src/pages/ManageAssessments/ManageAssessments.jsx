import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'
import styled from 'styled-components'

import { 
    Box, 
    Button, 
    Card, 
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
    IconChevronRight24,
    IconCopy24,
    IconLaunch24,
    IconCheckmark24

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
    const { getAssessments, getAssessment, deleteAssessment, clearAssessmentsCache } = useAssessmentDataStore()
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
                    // Try main datastore first - get index
                    console.log('📋 Trying main datastore...')
                    const indexData = await getAssessments()
                    
                    // 🔍 DEBUG: Log the index response
                    console.log('🔍 RAW INDEX RESPONSE:', JSON.stringify(indexData, null, 2))
                    
                    if (indexData && Array.isArray(indexData)) {
                        if (indexData.length > 0) {
                            console.log('✅ Found assessments in index:', indexData.length)
                            
                            // Load full assessment data for each assessment
                            console.log('📥 Loading full assessment data...')
                            const fullAssessments = []
                            
                            for (const indexAssessment of indexData) {
                                try {
                                    console.log(`📥 Loading full data for assessment: ${indexAssessment.id}`)
                                    const fullAssessment = await getAssessment(indexAssessment.id)
                                    
                                    if (fullAssessment) {
                                        // 🔍 DEBUG: Log each assessment's complete structure
                                        console.log(`🔍 ASSESSMENT ${indexAssessment.id} COMPLETE STRUCTURE:`, JSON.stringify(fullAssessment, null, 2))
                                        console.log(`🔍 ASSESSMENT ${indexAssessment.id} KEYS:`, Object.keys(fullAssessment))
                                        if (fullAssessment.dqaDatasetsCreated) {
                                            console.log(`🔍 ASSESSMENT ${indexAssessment.id} DQA DATASETS:`, JSON.stringify(fullAssessment.dqaDatasetsCreated, null, 2))
                                        }
                                        if (fullAssessment.details) {
                                            console.log(`🔍 ASSESSMENT ${indexAssessment.id} DETAILS:`, JSON.stringify(fullAssessment.details, null, 2))
                                        }
                                        
                                        fullAssessments.push(fullAssessment)
                                    } else {
                                        console.warn(`⚠️ Could not load full data for assessment ${indexAssessment.id}, using index data`)
                                        fullAssessments.push(indexAssessment)
                                    }
                                } catch (error) {
                                    console.warn(`⚠️ Error loading full data for assessment ${indexAssessment.id}:`, error)
                                    fullAssessments.push(indexAssessment)
                                }
                            }
                            
                            assessmentsList = fullAssessments.map(assessment => ({
                                ...assessment,
                                // Map structure to display format (correct structure)
                                name: assessment.details?.name || assessment.name || 'Untitled Assessment',
                                status: assessment.details?.status || assessment.status || 'draft',
                                createdAt: assessment.details?.createdAt || assessment.createdAt || new Date().toISOString(),
                                createdBy: assessment.details?.createdBy || 
                                          assessment.createdBy || 
                                          assessment.Info?.createdBy?.displayName || 
                                          assessment.Info?.createdBy?.username || 
                                          assessment.Info?.lastModifiedBy?.displayName || 
                                          assessment.Info?.lastModifiedBy?.username || 
                                          'Unknown User',
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
                        createdBy: assessment.details?.createdBy || 
                                  assessment.createdBy || 
                                  assessment.Info?.createdBy?.displayName || 
                                  assessment.Info?.createdBy?.username || 
                                  assessment.Info?.lastModifiedBy?.displayName || 
                                  assessment.Info?.lastModifiedBy?.username || 
                                  'Unknown User',
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
                const indexData = await getAssessments()
                if (indexData && Array.isArray(indexData)) {
                    if (indexData.length > 0) {
                        console.log('✅ Found assessments in index during refresh:', indexData.length)
                        
                        // Load full assessment data for each assessment
                        console.log('📥 Loading full assessment data during refresh...')
                        const fullAssessments = []
                        
                        for (const indexAssessment of indexData) {
                            try {
                                const fullAssessment = await getAssessment(indexAssessment.id)
                                if (fullAssessment) {
                                    fullAssessments.push(fullAssessment)
                                } else {
                                    fullAssessments.push(indexAssessment)
                                }
                            } catch (error) {
                                console.warn(`⚠️ Error loading full data for assessment ${indexAssessment.id} during refresh:`, error)
                                fullAssessments.push(indexAssessment)
                            }
                        }
                        
                        assessmentsList = fullAssessments.map(assessment => ({
                            ...assessment,
                            name: assessment.details?.name || assessment.name || 'Untitled Assessment',
                            status: assessment.details?.status || assessment.status || 'draft',
                            createdAt: assessment.details?.createdAt || assessment.createdAt || new Date().toISOString(),
                            createdBy: assessment.details?.createdBy || 
                                      assessment.createdBy || 
                                      assessment.Info?.createdBy?.displayName || 
                                      assessment.Info?.createdBy?.username || 
                                      assessment.Info?.lastModifiedBy?.displayName || 
                                      assessment.Info?.lastModifiedBy?.username || 
                                      'Unknown User',
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
                createdBy: assessment.details?.createdBy || 
                          assessment.createdBy || 
                          assessment.Info?.createdBy?.displayName || 
                          assessment.Info?.createdBy?.username || 
                          assessment.Info?.lastModifiedBy?.displayName || 
                          assessment.Info?.lastModifiedBy?.username || 
                          'Unknown User',
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
            // New structure - check for selected datasets at root level
            if (assessment.datasetsSelected && Array.isArray(assessment.datasetsSelected)) {
                return assessment.datasetsSelected.length
            }
            
            // Fallback to connection structure
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
            // If no datasets created yet, return 0 (this is normal for new assessments)
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
        const status = count === 0 ? 'Setup Required' : `${count}/4 DQA Datasets`
        return `${name} - ${status}`
    }

    // Helper function to get total data elements count across all DQA datasets
    const getDataElementsCount = (assessment) => {
        try {
            if (assessment.dqaDatasetsCreated && Array.isArray(assessment.dqaDatasetsCreated)) {
                return assessment.dqaDatasetsCreated.reduce((total, dataset) => {
                    return total + (dataset.dataElements ? dataset.dataElements.length : 0)
                }, 0)
            }
            // Return 0 if no datasets created yet (normal for new assessments)
            return 0
        } catch (error) {
            console.warn('Error counting data elements:', error)
            return 0
        }
    }

    // Helper function to get organization units count
    const getOrgUnitsCount = (assessment) => {
        try {
            // Get org units from the first dataset (they should be the same across all datasets)
            if (assessment.dqaDatasetsCreated && Array.isArray(assessment.dqaDatasetsCreated) && assessment.dqaDatasetsCreated.length > 0) {
                const firstDataset = assessment.dqaDatasetsCreated[0]
                return firstDataset.orgUnits ? firstDataset.orgUnits.length : 0
            }
            // Return 0 if no datasets created yet (normal for new assessments)
            return 0
        } catch (error) {
            console.warn('Error counting org units:', error)
            return 0
        }
    }

    // Helper function to get dataset types/aliases
    const getDatasetTypes = (assessment) => {
        try {
            if (assessment.dqaDatasetsCreated && Array.isArray(assessment.dqaDatasetsCreated)) {
                const types = assessment.dqaDatasetsCreated.map(dataset => {
                    return dataset.type || dataset.alias || 'Unknown'
                })
                return types.join(', ')
            }
            // Return empty string if no datasets created yet
            return ''
        } catch (error) {
            console.warn('Error getting dataset types:', error)
            return ''
        }
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

    // Handle duplicate assessment
    const handleDuplicateAssessment = (assessment) => {
        // Navigate to create new assessment with pre-filled data
        navigate('/administration/assessments/create', { 
            state: { 
                duplicateFrom: assessment,
                mode: 'duplicate'
            } 
        })
    }

    // Handle export assessment
    const handleExportAssessment = (assessment) => {
        try {
            // Create export data
            const exportData = {
                assessment: assessment,
                exportedAt: new Date().toISOString(),
                exportedBy: 'Current User', // TODO: Get actual user
                version: '1.0'
            }
            
            // Create and download JSON file
            const dataStr = JSON.stringify(exportData, null, 2)
            const dataBlob = new Blob([dataStr], { type: 'application/json' })
            const url = URL.createObjectURL(dataBlob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${assessment.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.json`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            
            setSuccessMessage(i18n.t('Assessment exported successfully'))
            setTimeout(() => setSuccessMessage(null), 3000)
        } catch (error) {
            console.error('Error exporting assessment:', error)
            alert(i18n.t('Failed to export assessment: {{error}}', { error: error.message }))
        }
    }

    // Handle view in DHIS2
    const handleViewInDHIS2 = (assessment) => {
        // Get the first dataset URL if available
        const createdDatasets = assessment.dqaDatasetsCreated || []
        if (createdDatasets.length > 0 && createdDatasets[0].datasetUrl) {
            window.open(createdDatasets[0].datasetUrl, '_blank')
        } else {
            alert(i18n.t('No DHIS2 datasets available to view'))
        }
    }

    // Handle assessment settings
    const handleAssessmentSettings = (assessment) => {
        setDqModals(prev => ({
            ...prev,
            assessmentSettings: { isOpen: true, assessment }
        }))
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

    // Assessment Actions for each assessment - comprehensive and relevant
    const getAssessmentActions = (assessment) => {
        const datasetCount = getDatasetCount(assessment)
        const isComplete = datasetCount >= 4
        const status = getAssessmentData(assessment, 'status', 'draft')
        const createdDatasets = assessment.dqaDatasetsCreated || []
        const hasDHIS2Datasets = createdDatasets.length > 0 && createdDatasets.some(ds => ds.dhis2Id)
        
        const actions = []

        // Primary Actions
        actions.push(
            {
                label: i18n.t('View Details'),
                icon: <IconView24 />,
                onClick: () => handleViewAssessment(assessment)
            },
            {
                label: isComplete ? i18n.t('Edit Assessment') : i18n.t('Configure Assessment'),
                icon: <IconEdit24 />,
                onClick: () => handleEditAssessment(assessment)
            }
        )

        // DHIS2 Integration Actions (only if datasets exist)
        if (hasDHIS2Datasets) {
            actions.push(
                { type: 'divider' },
                {
                    label: i18n.t('View in DHIS2'),
                    icon: <IconLaunch24 />,
                    onClick: () => handleViewInDHIS2(assessment)
                }
            )
        }

        // Data Quality Actions (only if assessment is complete)
        if (isComplete) {
            actions.push(
                { type: 'divider' },
                {
                    label: i18n.t('Data Quality Check'),
                    icon: <IconMore24 />,
                    onClick: () => openDQModal('dataQualityCheck', assessment)
                },
                {
                    label: i18n.t('Completeness Analysis'),
                    icon: <IconCheckmark24 />,
                    onClick: () => openDQModal('completenessAnalysis', assessment)
                }
            )
        }

        // Management Actions
        actions.push(
            { type: 'divider' },
            {
                label: i18n.t('Duplicate Assessment'),
                icon: <IconCopy24 />,
                onClick: () => handleDuplicateAssessment(assessment)
            },
            {
                label: i18n.t('Export Assessment'),
                icon: <IconDownload24 />,
                onClick: () => handleExportAssessment(assessment)
            }
        )

        // Status Management
        if (status === 'draft') {
            actions.push(
                {
                    label: i18n.t('Activate Assessment'),
                    icon: <IconCheckmark24 />,
                    onClick: () => handleStatusChange(assessment, 'active')
                }
            )
        } else if (status === 'active') {
            actions.push(
                {
                    label: i18n.t('Pause Assessment'),
                    icon: <IconSettings24 />,
                    onClick: () => handleStatusChange(assessment, 'draft')
                }
            )
        } else if (status === 'finished') {
            actions.push(
                {
                    label: i18n.t('Reactivate Assessment'),
                    icon: <IconCheckmark24 />,
                    onClick: () => handleStatusChange(assessment, 'active')
                }
            )
        }

        // Settings
        actions.push(
            { type: 'divider' },
            {
                label: i18n.t('Assessment Settings'),
                icon: <IconSettings24 />,
                onClick: () => handleAssessmentSettings(assessment)
            }
        )

        // Destructive Actions
        actions.push(
            { type: 'divider' },
            {
                label: i18n.t('Delete Assessment'),
                icon: <IconDelete24 />,
                destructive: true,
                onClick: () => handleDeleteAssessment(assessment.id)
            }
        )

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
                    <Button 
                        secondary
                        onClick={handleRefresh}
                        disabled={assessmentsLoading}
                    >
                        🔄 {i18n.t('Refresh')}
                    </Button>
                    {assessments.length > 0 && (
                        <Button 
                            secondary
                            onClick={() => setSmsTestModal({ isOpen: true })}
                        >
                            📱 {i18n.t('Test SMS Integration')}
                        </Button>
                    )}
                    <Button 
                        primary
                        icon={<IconAdd24 />}
                        onClick={handleCreateAssessment}
                    >
                        {i18n.t('Create New Assessment')}
                    </Button>
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
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '32px',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#666' }}>
                                {i18n.t('No Assessments Found')}
                            </h3>
                            <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>
                                {i18n.t('Create your first DQA assessment to get started with data quality analysis.')}
                            </p>
                            {process.env.NODE_ENV === 'development' && (
                                <div style={{ marginTop: '16px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
                                    <strong>Debug Info:</strong><br />
                                    Loading: {assessmentsLoading ? 'Yes' : 'No'}<br />
                                    Initial Load: {initialLoad ? 'Yes' : 'No'}<br />
                                    Error: {assessmentsError || 'None'}<br />
                                    Assessments Count: {assessments.length}
                                </div>
                            )}
                        </div>
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
                    <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        overflow: 'auto'
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={tableStyles.th}>{i18n.t('Assessment Details')}</th>
                                        <th style={tableStyles.th}>{i18n.t('Period & Frequency')}</th>
                                        <th style={tableStyles.th}>{i18n.t('Type & Priority')}</th>
                                        <th style={tableStyles.th}>{i18n.t('Status')}</th>
                                        <th style={tableStyles.th}>{i18n.t('Data Configuration')}</th>
                                        <th style={tableStyles.th}>{i18n.t('Created')}</th>
                                        <th style={tableStyles.th}>{i18n.t('Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessments.map((assessment, index) => {
                                        // Debug log for assessment structure (only in development)
                                        if (process.env.NODE_ENV === 'development' && index === 0) {
                                            console.log('📊 Sample assessment structure:', {
                                                id: assessment.id,
                                                hasDetails: !!assessment.details,
                                                hasConnection: !!assessment.connection,
                                                hasDqaDatasetsCreated: !!assessment.dqaDatasetsCreated,
                                                dqaDatasetsCount: assessment.dqaDatasetsCreated?.length || 0,
                                                structure: Object.keys(assessment)
                                            })
                                        }
                                        
                                        return (
                                            <tr key={assessment?.id || `assessment-${index}`}>
                                                {/* Assessment Details */}
                                                <td style={tableStyles.td}>
                                                    <div>
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
                                                    </div>
                                                </td>

                                                {/* Period & Frequency */}
                                                <td style={tableStyles.td}>
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
                                                </td>

                                                {/* Type & Priority */}
                                                <td style={tableStyles.td}>
                                                    <div>
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
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td style={tableStyles.td}>
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
                                                </td>

                                                {/* Data Configuration */}
                                                <td style={tableStyles.td}>
                                                    {(() => {
                                                        const datasetCount = getDatasetCount(assessment)
                                                        const selectedDatasets = getSelectedDatasetsCount(assessment)
                                                        
                                                        // Debug logging (only in development)
                                                        if (process.env.NODE_ENV === 'development' && index === 0) {
                                                            console.log('🔍 Assessment data configuration:', {
                                                                assessmentId: assessment.id,
                                                                assessmentName: assessment.details?.name || assessment.name,
                                                                datasetCount,
                                                                selectedDatasets,
                                                                hasDatasets: !!assessment.dqaDatasetsCreated,
                                                                assessmentKeys: Object.keys(assessment)
                                                            })
                                                        }
                                                        
                                                        // Get detailed counts using helper functions
                                                        const dataElementsCount = getDataElementsCount(assessment)
                                                        const orgUnitsCount = getOrgUnitsCount(assessment)
                                                        const datasetTypes = getDatasetTypes(assessment)
                                                        
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
                                                                            <span style={{ fontWeight: '500' }}>Elements:</span> {dataElementsCount} DQA elements
                                                                        </div>
                                                                        <div style={{ marginBottom: '1px' }}>
                                                                            <span style={{ fontWeight: '500' }}>Facilities:</span> {orgUnitsCount} assigned
                                                                        </div>
                                                                        {datasetTypes && (
                                                                            <div style={{ fontSize: '10px', color: '#888' }}>
                                                                                Types: {datasetTypes}
                                                                            </div>
                                                                        )}
                                                                        {selectedDatasets > 0 && (
                                                                            <div style={{ fontSize: '10px', color: '#888' }}>
                                                                                From {selectedDatasets} source datasets
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        } else if (selectedDatasets > 0 || (assessment.selectedDatasets && assessment.selectedDatasets.length > 0)) {
                                                            // Partial setup - datasets selected but DQA not created
                                                            const actualSelectedCount = selectedDatasets || (assessment.selectedDatasets?.length || 0)
                                                            return (
                                                                <div>
                                                                    <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#f59e0b' }}>
                                                                        ⚙️ Setup In Progress
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                                                        <div style={{ marginBottom: '1px' }}>
                                                                            <span style={{ fontWeight: '500' }}>Source:</span> {actualSelectedCount} datasets selected
                                                                        </div>
                                                                        <div style={{ marginBottom: '1px' }}>
                                                                            <span style={{ fontWeight: '500' }}>DQA:</span> {datasetCount}/4 datasets created
                                                                        </div>
                                                                        {datasetCount > 0 && (
                                                                            <>
                                                                                <div style={{ marginBottom: '1px' }}>
                                                                                    <span style={{ fontWeight: '500' }}>Elements:</span> {dataElementsCount} created
                                                                                </div>
                                                                                <div style={{ marginBottom: '1px' }}>
                                                                                    <span style={{ fontWeight: '500' }}>Facilities:</span> {orgUnitsCount} assigned
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                                                                            Complete setup to generate all DQA datasets
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
                                                </td>

                                                {/* Created */}
                                                <td style={tableStyles.td}>
                                                    <div>
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
                                                    </div>
                                                </td>
                                                
                                                {/* Actions */}
                                                <td style={tableStyles.td}>
                                                    <DropdownButton
                                                        component={
                                                            <FlyoutMenu>
                                                                {getAssessmentActions(assessment).map((action, index) => 
                                                                    action.type === 'divider' ? (
                                                                        <Divider key={index} />
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
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                            onClick={async () => {
                                try {
                                    const assessmentId = statusChangeModal.assessment?.id
                                    const newStatus = statusChangeModal.newStatus
                                    
                                    // Update the assessment status in the datastore
                                    const updatedAssessment = {
                                        ...statusChangeModal.assessment,
                                        details: {
                                            ...statusChangeModal.assessment.details,
                                            status: newStatus,
                                            lastModified: new Date().toISOString()
                                        }
                                    }
                                    
                                    // Save to datastore (you'll need to implement this in your service)
                                    // await updateAssessment(assessmentId, updatedAssessment)
                                    
                                    // Update local state
                                    setAssessments(prev => prev.map(assessment => 
                                        assessment.id === assessmentId 
                                            ? { ...assessment, status: newStatus, details: { ...assessment.details, status: newStatus } }
                                            : assessment
                                    ))
                                    
                                    setSuccessMessage(i18n.t('Assessment status changed to {{status}}', { status: newStatus }))
                                    setTimeout(() => setSuccessMessage(null), 5000)
                                    setStatusChangeModal({ isOpen: false, assessment: null, newStatus: null })
                                } catch (error) {
                                    console.error('Error changing assessment status:', error)
                                    alert(i18n.t('Failed to change assessment status: {{error}}', { error: error.message }))
                                }
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

// Table styles matching assessment creation steps
const tableStyles = {
    th: { 
        textAlign: 'left', 
        borderBottom: '2px solid #ccc', 
        padding: '10px 8px', 
        fontSize: 12, 
        textTransform: 'uppercase', 
        letterSpacing: '.4px' 
    },
    td: { 
        borderBottom: '1px solid #eee', 
        padding: '10px 8px', 
        verticalAlign: 'top', 
        fontSize: 14 
    }
}