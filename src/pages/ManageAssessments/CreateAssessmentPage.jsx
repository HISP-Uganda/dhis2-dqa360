import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Button,
    ButtonStrip,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    NoticeBox,
    Tab,
    TabBar,
    InputField,
    TextAreaField,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useDataEngine } from '@dhis2/app-runtime'

// Steps
import DetailsStep from './AssessmentSteps/DetailsStep'
import ConnectionStep from './AssessmentSteps/ConnectionStep'
import DatasetsStep from './AssessmentSteps/DatasetsStep'
import ElementsStep from './AssessmentSteps/ElementsStep'
import OrgUnitsStep from './AssessmentSteps/OrgUnitsStep'
import OrgUnitMappingStep from './AssessmentSteps/OrgUnitMappingStep'
import PreparationStep from './AssessmentSteps/PreparationStep'
import ReviewStep from './AssessmentSteps/ReviewStep'

// App hooks/services
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'
import { useUserAuthorities } from '../../hooks/useUserAuthorities'

// ---------------------- draft storage ----------------------
const DRAFT_KEY = 'dqa360_create_assessment_draft_v1'
const loadDraft = () => {
    try {
        const raw = localStorage.getItem(DRAFT_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}
const saveDraft = (partial) => {
    try {
        const curr = loadDraft() || {}
        const next = { ...curr, ...partial, __updatedAt: new Date().toISOString() }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    } catch {}
}
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch {} }

// ---------------------- helpers ----------------------
/* Clean URL for display: unescape HTML entities (even double-encoded) + safe percent decode */
const decodeHtmlEntities = (input = '') => {
    if (!input) return ''
    let out = String(input).trim()
    for (let i = 0; i < 3; i++) {
        const before = out
        // DOMParser path (handles many edge cases)
        if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
            try {
                const doc = new DOMParser().parseFromString(out, 'text/html')
                out = (doc.documentElement && doc.documentElement.textContent) || out
            } catch { /* noop */ }
        }
        // Manual fallback
        out = out
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&sol;/g, '/')
            .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
                const code = parseInt(hex, 16)
                return Number.isFinite(code) ? String.fromCodePoint(code) : _
            })
            .replace(/&#(\d+);/g, (_, dec) => {
                const code = parseInt(dec, 10)
                return Number.isFinite(code) ? String.fromCodePoint(code) : _
            })
        if (out === before) break
    }
    // Common leftover
    out = out.replace(/&#x2F;/g, '/')
    // Best-effort percent decode
    try { out = decodeURIComponent(out) } catch { /* ignore */ }
    // Collapse duplicate slashes except protocol
    out = out.replace(/([^:]\/)\/+/g, '$1')
    // Trim trailing slashes
    out = out.replace(/\/+$/, '')
    return out
}

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

const formatUserInfo = (userInfo) => {
    if (!userInfo) return 'unknown'
    const username = userInfo.username || 'unknown'
    const first = userInfo.firstName || userInfo.name || ''
    const last = userInfo.surname || userInfo.lastName || ''
    const full = [first, last].filter(Boolean).join(' ').trim()
    return full ? `${username} (${full})` : username
}

// SMS helpers
const sanitizeForCommand = (s) => (s || 'CMD')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 30)

// Extended default responses + backward-compatible aliases
const defaultSmsResponses = (dsName) => ({
    success: i18n.t('Thank you. {{dataset}} for {{period}} at {{orgUnit}} received.', { dataset: dsName || '{{dataset}}' }),
    wrongFormat: i18n.t("Sorry, we couldn't process your message. Reply HELP for guidance."),
    noUser: i18n.t('Your number is not registered for this service.'),
    multipleOrgUnits: i18n.t('We found more than one org unit for your number. Please include the org unit code.'),
    noCodes: i18n.t('Please include data codes. Reply HELP for the format.'),
    onlyCommand: i18n.t('Command received. Now send data using: {{command}} <DATA>'),
    // legacy aliases
    error: i18n.t("Sorry, we couldn't process your message. Reply HELP for guidance."),
    help: i18n.t('Format: {{command}} <DATA>. Example: {{command}} 010 23 ...'),
    duplicate: i18n.t('Already submitted for {{period}}.'),
    notAuthorized: i18n.t('Your number is not registered for this service.'),
    validationFailed: i18n.t('Some values are invalid. Please check and resend.')
})

const normalizeResponses = (dsName, commandName, existing = {}) => {
    const base = defaultSmsResponses(dsName)
    const merged = { ...base, ...existing }
    if (!merged.wrongFormat && merged.error) merged.wrongFormat = merged.error
    if (!merged.noUser && merged.notAuthorized) merged.noUser = merged.notAuthorized
    return merged
}

// Static lists (keep)
const ASSESSMENT_TYPES = [
    { value: 'baseline', label: i18n.t('Baseline Assessment') },
    { value: 'followup', label: i18n.t('Follow-up Assessment') },
]
const PRIORITIES = [
    { value: 'low', label: i18n.t('Low') },
    { value: 'medium', label: i18n.t('Medium') },
    { value: 'high', label: i18n.t('High') },
]
const METHODOLOGIES = [
    { value: 'automated', label: i18n.t('Automated') },
    { value: 'manual', label: i18n.t('Manual') },
    { value: 'hybrid', label: i18n.t('Hybrid') },
]
const CONFIDENTIALITY_LEVELS = [
    { value: 'public', label: i18n.t('Public') },
    { value: 'internal', label: i18n.t('Internal') },
    { value: 'restricted', label: i18n.t('Restricted') },
]
const DATA_RETENTION_PERIODS = [
    { value: '1year', label: i18n.t('1 year') },
    { value: '3years', label: i18n.t('3 years') },
    { value: '5years', label: i18n.t('5 years') },
    { value: '7years', label: i18n.t('7 years') },
]
const DATA_QUALITY_DIMENSIONS = [
    { value: 'accuracy', label: i18n.t('Accuracy') },
    { value: 'completeness', label: i18n.t('Completeness') },
    { value: 'timeliness', label: i18n.t('Timeliness') },
    { value: 'consistency', label: i18n.t('Consistency') },
    { value: 'validity', label: i18n.t('Validity') },
    { value: 'integrity', label: i18n.t('Integrity') },
    { value: 'uniqueness', label: i18n.t('Uniqueness') },
    { value: 'reliability', label: i18n.t('Reliability') },
    { value: 'precision', label: i18n.t('Precision') },
]

// --- connection helpers ---
const isValidHttpUrl = (value) => {
    if (!value || typeof value !== 'string') return false
    try {
        const u = new URL(value.trim())
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false
    }
}
const isConnectionConfigured = (metadataSource, cfg) => {
    if (metadataSource !== 'external') return true
    if (!cfg || !isValidHttpUrl(cfg.baseUrl)) return false

    const status = cfg.connectionStatus
    if (status !== 'configured' && status !== 'ok') return false

    const authType = (cfg.authType || '').toLowerCase()
    if (authType === 'token') {
        return !!(cfg.token && cfg.token.trim().length >= 12)
    }
    return !!(cfg.username && cfg.username.trim() && cfg.password && cfg.password.trim())
}

/**
 * Load datasets (local OR external) with one call.
 * - Defaults to skipPaging=true (modern, loads all datasets at once)
 * - If the server still returns a pager, auto-fetch the remaining pages
 * - Returns { dataSets, sourceUrl }
 */
