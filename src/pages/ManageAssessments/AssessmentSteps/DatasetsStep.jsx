import React, { useMemo, useState, useEffect, useRef, useDeferredValue } from 'react'
import {
    InputField,
    Checkbox,
    SingleSelectField,
    SingleSelectOption,
    CircularLoader,
    Button,
    colors,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

/**
 * DatasetsStep.jsx
 * Lightweight, fast dataset picker with clean URL display and resilient loading UX.
 *
 * Performance tips for the parent loader (important):
 *  - Query minimal fields only: fields=id,name,code,periodType,dataSetElements~size,organisationUnits~size
 *  - Avoid expanding nested collections unless you need them.
 *  - Pass the server URL as `loadingSource` so it renders nicely while loading.
 */

/* ============================= URL Normalizer ============================= */
const decodeHtmlEntities = (input) => {
    if (!input) return ''
    let out = String(input).trim()
    // Handle nested encodings such as &amp;#x2F;
    for (let i = 0; i < 3; i++) {
        const before = out
        out = out
            .replace(/&amp;/g, '&')
            .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&sol;/g, '/')
        if (out === before) break
    }
    return out
}

const tryDecodeURIComponent = (s) => { try { return decodeURIComponent(s) } catch { return s } }
const decodePercentLoop = (s, passes = 2) => { let out = s; for (let i=0;i<passes;i++){ const n=tryDecodeURIComponent(out); if(n===out)break; out=n } return out }
const stripTrailingPunct = (u) => u
    .replace(/[.,;:!?]+$/,'')
    .replace(/[)\]]+$/,'')
    .replace(/\/\.$/, '/')
const extractFirstUrl = (s) => {
    if (!s) return ''
    const href = s.match(/href=["']([^"']+)["']/i)
    if (href && href[1]) return stripTrailingPunct(href[1])
    const m = s.match(/https?:\/\/[^\s<>"')]+/i)
    return m ? stripTrailingPunct(m[0]) : s
}
const normalizeDisplayUrl = (raw) => {
    if (!raw) return ''
    let out = decodePercentLoop(decodeHtmlEntities(raw))
    out = extractFirstUrl(out)
    try { out = new URL(out).toString() } catch { /* keep as-is */ }
    return out
}

/* ============================== Loader UI ================================ */
const LoadingIndicator = ({ loadingSource }) => {
    const [loadingTime, setLoadingTime] = useState(0)
    const prettySource = useMemo(() => normalizeDisplayUrl(loadingSource), [loadingSource])

    useEffect(() => {
        const start = Date.now()
        const iv = setInterval(() => setLoadingTime(Math.floor((Date.now() - start) / 1000)), 1000)
        return () => { clearInterval(iv); setLoadingTime(0) }
    }, [])

    return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CircularLoader small />
                <span>{i18n.t('Loading datasets...')}</span>
            </div>
            {prettySource && (
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'center' }}>
                    {i18n.t('Loading from: {{source}}', { source: prettySource })}
                </div>
            )}
            {loadingTime > 5 && (
                <div style={{ fontSize: 11, opacity: 0.6, color: colors.grey700 }}>
                    {loadingTime > 15
                        ? i18n.t('This is taking longer than expected... ({{time}}s)', { time: loadingTime })
                        : i18n.t('Loading for {{time}} seconds...', { time: loadingTime })}
                </div>
            )}
            {loadingTime > 15 && (
                <div style={{ fontSize: 11, opacity: 0.8, color: colors.orange600, textAlign: 'center', maxWidth: 480 }}>
                    {i18n.t('Tip: Large datasets or slow connections may take longer. Consider filtering by period type to reduce load time.')}
                </div>
            )}
            {loadingTime > 30 && (
                <div style={{ fontSize: 11, opacity: 0.9, color: colors.red600, textAlign: 'center', maxWidth: 480, marginTop: 8 }}>
                    {i18n.t('Loading is taking unusually long. You may want to refresh the page or check your connection.')}
                </div>
            )}
        </div>
    )
}

