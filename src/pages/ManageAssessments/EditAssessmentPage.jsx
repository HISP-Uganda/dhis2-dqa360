import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
    Box,
    Button,
    ButtonStrip,
    Card,
    Input,
    CircularLoader,
    NoticeBox,
    Tag,
    InputField,
    TextAreaField,
    SingleSelectField,
    SingleSelectOption,
    MultiSelectField,
    MultiSelectOption,
    Checkbox,
    Tab,
    TabBar,
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    IconChevronRight24 as IconArrowLeft24,
    IconAdd24 as IconSave24,
    IconEdit24
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { DHIS2Configuration } from '../Metadata/DHIS2Configuration'
import { AssessmentDataSetSelection } from '../../components/AssessmentDataSetSelection'
import { OrganisationUnitManagement } from '../Metadata/OrganisationUnitManagement'
import { OrganizationUnitMapping } from '../Metadata/OrganizationUnitMapping'
import PreparationStep from './AssessmentSteps/PreparationStep'
import ReviewStep from './AssessmentSteps/ReviewStep'
import { useTabBasedDataStore } from '../../services/tabBasedDataStoreService'
import { useDataEngine } from '@dhis2/app-runtime'
import { useUserAuthorities } from '../../hooks/useUserAuthorities'
import { DateInputField } from '../../components/DateInputField'
import { AssessmentSaveDebugger } from '../../components/AssessmentSaveDebugger'
import { createAssessmentTools } from '../../utils/assessmentToolsCreator'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'

