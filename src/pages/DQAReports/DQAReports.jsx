import React, { useState } from 'react'
import { 
    Box, 
    Button,
    Card,
    NoticeBox,
    IconSettings24,
    IconDownload24,
    IconMore24,
    SingleSelect,
    SingleSelectOption,
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    Tag
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'

const PageHeader = styled.div`
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: white;
    padding: 32px 24px;
    border-radius: 8px;
    margin-bottom: 32px;
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
    
    h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 600;
        letter-spacing: -0.5px;
    }
    
    p {
        margin: 0;
        font-size: 16px;
        opacity: 0.9;
        line-height: 1.5;
    }
`

const FilterBar = styled.div`
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 24px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
`

const StatCard = styled(Card)`
    padding: 24px;
    text-align: center;
    border: 1px solid #e0e0e0;
    transition: all 0.2s ease;
    
    &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-color: #1976d2;
    }
    
    .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #1976d2;
        margin-bottom: 8px;
    }
    
    .stat-label {
        font-size: 14px;
        color: #666;
        font-weight: 500;
        margin-bottom: 4px;
    }
    
    .stat-trend {
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
    }
    
    .trend-up {
        color: #2e7d32;
    }
    
    .trend-down {
        color: #d32f2f;
    }
    
    .trend-stable {
        color: #f57c00;
    }
`

const ReportsSection = styled.div`
    background: white;
    border-radius: 8px;
    padding: 24px;
    border: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`

export const DQAReports = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('2024-01')
    const [selectedAssessment, setSelectedAssessment] = useState('')
    const [selectedIndicator, setSelectedIndicator] = useState('')
    
    // Mock data for DQA indicators
    const dqaStats = [
        {
            label: i18n.t('Overall Completeness'),
            value: '87.5%',
            trend: 'up',
            change: '+2.3%'
        },
        {
            label: i18n.t('Data Consistency'),
            value: '82.3%',
            trend: 'down',
            change: '-1.2%'
        },
        {
            label: i18n.t('Timeliness Score'),
            value: '91.2%',
            trend: 'up',
            change: '+4.1%'
        },
        {
            label: i18n.t('Accuracy Rate'),
            value: '94.7%',
            trend: 'stable',
            change: '0.0%'
        }
    ]
    
    // Mock available reports
    const availableReports = [
        {
            id: '1',
            name: 'Data Completeness Report',
            description: 'Comprehensive analysis of data completeness across all facilities',
            category: 'Completeness',
            lastGenerated: '2024-01-15',
            status: 'Available'
        },
        {
            id: '2',
            name: 'Data Quality Dashboard',
            description: 'Executive summary of key data quality indicators',
            category: 'Overview',
            lastGenerated: '2024-01-14',
            status: 'Available'
        },
        {
            id: '3',
            name: 'Timeliness Analysis',
            description: 'Analysis of data submission timeliness by facility and period',
            category: 'Timeliness',
            lastGenerated: '2024-01-13',
            status: 'Available'
        },
        {
            id: '4',
            name: 'Consistency Validation Report',
            description: 'Detailed report on data consistency issues and validation failures',
            category: 'Consistency',
            lastGenerated: '2024-01-12',
            status: 'Generating'
        }
    ]

    const handleGenerateReport = (reportId) => {
        console.log('Generate report:', reportId)
        // TODO: Implement report generation
    }

    const handleDownloadReport = (reportId) => {
        console.log('Download report:', reportId)
        // TODO: Implement report download
    }

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return '📈'
            case 'down': return '📉'
            case 'stable': return '➡️'
            default: return '❓'
        }
    }

    const getTrendClass = (trend) => {
        switch (trend) {
            case 'up': return 'trend-up'
            case 'down': return 'trend-down'
            case 'stable': return 'trend-stable'
            default: return ''
        }
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
            <PageHeader>
                <h1>{i18n.t('DQA Reports')}</h1>
                <p>{i18n.t('Generate and view data quality assessment reports with comprehensive indicators and analytics')}</p>
            </PageHeader>

            {/* Filter Controls */}
            <FilterBar>
                <IconMore24 />
                <Box style={{ minWidth: '150px' }}>
                    <SingleSelect
                        selected={selectedPeriod}
                        onChange={({ selected }) => setSelectedPeriod(selected)}
                        placeholder={i18n.t('Select Period')}
                    >
                        <SingleSelectOption value="2024-01" label="January 2024" />
                        <SingleSelectOption value="2023-12" label="December 2023" />
                        <SingleSelectOption value="2023-11" label="November 2023" />
                        <SingleSelectOption value="2023-10" label="October 2023" />
                    </SingleSelect>
                </Box>
                
                <Box style={{ minWidth: '200px' }}>
                    <SingleSelect
                        selected={selectedAssessment}
                        onChange={({ selected }) => setSelectedAssessment(selected)}
                        placeholder={i18n.t('All Assessments')}
                        clearable
                    >
                        <SingleSelectOption value="facility-reporting" label="Facility Reporting Assessment" />
                        <SingleSelectOption value="community-health" label="Community Health Assessment" />
                        <SingleSelectOption value="custom-dqa" label="Custom DQA Assessment" />
                    </SingleSelect>
                </Box>
                
                <Box style={{ minWidth: '180px' }}>
                    <SingleSelect
                        selected={selectedIndicator}
                        onChange={({ selected }) => setSelectedIndicator(selected)}
                        placeholder={i18n.t('All Indicators')}
                        clearable
                    >
                        <SingleSelectOption value="completeness" label="Completeness" />
                        <SingleSelectOption value="consistency" label="Consistency" />
                        <SingleSelectOption value="timeliness" label="Timeliness" />
                        <SingleSelectOption value="accuracy" label="Accuracy" />
                    </SingleSelect>
                </Box>
            </FilterBar>

            {/* DQA Statistics Overview */}
            <StatsGrid>
                {dqaStats.map((stat, index) => (
                    <StatCard key={index}>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                        <div className={`stat-trend ${getTrendClass(stat.trend)}`}>
                            {getTrendIcon(stat.trend)} {stat.change}
                        </div>
                    </StatCard>
                ))}
            </StatsGrid>

            {/* Available Reports */}
            <ReportsSection>
                <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                        <IconSettings24 style={{ marginRight: '8px' }} />
                        {i18n.t('Available Reports')}
                    </h2>
                    <Button primary>
                        <IconSettings24 />
                        {i18n.t('Create Custom Report')}
                    </Button>
                </Box>

                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('Report Name')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Category')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Last Generated')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {availableReports.map(report => (
                            <DataTableRow key={report.id}>
                                <DataTableCell>
                                    <div>
                                        <strong>{report.name}</strong>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                            {report.description}
                                        </div>
                                    </div>
                                </DataTableCell>
                                <DataTableCell>
                                    <Tag neutral>{report.category}</Tag>
                                </DataTableCell>
                                <DataTableCell>
                                    {report.lastGenerated}
                                </DataTableCell>
                                <DataTableCell>
                                    <Tag 
                                        positive={report.status === 'Available'}
                                        neutral={report.status === 'Generating'}
                                    >
                                        {report.status}
                                    </Tag>
                                </DataTableCell>
                                <DataTableCell>
                                    <Box display="flex" gap="8px">
                                        {report.status === 'Available' ? (
                                            <Button 
                                                small 
                                                primary 
                                                onClick={() => handleDownloadReport(report.id)}
                                            >
                                                <IconDownload24 />
                                                {i18n.t('Download')}
                                            </Button>
                                        ) : (
                                            <Button 
                                                small 
                                                secondary 
                                                onClick={() => handleGenerateReport(report.id)}
                                            >
                                                <IconSettings24 />
                                                {i18n.t('Generate')}
                                            </Button>
                                        )}
                                    </Box>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
            </ReportsSection>

            {/* Information Notice */}
            <Box style={{ marginTop: '24px' }}>
                <NoticeBox title={i18n.t('Report Configuration')} info>
                    {i18n.t('To configure additional DQA indicators and customize report templates, visit the Administration section under Reports Configuration.')}
                </NoticeBox>
            </Box>
        </div>
    )
}

export default DQAReports