const loadDatasets = async ({
                                engine,                    // required when source==='local'
                                source = 'local',          // 'local' | 'external'
                                externalConfig = null,     // required when source==='external'
                                fields,                    // DHIS2 fields expression (required)
                                order = 'name:asc',
                                skipPaging = true,
                                pageSize = 1000,
                                filter = null,             // optional filter parameter
                                signal
                            }) => {
    if (!fields || typeof fields !== 'string') {
        throw new Error('loadDatasets: "fields" is required')
    }

    const paramsBase = { fields, order }
    if (filter) {
        paramsBase.filter = filter
    }
    if (skipPaging) {
        paramsBase.skipPaging = true
    } else {
        paramsBase.paging = true
        paramsBase.pageSize = pageSize
        paramsBase.page = 1
    }

    const fetchExternal = async () => {
        const cfg = externalConfig || {}
        const trim = s => (s || '').trim()
        const trimSlash = u => trim(u).replace(/\/+$/, '')
        const root = trimSlash(cfg.baseUrl || '')
        const v = trim(String(cfg.apiVersion ?? ''))
        const versionPart = v ? `/v${v.replace(/^v/i, '')}` : ''
        const apiBase = `${root}/api${versionPart}`

        const headers = { Accept: 'application/json' }
        if ((cfg.authType || 'basic').toLowerCase() === 'token') {
            const tok = (cfg.token || '').trim()
            if (tok) headers.Authorization = `ApiToken ${tok}`
        } else if (cfg.username || cfg.password) {
            headers.Authorization = `Basic ${btoa(`${cfg.username || ''}:${cfg.password || ''}`)}`
        }

        const buildUrl = p => `${apiBase}/dataSets?${new URLSearchParams(p).toString()}`

        // 1) try single shot
        let res = await fetch(buildUrl(paramsBase), { headers, credentials: 'omit', mode: 'cors', signal })
        if (res.status === 401) throw new Error('Authentication failed')
        if (res.status === 403) throw new Error('Access denied')
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

        let json = await res.json()
        let list = Array.isArray(json?.dataSets) ? json.dataSets : []

        // 2) if server ignored skipPaging (pager present), fetch all pages
        const pager = json?.pager
        if (pager && pager.pageCount && pager.pageCount > 1) {
            const all = [...list]
            for (let page = (pager.page || 1) + 1; page <= pager.pageCount; page++) {
                const resPage = await fetch(buildUrl({ ...paramsBase, paging: true, skipPaging: undefined, pageSize, page }), {
                    headers, credentials: 'omit', mode: 'cors', signal
                })
                if (!resPage.ok) throw new Error(`HTTP ${resPage.status} on page ${page}`)
                const jsonPage = await resPage.json()
                const listPage = Array.isArray(jsonPage?.dataSets) ? jsonPage.dataSets : []
                all.push(...listPage)
            }
            list = all
        }

        return { dataSets: list, sourceUrl: decodeHtmlEntities(cfg.baseUrl || '') }
    }

    const fetchLocal = async () => {
        console.log('🏠 Fetching local datasets with params:', paramsBase)
        
        const res = await engine.query({
            dataSets: { resource: 'dataSets', params: paramsBase }
        }, { signal })

        const list = Array.isArray(res?.dataSets?.dataSets) ? res.dataSets.dataSets
            : Array.isArray(res?.dataSets) ? res.dataSets
                : []
                
        console.log('🏠 Local fetch result:', { 
            totalDatasets: list.length, 
            firstDataset: list[0] ? { id: list[0].id, name: list[0].name } : null 
        })
        
        return { dataSets: list, sourceUrl: `${window.location.origin}` }
    }

    return source === 'external' ? fetchExternal() : fetchLocal()
}