export const EditAssessmentPage = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const location = useLocation()
    const dataEngine = useDataEngine()
    const { userInfo } = useUserAuthorities()

    // Main state variables
    const [activeTab, setActiveTab] = useState('details')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [originalData, setOriginalData] = useState(null)
    const [visitedTabs, setVisitedTabs] = useState(new Set(['details']))

    // Organization unit mappings state
    const [orgUnitMappings, setOrgUnitMappings] = useState([])

    // State for editing previous selections
    const [editingDataElements, setEditingDataElements] = useState(false)
    const [editingDataSets, setEditingDataSets] = useState(false)
    const [editingOrgUnits, setEditingOrgUnits] = useState(false)
    const [localSelectedDataElements, setLocalSelectedDataElements] = useState([])
    const [localSelectedDataSets, setLocalSelectedDataSets] = useState([])
    const [localOrgUnitMappings, setLocalOrgUnitMappings] = useState([])
    // Prepared dataset details captured from Preparation step
    const [prepDatasets, setPrepDatasets] = useState(null)
    const [prepDataElements, setPrepDataElements] = useState(null)

    // DataStore services
    const { loadAssessment, saveAssessment, getAssessmentLocalDatasets, finalizeAssessment } = useTabBasedDataStore()
    const { saveAssessment: saveNestedAssessment, createAssessmentStructure } = useAssessmentDataStore()

    // Assessment data state - matching CreateAssessmentPage structure
    const [assessmentData, setAssessmentData] = useState({
        name: '',
        description: '',
        assessmentType: 'baseline',
        priority: 'medium',
        startDate: '',
        endDate: '',
        baselineAssessmentId: '',
        notifications: true,
        autoSync: true,
        validationAlerts: false,
        historicalComparison: false,
        // Additional assessment details
        objectives: '',
        scope: '',
        methodology: 'automated',
        frequency: 'monthly',
        reportingLevel: 'facility',
        dataQualityDimensions: ['completeness', 'timeliness'],
        stakeholders: [],
        riskFactors: [],
        successCriteria: '',
        // Advanced settings
        confidentialityLevel: 'internal',
        dataRetentionPeriod: '5years',
        publicAccess: false,
        tags: [],
        customFields: {},
        // SMS defaults for Review tweaks
        smsConfig: {
            enabled: false,
            autoGenerate: true,
            separator: ',',
            defaultCommandName: 'DQA_REGISTER',
            messages: { defaultReplyMessage: 'Thanks! SMS received.' }
        }
    })

    // Other state - matching CreateAssessmentPage
    const [metadataSource, setMetadataSource] = useState(null) // 'dhis2' or 'manual'
    const [dhis2Config, setDhis2Config] = useState(null)

    // Additional metadata collections - loaded from assessment's localDatasetsMetadata
    const [categoryOptions, setCategoryOptions] = useState([])
    const [categories, setCategories] = useState([])
    const [categoryCombos, setCategoryCombos] = useState([])
    const [attributes, setAttributes] = useState([])
    const [optionSets, setOptionSets] = useState([])
    const [selectedDataSet, setSelectedDataSet] = useState(null) // Keep for backward compatibility
    const [selectedDataSets, setSelectedDataSets] = useState([]) // New multi-select state
    const [selectedDataElements, setSelectedDataElements] = useState([])
    const [selectedOrgUnits, setSelectedOrgUnits] = useState([])
    const [datasetPreparationComplete, setDatasetPreparationComplete] = useState(false)

    // Additional metadata collections
    const [baselineAssessments, setBaselineAssessments] = useState([])
    const [loadingBaselines, setLoadingBaselines] = useState(false)

    // Configuration data - matching CreateAssessmentPage
    const assessmentTypes = [
        { value: 'baseline', label: i18n.t('Baseline Assessment') },
        { value: 'followup', label: i18n.t('Follow-up Assessment') }
    ]

    const priorities = [
        { value: 'low', label: i18n.t('Low') },
        { value: 'medium', label: i18n.t('Medium') },
        { value: 'high', label: i18n.t('High') },
        { value: 'critical', label: i18n.t('Critical') }
    ]

    const methodologies = [
        { value: 'automated', label: i18n.t('Automated') },
        { value: 'manual', label: i18n.t('Manual') },
        { value: 'hybrid', label: i18n.t('Hybrid') }
    ]

    const frequencies = [
        { value: 'daily', label: i18n.t('Daily') },
        { value: 'weekly', label: i18n.t('Weekly') },
        { value: 'monthly', label: i18n.t('Monthly') },
        { value: 'quarterly', label: i18n.t('Quarterly') },
        { value: 'annually', label: i18n.t('Annually') }
    ]

    // Define tab order for navigation (matching CreateAssessmentPage)
    const tabs = [
        { id: 'details', label: i18n.t('Assessment Details') },
        { id: 'connection', label: i18n.t('DHIS2 Connection') },
        { id: 'datasets', label: i18n.t('Select Datasets') },
        { id: 'elements', label: i18n.t('Data Elements') },
        { id: 'units', label: i18n.t('Organisation Units') },
        { id: 'mapping', label: i18n.t('Map Organisation Units') },
        { id: 'preparation', label: i18n.t('Dataset Preparation') },
        { id: 'sms', label: i18n.t('SMS Reporting'), icon: '📱' },
        // Edit tabs for reviewing and modifying previous selections
        { id: 'editDataElements', label: i18n.t('Edit Data Elements'), icon: '📊' },
        { id: 'editDataSets', label: i18n.t('Edit Data Sets'), icon: '📋' },
        { id: 'editOrgUnits', label: i18n.t('Edit Org Units'), icon: '🏢' },
        { id: 'review', label: i18n.t('Review & Summary'), icon: '🔍' }
    ]

    const dataQualityDimensions = [
        { value: 'completeness', label: i18n.t('Completeness') },
        { value: 'timeliness', label: i18n.t('Timeliness') },
        { value: 'accuracy', label: i18n.t('Accuracy') },
        { value: 'consistency', label: i18n.t('Consistency') },
        { value: 'validity', label: i18n.t('Validity') },
        { value: 'integrity', label: i18n.t('Integrity') },
        { value: 'precision', label: i18n.t('Precision') },
        { value: 'reliability', label: i18n.t('Reliability') },
        { value: 'accessibility', label: i18n.t('Accessibility') },
        { value: 'interpretability', label: i18n.t('Interpretability') },
        { value: 'relevance', label: i18n.t('Relevance') },
        { value: 'comparability', label: i18n.t('Comparability') },
        { value: 'coherence', label: i18n.t('Coherence') },
        { value: 'granularity', label: i18n.t('Granularity') },
        { value: 'uniqueness', label: i18n.t('Uniqueness') },
        { value: 'conformity', label: i18n.t('Conformity') }
    ]

    const confidentialityLevels = [
        { value: 'public', label: i18n.t('Public') },
        { value: 'internal', label: i18n.t('Internal') },
        { value: 'confidential', label: i18n.t('Confidential') },
        { value: 'restricted', label: i18n.t('Restricted') }
    ]

    const dataRetentionPeriods = [
        { value: '1year', label: i18n.t('1 Year') },
        { value: '3years', label: i18n.t('3 Years') },
        { value: '5years', label: i18n.t('5 Years') },
        { value: '7years', label: i18n.t('7 Years') },
        { value: '10years', label: i18n.t('10 Years') },
        { value: 'indefinite', label: i18n.t('Indefinite') }
    ]

    // Function to generate period based on frequency
    const generatePeriodFromFrequency = (frequency) => {
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const d = String(now.getDate()).padStart(2, '0')
        switch ((frequency || '').toLowerCase()) {
            case 'daily':
                return `${y}${m}${d}`
            case 'weekly': {
                const startOfYear = new Date(y, 0, 1)
                const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
                return `${y}W${week}`
            }
            case 'monthly':
                return `${y}${m}`
            case 'quarterly':
                return `${y}Q${Math.ceil((now.getMonth() + 1) / 3)}`
            case 'annually':
            default:
                return `${y}`
        }
    }

    const formatUserInfo = (u) => {
        if (!u) return 'unknown'
        const username = u.username || 'unknown'
        const first = u.firstName || u.name || ''
        const last = u.surname || u.lastName || ''
        const full = [first, last].filter(Boolean).join(' ').trim()
        return full ? `${username} (${full})` : username
    }

    // Load assessment data on component mount
    useEffect(() => {
        const loadAssessmentData = async () => {
            try {
                setLoading(true)
                setError(null)

                // Load assessment from location state or fetch from datastore
                let assessment = location.state?.assessment

                if (!assessment && id) {
                    console.log('Loading assessment from datastore:', id)
                    assessment = await loadAssessment(id)
                }

                if (!assessment) {
                    throw new Error('Assessment not found')
                }

                console.log('Loaded assessment for editing:', assessment)

                // Set assessment data with proper defaults - matching CreateAssessmentPage structure
                const processedAssessment = {
                    // Basic fields
                    id: assessment.id,
                    name: assessment.name || '',
                    description: assessment.description || '',
                    assessmentType: assessment.assessmentType || 'baseline',
                    priority: assessment.priority || 'medium',
                    status: assessment.status || 'draft',
                    startDate: assessment.startDate || '',
                    endDate: assessment.endDate || '',
                    baselineAssessmentId: assessment.baselineAssessmentId || '',

                    // Boolean settings
                    notifications: assessment.notifications !== undefined ? assessment.notifications : true,
                    autoSync: assessment.autoSync !== undefined ? assessment.autoSync : true,
                    validationAlerts: assessment.validationAlerts !== undefined ? assessment.validationAlerts : false,
                    historicalComparison: assessment.historicalComparison !== undefined ? assessment.historicalComparison : false,

                    // Additional assessment details
                    objectives: assessment.objectives || '',
                    scope: assessment.scope || '',
                    methodology: assessment.methodology || 'automated',
                    frequency: assessment.frequency || 'monthly',
                    reportingLevel: assessment.reportingLevel || 'facility',
                    dataQualityDimensions: assessment.dataQualityDimensions || ['completeness', 'timeliness'],
                    stakeholders: assessment.stakeholders || [],
                    riskFactors: assessment.riskFactors || [],
                    successCriteria: assessment.successCriteria || '',

                    // Advanced settings
                    confidentialityLevel: assessment.confidentialityLevel || 'internal',
                    dataRetentionPeriod: assessment.dataRetentionPeriod || '5years',
                    publicAccess: assessment.publicAccess !== undefined ? assessment.publicAccess : false,
                    tags: assessment.tags || [],
                    customFields: assessment.customFields || {},

                    // Metadata and configuration
                    localDatasetsMetadata: assessment.localDatasetsMetadata || null,
                    dhis2Configuration: assessment.dhis2Configuration || null,

                    // Timestamps
                    createdAt: assessment.createdAt,
                    createdBy: assessment.createdBy,
                    lastUpdated: assessment.lastUpdated,
                    lastUpdatedBy: assessment.lastUpdatedBy
                }

                setAssessmentData(processedAssessment)

                // Load metadata from assessment's localDatasetsMetadata
                loadMetadataFromAssessment(assessment)

                // For editing, always use DHIS2 mode to allow loading datasets from DHIS2 instance
                // Even if there's local metadata, users should be able to modify dataset selection
                if (assessment.dhis2Configuration) {
                    setMetadataSource('dhis2')
                    setDhis2Config(assessment.dhis2Configuration)
                } else {
                    // If no DHIS2 config exists, default to dhis2 mode but user will need to configure
                    setMetadataSource('dhis2')
                }

                // Load organization unit mappings if they exist
                if (assessment.orgUnitMappings) {
                    setOrgUnitMappings(assessment.orgUnitMappings)
                }

                // Store original data for reset functionality
                setOriginalData({
                    assessmentData: processedAssessment,
                    dhis2Config: assessment.dhis2Configuration || null,
                    selectedDataSets: assessment.localDatasetsMetadata?.createdDatasets || [],
                    selectedDataElements: [],
                    selectedOrgUnits: assessment.localDatasetsMetadata?.organisationUnitsMetadata || [],
                    metadataSource: 'dhis2', // Always use dhis2 mode for editing
                    orgUnitMappings: assessment.orgUnitMappings || [],
                    datasetPreparationComplete: assessment.localDatasetsMetadata?.createdDatasets?.length === 4 || false
                })

            } catch (error) {
                console.error('Error loading assessment:', error)
                setError(`Failed to load assessment: ${error.message}`)
            } finally {
                setLoading(false)
            }
        }

        loadAssessmentData()
    }, [id, location.state])

    // Sync local state with main state when they change
    useEffect(() => {
        setLocalSelectedDataElements(selectedDataElements || [])
    }, [selectedDataElements])

    useEffect(() => {
        setLocalSelectedDataSets(selectedDataSets || [])
    }, [selectedDataSets])

    useEffect(() => {
        setLocalOrgUnitMappings(orgUnitMappings || [])
    }, [orgUnitMappings])

    // Load metadata from assessment's localDatasetsMetadata
    const loadMetadataFromAssessment = (assessment) => {
        try {
            const localMetadata = assessment.localDatasetsMetadata

            if (localMetadata) {
                // Load created datasets
                if (localMetadata.createdDatasets) {
                    setSelectedDataSets(localMetadata.createdDatasets)
                    console.log('Loaded datasets from assessment:', localMetadata.createdDatasets.length)
                }

                // Load data elements metadata
                if (localMetadata.dataElementsMetadata) {
                    const allDataElements = localMetadata.dataElementsMetadata.reduce((acc, group) => {
                        return acc.concat(group.dataElements || [])
                    }, [])
                    setSelectedDataElements(allDataElements)
                    console.log('Loaded data elements from assessment:', allDataElements.length)
                }

                // Load organization units metadata
                if (localMetadata.organisationUnitsMetadata) {
                    setSelectedOrgUnits(localMetadata.organisationUnitsMetadata)
                    console.log('Loaded org units from assessment:', localMetadata.organisationUnitsMetadata.length)
                }

                // Load other metadata types if they exist
                if (localMetadata.categoryOptions) {
                    setCategoryOptions(localMetadata.categoryOptions)
                }
                if (localMetadata.categories) {
                    setCategories(localMetadata.categories)
                }
                if (localMetadata.categoryCombos) {
                    setCategoryCombos(localMetadata.categoryCombos)
                }
                if (localMetadata.attributes) {
                    setAttributes(localMetadata.attributes)
                }
                if (localMetadata.optionSets) {
                    setOptionSets(localMetadata.optionSets)
                }

                // Check if dataset preparation is complete
                const hasAllRequiredDatasets = localMetadata.createdDatasets?.length === 4
                setDatasetPreparationComplete(hasAllRequiredDatasets)
            }
        } catch (error) {
            console.warn('Error loading metadata from assessment:', error)
        }
    }

    // Handle form field changes
    const handleFieldChange = (field, value) => {
        setAssessmentData(prev => {
            const updated = {
                ...prev,
                [field]: value,
                lastUpdated: new Date().toISOString(),
                lastUpdatedBy: 'Current User' // TODO: Get from DHIS2 context
            }

            // Check if there are unsaved changes
            if (originalData) {
                const hasChanges = JSON.stringify(updated) !== JSON.stringify(originalData.assessmentData)
                setHasUnsavedChanges(hasChanges)
            }

            return updated
        })
    }

    // Handle boolean field changes
    const handleBooleanFieldChange = (field, checked) => {
        handleFieldChange(field, checked)
    }

    // Handle DHIS2 configuration save
    const handleDHIS2ConfigSave = (config) => {
        setDhis2Config(config)
        setHasUnsavedChanges(true)
        console.log('DHIS2 config saved:', config)
    }

    // Handle dataset preparation completion
    const handleDatasetPreparationComplete = (isComplete, datasets) => {
        setDatasetPreparationComplete(isComplete)
        if (datasets) {
            setSelectedDataSets(datasets)
        }
        setHasUnsavedChanges(true)
    }

    // Handle metadata source change
    const handleMetadataSourceChange = (source) => {
        setMetadataSource(source)
        setHasUnsavedChanges(true)
    }

    // Handle cancel action
    const handleCancel = () => {
        if (hasUnsavedChanges) {
            if (confirm(i18n.t('You have unsaved changes. Are you sure you want to leave?'))) {
                navigate('/administration/assessments')
            }
        } else {
            navigate('/administration/assessments')
        }
    }

    // Handle reset changes
    const handleResetChanges = () => {
        if (confirm(i18n.t('Are you sure you want to reset all changes?'))) {
            if (originalData) {
                setAssessmentData(originalData.assessmentData || {})
                setDhis2Config(originalData.dhis2Config || null)
                setSelectedDataSets(originalData.selectedDataSets || [])
                setSelectedDataElements(originalData.selectedDataElements || [])
                setSelectedOrgUnits(originalData.selectedOrgUnits || [])
                setMetadataSource(originalData.metadataSource || 'dhis2')
                setOrgUnitMappings(originalData.orgUnitMappings || [])
                setDatasetPreparationComplete(originalData.datasetPreparationComplete || false)
                setHasUnsavedChanges(false)

                // Reset local editing state
                setLocalSelectedDataElements(originalData.selectedDataElements || [])
                setLocalSelectedDataSets(originalData.selectedDataSets || [])
                setLocalOrgUnitMappings(originalData.orgUnitMappings || [])
            }
        }
    }

    // Functions for editing previous selections
    const handleEditDataElements = () => {
        setEditingDataElements(true)
    }

    const handleSaveDataElements = () => {
        setSelectedDataElements(localSelectedDataElements)
        setEditingDataElements(false)
        setHasUnsavedChanges(true)
        setSuccessMessage('✅ Data elements updated successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
    }

    const handleCancelEditDataElements = () => {
        setLocalSelectedDataElements(selectedDataElements || [])
        setEditingDataElements(false)
    }

    const handleRemoveDataElement = (elementId) => {
        setLocalSelectedDataElements(prev => prev.filter(element => element.id !== elementId))
    }

    const handleEditDataSets = () => {
        setEditingDataSets(true)
    }

    const handleSaveDataSets = () => {
        setSelectedDataSets(localSelectedDataSets)
        setEditingDataSets(false)
        setHasUnsavedChanges(true)
        setSuccessMessage('✅ Data sets updated successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
    }

    const handleCancelEditDataSets = () => {
        setLocalSelectedDataSets(selectedDataSets || [])
        setEditingDataSets(false)
    }

    const handleRemoveDataSet = (datasetId) => {
        setLocalSelectedDataSets(prev => prev.filter(dataset => dataset.id !== datasetId))
    }

    const handleEditOrgUnits = () => {
        setEditingOrgUnits(true)
    }

    const handleSaveOrgUnits = () => {
        setOrgUnitMappings(localOrgUnitMappings)
        setEditingOrgUnits(false)
        setHasUnsavedChanges(true)
        setSuccessMessage('✅ Organization units updated successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
    }

    const handleCancelEditOrgUnits = () => {
        setLocalOrgUnitMappings(orgUnitMappings || [])
        setEditingOrgUnits(false)
    }

    const handleRemoveOrgUnit = (index) => {
        setLocalOrgUnitMappings(prev => prev.filter((_, i) => i !== index))
    }

    // Handle save assessment
    const handleSaveAssessment = async () => {
        try {
            setSaving(true)
            setError(null)

            // Prepare assessment data for saving
            const assessmentToSave = {
                ...assessmentData,
                lastUpdated: new Date().toISOString(),
                lastUpdatedBy: 'Current User', // TODO: Get from DHIS2 context

                // Include local datasets metadata
                localDatasetsMetadata: {
                    ...assessmentData.localDatasetsMetadata,
                    createdDatasets: selectedDataSets,
                    dataElementsMetadata: selectedDataElements.length > 0 ? [
                        {
                            name: 'Data Elements',
                            dataElements: selectedDataElements
                        }
                    ] : [],
                    organisationUnitsMetadata: selectedOrgUnits,
                    categoryOptions,
                    categories,
                    categoryCombos,
                    attributes,
                    optionSets
                },

                // Update DHIS2 configuration if set
                dhis2Configuration: dhis2Config,

                // Include metadata source and organization unit mappings
                metadataSource,
                orgUnitMappings
            }

            console.log('Saving updated assessment:', assessmentToSave)

            // Save to datastore
            await saveAssessment(assessmentToSave)

            setSuccessMessage('Assessment updated successfully!')
            setHasUnsavedChanges(false)
            setOriginalData(JSON.parse(JSON.stringify(assessmentToSave)))

            // Navigate back to manage assessments with success message
            setTimeout(() => {
                navigate('/administration/assessments', {
                    state: {
                        message: `Assessment "${assessmentData.name}" updated successfully!`
                    }
                })
            }, 1500)

        } catch (error) {
            console.error('Error saving assessment:', error)
            setError(`Failed to save assessment: ${error.message}`)
        } finally {
            setSaving(false)
        }
    }

    // Navigation helper functions (matching CreateAssessmentPage)
    const canProceedToTab = (tabId) => {
        const tabIndex = tabs.findIndex(tab => tab.id === tabId)
        if (tabIndex === 0) return true

        // Check if all previous tabs are valid
        for (let i = 0; i < tabIndex; i++) {
            if (!isTabValid(tabs[i].id)) {
                return false
            }
        }
        return true
    }

    const changeTab = (tabId) => {
        setActiveTab(tabId)
        setVisitedTabs(prev => new Set([...prev, tabId]))
    }

    const handleTabClick = (tabId) => {
        if (canProceedToTab(tabId)) {
            changeTab(tabId)
        }
    }

    // Handle tab change (legacy support)
    const handleTabChange = (tabName) => {
        handleTabClick(tabName)
    }

    const handleNext = () => {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
        if (currentIndex < tabs.length - 1) {
            const nextTab = tabs[currentIndex + 1]
            if (canProceedToTab(nextTab.id)) {
                changeTab(nextTab.id)
            }
        }
    }

    const handlePrevious = () => {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
        if (currentIndex > 0) {
            changeTab(tabs[currentIndex - 1].id)
        }
    }

    // Check if a tab is valid (has required data) - matching CreateAssessmentPage
    const isTabValid = (tabId) => {
        const dhis2Valid = dhis2Config && dhis2Config.baseUrl && dhis2Config.baseUrl.trim().length > 0

        switch (tabId) {
            case 'details':
                return assessmentData.name && assessmentData.name.trim().length > 0
            case 'connection':
                return dhis2Valid
            case 'datasets':
                return dhis2Valid && selectedDataSets.length > 0
            case 'elements':
                return selectedDataSets.length > 0 && selectedDataElements.length > 0
            case 'units':
                return selectedDataElements.length > 0 && selectedOrgUnits.length > 0
            case 'mapping':
                return selectedOrgUnits.length > 0 && orgUnitMappings.length > 0
            case 'preparation':
                return datasetPreparationComplete
            case 'editDataElements':
                return true // Always accessible for editing
            case 'editDataSets':
                return true // Always accessible for editing
            case 'editOrgUnits':
                return true // Always accessible for editing
            case 'review':
                return true // Always accessible for review
            default:
                return false
        }
    }

    // Get validation message for a tab
    const getTabValidationMessage = (tabId) => {
        switch (tabId) {
            case 'connection':
                return i18n.t('Please configure DHIS2 connection settings first.')
            case 'datasets':
                return i18n.t('Please select at least one dataset.')
            case 'elements':
                return i18n.t('Please ensure data elements are loaded from selected datasets.')
            case 'units':
                return i18n.t('Please select organization units.')
            case 'mapping':
                return i18n.t('Please complete organization unit mapping.')
            case 'preparation':
                return i18n.t('Please complete dataset preparation.')
            default:
                return i18n.t('Please complete the previous steps.')
        }
    }

    // Render tab content (matching CreateAssessmentPage design)
    // Build payload similar to CreateAssessmentPage
    const buildAssessmentPayload = () => {
        const now = new Date().toISOString()

        const materializedDEs = selectedDataElements || []
        const materializedOUs = selectedOrgUnits || []

        // Derive datasets structure from selectedDataSets (which may be full objects already)
        const dsArray = (selectedDataSets || []).map(ds => (typeof ds === 'string' ? { id: ds } : ds))

        return {
            id: assessmentData.id || `assessment_${Date.now()}`,
            version: '2.0.0',
            createdAt: assessmentData.createdAt || now,
            lastUpdated: now,
            info: {
                name: assessmentData.name?.trim() || '',
                description: assessmentData.description || '',
                objectives: assessmentData.objectives || '',
                scope: assessmentData.scope || '',
                frequency: assessmentData.frequency || 'Monthly',
                period: assessmentData.period || generatePeriodFromFrequency(assessmentData.frequency),
                status: assessmentData.status || 'draft',
                createdBy: assessmentData.createdBy || formatUserInfo(userInfo),
                lastModifiedBy: formatUserInfo(userInfo),
                assessmentType: assessmentData.assessmentType || 'baseline',
                priority: assessmentData.priority || 'medium',
                methodology: assessmentData.methodology || 'automated',
                startDate: assessmentData.startDate || '',
                endDate: assessmentData.endDate || '',
                reportingLevel: assessmentData.reportingLevel || '',
                dataQualityDimensions: assessmentData.dataQualityDimensions || ['accuracy'],
                successCriteriaPredefined: assessmentData.successCriteriaPredefined || [],
                successCriteria: assessmentData.successCriteria || '',
                confidentialityLevel: assessmentData.confidentialityLevel || 'internal',
                dataRetentionPeriod: assessmentData.dataRetentionPeriod || '5years',
                baselineAssessmentId: assessmentData.baselineAssessmentId || '',
                options: {
                    autoSave: !!assessmentData.autoSave,
                    autoSync: !!assessmentData.autoSync,
                    validationAlerts: !!assessmentData.validationAlerts,
                    historicalComparison: !!assessmentData.historicalComparison,
                    publicAccess: !!assessmentData.publicAccess,
                },
            },
            sms: {
                enabled: !!assessmentData?.smsConfig?.enabled,
                senderId: assessmentData?.smsConfig?.senderId || '',
                reportKeyword: assessmentData?.smsConfig?.reportKeyword || 'DQA',
                phonePattern: assessmentData?.smsConfig?.phonePattern || '',
                previewMessage: assessmentData?.smsConfig?.previewMessage || 'DQA {{period}} {{orgUnit}} {{status}}',
                commands: assessmentData?.smsConfig?.commands || [],
            },
            datasets: {
                selected: dsArray.map(ds => ({
                    id: ds.id,
                    name: ds.name || ds.id,
                    code: ds.code || '',
                    periodType: ds.periodType || 'Monthly',
                    organisationUnits: (
                        Array.isArray(ds.organisationUnits)
                            ? ds.organisationUnits
                            : (Array.isArray(ds?.organisationUnits?.selected) ? ds.organisationUnits.selected : [])
                    ).map(ou => ({
                        id: ou.id, name: ou.name, code: ou.code || '', level: ou.level,
                        path: ou.path, parent: ou.parent ? { id: ou.parent.id, name: ou.parent.name, code: ou.parent.code || '' } : null
                    })),
                    dataSetElements: (Array.isArray(ds.dataSetElements) ? ds.dataSetElements : []).map(dse => ({
                        dataElement: dse?.dataElement ? {
                            id: dse.dataElement.id,
                            name: dse.dataElement.name,
                            code: dse.dataElement.code || '',
                            valueType: dse.dataElement.valueType || 'TEXT',
                        } : null,
                        categoryCombo: dse?.categoryCombo ? {
                            id: dse.categoryCombo.id,
                            name: dse.categoryCombo.name,
                        } : null
                    }))
                })),
                metadata: { totalSelected: dsArray.length, source: metadataSource || 'dhis2', lastUpdated: now },
            },
            dataElements: {
                selected: materializedDEs.map(de => ({
                    id: de.id,
                    name: de.name,
                    code: de.code || '',
                    valueType: de.valueType,
                    categoryCombo: de.categoryCombo ? { id: de.categoryCombo.id, name: de.categoryCombo.name } : undefined,
                    categories: (de.categories || []).map(c => ({
                        id: c.id,
                        name: c.name,
                        code: c.code || '',
                        categoryOptions: (c.options || []).map(o => ({ id: o.id, name: o.name, code: o.code || '' }))
                    })),
                    categoryOptionCount: de.categoryOptionCount || 0,
                })),
                metadata: { totalSelected: materializedDEs.length, lastUpdated: now, source: 'derived-from-datasets' },
            },
            orgUnits: {
                selected: materializedOUs.map(ou => ({ id: ou.id, name: ou.name, level: ou.level || 1, path: ou.path || `/${ou.id}` })),
                metadata: { totalSelected: materializedOUs.length, lastUpdated: now },
            },
            orgUnitMapping: {
                mappings: (orgUnitMappings || []).map(m => ({ sourceId: m.source || m.external, targetId: m.target || m.local })).filter(m => m.sourceId && m.targetId),
            },
            localDatasets: {
                info: {
                    creationStatus: datasetPreparationComplete ? 'completed' : 'pending',
                    createdAt: datasetPreparationComplete ? now : null,
                    lastModified: datasetPreparationComplete ? now : null,
                },
                createdDatasets: (() => {
                    const cp = assessmentData?.creationPayload
                    if (!cp?.datasets) return []
                    return Object.keys(cp.datasets).map(type => {
                        const entry = cp.datasets[type] || {}
                        const p = entry.payload || {}
                        return {
                            id: entry.datasetId || p.id || '',
                            type,
                            name: p.name || '',
                            code: p.code || '',
                            periodType: p.periodType || 'Monthly',
                            elements: Array.isArray(p.dataSetElements) ? p.dataSetElements.length : 0,
                            orgUnits: Array.isArray(p.organisationUnits) ? p.organisationUnits.length : 0,
                            // Attach SMS command per dataset (if any)
                            sms: entry.smsCommand || null,
                            // Carry sharing snapshot that went to DHIS2
                            sharing: p.sharing || null,
                            // Persist the dataset payload itself as requested
                            payload: p || null,
                        }
                    }).filter(d => d.id)
                })(),
                // Use new top-level elementMappings array if present; fallback to object map for older runs
                elementMappings: Array.isArray(assessmentData?.creationPayload?.elementMappings)
                    ? assessmentData.creationPayload.elementMappings
                    : (assessmentData?.elementMappings || assessmentData?.creationPayload?.localDatasets?.elementMappings || []),
            },
            metadataSource: metadataSource || 'dhis2',
        }
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'details':
                return (
                    <div style={{ padding: '20px 40px', width: '100%' }}>
                        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
                            {i18n.t('Assessment Details')}
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <InputField
                                label={i18n.t('Assessment Name')}
                                name="name"
                                value={assessmentData.name}
                                onChange={({ value }) => handleFieldChange('name', value)}
                                placeholder={i18n.t('Enter assessment name')}
                                required
                            />

                            <SingleSelectField
                                label={i18n.t('Assessment Type')}
                                selected={assessmentData.assessmentType}
                                onChange={({ selected }) => handleFieldChange('assessmentType', selected)}
                            >
                                {assessmentTypes.map(type => (
                                    <SingleSelectOption
                                        key={type.value}
                                        value={type.value}
                                        label={type.label}
                                    />
                                ))}
                            </SingleSelectField>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <TextAreaField
                                label={i18n.t('Description')}
                                name="description"
                                value={assessmentData.description}
                                onChange={({ value }) => handleFieldChange('description', value)}
                                placeholder={i18n.t('Enter assessment description')}
                                rows={4}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <SingleSelectField
                                label={i18n.t('Priority')}
                                selected={assessmentData.priority}
                                onChange={({ selected }) => handleFieldChange('priority', selected)}
                            >
                                {priorities.map(priority => (
                                    <SingleSelectOption
                                        key={priority.value}
                                        value={priority.value}
                                        label={priority.label}
                                    />
                                ))}
                            </SingleSelectField>

                            <DateInputField
                                label={i18n.t('Start Date')}
                                value={assessmentData.startDate}
                                onChange={(value) => handleFieldChange('startDate', value)}
                            />

                            <DateInputField
                                label={i18n.t('End Date')}
                                value={assessmentData.endDate}
                                onChange={(value) => handleFieldChange('endDate', value)}
                            />
                        </div>

                        {/* Additional Assessment Details */}
                        <div style={{ marginTop: '32px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                                {i18n.t('Additional Details')}
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <TextAreaField
                                    label={i18n.t('Objectives')}
                                    name="objectives"
                                    value={assessmentData.objectives}
                                    onChange={({ value }) => handleFieldChange('objectives', value)}
                                    placeholder={i18n.t('Enter assessment objectives')}
                                    rows={3}
                                />

                                <TextAreaField
                                    label={i18n.t('Scope')}
                                    name="scope"
                                    value={assessmentData.scope}
                                    onChange={({ value }) => handleFieldChange('scope', value)}
                                    placeholder={i18n.t('Enter assessment scope')}
                                    rows={3}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <SingleSelectField
                                    label={i18n.t('Methodology')}
                                    selected={assessmentData.methodology}
                                    onChange={({ selected }) => handleFieldChange('methodology', selected)}
                                >
                                    {methodologies.map(method => (
                                        <SingleSelectOption
                                            key={method.value}
                                            value={method.value}
                                            label={method.label}
                                        />
                                    ))}
                                </SingleSelectField>

                                <SingleSelectField
                                    label={i18n.t('Frequency')}
                                    selected={assessmentData.frequency}
                                    onChange={({ selected }) => handleFieldChange('frequency', selected)}
                                >
                                    {frequencies.map(freq => (
                                        <SingleSelectOption
                                            key={freq.value}
                                            value={freq.value}
                                            label={freq.label}
                                        />
                                    ))}
                                </SingleSelectField>

                                <SingleSelectField
                                    label={i18n.t('Reporting Level')}
                                    selected={assessmentData.reportingLevel}
                                    onChange={({ selected }) => handleFieldChange('reportingLevel', selected)}
                                >
                                    <SingleSelectOption value="facility" label={i18n.t('Facility')} />
                                    <SingleSelectOption value="district" label={i18n.t('District')} />
                                    <SingleSelectOption value="region" label={i18n.t('Region')} />
                                    <SingleSelectOption value="national" label={i18n.t('National')} />
                                </SingleSelectField>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <MultiSelectField
                                    label={i18n.t('Data Quality Dimensions')}
                                    selected={assessmentData.dataQualityDimensions}
                                    onChange={({ selected }) => handleFieldChange('dataQualityDimensions', selected)}
                                >
                                    {dataQualityDimensions.map(dimension => (
                                        <MultiSelectOption
                                            key={dimension.value}
                                            value={dimension.value}
                                            label={dimension.label}
                                        />
                                    ))}
                                </MultiSelectField>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                                        {i18n.t('Assessment Settings')}
                                    </h4>
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <Checkbox
                                            label={i18n.t('Enable Notifications')}
                                            checked={assessmentData.notifications}
                                            onChange={({ checked }) => handleFieldChange('notifications', checked)}
                                        />
                                        <Checkbox
                                            label={i18n.t('Enable SMS Reporting')}
                                            checked={assessmentData.smsReportingEnabled || false}
                                            onChange={({ checked }) => handleFieldChange('smsReportingEnabled', checked)}
                                        />
                                        <Checkbox
                                            label={i18n.t('Auto Sync Data')}
                                            checked={assessmentData.autoSync}
                                            onChange={({ checked }) => handleFieldChange('autoSync', checked)}
                                        />
                                        <Checkbox
                                            label={i18n.t('Validation Alerts')}
                                            checked={assessmentData.validationAlerts}
                                            onChange={({ checked }) => handleFieldChange('validationAlerts', checked)}
                                        />
                                        <Checkbox
                                            label={i18n.t('Historical Comparison')}
                                            checked={assessmentData.historicalComparison}
                                            onChange={({ checked }) => handleFieldChange('historicalComparison', checked)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 'connection':
                return (
                    <div style={{ padding: '20px 40px', width: '100%' }}>
                        {!isTabValid('connection') && (
                            <Box marginBottom="16px">
                                <NoticeBox warning title={i18n.t('DHIS2 Connection Required')}>
                                    {getTabValidationMessage('connection')}
                                </NoticeBox>
                            </Box>
                        )}
                        <DHIS2Configuration
                            value={dhis2Config}
                            onConfigured={handleDHIS2ConfigSave}
                            onChange={handleDHIS2ConfigSave}
                            onMetadataSourceChange={handleMetadataSourceChange}
                            isEditing={!!dhis2Config}
                        />
                    </div>
                )

            case 'datasets':
                if (metadataSource === 'dhis2') {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            {!isTabValid('connection') && (
                                <Box marginBottom="16px">
                                    <NoticeBox error title={i18n.t('DHIS2 Connection Required')}>
                                        {getTabValidationMessage('connection')}
                                    </NoticeBox>
                                </Box>
                            )}
                            <AssessmentDataSetSelection
                                dhis2Config={dhis2Config}
                                multiSelect={true}
                                selectedDataSets={selectedDataSets}
                                customDatasets={[]} // TODO: Implement custom datasets for EditAssessmentPage
                                onDataSetsSelected={(datasets) => {
                                    setSelectedDataSets(datasets)
                                    setHasUnsavedChanges(true)
                                    console.log('Selected datasets updated:', datasets)
                                }}
                                mode="datasets"
                            />
                        </div>
                    )
                } else if (metadataSource === 'manual') {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '20px',
                                    fontWeight: '600',
                                    color: '#2c3e50'
                                }}>
                                    {i18n.t('Create Custom Datasets')}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#6c757d', margin: '0 0 24px 0' }}>
                                    {i18n.t('Define the datasets that will organize your data elements for the assessment.')}
                                </p>
                            </div>

                            <div style={{
                                padding: '32px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef',
                                textAlign: 'center'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#6c757d' }}>
                                    {i18n.t('Coming Soon: Interactive dataset creation interface will be available here.')}
                                </h4>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                                    {i18n.t('For now, datasets will be automatically created during the preparation step.')}
                                </p>
                                <div style={{ marginTop: 16 }}>
                                    <Checkbox
                                        label={i18n.t('Enable SMS Reporting for created datasets')}
                                        checked={assessmentData.smsReportingEnabled || false}
                                        onChange={({ checked }) => handleFieldChange('smsReportingEnabled', checked)}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                } else {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            <NoticeBox warning title={i18n.t('Metadata Source Required')}>
                                {i18n.t('Please configure the DHIS2 connection first to select a metadata source.')}
                            </NoticeBox>
                        </div>
                    )
                }

            case 'elements':
                if (metadataSource === 'dhis2') {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            {!isTabValid('datasets') && (
                                <Box marginBottom="16px">
                                    <NoticeBox error title={i18n.t('Dataset Selection Required')}>
                                        {i18n.t('Please select datasets in the previous step first to load data elements for mapping.')}
                                    </NoticeBox>
                                </Box>
                            )}
                            <AssessmentDataSetSelection
                                dhis2Config={dhis2Config}
                                multiSelect={true}
                                selectedDataSets={selectedDataSets}
                                customDatasets={[]} // TODO: Implement custom datasets for EditAssessmentPage
                                onDataSetsSelected={(datasets) => {
                                    setSelectedDataSets(datasets)
                                    setHasUnsavedChanges(true)
                                }}
                                selectedDataElements={selectedDataElements}
                                onDataElementsSelected={(elements) => {
                                    setSelectedDataElements(elements)
                                    setHasUnsavedChanges(true)
                                    console.log('Selected data elements updated:', elements)
                                }}
                                mode="dataelements"
                            />
                        </div>
                    )
                } else if (metadataSource === 'manual') {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '20px',
                                    fontWeight: '600',
                                    color: '#2c3e50'
                                }}>
                                    {i18n.t('Create Data Elements')}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#6c757d', margin: '0 0 24px 0' }}>
                                    {i18n.t('Define the data elements that will be collected in your assessment.')}
                                </p>
                            </div>

                            <div style={{
                                padding: '32px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef',
                                textAlign: 'center'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#6c757d' }}>
                                    {i18n.t('Coming Soon: Interactive data element creation interface will be available here.')}
                                </h4>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                                    {i18n.t('For now, data elements will be automatically created during the preparation step.')}
                                </p>
                            </div>
                        </div>
                    )
                } else {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            <NoticeBox warning title={i18n.t('Metadata Source Required')}>
                                {i18n.t('Please configure the DHIS2 connection first to select a metadata source.')}
                            </NoticeBox>
                        </div>
                    )
                }

            case 'units':
                if (metadataSource === 'dhis2') {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            {!isTabValid('elements') && (
                                <Box marginBottom="16px">
                                    <NoticeBox error title={i18n.t('Data Elements Required')}>
                                        {i18n.t('Please ensure data elements are loaded from the selected datasets first.')}
                                    </NoticeBox>
                                </Box>
                            )}
                            <OrganisationUnitManagement
                                dhis2Config={dhis2Config}
                                dataSets={selectedDataSets}
                                selectedDataElements={selectedDataElements}
                                value={selectedOrgUnits}
                                metadataSource={metadataSource}
                                onChange={(orgUnits) => {
                                    setSelectedOrgUnits(orgUnits)
                                    setHasUnsavedChanges(true)
                                    console.log('Selected org units updated:', orgUnits)
                                }}
                            />
                        </div>
                    )
                } else if (metadataSource === 'manual') {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '20px',
                                    fontWeight: '600',
                                    color: '#2c3e50'
                                }}>
                                    {i18n.t('Create Organization Units')}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#6c757d', margin: '0 0 24px 0' }}>
                                    {i18n.t('Define the organization units (facilities, districts, regions) for your assessment.')}
                                </p>
                            </div>

                            <div style={{
                                padding: '32px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef',
                                textAlign: 'center'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#6c757d' }}>
                                    {i18n.t('Coming Soon: Interactive organization unit creation interface will be available here.')}
                                </h4>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                                    {i18n.t('For now, organization units will be automatically created during the preparation step.')}
                                </p>
                            </div>
                        </div>
                    )
                } else {
                    return (
                        <div style={{ padding: '20px 40px', width: '100%' }}>
                            <NoticeBox warning title={i18n.t('Metadata Source Required')}>
                                {i18n.t('Please configure the DHIS2 connection first to select a metadata source.')}
                            </NoticeBox>
                        </div>
                    )
                }

            case 'mapping':
                return (
                    <div style={{ padding: '20px 40px', width: '100%' }}>
                        {!isTabValid('units') && (
                            <Box marginBottom="16px">
                                <NoticeBox error title={i18n.t('Organisation Units Required')}>
                                    {i18n.t('Please select organisation units in the previous step first.')}
                                </NoticeBox>
                            </Box>
                        )}
                        <OrganizationUnitMapping
                            dhis2Config={dhis2Config}
                            selectedOrgUnits={selectedOrgUnits}
                            value={orgUnitMappings}
                            onChange={setOrgUnitMappings}
                        />
                    </div>
                )

            case 'preparation':
                // Debug logging for frequency
                console.log(`EditAssessmentPage passing frequency: "${assessmentData.frequency}" (type: ${typeof assessmentData.frequency})`)
                console.log(`Generated period: "${generatePeriodFromFrequency(assessmentData.frequency)}"`)

                return (
                    <div style={{ padding: '20px 40px', width: '100%' }}>
                        {!isTabValid('mapping') && (
                            <Box marginBottom="16px">
                                <NoticeBox error title={i18n.t('Organisation Unit Mapping Required')}>
                                    {i18n.t('Please complete the organisation unit mapping in the previous step first.')}
                                </NoticeBox>
                            </Box>
                        )}
                        <PreparationStep
                            metadataSource={metadataSource}
                            dataEngine={dataEngine}
                            assessmentData={assessmentData}
                            localDatasets={selectedDataSets}
                            selectedDataSets={(selectedDataSets || []).map(ds => ds.id || ds)}
                            selectedDataElements={selectedDataElements}
                            selectedOrgUnits={selectedOrgUnits}
                            orgUnitMappings={orgUnitMappings}
                            smsCommands={assessmentData?.sms?.commands || assessmentData?.smsConfig?.commands || []}
                            setSmsCommands={(cmds) => setAssessmentData(prev => ({ ...prev, smsConfig: { ...(prev.smsConfig || {}), commands: cmds } }))}
                            onComplete={(v) => {
                                try { setDatasetPreparationComplete(!!v) }
                                finally { setActiveTab('review') }
                            }}
                            onError={(msg) => setError(msg || i18n.t('Preparation failed'))}
                        />
                    </div>
                )

            case 'editDataElements':
                return (
                    <div style={{ padding: '20px 40px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>📊</span>
                                <h4 style={{ margin: '0', color: '#1976d2' }}>
                                    {i18n.t('Edit Data Elements')}
                                </h4>
                                <Tag positive>
                                    {localSelectedDataElements?.length || 0} elements
                                </Tag>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {editingDataElements ? (
                                    <>
                                        <Button small secondary onClick={handleCancelEditDataElements}>
                                            {i18n.t('Cancel')}
                                        </Button>
                                        <Button small primary onClick={handleSaveDataElements}>
                                            {i18n.t('Save Changes')}
                                        </Button>
                                    </>
                                ) : (
                                    <Button small secondary onClick={handleEditDataElements}>
                                        {i18n.t('Edit Selection')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {editingDataElements && (
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                                <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
                                    <strong>{i18n.t('Edit Mode')}:</strong> {i18n.t('You can remove data elements from the selection. Changes will be applied when you click "Save Changes".')}
                                </p>
                            </div>
                        )}

                        {localSelectedDataElements && localSelectedDataElements.length > 0 ? (
                            <div>
                                <DataTable>
                                    <DataTableHead>
                                        <DataTableRow>
                                            <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Value Type')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Aggregation Type')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Domain Type')}</DataTableColumnHeader>
                                            {editingDataElements && <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>}
                                        </DataTableRow>
                                    </DataTableHead>
                                    <DataTableBody>
                                        {localSelectedDataElements.map((element, index) => (
                                            <DataTableRow key={element.id || index}>
                                                <DataTableCell>
                                                    <div>
                                                        <div style={{ fontWeight: '500' }}>{element.displayName || element.name}</div>
                                                        {element.description && (
                                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                                                {element.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <span style={{ fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
                                                        {element.code || 'N/A'}
                                                    </span>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <Tag neutral small>
                                                        {element.valueType || 'INTEGER'}
                                                    </Tag>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <Tag neutral small>
                                                        {element.aggregationType || 'SUM'}
                                                    </Tag>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <Tag neutral small>
                                                        {element.domainType || 'AGGREGATE'}
                                                    </Tag>
                                                </DataTableCell>
                                                {editingDataElements && (
                                                    <DataTableCell>
                                                        <Button
                                                            small
                                                            destructive
                                                            onClick={() => handleRemoveDataElement(element.id)}
                                                        >
                                                            {i18n.t('Remove')}
                                                        </Button>
                                                    </DataTableCell>
                                                )}
                                            </DataTableRow>
                                        ))}
                                    </DataTableBody>
                                </DataTable>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                <p>{i18n.t('No data elements selected')}</p>
                                <p style={{ fontSize: '14px' }}>{i18n.t('Go to the Data Elements tab to select data elements.')}</p>
                            </div>
                        )}
                    </div>
                )

            case 'editDataSets':
                return (
                    <div style={{ padding: '20px 40px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>📋</span>
                                <h4 style={{ margin: '0', color: '#1976d2' }}>
                                    {i18n.t('Edit Data Sets')}
                                </h4>
                                <Tag positive>
                                    {localSelectedDataSets?.length || 0} datasets
                                </Tag>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {editingDataSets ? (
                                    <>
                                        <Button small secondary onClick={handleCancelEditDataSets}>
                                            {i18n.t('Cancel')}
                                        </Button>
                                        <Button small primary onClick={handleSaveDataSets}>
                                            {i18n.t('Save Changes')}
                                        </Button>
                                    </>
                                ) : (
                                    <Button small secondary onClick={handleEditDataSets}>
                                        {i18n.t('Edit Selection')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {editingDataSets && (
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                                <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
                                    <strong>{i18n.t('Edit Mode')}:</strong> {i18n.t('You can remove data sets from the selection. Changes will be applied when you click "Save Changes".')}
                                </p>
                            </div>
                        )}

                        {localSelectedDataSets && localSelectedDataSets.length > 0 ? (
                            <div>
                                <DataTable>
                                    <DataTableHead>
                                        <DataTableRow>
                                            <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Period Type')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Data Elements')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Organization Units')}</DataTableColumnHeader>
                                            {editingDataSets && <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>}
                                        </DataTableRow>
                                    </DataTableHead>
                                    <DataTableBody>
                                        {localSelectedDataSets.map((dataset, index) => (
                                            <DataTableRow key={dataset.id || index}>
                                                <DataTableCell>
                                                    <div>
                                                        <div style={{ fontWeight: '500' }}>{dataset.displayName || dataset.name}</div>
                                                        {dataset.description && (
                                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                                                {dataset.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <span style={{ fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
                                                        {dataset.code || 'N/A'}
                                                    </span>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <Tag neutral small>
                                                        {dataset.periodType || 'N/A'}
                                                    </Tag>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <Tag positive small>
                                                        {dataset.dataSetElements?.length || 0}
                                                    </Tag>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <Tag positive small>
                                                        {dataset.organisationUnits?.length || 0}
                                                    </Tag>
                                                </DataTableCell>
                                                {editingDataSets && (
                                                    <DataTableCell>
                                                        <Button
                                                            small
                                                            destructive
                                                            onClick={() => handleRemoveDataSet(dataset.id)}
                                                        >
                                                            {i18n.t('Remove')}
                                                        </Button>
                                                    </DataTableCell>
                                                )}
                                            </DataTableRow>
                                        ))}
                                    </DataTableBody>
                                </DataTable>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                <p>{i18n.t('No data sets selected')}</p>
                                <p style={{ fontSize: '14px' }}>{i18n.t('Go to the Select Datasets tab to choose data sets.')}</p>
                            </div>
                        )}
                    </div>
                )

            case 'editOrgUnits':
                return (
                    <div style={{ padding: '20px 40px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>🏢</span>
                                <h4 style={{ margin: '0', color: '#1976d2' }}>
                                    {i18n.t('Edit Organization Unit Mappings')}
                                </h4>
                                <Tag positive>
                                    {localOrgUnitMappings?.length || 0} mappings
                                </Tag>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {editingOrgUnits ? (
                                    <>
                                        <Button small secondary onClick={handleCancelEditOrgUnits}>
                                            {i18n.t('Cancel')}
                                        </Button>
                                        <Button small primary onClick={handleSaveOrgUnits}>
                                            {i18n.t('Save Changes')}
                                        </Button>
                                    </>
                                ) : (
                                    <Button small secondary onClick={handleEditOrgUnits}>
                                        {i18n.t('Edit Mappings')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {editingOrgUnits && (
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                                <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
                                    <strong>{i18n.t('Edit Mode')}:</strong> {i18n.t('You can remove organization unit mappings. Changes will be applied when you click "Save Changes".')}
                                </p>
                            </div>
                        )}

                        {localOrgUnitMappings && localOrgUnitMappings.length > 0 ? (
                            <div>
                                <DataTable>
                                    <DataTableHead>
                                        <DataTableRow>
                                            <DataTableColumnHeader>{i18n.t('Organization Unit')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('UID')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Level')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Mapping Type')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                        </DataTableRow>
                                    </DataTableHead>
                                    <DataTableBody>
                                        {localOrgUnitMappings.map((mapping, index) => {
                                            let orgUnit, orgUnitId, orgUnitName, orgUnitLevel, mappingType

                                            if (mapping.localOrgUnit) {
                                                orgUnit = mapping.localOrgUnit
                                                orgUnitId = orgUnit.id
                                                orgUnitName = orgUnit.displayName || orgUnit.name
                                                orgUnitLevel = orgUnit.level
                                                mappingType = 'Local'
                                            } else if (mapping.targetOrgUnit) {
                                                orgUnit = mapping.targetOrgUnit
                                                orgUnitId = orgUnit.id
                                                orgUnitName = orgUnit.displayName || orgUnit.name
                                                orgUnitLevel = orgUnit.level
                                                mappingType = 'Target'
                                            } else if (mapping.mappedOrgUnit) {
                                                orgUnit = mapping.mappedOrgUnit
                                                orgUnitId = orgUnit.id
                                                orgUnitName = orgUnit.displayName || orgUnit.name
                                                orgUnitLevel = orgUnit.level
                                                mappingType = 'Mapped'
                                            } else if (mapping.id) {
                                                orgUnitId = mapping.id
                                                orgUnitName = mapping.displayName || mapping.name || 'Unknown'
                                                orgUnitLevel = mapping.level
                                                mappingType = 'Direct'
                                            } else {
                                                orgUnitId = 'Unknown'
                                                orgUnitName = 'Unknown Organization Unit'
                                                orgUnitLevel = 'Unknown'
                                                mappingType = 'Unknown'
                                            }

                                            orgUnitLevel = orgUnitLevel || 'N/A'
                                            mappingType = mappingType || 'Unknown'

                                            return (
                                                <DataTableRow key={orgUnitId}>
                                                    <DataTableCell>
                                                        <div style={{ fontWeight: '500' }}>{orgUnitName}</div>
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        <span style={{ fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
                                                            {orgUnitId}
                                                        </span>
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        <Tag neutral small>
                                                            {orgUnitLevel}
                                                        </Tag>
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        <Tag neutral small>
                                                            {mappingType}
                                                        </Tag>
                                                    </DataTableCell>
                                                    <DataTableCell>
                                                        {editingOrgUnits ? (
                                                            <Button
                                                                small
                                                                destructive
                                                                onClick={() => handleRemoveOrgUnit(index)}
                                                            >
                                                                {i18n.t('Remove')}
                                                            </Button>
                                                        ) : (
                                                            <Button small secondary disabled>
                                                                {i18n.t('View')}
                                                            </Button>
                                                        )}
                                                    </DataTableCell>
                                                </DataTableRow>
                                            )
                                        })}
                                    </DataTableBody>
                                </DataTable>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                <p>{i18n.t('No organization unit mappings found')}</p>
                                <p style={{ fontSize: '14px' }}>{i18n.t('Go to the Map Organisation Units tab to create mappings.')}</p>
                            </div>
                        )}
                    </div>
                )

            case 'review':
                return (
                    <div style={{ padding: '20px 40px', width: '100%' }}>
                        <ReviewStep
                            assessmentData={{
                                ...assessmentData,
                                // Add the selected data to assessmentData for ReviewStep
                                datasets: { selected: selectedDataSets },
                                dataElements: { selected: selectedDataElements },
                                orgUnits: { selected: selectedOrgUnits },
                                orgUnitMapping: { mappings: orgUnitMappings },
                                // Preserve existing creationPayload if it exists
                                creationPayload: assessmentData?.creationPayload || null
                            }}
                            setAssessmentData={setAssessmentData}
                            smsConfig={assessmentData?.smsConfig || {}}
                            setSmsConfig={(cfg) => setAssessmentData(prev => ({ ...prev, smsConfig: cfg }))}
                            prereqsOk={true}
                            onBack={() => setActiveTab('preparation')}
                            onDownload={() => {
                                const payload = buildAssessmentPayload()
                                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2))
                                const a = document.createElement('a')
                                a.href = dataStr
                                a.download = `${payload.info.name || 'assessment'}.json`
                                document.body.appendChild(a)
                                a.click()
                                a.remove()
                            }}
                            onPrint={() => {
                                const payload = buildAssessmentPayload()
                                const w = window.open('', '_blank', 'width=900,height=700')
                                if (!w) return
                                w.document.write(`<pre>${JSON.stringify(payload, null, 2)}</pre>`)
                                w.document.close()
                            }}
                            onSave={handleSaveAssessment}
                            saving={saving}
                            buildPayload={buildAssessmentPayload}
                        />
                    </div>
                )


            default:
                return <div>{i18n.t('Tab content not found')}</div>
        }
    }

    // Navigation component (matching CreateAssessmentPage)
    const renderNavigation = (position = 'bottom') => (
        <div style={{
            padding: '16px 24px',
            borderTop: position === 'bottom' ? '1px solid #e8eaed' : 'none',
            borderBottom: position === 'top' ? '1px solid #e8eaed' : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: position === 'top' ? '#f8f9fa' : 'transparent'
        }}>
            <Button
                secondary
                onClick={handlePrevious}
                disabled={activeTab === 'details'}
            >
                {i18n.t('Previous')}
            </Button>

            <div style={{ display: 'flex', gap: '12px' }}>
                {activeTab !== 'preparation' && (
                    <Button
                        primary
                        onClick={handleNext}
                        disabled={!isTabValid(activeTab)}
                    >
                        {i18n.t('Next')}
                    </Button>
                )}

                <Button
                    primary={activeTab === 'preparation'}
                    secondary={activeTab !== 'preparation'}
                    onClick={handleSaveAssessment}
                    loading={saving}
                    disabled={!assessmentData.name || !assessmentData.name.trim()}
                >
                    {saving ? i18n.t('Saving...') : i18n.t('Save Assessment')}
                </Button>
            </div>
        </div>
    )

    // Render loading state
    if (loading) {
        return (
            <Box padding="24px">
                <Card>
                    <Box padding="24px" display="flex" justifyContent="center" alignItems="center">
                        <CircularLoader />
                        <Box marginLeft="12px">
                            {i18n.t('Loading assessment...')}
                        </Box>
                    </Box>
                </Card>
            </Box>
        )
    }

    // Render error state
    if (error) {
        return (
            <Box padding="24px">
                <Card>
                    <Box padding="24px">
                        <NoticeBox error title={i18n.t('Error')}>
                            {error}
                        </NoticeBox>
                        <Box marginTop="16px">
                            <Button onClick={() => navigate('/administration/assessments')}>
                                {i18n.t('Back to Assessments')}
                            </Button>
                        </Box>
                    </Box>
                </Card>
            </Box>
        )
    }

    return (
        <Box padding="24px">
            <Card style={{ minHeight: '600px' }}>
                {/* Header */}
                <div style={{
                    padding: '24px 24px 0 24px',
                    borderBottom: '1px solid #e8eaed',
                    marginBottom: '0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
                            {i18n.t('Edit Assessment')}
                            {hasUnsavedChanges && (
                                <span style={{
                                    marginLeft: '12px',
                                    fontSize: '12px',
                                    color: '#ff9800',
                                    fontWeight: '500',
                                    backgroundColor: '#fff3e0',
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                }}>
                                    {i18n.t('Unsaved Changes')}
                                </span>
                            )}
                        </h1>
                        <Button
                            secondary
                            onClick={() => navigate('/manage-assessments')}
                        >
                            {i18n.t('Cancel')}
                        </Button>
                    </div>

                    {/* Success/Error Messages */}
                    {successMessage && (
                        <div style={{ marginBottom: '16px' }}>
                            <NoticeBox valid title={i18n.t('Success')}>
                                {successMessage}
                            </NoticeBox>
                        </div>
                    )}

                    {error && (
                        <div style={{ marginBottom: '16px' }}>
                            <NoticeBox error title={i18n.t('Error')}>
                                {error}
                            </NoticeBox>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <TabBar>
                        {tabs.map(tab => (
                            <Tab
                                key={tab.id}
                                selected={activeTab === tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                disabled={!canProceedToTab(tab.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {tab.icon && <span>{tab.icon}</span>}
                                    {tab.label}
                                    {isTabValid(tab.id) && (
                                        <span style={{ color: '#4caf50', fontSize: '16px' }}>✓</span>
                                    )}
                                    {/* Show count badges for edit tabs */}
                                    {tab.id === 'editDataElements' && localSelectedDataElements?.length > 0 && (
                                        <Tag positive small>
                                            {localSelectedDataElements.length}
                                        </Tag>
                                    )}
                                    {tab.id === 'editDataSets' && localSelectedDataSets?.length > 0 && (
                                        <Tag positive small>
                                            {localSelectedDataSets.length}
                                        </Tag>
                                    )}
                                    {tab.id === 'editOrgUnits' && localOrgUnitMappings?.length > 0 && (
                                        <Tag positive small>
                                            {localOrgUnitMappings.length}
                                        </Tag>
                                    )}
                                </div>
                            </Tab>
                        ))}
                    </TabBar>
                </div>

                {/* Top Navigation */}
                {renderNavigation('top')}

                {/* Tab Content */}
                <div style={{ minHeight: '400px' }}>
                    {renderTabContent()}
                </div>

                {/* Footer Navigation */}
                {renderNavigation('bottom')}
            </Card>
        </Box>
    )
}