// src/D2App/pages/ManageAssessments/AssessmentSteps/OrgUnitMapping.jsx
import React, { useEffect, useMemo, useState } from 'react'
import {
    Button,
    ButtonStrip,
    Card,
    InputField,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    Tag,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

/**
 * OrgUnitMappingStep
 *
 * Props:
 * - metadataSource: 'external' | 'local'
 * - selectedOrgUnits: [{ id, name, code?, level?, path?, parent? }]
 * - localOrgUnits:    [{ id, name, code?, level?, path?, parent? }]
 * - localOrgUnitsLoading?: boolean
 * - orgUnitMappings:  [{ source, target }]
 * - setOrgUnitMappings: (nextArray) => void
 * - externalInfo?: { baseUrl?, apiVersion?, instanceName? }
 * - localInfo?:    { baseUrl?, instanceName? }
 */
const OrgUnitMappingStep = ({
                                metadataSource = 'external',
                                selectedOrgUnits = [],
                                localOrgUnits = [],
                                localOrgUnitsLoading = false,
                                orgUnitMappings = [],
                                setOrgUnitMappings,
                                externalInfo = {},
                                localInfo = {},
                            }) => {
    // ---------- derived options ----------
    // localOptions should ALWAYS be the local org units for target mapping
    // Never fall back to selectedOrgUnits (which are the source org units)
    const localOptions = useMemo(
        () => Array.isArray(localOrgUnits) ? localOrgUnits : [],
        [localOrgUnits]
    )

    // Get already mapped target IDs to filter them out from available options
    const mappedTargetIds = useMemo(() => {
        return new Set((rows || []).map(r => r.target).filter(Boolean))
    }, [rows])
    const localById = useMemo(() => new Map((localOptions || []).map(o => [String(o.id), o])), [localOptions])
    const selectedById = useMemo(() => new Map((selectedOrgUnits || []).map(o => [String(o.id), o])), [selectedOrgUnits])

    // ---------- rows (always 1:1 with selected OUs) ----------
    const [rows, setRows] = useState([])
    useEffect(() => {
        const bySource = new Map((orgUnitMappings || []).map(m => [String(m.source || ''), m]))
        const next = (selectedOrgUnits || []).map(ou => {
            const existing = bySource.get(ou.id)
            return existing ? { source: existing.source, target: existing.target } : { source: ou.id, target: '' }
        })
        setRows(next)
    }, [JSON.stringify(selectedOrgUnits), JSON.stringify(orgUnitMappings)])

    // ---------- UI: search for the SOURCE list ----------
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return rows
        return (rows || []).filter(r => {
            const src = selectedById.get(r.source)
            const hay = [
                r.source,
                src?.name,
                src?.code,
                src?.path,
                String(src?.level ?? ''),
                src?.parent?.name,
            ].join(' ').toLowerCase()
            return hay.includes(q)
        })
    }, [rows, search, selectedById])

    // ---------- suggestions (by name, then code, then identical id) ----------
    const suggestionFor = (src) => {
        const s = selectedById.get(src)
        if (!s) return ''
        const nameKey = String(s.name || '').toLowerCase().trim()
        const codeKey = String(s.code || '').toLowerCase().trim()

        if (nameKey) {
            const byName = (localOptions || []).find(o => String(o.name || '').toLowerCase().trim() === nameKey)
            if (byName) return byName.id
        }
        if (codeKey) {
            const byCode = (localOptions || []).find(o => String(o.code || '').toLowerCase().trim() === codeKey)
            if (byCode) return byCode.id
        }
        if (localById.has(s.id)) return s.id
        return ''
    }

    const suggestions = useMemo(() => {
        const m = new Map()
        ;(rows || []).forEach(r => m.set(r.source, suggestionFor(r.source)))
        return m
    }, [rows, selectedById, localById, localOptions])

    // ---------- stats & validation ----------
    const totalRequired = selectedOrgUnits.length
    const mappedCount = (rows || []).filter(r => r.source && r.target).length

    const duplicateTargets = useMemo(() => {
        const counts = new Map()
        ;(rows || []).forEach(r => {
            const t = (r.target || '').trim()
            if (!t) return
            counts.set(t, (counts.get(t) || 0) + 1)
        })
        return Array.from(counts.entries()).filter(([, n]) => n > 1).map(([id]) => id)
    }, [rows])

    const unmappedCount = (rows || []).filter(r => !r.target).length
    const canSave = rows.length === totalRequired && duplicateTargets.length === 0 && !localOrgUnitsLoading

    // ---------- actions ----------
    const updateRow = (sourceId, targetId) => {
        setRows(prev => (prev || []).map(r => (r.source === sourceId ? { ...r, target: targetId } : r)))
    }
    const applySuggestion = (sourceId) => {
        const sug = suggestions.get(sourceId)
        if (sug) updateRow(sourceId, sug)
    }
    const applyAllSuggestions = () => {
        setRows(prev => (prev || []).map(r => {
            if (r.target) return r
            const sug = suggestions.get(r.source)
            return sug ? { ...r, target: sug } : r
        }))
    }
    const clearMappings = () => setRows(prev => (prev || []).map(r => ({ ...r, target: '' })))
    const saveRows = () => { if (typeof setOrgUnitMappings === 'function') setOrgUnitMappings(rows) }

    // ---------- helpers ----------
    const badge = (text, tone = 'neutral') => {
        const tones = {
            positive: { bg: '#e8f5e9', color: '#2e7d32' },
            negative: { bg: '#ffebee', color: '#c62828' },
            neutral:  { bg: '#eef2f7', color: '#374151' },
            info:     { bg: '#e8f1ff', color: '#1e40af' },
            warning:  { bg: '#fff7ed', color: '#c2410c' },
        }
        const s = tones[tone] || tones.neutral
        return (
            <span style={{
                display: 'inline-block',
                fontSize: 12,
                padding: '3px 8px',
                borderRadius: 999,
                background: s.bg,
                color: s.color,
                lineHeight: 1,
                fontWeight: 600,
            }}>
                {text}
            </span>
        )
    }

    const ouTiny = (ou) => {
        if (!ou) return null
        return (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {ou.code ? `${i18n.t('Code')}: ${ou.code} · ` : ''}
                {ou.level != null ? `${i18n.t('Level')}: ${ou.level} · ` : ''}
                {ou.parent?.name ? `${i18n.t('Parent')}: ${ou.parent.name} · ` : ''}
                {ou.path ? `${i18n.t('Path')}: ${ou.path}` : ''}
            </div>
        )
    }

    const optionLabel = (ou) => {
        const parent = ou?.parent?.name ? ` · ${i18n.t('Parent')}: ${ou.parent.name}` : ''
        const code = ou?.code ? ` · ${i18n.t('Code')}: ${ou.code}` : ''
        return `${ou.name}${parent}${code} [${ou.id}]`
    }

    const localLabel = (id) => {
        const ou = localById.get(String(id))
        return ou ? optionLabel(ou) : (id || '')
    }

    // ---------- header ----------
    const isExternal = metadataSource === 'external'
    const leftTitle = isExternal ? i18n.t('Source: External DHIS2 Selection') : i18n.t('Source: Selected Org Units')
    const rightTitle = i18n.t('Target: Local Org Units')

    return (
        <div style={{ padding: 0 }}>
            {/* Title row with status chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>
                    {i18n.t('Organisation Unit Mapping')}
                </h3>
                <Tag neutral>{i18n.t('{{n}} required', { n: totalRequired })}</Tag>
                <Tag positive>{i18n.t('{{n}} mapped', { n: mappedCount })}</Tag>
                {unmappedCount > 0 && <Tag>{i18n.t('{{n}} to map', { n: unmappedCount })}</Tag>}
                {duplicateTargets.length > 0 && <Tag negative>{i18n.t('Duplicates')}</Tag>}
            </div>

            {/* Instance summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Card>
                    <div style={{ padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <strong>{leftTitle}</strong>
                            {badge(isExternal ? i18n.t('EXTERNAL') : i18n.t('LOCAL'), isExternal ? 'info' : 'neutral')}
                        </div>
                        <div style={{ fontSize: 13, color: '#4b5563' }}>
                            {isExternal ? (
                                <>
                                    <div>{i18n.t('Instance')}: {externalInfo?.instanceName || i18n.t('Not provided')}</div>
                                    <div>{i18n.t('Base URL')}: {externalInfo?.baseUrl || i18n.t('Not provided')}</div>
                                    <div>{i18n.t('API version')}: {externalInfo?.apiVersion ?? i18n.t('Not provided')}</div>
                                </>
                            ) : (
                                <>
                                    <div>{i18n.t('Instance')}: {localInfo?.instanceName || i18n.t('This DHIS2')}</div>
                                    <div>{i18n.t('Base URL')}: {localInfo?.baseUrl || window?.location?.origin || ''}</div>
                                </>
                            )}
                            <div style={{ marginTop: 6 }}>
                                {badge(i18n.t('{{n}} selected', { n: selectedOrgUnits.length }))}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div style={{ padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <strong>{rightTitle}</strong>
                            {badge(i18n.t('LOCAL'), 'neutral')}
                        </div>
                        <div style={{ fontSize: 13, color: '#4b5563' }}>
                            <div>{i18n.t('Instance')}: {localInfo?.instanceName || i18n.t('This DHIS2')}</div>
                            <div>{i18n.t('Base URL')}: {localInfo?.baseUrl || window?.location?.origin || ''}</div>
                            <div style={{ marginTop: 6 }}>
                                {localOrgUnitsLoading 
                                    ? badge(i18n.t('Loading...'), 'info')
                                    : badge(i18n.t('{{n}} options', { n: localOptions.length }))
                                }
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Why mapping */}
            <NoticeBox title={i18n.t('Why map?')} style={{ marginBottom: 12 }}>
                {isExternal
                    ? i18n.t('Map each externally selected organisation unit to its corresponding LOCAL organisation unit so IDs line up during data exchange.')
                    : i18n.t('Confirm each selected organisation unit is linked to the correct LOCAL org unit for consistent IDs and hierarchy.')
                }
            </NoticeBox>

            {/* Loading local org units */}
            {localOrgUnitsLoading && (
                <NoticeBox title={i18n.t('Loading local organisation units...')} style={{ marginBottom: 12 }}>
                    {i18n.t('Please wait while we load the local organisation units for mapping targets.')}
                </NoticeBox>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                <InputField
                    label={i18n.t('Filter')}
                    placeholder={i18n.t('Search by name, code, path, level...')}
                    value={search}
                    onChange={({ value }) => setSearch(value)}
                    style={{ width: 360 }}
                    dense
                />
                <div style={{ flex: 1 }} />
                <ButtonStrip>
                    <Button small onClick={applyAllSuggestions} disabled={localOrgUnitsLoading}>
                        {i18n.t('Apply all suggestions')}
                    </Button>
                    <Button small onClick={clearMappings} disabled={localOrgUnitsLoading}>
                        {i18n.t('Clear mappings')}
                    </Button>
                    <Button primary onClick={saveRows} disabled={!canSave}>
                        {localOrgUnitsLoading ? i18n.t('Loading...') : i18n.t('Save mappings')}
                    </Button>
                </ButtonStrip>
            </div>

            {/* No local org units warning */}
            {!localOrgUnitsLoading && localOptions.length === 0 && isExternal && (
                <NoticeBox warning title={i18n.t('No local organisation units available')} style={{ marginBottom: 12 }}>
                    {i18n.t('No local organisation units were found for mapping targets. Please ensure your local DHIS2 instance has organisation units configured.')}
                </NoticeBox>
            )}

            {/* Duplicate warning */}
            {duplicateTargets.length > 0 && (
                <NoticeBox error title={i18n.t('Duplicate local targets detected')} style={{ marginBottom: 12 }}>
                    {i18n.t('The same local organisation unit is selected multiple times. Each target should be unique.')}
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                        {i18n.t('Duplicates:')} {duplicateTargets.map(localLabel).join(', ')}
                    </div>
                </NoticeBox>
            )}

            {/* Table */}
            {(filtered || []).length === 0 ? (
                <NoticeBox title={i18n.t('No organisation units to map')}>
                    {search
                        ? i18n.t('No matches for your search.')
                        : i18n.t('No selected organisation units to map.')}
                </NoticeBox>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Source Organisation Unit')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Target (Local)')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Suggestion')}
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(r => {
                                const src = selectedById.get(r.source)
                                const sug = suggestions.get(r.source)
                                const sugOu = sug ? localById.get(String(sug)) : null
                                const targetOu = r.target ? localById.get(String(r.target)) : null
                                const hasDuplicate = r.target && duplicateTargets.includes(r.target)

                                return (
                                    <tr key={r.source}>
                                        {/* Source */}
                                        <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 600 }}>{src?.name || r.source}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                                {src?.code ? `${i18n.t('Code')}: ${src.code} · ` : ''}
                                                {src?.level != null ? `${i18n.t('Level')}: ${src.level} · ` : ''}
                                                {src?.parent?.name ? `${i18n.t('Parent')}: ${src.parent.name}` : ''}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                                                {src?.id}
                                            </div>
                                        </td>

                                        {/* Target select */}
                                        <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                                            <div style={{ minWidth: 280, maxWidth: 400 }}>
                                                <SingleSelectField
                                                    dense
                                                    filterable
                                                    selected={r.target}
                                                    onChange={({ selected }) => updateRow(r.source, selected)}
                                                    placeholder={i18n.t('Choose local org unit')}
                                                    validationText={hasDuplicate ? i18n.t('Duplicate target') : undefined}
                                                    error={hasDuplicate}
                                                >
                                                    {(localOptions || [])
                                                        .filter(ou => 
                                                            // Show if not already mapped to another source, OR if it's the current selection
                                                            !mappedTargetIds.has(ou.id) || ou.id === r.target
                                                        )
                                                        .map(ou => (
                                                            <SingleSelectOption
                                                                key={ou.id}
                                                                value={ou.id}
                                                                // label includes parent + code so the built-in filter matches on them too
                                                                label={optionLabel(ou)}
                                                            />
                                                        ))
                                                    }
                                                </SingleSelectField>
                                                {targetOu && (
                                                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                                        {targetOu.code ? `${i18n.t('Code')}: ${targetOu.code} · ` : ''}
                                                        {targetOu.level != null ? `${i18n.t('Level')}: ${targetOu.level} · ` : ''}
                                                        {targetOu.parent?.name ? `${i18n.t('Parent')}: ${targetOu.parent.name}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Suggestion */}
                                        <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                                            {sug ? (
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        {badge(i18n.t('Suggested'), 'info')}
                                                        {!r.target && (
                                                            <Button small onClick={() => applySuggestion(r.source)}>
                                                                {i18n.t('Apply')}
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#4b5563' }}>
                                                        {sugOu ? sugOu.name : sug}
                                                    </div>
                                                    {sugOu && (
                                                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                                                            {sugOu.code ? `${i18n.t('Code')}: ${sugOu.code} · ` : ''}
                                                            {sugOu.id}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                                    {i18n.t('No suggestion')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer hint */}
            {unmappedCount > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                    {i18n.t('{{n}} row(s) still unmapped.', { n: unmappedCount })}
                </div>
            )}
        </div>
    )
}

export default OrgUnitMappingStep