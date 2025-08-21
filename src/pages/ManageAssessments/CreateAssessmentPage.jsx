import React, { useEffect, useMemo, useState } from 'react'
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

// ---------------------- helpers ----------------------
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
    // primary set (your requested fields)
    success: i18n.t('Thank you. {{dataset}} for {{period}} at {{orgUnit}} received.', { dataset: dsName || '{{dataset}}' }),
    wrongFormat: i18n.t("Sorry, we couldn't process your message. Reply HELP for guidance."),
    noUser: i18n.t('Your number is not registered for this service.'),
    multipleOrgUnits: i18n.t('We found more than one org unit for your number. Please include the org unit code.'),
    noCodes: i18n.t('Please include data codes. Reply HELP for the format.'),
    onlyCommand: i18n.t('Command received. Now send data using: {{command}} <DATA>'),

    // legacy/extra keys (kept for compatibility with older saved payloads)
    error: i18n.t("Sorry, we couldn't process your message. Reply HELP for guidance."), // alias of wrongFormat
    help: i18n.t('Format: {{command}} <DATA>. Example: {{command}} 010 23 ...'),
    duplicate: i18n.t('Already submitted for {{period}}.'),
    notAuthorized: i18n.t('Your number is not registered for this service.'), // alias of noUser
    validationFailed: i18n.t('Some values are invalid. Please check and resend.')
})

// Normalize any previously saved responses to the full set above
const normalizeResponses = (dsName, commandName, existing = {}) => {
    const base = defaultSmsResponses(dsName)
    const merged = { ...base, ...existing }

    // keep aliases in sync if old keys were used
    if (!merged.wrongFormat && merged.error) merged.wrongFormat = merged.error
    if (!merged.noUser && merged.notAuthorized) merged.noUser = merged.notAuthorized

    // we intentionally keep {{command}}/{{dataset}} tokens as-is
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
// Expanded DQ dimensions; default is set in DetailsStep -> 'accuracy'
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
    
    // Accept both 'configured' (saved credentials) and 'ok' (tested and working)
    const status = cfg.connectionStatus
    if (status !== 'configured' && status !== 'ok') return false
    
    const authType = (cfg.authType || '').toLowerCase()
    if (authType === 'token') {
        return !!(cfg.token && cfg.token.trim().length >= 12)
    }
    return !!(cfg.username && cfg.username.trim() && cfg.password && cfg.password.trim())
}

