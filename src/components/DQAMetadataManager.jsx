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
    SingleSelect,
    SingleSelectOption,
    InputField,
    TextAreaField,
    Tab,
    TabBar,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
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

// DQA Category Options for data quality dimensions
const DQA_CATEGORY_OPTIONS = [
    {
        name: 'Completeness',
        code: 'DQA_COMPLETENESS',
        shortName: 'Completeness',
        description: 'Data completeness dimension'
    },
    {
        name: 'Timeliness',
        code: 'DQA_TIMELINESS', 
        shortName: 'Timeliness',
        description: 'Data timeliness dimension'
    },
    {
        name: 'Accuracy',
        code: 'DQA_ACCURACY',
        shortName: 'Accuracy', 
        description: 'Data accuracy dimension'
    },
    {
        name: 'Consistency',
        code: 'DQA_CONSISTENCY',
        shortName: 'Consistency',
        description: 'Data consistency dimension'
    }
]

// DQA Categories
const DQA_CATEGORIES = [
    {
        name: 'DQA Dimension',
        code: 'DQA_DIMENSION',
        shortName: 'DQA Dimension',
        description: 'Data Quality Assessment dimensions',
        dataDimensionType: 'DISAGGREGATION'
    }
]

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
            name: 'Assessment Duration',
            code: 'ASSESSMENT_DURATION',
            shortName: 'Assessment Duration',
            description: 'Duration of assessment in hours',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
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
            name: 'Critical Issues',
            code: 'CRITICAL_ISSUES',
            shortName: 'Critical Issues',
            description: 'Number of critical data quality issues',
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
        }
    ],
    corrected: [
        {
            name: 'Issues Corrected',
            code: 'ISSUES_CORRECTED',
            shortName: 'Issues Corrected',
            description: 'Number of data quality issues corrected',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'Correction Rate',
            code: 'CORRECTION_RATE',
            shortName: 'Correction Rate',
            description: 'Percentage of issues corrected',
            valueType: 'PERCENTAGE',
            aggregationType: 'AVERAGE'
        },
        {
            name: 'Follow-up Actions',
            code: 'FOLLOWUP_ACTIONS',
            shortName: 'Follow-up Actions',
            description: 'Number of follow-up actions taken',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        }
    ]
}

// Queries for checking existing metadata
const existingMetadataQueries = {
    categoryOptions: {
        resource: 'categoryOptions',
        params: {
            fields: 'id,name,code,shortName',
            filter: 'code:like:DQA_',
            pageSize: 1000
        }
    },
    categories: {
        resource: 'categories',
        params: {
            fields: 'id,name,code,shortName,categoryOptions[id,name,code]',
            filter: 'code:like:DQA_',
            pageSize: 1000
        }
    },
    categoryCombos: {
        resource: 'categoryCombos',
        params: {
            fields: 'id,name,code,shortName,categories[id,name,code]',
            filter: 'code:like:DQA_',
            pageSize: 1000
        }
    },
    dataElements: {
        resource: 'dataElements',
        params: {
            fields: 'id,name,code,shortName,valueType,aggregationType,categoryCombo[id,name]',
            filter: 'code:like:DQA_',
            pageSize: 1000
        }
    },
    dataSets: {
        resource: 'dataSets',
        params: {
            fields: 'id,name,code,shortName,periodType,categoryCombo[id,name],dataSetElements[dataElement[id,name,code]]',
            filter: 'code:like:DQA_',
            pageSize: 1000
        }
    }
}

