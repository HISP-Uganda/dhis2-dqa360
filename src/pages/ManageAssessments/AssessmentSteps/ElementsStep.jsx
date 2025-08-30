import React, { useMemo, useState } from 'react'
import { NoticeBox, InputField, Checkbox, SingleSelectField, SingleSelectOption, Button, ButtonStrip, CircularLoader, colors } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

/**
 * ElementsStep
 * Props:
 * - dataElementsAll: [{
 *     id, name, code, valueType,
 *     categoryCombo?: { id, name },
 *     categories?: [{ id, name, code, options?: [{ id, name, code }] }],
 *     categoryOptionCount?: number
 *   }]
 * - selectedDataElementIds: string[]
 * - setSelectedDataElementIds: (ids: string[]) => void
 * - loading: boolean - whether data elements are currently loading
 */
const ElementsStep = ({
                          dataElementsAll = [],
                          selectedDataElementIds = [],
                          setSelectedDataElementIds,
                          loading = false,
                      }) => {
    const [search, setSearch] = useState('')
    const [valueTypeFilter, setValueTypeFilter] = useState('all')

    const selectedSet = useMemo(() => new Set(selectedDataElementIds || []), [selectedDataElementIds])
    
    // Filter out placeholder elements when not loading
    const filteredDataElements = useMemo(() => {
        if (loading) return []
        return (dataElementsAll || []).filter(de => !de.isPlaceholder)
    }, [dataElementsAll, loading])

    const valueTypeOptions = useMemo(() => {
        const set = new Set()
        ;(filteredDataElements || []).forEach(de => {
            if (de?.valueType) set.add(de.valueType)
        })
        const arr = Array.from(set).sort()
        return [{ value: 'all', label: i18n.t('All types') }, ...arr.map(v => ({ value: v, label: v }))]
    }, [filteredDataElements])

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLowerCase()
        return (filteredDataElements || []).filter(de => {
            const matchText =
                !q ||
                (de.name || '').toLowerCase().includes(q) ||
                (de.code || '').toLowerCase().includes(q) ||
                (de.id || '').toLowerCase().includes(q) ||
                (de?.categoryCombo?.name || '').toLowerCase().includes(q)
            const matchType = valueTypeFilter === 'all' || (de.valueType || '') === valueTypeFilter
            return matchText && matchType
        })
    }, [filteredDataElements, search, valueTypeFilter])

    const toggle = (id) => {
        const next = new Set(selectedSet)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedDataElementIds?.(Array.from(next))
    }

    const allShownIds = useMemo(() => filtered.map(d => d.id), [filtered])
    const selectAllShown = () => {
        const next = new Set(selectedSet)
        allShownIds.forEach(id => next.add(id))
        setSelectedDataElementIds?.(Array.from(next))
    }
    const clearAllShown = () => {
        const next = new Set(selectedSet)
        allShownIds.forEach(id => next.delete(id))
        setSelectedDataElementIds?.(Array.from(next))
    }

    // Loading indicator component
    const LoadingIndicator = () => (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CircularLoader small />
                <span>{i18n.t('Loading data elements...')}</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'center' }}>
                {i18n.t('Extracting data elements from selected datasets')}
            </div>
        </div>
    )

    return (
        <div style={{ padding: 0 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>
                {i18n.t('Select Data Elements')}
            </h3>

            {loading ? (
                <LoadingIndicator />
            ) : (
                <>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                        <InputField
                            label={i18n.t('Filter')}
                            placeholder={i18n.t('Search by name, code, category combo, or ID')}
                            value={search}
                            onChange={({ value }) => setSearch(value)}
                            style={{ width: 360 }}
                            dense
                        />
                        <SingleSelectField
                            label={i18n.t('Value type')}
                            selected={valueTypeFilter}
                            onChange={({ selected }) => setValueTypeFilter(selected)}
                            dense
                            style={{ width: 220 }}
                        >
                            {valueTypeOptions.map(o => (
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
                        <NoticeBox title={i18n.t('No data elements found')}>
                            {i18n.t('Adjust the filters or select datasets first to derive data elements.')}
                        </NoticeBox>
                    ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Select')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Name')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Code')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Value Type')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Category Combo')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('# Categories')}</th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('# Category options')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(de => {
                            const catCount = Array.isArray(de.categories) ? de.categories.length : 0
                            const optCount = typeof de.categoryOptionCount === 'number'
                                ? de.categoryOptionCount
                                : (de.categories || []).reduce((s, c) => s + (c.options?.length || 0), 0)

                            const ccLabel = de?.categoryCombo?.id || de?.categoryCombo?.name
                                ? `${de?.categoryCombo?.name || ''} (${de?.categoryCombo?.id || '—'})`
                                : '—'

                            const checked = selectedSet.has(de.id)

                            return (
                                <tr
                                    key={de.id}
                                    onClick={() => toggle(de.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox checked={checked} onChange={() => toggle(de.id)} />
                                        </div>
                                    </td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                        <div>
                                            {de.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                                            {de.id}
                                        </div>
                                    </td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.code || '—'}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{de.valueType || 'TEXT'}</td>

                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                        {de?.categoryCombo?.name || '—'}
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                                            {de?.categoryCombo?.id || '—'}
                                        </div>
                                    </td>

                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{catCount}</td>
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{optCount}</td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
                    )}
                </>
            )}
        </div>
    )
}

export default ElementsStep