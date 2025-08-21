import React, { useState, useEffect, useRef } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    LinearLoader,
    NoticeBox,
    Card,
    Box
} from '@dhis2/ui'
import styles from './DatasetCreationModal.module.css'

// Utility functions
const generateUID = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 11; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Attribute code to store per-dataset generated UID
const DATASET_UID_ATTRIBUTE_CODE = 'DQA360_DATASET_UID'

// DHIS2 API queries
const metadataQueries = {
    // Category Options
    getCategoryOptions: {
        resource: 'categoryOptions',
        params: {
            fields: 'id,name,code',
            pageSize: 1000
        }
    },
    createCategoryOptions: {
        resource: 'metadata',
        type: 'create',
        params: { importMode: 'COMMIT', importStrategy: 'CREATE_AND_UPDATE' },
        data: ({ categoryOptions }) => ({
            categoryOptions
        })
    },
    
    // Categories
    getCategories: {
        resource: 'categories',
        params: {
            fields: 'id,name,code,categoryOptions[id,name]',
            pageSize: 1000
        }
    },
    createCategories: {
        resource: 'metadata',
        type: 'create',
        params: { importMode: 'COMMIT', importStrategy: 'CREATE_AND_UPDATE' },
        data: ({ categories }) => ({
            categories
        })
    },
    
    // Category Combinations
    getCategoryCombos: {
        resource: 'categoryCombos',
        params: {
            fields: 'id,name,code,categories[id,name]',
            pageSize: 1000
        }
    },
    createCategoryCombos: {
        resource: 'metadata',
        type: 'create',
        params: { importMode: 'COMMIT', importStrategy: 'CREATE_AND_UPDATE' },
        data: ({ categoryCombos }) => ({
            categoryCombos
        })
    },
    
    // Data Elements
    getDataElements: {
        resource: 'dataElements',
        params: {
            fields: 'id,name,code,shortName,formName,valueType,aggregationType,domainType,categoryCombo[id,name]',
            pageSize: 1000
        }
    },
    createDataElements: {
        resource: 'metadata',
        type: 'create',
        params: { importMode: 'COMMIT', importStrategy: 'CREATE_AND_UPDATE' },
        data: ({ dataElements }) => ({
            dataElements
        })
    },
    
    // Organization Units
    getOrganisationUnits: {
        resource: 'organisationUnits',
        params: {
            fields: 'id,name,code,displayName,level,parent[id,name]',
            pageSize: 1000
        }
    },
    
    // Datasets
    createDatasets: {
        resource: 'metadata',
        type: 'create',
        params: { importMode: 'COMMIT', importStrategy: 'CREATE_AND_UPDATE' },
        data: ({ dataSets }) => ({
            dataSets
        })
    },

    // Attributes (ensure custom attribute exists)
    ensureAttribute: {
        resource: 'attributes',
        type: 'create',
        data: ({ attribute }) => attribute
    },
    
    // Sharing
    updateSharing: {
        resource: 'sharing',
        type: 'update',
        params: ({ type, id }) => ({ type, id }),
        data: ({ sharing }) => sharing
    }
}

