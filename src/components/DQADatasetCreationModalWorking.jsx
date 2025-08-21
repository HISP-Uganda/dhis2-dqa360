import React, { useState, useEffect } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    ButtonStrip,
    CircularLoader,
    NoticeBox,
    LinearLoader,
    Box,
    Checkbox,
    Tab,
    TabBar,
    Tag
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

// Utility function to generate DHIS2 UIDs
const generateUID = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 11; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Generate short alphanumeric codes
const generateCode = (prefix = '', length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = prefix
    for (let i = 0; i < length - prefix.length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// DQA Data Elements Templates
const DQA_DATA_ELEMENTS_TEMPLATES = {
    register: [
        {
            name: 'Facilities Assessed',
            code: 'FAC_ASSESSED',
            shortName: 'Facilities Assessed',
            description: 'Number of facilities assessed in DQA',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'Data Elements Reviewed',
            code: 'DE_REVIEWED',
            shortName: 'Data Elements Reviewed',
            description: 'Number of data elements reviewed in DQA',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'Assessment Status',
            code: 'ASSESSMENT_STATUS',
            shortName: 'Assessment Status',
            description: 'Current status of the assessment',
            valueType: 'TEXT',
            aggregationType: 'NONE'
        }
    ],
    summary: [
        {
            name: 'Overall Score',
            code: 'OVERALL_SCORE',
            shortName: 'Overall Score',
            description: 'Overall DQA score percentage',
            valueType: 'PERCENTAGE',
            aggregationType: 'AVERAGE'
        },
        {
            name: 'Completeness Rate',
            code: 'COMPLETENESS_RATE',
            shortName: 'Completeness Rate',
            description: 'Data completeness rate percentage',
            valueType: 'PERCENTAGE',
            aggregationType: 'AVERAGE'
        },
        {
            name: 'Timeliness Rate',
            code: 'TIMELINESS_RATE',
            shortName: 'Timeliness Rate',
            description: 'Data timeliness rate percentage',
            valueType: 'PERCENTAGE',
            aggregationType: 'AVERAGE'
        }
    ],
    reported: [
        {
            name: 'Issues Identified',
            code: 'ISSUES_IDENTIFIED',
            shortName: 'Issues Identified',
            description: 'Number of data quality issues identified',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'Recommendations Made',
            code: 'RECOMMENDATIONS',
            shortName: 'Recommendations Made',
            description: 'Number of recommendations made',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'Data Verification Status',
            code: 'VERIFICATION_STATUS',
            shortName: 'Verification Status',
            description: 'Status of data verification process',
            valueType: 'TEXT',
            aggregationType: 'NONE'
        }
    ],
    corrected: [
        {
            name: 'Issues Resolved',
            code: 'ISSUES_RESOLVED',
            shortName: 'Issues Resolved',
            description: 'Number of data quality issues resolved',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'Improvement Actions',
            code: 'IMPROVEMENTS',
            shortName: 'Improvement Actions',
            description: 'Number of improvement actions implemented',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'Correction Status',
            code: 'CORRECTION_STATUS',
            shortName: 'Correction Status',
            description: 'Status of data correction process',
            valueType: 'TEXT',
            aggregationType: 'NONE'
        }
    ]
}

export const DQADatasetCreationModal = ({
    open,
    onClose,
    onComplete,
    dhis2Config,
    selectedOrgUnits = [],
    selectedDataElements = [],
    assessmentName = '',
    assessmentDescription = '',
    metadataSource = 'manual'
}) => {
    const engine = useDataEngine()
    
    // State management
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [progress, setProgress] = useState([])
    const [selectedTab, setSelectedTab] = useState('overview')
    const [reuseExisting, setReuseExisting] = useState(true)
    const [createdMetadata, setCreatedMetadata] = useState(null)
    
    // Extracted metadata from selected data elements
    const [extractedMetadata, setExtractedMetadata] = useState({
        categoryOptions: [],
        categories: [],
        categoryCombos: []
    })

    const addProgress = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        setProgress(prev => [...prev, {
            id: Date.now(),
            message,
            type,
            timestamp
        }])
    }

    // Extract category metadata from selected data elements
    const extractCategoryMetadata = async () => {
        addProgress('🔍 Extracting category metadata from selected data elements...', 'info')
        
        const categoryOptions = new Map()
        const categories = new Map()
        const categoryCombos = new Map()
        
        try {
            // Fetch detailed metadata for selected data elements
            for (const dataElement of selectedDataElements) {
                if (dataElement.categoryCombo && dataElement.categoryCombo.id) {
                    const query = {
                        categoryCombo: {
                            resource: 'categoryCombos',
                            id: dataElement.categoryCombo.id,
                            params: {
                                fields: 'id,name,code,shortName,categories[id,name,code,shortName,categoryOptions[id,name,code,shortName]]'
                            }
                        }
                    }
                    
                    try {
                        const result = await engine.query(query)
                        const categoryCombo = result.categoryCombo
                        
                        // Store category combination
                        if (!categoryCombos.has(categoryCombo.id)) {
                            categoryCombos.set(categoryCombo.id, categoryCombo)
                            addProgress(`  📂 Found category combo: ${categoryCombo.name}`, 'info')
                        }
                        
                        // Extract categories and category options
                        if (categoryCombo.categories) {
                            for (const category of categoryCombo.categories) {
                                if (!categories.has(category.id)) {
                                    categories.set(category.id, category)
                                    addProgress(`    📋 Found category: ${category.name}`, 'info')
                                }
                                
                                if (category.categoryOptions) {
                                    for (const categoryOption of category.categoryOptions) {
                                        if (!categoryOptions.has(categoryOption.id)) {
                                            categoryOptions.set(categoryOption.id, categoryOption)
                                            addProgress(`      🏷️ Found category option: ${categoryOption.name}`, 'info')
                                        }
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        addProgress(`  ⚠️ Could not fetch details for category combo ${dataElement.categoryCombo.id}: ${err.message}`, 'warning')
                    }
                }
            }
            
            const extracted = {
                categoryOptions: Array.from(categoryOptions.values()),
                categories: Array.from(categories.values()),
                categoryCombos: Array.from(categoryCombos.values())
            }
            
            setExtractedMetadata(extracted)
            
            addProgress(`✅ Extracted metadata:`, 'success')
            addProgress(`  - ${extracted.categoryOptions.length} category options`, 'success')
            addProgress(`  - ${extracted.categories.length} categories`, 'success')
            addProgress(`  - ${extracted.categoryCombos.length} category combinations`, 'success')
            
            return extracted
            
        } catch (err) {
            addProgress(`❌ Error extracting category metadata: ${err.message}`, 'error')
            throw err
        }
    }

    // Create data elements using existing category combinations
    const createDataElements = async (existingCategoryCombos) => {
        addProgress('📊 Creating data elements...', 'info')
        const dataElements = {}
        
        // Build map of non-default combos from selected data elements by valueType (best-effort)
        const DEFAULT_CC = 'bjDvmb4bfuf'
        const combosByValueType = {}
        for (const de of (selectedDataElements || [])) {
            const ccId = de?.categoryCombo?.id
            if (ccId && ccId !== DEFAULT_CC && de?.valueType) {
                combosByValueType[de.valueType] = ccId
            }
        }

        // Prefer a non-default category combo if available; fallback to first; else DHIS2 default
        const preferred = existingCategoryCombos.find(cc => cc?.id && cc.id !== DEFAULT_CC)
        const fallbackCombo = preferred || existingCategoryCombos[0] || { id: DEFAULT_CC }
            
        addProgress(`  🔗 Using category combo: ${fallbackCombo.name || 'Default'}`, 'info')
        
        for (const [datasetType, templates] of Object.entries(DQA_DATA_ELEMENTS_TEMPLATES)) {
            dataElements[datasetType] = []
            
            for (const template of templates) {
                // Try to respect original category combo by valueType if available; else fallback
                const ccIdForType = combosByValueType[template.valueType]
                const chosenCcId = ccIdForType || fallbackCombo.id

                const dataElement = {
                    id: generateUID(),
                    name: `${assessmentName} - ${datasetType.charAt(0).toUpperCase() + datasetType.slice(1)} - ${template.name}`,
                    code: `DQA_${generateCode('', 4)}_${datasetType.toUpperCase()}_${template.code}`,
                    shortName: `${datasetType.toUpperCase()} - ${template.shortName}`,
                    description: `${assessmentDescription || assessmentName} - ${template.description}`,
                    valueType: template.valueType,
                    aggregationType: template.aggregationType,
                    domainType: 'AGGREGATE',
                    categoryCombo: { id: chosenCcId },
                    zeroIsSignificant: false
                }
                
                dataElements[datasetType].push(dataElement)
                addProgress(`    ✅ Created: ${dataElement.name}`, 'success')
            }
            
            addProgress(`  📝 ${datasetType.toUpperCase()}: ${dataElements[datasetType].length} data elements`, 'info')
        }
        
        return dataElements
    }

    // Create datasets
    const createDataSets = async (dataElements, categoryCombo) => {
        addProgress('📋 Creating datasets...', 'info')
        const dataSets = {}
        
        const datasetConfigs = {
            register: {
                name: 'Register',
                description: 'Dataset for registering and tracking data quality assessment activities',
                periodType: 'Monthly',
                icon: '📋'
            },
            summary: {
                name: 'Summary', 
                description: 'Dataset for summarizing data quality assessment results and metrics',
                periodType: 'Monthly',
                icon: '📊'
            },
            reported: {
                name: 'Reported',
                description: 'Dataset for reported data values and submission tracking',
                periodType: 'Monthly',
                icon: '📤'
            },
            corrected: {
                name: 'Corrected',
                description: 'Dataset for data corrections and quality improvement actions',
                periodType: 'Monthly',
                icon: '🔧'
            }
        }
        
        for (const [datasetType, config] of Object.entries(datasetConfigs)) {
            const dataSet = {
                id: generateUID(),
                name: `${assessmentName} - ${config.name}`,
                code: `DQA_${generateCode('', 4)}_${datasetType.toUpperCase()}`,
                shortName: `${assessmentName.substring(0, 30)} - ${config.name}`,
                description: `${assessmentDescription || assessmentName} - ${config.description}`,
                periodType: config.periodType,
                categoryCombo: { id: categoryCombo.id },
                dataSetElements: dataElements[datasetType].map(de => ({
                    dataElement: { id: de.id }
                })),
                organisationUnits: selectedOrgUnits.map(ou => ({ id: ou.id })),
                sharing: {
                    public: 'r-------',
                    users: {},
                    userGroups: {}
                }
            }
            
            dataSets[datasetType] = dataSet
            addProgress(`  ✅ Created: ${dataSet.name} with ${dataElements[datasetType].length} elements`, 'success')
        }
        
        return dataSets
    }

    // Import metadata to DHIS2
    const importMetadata = async (metadataPayload) => {
        addProgress('📤 Importing metadata to DHIS2...', 'info')
        
        try {
            const importMutation = {
                resource: 'metadata',
                type: 'create',
                data: metadataPayload,
                params: {
                    importMode: 'COMMIT',
                    identifier: 'UID',
                    importReportMode: 'FULL',
                    preheatCache: false,
                    importStrategy: 'CREATE_AND_UPDATE',
                    atomicMode: 'NONE',
                    mergeMode: 'REPLACE',
                    flushMode: 'AUTO',
                    skipSharing: false,
                    skipValidation: false,
                    async: false
                }
            }
            
            const result = await engine.mutate(importMutation)
            
            if (result.response && (result.response.status === 'OK' || result.response.status === 'WARNING')) {
                addProgress('✅ Metadata imported successfully!', 'success')
                
                // Log import statistics
                if (result.response.stats) {
                    addProgress(`  📊 Import stats: ${result.response.stats.created || 0} created, ${result.response.stats.updated || 0} updated`, 'info')
                }
                
                return result
            } else {
                throw new Error(`Import failed with status: ${result.response?.status || 'Unknown'}`)
            }
            
        } catch (err) {
            addProgress(`❌ Import failed: ${err.message}`, 'error')
            throw err
        }
    }

    // Main metadata creation process
    const handleCreateMetadata = async () => {
        setLoading(true)
        setError(null)
        setProgress([])
        
        try {
            addProgress(`🚀 Starting DQA metadata creation for: ${assessmentName}`, 'info')
            addProgress(`📋 Assessment: ${assessmentName}`, 'info')
            addProgress(`📝 Description: ${assessmentDescription || 'No description provided'}`, 'info')
            addProgress(`🏢 Organization Units: ${selectedOrgUnits.length}`, 'info')
            addProgress(`📊 Source Data Elements: ${selectedDataElements.length}`, 'info')
            addProgress('', 'info')
            
            // Step 1: Extract existing category metadata from selected data elements
            setCurrentStep(1)
            const extractedMeta = await extractCategoryMetadata()
            
            // Step 2: Create Data Elements using existing category combinations
            setCurrentStep(2)
            const dataElements = await createDataElements(extractedMeta.categoryCombos)
            
            // Step 3: Create Data Sets
            setCurrentStep(3)
            const categoryCombo = extractedMeta.categoryCombos.length > 0 
                ? extractedMeta.categoryCombos[0] 
                : { id: 'bjDvmb4bfuf' }
            const dataSets = await createDataSets(dataElements, categoryCombo)
            
            // Step 4: Prepare metadata payload (only new items)
            setCurrentStep(4)
            addProgress('📦 Preparing metadata payload...', 'info')
            
            const metadataPayload = {
                // Include extracted category metadata so referenced custom combos exist locally
                categoryOptions: extractedMeta.categoryOptions || [],
                categories: (extractedMeta.categories || []).map(cat => ({
                    ...cat,
                    // ensure categoryOptions are references by id if nested objects are present
                    categoryOptions: Array.isArray(cat.categoryOptions)
                        ? cat.categoryOptions.map(co => (co?.id ? { id: co.id } : co))
                        : cat.categoryOptions
                })),
                categoryCombos: (extractedMeta.categoryCombos || []).map(cc => ({
                    ...cc,
                    categories: Array.isArray(cc.categories)
                        ? cc.categories.map(c => (c?.id ? { id: c.id } : c))
                        : cc.categories
                })),
                dataElements: Object.values(dataElements).flat(),
                dataSets: Object.values(dataSets)
            }
            
            const totalNew = Object.values(metadataPayload).reduce((sum, arr) => sum + arr.length, 0)
            addProgress(`📊 Payload summary: ${totalNew} new metadata items to create`, 'info')
            
            // Step 5: Import metadata
            setCurrentStep(5)
            if (totalNew > 0) {
                await importMetadata(metadataPayload)
            } else {
                addProgress('ℹ️ No new metadata to import', 'info')
            }
            
            // Store created metadata
            setCreatedMetadata({
                categoryOptions: extractedMeta.categoryOptions,
                categories: extractedMeta.categories,
                categoryCombos: extractedMeta.categoryCombos,
                dataElements,
                dataSets
            })
            
            setCurrentStep(6)
            addProgress('🎉 DQA metadata creation completed successfully!', 'success')
            setSuccess(true)
            
        } catch (err) {
            setError(err.message)
            addProgress(`❌ Error: ${err.message}`, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleComplete = () => {
        onComplete && onComplete({
            success: true,
            metadata: createdMetadata,
            assessmentName,
            assessmentDescription,
            categoryOptions: createdMetadata?.categoryOptions || [],
            categories: createdMetadata?.categories || [],
            categoryCombos: createdMetadata?.categoryCombos || [],
            dataElements: createdMetadata?.dataElements || {},
            datasets: createdMetadata?.dataSets || {},
            summary: {
                categoryOptions: createdMetadata?.categoryOptions?.length || 0,
                categories: createdMetadata?.categories?.length || 0,
                categoryCombos: createdMetadata?.categoryCombos?.length || 0,
                dataElements: Object.values(createdMetadata?.dataElements || {}).reduce((sum, arr) => sum + arr.length, 0),
                datasets: Object.keys(createdMetadata?.dataSets || {}).length
            }
        })
        onClose()
    }

    const renderOverview = () => (
        <Box>
            <h3 style={{ margin: '0 0 16px 0' }}>📋 {i18n.t('DQA Metadata Overview')}</h3>
            
            <Box marginBottom="24px">
                <h4 style={{ margin: '0 0 8px 0', color: '#666' }}>{i18n.t('Assessment Details')}</h4>
                <div><strong>{i18n.t('Name')}:</strong> {assessmentName}</div>
                <div><strong>{i18n.t('Description')}:</strong> {assessmentDescription || i18n.t('No description provided')}</div>
                <div><strong>{i18n.t('Organization Units')}:</strong> {selectedOrgUnits.length}</div>
                <div><strong>{i18n.t('Source Data Elements')}:</strong> {selectedDataElements.length}</div>
            </Box>
            
            <Box marginBottom="24px">
                <h4 style={{ margin: '0 0 8px 0', color: '#666' }}>{i18n.t('Metadata to be Created')}</h4>
                <div>📊 <strong>12</strong> {i18n.t('Data Elements')} (3 per dataset type)</div>
                <div>📋 <strong>4</strong> {i18n.t('Datasets')} (Register, Summary, Reported, Corrected)</div>
                <div>🔗 {i18n.t('Will use existing category combinations from selected data elements')}</div>
            </Box>
            
            <Box marginBottom="16px">
                <Checkbox
                    checked={reuseExisting}
                    onChange={({ checked }) => setReuseExisting(checked)}
                    label={i18n.t('Reuse existing category metadata from selected data elements')}
                />
            </Box>
        </Box>
    )

    const renderExtractedMetadata = () => (
        <Box>
            <h3 style={{ margin: '0 0 16px 0' }}>🔍 {i18n.t('Extracted Category Metadata')}</h3>
            
            {Object.entries(extractedMetadata).map(([type, items]) => (
                <Box key={type} marginBottom="16px">
                    <h4 style={{ margin: '0 0 8px 0', textTransform: 'capitalize' }}>
                        {type.replace(/([A-Z])/g, ' $1').trim()}: {items.length} {i18n.t('items')}
                    </h4>
                    {items.length > 0 ? (
                        <Box style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '8px' }}>
                            {items.map(item => (
                                <div key={item.id} style={{ fontSize: '12px', marginBottom: '4px' }}>
                                    <Tag small>{item.code}</Tag> {item.name}
                                </div>
                            ))}
                        </Box>
                    ) : (
                        <div style={{ color: '#666', fontSize: '14px' }}>{i18n.t('No items found - will use DHIS2 defaults')}</div>
                    )}
                </Box>
            ))}
        </Box>
    )

    const renderProgress = () => (
        <Box>
            <h3 style={{ margin: '0 0 16px 0' }}>⚡ {i18n.t('Creation Progress')}</h3>
            
            {loading && (
                <Box marginBottom="16px">
                    <LinearLoader amount={currentStep * 16.67} />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {i18n.t('Step {{current}} of 6', { current: currentStep })}
                    </div>
                </Box>
            )}
            
            <Box style={{ 
                maxHeight: '400px', 
                overflowY: 'auto', 
                border: '1px solid #e0e0e0', 
                borderRadius: '4px', 
                padding: '12px',
                backgroundColor: '#f8f9fa',
                fontFamily: 'monospace',
                fontSize: '12px'
            }}>
                {progress.map(item => (
                    <div key={item.id} style={{ 
                        marginBottom: '4px',
                        color: item.type === 'error' ? '#d32f2f' : item.type === 'success' ? '#2e7d32' : '#666'
                    }}>
                        <span style={{ color: '#999' }}>[{item.timestamp}]</span> {item.message}
                    </div>
                ))}
                {progress.length === 0 && (
                    <div style={{ color: '#999', fontStyle: 'italic' }}>
                        {i18n.t('Progress will be shown here during creation...')}
                    </div>
                )}
            </Box>
        </Box>
    )

    if (!open) return null

    return (
        <Modal large onClose={onClose}>
            <ModalTitle>
                🏗️ {i18n.t('DQA Dataset Creation')}
            </ModalTitle>
            
            <ModalContent>
                <Box>
                    <TabBar>
                        <Tab 
                            selected={selectedTab === 'overview'} 
                            onClick={() => setSelectedTab('overview')}
                        >
                            {i18n.t('Overview')}
                        </Tab>
                        <Tab 
                            selected={selectedTab === 'extracted'} 
                            onClick={() => setSelectedTab('extracted')}
                        >
                            {i18n.t('Category Metadata')}
                        </Tab>
                        <Tab 
                            selected={selectedTab === 'progress'} 
                            onClick={() => setSelectedTab('progress')}
                        >
                            {i18n.t('Progress')}
                        </Tab>
                    </TabBar>
                    
                    <Box marginTop="16px">
                        {selectedTab === 'overview' && renderOverview()}
                        {selectedTab === 'extracted' && renderExtractedMetadata()}
                        {selectedTab === 'progress' && renderProgress()}
                    </Box>
                    
                    {error && (
                        <Box marginTop="16px">
                            <NoticeBox error title={i18n.t('Error')}>
                                {error}
                            </NoticeBox>
                        </Box>
                    )}
                    
                    {success && (
                        <Box marginTop="16px">
                            <NoticeBox valid title={i18n.t('Success')}>
                                {i18n.t('DQA metadata has been created successfully!')}
                            </NoticeBox>
                        </Box>
                    )}
                </Box>
            </ModalContent>
            
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={onClose}>
                        {i18n.t('Cancel')}
                    </Button>
                    
                    {!success && (
                        <Button 
                            primary 
                            onClick={handleCreateMetadata}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <CircularLoader small />
                                    {i18n.t('Creating...')}
                                </>
                            ) : (
                                i18n.t('Create DQA Datasets')
                            )}
                        </Button>
                    )}
                    
                    {success && (
                        <Button primary onClick={handleComplete}>
                            {i18n.t('Complete & Continue')}
                        </Button>
                    )}
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}