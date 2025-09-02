import React, { useEffect, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Box,
    Button,
    InputField,
    NoticeBox,
    CircularLoader,
    Tag,
    Modal,
    ModalTitle,
    ModalContent,
    LinearLoader,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import DatasetCreationModal from '../../../components/DatasetCreationModal'

import styles from '../../Metadata/DatasetPreparation.module.css'
import SMSCommandPreview from './components/SMSCommandPreview'

// ---------- helpers (existing) ----------
const datasetTypes = ['register', 'summary', 'reported', 'corrected']
const DEFAULT_COC = 'HllvX50cXC0' // Default category option combo ID

const getDatasetTypePrefix = (datasetType) =>
    ({ register: 'REG', summary: 'SUM', reported: 'RPT', corrected: 'COR' }[datasetType] || 'GEN')

const getDatasetTypeLabel = (type) =>
    ({
        register: i18n.t('Register'),
        summary: i18n.t('Summary'),
        reported: i18n.t('Reported'),
        corrected: i18n.t('Corrected'),
    }[type] || type)

const getDatasetTypeIcon = (type) =>
    ({ register: '📝', summary: '📊', reported: '📋', corrected: '✏️' }[type] || '📄')

const getDatasetTypeDescription = (type) =>
    ({
        register: i18n.t('Data collection from health facilities'),
        summary: i18n.t('Aggregated data for analysis'),
        reported: i18n.t('External DHIS2 reported data'),
        corrected: i18n.t('Corrected data after validation'),
    }[type] || i18n.t('Dataset for DQA assessment'))

const generateUID = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 11; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    return result
}

const generateCode = async (prefix = '') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = prefix.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString(36).slice(-2).toUpperCase()
    result += timestamp
    for (let i = result.length; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    return result
}

const generateSmsCode = (index) => {
    let result = ''
    let num = index
    do {
        result = String.fromCharCode(65 + (num % 26)) + result
        num = Math.floor(num / 26) - 1
    } while (num >= 0)
    return result
}

// datastore
const DATASTORE_NAMESPACE = 'dqa360'
const datastoreQueries = {
    getAssessment: { resource: `dataStore/${DATASTORE_NAMESPACE}`, id: ({ assessmentId }) => assessmentId },
    saveAssessment: {
        resource: `dataStore/${DATASTORE_NAMESPACE}`,
        id: ({ assessmentId }) => assessmentId,
        type: 'update',
        data: ({ data }) => data,
    },
}



// fetch COCs (local or external)
const fetchCategoryOptionCombos = async (categoryComboId, dataEngine, externalConfig = null) => {
    try {
        if (!categoryComboId || categoryComboId === 'bjDvmb4bfuf') return []
        if (externalConfig?.baseUrl) {
            const cfg = externalConfig
            const trim = (s) => (s || '').trim()
            const trimSlash = (u) => trim(u).replace(/\/+$/, '')
            const root = trimSlash(cfg.baseUrl || '')
            const v = trim(String(cfg.apiVersion ?? ''))
            const versionPart = v ? `/v${v.replace(/^v/i, '')}` : ''
            const apiBase = `${root}/api${versionPart}`

            const headers = { Accept: 'application/json' }
            if ((cfg.authType || 'basic').toLowerCase() === 'token') {
                const tok = (cfg.token || '').trim()
                if (tok) headers['Authorization'] = `ApiToken ${tok}`
            } else if (cfg.username || cfg.password) {
                const enc = btoa(`${cfg.username || ''}:${cfg.password || ''}`)
                headers['Authorization'] = `Basic ${enc}`
            }

            const params = new URLSearchParams({
                fields: 'id,name,code,categoryOptions[id,name,code]',
                filter: `categoryCombo.id:eq:${categoryComboId}`,
                paging: 'true',
                pageSize: '1000',
            })

            const res = await fetch(`${apiBase}/categoryOptionCombos?${params.toString()}`, {
                headers,
                credentials: 'omit',
                mode: 'cors',
            })
            if (!res.ok) return []
            const data = await res.json()
            return data?.categoryOptionCombos || []
        } else {
            const result = await dataEngine.query({
                cocs: {
                    resource: 'categoryOptionCombos',
                    params: {
                        fields: 'id,name,code,categoryOptions[id,name,code]',
                        filter: `categoryCombo.id:eq:${categoryComboId}`,
                        paging: false,
                    },
                },
            })
            return result?.cocs?.categoryOptionCombos || []
        }
    } catch (e) {
        console.warn('Failed to fetch COCs:', e)
        return []
    }
}

const generateSmsCodesForDataElements = (dataElements) =>
    dataElements.map((de, index) => ({
        ...de,
        smsCode: generateSmsCode(index),
        categoryCombo: de.categoryCombo,
        displayName: de.name || de.displayName,
    }))

const expandSmsCodesForCategoryOptions = (dataElement, realCOCs = null) => {
    const categoryCombo = dataElement.fullCategoryCombo || dataElement.originalCategoryCombo || dataElement.categoryCombo
    const isDefaultCategoryCombo =
        !categoryCombo ||
        categoryCombo.id === 'bjDvmb4bfuf' ||
        String(categoryCombo.name || '').toLowerCase() === 'default'

    if (isDefaultCategoryCombo) {
        return [
            {
                smsCode: dataElement.smsCode,
                categoryOptionCombo: { id: DEFAULT_COC, name: 'default', code: 'default' },
                displayName: dataElement.displayName || dataElement.name,
                dataElement,
            },
        ]
    }

    if (realCOCs && realCOCs.length > 0) {
        return realCOCs.map((coc, i) => ({
            smsCode: `${dataElement.smsCode}${i + 1}`,
            categoryOptionCombo: { id: coc.id, name: coc.name, code: coc.code, categoryOptions: coc.categoryOptions || [] },
            displayName: `${dataElement.displayName || dataElement.name} (${coc.name})`,
            dataElement,
        }))
    }

    const categories = categoryCombo.categories || []
    const hasFull = categories.every((c) => c.categoryOptions && c.categoryOptions.length > 0)

    const generateCombinations = (cats) => {
        if (cats.length === 0) return [[]]
        const [first, ...rest] = cats
        const restCombos = generateCombinations(rest)
        const combos = []
        ;(first.categoryOptions || []).forEach((opt) => {
            restCombos.forEach((r) => combos.push([opt, ...r]))
        })
        return combos
    }

    const combos = hasFull
        ? generateCombinations(categories)
        : // placeholder realistic-ish
        generateCombinations(
            categories.map((category) => ({
                ...category,
                categoryOptions:
                    category.categoryOptions && category.categoryOptions.length
                        ? category.categoryOptions
                        : [
                            { id: `${category.id}_opt_1`, name: 'Option 1', shortName: 'Opt1', code: 'OPT1' },
                            { id: `${category.id}_opt_2`, name: 'Option 2', shortName: 'Opt2', code: 'OPT2' },
                        ],
            }))
        )

    return combos.map((optionCombo, index) => {
        const cocName = optionCombo.map((o) => o.name || o.displayName).join(', ')
        const cocCode = optionCombo.map((o) => o.code || o.shortName || o.name).join('_')
        return {
            smsCode: `${dataElement.smsCode}${index + 1}`,
            categoryOptionCombo: { name: cocName, code: cocCode, categoryOptions: optionCombo },
            displayName: `${dataElement.displayName || dataElement.name} (${cocName})`,
            dataElement,
        }
    })
}

