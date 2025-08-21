import { useDataEngine } from '@dhis2/app-runtime'

// Lightweight DHIS2 SMS Command service
// Supports creating/updating KEY_VALUE_PARSER commands bound to aggregate data sets

const DEFAULT_MESSAGES = {
    separator: ',',
    defaultMessage: 'Thanks! SMS received.',
    wrongFormatMessage: 'Wrong format.',
    noUserMessage: 'Phone not linked to any user.',
    moreThanOneOrgUnitMessage: 'Multiple org units linked to your user; please contact admin.',
    successMessage: 'Saved.'
}

// Generate an infinite-like sequence of short codes: a..z, aa..az, ba..bz, ...
const generateShortCodeSequence = (count) => {
    const codes = []
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    let n = 1
    while (codes.length < count) {
        const total = Math.pow(letters.length, n)
        for (let i = 0; i < total && codes.length < count; i++) {
            let x = i
            let code = ''
            for (let p = 0; p < n; p++) {
                code = letters[x % letters.length] + code
                x = Math.floor(x / letters.length)
            }
            codes.push(code)
        }
        n++
    }
    return codes
}

export const smsService = {
    // Create SMS command for a dataset. codes is a map: { shortcode: 'DE_UID', ... }
    createSmsCommand: async (engine, { datasetId, name, keyword, codes = {}, messages = {}, separator }) => {
        const payload = {
            name: name || keyword,
            parserType: 'KEY_VALUE_PARSER',
            dataset: { id: datasetId },
            separator: separator || messages.separator || DEFAULT_MESSAGES.separator,
            defaultMessage: messages.defaultMessage || DEFAULT_MESSAGES.defaultMessage,
            wrongFormatMessage: messages.wrongFormatMessage || `Wrong format. Use: ${keyword}: a=...,b=...`,
            noUserMessage: messages.noUserMessage || DEFAULT_MESSAGES.noUserMessage,
            moreThanOneOrgUnitMessage: messages.moreThanOneOrgUnitMessage || DEFAULT_MESSAGES.moreThanOneOrgUnitMessage,
            successMessage: messages.successMessage || DEFAULT_MESSAGES.successMessage,
            smsCodes: Object.entries(codes).map(([code, deId]) => ({ code, dataElement: { id: deId } }))
        }
        return engine.mutate({ resource: 'smsCommands', type: 'create', data: payload })
    },

    updateSmsCommand: async (engine, id, partial) => {
        return engine.mutate({ resource: `smsCommands/${id}`, type: 'update', data: partial })
    },

    listSmsCommands: async (engine) => {
        const res = await engine.query({
            list: {
                resource: 'smsCommands',
                params: { fields: 'id,name,parserType,dataset[id,code,name]' }
            }
        })
        return res.list?.smsCommands || res.list || []
    },

    findSmsCommandByDataset: async (engine, datasetId) => {
        const items = await smsService.listSmsCommands(engine)
        return items.find(c => c?.dataset?.id === datasetId) || null
    },

    getDatasetWithElements: async (engine, datasetId) => {
        const res = await engine.query({
            dataSet: {
                resource: 'dataSets',
                id: datasetId,
                params: {
                    fields: 'id,code,name,dataSetElements[dataElement[id,code,name]]'
                }
            }
        })
        return res.dataSet
    },
}

export const useSmsService = () => {
    const engine = useDataEngine()

    const upsertSmsForDataset = async ({ datasetId, name, keyword, codes, messages, separator }) => {
        const existing = await smsService.findSmsCommandByDataset(engine, datasetId)
        if (existing?.id) {
            return smsService.updateSmsCommand(engine, existing.id, {
                name: name || existing.name,
                separator: separator || DEFAULT_MESSAGES.separator,
                smsCodes: Object.entries(codes || {}).map(([code, deId]) => ({ code, dataElement: { id: deId } }))
            })
        }
        return smsService.createSmsCommand(engine, { datasetId, name, keyword, codes, messages, separator })
    }

    const autoMapCodes = (dataSetElements) => {
        const elements = (dataSetElements || []).map(e => e?.dataElement?.id).filter(Boolean)
        const shorts = generateShortCodeSequence(elements.length)
        const codes = {}
        elements.forEach((deId, idx) => { codes[shorts[idx]] = deId })
        return codes
    }

    // datasets: array of objects { id, code, name, smsKeyword?, smsCodes?, smsSeparator? }
    const setupSmsForDatasets = async ({ datasets }) => {
        const results = []
        for (const ds of (datasets || [])) {
            const datasetId = ds?.id
            if (!datasetId) continue
            
            // Check if this dataset should have SMS commands (Register, Summary, Correction)
            const datasetName = (ds.name || ds.displayName || '').toLowerCase()
            const shouldGenerateSms = datasetName.includes('register') || 
                                    datasetName.includes('summary') || 
                                    datasetName.includes('correction') ||
                                    datasetName.includes('dqa')
            
            if (!shouldGenerateSms) {
                console.log(`Skipping SMS setup for dataset: ${ds.name} (not a Register/Summary/Correction dataset)`)
                continue
            }
            
            const full = await smsService.getDatasetWithElements(engine, datasetId)
            const keyword = ds.smsKeyword || ds.code || full?.code || generateKeywordFromName(ds.name || ds.displayName) || 'DSET'
            const name = `${full?.name || ds.name || keyword} SMS`
            const codes = ds.smsCodes && Object.keys(ds.smsCodes).length
                ? ds.smsCodes
                : autoMapCodes(full?.dataSetElements || [])
            const separator = ds.smsSeparator || DEFAULT_MESSAGES.separator
            const res = await upsertSmsForDataset({ datasetId, name, keyword, codes, separator })
            results.push({ 
                datasetId, 
                datasetName: ds.name || ds.displayName,
                keyword, 
                codes, 
                elementCount: Object.keys(codes).length,
                status: res?.status || 'OK' 
            })
        }
        return results
    }

    // Generate SMS keyword from dataset name
    const generateKeywordFromName = (name) => {
        if (!name) return 'DSET'
        
        const words = name.split(' ')
        if (words.length === 1) {
            return words[0].substring(0, 6).toUpperCase()
        }
        
        // Use first letters of words
        return words.map(word => word.charAt(0)).join('').substring(0, 6).toUpperCase()
    }

    return { upsertSmsForDataset, setupSmsForDatasets, getDatasetWithElements: (id) => smsService.getDatasetWithElements(engine, id) }
}