export const CreateAssessmentPage = () => {
    const navigate = useNavigate()
    const dataEngine = useDataEngine()
    const { userInfo } = useUserAuthorities()
    const { saveAssessment, listAssessments } = useAssessmentDataStore()

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
        // Let DetailsStep set these once it loads lists (prevents "no option" crash)
        frequency: '',
        reportingLevel: '',
        // Start with Accuracy selected by default (DetailsStep ensures this if empty)
        dataQualityDimensions: ['accuracy'],
        successCriteriaPredefined: [],
        successCriteria: '',
        confidentialityLevel: 'internal',
        dataRetentionPeriod: '5years',
        autoSave: true,
        autoSync: true,
        validationAlerts: true,
        historicalComparison: false,
        publicAccess: false,
        startDate: '',
        endDate: '',
        baselineAssessmentId: '',
        period: '',
    })

    // datasets
    const [localDatasets, setLocalDatasets] = useState([])
    const [selectedDataSets, setSelectedDataSets] = useState([])
    const [datasetsLoading, setDatasetsLoading] = useState(false) // Start with false, will be set to true by useEffect
    const [datasetsPage, setDatasetsPage] = useState(1)
    const [datasetsHasMore, setDatasetsHasMore] = useState(true)

    // data elements (derived + selection)
    const [elementsAll, setElementsAll] = useState([])
    const [selectedElementIds, setSelectedElementIds] = useState([])

    // org units (derived from datasets + selection)
    const [orgUnitsAll, setOrgUnitsAll] = useState([])
    const [selectedOrgUnitIds, setSelectedOrgUnitIds] = useState([])
    
    // local org units (for mapping targets - always from local DHIS2)
    const [localOrgUnitsAll, setLocalOrgUnitsAll] = useState([])
    const [localOrgUnitsLoading, setLocalOrgUnitsLoading] = useState(false)

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
            // Save connection to localStorage for persistence across sessions
            const connectionData = {
                baseUrl: externalConfig?.baseUrl,
                authType: externalConfig?.authType,
                username: externalConfig?.authType === 'basic' ? externalConfig?.username : undefined,
                // Save credentials for authentication (stored locally)
                password: externalConfig?.authType === 'basic' ? externalConfig?.password : undefined,
                token: externalConfig?.authType === 'token' ? externalConfig?.token : undefined,
                apiVersion: externalConfig?.apiVersion,
                connectionStatus: externalConfig?.connectionStatus,
                version: externalConfig?.version,
                lastTested: externalConfig?.lastTested,
                savedAt: new Date().toISOString()
            }
            
            localStorage.setItem('dqa360_external_connection', JSON.stringify(connectionData))
            
            // You could also save to DHIS2 dataStore here:
            // await dataEngine.mutate({
            //     type: 'create',
            //     resource: 'dataStore/dqa360-connections/external',
            //     data: connectionData
            // })
            
            console.log('Connection saved successfully')
        } catch (error) {
            console.error('Failed to save connection:', error)
            throw error
        }
    }

    const handleDateChange = (field, value) => {
        setAssessmentData(prev => ({ ...prev, [field]: value }))
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
    // Expanded dataset fields
    // Expanded dataset fields (includes elements, categories, and org unit details) to avoid re-queries in later steps
    const DATASET_FIELDS_FOR_FETCH =
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

    // Define connectionReady before it's used in useEffect
    // Connection is ready only when tested successfully
    const connectionReady = useMemo(() => {
        if (metadataSource !== 'external') return true
        if (!externalConfig) return false
        
        const status = externalConfig.connectionStatus
        
        // Ready only when connection is tested successfully
        return status === 'ok'
    }, [metadataSource, externalConfig])

    // Create a stable reference for external config to prevent infinite loops
    // Only update when connection is tested successfully
    const stableExternalConfig = useMemo(() => {
        if (!externalConfig) return null
        const status = externalConfig.connectionStatus
        
        // Return config only when connection is tested successfully
        if (status !== 'ok') return null
        
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

    // Load saved connection on component mount
    useEffect(() => {
        try {
            const savedConnection = localStorage.getItem('dqa360_external_connection')
            if (savedConnection && !externalConfig) {
                const connectionData = JSON.parse(savedConnection)
                setExternalConfig({
                    ...connectionData,
                    // Keep saved credentials for authentication
                    // Reset connection status to 'configured' since we have saved credentials
                    connectionStatus: connectionData.password || connectionData.token ? 'configured' : 'not_tested'
                })
            }
        } catch (error) {
            console.error('Failed to load saved connection:', error)
        }
    }, [])

    useEffect(() => {
        if (!dataEngine) {
            return
        }
        
        // Only load datasets if we're using local source OR external connection is ready and tested
        const shouldLoadDatasets = metadataSource === 'local' || 
            (metadataSource === 'external' && connectionReady && stableExternalConfig)
        
        if (!shouldLoadDatasets) {
            // Clear datasets if switching to external but connection not ready
            if (metadataSource === 'external' && !connectionReady) {
                setLocalDatasets([])
                setDatasetsLoading(false)
                setCorsError(null)
            }
            return
        }
        
        (async () => {
            setDatasetsLoading(true)
            setLocalDatasets([]) // Clear existing datasets when switching sources
            setCorsError(null) // Clear any previous CORS errors
            
            try {
                const isExternal = metadataSource === 'external' && connectionReady && stableExternalConfig?.baseUrl
                
                // Set loading source for display
                if (isExternal) {
                    // Decode any HTML entities in the URL for display
                    const cleanUrl = stableExternalConfig.baseUrl
                        .replace(/&#x2F;/g, '/')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                    setLoadingSource(cleanUrl)
                } else {
                    // Get current instance URL from window location
                    const currentUrl = `${window.location.protocol}//${window.location.host}`
                    setLoadingSource(`${currentUrl} (current instance)`)
                }
                
                if (isExternal) {
                    // Make direct requests to external DHIS2
                    // CORS should be handled by DHIS2 CORS allowlist configuration
                    const cfg = stableExternalConfig || {}
                    
                    // Build external API URL
                    const trim = (s) => (s || '').trim()
                    const trimSlash = (u) => trim(u).replace(/\/+$/, '')
                    const root = trimSlash(cfg.baseUrl || '')
                    const v = trim(String(cfg.apiVersion ?? ''))
                    const versionPart = v ? `/v${v.replace(/^v/i, '')}` : ''
                    const apiBase = `${root}/api${versionPart}`
                    
                    // Build authorization header
                    const headers = { 'Accept': 'application/json' }
                    if ((cfg.authType || 'basic').toLowerCase() === 'token') {
                        const tok = (cfg.token || '').trim()
                        if (tok) {
                            headers['Authorization'] = `ApiToken ${tok}`
                        }
                    } else if (cfg.username || cfg.password) {
                        const enc = btoa(`${cfg.username || ''}:${cfg.password || ''}`)
                        headers['Authorization'] = `Basic ${enc}`
                    }
                    
                    const params = new URLSearchParams({
                        fields: DATASET_FIELDS_FOR_FETCH,
                        paging: 'true',
                        pageSize: '100',
                        page: '1'
                    })
                    
                    try {
                        const res = await fetch(`${apiBase}/dataSets?${params.toString()}`, { 
                            headers, 
                            credentials: 'omit',
                            mode: 'cors'
                        })
                        
                        if (!res.ok) {
                            if (res.status === 401) {
                                throw new Error(`CREDENTIALS_ERROR: Authentication failed. Please check your username/password or token in the Connection step.`)
                            }
                            if (res.status === 403) {
                                throw new Error(`PERMISSION_ERROR: Access denied. Your account may not have permission to access datasets.`)
                            }
                            throw new Error(`External fetch failed: HTTP ${res.status}`)
                        }
                        
                        const json = await res.json()
                        const list = json?.dataSets ?? []
                        setLocalDatasets(list)
                        const pager = json?.pager
                        setDatasetsHasMore(Boolean(pager && pager.page < pager.pageCount))
                        setDatasetsPage(1)
                        
                    } catch (fetchError) {
                        console.error('External fetch error:', fetchError)
                        if (fetchError.message.includes('CREDENTIALS_ERROR') || fetchError.message.includes('PERMISSION_ERROR')) {
                            throw fetchError // Re-throw specific errors
                        }
                        if (fetchError.message.includes('Failed to fetch') || fetchError.name === 'TypeError') {
                            throw new Error(`CORS_ERROR: The external DHIS2 server (${cfg.baseUrl}) does not allow cross-origin requests from this application. Please ask your DHIS2 administrator to add your domain to the CORS allowlist.`)
                        }
                        throw new Error(`External fetch failed: ${fetchError.message}`)
                    }
                } else {
                    const q = {
                        ds: {
                            resource: 'dataSets',
                            params: { fields: DATASET_FIELDS_FOR_FETCH, paging: true, pageSize: 100, page: 1 },
                        },
                    }
                    const res = await dataEngine.query(q)
                    const list = res?.ds?.dataSets ?? []
                    setLocalDatasets(list)
                    const pager = res?.ds?.pager
                    setDatasetsHasMore(Boolean(pager && pager.page < pager.pageCount))
                    setDatasetsPage(1)
                }
            } catch (e) {
                console.error('Failed to load datasets', e)
                console.error('Error details:', {
                    message: e.message,
                    stack: e.stack,
                    metadataSource,
                    connectionReady,
                    externalConfig: externalConfig ? 'present' : 'missing'
                })
                
                // Handle different error types
                if (e.message.includes('CORS_ERROR')) {
                    setCorsError(e.message.replace('CORS_ERROR: ', ''))
                } else if (e.message.includes('CREDENTIALS_ERROR')) {
                    setCorsError(e.message.replace('CREDENTIALS_ERROR: ', ''))
                } else if (e.message.includes('PERMISSION_ERROR')) {
                    setCorsError(e.message.replace('PERMISSION_ERROR: ', ''))
                } else {
                    setCorsError(null)
                }
                
                setLocalDatasets([])
                setDatasetsHasMore(false)
            } finally {
                setDatasetsLoading(false)
                setLoadingSource('')
            }
        })()
        // Re-run when switching between local/external
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataEngine, metadataSource, connectionReady, stableExternalConfig])



    // period recompute
    useEffect(() => {
        if (assessmentData.frequency) {
            setAssessmentData(prev => ({ ...prev, period: generatePeriodFromFrequency(prev.frequency) }))
        }
    }, [assessmentData.frequency])

    // Derive elements & org units from selected datasets
    useEffect(() => {
        // Elements
        const elemMap = new Map()
        ;(selectedDataSets || []).forEach(id => {
            const ds = localDatasets.find(d => d.id === id)
            ds?.dataSetElements?.forEach(dse => {
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
        })
        const derivedElements = Array.from(elemMap.values())

        // Maintain/initialize selected element IDs:
        setSelectedElementIds(prev => {
            const prevSet = new Set(prev || [])
            const derivedIds = derivedElements.map(e => e.id)
            // If nothing selected yet, default to all derived
            if ((prev || []).length === 0) return derivedIds
            // Otherwise trim to still-existing
            return derivedIds.filter(id => prevSet.has(id))
        })
        setElementsAll(derivedElements)

        // Org Units (union)
        const ouMap = new Map()
        ;(selectedDataSets || []).forEach(id => {
            const ds = localDatasets.find(d => d.id === id)
            ;(ds?.organisationUnits || []).forEach(ou => {
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
        })
        const derivedOUs = Array.from(ouMap.values())
        setOrgUnitsAll(derivedOUs)

        // Trim OU selection to still-existing
        setSelectedOrgUnitIds(prev => {
            if ((derivedOUs || []).length === 0) return []
            const valid = new Set(derivedOUs.map(o => o.id))
            return (prev || []).filter(id => valid.has(id))
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(selectedDataSets), JSON.stringify(localDatasets)])

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

    // ----- load local org units for mapping (when using external source) -----
    useEffect(() => {
        if (metadataSource !== 'external') {
            setLocalOrgUnitsAll([])
            setLocalOrgUnitsLoading(false)
            return
        }
        
        // Load local org units from the current DHIS2 instance for mapping targets
        const loadLocalOrgUnits = async () => {
            setLocalOrgUnitsLoading(true)
            try {
                let allOrgUnits = []
                let page = 1
                let hasMore = true
                
                while (hasMore) {
                    const query = {
                        organisationUnits: {
                            resource: 'organisationUnits',
                            params: {
                                fields: 'id,name,code,level,path,parent[id,name,code]',
                                paging: true,
                                pageSize: 1000,
                                page: page,
                            },
                        },
                    }
                    const response = await dataEngine.query(query)
                    const orgUnits = response?.organisationUnits?.organisationUnits || []
                    const pager = response?.organisationUnits?.pager
                    
                    allOrgUnits = [...allOrgUnits, ...orgUnits]
                    hasMore = pager && pager.page < pager.pageCount
                    page++
                }
                
                setLocalOrgUnitsAll(allOrgUnits)
            } catch (error) {
                console.error('Failed to load local org units for mapping:', error)
                setLocalOrgUnitsAll([])
            } finally {
                setLocalOrgUnitsLoading(false)
            }
        }
        
        loadLocalOrgUnits()
    }, [metadataSource, dataEngine])

    // ----- computed selections -----
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
            datasetPreparationComplete &&
            (metadataSource !== 'external' || connectionReady)
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
                    // Require connection to be tested successfully before proceeding
                    if (cfg.connectionStatus !== 'ok') {
                        messages.push(i18n.t('Please test the connection successfully before proceeding to datasets.'))
                    }
                }
                break
            }
            case 'datasets': {
                if (metadataSource === 'external' && !connectionReady) {
                    messages.push(i18n.t('Please configure your DHIS2 connection before selecting datasets.'))
                }
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
                    if ((selectedOrgUnitIds || []).length > 0 && rows.length === 0) {
                        messages.push(i18n.t('Provide mappings for all selected organisation units.'))
                        break
                    }
                    const invalidRows = []
                    rows.forEach((m, idx) => {
                        const hasSource = m?.source && String(m.source).trim().length > 0
                        const hasTarget = m?.target && String(m.target).trim().length > 0
                        if (!hasSource || !hasTarget) invalidRows.push(idx + 1)
                    })
                    if (invalidRows.length > 0) {
                        messages.push(i18n.t('Mapping row(s) missing source/target: {{rows}}', { rows: invalidRows.join(', ') }))
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
                    const mappedSources = new Set(rows.map(m => (m?.source || '').trim()).filter(Boolean))
                    const unmapped = (selectedOrgUnits || []).filter(ou => !mappedSources.has(ou.id))
                    if (unmapped.length > 0) {
                        messages.push(i18n.t('Some organisation units are not mapped ({{count}} missing).', { count: unmapped.length }))
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
        // Auto-fade the error after a short delay so users can proceed
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
                    setSelectedDataSets(prev => [...prev, id])
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

    // payload
    const buildAssessmentPayload = () => {
        const now = new Date().toISOString()

        const selDEMap = new Map((elementsAll || []).map(e => [e.id, e]))
        const materializedDEs = (selectedElementIds || []).map(id => selDEMap.get(id)).filter(Boolean)

        const selOUMap = new Map((orgUnitsAll || []).map(o => [o.id, o]))
        const materializedOUs = (selectedOrgUnitIds || []).map(id => selOUMap.get(id)).filter(Boolean)

        return {
            id: `assessment_${Date.now()}`,
            version: '2.0.0',
            createdAt: now,
            lastUpdated: now,
            info: {
                name: assessmentData.name?.trim() || '',
                description: assessmentData.description || '',
                objectives: assessmentData.objectives || '',
                scope: assessmentData.scope || '',
                frequency: assessmentData.frequency || 'Monthly',
                period: assessmentData.period || generatePeriodFromFrequency(assessmentData.frequency),
                status: 'draft',
                createdBy: formatUserInfo(userInfo),
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
            // sms moved per dataset; remove top-level sms in saved payload preview
            sms: undefined,
            datasets: {
                selected: selectedDataSets.map(id => {
                    const ds = localDatasets.find(d => d.id === id) || { id, name: id }
                    return {
                        id: ds.id,
                        name: ds.name,
                        code: ds.code || '',
                        periodType: ds.periodType || 'Monthly',
                        organisationUnits: (ds.organisationUnits || []).map(ou => ({
                            id: ou.id, name: ou.name, code: ou.code || '', level: ou.level,
                            path: ou.path, parent: ou.parent ? { id: ou.parent.id, name: ou.parent.name, code: ou.parent.code || '' } : null
                        })),
                        dataSetElements: (ds.dataSetElements || []).map(dse => ({
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
                    }
                }),
                metadata: { totalSelected: selectedDataSets.length, source: metadataSource, lastUpdated: now },
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
                        categoryOptions: (c.options || []).map(o => ({
                            id: o.id, name: o.name, code: o.code || ''
                        }))
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
                mappings: (orgUnitMappings || []).map(m => ({ sourceId: m.source, targetId: m.target })),
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
                    : (assessmentData?.creationPayload?.elementMappings || {}),
            },
            externalConfig: metadataSource === 'external' ? (externalConfig || {}) : undefined,
            metadataSource,
        }
    }

    const handleDownload = () => {
        const payload = buildAssessmentPayload()
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2))
        const a = document.createElement('a')
        a.href = dataStr
        a.download = `${payload.info.name || 'assessment'}.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    const handlePrint = () => {
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
                <head><title>${payload.info.name}</title>${style}</head>
                <body>
                    <h1>${payload.info.name}</h1>
                    <div class="meta">
                        <div><strong>${i18n.t('Period')}:</strong> ${payload.info.period}</div>
                        <div><strong>${i18n.t('Frequency')}:</strong> ${payload.info.frequency}</div>
                        <div><strong>${i18n.t('Dates')}:</strong> ${payload.info.startDate} — ${payload.info.endDate}</div>
                        <div><strong>${i18n.t('Reporting level')}:</strong> ${payload.info.reportingLevel}</div>
                    </div>
                    <pre>${JSON.stringify(payload, null, 2)}</pre>
                    <script>window.print();</script>
                </body>
            </html>
        `)
        w.document.close()
    }

    const handleSaveAssessment = async () => {
        setLoading(true)
        setError(null)
        try {
            const { valid, messages } = validateStep('review')
            if (!valid) { showValidationErrors(messages); setLoading(false); return }
            const payload = buildAssessmentPayload()
            await saveAssessment(payload)
            navigate('/administration/assessments', {
                state: { message: i18n.t('Assessment "{{name}}" created successfully', { name: payload.info.name }) },
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
        
        if (metadataSource === 'external' && !connectionReady) {
            return (
                <>
                    <h3 style={{ margin: '0 0 12px 0' }}>{i18n.t('Select datasets for this assessment')}</h3>
                    <NoticeBox title={i18n.t('DHIS2 Connection Required')}>
                        {i18n.t('Please configure your DHIS2 connection first before selecting datasets.')}
                    </NoticeBox>
                </>
            )
        }
        
        // Show error if present (CORS, credentials, permissions, etc.)
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
        // Show info notice for external source with configured credentials
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
                            {i18n.t('Your credentials are saved. The connection will be tested automatically when loading datasets from {{url}}.', { 
                                url: externalConfig.baseUrl 
                            })}
                        </NoticeBox>
                    </div>
                )}
                <DatasetsStep
                    datasets={localDatasets}
                    selectedDataSets={selectedDataSets}
                    setSelectedDataSets={setSelectedDataSets}
                    loading={datasetsLoading}
                    loadingSource={loadingSource}
                    footer={
                        datasetsHasMore && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                                <Button
                                    loading={datasetsLoading}
                                    onClick={async () => {
                                        try {
                                            setDatasetsLoading(true)
                                            const nextPage = datasetsPage + 1
                                            const isExternal = metadataSource === 'external' && connectionReady && externalConfig?.baseUrl
                                            if (isExternal) {
                                                const trim = (s) => (s || '').trim()
                                                const trimSlash = (u) => trim(u).replace(/\/+$/, '')
                                                const toApiBase = (baseUrl, apiVersion) => {
                                                    const root = trimSlash(baseUrl || '')
                                                    const v = trim(String(apiVersion ?? ''))
                                                    const versionPart = v ? `/v${v.replace(/^v/i, '')}` : ''
                                                    return `${root}/api${versionPart}`
                                                }
                                                const cfg = externalConfig || {}
                                                const apiBase = toApiBase(cfg.baseUrl, cfg.apiVersion)
                                                const headerVariants = (() => {
                                                    const variants = []
                                                    if ((cfg.authType || 'basic').toLowerCase() === 'token') {
                                                        const tok = (cfg.token || '').trim()
                                                        if (tok) {
                                                            variants.push({ 'Accept': 'application/json', 'Authorization': `ApiToken ${tok}` })
                                                            variants.push({ 'Accept': 'application/json', 'Authorization': `Bearer ${tok}` })
                                                        } else {
                                                            variants.push({ 'Accept': 'application/json' })
                                                        }
                                                    } else if (cfg.username || cfg.password) {
                                                        const enc = btoa(`${cfg.username || ''}:${cfg.password || ''}`)
                                                        variants.push({ 'Accept': 'application/json', 'Authorization': `Basic ${enc}` })
                                                    } else {
                                                        variants.push({ 'Accept': 'application/json' })
                                                    }
                                                    return variants
                                                })()
                                                const params = new URLSearchParams({
                                                    fields: DATASET_FIELDS_FOR_FETCH,
                                                    paging: 'true',
                                                    pageSize: '100',
                                                    page: String(nextPage)
                                                })
                                                let json = null
                                                let lastStatus = null
                                                for (const headers of headerVariants) {
                                                    const resp = await fetch(`${apiBase}/dataSets?${params.toString()}`, { headers, credentials: 'omit' })
                                                    if (resp.ok) { json = await resp.json(); break }
                                                    lastStatus = resp.status
                                                }
                                                if (!json) throw new Error(`External fetch failed${lastStatus ? `: HTTP ${lastStatus}` : ''}`)
                                                const pageList = json?.dataSets ?? []
                                                setLocalDatasets(prev => [...prev, ...pageList])
                                                const pager = json?.pager
                                                setDatasetsHasMore(Boolean(pager && pager.page < pager.pageCount))
                                                setDatasetsPage(nextPage)
                                            } else {
                                                const res = await dataEngine.query({
                                                    ds: {
                                                        resource: 'dataSets',
                                                        params: { fields: DATASET_FIELDS_FOR_FETCH, paging: true, pageSize: 100, page: nextPage },
                                                    },
                                                })
                                                const pageList = res?.ds?.dataSets ?? []
                                                setLocalDatasets(prev => [...prev, ...pageList])
                                                const pager = res?.ds?.pager
                                                setDatasetsHasMore(Boolean(pager && pager.page < pager.pageCount))
                                                setDatasetsPage(nextPage)
                                            }
                                        } catch (e) {
                                            console.error('Failed to load more datasets', e)
                                            setDatasetsHasMore(false)
                                        } finally {
                                            setDatasetsLoading(false)
                                        }
                                    }}
                                >
                                    {i18n.t('Load more')}
                                </Button>
                            </div>
                        )
                    }
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
                return <ConnectionStep dhis2Config={externalConfig} setDhis2Config={setExternalConfig} onSaveConnection={handleSaveConnection} />
            case 'datasets':
                return renderDatasetsStep()
            case 'elements':
                return (
                    <ElementsStep
                        dataElementsAll={elementsAll}
                        selectedDataElementIds={selectedElementIds}
                        setSelectedDataElementIds={setSelectedElementIds}
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
                        metadataSource={metadataSource}                 // 'external' | 'local'
                        selectedOrgUnits={selectedOrgUnits}            // sources (from previous step)
                        localOrgUnits={metadataSource === 'external' ? localOrgUnitsAll : orgUnitsAll} // local targets for mapping
                        localOrgUnitsLoading={metadataSource === 'external' ? localOrgUnitsLoading : false} // loading state
                        orgUnitMappings={orgUnitMappings}
                        setOrgUnitMappings={setOrgUnitMappings}
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
                        localDatasets={localDatasets}
                        selectedDataSets={selectedDataSets}
                        selectedDataElements={elementsAll.filter(e => selectedElementIds.includes(e.id))}
                        selectedOrgUnits={orgUnitsAll.filter(ou => selectedOrgUnitIds.includes(ou.id))}
                        orgUnitMappings={orgUnitMappings}
                        // NEW: surface SMS commands so defaults are visible/editable per dataset
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
                        assessmentData={assessmentData}
                        setAssessmentData={setAssessmentData}
                        smsConfig={smsConfig}
                        setSmsConfig={setSmsConfig}
                        prereqsOk={arePrerequisiteTabsValid()}
                        onBack={() => changeTab('preparation')}
                        onDownload={handleDownload}
                        onPrint={handlePrint}
                        onSave={handleSaveAssessment}
                        saving={loading}
                        buildPayload={buildAssessmentPayload}
                        selectedDataElements={selectedDataElements}
                        selectedDataSets={selectedDataSets}
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
                                (activeTab === 'datasets' && (
                                    selectedDataSets.length === 0 ||
                                    (metadataSource === 'external' && !connectionReady)
                                )) ||
                                (activeTab === 'elements' && selectedDataElements.length === 0) ||
                                (activeTab === 'units' && selectedOrgUnitIds.length === 0) ||
                                (activeTab === 'preparation' && (!datasetPreparationComplete || (metadataSource === 'external' && !connectionReady)))
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