const generateSmsCommandStructure = (datasetConfig, dataElements) => {
    const allExpandedCodes = dataElements.flatMap((de) => expandSmsCodesForCategoryOptions(de))
    return {
        name: datasetConfig.smsCommandName,
        keyword: datasetConfig.smsKeyword,
        separator: datasetConfig.smsSeparator || ' ',
        codeSeparator: datasetConfig.smsCodeSeparator && datasetConfig.smsCodeSeparator.length ? datasetConfig.smsCodeSeparator : '.',
        codeValueSeparator:
            datasetConfig.smsCodeValueSeparator && datasetConfig.smsCodeValueSeparator.length
                ? datasetConfig.smsCodeValueSeparator
                : '.',
        successMessage: datasetConfig.smsSuccessMessage,
        wrongFormatMessage: datasetConfig.smsWrongFormatMessage,
        noUserMessage: datasetConfig.smsNoUserMessage,
        moreThanOneOrgUnitMessage: datasetConfig.smsMoreThanOneOrgUnitMessage,
        noCodesMessage: datasetConfig.smsNoCodesMessage,
        dataset: { id: datasetConfig.id },
        smsCodes: allExpandedCodes.map((code) => ({
            code: code.smsCode,
            dataElement: { id: code.dataElement.id },
            categoryOptionCombo: code.categoryOptionCombo
                ? { id: code.categoryOptionCombo.id || 'bjDvmb4bfuf', name: code.categoryOptionCombo.name, code: code.categoryOptionCombo.code }
                : { id: 'bjDvmb4bfuf' },
            formula: null,
        })),
    }
}

// ---------- NEW: buildAssignedLocalOrgUnits (Target as assignment, Source shown in "External Mapping") ----------
const buildAssignedLocalOrgUnits = ({ selectedExternal = [], orgUnitMappings = [], metaSource = 'local' }) => {
    // Local metadata → treat incoming selection as already local
    if ((metaSource || '').toLowerCase() !== 'external') {
        const uniq = new Map()
        for (const ou of selectedExternal || []) {
            if (!ou?.id) continue
            uniq.set(ou.id, {
                id: ou.id,
                uid: ou.id,
                name: ou.name || ou.displayName || ou.id,
                displayName: ou.displayName || ou.name || ou.id,
                code: ou.code || '',
                level: ou.level,
                parent: ou.parent
                    ? { id: ou.parent.id, uid: ou.parent.id, name: ou.parent.displayName || ou.parent.name }
                    : undefined,
            })
        }
        return Array.from(uniq.values())
    }

    const asObj = (x) => {
        if (!x) return null
        if (typeof x === 'string') return { id: x }
        if (typeof x === 'object' && x.id) return x
        return null
    }

    // Index mapping rows by SOURCE id
    const bySource = new Map()
    for (const row of orgUnitMappings || []) {
        const src =
            asObj(row?.source) ||
            asObj(row?.external) ||
            asObj(row?.sourceOrgUnit) ||
            asObj(row?.origin) ||
            asObj(row?.sourceUid) ||
            asObj(row?.sourceId)
        const tgt =
            asObj(row?.target) ||
            asObj(row?.local) ||
            asObj(row?.targetOrgUnit) ||
            asObj(row?.destination) ||
            asObj(row?.mapped) ||
            asObj(row?.targetUid) ||
            asObj(row?.targetId)
        if (src?.id && tgt?.id) bySource.set(String(src.id), { src, tgt })
    }

    const uniqLocal = new Map()
    for (const sel of selectedExternal || []) {
        const srcId = String(sel?.id || '')
        if (!srcId) continue
        const hit = bySource.get(srcId)
        if (!hit?.tgt?.id) continue

        const local = hit.tgt
        // Prefer the selected external OU object (has full names) over minimal mapping src
        const external = (sel && String(sel.id) === String(hit.src.id)) ? sel : hit.src

        uniqLocal.set(local.id, {
            id: local.id,
            uid: local.id,
            name: local.name || local.displayName || local.id,
            displayName: local.displayName || local.name || local.id,
            code: local.code || '',
            level: local.level,
            parent: local.parent
                ? { id: local.parent.id, uid: local.parent.id, name: local.parent.displayName || local.parent.name }
                : undefined,

            // For table display only (last column)
            mappingExternal: {
                id: external.id,
                uid: external.id,
                name: external.name || external.displayName || external.id,
                displayName: external.displayName || external.name || external.id,
                code: external.code || '',
                level: external.level,
                parent: external.parent
                    ? { id: external.parent.id, uid: external.parent.id, name: external.parent.displayName || external.parent.name }
                    : undefined,
            },
        })
    }

    return Array.from(uniqLocal.values())
}

