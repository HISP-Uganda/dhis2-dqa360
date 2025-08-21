import React, { useMemo, useState } from 'react'
import {
    NoticeBox,
    Button,
    ButtonStrip,
    Checkbox,
    InputField,
    TextAreaField,
    Tag,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

/**
 * ReviewStep
 *
 * Props:
 * - assessmentData
 * - setAssessmentData
 * - smsConfig, setSmsConfig
 * - prereqsOk: boolean
 * - onBack: () => void
 * - onDownload: () => void
 * - onPrint: () => void
 * - onSave: () => void
 * - saving: boolean
 * - buildPayload: () => any
 */
const ReviewStep = ({
                        assessmentData = {},
                        setAssessmentData,
                        smsConfig = {},
                        setSmsConfig,
                        prereqsOk = false,
                        onBack,
                        onDownload,
                        onPrint,
                        onSave,
                        saving = false,
                        buildPayload,
                    }) => {
    const [showJson, setShowJson] = useState(false)

    const payload = useMemo(() => {
        try {
            return typeof buildPayload === 'function' ? buildPayload() : {}
        } catch {
            return {}
        }
    }, [buildPayload, assessmentData, smsConfig])

    const datasets = payload?.datasets?.selected || []
    const dataElements = payload?.dataElements?.selected || []
    const orgUnits = payload?.orgUnits?.selected || []
    const mappings = payload?.orgUnitMapping?.mappings || []
    const smsCommands = payload?.sms?.commands || []

    // New: created DQA datasets and element mappings from Preparation
    const createdDqaDatasets = payload?.localDatasets?.createdDatasets || []
    const elementMappings = payload?.localDatasets?.elementMappings || {}

    const OptionTag = ({ label }) => (
        <Tag style={{ marginRight: 6, marginBottom: 6 }}>{label}</Tag>
    )

    const TopButtons = () => (
        <div style={{ marginBottom: 12 }}>
            <ButtonStrip>
                {onBack && <Button onClick={onBack}>{i18n.t('Back')}</Button>}
                <Button onClick={onDownload}>{i18n.t('Download JSON')}</Button>
                <Button onClick={onPrint}>{i18n.t('Print')}</Button>
                <Button
                    primary
                    onClick={onSave}
                    disabled={!prereqsOk || saving}
                    loading={saving}
                >
                    {i18n.t('Save Assessment')}
                </Button>
            </ButtonStrip>
        </div>
    )

    return (
        <div style={{ padding: 0 }}>
            {/* Actions on top */}
            <TopButtons />

            <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 600 }}>
                {i18n.t('Review & Save')}
            </h3>

            {!prereqsOk && (
                <NoticeBox error title={i18n.t('Missing prerequisites')} style={{ marginBottom: 16 }}>
                    {i18n.t('Some steps are incomplete. Please go back and complete all steps (Details, Datasets, Data Elements, Org Units, Preparation).')}
                </NoticeBox>
            )}

            {/* Summary grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                {/* Left: Assessment info + options + SMS */}
                <div>
                    <section style={{ marginBottom: 16 }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>
                            {i18n.t('Assessment')}
                        </h4>
                        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Name')}:</strong> {assessmentData?.name || '—'}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Type')}:</strong> {assessmentData?.assessmentType || '—'}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Priority')}:</strong> {assessmentData?.priority || '—'}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Methodology')}:</strong> {assessmentData?.methodology || '—'}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Frequency')}:</strong> {assessmentData?.frequency || '—'}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Reporting level')}:</strong> {assessmentData?.reportingLevel || '—'}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Start date')}:</strong> {assessmentData?.startDate || '—'}
                                {'  '} <strong style={{ marginLeft: 12 }}>{i18n.t('End date')}:</strong> {assessmentData?.endDate || '—'}
                            </div>
                            {assessmentData?.assessmentType === 'followup' && (
                                <div style={{ marginBottom: 6 }}>
                                    <strong>{i18n.t('Baseline')}:</strong> {assessmentData?.baselineAssessmentId || '—'}
                                </div>
                            )}
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Objectives')}:</strong> {assessmentData?.objectives || '—'}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Scope')}:</strong> {assessmentData?.scope || '—'}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Description')}:</strong> {assessmentData?.description || '—'}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <strong>{i18n.t('Data Quality Dimensions')}:</strong>
                                <div style={{ marginTop: 6 }}>
                                    {(assessmentData?.dataQualityDimensions || []).length === 0
                                        ? '—'
                                        : (assessmentData.dataQualityDimensions || []).map((d) => (
                                            <OptionTag key={d} label={d} />
                                        ))}
                                </div>
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <strong>{i18n.t('Success Criteria (pre-defined)')}:</strong>
                                <div style={{ marginTop: 6 }}>
                                    {(assessmentData?.successCriteriaPredefined || assessmentData?.predefinedSuccessCriteria || []).length === 0
                                        ? '—'
                                        : (assessmentData?.successCriteriaPredefined || assessmentData?.predefinedSuccessCriteria || []).map((d) => (
                                            <OptionTag key={d} label={d} />
                                        ))}
                                </div>
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <strong>{i18n.t('Additional Success Criteria')}:</strong> {assessmentData?.successCriteria || '—'}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <strong>{i18n.t('Confidentiality')}:</strong> {assessmentData?.confidentialityLevel || '—'}
                                {'  '}
                                <strong style={{ marginLeft: 12 }}>{i18n.t('Retention')}:</strong> {assessmentData?.dataRetentionPeriod || '—'}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <strong>{i18n.t('Options')}:</strong>
                                <div style={{ marginTop: 6 }}>
                                    {!!assessmentData?.autoSave && <OptionTag label={i18n.t('Auto Save')} />}
                                    {!!assessmentData?.autoSync && <OptionTag label={i18n.t('Auto Sync')} />}
                                    {!!assessmentData?.validationAlerts && <OptionTag label={i18n.t('Validation Alerts')} />}
                                    {!!assessmentData?.historicalComparison && <OptionTag label={i18n.t('Historical Comparison')} />}
                                    {!!assessmentData?.publicAccess && <OptionTag label={i18n.t('Public Access')} />}
                                    {!assessmentData?.autoSave && !assessmentData?.autoSync && !assessmentData?.validationAlerts && !assessmentData?.historicalComparison && !assessmentData?.publicAccess && '—'}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SMS configuration */}
                    <section>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>
                            {i18n.t('SMS Settings')}
                        </h4>
                        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <Checkbox
                                        checked={!!smsConfig?.enabled}
                                        onChange={({ checked }) => setSmsConfig(prev => ({ ...(prev || {}), enabled: checked }))}
                                    />
                                    <span style={{ fontWeight: 600 }}>{i18n.t('Enable SMS reporting')}</span>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <InputField
                                    label={i18n.t('Sender ID')}
                                    value={smsConfig?.senderId || ''}
                                    onChange={({ value }) => setSmsConfig(prev => ({ ...(prev || {}), senderId: value }))}
                                />
                                <InputField
                                    label={i18n.t('Report Keyword')}
                                    value={smsConfig?.reportKeyword || ''}
                                    onChange={({ value }) => setSmsConfig(prev => ({ ...(prev || {}), reportKeyword: value }))}
                                />
                                <InputField
                                    label={i18n.t('Phone Pattern (regex)')}
                                    value={smsConfig?.phonePattern || ''}
                                    onChange={({ value }) => setSmsConfig(prev => ({ ...(prev || {}), phonePattern: value }))}
                                />
                                <InputField
                                    label={i18n.t('Preview Template')}
                                    value={smsConfig?.previewMessage || ''}
                                    onChange={({ value }) => setSmsConfig(prev => ({ ...(prev || {}), previewMessage: value }))}
                                />
                            </div>

                            <div style={{ marginTop: 8 }}>
                                <strong>{i18n.t('Dataset Commands')}</strong>
                                {Array.isArray(smsCommands) && smsCommands.length > 0 ? (
                                    <div style={{ overflowX: 'auto', marginTop: 8 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Dataset ID')}</th>
                                                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Command')}</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {smsCommands.map((c, idx) => (
                                                <tr key={`${c.dataSetId}-${idx}`}>
                                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}><code>{c.dataSetId}</code></td>
                                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{c.commandName}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 8, color: '#6b7280' }}>{i18n.t('No dataset commands generated yet.')}</div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right: Counts + tables */}
                <div>
                    <section style={{ marginBottom: 16 }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>
                            {i18n.t('Selections')}
                        </h4>
                        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Datasets')}:</strong> {datasets.length}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Data elements')}:</strong> {dataElements.length}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Organisation units')}:</strong> {orgUnits.length}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>{i18n.t('Mappings')}:</strong> {mappings.length}
                            </div>
                        </div>
                    </section>

                    <section style={{ marginBottom: 16 }}>
                        <h5 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 600 }}>{i18n.t('Datasets')}</h5>
                        {datasets.length === 0 ? (
                            <div style={{ color: '#6b7280' }}>{i18n.t('No datasets selected')}</div>
                        ) : (
                            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Name')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Period Type')}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {datasets.map((d) => (
                                        <tr key={d.id}>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{d.name}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{d.periodType || '—'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* New: Created DQA Datasets */}
                    <section style={{ marginBottom: 16 }}>
                        <h5 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 600 }}>{i18n.t('Created DQA Datasets')}</h5>
                        {createdDqaDatasets.length === 0 ? (
                            <div style={{ color: '#6b7280' }}>{i18n.t('No created DQA datasets yet')}</div>
                        ) : (
                            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Type')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Name')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Code')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Period Type')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Elements')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Org Units')}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {createdDqaDatasets.map((d) => (
                                        <tr key={d.id}>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}><code>{d.id}</code></td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{d.type || '—'}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{d.name}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{d.code}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{d.periodType}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{d.elements}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{d.orgUnits}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* New: Element Mappings Summary */}
                    <section style={{ marginBottom: 16 }}>
                        <h5 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 600 }}>{i18n.t('Element Mappings')}</h5>
                        {(() => {
                            const isArray = Array.isArray(elementMappings)
                            const empty = isArray ? elementMappings.length === 0 : Object.keys(elementMappings || {}).length === 0
                            if (empty) {
                                return <div style={{ color: '#6b7280' }}>{i18n.t('No element mappings found')}</div>
                            }
                            return (
                                <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Dataset Type')}</th>
                                            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Pairs')}</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {isArray ? (
                                            // New top-level array: show by datasetType grouped summary
                                            Object.entries(
                                                elementMappings.reduce((acc, p) => {
                                                    const t = p.datasetType || 'unknown'
                                                    acc[t] = acc[t] || []
                                                    acc[t].push(p)
                                                    return acc
                                                }, {})
                                            ).map(([type, pairs]) => (
                                                <tr key={type}>
                                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{type}</td>
                                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace' }}>
                                                        {(pairs || []).slice(0, 10).map(p => `${p.sourceId || '—'}→${p.createdId || '—'}`).join(', ')}
                                                        {(pairs || []).length > 10 ? ' …' : ''}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            Object.entries(elementMappings).map(([type, pairs]) => (
                                                <tr key={type}>
                                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{type}</td>
                                                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace' }}>
                                                        {(pairs || []).slice(0, 10).map(p => `${p.sourceId || '—'}→${p.createdId || '—'}`).join(', ')}
                                                        {(pairs || []).length > 10 ? ' …' : ''}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        })()}
                    </section>

                    <section style={{ marginBottom: 16 }}>
                        <h5 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 600 }}>{i18n.t('Organisation Units')}</h5>
                        {orgUnits.length === 0 ? (
                            <div style={{ color: '#6b7280' }}>{i18n.t('No organisation units selected')}</div>
                        ) : (
                            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Name')}</th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{i18n.t('Level')}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {orgUnits.map((ou) => (
                                        <tr key={ou.id}>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}><code>{ou.id}</code></td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.name}</td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{ou.level ?? '—'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* JSON preview */}
            <section style={{ marginTop: 16 }}>
                <Button small onClick={() => setShowJson(v => !v)}>
                    {showJson ? i18n.t('Hide JSON preview') : i18n.t('Show JSON preview')}
                </Button>
                {showJson && (
                    <pre style={{
                        marginTop: 8,
                        background: '#0b1021',
                        color: '#e6edf3',
                        padding: 12,
                        borderRadius: 8,
                        overflow: 'auto',
                        maxHeight: 360
                    }}>
                        {JSON.stringify(payload, null, 2)}
                    </pre>
                )}
            </section>

            {/* Actions at bottom too */}
            <div style={{ marginTop: 16 }}>
                <ButtonStrip>
                    {onBack && <Button onClick={onBack}>{i18n.t('Back')}</Button>}
                    <Button onClick={onDownload}>{i18n.t('Download JSON')}</Button>
                    <Button onClick={onPrint}>{i18n.t('Print')}</Button>
                    <Button
                        primary
                        onClick={onSave}
                        disabled={!prereqsOk || saving}
                        loading={saving}
                    >
                        {i18n.t('Save Assessment')}
                    </Button>
                </ButtonStrip>
            </div>
        </div>
    )
}

export default ReviewStep