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
    IconArrowLeft24,
    IconSave24,
    IconEdit24
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

// Import components from CreateAssessmentPage
import { DHIS2Configuration } from '../Metadata/DHIS2Configuration'
import { AssessmentDataSetSelection } from '../../components/AssessmentDataSetSelection'
import { OrganisationUnitManagement } from '../Metadata/OrganisationUnitManagement'
import { OrganizationUnitMapping } from '../Metadata/OrganizationUnitMapping'
import { DatasetPreparation } from '../Metadata/DatasetPreparation'
import ManualMetadataCreation from '../Metadata/ManualMetadataCreation'
import { useTabBasedDataStore } from '../../services/tabBasedDataStoreService'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'
import { useDataEngine } from '@dhis2/app-runtime'
import { useUserAuthorities } from '../../hooks/useUserAuthorities'

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

    // DataStore services
    const { loadAssessment, saveAssessment } = useTabBasedDataStore()
    const { saveAssessment: saveNestedAssessment, loadAssessment: loadNestedAssessment } = useAssessmentDataStore()

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
        objectives: '',
        scope: '',
        methodology: 'automated',
        frequency: 'monthly',
        reportingLevel: 'facility',
        dataQualityDimensions: ['completeness', 'timeliness'],
        stakeholders: [],
        riskFactors: [],
        successCriteria: '',
        confidentialityLevel: 'internal',
        dataRetentionPeriod: '5years',
        publicAccess: false,
        tags: [],
        customFields: {}
    })

    // Other state - matching CreateAssessmentPage
    const [metadataSource, setMetadataSource] = useState(null)
    const [dhis2Config, setDhis2Config] = useState(null)
    const [selectedDataSets, setSelectedDataSets] = useState([])
    const [selectedDataElements, setSelectedDataElements] = useState([])
    const [selectedOrgUnits, setSelectedOrgUnits] = useState([])
    const [orgUnitMappings, setOrgUnitMappings] = useState([])
    const [datasetPreparationComplete, setDatasetPreparationComplete] = useState(false)

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
                    // Try loading from nested structure first
                    try {
                        assessment = await loadNestedAssessment(id)
                        console.log('Loaded nested assessment:', assessment)
                    } catch (nestedError) {
                        console.log('Failed to load nested assessment, trying legacy:', nestedError)
                        // Fallback to legacy structure
                        assessment = await loadAssessment(id)
                        console.log('Loaded legacy assessment:', assessment)
                    }
                }

                if (!assessment) {
                    throw new Error('Assessment not found')
                }

                console.log('Loaded assessment for editing:', assessment)

                // Store original data for comparison
                setOriginalData(assessment)

                // Process assessment data based on structure
                let processedAssessment
                if (assessment.structure === 'nested' && assessment.Info) {
                    // New nested structure
                    processedAssessment = {
                        id: assessment.id,
                        name: assessment.Info.name || '',
                        description: assessment.Info.description || '',
                        assessmentType: assessment.Info.assessmentType || 'baseline',
                        priority: assessment.Info.priority || 'medium',
                        status: assessment.Info.status || 'draft',
                        startDate: assessment.Info.startDate || '',
                        endDate: assessment.Info.endDate || '',
                        baselineAssessmentId: assessment.Info.baselineAssessmentId || '',
                        notifications: assessment.Info.notifications !== undefined ? assessment.Info.notifications : true,
                        autoSync: assessment.Info.autoSync !== undefined ? assessment.Info.autoSync : true,
                        validationAlerts: assessment.Info.validationAlerts !== undefined ? assessment.Info.validationAlerts : false,
                        historicalComparison: assessment.Info.historicalComparison !== undefined ? assessment.Info.historicalComparison : false,
                        objectives: assessment.Info.objectives || '',
                        scope: assessment.Info.scope || '',
                        methodology: assessment.Info.methodology || 'automated',
                        frequency: assessment.Info.frequency || 'monthly',
                        reportingLevel: assessment.Info.reportingLevel || 'facility',
                        dataQualityDimensions: assessment.Info.dataQualityDimensions || assessment.Info.dataDimensionsQuality || ['completeness', 'timeliness'],
                        stakeholders: assessment.Info.stakeholders || [],
                        riskFactors: assessment.Info.riskFactors || [],
                        successCriteria: assessment.Info.successCriteria || '',
                        confidentialityLevel: assessment.Info.confidentialityLevel || 'internal',
                        dataRetentionPeriod: assessment.Info.dataRetentionPeriod || '5years',
                        publicAccess: assessment.Info.publicAccess !== undefined ? assessment.Info.publicAccess : false,
                        tags: assessment.Info.tags || [],
                        customFields: assessment.Info.customFields || {}
                    }

                    // Set metadata source
                    setMetadataSource(assessment.metadataSource || 'manual')

                    // Set DHIS2 config if available
                    if (assessment.Dhis2config?.info) {
                        setDhis2Config(assessment.Dhis2config.info)
                    }

                    // Set selected datasets, data elements, and org units
                    if (assessment.Dhis2config?.datasetsSelected) {
                        const datasets = assessment.Dhis2config.datasetsSelected.map(ds => ds.info || ds)
                        setSelectedDataSets(datasets)

                        // Extract data elements from datasets
                        const allDataElements = []
                        assessment.Dhis2config.datasetsSelected.forEach(ds => {
                            if (ds.dataElements) {
                                allDataElements.push(...ds.dataElements)
                            }
                        })
                        setSelectedDataElements(allDataElements)

                        // Extract org units from datasets
                        const allOrgUnits = []
                        assessment.Dhis2config.datasetsSelected.forEach(ds => {
                            if (ds.organisationUnits) {
                                allOrgUnits.push(...ds.organisationUnits)
                            }
                        })
                        setSelectedOrgUnits(allOrgUnits)
                    }

                    // Set org unit mappings
                    if (assessment.Dhis2config?.orgUnitMapping) {
                        setOrgUnitMappings(assessment.Dhis2config.orgUnitMapping)
                    }

                    // Check if datasets were created
                    if (assessment.localDatasetsCreated && assessment.localDatasetsCreated.length > 0) {
                        setDatasetPreparationComplete(true)
                    }

                } else {
                    // Legacy structure
                    processedAssessment = {
                        id: assessment.id,
                        name: assessment.name || assessment.info?.name || '',
                        description: assessment.description || assessment.info?.description || '',
                        assessmentType: assessment.assessmentType || assessment.info?.assessmentType || 'baseline',
                        priority: assessment.priority || assessment.info?.priority || 'medium',
                        status: assessment.status || assessment.info?.status || 'draft',
                        startDate: assessment.startDate || assessment.info?.startDate || '',
                        endDate: assessment.endDate || assessment.info?.endDate || '',
                        baselineAssessmentId: assessment.baselineAssessmentId || assessment.info?.baselineAssessmentId || '',
                        notifications: assessment.notifications !== undefined ? assessment.notifications : true,
                        autoSync: assessment.autoSync !== undefined ? assessment.autoSync : true,
                        validationAlerts: assessment.validationAlerts !== undefined ? assessment.validationAlerts : false,
                        historicalComparison: assessment.historicalComparison !== undefined ? assessment.historicalComparison : false,
                        objectives: assessment.objectives || assessment.info?.objectives || '',
                        scope: assessment.scope || assessment.info?.scope || '',
                        methodology: assessment.methodology || assessment.info?.methodology || 'automated',
                        frequency: assessment.frequency || assessment.info?.frequency || 'monthly',
                        reportingLevel: assessment.reportingLevel || assessment.info?.reportingLevel || 'facility',
                        dataQualityDimensions: assessment.dataQualityDimensions || assessment.info?.dataQualityDimensions || ['completeness', 'timeliness'],
                        stakeholders: assessment.stakeholders || assessment.info?.stakeholders || [],
                        riskFactors: assessment.riskFactors || assessment.info?.riskFactors || [],
                        successCriteria: assessment.successCriteria || assessment.info?.successCriteria || '',
                        confidentialityLevel: assessment.confidentialityLevel || assessment.info?.confidentialityLevel || 'internal',
                        dataRetentionPeriod: assessment.dataRetentionPeriod || assessment.info?.dataRetentionPeriod || '5years',
                        publicAccess: assessment.publicAccess !== undefined ? assessment.publicAccess : false,
                        tags: assessment.tags || assessment.info?.tags || [],
                        customFields: assessment.customFields || assessment.info?.customFields || {}
                    }

                    // Set metadata source
                    setMetadataSource(assessment.metadataSource || (assessment.dhis2Config?.baseUrl ? 'dhis2' : 'manual'))

                    // Set DHIS2 config if available
                    if (assessment.dhis2Config) {
                        setDhis2Config(assessment.dhis2Config)
                    }

                    // Set selected datasets, data elements, and org units from legacy structure
                    if (assessment.datasets?.selected) {
                        setSelectedDataSets(assessment.datasets.selected)
                    }
                    if (assessment.dataElements?.selected) {
                        setSelectedDataElements(assessment.dataElements.selected)
                    }
                    if (assessment.orgUnits?.selected) {
                        setSelectedOrgUnits(assessment.orgUnits.selected)
                    }
                    if (assessment.orgUnitMapping?.mappings) {
                        setOrgUnitMappings(assessment.orgUnitMapping.mappings)
                    }

                    // Check if datasets were created
                    if (assessment.localDatasets?.info?.creationStatus === 'completed') {
                        setDatasetPreparationComplete(true)
                    }
                }

                setAssessmentData(processedAssessment)

                // Mark all tabs as visited since we're editing
                setVisitedTabs(new Set(tabs.map(tab => tab.id)))

            } catch (error) {
                console.error('Error loading assessment:', error)
                setError(`Failed to load assessment: ${error.message}`)
            } finally {
                setLoading(false)
            }
        }

        loadAssessmentData()
    }, [id, location.state])

    // Save assessment function
    const handleSaveAssessment = async () => {
        try {
            setSaving(true)
            setError(null)

            console.log('🚀 Starting assessment update...')

            if (!assessmentData.name?.trim()) {
                throw new Error('Assessment name is required')
            }

            const currentTime = new Date().toISOString()

            // Create updated assessment structure using the nested format
            const updatedAssessment = {
                id: id,
                version: '3.0.0',
                structure: 'nested',
                createdAt: originalData?.createdAt || currentTime,
                lastUpdated: currentTime,
                metadataSource: metadataSource,

                Info: {
                    ...assessmentData,
                    lastModifiedBy: userInfo ? {
                        id: userInfo.id || 'unknown',
                        username: userInfo.username || 'unknown',
                        displayName: userInfo.displayName || userInfo.username || 'Unknown User',
                        email: userInfo.email || ''
                    } : null
                },

                Dhis2config: {
                    info: dhis2Config || {},
                    datasetsSelected: selectedDataSets.map(ds => ({
                        info: ds,
                        dataElements: selectedDataElements.filter(de =>
                            ds.dataSetElements?.some(dse => dse.dataElement.id === de.id)
                        ),
                        organisationUnits: selectedOrgUnits
                    })),
                    orgUnitMapping: orgUnitMappings
                },

                localDatasetsCreated: datasetPreparationComplete ? [{
                    info: { status: 'updated', count: 4, lastModified: currentTime },
                    dataElements: selectedDataElements,
                    orgUnits: selectedOrgUnits
                }] : []
            }

            console.log('💾 Saving updated assessment to dataStore...')
            const savedAssessment = await saveNestedAssessment(updatedAssessment)

            console.log('✅ Assessment updated successfully:', savedAssessment.id || savedAssessment.Info?.id)

            setSuccessMessage(`Assessment "${assessmentData.name}" updated successfully`)
            setHasUnsavedChanges(false)

            // Navigate back to assessments list after a short delay
            setTimeout(() => {
                navigate('/administration/assessments', {
                    state: {
                        message: `Assessment "${assessmentData.name}" updated successfully`
                    }
                })
            }, 2000)

        } catch (error) {
            console.error('❌ Error updating assessment:', error)
            setError(`Failed to update assessment: ${error.message || 'Unknown error'}`)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setSaving(false)
        }
    }

    // Tab validation function
    const isTabValid = (tabId) => {
        switch (tabId) {
            case 'details':
                return assessmentData.name &&
                    assessmentData.startDate &&
                    assessmentData.endDate &&
                    assessmentData.methodology &&
                    assessmentData.frequency &&
                    assessmentData.reportingLevel &&
                    assessmentData.dataQualityDimensions.length > 0 &&
                    (assessmentData.assessmentType !== 'followup' || assessmentData.baselineAssessmentId) &&
                    metadataSource

            case 'connection':
                return metadataSource === 'manual' || (dhis2Config?.baseUrl && dhis2Config?.username)

            case 'datasets':
                return selectedDataSets.length > 0

            case 'elements':
                return selectedDataElements.length > 0

            case 'units':
                return selectedOrgUnits.length > 0

            case 'mapping':
                return metadataSource === 'manual' || orgUnitMappings.length > 0

            case 'preparation':
                return datasetPreparationComplete

            case 'review':
                return true // Review tab is always valid if reached

            default:
                return true
        }
    }

    // Tab navigation function
    const handleTabChange = (tabId) => {
        const tabIndex = tabs.findIndex(tab => tab.id === tabId)

        // Check if all previous tabs are valid
        for (let i = 0; i < tabIndex; i++) {
            if (!isTabValid(tabs[i].id)) {
                setError(`Please complete the "${tabs[i].label}" step before proceeding.`)
                return
            }
        }

        setActiveTab(tabId)
        setVisitedTabs(prev => new Set([...prev, tabId]))
        setError(null)
    }

    // Handle data changes to track unsaved changes
    const handleDataChange = (field, value) => {
        setAssessmentData(prev => ({ ...prev, [field]: value }))
        setHasUnsavedChanges(true)
    }

    // Render tab content (copy from CreateAssessmentPage and modify as needed)
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
                            {i18n.t('Edit Assessment Details')}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <InputField
                                label={i18n.t('Assessment Name')}
                                placeholder={i18n.t('Enter assessment name')}
                                value={assessmentData.name}
                                onChange={({ value }) => handleDataChange('name', value)}
                                required
                            />
                            <SingleSelectField
                                label={i18n.t('Assessment Type')}
                                selected={assessmentData.assessmentType}
                                onChange={({ selected }) => handleDataChange('assessmentType', selected)}
                            >
                                {assessmentTypes.map(type => (
                                    <SingleSelectOption key={type.value} value={type.value} label={type.label} />
                                ))}
                            </SingleSelectField>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <TextAreaField
                                label={i18n.t('Description')}
                                placeholder={i18n.t('Enter assessment description')}
                                value={assessmentData.description}
                                onChange={({ value }) => handleDataChange('description', value)}
                                rows={3}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <SingleSelectField
                                label={i18n.t('Priority')}
                                selected={assessmentData.priority}
                                onChange={({ selected }) => handleDataChange('priority', selected)}
                            >
                                {priorities.map(priority => (
                                    <SingleSelectOption key={priority.value} value={priority.value} label={priority.label} />
                                ))}
                            </SingleSelectField>
                            <SingleSelectField
                                label={i18n.t('Methodology')}
                                selected={assessmentData.methodology}
                                onChange={({ selected }) => handleDataChange('methodology', selected)}
                            >
                                {methodologies.map(methodology => (
                                    <SingleSelectOption key={methodology.value} value={methodology.value} label={methodology.label} />
                                ))}
                            </SingleSelectField>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <InputField
                                label={i18n.t('Start Date')}
                                type="date"
                                value={assessmentData.startDate}
                                onChange={({ value }) => handleDataChange('startDate', value)}
                                required
                            />
                            <InputField
                                label={i18n.t('End Date')}
                                type="date"
                                value={assessmentData.endDate}
                                onChange={({ value }) => handleDataChange('endDate', value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <SingleSelectField
                                label={i18n.t('Frequency')}
                                selected={assessmentData.frequency}
                                onChange={({ selected }) => handleDataChange('frequency', selected)}
                            >
                                {frequencies.map(frequency => (
                                    <SingleSelectOption key={frequency.value} value={frequency.value} label={frequency.label} />
                                ))}
                            </SingleSelectField>
                            <SingleSelectField
                                label={i18n.t('Reporting Level')}
                                selected={assessmentData.reportingLevel}
                                onChange={({ selected }) => handleDataChange('reportingLevel', selected)}
                            >
                                <SingleSelectOption value="facility" label={i18n.t('Facility')} />
                                <SingleSelectOption value="district" label={i18n.t('District')} />
                                <SingleSelectOption value="region" label={i18n.t('Region')} />
                                <SingleSelectOption value="national" label={i18n.t('National')} />
                            </SingleSelectField>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <MultiSelectField
                                label={i18n.t('Data Quality Dimensions')}
                                selected={assessmentData.dataQualityDimensions}
                                onChange={({ selected }) => handleDataChange('dataQualityDimensions', selected)}
                            >
                                {dataQualityDimensions.map(dimension => (
                                    <MultiSelectOption key={dimension.value} value={dimension.value} label={dimension.label} />
                                ))}
                            </MultiSelectField>
                        </div>

                        {/* Metadata Source Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '500' }}>
                                {i18n.t('Metadata Source')}
                            </h4>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{
                                    padding: '16px',
                                    border: metadataSource === 'manual' ? '2px solid #0d7377' : '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: metadataSource === 'manual' ? '#f0f8ff' : 'white'
                                }} onClick={() => setMetadataSource('manual')}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <input
                                            type="radio"
                                            checked={metadataSource === 'manual'}
                                            onChange={() => setMetadataSource('manual')}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <strong>{i18n.t('Manual/Local Metadata')}</strong>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                                        {i18n.t('Create and manage metadata locally within DQA360')}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '16px',
                                    border: metadataSource === 'dhis2' ? '2px solid #0d7377' : '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: metadataSource === 'dhis2' ? '#f0f8ff' : 'white'
                                }} onClick={() => setMetadataSource('dhis2')}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <input
                                            type="radio"
                                            checked={metadataSource === 'dhis2'}
                                            onChange={() => setMetadataSource('dhis2')}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <strong>{i18n.t('External DHIS2 Instance')}</strong>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                                        {i18n.t('Connect to and import metadata from an external DHIS2 instance')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 'connection':
                if (metadataSource !== 'dhis2') {
                    return (
                        <div style={{ padding: '24px', textAlign: 'center' }}>
                            <h3>{i18n.t('DHIS2 Connection Not Required')}</h3>
                            <p>{i18n.t('You have selected manual metadata management. No external connection is needed.')}</p>
                        </div>
                    )
                }
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <DHIS2Configuration
                            onConfigurationChange={setDhis2Config}
                            initialConfig={dhis2Config}
                        />
                    </div>
                )

            case 'datasets':
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <AssessmentDataSetSelection
                            dhis2Config={dhis2Config}
                            metadataSource={metadataSource}
                            selectedDataSets={selectedDataSets}
                            onDataSetsChange={setSelectedDataSets}
                            onAutoPopulateDataElements={(dataElements) => {
                                setSelectedDataElements(dataElements)
                                setVisitedTabs(prev => new Set([...prev, 'elements']))
                            }}
                        />
                    </div>
                )

            case 'elements':
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
                            {i18n.t('Select Data Elements')}
                        </h3>
                        <p style={{ marginBottom: '20px', color: '#666' }}>
                            {i18n.t('Choose the data elements you want to include in your assessment.')}
                        </p>
                        {/* Data elements selection component would go here */}
                        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <p>{i18n.t('Selected Data Elements')}: {selectedDataElements.length}</p>
                            {selectedDataElements.slice(0, 5).map((element, index) => (
                                <div key={index} style={{ marginBottom: '8px' }}>
                                    <Tag>{element.name || element.displayName}</Tag>
                                </div>
                            ))}
                            {selectedDataElements.length > 5 && (
                                <p style={{ fontStyle: 'italic', color: '#666' }}>
                                    {i18n.t('... and {{count}} more', { count: selectedDataElements.length - 5 })}
                                </p>
                            )}
                        </div>
                    </div>
                )

            case 'units':
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <OrganisationUnitManagement
                            dhis2Config={dhis2Config}
                            metadataSource={metadataSource}
                            selectedOrgUnits={selectedOrgUnits}
                            onOrgUnitsChange={setSelectedOrgUnits}
                        />
                    </div>
                )

            case 'mapping':
                if (metadataSource === 'manual') {
                    return (
                        <div style={{ padding: '24px', textAlign: 'center' }}>
                            <h3>{i18n.t('Organisation Unit Mapping Not Required')}</h3>
                            <p>{i18n.t('You are using manual metadata management. No mapping is needed.')}</p>
                        </div>
                    )
                }
                return (
                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <OrganizationUnitMapping
                            dhis2Config={dhis2Config}
                            selectedOrgUnits={selectedOrgUnits}
                            orgUnitMappings={orgUnitMappings}
                            onMappingsChange={setOrgUnitMappings}
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
                            onPreparationComplete={(isComplete) => {
                                console.log('Dataset preparation completed:', isComplete)
                                setDatasetPreparationComplete(isComplete)
                                if (isComplete) {
                                    // Auto-navigate to review step after successful preparation
                                    setActiveTab('review')
                                    setVisitedTabs(prev => new Set([...prev, 'review']))
                                }
                            }}
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
                                // Auto-navigate to review step after dataset preparation
                                setActiveTab('review')
                                setVisitedTabs(prev => new Set([...prev, 'review']))
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
                            {i18n.t('Review & Update Assessment')}
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
                                        <div>
                                            <strong>{i18n.t('Dataset Preparation')}:</strong>
                                            <Tag positive={datasetPreparationComplete} negative={!datasetPreparationComplete}>
                                                {datasetPreparationComplete ? i18n.t('Complete') : i18n.t('Pending')}
                                            </Tag>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Datastore Structure Preview */}
                        <div style={{ marginBottom: '24px' }}>
                            <Card>
                                <div style={{ padding: '20px' }}>
                                    <h4 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>
                                        {i18n.t('Updated Assessment Datastore Structure Preview')}
                                    </h4>
                                    <div style={{
                                        backgroundColor: '#f8f9fa',
                                        padding: '16px',
                                        borderRadius: '4px',
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        maxHeight: '300px',
                                        overflowY: 'auto'
                                    }}>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify({
    id: id,
    version: '3.0.0',
    structure: 'nested',
    metadataSource: metadataSource,
    lastUpdated: new Date().toISOString(),
    Info: {
        name: assessmentData.name,
        description: assessmentData.description,
        assessmentType: assessmentData.assessmentType,
        priority: assessmentData.priority,
        methodology: assessmentData.methodology,
        frequency: assessmentData.frequency,
        startDate: assessmentData.startDate,
        endDate: assessmentData.endDate,
        status: assessmentData.status || 'draft'
    },
    Dhis2config: {
        info: dhis2Config || {},
        datasetsSelected: selectedDataSets.map(ds => ({
            info: { id: ds.id, name: ds.name },
            dataElements: selectedDataElements.filter(de =>
                ds.dataSetElements?.some(dse => dse.dataElement.id === de.id)
            ).slice(0, 3),
            organisationUnits: selectedOrgUnits.slice(0, 3)
        })).slice(0, 2),
        orgUnitMapping: orgUnitMappings.slice(0, 3)
    },
    localDatasetsCreated: datasetPreparationComplete ? [{
        info: { status: 'updated', count: 4 },
        dataElements: selectedDataElements.slice(0, 3),
        orgUnits: selectedOrgUnits.slice(0, 3)
    }] : []
}, null, 2)}
                                        </pre>
                                    </div>
                                    <div style={{ marginTop: '12px', fontSize: '14px', color: '#6c757d' }}>
                                        {i18n.t('This preview shows the updated structure that will be saved to the datastore. Full data will include all selected items.')}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <ButtonStrip>
                            <Button
                                secondary
                                onClick={() => navigate('/administration/assessments')}
                            >
                                {i18n.t('Cancel')}
                            </Button>
                            <Button
                                primary
                                large
                                onClick={handleSaveAssessment}
                                disabled={saving}
                            >
                                {saving ? <CircularLoader small /> : null}
                                {saving ? i18n.t('Updating...') : i18n.t('Update Assessment')}
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

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px',
                flexDirection: 'column'
            }}>
                <CircularLoader large />
                <p style={{ marginTop: '16px', color: '#666' }}>
                    {i18n.t('Loading assessment...')}
                </p>
            </div>
        )
    }

    return (
        <div style={{ padding: '20px', maxWidth: '100%', margin: '0 auto' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e0e0e0'
            }}>
                <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: '#2c3e50' }}>
                        {i18n.t('Edit Assessment')}
                    </h1>
                    <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
                        {assessmentData.name || i18n.t('Loading assessment...')}
                    </p>
                </div>
                <Button
                    secondary
                    onClick={() => navigate('/administration/assessments')}
                    icon={<IconArrowLeft24 />}
                >
                    {i18n.t('Back to Assessments')}
                </Button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div style={{ marginBottom: '20px' }}>
                    <NoticeBox valid title={i18n.t('Success')}>
                        {successMessage}
                    </NoticeBox>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{ marginBottom: '20px' }}>
                    <NoticeBox error title={i18n.t('Error')}>
                        {error}
                    </NoticeBox>
                </div>
            )}

            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
                <div style={{ marginBottom: '20px' }}>
                    <NoticeBox warning title={i18n.t('Unsaved Changes')}>
                        {i18n.t('You have unsaved changes. Make sure to save your work before leaving this page.')}
                    </NoticeBox>
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ marginBottom: '24px' }}>
                <TabBar>
                    {tabs.map(tab => (
                        <Tab
                            key={tab.id}
                            selected={activeTab === tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            disabled={!visitedTabs.has(tab.id) && tab.id !== 'details'}
                        >
                            {tab.label}
                            {isTabValid(tab.id) && visitedTabs.has(tab.id) && (
                                <span style={{ marginLeft: '8px', color: '#4caf50' }}>✓</span>
                            )}
                        </Tab>
                    ))}
                </TabBar>
            </div>

            {/* Tab Content */}
            <Card>
                {renderTabContent()}
            </Card>
        </div>
    )
}