// ---------- main component ----------
const DatasetPreparationPorted = ({
                                      assessmentId,
                                      assessmentName,
                                      assessmentData,
                                      setAssessmentData,
                                      selectedDataElements = [],
                                      selectedOrgUnits = [],
                                      period,
                                      frequency,
                                      metadataSource,
                                      orgUnitMappings = [],
                                      onFinish,
                                  }) => {
    const [loading, setLoading] = useState(true)
    const [saving] = useState(false)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('register')

    const [datasets, setDatasets] = useState({})
    const [datasetDataElements, setDatasetDataElements] = useState({
        register: [],
        summary: [],
        reported: [],
        corrected: [],
    })

    const mappingIdByKeyRef = React.useRef(new Map())

    const mappingRows = React.useMemo(() => {
        const DATASET_TYPES = ['register', 'summary', 'reported', 'corrected']
        const TYPE_ALIAS = { register: 'dsA', summary: 'dsB', reported: 'dsC', corrected: 'dsD' }
        const norm = (s) => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
        const collapse = (s) => s.replace(/_+/g, '_').replace(/^_+|_+$/g, '')
        const stripDatasetPrefix = (text) => {
            let t = String(text || '').trim()
            t = t.replace(/^\s*(REG(?:ISTER)?|SUM(?:MARY)?|RPT|REPORTED|COR(?:RECTED)?)\s*[-:–—]?\s*/i, '')
            return t
        }
        const makeKeyFromName = (name) => collapse(norm(stripDatasetPrefix(name)))
        const getMappingName = (name) => {
            const stripped = stripDatasetPrefix(name)
            return stripped || name || ''
        }
        const deriveKey = (de) => makeKeyFromName(de?.name || de?.displayName || de?.formName || de?.code || 'DE')

        const buckets = {}
        for (const t of DATASET_TYPES) {
            const list = Array.isArray(datasetDataElements?.[t]) ? datasetDataElements[t] : []
            for (const de of list) {
                const key = deriveKey(de)
                if (!buckets[key]) {
                    let mid = mappingIdByKeyRef.current.get(key)
                    if (!mid) {
                        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                        let gen = ''
                        for (let i = 0; i < 11; i++) gen += chars[Math.floor(Math.random() * chars.length)]
                        mid = gen
                        mappingIdByKeyRef.current.set(key, mid)
                    }
                    buckets[key] = {
                        mappingId: mid,
                        mappingName: getMappingName(de.name || de.displayName || de.formName || de.code || ''),
                        dataElementName: de.name || de.displayName || de.formName || key,
                        valueType: de.valueType || 'NUMBER',
                        mappings: [],
                        __byType: {},
                    }
                }
                const row = buckets[key]
                if (!row.__byType[t]) {
                    const mapping = {
                        dataset: { id: null, type: t, alias: TYPE_ALIAS[t] },
                        dataElements: [
                            { id: de.id || null, code: de.code || '', name: de.name || '', valueType: de.valueType || 'NUMBER' },
                        ],
                    }
                    row.mappings.push(mapping)
                    row.__byType[t] = mapping
                }
            }
        }
        return Object.values(buckets).map((r) => {
            const { __byType, ...rest } = r
            rest.mappings = (rest.mappings || []).sort(
                (a, b) => ['register', 'summary', 'reported', 'corrected'].indexOf(a.dataset.type) -
                    ['register', 'summary', 'reported', 'corrected'].indexOf(b.dataset.type)
            )
            return rest
        })
    }, [datasetDataElements])

    const mappingRowsSig = React.useMemo(() => {
        try {
            return JSON.stringify(
                (mappingRows || [])
                    .map((r) => ({
                        id: r.mappingId,
                        types: (r.mappings || []).map((m) => m?.dataset?.type).sort(),
                        count: (r.mappings || []).length,
                    }))
                    .sort((a, b) => (a.id || '').localeCompare(b.id || ''))
            )
        } catch {
            return ''
        }
    }, [mappingRows])

    const lastMappingSigRef = React.useRef('')
    React.useEffect(() => {
        if (typeof setAssessmentData !== 'function') return
        if (lastMappingSigRef.current === mappingRowsSig) return
        lastMappingSigRef.current = mappingRowsSig
        setAssessmentData((prev) => ({
            ...(prev || {}),
            dataElementMappings: mappingRows,
            mappingPayload: {
                ...(prev?.mappingPayload || {}),
                elementsMapping: mappingRows,
            },
        }))
    }, [mappingRowsSig, mappingRows, setAssessmentData])

    const [showProgressModal, setShowProgressModal] = useState(false)
    const [showCreationModal, setShowCreationModal] = useState(false)
    const [creationProgress] = useState({ stage: '', currentItem: '', current: 0, total: 0 })
    const [cocCache, setCocCache] = useState(new Map())
    const dataEngine = useDataEngine()

    const fetchFullCategoryCombo = async (categoryComboId) => {
        if (!categoryComboId || categoryComboId === 'bjDvmb4bfuf') return null
        try {
            const externalConfig = assessmentData?.externalConfig
            if (externalConfig?.baseUrl) {
                const cfg = externalConfig
                const trim = (s) => (s || '').trim()
                const trimSlash = (u) => trim(u).replace(/\/+$/, '')
                const root = trimSlash(cfg.baseUrl || '')
                const v = trim(String(cfg.apiVersion ?? ''))
                const versionPart = v ? `/v${v.replace(/^v/i, '')}` : ''
                const apiBase = `${root}/api${versionPart}`

                const headers = { Accept: 'application/json' }
                if ((cfg.authType || 'basic').toLowerCase() === 'token') {
                    const tok = (cfg.token || '').trim()
                    if (tok) headers['Authorization'] = `ApiToken ${tok}`
                } else if (cfg.username || cfg.password) {
                    const enc = btoa(`${cfg.username || ''}:${cfg.password || ''}`)
                    headers['Authorization'] = `Basic ${enc}`
                }

                const params = new URLSearchParams({
                    fields: 'id,name,code,categories[id,name,code,shortName,categoryOptions[id,name,code,shortName]]',
                })

                const res = await fetch(`${apiBase}/categoryCombos/${categoryComboId}?${params.toString()}`, {
                    headers,
                    credentials: 'omit',
                    mode: 'cors',
                })
                if (!res.ok) return null
                return await res.json()
            } else {
                const result = await dataEngine.query({
                    cc: {
                        resource: 'categoryCombos',
                        id: categoryComboId,
                        params: {
                            fields: 'id,name,code,categories[id,name,code,shortName,categoryOptions[id,name,code,shortName]]',
                        },
                    },
                })
                return result?.cc || null
            }
        } catch (e) {
            console.warn('Failed to fetch full CategoryCombo', categoryComboId, e)
            return null
        }
    }

    const fetchRealCOCs = async (categoryComboId) => {
        if (!categoryComboId || categoryComboId === 'bjDvmb4bfuf') return []
        if (cocCache.has(categoryComboId)) return cocCache.get(categoryComboId)
        try {
            const externalConfig = assessmentData?.externalConfig
            const cocs = await fetchCategoryOptionCombos(categoryComboId, dataEngine, externalConfig)
            setCocCache((prev) => new Map(prev).set(categoryComboId, cocs))
            return cocs
        } catch (e) {
            console.warn('Failed to fetch COCs for', categoryComboId, e)
            return []
        }
    }



    const updateDataset = (datasetType, field, value) => {
        setDatasets((prev) => ({ ...prev, [datasetType]: { ...prev[datasetType], [field]: value } }))
    }
    const setDatasetFields = (datasetType, fields) => {
        setDatasets((prev) => ({ ...prev, [datasetType]: { ...(prev?.[datasetType] || {}), ...fields } }))
    }
    const updateDataElement = (datasetType, elementId, field, value) => {
        setDatasetDataElements((prev) => ({
            ...prev,
            [datasetType]: (prev[datasetType] || []).map((el) => (el.id === elementId ? { ...el, [field]: value } : el)),
        }))
    }

    // ---------- initialize (UPDATED: use buildAssignedLocalOrgUnits) ----------
    const initializeDatasets = async () => {
        try {
            setLoading(true)
            setError(null)

            // Load existing
            let existingData = null
            if (assessmentId) {
                try {
                    const response = await dataEngine.query({ assessment: datastoreQueries.getAssessment }, { variables: { assessmentId } })
                    existingData = response.assessment
                } catch {
                    /* ignore */
                }
            }

            const initialDatasets = {}
            const initialDataElements = { register: [], summary: [], reported: [], corrected: [] }

            const defaultKeywordForType = (type) => {
                const prefixMap = { register: 'DQAR', summary: 'DQAS', reported: 'DQAD', corrected: 'DQAC' }
                const prefix = prefixMap[type] || 'DQA'
                const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
                return `${prefix}${suffix}`
            }

            // Decide meta source for OU mapping
            const metaSource =
                assessmentData?.externalConfig?.baseUrl
                    ? 'external'
                    : (assessmentData?.metadataSource || metadataSource || 'local')

            // Build LOCAL assigned OUs once, reuse for all datasets
            let organisationUnitsForAllDatasets = buildAssignedLocalOrgUnits({
                selectedExternal: selectedOrgUnits,
                orgUnitMappings,
                metaSource,
            })

            // Enrich missing local OU details (name/code/level/parent) using API if needed
            try {
                const needDetails = organisationUnitsForAllDatasets.filter(ou => !ou || !ou.name || !ou.displayName || !ou.parent || !ou.level)
                if (needDetails.length > 0) {
                    const ids = Array.from(new Set(needDetails.map(ou => ou.id).filter(Boolean)))
                    if (ids.length > 0) {
                        const res = await dataEngine.query({
                            ous: {
                                resource: 'organisationUnits',
                                params: {
                                    fields: 'id,name,displayName,code,level,parent[id,name,displayName]',
                                    filter: `id:in:[${ids.join(',')}]`,
                                    paging: false,
                                },
                            },
                        })
                        const found = (res?.ous?.organisationUnits || [])
                        const byId = new Map(found.map(x => [x.id, x]))
                        organisationUnitsForAllDatasets = organisationUnitsForAllDatasets.map(ou => {
                            const d = byId.get(ou.id)
                            if (!d) return ou
                            return {
                                ...ou,
                                name: ou.name || d.name || d.displayName || ou.id,
                                displayName: ou.displayName || d.displayName || d.name || ou.id,
                                code: ou.code || d.code || '',
                                level: ou.level ?? d.level,
                                parent: ou.parent || (d.parent ? { id: d.parent.id, name: d.parent.name || d.parent.displayName, displayName: d.parent.displayName || d.parent.name } : undefined),
                                // ensure we never show UID in name cells
                                _label: `${d.displayName || d.name || ou.displayName || ou.name || ou.id}`,
                            }
                        })
                    }
                }
            } catch (e) {
                // non-fatal; keep minimal identifiers
                console.warn('Failed to enrich org units', e)
            }

            const usedRunUids = new Set()

            for (const type of datasetTypes) {
                const existingDataset = existingData?.datasets?.[type]
                const smsDefault = ['register', 'summary', 'corrected'].includes(type)

                let generatedUidForRun = generateUID()
                while (usedRunUids.has(generatedUidForRun)) generatedUidForRun = generateUID()
                usedRunUids.add(generatedUidForRun)

                initialDatasets[type] = {
                    id: existingDataset?.id || generateUID(),
                    name: existingDataset?.name || `${assessmentName} - ${getDatasetTypeLabel(type)}`,
                    shortName: existingDataset?.shortName || `${assessmentName} - ${getDatasetTypeLabel(type)}`,
                    code: existingDataset?.code || (await generateCode(getDatasetTypePrefix(type))),
                    formName: existingDataset?.formName || `${assessmentName} - ${getDatasetTypeLabel(type)}`,
                    description:
                        existingDataset?.description || i18n.t('Dataset for {{desc}}', { desc: getDatasetTypeDescription(type) }),
                    periodType: 'Monthly',
                    categoryCombo: { id: 'bjDvmb4bfuf' },
                    sharingPublicAccess: existingDataset?.sharingPublicAccess || 'rwrw----',
                    sharingExternal: existingDataset?.sharingExternal ?? false,
                    smsEnabled: existingDataset?.smsEnabled ?? smsDefault,
                    smsCommandName:
                        existingDataset?.smsCommandName || `${assessmentName} - ${getDatasetTypeLabel(type)} SMS`,
                    smsKeyword:
                        (existingDataset?.smsKeyword && existingDataset.smsKeyword.trim().length > 0)
                            ? existingDataset.smsKeyword
                            : defaultKeywordForType(type),
                    smsParser: existingDataset?.smsParser || 'KEY_VALUE_PARSER',
                    smsSeparator: existingDataset?.smsSeparator || ' ',
                    smsCodeSeparator: (existingDataset?.smsCodeSeparator && existingDataset?.smsCodeSeparator.length)
                        ? existingDataset.smsCodeSeparator
                        : '.',
                    smsCodeValueSeparator: (existingDataset?.smsCodeValueSeparator && existingDataset?.smsCodeValueSeparator.length)
                        ? existingDataset.smsCodeValueSeparator
                        : '.',
                    smsSuccessMessage:
                        existingDataset?.smsSuccessMessage || i18n.t('Thank you! Your data was received successfully.'),
                    smsWrongFormatMessage:
                        existingDataset?.smsWrongFormatMessage || i18n.t('Wrong format. Please use the correct SMS structure.'),
                    smsNoUserMessage:
                        existingDataset?.smsNoUserMessage || i18n.t('No DHIS2 user is linked to your number.'),
                    smsMoreThanOneOrgUnitMessage:
                        existingDataset?.smsMoreThanOneOrgUnitMessage || i18n.t('Multiple org units found. Please contact support.'),
                    smsNoCodesMessage:
                        existingDataset?.smsNoCodesMessage || i18n.t('No data codes found. Include values after the command.'),
                    generatedUidForRun: generatedUidForRun,
                    dataSetElements: [],
                    // *** Assign LOCAL (Target) OU list for every dataset ***
                    organisationUnits: organisationUnitsForAllDatasets,
                }

                // Elements
                const existingElements = existingData?.dataElements?.[type] || []
                const baseElements = existingElements.length > 0 ? existingElements : selectedDataElements || []
                const elementsToCreate = generateSmsCodesForDataElements(baseElements)

                for (const sourceElement of elementsToCreate) {
                    const ccSrc = sourceElement.categoryCombo
                    let preFullCC = null
                    if (ccSrc) {
                        const isDefaultCC = ccSrc.id === 'bjDvmb4bfuf' || String(ccSrc.name || '').toLowerCase() === 'default'
                        const cats = Array.isArray(sourceElement.categories) ? sourceElement.categories : []
                        if (isDefaultCC) {
                            preFullCC = ccSrc
                        } else if (cats.length > 0) {
                            preFullCC = {
                                id: ccSrc.id,
                                name: ccSrc.name,
                                code: ccSrc.code,
                                categories: cats.map((cat) => ({
                                    id: cat.id,
                                    name: cat.name,
                                    shortName: cat.shortName,
                                    code: cat.code,
                                    categoryOptions: (cat.options || []).map((opt) => ({
                                        id: opt.id,
                                        name: opt.name,
                                        shortName: opt.shortName || opt.name,
                                        code: opt.code || opt.shortName || opt.name,
                                    })),
                                })),
                            }
                        } else {
                            try {
                                const fetchedCC = await fetchFullCategoryCombo(ccSrc.id)
                                if (fetchedCC && Array.isArray(fetchedCC.categories) && fetchedCC.categories.length > 0) {
                                    preFullCC = {
                                        id: fetchedCC.id,
                                        name: fetchedCC.name || fetchedCC.displayName,
                                        code: fetchedCC.code || '',
                                        categories: fetchedCC.categories.map((cat) => ({
                                            id: cat.id,
                                            name: cat.name || cat.displayName,
                                            shortName: cat.shortName || cat.name || cat.displayName,
                                            code: cat.code || '',
                                            categoryOptions: (cat.categoryOptions || []).map((opt) => ({
                                                id: opt.id,
                                                name: opt.name || opt.displayName || opt.shortName || opt.code,
                                                shortName: opt.shortName || opt.name || opt.displayName,
                                                code: opt.code || '',
                                            })),
                                        })),
                                    }
                                } else {
                                    preFullCC = ccSrc
                                }
                            } catch {
                                preFullCC = ccSrc
                            }
                        }
                    }

                    const elementId = sourceElement.id && existingElements.length > 0 ? sourceElement.id : generateUID()
                    const elementCode =
                        sourceElement.code && existingElements.length > 0
                            ? sourceElement.code
                            : `${getDatasetTypePrefix(type)}${Date.now().toString(36).slice(-2).toUpperCase()}${Math.random()
                                .toString(36)
                                .slice(-2)
                                .toUpperCase()}`

                    const dataElement = {
                        id: elementId,
                        name: `${getDatasetTypePrefix(type)} - ${sourceElement.displayName || sourceElement.name}`,
                        shortName: (() => {
                            const base = `${getDatasetTypePrefix(type)} - ${sourceElement.shortName || sourceElement.name || sourceElement.displayName}`
                            return base.length > 50 ? base.slice(0, 50) : base
                        })(),
                        code: elementCode,
                        formName: `${getDatasetTypePrefix(type)} - ${sourceElement.formName || sourceElement.name || sourceElement.displayName}`,
                        description: i18n.t('{{typeLabel}} dataset element for {{name}}', {
                            typeLabel: getDatasetTypeLabel(type),
                            name: sourceElement.displayName || sourceElement.name,
                        }),
                        valueType: sourceElement.valueType || 'INTEGER',
                        aggregationType: sourceElement.aggregationType || 'SUM',
                        domainType: 'AGGREGATE',
                        categoryCombo: {
                            id: sourceElement.categoryCombo?.id || 'bjDvmb4bfuf',
                            name: sourceElement.categoryCombo?.name,
                            code: sourceElement.categoryCombo?.code,
                        },
                        zeroIsSignificant: !!sourceElement.zeroIsSignificant,
                        smsCode: sourceElement.smsCode,
                        originalCategoryCombo: sourceElement.categoryCombo,
                        fullCategoryCombo: preFullCC || null,
                    }

                    initialDataElements[type].push(dataElement)
                    initialDatasets[type].dataSetElements.push({ dataElement: { id: elementId } })
                }
            }

            setDatasets(initialDatasets)
            setDatasetDataElements(initialDataElements)

        } catch (err) {
            setError(i18n.t('Failed to initialize datasets: {{msg}}', { msg: err.message }))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        initializeDatasets()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        assessmentId,
        Array.isArray(selectedDataElements) ? selectedDataElements.length : 0,
        Array.isArray(selectedOrgUnits) ? selectedOrgUnits.length : 0,
    ])

    const assignedOrgUnitsByDataset = React.useMemo(
        () => ({
            register: datasets?.register?.organisationUnits || [],
            summary: datasets?.summary?.organisationUnits || [],
            reported: datasets?.reported?.organisationUnits || [],
            corrected: datasets?.corrected?.organisationUnits || [],
        }),
        [datasets]
    )

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
                <CircularLoader />
            </div>
        )
    }

    const currentOrgUnits = datasets?.[activeTab]?.organisationUnits || []
    const currentElements = datasetDataElements?.[activeTab] || []

    return (
        <div className={styles.container}>
            {error && (
                <NoticeBox error title={i18n.t('Error')}>
                    {error}
                </NoticeBox>
            )}

            {/* Tabs */}
            <div className={styles.tabs}>
                {datasetTypes.map((type) => (
                    <button
                        key={type}
                        className={`${styles.tab} ${activeTab === type ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(type)}
                    >
                        <span className={styles.tabIcon}>{getDatasetTypeIcon(type)}</span>
                        <span className={styles.tabLabel}>{getDatasetTypeLabel(type)}</span>
                        <span className={styles.countPill}>{(datasetDataElements[type] || []).length}</span>
                    </button>
                ))}
            </div>

            {/* Active Tab Content */}
            {datasets[activeTab] && (
                <div className={styles.tabContent}>
                    {/* Dataset Configuration */}
                    <div className={styles.configSection} style={{ marginBottom: 10 }}>
                        <div className={styles.configHeader}>
                            <h3 className={styles.sectionTitle}>{i18n.t('Dataset Configuration')}</h3>
                            <p className={styles.sectionDescription}>{i18n.t('Configure dataset details and SMS reporting')}</p>
                        </div>

                        <div className={styles.formGrid}>
                            <InputField dense label={i18n.t('Dataset Name')} value={datasets[activeTab].name || ''} onChange={({ value }) => updateDataset(activeTab, 'name', value)} />
                            <InputField dense label={i18n.t('Short Name')} value={datasets[activeTab].shortName || ''} onChange={({ value }) => updateDataset(activeTab, 'shortName', value)} />
                            <InputField dense label={i18n.t('Code')} value={datasets[activeTab].code || ''} onChange={({ value }) => updateDataset(activeTab, 'code', value)} />
                            <InputField dense label={i18n.t('Form Name')} value={datasets[activeTab].formName || datasets[activeTab].name || ''} onChange={({ value }) => updateDataset(activeTab, 'formName', value)} />
                            <InputField dense label={i18n.t('Dataset UID (preview)')} value={datasets[activeTab].generatedUidForRun || ''} readOnly />
                            <InputField dense label={i18n.t('Period Type')} value={datasets[activeTab].periodType || 'Monthly'} onChange={({ value }) => updateDataset(activeTab, 'periodType', value)} />
                            <InputField dense label={i18n.t('Description')} value={datasets[activeTab].description || ''} onChange={({ value }) => updateDataset(activeTab, 'description', value)} />
                            <InputField dense label={i18n.t('Category Combo UID')} value={datasets[activeTab]?.categoryCombo?.id || 'bjDvmb4bfuf'} onChange={({ value }) => updateDataset(activeTab, 'categoryCombo', { id: value })} />
                            <SingleSelectField dense label={i18n.t('Form Type')} selected={datasets[activeTab].formType || 'DEFAULT'} onChange={({ selected }) => updateDataset(activeTab, 'formType', selected)}>
                                <SingleSelectOption value="DEFAULT" label="DEFAULT" />
                                <SingleSelectOption value="CUSTOM" label="CUSTOM" />
                                <SingleSelectOption value="SECTION" label="SECTION" />
                                <SingleSelectOption value="SECTION_MULTIORG" label="SECTION_MULTIORG" />
                            </SingleSelectField>
                            <SingleSelectField dense label={i18n.t('Aggregation Type')} selected={datasets[activeTab].aggregationType || 'SUM'} onChange={({ selected }) => updateDataset(activeTab, 'aggregationType', selected)}>
                                <SingleSelectOption value="SUM" label="SUM" />
                                <SingleSelectOption value="AVERAGE" label="AVERAGE" />
                            </SingleSelectField>
                            <InputField dense label={i18n.t('Timely Days')} type="number" value={Number.isInteger(datasets[activeTab].timelyDays) ? String(datasets[activeTab].timelyDays) : '15'} onChange={({ value }) => updateDataset(activeTab, 'timelyDays', parseInt(value || '0', 10))} />
                            <InputField dense label={i18n.t('Open Future Periods')} type="number" value={Number.isInteger(datasets[activeTab].openFuturePeriods) ? String(datasets[activeTab].openFuturePeriods) : '0'} onChange={({ value }) => updateDataset(activeTab, 'openFuturePeriods', parseInt(value || '0', 10))} />
                            <InputField dense label={i18n.t('Expiry Days')} type="number" value={Number.isInteger(datasets[activeTab].expiryDays) ? String(datasets[activeTab].expiryDays) : '0'} onChange={({ value }) => updateDataset(activeTab, 'expiryDays', parseInt(value || '0', 10))} />
                            <InputField dense label={i18n.t('Open Periods After CO End Date')} type="number" value={Number.isInteger(datasets[activeTab].openPeriodsAfterCoEndDate) ? String(datasets[activeTab].openPeriodsAfterCoEndDate) : '0'} onChange={({ value }) => updateDataset(activeTab, 'openPeriodsAfterCoEndDate', parseInt(value || '0', 10))} />
                            <InputField dense label={i18n.t('Version')} type="number" value={Number.isInteger(datasets[activeTab].version) ? String(datasets[activeTab].version) : '1'} onChange={({ value }) => updateDataset(activeTab, 'version', parseInt(value || '1', 10))} />
                        </div>

                        {/* Data Elements Preview */}
                        <div className={styles.dataElementsSection}>
                            <div className={styles.dataElementsHeader}>
                                <h3 className={styles.dataElementsTitle}>{i18n.t('Data Elements')}</h3>
                                <p className={styles.sectionDescription}>{i18n.t('Preview of elements included in this dataset')}</p>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Name')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Short Name')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('UID')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Code')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Form Name')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Value Type')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Aggregation')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Domain')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Category Combo (Name · UID)')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('SMS Code')}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {currentElements.map((de) => (
                                        <tr key={de.id}>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.name}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.shortName}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.id}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.code}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.formName}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.valueType}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.aggregationType}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.domainType}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                                {(() => {
                                                    const cc = de.fullCategoryCombo || de.originalCategoryCombo || de.categoryCombo
                                                    return cc?.name || cc?.displayName || '—'
                                                })()}
                                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                    {(() => {
                                                        const cc = de.fullCategoryCombo || de.originalCategoryCombo || de.categoryCombo
                                                        return cc?.id || de.categoryCombo?.id || '—'
                                                    })()}
                                                </div>
                                            </td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                                {datasets[activeTab].smsEnabled ? (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <InputField
                                                                dense
                                                                value={de.smsCode || ''}
                                                                onChange={({ value }) => updateDataElement(activeTab, de.id, 'smsCode', value)}
                                                                style={{ minWidth: 60 }}
                                                            />
                                                            {de.smsCode && <Tag positive small>{de.smsCode}</Tag>}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                                            {(() => {
                                                                const cc = de.fullCategoryCombo || de.originalCategoryCombo || de.categoryCombo
                                                                const isDefault =
                                                                    !cc || cc.id === 'bjDvmb4bfuf' || String(cc.name || '').toLowerCase() === 'default'
                                                                if (isDefault) return i18n.t('Codes: 1 (default)')
                                                                try {
                                                                    const count = (expandSmsCodesForCategoryOptions(de) || []).length
                                                                    return i18n.t('Codes: {{n}} (by category option combos)', { n: count })
                                                                } catch {
                                                                    return i18n.t('Codes: preview unavailable')
                                                                }
                                                            })()}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Tag neutral>—</Tag>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mapping Preview */}
                        <div style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, marginTop: 20 }}>
                            <div style={{ margin: '0 0 8px' }}>
                                <h4 style={{ margin: 0 }}>🔗 Element Mapping Preview</h4>
                                <p style={{ margin: '4px 0', color: '#666' }}>
                                    Preview of how similar data elements (by name/code ignoring dataset prefixes) will be aligned across
                                    Register, Summary, Reported, and Corrected.
                                </p>
                            </div>
                            {(() => {
                                const rows = mappingRows
                                if (!rows || rows.length === 0) return <div style={{ padding: 8, border: '1px solid #eee' }}>No elements to map yet</div>
                                const th = { textAlign: 'left', borderBottom: '2px solid #ccc', padding: '10px 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.4px' }
                                const td = { borderBottom: '1px solid #eee', padding: '10px 8px', verticalAlign: 'top', fontSize: 13 }
                                const Cell = ({ m }) => {
                                    if (!m || !Array.isArray(m.dataElements) || m.dataElements.length === 0) return <span style={{ color: '#999' }}>—</span>
                                    const d = m.dataElements[0]
                                    return (
                                        <div>
                                            <div style={{ fontFamily: 'monospace' }}>
                                                <code>{d.code || '—'}</code>
                                            </div>
                                            <div style={{ color: '#555' }}>{d.name || '—'}</div>
                                            {d.valueType && <div style={{ fontSize: 11, color: '#888' }}>{d.valueType}</div>}
                                        </div>
                                    )
                                }
                                return (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                            <tr>
                                                <th style={th}>Mapping ID</th>
                                                <th style={th}>Register</th>
                                                <th style={th}>Summary</th>
                                                <th style={th}>Reported</th>
                                                <th style={th}>Corrected</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {rows.map((row, i) => {
                                                const byType = {}
                                                ;(row.mappings || []).forEach((m) => {
                                                    byType[m.dataset?.type] = m
                                                })
                                                return (
                                                    <tr key={row.mappingId || i}>
                                                        <td style={td}>
                                                            <div style={{ fontFamily: 'monospace' }}>
                                                                <code>{row.mappingId}</code>
                                                            </div>
                                                            {row.mappingName && (
                                                                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{row.mappingName}</div>
                                                            )}
                                                        </td>
                                                        <td style={td}><Cell m={byType.register} /></td>
                                                        <td style={td}><Cell m={byType.summary} /></td>
                                                        <td style={td}><Cell m={byType.reported} /></td>
                                                        <td style={td}><Cell m={byType.corrected} /></td>
                                                    </tr>
                                                )
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Org Units */}
                        <div style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, marginTop: 20 }}>
                            <div style={{ marginBottom: 8 }}>
                                <h4 style={{ margin: 0 }}>🏢 {i18n.t('Assigned Organisation Units')}</h4>
                                <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
                                    {i18n.t('These org units will be linked to the dataset')}
                                </p>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{ marginBottom: 8, fontWeight: 600 }}>
                                    {i18n.t('Total: {{count}}', { count: currentOrgUnits.length })}
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Name')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>{i18n.t('UID')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Code')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Level')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Parent')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>{i18n.t('Parent UID')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('External Org (Name)')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>{i18n.t('External Org (UID)')}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {currentOrgUnits.map((ou) => (
                                        <tr key={ou.id}>
                                            {/* LOCAL */}
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou._label || ou.displayName || ou.name || '—'}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', fontSize: 12 }}>{ou.id}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.code || '—'}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.level ?? '—'}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.parent?.displayName || ou.parent?.name || '—'}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid ' + '#f3f4f6', fontFamily: 'monospace', fontSize: 12 }}>
                                                {ou.parent?.id || '—'}
                                            </td>
                                            {/* EXTERNAL (Source) */}
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                                {(() => {
                                                    const ext = ou.mappingExternal || ou._source
                                                    return ext ? (ext.displayName || ext.name || '—') : '—'
                                                })()}
                                            </td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', fontSize: 12 }}>
                                                {(() => {
                                                    const ext = ou.mappingExternal || ou._source
                                                    return ext?.id || '—'
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Sharing (inline, no card) */}
                        <div style={{ marginTop: 20, marginBottom: 20 }}>
                            <h4 style={{ margin: 0, fontWeight: 600 }}>🔐 {i18n.t('Dataset Sharing Settings')}</h4>
                            <p style={{ margin: '4px 0 12px', color: '#6b7280' }}>{i18n.t('Control who can see and capture data for this dataset')}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
                                <SingleSelectField
                                    label={i18n.t('Public access')}
                                    selected={datasets[activeTab].sharingPublicAccess || 'rwrw----'}
                                    onChange={({ selected }) => updateDataset(activeTab, 'sharingPublicAccess', selected)}
                                    dense
                                >
                                    <SingleSelectOption value="rwrw----" label={i18n.t('Can capture and view')} />
                                    <SingleSelectOption value="rw------" label={i18n.t('Capture & view (legacy)')} />
                                    <SingleSelectOption value="r-------" label={i18n.t('Can view only')} />
                                    <SingleSelectOption value="--------" label={i18n.t('No public access')} />
                                </SingleSelectField>
                                <SingleSelectField
                                    label={i18n.t('External access')}
                                    selected={String(!!datasets[activeTab].sharingExternal)}
                                    onChange={({ selected }) => updateDataset(activeTab, 'sharingExternal', selected === 'true')}
                                    dense
                                >
                                    <SingleSelectOption value="false" label={i18n.t('Disabled')} />
                                    <SingleSelectOption value="true" label={i18n.t('Enabled')} />
                                </SingleSelectField>
                            </div>
                        </div>

                        {/* SMS */}
                        <div className={styles.smsSection} style={{ marginTop: 20 }}>
                            <div className={styles.sectionHeader}>
                                <h4 className={styles.sectionTitle}>📱 {i18n.t('SMS Reporting')}</h4>
                                <p className={styles.sectionDescription}>{i18n.t('Enable and configure SMS reporting options')}</p>
                            </div>
                            <div className={styles.smsControls}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={!!datasets[activeTab].smsEnabled}
                                        onChange={(e) => {
                                            const enabled = e.target.checked
                                            setDatasetFields(activeTab, { smsEnabled: enabled })
                                            if (enabled) {
                                                try {
                                                    const type = activeTab
                                                    const prefixMap = { register: 'DQAR', summary: 'DQAS', reported: 'DQAD', corrected: 'DQAC' }
                                                    const prefix = prefixMap[type] || 'DQA'
                                                    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
                                                    const keyword = `${prefix}${suffix}`
                                                    if (!datasets?.[activeTab]?.smsKeyword) setDatasetFields(activeTab, { smsKeyword: keyword })
                                                } catch {}
                                            }
                                        }}
                                    />
                                    <span>{i18n.t('Enable SMS for this dataset')}</span>
                                </label>

                                {datasets[activeTab].smsEnabled && (
                                    <div className={styles.formGridFull}>
                                        <div className={styles.formGrid}>
                                            <InputField
                                                dense
                                                label={i18n.t('SMS Command Name')}
                                                helpText={i18n.t('Defaults to "{{name}}" if left empty', {
                                                    name: `${(datasets[activeTab].name || `${assessmentName} - ${getDatasetTypeLabel(activeTab)}`)} ${i18n.t('SMS')}`,
                                                })}
                                                value={datasets[activeTab].smsCommandName || ''}
                                                onChange={({ value }) => updateDataset(activeTab, 'smsCommandName', value)}
                                                onBlur={() => {
                                                    const current = datasets[activeTab].smsCommandName
                                                    if (!current || !current.trim()) {
                                                        const defName = `${(datasets[activeTab].name || `${assessmentName} - ${getDatasetTypeLabel(activeTab)}`)} ${i18n.t('SMS')}`
                                                        updateDataset(activeTab, 'smsCommandName', defName)
                                                    }
                                                }}
                                            />

                                            <div>
                                                <SingleSelectField
                                                    dense
                                                    label={i18n.t('SMS Parser')}
                                                    helpText={i18n.t('Choose the DHIS2 SMS parser type')}
                                                    selected={datasets[activeTab].smsParser || 'KEY_VALUE_PARSER'}
                                                    onChange={({ selected }) => updateDataset(activeTab, 'smsParser', selected)}
                                                >
                                                    <SingleSelectOption value="KEY_VALUE_PARSER" label={i18n.t('Key-Value Parser (default)')} />
                                                    <SingleSelectOption value="J2ME_PARSER" label={i18n.t('J2ME Parser')} />
                                                    <SingleSelectOption value="ALERT_PARSER" label={i18n.t('Alert Parser')} />
                                                    <SingleSelectOption value="UNREGISTERED_PARSER" label={i18n.t('Unregistered Parser')} />
                                                    <SingleSelectOption value="TRACKED_ENTITY_REGISTRATION_PARSER" label={i18n.t('Tracked Entity Registration Parser')} />
                                                    <SingleSelectOption value="PROGRAM_STAGE_DATAENTRY_PARSER" label={i18n.t('Program Stage Data Entry Parser')} />
                                                </SingleSelectField>
                                                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                                                    {i18n.t('Default is Key-Value Parser.')}
                                                </div>
                                            </div>

                                            <InputField dense label={i18n.t('SMS Command Keyword')} helpText={i18n.t('Defaults to a dataset-specific keyword if left empty')} value={datasets[activeTab].smsKeyword || ''} onChange={({ value }) => updateDataset(activeTab, 'smsKeyword', value)} />

                                            <div>
                                                <SingleSelectField
                                                    dense
                                                    label={i18n.t('Keyword-Data Separator')}
                                                    helpText={i18n.t('Separator between keyword and data values')}
                                                    selected={datasets[activeTab].smsSeparator || ' '}
                                                    onChange={({ selected }) => updateDataset(activeTab, 'smsSeparator', selected)}
                                                >
                                                    {[' ', ',', '-', ':', ';', '|', '/', '#', '@', '+', '.'].map((ch) => (
                                                        <SingleSelectOption key={ch} value={ch} label={ch === ' ' ? i18n.t('Space') : ch} />
                                                    ))}
                                                </SingleSelectField>
                                                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                                                    {i18n.t('Used to separate the keyword from data values')}
                                                </div>
                                            </div>

                                            <div>
                                                <SingleSelectField
                                                    dense
                                                    label={i18n.t('Code-Code Separator')}
                                                    helpText={i18n.t('Separator between SMS codes')}
                                                    selected={
                                                        (datasets[activeTab].smsCodeSeparator && datasets[activeTab].smsCodeSeparator.length)
                                                            ? datasets[activeTab].smsCodeSeparator
                                                            : '.'
                                                    }
                                                    onChange={({ selected }) => updateDataset(activeTab, 'smsCodeSeparator', selected)}
                                                >
                                                    {['.', ' ', ',', '-', ':', ';', '|', '/', '#', '@', '+'].map((ch) => (
                                                        <SingleSelectOption key={ch} value={ch} label={ch === ' ' ? i18n.t('Space') : ch} />
                                                    ))}
                                                </SingleSelectField>
                                            </div>

                                            <div>
                                                <SingleSelectField
                                                    dense
                                                    label={i18n.t('Code-Value Separator')}
                                                    helpText={i18n.t('Separator between SMS code and its value')}
                                                    selected={
                                                        (datasets[activeTab].smsCodeValueSeparator && datasets[activeTab].smsCodeValueSeparator.length)
                                                            ? datasets[activeTab].smsCodeValueSeparator
                                                            : '.'
                                                    }
                                                    onChange={({ selected }) => updateDataset(activeTab, 'smsCodeValueSeparator', selected)}
                                                >
                                                    {['.', ' ', ':', '=', '-', ',', ';', '|', '/', '#', '@', '+'].map((ch) => (
                                                        <SingleSelectOption key={ch} value={ch} label={ch === ' ' ? i18n.t('Space') : ch} />
                                                    ))}
                                                </SingleSelectField>
                                            </div>
                                        </div>

                                        <h5 className={styles.subsectionTitle}>📨 {i18n.t('SMS Response Messages')}</h5>
                                        <div className={styles.formGrid}>
                                            <InputField dense label={i18n.t('Success message')} value={datasets[activeTab].smsSuccessMessage || ''} onChange={({ value }) => updateDataset(activeTab, 'smsSuccessMessage', value)} />
                                            <InputField dense label={i18n.t('Wrong format message')} value={datasets[activeTab].smsWrongFormatMessage || ''} onChange={({ value }) => updateDataset(activeTab, 'smsWrongFormatMessage', value)} />
                                            <InputField dense label={i18n.t('No user message')} value={datasets[activeTab].smsNoUserMessage || ''} onChange={({ value }) => updateDataset(activeTab, 'smsNoUserMessage', value)} />
                                            <InputField dense label={i18n.t('More than one orgunit message')} value={datasets[activeTab].smsMoreThanOneOrgUnitMessage || ''} onChange={({ value }) => updateDataset(activeTab, 'smsMoreThanOneOrgUnitMessage', value)} />
                                            <InputField dense label={i18n.t('No codes message')} helpText={i18n.t('Shown when only the command is received')} value={datasets[activeTab].smsNoCodesMessage || ''} onChange={({ value }) => updateDataset(activeTab, 'smsNoCodesMessage', value)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SMS Command Preview */}
                            {currentElements.length > 0 && (
                                <div className={styles.configSection} style={{ marginBottom: 10 }}>
                                    <div className={styles.sectionHeader}>
                                        <h4 className={styles.sectionTitle}>📱 {i18n.t('SMS Command Preview')}</h4>
                                        <p className={styles.sectionDescription}>
                                            {datasets[activeTab].smsEnabled
                                                ? i18n.t('Preview of how SMS commands will be structured')
                                                : i18n.t('Enable SMS to see command preview (Note: Reported datasets typically do not use SMS by default)')}
                                        </p>
                                    </div>
                                    {datasets[activeTab].smsEnabled ? (
                                        <div className={styles.smsPreviewContainer}>
                                            <SMSCommandPreview
                                                currentElements={currentElements}
                                                datasets={datasets}
                                                activeTab={activeTab}
                                                fetchRealCOCs={fetchRealCOCs}
                                                expandSmsCodesForCategoryOptions={expandSmsCodesForCategoryOptions}
                                                fetchFullCategoryCombo={fetchFullCategoryCombo}
                                                onComputed={(cmd) => {
                                                    try {
                                                        const prevCfg = datasets?.[activeTab] || {}
                                                        const nextFields = {}
                                                        if (Array.isArray(cmd.smsCodes) && cmd.smsCodes.length > 0) nextFields.computedSmsCodes = cmd.smsCodes
                                                        if ((cmd.keyword || '') !== (prevCfg.smsKeyword || '')) nextFields.smsKeyword = cmd.keyword || prevCfg.smsKeyword
                                                        if ((cmd.separator || ' ') !== (prevCfg.smsSeparator || ' ')) nextFields.smsSeparator = cmd.separator || ' '
                                                        if ((cmd.codeSeparator || '.') !== (prevCfg.smsCodeSeparator || '.')) nextFields.smsCodeSeparator = cmd.codeSeparator || '.'
                                                        if ((cmd.codeValueSeparator || '.') !== (prevCfg.smsCodeValueSeparator || '.')) nextFields.smsCodeValueSeparator = cmd.codeValueSeparator || '.'
                                                        if (Object.keys(nextFields).length > 0) setDatasetFields(activeTab, nextFields)
                                                    } catch {}
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className={styles.smsDisabledMessage}>
                                            <p
                                                style={{
                                                    padding: '16px',
                                                    backgroundColor: '#f5f5f5',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    color: '#666',
                                                    fontStyle: 'italic',
                                                }}
                                            >
                                                {i18n.t('SMS is currently disabled for this dataset. Enable SMS above to see the command preview.')}
                                                {activeTab === 'reported' && <br />}
                                                {activeTab === 'reported' &&
                                                    i18n.t(
                                                        'Note: Reported datasets typically do not require SMS commands as they are used for data analysis rather than data collection.'
                                                    )}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className={styles.actionButtons}>
                <Button primary onClick={() => setShowCreationModal(true)} disabled={saving || Object.keys(datasets).length === 0}>
                    🚀 {i18n.t('Create DQA Datasets')}
                </Button>
            </div>

            {/* Progress Modal */}
            {showProgressModal && (
                <Modal large onClose={() => setShowProgressModal(false)}>
                    <ModalTitle>{i18n.t('Creating DQA Datasets')}</ModalTitle>
                    <ModalContent>
                        <div className={styles.progressContent}>
                            <LinearLoader />
                            <Box marginTop="16px">
                                <p className={styles.progressText}>{creationProgress.stage}</p>
                                <p className={styles.progressSubtext}>{creationProgress.currentItem}</p>
                                {creationProgress.total > 0 && (
                                    <p className={styles.progressCounter}>
                                        {i18n.t('Progress: {{current}} of {{total}}', {
                                            current: creationProgress.current,
                                            total: creationProgress.total,
                                        })}
                                    </p>
                                )}
                            </Box>
                        </div>
                    </ModalContent>
                </Modal>
            )}

            {/* Creation Modal */}
            {showCreationModal && (
                <DatasetCreationModal
                    isOpen={showCreationModal}
                    onClose={() => {
                        setShowCreationModal(false)
                        try {
                            onFinish?.(true)
                        } catch {}
                    }}
                    datasets={datasets}
                    dataElements={datasetDataElements}
                    orgUnits={selectedOrgUnits}
                    assignedOrgUnitsByDataset={assignedOrgUnitsByDataset}
                    orgUnitMappings={orgUnitMappings}
                    assessmentName={assessmentName}
                    assessmentId={assessmentData?.id}
                    metadataSource={assessmentData?.externalConfig?.baseUrl ? 'external' : 'local'}
                    onAllDatasetsCreated={(result) => {
                        console.log('PreparationStep - onAllDatasetsCreated called with:', result)
                        
                        const created =
                            result?.handoff?.createdDatasets ||
                            result?.createdDatasets ||
                            result?.savedPayload?.localDatasets?.createdDatasets ||
                            []

                        const mappings =
                            result?.handoff?.dataElementMappings ||
                            result?.dataElementMappings ||
                            result?.handoff?.elementMappingsFlat ||
                            result?.elementMappingsFlat ||
                            result?.handoff?.elementMappings ||
                            result?.savedPayload?.localDatasets?.dataElementMappings ||
                            result?.savedPayload?.localDatasets?.elementMappings ||
                            []

                        const smsCmds =
                            result?.handoff?.sms?.commands || result?.sms?.commands || result?.savedPayload?.sms?.commands || []

                        console.log('PreparationStep - extracted data:', {
                            created: created,
                            createdLength: created?.length,
                            mappings: mappings,
                            mappingsLength: mappings?.length,
                            smsCmds: smsCmds?.length
                        })

                        if (typeof setAssessmentData === 'function') {
                            setAssessmentData((prev) => {
                                const updated = {
                                    ...(prev || {}),
                                    dqaDatasetsCreated: created,
                                    dataElementMappings: Array.isArray(mappings) ? mappings : Object.values(mappings || {}).flat(),
                                    orgUnitMappings: orgUnitMappings || [],
                                    sms: { ...(prev?.sms || {}), commands: smsCmds },
                                }
                                console.log('PreparationStep - updating assessmentData:', updated)
                                return updated
                            })
                        }
                    }}
                />
            )}
        </div>
    )
}

// Wrapper component
const PreparationStep = ({
                             assessmentData,
                             setAssessmentData,
                             metadataSource,
                             orgUnitMappings = [],
                             selectedDataElements = [],
                             selectedOrgUnits: selectedOrgUnitsProp = [],
                             orgUnits: orgUnitsProp = [],
                             onComplete,
                         }) => {
    const assessmentId = assessmentData?.id || assessmentData?.assessmentId || ''
    const assessmentName = assessmentData?.name || assessmentData?.assessmentName || i18n.t('Assessment')
    const period = assessmentData?.period || ''
    const frequency = assessmentData?.frequency || 'Monthly'
    const selectedOrgUnits =
        selectedOrgUnitsProp && selectedOrgUnitsProp.length > 0 ? selectedOrgUnitsProp : assessmentData?.orgUnits || orgUnitsProp || []

    return (
        <DatasetPreparationPorted
            assessmentId={assessmentId}
            assessmentName={assessmentName}
            assessmentData={assessmentData}
            setAssessmentData={setAssessmentData}
            selectedDataElements={selectedDataElements}
            selectedOrgUnits={selectedOrgUnits}
            period={period}
            frequency={frequency}
            metadataSource={assessmentData?.metadataSource || metadataSource}
            orgUnitMappings={assessmentData?.orgUnitMappings || orgUnitMappings}
            onFinish={() => {
                if (typeof onComplete === 'function') onComplete(true)
            }}
        />
    )
}

export default PreparationStep