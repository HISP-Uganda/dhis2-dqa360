import React, { useState } from 'react'
import {
    Box,
    Button,
    NoticeBox,
    IconSettings24,
    IconAdd24 as IconSave24,
    Input,
    SingleSelect,
    SingleSelectOption,
    Switch,
    Divider
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'

// Compact, card-less layout
const SectionTitle = styled.h3`
    margin: 8px 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 8px;
`

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
    margin: 8px 0 12px 0;
`

const FormField = styled.div`
    label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #333;
        font-size: 13px;
    }
    .field-description {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
    }
`

const DimRow = styled.div`
    display: grid;
    grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr;
    gap: 8px;
    align-items: center;
    padding: 4px 0;
`

const ListRow = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
`

export const SystemConfiguration = () => {
    const [loading, setLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)

    // All available DQA dimensions (aligned with assessments)
    const dimensionDefs = [
        { value: 'completeness', label: i18n.t('Completeness') },
        { value: 'timeliness', label: i18n.t('Timeliness') },
        { value: 'accuracy', label: i18n.t('Accuracy') },
        { value: 'consistency', label: i18n.t('Consistency') },
        { value: 'validity', label: i18n.t('Validity') },
        { value: 'integrity', label: i18n.t('Integrity') },
        { value: 'precision', label: i18n.t('Precision') },
        { value: 'reliability', label: i18n.t('Reliability') },
        { value: 'accessibility', label: i18n.t('Accessibility') },
        { value: 'interpretability', label: i18n.t('Interpretability') },
        { value: 'relevance', label: i18n.t('Relevance') },
        { value: 'comparability', label: i18n.t('Comparability') },
        { value: 'coherence', label: i18n.t('Coherence') },
        { value: 'granularity', label: i18n.t('Granularity') },
        { value: 'uniqueness', label: i18n.t('Uniqueness') },
        { value: 'conformity', label: i18n.t('Conformity') }
    ]

    // System + DQA configuration (compact defaults)
    const defaultConfig = {
        // General
        appName: 'DQA360',
        defaultLanguage: 'en',
        timezone: 'UTC',
        decimalPlaces: 1,
        roundingMode: 'halfUp',

        // DQA thresholds (global fallbacks)
        completenessThreshold: 80,
        consistencyThreshold: 85,
        timelinessThreshold: 90,
        accuracyThreshold: 90,
        varianceThreshold: 15, // % allowed variance before warning
        outlierZScore: 3, // Z-score for outlier detection

        // Overall score banding
        scoreGreenMin: 90,
        scoreYellowMin: 75, // < 90 and >= 75 => yellow, below => red

        // Color codes (traffic lights)
        colorGood: '#2e7d32',
        colorWarning: '#f9a825',
        colorCritical: '#c62828',
        colorInfo: '#1976d2',

        // Comparison results configuration (3-way Register | Summary | DHIS2)
        comparisonDeltaMetric: 'pct', // pct | abs
        comparisonAbsWarn: 5, // warn if |delta| >= 5
        comparisonAbsCrit: 10, // critical if |delta| >= 10
        comparisonPctWarn: 5, // warn if |delta%| >= 5%
        comparisonPctCrit: 10, // critical if |delta%| >= 10%
        primarySource: 'dhis2', // tie-break precedence when auto-correcting: register | summary | dhis2
        missingComparisonPolicy: 'flag', // flag | treatAsZero | ignore

        // Per-dimension settings (enable + thresholds + weights)
        dimensionSettings: {
            // Core enabled by default
            completeness: { enabled: true, threshold: 80, weight: 25 },
            timeliness: { enabled: true, threshold: 90, weight: 25 },
            accuracy: { enabled: true, threshold: 90, weight: 25 },
            consistency: { enabled: true, threshold: 85, weight: 25 },
            // Others available (disabled, 0 weight)
            validity: { enabled: false, threshold: 80, weight: 0 },
            integrity: { enabled: false, threshold: 80, weight: 0 },
            precision: { enabled: false, threshold: 80, weight: 0 },
            reliability: { enabled: false, threshold: 80, weight: 0 },
            accessibility: { enabled: false, threshold: 80, weight: 0 },
            interpretability: { enabled: false, threshold: 80, weight: 0 },
            relevance: { enabled: false, threshold: 80, weight: 0 },
            comparability: { enabled: false, threshold: 80, weight: 0 },
            coherence: { enabled: false, threshold: 80, weight: 0 },
            granularity: { enabled: false, threshold: 80, weight: 0 },
            uniqueness: { enabled: false, threshold: 80, weight: 0 },
            conformity: { enabled: false, threshold: 80, weight: 0 }
        },

        // Root causes of DQA issues (used in DQA Analysis)
        rootCauses: [
            i18n.t('Late reporting'),
            i18n.t('Data entry errors'),
            i18n.t('Lack of training'),
            i18n.t('Missing source documents'),
            i18n.t('Network downtime'),
            i18n.t('Stockouts affecting service delivery'),
            i18n.t('Misclassification of cases')
        ],

        // Policies
        defaultReportingLevel: 'facility', // facility | district | national
        defaultPeriodType: 'monthly', // monthly | quarterly | yearly
        missingValuePolicy: 'ignore', // ignore | treatAsZero
        duplicatePolicy: 'flag', // flag | reject | allow
        anomalySensitivity: 'medium', // low | medium | high

        // Notifications & SLAs
        enableNotifications: true,
        notifyOnThresholdBreach: true,
        notifyOnSlaMiss: true,
        slaValidationDays: 3,
        slaCorrectionDays: 7,

        // Performance
        maxAssessments: 100,
        cacheTimeout: 3600,
        enableCaching: true,

        // Security
        sessionTimeout: 1800,
        enableAuditLog: true,
        maxLoginAttempts: 5,

        // Validation behavior
        enableAutoValidation: true,

        // DQA Dataset Management
        dqaDatasetAttributeCode: 'dqa360_dataset_id', // Custom attribute code to identify DQA datasets
        dqaAssessmentAttributeCode: 'dqa360_assessment_id', // Custom attribute code to link datasets to assessments
        enableDatasetAutoDiscovery: true, // Auto-discover datasets with DQA attribute
        datasetSyncInterval: 3600, // Seconds between dataset sync checks
        
        // Data Analysis Settings
        analysisDefaultPeriods: 12, // Default number of periods to analyze
        analysisIncludeZeros: false, // Include zero values in analysis
        analysisOutlierMethod: 'zscore', // zscore | iqr | percentile
        analysisOutlierThreshold: 2.5, // Threshold for outlier detection
        
        // Comparison Analysis
        comparisonTolerancePercent: 5, // Acceptable variance percentage
        comparisonToleranceAbsolute: 10, // Acceptable absolute variance
        comparisonRequireAllSources: false, // Require all 3 sources (Register, Summary, DHIS2)
        
        // Data Quality Scoring
        scoringWeightCompleteness: 30, // Weight for completeness in overall score
        scoringWeightTimeliness: 25, // Weight for timeliness in overall score  
        scoringWeightAccuracy: 25, // Weight for accuracy in overall score
        scoringWeightConsistency: 20, // Weight for consistency in overall score
        
        // Automated Actions
        enableAutoCorrection: false, // Enable automatic data correction
        autoCorrectionConfidenceThreshold: 95, // Minimum confidence for auto-correction
        enableAutoNotifications: true, // Send notifications for quality issues
        
        // Data Retention & Archival
        dataRetentionMonths: 60, // Keep data for 5 years
        archiveOldAssessments: true, // Archive assessments older than retention period
        
        // Performance & Caching
        enableDataCaching: true, // Cache frequently accessed data
        cacheExpiryMinutes: 30, // Cache expiry time
        maxConcurrentAnalysis: 3, // Maximum concurrent analysis processes
        
        // Integration Settings
        dhis2SyncEnabled: true, // Enable DHIS2 synchronization
        dhis2SyncInterval: 1800, // Sync interval in seconds (30 minutes)
        dhis2RetryAttempts: 3, // Number of retry attempts for failed sync
        
        // Reporting Settings
        defaultReportFormat: 'pdf', // pdf | excel | json
        includeChartsInReports: true, // Include charts in generated reports
        reportLogoUrl: '', // URL for organization logo in reports
        reportFooterText: 'Generated by DQA360', // Footer text for reports
        
        // User Interface Settings
        defaultDashboardLayout: 'grid', // grid | list | cards
        enableAdvancedFilters: true, // Show advanced filtering options
        showDataElementCodes: false, // Show data element codes in UI
        enableBulkOperations: true // Enable bulk operations in UI
    }

    const [config, setConfig] = useState(defaultConfig)
    const [newRootCause, setNewRootCause] = useState('')

    const handleConfigChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }))
    }

    const setDimensionSetting = (dimKey, field, value) => {
        setConfig(prev => ({
            ...prev,
            dimensionSettings: {
                ...prev.dimensionSettings,
                [dimKey]: { ...prev.dimensionSettings[dimKey], [field]: value }
            }
        }))
    }

    const addRootCause = () => {
        const value = newRootCause.trim()
        if (!value) return
        if (config.rootCauses.some(c => c.toLowerCase() === value.toLowerCase())) return
        setConfig(prev => ({ ...prev, rootCauses: [...prev.rootCauses, value] }))
        setNewRootCause('')
    }

    const removeRootCause = (index) => {
        setConfig(prev => ({
            ...prev,
            rootCauses: prev.rootCauses.filter((_, i) => i !== index)
        }))
    }

    const handleSaveConfiguration = async () => {
        setLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null)
        try {
            // Simulated persistence (replace with datastore/api integration)
            await new Promise(resolve => setTimeout(resolve, 800))
            setSuccessMessage('✅ ' + i18n.t('Configuration saved successfully'))
        } catch (error) {
            setErrorMessage('❌ ' + i18n.t('Failed to save configuration: {{msg}}', { msg: error.message }))
        } finally {
            setLoading(false)
        }
    }

    const handleResetToDefaults = () => {
        setConfig(defaultConfig)
        setSuccessMessage('✅ ' + i18n.t('Configuration reset to defaults'))
    }

    return (
        <div>
            {/* Messages */}
            {successMessage && (
                <NoticeBox title={i18n.t('Success')} valid style={{ marginBottom: 12 }}>
                    {successMessage}
                </NoticeBox>
            )}
            {errorMessage && (
                <NoticeBox title={i18n.t('Error')} error style={{ marginBottom: 12 }}>
                    {errorMessage}
                </NoticeBox>
            )}

            {/* Comparison Results (related to delta calculation & mismatches) */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('Comparison Results')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <label>{i18n.t('Delta Metric')}</label>
                    <SingleSelect
                        selected={config.comparisonDeltaMetric}
                        onChange={({ selected }) => handleConfigChange('comparisonDeltaMetric', selected)}
                    >
                        <SingleSelectOption value="pct" label={i18n.t('Percentage')} />
                        <SingleSelectOption value="abs" label={i18n.t('Absolute')} />
                    </SingleSelect>
                    <div className="field-description">{i18n.t('How to evaluate Register | Summary | DHIS2 differences')}</div>
                </FormField>
                <FormField>
                    <label>{i18n.t('Warn Threshold (Absolute)')}</label>
                    <Input type="number" min="0" value={config.comparisonAbsWarn.toString()} onChange={({ value }) => handleConfigChange('comparisonAbsWarn', parseInt(value) || 0)} />
                </FormField>
                <FormField>
                    <label>{i18n.t('Critical Threshold (Absolute)')}</label>
                    <Input type="number" min="0" value={config.comparisonAbsCrit.toString()} onChange={({ value }) => handleConfigChange('comparisonAbsCrit', parseInt(value) || 0)} />
                </FormField>
                <FormField>
                    <label>{i18n.t('Warn Threshold (%)')}</label>
                    <Input type="number" min="0" max="100" value={config.comparisonPctWarn.toString()} onChange={({ value }) => handleConfigChange('comparisonPctWarn', parseInt(value) || 0)} />
                </FormField>
                <FormField>
                    <label>{i18n.t('Critical Threshold (%)')}</label>
                    <Input type="number" min="0" max="100" value={config.comparisonPctCrit.toString()} onChange={({ value }) => handleConfigChange('comparisonPctCrit', parseInt(value) || 0)} />
                </FormField>
                <FormField>
                    <label>{i18n.t('Primary Source (Tie-break)')}</label>
                    <SingleSelect
                        selected={config.primarySource}
                        onChange={({ selected }) => handleConfigChange('primarySource', selected)}
                    >
                        <SingleSelectOption value="register" label={i18n.t('Register')} />
                        <SingleSelectOption value="summary" label={i18n.t('Summary')} />
                        <SingleSelectOption value="dhis2" label={i18n.t('DHIS2 Reported')} />
                    </SingleSelect>
                </FormField>
                <FormField>
                    <label>{i18n.t('Missing Value Handling (Comparison)')}</label>
                    <SingleSelect
                        selected={config.missingComparisonPolicy}
                        onChange={({ selected }) => handleConfigChange('missingComparisonPolicy', selected)}
                    >
                        <SingleSelectOption value="flag" label={i18n.t('Flag as mismatch')} />
                        <SingleSelectOption value="treatAsZero" label={i18n.t('Treat as 0')} />
                        <SingleSelectOption value="ignore" label={i18n.t('Ignore')} />
                    </SingleSelect>
                </FormField>
            </FormGrid>
            <Divider />

            {/* DQA Dimensions (enable, thresholds, weights) */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('DQA Dimensions')}
            </SectionTitle>
            <DimRow>
                <strong>{i18n.t('Dimension')}</strong>
                <strong>{i18n.t('Enabled')}</strong>
                <strong>{i18n.t('Threshold (%)')}</strong>
                <strong>{i18n.t('Weight (%)')}</strong>
            </DimRow>
            {dimensionDefs.map(dim => (
                <DimRow key={dim.value}>
                    <div>{dim.label}</div>
                    <div>
                        <Switch
                            checked={config.dimensionSettings[dim.value]?.enabled}
                            onChange={({ checked }) => setDimensionSetting(dim.value, 'enabled', checked)}
                            dense
                            label=""
                        />
                    </div>
                    <div>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={(config.dimensionSettings[dim.value]?.threshold ?? 0).toString()}
                            onChange={({ value }) => setDimensionSetting(dim.value, 'threshold', parseInt(value) || 0)}
                        />
                    </div>
                    <div>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={(config.dimensionSettings[dim.value]?.weight ?? 0).toString()}
                            onChange={({ value }) => setDimensionSetting(dim.value, 'weight', parseInt(value) || 0)}
                        />
                    </div>
                </DimRow>
            ))}
            <div className="field-description" style={{ marginTop: 4 }}>
                {i18n.t('Weights are used to compute the overall DQA score from enabled dimensions')}
            </div>
            <Divider />

            {/* Root Causes (for DQA Analysis) */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('Root Causes')}</SectionTitle>
            <FormGrid>
                <FormField style={{ gridColumn: '1 / -1' }}>
                    <label>{i18n.t('Add Root Cause')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                        <Input value={newRootCause} onChange={({ value }) => setNewRootCause(value)} />
                        <Button onClick={addRootCause} disabled={!newRootCause.trim()}>{i18n.t('Add')}</Button>
                    </div>
                    <div className="field-description">{i18n.t('Root causes are used to categorize DQA issues identified during analysis')}</div>
                </FormField>
                <FormField style={{ gridColumn: '1 / -1' }}>
                    <label>{i18n.t('Configured Root Causes')}</label>
                    <div>
                        {config.rootCauses.length === 0 && (
                            <div className="field-description">{i18n.t('No root causes configured yet')}</div>
                        )}
                        {config.rootCauses.map((cause, idx) => (
                            <ListRow key={idx}>
                                <div>{cause}</div>
                                <Button secondary onClick={() => removeRootCause(idx)}>{i18n.t('Remove')}</Button>
                            </ListRow>
                        ))}
                    </div>
                </FormField>
            </FormGrid>
            <Divider />

            {/* Color Codes */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('Color Codes')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <label>{i18n.t('Good')}</label>
                    <input
                        type="color"
                        value={config.colorGood}
                        onChange={(e) => handleConfigChange('colorGood', e.target.value)}
                        style={{ width: '100%', height: 34, padding: 0, border: '1px solid #e0e0e0', borderRadius: 4 }}
                        aria-label={i18n.t('Good color')}
                    />
                </FormField>
                <FormField>
                    <label>{i18n.t('Warning')}</label>
                    <input
                        type="color"
                        value={config.colorWarning}
                        onChange={(e) => handleConfigChange('colorWarning', e.target.value)}
                        style={{ width: '100%', height: 34, padding: 0, border: '1px solid #e0e0e0', borderRadius: 4 }}
                        aria-label={i18n.t('Warning color')}
                    />
                </FormField>
                <FormField>
                    <label>{i18n.t('Critical')}</label>
                    <input
                        type="color"
                        value={config.colorCritical}
                        onChange={(e) => handleConfigChange('colorCritical', e.target.value)}
                        style={{ width: '100%', height: 34, padding: 0, border: '1px solid #e0e0e0', borderRadius: 4 }}
                        aria-label={i18n.t('Critical color')}
                    />
                </FormField>
                <FormField>
                    <label>{i18n.t('Info')}</label>
                    <input
                        type="color"
                        value={config.colorInfo}
                        onChange={(e) => handleConfigChange('colorInfo', e.target.value)}
                        style={{ width: '100%', height: 34, padding: 0, border: '1px solid #e0e0e0', borderRadius: 4 }}
                        aria-label={i18n.t('Info color')}
                    />
                </FormField>
            </FormGrid>
            <Divider/>

            {/* DQA Defaults */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('DQA Defaults')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <label>{i18n.t('Default Reporting Level')}</label>
                    <SingleSelect
                        selected={config.defaultReportingLevel}
                        onChange={({ selected }) => handleConfigChange('defaultReportingLevel', selected)}
                    >
                        <SingleSelectOption value="facility" label={i18n.t('Facility')} />
                        <SingleSelectOption value="district" label={i18n.t('District')} />
                        <SingleSelectOption value="national" label={i18n.t('National')} />
                    </SingleSelect>
                </FormField>
                <FormField>
                    <label>{i18n.t('Default Period Type')}</label>
                    <SingleSelect
                        selected={config.defaultPeriodType}
                        onChange={({ selected }) => handleConfigChange('defaultPeriodType', selected)}
                    >
                        <SingleSelectOption value="monthly" label={i18n.t('Monthly')} />
                        <SingleSelectOption value="quarterly" label={i18n.t('Quarterly')} />
                        <SingleSelectOption value="yearly" label={i18n.t('Yearly')} />
                    </SingleSelect>
                </FormField>
                <FormField>
                    <label>{i18n.t('Decimal Places')}</label>
                    <Input
                        type="number"
                        min="0"
                        max="4"
                        value={config.decimalPlaces.toString()}
                        onChange={({ value }) => handleConfigChange('decimalPlaces', parseInt(value) || 0)}
                    />
                </FormField>
                <FormField>
                    <label>{i18n.t('Rounding Mode')}</label>
                    <SingleSelect
                        selected={config.roundingMode}
                        onChange={({ selected }) => handleConfigChange('roundingMode', selected)}
                    >
                        <SingleSelectOption value="halfUp" label={i18n.t('Half Up')} />
                        <SingleSelectOption value="floor" label={i18n.t('Floor')} />
                        <SingleSelectOption value="ceil" label={i18n.t('Ceil')} />
                    </SingleSelect>
                </FormField>
            </FormGrid>
            <Divider/>

            {/* DQA Dataset Management */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('DQA Dataset Management')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <label>{i18n.t('DQA Dataset Attribute Code')}</label>
                    <Input 
                        value={config.dqaDatasetAttributeCode} 
                        onChange={({ value }) => handleConfigChange('dqaDatasetAttributeCode', value)} 
                        placeholder="dqa360_dataset_id"
                    />
                    <div className="field-description">{i18n.t('Custom attribute code to identify DQA-enabled datasets')}</div>
                </FormField>
                <FormField>
                    <label>{i18n.t('DQA Assessment Attribute Code')}</label>
                    <Input 
                        value={config.dqaAssessmentAttributeCode} 
                        onChange={({ value }) => handleConfigChange('dqaAssessmentAttributeCode', value)} 
                        placeholder="dqa360_assessment_id"
                    />
                    <div className="field-description">{i18n.t('Custom attribute code to link datasets to specific assessments')}</div>
                </FormField>
                <FormField>
                    <Switch
                        checked={config.enableDatasetAutoDiscovery}
                        onChange={({ checked }) => handleConfigChange('enableDatasetAutoDiscovery', checked)}
                        label={i18n.t('Enable Dataset Auto-Discovery')}
                    />
                    <div className="field-description">{i18n.t('Automatically discover datasets with DQA attribute')}</div>
                </FormField>
                <FormField>
                    <label>{i18n.t('Dataset Sync Interval (seconds)')}</label>
                    <Input 
                        type="number" 
                        min="300" 
                        max="86400" 
                        value={config.datasetSyncInterval.toString()} 
                        onChange={({ value }) => handleConfigChange('datasetSyncInterval', parseInt(value) || 3600)} 
                    />
                    <div className="field-description">{i18n.t('How often to check for dataset changes')}</div>
                </FormField>
            </FormGrid>
            <Divider/>

            {/* Data Analysis Settings */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('Data Analysis Settings')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <label>{i18n.t('Default Analysis Periods')}</label>
                    <Input 
                        type="number" 
                        min="1" 
                        max="60" 
                        value={config.analysisDefaultPeriods.toString()} 
                        onChange={({ value }) => handleConfigChange('analysisDefaultPeriods', parseInt(value) || 12)} 
                    />
                    <div className="field-description">{i18n.t('Default number of periods to include in analysis')}</div>
                </FormField>
                <FormField>
                    <Switch
                        checked={config.analysisIncludeZeros}
                        onChange={({ checked }) => handleConfigChange('analysisIncludeZeros', checked)}
                        label={i18n.t('Include Zero Values')}
                    />
                    <div className="field-description">{i18n.t('Include zero values in statistical analysis')}</div>
                </FormField>
                <FormField>
                    <label>{i18n.t('Outlier Detection Method')}</label>
                    <SingleSelect
                        selected={config.analysisOutlierMethod}
                        onChange={({ selected }) => handleConfigChange('analysisOutlierMethod', selected)}
                    >
                        <SingleSelectOption value="zscore" label={i18n.t('Z-Score')} />
                        <SingleSelectOption value="iqr" label={i18n.t('Interquartile Range')} />
                        <SingleSelectOption value="percentile" label={i18n.t('Percentile')} />
                    </SingleSelect>
                </FormField>
                <FormField>
                    <label>{i18n.t('Outlier Threshold')}</label>
                    <Input 
                        type="number" 
                        min="1" 
                        max="5" 
                        step="0.1"
                        value={config.analysisOutlierThreshold.toString()} 
                        onChange={({ value }) => handleConfigChange('analysisOutlierThreshold', parseFloat(value) || 2.5)} 
                    />
                    <div className="field-description">{i18n.t('Threshold for outlier detection (Z-score or IQR multiplier)')}</div>
                </FormField>
            </FormGrid>
            <Divider/>

            {/* Data Quality Scoring */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('Data Quality Scoring Weights')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <label>{i18n.t('Completeness Weight (%)')}</label>
                    <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={config.scoringWeightCompleteness.toString()} 
                        onChange={({ value }) => handleConfigChange('scoringWeightCompleteness', parseInt(value) || 30)} 
                    />
                </FormField>
                <FormField>
                    <label>{i18n.t('Timeliness Weight (%)')}</label>
                    <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={config.scoringWeightTimeliness.toString()} 
                        onChange={({ value }) => handleConfigChange('scoringWeightTimeliness', parseInt(value) || 25)} 
                    />
                </FormField>
                <FormField>
                    <label>{i18n.t('Accuracy Weight (%)')}</label>
                    <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={config.scoringWeightAccuracy.toString()} 
                        onChange={({ value }) => handleConfigChange('scoringWeightAccuracy', parseInt(value) || 25)} 
                    />
                </FormField>
                <FormField>
                    <label>{i18n.t('Consistency Weight (%)')}</label>
                    <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={config.scoringWeightConsistency.toString()} 
                        onChange={({ value }) => handleConfigChange('scoringWeightConsistency', parseInt(value) || 20)} 
                    />
                </FormField>
            </FormGrid>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                {i18n.t('Total weight: {{total}}% (should equal 100%)', { 
                    total: config.scoringWeightCompleteness + config.scoringWeightTimeliness + config.scoringWeightAccuracy + config.scoringWeightConsistency 
                })}
            </div>
            <Divider/>

            {/* Automated Actions */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('Automated Actions')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <Switch
                        checked={config.enableAutoCorrection}
                        onChange={({ checked }) => handleConfigChange('enableAutoCorrection', checked)}
                        label={i18n.t('Enable Auto-Correction')}
                    />
                    <div className="field-description">{i18n.t('Automatically correct data based on confidence threshold')}</div>
                </FormField>
                <FormField>
                    <label>{i18n.t('Auto-Correction Confidence Threshold (%)')}</label>
                    <Input 
                        type="number" 
                        min="50" 
                        max="100" 
                        value={config.autoCorrectionConfidenceThreshold.toString()} 
                        onChange={({ value }) => handleConfigChange('autoCorrectionConfidenceThreshold', parseInt(value) || 95)} 
                    />
                    <div className="field-description">{i18n.t('Minimum confidence required for automatic correction')}</div>
                </FormField>
                <FormField>
                    <Switch
                        checked={config.enableAutoNotifications}
                        onChange={({ checked }) => handleConfigChange('enableAutoNotifications', checked)}
                        label={i18n.t('Enable Auto-Notifications')}
                    />
                    <div className="field-description">{i18n.t('Send notifications for data quality issues')}</div>
                </FormField>
            </FormGrid>
            <Divider/>

            {/* Integration Settings */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('DHIS2 Integration')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <Switch
                        checked={config.dhis2SyncEnabled}
                        onChange={({ checked }) => handleConfigChange('dhis2SyncEnabled', checked)}
                        label={i18n.t('Enable DHIS2 Sync')}
                    />
                    <div className="field-description">{i18n.t('Enable synchronization with DHIS2 instance')}</div>
                </FormField>
                <FormField>
                    <label>{i18n.t('Sync Interval (seconds)')}</label>
                    <Input 
                        type="number" 
                        min="300" 
                        max="86400" 
                        value={config.dhis2SyncInterval.toString()} 
                        onChange={({ value }) => handleConfigChange('dhis2SyncInterval', parseInt(value) || 1800)} 
                    />
                    <div className="field-description">{i18n.t('How often to sync with DHIS2')}</div>
                </FormField>
                <FormField>
                    <label>{i18n.t('Retry Attempts')}</label>
                    <Input 
                        type="number" 
                        min="1" 
                        max="10" 
                        value={config.dhis2RetryAttempts.toString()} 
                        onChange={({ value }) => handleConfigChange('dhis2RetryAttempts', parseInt(value) || 3)} 
                    />
                    <div className="field-description">{i18n.t('Number of retry attempts for failed sync')}</div>
                </FormField>
            </FormGrid>
            <Divider/>

            {/* Performance (compact) */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('Performance')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <label>{i18n.t('Maximum Assessments')}</label>
                    <Input type="number" min="1" max="1000" value={config.maxAssessments.toString()} onChange={({ value }) => handleConfigChange('maxAssessments', parseInt(value) || 1)} />
                </FormField>
                <FormField>
                    <label>{i18n.t('Cache Timeout (seconds)')}</label>
                    <Input type="number" min="60" max="86400" value={config.cacheTimeout.toString()} onChange={({ value }) => handleConfigChange('cacheTimeout', parseInt(value) || 60)} />
                </FormField>
                <FormField>
                    <Switch
                        checked={config.enableCaching}
                        onChange={({ checked }) => handleConfigChange('enableCaching', checked)}
                        label={i18n.t('Enable Data Caching')}
                    />
                </FormField>
                <FormField>
                    <label>{i18n.t('Data Cache Expiry (minutes)')}</label>
                    <Input 
                        type="number" 
                        min="5" 
                        max="1440" 
                        value={config.cacheExpiryMinutes.toString()} 
                        onChange={({ value }) => handleConfigChange('cacheExpiryMinutes', parseInt(value) || 30)} 
                    />
                    <div className="field-description">{i18n.t('How long to cache frequently accessed data')}</div>
                </FormField>
                <FormField>
                    <label>{i18n.t('Max Concurrent Analysis')}</label>
                    <Input 
                        type="number" 
                        min="1" 
                        max="10" 
                        value={config.maxConcurrentAnalysis.toString()} 
                        onChange={({ value }) => handleConfigChange('maxConcurrentAnalysis', parseInt(value) || 3)} 
                    />
                    <div className="field-description">{i18n.t('Maximum number of concurrent analysis processes')}</div>
                </FormField>
            </FormGrid>
            <Divider/>

            {/* Security (compact) */}
            <SectionTitle>
                <IconSettings24 /> {i18n.t('Security')}
            </SectionTitle>
            <FormGrid>
                <FormField>
                    <label>{i18n.t('Session Timeout (seconds)')}</label>
                    <Input type="number" min="300" max="86400" value={config.sessionTimeout.toString()} onChange={({ value }) => handleConfigChange('sessionTimeout', parseInt(value) || 300)} />
                </FormField>
                <FormField>
                    <label>{i18n.t('Maximum Login Attempts')}</label>
                    <Input type="number" min="1" max="10" value={config.maxLoginAttempts.toString()} onChange={({ value }) => handleConfigChange('maxLoginAttempts', parseInt(value) || 1)} />
                </FormField>
                <FormField>
                    <Switch
                        checked={config.enableAuditLog}
                        onChange={({ checked }) => handleConfigChange('enableAuditLog', checked)}
                        label={i18n.t('Enable Audit Logging')}
                    />
                </FormField>
                <FormField>
                    <Switch
                        checked={config.enableAutoValidation}
                        onChange={({ checked }) => handleConfigChange('enableAutoValidation', checked)}
                        label={i18n.t('Enable Automatic Validation')}
                    />
                </FormField>
            </FormGrid>

            {/* Actions */}
            <Box display="flex" gap="12px" justifyContent="flex-end" style={{ marginTop: 12 }}>
                <Button secondary onClick={handleResetToDefaults}>
                    {i18n.t('Reset to Defaults')}
                </Button>
                <Button primary onClick={handleSaveConfiguration} loading={loading}>
                    <IconSave24 /> {i18n.t('Save Configuration')}
                </Button>
            </Box>
        </div>
    )
}

export default SystemConfiguration