export const DQAMetadataManager = ({
    open,
    onClose,
    onComplete,
    dhis2Config,
    selectedOrgUnits = [],
    selectedDataElements = [],
    assessmentName = '',
    assessmentDescription = '',
    metadataSource = 'create'
}) => {
    const engine = useDataEngine()
    
    // State management
    const [loading, setLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [progress, setProgress] = useState([])
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    
    // Metadata state
    const [existingMetadata, setExistingMetadata] = useState({
        categoryOptions: [],
        categories: [],
        categoryCombos: [],
        dataElements: [],
        dataSets: []
    })
    
    // Configuration state
    const [reuseExisting, setReuseExisting] = useState(true)
    const [selectedTab, setSelectedTab] = useState('overview')
    const [createdMetadata, setCreatedMetadata] = useState({
        categoryOptions: [],
        categories: [],
        categoryCombos: [],
        dataElements: [],
        dataSets: []
    })

    // Load existing metadata on component mount
    useEffect(() => {
        if (open) {
            loadExistingMetadata()
        }
    }, [open])

    const addProgress = (message, type = 'info') => {
        setProgress(prev => [...prev, {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        }])
    }

    const loadExistingMetadata = async () => {
        try {
            addProgress('🔍 Checking for existing DQA metadata...', 'info')
            
            const results = await Promise.all([
                engine.query(existingMetadataQueries.categoryOptions),
                engine.query(existingMetadataQueries.categories),
                engine.query(existingMetadataQueries.categoryCombos),
                engine.query(existingMetadataQueries.dataElements),
                engine.query(existingMetadataQueries.dataSets)
            ])

            const metadata = {
                categoryOptions: results[0].categoryOptions || [],
                categories: results[1].categories || [],
                categoryCombos: results[2].categoryCombos || [],
                dataElements: results[3].dataElements || [],
                dataSets: results[4].dataSets || []
            }

            setExistingMetadata(metadata)
            
            const totalExisting = Object.values(metadata).reduce((sum, arr) => sum + arr.length, 0)
            addProgress(`✅ Found ${totalExisting} existing DQA metadata items`, 'success')
            
        } catch (err) {
            addProgress(`❌ Error loading existing metadata: ${err.message}`, 'error')
        }
    }

    const createCategoryOptions = async () => {
        addProgress('📝 Creating category options...', 'info')
        const categoryOptions = []
        
        for (const option of DQA_CATEGORY_OPTIONS) {
            // Check if already exists
            const existing = existingMetadata.categoryOptions.find(co => co.code === option.code)
            if (existing && reuseExisting) {
                addProgress(`  ♻️ Reusing existing: ${existing.name}`, 'info')
                categoryOptions.push(existing)
                continue
            }
            
            const categoryOption = {
                id: generateUID(),
                name: `${assessmentName} - ${option.name}`,
                code: `DQA_${generateCode('', 6)}_${option.code}`,
                shortName: option.shortName,
                description: `${assessmentDescription || assessmentName} - ${option.description}`
            }
            
            categoryOptions.push(categoryOption)
            addProgress(`  ✅ Created: ${categoryOption.name}`, 'success')
        }
        
        return categoryOptions
    }

    const createCategories = async (categoryOptions) => {
        addProgress('📂 Creating categories...', 'info')
        const categories = []
        
        for (const cat of DQA_CATEGORIES) {
            // Check if already exists
            const existing = existingMetadata.categories.find(c => c.code === cat.code)
            if (existing && reuseExisting) {
                addProgress(`  ♻️ Reusing existing: ${existing.name}`, 'info')
                categories.push(existing)
                continue
            }
            
            const category = {
                id: generateUID(),
                name: `${assessmentName} - ${cat.name}`,
                code: `DQA_${generateCode('', 6)}_${cat.code}`,
                shortName: cat.shortName,
                description: `${assessmentDescription || assessmentName} - ${cat.description}`,
                dataDimensionType: cat.dataDimensionType,
                categoryOptions: categoryOptions.map(co => ({ id: co.id }))
            }
            
            categories.push(category)
            addProgress(`  ✅ Created: ${category.name} with ${categoryOptions.length} options`, 'success')
        }
        
        return categories
    }

    const createCategoryCombos = async (categories) => {
        addProgress('🔗 Creating category combinations...', 'info')
        const categoryCombos = []
        
        // Create main DQA category combo
        const existing = existingMetadata.categoryCombos.find(cc => cc.code?.includes('DQA_MAIN'))
        if (existing && reuseExisting) {
            addProgress(`  ♻️ Reusing existing: ${existing.name}`, 'info')
            categoryCombos.push(existing)
        } else {
            const categoryCombo = {
                id: generateUID(),
                name: `${assessmentName} - DQA Category Combination`,
                code: `DQA_${generateCode('', 6)}_MAIN`,
                shortName: 'DQA Main',
                description: `${assessmentDescription || assessmentName} - Main category combination for DQA`,
                dataDimensionType: 'DISAGGREGATION',
                categories: categories.map(c => ({ id: c.id }))
            }
            
            categoryCombos.push(categoryCombo)
            addProgress(`  ✅ Created: ${categoryCombo.name} with ${categories.length} categories`, 'success')
        }
        
        return categoryCombos
    }

    const createDataElements = async (categoryCombo) => {
        addProgress('📊 Creating data elements...', 'info')
        const dataElements = {}
        
        for (const [datasetType, templates] of Object.entries(DQA_DATA_ELEMENTS_TEMPLATES)) {
            dataElements[datasetType] = []
            
            for (const template of templates) {
                // Check if already exists
                const elementCode = `DQA_${datasetType.toUpperCase()}_${template.code}`
                const existing = existingMetadata.dataElements.find(de => de.code === elementCode)
                
                if (existing && reuseExisting) {
                    addProgress(`    ♻️ Reusing: ${existing.name}`, 'info')
                    dataElements[datasetType].push(existing)
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
                    categoryCombo: { id: categoryCombo.id },
                    zeroIsSignificant: false
                }
                
                dataElements[datasetType].push(dataElement)
                addProgress(`    ✅ Created: ${dataElement.name}`, 'success')
            }
            
            addProgress(`  📝 ${datasetType.toUpperCase()}: ${dataElements[datasetType].length} data elements`, 'info')
        }
        
        return dataElements
    }

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
            const datasetCode = `DQA_${datasetType.toUpperCase()}`
            const existing = existingMetadata.dataSets.find(ds => ds.code?.includes(datasetCode))
            
            if (existing && reuseExisting) {
                addProgress(`  ♻️ Reusing: ${existing.name}`, 'info')
                dataSets[datasetType] = existing
                continue
            }
            
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
                organisationUnits: selectedOrgUnits.map(ou => ({ id: ou.id }))
            }
            
            dataSets[datasetType] = dataSet
            addProgress(`  ✅ Created: ${dataSet.name} with ${dataElements[datasetType].length} elements`, 'success')
        }
        
        return dataSets
    }

    const importMetadata = async (metadataPayload) => {
        addProgress('📤 Importing metadata to DHIS2...', 'info')
        
        const preflightFilterConflicts = async (payload) => {
            const dsList = Array.isArray(payload?.dataSets) ? payload.dataSets : []
            if (dsList.length === 0) return { payload, reused: [] }
            const keep = []
            const reused = []
            for (const ds of dsList) {
                const code = (ds?.code || '').trim()
                const name = (ds?.name || '').trim()
                let existing = null
                try {
                    const res = await engine.query({
                        list: {
                            resource: 'dataSets',
                            params: { fields: 'id,name,code', filter: code ? `code:eq:${code}` : `name:eq:${name}`, pageSize: 1 }
                        }
                    })
                    const arr = Array.isArray(res?.list?.dataSets) ? res.list.dataSets : []
                    existing = arr[0] || null
                } catch {}
                if (existing?.id) {
                    addProgress(`♻️ Reusing existing dataset: ${existing.name} (${existing.id})`, 'info')
                    reused.push(existing)
                } else {
                    keep.push(ds)
                }
            }
            return { payload: { ...payload, dataSets: keep }, reused }
        }

        try {
            // Preflight: filter out datasets that already exist by code/name
            const { payload: filteredPayload } = await preflightFilterConflicts(metadataPayload)

            const importMutation = {
                resource: 'metadata',
                type: 'create',
                data: filteredPayload,
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

            if (result.status === 'OK') {
                addProgress('✅ Metadata imported successfully!', 'success')
                return result
            } else {
                throw new Error(`Import failed with status: ${result.status}`)
            }

        } catch (err) {
            const msg = (err?.details?.message || err?.message || '').toLowerCase()
            const is409 = msg.includes('409') || msg.includes('conflict') || msg.includes('already')
            if (!is409) {
                addProgress(`❌ Import failed: ${err.message}`, 'error')
                throw err
            }

            addProgress('⚠️ 409 Conflict during import — attempting automatic resolution…', 'warning')

            // Second attempt: adjust conflicting dataset codes and retry
            try {
                const suffix = Date.now().toString(36).slice(-5).toUpperCase()
                const adjustCodes = (list) => (Array.isArray(list) ? list.map(ds => ({
                    ...ds,
                    id: ds.id, // keep id as provided
                    code: ds.code ? `${String(ds.code).slice(0, 45)}_${suffix}` : undefined,
                })) : list)

                // Re-run preflight to get the current filtered payload
                const { payload: filteredPayload } = await preflightFilterConflicts(metadataPayload)
                const retryPayload = { ...filteredPayload, dataSets: adjustCodes(filteredPayload.dataSets) }

                const retryMutation = {
                    resource: 'metadata',
                    type: 'create',
                    data: retryPayload,
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

                const retryResult = await engine.mutate(retryMutation)
                if (retryResult.status === 'OK') {
                    addProgress('✅ Import succeeded after resolving conflicts', 'success')
                    return retryResult
                }
                throw new Error(`Retry import failed with status: ${retryResult.status}`)
            } catch (e2) {
                addProgress(`❌ Conflict handling failed: ${e2.message}`, 'error')
                throw e2
            }
        }
    }

    const handleCreateMetadata = async () => {
        setLoading(true)
        setError(null)
        setProgress([])
        
        try {
            addProgress(`🚀 Starting DQA metadata creation for: ${assessmentName}`, 'info')
            addProgress(`📋 Assessment: ${assessmentName}`, 'info')
            addProgress(`📝 Description: ${assessmentDescription || 'No description provided'}`, 'info')
            addProgress(`🏢 Organization Units: ${selectedOrgUnits.length}`, 'info')
            addProgress('', 'info')
            
            // Step 1: Create Category Options
            setCurrentStep(1)
            const categoryOptions = await createCategoryOptions()
            
            // Step 2: Create Categories
            setCurrentStep(2)
            const categories = await createCategories(categoryOptions)
            
            // Step 3: Create Category Combinations
            setCurrentStep(3)
            const categoryCombos = await createCategoryCombos(categories)
            const mainCategoryCombo = categoryCombos[0]
            
            // Step 4: Create Data Elements
            setCurrentStep(4)
            const dataElements = await createDataElements(mainCategoryCombo)
            
            // Step 5: Create Data Sets
            setCurrentStep(5)
            const dataSets = await createDataSets(dataElements, mainCategoryCombo)
            
            // Step 6: Prepare metadata payload
            setCurrentStep(6)
            addProgress('📦 Preparing metadata payload...', 'info')
            
            const metadataPayload = {
                // Make sure combos reference categories by id only
                categoryOptions: categoryOptions.filter(co => !existingMetadata.categoryOptions.find(existing => existing.id === co.id)),
                categories: categories.filter(c => !existingMetadata.categories.find(existing => existing.id === c.id)).map(c => ({
                    ...c,
                    categoryOptions: Array.isArray(c.categoryOptions)
                        ? c.categoryOptions.map(co => (co?.id ? { id: co.id } : co))
                        : c.categoryOptions
                })),
                categoryCombos: categoryCombos.filter(cc => !existingMetadata.categoryCombos.find(existing => existing.id === cc.id)).map(cc => ({
                    ...cc,
                    categories: Array.isArray(cc.categories)
                        ? cc.categories.map(cat => (cat?.id ? { id: cat.id } : cat))
                        : cc.categories
                })),
                dataElements: Object.values(dataElements).flat().filter(de => !existingMetadata.dataElements.find(existing => existing.id === de.id)),
                dataSets: Object.values(dataSets).filter(ds => !existingMetadata.dataSets.find(existing => existing.id === ds.id))
            }
            
            const totalNew = Object.values(metadataPayload).reduce((sum, arr) => sum + arr.length, 0)
            addProgress(`📊 Payload summary: ${totalNew} new metadata items to create`, 'info')
            
            // Step 7: Import metadata
            setCurrentStep(7)
            if (totalNew > 0) {
                await importMetadata(metadataPayload)
            } else {
                addProgress('ℹ️ No new metadata to import - all items already exist', 'info')
            }
            
            // Store created metadata
            setCreatedMetadata({
                categoryOptions,
                categories,
                categoryCombos,
                dataElements,
                dataSets
            })
            
            setCurrentStep(8)
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
            assessmentDescription
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
            </Box>
            
            <Box marginBottom="24px">
                <h4 style={{ margin: '0 0 8px 0', color: '#666' }}>{i18n.t('Metadata to be Created')}</h4>
                <div>📝 <strong>4</strong> {i18n.t('Category Options')} (Completeness, Timeliness, Accuracy, Consistency)</div>
                <div>📂 <strong>1</strong> {i18n.t('Category')} (DQA Dimension)</div>
                <div>🔗 <strong>1</strong> {i18n.t('Category Combination')} (Main DQA)</div>
                <div>📊 <strong>12</strong> {i18n.t('Data Elements')} (3 per dataset type)</div>
                <div>📋 <strong>4</strong> {i18n.t('Datasets')} (Register, Summary, Reported, Corrected)</div>
            </Box>
            
            <Box marginBottom="16px">
                <Checkbox
                    checked={reuseExisting}
                    onChange={({ checked }) => setReuseExisting(checked)}
                    label={i18n.t('Reuse existing DQA metadata when possible')}
                />
            </Box>
        </Box>
    )

    const renderExistingMetadata = () => (
        <Box>
            <h3 style={{ margin: '0 0 16px 0' }}>♻️ {i18n.t('Existing DQA Metadata')}</h3>
            
            {Object.entries(existingMetadata).map(([type, items]) => (
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
                        <div style={{ color: '#666', fontSize: '14px' }}>{i18n.t('No existing items found')}</div>
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
                    <LinearLoader amount={currentStep * 12.5} />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {i18n.t('Step {{current}} of 8', { current: currentStep })}
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
        <Modal large onClose={onClose} style={{ background: '#fff' }}>
            <ModalTitle>
                🏗️ {i18n.t('DQA Metadata Manager')}
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
                            selected={selectedTab === 'existing'} 
                            onClick={() => setSelectedTab('existing')}
                        >
                            {i18n.t('Existing Metadata')}
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
                        {selectedTab === 'existing' && renderExistingMetadata()}
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
                                i18n.t('Create DQA Metadata')
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