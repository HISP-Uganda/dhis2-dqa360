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
    Tag,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell
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
    const [currentStep, setCurrentStep] = useState(0)
    const [progress, setProgress] = useState([])
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [selectedTab, setSelectedTab] = useState('overview')
    const [reuseExisting, setReuseExisting] = useState(true)
    
    // Metadata state
    const [existingMetadata, setExistingMetadata] = useState({
        categoryOptions: [],
        categories: [],
        categoryCombos: [],
        dataElements: [],
        dataSets: []
    })
    
    const [createdMetadata, setCreatedMetadata] = useState({
        categoryOptions: [],
        categories: [],
        categoryCombos: [],
        dataElements: [],
        dataSets: []
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

    // Fetch existing metadata for reuse checking
    const fetchExistingMetadata = async () => {
        addProgress('🔍 Checking existing metadata...', 'info')
        
        try {
            const queries = {
                categoryOptions: {
                    resource: 'categoryOptions',
                    params: {
                        fields: 'id,name,code,shortName',
                        pageSize: 1000
                    }
                },
                categories: {
                    resource: 'categories',
                    params: {
                        fields: 'id,name,code,shortName',
                        pageSize: 1000
                    }
                },
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code,shortName',
                        pageSize: 1000
                    }
                },
                dataElements: {
                    resource: 'dataElements',
                    params: {
                        fields: 'id,name,code,shortName',
                        pageSize: 1000
                    }
                },
                dataSets: {
                    resource: 'dataSets',
                    params: {
                        fields: 'id,name,code,shortName',
                        pageSize: 1000
                    }
                }
            }
            
            const results = await engine.query(queries)
            
            setExistingMetadata({
                categoryOptions: results.categoryOptions?.categoryOptions || [],
                categories: results.categories?.categories || [],
                categoryCombos: results.categoryCombos?.categoryCombos || [],
                dataElements: results.dataElements?.dataElements || [],
                dataSets: results.dataSets?.dataSets || []
            })
            
            addProgress(`✅ Found existing metadata: ${results.dataElements?.dataElements?.length || 0} data elements, ${results.dataSets?.dataSets?.length || 0} datasets`, 'success')
            
        } catch (err) {
            addProgress(`⚠️ Could not fetch existing metadata: ${err.message}`, 'warning')
        }
    }

    // Get category combo from source (local or external)
    const getCategoryComboFromSource = async (categoryComboId) => {
        const isExternalInstance = dhis2Config && dhis2Config.baseUrl && dhis2Config.username && dhis2Config.password
        
        if (isExternalInstance) {
            // External DHIS2 instance
            try {
                const response = await fetch(`${dhis2Config.baseUrl}/api/categoryCombos/${categoryComboId}?fields=id,name,code,shortName,categories[id,name,code,shortName,categoryOptions[id,name,code,shortName]]`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${btoa(`${dhis2Config.username}:${dhis2Config.password}`)}`,
                        'Content-Type': 'application/json'
                    }
                })

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }

                return await response.json()
            } catch (error) {
                addProgress(`❌ Error fetching category combo from external instance: ${error.message}`, 'error')
                throw error
            }
        } else {
            // Local DHIS2 instance
            try {
                const result = await engine.query({
                    categoryCombo: {
                        resource: 'categoryCombos',
                        id: categoryComboId,
                        params: {
                            fields: 'id,name,code,shortName,categories[id,name,code,shortName,categoryOptions[id,name,code,shortName]]'
                        }
                    }
                })
                return result.categoryCombo
            } catch (error) {
                addProgress(`❌ Error fetching category combo from local instance: ${error.message}`, 'error')
                throw error
            }
        }
    }

    // Create data elements
    const createDataElements = async () => {
        addProgress('📊 Creating data elements...', 'info')
        const dataElements = {}
        
        // Build a preferred category combo: pick any non-default from selected DEs; fallback to first; else default
        const DEFAULT_CC = 'bjDvmb4bfuf'
        let categoryCombo = { id: DEFAULT_CC }
        if (selectedDataElements.length > 0) {
            // Prioritize a non-default id
            const nonDefault = selectedDataElements.find(de => de?.categoryCombo?.id && de.categoryCombo.id !== DEFAULT_CC)
            const first = selectedDataElements.find(de => de?.categoryCombo?.id)
            const chosen = nonDefault || first
            if (chosen) {
                try {
                    const sourceCombo = await getCategoryComboFromSource(chosen.categoryCombo.id)
                    if (sourceCombo?.id) {
                        categoryCombo = { id: sourceCombo.id }
                        addProgress(`🔗 Using category combo: ${sourceCombo.name || sourceCombo.id}`, 'info')
                    }
                } catch (err) {
                    addProgress(`⚠️ Could not fetch category combo ${chosen.categoryCombo.id}, using default`, 'warning')
                }
            }
        }
        
        for (const [datasetType, templates] of Object.entries(DQA_DATA_ELEMENTS_TEMPLATES)) {
            dataElements[datasetType] = []
            
            for (const template of templates) {
                // Check if already exists
                const existingDE = existingMetadata.dataElements.find(de => 
                    de.name.includes(template.name) && de.name.includes(assessmentName)
                )
                
                if (existingDE && reuseExisting) {
                    addProgress(`  ♻️ Reusing: ${existingDE.name}`, 'info')
                    dataElements[datasetType].push(existingDE)
                    continue
                }
                
                const dataElement = {
                    id: generateUID(),
                    name: `${assessmentName} - ${datasetType.charAt(0).toUpperCase() + datasetType.slice(1)} - ${template.name}`,
                    code: `DQA_${generateCode('', 4)}_${datasetType.toUpperCase()}_${template.code}`,
                    shortName: `${datasetType.toUpperCase()} - ${template.shortName}`,
                    description: `${assessmentDescription || assessmentName} - ${template.description}`,
                    valueType: template.valueType,
                    aggregationType: template.aggregationType,
                    domainType: 'AGGREGATE',
                    categoryCombo: categoryCombo,
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
            // Check if already exists
            const existingDS = existingMetadata.dataSets.find(ds => 
                ds.name.includes(config.name) && ds.name.includes(assessmentName)
            )
            
            if (existingDS && reuseExisting) {
                addProgress(`  ♻️ Reusing: ${existingDS.name}`, 'info')
                dataSets[datasetType] = existingDS
                continue
            }
            
            const dataSet = {
                id: generateUID(),
                name: `${assessmentName} - ${config.name}`,
                code: `DQA_${generateCode('', 4)}_${datasetType.toUpperCase()}`,
                shortName: `${assessmentName.substring(0, 30)} - ${config.name}`,
                description: `${assessmentDescription || assessmentName} - ${config.description}`,
                periodType: config.periodType,
                categoryCombo: categoryCombo,
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
        setCurrentStep(0)
        
        try {
            addProgress(`🚀 Starting DQA metadata creation for: ${assessmentName}`, 'info')
            addProgress(`📋 Assessment: ${assessmentName}`, 'info')
            addProgress(`📝 Description: ${assessmentDescription || 'No description provided'}`, 'info')
            addProgress(`🏢 Organization Units: ${selectedOrgUnits.length}`, 'info')
            addProgress(`📊 Source Data Elements: ${selectedDataElements.length}`, 'info')
            addProgress('', 'info')
            
            // Step 1: Fetch existing metadata
            setCurrentStep(1)
            await fetchExistingMetadata()
            
            // Step 2: Create Data Elements
            setCurrentStep(2)
            const dataElements = await createDataElements()
            
            // Step 3: Create Data Sets
            setCurrentStep(3)
            // If we extracted category combos from selected DEs use non-default where possible
            const extractedCombos = existingMetadata?.categoryCombos || []
            const preferred = extractedCombos.find(cc => cc?.id && cc.id !== 'bjDvmb4bfuf')
            const categoryCombo = preferred || extractedCombos[0] || { id: 'bjDvmb4bfuf' }
            const dataSets = await createDataSets(dataElements, categoryCombo)
            
            // Step 4: Prepare metadata payload
            setCurrentStep(4)
            addProgress('📦 Preparing metadata payload...', 'info')
            
            const newDataElements = Object.values(dataElements).flat().filter(de => !de.id || !existingMetadata.dataElements.find(existing => existing.id === de.id))
            const newDataSets = Object.values(dataSets).filter(ds => !ds.id || !existingMetadata.dataSets.find(existing => existing.id === ds.id))
            
            const metadataPayload = {
                dataElements: newDataElements,
                dataSets: newDataSets
            }
            
            const totalNew = newDataElements.length + newDataSets.length
            addProgress(`📊 Payload summary: ${totalNew} new metadata items to create`, 'info')
            
            // Step 5: Import metadata
            setCurrentStep(5)
            if (totalNew > 0) {
                await importMetadata(metadataPayload)
            } else {
                addProgress('ℹ️ No new metadata to import - all items already exist', 'info')
            }
            
            // Store created metadata
            setCreatedMetadata({
                categoryOptions: [],
                categories: [],
                categoryCombos: [categoryCombo],
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
                <div><strong>{i18n.t('Instance Type')}:</strong> {dhis2Config && dhis2Config.baseUrl ? 'External DHIS2' : 'Local Instance'}</div>
            </Box>
            
            <Box marginBottom="24px">
                <h4 style={{ margin: '0 0 8px 0', color: '#666' }}>{i18n.t('Metadata to be Created')}</h4>
                <div>📊 <strong>12</strong> {i18n.t('Data Elements')} (3 per dataset type)</div>
                <div>📋 <strong>4</strong> {i18n.t('Datasets')} (Register, Summary, Reported, Corrected)</div>
                <div>🔗 {i18n.t('Will use category combinations from selected data elements or default')}</div>
            </Box>
            
            <Box marginBottom="16px">
                <Checkbox
                    checked={reuseExisting}
                    onChange={({ checked }) => setReuseExisting(checked)}
                    label={i18n.t('Reuse existing metadata when possible')}
                />
            </Box>
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

    const renderSummary = () => (
        <Box>
            <h3 style={{ margin: '0 0 16px 0' }}>📊 {i18n.t('Creation Summary')}</h3>
            
            {success && createdMetadata && (
                <Box>
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Metadata Type')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Count')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            <DataTableRow>
                                <DataTableCell>📊 {i18n.t('Data Elements')}</DataTableCell>
                                <DataTableCell>{Object.values(createdMetadata.dataElements || {}).reduce((sum, arr) => sum + arr.length, 0)}</DataTableCell>
                                <DataTableCell><Tag positive>{i18n.t('Created')}</Tag></DataTableCell>
                            </DataTableRow>
                            <DataTableRow>
                                <DataTableCell>📋 {i18n.t('Datasets')}</DataTableCell>
                                <DataTableCell>{Object.keys(createdMetadata.dataSets || {}).length}</DataTableCell>
                                <DataTableCell><Tag positive>{i18n.t('Created')}</Tag></DataTableCell>
                            </DataTableRow>
                            <DataTableRow>
                                <DataTableCell>🏢 {i18n.t('Organization Units')}</DataTableCell>
                                <DataTableCell>{selectedOrgUnits.length}</DataTableCell>
                                <DataTableCell><Tag neutral>{i18n.t('Assigned')}</Tag></DataTableCell>
                            </DataTableRow>
                        </DataTableBody>
                    </DataTable>
                </Box>
            )}
        </Box>
    )

    if (!open) return null

    return (
        <Modal 
            large 
            onClose={onClose}
            style={{ backgroundColor: '#ffffff' }}
        >
            <ModalTitle style={{ backgroundColor: '#ffffff' }}>
                🏗️ {i18n.t('DQA Dataset Creation')}
            </ModalTitle>
            
            <ModalContent style={{ backgroundColor: '#ffffff' }}>
                <Box>
                    <TabBar>
                        <Tab 
                            selected={selectedTab === 'overview'} 
                            onClick={() => setSelectedTab('overview')}
                        >
                            {i18n.t('Overview')}
                        </Tab>
                        <Tab 
                            selected={selectedTab === 'progress'} 
                            onClick={() => setSelectedTab('progress')}
                        >
                            {i18n.t('Progress')}
                        </Tab>
                        <Tab 
                            selected={selectedTab === 'summary'} 
                            onClick={() => setSelectedTab('summary')}
                        >
                            {i18n.t('Summary')}
                        </Tab>
                    </TabBar>
                    
                    <Box marginTop="16px">
                        {selectedTab === 'overview' && renderOverview()}
                        {selectedTab === 'progress' && renderProgress()}
                        {selectedTab === 'summary' && renderSummary()}
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
            
            <ModalActions style={{ backgroundColor: '#ffffff' }}>
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