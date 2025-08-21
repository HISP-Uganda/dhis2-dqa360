import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
    CalendarInput,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Checkbox,
    Tab,
    TabBar,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    Box,
    Pagination
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

// Utility function to generate 6-character alphanumeric codes for manual metadata
const generateUID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

import { DHIS2Configuration } from '../Metadata/DHIS2Configuration'
import { OrganisationUnitManagement } from '../Metadata/OrganisationUnitManagement'
import { OrganizationUnitMapping } from '../Metadata/OrganizationUnitMapping'
import { DatasetPreparation } from '../Metadata/DatasetPreparation'
import ManualMetadataCreation from '../Metadata/ManualMetadataCreation'
import { useTabBasedDataStore } from '../../services/tabBasedDataStoreService'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'
import { AssessmentDataSetSelection } from '../../components/AssessmentDataSetSelection'

import { createAssessmentTools } from '../../utils/assessmentToolsCreator'
import { useDataEngine } from '@dhis2/app-runtime'
import { useUserAuthorities } from '../../hooks/useUserAuthorities'

export const CreateAssessmentPage = () => {
    const navigate = useNavigate()
    const dataEngine = useDataEngine()
    const { userInfo } = useUserAuthorities()
    const [activeTab, setActiveTab] = useState('details')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [dateErrors, setDateErrors] = useState({
        startDate: '',
        endDate: ''
    })

    // DataStore services
    const { saveAssessment: saveLegacyAssessment } = useTabBasedDataStore()
    const { saveAssessment } = useAssessmentDataStore()

    // Assessment data state
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
        objectives: '',
        scope: '',
        methodology: 'automated',
        frequency: 'monthly',
        reportingLevel: 'facility',
        dataQualityDimensions: ['completeness', 'timeliness'],
        stakeholders: [],
        riskFactors: [],
        successCriteria: '',
        predefinedSuccessCriteria: [],
        confidentialityLevel: 'internal',
        dataRetentionPeriod: '5years',
        publicAccess: false,
        tags: [],
        customFields: {}
    })

    // Other state
    const [metadataSource, setMetadataSource] = useState('manual') // 'dhis2' or 'manual' - default to manual (local instance)
    const [dhis2Config, setDhis2Config] = useState(null)

    // Additional metadata collections
    const [categoryOptions, setCategoryOptions] = useState([])
    const [categories, setCategories] = useState([])
    const [categoryCombos, setCategoryCombos] = useState([])
    const [attributes, setAttributes] = useState([])
    const [optionSets, setOptionSets] = useState([])
    const [selectedDataSet, setSelectedDataSet] = useState(null) // Keep for backward compatibility
    const [selectedDataSets, setSelectedDataSets] = useState([]) // New multi-select state
    const [selectedDataElements, setSelectedDataElements] = useState([])
    const [selectedOrgUnits, setSelectedOrgUnits] = useState([])
    const [orgUnitMappings, setOrgUnitMappings] = useState([])
    const [datasetPreparationComplete, setDatasetPreparationComplete] = useState(false)

    // Local DHIS2 metadata
    const [localDatasets, setLocalDatasets] = useState([])
    const [localDataElements, setLocalDataElements] = useState([])
    const [loadingLocalMetadata, setLoadingLocalMetadata] = useState(false)

    // External DHIS2 metadata
    const [externalDatasets, setExternalDatasets] = useState([])
    const [loadingExternalMetadata, setLoadingExternalMetadata] = useState(false)

    // Additional metadata collections
    const [baselineAssessments, setBaselineAssessments] = useState([])
    const [loadingBaselines, setLoadingBaselines] = useState(false)
    const [visitedTabs, setVisitedTabs] = useState(new Set(['details'])) // Track which tabs have been visited
    const [autoPopulateNotification, setAutoPopulateNotification] = useState(null) // Notification for auto-population

    // Pagination states
    const [datasetsCurrentPage, setDatasetsCurrentPage] = useState(1)
    const [dataElementsCurrentPage, setDataElementsCurrentPage] = useState(1)
    const [orgUnitsCurrentPage, setOrgUnitsCurrentPage] = useState(1)
    const itemsPerPage = 20 // DHIS2 UI supports: 5, 10, 20, 50, 100

    // Data elements filtering states
    const [dataElementsSearchTerm, setDataElementsSearchTerm] = useState('')
    const [dataElementsSourceFilter, setDataElementsSourceFilter] = useState('all') // 'all', 'dhis2', 'custom'

    // Modal states for manual metadata creation
    const [datasetModalOpen, setDatasetModalOpen] = useState(false)
    const [dataElementModalOpen, setDataElementModalOpen] = useState(false)
    const [orgUnitModalOpen, setOrgUnitModalOpen] = useState(false)
    const [categoryModalOpen, setCategoryModalOpen] = useState(false)
    const [categoryOptionModalOpen, setCategoryOptionModalOpen] = useState(false)
    const [categoryComboModalOpen, setCategoryComboModalOpen] = useState(false)
    const [editingDataset, setEditingDataset] = useState(null)
    const [editingDataElement, setEditingDataElement] = useState(null)
    const [editingOrgUnit, setEditingOrgUnit] = useState(null)
    const [editingCategory, setEditingCategory] = useState(null)
    const [editingCategoryOption, setEditingCategoryOption] = useState(null)
    const [editingCategoryCombo, setEditingCategoryCombo] = useState(null)

    // Available custom metadata (created by user, available for selection)
    const [availableCustomDatasets, setAvailableCustomDatasets] = useState([])
    const [availableCustomDataElements, setAvailableCustomDataElements] = useState([])
    const [availableCustomCategories, setAvailableCustomCategories] = useState([])
    const [availableCustomCategoryOptions, setAvailableCustomCategoryOptions] = useState([])
    const [availableCustomCategoryCombos, setAvailableCustomCategoryCombos] = useState([])

    // Dataset form state
    const [datasetForm, setDatasetForm] = useState({
        name: '',
        code: '',
        description: '',
        periodType: ''
    })

    // Data element modal state
    const [dataElementModalTab, setDataElementModalTab] = useState('element')
    const [dataElementForm, setDataElementForm] = useState({
        name: '',
        code: '',
        description: '',
        valueType: 'TEXT',
        categoryCombo: 'default',
        aggregationType: 'SUM',
        domainType: 'AGGREGATE',
        zeroIsSignificant: false
    })

    // Category management states
    const [categoryOptionForm, setCategoryOptionForm] = useState({
        name: '',
        code: '',
        description: ''
    })
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        code: '',
        description: '',
        categoryOptions: []
    })
    const [categoryComboForm, setCategoryComboForm] = useState({
        name: '',
        code: '',
        description: '',
        categories: []
    })

    // Configuration data
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

    const reportingLevels = [
        { value: 'facility', label: i18n.t('Facility Level') },
        { value: 'district', label: i18n.t('District Level') },
        { value: 'regional', label: i18n.t('Regional Level') },
        { value: 'national', label: i18n.t('National Level') }
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
        { value: '10years', label: i18n.t('10 Years') },
        { value: 'indefinite', label: i18n.t('Indefinite') }
    ]

    const valueTypes = [
        { value: 'TEXT', label: i18n.t('Text') },
        { value: 'LONG_TEXT', label: i18n.t('Long Text') },
        { value: 'NUMBER', label: i18n.t('Number') },
        { value: 'INTEGER', label: i18n.t('Integer') },
        { value: 'INTEGER_POSITIVE', label: i18n.t('Positive Integer') },
        { value: 'INTEGER_NEGATIVE', label: i18n.t('Negative Integer') },
        { value: 'INTEGER_ZERO_OR_POSITIVE', label: i18n.t('Zero or Positive Integer') },
        { value: 'PERCENTAGE', label: i18n.t('Percentage') },
        { value: 'UNIT_INTERVAL', label: i18n.t('Unit Interval') },
        { value: 'BOOLEAN', label: i18n.t('Yes/No') },
        { value: 'TRUE_ONLY', label: i18n.t('Yes Only') },
        { value: 'DATE', label: i18n.t('Date') },
        { value: 'DATETIME', label: i18n.t('Date & Time') },
        { value: 'TIME', label: i18n.t('Time') },
        { value: 'EMAIL', label: i18n.t('Email') },
        { value: 'PHONE_NUMBER', label: i18n.t('Phone Number') },
        { value: 'URL', label: i18n.t('URL') }
    ]

    const aggregationTypes = [
        { value: 'SUM', label: i18n.t('Sum') },
        { value: 'AVERAGE', label: i18n.t('Average') },
        { value: 'AVERAGE_SUM_ORG_UNIT', label: i18n.t('Average (sum in org unit hierarchy)') },
        { value: 'COUNT', label: i18n.t('Count') },
        { value: 'STDDEV', label: i18n.t('Standard deviation') },
        { value: 'VARIANCE', label: i18n.t('Variance') },
        { value: 'MIN', label: i18n.t('Min') },
        { value: 'MAX', label: i18n.t('Max') },
        { value: 'NONE', label: i18n.t('None') },
        { value: 'CUSTOM', label: i18n.t('Custom') },
        { value: 'DEFAULT', label: i18n.t('Default') }
    ]

    // Date validation functions
    const validateDates = (startDate, endDate) => {
        const errors = { startDate: '', endDate: '' }
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Set to start of day for comparison

        if (startDate) {
            const start = new Date(startDate)
            if (start < today) {
                errors.startDate = i18n.t('Start date cannot be in the past')
            }
        }

        if (endDate) {
            const end = new Date(endDate)
            if (end < today) {
                errors.endDate = i18n.t('End date cannot be in the past')
            }
        }

        if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            if (end < start) {
                errors.endDate = i18n.t('End date cannot be earlier than start date')
            }
        }

        return errors
    }

    const handleDateChange = (field, date) => {
        const newAssessmentData = { ...assessmentData, [field]: date }
        setAssessmentData(newAssessmentData)

        // Validate dates
        const errors = validateDates(
            field === 'startDate' ? date : assessmentData.startDate,
            field === 'endDate' ? date : assessmentData.endDate
        )
        setDateErrors(errors)
    }

    // Effect to validate dates when they change
    useEffect(() => {
        if (assessmentData.startDate || assessmentData.endDate) {
            const errors = validateDates(assessmentData.startDate, assessmentData.endDate)
            setDateErrors(errors)
        }
    }, [assessmentData.startDate, assessmentData.endDate])

    // Helper functions for category management
    const handleCreateCategoryOption = () => {
        if (!categoryOptionForm.name || !categoryOptionForm.code) {
            return
        }

        const newCategoryOption = {
            id: generateUID(),
            ...categoryOptionForm,
            createdAt: new Date().toISOString(),
            isCustom: true
        }

        setAvailableCustomCategoryOptions([...availableCustomCategoryOptions, newCategoryOption])
        setCategoryOptionForm({ name: '', code: '', description: '' })
        setCategoryOptionModalOpen(false)
    }

    const handleCreateCategory = () => {
        if (!categoryForm.name || !categoryForm.code || categoryForm.categoryOptions.length === 0) {
            return
        }

        const newCategory = {
            id: generateUID(),
            ...categoryForm,
            createdAt: new Date().toISOString(),
            isCustom: true
        }

        setAvailableCustomCategories([...availableCustomCategories, newCategory])
        setCategoryForm({ name: '', code: '', description: '', categoryOptions: [] })
        setCategoryModalOpen(false)
    }

    const handleCreateCategoryCombo = () => {
        if (!categoryComboForm.name || !categoryComboForm.code || categoryComboForm.categories.length === 0) {
            return
        }

        const newCategoryCombo = {
            id: generateUID(),
            ...categoryComboForm,
            createdAt: new Date().toISOString(),
            isCustom: true
        }

        setAvailableCustomCategoryCombos([...availableCustomCategoryCombos, newCategoryCombo])
        setCategoryComboForm({ name: '', code: '', description: '', categories: [] })
        setCategoryComboModalOpen(false)
    }

    // Load category metadata
    const loadCategoryMetadata = async () => {
        try {
            console.log('🔄 Loading category metadata...')

            // Check if dataEngine is available
            if (!dataEngine) {
                console.error('❌ DataEngine not available')
                return
            }

            const query = {
                categoryOptions: {
                    resource: 'categoryOptions',
                    params: {
                        fields: 'id,name,code,description',
                        paging: true,
                        pageSize: 100,
                        page: 1
                    }
                },
                categories: {
                    resource: 'categories',
                    params: {
                        fields: 'id,name,code,description,categoryOptions[id,name,code]',
                        paging: true,
                        pageSize: 100,
                        page: 1
                    }
                },
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code,description,categories[id,name,code]',
                        paging: true,
                        pageSize: 100,
                        page: 1
                    }
                }
            }

            const result = await dataEngine.query(query)

            // Set the loaded category metadata
            setCategoryOptions(result.categoryOptions?.categoryOptions || [])
            setCategories(result.categories?.categories || [])
            setCategoryCombos(result.categoryCombos?.categoryCombos || [])

            console.log('✅ Category metadata loaded:', {
                categoryOptions: result.categoryOptions?.categoryOptions?.length || 0,
                categories: result.categories?.categories?.length || 0,
                categoryCombos: result.categoryCombos?.categoryCombos?.length || 0
            })

        } catch (error) {
            console.error('❌ Error loading category metadata:', error)
        }
    }

    // Load local metadata
    const loadLocalMetadata = async () => {
        try {
            setLoadingLocalMetadata(true)
            console.log('🔄 Loading local metadata...')

            // Check if dataEngine is available
            if (!dataEngine) {
                console.error('❌ DataEngine not available')
                setLoadingLocalMetadata(false)
                return
            }

            // Check if we already have local metadata loaded
            if (localDatasets.length > 0) {
                console.log('ℹ️ Local metadata already loaded, skipping...')
                setLoadingLocalMetadata(false)
                return
            }

            // Load datasets with minimal fields first for faster loading
            const datasetsQuery = {
                dataSets: {
                    resource: 'dataSets',
                    params: {
                        fields: 'id,name,code,description,periodType,organisationUnits[id]',
                        paging: true,
                        pageSize: 50,
                        page: 1
                    }
                }
            }

            const datasetsResult = await dataEngine.query(datasetsQuery)
            const basicDatasets = datasetsResult.dataSets.dataSets || []

            // Load detailed information for each dataset in parallel (but only for first 20 to avoid slowdown)
            const detailedDatasets = await Promise.all(
                basicDatasets.slice(0, 20).map(async (dataset) => {
                    try {
                        const detailQuery = {
                            dataSet: {
                                resource: `dataSets/${dataset.id}`,
                                params: {
                                    fields: 'id,name,code,description,periodType,dataSetElements[dataElement[id,name,code,valueType]],organisationUnits[id,name,level,path]'
                                }
                            }
                        }
                        const detailResult = await dataEngine.query(detailQuery)
                        return detailResult.dataSet
                    } catch (error) {
                        console.warn(`Failed to load details for dataset ${dataset.id}:`, error)
                        return { ...dataset, dataSetElements: [], organisationUnits: dataset.organisationUnits || [] }
                    }
                })
            )

            // Add remaining datasets without detailed info (preserve minimal orgUnits for counts)
            const remainingDatasets = basicDatasets.slice(20).map(ds => ({
                ...ds,
                dataSetElements: [],
                organisationUnits: ds.organisationUnits || []
            }))

            const allDatasets = [...detailedDatasets, ...remainingDatasets]
            setLocalDatasets(allDatasets)
            console.log(`📊 Loaded ${allDatasets.length} local datasets (${detailedDatasets.length} with details)`)

            // Skip loading all data elements separately - we get them from datasets
            setLocalDataElements([])

            console.log('✅ Local metadata loaded:', {
                datasets: allDatasets.length,
                dataElements: 0
            })

            // Debug: Log first few datasets
            if (allDatasets.length > 0) {
                console.log('📊 Sample datasets:', allDatasets.slice(0, 3).map(ds => ({
                    id: ds.id,
                    name: ds.name,
                    dataElements: ds.dataSetElements?.length || 0,
                    orgUnits: ds.organisationUnits?.length || 0
                })))
            } else {
                console.log('⚠️ No datasets found in local instance')
            }

            // Restore saved selections if available
            if (window.dqa360_pendingRestore) {
                const pendingState = window.dqa360_pendingRestore
                console.log('🔄 Restoring saved selections after metadata load...')

                // Restore dataset selections
                if (pendingState.selectedDataSets && pendingState.selectedDataSets.length > 0) {
                    const validDatasets = pendingState.selectedDataSets.filter(savedDs =>
                        allDatasets.some(ds => ds.id === savedDs.id)
                    )
                    if (validDatasets.length > 0) {
                        setSelectedDataSets(validDatasets.map(ds => ds.id))
                        console.log(`✅ Restored ${validDatasets.length} dataset selections`)
                    }
                }

                // Restore data element selections
                if (pendingState.selectedDataElements && pendingState.selectedDataElements.length > 0) {
                    const validDataElements = pendingState.selectedDataElements.filter(savedDe => {
                        // Check if it's a DHIS2 data element
                        const foundInDatasets = allDatasets.some(ds =>
                            ds.dataSetElements?.some(dse => dse.dataElement.id === savedDe.id)
                        )
                        // Or if it's a custom data element (we'll restore custom ones later)
                        return foundInDatasets || savedDe.source === 'custom'
                    })

                    if (validDataElements.length > 0) {
                        // For now, just restore DHIS2 elements, custom ones will be restored when custom metadata loads
                        const dhis2Elements = validDataElements.filter(de => de.source !== 'custom')
                        if (dhis2Elements.length > 0) {
                            // Find full data element objects
                            const fullDataElements = []
                            dhis2Elements.forEach(savedDe => {
                                allDatasets.forEach(ds => {
                                    if (ds.dataSetElements) {
                                        const found = ds.dataSetElements.find(dse => dse.dataElement.id === savedDe.id)
                                        if (found && !fullDataElements.some(existing => existing.id === found.dataElement.id)) {
                                            fullDataElements.push(found.dataElement)
                                        }
                                    }
                                })
                            })
                            setSelectedDataElements(fullDataElements)
                            console.log(`✅ Restored ${fullDataElements.length} DHIS2 data element selections`)
                        }
                    }
                }

                // Restore org unit selections
                if (pendingState.selectedOrgUnits && pendingState.selectedOrgUnits.length > 0) {
                    const validOrgUnits = pendingState.selectedOrgUnits.filter(savedOu =>
                        allDatasets.some(ds =>
                            ds.organisationUnits?.some(ou => ou.id === savedOu.id)
                        )
                    )
                    if (validOrgUnits.length > 0) {
                        // Find full org unit objects
                        const fullOrgUnits = []
                        validOrgUnits.forEach(savedOu => {
                            allDatasets.forEach(ds => {
                                if (ds.organisationUnits) {
                                    const found = ds.organisationUnits.find(ou => ou.id === savedOu.id)
                                    if (found && !fullOrgUnits.some(existing => existing.id === found.id)) {
                                        fullOrgUnits.push(found)
                                    }
                                }
                            })
                        })
                        setSelectedOrgUnits(fullOrgUnits)
                        console.log(`✅ Restored ${fullOrgUnits.length} org unit selections`)
                    }
                }

                // Clear pending restore
                delete window.dqa360_pendingRestore
            }

        } catch (error) {
            console.error('❌ Error loading local metadata:', error)
            // Set empty datasets on error to prevent infinite loading
            setLocalDatasets([])
            setLocalDataElements([])
        } finally {
            setLoadingLocalMetadata(false)
        }
    }

    // Handle dataset selection and auto-populate data elements and org units
    const handleDatasetSelection = (dataset, isSelected) => {
        if (isSelected) {
            // Add dataset to selection
            setSelectedDataSets([...selectedDataSets, dataset.id])

            // Auto-populate data elements from the dataset
            if (dataset.dataSetElements && dataset.dataSetElements.length > 0) {
                const dataElementsFromDataset = dataset.dataSetElements.map(dse => dse.dataElement)
                const newDataElements = dataElementsFromDataset.filter(de =>
                    !selectedDataElements.some(existing => existing.id === de.id)
                )

                if (newDataElements.length > 0) {
                    setSelectedDataElements([...selectedDataElements, ...newDataElements])
                    console.log(`✅ Auto-selected ${newDataElements.length} data elements from dataset: ${dataset.name}`)
                }
            }

            // Note: Organization units are NOT auto-selected - users must explicitly select them in the Organization Units step

            // Show notification about auto-population (data elements only)
            const dataElementsCount = dataset.dataSetElements?.length || 0
            const orgUnitsCount = dataset.organisationUnits?.length || 0

            if (dataElementsCount > 0) {
                setAutoPopulateNotification({
                    type: 'success',
                    message: i18n.t('Auto-populated {{count}} data elements from dataset "{{datasetName}}". Please select organization units in the next step.', {
                        count: dataElementsCount,
                        datasetName: dataset.name
                    })
                })

                // Clear notification after 5 seconds
                setTimeout(() => setAutoPopulateNotification(null), 5000)
            }

            console.log(`📊 Dataset selected: ${dataset.name}`, {
                dataElements: dataElementsCount,
                orgUnits: orgUnitsCount
            })
        } else {
            // Remove dataset from selection
            setSelectedDataSets(selectedDataSets.filter(id => id !== dataset.id))

            // Remove data elements that belong only to this dataset
            if (dataset.dataSetElements && dataset.dataSetElements.length > 0) {
                const dataElementIdsFromDataset = dataset.dataSetElements.map(dse => dse.dataElement.id)

                // Check which data elements are used by other selected datasets
                const otherSelectedDatasets = [...localDatasets, ...availableCustomDatasets]
                    .filter(ds => ds.id !== dataset.id && selectedDataSets.includes(ds.id))

                const dataElementsUsedByOthers = new Set()
                otherSelectedDatasets.forEach(ds => {
                    if (ds.dataSetElements) {
                        ds.dataSetElements.forEach(dse => {
                            dataElementsUsedByOthers.add(dse.dataElement.id)
                        })
                    }
                })

                // Remove only data elements that are not used by other selected datasets
                const dataElementsToRemove = dataElementIdsFromDataset.filter(id =>
                    !dataElementsUsedByOthers.has(id)
                )

                if (dataElementsToRemove.length > 0) {
                    setSelectedDataElements(selectedDataElements.filter(de =>
                        !dataElementsToRemove.includes(de.id)
                    ))
                    console.log(`🗑️ Removed ${dataElementsToRemove.length} data elements from dataset: ${dataset.name}`)
                }
            }

            // Remove organization units that belong only to this dataset
            if (dataset.organisationUnits && dataset.organisationUnits.length > 0) {
                const orgUnitIdsFromDataset = dataset.organisationUnits.map(ou => ou.id)

                // Check which org units are used by other selected datasets
                const otherSelectedDatasets = [...localDatasets, ...availableCustomDatasets]
                    .filter(ds => ds.id !== dataset.id && selectedDataSets.includes(ds.id))

                const orgUnitsUsedByOthers = new Set()
                otherSelectedDatasets.forEach(ds => {
                    if (ds.organisationUnits) {
                        ds.organisationUnits.forEach(ou => {
                            orgUnitsUsedByOthers.add(ou.id)
                        })
                    }
                })

                // Remove only org units that are not used by other selected datasets
                const orgUnitsToRemove = orgUnitIdsFromDataset.filter(id =>
                    !orgUnitsUsedByOthers.has(id)
                )

                if (orgUnitsToRemove.length > 0) {
                    setSelectedOrgUnits(selectedOrgUnits.filter(ou =>
                        !orgUnitsToRemove.includes(ou.id)
                    ))
                    console.log(`🗑️ Removed ${orgUnitsToRemove.length} organization units from dataset: ${dataset.name}`)
                }
            }

            console.log(`📊 Dataset deselected: ${dataset.name}`)
        }
    }

    // Load existing manual metadata from datastore
    const loadExistingManualMetadata = async () => {
        try {
            console.log('🔄 Loading existing manual metadata...')

            // Add timeout to prevent hanging (reduced to 5 seconds)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Manual metadata loading timeout')), 5000)
            )

            const loadPromise = (async () => {
                const { loadAllManualMetadata } = await import('../../utils/manualMetadataCreator')
                return await loadAllManualMetadata(dataEngine)
            })()

            const metadata = await Promise.race([loadPromise, timeoutPromise])

            // Update available metadata collections
            setAvailableCustomDatasets(metadata.datasets || [])
            setAvailableCustomDataElements(metadata.dataElements || [])
            setAvailableCustomCategories(metadata.categories || [])
            setAvailableCustomCategoryOptions(metadata.categoryOptions || [])
            setAvailableCustomCategoryCombos(metadata.categoryCombos || [])

            console.log('✅ Manual metadata loaded:', {
                datasets: metadata.datasets?.length || 0,
                dataElements: metadata.dataElements?.length || 0,
                categories: metadata.categories?.length || 0,
                categoryOptions: metadata.categoryOptions?.length || 0,
                categoryCombos: metadata.categoryCombos?.length || 0
            })
        } catch (error) {
            if (error.message?.includes('timeout')) {
                console.log('⏱️ Manual metadata loading timed out, continuing with empty collections')
            } else {
                console.error('❌ Error loading manual metadata:', error)
            }

            // Initialize empty arrays if loading fails
            setAvailableCustomDatasets([])
            setAvailableCustomDataElements([])
            setAvailableCustomCategories([])
            setAvailableCustomCategoryOptions([])
            setAvailableCustomCategoryCombos([])
        }
    }

    // Load existing metadata on component mount
    useEffect(() => {
        // Initialize metadata collections
        setCategoryOptions([])
        setCategories([])
        setCategoryCombos([])
        setAttributes([])
        setOptionSets([])
        setSelectedDataSets([])
        setSelectedDataElements([])
        setSelectedOrgUnits([])

        // Load metadata based on source (but don't duplicate loading)
        if (metadataSource === 'manual') {
            // loadLocalMetadata() is called in the other useEffect
            loadExistingManualMetadata()
        }
    }, [metadataSource])

    // Debug selected data elements changes (reduced logging)
    useEffect(() => {
        if (selectedDataElements.length > 0) {
            console.log(`🔍 Selected ${selectedDataElements.length} data elements`)
        }
    }, [selectedDataElements])

    // Filter selected data elements when datasets change (for manual metadata)
    useEffect(() => {
        if (metadataSource === 'manual' && selectedDataSets.length > 0) {
            console.log('🔄 Filtering selected data elements based on selected datasets...')

            // Get data elements from currently selected datasets
            const validDataElementIds = new Set()
            selectedDataSets.forEach(datasetId => {
                const dataset = localDatasets.find(ds => ds.id === datasetId)
                if (dataset && dataset.dataSetElements) {
                    dataset.dataSetElements.forEach(dse => {
                        validDataElementIds.add(dse.dataElement.id)
                    })
                }
            })

            // Add custom data elements (they're always valid)
            availableCustomDataElements.forEach(de => {
                validDataElementIds.add(de.id)
            })

            // Filter selected data elements to only include those from selected datasets or custom
            const filteredSelectedDataElements = selectedDataElements.filter(de =>
                validDataElementIds.has(de.id)
            )

            // Update selection if it changed
            if (filteredSelectedDataElements.length !== selectedDataElements.length) {
                console.log(`🔄 Filtered selected data elements: ${selectedDataElements.length} → ${filteredSelectedDataElements.length}`)
                setSelectedDataElements(filteredSelectedDataElements)
            }
        }
    }, [selectedDataSets, localDatasets, availableCustomDataElements, metadataSource])

    // Auto-populate data elements and organization units from external datasets
    useEffect(() => {
        if (metadataSource === 'dhis2' && externalDatasets.length > 0) {
            console.log('🔄 Auto-populating from external datasets...', externalDatasets)

            // Auto-populate data elements
            const allDataElementsFromExternalDatasets = []
            externalDatasets.forEach(dataset => {
                if (dataset.dataSetElements && dataset.dataSetElements.length > 0) {
                    const dataElementsFromDataset = dataset.dataSetElements.map(dse => dse.dataElement)
                    allDataElementsFromExternalDatasets.push(...dataElementsFromDataset)
                }
            })

            // Remove duplicates and filter out already selected ones
            const uniqueDataElements = allDataElementsFromExternalDatasets.filter((de, index, self) =>
                index === self.findIndex(d => d.id === de.id) &&
                !selectedDataElements.some(existing => existing.id === de.id)
            )

            if (uniqueDataElements.length > 0) {
                setSelectedDataElements([...selectedDataElements, ...uniqueDataElements])
                console.log(`✅ Auto-selected ${uniqueDataElements.length} data elements from external datasets`)

                // Show notification
                setAutoPopulateNotification({
                    type: 'success',
                    message: i18n.t('Auto-populated {{count}} data elements from external DHIS2 datasets', {
                        count: uniqueDataElements.length
                    })
                })

                // Clear notification after 5 seconds
                setTimeout(() => setAutoPopulateNotification(null), 5000)
            }
        }
    }, [externalDatasets, metadataSource])

    // Persist state to localStorage for maintaining selections across navigation
    useEffect(() => {
        const stateToSave = {
            assessmentData,
            metadataSource,
            selectedDataSets: (() => {
                // Persist as array of objects { id, name } for reliable restore
                const allDatasets = [...localDatasets, ...availableCustomDatasets]
                return (selectedDataSets || []).map(id => {
                    const ds = allDatasets.find(d => d.id === id) || {}
                    return { id, name: ds.name || ds.displayName || '' }
                })
            })(),
            selectedDataElements: selectedDataElements.map(de => ({ id: de.id, name: de.name, source: de.source })),
            selectedOrgUnits: selectedOrgUnits.map(ou => ({ id: ou.id, name: ou.name })),
            dhis2Config,
            activeTab,
            visitedTabs: Array.from(visitedTabs)
        }

        localStorage.setItem('dqa360_create_assessment_state', JSON.stringify(stateToSave))
        // Reduced logging to prevent spam
        if (selectedDataSets.length > 0 || selectedDataElements.length > 0 || selectedOrgUnits.length > 0) {
            console.log(`💾 State saved: ${selectedDataSets.length} datasets, ${selectedDataElements.length} elements, ${selectedOrgUnits.length} org units`)
        }
    }, [assessmentData, metadataSource, selectedDataSets, selectedDataElements, selectedOrgUnits, dhis2Config, activeTab, visitedTabs, localDatasets, availableCustomDatasets])

    // Load baseline assessments when assessment type changes to followup
    useEffect(() => {
        const loadBaselineAssessments = async () => {
            if (assessmentData.assessmentType === 'followup') {
                setLoadingBaselines(true)
                try {
                    // This would typically load from your assessment service
                    // For now, we'll use a placeholder
                    const mockBaselines = [
                        { id: 'baseline1', name: 'Health Facility Assessment 2023', period: '2023-Q1' },
                        { id: 'baseline2', name: 'District Health Assessment', period: '2023-Q2' }
                    ]
                    setBaselineAssessments(mockBaselines)
                } catch (error) {
                    console.error('Error loading baseline assessments:', error)
                    setBaselineAssessments([])
                } finally {
                    setLoadingBaselines(false)
                }
            } else {
                setBaselineAssessments([])
                setAssessmentData(prev => ({ ...prev, baselineAssessmentId: '' }))
            }
        }

        loadBaselineAssessments()
    }, [assessmentData.assessmentType])

    // Load state from localStorage on component mount
    useEffect(() => {
        const savedState = localStorage.getItem('dqa360_create_assessment_state')
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState)
                console.log('📂 Loading saved state from localStorage:', parsedState)

                // Only restore if we're starting fresh (no existing selections)
                if (selectedDataSets.length === 0 && selectedDataElements.length === 0) {
                    setAssessmentData(prev => ({ ...prev, ...parsedState.assessmentData }))
                    setMetadataSource(parsedState.metadataSource)
                    setDhis2Config(parsedState.dhis2Config)
                    setActiveTab(parsedState.activeTab || 'details')
                    setVisitedTabs(new Set(parsedState.visitedTabs || ['details']))

                    // Restore selections after metadata is loaded
                    if (parsedState.selectedDataSets) {
                        // We'll restore these after local metadata loads
                        window.dqa360_pendingRestore = parsedState
                    }
                }
            } catch (error) {
                console.error('❌ Error loading saved state:', error)
                localStorage.removeItem('dqa360_create_assessment_state')
            }
        }
    }, [])

    // Cleanup function to clear saved state when component unmounts
    useEffect(() => {
        return () => {
            // Only clear if we're navigating away without completing the assessment
            const currentPath = window.location.pathname
            if (!currentPath.includes('/administration/assessments')) {
                console.log('🧹 Component unmounting, clearing saved state')
                localStorage.removeItem('dqa360_create_assessment_state')
            }
        }
    }, [])

    // Load local metadata on component mount (always available)
    useEffect(() => {
        // Load essential metadata first (local DHIS2 data)
        loadLocalMetadata()

        // Load manual metadata only if metadata source is manual (avoid unnecessary 404s)
        if (metadataSource === 'manual') {
            loadExistingManualMetadata()
            loadCategoryMetadata()
        }
    }, [metadataSource])

    // Function to generate period based on frequency
    const generatePeriodFromFrequency = (frequency) => {
        console.log(`generatePeriodFromFrequency called with: "${frequency}" (type: ${typeof frequency})`)

        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1 // JavaScript months are 0-indexed
        const day = now.getDate()

        let result
        switch (frequency) {
            case 'daily':
                result = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`
                break
            case 'weekly':
                const startOfYear = new Date(year, 0, 1)
                const weekNumber = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
                result = `${year}W${weekNumber}`
                break
            case 'monthly':
                result = `${year}${month.toString().padStart(2, '0')}`
                break
            case 'quarterly':
                const quarter = Math.ceil(month / 3)
                result = `${year}Q${quarter}`
                break
            case 'annually':
                result = `${year}`
                break
            default:
                console.warn(`Unknown frequency "${frequency}", defaulting to quarterly`)
                const defaultQuarter = Math.ceil(month / 3)
                result = `${year}Q${defaultQuarter}`
                break
        }

        console.log(`generatePeriodFromFrequency result: "${result}"`)
        return result
    }

    // Dynamic tabs based on metadata source
    const getTabsForMetadataSource = () => {
        if (metadataSource === 'manual') {
            return [
                { id: 'details', label: i18n.t('Details') },
                { id: 'datasets', label: i18n.t('Datasets') },
                { id: 'elements', label: i18n.t('Data Elements') },
                { id: 'units', label: i18n.t('Org Units') },
                { id: 'preparation', label: i18n.t('Preparation') },
                { id: 'review', label: i18n.t('Review') }
            ]
        } else {
            return [
                { id: 'details', label: i18n.t('Details') },
                { id: 'connection', label: i18n.t('Connection') },
                { id: 'datasets', label: i18n.t('Datasets') },
                { id: 'elements', label: i18n.t('Data Elements') },
                { id: 'units', label: i18n.t('Org Units') },
                { id: 'mapping', label: i18n.t('Mapping') },
                { id: 'preparation', label: i18n.t('Preparation') },
                { id: 'review', label: i18n.t('Review') }
            ]
        }
    }

    const tabs = getTabsForMetadataSource()

    // Helper function to check if all prerequisite tabs are valid
    const arePrerequisiteTabsValid = () => {
        const detailsValid = assessmentData.name &&
            assessmentData.startDate &&
            assessmentData.endDate &&
            assessmentData.methodology &&
            assessmentData.frequency &&
            assessmentData.reportingLevel &&
            assessmentData.dataQualityDimensions.length > 0 &&
            (assessmentData.assessmentType !== 'followup' || assessmentData.baselineAssessmentId) &&
            metadataSource

        if (metadataSource === 'manual') {
            const datasetsValid = selectedDataSets.length > 0
            const elementsValid = selectedDataElements.length > 0
            const unitsValid = selectedOrgUnits.length > 0
            const preparationValid = datasetPreparationComplete

            return detailsValid && datasetsValid && elementsValid && unitsValid && preparationValid
        } else {
            const connectionValid = dhis2Config && dhis2Config.baseUrl && dhis2Config.username && dhis2Config.password
            const datasetsValid = selectedDataSets.length > 0
            const elementsValid = selectedDataSets.length > 0 && selectedDataElements.length > 0
            const unitsValid = selectedOrgUnits.length > 0
            const mappingValid = orgUnitMappings.length > 0 && orgUnitMappings.some(mapping => mapping.mapped)
            const preparationValid = datasetPreparationComplete

            return detailsValid && connectionValid && datasetsValid && elementsValid && unitsValid && mappingValid && preparationValid
        }
    }

    // Validation functions
    const isTabValid = (tabId) => {
        const result = (() => {
            switch (tabId) {
                case 'details':
                    const hasValidDates = assessmentData.startDate &&
                        assessmentData.endDate &&
                        !dateErrors.startDate &&
                        !dateErrors.endDate
                    return assessmentData.name &&
                        hasValidDates &&
                        assessmentData.methodology &&
                        assessmentData.frequency &&
                        assessmentData.reportingLevel &&
                        assessmentData.dataQualityDimensions.length > 0 &&
                        (assessmentData.assessmentType !== 'followup' || assessmentData.baselineAssessmentId) &&
                        metadataSource
                case 'connection':
                    return metadataSource === 'manual' ? true : (dhis2Config && dhis2Config.baseUrl && dhis2Config.username && dhis2Config.password)
                case 'datasets':
                    return selectedDataSets.length > 0
                case 'elements':
                    if (metadataSource === 'manual') {
                        return selectedDataElements.length > 0
                    } else {
                        return selectedDataSets.length > 0 && selectedDataElements.length > 0
                    }
                case 'units':
                    return selectedOrgUnits.length > 0
                case 'mapping':
                    return metadataSource === 'manual' ? true : (orgUnitMappings.length > 0 && orgUnitMappings.some(mapping => mapping.mapped))
                case 'preparation':
                    return datasetPreparationComplete
                case 'review':
                    return visitedTabs.has('review') && arePrerequisiteTabsValid()
                default:
                    return false
            }
        })()



        return result
    }

    const canProceedToTab = (tabId) => {
        const tabIndex = tabs.findIndex(tab => tab.id === tabId)
        if (tabIndex === 0) return true

        const invalidTabs = []
        for (let i = 0; i < tabIndex; i++) {
            if (!isTabValid(tabs[i].id)) {
                invalidTabs.push(tabs[i].id)
            }
        }

        const canProceed = invalidTabs.length === 0



        return canProceed
    }

    // Helper function to change tab and track visits
    const changeTab = (tabId) => {
        setActiveTab(tabId)
        setVisitedTabs(prev => new Set([...prev, tabId]))
    }

    const handleTabClick = (tabId) => {
        if (canProceedToTab(tabId)) {
            changeTab(tabId)
        }
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

    // Helper function to get filtered data elements (used by display, pagination, and select all)
    const getFilteredDataElements = () => {
        let allAvailable = []

        if (metadataSource === 'manual') {
            // For manual metadata: show data elements from selected datasets + custom data elements
            const dataElementsFromSelectedDatasets = []

            // Get data elements from selected datasets only
            selectedDataSets.forEach(datasetId => {
                const dataset = localDatasets.find(ds => ds.id === datasetId)
                if (dataset && dataset.dataSetElements) {
                    dataset.dataSetElements.forEach(dse => {
                        const de = dse.dataElement
                        if (!dataElementsFromSelectedDatasets.some(existing => existing.id === de.id)) {
                            dataElementsFromSelectedDatasets.push({ ...de, source: 'dhis2' })
                        }
                    })
                }
            })

            // Combine data elements from selected datasets + custom data elements
            allAvailable = [
                ...dataElementsFromSelectedDatasets,
                ...availableCustomDataElements.map(de => ({ ...de, source: 'custom' }))
            ]
        } else {
            // For DHIS2 metadata: show ALL local data elements + custom
            const allLocalDataElements = []
            localDatasets.forEach(dataset => {
                if (dataset.dataSetElements) {
                    dataset.dataSetElements.forEach(dse => {
                        const de = dse.dataElement
                        if (!allLocalDataElements.some(existing => existing.id === de.id)) {
                            allLocalDataElements.push({ ...de, source: 'dhis2' })
                        }
                    })
                }
            })

            allAvailable = [
                ...allLocalDataElements,
                ...availableCustomDataElements.map(de => ({ ...de, source: 'custom' }))
            ]
        }

        // Remove duplicates
        const uniqueDataElements = []
        allAvailable.forEach(de => {
            if (!uniqueDataElements.some(existing => existing.id === de.id)) {
                uniqueDataElements.push(de)
            }
        })

        // Apply filters
        let filteredDataElements = uniqueDataElements

        // Apply search filter
        if (dataElementsSearchTerm.trim()) {
            const searchTerm = dataElementsSearchTerm.toLowerCase().trim()
            filteredDataElements = filteredDataElements.filter(de =>
                de.name?.toLowerCase().includes(searchTerm) ||
                de.code?.toLowerCase().includes(searchTerm)
            )
        }

        // Apply source filter
        if (dataElementsSourceFilter !== 'all') {
            filteredDataElements = filteredDataElements.filter(de =>
                de.source === dataElementsSourceFilter
            )
        }

        return filteredDataElements
    }

    // Helper function to format user information
    const formatUserInfo = (userInfo) => {
        if (!userInfo) return 'Unknown User'

        const username = userInfo.username || 'unknown'
        const firstName = userInfo.firstName || userInfo.name || ''
        const lastName = userInfo.surname || userInfo.lastName || ''

        if (firstName && lastName) {
            return `${username} (${firstName} ${lastName})`
        } else if (firstName) {
            return `${username} (${firstName})`
        } else {
            return username
        }
    }


    // ===== Helpers for Review payload preview / download / print =====
    const buildAssessmentPayload = () => {
        try {
            const currentTime = new Date().toISOString()
            const timestamp = Date.now()
            const counter = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
            const assessmentId = `assessment_${timestamp}_${counter}`

            const payload = {
                id: assessmentId,
                version: '2.0.0',
                createdAt: currentTime,
                lastUpdated: currentTime,

                info: {
                    name: assessmentData.name?.trim() || '',
                    description: assessmentData.description || '',
                    frequency: assessmentData.frequency || 'monthly',
                    period: assessmentData.period || '',
                    status: 'draft',
                    createdBy: formatUserInfo(userInfo),
                    lastModifiedBy: formatUserInfo(userInfo),
                    tags: assessmentData.tags || [],
                    notes: assessmentData.objectives || '',
                    assessmentType: assessmentData.assessmentType || 'baseline',
                    priority: assessmentData.priority || 'medium',
                    startDate: assessmentData.startDate || '',
                    endDate: assessmentData.endDate || '',
                    methodology: assessmentData.methodology || 'automated',
                    reportingLevel: assessmentData.reportingLevel || 'facility',
                    dataQualityDimensions: assessmentData.dataQualityDimensions || ['completeness', 'timeliness'],
                    stakeholders: assessmentData.stakeholders || [],
                    riskFactors: assessmentData.riskFactors || [],
                    successCriteria: assessmentData.successCriteria || '',
                    confidentialityLevel: assessmentData.confidentialityLevel || 'internal',
                    dataRetentionPeriod: assessmentData.dataRetentionPeriod || '5years',
                    publicAccess: assessmentData.publicAccess || false
                },

                dhis2Config: {
                    baseUrl: dhis2Config?.baseUrl || '',
                    username: dhis2Config?.username || '',
                    configured: !!(dhis2Config?.baseUrl && dhis2Config?.username),
                    lastTested: dhis2Config?.lastTested || null,
                    connectionStatus: dhis2Config?.connectionStatus || 'not_tested',
                    version: dhis2Config?.version || '',
                    apiVersion: dhis2Config?.apiVersion || ''
                },

                datasets: {
                    selected: (selectedDataSets || []).map(ds => ({
                        id: ds.id ?? ds,
                        name: ds.name || ds.displayName || ds.id || '',
                        periodType: ds.periodType || 'Monthly',
                        categoryCombo: ds.categoryCombo || 'default'
                    })),
                    metadata: {
                        totalSelected: selectedDataSets?.length || 0,
                        lastUpdated: currentTime,
                        source: metadataSource || 'manual'
                    }
                },

                dataElements: {
                    selected: (selectedDataElements || []).map(de => ({
                        id: de.id,
                        name: de.name || de.displayName,
                        valueType: de.valueType || 'TEXT',
                        categoryCombo: de.categoryCombo || 'default'
                    })),
                    metadata: {
                        totalSelected: selectedDataElements?.length || 0,
                        lastUpdated: currentTime,
                        source: metadataSource || 'manual'
                    },
                    mappings: {}
                },

                orgUnits: {
                    selected: (selectedOrgUnits || []).map(ou => ({
                        id: ou.id,
                        name: ou.name || ou.displayName,
                        level: ou.level || 1,
                        path: ou.path || `/${ou.id}`
                    })),
                    metadata: {
                        totalSelected: selectedOrgUnits?.length || 0,
                        hierarchyLevels: [...new Set((selectedOrgUnits || []).map(ou => ou.level).filter(Boolean))],
                        lastUpdated: currentTime
                    },
                    hierarchy: {
                        maxLevel: Math.max(...(selectedOrgUnits || []).map(ou => ou.level || 1, 1)),
                        selectedLevels: [...new Set((selectedOrgUnits || []).map(ou => ou.level).filter(Boolean))],
                        filterCriteria: assessmentData.reportingLevel || 'facility'
                    }
                },

                orgUnitMapping: {
                    mappings: (orgUnitMappings || []).filter(m => m.mapped).map(mapping => ({
                        externalId: mapping.external?.id || '',
                        externalName: mapping.external?.displayName || mapping.external?.name || '',
                        dhis2Id: mapping.local?.id || '',
                        dhis2Name: mapping.local?.displayName || mapping.local?.name || '',
                        confidence: mapping.confidence || 1.0,
                        mappingType: mapping.mappingType || 'manual'
                    })),
                    localOrgUnits: (orgUnitMappings || []).map(m => m.external).filter(Boolean).map(ext => ({
                        id: ext.id,
                        name: ext.displayName || ext.name,
                        code: ext.code || ''
                    })),
                    mappingRules: {
                        autoMapping: true,
                        confidenceThreshold: 0.8,
                        allowManualOverride: true
                    },
                    statistics: {
                        totalMappings: orgUnitMappings?.filter(m => m.mapped)?.length || 0,
                        automaticMappings: orgUnitMappings?.filter(m => m.mapped && m.mappingType === 'automatic')?.length || 0,
                        manualMappings: orgUnitMappings?.filter(m => m.mapped && m.mappingType === 'manual')?.length || 0,
                        unmappedCount: orgUnitMappings?.filter(m => !m.mapped)?.length || 0
                    }
                },

                localDatasets: {
                    info: {
                        totalDatasets: datasetPreparationComplete ? 4 : 0,
                        datasetTypes: datasetPreparationComplete ? ['register', 'summary', 'reported', 'correction'] : [],
                        creationStatus: datasetPreparationComplete ? 'completed' : 'pending',
                        createdAt: datasetPreparationComplete ? currentTime : null,
                        lastModified: datasetPreparationComplete ? currentTime : null
                    },
                    createdDatasets: []
                },

                statistics: {
                    dataQuality: {
                        completeness: null,
                        consistency: null,
                        accuracy: null,
                        timeliness: null
                    },
                    lastCalculated: null,
                    calculationDuration: null
                },

                metadataSource
            }

            return payload
        } catch (e) {
            console.error('buildAssessmentPayload failed', e)
            return {}
        }
    }

    const handleDownloadAssessmentJson = () => {
        const payload = buildAssessmentPayload()
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2))
        const a = document.createElement('a')
        a.href = dataStr
        a.download = `${payload.info?.name || 'assessment'}.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    const handlePrintAssessment = () => {
        const payload = buildAssessmentPayload()
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
        w.document.write(`
            <html>
                <head><title>${payload.info?.name || 'Assessment'}</title>${style}</head>
                <body>
                    <h1>${payload.info?.name || 'Assessment'}</h1>
                    <div class="meta">
                        <div><strong>${i18n.t('Period')}:</strong> ${payload.info?.period || ''}</div>
                        <div><strong>${i18n.t('Frequency')}:</strong> ${payload.info?.frequency || ''}</div>
                        <div><strong>${i18n.t('Dates')}:</strong> ${payload.info?.startDate || ''} — ${payload.info?.endDate || ''}</div>
                        <div><strong>${i18n.t('Reporting level')}:</strong> ${payload.info?.reportingLevel || ''}</div>
                    </div>
                    <pre>${JSON.stringify(payload, null, 2)}</pre>
                    <script>window.print();</script>
                </body>
            </html>
        `)
        w.document.close()
    }
    const handleCreateAssessment = async () => {
        setLoading(true)
        setError(null)

        try {
            console.log('🚀 Starting assessment creation...')

            if (!assessmentData.name?.trim()) {
                throw new Error('Assessment name is required')
            }

            // Validate dates before proceeding
            const dateValidationErrors = validateDates(assessmentData.startDate, assessmentData.endDate)
            if (dateValidationErrors.startDate || dateValidationErrors.endDate) {
                const errorMessages = []
                if (dateValidationErrors.startDate) errorMessages.push(dateValidationErrors.startDate)
                if (dateValidationErrors.endDate) errorMessages.push(dateValidationErrors.endDate)
                throw new Error(errorMessages.join('. '))
            }

            // Ensure both dates are provided
            if (!assessmentData.startDate || !assessmentData.endDate) {
                throw new Error('Both start date and end date are required')
            }

            const timestamp = Date.now()
            const counter = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
            const assessmentId = `assessment_${timestamp}_${counter}`
            const currentTime = new Date().toISOString()

            const standardAssessment = {
                id: assessmentId,
                version: '2.0.0',
                createdAt: currentTime,
                lastUpdated: currentTime,

                info: {
                    name: assessmentData.name.trim(),
                    description: assessmentData.description || '',
                    frequency: assessmentData.frequency || 'monthly',
                    period: assessmentData.period || '',
                    status: 'draft',
                    createdBy: formatUserInfo(userInfo),
                    lastModifiedBy: formatUserInfo(userInfo),
                    tags: assessmentData.tags || [],
                    notes: assessmentData.objectives || '',
                    assessmentType: assessmentData.assessmentType || 'baseline',
                    priority: assessmentData.priority || 'medium',
                    startDate: assessmentData.startDate || '',
                    endDate: assessmentData.endDate || '',
                    methodology: assessmentData.methodology || 'automated',
                    reportingLevel: assessmentData.reportingLevel || 'facility',
                    dataQualityDimensions: assessmentData.dataQualityDimensions || ['completeness', 'timeliness'],
                    stakeholders: assessmentData.stakeholders || [],
                    riskFactors: assessmentData.riskFactors || [],
                    successCriteria: assessmentData.successCriteria || '',
                    confidentialityLevel: assessmentData.confidentialityLevel || 'internal',
                    dataRetentionPeriod: assessmentData.dataRetentionPeriod || '5years',
                    publicAccess: assessmentData.publicAccess || false
                },

                dhis2Config: {
                    baseUrl: dhis2Config?.baseUrl || '',
                    username: dhis2Config?.username || '',
                    configured: !!(dhis2Config?.baseUrl && dhis2Config?.username),
                    lastTested: dhis2Config?.lastTested || null,
                    connectionStatus: dhis2Config?.connectionStatus || 'not_tested',
                    version: dhis2Config?.version || '',
                    apiVersion: dhis2Config?.apiVersion || ''
                },

                datasets: {
                    selected: (selectedDataSets || []).map(ds => ({
                        id: ds.id,
                        name: ds.name || ds.displayName,
                        periodType: ds.periodType || 'Monthly',
                        categoryCombo: ds.categoryCombo || 'default'
                    })),
                    metadata: {
                        totalSelected: selectedDataSets?.length || 0,
                        lastUpdated: currentTime,
                        source: metadataSource || 'manual'
                    }
                },

                dataElements: {
                    selected: (selectedDataElements || []).map(de => ({
                        id: de.id,
                        name: de.name || de.displayName,
                        valueType: de.valueType || 'TEXT',
                        categoryCombo: de.categoryCombo || 'default'
                    })),
                    metadata: {
                        totalSelected: selectedDataElements?.length || 0,
                        lastUpdated: currentTime,
                        source: metadataSource || 'manual'
                    },
                    mappings: {}
                },

                orgUnits: {
                    selected: (selectedOrgUnits || []).map(ou => ({
                        id: ou.id,
                        name: ou.name || ou.displayName,
                        level: ou.level || 1,
                        path: ou.path || `/${ou.id}`
                    })),
                    metadata: {
                        totalSelected: selectedOrgUnits?.length || 0,
                        hierarchyLevels: [...new Set((selectedOrgUnits || []).map(ou => ou.level).filter(Boolean))],
                        lastUpdated: currentTime
                    },
                    hierarchy: {
                        maxLevel: Math.max(...(selectedOrgUnits || []).map(ou => ou.level || 1)),
                        selectedLevels: [...new Set((selectedOrgUnits || []).map(ou => ou.level).filter(Boolean))],
                        filterCriteria: assessmentData.reportingLevel || 'facility'
                    }
                },

                orgUnitMapping: {
                    mappings: (orgUnitMappings || []).filter(m => m.mapped).map(mapping => ({
                        externalId: mapping.external?.id || '',
                        externalName: mapping.external?.displayName || mapping.external?.name || '',
                        dhis2Id: mapping.local?.id || '',
                        dhis2Name: mapping.local?.displayName || mapping.local?.name || '',
                        confidence: mapping.confidence || 1.0,
                        mappingType: mapping.mappingType || 'manual'
                    })),
                    localOrgUnits: (orgUnitMappings || []).map(m => m.external).filter(Boolean).map(ext => ({
                        id: ext.id,
                        name: ext.displayName || ext.name,
                        code: ext.code || ''
                    })),
                    mappingRules: {
                        autoMapping: true,
                        confidenceThreshold: 0.8,
                        allowManualOverride: true
                    },
                    statistics: {
                        totalMappings: orgUnitMappings?.filter(m => m.mapped)?.length || 0,
                        automaticMappings: orgUnitMappings?.filter(m => m.mapped && m.mappingType === 'automatic')?.length || 0,
                        manualMappings: orgUnitMappings?.filter(m => m.mapped && m.mappingType === 'manual')?.length || 0,
                        unmappedCount: orgUnitMappings?.filter(m => !m.mapped)?.length || 0
                    }
                },

                localDatasets: {
                    info: {
                        totalDatasets: datasetPreparationComplete ? 4 : 0,
                        datasetTypes: datasetPreparationComplete ? ['register', 'summary', 'reported', 'correction'] : [],
                        creationStatus: datasetPreparationComplete ? 'completed' : 'pending',
                        createdAt: datasetPreparationComplete ? currentTime : null,
                        lastModified: datasetPreparationComplete ? currentTime : null
                    },
                    createdDatasets: []
                },

                statistics: {
                    dataQuality: {
                        completeness: null,
                        consistency: null,
                        accuracy: null,
                        timeliness: null
                    },
                    lastCalculated: null,
                    calculationDuration: null
                }
            }

            console.log('💾 Saving assessment to dataStore...')
            const savedAssessment = await saveAssessment(standardAssessment)

            console.log('✅ Assessment created successfully:', savedAssessment.id || savedAssessment.info?.id)

            // Clear saved state after successful creation
            localStorage.removeItem('dqa360_create_assessment_state')
            console.log('🧹 Cleared saved state after successful creation')

            navigate('/administration/assessments', {
                state: {
                    message: `Assessment "${savedAssessment.info?.name || assessmentData.name}" created successfully`
                }
            })

        } catch (error) {
            console.error('❌ Error creating assessment:', error)
            setError(`Failed to create assessment: ${error.message || 'Unknown error'}`)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setLoading(false)
        }
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'details':
                return (
                    <div style={{ padding: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#2c3e50'
                        }}>
                            {i18n.t('Assessment Details')}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <InputField
                                label={i18n.t('Assessment Name')}
                                placeholder={i18n.t('Enter assessment name')}
                                value={assessmentData.name}
                                onChange={({ value }) => setAssessmentData(prev => ({ ...prev, name: value }))}
                                required
                            />

                            <SingleSelectField
                                label={i18n.t('Assessment Type')}
                                selected={assessmentData.assessmentType}
                                onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, assessmentType: selected }))}
                            >
                                {assessmentTypes.map(type => (
                                    <SingleSelectOption key={type.value} value={type.value} label={type.label} />
                                ))}
                            </SingleSelectField>
                        </div>

                        {/* Metadata Source Selection */}
                        <div style={{
                            marginBottom: '32px',
                            padding: '24px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '2px solid #e9ecef'
                        }}>
                            <h4 style={{
                                margin: '0 0 16px 0',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#495057'
                            }}>
                                {i18n.t('Metadata Source')} *
                            </h4>
                            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '20px' }}>
                                {i18n.t('Choose how you want to define the metadata for your assessment')}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Local instance first (recommended) */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '20px',
                                    border: metadataSource === 'manual' ? '2px solid #0d7377' : '2px solid #e0e0e0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: metadataSource === 'manual' ? '#f0f8ff' : 'white',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <input
                                        type="radio"
                                        name="metadataSource"
                                        value="manual"
                                        checked={metadataSource === 'manual'}
                                        onChange={e => setMetadataSource(e.target.value)}
                                        style={{ marginRight: '16px', marginTop: '4px', transform: 'scale(1.2)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '16px', color: '#212529' }}>
                                            🏠 {i18n.t('Local (This instance)')}
                                            <span style={{
                                                marginLeft: '8px',
                                                fontSize: '12px',
                                                backgroundColor: '#28a745',
                                                color: 'white',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontWeight: '500'
                                            }}>
                                                {i18n.t('RECOMMENDED')}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.5' }}>
                                            {i18n.t('Use metadata from this local DHIS2 instance. Access existing datasets, data elements, and organization units from the current system.')}
                                        </div>
                                    </div>
                                </label>

                                {/* External DHIS2 second */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '20px',
                                    border: metadataSource === 'dhis2' ? '2px solid #0d7377' : '2px solid #e0e0e0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: metadataSource === 'dhis2' ? '#f0f8ff' : 'white',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <input
                                        type="radio"
                                        name="metadataSource"
                                        value="dhis2"
                                        checked={metadataSource === 'dhis2'}
                                        onChange={e => setMetadataSource(e.target.value)}
                                        style={{ marginRight: '16px', marginTop: '4px', transform: 'scale(1.2)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '16px', color: '#212529' }}>
                                            🔗 {i18n.t('External DHIS2 instance')}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.5' }}>
                                            {i18n.t('Pull metadata from an external DHIS2 system. Configure connection, select datasets, data elements, and organization units.')}
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#212529'
                                }}>
                                    {i18n.t('Start Date')} *
                                </label>
                                <CalendarInput
                                    date={assessmentData.startDate}
                                    onDateSelect={({ calendarDateString }) => handleDateChange('startDate', calendarDateString)}
                                    placeholder={i18n.t('Select start date')}
                                    error={!!dateErrors.startDate}
                                    minDate={new Date().toISOString().split('T')[0]}
                                />
                                {dateErrors.startDate && (
                                    <div style={{
                                        color: '#d32f2f',
                                        fontSize: '12px',
                                        marginTop: '4px'
                                    }}>
                                        {dateErrors.startDate}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#212529'
                                }}>
                                    {i18n.t('End Date')} *
                                </label>
                                <CalendarInput
                                    date={assessmentData.endDate}
                                    onDateSelect={({ calendarDateString }) => handleDateChange('endDate', calendarDateString)}
                                    placeholder={i18n.t('Select end date')}
                                    error={!!dateErrors.endDate}
                                    minDate={assessmentData.startDate || new Date().toISOString().split('T')[0]}
                                />
                                {dateErrors.endDate && (
                                    <div style={{
                                        color: '#d32f2f',
                                        fontSize: '12px',
                                        marginTop: '4px'
                                    }}>
                                        {dateErrors.endDate}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <SingleSelectField
                                label={i18n.t('Priority')}
                                selected={assessmentData.priority}
                                onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, priority: selected }))}
                            >
                                {priorities.map(priority => (
                                    <SingleSelectOption key={priority.value} value={priority.value} label={priority.label} />
                                ))}
                            </SingleSelectField>

                            <SingleSelectField
                                label={i18n.t('Methodology')}
                                selected={assessmentData.methodology}
                                onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, methodology: selected }))}
                            >
                                {methodologies.map(methodology => (
                                    <SingleSelectOption key={methodology.value} value={methodology.value} label={methodology.label} />
                                ))}
                            </SingleSelectField>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <SingleSelectField
                                label={i18n.t('Frequency')}
                                selected={assessmentData.frequency}
                                onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, frequency: selected }))}
                            >
                                {frequencies.map(frequency => (
                                    <SingleSelectOption key={frequency.value} value={frequency.value} label={frequency.label} />
                                ))}
                            </SingleSelectField>

                            <SingleSelectField
                                label={i18n.t('Reporting Level')}
                                selected={assessmentData.reportingLevel}
                                onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, reportingLevel: selected }))}
                            >
                                {reportingLevels.map(level => (
                                    <SingleSelectOption key={level.value} value={level.value} label={level.label} />
                                ))}
                            </SingleSelectField>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <MultiSelectField
                                label={i18n.t('Data Quality Dimensions')}
                                selected={assessmentData.dataQualityDimensions}
                                onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, dataQualityDimensions: selected }))}
                            >
                                {dataQualityDimensions.map(dimension => (
                                    <MultiSelectOption key={dimension.value} value={dimension.value} label={dimension.label} />
                                ))}
                            </MultiSelectField>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <TextAreaField
                                label={i18n.t('Description')}
                                placeholder={i18n.t('Enter assessment description')}
                                value={assessmentData.description}
                                onChange={({ value }) => setAssessmentData(prev => ({ ...prev, description: value }))}
                                rows={4}
                            />
                        </div>

                        {/* Additional Assessment Fields */}
                        <div style={{ marginBottom: '20px' }}>
                            <TextAreaField
                                label={i18n.t('Objectives')}
                                placeholder={i18n.t('Define the main objectives of this assessment')}
                                value={assessmentData.objectives}
                                onChange={({ value }) => setAssessmentData(prev => ({ ...prev, objectives: value }))}
                                rows={3}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <TextAreaField
                                label={i18n.t('Scope')}
                                placeholder={i18n.t('Define the scope and boundaries of this assessment')}
                                value={assessmentData.scope}
                                onChange={({ value }) => setAssessmentData(prev => ({ ...prev, scope: value }))}
                                rows={3}
                            />
                        </div>

                        {/* Success Criteria - Hybrid Approach */}
                        <div style={{ marginBottom: '20px' }}>
                            <MultiSelectField
                                label={i18n.t('Success Criteria (Pre-defined)')}
                                placeholder={i18n.t('Select common success criteria')}
                                selected={assessmentData.predefinedSuccessCriteria || []}
                                onChange={({ selected }) => setAssessmentData(prev => ({
                                    ...prev,
                                    predefinedSuccessCriteria: selected
                                }))}
                            >
                                <MultiSelectOption value="completeness_90" label={i18n.t('Data completeness ≥ 90%')} />
                                <MultiSelectOption value="timeliness_95" label={i18n.t('Reporting timeliness ≥ 95%')} />
                                <MultiSelectOption value="accuracy_85" label={i18n.t('Data accuracy ≥ 85%')} />
                                <MultiSelectOption value="consistency_80" label={i18n.t('Data consistency ≥ 80%')} />
                                <MultiSelectOption value="zero_duplicates" label={i18n.t('Zero duplicate records')} />
                                <MultiSelectOption value="validation_pass" label={i18n.t('All validation rules pass')} />
                                <MultiSelectOption value="stakeholder_satisfaction" label={i18n.t('Stakeholder satisfaction ≥ 4/5')} />
                                <MultiSelectOption value="response_time" label={i18n.t('Query response time < 2 seconds')} />
                                <MultiSelectOption value="system_uptime" label={i18n.t('System uptime ≥ 99%')} />
                                <MultiSelectOption value="training_completion" label={i18n.t('Staff training completion 100%')} />
                                <MultiSelectOption value="data_coverage" label={i18n.t('Geographic data coverage 100%')} />
                                <MultiSelectOption value="error_rate" label={i18n.t('Data error rate < 5%')} />
                            </MultiSelectField>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <TextAreaField
                                label={i18n.t('Additional Success Criteria')}
                                placeholder={i18n.t('Define any specific or custom success criteria for this assessment...')}
                                value={assessmentData.successCriteria}
                                onChange={({ value }) => setAssessmentData(prev => ({ ...prev, successCriteria: value }))}
                                rows={3}
                                helpText={i18n.t('Use this field for criteria not covered by the pre-defined options above')}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <SingleSelectField
                                label={i18n.t('Confidentiality Level')}
                                selected={assessmentData.confidentialityLevel}
                                onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, confidentialityLevel: selected }))}
                            >
                                {confidentialityLevels.map(level => (
                                    <SingleSelectOption key={level.value} value={level.value} label={level.label} />
                                ))}
                            </SingleSelectField>

                            <SingleSelectField
                                label={i18n.t('Data Retention Period')}
                                selected={assessmentData.dataRetentionPeriod}
                                onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, dataRetentionPeriod: selected }))}
                            >
                                {dataRetentionPeriods.map(period => (
                                    <SingleSelectOption key={period.value} value={period.value} label={period.label} />
                                ))}
                            </SingleSelectField>
                        </div>

                        {/* Assessment Options */}
                        <div style={{
                            marginBottom: '20px',
                            padding: '20px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef'
                        }}>
                            <h4 style={{
                                margin: '0 0 16px 0',
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#495057'
                            }}>
                                {i18n.t('Assessment Options')}
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={assessmentData.notifications}
                                        onChange={(e) => setAssessmentData(prev => ({ ...prev, notifications: e.target.checked }))}
                                        style={{ transform: 'scale(1.2)' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {i18n.t('Enable Notifications')}
                                    </span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={assessmentData.autoSync}
                                        onChange={(e) => setAssessmentData(prev => ({ ...prev, autoSync: e.target.checked }))}
                                        style={{ transform: 'scale(1.2)' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {i18n.t('Auto Sync')}
                                    </span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={assessmentData.validationAlerts}
                                        onChange={(e) => setAssessmentData(prev => ({ ...prev, validationAlerts: e.target.checked }))}
                                        style={{ transform: 'scale(1.2)' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {i18n.t('Validation Alerts')}
                                    </span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={assessmentData.historicalComparison}
                                        onChange={(e) => setAssessmentData(prev => ({ ...prev, historicalComparison: e.target.checked }))}
                                        style={{ transform: 'scale(1.2)' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {i18n.t('Historical Comparison')}
                                    </span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={assessmentData.publicAccess}
                                        onChange={(e) => setAssessmentData(prev => ({ ...prev, publicAccess: e.target.checked }))}
                                        style={{ transform: 'scale(1.2)' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {i18n.t('Public Access')}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Baseline Assessment Selection (only for follow-up assessments) */}
                        {assessmentData.assessmentType === 'followup' && (
                            <div style={{ marginBottom: '20px' }}>
                                <SingleSelectField
                                    label={i18n.t('Baseline Assessment')}
                                    placeholder={i18n.t('Select baseline assessment for comparison')}
                                    selected={assessmentData.baselineAssessmentId}
                                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, baselineAssessmentId: selected }))}
                                    loading={loadingBaselines}
                                >
                                    {baselineAssessments.map(assessment => (
                                        <SingleSelectOption
                                            key={assessment.id}
                                            value={assessment.id}
                                            label={`${assessment.name} (${assessment.period})`}
                                        />
                                    ))}
                                </SingleSelectField>
                            </div>
                        )}
                    </div>
                )

            case 'connection':
                if (metadataSource === 'dhis2') {
                    return (
                        <div style={{ padding: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <DHIS2Configuration
                                value={dhis2Config}
                                onChange={setDhis2Config}
                            />
                        </div>
                    )
                } else {
                    return (
                        <div style={{ padding: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                border: '2px dashed #dee2e6'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                                <h3 style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: '#28a745'
                                }}>
                                    {i18n.t('Manual Metadata Mode')}
                                </h3>
                                <p style={{
                                    fontSize: '16px',
                                    color: '#6c757d',
                                    margin: '0 0 20px 0',
                                    lineHeight: '1.5'
                                }}>
                                    {i18n.t('No DHIS2 connection required. You will create custom datasets, data elements, and organization units in the following steps.')}
                                </p>
                            </div>
                        </div>
                    )
                }

            case 'datasets':
                if (metadataSource === 'dhis2') {
                    return (
                        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <AssessmentDataSetSelection
                                dhis2Config={dhis2Config}
                                multiSelect={true}
                                selectedDataSets={selectedDataSets}
                                customDatasets={availableCustomDatasets}
                                onDataSetsSelected={(datasetIds, fullDatasets) => {
                                    setSelectedDataSets(datasetIds)
                                    if (fullDatasets) {
                                        setExternalDatasets(fullDatasets)
                                    }
                                }}
                                mode="datasets"
                            />
                        </div>
                    )
                } else {
                    return (
                        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '24px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '24px'
                            }}>
                                <div>
                                    <h3 style={{
                                        margin: '0 0 8px 0',
                                        fontSize: '20px',
                                        fontWeight: '600',
                                        color: '#2c3e50'
                                    }}>
                                        {i18n.t('Select Datasets')}
                                    </h3>
                                    <p style={{ fontSize: '14px', color: '#6c757d', margin: '0' }}>
                                        {i18n.t('Choose from existing DHIS2 datasets or create new custom datasets for your assessment.')}
                                    </p>
                                </div>
                                <Button
                                    primary
                                    onClick={() => setDatasetModalOpen(true)}
                                >
                                    {i18n.t('+ Create New Dataset')}
                                </Button>
                            </div>

                            {/* Loading indicator or No Datasets message */}
                            {loadingLocalMetadata ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    padding: '60px 40px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '8px',
                                    marginBottom: '24px',
                                    minHeight: '200px',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}>
                                    <CircularLoader />
                                    <span style={{
                                        marginTop: '16px',
                                        color: '#6c757d',
                                        fontSize: '16px',
                                        fontWeight: '500',
                                        textAlign: 'center'
                                    }}>
                                        {i18n.t('Loading datasets...')}
                                    </span>
                                </div>
                            ) : (localDatasets.length === 0 && availableCustomDatasets.length === 0) ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    padding: '60px 40px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '8px',
                                    marginBottom: '24px',
                                    minHeight: '200px',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}>
                                    <div style={{ color: '#6c757d', marginBottom: '24px' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#495057', fontSize: '18px', fontWeight: '500' }}>
                                            {i18n.t('No Datasets Available')}
                                        </h4>
                                        <p style={{ margin: '0', fontSize: '14px' }}>
                                            {i18n.t('No datasets found in your local instance.')}
                                        </p>
                                    </div>
                                    <Button
                                        primary
                                        onClick={() => setDatasetModalOpen(true)}
                                    >
                                        {i18n.t('Create New Dataset')}
                                    </Button>
                                </div>
                            ) : null}

                            {/* Auto-populate Notification */}
                            {autoPopulateNotification && (
                                <div style={{ marginBottom: '16px' }}>
                                    <NoticeBox
                                        valid={autoPopulateNotification.type === 'success'}
                                        title={i18n.t('Dataset Auto-Population')}
                                        onClose={() => setAutoPopulateNotification(null)}
                                    >
                                        {autoPopulateNotification.message}
                                    </NoticeBox>
                                </div>
                            )}



                            {/* Dataset Source Summary */}
                            {(localDatasets.length > 0 || availableCustomDatasets.length > 0) && (
                                <Box style={{
                                    marginBottom: '24px',
                                    padding: '12px 16px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '6px',
                                    border: '1px solid #e9ecef'
                                }}>
                                    <Box display="flex" alignItems="center" gap="16px" style={{ fontSize: '14px', color: '#495057' }}>
                                        <span>
                                            📊 <strong>{localDatasets.length + availableCustomDatasets.length}</strong> {i18n.t('total datasets')}
                                        </span>
                                        <span>
                                            🔗 <strong>{localDatasets.length}</strong> {i18n.t('local datasets')}
                                        </span>
                                        <span>
                                            ✨ <strong>{availableCustomDatasets.length}</strong> {i18n.t('new datasets')}
                                        </span>
                                    </Box>
                                </Box>
                            )}

                            {/* Selection Summary */}
                            {selectedDataSets.length > 0 && (
                                <Box style={{ marginBottom: '24px' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginBottom: '12px' }}>
                                        <Tag positive>
                                            {selectedDataSets.length} {i18n.t('datasets selected')}
                                        </Tag>
                                        <Button
                                            small
                                            secondary
                                            onClick={() => {
                                                const allDatasets = [...localDatasets, ...availableCustomDatasets]
                                                const allIds = allDatasets.map(ds => ds.id)
                                                const allSelected = allIds.every(id => selectedDataSets.includes(id))

                                                if (allSelected) {
                                                    // Deselect all datasets
                                                    allDatasets.forEach(dataset => {
                                                        if (selectedDataSets.includes(dataset.id)) {
                                                            handleDatasetSelection(dataset, false)
                                                        }
                                                    })
                                                } else {
                                                    // Select all datasets
                                                    allDatasets.forEach(dataset => {
                                                        if (!selectedDataSets.includes(dataset.id)) {
                                                            handleDatasetSelection(dataset, true)
                                                        }
                                                    })
                                                }
                                            }}
                                        >
                                            {(() => {
                                                const allDatasets = [...localDatasets, ...availableCustomDatasets]
                                                const allIds = allDatasets.map(ds => ds.id)
                                                return allIds.every(id => selectedDataSets.includes(id)) ? i18n.t('Deselect All') : i18n.t('Select All')
                                            })()}
                                        </Button>
                                    </Box>
                                    <Box display="flex" flexWrap="wrap" gap="4px">
                                        {selectedDataSets.map(dsId => {
                                            const dataset = [...localDatasets, ...availableCustomDatasets].find(ds => ds.id === dsId)
                                            return dataset ? (
                                                <Tag key={dsId} positive small>
                                                    {dataset.name}
                                                </Tag>
                                            ) : null
                                        })}
                                    </Box>
                                </Box>
                            )}

                            {/* Datasets Table */}
                            {!loadingLocalMetadata && (localDatasets.length > 0 || availableCustomDatasets.length > 0) && (
                                <Card>
                                    <DataTable>
                                        <DataTableHead>
                                            <DataTableRow>
                                                <DataTableColumnHeader width="60px">
                                                    <Checkbox
                                                        checked={(() => {
                                                            const allDatasets = [...localDatasets, ...availableCustomDatasets]
                                                            const allIds = allDatasets.map(ds => ds.id)
                                                            return selectedDataSets.length === allIds.length && allIds.length > 0
                                                        })()}
                                                        indeterminate={(() => {
                                                            const allDatasets = [...localDatasets, ...availableCustomDatasets]
                                                            const allIds = allDatasets.map(ds => ds.id)
                                                            return selectedDataSets.length > 0 && selectedDataSets.length < allIds.length
                                                        })()}
                                                        onChange={() => {
                                                            const allDatasets = [...localDatasets, ...availableCustomDatasets]
                                                            const allIds = allDatasets.map(ds => ds.id)
                                                            const allSelected = allIds.every(id => selectedDataSets.includes(id))

                                                            if (allSelected) {
                                                                // Deselect all datasets
                                                                allDatasets.forEach(dataset => {
                                                                    if (selectedDataSets.includes(dataset.id)) {
                                                                        handleDatasetSelection(dataset, false)
                                                                    }
                                                                })
                                                            } else {
                                                                // Select all datasets
                                                                allDatasets.forEach(dataset => {
                                                                    if (!selectedDataSets.includes(dataset.id)) {
                                                                        handleDatasetSelection(dataset, true)
                                                                    }
                                                                })
                                                            }
                                                        }}
                                                    />
                                                </DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Dataset Name')}</DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Source')}</DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Period Type')}</DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Category Combo')}</DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Data Elements')}</DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Organisation Units')}</DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                            </DataTableRow>
                                        </DataTableHead>
                                        <DataTableBody>
                                            {/* DHIS2 Datasets */}
                                            {(() => {
                                                const allDatasets = [...localDatasets, ...availableCustomDatasets]
                                                const startIndex = (datasetsCurrentPage - 1) * itemsPerPage
                                                const endIndex = startIndex + itemsPerPage
                                                const paginatedDatasets = allDatasets.slice(startIndex, endIndex)

                                                return paginatedDatasets.filter(dataset => localDatasets.some(local => local.id === dataset.id))
                                            })().map(dataset => {
                                                const isSelected = selectedDataSets.includes(dataset.id)
                                                return (
                                                    <DataTableRow
                                                        key={dataset.id}
                                                        style={{
                                                            backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                                                            borderLeft: isSelected ? '4px solid #1976d2' : '4px solid transparent'
                                                        }}
                                                    >
                                                        <DataTableCell>
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onChange={({ checked }) => {
                                                                    handleDatasetSelection(dataset, checked)
                                                                }}
                                                            />
                                                        </DataTableCell>
                                                        <DataTableCell>
                                                            <Box display="flex" alignItems="center" gap="8px">
                                                                <span style={{ fontWeight: isSelected ? '600' : '400' }}>
                                                                    {dataset.name}
                                                                </span>
                                                                <Tag neutral small>
                                                                    🔗 LOCAL
                                                                </Tag>
                                                            </Box>
                                                        </DataTableCell>
                                                        <DataTableCell>Local</DataTableCell>
                                                        <DataTableCell>{dataset.periodType}</DataTableCell>
                                                        <DataTableCell>{dataset.categoryCombo?.displayName || i18n.t('Default')}</DataTableCell>
                                                        <DataTableCell>{dataset.dataSetElements?.length || 0}</DataTableCell>
                                                        <DataTableCell>{dataset.organisationUnits?.length || 0}</DataTableCell>
                                                        <DataTableCell>
                                                            <span style={{ fontSize: '12px', color: '#6c757d' }}>
                                                                {i18n.t('Reused from local')}
                                                            </span>
                                                        </DataTableCell>
                                                    </DataTableRow>
                                                )
                                            })}

                                            {/* Custom Datasets */}
                                            {(() => {
                                                const allDatasets = [...localDatasets, ...availableCustomDatasets]
                                                const startIndex = (datasetsCurrentPage - 1) * itemsPerPage
                                                const endIndex = startIndex + itemsPerPage
                                                const paginatedDatasets = allDatasets.slice(startIndex, endIndex)

                                                return paginatedDatasets.filter(dataset => availableCustomDatasets.some(custom => custom.id === dataset.id))
                                            })().map(dataset => {
                                                const isSelected = selectedDataSets.includes(dataset.id)
                                                return (
                                                    <DataTableRow
                                                        key={dataset.id}
                                                        style={{
                                                            backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                                                            borderLeft: isSelected ? '4px solid #1976d2' : '4px solid transparent'
                                                        }}
                                                    >
                                                        <DataTableCell>
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onChange={({ checked }) => {
                                                                    handleDatasetSelection(dataset, checked)
                                                                }}
                                                            />
                                                        </DataTableCell>
                                                        <DataTableCell>
                                                            <Box display="flex" alignItems="center" gap="8px">
                                                                <span style={{ fontWeight: isSelected ? '600' : '400' }}>
                                                                    {dataset.name}
                                                                </span>
                                                                <Tag positive small>
                                                                    ✨ NEW
                                                                </Tag>
                                                            </Box>
                                                        </DataTableCell>
                                                        <DataTableCell>New</DataTableCell>
                                                        <DataTableCell>{dataset.periodType}</DataTableCell>
                                                        <DataTableCell>{dataset.categoryCombo?.displayName || i18n.t('Default')}</DataTableCell>
                                                        <DataTableCell>0</DataTableCell>
                                                        <DataTableCell>0</DataTableCell>
                                                        <DataTableCell>
                                                            <Box display="flex" gap="8px">
                                                                <Button
                                                                    small
                                                                    secondary
                                                                    onClick={() => {
                                                                        setEditingDataset(dataset)
                                                                        setDatasetForm({
                                                                            name: dataset.name,
                                                                            code: dataset.code,
                                                                            description: dataset.description || '',
                                                                            periodType: dataset.periodType
                                                                        })
                                                                        setDatasetModalOpen(true)
                                                                    }}
                                                                >
                                                                    {i18n.t('Edit')}
                                                                </Button>
                                                                <Button
                                                                    small
                                                                    destructive
                                                                    onClick={() => {
                                                                        setAvailableCustomDatasets(availableCustomDatasets.filter(ds => ds.id !== dataset.id))
                                                                        setSelectedDataSets(selectedDataSets.filter(id => id !== dataset.id))
                                                                    }}
                                                                >
                                                                    {i18n.t('Delete')}
                                                                </Button>
                                                            </Box>
                                                        </DataTableCell>
                                                    </DataTableRow>
                                                )
                                            })}
                                        </DataTableBody>
                                    </DataTable>
                                    {(() => {
                                        const allDatasets = [...localDatasets, ...availableCustomDatasets]
                                        const totalPages = Math.ceil(allDatasets.length / itemsPerPage)
                                        return totalPages > 1 ? (
                                            <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0' }}>
                                                <Pagination
                                                    page={datasetsCurrentPage}
                                                    pageCount={totalPages}
                                                    pageSize={itemsPerPage}
                                                    total={allDatasets.length}
                                                    onPageChange={setDatasetsCurrentPage}
                                                    onPageSizeChange={() => {}} // Required prop but we'll keep fixed size
                                                    hidePageSizeSelect={true} // Hide page size selector since we want fixed size
                                                />
                                            </div>
                                        ) : null
                                    })()}
                                </Card>
                            )}


                        </div>
                    )
                }

            case 'elements':
                if (metadataSource === 'dhis2') {
                    return (
                        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <AssessmentDataSetSelection
                                dhis2Config={dhis2Config}
                                multiSelect={true}
                                selectedDataSets={externalDatasets.filter(ds => selectedDataSets.includes(ds.id))}
                                onDataSetsSelected={(datasetIds, fullDatasets) => {
                                    setSelectedDataSets(datasetIds)
                                    if (fullDatasets) {
                                        setExternalDatasets(fullDatasets)
                                    }
                                }}
                                selectedDataElements={selectedDataElements}
                                onDataElementsSelected={setSelectedDataElements}
                                mode="dataelements"
                            />
                        </div>
                    )
                } else {
                    return (
                        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '24px' }}>
                            <h3 style={{
                                margin: '0 0 20px 0',
                                fontSize: '20px',
                                fontWeight: '600',
                                color: '#2c3e50'
                            }}>
                                {i18n.t('Select Data Elements for Assessment')}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#6c757d', margin: '0 0 16px 0' }}>
                                {i18n.t('Choose data elements from selected datasets and custom elements. Category combinations are shown for each element.')}
                            </p>

                            {/* Show selected datasets summary */}
                            {selectedDataSets.length > 0 && (
                                <Card style={{ marginBottom: '24px', backgroundColor: '#f8f9fa' }}>
                                    <div style={{ padding: '16px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '14px', fontWeight: '600' }}>
                                            {i18n.t('Selected Datasets')} ({selectedDataSets.length})
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {selectedDataSets.map(datasetId => {
                                                const dataset = [...localDatasets, ...availableCustomDatasets].find(ds => ds.id === datasetId)
                                                return dataset ? (
                                                    <Tag key={datasetId} neutral>
                                                        {dataset.name}
                                                    </Tag>
                                                ) : null
                                            })}
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Check if datasets are selected */}
                            {selectedDataSets.length === 0 ? (
                                <Card style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
                                    <div style={{ color: '#6c757d' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>
                                            {i18n.t('No Datasets Selected')}
                                        </h4>
                                        <p style={{ margin: '0' }}>
                                            {i18n.t('Please go back to step 2 and select datasets first.')}
                                        </p>
                                        <Button
                                            secondary
                                            onClick={() => setActiveTab('datasets')}
                                        >
                                            {i18n.t('Go Back to Select Datasets')}
                                        </Button>
                                    </div>
                                </Card>
                            ) : getFilteredDataElements().length === 0 ? (
                                <Card style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
                                    <div style={{ color: '#6c757d' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>
                                            {i18n.t('No Data Elements Available')}
                                        </h4>
                                        <p style={{ margin: '0' }}>
                                            {i18n.t('The selected datasets do not contain any data elements.')}
                                        </p>
                                        <Button
                                            secondary
                                            onClick={() => setActiveTab('datasets')}
                                        >
                                            {i18n.t('Go Back to Select Different Datasets')}
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '16px'
                                    }}>
                                        <h4 style={{
                                            margin: '0',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            color: '#2c3e50'
                                        }}>
                                            {i18n.t('Available Data Elements')} ({getFilteredDataElements().length})
                                        </h4>

                                        {/* Filtering Controls */}
                                        <div style={{ margin: '16px 0' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'end' }}>
                                                <InputField
                                                    label={i18n.t('Search Data Elements')}
                                                    placeholder={i18n.t('Search by name...')}
                                                    value={dataElementsSearchTerm}
                                                    onChange={({ value }) => {
                                                        setDataElementsSearchTerm(value)
                                                        setDataElementsCurrentPage(1) // Reset to first page when searching
                                                    }}
                                                />
                                                <SingleSelectField
                                                    label={i18n.t('Filter by Source')}
                                                    selected={dataElementsSourceFilter}
                                                    onChange={({ selected }) => {
                                                        setDataElementsSourceFilter(selected)
                                                        setDataElementsCurrentPage(1) // Reset to first page when filtering
                                                    }}
                                                >
                                                    <SingleSelectOption value="all" label={i18n.t('All Sources')} />
                                                    <SingleSelectOption value="dhis2" label={i18n.t('DHIS2 Only')} />
                                                    <SingleSelectOption value="custom" label={i18n.t('Custom Only')} />
                                                </SingleSelectField>
                                            </div>
                                        </div>

                                        <Box display="flex" alignItems="center" gap="16px" style={{ fontSize: '14px', color: '#495057', marginBottom: '16px' }}>
                                            <span>
                                                ✅ <strong>{selectedDataElements.length}</strong> {i18n.t('selected')}
                                            </span>
                                            <span>
                                                🔗 <strong>{(() => {
                                                // Count selected data elements that are from DHIS2 (not custom)
                                                return selectedDataElements.filter(de => !availableCustomDataElements.some(custom => custom.id === de.id)).length
                                            })()}</strong> {i18n.t('from DHIS2')}
                                            </span>
                                            <span>
                                                ✨ <strong>{(() => {
                                                // Count selected data elements that are custom
                                                return selectedDataElements.filter(de => availableCustomDataElements.some(custom => custom.id === de.id)).length
                                            })()}</strong> {i18n.t('custom')}
                                            </span>
                                        </Box>
                                    </div>

                                    <Card style={{ padding: '0', width: '100%' }}>
                                        <DataTable style={{ width: '100%' }}>
                                            <DataTableHead>
                                                <DataTableRow>
                                                    <DataTableColumnHeader width="60px">
                                                        <Checkbox
                                                            checked={(() => {
                                                                const filteredDataElements = getFilteredDataElements()
                                                                return filteredDataElements.length > 0 && filteredDataElements.every(de => selectedDataElements.some(selected => selected.id === de.id))
                                                            })()}
                                                            indeterminate={(() => {
                                                                const filteredDataElements = getFilteredDataElements()
                                                                const selectedCount = filteredDataElements.filter(de => selectedDataElements.some(selected => selected.id === de.id)).length
                                                                return selectedCount > 0 && selectedCount < filteredDataElements.length
                                                            })()}
                                                            onChange={() => {
                                                                const filteredDataElements = getFilteredDataElements()
                                                                const allSelected = filteredDataElements.every(de => selectedDataElements.some(selected => selected.id === de.id))

                                                                if (allSelected) {
                                                                    // Deselect all filtered elements
                                                                    const filteredIds = new Set(filteredDataElements.map(de => de.id))
                                                                    setSelectedDataElements(selectedDataElements.filter(selected => !filteredIds.has(selected.id)))
                                                                } else {
                                                                    // Select all filtered elements (merge with existing selection)
                                                                    const existingIds = new Set(selectedDataElements.map(de => de.id))
                                                                    const newSelections = filteredDataElements.filter(de => !existingIds.has(de.id))
                                                                    setSelectedDataElements([...selectedDataElements, ...newSelections])
                                                                }
                                                            }}
                                                        />
                                                    </DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Data Element Name')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Value Type')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Category Combination')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Source')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                                </DataTableRow>
                                            </DataTableHead>
                                            <DataTableBody>
                                                {(() => {
                                                    const filteredDataElements = getFilteredDataElements()

                                                    // Apply pagination
                                                    const startIndex = (dataElementsCurrentPage - 1) * itemsPerPage
                                                    const endIndex = startIndex + itemsPerPage
                                                    return filteredDataElements.slice(startIndex, endIndex)
                                                })().map(dataElement => {
                                                    const isCustom = dataElement.source === 'custom'
                                                    const isSelected = selectedDataElements.some(selected => selected.id === dataElement.id)

                                                    return (
                                                        <DataTableRow key={dataElement.id}>
                                                            <DataTableCell>
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onChange={({ checked }) => {
                                                                        if (checked) {
                                                                            setSelectedDataElements([...selectedDataElements, dataElement])
                                                                        } else {
                                                                            setSelectedDataElements(selectedDataElements.filter(selected => selected.id !== dataElement.id))
                                                                        }
                                                                    }}
                                                                />
                                                            </DataTableCell>
                                                            <DataTableCell>
                                                                <Box display="flex" alignItems="center" gap="8px">
                                                                    <span>{dataElement.name}</span>
                                                                    {isCustom && (
                                                                        <Tag positive small>
                                                                            ✨ NEW
                                                                        </Tag>
                                                                    )}
                                                                </Box>
                                                            </DataTableCell>
                                                            <DataTableCell>{dataElement.code || '-'}</DataTableCell>
                                                            <DataTableCell>{dataElement.valueType || 'TEXT'}</DataTableCell>
                                                            <DataTableCell>
                                                                {dataElement.categoryCombo?.name || dataElement.categoryCombo || 'Default'}
                                                            </DataTableCell>
                                                            <DataTableCell>
                                                                {isCustom ? (
                                                                    <Tag positive small>Custom</Tag>
                                                                ) : (
                                                                    <Tag neutral small>DHIS2</Tag>
                                                                )}
                                                            </DataTableCell>
                                                            <DataTableCell>
                                                                {isCustom && (
                                                                    <Button
                                                                        small
                                                                        secondary
                                                                        onClick={() => {
                                                                            setEditingDataElement(dataElement)
                                                                            setDataElementModalOpen(true)
                                                                        }}
                                                                    >
                                                                        {i18n.t('Edit')}
                                                                    </Button>
                                                                )}
                                                            </DataTableCell>
                                                        </DataTableRow>
                                                    )
                                                })}
                                            </DataTableBody>
                                        </DataTable>
                                        {(() => {
                                            const filteredDataElements = getFilteredDataElements()
                                            const totalPages = Math.ceil(filteredDataElements.length / itemsPerPage)
                                            return totalPages > 1 ? (
                                                <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0' }}>
                                                    <Pagination
                                                        page={dataElementsCurrentPage}
                                                        pageCount={totalPages}
                                                        pageSize={itemsPerPage}
                                                        total={filteredDataElements.length}
                                                        onPageChange={setDataElementsCurrentPage}
                                                        onPageSizeChange={() => {}} // Required prop but we'll keep fixed size
                                                        hidePageSizeSelect={true} // Hide page size selector since we want fixed size
                                                    />
                                                </div>
                                            ) : null
                                        })()}
                                    </Card>
                                </div>
                            )}

                            {/* No Data Elements Available Message */}
                            {(() => {
                                // Check if there are any available data elements
                                const allAvailable = []
                                selectedDataSets.forEach(datasetId => {
                                    const dataset = localDatasets.find(ds => ds.id === datasetId)
                                    if (dataset && dataset.dataSetElements) {
                                        const dataElementsFromDataset = dataset.dataSetElements.map(dse => dse.dataElement)
                                        dataElementsFromDataset.forEach(de => {
                                            if (!allAvailable.some(existing => existing.id === de.id)) {
                                                allAvailable.push(de)
                                            }
                                        })
                                    }
                                })
                                availableCustomDataElements.forEach(de => {
                                    if (!allAvailable.some(existing => existing.id === de.id)) {
                                        allAvailable.push(de)
                                    }
                                })
                                return allAvailable.length === 0
                            })() && (
                                <Card style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
                                    <div style={{ color: '#6c757d', marginBottom: '16px' }}>
                                        <h4 style={{ margin: '0 0 8px 0' }}>{i18n.t('No Data Elements Available')}</h4>
                                        <p style={{ margin: '0' }}>
                                            {i18n.t('Select datasets in the previous tab to auto-populate data elements, or create custom ones.')}
                                        </p>
                                    </div>
                                    <Button
                                        primary
                                        onClick={() => setActiveTab('datasets')}
                                    >
                                        {i18n.t('Go Back to Select Datasets')}
                                    </Button>
                                </Card>
                            )}



                            {/* Add New Data Element Button */}
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Button
                                    primary
                                    large
                                    onClick={() => setDataElementModalOpen(true)}
                                >
                                    {i18n.t('+ Create New Data Element')}
                                </Button>
                                <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '12px' }}>
                                    {i18n.t('Define new data elements to collect specific information for your assessment')}
                                </div>
                            </div>
                        </div>
                    )
                }


            case 'units':
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <div style={{ padding: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <h3 style={{
                                margin: '0 0 20px 0',
                                fontSize: '20px',
                                fontWeight: '600',
                                color: '#2c3e50'
                            }}>
                                {i18n.t('Select Organisation Units')}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#6c757d', margin: '0 0 16px 0' }}>
                                {i18n.t('Organisation units from your selected datasets will be available for selection.')}
                            </p>

                            {/* Show selected datasets summary */}
                            {selectedDataSets.length > 0 && (
                                <Card style={{ marginBottom: '24px', backgroundColor: '#f8f9fa' }}>
                                    <div style={{ padding: '16px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '14px', fontWeight: '600' }}>
                                            {i18n.t('Selected Datasets')} ({selectedDataSets.length})
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {selectedDataSets.map(datasetId => {
                                                const dataset = [...localDatasets, ...availableCustomDatasets].find(ds => ds.id === datasetId)
                                                return dataset ? (
                                                    <Tag key={datasetId} neutral>
                                                        {dataset.name}
                                                    </Tag>
                                                ) : null
                                            })}
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {selectedDataSets.length === 0 ? (
                                <Card style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
                                    <div style={{ color: '#6c757d' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>
                                            {i18n.t('No Datasets Selected')}
                                        </h4>
                                        <p style={{ margin: '0' }}>
                                            {i18n.t('Please go back to step 2 and select datasets first.')}
                                        </p>
                                        <Button
                                            secondary
                                            onClick={() => setActiveTab('datasets')}
                                        >
                                            {i18n.t('Go Back to Select Datasets')}
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <OrganisationUnitManagement
                                    dhis2Config={dhis2Config}
                                    dataSets={metadataSource === 'dhis2' ?
                                        externalDatasets.filter(ds => selectedDataSets.includes(ds.id)) :
                                        selectedDataSets.map(id =>
                                            [...localDatasets, ...availableCustomDatasets].find(ds => ds.id === id)
                                        ).filter(Boolean)
                                    }
                                    value={selectedOrgUnits}
                                    onChange={setSelectedOrgUnits}
                                    metadataSource={metadataSource}
                                />
                            )}
                        </div>
                    </div>
                )

            case 'mapping':
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <OrganizationUnitMapping
                            dhis2Config={dhis2Config}
                            selectedOrgUnits={selectedOrgUnits}
                            value={orgUnitMappings}
                            onChange={setOrgUnitMappings}
                            onNext={() => {
                                // Navigate to the next tab (preparation)
                                const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
                                if (currentIndex < tabs.length - 1) {
                                    const nextTabId = tabs[currentIndex + 1].id
                                    setActiveTab(nextTabId)
                                    setVisitedTabs(prev => new Set([...prev, nextTabId]))
                                }
                            }}
                        />
                    </div>
                )

            case 'preparation':
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <DatasetPreparation
                            dhis2Config={dhis2Config}
                            selectedDataSets={selectedDataSets}
                            selectedDataElements={selectedDataElements}
                            selectedOrgUnits={selectedOrgUnits}
                            orgUnitMappings={orgUnitMappings}
                            assessmentName={assessmentData.name}
                            period={assessmentData.startDate}
                            frequency={assessmentData.frequency}
                            metadataSource={metadataSource}
                            assessmentData={assessmentData}
                            onPreparationComplete={setDatasetPreparationComplete}
                            isComplete={datasetPreparationComplete}
                            onSave={async (assessmentStructure) => {
                                // Save the assessment structure for manual metadata
                                console.log('Saving manual metadata assessment:', assessmentStructure)
                                // You can add additional save logic here if needed
                            }}
                            onFinish={(assessmentStructure) => {
                                // Handle completion of manual metadata preparation
                                console.log('Manual metadata preparation completed:', assessmentStructure)
                                setDatasetPreparationComplete(true)
                            }}
                        />
                    </div>
                )

            case 'review':
                return (
                    <div style={{ padding: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <h3 style={{
                            margin: '0 0 20px 0',
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#2c3e50'
                        }}>
                            {i18n.t('Review & Create Assessment')}
                        </h3>

                        <div style={{ marginBottom: '24px' }}>
                            <Card>
                                <div style={{ padding: '20px' }}>
                                    <h4 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>
                                        {i18n.t('Assessment Summary')}
                                    </h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <strong>{i18n.t('Name')}:</strong> {assessmentData.name}
                                        </div>
                                        <div>
                                            <strong>{i18n.t('Type')}:</strong> {assessmentData.assessmentType}
                                        </div>
                                        <div>
                                            <strong>{i18n.t('Methodology')}:</strong> {assessmentData.methodology}
                                        </div>
                                        <div>
                                            <strong>{i18n.t('Frequency')}:</strong> {assessmentData.frequency}
                                        </div>
                                        <div>
                                            <strong>{i18n.t('Datasets')}:</strong> {selectedDataSets.length}
                                        </div>
                                        <div>
                                            <strong>{i18n.t('Data Elements')}:</strong> {selectedDataElements.length}
                                        </div>
                                        <div>
                                            <strong>{i18n.t('Organization Units')}:</strong> {selectedOrgUnits.length}
                                        </div>
                                        <div>
                                            <strong>{i18n.t('Metadata Source')}:</strong> {metadataSource}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <ButtonStrip>
                            <Button
                                primary
                                large
                                onClick={handleCreateAssessment}
                                disabled={loading || !arePrerequisiteTabsValid()}
                            >
                                {loading ? <CircularLoader small /> : null}
                                {loading ? i18n.t('Creating...') : i18n.t('Create Assessment')}
                            </Button>
                        </ButtonStrip>
                    </div>
                )

            default:
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            backgroundColor: '#fff3cd',
                            borderRadius: '8px',
                            border: '2px dashed #ffeaa7'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#856404' }}>
                                {i18n.t('Please Select Metadata Source')}
                            </h3>
                            <p style={{ fontSize: '16px', color: '#856404', margin: 0 }}>
                                {i18n.t('Go back to Assessment Details and choose your metadata source to continue.')}
                            </p>
                        </div>
                    </div>
                )
        }
    }

    return (
        <>
            <style>{`
                /* Custom scrollbar styles for tab container */
                .tab-container::-webkit-scrollbar {
                    height: 4px;
                }
                .tab-container::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 2px;
                }
                .tab-container::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 2px;
                }
                .tab-container::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                
                /* Ensure tabs don't wrap and maintain proper spacing */
                .dhis2-uicore-tabbar {
                    display: flex;
                    flex-wrap: nowrap;
                    min-width: max-content;
                }
                
                /* Responsive adjustments for smaller screens */
                @media (max-width: 768px) {
                    .tab-container {
                        padding-bottom: 8px; /* Add space for scrollbar on mobile */
                    }
                }
            `}</style>
            <div style={{
                padding: '20px',
                margin: '0 auto',
                minWidth: '320px', // Ensure minimum width for mobile
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{
                        margin: '0 0 8px 0',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#2c3e50'
                    }}>
                        {i18n.t('Create New Assessment')}
                    </h1>
                    <p style={{
                        margin: 0,
                        fontSize: '16px',
                        color: '#6c757d',
                        lineHeight: '1.5'
                    }}>
                        {i18n.t('Set up a new data quality assessment by configuring metadata, selecting data sources, and defining evaluation criteria.')}
                    </p>
                </div>

                {error && (
                    <div style={{ marginBottom: '20px' }}>
                        <NoticeBox error title={i18n.t('Error')}>
                            {error}
                        </NoticeBox>
                    </div>
                )}

                <Card>
                    <div style={{
                        borderBottom: '1px solid #e0e0e0',
                        overflow: 'hidden' // Prevent overflow issues
                    }}>
                        <div
                            className="tab-container"
                            style={{
                                overflowX: 'auto', // Allow horizontal scrolling for tabs if needed
                                overflowY: 'hidden',
                                scrollbarWidth: 'thin', // For Firefox
                                WebkitScrollbarWidth: 'thin', // For WebKit browsers
                                scrollBehavior: 'smooth'
                            }}>
                            <TabBar>
                                {tabs.map((tab, index) => {
                                    const isValid = isTabValid(tab.id)
                                    const canProceed = canProceedToTab(tab.id)
                                    const isActive = activeTab === tab.id

                                    return (
                                        <Tab
                                            key={tab.id}
                                            selected={isActive}
                                            onClick={() => handleTabClick(tab.id)}
                                            disabled={!canProceed}
                                            style={{
                                                minWidth: 'fit-content', // Ensure tabs don't get too compressed
                                                whiteSpace: 'nowrap' // Prevent text wrapping
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px', // Reduced gap to save space
                                                opacity: canProceed ? 1 : 0.5,
                                                padding: '4px 8px' // Add some padding for better touch targets
                                            }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '18px', // Slightly smaller
                                                height: '18px',
                                                borderRadius: '50%',
                                                backgroundColor: isValid ? '#28a745' : (isActive ? '#007bff' : '#6c757d'),
                                                color: 'white',
                                                fontSize: '11px', // Slightly smaller font
                                                fontWeight: '600',
                                                flexShrink: 0 // Don't shrink the circle
                                            }}>
                                                {index + 1}
                                            </span>
                                                <span style={{
                                                    fontSize: '13px', // Slightly smaller text
                                                    fontWeight: '500'
                                                }}>
                                                {tab.label}
                                            </span>
                                                {isValid && (
                                                    <span style={{
                                                        color: '#28a745',
                                                        fontSize: '12px',
                                                        flexShrink: 0 // Don't shrink the checkmark
                                                    }}>✓</span>
                                                )}
                                            </div>
                                        </Tab>
                                    )
                                })}
                            </TabBar>
                        </div>
                    </div>

                    {/* Top navigation buttons */}
                    <div style={{
                        borderBottom: '1px solid #e0e0e0',
                        padding: '16px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8f9fa'
                    }}>
                        <Button
                            secondary
                            onClick={handlePrevious}
                            disabled={tabs.findIndex(tab => tab.id === activeTab) === 0}
                        >
                            {i18n.t('Previous')}
                        </Button>

                        <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '500' }}>
                            {i18n.t('Step {{current}} of {{total}}', {
                                current: tabs.findIndex(tab => tab.id === activeTab) + 1,
                                total: tabs.length
                            })}
                        </div>

                        <Button
                            primary
                            onClick={handleNext}
                            disabled={
                                tabs.findIndex(tab => tab.id === activeTab) === tabs.length - 1 ||
                                !canProceedToTab(tabs[tabs.findIndex(tab => tab.id === activeTab) + 1]?.id)
                            }
                        >
                            {i18n.t('Next')}
                        </Button>
                    </div>

                    <div style={{
                        minHeight: '500px',
                        padding: '0', // Remove default padding
                        overflow: 'hidden' // Prevent content overflow
                    }}>
                        {renderTabContent()}
                    </div>

                    <div style={{
                        borderTop: '1px solid #e0e0e0',
                        padding: '16px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Button
                            secondary
                            onClick={handlePrevious}
                            disabled={tabs.findIndex(tab => tab.id === activeTab) === 0}
                        >
                            {i18n.t('Previous')}
                        </Button>

                        <div style={{ fontSize: '14px', color: '#6c757d' }}>
                            {i18n.t('Step {{current}} of {{total}}', {
                                current: tabs.findIndex(tab => tab.id === activeTab) + 1,
                                total: tabs.length
                            })}
                        </div>

                        <Button
                            primary
                            onClick={handleNext}
                            disabled={
                                tabs.findIndex(tab => tab.id === activeTab) === tabs.length - 1 ||
                                !canProceedToTab(tabs[tabs.findIndex(tab => tab.id === activeTab) + 1]?.id)
                            }
                        >
                            {i18n.t('Next')}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Dataset Creation/Edit Modal */}
            {datasetModalOpen && (
                <Modal
                    large
                    position="middle"
                    onClose={() => {
                        setDatasetModalOpen(false)
                        setEditingDataset(null)
                        setDatasetForm({
                            name: '',
                            code: '',
                            description: '',
                            periodType: ''
                        })
                    }}
                >
                    <div style={{ backgroundColor: '#ffffff', minHeight: '500px' }}>
                        <ModalTitle style={{
                            backgroundColor: '#ffffff',
                            borderBottom: '1px solid #e0e0e0',
                            padding: '24px 32px 16px 32px'
                        }}>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: '600',
                                color: '#2c3e50',
                                marginBottom: '8px'
                            }}>
                                {editingDataset ? i18n.t('Edit Dataset') : i18n.t('Create New Dataset')}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6c757d' }}>
                                {editingDataset
                                    ? i18n.t('Update the dataset information below')
                                    : i18n.t('Define a new custom dataset for your assessment')
                                }
                            </div>
                        </ModalTitle>

                        <ModalContent style={{
                            backgroundColor: '#ffffff',
                            padding: '32px',
                            minHeight: '400px'
                        }}>
                            <div style={{
                                display: 'grid',
                                gap: '24px',
                                maxWidth: '700px',
                                margin: '0 auto'
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <InputField
                                        label={i18n.t('Dataset Name')}
                                        placeholder={i18n.t('Enter dataset name')}
                                        value={datasetForm.name}
                                        onChange={({ value }) => setDatasetForm({...datasetForm, name: value})}
                                        required
                                        helpText={i18n.t('A descriptive name for your dataset')}
                                    />
                                    <InputField
                                        label={i18n.t('Dataset Code')}
                                        placeholder={i18n.t('Enter unique code')}
                                        value={datasetForm.code}
                                        onChange={({ value }) => setDatasetForm({...datasetForm, code: value})}
                                        required
                                        helpText={i18n.t('A unique identifier for the dataset')}
                                    />
                                </div>

                                <TextAreaField
                                    label={i18n.t('Description')}
                                    placeholder={i18n.t('Describe the purpose and scope of this dataset')}
                                    value={datasetForm.description}
                                    onChange={({ value }) => setDatasetForm({...datasetForm, description: value})}
                                    rows={4}
                                    helpText={i18n.t('Optional: Provide additional context about this dataset')}
                                />

                                <SingleSelectField
                                    label={i18n.t('Period Type')}
                                    placeholder={i18n.t('Select how often data is collected')}
                                    selected={datasetForm.periodType}
                                    onChange={({ selected }) => setDatasetForm({...datasetForm, periodType: selected})}
                                    required
                                    helpText={i18n.t('Choose the frequency of data collection for this dataset')}
                                >
                                    <SingleSelectOption value="Daily" label={i18n.t('Daily')} />
                                    <SingleSelectOption value="Weekly" label={i18n.t('Weekly')} />
                                    <SingleSelectOption value="Monthly" label={i18n.t('Monthly')} />
                                    <SingleSelectOption value="Quarterly" label={i18n.t('Quarterly')} />
                                    <SingleSelectOption value="Yearly" label={i18n.t('Yearly')} />
                                </SingleSelectField>

                                {/* Preview Section */}
                                <div style={{
                                    marginTop: '24px',
                                    padding: '20px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '8px',
                                    border: '1px solid #e9ecef'
                                }}>
                                    <h4 style={{
                                        margin: '0 0 12px 0',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#2c3e50'
                                    }}>
                                        {i18n.t('Dataset Preview')}
                                    </h4>
                                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                                        <div><strong>{i18n.t('Name')}:</strong> {datasetForm.name || i18n.t('Not specified')}</div>
                                        <div><strong>{i18n.t('Code')}:</strong> {datasetForm.code || i18n.t('Not specified')}</div>
                                        <div><strong>{i18n.t('Period Type')}:</strong> {datasetForm.periodType || i18n.t('Not specified')}</div>
                                        {datasetForm.description && (
                                            <div><strong>{i18n.t('Description')}:</strong> {datasetForm.description}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ModalContent>

                        <ModalActions style={{
                            backgroundColor: '#ffffff',
                            borderTop: '1px solid #e0e0e0',
                            padding: '20px 32px'
                        }}>
                            <ButtonStrip end>
                                <Button
                                    secondary
                                    onClick={() => {
                                        setDatasetModalOpen(false)
                                        setEditingDataset(null)
                                        setDatasetForm({
                                            name: '',
                                            code: '',
                                            description: '',
                                            periodType: ''
                                        })
                                    }}
                                >
                                    {i18n.t('Cancel')}
                                </Button>
                                <Button
                                    primary
                                    disabled={!datasetForm.name || !datasetForm.code || !datasetForm.periodType}
                                    onClick={() => {
                                        if (!datasetForm.name || !datasetForm.code || !datasetForm.periodType) {
                                            return
                                        }

                                        if (editingDataset) {
                                            // Update existing dataset
                                            const updatedDataset = {
                                                ...editingDataset,
                                                name: datasetForm.name,
                                                code: datasetForm.code,
                                                description: datasetForm.description,
                                                periodType: datasetForm.periodType,
                                                updatedAt: new Date().toISOString()
                                            }

                                            setAvailableCustomDatasets(availableCustomDatasets.map(ds =>
                                                ds.id === editingDataset.id ? updatedDataset : ds
                                            ))
                                        } else {
                                            // Create new dataset
                                            const newDataset = {
                                                id: generateUID(),
                                                name: datasetForm.name,
                                                code: datasetForm.code,
                                                description: datasetForm.description,
                                                periodType: datasetForm.periodType,
                                                createdAt: new Date().toISOString(),
                                                isCustom: true
                                            }

                                            setAvailableCustomDatasets([...availableCustomDatasets, newDataset])
                                            setSelectedDataSets([...selectedDataSets, newDataset.id])
                                        }

                                        // Close modal and reset form
                                        setDatasetModalOpen(false)
                                        setEditingDataset(null)
                                        setDatasetForm({
                                            name: '',
                                            code: '',
                                            description: '',
                                            periodType: ''
                                        })
                                    }}
                                >
                                    {editingDataset ? i18n.t('Update Dataset') : i18n.t('Create Dataset')}
                                </Button>
                            </ButtonStrip>
                        </ModalActions>
                    </div>
                </Modal>
            )}

            {/* Comprehensive Data Element Creation/Edit Modal */}
            {dataElementModalOpen && (
                <Modal
                    large
                    position="middle"
                    onClose={() => {
                        setDataElementModalOpen(false)
                        setEditingDataElement(null)
                        setDataElementModalTab('element')
                        setDataElementForm({
                            name: '',
                            code: '',
                            description: '',
                            valueType: 'TEXT',
                            categoryCombo: 'default',
                            aggregationType: 'SUM',
                            domainType: 'AGGREGATE',
                            zeroIsSignificant: false
                        })
                        setCategoryOptionForm({ name: '', code: '', description: '' })
                        setCategoryForm({ name: '', code: '', description: '', categoryOptions: [] })
                        setCategoryComboForm({ name: '', code: '', description: '', categories: [] })
                    }}
                >
                    <div style={{ backgroundColor: '#ffffff', minHeight: '600px', maxHeight: '80vh', overflow: 'hidden' }}>
                        <ModalTitle style={{
                            backgroundColor: '#ffffff',
                            borderBottom: '1px solid #e0e0e0',
                            padding: '24px 32px 16px 32px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontSize: '20px',
                                fontWeight: '600',
                                color: '#2c3e50'
                            }}>
                                <span>📊</span>
                                {editingDataElement ? i18n.t('Edit Data Element') : i18n.t('Create New Data Element')}
                            </div>
                        </ModalTitle>

                        <ModalContent style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                {/* Tab Navigation */}
                                <div style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
                                    <TabBar>
                                        <Tab
                                            selected={dataElementModalTab === 'element'}
                                            onClick={() => setDataElementModalTab('element')}
                                        >
                                            {i18n.t('Data Element')}
                                        </Tab>
                                        <Tab
                                            selected={dataElementModalTab === 'categoryOptions'}
                                            onClick={() => setDataElementModalTab('categoryOptions')}
                                        >
                                            {i18n.t('Category Options')}
                                        </Tab>
                                        <Tab
                                            selected={dataElementModalTab === 'categories'}
                                            onClick={() => setDataElementModalTab('categories')}
                                        >
                                            {i18n.t('Categories')}
                                        </Tab>
                                        <Tab
                                            selected={dataElementModalTab === 'categoryCombos'}
                                            onClick={() => setDataElementModalTab('categoryCombos')}
                                        >
                                            {i18n.t('Category Combinations')}
                                        </Tab>
                                    </TabBar>
                                </div>

                                {/* Tab Content */}
                                <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
                                    {dataElementModalTab === 'element' && (
                                        <div>
                                            <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>
                                                {i18n.t('Data Element Details')}
                                            </h4>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                                <InputField
                                                    label={i18n.t('Name')}
                                                    value={dataElementForm.name}
                                                    onChange={({ value }) => setDataElementForm({ ...dataElementForm, name: value })}
                                                    required
                                                />
                                                <InputField
                                                    label={i18n.t('Code')}
                                                    value={dataElementForm.code}
                                                    onChange={({ value }) => setDataElementForm({ ...dataElementForm, code: value })}
                                                    required
                                                />
                                            </div>

                                            <TextAreaField
                                                label={i18n.t('Description')}
                                                value={dataElementForm.description}
                                                onChange={({ value }) => setDataElementForm({ ...dataElementForm, description: value })}
                                                rows={3}
                                                style={{ marginBottom: '16px' }}
                                            />

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                                <SingleSelectField
                                                    label={i18n.t('Value Type')}
                                                    selected={dataElementForm.valueType}
                                                    onChange={({ selected }) => setDataElementForm({ ...dataElementForm, valueType: selected })}
                                                >
                                                    {valueTypes.map(type => (
                                                        <SingleSelectOption key={type.value} value={type.value} label={type.label} />
                                                    ))}
                                                </SingleSelectField>

                                                <SingleSelectField
                                                    label={i18n.t('Aggregation Type')}
                                                    selected={dataElementForm.aggregationType}
                                                    onChange={({ selected }) => setDataElementForm({ ...dataElementForm, aggregationType: selected })}
                                                >
                                                    {aggregationTypes.map(type => (
                                                        <SingleSelectOption key={type.value} value={type.value} label={type.label} />
                                                    ))}
                                                </SingleSelectField>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                                <SingleSelectField
                                                    label={i18n.t('Domain Type')}
                                                    selected={dataElementForm.domainType}
                                                    onChange={({ selected }) => setDataElementForm({ ...dataElementForm, domainType: selected })}
                                                >
                                                    <SingleSelectOption value="AGGREGATE" label={i18n.t('Aggregate')} />
                                                    <SingleSelectOption value="TRACKER" label={i18n.t('Tracker')} />
                                                </SingleSelectField>

                                                <SingleSelectField
                                                    label={i18n.t('Category Combination')}
                                                    selected={dataElementForm.categoryCombo}
                                                    onChange={({ selected }) => setDataElementForm({ ...dataElementForm, categoryCombo: selected })}
                                                >
                                                    <SingleSelectOption value="default" label={i18n.t('Default')} />
                                                    {categoryCombos.map(combo => (
                                                        <SingleSelectOption key={combo.id} value={combo.id} label={`${combo.name} (DHIS2)`} />
                                                    ))}
                                                    {availableCustomCategoryCombos.map(combo => (
                                                        <SingleSelectOption key={combo.id} value={combo.id} label={`${combo.name} (Custom)`} />
                                                    ))}
                                                </SingleSelectField>
                                            </div>

                                            <div style={{ marginBottom: '16px' }}>
                                                <Checkbox
                                                    label={i18n.t('Zero is significant')}
                                                    checked={dataElementForm.zeroIsSignificant}
                                                    onChange={({ checked }) => setDataElementForm({ ...dataElementForm, zeroIsSignificant: checked })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {dataElementModalTab === 'categoryOptions' && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                                                    {i18n.t('Category Options Management')}
                                                </h4>
                                                <Button
                                                    primary
                                                    small
                                                    onClick={() => setCategoryOptionModalOpen(true)}
                                                >
                                                    {i18n.t('+ Add Category Option')}
                                                </Button>
                                            </div>

                                            {(() => {
                                                const allCategoryOptions = [...categoryOptions, ...availableCustomCategoryOptions]
                                                return allCategoryOptions.length > 0 ? (
                                                    <Card>
                                                        <DataTable>
                                                            <DataTableHead>
                                                                <DataTableRow>
                                                                    <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Description')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Source')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                                                </DataTableRow>
                                                            </DataTableHead>
                                                            <DataTableBody>
                                                                {allCategoryOptions.map(option => {
                                                                    const isCustom = availableCustomCategoryOptions.some(custom => custom.id === option.id)
                                                                    return (
                                                                        <DataTableRow key={option.id}>
                                                                            <DataTableCell>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    {option.name}
                                                                                    {isCustom && (
                                                                                        <Tag positive small>
                                                                                            ✨ NEW
                                                                                        </Tag>
                                                                                    )}
                                                                                </div>
                                                                            </DataTableCell>
                                                                            <DataTableCell>{option.code}</DataTableCell>
                                                                            <DataTableCell>{option.description || '-'}</DataTableCell>
                                                                            <DataTableCell>
                                                                                {isCustom ? (
                                                                                    <Tag positive small>Custom</Tag>
                                                                                ) : (
                                                                                    <Tag neutral small>DHIS2</Tag>
                                                                                )}
                                                                            </DataTableCell>
                                                                            <DataTableCell>
                                                                                {isCustom && (
                                                                                    <Button
                                                                                        small
                                                                                        secondary
                                                                                        onClick={() => {
                                                                                            setEditingCategoryOption(option)
                                                                                            setCategoryOptionForm({
                                                                                                name: option.name,
                                                                                                code: option.code,
                                                                                                description: option.description || ''
                                                                                            })
                                                                                            setCategoryOptionModalOpen(true)
                                                                                        }}
                                                                                    >
                                                                                        {i18n.t('Edit')}
                                                                                    </Button>
                                                                                )}
                                                                            </DataTableCell>
                                                                        </DataTableRow>
                                                                    )
                                                                })}
                                                            </DataTableBody>
                                                        </DataTable>
                                                    </Card>
                                                ) : (
                                                    <Card style={{ padding: '40px', textAlign: 'center' }}>
                                                        <div style={{ color: '#6c757d' }}>
                                                            <h5 style={{ margin: '0 0 8px 0' }}>{i18n.t('No Category Options')}</h5>
                                                            <p style={{ margin: '0' }}>{i18n.t('Create category options to use in categories.')}</p>
                                                        </div>
                                                    </Card>
                                                )
                                            })()}
                                        </div>
                                    )}

                                    {dataElementModalTab === 'categories' && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                                                    {i18n.t('Categories Management')}
                                                </h4>
                                                <Button
                                                    primary
                                                    small
                                                    onClick={() => setCategoryModalOpen(true)}
                                                >
                                                    {i18n.t('+ Add Category')}
                                                </Button>
                                            </div>

                                            {(() => {
                                                const allCategories = [...categories, ...availableCustomCategories]
                                                return allCategories.length > 0 ? (
                                                    <Card>
                                                        <DataTable>
                                                            <DataTableHead>
                                                                <DataTableRow>
                                                                    <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Options')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Source')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                                                </DataTableRow>
                                                            </DataTableHead>
                                                            <DataTableBody>
                                                                {allCategories.map(category => {
                                                                    const isCustom = availableCustomCategories.some(custom => custom.id === category.id)
                                                                    return (
                                                                        <DataTableRow key={category.id}>
                                                                            <DataTableCell>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    {category.name}
                                                                                    {isCustom && (
                                                                                        <Tag positive small>
                                                                                            ✨ NEW
                                                                                        </Tag>
                                                                                    )}
                                                                                </div>
                                                                            </DataTableCell>
                                                                            <DataTableCell>{category.code}</DataTableCell>
                                                                            <DataTableCell>{category.categoryOptions?.length || 0}</DataTableCell>
                                                                            <DataTableCell>
                                                                                {isCustom ? (
                                                                                    <Tag positive small>Custom</Tag>
                                                                                ) : (
                                                                                    <Tag neutral small>DHIS2</Tag>
                                                                                )}
                                                                            </DataTableCell>
                                                                            <DataTableCell>
                                                                                {isCustom && (
                                                                                    <Button
                                                                                        small
                                                                                        secondary
                                                                                        onClick={() => {
                                                                                            setEditingCategory(category)
                                                                                            setCategoryForm({
                                                                                                name: category.name,
                                                                                                code: category.code,
                                                                                                description: category.description || '',
                                                                                                categoryOptions: category.categoryOptions || []
                                                                                            })
                                                                                            setCategoryModalOpen(true)
                                                                                        }}
                                                                                    >
                                                                                        {i18n.t('Edit')}
                                                                                    </Button>
                                                                                )}
                                                                            </DataTableCell>
                                                                        </DataTableRow>
                                                                    )
                                                                })}
                                                            </DataTableBody>
                                                        </DataTable>
                                                    </Card>
                                                ) : (
                                                    <Card style={{ padding: '40px', textAlign: 'center' }}>
                                                        <div style={{ color: '#6c757d' }}>
                                                            <h5 style={{ margin: '0 0 8px 0' }}>{i18n.t('No Categories')}</h5>
                                                            <p style={{ margin: '0' }}>{i18n.t('Create categories using category options.')}</p>
                                                        </div>
                                                    </Card>
                                                )
                                            })()}
                                        </div>
                                    )}

                                    {dataElementModalTab === 'categoryCombos' && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                                                    {i18n.t('Category Combinations Management')}
                                                </h4>
                                                <Button
                                                    primary
                                                    small
                                                    onClick={() => setCategoryComboModalOpen(true)}
                                                >
                                                    {i18n.t('+ Add Category Combination')}
                                                </Button>
                                            </div>

                                            {(() => {
                                                const allCategoryCombos = [...categoryCombos, ...availableCustomCategoryCombos]
                                                return allCategoryCombos.length > 0 ? (
                                                    <Card>
                                                        <DataTable>
                                                            <DataTableHead>
                                                                <DataTableRow>
                                                                    <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Categories')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Source')}</DataTableColumnHeader>
                                                                    <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                                                </DataTableRow>
                                                            </DataTableHead>
                                                            <DataTableBody>
                                                                {allCategoryCombos.map(combo => {
                                                                    const isCustom = availableCustomCategoryCombos.some(custom => custom.id === combo.id)
                                                                    return (
                                                                        <DataTableRow key={combo.id}>
                                                                            <DataTableCell>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    {combo.name}
                                                                                    {isCustom && (
                                                                                        <Tag positive small>
                                                                                            ✨ NEW
                                                                                        </Tag>
                                                                                    )}
                                                                                </div>
                                                                            </DataTableCell>
                                                                            <DataTableCell>{combo.code}</DataTableCell>
                                                                            <DataTableCell>{combo.categories?.length || 0}</DataTableCell>
                                                                            <DataTableCell>
                                                                                {isCustom ? (
                                                                                    <Tag positive small>Custom</Tag>
                                                                                ) : (
                                                                                    <Tag neutral small>DHIS2</Tag>
                                                                                )}
                                                                            </DataTableCell>
                                                                            <DataTableCell>
                                                                                {isCustom && (
                                                                                    <Button
                                                                                        small
                                                                                        secondary
                                                                                        onClick={() => {
                                                                                            setEditingCategoryCombo(combo)
                                                                                            setCategoryComboForm({
                                                                                                name: combo.name,
                                                                                                code: combo.code,
                                                                                                description: combo.description || '',
                                                                                                categories: combo.categories || []
                                                                                            })
                                                                                            setCategoryComboModalOpen(true)
                                                                                        }}
                                                                                    >
                                                                                        {i18n.t('Edit')}
                                                                                    </Button>
                                                                                )}
                                                                            </DataTableCell>
                                                                        </DataTableRow>
                                                                    )
                                                                })}
                                                            </DataTableBody>
                                                        </DataTable>
                                                    </Card>
                                                ) : (
                                                    <Card style={{ padding: '40px', textAlign: 'center' }}>
                                                        <div style={{ color: '#6c757d' }}>
                                                            <h5 style={{ margin: '0 0 8px 0' }}>{i18n.t('No Category Combinations')}</h5>
                                                            <p style={{ margin: '0' }}>{i18n.t('Create category combinations using categories.')}</p>
                                                        </div>
                                                    </Card>
                                                )
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ModalContent>

                        <ModalActions style={{ borderTop: '1px solid #e0e0e0', padding: '16px 24px' }}>
                            <ButtonStrip>
                                <Button
                                    secondary
                                    onClick={() => {
                                        setDataElementModalOpen(false)
                                        setEditingDataElement(null)
                                        setDataElementModalTab('element')
                                        setDataElementForm({
                                            name: '',
                                            code: '',
                                            description: '',
                                            valueType: 'TEXT',
                                            categoryCombo: 'default',
                                            aggregationType: 'SUM',
                                            domainType: 'AGGREGATE',
                                            zeroIsSignificant: false
                                        })
                                    }}
                                >
                                    {i18n.t('Cancel')}
                                </Button>
                                <Button
                                    primary
                                    disabled={!dataElementForm.name || !dataElementForm.code}
                                    onClick={() => {
                                        if (!dataElementForm.name || !dataElementForm.code) {
                                            return
                                        }

                                        if (editingDataElement) {
                                            // Update existing data element
                                            const updatedDataElement = {
                                                ...editingDataElement,
                                                ...dataElementForm,
                                                updatedAt: new Date().toISOString()
                                            }

                                            setAvailableCustomDataElements(availableCustomDataElements.map(de =>
                                                de.id === editingDataElement.id ? updatedDataElement : de
                                            ))
                                        } else {
                                            // Create new data element
                                            const newDataElement = {
                                                id: generateUID(),
                                                ...dataElementForm,
                                                createdAt: new Date().toISOString(),
                                                isCustom: true
                                            }

                                            setAvailableCustomDataElements([...availableCustomDataElements, newDataElement])
                                            setSelectedDataElements([...selectedDataElements, newDataElement])
                                        }

                                        // Close modal and reset form
                                        setDataElementModalOpen(false)
                                        setEditingDataElement(null)
                                        setDataElementModalTab('element')
                                        setDataElementForm({
                                            name: '',
                                            code: '',
                                            description: '',
                                            valueType: 'TEXT',
                                            categoryCombo: 'default',
                                            aggregationType: 'SUM',
                                            domainType: 'AGGREGATE',
                                            zeroIsSignificant: false
                                        })
                                    }}
                                >
                                    {editingDataElement ? i18n.t('Update Data Element') : i18n.t('Create Data Element')}
                                </Button>
                            </ButtonStrip>
                        </ModalActions>
                    </div>
                </Modal>
            )}

            {/* Category Option Creation Modal */}
            {categoryOptionModalOpen && (
                <Modal
                    position="middle"
                    onClose={() => {
                        setCategoryOptionModalOpen(false)
                        setEditingCategoryOption(null)
                        setCategoryOptionForm({ name: '', code: '', description: '' })
                    }}
                >
                    <ModalTitle style={{ backgroundColor: 'white' }}>
                        {editingCategoryOption ? i18n.t('Edit Category Option') : i18n.t('Create Category Option')}
                    </ModalTitle>
                    <ModalContent style={{ backgroundColor: 'white' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <InputField
                                label={i18n.t('Name')}
                                value={categoryOptionForm.name}
                                onChange={({ value }) => setCategoryOptionForm({ ...categoryOptionForm, name: value })}
                                required
                            />
                            <InputField
                                label={i18n.t('Code')}
                                value={categoryOptionForm.code}
                                onChange={({ value }) => setCategoryOptionForm({ ...categoryOptionForm, code: value })}
                                required
                            />
                        </div>
                        <TextAreaField
                            label={i18n.t('Description')}
                            value={categoryOptionForm.description}
                            onChange={({ value }) => setCategoryOptionForm({ ...categoryOptionForm, description: value })}
                            rows={3}
                        />
                    </ModalContent>
                    <ModalActions style={{ backgroundColor: 'white' }}>
                        <ButtonStrip>
                            <Button secondary onClick={() => {
                                setCategoryOptionModalOpen(false)
                                setEditingCategoryOption(null)
                                setCategoryOptionForm({ name: '', code: '', description: '' })
                            }}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button
                                primary
                                disabled={!categoryOptionForm.name || !categoryOptionForm.code}
                                onClick={handleCreateCategoryOption}
                            >
                                {editingCategoryOption ? i18n.t('Update') : i18n.t('Create')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}

            {/* Category Creation Modal */}
            {categoryModalOpen && (
                <Modal
                    large
                    position="middle"
                    onClose={() => {
                        setCategoryModalOpen(false)
                        setEditingCategory(null)
                        setCategoryForm({ name: '', code: '', description: '', categoryOptions: [] })
                    }}
                >
                    <ModalTitle style={{ backgroundColor: 'white' }}>
                        {editingCategory ? i18n.t('Edit Category') : i18n.t('Create Category')}
                    </ModalTitle>
                    <ModalContent style={{ backgroundColor: 'white' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <InputField
                                label={i18n.t('Name')}
                                value={categoryForm.name}
                                onChange={({ value }) => setCategoryForm({ ...categoryForm, name: value })}
                                required
                            />
                            <InputField
                                label={i18n.t('Code')}
                                value={categoryForm.code}
                                onChange={({ value }) => setCategoryForm({ ...categoryForm, code: value })}
                                required
                            />
                        </div>
                        <TextAreaField
                            label={i18n.t('Description')}
                            value={categoryForm.description}
                            onChange={({ value }) => setCategoryForm({ ...categoryForm, description: value })}
                            rows={3}
                            style={{ marginBottom: '16px' }}
                        />
                        <MultiSelectField
                            label={i18n.t('Category Options')}
                            selected={categoryForm.categoryOptions.map(opt => opt.id || opt)}
                            onChange={({ selected }) => {
                                const allOptions = [...categoryOptions, ...availableCustomCategoryOptions]
                                const selectedOptions = selected.map(id =>
                                    allOptions.find(opt => opt.id === id) || { id }
                                )
                                setCategoryForm({ ...categoryForm, categoryOptions: selectedOptions })
                            }}
                        >
                            {[...categoryOptions, ...availableCustomCategoryOptions].map(option => (
                                <MultiSelectOption key={option.id} value={option.id} label={option.name} />
                            ))}
                        </MultiSelectField>
                    </ModalContent>
                    <ModalActions style={{ backgroundColor: 'white' }}>
                        <ButtonStrip>
                            <Button secondary onClick={() => {
                                setCategoryModalOpen(false)
                                setEditingCategory(null)
                                setCategoryForm({ name: '', code: '', description: '', categoryOptions: [] })
                            }}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button
                                primary
                                disabled={!categoryForm.name || !categoryForm.code || categoryForm.categoryOptions.length === 0}
                                onClick={handleCreateCategory}
                            >
                                {editingCategory ? i18n.t('Update') : i18n.t('Create')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}

            {/* Category Combination Creation Modal */}
            {categoryComboModalOpen && (
                <Modal
                    large
                    position="middle"
                    onClose={() => {
                        setCategoryComboModalOpen(false)
                        setEditingCategoryCombo(null)
                        setCategoryComboForm({ name: '', code: '', description: '', categories: [] })
                    }}
                >
                    <ModalTitle style={{ backgroundColor: 'white' }}>
                        {editingCategoryCombo ? i18n.t('Edit Category Combination') : i18n.t('Create Category Combination')}
                    </ModalTitle>
                    <ModalContent style={{ backgroundColor: 'white' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <InputField
                                label={i18n.t('Name')}
                                value={categoryComboForm.name}
                                onChange={({ value }) => setCategoryComboForm({ ...categoryComboForm, name: value })}
                                required
                            />
                            <InputField
                                label={i18n.t('Code')}
                                value={categoryComboForm.code}
                                onChange={({ value }) => setCategoryComboForm({ ...categoryComboForm, code: value })}
                                required
                            />
                        </div>
                        <TextAreaField
                            label={i18n.t('Description')}
                            value={categoryComboForm.description}
                            onChange={({ value }) => setCategoryComboForm({ ...categoryComboForm, description: value })}
                            rows={3}
                            style={{ marginBottom: '16px' }}
                        />
                        <MultiSelectField
                            label={i18n.t('Categories')}
                            selected={categoryComboForm.categories.map(cat => cat.id || cat)}
                            onChange={({ selected }) => {
                                const allCategories = [...categories, ...availableCustomCategories]
                                const selectedCategories = selected.map(id =>
                                    allCategories.find(cat => cat.id === id) || { id }
                                )
                                setCategoryComboForm({ ...categoryComboForm, categories: selectedCategories })
                            }}
                        >
                            {[...categories, ...availableCustomCategories].map(category => (
                                <MultiSelectOption key={category.id} value={category.id} label={category.name} />
                            ))}
                        </MultiSelectField>
                    </ModalContent>
                    <ModalActions style={{ backgroundColor: 'white' }}>
                        <ButtonStrip>
                            <Button secondary onClick={() => {
                                setCategoryComboModalOpen(false)
                                setEditingCategoryCombo(null)
                                setCategoryComboForm({ name: '', code: '', description: '', categories: [] })
                            }}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button
                                primary
                                disabled={!categoryComboForm.name || !categoryComboForm.code || categoryComboForm.categories.length === 0}
                                onClick={handleCreateCategoryCombo}
                            >
                                {editingCategoryCombo ? i18n.t('Update') : i18n.t('Create')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </>
    )
}