import React, { useState, useEffect } from 'react'
import { Box, Button, Card, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, Tag, ButtonStrip, IconMore16, CircularLoader } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'
import { DHIS2Configuration } from '../Metadata/DHIS2Configuration'
import { DataSetManagement } from '../Metadata/DataSetManagement'
import { DataElementManagement } from '../Metadata/DataElementManagement'
import { OrganisationUnitManagement } from '../Metadata/OrganisationUnitManagement'
import { OrganizationUnitMapping } from '../Metadata/OrganizationUnitMapping'
import { DatasetPreparation } from '../Metadata/DatasetPreparation'
import { AssessmentTemplates } from '../Metadata/AssessmentTemplates'
import MetadataSourceSelection from '../Metadata/MetadataSourceSelection'
import ManualMetadataCreation from '../Metadata/ManualMetadataCreation'
import { useDhis2Service } from '../../services/dhis2Service'
import { useDataEngine } from '@dhis2/app-runtime'
import { saveAs } from 'file-saver'
import { notificationService, NotificationChannels } from '../../services/notificationService'
import { 
    calculateSubPeriods, 
    needsSubPeriods,
    getPeriodTypeFromFrequency,
    getPeriodTypeDisplayName,
    getDatasetPeriodTypes,
    needsMultiPeriodEntry
} from '../../utils/periodUtils'

const DQOptions = ({ assessment, onDQDetails, onDQSummary, onExport }) => (
    <ButtonStrip>
        <Button small onClick={onDQSummary}>{i18n.t('DQ Summary')}</Button>
        <Button small onClick={onDQDetails}>{i18n.t('DQ Details')}</Button>
        <Button small onClick={onExport}>{i18n.t('Export')}</Button>
    </ButtonStrip>
)

