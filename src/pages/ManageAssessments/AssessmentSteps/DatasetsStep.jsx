import React, { useMemo, useState } from 'react'
import {
    InputField,
    NoticeBox,
    Checkbox,
    SingleSelectField,
    SingleSelectOption,
    CircularLoader,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

/**
 * DatasetsStep (compact, Elements-style table)
 *
 * Props:
 * - datasets?: [{
 *     id, name, code, periodType, description,
 *     organisationUnits?: [{ id }],
 *     dataSetElements?: [{ dataElement: { id, name, valueType } }]
 *   }]
 * - localDatasets?: same as datasets (fallback if datasets not passed)
 * - selectedDataSets: string[] (dataset IDs)
 * - setSelectedDataSets: (fn) => void
 * - onCreateDataset?: () => void
 * - onEditDataset?: (id: string) => void
 * - loading?: boolean (show loader while datasets are being fetched)
 * - loadingSource?: string (display which instance is being loaded from)
 */
const DatasetsStep = ({
                          datasets = [],
                          localDatasets = [],
                          selectedDataSets = [],
                          setSelectedDataSets,
                          loading = false,
                          loadingSource = '',
                          footer,
                      }) => {

    
    const [search, setSearch] = useState('')
    const [periodFilter, setPeriodFilter] = useState('all')

    // Prefer explicit `datasets`, fall back to `localDatasets`
    const source = (datasets && datasets.length > 0) ? datasets : (localDatasets || [])

    // Build unique period type options from the data
    const periodTypeOptions = useMemo(() => {
        const set = new Set(
            (source || [])
                .map(d => (d?.periodType || '').trim())
                .filter(Boolean)
        )
        const arr = Array.from(set).sort((a, b) => a.localeCompare(b))
        return ['all', ...arr]
    }, [source])

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLowerCase()
        const list = source || []
        // text filter
        const textFiltered = q
            ? list.filter(d =>
                (d.name || '').toLowerCase().includes(q) ||
                (d.code || '').toLowerCase().includes(q) ||
                (d.id || '').toLowerCase().includes(q)
            )
            : list
        // periodType filter
        if (periodFilter === 'all') return textFiltered
        return textFiltered.filter(d => (d?.periodType || '').toLowerCase() === periodFilter.toLowerCase())
    }, [source, search, periodFilter])

    const isSelected = (id) => (selectedDataSets || []).includes(id)

    const toggle = (id) => {
        if (!setSelectedDataSets) return
        setSelectedDataSets(prev => {
            const set = new Set(prev || [])
            if (set.has(id)) set.delete(id)
            else set.add(id)
            return Array.from(set)
        })
    }

    return (
        <div style={{ padding: 0 }}>
            {/* Compact top bar: wide text filter + period type on the same row */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 480 }}>
                    <InputField
                        label={i18n.t('Filter')}
                        placeholder={i18n.t('Search by name, code, or ID')}
                        value={search}
                        onChange={({ value }) => setSearch(value)}
                        dense
                    />
                </div>
                <div style={{ width: 260 }}>
                    <SingleSelectField
                        label={i18n.t('Period Type')}
                        selected={periodFilter}
                        onChange={({ selected }) => setPeriodFilter(selected)}
                        dense
                    >
                        {periodTypeOptions.map(opt => (
                            <SingleSelectOption
                                key={opt}
                                value={opt}
                                label={opt === 'all' ? i18n.t('All') : opt}
                            />
                        ))}
                    </SingleSelectField>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CircularLoader small />
                        <span>{i18n.t('Loading datasets...')}</span>
                    </div>
                    {loadingSource && (
                        <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'center' }}>
                            {i18n.t('Loading from: {{source}}', { source: loadingSource })}
                        </div>
                    )}
                </div>
            ) : filtered.length === 0 ? (
                <NoticeBox title={i18n.t('No datasets found')}>
                    {i18n.t('Try adjusting your search or change the period type filter.')}
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
                                {i18n.t('Period Type')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('# Data elements')}
                            </th>
                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                {i18n.t('# Org units')}
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(ds => {
                            const checked = isSelected(ds.id)
                            // Prefer provided counts, else compute cheaply
                            const deCount = typeof ds?.dataElementCount === 'number'
                                ? ds.dataElementCount
                                : Array.isArray(ds?.dataSetElements)
                                    ? ds.dataSetElements.length
                                    : Array.isArray(ds?.dataElements)
                                        ? ds.dataElements.length
                                        : 0
                            const ouCount = typeof ds?.organisationUnitCount === 'number'
                                ? ds.organisationUnitCount
                                : Array.isArray(ds?.organisationUnits)
                                    ? ds.organisationUnits.length
                                    : 0

                            return (
                                <tr
                                    key={ds.id}
                                    onClick={() => toggle(ds.id)} // Row click toggles selection
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                        <div
                                            onClick={(e) => { e.stopPropagation() }} // keep checkbox isolated
                                            role="presentation"
                                        >
                                            <Checkbox
                                                checked={checked}
                                                onChange={() => toggle(ds.id)}
                                            />
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