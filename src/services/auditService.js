import { useDataEngine } from '@dhis2/app-runtime'

// Namespace for audit logs
const NAMESPACE = 'dqa360-audit'

// Format date as YYYY-MM-DD
const toDayKey = (date = new Date()) => {
    const pad = n => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    return `${y}-${m}-${d}`
}

const getLogsKeyForDay = (date) => `logs-${toDayKey(date)}`

// Build a normalized audit log entry
const buildEntry = ({
    action,
    entityType,
    entityId = '',
    entityName = '',
    status = 'success', // success | failure | info | warning
    message = '',
    actor = { username: 'system' },
    context = {},
    before = null,
    after = null,
    timestamp = new Date().toISOString(),
}) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    entityType,
    entityId,
    entityName,
    status,
    message,
    actor, // { username, name?, userId? }
    context, // arbitrary context (e.g., route, ip if available)
    before, // optional snapshot
    after,  // optional snapshot
    timestamp,
})

export const useAuditLog = () => {
    const engine = useDataEngine()

    const readDay = async (date) => {
        const key = getLogsKeyForDay(date)
        try {
            const res = await engine.query({ data: { resource: `dataStore/${NAMESPACE}/${key}` } })
            return res.data?.logs || []
        } catch (e) {
            if (e?.details?.httpStatusCode === 404) return []
            throw e
        }
    }

    const writeDay = async (date, logs) => {
        const key = getLogsKeyForDay(date)
        // Try update; if missing create
        try {
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/${key}`,
                type: 'update',
                data: { logs, lastUpdated: new Date().toISOString(), version: '1.0.0' },
            })
        } catch (e) {
            if (e?.details?.httpStatusCode === 404) {
                await engine.mutate({
                    resource: `dataStore/${NAMESPACE}/${key}`,
                    type: 'create',
                    data: { logs, createdAt: new Date().toISOString(), version: '1.0.0' },
                })
            } else {
                throw e
            }
        }
    }

    // Public API
    const logEvent = async (event) => {
        const day = new Date()
        const existing = await readDay(day)
        const entry = buildEntry(event)
        const updated = [entry, ...existing].slice(0, 1000) // cap per day to avoid huge objects
        await writeDay(day, updated)
        return entry
    }

    const listLogs = async ({ days = 14, limit = 200, filters = {} } = {}) => {
        // Load recent N days, merge, sort desc
        const today = new Date()
        const dayDates = Array.from({ length: days }, (_, i) => {
            const dt = new Date(today)
            dt.setDate(dt.getDate() - i)
            return dt
        })
        const all = (await Promise.all(dayDates.map(readDay))).flat()
        let result = all
        // Apply filters: action, entityType, status, text
        if (filters.action) result = result.filter(l => l.action === filters.action)
        if (filters.entityType) result = result.filter(l => l.entityType === filters.entityType)
        if (filters.status) result = result.filter(l => l.status === filters.status)
        if (filters.text) {
            const t = filters.text.toLowerCase()
            result = result.filter(l =>
                (l.message || '').toLowerCase().includes(t) ||
                (l.entityName || '').toLowerCase().includes(t) ||
                (l.entityId || '').toLowerCase().includes(t) ||
                (l.action || '').toLowerCase().includes(t)
            )
        }
        result.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
        return result.slice(0, limit)
    }

    const purgeOldLogs = async ({ keepDays = 90 } = {}) => {
        // Optional cleanup: we cannot list keys via dataStore API easily here.
        // Intentionally left unimplemented to avoid accidental data loss.
        return { purged: 0, keptDays: keepDays }
    }

    return { logEvent, listLogs, purgeOldLogs }
}