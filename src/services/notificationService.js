// Notification service with provider-backed implementations for SMS, Email, WhatsApp (Cloud API), and Telegram
// IMPORTANT: In production, never expose provider secrets in the browser. Prefer a secure backend proxy.

export const NotificationChannels = {
    SMS: 'sms',
    EMAIL: 'email',
    WHATSAPP: 'whatsapp',
    TELEGRAM: 'telegram'
}

// Providers loaded at runtime from the dataStore via Channels & Providers UI
// Shape: [{ id, type: 'sms'|'email'|'whatsapp'|'telegram', name, enabled, environment, config, lastTest }]
let providers = []

export const setNotificationProviders = (list = []) => {
    providers = Array.isArray(list) ? list.filter(p => !!p && !!p.type) : []
}

const getActiveProvider = (type, opts = {}) => {
    const { environment = 'Prod' } = opts
    // Prefer enabled providers matching environment, otherwise any enabled
    const enabled = providers.filter(p => p.type === type && p.enabled)
    const byEnv = enabled.find(p => (p.environment || 'Prod') === environment)
    return byEnv || enabled[0] || null
}

// ---- Helpers ----
const toQueryString = (obj = {}) =>
    Object.entries(obj)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')

const jsonHeaders = (extra = {}) => ({ 'Content-Type': 'application/json', ...extra })

const assert = (cond, message) => { if (!cond) throw new Error(message) }

// ---- Implementations ----

// Generic HTTP SMS
const sendSmsGeneric = async ({ to, message }, cfg) => {
    const baseUrl = cfg.baseUrl
    assert(baseUrl, 'SMS baseUrl is required')
    const httpMethod = cfg.httpMethod || 'POST'
    const url = cfg.endpointPath ? `${baseUrl.replace(/\/$/, '')}/${cfg.endpointPath.replace(/^\//, '')}` : baseUrl
    const toParam = cfg.toParam || 'to'
    const messageParam = cfg.messageParam || 'message'

    const headers = { ...jsonHeaders(), ...(cfg.headersJson ? safeParseJson(cfg.headersJson, {}) : {}) }
    // Light credential headers if provided
    if (cfg.apiKey) headers['X-API-KEY'] = cfg.apiKey
    if (cfg.apiSecret) headers['X-API-SECRET'] = cfg.apiSecret

    const bodyObj = { [toParam]: to, [messageParam]: message, from: cfg.from }

    if (httpMethod.toUpperCase() === 'GET') {
        const qs = toQueryString(bodyObj)
        const res = await fetch(`${url}?${qs}`, { method: 'GET', headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return true
    } else {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyObj) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return true
    }
}

// Twilio SMS
const sendSmsTwilio = async ({ to, message }, cfg) => {
    const accountSid = cfg.accountSid
    const authToken = cfg.authToken
    const from = cfg.from
    assert(accountSid && authToken && from, 'Twilio SMS requires accountSid, authToken, and from')
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`
    const auth = btoa(`${accountSid}:${authToken}`)
    const form = toQueryString({ To: to, From: from, Body: message })
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` },
        body: form
    })
    if (!res.ok) throw new Error(`Twilio SMS HTTP ${res.status}`)
    return true
}

// Vonage (Nexmo) SMS
const sendSmsVonage = async ({ to, message }, cfg) => {
    assert(cfg.apiKey && cfg.apiSecret && cfg.from, 'Vonage requires apiKey, apiSecret, from')
    const endpoint = 'https://rest.nexmo.com/sms/json'
    const payload = { api_key: cfg.apiKey, api_secret: cfg.apiSecret, to, from: cfg.from, text: message }
    const res = await fetch(endpoint, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) })
    if (!res.ok) throw new Error(`Vonage HTTP ${res.status}`)
    return true
}

// Africa's Talking SMS
const sendSmsAfricasTalking = async ({ to, message }, cfg) => {
    assert(cfg.username && cfg.apiKey, "Africa's Talking requires username and apiKey")
    const endpoint = (cfg.baseUrl || 'https://api.africastalking.com') + '/version1/messaging'
    const form = toQueryString({ username: cfg.username, to, message, from: cfg.from || '' })
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', apiKey: cfg.apiKey },
        body: form
    })
    if (!res.ok) throw new Error(`Africa's Talking HTTP ${res.status}`)
    return true
}

