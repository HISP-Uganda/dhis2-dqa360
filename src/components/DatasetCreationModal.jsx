import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import { Modal, ModalTitle, ModalContent, ModalActions, Button, LinearLoader, NoticeBox } from '@dhis2/ui'
import { smsService } from '../services/smsService'

/**
 * DatasetCreationModal (per-dataset, inner requirements)
 *
 * For each Dataset:
 *   A. Data elements (create or reuse)
 *      A1. Category options
 *      A2. Categories
 *      A3. Category combos
 *      A4. Data elements
 *      A5. Summary
 *   B. Organisation units (local only; map external -> local)
 *   C. Dataset (create/reuse; category combo from cfg.fullCategoryCombo if provided)
 *   D1. Sharing settings
 *   D2. SMS
 * Repeat for all dataset types (Register, Summary, Reported, Corrected)
 */

const DATASET_TYPES = ['register', 'summary', 'reported', 'corrected']
const DEFAULT_CC = 'bjDvmb4bfuf'  // Default category combo ID
const DEFAULT_COC = 'HllvX50cXC0' // Default category option combo ID
const TYPE_ALIAS = { register: 'dsA', summary: 'dsB', reported: 'dsC', corrected: 'dsD' }
const DATASET_UID_ATTRIBUTE_CODE = 'DQA360_DATASET_UID'

// tidy logging sections
const STEP = { A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5', B: 'B', C: 'C', D1: 'D1', D2: 'D2' }
const STEP_LABEL = { A1: 'Category options', A2: 'Categories', A3: 'Category combos', A4: 'Data elements', A5: 'Summary', B: 'Organisation units', C: 'Datasets', D1: 'Sharing settings', D2: 'SMS' }
const s = (k) => `[${STEP[k]} ${STEP_LABEL[k] ? '- ' + STEP_LABEL[k] : ''}]`

// helpers
const nowClock = () => new Date().toLocaleTimeString()
const generateUID = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = letters.charAt(Math.floor(Math.random() * letters.length))
    for (let i = 1; i < 11; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    return result
}
const isUID = (v) => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{10}$/.test(v)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const uniqueSuffix = () => Date.now().toString(36).slice(-5).toUpperCase()
const safeShort = (s, n = 50) => String(s || '').slice(0, n)
const normCode = (s, fallbackPrefix = 'CC') =>
    (String(s ?? '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').toUpperCase()) || `${fallbackPrefix}_${uniqueSuffix()}`
const sameIdSet = (a = [], b = []) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    const A = new Set(a.map(x => x?.id).filter(Boolean))
    const B = new Set(b.map(x => x?.id).filter(Boolean))
    if (A.size !== B.size) return false
    for (const id of A) if (!B.has(id)) return false
    return true
}

const metadataQueries = {
    upsertMetadata: {
        resource: 'metadata',
        type: 'create',
        params: { importMode: 'COMMIT', importStrategy: 'CREATE_AND_UPDATE', atomicMode: 'NONE' },
        data: ({ payload }) => payload,
    },
    createSmsCommand: {
        resource: 'smsCommands',
        type: 'create',
        data: ({ body }) => body,
    },
    // Global maintenance (optional)
    updateCategoryOptionCombos: {
        resource: 'maintenance/categoryOptionComboUpdate',
        type: 'create',
        data: () => ({}),
    },
}