const DQSummaryModal = ({ assessment, onClose }) => {
    const datasetTypes = [
        { key: 'register', label: 'Register', color: '#2196f3', icon: '📝' },
        { key: 'summary', label: 'Summary', color: '#4caf50', icon: '📊' },
        { key: 'reported', label: 'Reported', color: '#ff9800', icon: '📋' },
        { key: 'correction', label: 'Correction', color: '#9c27b0', icon: '✏️' }
    ]

    // Extract data from correct structure
    const info = assessment.details || assessment
    const dhis2Config = assessment.connection || assessment.Dhis2config || assessment.dhis2Config || {}
    const dsSelected = Array.isArray(assessment.datasetsSelected) ? assessment.datasetsSelected : []
    const localDatasets = Array.isArray(assessment.dqaDatasetsCreated) ? assessment.dqaDatasetsCreated : []
    const orgUnitMapping = Array.isArray(assessment.orgUnitMappings) ? assessment.orgUnitMappings : []
    const elementMappings = Array.isArray(assessment.dataElementMappings) ? assessment.dataElementMappings : []

    // Calculate totals
    const totalDataElements = dsSelected.reduce((total, ds) => total + (ds?.dataElements?.length || 0), 0)
    const totalOrgUnits = orgUnitMapping.length || dsSelected.reduce((total, ds) => total + (ds?.organisationUnits?.length || 0), 0)

    return (
        <Box position="fixed" top={0} left={0} width="100vw" height="100vh" bgcolor="rgba(0,0,0,0.5)" zIndex={3000} display="flex" alignItems="center" justifyContent="center" padding="24px">
            <Box width="900px" maxWidth="95vw" maxHeight="90vh" bgcolor="#fff" borderRadius="8px" boxShadow="0 4px 12px rgba(0,0,0,0.15)" padding="32px" overflow="auto">
                <Box marginBottom="24px">
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#212934' }}>
                        {i18n.t('Assessment Details')} - {info.name || assessment.name}
                    </h2>
                    <Box marginTop="8px" fontSize="14px" color="#6c757d">
                        {(info.metadataSource || assessment.metadataSource) === 'dhis2' ? '🔗 External DHIS2 instance' : '🏠 Local (This instance)'}
                    </Box>
                </Box>

                {/* Assessment Overview */}
                <Box marginBottom="24px">
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '500' }}>
                        {i18n.t('Overview')}
                    </h3>
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap="16px">
                        <Box padding="16px" backgroundColor="#f8f9fa" borderRadius="8px">
                            <Box fontSize="14px" color="#6c757d" marginBottom="4px">{i18n.t('Period')}</Box>
                            <Box fontSize="16px" fontWeight="500">{info.period || assessment.period}</Box>
                            {(info.frequency || assessment.frequency) && (
                                <Box fontSize="12px" color="#6c757d" marginTop="4px">
                                    {i18n.t('Frequency')}: {info.frequency || assessment.frequency}
                                </Box>
                            )}
                        </Box>
                        <Box padding="16px" backgroundColor="#f8f9fa" borderRadius="8px">
                            <Box fontSize="14px" color="#6c757d" marginBottom="4px">{i18n.t('Status')}</Box>
                            <Box>{getStatusTag(info.status || assessment.status)}</Box>
                        </Box>
                        <Box padding="16px" backgroundColor="#f8f9fa" borderRadius="8px">
                            <Box fontSize="14px" color="#6c757d" marginBottom="4px">{i18n.t('Data Elements')}</Box>
                            <Box fontSize="16px" fontWeight="500">{totalDataElements}</Box>
                        </Box>
                        <Box padding="16px" backgroundColor="#f8f9fa" borderRadius="8px">
                            <Box fontSize="14px" color="#6c757d" marginBottom="4px">{i18n.t('Facilities')}</Box>
                            <Box fontSize="16px" fontWeight="500">{totalOrgUnits}</Box>
                        </Box>
                    </Box>

                    {/* Period Configuration Details */}
                    {assessment.period && assessment.frequency && (
                        <Box marginTop="16px" padding="16px" backgroundColor="#e8f4fd" borderRadius="8px" border="1px solid #bee5eb">
                            <Box fontSize="16px" fontWeight="500" marginBottom="12px" color="#0c5460">
                                📊 {i18n.t('Period Configuration')}
                            </Box>
                            <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap="16px" fontSize="14px">
                                <Box>
                                    <Box color="#6c757d" marginBottom="4px">{i18n.t('Assessment Period')}</Box>
                                    <Box fontWeight="500">{assessment.period}</Box>
                                </Box>
                                <Box>
                                    <Box color="#6c757d" marginBottom="4px">{i18n.t('Frequency')}</Box>
                                    <Box fontWeight="500">{assessment.frequency}</Box>
                                </Box>
                                <Box>
                                    <Box color="#6c757d" marginBottom="4px">{i18n.t('Dataset Period Type')}</Box>
                                    <Box fontWeight="500">{i18n.t('From Original DHIS2')}</Box>
                                </Box>
                            </Box>
                            
                            {(() => {
                                // Get actual dataset period types from the assessment's datasets
                                const datasetPeriodTypes = assessment.dataSets ? getDatasetPeriodTypes(assessment.dataSets) : []
                                const hasDatasets = datasetPeriodTypes.length > 0
                                
                                if (hasDatasets) {
                                    return (
                                        <Box marginTop="12px">
                                            <Box fontSize="14px" color="#6c757d" marginBottom="8px">
                                                {i18n.t('Multi-Period Data Entry Configuration')}:
                                            </Box>
                                            {datasetPeriodTypes.map(periodType => {
                                                const needsMultiPeriod = needsMultiPeriodEntry(assessment.frequency, periodType)
                                                const periods = needsMultiPeriod ? calculateSubPeriods(assessment.period, assessment.frequency, periodType) : []
                                                
                                                if (needsMultiPeriod && periods.length > 1) {
                                                    return (
                                                        <Box key={periodType} marginBottom="8px">
                                                            <Box fontSize="13px" color="#495057" marginBottom="4px">
                                                                <strong>{periodType} datasets</strong> ({periods.length} periods):
                                                            </Box>
                                                            <Box display="flex" flexWrap="wrap" gap="4px">
                                                                {periods.slice(0, 8).map(p => (
                                                                    <Box key={p.id} 
                                                                        backgroundColor="#007bff" 
                                                                        color="white" 
                                                                        padding="3px 6px" 
                                                                        borderRadius="3px"
                                                                        fontSize="11px"
                                                                        fontWeight="500"
                                                                    >
                                                                        {p.displayName}
                                                                    </Box>
                                                                ))}
                                                                {periods.length > 8 && (
                                                                    <Box 
                                                                        color="#6c757d" 
                                                                        fontSize="11px"
                                                                        alignSelf="center"
                                                                        fontStyle="italic"
                                                                    >
                                                                        +{periods.length - 8} more
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    )
                                                } else {
                                                    return (
                                                        <Box key={periodType} fontSize="13px" color="#495057" marginBottom="4px">
                                                            <strong>{periodType} datasets</strong>: Single period ({assessment.period})
                                                        </Box>
                                                    )
                                                }
                                            })}
                                        </Box>
                                    )
                                } else {
                                    return (
                                        <Box marginTop="12px" fontSize="13px" color="#6c757d">
                                            {i18n.t('Period configuration will be determined by dataset period types')}
                                        </Box>
                                    )
                                }
                            })()}
                        </Box>
                    )}
                </Box>

                {/* Datasets Section */}
                <Box marginBottom="24px">
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '500' }}>
                        {i18n.t('Datasets')}
                    </h3>
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap="16px">
                        {datasetTypes.map(type => {
                            const dataset = assessment.datasets?.[type.key]
                            const isCreated = dataset && dataset.id
                            
                            return (
                                <Box key={type.key} 
                                    padding="16px" 
                                    borderRadius="8px"
                                    border={`2px solid ${isCreated ? type.color : '#e0e0e0'}`}
                                    backgroundColor={isCreated ? `${type.color}10` : '#f8f9fa'}
                                >
                                    <Box display="flex" alignItems="center" gap="8px" marginBottom="8px">
                                        <span style={{ fontSize: '20px' }}>{type.icon}</span>
                                        <Box fontSize="16px" fontWeight="500" color={isCreated ? type.color : '#6c757d'}>
                                            {type.label}
                                        </Box>
                                        {isCreated && (
                                            <Box 
                                                backgroundColor={type.color} 
                                                color="white" 
                                                borderRadius="12px" 
                                                padding="2px 8px"
                                                fontSize="12px"
                                                fontWeight="bold"
                                            >
                                                ✓ Created
                                            </Box>
                                        )}
                                    </Box>
                                    {isCreated ? (
                                        <Box>
                                            <Box fontSize="14px" color="#6c757d" marginBottom="2px">ID:</Box>
                                            <Box fontSize="12px" fontFamily="monospace" color="#495057">{dataset.id}</Box>
                                            <Box fontSize="14px" color="#6c757d" marginTop="8px" marginBottom="2px">Name:</Box>
                                            <Box fontSize="12px" color="#495057">{dataset.name}</Box>
                                        </Box>
                                    ) : (
                                        <Box fontSize="12px" color="#6c757d" fontStyle="italic">
                                            {i18n.t('Not created yet')}
                                        </Box>
                                    )}
                                </Box>
                            )
                        })}
                    </Box>
                </Box>

                {/* Data Elements Preview */}
                {assessment.dataElements && assessment.dataElements.length > 0 && (
                    <Box marginBottom="24px">
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '500' }}>
                            {i18n.t('Data Elements')} ({assessment.dataElements.length})
                        </h3>
                        <Box maxHeight="200px" overflow="auto" border="1px solid #e0e0e0" borderRadius="4px">
                            {assessment.dataElements.slice(0, 10).map((de, index) => (
                                <Box key={de.id || index} 
                                    padding="8px 12px" 
                                    borderBottom={index < Math.min(assessment.dataElements.length, 10) - 1 ? "1px solid #f0f0f0" : "none"}
                                >
                                    <Box fontSize="14px" fontWeight="500">{de.displayName || de.name}</Box>
                                    <Box fontSize="12px" color="#6c757d">{de.valueType} • {de.id}</Box>
                                </Box>
                            ))}
                            {assessment.dataElements.length > 10 && (
                                <Box padding="8px 12px" fontSize="12px" color="#6c757d" fontStyle="italic">
                                    {i18n.t('... and {{count}} more', { count: assessment.dataElements.length - 10 })}
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                <Box textAlign="right">
                    <Button onClick={onClose}>{i18n.t('Close')}</Button>
                </Box>
            </Box>
        </Box>
    )
}

