import React, { useMemo, useState } from 'react'
import { NoticeBox, InputField, Checkbox, SingleSelectField, SingleSelectOption, Button, ButtonStrip } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

/**
 * OrgUnitsStep
 *
 * Preferred props:
 *  - orgUnitsAll: [{ id, name, code, level, path, parent?: { id, name, code } }]
 *  - selectedOrgUnitIds: string[]
 *  - setSelectedOrgUnitIds: (ids: string[]) => void
 *
 * (Back-compat props supported but discouraged)
 */
const OrgUnitsStep = ({
                          orgUnitsAll = [],
                          selectedOrgUnitIds = [],
                          setSelectedOrgUnitIds,
                      }) => {
    const [search, setSearch] = useState('')
    const [levelFilter, setLevelFilter] = useState('all')

    const selectedSet = useMemo(() => new Set(selectedOrgUnitIds || []), [selectedOrgUnitIds])

    const levelOptions = useMemo(() => {
        const set = new Set()
        ;(orgUnitsAll || []).forEach(ou => {
            if (ou?.level != null) set.add(String(ou.level))
        })
        const levels = Array.from(set).sort((a, b) => Number(a) - Number(b))
        return [{ value: 'all', label: i18n.t('All levels') }, ...levels.map(v => ({ value: v, label: i18n.t('Level {{n}}', { n: v }) }))]
    }, [orgUnitsAll])

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLowerCase()
        return (orgUnitsAll || []).filter(ou => {
            const matchText =
                !q ||
                (ou.name || '').toLowerCase().includes(q) ||
                (ou.code || '').toLowerCase().includes(q) ||
                (ou.id || '').toLowerCase().includes(q) ||
                (ou.parent?.name || '').toLowerCase().includes(q)
            const matchLevel = levelFilter === 'all' || String(ou.level ?? '') === levelFilter
            return matchText && matchLevel
        })
    }, [orgUnitsAll, search, levelFilter])

    const toggle = (id) => {
        const next = new Set(selectedSet)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedOrgUnitIds?.(Array.from(next))
    }

    const allShownIds = useMemo(() => filtered.map(o => o.id), [filtered])
    const selectAllShown = () => {
        const next = new Set(selectedSet)
        allShownIds.forEach(id => next.add(id))
        setSelectedOrgUnitIds?.(Array.from(next))
    }
    const clearAllShown = () => {
        const next = new Set(selectedSet)
        allShownIds.forEach(id => next.delete(id))
        setSelectedOrgUnitIds?.(Array.from(next))
    }

    return (
        <div style={{ padding: 0 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>
                {i18n.t('Select Organisation Units')}
            </h3>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                <InputField
                    label={i18n.t('Filter')}
                    placeholder={i18n.t('Search by name, code, parent, or ID')}
                    value={search}
                    onChange={({ value }) => setSearch(value)}
                    style={{ width: 360 }}
                    dense
                />
                <SingleSelectField
                    label={i18n.t('Level')}
                    selected={levelFilter}
                    onChange={({ selected }) => setLevelFilter(selected)}
                    dense
                    style={{ width: 220 }}
                >
                    {levelOptions.map(o => (
                        <SingleSelectOption key={o.value} value={o.value} label={o.label} />
                    ))}
                </SingleSelectField>
                <div style={{ flex: 1 }} />
                <ButtonStrip>
                    <Button small onClick={selectAllShown}>{i18n.t('Select all (filtered)')}</Button>
                    <Button small onClick={clearAllShown}>{i18n.t('Clear (filtered)')}</Button>
                </ButtonStrip>
            </div>

            {filtered.length === 0 ? (
                <NoticeBox title={i18n.t('No organisation units available')}>
                    {i18n.t('Select datasets first to derive the organisation units.')}
                </NoticeBox>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Select')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Name')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Code')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Level')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Parent')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('Path')}
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(ou => {
                            const checked = selectedSet.has(ou.id)
                            return (
                                <tr
                                    key={ou.id}
                                    onClick={() => toggle(ou.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={checked}
                                                onChange={() => toggle(ou.id)}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.name}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.code || '—'}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.level ?? '—'}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.parent?.name || '—'}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace' }}>{ou.path || '—'}</td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default OrgUnitsStep