/* ============================== Main View ================================ */
const DatasetsStep = ({
                          datasets = [],
                          localDatasets = [],
                          selectedDataSets = [],
                          setSelectedDataSets,
                          loading = false,
                          loadingSource = '',
                          onRefresh,
                          preloadedDatasets,
                          preloadTimestamp,
                          footer,
                          minInitialLoaderMs = 300,
                          showEmptyIfNoData = false,
                          hardTimeoutMs = 30000,
                          onAbortLoading,
                      }) => {
    const [search, setSearch] = useState('')
    const [periodFilter, setPeriodFilter] = useState('all')

    // Prefer remote datasets when provided; fall back to local
    const source = useMemo(() => {
        const result = datasets?.length ? datasets : (localDatasets || [])
        console.log('📊 DatasetsStep source data:', { 
            datasets: datasets?.length || 0, 
            localDatasets: localDatasets?.length || 0, 
            result: result?.length || 0,
            loading,
            firstDataset: result[0] ? { id: result[0].id, name: result[0].name } : null
        })
        return result
    }, [datasets, localDatasets, loading])

    // Unique period types for filter select
    const periodTypeOptions = useMemo(() => {
        const setPT = new Set((source || []).map(d => (d?.periodType || '').trim()).filter(Boolean))
        return ['all', ...Array.from(setPT).sort((a, b) => a.localeCompare(b))]
    }, [source])

    // Debounce search using React 18's useDeferredValue for snappy typing
    const deferredSearch = useDeferredValue(search)

    const filtered = useMemo(() => {
        const q = (deferredSearch || '').trim().toLowerCase()
        const list = source || []
        const textFiltered = q
            ? list.filter(d =>
                (d.name || '').toLowerCase().includes(q) ||
                (d.code || '').toLowerCase().includes(q) ||
                (d.id || '').toLowerCase().includes(q)
            )
            : list
        if (periodFilter === 'all') return textFiltered
        return textFiltered.filter(d => (d?.periodType || '').toLowerCase() === periodFilter.toLowerCase())
    }, [source, deferredSearch, periodFilter])

    const isSelected = useMemo(() => {
        const s = new Set(selectedDataSets || [])
        return (id) => s.has(id)
    }, [selectedDataSets])

    const toggle = (id) => {
        if (!setSelectedDataSets) return
        setSelectedDataSets(prev => {
            const s = new Set(prev || [])
            s.has(id) ? s.delete(id) : s.add(id)
            return Array.from(s)
        })
    }

    // Initial loader window + hard timeout control
    const [initialLoading, setInitialLoading] = useState(true)
    const [timedOut, setTimedOut] = useState(false)
    const mountedAtRef = useRef(Date.now())
    const hardTimerRef = useRef(null)

    // Minimum spinner dwell time so we don't flicker
    useEffect(() => {
        const minElapsed = () => (Date.now() - mountedAtRef.current) >= minInitialLoaderMs
        if (source?.length > 0 || !loading) {
            if (minElapsed()) setInitialLoading(false)
            else {
                const t = setTimeout(() => setInitialLoading(false), Math.max(0, minInitialLoaderMs - (Date.now() - mountedAtRef.current)))
                return () => clearTimeout(t)
            }
        }
    }, [source, loading, minInitialLoaderMs])

    // Hard timeout (optionally abort via prop)
    useEffect(() => {
        if (hardTimerRef.current) { clearTimeout(hardTimerRef.current); hardTimerRef.current = null }
        if (loading) {
            hardTimerRef.current = setTimeout(() => {
                setTimedOut(true)
                if (onAbortLoading) onAbortLoading()
            }, hardTimeoutMs)
        } else {
            setTimedOut(false)
        }
        return () => { if (hardTimerRef.current) clearTimeout(hardTimerRef.current) }
    }, [loading, hardTimeoutMs, onAbortLoading])

    const noDataYet = (source?.length ?? 0) === 0
    const showLoader = (loading && !timedOut) || (initialLoading && !timedOut) || (noDataYet && !showEmptyIfNoData && !timedOut)

    const prettySource = useMemo(() => normalizeDisplayUrl(loadingSource), [loadingSource])

    return (
        <div style={{ padding: 0 }} aria-busy={showLoader ? 'true' : 'false'}>
            {/* Top bar */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 320 }}>
                    <InputField
                        label={`${i18n.t('Filter')} ${!showLoader && source?.length ? `(${filtered.length}/${source.length})` : ''}`}
                        placeholder={i18n.t('Search by name, code, or ID')}
                        value={search}
                        onChange={({ value }) => setSearch(value)}
                        dense
                        disabled={showLoader}
                    />
                </div>
                <div style={{ width: 260 }}>
                    <SingleSelectField
                        label={i18n.t('Period Type')}
                        selected={periodFilter}
                        onChange={({ selected }) => setPeriodFilter(selected)}
                        dense
                        disabled={showLoader}
                    >
                        {periodTypeOptions.map(opt => (
                            <SingleSelectOption key={opt} value={opt} label={opt === 'all' ? i18n.t('All') : opt} />
                        ))}
                    </SingleSelectField>
                </div>
                {onRefresh && (
                    <div>
                        <Button secondary small onClick={onRefresh} disabled={showLoader}>
                            {i18n.t('Refresh')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Preload status */}
            {preloadedDatasets && preloadTimestamp && !showLoader && (
                <div style={{ marginBottom: 12, padding: 8, backgroundColor: colors.grey050, borderRadius: 4, fontSize: 12, color: colors.grey700 }}>
                    {i18n.t('Using preloaded datasets from {{time}} minutes ago', { time: Math.floor((Date.now() - preloadTimestamp) / 60000) })} • {i18n.t('Click Refresh to get latest data')}
                </div>
            )}

            {/* Performance notice for large lists */}
            {!showLoader && filtered.length > 500 && (
                <div style={{ marginBottom: 12, padding: 8, backgroundColor: colors.yellow050, borderRadius: 4, fontSize: 12, color: colors.grey800, border: `1px solid ${colors.yellow200}` }}>
                    ⚡ {i18n.t('Showing first 500 of {{total}} datasets for better performance. Use filters to narrow down results.', { total: filtered.length })}
                </div>
            )}

            {/* Loader / Empty / Table */}
            {showLoader ? (
                <LoadingIndicator loadingSource={prettySource} />
            ) : (filtered.length === 0) ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Select')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Name')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Code')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Period Type')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('# Data elements')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('# Org units')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: colors.grey700 }}>
                                {i18n.t('No records found')}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Select')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Name')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Code')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Period Type')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('# Data elements')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('# Org units')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.slice(0, 500).map(ds => { // Limit to 500 rows for performance
                            const checked = isSelected(ds.id)
                            // Support either numeric counts (from ~size) or arrays when expanded
                            const deCount = (typeof ds?.dataElementCount === 'number')
                                ? ds.dataElementCount
                                : (typeof ds?.dataSetElements === 'number')
                                    ? ds.dataSetElements
                                    : Array.isArray(ds?.dataSetElements) ? ds.dataSetElements.length
                                        : Array.isArray(ds?.dataElements) ? ds.dataElements.length
                                            : 0

                            const ouCount = (typeof ds?.organisationUnitCount === 'number')
                                ? ds.organisationUnitCount
                                : (typeof ds?.organisationUnits === 'number')
                                    ? ds.organisationUnits
                                    : Array.isArray(ds?.organisationUnits) ? ds.organisationUnits.length
                                        : 0

                            return (
                                <tr key={ds.id} onClick={() => toggle(ds.id)} style={{ cursor: 'pointer' }}>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                        <div onClick={(e) => { e.stopPropagation() }} role="presentation">
                                            <Checkbox checked={checked} onChange={() => toggle(ds.id)} />
                                        </div>
                                    </td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ds.name}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ds.code || '—'}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ds.periodType || '—'}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{deCount}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ouCount}</td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            {footer}
        </div>
    )
}

export default DatasetsStep