// WhatsApp Cloud API
const sendWhatsAppCloud = async ({ to, message }, cfg) => {
    assert(cfg.phoneNumberId && cfg.accessToken, 'WhatsApp Cloud requires phoneNumberId and accessToken')
    const version = cfg.apiVersion || 'v17.0'
    const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(cfg.phoneNumberId)}/messages`
    const payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }
    const res = await fetch(endpoint, { method: 'POST', headers: jsonHeaders({ Authorization: `Bearer ${cfg.accessToken}` }), body: JSON.stringify(payload) })
    if (!res.ok) throw new Error(`WhatsApp HTTP ${res.status}`)
    return true
}

// Telegram
const sendTelegramBot = async ({ to, message }, cfg) => {
    const botToken = cfg.botToken
    const chatId = to || cfg.defaultChatId || cfg.chatId
    assert(botToken && chatId, 'Telegram requires botToken and chatId')
    const base = cfg.apiBaseUrl || 'https://api.telegram.org'
    const endpoint = `${base}/bot${encodeURIComponent(botToken)}/sendMessage`
    const payload = { chat_id: chatId, text: message, parse_mode: 'HTML' }
    const res = await fetch(endpoint, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) })
    if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`)
    return true
}

// SendGrid Email
const sendEmailSendGrid = async ({ to, subject, text, html }, cfg) => {
    assert(cfg.apiKey && cfg.from, 'SendGrid requires apiKey and from email')
    const endpoint = 'https://api.sendgrid.com/v3/mail/send'
    const payload = {
        personalizations: [{ to: Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }], subject: subject || cfg.defaultSubject || '' }],
        from: { email: cfg.from, name: cfg.fromName || undefined },
        reply_to: cfg.replyTo ? { email: cfg.replyTo } : undefined,
        content: html ? [{ type: 'text/html', value: html }] : [{ type: 'text/plain', value: text || '' }]
    }
    const res = await fetch(endpoint, { method: 'POST', headers: jsonHeaders({ Authorization: `Bearer ${cfg.apiKey}` }), body: JSON.stringify(payload) })
    if (!res.ok && res.status !== 202) throw new Error(`SendGrid HTTP ${res.status}`)
    return true
}

function safeParseJson(str, fallback) {
    try { return JSON.parse(str) } catch { return fallback }
}

// ---- Public API ----
export const notificationService = {
    // Generic notify for SMS/WhatsApp/Telegram. For email, prefer sendEmail to specify subject/body.
    notify: async ({ channel, to, message, subject, html }) => {
        const type = channel
        const provider = getActiveProvider(type)
        if (!provider || !provider.enabled) throw new Error(`No active provider for ${type}`)
        const cfg = provider.config || {}

        switch (type) {
            case NotificationChannels.SMS: {
                const prov = cfg.provider || 'generic'
                if (cfg.useDhis2Gateway) throw new Error('DHIS2 SMS Gateway sending not implemented in client')
                if (prov === 'twilio') return sendSmsTwilio({ to, message }, cfg)
                if (prov === 'vonage') return sendSmsVonage({ to, message }, cfg)
                if (prov === 'africastalking') return sendSmsAfricasTalking({ to, message }, cfg)
                return sendSmsGeneric({ to, message }, cfg)
            }
            case NotificationChannels.WHATSAPP:
                return sendWhatsAppCloud({ to, message }, cfg)
            case NotificationChannels.TELEGRAM:
                return sendTelegramBot({ to, message }, cfg)
            case NotificationChannels.EMAIL:
                return sendEmailSendGrid({ to, subject, text: message, html }, cfg)
            default:
                throw new Error(`Unsupported channel: ${type}`)
        }
    },

    // Explicit helpers
    sendSMS: async (to, message) => notificationService.notify({ channel: NotificationChannels.SMS, to, message }),
    sendWhatsApp: async (to, message) => notificationService.notify({ channel: NotificationChannels.WHATSAPP, to, message }),
    sendTelegram: async (chatId, message) => notificationService.notify({ channel: NotificationChannels.TELEGRAM, to: chatId, message }),
    sendEmail: async ({ to, subject, text, html }) => notificationService.notify({ channel: NotificationChannels.EMAIL, to, subject, message: text, html })
}