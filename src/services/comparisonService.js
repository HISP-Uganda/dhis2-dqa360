import { useDataEngine } from '@dhis2/app-runtime'
import { useAuditLog } from './auditService'

const NAMESPACE = 'dqa360'

const getAssessment = async (engine, id) => {
    try {
        const res = await engine.query({ data: { resource: `dataStore/${NAMESPACE}/${id}` } })
        return res.data || null
    } catch (e) {
        if (e?.details?.httpStatusCode === 404) return null
        throw e
    }
}

const indexByKey = (rows) => {
    const map = new Map()
    rows.forEach(r => {
        const key = `${r.dataElement}|${r.categoryOptionCombo}|${r.orgUnit}|${r.period}`
        map.set(key, Number(r.value) || 0)
    })
    return map
}

export const useComparisonService = () => {
    const engine = useDataEngine()
    const { logEvent } = useAuditLog()

    const runComparison = async ({ assessmentId, period, orgUnit }) => {
        const started = Date.now()
        try {
            const assessment = await getAssessment(engine, assessmentId)
            const ds = assessment?.localDatasets || {}
            const reg = indexByKey(ds.register?.rows || [])
            const sum = indexByKey(ds.summary?.rows || [])
            const rep = indexByKey(ds.reported?.rows || [])
            const cor = indexByKey(ds.corrections?.rows || [])

            // Collect union of keys
            const keys = new Set([...reg.keys(), ...sum.keys(), ...rep.keys(), ...cor.keys()])

            let mismatches = 0
            let missing = 0
            let total = 0

            keys.forEach(k => {
                const vReg = reg.get(k) ?? null
                const vSum = sum.get(k) ?? null
                const vRep = rep.get(k) ?? null
                const vCor = cor.get(k) ?? null
                total += 1
                const vals = [vReg, vSum, vRep, vCor].filter(v => v !== null)
                if (vals.length < 4) missing += 1
                if (new Set(vals).size > 1) mismatches += 1
            })

            const durationMs = Date.now() - started

            // Persist lightweight results on assessment for later reference
            const results = { total, mismatches, missing, period, orgUnit, runAt: new Date().toISOString(), durationMs }
            try {
                const assessmentCurrent = await getAssessment(engine, assessmentId) || { id: assessmentId }
                assessmentCurrent.comparisonResults = assessmentCurrent.comparisonResults || []
                assessmentCurrent.comparisonResults.unshift(results)
                assessmentCurrent.comparisonResults = assessmentCurrent.comparisonResults.slice(0, 20)
                await engine.mutate({ resource: `dataStore/${NAMESPACE}/${assessmentId}` , type: 'update', data: assessmentCurrent })
            } catch (_) {}

            await logEvent({
                action: 'dqa.comparison',
                entityType: 'assessment',
                entityId: assessmentId,
                status: 'success',
                message: `Comparison run: ${mismatches} mismatches, ${missing} missing of ${total}`,
                context: { total, mismatches, missing, period, orgUnit, durationMs },
            })

            return results
        } catch (error) {
            try {
                await logEvent({
                    action: 'dqa.comparison',
                    entityType: 'assessment',
                    entityId: assessmentId,
                    status: 'failure',
                    message: error?.message || 'Comparison failed',
                    context: { period, orgUnit },
                })
            } catch (_) {}
            throw error
        }
    }

    return { runComparison }
}