const DatasetCreationModal = ({
                                  isOpen,
                                  onClose,
                                  assessmentName,
                                  assessmentId,
                                  datasets = {},
                                  dataElements = {},
                                  // legacy fallbacks:
                                  orgUnits = [],
                                  orgUnitMappings = [],
                                  // preferred: EXACT assigned OUs from PreparationStep table (LOCAL)
                                  assignedOrgUnitsByDataset = {},
                                  metadataSource = 'local',
                                  onAllDatasetsCreated,
                              }) => {
    const de = useDataEngine()

    const [localLogs, setLocalLogs] = useState([])
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)

    const [currentDatasetIdx, setCurrentDatasetIdx] = useState(0)
    const [currentStepIdx, setCurrentStepIdx] = useState(0)

    const steps = useMemo(() => ([
        'Manage data elements & category combos (category options / categories / category combos / data elements)',
        'Resolve organisation units',
        'Create or reuse dataset',
        'Sharing settings',
        'SMS commands',
        'Finalize',
    ]), [])

    const datasetUidAttrIdRef = useRef(null)
    const logsElRef = useRef(null)

    useEffect(() => {
        if (isOpen) {
            setLocalLogs([])
            setIsCreating(false)
            setError(null)
            setSuccess(false)
            setCurrentDatasetIdx(0)
            setCurrentStepIdx(0)
            addLog(`Starting dataset creation [metadataSource: ${metadataSource}]`, 'info')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    useEffect(() => {
        if (logsElRef.current) logsElRef.current.scrollTop = logsElRef.current.scrollHeight
    }, [localLogs])

    const addLog = (message, level = 'info', datasetType = null) => {
        setLocalLogs((prev) => [
            ...prev,
            {
                ts: nowClock(),
                level: (level || 'info').toUpperCase(),
                datasetType: datasetType ? String(datasetType).toUpperCase() : null,
                message: String(message || '').replace(/\s+/g, ' ').trim(),
            },
        ])
        // eslint-disable-next-line no-console
        console.log(`${new Date().toISOString()} [${(level || 'info').toUpperCase()}] ${datasetType ? `[${datasetType.toUpperCase()}]` : ''} ${String(message || '').replace(/\s+/g, ' ').trim()}`)
    }

    const downloadLogs = () => {
        const blob = new Blob([localLogs.map(e =>
            `[${e.ts}][${e.level}]${e.datasetType ? `[${e.datasetType}]` : ''} ${e.message}`
        ).join('\n')], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dqa-creation-log-${(assessmentName || 'assessment').replace(/[^A-Za-z0-9-]/g, '-')}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addLog('Log file downloaded', 'success')
    }

    // ------------------------------- Finders -------------------------------
    const findOne = async (resource, { id, code, name, fields = 'id,name,code' }) => {
        const allowIdLookup = id && isUID(id) && metadataSource !== 'external'

        try {
            if (code) {
                const res = await de.query({
                    list: { resource, params: { fields, filter: `code:eq:${code}`, pageSize: 1 } },
                })
                const coll = res?.list?.[resource] || res?.list?.[resource + 's'] || res?.list?.categoryCombos || res?.list?.dataElements || []
                const item = Array.isArray(coll) ? coll[0] : coll?.[0]
                if (item?.id) return item
            }
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            if (/404|not\s*found/i.test(msg) || e?.details?.httpStatusCode === 404) {
                addLog(`${resource}: not found by code (${code})`, 'info')
            } else if (/409/i.test(msg)) {
                addLog(`${resource}: conflict while fetching by code (${code})`, 'warning')
            } else {
                addLog(`Error fetching ${resource} by code (${code}): ${msg}`, 'warning')
            }
        }
        try {
            if (name) {
                const res = await de.query({
                    list: { resource, params: { fields, filter: `name:eq:${name}`, pageSize: 1 } },
                })
                const coll = res?.list?.[resource] || res?.list?.[resource + 's'] || []
                const item = Array.isArray(coll) ? coll[0] : coll?.[0]
                if (item?.id) return item
            }
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            if (/404|not\s*found/i.test(msg) || e?.details?.httpStatusCode === 404) {
                addLog(`${resource}: not found by name (${name})`, 'info')
            } else if (/409/i.test(msg)) {
                addLog(`${resource}: conflict while fetching by name (${name})`, 'warning')
            } else {
                addLog(`Error fetching ${resource} by name (${name}): ${msg}`, 'warning')
            }
        }
        try {
            if (allowIdLookup) {
                const res = await de.query({ item: { resource, id, params: { fields } } })
                if (res?.item?.id) return res.item
            }
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            if (/404|not\s*found/i.test(msg) || e?.details?.httpStatusCode === 404) {
                addLog(`${resource}: not found by id (${id})`, 'info')
            } else if (/409/i.test(msg)) {
                addLog(`${resource}: conflict while fetching by id (${id})`, 'warning')
            } else {
                addLog(`Error fetching ${resource} by id (${id}): ${msg}`, 'warning')
            }
        }
        return null
    }

    const findCategoryComboWithHierarchy = async ({ id, code, name }, datasetType) => {
        const fields = 'id,name,code,displayName,dataDimension,categories[id,name,code,displayName,dataDimensionType,categoryOptions[id,name,code,displayName,shortName]]'
        try {
            if (code) {
                const res = await de.query({
                    list: { resource: 'categoryCombos', params: { fields, filter: `code:eq:${code}`, pageSize: 1 } },
                })
                const item = (res?.list?.categoryCombos || [])[0]
                if (item?.id) {
                    addLog(`${s('A3')} Category combo: found by code ${item.name} (${item.id})`, 'info', datasetType)
                    return item
                }
            }
        } catch (e) {
            addLog(`${s('A3')} Category combo: error on code lookup: ${e?.message || e}`, 'warning', datasetType)
        }

        try {
            if (name) {
                const res = await de.query({
                    list: { resource: 'categoryCombos', params: { fields, filter: `name:eq:${name}`, pageSize: 1 } },
                })
                const item = (res?.list?.categoryCombos || [])[0]
                if (item?.id) {
                    addLog(`${s('A3')} Category combo: found by name ${item.name} (${item.id})`, 'info', datasetType)
                    return item
                }
            }
        } catch (e) {
            addLog(`${s('A3')} Category combo: error on name lookup: ${e?.message || e}`, 'warning', datasetType)
        }

        try {
            if (id && isUID(id) && metadataSource !== 'external') {
                const res = await de.query({
                    item: { resource: 'categoryCombos', id, params: { fields } },
                })
                if (res?.item?.id) {
                    addLog(`${s('A3')} Category combo: found by ID ${res.item.name} (${res.item.id})`, 'info', datasetType)
                    return res.item
                }
            }
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            const is404 = /404|not\s*found/i.test(msg) || e?.details?.httpStatusCode === 404
            addLog(`${s('A3')} Category combo by ID ${id}: ${msg}`, is404 ? 'info' : 'warning', datasetType)
        }

        return null
    }

    // ---------------- Attribute ensure ----------------
    const dqaAttributeIdsRef = useRef({ datasetId: null, assessmentId: null })
    
    const ensureDQAAttributes = async () => {
        addLog('Ensuring DQA360 attributes…', 'info')
        
        // Ensure dataset ID attribute
        try {
            let existing = await findOne('attributes', {
                code: 'dqa360_dataset_id',
                fields: 'id,code,name,dataSetAttribute,objectTypes',
            })
            if (!existing?.id || (!existing.dataSetAttribute && !existing.objectTypes?.includes('DATA_SET'))) {
                const payload = {
                    attributes: [
                        { 
                            name: 'DQA360 Dataset ID', 
                            code: 'dqa360_dataset_id', 
                            valueType: 'TEXT', 
                            dataSetAttribute: true,
                            unique: false
                        },
                    ],
                }
                await de.mutate(metadataQueries.upsertMetadata, { variables: { payload } })
                existing = await findOne('attributes', { code: 'dqa360_dataset_id', fields: 'id' })
            }
            dqaAttributeIdsRef.current.datasetId = existing?.id || null
            if (existing?.id) addLog('DQA360 Dataset ID attribute ready.', 'success')
        } catch (e) {
            addLog(`DQA360 Dataset ID attribute failed: ${e?.message || e}`, 'warning')
        }
        
        // Ensure assessment ID attribute
        try {
            let existing = await findOne('attributes', {
                code: 'dqa360_assessment_id',
                fields: 'id,code,name,dataSetAttribute,objectTypes',
            })
            if (!existing?.id || (!existing.dataSetAttribute && !existing.objectTypes?.includes('DATA_SET'))) {
                const payload = {
                    attributes: [
                        { 
                            name: 'DQA360 Assessment ID', 
                            code: 'dqa360_assessment_id', 
                            valueType: 'TEXT', 
                            dataSetAttribute: true,
                            unique: false
                        },
                    ],
                }
                await de.mutate(metadataQueries.upsertMetadata, { variables: { payload } })
                existing = await findOne('attributes', { code: 'dqa360_assessment_id', fields: 'id' })
            }
            dqaAttributeIdsRef.current.assessmentId = existing?.id || null
            if (existing?.id) addLog('DQA360 Assessment ID attribute ready.', 'success')
        } catch (e) {
            addLog(`DQA360 Assessment ID attribute failed: ${e?.message || e}`, 'warning')
        }
    }

    const ensureDatasetUIDAttribute = async () => {
        addLog('Ensuring dataset UID attribute…', 'info')
        try {
            const existing = await findOne('attributes', {
                code: DATASET_UID_ATTRIBUTE_CODE,
                fields: 'id,code,name,dataSetAttribute,objectTypes',
            })
            if (existing?.id && (existing.dataSetAttribute || existing.objectTypes?.includes('DATA_SET'))) {
                datasetUidAttrIdRef.current = existing.id
                addLog('Found dataset UID attribute.', 'success')
                return
            }
        } catch {}
        try {
            const payload = {
                attributes: [
                    { name: 'DQA360 Dataset UID', code: DATASET_UID_ATTRIBUTE_CODE, valueType: 'TEXT', dataSetAttribute: true },
                ],
            }
            await de.mutate(metadataQueries.upsertMetadata, { variables: { payload } })
            const check = await findOne('attributes', { code: DATASET_UID_ATTRIBUTE_CODE, fields: 'id' })
            datasetUidAttrIdRef.current = check?.id || null
            if (check?.id) addLog('Created dataset UID attribute.', 'success')
            else addLog('Attribute ensure ended without id; will skip attributeValues.', 'warning')
        } catch (e) {
            addLog(`Attribute ensure failed; continuing without (ok): ${e?.message || e}`, 'warning')
        }
    }

    // Helper function to create DQA attribute values with actual IDs
    const createDQAAttributeValuesWithIds = (assessmentId, datasetType, suffix) => {
        const uniqueSuffix = suffix || Date.now().toString(36).slice(-5).toUpperCase()
        const attributes = []
        
        // Add dataset ID attribute if available
        if (dqaAttributeIdsRef.current.datasetId) {
            attributes.push({
                attribute: { id: dqaAttributeIdsRef.current.datasetId },
                value: `DQA360_${datasetType.toUpperCase()}_${uniqueSuffix}`
            })
            addLog(`DQA Dataset ID attribute: ${dqaAttributeIdsRef.current.datasetId} = DQA360_${datasetType.toUpperCase()}_${uniqueSuffix}`, 'info', datasetType)
        } else {
            addLog(`DQA Dataset ID attribute: not available`, 'warning', datasetType)
        }
        
        // Add assessment ID attribute if available and assessmentId is provided
        if (dqaAttributeIdsRef.current.assessmentId && assessmentId) {
            attributes.push({
                attribute: { id: dqaAttributeIdsRef.current.assessmentId },
                value: assessmentId
            })
            addLog(`DQA Assessment ID attribute: ${dqaAttributeIdsRef.current.assessmentId} = ${assessmentId}`, 'info', datasetType)
        } else if (dqaAttributeIdsRef.current.assessmentId && !assessmentId) {
            addLog(`DQA Assessment ID attribute: available but no assessment ID provided`, 'warning', datasetType)
        } else if (!dqaAttributeIdsRef.current.assessmentId && assessmentId) {
            addLog(`DQA Assessment ID attribute: not available but assessment ID provided (${assessmentId})`, 'warning', datasetType)
        } else {
            addLog(`DQA Assessment ID attribute: not available and no assessment ID provided`, 'info', datasetType)
        }
        
        return attributes.filter(attr => attr.value) // Only include attributes with values
    }

    // ----------------- Category hierarchy ensure (fullCategoryCombo) -----------------
    const ensureCategoryOption = async (opt, datasetType) => {
        const name = opt?.name || opt?.displayName || opt?.shortName || opt?.code || 'Option'
        const code = normCode(opt?.code || opt?.shortName || opt?.name, 'OPT')

        let existing = null
        existing = await findOne('categoryOptions', { code, fields: 'id,name,code' })
        if (!existing) existing = await findOne('categoryOptions', { name, fields: 'id,name,code' })
        if (existing?.id) {
            addLog(`${s('A1')} CategoryOption: reuse ${existing.name} (${existing.id})`, 'info', datasetType)
            return { id: existing.id }
        }
        if (opt?.id && isUID(opt.id) && metadataSource !== 'external') {
            existing = await findOne('categoryOptions', { id: opt.id, fields: 'id,name,code' })
            if (existing?.id) {
                addLog(`${s('A1')} CategoryOption: reuse ${existing.name} (${existing.id})`, 'info', datasetType)
                return { id: existing.id }
            }
        }

        const preserveUID = opt?.id && isUID(opt.id) && metadataSource !== 'external'
        const draft = {
            id: preserveUID ? opt.id : generateUID(),
            name,
            shortName: safeShort(opt?.shortName || name, 50),
            code,
        }
        addLog(`${s('A1')} CategoryOption: create ${name} [${code}]`, 'info', datasetType)
        try {
            await de.mutate(metadataQueries.upsertMetadata, { variables: { payload: { categoryOptions: [draft] } } })
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            if (/409|already exists|duplicate/i.test(msg)) {
                addLog(`${s('A1')} Category option: already exists — will reuse`, 'info', datasetType)
                const reuse = await findOne('categoryOptions', { code, fields: 'id,name,code' })
                if (reuse?.id) return { id: reuse.id }
            } else if (/404|not\s*found/i.test(msg)) {
                addLog(`${s('A1')} Category option: 404 on create — will try reuse lookup`, 'info', datasetType)
                const reuse404 = await findOne('categoryOptions', { code, fields: 'id,name,code' })
                if (reuse404?.id) return { id: reuse404.id }
            } else {
                addLog(`${s('A1')} Category option: create error — ${msg}`, 'warning', datasetType)
            }
        }
        const created = await findOne('categoryOptions', { code, fields: 'id,name,code' })
        if (created?.id) {
            addLog(`${s('A1')} Category option: created ${created.name}`, 'success', datasetType)
            return { id: created.id }
        }
        addLog(`${s('A1')} Category option: not created/persisted — skipping`, 'warning', datasetType)
        return null
    }

    const ensureCategory = async (cat, optionRefs, datasetType, dataDimensionType = 'DISAGGREGATION') => {
        const name = cat?.name || cat?.displayName || cat?.shortName || cat?.code || 'Category'
        const code = normCode(cat?.code || cat?.shortName || cat?.name, 'CAT')

        let existing = null
        existing = await findOne('categories', { code, fields: 'id,name,code,dataDimensionType' })
        if (!existing) existing = await findOne('categories', { name, fields: 'id,name,code,dataDimensionType' })
        if (existing?.id) {
            addLog(`${s('A2')} Category: reuse ${existing.name} (${existing.id})`, 'info', datasetType)
            return { id: existing.id }
        }
        if (cat?.id && isUID(cat.id) && metadataSource !== 'external') {
            existing = await findOne('categories', { id: cat.id, fields: 'id,name,code,dataDimensionType' })
            if (existing?.id) {
                addLog(`${s('A2')} Category: reuse ${existing.name} (${existing.id})`, 'info', datasetType)
                return { id: existing.id }
            }
        }

        const preserveUID = cat?.id && isUID(cat.id) && metadataSource !== 'external'
        const draft = {
            id: preserveUID ? cat.id : generateUID(),
            name,
            shortName: safeShort(cat?.shortName || name, 50),
            code,
            dataDimension: true,
            dataDimensionType,
            categoryOptions: optionRefs,
        }
        addLog(`${s('A2')} Category: create ${name} (options=${optionRefs.length}, type=${dataDimensionType})`, 'info', datasetType)
        try {
            await de.mutate(metadataQueries.upsertMetadata, { variables: { payload: { categories: [draft] } } })
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            if (/409|already exists|duplicate/i.test(msg)) {
                addLog(`${s('A2')} Category: already exists — will reuse`, 'info', datasetType)
                const reuse = await findOne('categories', { code, fields: 'id,name,code,dataDimensionType' })
                if (reuse?.id) return { id: reuse.id }
            } else if (/404|not\s*found/i.test(msg)) {
                addLog(`${s('A2')} Category: 404 on create — will try reuse lookup`, 'info', datasetType)
                const reuse404 = await findOne('categories', { code, fields: 'id,name,code,dataDimensionType' })
                if (reuse404?.id) return { id: reuse404.id }
            } else {
                addLog(`${s('A2')} Category: create error — ${msg}`, 'warning', datasetType)
            }
        }
        const created = await findOne('categories', { code, fields: 'id,name,code,dataDimensionType' })
        if (created?.id) {
            addLog(`${s('A2')} Category: created ${created.name}`, 'success', datasetType)
            return { id: created.id }
        }
        addLog(`${s('A2')} Category: not created/persisted — skipping`, 'warning', datasetType)
        return null
    }

    const createFullCategoryComboHierarchy = async (src, datasetType, categoryDataDimensionType = 'DISAGGREGATION') => {
        const categories = Array.isArray(src?.categories) ? src.categories : []
        if (categories.length === 0) {
            addLog(`${s('A3')} Category combo: no categories in full category combo — default`, 'warning', datasetType)
            return { id: DEFAULT_CC }
        }

        addLog(`${s('A3')} Category combo: building hierarchy "${src.name || src.id}"`, 'info', datasetType)
        const createdCategoryRefs = []
        for (const cat of categories) {
            const options = Array.isArray(cat?.categoryOptions) ? cat.categoryOptions : []
            if (options.length === 0) {
                addLog(`${s('A2')} Category: skip ${cat?.name || cat?.code || 'Category'} (no options)`, 'warning', datasetType)
                continue
            }
            const optionRefs = []
            for (const opt of options) {
                const optRef = await ensureCategoryOption(opt, datasetType)
                if (optRef?.id) optionRefs.push(optRef)
                else addLog(`${s('A1')} Category option: not ensured for ${opt?.name || opt?.code}`, 'warning', datasetType)
            }
            if (optionRefs.length === 0) {
                addLog(`${s('A2')} Category: skip ${cat?.name || cat?.code} (no ensured options)`, 'warning', datasetType)
                continue
            }
            const catRef = await ensureCategory(cat, optionRefs, datasetType, categoryDataDimensionType)
            if (catRef?.id) createdCategoryRefs.push(catRef)
            else {
                addLog(`${s('A2')} Category: not created/persisted — skipping`, 'warning', datasetType)
                continue
            }
            await sleep(5)
        }

        if (createdCategoryRefs.length === 0) {
            addLog(`${s('A3')} CategoryCombo: no categories ensured → default`, 'warning', datasetType)
            return { id: DEFAULT_CC }
        }

        const ccName = src?.name || src?.displayName || `CategoryCombo_${uniqueSuffix()}`
        const ccCode = normCode(src?.code || src?.name, 'CC')

        let existing = null
        if (src?.id && isUID(src.id) && metadataSource !== 'external') {
            existing = await findOne('categoryCombos', { id: src.id, fields: 'id,name,code' })
            if (existing?.id) {
                addLog(`${s('A3')} CategoryCombo: reuse ${existing.name} (${existing.id})`, 'success', datasetType)
                return { id: existing.id, name: existing.name, code: existing.code }
            }
        }
        existing = await findOne('categoryCombos', { code: ccCode, fields: 'id,name,code,categories[id]' })
        if (!existing) existing = await findOne('categoryCombos', { name: ccName, fields: 'id,name,code,categories[id]' })
        if (!existing) {
            try {
                const list = await de.query({
                    list: { resource: 'categoryCombos', params: { fields: 'id,name,code,categories[id]', pageSize: 200 } },
                })
                const all = list?.list?.categoryCombos || []
                const hit = all.find(cc => sameIdSet(cc.categories || [], createdCategoryRefs))
                if (hit?.id) existing = hit
            } catch {}
        }
        if (existing?.id) {
            addLog(`${s('A3')} CategoryCombo: reuse ${existing.name} (${existing.id})`, 'success', datasetType)
            return { id: existing.id, name: existing.name, code: existing.code }
        }

        const preserveUID = src?.id && isUID(src.id) && metadataSource !== 'external'
        const draft = {
            id: preserveUID ? src.id : generateUID(),
            name: ccName,
            code: ccCode,
            dataDimension: true,
            dataDimensionType: categoryDataDimensionType,
            categories: createdCategoryRefs,
        }
        addLog(`${s('A3')} CategoryCombo: create ${ccName} (categories=${createdCategoryRefs.length})`, 'info', datasetType)
        try {
            await de.mutate(metadataQueries.upsertMetadata, { variables: { payload: { categoryCombos: [draft] } } })
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            const status = e?.details?.httpStatusCode || e?.httpStatusCode || null
            if (status === 409 || /409|already exists|duplicate/i.test(msg)) {
                addLog(`${s('A3')} Category combo: conflict — will reuse`, 'info', datasetType)
                let reuse = await findOne('categoryCombos', { code: ccCode, fields: 'id,name,code,categories[id]' })
                if (!reuse) reuse = await findOne('categoryCombos', { name: ccName, fields: 'id,name,code,categories[id]' })
                if (!reuse) {
                    try {
                        const list = await de.query({
                            list: { resource: 'categoryCombos', params: { fields: 'id,name,code,categories[id]', pageSize: 200 } },
                        })
                        const all = list?.list?.categoryCombos || []
                        const hit = all.find(cc => sameIdSet(cc.categories || [], createdCategoryRefs))
                        if (hit?.id) reuse = hit
                    } catch {}
                }
                if (reuse?.id) return { id: reuse.id, name: reuse.name, code: reuse.code }
                addLog(`${s('A3')} Category combo: conflict but not found by code/name — skipping create`, 'warning', datasetType)
            } else if (status === 404 || /404|not\s*found/i.test(msg)) {
                addLog(`${s('A3')} Category combo: 404 on create — will try reuse lookup`, 'info', datasetType)
                let reuse404 = await findOne('categoryCombos', { code: ccCode, fields: 'id,name,code,categories[id]' })
                if (!reuse404) reuse404 = await findOne('categoryCombos', { name: ccName, fields: 'id,name,code,categories[id]' })
                if (!reuse404) {
                    try {
                        const list = await de.query({
                            list: { resource: 'categoryCombos', params: { fields: 'id,name,code,categories[id]', pageSize: 200 } },
                        })
                        const all = list?.list?.categoryCombos || []
                        const hit = all.find(cc => sameIdSet(cc.categories || [], createdCategoryRefs))
                        if (hit?.id) reuse404 = hit
                    } catch {}
                }
                if (reuse404?.id) return { id: reuse404.id, name: reuse404.name, code: reuse404.code }
            } else {
                addLog(`${s('A3')} Category combo: create error — ${msg}`, 'warning', datasetType)
            }
        }
        const created = await findOne('categoryCombos', { code: ccCode, fields: 'id,name,code' })
        if (created?.id) {
            addLog(`${s('A3')} Category combo: created ${created.name}`, 'success', datasetType)
            return { id: created.id, name: created.name, code: created.code }
        }
        addLog(`${s('A3')} Category combo: not created/persisted — falling back to DEFAULT`, 'warning', datasetType)
        return { id: DEFAULT_CC }
    }

    const ensureCategoryCombo = async (src, datasetType, categoryDataDimensionType = 'DISAGGREGATION') => {
        if (metadataSource === 'external' && (!src || (!src.id && !Array.isArray(src?.categories)))) {
            addLog(`${s('A3')} Category combo: external — default`, 'info', datasetType)
            return { id: DEFAULT_CC }
        }
        if (!src || (!src.id && !Array.isArray(src?.categories))) {
            addLog(`${s('A3')} Category combo: default`, 'info', datasetType)
            return { id: DEFAULT_CC }
        }
        if (src.id === DEFAULT_CC) {
            addLog(`${s('A3')} Category combo: already default`, 'info', datasetType)
            return { id: DEFAULT_CC }
        }

        const hit = await findCategoryComboWithHierarchy({ id: src.id, code: src.code, name: src.name }, datasetType)
        if (hit?.id) {
            addLog(`${s('A3')} Category combo: reuse ${hit.name || hit.code} (${hit.id})`, 'success', datasetType)
            return { id: hit.id, name: hit.name, code: hit.code, categories: hit.categories || [] }
        }

        if (Array.isArray(src.categories) && src.categories.length > 0) {
            return await createFullCategoryComboHierarchy(src, datasetType, categoryDataDimensionType)
        }

        addLog(`${s('A3')} Category combo: basic (default category)`, 'info', datasetType)
        let defaultCategoryId = null
        try {
            const defaultCategory = await findOne('categories', { name: 'default', fields: 'id,name,code' })
            if (defaultCategory?.id) defaultCategoryId = defaultCategory.id
        } catch {}
        if (defaultCategoryId) {
            try {
                const basicCCPayload = {
                    id: generateUID(),
                    name: src.name || src.displayName || `CategoryCombo_${uniqueSuffix()}`,
                    code: src.code || `CC_${uniqueSuffix()}`,
                    dataDimension: true,
                    dataDimensionType: categoryDataDimensionType,
                    categories: [{ id: defaultCategoryId }],
                }
                await de.mutate(metadataQueries.upsertMetadata, {
                    variables: { payload: { categoryCombos: [basicCCPayload] } },
                })
                const basicCC = await findOne('categoryCombos', { code: basicCCPayload.code, fields: 'id,name,code' })
                if (basicCC?.id) {
                    addLog(`${s('A3')} Category combo: created ${basicCC.name}`, 'success', datasetType)
                    return { id: basicCC.id, name: basicCC.name, code: basicCC.code }
                }
            } catch (e) {
                addLog(`${s('A3')} Category combo: basic create failed ${e?.details?.message || e?.message || e}`, 'warning', datasetType)
            }
        }
        addLog(`${s('A3')} Category combo: fallback to DEFAULT`, 'warning', datasetType)
        return { id: DEFAULT_CC }
    }

    // ----------------------- DataElement creation -----------------------
    const upsertDataElementsForDataset = async (datasetType, arr) => {
        const raw = Array.isArray(arr) ? arr : []
        const seen = new Set()
        const list = []
        for (const it of raw) {
            const key = String(it?.code || it?.name || '').trim().toUpperCase()
            if (!key || seen.has(key)) continue
            seen.add(key)
            list.push(it)
        }
        addLog(`${s('A4')} Data elements: ${list.length} to create or reuse`, 'info', datasetType)
        const created = []
        let idx = 0

        for (const src of list) {
            idx++
            try {
                const baseCode = String(src?.code || `${datasetType}_${uniqueSuffix()}`).toUpperCase().slice(0, 50)
                const name = String(src?.name || baseCode).slice(0, 230)
                const valueType = String(src?.valueType || 'INTEGER')
                const aggregationType = String(src?.aggregationType || 'SUM')

                const ccSource = (metadataSource === 'external') ? { id: DEFAULT_CC } : (src?.fullCategoryCombo || src?.categoryCombo || null)
                const cc = await ensureCategoryCombo(ccSource, datasetType, 'DISAGGREGATION')

                let existing = null
                const enhancedFields = 'id,name,code,categoryCombo[id,name,code,categoryOptionCombos[id,name,code,categoryOptions[id,name,code]]]'
                if (metadataSource !== 'external') {
                    try { existing = await findOne('dataElements', { code: baseCode, fields: enhancedFields }) } catch {}
                    if (!existing) { try { existing = await findOne('dataElements', { name, fields: enhancedFields }) } catch {} }
                }

                if (existing?.id) {
                    addLog(`${s('A4')} DE ${idx}/${list.length}: reuse ${existing.code}`, 'success', datasetType)
                    created.push({
                        id: existing.id,
                        name: existing.name,
                        code: existing.code,
                        valueType,
                        categoryCombo: existing.categoryCombo || { id: cc.id },
                        fullCategoryCombo: existing.categoryCombo,
                    })
                    await sleep(4)
                    continue
                }

                const preserveUID = src?.id && isUID(src.id) && metadataSource !== 'external'
                const draft = {
                    id: preserveUID ? src.id : generateUID(),
                    name,
                    shortName: name.slice(0, 50),
                    code: baseCode,
                    formName: name,
                    domainType: 'AGGREGATE',
                    valueType,
                    aggregationType,
                    zeroIsSignificant: !!src?.zeroIsSignificant,
                    categoryCombo: { id: cc.id },
                }
                addLog(`${s('A4')} DE ${idx}/${list.length}: create ${draft.code}`, 'info', datasetType)
                try {
                    await de.mutate(metadataQueries.upsertMetadata, { variables: { payload: { dataElements: [draft] } } })
                    const check = await findOne('dataElements', { code: draft.code, fields: enhancedFields })
                    if (check?.id) {
                        addLog(`${s('A4')} DE ${idx}/${list.length}: created ${check.code}`, 'success', datasetType)
                        created.push({
                            id: check.id,
                            name: check.name,
                            code: check.code,
                            valueType,
                            categoryCombo: check.categoryCombo || { id: cc.id },
                            fullCategoryCombo: check.categoryCombo,
                        })
                    } else {
                        addLog(`${s('A4')} DE ${idx}/${list.length}: created but not retrievable → skip`, 'warning', datasetType)
                        continue
                    }
                } catch (e) {
                    const msg = e?.details?.message || e?.message || String(e)
                    if (/409|conflict|already exists|duplicate/i.test(msg)) {
                        addLog(`${s('A4')} DE ${idx}/${list.length}: conflict → reuse`, 'info', datasetType)
                        const maybe = await findOne('dataElements', { code: baseCode, fields: enhancedFields })
                        if (maybe?.id) {
                            addLog(`${s('A4')} DE ${idx}/${list.length}: reuse ${maybe.code}`, 'success', datasetType)
                            created.push({
                                id: maybe.id,
                                name: maybe.name,
                                code: maybe.code,
                                valueType,
                                categoryCombo: maybe.categoryCombo || { id: cc.id },
                                fullCategoryCombo: maybe.categoryCombo,
                            })
                            continue
                        }
                        const maybeByName = await findOne('dataElements', { name, fields: enhancedFields })
                        if (maybeByName?.id) {
                            addLog(`${s('A4')} DE ${idx}/${list.length}: reuse by name ${maybeByName.code || maybeByName.id}`, 'success', datasetType)
                            created.push({
                                id: maybeByName.id,
                                name: maybeByName.name,
                                code: maybeByName.code,
                                valueType,
                                categoryCombo: maybeByName.categoryCombo || { id: cc.id },
                                fullCategoryCombo: maybeByName.categoryCombo,
                            })
                            continue
                        }
                        addLog(`${s('A4')} DE ${idx}/${list.length}: conflict but not resolvable → skip duplicate`, 'warning', datasetType)
                        continue
                    } else if (/404|not\s*found/i.test(msg)) {
                        addLog(`${s('A4')} DE ${idx}/${list.length}: 404 on create → will try lookup`, 'warning', datasetType)
                        const fallback = await findOne('dataElements', { code: baseCode, fields: enhancedFields })
                        if (fallback?.id) {
                            addLog(`${s('A4')} DE ${idx}/${list.length}: resolved after 404 ${fallback.code}`, 'success', datasetType)
                            created.push({
                                id: fallback.id,
                                name: fallback.name,
                                code: fallback.code,
                                valueType,
                                categoryCombo: fallback.categoryCombo || { id: cc.id },
                                fullCategoryCombo: fallback.categoryCombo,
                            })
                            continue
                        }
                    } else {
                        addLog(`${s('A4')} DE ${idx}/${list.length}: error ${msg}`, 'warning', datasetType)
                    }
                }
            } catch (unexpected) {
                addLog(`${s('A4')} DE ${idx}/${list.length}: unexpected ${unexpected?.message || unexpected}`, 'error', datasetType)
            }
            await sleep(6)
        }
        addLog(`${s('A5')} Summary: ${created.length}/${list.length} data elements ready`, created.length === list.length ? 'success' : 'warning', datasetType)
        return created
    }

    // ------------------------ Org units (always local) ------------------------
    const resolveLocalOU = async (ou) => {
        if (metadataSource !== 'external' && ou?.id && isUID(ou.id)) {
            return { id: ou.id }
        }
        if (metadataSource === 'external') {
            const srcId = String(ou?.id || '')
            const mapping = (orgUnitMappings || []).find((m) => String(m.source) === srcId)
            const targetId = mapping?.target || (isUID(srcId) ? srcId : null)
            if (targetId) {
                const mapped = await findOne('organisationUnits', { id: targetId, fields: 'id,name,code' })
                if (mapped?.id) return { id: mapped.id, name: mapped.name, code: mapped.code }
            }
            return null
        }
        const byCode = await findOne('organisationUnits', { code: ou?.code, fields: 'id,name,code' })
        if (byCode?.id) return { id: byCode.id, name: byCode.name, code: byCode.code }
        const byName = await findOne('organisationUnits', { name: ou?.name, fields: 'id,name,code' })
        if (byName?.id) return { id: byName.id, name: byName.name, code: byName.code }
        const byId = await findOne('organisationUnits', { id: ou?.id, fields: 'id,name,code' })
        if (byId?.id) return { id: byId.id, name: byId.name, code: byId.code }
        return null
    }

    const buildLocalOrgUnits = async (datasetType) => {
        addLog(`${s('B')} Organisation units: resolving`, 'info', datasetType)

        const mappings = Array.isArray(orgUnitMappings) ? orgUnitMappings : []
        const mapBySource = new Map(mappings.map((m) => [String(m.source), m.target]))

        let initial = Array.isArray(assignedOrgUnitsByDataset?.[datasetType])
            ? assignedOrgUnitsByDataset[datasetType]
            : (Array.isArray(orgUnits) ? orgUnits : [])

        let source
        if (metadataSource === 'external') {
            addLog(`${s('B')} Organisation units: resolving external selections to local`, 'info', datasetType)
            source = await Promise.all((initial || []).map(async (ou) => {
                const srcId = String(ou?.id || '')
                const mappedTarget = mapBySource.get(srcId)
                if (mappedTarget) return { id: mappedTarget }
                if (isUID(srcId)) {
                    try {
                        const exists = await findOne('organisationUnits', { id: srcId, fields: 'id' })
                        if (exists?.id) return { id: srcId }
                    } catch {}
                }
                addLog(`${s('B')} Organisation units: no mapping for ${srcId} and not a resolvable local UID`, 'warning', datasetType)
                return null
            }))
            source = source.filter(Boolean)
        } else {
            source = initial
        }

        const uniq = new Map()
        for (const ou of source) {
            const local = await resolveLocalOU(ou)
            if (local?.id) uniq.set(local.id, local)
        }

        const arr = Array.from(uniq.values())
        addLog(`${s('B')} Organisation units: ${arr.length} resolved for dataset assignment`, arr.length > 0 ? 'success' : 'error', datasetType)
        return arr
    }

    // -------------------------- Dataset creation --------------------------
    const validateDatasetPayload = (payload, datasetType) => {
        const errors = []
        if (!payload.name) errors.push('Dataset name is required')
        if (!payload.code) errors.push('Dataset code is required')
        if (!payload.dataSetElements?.length) errors.push('Dataset must have at least one data element')
        if (!payload.organisationUnits?.length) errors.push('Dataset must have at least one organisation unit')
        if (!['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].includes(payload.periodType)) errors.push('Invalid period type')
        if (errors.length) addLog(`Dataset validation failed: ${errors.join(', ')}`, 'error', datasetType)
        return errors
    }

    const createDataset = async (datasetType, cfg, deList, ouList, assessmentIdToUse) => {
        const dsCC = await ensureCategoryCombo(cfg.fullCategoryCombo || cfg.categoryCombo || { id: DEFAULT_CC }, datasetType, 'ATTRIBUTE')

        addLog(`${s('C')} Dataset: ${cfg.name} (DEs=${deList.length}, OUs=${ouList.length})`, 'info', datasetType)

        const preserveUID = cfg?.id && isUID(cfg.id) && metadataSource !== 'external'
        const payload = {
            id: preserveUID ? cfg.id : generateUID(),
            name: cfg.name,
            shortName: (cfg.shortName || cfg.name || '').slice(0, 50),
            code: String(cfg.code || `${datasetType}_${uniqueSuffix()}`).slice(0, 50),
            formName: cfg.formName || cfg.name,
            description: cfg.description || undefined,
            periodType: cfg.periodType || 'Monthly',
            categoryCombo: { id: dsCC?.id || DEFAULT_CC },
            dataSetElements: deList.map((d, i) => ({ dataElement: { id: d.id }, sortOrder: i + 1 })),
            organisationUnits: ouList.map((ou) => ({ id: ou.id })),
            attributeValues: [
                // Existing dataset UID attribute
                ...(datasetUidAttrIdRef.current 
                    ? [{ attribute: { id: datasetUidAttrIdRef.current }, value: generateUID() }]
                    : []
                ),
                // DQA360 attributes using actual IDs
                ...createDQAAttributeValuesWithIds(assessmentIdToUse, datasetType, uniqueSuffix())
            ].filter(attr => attr.value), // Only include attributes with values
            sharing: { public: (cfg?.sharingPublicAccess || 'rwrw----'), external: !!cfg?.sharingExternal },
            timelyDays: Number.isInteger(cfg?.timelyDays) ? cfg.timelyDays : 15,
            openFuturePeriods: Number.isInteger(cfg?.openFuturePeriods) ? cfg.openFuturePeriods : 0,
            expiryDays: Number.isInteger(cfg?.expiryDays) ? cfg.expiryDays : 0,
            openPeriodsAfterCoEndDate: Number.isInteger(cfg?.openPeriodsAfterCoEndDate) ? cfg.openPeriodsAfterCoEndDate : 0,
            version: Number.isInteger(cfg?.version) ? cfg.version : 1,
            formType: (cfg?.formType || 'DEFAULT'),
        }

        const validationErrors = validateDatasetPayload(payload, datasetType)
        if (validationErrors.length > 0) {
            addLog(`${s('C')} Dataset: skip due to validation errors`, 'warning', datasetType)
            return { id: null, payload, validationErrors }
        }

        // Debug logging for payload
        addLog(`${s('C')} Dataset: payload - name="${payload.name}", code="${payload.code}", DEs=${payload.dataSetElements?.length}, OUs=${payload.organisationUnits?.length}`, 'info', datasetType)
        addLog(`${s('C')} Dataset: attributes - ${payload.attributeValues?.length || 0} attribute values`, 'info', datasetType)
        if (payload.attributeValues?.length > 0) {
            payload.attributeValues.forEach((av, idx) => {
                addLog(`${s('C')} Dataset: attr ${idx + 1} - id=${av.attribute?.id}, value="${av.value}"`, 'info', datasetType)
            })
        } else {
            addLog(`${s('C')} Dataset: no attribute values`, 'warning', datasetType)
        }
        addLog(`${s('C')} Dataset: submit`, 'info', datasetType)

        let existing = null
        if (metadataSource !== 'external') {
            existing = await findOne('dataSets', { code: payload.code, name: payload.name, fields: 'id,name,code' })
        }
        if (existing?.id) {
            addLog(`${s('C')} Dataset: reuse ${existing.name} (${existing.id})`, 'success', datasetType)
            try {
                await de.mutate(metadataQueries.upsertMetadata, {
                    variables: { payload: { dataSets: [{
                                id: existing.id,
                                name: payload.name,
                                shortName: payload.shortName,
                                formName: payload.formName,
                                code: payload.code,
                                periodType: payload.periodType,
                                categoryCombo: payload.categoryCombo,
                                dataSetElements: payload.dataSetElements,
                                organisationUnits: payload.organisationUnits,
                                sharing: payload.sharing,
                            }] } }
                })
                addLog(`${s('C')} Dataset: assignments updated`, 'info', datasetType)
            } catch (eUp) {
                const baseMsg = eUp?.details?.message || eUp?.message || String(eUp)
                addLog(`${s('C')} Dataset: update skipped ${baseMsg}`, 'warning', datasetType)
                try {
                    const resp = eUp?.details?.response || eUp?.details?.data || eUp?.data || {}
                    const report = resp?.importReport || resp?.response || resp
                    const typeReports = Array.isArray(report?.typeReports) ? report.typeReports : []
                    let errorCount = 0
                    for (const tr of typeReports) {
                        const klass = tr?.klass || tr?.type || 'Object'
                        const objectReports = Array.isArray(tr?.objectReports) ? tr.objectReports : []
                        for (const or of objectReports) {
                            const refs = or?.object ? (or.object.name || or.object.code || or.object.id) : (or?.uid || '')
                            const errorReports = Array.isArray(or?.errorReports) ? or.errorReports : []
                            for (const er of errorReports) {
                                errorCount++
                                const code = er?.errorCode || er?.code || ''
                                const msg = er?.message || er?.mainKlass || ''
                                addLog(`${s('C')} Import error ${errorCount}: [${klass}] ${refs} - ${code} ${msg}`.trim(), 'warning', datasetType)
                            }
                        }
                    }
                    if (!errorCount && report?.stats) {
                        const st = report.stats
                        addLog(`${s('C')} Import stats - created:${st.created} updated:${st.updated} deleted:${st.deleted} ignored:${st.ignored}`,'info',datasetType)
                    }
                } catch (_) { /* ignore */ }
            }
            addLog(`${s('D')} Sharing: public=${payload.sharing.public} external=${payload.sharing.external}`, 'info', datasetType)
            return { id: existing.id, payload }
        }

        try {
            const mutationResult = await de.mutate(metadataQueries.upsertMetadata, { variables: { payload: { dataSets: [payload] } } })
            addLog(`${s('C')} Dataset: mutation completed`, 'info', datasetType)
            
            // Try multiple lookup strategies
            let resolved = await findOne('dataSets', { code: payload.code, fields: 'id,name,code' })
            if (!resolved) {
                resolved = await findOne('dataSets', { name: payload.name, fields: 'id,name,code' })
            }
            if (!resolved && payload.id) {
                resolved = await findOne('dataSets', { id: payload.id, fields: 'id,name,code' })
            }
            
            if (resolved?.id) {
                addLog(`${s('C')} Dataset: created ${resolved.name} (${resolved.id})`, 'success', datasetType)
                addLog(`${s('D')} Sharing: public=${payload.sharing.public} external=${payload.sharing.external}`, 'info', datasetType)
                return { id: resolved.id, payload }
            }
            
            // If we can't find it, try to extract ID from mutation result
            try {
                const importReport = mutationResult?.response?.importReport || mutationResult?.importReport
                const typeReports = Array.isArray(importReport?.typeReports) ? importReport.typeReports : []
                for (const tr of typeReports) {
                    if (tr?.klass === 'org.hisp.dhis.dataset.DataSet') {
                        const objectReports = Array.isArray(tr?.objectReports) ? tr.objectReports : []
                        for (const or of objectReports) {
                            if (or?.uid) {
                                addLog(`${s('C')} Dataset: extracted ID from import report (${or.uid})`, 'info', datasetType)
                                return { id: or.uid, payload }
                            }
                        }
                    }
                }
            } catch (_) { /* ignore */ }
            
            addLog(`${s('C')} Dataset: created but not resolved - trying fallback lookup`, 'warning', datasetType)
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 1000))
            const fallback = await findOne('dataSets', { code: payload.code, fields: 'id,name,code' })
            if (fallback?.id) {
                addLog(`${s('C')} Dataset: resolved after delay ${fallback.name} (${fallback.id})`, 'success', datasetType)
                return { id: fallback.id, payload }
            }
            
            return { id: null, payload }
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            
            // Try to extract detailed error information from DHIS2 import report
            try {
                const resp = e?.details?.response || e?.details?.data || e?.data || {}
                const report = resp?.importReport || resp?.response || resp
                const typeReports = Array.isArray(report?.typeReports) ? report.typeReports : []
                let errorCount = 0
                for (const tr of typeReports) {
                    const klass = tr?.klass || tr?.type || 'Object'
                    const objectReports = Array.isArray(tr?.objectReports) ? tr.objectReports : []
                    for (const or of objectReports) {
                        const refs = or?.object ? (or.object.name || or.object.code || or.object.id) : (or?.uid || '')
                        const errorReports = Array.isArray(or?.errorReports) ? or.errorReports : []
                        for (const er of errorReports) {
                            errorCount++
                            const code = er?.errorCode || er?.code || ''
                            const errorMsg = er?.message || er?.mainKlass || ''
                            addLog(`${s('C')} Import error ${errorCount}: [${klass}] ${refs} - ${code} ${errorMsg}`.trim(), 'warning', datasetType)
                        }
                    }
                }
                if (!errorCount && report?.stats) {
                    const st = report.stats
                    addLog(`${s('C')} Import stats - created:${st.created} updated:${st.updated} deleted:${st.deleted} ignored:${st.ignored}`,'info',datasetType)
                }
            } catch (_) { /* ignore error parsing */ }
            
            if (/409|conflict|already exists|duplicate/i.test(msg)) {
                addLog(`${s('C')} Dataset: conflict → reuse`, 'info', datasetType)
                const reuse = await findOne('dataSets', { code: payload.code, name: payload.name, fields: 'id,name,code' })
                if (reuse?.id) {
                    addLog(`${s('C')} Dataset: reused ${reuse.name} (${reuse.id})`, 'success', datasetType)
                    addLog(`${s('D')} Sharing: public=${payload.sharing.public} external=${payload.sharing.external}`, 'info', datasetType)
                    return { id: reuse.id, payload }
                }
                addLog(`${s('C')} Dataset: conflict but not found by code/name → unchanged`, 'warning', datasetType)
            } else if (/404|not\s*found/i.test(msg)) {
                addLog(`${s('C')} Dataset: 404 on create → will try lookup`, 'warning', datasetType)
                const maybe = await findOne('dataSets', { code: payload.code, name: payload.name, fields: 'id,name,code' })
                if (maybe?.id) {
                    addLog(`${s('C')} Dataset: resolved after 404 ${maybe.name} (${maybe.id})`, 'success', datasetType)
                    return { id: maybe.id, payload }
                }
            } else {
                addLog(`${s('C')} Dataset: error ${msg}`, 'warning', datasetType)
                
                // Try to find existing dataset by code or name as fallback
                try {
                    const fallback = await findOne('dataSets', { code: payload.code, fields: 'id,name,code' }) ||
                                   await findOne('dataSets', { name: payload.name, fields: 'id,name,code' })
                    if (fallback?.id) {
                        addLog(`${s('C')} Dataset: found existing fallback ${fallback.name} (${fallback.id})`, 'info', datasetType)
                        return { id: fallback.id, payload }
                    }
                } catch (_) { /* ignore fallback lookup errors */ }
            }
            return { id: null, payload, error: msg }
        }
    }

    // -------------------------- Ensure COCs exist (per CC) --------------------------
    const ensureCOCsForCategoryCombos = async (engine, ccIds = [], addLogFn, datasetType) => {
        // DHIS2 endpoint: POST /maintenance/categoryOptionComboUpdate/categoryCombo/{categoryComboId}
        const ids = Array.from(new Set((ccIds || []).filter((id) => id && id !== DEFAULT_CC)))
        if (!ids.length) return
        addLogFn(`${s('D2')} SMS: ensuring COCs for ${ids.length} category combo(s)`, 'info', datasetType)
        for (const ccId of ids) {
            try {
                await engine.mutate({
                    resource: `maintenance/categoryOptionComboUpdate/categoryCombo/${ccId}`,
                    type: 'create',
                    data: () => ({}),
                })
                addLogFn(`${s('D2')} SMS: COC generation triggered for CC ${ccId}`, 'success', datasetType)
                await sleep(250)
            } catch (e) {
                const msg = e?.details?.message || e?.message || String(e)
                addLogFn(`${s('D2')} SMS: COC generation failed for CC ${ccId}: ${msg}`, 'warning', datasetType)
            }
        }
    }

    // -------------------------- Generate Proper SMS Codes --------------------------
    const generateProperSmsCodes = async (deList, datasetType, addLogFn, engine) => {
        const smsCodes = []

        for (let i = 0; i < deList.length && i < 70; i++) {
            const de = deList[i]
            const baseCode = String.fromCharCode(97 + (i % 26)) // a, b, c, ...
            const ccId = de?.categoryCombo?.id
            const hasNonDefaultCC = ccId && ccId !== DEFAULT_CC

            let fullCC = de?.fullCategoryCombo

            // Fetch COCs when needed with a named key (no function signatures)
            if (hasNonDefaultCC && !(fullCC?.categoryOptionCombos?.length > 0)) {
                try {
                    const res = await engine.query({
                        cc: {
                            resource: 'categoryCombos',
                            id: ccId,
                            params: { fields: 'id,name,categoryOptionCombos[id,name,code,categoryOptions[id,name,code]]' },
                        },
                    })
                    fullCC = res?.cc
                    if (fullCC?.categoryOptionCombos?.length > 0) {
                        addLogFn(`${s('D2')} SMS: fetched ${fullCC.categoryOptionCombos.length} COCs for CC ${ccId}`, 'info', datasetType)
                    }
                } catch (e) {
                    addLogFn(`${s('D2')} SMS: fetch COCs failed for CC ${ccId}: ${e?.message || e}`, 'warning', datasetType)
                }
            }

            if (hasNonDefaultCC && fullCC?.categoryOptionCombos?.length > 0) {
                fullCC.categoryOptionCombos.forEach((coc, idx) => {
                    const code = `${baseCode.toUpperCase()}${idx + 1}` // A1, A2, ...
                    const names = coc.categoryOptions?.map((co) => co.name || co.code || co.id).join(', ') || 'default'
                    addLogFn(`${s('D2')} SMS: code ${code} → DE:${de.id} COC:${coc.id} "${coc.name || 'unnamed'}" [${names}]`, 'info', datasetType)
                    smsCodes.push({
                        code,
                        dataElement: { id: de.id },
                        categoryOptionCombo: { id: coc.id },
                        formula: null,
                    })
                })
            } else {
                const smsCode = {
                    code: baseCode,
                    dataElement: { id: de.id },
                    categoryOptionCombo: { id: DEFAULT_COC },
                    formula: null,
                }
                addLogFn(`${s('D2')} SMS: ${hasNonDefaultCC ? 'no COCs after fetch → ' : ''}fallback code ${smsCode.code} → DE:${de.id} COC:${smsCode.categoryOptionCombo.id}`, 'info', datasetType)
                smsCodes.push(smsCode)
            }
        }

        addLogFn(`${s('D2')} SMS: generated ${smsCodes.length} total SMS codes`, 'info', datasetType)
        return smsCodes
    }

    // -------------------------- Refresh SMS Command COCs --------------------------
    const refreshSmsCommandCOCs = async (smsCommandId, datasetId, deList, addLogFn) => {
        try {
            addLogFn(`${s('D2')} SMS: refreshing COCs for command ${smsCommandId}`, 'info', 'refresh')

            const ccIds = (deList || []).map((d) => d?.categoryCombo?.id).filter(Boolean)
            await ensureCOCsForCategoryCombos(de, ccIds, addLogFn, 'refresh')

            const freshSmsCodes = await generateProperSmsCodes(deList, 'refresh', addLogFn, de)

            const codes = {}
            freshSmsCodes.forEach(sc => {
                codes[sc.code] = {
                    dataElement: sc.dataElement.id,
                    categoryOptionCombo: sc.categoryOptionCombo.id
                }
            })

            await smsService.updateSmsCommand(de, smsCommandId, { smsCodes: codes })
            addLogFn(`${s('D2')} SMS: refreshed COCs for command ${smsCommandId}`, 'success', 'refresh')

            return freshSmsCodes
        } catch (error) {
            addLogFn(`${s('D2')} SMS: failed to refresh COCs for command ${smsCommandId}: ${error.message}`, 'error', 'refresh')
            throw error
        }
    }

    // -------------------------- SMS command (optional) --------------------------
    const createSmsForDataset = async (datasetType, cfg, datasetId, deList) => {
        const nested = cfg?.sms || {}
        const flatEnabled = cfg?.smsEnabled === true
        const enabled = (nested.enabled === true) || flatEnabled
        if (!enabled) {
            addLog(`${s('D2')} SMS: disabled`, 'info', datasetType)
            return null
        }
        if (!datasetId) {
            addLog(`${s('D2')} SMS: skipped (dataset id missing)`, 'warning', datasetType)
            // Try to find dataset by code/name as fallback
            try {
                const fallbackDataset = await findOne('dataSets', { code: cfg.code, fields: 'id,name,code' }) ||
                                       await findOne('dataSets', { name: cfg.name, fields: 'id,name,code' })
                if (fallbackDataset?.id) {
                    addLog(`${s('D2')} SMS: found fallback dataset ${fallbackDataset.name} (${fallbackDataset.id})`, 'info', datasetType)
                    datasetId = fallbackDataset.id
                } else {
                    return null
                }
            } catch (_) {
                return null
            }
        }

        // 1) Ensure COCs server-side BEFORE building SMS codes
        const ccIds = (deList || []).map((d) => d?.categoryCombo?.id).filter(Boolean)
        await ensureCOCsForCategoryCombos(de, ccIds, addLog, datasetType)

        const keyword = nested.keyword || cfg?.smsKeyword || `${datasetType}`.toUpperCase()
        const separator = nested.separator || cfg?.smsSeparator || ' '
        const commandName = nested.name || cfg?.smsCommandName || `${cfg.name} SMS`

        // 2) Build codes using real COCs (after maintenance)
        addLog(`${s('D2')} SMS: generating proper codes for ${deList.length} data elements`, 'info', datasetType)
        const smsCodes = await generateProperSmsCodes(deList, datasetType, addLog, de)

        const body = {
            name: commandName,
            parserType: (cfg?.smsParser || 'KEY_VALUE_PARSER'),
            dataset: { id: datasetId },
            separator,
            completenessMethod: 'AT_LEAST_ONE_DATAVALUE',
            defaultMessage: `${keyword} <key:value${separator}key:value,...>`,
            receivedMessage: cfg?.smsReceivedMessage || 'Command has been processed successfully',
            wrongFormatMessage: cfg?.smsWrongFormatMessage || 'Wrong format. Please use the correct SMS structure.',
            noUserMessage: cfg?.smsNoUserMessage || 'No DHIS2 user is linked to your number.',
            moreThanOneOrgUnitMessage: cfg?.smsMoreThanOneOrgUnitMessage || 'Multiple org units found. Please contact support.',
            successMessage: cfg?.smsSuccessMessage || 'Thank you! Your data was received successfully.',
            smsCodes: smsCodes.map(smsCode => ({
                code: smsCode.code,
                compulsory: false,
                dataElement: smsCode.dataElement,
                // CategoryOptionCombo MUST be an object, not a string
                optionId: { id: smsCode.categoryOptionCombo.id },
            })),
        }
        addLog(`${s('D2')} SMS: creating command with ${smsCodes.length} codes`, 'info', datasetType)
        try {
            await de.mutate(metadataQueries.createSmsCommand, { variables: { body } })
            addLog(`${s('D2')} SMS: created (keyword ${keyword})`, 'success', datasetType)
            return { keyword, separator, created: true, smsCodes, datasetType }
        } catch (e) {
            const msg = e?.details?.message || e?.message || String(e)
            if (/409|already exists|duplicate/i.test(msg)) {
                addLog(`${s('D2')} SMS: exists → reuse`, 'info', datasetType)
                return { keyword, separator, created: false, smsCodes, datasetType }
            }
            addLog(`${s('D2')} SMS: create failed ${msg}`, 'warning', datasetType)
            return { keyword, separator, created: false, smsCodes, datasetType }
        }
    }

    // -------------------------- Mapping payload --------------------------
    const _norm = (s) => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
    const _stripDatasetAffixes = (text) => _norm(text)
        .replace(/^(REGISTER|REG|SUMMARY|SUM|REPORTED|REP|CORRECTED|COR)_+/i, '')
        .replace(/_+(REGISTER|REG|SUMMARY|SUM|REPORTED|REP|CORRECTED|COR)$/i, '')
    const _deriveKey = (de) => (de?.code ? _stripDatasetAffixes(de.code) : (de?.name ? _stripDatasetAffixes(de.name) : _norm('DE')))

    const buildMappingPayload = (perDataset) => {
        const buckets = {}
        for (const t of DATASET_TYPES) {
            const pack = perDataset[t]
            const dsId = pack?.datasetId
            const alias = TYPE_ALIAS[t]
            const list = Array.isArray(pack?.de) ? pack.de : []
            for (const de of list) {
                const key = _deriveKey(de)
                if (!buckets[key]) {
                    buckets[key] = {
                        mappingId: key,
                        dataElementName: de.name || key,
                        valueType: de.valueType || 'NUMBER',
                        mappings: [],
                    }
                }
                buckets[key].mappings.push({
                    dataset: { id: dsId, type: t, alias },
                    dataElements: [{
                        id: de.id, code: de.code, name: de.name, valueType: de.valueType || 'NUMBER',
                        categoryCombo: { id: de?.categoryCombo?.id || DEFAULT_CC },
                        categoryOptionCombo: { id: DEFAULT_COC },
                        expression: `#{${de.id}.${DEFAULT_COC}}`,
                    }],
                })
            }
        }
        const elementsMapping = Object.values(buckets)
        const byCreatedId = {}
        for (const row of elementsMapping) {
            for (const m of row.mappings) {
                for (const d of m.dataElements) {
                    byCreatedId[d.id] = { mappingId: row.mappingId, datasetType: m.dataset.type }
                }
            }
        }
        return {
            version: 1,
            datasets: DATASET_TYPES.map((t) => ({
                type: t,
                alias: TYPE_ALIAS[t],
                id: perDataset?.[t]?.datasetId || null,
                code: datasets?.[t]?.code || null,
                name: datasets?.[t]?.name || null,
                periodType: datasets?.[t]?.periodType || 'Monthly',
            })),
            elementsMapping,
            index: { byCreatedId },
        }
    }

    // ------------------------------- Run --------------------------------
    const run = async () => {
        setIsCreating(true)
        setError(null)
        setSuccess(false)
        addLog('Initializing...', 'info')

        try {
            // Generate a temporary assessment ID if not provided
            const effectiveAssessmentId = assessmentId || `temp_assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const isTemporaryId = !assessmentId
            
            addLog(`Assessment ID: ${effectiveAssessmentId}${isTemporaryId ? ' (temporary - will be updated when assessment is saved)' : ''}`, 'info')
            await ensureDatasetUIDAttribute()
            await ensureDQAAttributes()
            
            // Verify DQA attributes are available
            addLog(`DQA Attributes Status: Dataset ID=${dqaAttributeIdsRef.current.datasetId ? 'READY' : 'MISSING'}, Assessment ID=${dqaAttributeIdsRef.current.assessmentId ? 'READY' : 'MISSING'}`, 'info')
            
            const results = {}

            for (let i = 0; i < DATASET_TYPES.length; i++) {
                const type = DATASET_TYPES[i]
                setCurrentDatasetIdx(i)
                const cfg = datasets?.[type] || {}
                if (!cfg?.name || !cfg?.code) {
                    addLog(`Missing config for ${type}`, 'error', type)
                    results[type] = { de: [], datasetId: null, payload: null }
                    continue
                }

                // A. DE/CC/CO/C
                setCurrentStepIdx(0)
                addLog(`Manage DE & CC (CO/C/CC/DE)`, 'info', type)
                const createdDEs = await upsertDataElementsForDataset(type, dataElements?.[type] || [])

                // B. OrgUnits
                setCurrentStepIdx(1)
                const localOUs = await buildLocalOrgUnits(type)

                // C. Dataset create/reuse (+ sharing)
                setCurrentStepIdx(2)
                addLog(`Pre-creation validation for ${type}: DEs=${createdDEs.length}, OUs=${localOUs.length}`, 'info', type)
                if (createdDEs.length === 0) {
                    addLog(`No data elements available for ${type} - skipping dataset creation`, 'warning', type)
                    results[type] = { de: [], datasetId: null, payload: null }
                    continue
                }
                if (localOUs.length === 0) {
                    addLog(`No organization units available for ${type} - skipping dataset creation`, 'warning', type)
                    results[type] = { de: createdDEs, datasetId: null, payload: null }
                    continue
                }
                const createdDs = await createDataset(type, cfg, createdDEs, localOUs, effectiveAssessmentId)
                results[type] = { de: createdDEs, datasetId: createdDs.id, payload: createdDs.payload }
                
                if (!createdDs.id) {
                    addLog(`Dataset creation failed for ${type}: ${createdDs.error || 'Unknown error'}`, 'error', type)
                } else {
                    addLog(`Dataset created successfully for ${type}: ${createdDs.id}`, 'success', type)
                }

                // D. SMS
                setCurrentStepIdx(3)
                const smsInfo = await createSmsForDataset(type, cfg, createdDs.id, createdDEs)
                if (smsInfo) results[type].sms = smsInfo

                // finalize
                setCurrentStepIdx(4)
                addLog('Finalize', 'info', type)
                await sleep(40)
            }

            addLog('Building mapping payload…', 'info')
            addLog(`Results summary: ${Object.keys(results).map(type => `${type}=${results[type]?.datasetId ? 'SUCCESS' : 'FAILED'}`).join(', ')}`, 'info')
            const mappingPayload = buildMappingPayload(results)

            const createdDatasets = DATASET_TYPES.map((t) => {
                const result = results?.[t] || {}
                const cfg = datasets?.[t] || {}
                const payload = result?.payload || {}

                addLog(`Dataset ${t}: id=${result?.datasetId || 'NULL'}, payload=${!!payload}, cfg=${!!cfg}`, result?.datasetId ? 'success' : 'error')

                return {
                    id: result?.datasetId || null,
                    name: payload?.name || cfg?.name || '',
                    code: payload?.code || cfg?.code || '',
                    datasetType: t,
                    alias: TYPE_ALIAS[t] || t,
                    categoryCombo: payload?.categoryCombo || { id: DEFAULT_CC },
                    periodType: payload?.periodType || cfg?.periodType || 'Monthly',
                    sms: result?.sms || null,
                    dataElements: (result?.de || []).map(de => ({
                        id: de.id,
                        name: de.name,
                        code: de.code,
                        shortName: de.shortName,
                        valueType: de.valueType,
                        categoryCombo: de.categoryCombo
                    })),
                    orgUnits: (payload?.organisationUnits || []).map(ou => ({
                        id: ou.id
                    })),
                    sharing: payload?.sharing || null,
                    shortName: payload?.shortName || cfg?.shortName || '',
                    formName: payload?.formName || cfg?.formName || '',
                    description: payload?.description || cfg?.description || '',
                    timelyDays: payload?.timelyDays ?? cfg?.timelyDays ?? 15,
                    openFuturePeriods: payload?.openFuturePeriods ?? cfg?.openFuturePeriods ?? 0,
                    expiryDays: payload?.expiryDays ?? cfg?.expiryDays ?? 0,
                    openPeriodsAfterCoEndDate: payload?.openPeriodsAfterCoEndDate ?? cfg?.openPeriodsAfterCoEndDate ?? 0,
                    version: payload?.version ?? cfg?.version ?? 1,
                    formType: payload?.formType || cfg?.formType || 'DEFAULT',
                    status: result?.datasetId ? 'completed' : 'failed',
                    elementsCount: (result?.de || []).length,
                    orgUnitsCount: (payload?.organisationUnits || []).length,
                }
            })

            // Filter out failed datasets (those with null IDs)
            const successfulDatasets = createdDatasets.filter(ds => ds.id !== null)
            const failedCount = createdDatasets.length - successfulDatasets.length
            
            addLog(`Dataset creation summary: ${successfulDatasets.length} successful, ${failedCount} failed`, successfulDatasets.length > 0 ? 'success' : 'error')

            const handoff = {
                report: { results, startedAt: null, finishedAt: null },
                mappingPayload,
                createdDatasets: successfulDatasets,
                elementMappings: mappingPayload?.elementsMapping || [],
                elementMappingsFlat: (mappingPayload?.elementsMapping || []).map(m => ({
                    mappingId: m.mappingId,
                    dataElementName: m.dataElementName,
                    valueType: m.valueType,
                    datasets: m.mappings.map(x => ({ type: x.dataset.type, alias: x.dataset.alias, id: x.dataset.id })),
                })),
                localDatasets: { createdDatasets: successfulDatasets, elementMappings: mappingPayload?.elementsMapping || [] },
                sms: { commands: DATASET_TYPES.map((t) => results?.[t]?.sms).filter(Boolean) },
            }

            setSuccess(true)
            addLog('Dataset creation process completed', 'success')
            if (isTemporaryId) {
                addLog(`Note: Temporary assessment ID was used (${effectiveAssessmentId}). Update datasets with real assessment ID when assessment is saved.`, 'warning')
                // Add metadata to handoff for later updating
                handoff.temporaryAssessmentId = effectiveAssessmentId
                handoff.needsAssessmentIdUpdate = true
            }
            onAllDatasetsCreated?.(handoff)
        } catch (e) {
            setError(e?.message || String(e))
            addLog(`Creation failed: ${e?.message || e}`, 'error')
        } finally {
            setIsCreating(false)
        }
    }

    if (!isOpen) return null

    return (
        <Modal
            large
            position="top"
            onClose={() => (isCreating ? window.confirm('Cancel creation?') && onClose?.() : onClose?.())}
            style={{ width: '90vw', maxWidth: 1000, background: '#fff' }}
        >
            <ModalTitle>🚀 Dataset Creation — {assessmentName || 'Assessment'}</ModalTitle>
            <ModalContent>
                {!!error && <NoticeBox error title="Creation Failed">{String(error)}</NoticeBox>}
                {success && !error && <NoticeBox valid title="Creation Completed">Creation finished. Switch to Review to save your assessment.</NoticeBox>}

                {/* Full-width progress header */}
                <div style={{ margin: '8px 0 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 6, fontSize: 13 }}>
                        <div><strong>Dataset type:</strong> {['Register', 'Summary', 'Reported', 'Corrected'][currentDatasetIdx]} ({currentDatasetIdx + 1}/4)</div>
                        <div><strong>Step:</strong> {steps[currentStepIdx]} ({currentStepIdx + 1}/{steps.length})</div>
                    </div>
                    <LinearLoader amount={
                        success ? 100 :
                            isCreating ? Math.min(100, ((currentDatasetIdx * steps.length + currentStepIdx) / (4 * steps.length)) * 100) :
                                0 } />
                </div>

                <div
                    ref={logsElRef}
                    style={{
                        border: '1px solid #e5e7eb',
                        padding: 8,
                        height: 420,
                        overflow: 'auto',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: 12,
                        background: '#fafafa'
                    }}
                >
                    {localLogs.length === 0 ? (
                        <div style={{ color: '#888' }}>Ready. Click <strong>Start Creation</strong> to begin…</div>
                    ) : (
                        localLogs.map((e, i) => {
                            const level = (e.level || 'INFO').toUpperCase()
                            const icon = level === 'SUCCESS' ? '✅' : level === 'ERROR' ? '❌' : level === 'WARNING' ? '⚠️' : 'ℹ️'
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                                    <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
                                    <span style={{ color: '#6b7280' }}>[{e.ts}]</span>
                                    <span style={{ marginLeft: 4, fontWeight: 700, color: level === 'ERROR' ? '#b91c1c' : level === 'WARNING' ? '#92400e' : level === 'SUCCESS' ? '#065f46' : '#374151' }}>
                                        [{level}]
                                    </span>
                                    {e.datasetType && <span style={{ marginLeft: 4, color: '#6b7280' }}>[{e.datasetType}]</span>}
                                    <span style={{ marginLeft: 6, whiteSpace: 'pre-wrap' }}>{e.message}</span>
                                </div>
                            )
                        })
                    )}
                </div>
            </ModalContent>
            <ModalActions>
                {!isCreating && !success && <Button primary onClick={run}>🚀 Start Creation</Button>}
                <Button secondary onClick={downloadLogs}>📥 Download Logs</Button>
                <Button onClick={() => (isCreating ? (window.confirm('Cancel creation?') && onClose?.()) : onClose?.())}>
                    {isCreating ? 'Cancel & Close' : 'Close'}
                </Button>
            </ModalActions>
        </Modal>
    )
}

export default DatasetCreationModal