const exportDQReportCSV = (assessment, dqResults) => {
    if (!assessment || !dqResults) return
    const headers = ['Data Element', 'Register', 'Summary', 'Reported', 'Correction', 'Discrepancy']
    const rows = dqResults.map(row => [row.name, row.reg, row.sum, row.rep, row.cor, row.discrepancy ? 'Yes' : 'No'])
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `${assessment.name.replace(/\s+/g, '_')}_DQ_Report.csv`)
}

const ExportDQReport = (assessment) => {
    // Placeholder: implement export logic (CSV, PDF, etc.)
    // For now, just alert
    alert(i18n.t('Exporting DQ report for: {{name}}', { name: assessment.name }))
}

export const AssessmentWizard = ({ onClose, onAssessmentCreated }) => {
    const engine = useDataEngine()
    const { createAssessment } = useDhis2Service()
    const [step, setStep] = useState(0)
    const [metadataSource, setMetadataSource] = useState(null) // 'dhis2' or 'manual'
    const [manualMetadata, setManualMetadata] = useState(null)
    const [dhis2Config, setDhis2Config] = useState(null)
    const [selectedDataSets, setSelectedDataSets] = useState([])
    const [selectedDataElements, setSelectedDataElements] = useState([])
    const [selectedOrgUnits, setSelectedOrgUnits] = useState([])
    const [orgUnitMappings, setOrgUnitMappings] = useState([])
    const [assessmentName, setAssessmentName] = useState('')
    const [period, setPeriod] = useState('')
    const [frequency, setFrequency] = useState('monthly')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)



    const getStepsForSource = (source) => {
        // Always start with Assessment Details that includes metadata source selection
        const baseSteps = [
            {
                title: i18n.t('Assessment Details'),
                content: (
                    <div style={{ padding: '20px' }}>
                        <h2 style={{ color: 'red', marginBottom: '20px' }}>DEBUG: Assessment Details Step is Rendering!</h2>
                        
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '500' }}>
                                {i18n.t('Basic Information')}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                        {i18n.t('Assessment Name')} *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={i18n.t('Enter assessment name')}
                                        value={assessmentName}
                                        onChange={e => setAssessmentName(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '12px', 
                                            borderRadius: '4px', 
                                            border: '1px solid #ccc', 
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                            {i18n.t('Period')} *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={i18n.t('e.g. 2024Q4, 202412, 2024')}
                                            value={period}
                                            onChange={e => setPeriod(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px', 
                                                borderRadius: '4px', 
                                                border: '1px solid #ccc', 
                                                fontSize: '14px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                            {i18n.t('Frequency')} *
                                        </label>
                                        <select
                                            value={frequency}
                                            onChange={e => setFrequency(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px', 
                                                borderRadius: '4px', 
                                                border: '1px solid #ccc', 
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                backgroundColor: 'white'
                                            }}
                                        >
                                            <option value="daily">{i18n.t('Daily')}</option>
                                            <option value="weekly">{i18n.t('Weekly')}</option>
                                            <option value="monthly">{i18n.t('Monthly')}</option>
                                            <option value="quarterly">{i18n.t('Quarterly')}</option>
                                            <option value="annually">{i18n.t('Annually')}</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Period Information */}
                                {period && frequency && (
                                    <div style={{ 
                                        padding: '12px', 
                                        backgroundColor: '#e8f4fd', 
                                        borderRadius: '4px', 
                                        border: '1px solid #bee5eb',
                                        marginTop: '8px'
                                    }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#0c5460' }}>
                                            📊 {i18n.t('Period Configuration')}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#495057', lineHeight: '1.4' }}>
                                            <div><strong>{i18n.t('Assessment Period')}:</strong> {period}</div>
                                            <div><strong>{i18n.t('Assessment Frequency')}:</strong> {frequency}</div>
                                            <div><strong>{i18n.t('Note')}:</strong> Dataset period types will match original DHIS2 configuration</div>
                                            {(() => {
                                                // Get actual dataset period types if datasets are selected
                                                const datasetPeriodTypes = getDatasetPeriodTypes(selectedDataSets)
                                                const hasDatasets = datasetPeriodTypes.length > 0
                                                
                                                if (hasDatasets) {
                                                    // Show multi-period information for each dataset period type
                                                    return (
                                                        <div>
                                                            <div><strong>{i18n.t('Dataset Period Types')}:</strong> {datasetPeriodTypes.join(', ')}</div>
                                                            {datasetPeriodTypes.map(periodType => {
                                                                const needsMultiPeriod = needsMultiPeriodEntry(frequency, periodType)
                                                                const periods = needsMultiPeriod ? calculateSubPeriods(period, frequency, periodType) : []
                                                                
                                                                if (needsMultiPeriod && periods.length > 1) {
                                                                    return (
                                                                        <div key={periodType} style={{ marginTop: '8px', fontSize: '12px' }}>
                                                                            <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                                                                {i18n.t('{{periodType}} datasets will have {{count}} periods', { 
                                                                                    periodType, 
                                                                                    count: periods.length 
                                                                                })}:
                                                                            </div>
                                                                            <div style={{ 
                                                                                display: 'flex', 
                                                                                flexWrap: 'wrap', 
                                                                                gap: '4px',
                                                                                maxHeight: '60px',
                                                                                overflowY: 'auto'
                                                                            }}>
                                                                                {periods.slice(0, 6).map(p => (
                                                                                    <span key={p.id} style={{ 
                                                                                        backgroundColor: '#007bff', 
                                                                                        color: 'white', 
                                                                                        padding: '2px 6px', 
                                                                                        borderRadius: '3px',
                                                                                        fontSize: '11px'
                                                                                    }}>
                                                                                        {p.displayName}
                                                                                    </span>
                                                                                ))}
                                                                                {periods.length > 6 && (
                                                                                    <span style={{ 
                                                                                        color: '#6c757d', 
                                                                                        fontSize: '11px',
                                                                                        alignSelf: 'center'
                                                                                    }}>
                                                                                        +{periods.length - 6} more
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                }
                                                                return null
                                                            })}
                                                        </div>
                                                    )
                                                } else {
                                                    // Fallback when no datasets selected yet
                                                    return (
                                                        <div>
                                                            <div><strong>{i18n.t('Note')}:</strong> Period configuration will be determined by selected datasets</div>
                                                        </div>
                                                    )
                                                }
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div style={{ 
                            marginBottom: '24px', 
                            padding: '20px', 
                            backgroundColor: '#ffcccc', 
                            borderRadius: '8px', 
                            border: '3px solid #ff0000' 
                        }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '700', color: '#ff0000' }}>
                                🚨 {i18n.t('Metadata Source')} * 🚨
                            </h3>
                            <div style={{ fontSize: '16px', color: '#000', marginBottom: '16px', fontWeight: 'bold' }}>
                                {i18n.t('Choose how you want to define the metadata for your assessment')}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'flex-start', 
                                    padding: '16px', 
                                    border: metadataSource === 'dhis2' ? '3px solid #0d7377' : '3px solid #e0e0e0', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    backgroundColor: metadataSource === 'dhis2' ? '#f0f8ff' : 'white',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <input
                                        type="radio"
                                        name="metadataSource"
                                        value="dhis2"
                                        checked={metadataSource === 'dhis2'}
                                        onChange={e => setMetadataSource(e.target.value)}
                                        style={{ marginRight: '12px', marginTop: '2px', transform: 'scale(1.5)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '700', marginBottom: '6px', fontSize: '18px', color: '#212529' }}>
                                            🔗 {i18n.t('Connect to DHIS2 Instance')}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.4' }}>
                                            {i18n.t('Pull metadata from an existing DHIS2 system. Configure connection, select datasets, data elements, and organization units.')}
                                        </div>
                                        {metadataSource === 'dhis2' && (
                                            <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#d1ecf1', borderRadius: '4px', fontSize: '12px', color: '#0c5460' }}>
                                                ✓ {i18n.t('Selected: DHIS2 metadata will be imported')}
                                            </div>
                                        )}
                                    </div>
                                </label>
                                
                                <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'flex-start', 
                                    padding: '16px', 
                                    border: metadataSource === 'manual' ? '3px solid #0d7377' : '3px solid #e0e0e0', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    backgroundColor: metadataSource === 'manual' ? '#f0f8ff' : 'white',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <input
                                        type="radio"
                                        name="metadataSource"
                                        value="manual"
                                        checked={metadataSource === 'manual'}
                                        onChange={e => setMetadataSource(e.target.value)}
                                        style={{ marginRight: '12px', marginTop: '2px', transform: 'scale(1.5)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '700', marginBottom: '6px', fontSize: '18px', color: '#212529' }}>
                                            ✏️ {i18n.t('Create Metadata Manually')}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.4' }}>
                                            {i18n.t('Define custom datasets, data elements, and organization units. Choose data separation strategy and naming conventions.')}
                                        </div>
                                        {metadataSource === 'manual' && (
                                            <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#d1ecf1', borderRadius: '4px', fontSize: '12px', color: '#0c5460' }}>
                                                ✓ {i18n.t('Selected: Custom metadata will be created')}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div style={{ padding: '10px', backgroundColor: '#ffffcc', border: '1px solid #ffcc00', borderRadius: '4px' }}>
                            <strong>Debug Info:</strong><br/>
                            metadataSource: {metadataSource || 'null'}<br/>
                            assessmentName: {assessmentName || 'empty'}<br/>
                            period: {period || 'empty'}
                        </div>
                        
                        {error && (
                            <div style={{ padding: '12px', backgroundColor: '#f8d7da', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
                                <div style={{ color: '#721c24', fontSize: '14px' }}>{error}</div>
                            </div>
                        )}
                    </div>
                )
            }
        ]

        // If no source selected yet, return just the base step
        if (!source) {
            return baseSteps
        }

        if (source === 'dhis2') {
            return [
                ...baseSteps,
                {
                    title: i18n.t('DHIS2 Configuration'),
                    content: <DHIS2Configuration 
                        value={dhis2Config}
                        onChange={setDhis2Config}
                        onNext={() => setStep(2)}
                    />
                },
                {
                    title: i18n.t('Select Data Sets'),
                    content: <DataSetManagement dhis2Config={dhis2Config} value={selectedDataSets} onChange={setSelectedDataSets} onNext={() => setStep(3)} />
                },
                {
                    title: i18n.t('Select Data Elements'),
                    content: <DataElementManagement dataSets={selectedDataSets} value={selectedDataElements} onChange={setSelectedDataElements} />
                },
                {
                    title: i18n.t('Select Organisation Units'),
                    content: <OrganisationUnitManagement dataSets={selectedDataSets} value={selectedOrgUnits} onChange={setSelectedOrgUnits} dhis2Config={dhis2Config} metadataSource={metadataSource} />
                },
                {
                    title: i18n.t('Map Organisation Units'),
                    content: <OrganizationUnitMapping 
                        dhis2Config={dhis2Config} 
                        selectedOrgUnits={selectedOrgUnits} 
                        value={orgUnitMappings} 
                        onChange={setOrgUnitMappings}
                        onNext={() => setStep(6)}
                    />
                },
                {
                    title: i18n.t('Dataset Preparation'),
                    content: <DatasetPreparation 
                        dhis2Config={dhis2Config}
                        selectedDataSets={selectedDataSets}
                        selectedDataElements={selectedDataElements}
                        selectedOrgUnits={selectedOrgUnits}
                        orgUnitMappings={orgUnitMappings}
                        assessmentName={assessmentName}
                        period={period}
                        frequency={frequency}
                        onSave={(data) => console.log('Metadata saved:', data)}
                        onFinish={async (data) => {
                            console.log('Datasets created:', data)
                            
                            // Update the assessment with the created datasets
                            const updatedAssessment = {
                                id: `${assessmentName.replace(/\s+/g, '_')}_${period}`,
                                name: assessmentName,
                                period,
                                frequency,
                                status: 'active', // Mark as active since datasets are created
                                metadataSource,
                                dhis2Config: metadataSource === 'dhis2' ? dhis2Config : null,
                                manualMetadata: metadataSource === 'manual' ? manualMetadata : null,
                                dataSets: selectedDataSets,
                                dataElements: selectedDataElements,
                                orgUnits: selectedOrgUnits,
                                orgUnitMappings: metadataSource === 'dhis2' ? orgUnitMappings : [],
                                created: new Date().toISOString(),
                                datasets: data.datasets || {}, // Store all 4 created datasets
                                datasetDataElements: data.dataElements || {}
                            }
                            
                            try {
                                await saveAssessment(updatedAssessment)
                                console.log('Assessment saved with datasets:', updatedAssessment)
                                onAssessmentCreated && onAssessmentCreated(updatedAssessment)
                            } catch (error) {
                                console.error('Error saving assessment:', error)
                            }
                            
                            onClose()
                        }}
                    />
                },
                {
                    title: i18n.t('Assessment Template'),
                    content: <AssessmentTemplates dataSets={selectedDataSets} dataElements={selectedDataElements} orgUnits={selectedOrgUnits} />
                }
            ]
        } else {
            // Manual metadata workflow - simplified steps
            return [
                ...baseSteps,
                {
                    title: i18n.t('Create Metadata'),
                    content: <ManualMetadataCreation 
                        onMetadataCreated={(metadata) => {
                            setManualMetadata(metadata)
                            setSelectedDataSets(metadata.datasets || [])
                            setSelectedDataElements(metadata.dataElements || [])
                            setSelectedOrgUnits(metadata.orgUnits || [])
                        }}
                        onNext={() => setStep(2)}
                    />
                },
                {
                    title: i18n.t('Assessment Template'),
                    content: <AssessmentTemplates dataSets={selectedDataSets} dataElements={selectedDataElements} orgUnits={selectedOrgUnits} />
                }
            ]
        }
    }

    const steps = getStepsForSource(metadataSource)

    const handleFinish = async () => {
        setSaving(true)
        setError(null)
        try {
            // Compose assessment object with all relevant attributes
            const assessment = {
                id: `${assessmentName.replace(/\s+/g, '_')}_${period}`,
                name: assessmentName,
                period,
                frequency, // Add frequency to the assessment
                status: 'draft',
                metadataSource, // Track the source of metadata
                dhis2Config: metadataSource === 'dhis2' ? dhis2Config : null,
                manualMetadata: metadataSource === 'manual' ? manualMetadata : null,
                dataSets: selectedDataSets,
                dataElements: selectedDataElements,
                orgUnits: selectedOrgUnits,
                orgUnitMappings: metadataSource === 'dhis2' ? orgUnitMappings : [],
                created: new Date().toISOString(),
                // Add placeholder for the 4 datasets that will be created
                datasets: {
                    register: null,
                    summary: null,
                    reported: null,
                    correction: null
                },
                // Add more attributes as needed
            }
            
            // Save assessment to metadata datastore
            await saveAssessment(assessment)
            
            if (metadataSource === 'dhis2') {
                await createAssessment(assessment)
            } else {
                // For manual metadata, we don't need to create in DHIS2
                // Just store locally or handle differently
                console.log('Manual assessment created:', assessment)
            }
            
            onAssessmentCreated && onAssessmentCreated(assessment)
            onClose()
        } catch (e) {
            setError(i18n.t('Failed to create assessment: {{error}}', { error: e.message || '' }))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <Box padding="32px">
                <Box marginBottom="24px">
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#212934' }}>
                        {steps && steps[step] ? steps[step].title : i18n.t('Loading...')}
                    </h2>
                    <Box marginTop="8px" padding="8px 16px" backgroundColor="#f8f9fa" borderRadius="4px">
                        <span style={{ fontSize: '14px', color: '#6c757d' }}>
                            {steps ? i18n.t('Step {{current}} of {{total}}', { current: step + 1, total: steps.length }) : ''}
                        </span>
                    </Box>
                </Box>
                <Box marginBottom="32px" minHeight="400px">
                    {steps && steps[step] ? steps[step].content : (
                        <Box>
                            <div>{i18n.t('Loading...')}</div>
                            <div>Debug: step={step}, steps.length={steps?.length}, metadataSource={metadataSource}</div>
                        </Box>
                    )}
                </Box>
                <ButtonStrip>
                    <Button disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>
                        {i18n.t('Back')}
                    </Button>
                    {/* Handle navigation based on current step and metadata source */}
                    {(() => {
                        if (!steps || !steps[step]) {
                            return null
                        }
                        
                        const currentStepTitle = steps[step]?.title
                        
                        // Steps that handle their own navigation
                        if (currentStepTitle === i18n.t('Map Organisation Units') || 
                            currentStepTitle === i18n.t('Dataset Preparation')) {
                            return null
                        }
                        
                        // Last step - show finish button
                        if (step === steps.length - 1) {
                            return (
                                <Button primary loading={saving} onClick={handleFinish}>
                                    {i18n.t('Finish')}
                                </Button>
                            )
                        }
                        
                        // Regular next button - but check if required fields are filled for first step
                        if (step === 0) {
                            const isFirstStepValid = assessmentName.trim() && period.trim() && metadataSource
                            return (
                                <Button primary disabled={!isFirstStepValid}>
                                    {!assessmentName.trim() ? i18n.t('Enter Assessment Name') :
                                     !period.trim() ? i18n.t('Enter Period') :
                                     !metadataSource ? i18n.t('Select Metadata Source') :
                                     i18n.t('Next')}
                                </Button>
                            )
                        }
                        
                        return (
                            <Button primary disabled={saving} onClick={() => setStep(step + 1)}>
                                {i18n.t('Next')}
                            </Button>
                        )
                    })()}
                    <Button disabled={saving} onClick={onClose}>
                        {i18n.t('Cancel')}
                    </Button>
                </ButtonStrip>
            </Box>
        </Card>
    )
}

const mockAssessments = [
    {
        id: '1',
        name: 'Q4 2024 DQA Assessment',
        status: 'active',
        period: '2024Q4',
        facilities: 45,
        discrepancies: 23,
        createdDate: '2024-01-15'
    },
    {
        id: '2',
        name: 'Q3 2024 DQA Assessment',
        status: 'completed',
        period: '2024Q3',
        facilities: 42,
        discrepancies: 18,
        createdDate: '2024-01-01'
    },
    {
        id: '3',
        name: 'Q2 2024 DQA Assessment',
        status: 'draft',
        period: '2024Q2',
        facilities: 38,
        discrepancies: 0,
        createdDate: '2023-12-20'
    }
]

const getStatusTag = (status) => {
    const statusConfig = {
        active: { color: 'positive', text: i18n.t('Active') },
        completed: { color: 'neutral', text: i18n.t('Completed') },
        draft: { color: 'default', text: i18n.t('Draft') }
    }
    return <Tag positive={status === 'active'} neutral={status === 'completed'}>{statusConfig[status]?.text || status}</Tag>
}

const renderDatasetTags = (assessment) => {
    const datasetTypes = [
        { key: 'register', label: 'Register', color: '#2196f3', icon: '📝' },
        { key: 'summary', label: 'Summary', color: '#4caf50', icon: '📊' },
        { key: 'reported', label: 'Reported', color: '#ff9800', icon: '📋' },
        { key: 'correction', label: 'Correction', color: '#9c27b0', icon: '✏️' }
    ]

    if (!assessment.datasets) {
        return (
            <div style={{ fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
                {i18n.t('Datasets not created yet')}
            </div>
        )
    }

    return datasetTypes.map(type => {
        const dataset = assessment.datasets[type.key]
        const isCreated = dataset && dataset.id
        
        return (
            <div key={type.key} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '2px 6px',
                borderRadius: '12px',
                backgroundColor: isCreated ? `${type.color}15` : '#f5f5f5',
                border: `1px solid ${isCreated ? type.color : '#e0e0e0'}`,
                fontSize: '11px',
                color: isCreated ? type.color : '#999'
            }}>
                <span>{type.icon}</span>
                <span style={{ fontWeight: '500' }}>{type.label}</span>
                {isCreated && (
                    <span style={{ 
                        backgroundColor: type.color, 
                        color: 'white', 
                        borderRadius: '8px', 
                        padding: '1px 4px',
                        fontSize: '9px',
                        fontWeight: 'bold'
                    }}>
                        ✓
                    </span>
                )}
            </div>
        )
    })
}

const DQModal = ({ assessment, onClose }) => {
    const { getDataValues, saveAssessment } = useDhis2Service()
    const [registerData, setRegisterData] = useState(assessment.registerData || {})
    const [summaryData, setSummaryData] = useState(assessment.summaryData || {})
    const [correctionData, setCorrectionData] = useState(assessment.correctionData || {})
    const [reportedData, setReportedData] = useState(assessment.reportedData || {})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [dqResults, setDqResults] = useState([])
    const [saving, setSaving] = useState(false)
    const [selectedPeriod, setSelectedPeriod] = useState(null)
    const [availablePeriods, setAvailablePeriods] = useState([])

    // Calculate available periods for data entry
    React.useEffect(() => {
        if (assessment.period && assessment.frequency) {
            const datasetPeriodType = getPeriodTypeFromFrequency(assessment.frequency)
            const periods = calculateSubPeriods(assessment.period, assessment.frequency, datasetPeriodType)
            setAvailablePeriods(periods)
            setSelectedPeriod(periods[0]) // Select first period by default
            
            console.log('DQModal - Available periods:', {
                assessmentPeriod: assessment.period,
                assessmentFrequency: assessment.frequency,
                datasetPeriodType,
                calculatedPeriods: periods,
                needsSubPeriods: needsSubPeriods(assessment.frequency, datasetPeriodType)
            })
        } else {
            // Fallback to original period if frequency not available
            const fallbackPeriod = {
                id: assessment.period,
                name: assessment.period,
                displayName: assessment.period,
                periodType: 'Monthly'
            }
            setAvailablePeriods([fallbackPeriod])
            setSelectedPeriod(fallbackPeriod)
        }
    }, [assessment.period, assessment.frequency])

    // Load reported data from DHIS2 for selected period
    React.useEffect(() => {
        const fetchReported = async () => {
            if (!selectedPeriod) return
            
            setLoading(true)
            setError(null)
            try {
                const res = await getDataValues({
                    dataSet: assessment.dataSets?.[0]?.id || assessment.dataSet?.id, // Support both old and new format
                    orgUnit: assessment.orgUnits?.[0]?.id, // For demo, use first org unit
                    period: selectedPeriod.id
                })
                setReportedData(res.dataValues || {})
            } catch (e) {
                setError(i18n.t('Failed to load reported data for period {{period}}', { period: selectedPeriod.displayName }))
            } finally {
                setLoading(false)
            }
        }
        if ((assessment.dataSets?.length > 0 || assessment.dataSet) && assessment.orgUnits && selectedPeriod) {
            fetchReported()
        }
    }, [assessment, selectedPeriod])

    // DQ Engine: Compare datasets
    const compareData = () => {
        const elements = assessment.dataElements || []
        const results = elements.map(el => {
            const id = el.id
            const reg = registerData[id] || ''
            const sum = summaryData[id] || ''
            const rep = reportedData[id] || ''
            const cor = correctionData[id] || ''
            const discrepancy = reg !== sum || sum !== rep || reg !== rep || cor !== rep
            return { id, name: el.displayName, reg, sum, rep, cor, discrepancy }
        })
        setDqResults(results)
    }

    React.useEffect(() => {
        compareData()
    }, [registerData, summaryData, reportedData, correctionData, assessment])

    // Notification logic
    const notifyFacility = async (results) => {
        // Example: get facility contact from orgUnits or assessment
        const facility = assessment.orgUnits?.[0]
        const contact = facility?.contact || facility?.phone || '' // Extend as needed
        const chatId = facility?.telegramChatId || ''
        const hasDiscrepancy = results.some(r => r.discrepancy)
        const message = hasDiscrepancy
            ? `${assessment.name}: Discrepancies detected in your data. Please review and correct.`
            : `${assessment.name}: Congratulations! No discrepancies found. Keep up the good work!`
        // Send to all enabled channels
        if (contact) await notificationService.notify({ channel: NotificationChannels.SMS, to: contact, message })
        if (contact) await notificationService.notify({ channel: NotificationChannels.WHATSAPP, to: contact, message })
        if (chatId) await notificationService.notify({ channel: NotificationChannels.TELEGRAM, to: chatId, message })
    }

    // Save corrections
    const handleSaveCorrection = async () => {
        setSaving(true)
        try {
            await saveAssessment({ ...assessment, correctionData })
            onClose()
        } finally {
            setSaving(false)
        }
    }

    return (
        <Box position="fixed" top={0} left={0} width="100vw" height="100vh" bgcolor="rgba(0,0,0,0.5)" zIndex={3000} display="flex" alignItems="center" justifyContent="center" padding="24px">
            <Box width="1000px" maxWidth="95vw" maxHeight="90vh" bgcolor="#fff" borderRadius="8px" boxShadow="0 4px 12px rgba(0,0,0,0.15)" padding="32px" overflow="auto">
                <Box marginBottom="24px">
                    <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom="16px">
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#212934' }}>
                            {assessment.name} - {i18n.t('Data Quality Check')}
                        </h2>
                        {availablePeriods.length > 1 && (
                            <Box display="flex" alignItems="center" gap="8px">
                                <span style={{ fontSize: '14px', color: '#6c757d' }}>
                                    {i18n.t('Period')}:
                                </span>
                                <select 
                                    value={selectedPeriod?.id || ''} 
                                    onChange={(e) => {
                                        const period = availablePeriods.find(p => p.id === e.target.value)
                                        setSelectedPeriod(period)
                                    }}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #d0d0d0',
                                        fontSize: '14px'
                                    }}
                                >
                                    {availablePeriods.map(period => (
                                        <option key={period.id} value={period.id}>
                                            {period.displayName}
                                        </option>
                                    ))}
                                </select>
                            </Box>
                        )}
                    </Box>
                    
                    {/* Period Information */}
                    <Box padding="12px" backgroundColor="#f8f9fa" borderRadius="4px" marginBottom="16px">
                        <Box display="flex" alignItems="center" gap="16px" fontSize="14px">
                            <Box>
                                <span style={{ color: '#6c757d' }}>{i18n.t('Assessment Period')}: </span>
                                <span style={{ fontWeight: '500' }}>{assessment.period}</span>
                            </Box>
                            <Box>
                                <span style={{ color: '#6c757d' }}>{i18n.t('Current Data Period')}: </span>
                                <span style={{ fontWeight: '500' }}>{selectedPeriod?.displayName || assessment.period}</span>
                            </Box>
                            <Box>
                                <span style={{ color: '#6c757d' }}>{i18n.t('Period Type')}: </span>
                                <span style={{ fontWeight: '500' }}>{getPeriodTypeDisplayName(selectedPeriod?.periodType || 'Monthly')}</span>
                            </Box>
                            {availablePeriods.length > 1 && (
                                <Box>
                                    <span style={{ color: '#6c757d' }}>{i18n.t('Available Periods')}: </span>
                                    <span style={{ fontWeight: '500' }}>{availablePeriods.length}</span>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
                {loading ? <Box>{i18n.t('Loading...')}</Box> : null}
                {error ? <Box color="critical">{error}</Box> : null}
                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('Data Element')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Register')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Summary')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Reported')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Correction')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Discrepancy')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {dqResults.map(row => (
                            <DataTableRow key={row.id}>
                                <DataTableCell>{row.name}</DataTableCell>
                                <DataTableCell>
                                    <input type="number" value={row.reg} onChange={e => setRegisterData(d => ({ ...d, [row.id]: e.target.value }))} style={{ width: 60 }} />
                                </DataTableCell>
                                <DataTableCell>
                                    <input type="number" value={row.sum} onChange={e => setSummaryData(d => ({ ...d, [row.id]: e.target.value }))} style={{ width: 60 }} />
                                </DataTableCell>
                                <DataTableCell>{row.rep}</DataTableCell>
                                <DataTableCell>
                                    <input type="number" value={row.cor} onChange={e => setCorrectionData(d => ({ ...d, [row.id]: e.target.value }))} style={{ width: 60 }} />
                                </DataTableCell>
                                <DataTableCell>{row.discrepancy ? i18n.t('Yes') : i18n.t('No')}</DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
                <Box marginTop="24px">
                    <ButtonStrip>
                        <Button primary loading={saving} onClick={handleSaveCorrection}>
                            {i18n.t('Save Corrections')}
                        </Button>
                        <Button onClick={() => exportDQReportCSV(assessment, dqResults)}>
                            {i18n.t('Export CSV')}
                        </Button>
                        <Button onClick={onClose}>
                            {i18n.t('Close')}
                        </Button>
                    </ButtonStrip>
                </Box>
            </Box>
        </Box>
    )
}

const ManageAssessments = () => {
    const { getAssessments, deleteAssessment, saveAssessment } = useAssessmentDataStore()
    const [showWizard, setShowWizard] = useState(false)
    const [assessments, setAssessments] = useState([])
    const [loading, setLoading] = useState(true)
    const [dqAssessment, setDqAssessment] = useState(null)
    const [dqSummaryAssessment, setDqSummaryAssessment] = useState(null)

    React.useEffect(() => {
        const fetchAssessments = async () => {
            setLoading(true)
            try {
                const data = await getAssessments()
                setAssessments(Array.isArray(data) ? data : Object.values(data))
                console.log('Assessments loaded from dataStore:', data)
            } catch (error) {
                console.error('Error fetching assessments from dataStore:', error)
                setAssessments([])
            } finally {
                setLoading(false)
            }
        }
        fetchAssessments()
    }, [showWizard])

    const handleAssessmentCreated = async (assessment) => {
        // Refresh the assessments list from datastore to get the latest data
        try {
            const data = await loadAllAssessments()
            setAssessments(Array.isArray(data) ? data : Object.values(data))
            console.log('Assessments refreshed after creation:', data)
        } catch (error) {
            console.error('Error refreshing assessments:', error)
            // Fallback to adding the assessment to the current list
            setAssessments(prev => [...prev, assessment])
        }
    }

    const handleDeleteAssessment = async (assessmentId) => {
        try {
            await deleteAssessment(assessmentId)
            setAssessments(prev => prev.filter(assessment => assessment.id !== assessmentId))
            console.log('Assessment deleted successfully')
        } catch (error) {
            console.error('Error deleting assessment:', error)
        }
    }

    return (
        <Box padding="24px" maxWidth="1200px" margin="0 auto">
            <Box marginBottom="24px" display="flex" alignItems="center" justifyContent="space-between">
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '500', color: '#212934' }}>{i18n.t('Manage Assessments')}</h1>
                <Button primary onClick={() => setShowWizard(true)}>{i18n.t('Add Assessment')}</Button>
            </Box>
            <Card>
                {loading ? (
                    <Box padding="24px" textAlign="center">
                        <Box marginBottom="16px">{i18n.t('Loading assessments...')}</Box>
                    </Box>
                ) : assessments.length === 0 ? (
                    <Box padding="48px" textAlign="center">
                        <Box marginBottom="16px" fontSize="18px" color="#6c757d">
                            {i18n.t('No assessments found')}
                        </Box>
                        <Box color="#6c757d">
                            {i18n.t('Click "Add Assessment" to create your first assessment')}
                        </Box>
                    </Box>
                ) : (
                    <Box padding="16px">
                        <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Period')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Datasets')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Data Elements')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Facilities')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Created')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {assessments.map(assessment => (
                                <DataTableRow key={assessment.id}>
                                    <DataTableCell>
                                        <Box>
                                            <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                                {assessment.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                                {assessment.metadataSource === 'dhis2' ? '🔗 DHIS2' : '✏️ Manual'}
                                            </div>
                                        </Box>
                                    </DataTableCell>
                                    <DataTableCell>{getStatusTag(assessment.status)}</DataTableCell>
                                    <DataTableCell>{assessment.period}</DataTableCell>
                                    <DataTableCell>
                                        <Box display="flex" flexDirection="column" gap="4px">
                                            {renderDatasetTags(assessment)}
                                        </Box>
                                    </DataTableCell>
                                    <DataTableCell>{assessment.dataElements?.length || '-'}</DataTableCell>
                                    <DataTableCell>{assessment.orgUnits?.length || '-'}</DataTableCell>
                                    <DataTableCell>{assessment.created ? assessment.created.split('T')[0] : '-'}</DataTableCell>
                                    <DataTableCell>
                                        <ButtonStrip>
                                            <Button small onClick={() => setDqSummaryAssessment(assessment)}>
                                                {i18n.t('View')}
                                            </Button>
                                            <Button small onClick={() => setDqAssessment(assessment)}>
                                                {i18n.t('DQ Check')}
                                            </Button>
                                            <Button small destructive onClick={() => handleDeleteAssessment(assessment.id)}>
                                                {i18n.t('Delete')}
                                            </Button>
                                        </ButtonStrip>
                                    </DataTableCell>
                                </DataTableRow>
                            ))}
                        </DataTableBody>
                        </DataTable>
                    </Box>
                )}
            </Card>
            {showWizard && (
                <Box position="fixed" top={0} left={0} width="100vw" height="100vh" bgcolor="rgba(0,0,0,0.5)" zIndex={2000} display="flex" alignItems="center" justifyContent="center" padding="24px">
                    <Box width="800px" maxWidth="95vw" maxHeight="90vh" overflow="auto">
                        <AssessmentWizard onClose={() => setShowWizard(false)} onAssessmentCreated={handleAssessmentCreated} />
                    </Box>
                </Box>
            )}
            {dqAssessment && <DQModal assessment={dqAssessment} onClose={() => setDqAssessment(null)} />}
            {dqSummaryAssessment && <DQSummaryModal assessment={dqSummaryAssessment} onClose={() => setDqSummaryAssessment(null)} />}
        </Box>
    )
}

export { ManageAssessments }