const DatasetCreationModal = ({ 
    isOpen, 
    onClose, 
    datasets, 
    dataElements, 
    orgUnits, 
    assessmentName,
    onAllDatasetsCreated,
    saveAssessmentPayload 
}) => {
    const [currentStep, setCurrentStep] = useState(0)
    const [currentDataset, setCurrentDataset] = useState(0)
    const reportRef = useRef({ markdown: [] })
    const [progress, setProgress] = useState({})
    const [logs, setLogs] = useState([])
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [creationReport, setCreationReport] = useState(null)
    const [cancelRequested, setCancelRequested] = useState(false)
    // Active steps for the currently processed dataset (indices into `steps`)
    const [activeStepIndices, setActiveStepIndices] = useState([])

    const dataEngine = useDataEngine()
    const logsContainerRef = useRef(null)
    // Global log de-duplication set for this run (message+type+dataset)
    const logKeysRef = useRef(new Set())

    // Store attribute id to tag datasets with run-specific UID values
    const datasetUidAttributeIdRef = useRef(null)
    // Store resolved user group IDs for sharing
    const userGroupIdsRef = useRef({ users: null, admins: null })

    const steps = [
        'Validating Category Options',
        'Validating Categories', 
        'Validating Category Combinations',
        'Creating Data Elements',
        'Validating Organization Units',
        'Configuring Sharing Settings',
        'Creating Dataset Payload',
        'Creating Dataset in System',
        'Finalizing Configuration'
    ]

    const datasetTypes = ['register', 'summary', 'reported', 'corrected']

    // Metadata lookup caches (loaded once per run)
    const [metadataLookup, setMetadataLookup] = useState({
        categoryCombos: {}, // id -> { id, name, categories: [{id,name}] }
        categories: {},     // id -> { id, name, categoryOptions: [{id,name}] }
        categoryOptions: {} // id -> { id, name }
    })

    useEffect(() => {
        if (isOpen && !isCreating) {
            resetProgress()
            setActiveStepIndices(steps.map((_, i) => i))
        }
    }, [isOpen])

    // Auto-scroll logs to bottom when new logs are added
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
        }
    }, [logs])

    const resetProgress = () => {
        setCurrentStep(0)
        setCurrentDataset(0)
        setProgress({})
        setLogs([])
        setError(null)
        setSuccess(false)
        setCreationReport(null)
        setCancelRequested(false)
        setIsCreating(false)
        setActiveStepIndices(steps.map((_, i) => i))
        // reset global dedupe set
        logKeysRef.current = new Set()
    }

    // Deduplicated logger (suppresses consecutive duplicate messages of same type and dataset)
    const formatDhis2Error = (err) => {
        // Build detailed error string from DHIS2 error structures
        try {
            const parts = []
            const http = err?.details?.httpStatusCode || err?.httpStatusCode || err?.statusCode
            const msg = err?.details?.message || err?.message || String(err)
            const dev = err?.details?.devMessage || err?.devMessage
            if (http) parts.push(`HTTP ${http}`)
            if (msg) parts.push(msg)
            if (dev) parts.push(dev)
            const typeReports = err?.details?.response?.typeReports || err?.details?.response?.importReport?.typeReports || err?.response?.response?.typeReports
            const conflicts = err?.details?.response?.conflicts || err?.response?.response?.conflicts
            const extracted = []
            if (Array.isArray(typeReports)) {
                typeReports.forEach(tr => {
                    (tr.objectReports || []).forEach(or => {
                        (or.errorReports || []).forEach(er => {
                            const line = [er.errorCode && `[${er.errorCode}]`, er.message, er.mainKlass, er.mainId, er.uid]
                                .filter(Boolean)
                                .join(' ')
                            if (line) extracted.push(line)
                        })
                    })
                })
            }
            if (Array.isArray(conflicts)) {
                conflicts.forEach(c => extracted.push(`Conflict: ${(c.object || '').toString()} - ${(c.value || '').toString()}`))
            }
            if (extracted.length) parts.push(extracted.join(' | '))
            return parts.join(' | ')
        } catch (_) {
            return err?.message || String(err)
        }
    }

    const addLog = (message, type = 'info', datasetType = null) => {
        const key = `${type}::${datasetType || ''}::${message}`
        if (logKeysRef.current.has(key)) return
        logKeysRef.current.add(key)
        setLogs(prev => {
            const timestamp = new Date().toLocaleTimeString()
            const logEntry = {
                id: Date.now() + Math.random(),
                timestamp,
                message,
                type, // 'info', 'success', 'warning', 'error'
                datasetType
            }
            return [...prev, logEntry]
        })
        // Append to markdown log buffer
        if (!reportRef.current) reportRef.current = { markdown: [] }
        reportRef.current.markdown.push(`- ${new Date().toISOString()} [${type.toUpperCase()}]${datasetType ? ` [${datasetType.toUpperCase()}]` : ''} ${message}`)
    }

    const updateProgress = (datasetIndex, stepIndex, status, details = '') => {
        setProgress(prev => ({
            ...prev,
            [`${datasetIndex}-${stepIndex}`]: { status, details }
        }))
    }

    const startCreation = async () => {
        setIsCreating(true)
        setCancelRequested(false)
        setError(null)
        addLog(`🚀 Starting dataset creation for "${assessmentName}"`, 'info')
        
        try {
            // Ensure attribute for dataset UID exists (once per run)
            try {
                // Try to resolve by code first
                const lookup = await dataEngine.query({ at: { resource: 'attributes', params: { fields: 'id,code,name,valueType,organisationUnitAttribute,dataElementAttribute,indicatorAttribute,categoryOptionComboAttribute,categoryOptionAttribute,programAttribute,trackedEntityAttribute,dataSetAttribute,programStageAttribute,optionAttribute', filter: `code:eq:${DATASET_UID_ATTRIBUTE_CODE}`, pageSize: 1 } } })
                const existing = lookup?.at?.attributes?.[0]
                if (existing?.id && (existing.dataSetAttribute || existing.objectTypes?.includes('DATA_SET'))) {
                    datasetUidAttributeIdRef.current = existing.id
                    addLog('✓ Found existing dataset UID attribute', 'success')
                } else {
                    const attrPayload = {
                        name: 'DQA360 Dataset UID',
                        code: DATASET_UID_ATTRIBUTE_CODE,
                        valueType: 'TEXT',
                        dataSetAttribute: true,
                        unique: false,
                        publicAccess: 'rw------'
                    }
                    const created = await dataEngine.mutate(metadataQueries.ensureAttribute, { variables: { attribute: attrPayload } })
                    const id = created?.response?.uid || created?.uid
                    if (id) {
                        datasetUidAttributeIdRef.current = id
                        addLog('✓ Created dataset UID attribute', 'success')
                    } else {
                        addLog('⚠️ Could not determine ID of created dataset UID attribute; attributeValues will be skipped.', 'warning')
                    }
                }
            } catch (attrErr) {
                addLog(`⚠️ Attribute ensure failed: ${formatDhis2Error(attrErr)}`, 'warning')
            }

            // Load only required metadata lookups once per run (names + references)
            try {
                addLog('⬇️ Loading required metadata (category options, categories, combos)...', 'info')
                const required = { co: new Set(), cat: new Set(), cc: new Set() }
                // Collect IDs from all dataset types
                datasetTypes.forEach(dt => {
                    (dataElements[dt] || []).forEach(e => {
                        const ccId = e?.categoryCombo?.id
                        if (ccId) required.cc.add(ccId)
                        const cats = e?.categoryCombo?.categories || []
                        cats.forEach(cat => {
                            if (cat?.id) required.cat.add(cat.id)
                            const opts = cat?.categoryOptions || []
                            opts.forEach(opt => { if (opt?.id) required.co.add(opt.id) })
                        })
                    })
                })
                const [cos, cats, ccs] = await Promise.all([
                    required.co.size ? dataEngine.query({ co: { resource: 'categoryOptions', params: { fields: 'id,name', filter: `id:in:[${Array.from(required.co).join(',')}]`, pageSize: Math.max(1, required.co.size) } } }) : Promise.resolve({}),
                    required.cat.size ? dataEngine.query({ cat: { resource: 'categories', params: { fields: 'id,name,categoryOptions[id,name]', filter: `id:in:[${Array.from(required.cat).join(',')}]`, pageSize: Math.max(1, required.cat.size) } } }) : Promise.resolve({}),
                    required.cc.size ? dataEngine.query({ cc: { resource: 'categoryCombos', params: { fields: 'id,name,categories[id,name]', filter: `id:in:[${Array.from(required.cc).join(',')}]`, pageSize: Math.max(1, required.cc.size) } } }) : Promise.resolve({})
                ])
                const coMap = {}
                ;(cos?.co?.categoryOptions || []).forEach(o => { coMap[o.id] = { id: o.id, name: o.name || o.code || o.id } })
                const catMap = {}
                ;(cats?.cat?.categories || []).forEach(c => { catMap[c.id] = { id: c.id, name: c.name || c.code || c.id, categoryOptions: (c.categoryOptions||[]).map(o=>({id:o.id,name:o.name})) } })
                const ccMap = {}
                ;(ccs?.cc?.categoryCombos || []).forEach(c => { ccMap[c.id] = { id: c.id, name: c.name || c.code || c.id, categories: (c.categories||[]).map(x=>({id:x.id,name:x.name})) } })
                setMetadataLookup({ categoryOptions: coMap, categories: catMap, categoryCombos: ccMap })
                addLog(`✅ Loaded required metadata: ${Object.keys(coMap).length} COs, ${Object.keys(catMap).length} Cats, ${Object.keys(ccMap).length} Combos`, 'success')
            } catch (mErr) {
                addLog(`⚠️ Failed to load required metadata: ${formatDhis2Error(mErr)}`, 'warning')
            }
            // Resolve DQA user groups once
            try {
                const res = await dataEngine.query({
                    groups: {
                        resource: 'userGroups',
                        params: {
                            fields: 'id,name,code',
                            pageSize: 200,
                            filter: ['code:in:[DQA360_USERS,DQA360_ADMINS]']
                        }
                    }
                })
                const list = res?.groups?.userGroups || []
                const users = list.find(g => g.code === 'DQA360_USERS')?.id || null
                const admins = list.find(g => g.code === 'DQA360_ADMINS')?.id || null
                userGroupIdsRef.current = { users, admins }
                addLog(`👥 Sharing groups resolved: users=${users || 'n/a'}, admins=${admins || 'n/a'}`, 'info')
            } catch (e) {
                addLog('⚠️ Could not resolve DQA user groups; will fallback to public access only.', 'warning')
            }

            const report = {
                assessmentName,
                startTime: new Date().toISOString(),
                datasets: {},
                summary: {
                    total: datasetTypes.length,
                    created: 0,
                    failed: 0,
                    warnings: 0
                }
            }

            // Process each dataset type
            for (let datasetIndex = 0; datasetIndex < datasetTypes.length; datasetIndex++) {
                if (cancelRequested) break
                const datasetType = datasetTypes[datasetIndex]
                setCurrentDataset(datasetIndex)
                
                addLog(`📊 Processing ${datasetType.toUpperCase()} dataset...`, 'info', datasetType)
                
                // Determine active steps dynamically based on dataset metadata requirements
                const dsElements = dataElements[datasetType] || []
                const requiresCategoryOptions = dsElements.some(e => e?.categoryCombo?.categories?.some(c => Array.isArray(c.categoryOptions) && c.categoryOptions.length))
                const requiresCategories = dsElements.some(e => Array.isArray(e?.categoryCombo?.categories) && e.categoryCombo.categories.length)
                const requiresCategoryCombos = dsElements.some(e => e?.categoryCombo?.id)
                const newActive = []
                // 0: Category Options
                if (requiresCategoryOptions) newActive.push(0)
                else updateProgress(datasetIndex, 0, 'skipped', 'No category options required')
                // 1: Categories
                if (requiresCategories) newActive.push(1)
                else updateProgress(datasetIndex, 1, 'skipped', 'No categories required')
                // 2: Category Combos
                if (requiresCategoryCombos) newActive.push(2)
                else updateProgress(datasetIndex, 2, 'skipped', 'No category combos required')
                // 3..8 always applicable flow, excluding separate sharing step (5)
                newActive.push(3,4,6,7,8)
                setActiveStepIndices(newActive)
                
                const datasetReport = {
                    type: datasetType,
                    steps: {},
                    metadata: {},
                    errors: [],
                    warnings: []
                }

                try {
                    // Step 0: Process external category combos (if any)
                    addLog(`🔄 Processing external category combos for ${datasetType}...`, 'info', datasetType)
                    await processExternalCategoryCombos(datasetType)
                    
                    // Step 1: Validate Category Options (if required)
                    if (cancelRequested) break
                    if (activeStepIndices.includes(0)) {
                        setCurrentStep(activeStepIndices.indexOf(0))
                        await validateCategoryOptions(datasetIndex, datasetType, datasetReport)
                    } else {
                        addLog('⏭️ Skipped category options validation (not required by metadata)', 'info', datasetType)
                    }
                    
                    // Step 2: Validate Categories (if required)
                    if (cancelRequested) break
                    if (activeStepIndices.includes(1)) {
                        setCurrentStep(activeStepIndices.indexOf(1))
                        await validateCategories(datasetIndex, datasetType, datasetReport)
                    } else {
                        addLog('⏭️ Skipped categories validation (not required by metadata)', 'info', datasetType)
                    }
                    
                    // Step 3: Validate Category Combinations (if required)
                    if (cancelRequested) break
                    if (activeStepIndices.includes(2)) {
                        setCurrentStep(activeStepIndices.indexOf(2))
                        await validateCategoryCombinations(datasetIndex, datasetType, datasetReport)
                    } else {
                        addLog('⏭️ Skipped category combinations validation (not required by metadata)', 'info', datasetType)
                    }
                    
                    // Step 4: Create Data Elements
                    if (cancelRequested) break
                    setCurrentStep(activeStepIndices.indexOf(3))
                    await validateDataElements(datasetIndex, datasetType, datasetReport)
                    
                    // Step 5: Validate Organization Units
                    if (cancelRequested) break
                    setCurrentStep(activeStepIndices.indexOf(4))
                    await validateOrganizationUnits(datasetIndex, datasetType, datasetReport)
                    
                    // Step 6: Configure Sharing (embedded in payload) - skip separate step
                    if (cancelRequested) break
                    updateProgress(datasetIndex, 5, 'skipped', 'Sharing embedded in dataset payload')
                    addLog('⏭️ Sharing configured via embedded payload; skipping separate API', 'info', datasetType)
                    
                    // Step 7: Create Dataset Payload
                    if (cancelRequested) break
                    setCurrentStep(activeStepIndices.indexOf(6))
                    await createDatasetPayload(datasetIndex, datasetType, datasetReport)
                    
                    // Step 8: Create Dataset
                    if (cancelRequested) break
                    setCurrentStep(activeStepIndices.indexOf(7))
                    await createDatasetInSystem(datasetIndex, datasetType, datasetReport)
                    
                    // Step 9: Finalize
                    if (cancelRequested) break
                    setCurrentStep(activeStepIndices.indexOf(8))
                    await finalizeConfiguration(datasetIndex, datasetType, datasetReport)
                    
                    report.datasets[datasetType] = datasetReport
                    report.summary.created++
                    
                    addLog(`✅ ${datasetType.toUpperCase()} dataset created successfully!`, 'success', datasetType)
                    
                } catch (err) {
                    datasetReport.errors.push(err.message)
                    report.datasets[datasetType] = datasetReport
                    report.summary.failed++
                    
                    addLog(`❌ Failed to create ${datasetType.toUpperCase()} dataset: ${err.message}`, 'error', datasetType)
                }
            }

            report.endTime = new Date().toISOString()
            report.duration = new Date(report.endTime) - new Date(report.startTime)
            
            setCreationReport(report)
            const allCreated = report.summary.created === report.summary.total
            const anyFailed = report.summary.failed > 0
            setSuccess(!cancelRequested && allCreated)
            if (cancelRequested) {
                addLog(`⏹️ Creation cancelled by user. Partial results saved.`, 'warning')
            } else if (allCreated) {
                addLog(`🎉 Dataset creation completed! ${report.summary.created}/${report.summary.total} datasets created successfully.`, 'success')
            } else if (anyFailed) {
                addLog(`⚠️ Dataset creation completed with issues: ${report.summary.created}/${report.summary.total} created.`, 'warning')
            } else {
                addLog(`ℹ️ Dataset creation completed: ${report.summary.created}/${report.summary.total} created.`, 'info')
            }

            // After all datasets are done, create SMS commands (if enabled per dataset)
            try {
                await createSmsCommandsForAllDatasets(report)
            } catch (smsErr) {
                addLog(`⚠️ One or more SMS commands failed to create: ${formatDhis2Error(smsErr)}`,'warning')
            }

            // Build assessment datastore payload and save, then notify parent to switch to review
            try {
                const payload = buildAssessmentPayload(report)
                if (typeof saveAssessmentPayload === 'function') {
                    await saveAssessmentPayload(payload)
                    addLog('💾 Assessment payload saved to datastore.', 'success')
                }
            } catch (pErr) {
                addLog(`⚠️ Failed to save assessment payload: ${pErr.message}`, 'warning')
            }
            if (typeof onAllDatasetsCreated === 'function') {
                onAllDatasetsCreated(report)
            }
            
        } catch (err) {
            setError(err.message)
            addLog(`💥 Critical error during dataset creation: ${err.message}`, 'error')
        } finally {
            setIsCreating(false)
        }
    }

    // Helper: server-generated UIDs via /system/id
    const fetchServerUIDs = async (count = 1) => {
        try {
            const result = await dataEngine.query({ ids: { resource: 'system/id', params: { limit: count } } })
            const codes = result?.ids?.codes || []
            return Array.isArray(codes) ? codes : []
        } catch (e) {
            return []
        }
    }

    // Helper: create SMS commands for all datasets after completion
    const createSmsCommandsForAllDatasets = async (finalReport) => {
        for (const datasetType of datasetTypes) {
            try {
                const cfg = datasets?.[datasetType]
                if (!cfg?.smsEnabled) continue
                const dsId = finalReport?.datasets?.[datasetType]?.metadata?.datasetId
                const payload = finalReport?.datasets?.[datasetType]?.metadata?.datasetPayload
                if (!dsId || !payload) continue

                const keyword = cfg.smsKeyword || cfg.code || payload.code
                const sep = cfg.smsSeparator || ' '
                const sourceElements = Array.isArray(dataElements?.[datasetType]) ? (dataElements[datasetType] || []) : []
                const fallbackCodes = ['a','b','c','d','e','f','g','h','i','j']
                const getCodeForIndex = (idx) => {
                    const raw = (sourceElements[idx]?.smsCode || '').toString().trim()
                    const norm = raw.toLowerCase()
                    return norm || fallbackCodes[idx]
                }
                const codesInOrder = (payload.dataSetElements || []).map((_, idx) => getCodeForIndex(idx)).filter(Boolean)
                const codesMap = (payload.dataSetElements || []).reduce((acc, dse, idx) => {
                    const deId = dse?.dataElement?.id
                    const codeKey = codesInOrder[idx]
                    if (deId && codeKey) acc[codeKey] = deId
                    return acc
                }, {})
                const examplePairs = codesInOrder.slice(0, Math.min(5, codesInOrder.length)).map(c => `${c}=<v>`).join(sep)
                const wrongFormat = cfg.smsWrongFormatMessage || `Wrong format. Use: ${keyword}${sep}${examplePairs}`

                if (dsId && keyword) {
                    const commandData = {
                        name: cfg.smsCommandName || `${payload.name} SMS`,
                        parserType: 'KEY_VALUE_PARSER',
                        dataset: { id: dsId },
                        separator: sep,
                        defaultMessage: cfg.smsSuccessMessage || 'Thanks! SMS received.',
                        wrongFormatMessage: wrongFormat,
                        noUserMessage: cfg.smsNoUserMessage || 'Phone not linked to any user.',
                        successMessage: cfg.smsSuccessMessage || 'Saved.',
                        moreThanOneOrgUnitMessage: cfg.smsMoreThanOneOrgUnitMessage || undefined,
                        noCodesMessage: cfg.smsNoCodesMessage || undefined,
                        smsCodes: Object.entries(codesMap).map(([code, id]) => ({ code, dataElement: { id } }))
                    }
                    let resp = null
                    try {
                        resp = await dataEngine.mutate({
                            resource: 'smsCommands',
                            type: 'create',
                            data: commandData
                        })
                        const createdId = resp?.response?.uid || resp?.uid || null
                        finalReport.datasets[datasetType] = finalReport.datasets[datasetType] || { metadata: {} }
                        finalReport.datasets[datasetType].metadata = finalReport.datasets[datasetType].metadata || {}
                        finalReport.datasets[datasetType].metadata.smsCommand = {
                            created: true,
                            id: createdId,
                            keyword,
                            separator: sep,
                            codesMap,
                            request: commandData
                        }
                        addLog(`✓ SMS command configured (keyword: ${keyword})`, 'success', datasetType)
                    } catch (cmdErr) {
                        finalReport.datasets[datasetType] = finalReport.datasets[datasetType] || { metadata: {} }
                        finalReport.datasets[datasetType].metadata = finalReport.datasets[datasetType].metadata || {}
                        finalReport.datasets[datasetType].metadata.smsCommand = {
                            created: false,
                            keyword,
                            separator: sep,
                            codesMap,
                            request: commandData,
                            error: formatDhis2Error(cmdErr)
                        }
                        throw cmdErr
                    }
                }
            } catch (e) {
                addLog(`⚠️ SMS command creation skipped/failed for ${datasetType}: ${e?.message || e}`, 'warning', datasetType)
            }
        }
    }

    // External metadata fetching and creation
    const fetchExternalCategoryCombo = async (externalBaseUrl, categoryComboId, credentials) => {
        try {
            const auth = credentials ? `${credentials.username}:${credentials.password}` : ''
            const headers = {
                'Content-Type': 'application/json',
                ...(auth && { 'Authorization': `Basic ${btoa(auth)}` })
            }
            
            const response = await fetch(
                `${externalBaseUrl}/api/categoryCombos/${categoryComboId}.json?fields=id,name,code,categories[id,name,code,categoryOptions[id,name,code]]`,
                { headers }
            )
            
            if (!response.ok) {
                throw new Error(`Failed to fetch category combo: ${response.status} ${response.statusText}`)
            }
            
            return await response.json()
        } catch (error) {
            addLog(`❌ Failed to fetch external category combo ${categoryComboId}: ${error.message}`, 'error')
            throw error
        }
    }

    const createCategoryHierarchy = async (externalCategoryCombo) => {
        const createdMetadata = {
            categoryOptions: [],
            categories: [],
            categoryCombos: []
        }
        
        try {
            // Step 1: Create category options
            if (externalCategoryCombo.categories) {
                for (const category of externalCategoryCombo.categories) {
                    if (category.categoryOptions) {
                        for (const option of category.categoryOptions) {
                            // Check if category option already exists locally
                            const existingOption = await dataEngine.query({
                                categoryOptions: {
                                    resource: 'categoryOptions',
                                    params: {
                                        fields: 'id,name,code',
                                        filter: `code:eq:${option.code}`,
                                        pageSize: 1
                                    }
                                }
                            })
                            
                            if (existingOption?.categoryOptions?.categoryOptions?.[0]) {
                                const existing = existingOption.categoryOptions.categoryOptions[0]
                                createdMetadata.categoryOptions.push(existing)
                                addLog(`♻️ Reusing existing category option: ${existing.name}`, 'info')
                            } else {
                                // Create new category option
                                const newOption = {
                                    id: generateUID(),
                                    name: option.name,
                                    code: option.code || `CO_${generateUID().substring(0, 8)}`,
                                    shortName: option.name.substring(0, 50)
                                }
                                
                                const createResponse = await dataEngine.mutate(
                                    metadataQueries.createCategoryOptions,
                                    { variables: { categoryOptions: [newOption] } }
                                )
                                
                                createdMetadata.categoryOptions.push(newOption)
                                addLog(`✅ Created category option: ${newOption.name}`, 'success')
                            }
                        }
                    }
                }
            }
            
            // Step 2: Create categories
            if (externalCategoryCombo.categories) {
                for (const category of externalCategoryCombo.categories) {
                    // Check if category already exists locally
                    const existingCategory = await dataEngine.query({
                        categories: {
                            resource: 'categories',
                            params: {
                                fields: 'id,name,code',
                                filter: `code:eq:${category.code}`,
                                pageSize: 1
                            }
                        }
                    })
                    
                    if (existingCategory?.categories?.categories?.[0]) {
                        const existing = existingCategory.categories.categories[0]
                        createdMetadata.categories.push(existing)
                        addLog(`♻️ Reusing existing category: ${existing.name}`, 'info')
                    } else {
                        // Create new category
                        const categoryOptions = createdMetadata.categoryOptions
                            .filter(co => category.categoryOptions?.some(eco => eco.code === co.code))
                            .map(co => ({ id: co.id }))
                        
                        const newCategory = {
                            id: generateUID(),
                            name: category.name,
                            code: category.code || `CAT_${generateUID().substring(0, 8)}`,
                            shortName: category.name.substring(0, 50),
                            dataDimensionType: 'DISAGGREGATION',
                            categoryOptions
                        }
                        
                        const createResponse = await dataEngine.mutate(
                            metadataQueries.createCategories,
                            { variables: { categories: [newCategory] } }
                        )
                        
                        createdMetadata.categories.push(newCategory)
                        addLog(`✅ Created category: ${newCategory.name} with ${categoryOptions.length} options`, 'success')
                    }
                }
            }
            
            // Step 3: Create category combo
            const existingCombo = await dataEngine.query({
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code',
                        filter: `code:eq:${externalCategoryCombo.code}`,
                        pageSize: 1
                    }
                }
            })
            
            if (existingCombo?.categoryCombos?.categoryCombos?.[0]) {
                const existing = existingCombo.categoryCombos.categoryCombos[0]
                createdMetadata.categoryCombos.push(existing)
                addLog(`♻️ Reusing existing category combo: ${existing.name}`, 'info')
                return existing.id
            } else {
                // Create new category combo
                const categories = createdMetadata.categories.map(c => ({ id: c.id }))
                
                const newCombo = {
                    id: generateUID(),
                    name: externalCategoryCombo.name,
                    code: externalCategoryCombo.code || `CC_${generateUID().substring(0, 8)}`,
                    dataDimensionType: 'DISAGGREGATION',
                    categories
                }
                
                const createResponse = await dataEngine.mutate(
                    metadataQueries.createCategoryCombos,
                    { variables: { categoryCombos: [newCombo] } }
                )
                
                createdMetadata.categoryCombos.push(newCombo)
                addLog(`✅ Created category combo: ${newCombo.name} with ${categories.length} categories`, 'success')
                return newCombo.id
            }
            
        } catch (error) {
            addLog(`❌ Failed to create category hierarchy: ${error.message}`, 'error')
            throw error
        }
    }

    const processExternalCategoryCombos = async (datasetType) => {
        const datasetElements = dataElements[datasetType] || []
        const categoryComboMapping = new Map()
        
        // Get external connection info from saveAssessmentPayload if available
        let externalBaseUrl = null
        let credentials = null
        
        try {
            // Try to extract external connection info from assessment data
            if (typeof saveAssessmentPayload === 'function') {
                const payload = await saveAssessmentPayload({})
                externalBaseUrl = payload?.externalConnection?.baseUrl
                credentials = payload?.externalConnection?.credentials
                
                if (externalBaseUrl && credentials) {
                    addLog(`🔗 External connection found: ${externalBaseUrl}`, 'info', datasetType)
                }
            }
        } catch (e) {
            addLog('⚠️ Could not get external connection info, will use default category combo for external references', 'warning', datasetType)
        }
        
        for (const element of datasetElements) {
            if (element.categoryCombo && element.categoryCombo.id !== 'bjDvmb4bfuf') {
                const categoryComboId = element.categoryCombo.id
                
                if (!categoryComboMapping.has(categoryComboId)) {
                    try {
                        if (externalBaseUrl && credentials) {
                            addLog(`🔄 Fetching external category combo: ${categoryComboId}`, 'info', datasetType)
                            const externalCombo = await fetchExternalCategoryCombo(externalBaseUrl, categoryComboId, credentials)
                            const localComboId = await createCategoryHierarchy(externalCombo)
                            categoryComboMapping.set(categoryComboId, localComboId)
                            addLog(`✅ Mapped external category combo ${categoryComboId} to local ${localComboId}`, 'success', datasetType)
                        } else {
                            // Fallback to default category combo
                            addLog(`⚠️ Using default category combo for external reference: ${categoryComboId}`, 'warning', datasetType)
                            categoryComboMapping.set(categoryComboId, 'bjDvmb4bfuf')
                        }
                    } catch (error) {
                        addLog(`❌ Failed to process category combo ${categoryComboId}, using default: ${error.message}`, 'error', datasetType)
                        categoryComboMapping.set(categoryComboId, 'bjDvmb4bfuf')
                    }
                }
            }
        }
        
        // Update data elements with local category combo IDs
        datasetElements.forEach(element => {
            if (element.categoryCombo && categoryComboMapping.has(element.categoryCombo.id)) {
                const localId = categoryComboMapping.get(element.categoryCombo.id)
                element.categoryCombo.id = localId
                addLog(`🔄 Updated element ${element.name} to use local category combo: ${localId}`, 'info', datasetType)
            }
        })
        
        return categoryComboMapping
    }

    // Step implementations
    const validateCategoryOptions = async (datasetIndex, datasetType, report) => {
        addLog(`🔍 Validating category options required by ${datasetType} data elements...`, 'info', datasetType)
        updateProgress(datasetIndex, 0, 'running', 'Analyzing required category options...')
        
        try {
            const datasetElements = dataElements[datasetType] || []
            const requiredCategoryOptions = new Set()
            
            // Extract category options from data elements' category combos (use lookup)
            datasetElements.forEach(element => {
                if (element.categoryCombo && element.categoryCombo.categories) {
                    element.categoryCombo.categories.forEach(category => {
                        if (category.categoryOptions) {
                            category.categoryOptions.forEach(option => {
                                const coId = option.id
                                const coName = metadataLookup.categoryOptions[coId]?.name || option.name || coId
                                requiredCategoryOptions.add(coId)
                                addLog(`📋 Required category option: ${coName} (${coId})`, 'info', datasetType)
                            })
                        }
                    })
                }
            })
            
            // If no specific options required, use default
            if (requiredCategoryOptions.size === 0) {
                addLog(`📋 Using default category option for ${datasetType}`, 'info', datasetType)
                requiredCategoryOptions.add('bjDvmb4bfuf') // Default category option ID
            }
            
            report.steps.categoryOptions = {
                status: 'completed',
                required: requiredCategoryOptions.size,
                validated: Array.from(requiredCategoryOptions)
            }
            
            updateProgress(datasetIndex, 0, 'completed', `Validated ${requiredCategoryOptions.size} category options`)
            addLog(`✅ Category options validated (${requiredCategoryOptions.size} required)`, 'success', datasetType)
            
        } catch (err) {
            updateProgress(datasetIndex, 0, 'failed', err.message)
            throw new Error(`Category options validation failed: ${err.message}`)
        }
    }

    const validateCategories = async (datasetIndex, datasetType, report) => {
        addLog(`🔍 Validating categories required by ${datasetType} data elements...`, 'info', datasetType)
        updateProgress(datasetIndex, 1, 'running', 'Analyzing required categories...')
        
        try {
            const datasetElements = dataElements[datasetType] || []
            const requiredCategories = new Set()
            
            // Extract categories from data elements' category combos (use lookup)
            datasetElements.forEach(element => {
                if (element.categoryCombo && element.categoryCombo.categories) {
                    element.categoryCombo.categories.forEach(category => {
                        const catId = category.id
                        const catName = metadataLookup.categories[catId]?.name || category.name || catId
                        requiredCategories.add(catId)
                        addLog(`📋 Required category: ${catName} (${catId})`, 'info', datasetType)
                    })
                }
            })
            
            // If no specific categories required, use default
            if (requiredCategories.size === 0) {
                addLog(`📋 Using default category for ${datasetType}`, 'info', datasetType)
                requiredCategories.add('GLevLNI9wkl') // Default category ID
            }
            
            report.steps.categories = {
                status: 'completed',
                required: requiredCategories.size,
                validated: Array.from(requiredCategories)
            }
            
            updateProgress(datasetIndex, 1, 'completed', `Validated ${requiredCategories.size} categories`)
            addLog(`✅ Categories validated (${requiredCategories.size} required)`, 'success', datasetType)
            
        } catch (err) {
            updateProgress(datasetIndex, 1, 'failed', err.message)
            throw new Error(`Categories validation failed: ${err.message}`)
        }
    }

    const validateCategoryCombinations = async (datasetIndex, datasetType, report) => {
        addLog(`🔍 Validating category combinations required by ${datasetType} data elements...`, 'info', datasetType)
        updateProgress(datasetIndex, 2, 'running', 'Analyzing required category combinations...')
        
        try {
            const datasetElements = dataElements[datasetType] || []
            const requiredCategoryCombos = new Set()
            
            // Extract category combinations from data elements (use lookup to avoid undefined names)
            datasetElements.forEach(element => {
                if (element.categoryCombo) {
                    const ccId = element.categoryCombo.id
                    const ccName = metadataLookup.categoryCombos[ccId]?.name || element.categoryCombo.name || ccId
                    requiredCategoryCombos.add(ccId)
                    addLog(`📋 Required category combo: ${ccName} (${ccId}) for element ${element.name} [${datasetType.toUpperCase()}]`, 'info', datasetType)
                }
            })
            
            // If no specific combos required, use default
            if (requiredCategoryCombos.size === 0) {
                addLog(`📋 Using default category combination for ${datasetType}`, 'info', datasetType)
                requiredCategoryCombos.add('bjDvmb4bfuf') // Default category combo ID
            }
            
            report.steps.categoryCombos = {
                status: 'completed',
                required: requiredCategoryCombos.size,
                validated: Array.from(requiredCategoryCombos)
            }
            
            updateProgress(datasetIndex, 2, 'completed', `Validated ${requiredCategoryCombos.size} category combinations`)
            addLog(`✅ Category combinations validated (${requiredCategoryCombos.size} required)`, 'success', datasetType)
            
        } catch (err) {
            updateProgress(datasetIndex, 2, 'failed', err.message)
            throw new Error(`Category combinations validation failed: ${err.message}`)
        }
    }

    const validateDataElements = async (datasetIndex, datasetType, report) => {
        addLog(`🔨 Creating data elements for ${datasetType}...`, 'info', datasetType)
        updateProgress(datasetIndex, 3, 'running', 'Creating new data elements...')
        
        try {
            const datasetElements = dataElements[datasetType] || []
            
            if (datasetElements.length === 0) {
                addLog(`⚠️ No data elements defined for ${datasetType}`, 'warning', datasetType)
                report.warnings.push(`No data elements defined for ${datasetType}`)
                
                report.steps.dataElements = {
                    status: 'completed',
                    existing: 0,
                    created: 0,
                    total: 0
                }
                
                updateProgress(datasetIndex, 3, 'completed', 'No data elements to create')
                return
            }
            
            // Ensure all data elements have required fields and valid references
            const processedElements = datasetElements.map(element => {
                const truncate = (s = '', n) => (s || '').toString().slice(0, n)
                // Ensure basic required fields with DHIS2-friendly lengths
                const name = truncate(element.name || `${datasetType} Element`, 230)
                const shortName = truncate(element.shortName || element.name || `${datasetType} Element`, 50)
                const formName = truncate(element.formName || element.name || `${datasetType} Element`, 230)
                const code = truncate(
                    element.code || `${datasetType.toUpperCase()}_DE_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    50
                )
                const processedElement = {
                    // Do NOT send a client-generated id; let DHIS2 assign one
                    name,
                    code,
                    shortName,
                    formName,
                    valueType: element.valueType || 'INTEGER',
                    aggregationType: element.aggregationType || 'SUM',
                    domainType: element.domainType || 'AGGREGATE',
                    categoryCombo: element.categoryCombo && element.categoryCombo.id ? { id: element.categoryCombo.id } : { id: 'bjDvmb4bfuf' }
                }
                
                addLog(`📋 Prepared element: ${processedElement.name} with categoryCombo: ${processedElement.categoryCombo.id}`, 'info', datasetType)
                
                return processedElement
            })
            
            // Pre-allocate server UIDs for new elements (optional optimization)
            const serverUIDs = await fetchServerUIDs(processedElements.length)

            // Create data elements one-by-one to surface granular progress in the UI
            addLog(`🔨 Creating ${processedElements.length} new data elements (one by one)...`, 'info', datasetType)

            const createdElements = []
            const failedElements = []

            let existingCount = 0
            for (let i = 0; i < processedElements.length; i++) {
                const element = processedElements[i]
                addLog(`🛠️ [${i + 1}/${processedElements.length}] Creating "${element.name}"...`, 'info', datasetType)
                try {
                    // Use single-mutation shape expected by @dhis2/app-runtime
                    const toCreate = { ...element }
                    // Prefer server-generated UIDs if fetched; otherwise omit id to let DHIS2 assign
                    if (serverUIDs[i] && /^[A-Za-z][A-Za-z0-9]{10}$/.test(serverUIDs[i])) {
                        toCreate.id = serverUIDs[i]
                    }
                    const resp = await dataEngine.mutate(
                        metadataQueries.createDataElements,
                        { variables: { dataElements: [toCreate] } }
                    )
                    // Extract the UID from import report
                    let newId = toCreate.id || null
                    const tr = resp?.response?.typeReports || resp?.typeReports
                    if (Array.isArray(tr)) {
                        const deReport = tr.find(r => (r.klass || '').endsWith('.DataElement')) || tr[0]
                        const obj = deReport?.objectReports?.[0]
                        if (obj?.uid) newId = obj.uid
                    }
                    const elementWithId = newId ? { ...element, id: newId } : element
                    createdElements.push(elementWithId)
                    addLog(`✅ [${i + 1}/${processedElements.length}] Created: ${element.name} (${element.code})`, 'success', datasetType)
                } catch (e) {
                    const httpCode = e?.details?.httpStatusCode || e?.httpStatusCode || e?.statusCode
                    const msg = e?.message || ''
                    const conflict = httpCode === 409 || /409|already exists|conflict/i.test(msg)
                    if (conflict) {
                        try {
                            // 1) Try parse ImportReport for mainId (E5003) to get the existing UID
                            const tr = e?.details?.response?.typeReports || e?.response?.response?.typeReports
                            const or = Array.isArray(tr) ? tr.flatMap(r => r.objectReports || []) : []
                            const er = Array.isArray(or) ? or.flatMap(o => o.errorReports || []) : []
                            const mainId = er.find(x => x?.errorCode === 'E5003' && x?.mainId)?.mainId
                            if (mainId) {
                                createdElements.push({ ...element, id: mainId })
                                existingCount += 1
                                addLog(`ℹ️ Existing data element found, reusing it: ${element.name} (${element.code})`, 'info', datasetType)
                                continue
                            }

                            // 2) Fallback: lookup by code
                            const byCode = await dataEngine.query({
                                des: {
                                    resource: 'dataElements',
                                    params: {
                                        fields: 'id,name,code',
                                        filter: `code:eq:${element.code}`,
                                        pageSize: 1
                                    }
                                }
                            })
                            let existing = byCode?.des?.dataElements?.[0]

                            // 3) Fallback: lookup by name if not found by code
                            if (!existing?.id && element.name) {
                                const byName = await dataEngine.query({
                                    des: {
                                        resource: 'dataElements',
                                        params: {
                                            fields: 'id,name,code',
                                            filter: `name:eq:${element.name}`,
                                            pageSize: 1
                                        }
                                    }
                                })
                                existing = byName?.des?.dataElements?.[0]
                            }

                            if (existing?.id) {
                                createdElements.push({ ...element, id: existing.id })
                                existingCount += 1
                                addLog(`ℹ️ Existing data element found, reusing it: ${existing.name} (${existing.code || existing.id})`, 'info', datasetType)
                                continue
                            }
                        } catch (lookupErr) {
                            // fall through to failure logging
                        }
                    }
                    // Surface detailed import errors if available
                    const trErr = e?.details?.response?.typeReports || e?.details?.response?.importReport?.typeReports || e?.response?.response?.typeReports || []
                    const conflicts = e?.details?.response?.conflicts || e?.response?.response?.conflicts || []
                    const details = []
                    if (Array.isArray(trErr)) {
                        trErr.forEach(tr => {
                            (tr.objectReports || []).forEach(or => {
                                (or.errorReports || []).forEach(er => {
                                    const parts = []
                                    if (er.errorCode) parts.push(`[${er.errorCode}]`)
                                    if (er.message) parts.push(er.message)
                                    if (er.mainKlass) parts.push(er.mainKlass)
                                    if (er.mainId) parts.push(er.mainId)
                                    if (er.uid) parts.push(er.uid)
                                    details.push(parts.join(' '))
                                })
                            })
                        })
                    }
                    if (Array.isArray(conflicts) && conflicts.length) {
                        conflicts.forEach(c => details.push(`Conflict: ${(c.object || '').toString()} - ${(c.value || '').toString()}`.trim()))
                    }
                    const detailMsg = details[0] || e.message
                    failedElements.push({ element, error: detailMsg })
                    addLog(`❌ [${i + 1}/${processedElements.length}] Failed: ${element.name} - ${detailMsg}`, 'error', datasetType)
                }
            }

            // Store only successfully created (or reused) elements for subsequent dataset linkage
            report.metadata.dataElements = createdElements

            // Summarize step outcome
            report.steps.dataElements = {
                status: failedElements.length === 0 ? 'completed' : (createdElements.length > 0 ? 'partial' : 'failed'),
                existing: existingCount,
                created: createdElements.length,
                failed: failedElements.length,
                total: processedElements.length,
                errors: failedElements.map(f => ({ name: f.element.name, code: f.element.code, error: f.error }))
            }

            const summaryLine = `${createdElements.length}/${processedElements.length} created`;
            updateProgress(datasetIndex, 3, failedElements.length ? 'warning' : 'completed', summaryLine)
            if (failedElements.length) {
                addLog(`⚠️ Created ${summaryLine}. ${failedElements.length} failed.`, 'warning', datasetType)
                report.warnings.push(`${failedElements.length} of ${processedElements.length} data elements failed to create`)
                if (createdElements.length === 0) {
                    throw new Error('Data elements creation failed: no elements were created')
                }
            } else {
                addLog(`✅ Data elements ready: created ${createdElements.length}${existingCount ? `, reused ${existingCount}` : ''} (of ${processedElements.length})`, 'success', datasetType)
            }
            
        } catch (err) {
            const detail = formatDhis2Error(err)
            updateProgress(datasetIndex, 3, 'failed', detail)
            addLog(`❌ Failed to create data elements: ${detail}`, 'error', datasetType)
            throw new Error(`Data elements creation failed: ${detail}`)
        }
    }

    const validateOrganizationUnits = async (datasetIndex, datasetType, report) => {
        addLog(`🔍 Validating selected organization units for ${datasetType} dataset...`, 'info', datasetType)
        updateProgress(datasetIndex, 4, 'running', 'Validating selected organization units...')
        
        try {
            const selectedOrgUnits = orgUnits || []
            
            if (selectedOrgUnits.length === 0) {
                addLog(`⚠️ No organization units selected for ${datasetType}`, 'warning', datasetType)
                report.warnings.push(`No organization units selected for ${datasetType}`)
            } else {
                selectedOrgUnits.forEach(orgUnit => {
                    addLog(`📋 Selected org unit: ${orgUnit.name} (${orgUnit.id}) - Level ${orgUnit.level || 'Unknown'}`, 'info', datasetType)
                })
            }
            
            report.steps.organisationUnits = {
                status: 'completed',
                selected: selectedOrgUnits.length,
                validated: selectedOrgUnits.map(ou => ({ id: ou.id, name: ou.name, level: ou.level }))
            }
            
            updateProgress(datasetIndex, 4, 'completed', `${selectedOrgUnits.length} org units validated`)
            addLog(`✅ Organization units validated (${selectedOrgUnits.length} selected)`, 'success', datasetType)
            
        } catch (err) {
            const detail = formatDhis2Error(err)
            updateProgress(datasetIndex, 4, 'failed', detail)
            throw new Error(`Organization units validation failed: ${detail}`)
        }
    }

    const configureSharingSettings = async (datasetIndex, datasetType, report) => {
        addLog(`🔐 Configuring sharing settings for ${datasetType}...`, 'info', datasetType)
        updateProgress(datasetIndex, 5, 'running', 'Setting up sharing configuration...')
        
        try {
            // Default sharing configuration
            const sharingConfig = {
                public: 'rw------',
                external: false,
                users: {},
                userGroups: {}
            }
            
            report.steps.sharing = {
                status: 'completed',
                config: sharingConfig
            }
            
            updateProgress(datasetIndex, 5, 'completed', 'Sharing configured')
            addLog(`✓ Sharing settings configured`, 'success', datasetType)
            
        } catch (err) {
            const detail = formatDhis2Error(err)
            updateProgress(datasetIndex, 5, 'failed', detail)
            throw new Error(`Sharing configuration failed: ${detail}`)
        }
    }

    const createDatasetPayload = async (datasetIndex, datasetType, report) => {
        addLog(`📦 Creating dataset payload for ${datasetType}...`, 'info', datasetType)
        updateProgress(datasetIndex, 6, 'running', 'Building dataset structure...')
        
        try {
            const dataset = datasets[datasetType]
            const createdElements = report.metadata?.dataElements || []
            const fallbackElements = dataElements[datasetType] || []
            const datasetElements = createdElements.length ? createdElements : fallbackElements

            if (!datasetElements.length) {
                addLog(`⚠️ No data elements available with IDs for ${datasetType}; cannot build dataset elements.`, 'warning', datasetType)
            }

            // Only include elements that have an id
            const elementsForPayload = datasetElements.filter(de => de?.id)

            if (elementsForPayload.length === 0) {
                throw new Error('No data elements with IDs available for dataset payload')
            }
            
            const payload = {
                // Do not send client-generated dataset id; only include if it matches DHIS2 UID pattern and is known to exist
                id: (typeof dataset.id === 'string' && /^[A-Za-z][A-Za-z0-9]{10}$/.test(dataset.id)) ? dataset.id : undefined,
                name: dataset.name,
                shortName: dataset.shortName || dataset.name,
                code: dataset.code,
                formName: dataset.formName || dataset.name,
                periodType: dataset.periodType || 'Monthly',
                expiryDays: Number.isInteger(dataset.expiryDays) ? dataset.expiryDays : 0,
                openFuturePeriods: Number.isInteger(dataset.openFuturePeriods) ? dataset.openFuturePeriods : 0,
                timelyDays: Number.isInteger(dataset.timelyDays) ? dataset.timelyDays : 15,
                compulsoryDataElementOperands: Array.isArray(dataset.compulsoryDataElementOperands) ? dataset.compulsoryDataElementOperands : [],
                // Use selected or provided category combo; fall back to DHIS2 default
                categoryCombo: dataset?.categoryCombo?.id ? { id: dataset.categoryCombo.id } : { id: 'bjDvmb4bfuf' },
                dataSetElements: elementsForPayload.map((de, idx) => ({
                    dataElement: { id: de.id },
                    sortOrder: idx + 1
                })),
                organisationUnits: orgUnits.map(ou => ({ id: ou.id })),
                // Add attribute value for per-dataset generated UID (if attribute exists)
                attributeValues: datasetUidAttributeIdRef.current ? [{
                    attribute: { id: datasetUidAttributeIdRef.current },
                    value: (datasets?.[datasetType]?.generatedUidForRun || dataset.generatedUidForRun || generateUID())
                }] : undefined,
                // Embed sharing directly per requested format
                sharing: (() => {
                    const userGroups = {}
                    const ids = userGroupIdsRef.current || {}
                    if (ids.users) userGroups[ids.users] = { access: 'rwrw----' }
                    if (ids.admins) userGroups[ids.admins] = { access: 'rwrw----' }
                    return {
                        public: 'rwrw----',
                        userGroups
                    }
                })()
            }

            // Capture mapping between created elements and source dataset elements for datastore completeness
            try {
                const sourceElements = Array.isArray(dataElements?.[datasetType]) ? dataElements[datasetType] : []
                const elementMappings = elementsForPayload.map((de, idx) => ({
                    createdId: de.id,
                    createdCode: de.code || null,
                    createdName: de.name || null,
                    sourceId: sourceElements[idx]?.id || null,
                    sourceCode: sourceElements[idx]?.code || null,
                    sourceName: sourceElements[idx]?.name || sourceElements[idx]?.displayName || null,
                    smsCode: (sourceElements[idx]?.smsCode || '').toString().trim() || null
                }))
                report.metadata.elementMappings = report.metadata.elementMappings || {}
                report.metadata.elementMappings[datasetType] = elementMappings
            } catch (mapErr) {
                addLog(`⚠️ Unable to compute element mappings: ${mapErr?.message || mapErr}`, 'warning', datasetType)
            }
            
            report.metadata.datasetPayload = payload
            report.steps.payload = {
                status: 'completed',
                elements: elementsForPayload.length,
                orgUnits: orgUnits.length
            }
            
            if (createdElements.length && fallbackElements.length && createdElements.length !== fallbackElements.length) {
                addLog(`ℹ️ Using ${createdElements.length} created data elements (out of ${fallbackElements.length} defined) for ${datasetType} payload.`, 'info', datasetType)
            }
            
            updateProgress(datasetIndex, 6, 'completed', `Payload ready (${elementsForPayload.length} elements, ${orgUnits.length} org units)`)
            addLog(`✓ Dataset payload created`, 'success', datasetType)
            
        } catch (err) {
            const detail = formatDhis2Error(err)
            updateProgress(datasetIndex, 6, 'failed', detail)
            throw new Error(`Dataset payload creation failed: ${detail}`)
        }
    }

    const createDatasetInSystem = async (datasetIndex, datasetType, report) => {
        addLog(`🚀 Creating ${datasetType} dataset in DHIS2...`, 'info', datasetType)
        updateProgress(datasetIndex, 7, 'running', 'Submitting to DHIS2...')
        
        try {
            const payload = report.metadata.datasetPayload
            
            // Pre-submit diagnostics to help troubleshoot server-side 500s
            addLog(
                `🧾 Submitting dataset payload: name="${payload.name}", code="${payload.code}", elements=${payload.dataSetElements?.length || 0}, orgUnits=${payload.organisationUnits?.length || 0}`,
                'info',
                datasetType
            )

            let response
            try {
                response = await dataEngine.mutate(
                    metadataQueries.createDatasets,
                    { variables: { dataSets: [payload] } }
                )
            } catch (e) {
                const httpCode = e?.details?.httpStatusCode || e?.httpStatusCode || e?.statusCode
                const msg = e?.message || ''
                const conflict = httpCode === 409 || /409|already exists|conflict/i.test(msg)
                if (conflict) {
                    addLog(`ℹ️ Dataset already exists; reusing existing object.`, 'info', datasetType)
                    // 1) Try parse ImportReport for UID
                    const tr = e?.details?.response?.typeReports || e?.response?.response?.typeReports
                    const or = Array.isArray(tr) ? tr.flatMap(r => r.objectReports || []) : []
                    const mainId = or.find(o => o?.uid)?.uid
                    if (mainId) {
                        response = { status: 'OK', response: { typeReports: [{ klass: 'org.hisp.dhis.dataset.DataSet', objectReports: [{ uid: mainId }] }] } }
                    } else {
                        // 2) Fallback: find by code
                        try {
                            const findRes = await dataEngine.query({
                                dss: {
                                    resource: 'dataSets',
                                    params: { fields: 'id,name,code', filter: `code:eq:${payload.code}` }
                                }
                            })
                            const existing = findRes?.dss?.dataSets?.[0]
                            if (existing?.id) {
                                response = { status: 'OK', response: { typeReports: [{ klass: 'org.hisp.dhis.dataset.DataSet', objectReports: [{ uid: existing.id }] }] } }
                            } else if (payload.name) {
                                // 3) Fallback: find by name
                                const byName = await dataEngine.query({
                                    dss: {
                                        resource: 'dataSets',
                                        params: { fields: 'id,name,code', filter: `name:eq:${payload.name}`, pageSize: 1 }
                                    }
                                })
                                const existByName = byName?.dss?.dataSets?.[0]
                                if (existByName?.id) {
                                    response = { status: 'OK', response: { typeReports: [{ klass: 'org.hisp.dhis.dataset.DataSet', objectReports: [{ uid: existByName.id }] }] } }
                                } else {
                                    throw e
                                }
                            } else {
                                throw e
                            }
                        } catch {
                            throw e
                        }
                    }
                } else {
                    throw e
                }
            }

            // Try to summarize import report if present
            const importCount = response?.importCount || response?.response?.importCount
            const typeReports = response?.typeReports || response?.response?.typeReports
            if (importCount) {
                addLog(
                    `📥 Import summary: imported=${importCount.imported || 0}, updated=${importCount.updated || 0}, ignored=${importCount.ignored || 0}, deleted=${importCount.deleted || 0}`,
                    'info',
                    datasetType
                )
            }
            if (Array.isArray(typeReports) && typeReports.length) {
                const firstReport = typeReports[0]
                const klass = firstReport.klass?.split('.').pop()
                const objCount = firstReport.stats?.total || firstReport.objectReports?.length || 0
                addLog(`📑 Type report: ${klass || 'unknown'} total=${objCount}`, 'info', datasetType)
                // Log detailed import errors if any
                typeReports.forEach(tr => {
                    (tr.objectReports || []).forEach(or => {
                        (or.errorReports || []).forEach(er => {
                            const errMsg = [er.message, er.errorCode, er.mainKlass, er.mainId].filter(Boolean).join(' | ')
                            addLog(`❌ Import error: ${errMsg}`, 'error', datasetType)
                        })
                    })
                })
            }

            // Normalize OK detection across variants
            const status = response?.status || response?.importCount ? 'OK' : response?.createDataset?.status
            if (status === 'OK') {
                // Extract created dataset UID if available for sharing update
                let createdDatasetId = payload.id
                const tr = response?.typeReports || response?.response?.typeReports
                if (Array.isArray(tr)) {
                    const dsReport = tr.find(r => (r.klass || '').endsWith('.DataSet')) || tr[0]
                    const obj = dsReport?.objectReports?.[0]
                    if (obj?.uid) createdDatasetId = obj.uid
                }

                // Defer SMS command creation until all datasets are completed
                const datasetCfg = datasets?.[datasetType] || {}
                if (datasetCfg?.smsEnabled) {
                    addLog(`ℹ️ SMS command for ${datasetType} will be created after all datasets finish.`, 'info', datasetType)
                }
                if (createdDatasetId) {
                    report.metadata.datasetId = createdDatasetId
                    addLog(`🆔 Dataset UID: ${createdDatasetId}`, 'info', datasetType)
                } else {
                    addLog(`ℹ️ Dataset UID not returned; will try fallback for sharing update.`, 'warning', datasetType)
                }

                report.steps.creation = {
                    status: 'completed',
                    response
                }

                updateProgress(datasetIndex, 7, 'completed', 'Dataset created successfully')
                addLog(`✅ Dataset created in DHIS2 system`, 'success', datasetType)
            } else {
                throw new Error('Dataset creation returned non-OK status')
            }
            
        } catch (err) {
            // Extract best-effort diagnostics from error
            const httpCode = err?.details?.httpStatusCode || err?.httpStatusCode || err?.statusCode
            const devMsg = err?.details?.devMessage || err?.devMessage
            const msg = err?.message || String(err)

            // Try to surface detailed import errors from DHIS2 response
            const typeReportsErr = err?.details?.response?.typeReports || err?.details?.response?.importReport?.typeReports || err?.response?.response?.typeReports || []
            const conflicts = err?.details?.response?.conflicts || err?.response?.response?.conflicts || []
            const errorLines = []
            if (Array.isArray(typeReportsErr)) {
                typeReportsErr.forEach(tr => {
                    (tr.objectReports || []).forEach(or => {
                        (or.errorReports || []).forEach(er => {
                            const parts = []
                            if (er.errorCode) parts.push(`[${er.errorCode}]`)
                            if (er.message) parts.push(er.message)
                            if (er.mainKlass) parts.push(er.mainKlass)
                            if (er.mainId) parts.push(er.mainId)
                            if (er.uid) parts.push(er.uid)
                            if (Array.isArray(er.args) && er.args.length) parts.push(JSON.stringify(er.args))
                            errorLines.push(parts.join(' '))
                        })
                    })
                })
            }
            if (Array.isArray(conflicts) && conflicts.length) {
                conflicts.forEach(c => errorLines.push(`Conflict: ${(c.object || '').toString()} - ${(c.value || '').toString()}`.trim()))
            }
            if (errorLines.length) {
                errorLines.slice(0, 5).forEach(line => addLog(`❌ Import error: ${line}`,'error',datasetType))
                if (Array.isArray(report?.errors)) report.errors.push(...errorLines.slice(0, 10))
            }

            addLog(
                `❌ Dataset create failed${httpCode ? ` (HTTP ${httpCode})` : ''}: ${msg}${devMsg ? ` | ${devMsg}` : ''}`,
                'error',
                datasetType
            )

            const detailMsg = errorLines.length ? errorLines[0] : (httpCode ? `HTTP ${httpCode}` : msg)
            updateProgress(datasetIndex, 7, 'failed', detailMsg)
            throw new Error(`Dataset creation failed: ${msg}${httpCode ? ` - HTTP ${httpCode}` : ''}${errorLines.length ? ` | Details: ${errorLines[0]}` : ''}`)
        }
    }

    const finalizeConfiguration = async (datasetIndex, datasetType, report) => {
        addLog(`🏁 Finalizing ${datasetType} dataset configuration...`, 'info', datasetType)
        updateProgress(datasetIndex, 8, 'running', 'Applying final settings...')
        
        try {
            // Apply sharing settings if needed
            const datasetId = datasets[datasetType].id
            const sharingConfig = (report?.steps?.sharing?.config) || {
                public: datasets?.[datasetType]?.sharingPublicAccess || 'rw------',
                external: !!datasets?.[datasetType]?.sharingExternal,
                users: {},
                userGroups: {}
            }
            
            // Ensure dataset has public access for data capture (rw------)
            const finalDatasetId = report.metadata?.datasetId || datasets[datasetType]?.id
            // Sharing is now embedded in the dataset payload; skip separate sharing updates
            addLog(`ℹ️ Sharing is embedded in dataset payload; no separate sharing call needed.`, 'info', datasetType)
            
            report.steps.finalization = {
                status: 'completed',
                timestamp: new Date().toISOString()
            }
            
            updateProgress(datasetIndex, 8, 'completed', 'Configuration finalized')
            addLog(`✓ ${datasetType.toUpperCase()} dataset configuration finalized`, 'success', datasetType)
            
        } catch (err) {
            const detail = formatDhis2Error(err)
            updateProgress(datasetIndex, 8, 'failed', detail)
            throw new Error(`Finalization failed: ${detail}`)
        }
    }

    const buildAssessmentPayload = (report) => {
        // Assemble a compact payload describing created datasets for datastore
        const datasetsPayload = {}
        for (const type of Object.keys(report.datasets)) {
            const ds = report.datasets[type]
            const stepsInfo = ds?.steps || {}
            datasetsPayload[type] = {
                datasetId: ds?.metadata?.datasetId || datasets?.[type]?.id || null,
                datasetCode: datasets?.[type]?.code || ds?.metadata?.datasetPayload?.code || null,
                datasetName: datasets?.[type]?.name || ds?.metadata?.datasetPayload?.name || null,
                payload: ds?.metadata?.datasetPayload || null,
                elementMappings: (ds?.metadata?.elementMappings && ds.metadata.elementMappings[type]) ? ds.metadata.elementMappings[type] : [],
                smsCommand: ds?.metadata?.smsCommand || null,
                // Include all previous steps content for full traceability
                categoryOptions: stepsInfo?.categoryOptions || null,
                categories: stepsInfo?.categories || null,
                categoryCombos: stepsInfo?.categoryCombos || null,
                dataElements: {
                    created: stepsInfo?.dataElements?.created || 0,
                    existing: stepsInfo?.dataElements?.existing || 0,
                    failed: stepsInfo?.dataElements?.failed || 0,
                    total: stepsInfo?.dataElements?.total || 0,
                    errors: stepsInfo?.dataElements?.errors || []
                },
                organisationUnits: stepsInfo?.organisationUnits?.validated || [],
                sharing: stepsInfo?.sharing?.config || null,
                steps: ds?.steps || {},
                errors: ds?.errors || [],
                warnings: ds?.warnings || [],
            }
        }
        // Flatten element mappings across types into a single top-level array
        const flatElementMappings = []
        try {
            for (const [type, data] of Object.entries(datasetsPayload)) {
                const pairs = Array.isArray(data.elementMappings) ? data.elementMappings : []
                pairs.forEach(p => flatElementMappings.push({ datasetType: type, ...p }))
            }
        } catch (_) {}

        return {
            assessmentName,
            createdAt: new Date().toISOString(),
            summary: report.summary,
            datasets: datasetsPayload,
            elementMappings: flatElementMappings, // top-level array as requested
            orgUnits: (orgUnits || []).map(o => ({ id: o.id, name: o.name })),
        }
    }

    const downloadReport = () => {
        if (!creationReport) return
        
        const mdHeader = `# Dataset Creation Run\n\n- Assessment: ${assessmentName}\n- Date: ${new Date().toISOString()}\n\n## Log\n`
        const mdLog = (reportRef.current?.markdown || []).join('\n')
        const mdFooter = `\n\n## Summary\n- Datasets: ${creationReport?.summary?.total}\n- Created: ${creationReport?.summary?.created}\n- Failed: ${creationReport?.summary?.failed}\n- Warnings: ${creationReport?.summary?.warnings}\n`
        const content = `${mdHeader}${mdLog}${mdFooter}`
        const blob = new Blob([content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dataset-creation-${assessmentName}-${new Date().toISOString().split('T')[0]}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const generateReportContent = (report) => {
        let content = `DATASET CREATION REPORT\n`
        content += `========================\n\n`
        content += `Assessment: ${report.assessmentName}\n`
        content += `Start Time: ${new Date(report.startTime).toLocaleString()}\n`
        content += `End Time: ${new Date(report.endTime).toLocaleString()}\n`
        content += `Duration: ${Math.round(report.duration / 1000)}s\n\n`
        
        content += `SUMMARY\n`
        content += `-------\n`
        content += `Total Datasets: ${report.summary.total}\n`
        content += `Successfully Created: ${report.summary.created}\n`
        content += `Failed: ${report.summary.failed}\n`
        content += `Warnings: ${report.summary.warnings}\n\n`
        
        Object.entries(report.datasets).forEach(([type, dataset]) => {
            content += `${type.toUpperCase()} DATASET\n`
            content += `${'-'.repeat(type.length + 8)}\n`
            
            Object.entries(dataset.steps).forEach(([step, details]) => {
                content += `${step}: ${details.status}\n`
            })
            
            if (dataset.warnings.length > 0) {
                content += `Warnings:\n`
                dataset.warnings.forEach(warning => {
                    content += `  - ${warning}\n`
                })
            }
            
            if (dataset.errors.length > 0) {
                content += `Errors:\n`
                dataset.errors.forEach(error => {
                    content += `  - ${error}\n`
                })
            }
            
            content += `\n`
        })
        
        return content
    }

    const generateFinalReport = () => {
        if (!creationReport) return ''
        
        let report = `DHIS2 Dataset Creation Report\n`
        report += `${'='.repeat(50)}\n\n`
        
        report += `Assessment: ${creationReport.assessmentName}\n`
        report += `Started: ${new Date(creationReport.startTime).toLocaleString()}\n`
        report += `Completed: ${new Date(creationReport.endTime).toLocaleString()}\n`
        report += `Duration: ${Math.round(creationReport.duration / 1000)} seconds\n\n`
        
        report += `SUMMARY\n`
        report += `${'─'.repeat(20)}\n`
        report += `Total Datasets: ${creationReport.summary.total}\n`
        report += `Successfully Created: ${creationReport.summary.created}\n`
        report += `Failed: ${creationReport.summary.failed}\n`
        report += `Warnings: ${creationReport.summary.warnings}\n\n`
        
        report += `DETAILED LOG\n`
        report += `${'─'.repeat(20)}\n`
        logs.forEach(log => {
            const prefix = log.datasetType ? `[${log.datasetType.toUpperCase()}]` : ''
            report += `${log.timestamp} ${prefix} ${log.message}\n`
        })
        
        report += `\n${'='.repeat(50)}\n`
        report += `End of Report\n`
        
        return report
    }



    const getStepStatus = (datasetIndex, stepIndex) => {
        const key = `${datasetIndex}-${stepIndex}`
        return progress[key]?.status || 'pending'
    }

    const getStepIcon = (status) => {
        switch (status) {
            case 'completed': return '✅'
            case 'running': return '⏳'
            case 'failed': return '❌'
            default: return '⭕'
        }
    }

    const getLogIcon = (type) => {
        switch (type) {
            case 'success': return '✅'
            case 'error': return '❌'
            case 'warning': return '⚠️'
            default: return 'ℹ️'
        }
    }

    if (!isOpen) return null

    return (
        <Modal large onClose={() => { setCancelRequested(true); onClose?.() }} className={styles.modal}>
            <ModalTitle className={styles.modalTitle}>
                🚀 Dataset Creation Progress - {assessmentName}
            </ModalTitle>
            
            <ModalContent className={styles.modalContent}>
                <div className={styles.container}>
                    {error && (
                        <NoticeBox error title="Creation Failed">
                            {error}
                        </NoticeBox>
                    )}
                    
                    {success && creationReport && (
                        <NoticeBox valid title="Creation Completed">
                            Successfully created {creationReport.summary.created} out of {creationReport.summary.total} datasets.
                            {creationReport.summary.warnings > 0 && ` (${creationReport.summary.warnings} warnings)`}
                        </NoticeBox>
                    )}
                    
                    {/* Progress Overview */}
                    <Card className={styles.progressCard}>
                        <Box padding="16px">
                            <div className={styles.overallProgress}>
                                <div className={styles.progressInfo}>
                                    <span><strong>Current Dataset:</strong> {datasetTypes[currentDataset]?.toUpperCase() || 'N/A'} ({currentDataset + 1}/{datasetTypes.length})</span>
                                    <span><strong>Current Step:</strong> {steps[(activeStepIndices[currentStep] ?? currentStep)]} ({currentStep + 1}/{activeStepIndices.length || steps.length})</span>
                                </div>
                                <LinearLoader 
                                    amount={isCreating ? ((currentDataset * (activeStepIndices.length || steps.length) + currentStep + 1) / (datasetTypes.length * (activeStepIndices.length || steps.length))) * 100 : 0}
                                />
                            </div>
                        </Box>
                    </Card>
                    
                    {/* Real-time Log Stream */}
                    <Card className={styles.logsCard}>
                        <Box padding="16px">
                            <h3 className={styles.sectionTitle}>📝 Real-time Creation Log</h3>
                            <div className={styles.logsContainer} ref={logsContainerRef}>
                                {logs.length === 0 ? (
                                    <div className={styles.noLogs}>
                                        Ready to start dataset creation. Click "Start Creation" to begin.
                                    </div>
                                ) : (
                                    logs
                                        .filter((log, idx, arr) => {
                                            const prev = arr[idx - 1]
                                            return !(prev && prev.message === log.message && prev.type === log.type && prev.datasetType === log.datasetType)
                                        })
                                        .map(log => (
                                            <div key={log.id} className={`${styles.logEntry} ${styles[log.type]}`}>
                                                <span className={styles.logTime}>{log.timestamp}</span>
                                                <span className={styles.logIcon}>{getLogIcon(log.type)}</span>
                                                <span className={styles.logMessage}>{log.message}</span>
                                                {log.datasetType && (
                                                    <span className={styles.logDataset}>[{log.datasetType.toUpperCase()}]</span>
                                                )}
                                            </div>
                                        ))
                                )}
                            </div>
                        </Box>
                    </Card>
                </div>
            </ModalContent>
            
            <ModalActions>
                {!isCreating && !success && (
                    <Button primary onClick={startCreation}>
                        🚀 Start Creation
                    </Button>
                )}
                
                {success && creationReport && (
                    <Button secondary onClick={downloadReport}>
                        📄 Download Report
                    </Button>
                )}
                
                <Button secondary onClick={() => { setCancelRequested(true); onClose?.() }}>
                    {isCreating ? 'Cancel & Close' : 'Close'}
                </Button>
            </ModalActions>
        </Modal>
    )
}

export default DatasetCreationModal