// Add CSS for spinner animation
const spinnerStyle = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`

export const CreateAssessmentPage = () => {
    const navigate = useNavigate()
    const dataEngine = useDataEngine()
    const { userInfo } = useUserAuthorities()
    const { saveAssessment, listAssessments } = useAssessmentDataStore()

    // Inject CSS for spinner animation
    useEffect(() => {
        const styleId = 'create-assessment-spinner-styles'
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style')
            style.id = styleId
            style.textContent = spinnerStyle
            document.head.appendChild(style)
        }
        return () => {
            const style = document.getElementById(styleId)
            if (style) style.remove()
        }
    }, [])

    // Clear any existing draft when starting fresh assessment creation
    useEffect(() => {
        clearDraft()
    }, [])

    // ----- UI state -----
    const [activeTab, setActiveTab] = useState('details')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [corsError, setCorsError] = useState(null)

    // ----- domain state -----
    const [metadataSource, setMetadataSource] = useState('local') // 'local' | 'external'
    const [externalConfig, setExternalConfig] = useState(null)
    const [datasetPreparationComplete, setDatasetPreparationComplete] = useState(false)
    const [loadingSource, setLoadingSource] = useState('')

    const [assessmentData, setAssessmentData] = useState({
        name: '',
        description: '',
        objectives: '',
        scope: '',
        assessmentType: 'baseline',
        priority: 'medium',
        methodology: 'automated',
        frequency: '',
        reportingLevel: '',
        dataQualityDimensions: ['accuracy'],
        dataDimensionsQuality: ['accuracy'], // Add this for compatibility
        successCriteriaPredefined: [],
        successCriteria: '',
        confidentialityLevel: 'internal',
        dataRetentionPeriod: '5years',
        notifications: true, // Add missing field
        autoSync: true,
        validationAlerts: false, // Fix default value
        historicalComparison: false,
        publicAccess: false,
        startDate: '',
        endDate: '',
        baselineAssessmentId: '',
        period: '',
        status: 'draft', // Add missing field
        tags: [], // Add missing field
        customFields: {}, // Add missing field
        stakeholders: [], // Add missing field
        riskFactors: [], // Add missing field
        notes: '', // Add missing field
    })

    // datasets
    const [localDatasets, setLocalDatasets] = useState([])
    const [selectedDataSets, setSelectedDataSets] = useState([])
    
    // Debug dataset selection changes
    useEffect(() => {
        console.log('📊 Selected datasets changed:', selectedDataSets)
    }, [selectedDataSets])
    const [datasetsLoading, setDatasetsLoading] = useState(false)
    const [datasetsPage, setDatasetsPage] = useState(1)
    const [datasetsHasMore, setDatasetsHasMore] = useState(false) // default false with skipPaging

    // Cache for dataset requests to avoid repeated API calls
    const [datasetsCache] = useState(new Map())


    // Preloaded datasets from connection step
    const [preloadedDatasets, setPreloadedDatasets] = useState(null)
    const [preloadTimestamp, setPreloadTimestamp] = useState(null)

    // data elements (derived + selection)
    const [elementsAll, setElementsAll] = useState([])
    const [selectedElementIds, setSelectedElementIds] = useState([])

    // org units (derived from datasets + selection)
    const [orgUnitsAll, setOrgUnitsAll] = useState([])
    const [selectedOrgUnitIds, setSelectedOrgUnitIds] = useState([])

    // local org units (for mapping targets - always from local DHIS2)
    const [localOrgUnitsAll, setLocalOrgUnitsAll] = useState([])
    const [localOrgUnitsLoading, setLocalOrgUnitsLoading] = useState(false)
    const [localOrgUnitsCache, setLocalOrgUnitsCache] = useState(null) // Cache to avoid reloading
    const [orgUnitLevels, setOrgUnitLevels] = useState([]) // Store org unit levels for level number lookup

    // mapping (optional, used for external)
    const [orgUnitMappings, setOrgUnitMappings] = useState([])

    // baselines
    const [baselineAssessments, setBaselineAssessments] = useState([])
    const [loadingBaselines, setLoadingBaselines] = useState(false)

    // SMS
    const [smsConfig, setSmsConfig] = useState({
        enabled: false,
        senderId: '',
        reportKeyword: 'DQA',
        phonePattern: '',
        previewMessage: 'DQA {{period}} {{orgUnit}} {{status}}',
    })
    const [smsDatasetCommands, setSmsDatasetCommands] = useState([])

    // No draft persistence - fresh start for each assessment creation

    // dataset modal
    const [datasetModalOpen, setDatasetModalOpen] = useState(false)
    const emptyDatasetForm = { name: '', code: '', description: '', periodType: 'Monthly' }
    const [datasetForm, setDatasetForm] = useState(emptyDatasetForm)
    const [editingDatasetId, setEditingDatasetId] = useState(null)

    // date errors
    const [dateErrors, setDateErrors] = useState({ startDate: '', endDate: '' })

    // Save connection handler
    const handleSaveConnection = async () => {
        try {
            const connectionData = {
                baseUrl: externalConfig?.baseUrl,
                authType: externalConfig?.authType,
                username: externalConfig?.authType === 'basic' ? externalConfig?.username : undefined,
                password: externalConfig?.authType === 'basic' ? externalConfig?.password : undefined,
                token: externalConfig?.authType === 'token' ? externalConfig?.token : undefined,
                apiVersion: externalConfig?.apiVersion,
                connectionStatus: externalConfig?.connectionStatus,
                version: externalConfig?.version,
                lastTested: externalConfig?.lastTested,
                savedAt: new Date().toISOString()
            }
            localStorage.setItem('dqa360_external_connection', JSON.stringify(connectionData))
            console.log('Connection saved successfully')
        } catch (error) {
            console.error('Failed to save connection:', error)
            throw error
        }
    }

    const handleDateChange = (field, value) => {
        setAssessmentData(prev => {
            const updated = { ...prev, [field]: value }
            
            // Auto-generate period when both dates are available
            const startDate = field === 'startDate' ? value : prev.startDate
            const endDate = field === 'endDate' ? value : prev.endDate
            
            if (startDate && endDate) {
                try {
                    const start = new Date(startDate)
                    const end = new Date(endDate)
                    const startStr = start.toLocaleDateString()
                    const endStr = end.toLocaleDateString()
                    updated.period = `${startStr} - ${endStr}`
                } catch (error) {
                    // If date parsing fails, keep existing period
                    console.warn('Failed to generate period from dates:', error)
                }
            }
            
            return updated
        })
        
        setDateErrors(prevErrs => {
            const next = { ...prevErrs }
            const s = field === 'startDate' ? value : assessmentData.startDate
            const e = field === 'endDate' ? value : assessmentData.endDate
            next.startDate = ''
            next.endDate = ''
            if (s && e && new Date(e) < new Date(s)) next.endDate = i18n.t('End date cannot be before start date')
            return next
        })
    }

    // ----- data loading -----
    // Minimal dataset fields for fastest loading
    const DATASET_FIELDS_MINIMAL = 'id,name,code,periodType,organisationUnits~size,dataSetElements~size'
    
    // Simplified dataset fields for faster initial loading
    const DATASET_FIELDS_BASIC = 'id,name,code,shortName,periodType,description,categoryCombo[id,name,shortName],organisationUnits~size,dataSetElements~size'
    
    // Detailed dataset fields including data elements and org units
    const DATASET_FIELDS_DETAILED =
        'id,name,code,shortName,periodType,description,categoryCombo[id,name,shortName],' +
        'organisationUnits[id,name,code,level,parent[id,name,code],path],' +
        'dataSetElements[' +
        'dataElement[' +
        'id,name,shortName,code,valueType,' +
        'categoryCombo[' +
        'id,name,shortName,' +
        'categories[' +
        'id,name,shortName,code,' +
        'categoryOptions[id,name,shortName,code]' +
        ']' +
        ']' +
        '],' +
        'categoryCombo[id,name]' +
        ']'

    // Use basic fields for faster initial loading, detailed fields can be loaded later if needed
    const DATASET_FIELDS_FOR_FETCH = DATASET_FIELDS_BASIC
    
    // For immediate fallback when detailed data is not available
    const createFallbackElements = (dataset) => {
        // Create minimal elements based on dataset info
        if (!dataset) return []
        
        const elementCount = typeof dataset.dataSetElements === 'number' ? dataset.dataSetElements : 0
        if (elementCount === 0) return []
        
        // Create placeholder elements
        const elements = []
        for (let i = 0; i < Math.min(elementCount, 10); i++) { // Limit to 10 placeholders
            elements.push({
                id: `${dataset.id}_element_${i}`,
                name: `${dataset.name || dataset.code || 'Dataset'} - Element ${i + 1}`,
                code: `${dataset.code || dataset.id}_${i}`,
                valueType: 'NUMBER',
                categoryCombo: undefined,
                categories: [],
                categoryOptionCount: 0,
                isPlaceholder: true
            })
        }
        return elements
    }
    
    const createFallbackOrgUnits = (dataset) => {
        // Create minimal org units based on dataset info
        if (!dataset) return []
        
        const orgUnitCount = typeof dataset.organisationUnits === 'number' ? dataset.organisationUnits : 0
        if (orgUnitCount === 0) return []
        
        // Create placeholder org units
        const orgUnits = []
        for (let i = 0; i < Math.min(orgUnitCount, 5); i++) { // Limit to 5 placeholders
            orgUnits.push({
                id: `${dataset.id}_orgunit_${i}`,
                name: `${dataset.name || dataset.code || 'Dataset'} - Org Unit ${i + 1}`,
                code: `${dataset.code || dataset.id}_OU_${i}`,
                level: 1,
                path: `/root/ou${i}`,
                parent: undefined,
                isPlaceholder: true
            })
        }
        return orgUnits
    }
    
    // Define connectionReady before it's used in validate
    const connectionReady = useMemo(() => {
        if (metadataSource !== 'external') return true
        return Boolean(externalConfig?.baseUrl)
    }, [metadataSource, externalConfig])

    // Create a stable reference for external config to prevent loops
    const stableExternalConfig = useMemo(() => {
        if (!externalConfig) return null
        const hasBase = Boolean(externalConfig.baseUrl)
        if (!hasBase) return null
        return {
            baseUrl: externalConfig.baseUrl,
            authType: externalConfig.authType,
            username: externalConfig.username,
            password: externalConfig.password,
            token: externalConfig.token,
            apiVersion: externalConfig.apiVersion,
            connectionStatus: externalConfig.connectionStatus
        }
    }, [
        externalConfig?.baseUrl,
        externalConfig?.authType,
        externalConfig?.username,
        externalConfig?.password,
        externalConfig?.token,
        externalConfig?.apiVersion,
        externalConfig?.connectionStatus
    ])
    
    // State to track detailed dataset data
    const [detailedDatasets, setDetailedDatasets] = useState(new Map())
    const [loadingDetailedData, setLoadingDetailedData] = useState(false)
    const [detailedDataVersion, setDetailedDataVersion] = useState(0)
    
    // Ref to access current detailed datasets without causing re-renders
    const detailedDatasetsRef = useRef(detailedDatasets)
    useEffect(() => {
        detailedDatasetsRef.current = detailedDatasets
    }, [detailedDatasets])
    
    // Function to load detailed dataset information
    const loadDetailedDatasets = useCallback(async (datasetIds) => {
        console.log('🔍 loadDetailedDatasets called with:', datasetIds)
        
        if (!datasetIds || datasetIds.length === 0) {
            console.log('❌ No dataset IDs provided')
            return
        }
        
        const missingIds = datasetIds.filter(id => !detailedDatasetsRef.current.has(id))
        console.log('📋 Missing detailed data for:', missingIds, 'out of', datasetIds)
        
        if (missingIds.length === 0) {
            console.log('✅ All detailed data already loaded')
            return
        }
        
        console.log('📋 Loading detailed data for datasets:', missingIds)
        setLoadingDetailedData(true)
        
        try {
            const { dataSets } = await loadDatasets({
                engine: dataEngine,
                source: metadataSource === 'external' ? 'external' : 'local',
                externalConfig: stableExternalConfig,
                fields: DATASET_FIELDS_DETAILED,
                filter: `id:in:[${missingIds.join(',')}]`,
                order: 'name:asc',
                skipPaging: true,
            })
            
            const newDetailedData = new Map(detailedDatasetsRef.current)
            dataSets.forEach(ds => {
                newDetailedData.set(ds.id, ds)
            })
            setDetailedDatasets(newDetailedData)
            setDetailedDataVersion(prev => prev + 1) // Trigger re-render
            
            console.log('✅ Loaded detailed data for', dataSets.length, 'datasets')
        } catch (error) {
            console.error('❌ Failed to load detailed dataset data:', error)
        } finally {
            setLoadingDetailedData(false)
        }
    }, [dataEngine, metadataSource, stableExternalConfig])

    // Track if we've attempted to load saved connection
    const [savedConnectionLoaded, setSavedConnectionLoaded] = useState(false)

    // Load saved connection on component mount
    useEffect(() => {
        try {
            const savedConnection = localStorage.getItem('dqa360_external_connection')
            if (savedConnection && !externalConfig) {
                const connectionData = JSON.parse(savedConnection)
                setExternalConfig({
                    ...connectionData,
                    connectionStatus: connectionData.password || connectionData.token ? 'configured' : 'not_tested'
                })
            }
        } catch (error) {
            console.error('Failed to load saved connection:', error)
        } finally {
            setSavedConnectionLoaded(true)
        }
    }, []) // eslint-disable-line

    // Preload datasets function (called from ConnectionStep)
    const preloadDatasets = async () => {
        try {
            setDatasetsLoading(true)
            const { dataSets } = await loadDatasets({
                engine: dataEngine,
                source: metadataSource === 'external' ? 'external' : 'local',
                externalConfig: stableExternalConfig,
                fields: DATASET_FIELDS_FOR_FETCH,
                order: 'name:asc',
                skipPaging: true,
                pageSize: 1000, // Increase page size for faster loading
            })
            setPreloadedDatasets(dataSets)
            setPreloadTimestamp(Date.now())
        } catch (error) {
            console.log('Preload failed:', error?.message || error)
        } finally {
            setDatasetsLoading(false)
        }
    }

    // Refresh datasets function (called from DatasetsStep)
    const refreshDatasets = async () => {
        setPreloadedDatasets(null)
        setPreloadTimestamp(null)
        datasetsCache.clear()

        setDatasetsLoading(true)
        setLocalDatasets([])
        setCorsError(null)

        try {
            const { dataSets, sourceUrl } = await loadDatasets({
                engine: dataEngine,
                source: metadataSource === 'external' ? 'external' : 'local',
                externalConfig: stableExternalConfig,
                fields: DATASET_FIELDS_FOR_FETCH,
                order: 'name:asc',
                skipPaging: true,
                pageSize: 1000, // Increase page size for faster loading
            })
            setLocalDatasets(dataSets)
            setDatasetsHasMore(false) // skipPaging brought everything
            setDatasetsPage(1)
            setLoadingSource(decodeHtmlEntities(sourceUrl))
        } catch (e) {
            console.error('Failed to refresh datasets', e)
            setLocalDatasets([])
            setDatasetsHasMore(false)
            const msg = e?.message || ''
            if (/Authentication failed/i.test(msg)) setCorsError('Authentication failed. Check credentials/token.')
            else if (/Access denied/i.test(msg))  setCorsError('Access denied. Your user may lack dataset permissions.')
            else if (/Failed to fetch|CORS|cross-origin/i.test(msg)) setCorsError(`The external server does not allow cross-origin requests from this app. Ask admin to add ${window.location.origin} to the CORS allowlist.`)
            else setCorsError(msg)
        } finally {
            setDatasetsLoading(false)
            setLoadingSource('')
        }
    }

    // Single loader effect (local/external)
    useEffect(() => {
        if (!dataEngine) return
        if (!savedConnectionLoaded) return

        const shouldLoad = metadataSource === 'local' ||
            (metadataSource === 'external' && stableExternalConfig)

        if (!shouldLoad) {
            if (metadataSource === 'external' && !stableExternalConfig) {
                setLocalDatasets([])
                setDatasetsLoading(false)
                setCorsError(null)
            }
            return
        }

        console.log('🔄 Starting dataset loading...', { metadataSource, shouldLoad, savedConnectionLoaded })

        const abort = new AbortController()
        const run = async () => {
            setDatasetsLoading(true)
            setLocalDatasets([])
            setCorsError(null)

            // Use preloaded if fresh (<=10min)
            if (preloadedDatasets && preloadTimestamp && Date.now() - preloadTimestamp < 10 * 60 * 1000) {
                setLocalDatasets(preloadedDatasets)
                setDatasetsHasMore(false)
                setDatasetsPage(1)
                setLoadingSource('')
                setDatasetsLoading(false)
                return
            }

            try {
                const cacheKey = metadataSource === 'external'
                    ? `external_${stableExternalConfig.baseUrl}_${stableExternalConfig.username || 'anonymous'}`
                    : 'local'

                // Return cached (<=5min)
                if (datasetsCache.has(cacheKey)) {
                    const cachedData = datasetsCache.get(cacheKey)
                    const isExpired = Date.now() - cachedData.timestamp > 5 * 60 * 1000
                    if (!isExpired) {
                        setLocalDatasets(cachedData.datasets)
                        setDatasetsHasMore(false)
                        setDatasetsPage(1)
                        setLoadingSource('')
                        setDatasetsLoading(false)
                        return
                    } else {
                        datasetsCache.delete(cacheKey)
                    }
                }

                const startTime = Date.now()
                console.log('📡 Loading datasets with fields:', DATASET_FIELDS_FOR_FETCH)
                
                // Add timeout to prevent hanging requests
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
                })
                
                let dataSets, sourceUrl
                
                try {
                    // Try with basic fields first
                    const loadPromise = loadDatasets({
                        engine: dataEngine,
                        source: metadataSource === 'external' ? 'external' : 'local',
                        externalConfig: stableExternalConfig,
                        fields: DATASET_FIELDS_FOR_FETCH,
                        order: 'name:asc',
                        skipPaging: true,
                        pageSize: 1000, // Larger page size for better performance
                        signal: abort.signal
                    })
                    
                    const result = await Promise.race([loadPromise, timeoutPromise])
                    dataSets = result.dataSets
                    sourceUrl = result.sourceUrl
                } catch (basicError) {
                    console.warn('⚠️ Basic fields failed, trying minimal fields:', basicError.message)
                    
                    // Fallback to minimal fields
                    const fallbackPromise = loadDatasets({
                        engine: dataEngine,
                        source: metadataSource === 'external' ? 'external' : 'local',
                        externalConfig: stableExternalConfig,
                        fields: DATASET_FIELDS_MINIMAL,
                        order: 'name:asc',
                        skipPaging: true,
                        pageSize: 1000,
                        signal: abort.signal
                    })
                    
                    const result = await Promise.race([fallbackPromise, timeoutPromise])
                    dataSets = result.dataSets
                    sourceUrl = result.sourceUrl
                }

                const loadTime = Date.now() - startTime
                console.log(`✅ Loaded ${dataSets.length} datasets in ${loadTime}ms with full data elements and org units`)
                
                // Filter and validate datasets
                const validDatasets = []
                const incompleteDatasets = []
                
                dataSets.forEach(ds => {
                    // Handle both ~size (number) and full arrays for backward compatibility
                    const elemCount = typeof ds.dataSetElements === 'number' 
                        ? ds.dataSetElements 
                        : Array.isArray(ds.dataSetElements) ? ds.dataSetElements.length : 0
                    const orgCount = typeof ds.organisationUnits === 'number' 
                        ? ds.organisationUnits 
                        : Array.isArray(ds.organisationUnits) ? ds.organisationUnits.length : 0
                    
                    // Include datasets that have counts (even if they're ~size fields) or actual arrays
                    // We'll load detailed data later for datasets with ~size fields
                    if (elemCount > 0 && orgCount > 0) {
                        validDatasets.push(ds)
                    } else {
                        incompleteDatasets.push({
                            name: ds.name,
                            id: ds.id,
                            missingElements: elemCount === 0,
                            missingOrgUnits: orgCount === 0
                        })
                    }
                })
                
                if (incompleteDatasets.length > 0) {
                    console.warn(`⚠️ Found ${incompleteDatasets.length} incomplete datasets (missing data elements or org units):`)
                    incompleteDatasets.forEach(ds => {
                        const missing = []
                        if (ds.missingElements) missing.push('data elements')
                        if (ds.missingOrgUnits) missing.push('org units')
                        console.warn(`   - "${ds.name}" (${ds.id}): missing ${missing.join(' and ')}`)
                    })
                }
                
                console.log(`✅ Using ${validDatasets.length} valid datasets (${incompleteDatasets.length} filtered out)`)
                console.log('📋 Sample valid datasets:', validDatasets.slice(0, 3).map(ds => ({
                    id: ds.id,
                    name: ds.name,
                    dataSetElements: typeof ds.dataSetElements === 'number' ? `count:${ds.dataSetElements}` : `array:${ds.dataSetElements?.length || 0}`,
                    organisationUnits: typeof ds.organisationUnits === 'number' ? `count:${ds.organisationUnits}` : `array:${ds.organisationUnits?.length || 0}`
                })))
                setLocalDatasets(validDatasets)
                setDatasetsHasMore(false)
                setDatasetsPage(1)
                setLoadingSource(decodeHtmlEntities(sourceUrl))

                // Cache valid datasets only
                const cacheKey2 = metadataSource === 'external'
                    ? `external_${stableExternalConfig.baseUrl}_${stableExternalConfig.username || 'anonymous'}`
                    : 'local'
                datasetsCache.set(cacheKey2, {
                    datasets: validDatasets,
                    hasMore: false,
                    page: 1,
                    timestamp: Date.now()
                })
            } catch (e) {
                console.error('❌ Failed to load datasets:', e)
                const msg = e?.message || ''
                if (/Authentication failed/i.test(msg)) setCorsError('Authentication failed. Please verify your username/password or token.')
                else if (/Access denied/i.test(msg)) setCorsError('Access denied. Your account may not have permission to read datasets.')
                else if (/Failed to fetch|CORS|cross-origin/i.test(msg)) setCorsError(`CORS: ${stableExternalConfig?.baseUrl} doesn’t allow this origin. Ask admin to add ${window.location.origin} to the CORS allowlist.`)
                else setCorsError(msg)

                setLocalDatasets([])
                setDatasetsHasMore(false)
            } finally {
                setDatasetsLoading(false)
                setLoadingSource('')
            }
        }

        run()
        return () => abort.abort()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataEngine, metadataSource, stableExternalConfig, savedConnectionLoaded])

    // period recompute
    useEffect(() => {
        if (assessmentData.frequency) {
            setAssessmentData(prev => ({
                ...prev, 
                period: generatePeriodFromFrequency(prev.frequency)
            }))
        }
    }, [assessmentData.frequency]) // eslint-disable-line

    // Derive elements & org units from selected datasets
    useEffect(() => {
        console.log('🔄 useEffect triggered for elements/org units derivation:', {
            selectedDataSets: selectedDataSets?.length || 0,
            localDatasets: localDatasets?.length || 0,
            detailedDatasets: detailedDatasets.size
        })
        
        // Load detailed data for selected datasets if not already loaded
        if (selectedDataSets && selectedDataSets.length > 0) {
            console.log('📋 Triggering detailed data load for:', selectedDataSets)
            loadDetailedDatasets(selectedDataSets)
        }
        
        // Elements - process from loaded dataset data
        const elemMap = new Map()
        console.log('🔍 Processing elements for datasets:', selectedDataSets, {
            detailedDatasets: detailedDatasets.size,
            localDatasets: localDatasets.length
        })
        
        ;(selectedDataSets || []).forEach(id => {
            // Try to get detailed data first, fall back to basic data
            const detailedDs = detailedDatasets.get(id)
            const basicDs = localDatasets.find(d => d.id === id)
            const ds = detailedDs || basicDs
            
            console.log(`📋 Dataset ${id}:`, {
                hasDetailed: !!detailedDs,
                hasBasic: !!basicDs,
                dataSetElements: ds?.dataSetElements ? 
                    (Array.isArray(ds.dataSetElements) ? `array[${ds.dataSetElements.length}]` : typeof ds.dataSetElements)
                    : 'none',
                needsDetailedLoad: ds && typeof ds.dataSetElements === 'number'
            })
            
            // If we only have a count (~size), use fallback elements while detailed data loads
            if (ds && typeof ds.dataSetElements === 'number' && !detailedDs) {
                console.log(`⚠️ Dataset ${id} only has count (${ds.dataSetElements}), using fallback elements`)
                const fallbackElements = createFallbackElements(ds)
                fallbackElements.forEach(elem => {
                    if (!elemMap.has(elem.id)) {
                        elemMap.set(elem.id, elem)
                    }
                })
                return // Continue to next dataset
            }
            
            // Process data elements from the dataset
            if (ds && Array.isArray(ds?.dataSetElements)) {
                ds.dataSetElements.forEach(dse => {
                    const de = dse?.dataElement
                    if (!de) return
                    const cc = dse?.categoryCombo || de?.categoryCombo
                    const categories = Array.isArray(cc?.categories) ? cc.categories : []
                    const mappedCats = categories.map(cat => ({
                        id: cat.id,
                        name: cat.name,
                        code: cat.code || '',
                        options: Array.isArray(cat.categoryOptions)
                            ? cat.categoryOptions.map(o => ({ id: o.id, name: o.name, code: o.code || '' }))
                            : [],
                    }))
                    const optCount = mappedCats.reduce((sum, c) => sum + (c.options?.length || 0), 0)

                    if (!elemMap.has(de.id)) {
                        elemMap.set(de.id, {
                            id: de.id,
                            name: de.name,
                            code: de.code || '',
                            valueType: de.valueType || 'TEXT',
                            categoryCombo: cc ? { id: cc.id, name: cc.name } : undefined,
                            categories: mappedCats,
                            categoryOptionCount: optCount,
                        })
                    }
                })
            }
        })
        const derivedElements = Array.from(elemMap.values())
        
        console.log('🎯 Derived elements:', derivedElements.length, derivedElements.slice(0, 3).map(e => ({ id: e.id, name: e.name, isPlaceholder: e.isPlaceholder })))
        
        // Additional debugging for empty elements
        if (derivedElements.length === 0 && selectedDataSets && selectedDataSets.length > 0) {
            console.warn('❌ No elements derived despite having selected datasets!')
            console.warn('Selected datasets:', selectedDataSets)
            console.warn('Available local datasets:', localDatasets.map(ds => ({ id: ds.id, name: ds.name })))
            console.warn('Detailed datasets loaded:', Array.from(detailedDatasets.keys()))
        }

        if ((selectedDataSets || []).length === 0) {
            // Keep previous selections; user may switch tabs or adjust datasets later
            setElementsAll([])
            // Do NOT clear selectedElementIds here to preserve user's selection
        } else if (derivedElements.length > 0) {
            setElementsAll(derivedElements)
            setSelectedElementIds(prev => {
                const prevArr = Array.isArray(prev) ? prev : []
                if (prevArr.length === 0) {
                    // Do not auto-select; maintain empty until user adjusts
                    return prevArr
                }
                const valid = new Set(derivedElements.map(e => e.id))
                // Preserve only previously selected IDs that still exist in derived list
                return prevArr.filter(id => valid.has(id))
            })
        }

        // Org Units (union) - process from loaded dataset data
        const ouMap = new Map()
        ;(selectedDataSets || []).forEach(id => {
            // Try to get detailed data first, fall back to basic data
            const detailedDs = detailedDatasets.get(id)
            const basicDs = localDatasets.find(d => d.id === id)
            const ds = detailedDs || basicDs
            
            // If we only have a count (~size), use fallback org units while detailed data loads
            if (ds && typeof ds.organisationUnits === 'number' && !detailedDs) {
                console.log(`⚠️ Dataset ${id} only has org unit count (${ds.organisationUnits}), using fallback org units`)
                const fallbackOrgUnits = createFallbackOrgUnits(ds)
                fallbackOrgUnits.forEach(ou => {
                    if (!ouMap.has(ou.id)) {
                        ouMap.set(ou.id, ou)
                    }
                })
                return // Continue to next dataset
            }
            
            // Process organization units from the dataset
            if (ds && Array.isArray(ds?.organisationUnits)) {
                ds.organisationUnits.forEach(ou => {
                    if (!ou?.id) return
                    if (!ouMap.has(ou.id)) {
                        ouMap.set(ou.id, {
                            id: ou.id,
                            name: ou.name,
                            code: ou.code || '',
                            level: ou.level,
                            path: ou.path,
                            parent: ou.parent ? { id: ou.parent.id, name: ou.parent.name, code: ou.parent.code || '' } : undefined,
                        })
                    }
                })
            }
        })
        const derivedOUs = Array.from(ouMap.values())

        if ((selectedDataSets || []).length === 0) {
            // Keep previous selections
            setOrgUnitsAll([])
            // Do NOT clear selectedOrgUnitIds here to preserve user's selection
        } else if (derivedOUs.length > 0) {
            setOrgUnitsAll(derivedOUs)
            setSelectedOrgUnitIds(prev => {
                const prevArr = Array.isArray(prev) ? prev : []
                const valid = new Set(derivedOUs.map(o => o.id))
                return prevArr.filter(id => valid.has(id))
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(selectedDataSets), JSON.stringify(localDatasets), detailedDataVersion, loadDetailedDatasets])

    // pre-gen SMS commands (uses normalized defaults)
    useEffect(() => {
        try {
            const keyword = smsConfig.reportKeyword || 'DQA'
            const existingById = new Map((smsDatasetCommands || []).map(c => [c.dataSetId, c]))
            const usedNames = new Set()
            const makeUnique = (base) => {
                let name = base
                let i = 2
                while (usedNames.has(name)) { name = `${base}_${i}`; i++ }
                usedNames.add(name)
                return name
            }
            const generated = (selectedDataSets || []).map(id => {
                const ds = localDatasets.find(d => d.id === id) || { id, name: id }
                const baseLabel = ds.code || ds.name || ds.id || 'DATASET'
                const baseCmd = `${keyword}_${sanitizeForCommand(baseLabel)}`
                const prev = existingById.get(id)
                const cmd = prev?.commandName ? prev.commandName : makeUnique(baseCmd)
                const dsName = ds.name || ds.code || ds.id
                return {
                    dataSetId: id,
                    commandName: cmd,
                    responses: normalizeResponses(dsName, cmd, prev?.responses)
                }
            })
            setSmsDatasetCommands(generated)
        } catch (e) {
            console.error('Failed to pre-generate SMS commands', e)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(selectedDataSets), JSON.stringify(localDatasets), smsConfig.reportKeyword])

    // date coherence
    useEffect(() => {
        const errs = { startDate: '', endDate: '' }
        if (assessmentData.startDate && assessmentData.endDate) {
            if (new Date(assessmentData.endDate) < new Date(assessmentData.startDate)) {
                errs.endDate = i18n.t('End date cannot be before start date')
            }
        }
        setDateErrors(errs)
    }, [assessmentData.startDate, assessmentData.endDate])

    // baselines
    useEffect(() => {
        const load = async () => {
            if (assessmentData.assessmentType !== 'followup') { setBaselineAssessments([]); return }
            if (typeof listAssessments !== 'function') { setBaselineAssessments([]); return }
            setLoadingBaselines(true)
            try {
                const all = await listAssessments()
                const baselines = (all || []).filter(a =>
                    a?.info?.assessmentType === 'baseline' || a?.assessmentType === 'baseline'
                ).map(a => ({
                    id: a.id || a.uid || a.key || a?.info?.id,
                    name: a?.info?.name || a.name || '(Unnamed)',
                    period: a?.info?.period || a.period || '',
                }))
                setBaselineAssessments(baselines)
            } catch (e) {
                console.error('Failed to load baseline assessments', e)
                setBaselineAssessments([])
            } finally {
                setLoadingBaselines(false)
            }
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assessmentData.assessmentType])

    // ----- load org unit levels for level number lookup -----
    useEffect(() => {
        const loadOrgUnitLevels = async () => {
            try {
                const query = {
                    organisationUnitLevels: {
                        resource: 'organisationUnitLevels',
                        params: { fields: 'id,name,level', order: 'level:asc', pageSize: 200 },
                    },
                }
                const response = await dataEngine.query(query)
                const levels = response?.organisationUnitLevels?.organisationUnitLevels || []
                setOrgUnitLevels(levels)
            } catch (error) {
                console.error('Failed to load org unit levels:', error)
                setOrgUnitLevels([])
            }
        }
        
        loadOrgUnitLevels()
    }, [dataEngine])

    // Helper function to get target level number from reporting level ID
    const getTargetLevelNumber = () => {
        if (!assessmentData.reportingLevel || !orgUnitLevels.length) {
            return 3 // Default to level 3 if not available
        }
        const levelObj = orgUnitLevels.find(l => l.id === assessmentData.reportingLevel)
        return levelObj?.level || 3
    }

    // ----- load local org units for mapping (when using external source) -----
    useEffect(() => {
        if (metadataSource !== 'external') {
            setLocalOrgUnitsAll([])
            setLocalOrgUnitsLoading(false)
            setLocalOrgUnitsCache(null)
            return
        }

        // Don't load until we have both reporting level and org unit levels
        if (!assessmentData.reportingLevel || !orgUnitLevels.length) {
            return
        }

        const targetLevel = getTargetLevelNumber()
        
        // Check cache first (but only if target level hasn't changed)
        if (localOrgUnitsCache && localOrgUnitsCache.data && localOrgUnitsCache.targetLevel === targetLevel) {
            setLocalOrgUnitsAll(localOrgUnitsCache.data)
            setLocalOrgUnitsLoading(false)
            return
        }

        const loadLocalOrgUnits = async () => {
            setLocalOrgUnitsLoading(true)
            try {
                let allOrgUnits = []
                
                // Load org units up to and including the target level
                // This is much more efficient than loading all levels
                const levelQuery = {
                    organisationUnits: {
                        resource: 'organisationUnits',
                        params: {
                            fields: 'id,name,displayName,code,level,path,parent[id,name,displayName,code]',
                            filter: `level:le:${targetLevel}`, // Level <= target level
                            paging: true,
                            pageSize: 3000, // Larger page size for fewer requests
                            totalPages: true,
                        },
                    },
                }
                
                let page = 1
                let hasMore = true
                
                while (hasMore) {
                    const query = {
                        ...levelQuery,
                        organisationUnits: {
                            ...levelQuery.organisationUnits,
                            params: {
                                ...levelQuery.organisationUnits.params,
                                page: page,
                            },
                        },
                    }
                    
                    const response = await dataEngine.query(query)
                    const orgUnits = response?.organisationUnits?.organisationUnits || []
                    const pager = response?.organisationUnits?.pager
                    
                    allOrgUnits = [...allOrgUnits, ...orgUnits]
                    hasMore = pager && pager.page < pager.pageCount && orgUnits.length > 0
                    page++
                    
                    console.log(`Loaded page ${page - 1}: ${orgUnits.length} org units (total: ${allOrgUnits.length})`)
                    
                    // Add a small delay to prevent overwhelming the server
                    if (hasMore) {
                        await new Promise(resolve => setTimeout(resolve, 50))
                    }
                }

                setLocalOrgUnitsAll(allOrgUnits)
                
                // Cache with target level info
                setLocalOrgUnitsCache({
                    data: allOrgUnits,
                    targetLevel: targetLevel,
                    loadedAt: new Date().toISOString()
                })
                
            } catch (error) {
                console.error('Failed to load local org units for mapping:', error)
                setLocalOrgUnitsAll([])
                setLocalOrgUnitsCache(null)
            } finally {
                setLocalOrgUnitsLoading(false)
            }
        }

        loadLocalOrgUnits()
    }, [metadataSource, dataEngine, assessmentData.reportingLevel, orgUnitLevels])

    // ----- computed selections -----
    const selectedDatasetObjects = useMemo(
        () => (localDatasets || []).filter(ds => (selectedDataSets || []).includes(ds.id)),
        [localDatasets, selectedDataSets]
    )
    const selectedDataElements = useMemo(
        () => (elementsAll || []).filter(e => (selectedElementIds || []).includes(e.id)),
        [elementsAll, selectedElementIds]
    )
    const selectedOrgUnits = useMemo(
        () => (orgUnitsAll || []).filter(o => (selectedOrgUnitIds || []).includes(o.id)),
        [orgUnitsAll, selectedOrgUnitIds]
    )

    // ----- validators -----
    const isDetailsValid = useMemo(() => {
        return Boolean(
            assessmentData.name?.trim() &&
            assessmentData.startDate &&
            assessmentData.endDate &&
            assessmentData.frequency &&
            assessmentData.reportingLevel &&
            (!dateErrors.endDate)
        )
    }, [assessmentData, dateErrors])

    const canRunPreparation =
        isDetailsValid &&
        selectedDataSets.length > 0 &&
        selectedOrgUnitIds.length > 0

    const arePrerequisiteTabsValid = () => {
        return (
            isDetailsValid &&
            selectedDataSets.length > 0 &&
            selectedDataElements.length > 0 &&
            selectedOrgUnitIds.length > 0 &&
            datasetPreparationComplete
        )
    }

    // per-step validate
    const validateStep = (id) => {
        const messages = []
        switch (id) {
            case 'details': {
                if (!assessmentData.name?.trim()) messages.push(i18n.t('Name is required.'))
                if (!assessmentData.startDate) messages.push(i18n.t('Start date is required.'))
                if (!assessmentData.endDate) messages.push(i18n.t('End date is required.'))
                if (dateErrors.endDate) messages.push(dateErrors.endDate)
                if (!assessmentData.frequency) messages.push(i18n.t('Frequency is required.'))
                if (!assessmentData.reportingLevel) messages.push(i18n.t('Reporting level is required.'))
                if (assessmentData.assessmentType === 'followup' && !assessmentData.baselineAssessmentId) {
                    messages.push(i18n.t('Select a baseline assessment for follow-up type.'))
                }
                break
            }
            case 'connection': {
                if (metadataSource === 'external') {
                    const cfg = externalConfig || {}
                    if (!cfg.baseUrl?.trim()) messages.push(i18n.t('Connection URL is required.'))
                    else if (!isValidHttpUrl(cfg.baseUrl)) messages.push(i18n.t('Connection URL must be a valid http(s) URL.'))
                    const authType = (cfg.authType || '').toLowerCase()
                    const hasToken = !!cfg.token?.trim()
                    const hasUser = !!cfg.username?.trim()
                    const hasPass = !!cfg.password?.trim()
                    if (authType === 'token') {
                        if (!hasToken) messages.push(i18n.t('Personal access token is required for token authentication.'))
                        else if (cfg.token.trim().length < 12) messages.push(i18n.t('Personal access token looks too short.'))
                    } else {
                        if (!hasUser) messages.push(i18n.t('Username is required.'))
                        if (!hasPass) messages.push(i18n.t('Password is required.'))
                    }
                    if (cfg.apiVersion != null && `${cfg.apiVersion}`.trim() !== '') {
                        const n = Number(cfg.apiVersion)
                        if (!Number.isInteger(n) || n <= 0) messages.push(i18n.t('API version must be a positive integer when provided.'))
                    }
                }
                break
            }
            case 'datasets': {
                if (selectedDataSets.length === 0) messages.push(i18n.t('Select at least one dataset.'))
                break
            }
            case 'elements': {
                if (selectedDataElements.length === 0) messages.push(i18n.t('Select at least one data element.'))
                break
            }
            case 'units': {
                if (selectedOrgUnitIds.length === 0) messages.push(i18n.t('Select at least one organisation unit.'))
                break
            }
            case 'mapping': {
                if (metadataSource === 'external') {
                    const selectedIds = new Set(selectedOrgUnitIds || [])
                    const rows = (orgUnitMappings || []).filter(Boolean)
                    const invalidRows = []
                    rows.forEach((m, idx) => {
                        const hasSource = m?.source && String(m.source).trim().length > 0
                        const hasTarget = m?.target && String(m.target).trim().length > 0
                        if ((hasSource && !hasTarget) || (!hasSource && hasTarget)) invalidRows.push(idx + 1)
                    })
                    if (invalidRows.length > 0) {
                        messages.push(i18n.t('Mapping row(s) incomplete: {{rows}}', { rows: invalidRows.join(', ') }))
                    }
                    const seen = new Map()
                    const dupSources = new Set()
                    rows.forEach(m => {
                        const s = (m?.source || '').trim()
                        if (!s) return
                        if (seen.has(s)) dupSources.add(s)
                        else seen.set(s, true)
                    })
                    if (dupSources.size > 0) {
                        messages.push(i18n.t('Duplicate mappings for organisation unit(s): {{list}}', { list: Array.from(dupSources).join(', ') }))
                    }
                    const unknownSources = rows
                        .map(m => (m?.source || '').trim())
                        .filter(s => s && !selectedIds.has(s))
                    if (unknownSources.length > 0) {
                        messages.push(i18n.t('Mappings contain source(s) not in the selected organisation units: {{list}}', {
                            list: Array.from(new Set(unknownSources)).join(', ')
                        }))
                    }
                }
                break
            }
            case 'preparation': {
                if (!datasetPreparationComplete) messages.push(i18n.t('Run preparation and mark it complete.'))
                if (!canRunPreparation) messages.push(i18n.t('Ensure Details, Datasets and Org Units are set before preparation.'))
                if (metadataSource === 'external' && !connectionReady) {
                    messages.push(i18n.t('Please configure your DHIS2 connection before running preparation.'))
                }
                break
            }
            case 'review': {
                if (!arePrerequisiteTabsValid()) messages.push(i18n.t('Some prerequisites are missing before saving.'))
                break
            }
            default:
                break
        }
        return { valid: messages.length === 0, messages }
    }

    const showValidationErrors = (messages) => {
        setError(messages.map(m => `• ${m}`).join('\n'))
        try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (_) {}
        setTimeout(() => setError(null), 3500)
    }

    const changeTab = (id) => setActiveTab(id)

    const guardForwardNav = (targetIndex, tabsList) => {
        const currentIndex = tabsList.findIndex(t => t.id === activeTab)
        if (targetIndex <= currentIndex) { setActiveTab(tabsList[targetIndex].id); return }
        const { valid, messages } = validateStep(tabsList[currentIndex].id)
        if (!valid) { showValidationErrors(messages); return }
        setError(null)
        setActiveTab(tabsList[targetIndex].id)
    }

    const handleTabClick = (targetId, tabsList) => {
        const idx = tabsList.findIndex(t => t.id === targetId)
        if (idx === -1) return
        guardForwardNav(idx, tabsList)
    }

    const attemptNext = (tabsList) => {
        const idx = tabsList.findIndex(t => t.id === activeTab)
        if (idx === -1 || idx === tabsList.length - 1) return
        guardForwardNav(idx + 1, tabsList)
    }

    // ----- actions -----
    const openCreateDatasetModal = () => {
        setEditingDatasetId(null)
        setDatasetForm(emptyDatasetForm)
        setDatasetModalOpen(true)
    }

    const openEditDatasetModal = (id) => {
        const ds = localDatasets.find(d => d.id === id)
        if (!ds) return
        setEditingDatasetId(id)
        setDatasetForm({
            name: ds.name || '',
            code: ds.code || '',
            description: ds.description || '',
            periodType: ds.periodType || 'Monthly',
        })
        setDatasetModalOpen(true)
    }

    const saveDatasetModal = async () => {
        try {
            setLoading(true)
            setError(null)
            if (editingDatasetId) {
                await dataEngine.mutate({
                    type: 'update',
                    resource: `dataSets/${editingDatasetId}`,
                    data: {
                        name: datasetForm.name,
                        code: datasetForm.code || undefined,
                        description: datasetForm.description || undefined,
                        periodType: datasetForm.periodType || 'Monthly',
                    },
                })
            } else {
                const createRes = await dataEngine.mutate({
                    type: 'create',
                    resource: 'dataSets',
                    data: {
                        name: datasetForm.name,
                        code: datasetForm.code || undefined,
                        description: datasetForm.description || undefined,
                        periodType: datasetForm.periodType || 'Monthly',
                    },
                })
                const id = createRes?.response?.uid || createRes?.uid || null
                if (id) {
                    const ref = await dataEngine.query({
                        d: {
                            resource: `dataSets/${id}`,
                            params: { fields: DATASET_FIELDS_FOR_FETCH }
                        },
                    })
                    setLocalDatasets(prev => [...prev, ref?.d])
                    setSelectedDataSets(prev => {
                        const next = [...(prev || []), id]
                        saveDraft({ selectedDataSets: next })
                        return next
                    })
                }
            }
        } catch (e) {
            console.error(e)
            setError(e?.message || i18n.t('Failed to save dataset'))
        } finally {
            setLoading(false)
            setDatasetModalOpen(false)
            setEditingDatasetId(null)
            setDatasetForm(emptyDatasetForm)
        }
    }

    // legacy builder and print/download helpers removed; ReviewStep provides final payload

    const handleSaveAssessment = async (payloadFromReview) => {
        setLoading(true)
        setError(null)
        try {
            const { valid, messages } = validateStep('review')
            if (!valid) { showValidationErrors(messages); setLoading(false); return }
            const payload = payloadFromReview // use ReviewStep's final payload (nested structure)
            await saveAssessment(payload)
            clearDraft()
            navigate('/administration/assessments', {
                state: { message: i18n.t('Assessment "{{name}}" created successfully', { name: (payload.details?.name || payload.info?.name) }) },
            })
        } catch (e) {
            console.error(e)
            setError(e?.message || i18n.t('Failed to create assessment'))
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setLoading(false)
        }
    }

    const baseTabs = metadataSource === 'external'
        ? [
            { id: 'details', label: i18n.t('Details') },
            { id: 'connection', label: i18n.t('Connection') },
            { id: 'datasets', label: i18n.t('Datasets') },
            { id: 'elements', label: i18n.t('Data Elements') },
            { id: 'units', label: i18n.t('Org Units') },
            { id: 'mapping', label: i18n.t('Org Unit Mapping') },
            { id: 'preparation', label: i18n.t('Preparation') },
            { id: 'review', label: i18n.t('Review') },
        ]
        : [
            { id: 'details', label: i18n.t('Details') },
            { id: 'datasets', label: i18n.t('Datasets') },
            { id: 'elements', label: i18n.t('Data Elements') },
            { id: 'units', label: i18n.t('Org Units') },
            { id: 'preparation', label: i18n.t('Preparation') },
            { id: 'review', label: i18n.t('Review') },
        ]

    const tabs = baseTabs.map((t, i) => ({ ...t, label: `${i + 1}. ${t.label}` }))

    const renderDatasetsStep = () => {
        if (corsError) {
            const isCredentialsError = corsError.includes('Authentication failed') || corsError.includes('check your username/password')
            const isPermissionError = corsError.includes('Access denied') || corsError.includes('not have permission')
            const isCorsError = !isCredentialsError && !isPermissionError

            return (
                <>
                    <h3 style={{ margin: '0 0 12px 0' }}>{i18n.t('Select datasets for this assessment')}</h3>
                    <NoticeBox error title={
                        isCredentialsError ? i18n.t('Authentication Failed') :
                            isPermissionError ? i18n.t('Access Denied') :
                                i18n.t('Connection Error')
                    }>
                        <div style={{ marginBottom: 12 }}>
                            {corsError}
                        </div>
                        {isCorsError && (
                            <div style={{ fontSize: 14, opacity: 0.8 }}>
                                <strong>{i18n.t('How to fix this:')}</strong>
                                <ol style={{ marginTop: 8, paddingLeft: 20 }}>
                                    <li>
                                        <strong>{i18n.t('DHIS2 CORS Allowlist (Recommended):')}</strong>
                                        <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                                            <li>{i18n.t('Ask your DHIS2 administrator to add your domain to the CORS allowlist')}</li>
                                            <li>{i18n.t('In DHIS2: System Settings → Access → CORS allowlist')}</li>
                                            <li>{i18n.t('Add: {{domain}}', { domain: window.location.origin })}</li>
                                        </ul>
                                    </li>
                                    <li>
                                        <strong>{i18n.t('Alternative solutions:')}</strong>
                                        <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                                            <li>{i18n.t('Deploy this app on the same domain as the DHIS2 server')}</li>
                                            <li>{i18n.t('Use the local DHIS2 instance instead')}</li>
                                        </ul>
                                    </li>
                                </ol>
                            </div>
                        )}
                        {isCredentialsError && (
                            <div style={{ fontSize: 14, opacity: 0.8 }}>
                                <strong>{i18n.t('Next steps:')}</strong>
                                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                                    <li>{i18n.t('Go back to the Connection step and verify your credentials')}</li>
                                    <li>{i18n.t('Make sure your username and password are correct')}</li>
                                    <li>{i18n.t('If using a token, ensure it is valid and has the right permissions')}</li>
                                </ul>
                            </div>
                        )}
                        {isPermissionError && (
                            <div style={{ fontSize: 14, opacity: 0.8 }}>
                                <strong>{i18n.t('Next steps:')}</strong>
                                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                                    <li>{i18n.t('Contact your DHIS2 administrator to grant dataset access permissions')}</li>
                                    <li>{i18n.t('Verify that your user account has the necessary authorities')}</li>
                                </ul>
                            </div>
                        )}
                    </NoticeBox>
                </>
            )
        }

        const showConfiguredNotice = metadataSource === 'external' &&
            externalConfig?.connectionStatus === 'configured' &&
            !datasetsLoading &&
            localDatasets.length === 0

        return (
            <>
                <h3 style={{ margin: '0 0 12px 0' }}>{i18n.t('Select datasets for this assessment')}</h3>
                {showConfiguredNotice && (
                    <div style={{ marginBottom: 16 }}>
                        <NoticeBox title={i18n.t('External DHIS2 Connection')}>
                            {i18n.t('Your credentials are saved. The connection will be tested automatically when loading datasets from')} <strong>{externalConfig.baseUrl}</strong>.
                        </NoticeBox>
                    </div>
                )}
                <DatasetsStep
                    datasets={localDatasets}
                    localDatasets={[]}
                    selectedDataSets={selectedDataSets}
                    setSelectedDataSets={setSelectedDataSets}
                    loading={datasetsLoading}
                    loadingSource={loadingSource}
                    onRefresh={refreshDatasets}
                    preloadedDatasets={preloadedDatasets}
                    preloadTimestamp={preloadTimestamp}
                    showEmptyIfNoData={false}
                    minInitialLoaderMs={600}
                    footer={null /* skipPaging loads all; no "Load more" needed */}
                />
            </>
        )
    }

    const renderStep = (id) => {
        switch (id) {
            case 'details':
                return (
                    <DetailsStep
                        assessmentData={assessmentData}
                        setAssessmentData={setAssessmentData}
                        metadataSource={metadataSource}
                        setMetadataSource={setMetadataSource}
                        assessmentTypes={ASSESSMENT_TYPES}
                        priorities={PRIORITIES}
                        methodologies={METHODOLOGIES}
                        confidentialityLevels={CONFIDENTIALITY_LEVELS}
                        dataRetentionPeriods={DATA_RETENTION_PERIODS}
                        dataQualityDimensionsOptions={DATA_QUALITY_DIMENSIONS}
                        baselineAssessments={baselineAssessments}
                        loadingBaselines={loadingBaselines}
                        dateErrors={dateErrors}
                        handleDateChange={handleDateChange}
                    />
                )
            case 'connection':
                return <ConnectionStep
                    dhis2Config={externalConfig}
                    setDhis2Config={setExternalConfig}
                    onSaveConnection={handleSaveConnection}
                    onPreloadDatasets={preloadDatasets}
                    preloadedDatasets={preloadedDatasets}
                    preloadTimestamp={preloadTimestamp}
                />
            case 'datasets':
                return renderDatasetsStep()
            case 'elements':
                return (
                    <ElementsStep
                        dataElementsAll={elementsAll}
                        selectedDataElementIds={selectedElementIds}
                        setSelectedDataElementIds={setSelectedElementIds}
                        loading={loadingDetailedData}
                    />
                )
            case 'units':
                return (
                    <OrgUnitsStep
                        orgUnitsAll={orgUnitsAll}
                        selectedOrgUnitIds={selectedOrgUnitIds}
                        setSelectedOrgUnitIds={setSelectedOrgUnitIds}
                    />
                )
            case 'mapping':
                return (
                    <OrgUnitMappingStep
                        metadataSource={metadataSource}
                        selectedOrgUnits={selectedOrgUnits}
                        localOrgUnits={metadataSource === 'external' ? localOrgUnitsAll : orgUnitsAll}
                        localOrgUnitsLoading={metadataSource === 'external' ? localOrgUnitsLoading : false}
                        orgUnitMappings={orgUnitMappings}
                        setOrgUnitMappings={setOrgUnitMappings}
                        reportingLevel={assessmentData.reportingLevel}
                        orgUnitLevels={orgUnitLevels}
                        externalInfo={{
                            baseUrl: externalConfig?.baseUrl,
                            apiVersion: externalConfig?.apiVersion,
                            instanceName: externalConfig?.instanceName,
                        }}
                        localInfo={{
                            baseUrl: window?.location?.origin,
                            instanceName: i18n.t('This DHIS2'),
                        }}
                    />
                )
            case 'preparation':
                return (
                    <PreparationStep
                        metadataSource={metadataSource}
                        dataEngine={dataEngine}
                        assessmentData={assessmentData}
                        setAssessmentData={setAssessmentData}
                        localDatasets={localDatasets}
                        selectedDataSets={selectedDataSets}
                        selectedDataElements={elementsAll.filter(e => selectedElementIds.includes(e.id))}
                        selectedOrgUnits={orgUnitsAll.filter(ou => selectedOrgUnitIds.includes(ou.id))}
                        orgUnitMappings={orgUnitMappings}
                        smsCommands={smsDatasetCommands}
                        setSmsCommands={setSmsDatasetCommands}
                        onComplete={(v) => {
                            try { setDatasetPreparationComplete(!!v) }
                            finally { changeTab('review') }
                        }}
                        onError={(msg) => setError(msg || i18n.t('Preparation failed'))}
                    />
                )
            case 'review':
                return (
                    <ReviewStep
                        assessmentData={{
                            ...assessmentData,
                            // Add the selected data to assessmentData for ReviewStep (use different keys to avoid conflicts)
                            selectedDatasets: selectedDatasetObjects,
                            selectedDataElements: selectedDataElements,
                            selectedOrgUnits: selectedOrgUnits,
                            selectedOrgUnitMappings: orgUnitMappings,
                            // Preserve existing creationPayload and created datasets if they exist
                            creationPayload: assessmentData?.creationPayload || null,
                            createdDatasets: assessmentData?.createdDatasets || [],
                            dqaDatasetsCreated: assessmentData?.dqaDatasetsCreated || [],
                            dataElementMappings: assessmentData?.dataElementMappings || [],
                            sms: assessmentData?.sms || {},
                            localDatasets: assessmentData?.localDatasets || {}
                        }}
                        setAssessmentData={setAssessmentData}
                        smsConfig={smsConfig}
                        setSmsConfig={setSmsConfig}
                        prereqsOk={arePrerequisiteTabsValid()}
                        onBack={() => changeTab('preparation')}
                        onSave={handleSaveAssessment}
                        saving={loading}
                        selectedDataElements={selectedDataElements}
                        selectedDataSets={selectedDatasetObjects}
                        userInfo={userInfo}
                    />
                )
            default:
                return null
        }
    }

    const currentStepIndex = tabs.findIndex(t => t.id === activeTab)
    const stepCounterText = currentStepIndex >= 0 ? i18n.t('Step {{n}} of {{total}}', { n: currentStepIndex + 1, total: tabs.length }) : ''

    return (
        <div style={{ padding: 24 }}>
            <h2 style={{ margin: '0 0 12px 0' }}>{i18n.t('Create Assessment')}</h2>

            {error && (
                <NoticeBox title={i18n.t('Error')} error>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</pre>
                </NoticeBox>
            )}

            {/* top nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <ButtonStrip>
                    <Button
                        onClick={() => {
                            const idx = tabs.findIndex(t => t.id === activeTab)
                            if (idx > 0) setActiveTab(tabs[idx - 1].id)
                        }}
                    >
                        {i18n.t('Previous')}
                    </Button>
                    {activeTab !== 'review' && (
                        <Button primary onClick={() => attemptNext(tabs)}>
                            {i18n.t('Next')}
                        </Button>
                    )}
                </ButtonStrip>
                <div style={{ marginLeft: 12, whiteSpace: 'nowrap', fontSize: 12, opacity: 0.7 }}>
                    {stepCounterText}
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <TabBar scrollable>
                    {tabs.map(t => (
                        <Tab
                            key={t.id}
                            selected={activeTab === t.id}
                            onClick={() => handleTabClick(t.id, tabs)}
                        >
                            {t.label}
                        </Tab>
                    ))}
                </TabBar>
            </div>

            <div>{renderStep(activeTab)}</div>

            {/* bottom nav */}
            <div style={{ marginTop: 24 }}>
                <ButtonStrip>
                    <Button
                        onClick={() => {
                            const idx = tabs.findIndex(t => t.id === activeTab)
                            if (idx > 0) setActiveTab(tabs[idx - 1].id)
                        }}
                    >
                        {i18n.t('Previous')}
                    </Button>
                    {activeTab !== 'review' && (
                        <Button
                            primary
                            onClick={() => attemptNext(tabs)}
                            disabled={
                                (activeTab === 'details' && !isDetailsValid) ||
                                (activeTab === 'datasets' && (selectedDataSets.length === 0)) ||
                                (activeTab === 'elements' && selectedDataElements.length === 0) ||
                                (activeTab === 'units' && selectedOrgUnitIds.length === 0) ||
                                (activeTab === 'preparation' && (!datasetPreparationComplete))
                            }
                        >
                            {i18n.t('Next')}
                        </Button>
                    )}
                </ButtonStrip>
            </div>

            {/* Create / Edit Dataset Modal */}
            {datasetModalOpen && (
                <Modal onClose={() => setDatasetModalOpen(false)}>
                    <ModalTitle>
                        {editingDatasetId ? i18n.t('Edit Dataset') : i18n.t('Create Dataset')}
                    </ModalTitle>
                    <ModalContent>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <InputField
                                label={i18n.t('Name')}
                                value={datasetForm.name}
                                onChange={({ value }) => setDatasetForm(prev => ({ ...prev, name: value }))}
                                required
                            />
                            <InputField
                                label={i18n.t('Code')}
                                value={datasetForm.code}
                                onChange={({ value }) => setDatasetForm(prev => ({ ...prev, code: value }))}
                            />
                            <InputField
                                label={i18n.t('Period Type')}
                                value={datasetForm.periodType}
                                onChange={({ value }) => setDatasetForm(prev => ({ ...prev, periodType: value }))}
                                helpText={i18n.t('Enter one of: Daily, Weekly, Monthly, Quarterly, Yearly')}
                            />
                            <TextAreaField
                                label={i18n.t('Description')}
                                value={datasetForm.description}
                                onChange={({ value }) => setDatasetForm(prev => ({ ...prev, description: value }))}
                                rows={3}
                                style={{ gridColumn: '1 / -1' }}
                            />
                        </div>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button onClick={() => setDatasetModalOpen(false)}>{i18n.t('Cancel')}</Button>
                            <Button primary onClick={saveDatasetModal} disabled={loading || !datasetForm.name?.trim()}>
                                {editingDatasetId ? i18n.t('Update Dataset') : i18n.t('Create Dataset')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </div>
    )
}

export default CreateAssessmentPage