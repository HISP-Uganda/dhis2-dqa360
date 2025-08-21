// Notification Config Service
// Provides a React hook to manage notification providers in DHIS2 dataStore
// Namespace/key used by runtime notificationService initializer:
//   dataStore/dqa360-notifications/providers

import { useCallback } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'

export const NAMESPACE = 'dqa360-notifications'
export const PROVIDERS_KEY = 'providers'

// Supported channel types in UI
export const CHANNEL_TYPES = ['sms', 'email', 'whatsapp', 'telegram']

// Shape of a provider example:
// {
//   id: 'prov_123',
//   type: 'sms' | 'email' | 'whatsapp' | 'telegram',
//   name: 'Twilio',
//   enabled: true,
//   config: { ... },
//   lastTest: { status: 'success'|'failure'|'unknown', at: 1710000000000, message?: string }
// }

export const useNotificationConfig = () => {
    const engine = useDataEngine()

    const getPath = (key = PROVIDERS_KEY) => `dataStore/${NAMESPACE}/${key}`

    const loadProviders = useCallback(async () => {
        try {
            const res = await engine.query({ list: { resource: getPath() } })
            const list = Array.isArray(res?.list) ? res.list : res?.list || res || []
            return Array.isArray(list) ? list : []
        } catch (e) {
            // Treat missing key/namespace as empty list
            return []
        }
    }, [engine])

    const saveProviders = useCallback(async (providers) => {
        // Try update, fallback to create if key doesn't exist
        try {
            await engine.mutate({ resource: getPath(), type: 'update', data: providers })
        } catch (_) {
            await engine.mutate({ resource: getPath(), type: 'create', data: providers })
        }
        return providers
    }, [engine])

    const upsertProvider = useCallback(async (provider) => {
        const list = await loadProviders()
        const next = [...list]
        const idx = next.findIndex(p => p.id === provider.id)
        if (idx >= 0) next[idx] = { ...next[idx], ...provider }
        else next.push(provider)
        await saveProviders(next)
        return provider
    }, [loadProviders, saveProviders])

    const deleteProvider = useCallback(async (id) => {
        const list = await loadProviders()
        const next = list.filter(p => p.id !== id)
        await saveProviders(next)
        return true
    }, [loadProviders, saveProviders])

    const toggleProvider = useCallback(async (id, enabled) => {
        const list = await loadProviders()
        const next = list.map(p => p.id === id ? { ...p, enabled: !!enabled } : p)
        await saveProviders(next)
        return true
    }, [loadProviders, saveProviders])

    // Lightweight config validation as a "test"
    const testProvider = useCallback(async (provider) => {
        const now = Date.now()
        const fail = (message) => ({ status: 'failure', at: now, message })
        const ok = (message) => ({ status: 'success', at: now, message })
        const unknown = (message) => ({ status: 'unknown', at: now, message })

        if (!provider?.type) return fail('Missing provider type')

        try {
            const cfg = provider.config || {}
            switch (provider.type) {
                case 'sms': {
                    if (cfg.useDhis2Gateway) {
                        // Client-side send via DHIS2 SMS gateway is not supported here
                        return unknown('Using DHIS2 SMS gateway; manual delivery test required')
                    }
                    if (cfg.apiKey && cfg.apiSecret && cfg.from) {
                        return ok('Credentials present')
                    }
                    return fail('Missing API credentials (apiKey, apiSecret, from)')
                }
                case 'email': {
                    if (cfg.useDhis2Email) {
                        return ok('Using DHIS2 SMTP settings')
                    }
                    if (cfg.from && (cfg.apiKey || (cfg.smtpHost && cfg.smtpUser && cfg.smtpPass))) {
                        return ok('Email config present')
                    }
                    return fail('Incomplete email configuration')
                }
                case 'whatsapp': {
                    if (cfg.phoneNumberId && cfg.accessToken) {
                        return ok('WhatsApp Cloud config present')
                    }
                    return fail('Missing phoneNumberId or accessToken')
                }
                case 'telegram': {
                    if (cfg.botToken && (cfg.chatId || cfg.defaultChatId)) {
                        return ok('Telegram config present')
                    }
                    return fail('Missing botToken or chatId')
                }
                default:
                    return fail(`Unsupported type: ${provider.type}`)
            }
        } catch (e) {
            return fail(e.message || 'Test failed')
        }
    }, [])

    return {
        loadProviders,
        upsertProvider,
        deleteProvider,
        toggleProvider,
        testProvider
    }
}