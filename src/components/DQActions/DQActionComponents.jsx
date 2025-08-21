import React, { useState } from 'react'
import { 
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    ButtonStrip,
    Box,
    NoticeBox,
    CircularLoader,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    Tag,
    Card,
    LinearLoader
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

// Data Quality Check Modal
export const DataQualityCheckModal = ({ assessment, isOpen, onClose }) => {
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)

    const runDataQualityCheck = async () => {
        setLoading(true)
        try {
            // Simulate DQ check process
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Mock results
            setResults({
                totalRecords: 1250,
                validRecords: 1180,
                invalidRecords: 70,
                completeness: 94.4,
                accuracy: 96.2,
                consistency: 91.8,
                timeliness: 88.5,
                issues: [
                    { type: 'Missing Values', count: 35, severity: 'medium' },
                    { type: 'Outliers', count: 18, severity: 'high' },
                    { type: 'Duplicates', count: 12, severity: 'low' },
                    { type: 'Format Errors', count: 5, severity: 'high' }
                ]
            })
        } catch (error) {
            console.error('DQ Check failed:', error)
        } finally {
            setLoading(false)
        }
    }

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return 'negative'
            case 'medium': return 'neutral'
            case 'low': return 'positive'
            default: return 'default'
        }
    }

    if (!isOpen) return null

    return (
        <Modal large position="middle">
            <ModalTitle>
                {i18n.t('Data Quality Check - {{name}}', { name: assessment?.name })}
            </ModalTitle>
            <ModalContent>
                <Box>
                    {!results && !loading && (
                        <Box>
                            <NoticeBox title={i18n.t('Data Quality Assessment')}>
                                {i18n.t('This will analyze the data quality across all datasets in this assessment, checking for completeness, accuracy, consistency, and timeliness.')}
                            </NoticeBox>
                            <Box marginTop="16px">
                                <Button primary onClick={runDataQualityCheck}>
                                    {i18n.t('Run Data Quality Check')}
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {loading && (
                        <Box textAlign="center" padding="32px">
                            <CircularLoader />
                            <Box marginTop="16px">
                                <p>{i18n.t('Analyzing data quality...')}</p>
                                <LinearLoader />
                            </Box>
                        </Box>
                    )}

                    {results && (
                        <Box>
                            <Box marginBottom="24px">
                                <h3>{i18n.t('Data Quality Summary')}</h3>
                                <Box display="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <Card>
                                        <Box padding="16px" textAlign="center">
                                            <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>{results.completeness}%</h4>
                                            <p style={{ margin: 0, fontSize: '14px' }}>{i18n.t('Completeness')}</p>
                                        </Box>
                                    </Card>
                                    <Card>
                                        <Box padding="16px" textAlign="center">
                                            <h4 style={{ margin: '0 0 8px 0', color: '#388e3c' }}>{results.accuracy}%</h4>
                                            <p style={{ margin: 0, fontSize: '14px' }}>{i18n.t('Accuracy')}</p>
                                        </Box>
                                    </Card>
                                    <Card>
                                        <Box padding="16px" textAlign="center">
                                            <h4 style={{ margin: '0 0 8px 0', color: '#f57c00' }}>{results.consistency}%</h4>
                                            <p style={{ margin: 0, fontSize: '14px' }}>{i18n.t('Consistency')}</p>
                                        </Box>
                                    </Card>
                                    <Card>
                                        <Box padding="16px" textAlign="center">
                                            <h4 style={{ margin: '0 0 8px 0', color: '#d32f2f' }}>{results.timeliness}%</h4>
                                            <p style={{ margin: 0, fontSize: '14px' }}>{i18n.t('Timeliness')}</p>
                                        </Box>
                                    </Card>
                                </Box>
                            </Box>

                            <Box marginBottom="24px">
                                <h4>{i18n.t('Data Quality Issues')}</h4>
                                <DataTable>
                                    <DataTableHead>
                                        <DataTableRow>
                                            <DataTableColumnHeader>{i18n.t('Issue Type')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Count')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Severity')}</DataTableColumnHeader>
                                        </DataTableRow>
                                    </DataTableHead>
                                    <DataTableBody>
                                        {results.issues.map((issue, index) => (
                                            <DataTableRow key={index}>
                                                <DataTableCell>{issue.type}</DataTableCell>
                                                <DataTableCell>{issue.count}</DataTableCell>
                                                <DataTableCell>
                                                    <Tag 
                                                        positive={getSeverityColor(issue.severity) === 'positive'}
                                                        neutral={getSeverityColor(issue.severity) === 'neutral'}
                                                        negative={getSeverityColor(issue.severity) === 'negative'}
                                                    >
                                                        {issue.severity.toUpperCase()}
                                                    </Tag>
                                                </DataTableCell>
                                            </DataTableRow>
                                        ))}
                                    </DataTableBody>
                                </DataTable>
                            </Box>

                            <NoticeBox title={i18n.t('Recommendations')}>
                                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                    <li>{i18n.t('Review and correct outlier values')}</li>
                                    <li>{i18n.t('Implement data validation rules')}</li>
                                    <li>{i18n.t('Provide training on data entry standards')}</li>
                                    <li>{i18n.t('Set up automated data quality monitoring')}</li>
                                </ul>
                            </NoticeBox>
                        </Box>
                    )}
                </Box>
            </ModalContent>
            <ModalActions>
                <ButtonStrip>
                    <Button secondary onClick={onClose}>
                        {i18n.t('Close')}
                    </Button>
                    {results && (
                        <Button primary onClick={() => console.log('Export DQ report')}>
                            {i18n.t('Export Report')}
                        </Button>
                    )}
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}

// Completeness Analysis Modal
export const CompletenessAnalysisModal = ({ assessment, isOpen, onClose }) => {
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)

    const runCompletenessAnalysis = async () => {
        setLoading(true)
        try {
            await new Promise(resolve => setTimeout(resolve, 1500))
            
            setResults({
                overallCompleteness: 87.3,
                byDataset: [
                    { name: 'Primary Data Collection', completeness: 92.1, expected: 120, actual: 110 },
                    { name: 'Summary Analysis', completeness: 88.5, expected: 120, actual: 106 },
                    { name: 'DHIS2 Comparison', completeness: 85.0, expected: 120, actual: 102 },
                    { name: 'Data Correction', completeness: 83.8, expected: 120, actual: 100 }
                ],
                byPeriod: [
                    { period: '2024-01', completeness: 95.2 },
                    { period: '2024-02', completeness: 91.8 },
                    { period: '2024-03', completeness: 87.3 },
                    { period: '2024-04', completeness: 82.1 }
                ],
                byOrgUnit: [
                    { name: 'District Hospital A', completeness: 96.5 },
                    { name: 'Health Center B', completeness: 89.2 },
                    { name: 'Clinic C', completeness: 78.4 },
                    { name: 'Health Post D', completeness: 85.7 }
                ]
            })
        } catch (error) {
            console.error('Completeness analysis failed:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <Modal large position="middle">
            <ModalTitle>
                {i18n.t('Completeness Analysis - {{name}}', { name: assessment?.name })}
            </ModalTitle>
            <ModalContent>
                <Box>
                    {!results && !loading && (
                        <Box>
                            <NoticeBox title={i18n.t('Completeness Analysis')}>
                                {i18n.t('Analyze data completeness across datasets, time periods, and organization units to identify gaps in data reporting.')}
                            </NoticeBox>
                            <Box marginTop="16px">
                                <Button primary onClick={runCompletenessAnalysis}>
                                    {i18n.t('Run Completeness Analysis')}
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {loading && (
                        <Box textAlign="center" padding="32px">
                            <CircularLoader />
                            <Box marginTop="16px">
                                <p>{i18n.t('Analyzing data completeness...')}</p>
                                <LinearLoader />
                            </Box>
                        </Box>
                    )}

                    {results && (
                        <Box>
                            <Box marginBottom="24px">
                                <Card>
                                    <Box padding="16px" textAlign="center">
                                        <h2 style={{ margin: '0 0 8px 0', color: '#1976d2', fontSize: '36px' }}>
                                            {results.overallCompleteness}%
                                        </h2>
                                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                                            {i18n.t('Overall Completeness')}
                                        </p>
                                    </Box>
                                </Card>
                            </Box>

                            <Box marginBottom="24px">
                                <h4>{i18n.t('Completeness by Dataset')}</h4>
                                <DataTable>
                                    <DataTableHead>
                                        <DataTableRow>
                                            <DataTableColumnHeader>{i18n.t('Dataset')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Expected')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Actual')}</DataTableColumnHeader>
                                            <DataTableColumnHeader>{i18n.t('Completeness')}</DataTableColumnHeader>
                                        </DataTableRow>
                                    </DataTableHead>
                                    <DataTableBody>
                                        {results.byDataset.map((dataset, index) => (
                                            <DataTableRow key={index}>
                                                <DataTableCell>{dataset.name}</DataTableCell>
                                                <DataTableCell>{dataset.expected}</DataTableCell>
                                                <DataTableCell>{dataset.actual}</DataTableCell>
                                                <DataTableCell>
                                                    <Box display="flex" alignItems="center" gap="8px">
                                                        <span>{dataset.completeness}%</span>
                                                        <LinearLoader amount={dataset.completeness} />
                                                    </Box>
                                                </DataTableCell>
                                            </DataTableRow>
                                        ))}
                                    </DataTableBody>
                                </DataTable>
                            </Box>

                            <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <Box>
                                    <h4>{i18n.t('Completeness by Period')}</h4>
                                    <DataTable>
                                        <DataTableHead>
                                            <DataTableRow>
                                                <DataTableColumnHeader>{i18n.t('Period')}</DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Completeness')}</DataTableColumnHeader>
                                            </DataTableRow>
                                        </DataTableHead>
                                        <DataTableBody>
                                            {results.byPeriod.map((period, index) => (
                                                <DataTableRow key={index}>
                                                    <DataTableCell>{period.period}</DataTableCell>
                                                    <DataTableCell>{period.completeness}%</DataTableCell>
                                                </DataTableRow>
                                            ))}
                                        </DataTableBody>
                                    </DataTable>
                                </Box>

                                <Box>
                                    <h4>{i18n.t('Completeness by Organization Unit')}</h4>
                                    <DataTable>
                                        <DataTableHead>
                                            <DataTableRow>
                                                <DataTableColumnHeader>{i18n.t('Organization Unit')}</DataTableColumnHeader>
                                                <DataTableColumnHeader>{i18n.t('Completeness')}</DataTableColumnHeader>
                                            </DataTableRow>
                                        </DataTableHead>
                                        <DataTableBody>
                                            {results.byOrgUnit.map((orgUnit, index) => (
                                                <DataTableRow key={index}>
                                                    <DataTableCell>{orgUnit.name}</DataTableCell>
                                                    <DataTableCell>{orgUnit.completeness}%</DataTableCell>
                                                </DataTableRow>
                                            ))}
                                        </DataTableBody>
                                    </DataTable>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            </ModalContent>
            <ModalActions>
                <ButtonStrip>
                    <Button secondary onClick={onClose}>
                        {i18n.t('Close')}
                    </Button>
                    {results && (
                        <Button primary onClick={() => console.log('Export completeness report')}>
                            {i18n.t('Export Report')}
                        </Button>
                    )}
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}

// Assessment Settings Modal
export const AssessmentSettingsModal = ({ assessment, isOpen, onClose, onSave }) => {
    const [settings, setSettings] = useState({
        name: assessment?.name || '',
        description: assessment?.description || '',
        autoSync: true,
        notifications: true,
        qualityThresholds: {
            completeness: 90,
            accuracy: 95,
            timeliness: 85
        }
    })

    const handleSave = () => {
        onSave(settings)
        onClose()
    }

    if (!isOpen) return null

    return (
        <Modal position="middle">
            <ModalTitle>
                {i18n.t('Assessment Settings - {{name}}', { name: assessment?.name })}
            </ModalTitle>
            <ModalContent>
                <Box>
                    <NoticeBox title={i18n.t('Configuration')}>
                        {i18n.t('Configure assessment settings, thresholds, and preferences.')}
                    </NoticeBox>
                    
                    <Box marginTop="24px">
                        <h4>{i18n.t('General Settings')}</h4>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            {i18n.t('Basic assessment configuration and preferences.')}
                        </p>
                    </Box>
                </Box>
            </ModalContent>
            <ModalActions>
                <ButtonStrip>
                    <Button secondary onClick={onClose}>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button primary onClick={handleSave}>
                        {i18n.t('Save Settings')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}