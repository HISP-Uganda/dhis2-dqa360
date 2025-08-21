import { useDataEngine } from '@dhis2/app-runtime'

/**
 * useDataStoreBackup
 * Hook providing full backup (export) and restore (import) utilities for DHIS2 dataStore.
 *
 * Features:
 * - Export: Scans all namespaces and keys, fetches values, and downloads a JSON file
 * - Import: Prompts a file picker, parses the backup, and writes values back to dataStore
 */
export const useDataStoreBackup = () => {
    const engine = useDataEngine()

    // Helper: list all namespaces available in dataStore
    const listNamespaces = async () => {
        try {
            const res = await engine.query({
                data: { resource: 'dataStore' }
            })
            return res.data || []
        } catch (e) {
            // Fallback to common namespaces if listing fails
            return [
                'dqa360'
            ]
        }
    }

    // Helper: list keys for a given namespace
    const listKeys = async (namespace) => {
        try {
            const res = await engine.query({
                data: { resource: `dataStore/${namespace}` }
            })
            return res.data || []
        } catch (e) {
            return []
        }
    }

    // Helper: fetch the value for a given namespace/key
    const getValue = async (namespace, key) => {
        try {
            const res = await engine.query({
                data: { resource: `dataStore/${namespace}/${key}` }
            })
            return res.data
        } catch (e) {
            return { __error__: e.message || 'Failed to fetch value' }
        }
    }

    // Helper: write value (update then create fallback)
    const writeValue = async (namespace, key, value) => {
        // Try update first
        try {
            await engine.mutate({
                resource: `dataStore/${namespace}/${key}`,
                type: 'update',
                data: value
            })
            return 'updated'
        } catch (updateErr) {
            // If missing, try create
            try {
                await engine.mutate({
                    resource: `dataStore/${namespace}/${key}`,
                    type: 'create',
                    data: value
                })
                return 'created'
            } catch (createErr) {
                throw createErr
            }
        }
    }

    // Export: build snapshot and download
    const exportDataStore = async () => {
        const exportedAt = new Date().toISOString()
        const namespaces = await listNamespaces()

        const data = {}
        for (const ns of namespaces) {
            const keys = await listKeys(ns)
            if (!keys || keys.length === 0) continue
            data[ns] = {}
            for (const key of keys) {
                // Best-effort fetch; store value (skip binary types)
                const value = await getValue(ns, key)
                data[ns][key] = value
            }
        }

        const payload = {
            meta: {
                app: 'DQA360',
                format: 'dhis2-dataStore-backup',
                version: '1.0',
                exportedAt,
                namespaceCount: Object.keys(data).length,
            },
            namespaces: Object.keys(data),
            data
        }

        // Download JSON file in browser
        const ts = exportedAt.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
        const filename = `dqa360_datastore_backup_${ts}.json`
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)

        return { filename, namespaces: payload.namespaces, counts: Object.fromEntries(Object.entries(data).map(([ns, obj]) => [ns, Object.keys(obj).length])) }
    }

    // Import: prompt for JSON file; write back to dataStore
    const importDataStore = async () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/json'

        const result = await new Promise((resolve, reject) => {
            input.onchange = async (evt) => {
                try {
                    const file = evt.target.files && evt.target.files[0]
                    if (!file) return reject(new Error('No file selected'))

                    const text = await file.text()
                    const json = JSON.parse(text)

                    const data = json.data || json
                    if (!data || typeof data !== 'object') {
                        throw new Error('Invalid backup format: missing data section')
                    }

                    const perNamespace = {}
                    let total = 0

                    // Write sequentially per namespace/key
                    for (const [ns, entries] of Object.entries(data)) {
                        perNamespace[ns] = { created: 0, updated: 0, errors: 0 }
                        for (const [key, value] of Object.entries(entries || {})) {
                            try {
                                const status = await writeValue(ns, key, value)
                                perNamespace[ns][status] += 1
                                total += 1
                            } catch (e) {
                                perNamespace[ns].errors += 1
                                // continue with other keys
                            }
                        }
                    }

                    resolve({ total, perNamespace })
                } catch (e) {
                    reject(e)
                }
            }
            // trigger picker
            document.body.appendChild(input)
            input.click()
            // cleanup element after a short delay
            setTimeout(() => {
                input.remove()
            }, 0)
        })

        return result
    }

    return { exportDataStore, importDataStore }
}