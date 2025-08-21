import React, { useState } from 'react'
import { 
    Box, 
    Button, 
    NoticeBox,
    IconSettings24,
    IconAdd24,
    IconEdit24,
    IconDelete24,
    IconDownload24,
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    Tag,
    SingleSelect,
    SingleSelectOption
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'

const SectionContainer = styled.div`
    background: white;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e0e0e0;
`

const SectionTitle = styled.h3`
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 12px;
`

const ActionBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
`

const ReportGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
`

const ReportCard = styled.div`
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    background: #f8f9fa;
    transition: all 0.2s ease;
    
    &:hover {
        border-color: #1976d2;
        box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
        background: white;
    }
    
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
        
        h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        
        .card-actions {
            display: flex;
            gap: 8px;
        }
    }
    
    .card-description {
        color: #666;
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: 16px;
    }
    
    .card-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #666;
    }
`

export const ReportsConfiguration = () => {
    const [loading, setLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)
    
    // Mock report templates data
    const [reportTemplates, setReportTemplates] = useState([
        {
            id: '1',
            name: 'Data Completeness Report',
            category: 'Completeness',
            description: 'Comprehensive report on data completeness across all datasets and periods',
            status: 'Active',
            lastGenerated: '2024-01-15',
            frequency: 'Monthly',
            recipients: 5
        },
        {
            id: '2',
            name: 'Data Quality Dashboard',
            category: 'Overview',
            description: 'Executive dashboard showing key data quality indicators and trends',
            status: 'Active',
            lastGenerated: '2024-01-14',
            frequency: 'Weekly',
            recipients: 12
        },
        {
            id: '3',
            name: 'Timeliness Analysis',
            category: 'Timeliness',
            description: 'Detailed analysis of data submission timeliness by facility and period',
            status: 'Draft',
            lastGenerated: null,
            frequency: 'Quarterly',
            recipients: 3
        },
        {
            id: '4',
            name: 'Consistency Validation Report',
            category: 'Consistency',
            description: 'Report highlighting data consistency issues and validation rule failures',
            status: 'Active',
            lastGenerated: '2024-01-13',
            frequency: 'Monthly',
            recipients: 8
        }
    ])
    
    // Mock DQA indicators data
    const [indicators, setIndicators] = useState([
        {
            id: '1',
            name: 'Overall Completeness Rate',
            formula: '(Completed Reports / Expected Reports) * 100',
            target: 95,
            current: 87.5,
            trend: 'up',
            category: 'Completeness'
        },
        {
            id: '2',
            name: 'Data Consistency Score',
            formula: 'Average of all consistency checks',
            target: 90,
            current: 82.3,
            trend: 'down',
            category: 'Consistency'
        },
        {
            id: '3',
            name: 'Timeliness Index',
            formula: '(On-time Submissions / Total Submissions) * 100',
            target: 85,
            current: 91.2,
            trend: 'up',
            category: 'Timeliness'
        },
        {
            id: '4',
            name: 'Data Accuracy Rate',
            formula: '(Valid Data Points / Total Data Points) * 100',
            target: 98,
            current: 94.7,
            trend: 'stable',
            category: 'Accuracy'
        }
    ])

    const handleCreateReport = () => {
        // TODO: Implement report creation
        console.log('Create new report template')
    }

    const handleEditReport = (reportId) => {
        // TODO: Implement report editing
        console.log('Edit report:', reportId)
    }

    const handleDeleteReport = (reportId) => {
        // TODO: Implement report deletion
        console.log('Delete report:', reportId)
    }

    const handleGenerateReport = (reportId) => {
        // TODO: Implement report generation
        console.log('Generate report:', reportId)
        setSuccessMessage('✅ Report generation started. You will be notified when complete.')
    }

    const handleCreateIndicator = () => {
        // TODO: Implement indicator creation
        console.log('Create new indicator')
    }

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return '📈'
            case 'down': return '📉'
            case 'stable': return '➡️'
            default: return '❓'
        }
    }

    const getTrendColor = (trend) => {
        switch (trend) {
            case 'up': return '#2e7d32'
            case 'down': return '#d32f2f'
            case 'stable': return '#f57c00'
            default: return '#666'
        }
    }

    return (
        <div>
            {/* Success/Error Messages */}
            {successMessage && (
                <NoticeBox title={i18n.t('Success')} valid style={{ marginBottom: '24px' }}>
                    {successMessage}
                </NoticeBox>
            )}
            
            {errorMessage && (
                <NoticeBox title={i18n.t('Error')} error style={{ marginBottom: '24px' }}>
                    {errorMessage}
                </NoticeBox>
            )}

            {/* DQA Indicators */}
            <SectionContainer>
                <SectionTitle>
                    <IconSettings24 />
                    {i18n.t('DQA Indicators')}
                </SectionTitle>
                
                <ActionBar>
                    <div>
                        <strong>{indicators.length}</strong> {i18n.t('indicators configured')}
                    </div>
                    <Button primary onClick={handleCreateIndicator}>
                        <IconAdd24 />
                        {i18n.t('Create Indicator')}
                    </Button>
                </ActionBar>
                
                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('Indicator')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Category')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Current Value')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Target')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Trend')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Performance')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {indicators.map(indicator => {
                            const performance = (indicator.current / indicator.target) * 100
                            const isGood = performance >= 95
                            const isWarning = performance >= 80 && performance < 95
                            
                            return (
                                <DataTableRow key={indicator.id}>
                                    <DataTableCell>
                                        <div>
                                            <strong>{indicator.name}</strong>
                                            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                                {indicator.formula}
                                            </div>
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Tag neutral>{indicator.category}</Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <strong style={{ fontSize: '16px' }}>
                                            {indicator.current}%
                                        </strong>
                                    </DataTableCell>
                                    <DataTableCell>
                                        {indicator.target}%
                                    </DataTableCell>
                                    <DataTableCell>
                                        <span style={{ color: getTrendColor(indicator.trend) }}>
                                            {getTrendIcon(indicator.trend)} {indicator.trend}
                                        </span>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Tag 
                                            positive={isGood}
                                            neutral={isWarning}
                                            negative={!isGood && !isWarning}
                                        >
                                            {performance.toFixed(1)}%
                                        </Tag>
                                    </DataTableCell>
                                </DataTableRow>
                            )
                        })}
                    </DataTableBody>
                </DataTable>
            </SectionContainer>

            {/* Report Templates */}
            <SectionContainer>
                <SectionTitle>
                    <IconSettings24 />
                    {i18n.t('Report Templates')}
                </SectionTitle>
                
                <ActionBar>
                    <div>
                        <strong>{reportTemplates.length}</strong> {i18n.t('report templates configured')}
                    </div>
                    <Button primary onClick={handleCreateReport}>
                        <IconAdd24 />
                        {i18n.t('Create Report Template')}
                    </Button>
                </ActionBar>
                
                <ReportGrid>
                    {reportTemplates.map(report => (
                        <ReportCard key={report.id}>
                            <div className="card-header">
                                <h4>{report.name}</h4>
                                <div className="card-actions">
                                    <Button small secondary onClick={() => handleGenerateReport(report.id)}>
                                        <IconDownload24 />
                                    </Button>
                                    <Button small secondary onClick={() => handleEditReport(report.id)}>
                                        <IconEdit24 />
                                    </Button>
                                    <Button small destructive onClick={() => handleDeleteReport(report.id)}>
                                        <IconDelete24 />
                                    </Button>
                                </div>
                            </div>
                            <div className="card-description">
                                {report.description}
                            </div>
                            <div className="card-stats">
                                <div>
                                    <Tag positive={report.status === 'Active'} neutral={report.status === 'Draft'}>
                                        {report.status}
                                    </Tag>
                                    <Tag neutral style={{ marginLeft: '8px' }}>
                                        {report.category}
                                    </Tag>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div>{report.frequency}</div>
                                    <div>{report.recipients} recipients</div>
                                    {report.lastGenerated && (
                                        <div>Last: {report.lastGenerated}</div>
                                    )}
                                </div>
                            </div>
                        </ReportCard>
                    ))}
                </ReportGrid>
            </SectionContainer>

            {/* Scheduled Reports */}
            <SectionContainer>
                <SectionTitle>
                    <IconSettings24 />
                    {i18n.t('Scheduled Reports')}
                </SectionTitle>
                
                <NoticeBox title={i18n.t('Coming Soon')} info>
                    {i18n.t('Automated report scheduling and distribution will be available in a future update. This will allow you to set up automatic report generation and email distribution on specified schedules.')}
                </NoticeBox>
            </SectionContainer>
        </div>
    )
}