import React, { useEffect, useMemo, useState } from 'react'
import {
    InputField,
    TextAreaField,
    SingleSelectField,
    SingleSelectOption,
    MultiSelectField,
    MultiSelectOption,
    CalendarInput,
    Checkbox,
    ButtonStrip,
    Button,
    Tag,
    NoticeBox,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useDataEngine } from '@dhis2/app-runtime'

/**
 * DetailsStep
 * Loads:
 *  - Frequency/Period Type from /api/periodTypes
 *  - Reporting Level from organisationUnitLevels (ordered by level)
 *
 * Props:
 * - assessmentData, setAssessmentData
 * - metadataSource, setMetadataSource  // 'local' | 'external'
 * - assessmentTypes, priorities, methodologies
 * - confidentialityLevels, dataRetentionPeriods
 * - dataQualityDimensionsOptions (list of dims; we default to ['accuracy'] if none selected)
 * - baselineAssessments, loadingBaselines
 * - dateErrors { startDate, endDate }
 * - handleDateChange(field, value)
 */
const DetailsStep = ({
                         assessmentData,
                         setAssessmentData,
                         metadataSource,
                         setMetadataSource,
                         assessmentTypes = [],
                         priorities = [],
                         methodologies = [],
                         confidentialityLevels = [],
                         dataRetentionPeriods = [],
                         dataQualityDimensionsOptions = [],
                         baselineAssessments = [],
                         loadingBaselines = false,
                         dateErrors = { startDate: '', endDate: '' },
                         handleDateChange,
                     }) => {
    const dataEngine = useDataEngine()

    // Period types & OU levels (loaded)
    const [periodTypeOptions, setPeriodTypeOptions] = useState([])
    const [ouLevelOptions, setOuLevelOptions] = useState([])
    const [loadingLists, setLoadingLists] = useState(true)
    const [loadError, setLoadError] = useState(null)

    // Load /api/periodTypes and /api/organisationUnitLevels
    useEffect(() => {
        let mounted = true
        ;(async () => {
            setLoadingLists(true)
            setLoadError(null)
            try {
                const q = {
                    pt: { resource: 'periodTypes' },
                    oul: {
                        resource: 'organisationUnitLevels',
                        params: { fields: 'id,name,level', order: 'level:asc', pageSize: 200, page: 1 },
                    },
                }
                const res = await dataEngine.query(q)

                const ptList = (res?.pt?.periodTypes || []).map(p => ({
                    value: p.name,
                    label: p.name,
                    meta: p,
                }))

                const lvls = (res?.oul?.organisationUnitLevels || [])
                    .sort((a, b) => (a.level || 0) - (b.level || 0))
                    .map(l => ({
                        value: l.id,
                        label: l.name ? `${l.name}` : i18n.t('Level {{n}}', { n: l.level }),
                        meta: l,
                    }))

                if (!mounted) return
                setPeriodTypeOptions(ptList)
                setOuLevelOptions(lvls)

                // Guard/auto-default Frequency
                if (!ptList.find(o => o.value === assessmentData.frequency)) {
                    // Prefer Monthly if present, else first option
                    const monthly = ptList.find(o => o.value === 'Monthly') || ptList[0]
                    if (monthly) {
                        setAssessmentData(prev => ({ ...prev, frequency: monthly.value }))
                    }
                }
                // Guard/auto-default Reporting Level (pick deepest or first)
                if (!lvls.find(o => o.value === assessmentData.reportingLevel)) {
                    const deepest = lvls[lvls.length - 1] || lvls[0]
                    if (deepest) {
                        setAssessmentData(prev => ({ ...prev, reportingLevel: deepest.value }))
                    }
                }
            } catch (e) {
                if (!mounted) return
                setLoadError(e?.message || i18n.t('Failed to load period types or org unit levels'))
            } finally {
                if (mounted) setLoadingLists(false)
            }
        })()
        return () => { mounted = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataEngine])

    // Ensure DQ dims start with 'accuracy' if user selection empty
    useEffect(() => {
        if (!Array.isArray(assessmentData.dataQualityDimensions) || assessmentData.dataQualityDimensions.length === 0) {
            setAssessmentData(prev => ({ ...prev, dataQualityDimensions: ['accuracy'] }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Helpers to guard SingleSelect "selected" prop
    const safeSelected = (value, options) =>
        (options || []).some(o => o.value === value) ? value : undefined

    const allDQOptions = useMemo(() => dataQualityDimensionsOptions || [], [dataQualityDimensionsOptions])

    return (
        <div style={{ padding: 0 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>
                {i18n.t('Assessment Details')}
            </h3>

            {loadError && (
                <NoticeBox title={i18n.t('Could not load lists')} error>
                    {loadError}
                </NoticeBox>
            )}

            {/* Metadata Source – compact, first question */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {i18n.t('Metadata Source')} *
                </label>
                <ButtonStrip>
                    <Button
                        small
                        secondary={metadataSource !== 'local'}
                        primary={metadataSource === 'local'}
                        onClick={() => setMetadataSource('local')}
                    >
                        {i18n.t('Local (this instance)')}
                        {metadataSource === 'local' && <span style={{ marginLeft: 6 }}>✓</span>}
                    </Button>
                    <Button
                        small
                        secondary={metadataSource !== 'external'}
                        primary={metadataSource === 'external'}
                        onClick={() => setMetadataSource('external')}
                    >
                        {i18n.t('External DHIS2')}
                        {metadataSource === 'external' && <span style={{ marginLeft: 6 }}>✓</span>}
                    </Button>
                </ButtonStrip>
                {metadataSource === 'external'
                    ? <Tag>{i18n.t('Connect next')}</Tag>
                    : <Tag>{i18n.t('Using this instance')}</Tag>}
            </div>

            {/* Name + Assessment Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 12 }}>
                <InputField
                    label={i18n.t('Assessment Name')}
                    placeholder={i18n.t('Enter assessment name')}
                    value={assessmentData.name}
                    onChange={({ value }) => setAssessmentData(prev => ({ ...prev, name: value }))}
                    required
                />
                <SingleSelectField
                    label={i18n.t('Assessment Type')}
                    selected={assessmentData.assessmentType}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, assessmentType: selected })) /* draft saved in parent */}
                >
                    {(Array.isArray(assessmentTypes) ? assessmentTypes : []).map(type => (
                        <SingleSelectOption key={type.value} value={type.value} label={type.label} />
                    ))}
                </SingleSelectField>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 12 }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#212529' }}>
                        {i18n.t('Start Date')} *
                    </label>
                    <CalendarInput
                        date={assessmentData.startDate}
                        onDateSelect={({ calendarDateString }) => handleDateChange && handleDateChange('startDate', calendarDateString)}
                        placeholder={i18n.t('Select start date')}
                        error={!!dateErrors.startDate}
                        minDate={new Date().toISOString().split('T')[0]}
                    />
                    {dateErrors.startDate && (
                        <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 4 }}>{dateErrors.startDate}</div>
                    )}
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#212529' }}>
                        {i18n.t('End Date')} *
                    </label>
                    <CalendarInput
                        date={assessmentData.endDate}
                        onDateSelect={({ calendarDateString }) => handleDateChange && handleDateChange('endDate', calendarDateString)}
                        placeholder={i18n.t('Select end date')}
                        error={!!dateErrors.endDate}
                        minDate={assessmentData.startDate || new Date().toISOString().split('T')[0]}
                    />
                    {dateErrors.endDate && (
                        <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 4 }}>{dateErrors.endDate}</div>
                    )}
                </div>
            </div>

            {/* Priority + Methodology */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 12 }}>
                <SingleSelectField
                    label={i18n.t('Priority')}
                    selected={assessmentData.priority}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, priority: selected }))}
                >
                    {(priorities || []).map(p => (
                        <SingleSelectOption key={p.value} value={p.value} label={p.label} />
                    ))}
                </SingleSelectField>

                <SingleSelectField
                    label={i18n.t('Methodology')}
                    selected={assessmentData.methodology}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, methodology: selected }))}
                >
                    {(methodologies || []).map(m => (
                        <SingleSelectOption key={m.value} value={m.value} label={m.label} />
                    ))}
                </SingleSelectField>
            </div>

            {/* Frequency / Reporting Level (loaded) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 12 }}>
                <SingleSelectField
                    label={i18n.t('Frequency / Period Type')}
                    selected={safeSelected(assessmentData.frequency, periodTypeOptions)}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, frequency: selected }))}
                    loading={loadingLists}
                    helpText={i18n.t('Loaded from /api/periodTypes')}
                >
                    {(periodTypeOptions || []).map(o => (
                        <SingleSelectOption key={o.value} value={o.value} label={o.label} />
                    ))}
                </SingleSelectField>

                <SingleSelectField
                    label={i18n.t('Reporting Level')}
                    selected={safeSelected(assessmentData.reportingLevel, ouLevelOptions)}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, reportingLevel: selected }))}
                    loading={loadingLists}
                    helpText={i18n.t('Organisation unit levels')}
                >
                    {(ouLevelOptions || []).map(o => (
                        <SingleSelectOption key={o.value} value={o.value} label={o.label} />
                    ))}
                </SingleSelectField>
            </div>

            {/* DQ Dimensions (start with Accuracy selected by default) */}
            <div style={{ marginBottom: 12 }}>
                <MultiSelectField
                    label={i18n.t('Data Quality Dimensions')}
                    selected={(assessmentData.dataQualityDimensions || []).filter(v =>
                        (allDQOptions || []).some(o => o.value === v)
                    )}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, dataQualityDimensions: selected }))}
                    helpText={i18n.t('Start with Accuracy; add other dimensions used in DQA')}
                >
                    {(allDQOptions || []).map(d => (
                        <MultiSelectOption key={d.value} value={d.value} label={d.label} />
                    ))}
                </MultiSelectField>
            </div>

            {/* Description / Objectives */}
            <div style={{ marginBottom: 12 }}>
                <TextAreaField
                    label={i18n.t('Description')}
                    placeholder={i18n.t('Enter assessment description')}
                    value={assessmentData.description}
                    onChange={({ value }) => setAssessmentData(prev => ({ ...prev, description: value }))}
                    rows={3}
                />
            </div>

            <div style={{ marginBottom: 12 }}>
                <TextAreaField
                    label={i18n.t('Objectives')}
                    placeholder={i18n.t('Define the main objectives of this assessment')}
                    value={assessmentData.objectives}
                    onChange={({ value }) => setAssessmentData(prev => ({ ...prev, objectives: value }))}
                    rows={3}
                />
            </div>

            <div style={{ marginBottom: 12 }}>
                <TextAreaField
                    label={i18n.t('Scope')}
                    placeholder={i18n.t('Define the scope and boundaries of this assessment')}
                    value={assessmentData.scope}
                    onChange={({ value }) => setAssessmentData(prev => ({ ...prev, scope: value }))}
                    rows={3}
                />
            </div>

            {/* Success criteria (predefined + free text) */}
            <div style={{ marginBottom: 12 }}>
                <MultiSelectField
                    label={i18n.t('Success Criteria (Pre-defined)')}
                    placeholder={i18n.t('Select common success criteria')}
                    selected={assessmentData.successCriteriaPredefined || []}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, successCriteriaPredefined: selected }))}
                >
                    <MultiSelectOption value="completeness_90" label={i18n.t('Data completeness ≥ 90%')} />
                    <MultiSelectOption value="timeliness_95" label={i18n.t('Reporting timeliness ≥ 95%')} />
                    <MultiSelectOption value="accuracy_85" label={i18n.t('Data accuracy ≥ 85%')} />
                    <MultiSelectOption value="consistency_80" label={i18n.t('Data consistency ≥ 80%')} />
                    <MultiSelectOption value="zero_duplicates" label={i18n.t('Zero duplicate records')} />
                    <MultiSelectOption value="validation_pass" label={i18n.t('All validation rules pass')} />
                    <MultiSelectOption value="stakeholder_satisfaction" label={i18n.t('Stakeholder satisfaction ≥ 4/5')} />
                    <MultiSelectOption value="response_time" label={i18n.t('Query response time < 2 seconds')} />
                    <MultiSelectOption value="system_uptime" label={i18n.t('System uptime ≥ 99%')} />
                    <MultiSelectOption value="training_completion" label={i18n.t('Staff training completion 100%')} />
                    <MultiSelectOption value="data_coverage" label={i18n.t('Geographic data coverage 100%')} />
                    <MultiSelectOption value="error_rate" label={i18n.t('Data error rate < 5%')} />
                </MultiSelectField>
            </div>

            <div style={{ marginBottom: 12 }}>
                <TextAreaField
                    label={i18n.t('Additional Success Criteria')}
                    placeholder={i18n.t('Define any specific or custom success criteria for this assessment...')}
                    value={assessmentData.successCriteria}
                    onChange={({ value }) => setAssessmentData(prev => ({ ...prev, successCriteria: value }))}
                    rows={3}
                />
            </div>

            {/* Confidentiality & Data retention */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 12 }}>
                <SingleSelectField
                    label={i18n.t('Confidentiality Level')}
                    selected={assessmentData.confidentialityLevel}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, confidentialityLevel: selected }))}
                >
                    {(confidentialityLevels || []).map(level => (
                        <SingleSelectOption key={level.value} value={level.value} label={level.label} />
                    ))}
                </SingleSelectField>

                <SingleSelectField
                    label={i18n.t('Data Retention Period')}
                    selected={assessmentData.dataRetentionPeriod}
                    onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, dataRetentionPeriod: selected }))}
                >
                    {(dataRetentionPeriods || []).map(period => (
                        <SingleSelectOption key={period.value} value={period.value} label={period.label} />
                    ))}
                </SingleSelectField>
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Checkbox
                        checked={!!assessmentData.notifications}
                        onChange={({ checked }) => setAssessmentData(prev => ({ ...prev, notifications: checked }))}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{i18n.t('Enable Notifications')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Checkbox
                        checked={!!assessmentData.autoSync}
                        onChange={({ checked }) => setAssessmentData(prev => ({ ...prev, autoSync: checked }))}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{i18n.t('Auto Sync')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Checkbox
                        checked={!!assessmentData.validationAlerts}
                        onChange={({ checked }) => setAssessmentData(prev => ({ ...prev, validationAlerts: checked }))}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{i18n.t('Validation Alerts')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Checkbox
                        checked={!!assessmentData.historicalComparison}
                        onChange={({ checked }) => setAssessmentData(prev => ({ ...prev, historicalComparison: checked }))}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{i18n.t('Historical Comparison')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Checkbox
                        checked={!!assessmentData.publicAccess}
                        onChange={({ checked }) => setAssessmentData(prev => ({ ...prev, publicAccess: checked }))}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{i18n.t('Public Access')}</span>
                </label>
            </div>

            {/* Baseline for follow-up */}
            {assessmentData.assessmentType === 'followup' && (
                <div style={{ marginTop: 8 }}>
                    <SingleSelectField
                        label={i18n.t('Baseline Assessment')}
                        placeholder={i18n.t('Select baseline assessment for comparison')}
                        selected={assessmentData.baselineAssessmentId}
                        onChange={({ selected }) => setAssessmentData(prev => ({ ...prev, baselineAssessmentId: selected }))}
                        loading={loadingBaselines}
                    >
                        {(baselineAssessments || []).map(ba => (
                            <SingleSelectOption
                                key={ba.id}
                                value={ba.id}
                                label={`${ba.name} ${ba.period ? `(${ba.period})` : ''}`}
                            />
                        ))}
                    </SingleSelectField>
                </div>
            )}
        </div>
    )
}

export default DetailsStep