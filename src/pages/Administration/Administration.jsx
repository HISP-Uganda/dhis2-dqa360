import React, { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { 
    Box,
    Menu,
    MenuItem,
    IconSettings24,
    IconApps24,
    IconMail24,
    IconUpload24,
    IconView24,
    IconTable24,
    Button,
    ButtonStrip
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'
import { DataStoreManagement } from './components/DataStoreManagement'
import { SystemConfiguration } from './components/SystemConfiguration'
import { DQAUserManagement } from './components/DQAUserManagement'
import { ReportsConfiguration } from './components/ReportsConfiguration'
import { ChannelsProviders } from './components/ChannelsProviders'
import DatasetsList from './components/DatasetsList'
const DatasetDetailsLazy = React.lazy(() => import('./components/DatasetDetails'))
import { AuditLogs } from './components/AuditLogs'
import { ManageAssessments } from '../ManageAssessments/ManageAssessments'
import { CreateAssessmentPage } from '../ManageAssessments/CreateAssessmentPage'
import ImportExport from '../DQAData/pages/ImportExport'

// Standard layout that works with the app layout
const AdministrationContainer = styled.div`
    display: flex;
    min-height: calc(100vh - 100px);
    background: #f8f9fa;
    overflow: hidden;
    border: 1px solid #e1e5e9;
`

const Sidebar = styled.div`
    width: 200px;
    background: white;
    border-right: 1px solid #e1e5e9;
    display: flex;
    flex-direction: column;
`

const SidebarHeader = styled.div`
    padding: 8px;
    border-bottom: 1px solid #e1e5e9;
    background: #1976d2;
    color: white;
    
    h1 {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    p {
        margin: 2px 0 0 0;
        font-size: 11px;
        opacity: 0.9;
    }
`

const SidebarContent = styled.div`
    flex: 1;
    padding: 4px 0;
    overflow-y: auto;
`

const MainContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`



const ContentBody = styled.div`
    flex: 1;
    padding: 8px;
    overflow-y: auto;
    background: #f8f9fa;
    display: flex;
    flex-direction: column;
`



export const Administration = () => {
    const navigate = useNavigate()
    const location = useLocation()
    
    // Get current section from URL
    const currentPath = location.pathname.replace('/administration', '') || '/assessments'
    
    const menuItems = [
        // Administration sidebar refined to reflect current working workflows only
        {
            key: 'assessments',
            path: '/administration/assessments',
            label: i18n.t('Manage Assessments'),
            icon: <IconApps24 />,
            description: i18n.t('List, view and manage assessments')
        },
        {
            key: 'assessments_create',
            path: '/administration/assessments/create',
            label: i18n.t('Create Assessment'),
            icon: <IconSettings24 />,
            description: i18n.t('Start a new assessment workflow')
        },

        {
            key: 'metadata',
            path: '/administration/metadata',
            label: i18n.t('Metadata'),
            icon: <IconSettings24 />,
            description: i18n.t('Data elements, datasets, and org units')
        },
        {
            key: 'datasets',
            path: '/administration/datasets',
            label: i18n.t('Datasets'),
            icon: <IconTable24 />,
            description: i18n.t('Register/Summary/Reported/Corrections')
        },
        {
            key: 'integrations',
            path: '/administration/integrations',
            label: i18n.t('Integrations'),
            icon: <IconSettings24 />,
            description: i18n.t('DHIS2 Connection & eHMIS Submission')
        },
        {
            key: 'notifications',
            path: '/administration/notifications',
            label: i18n.t('Notifications'),
            icon: <IconMail24 />,
            description: i18n.t('Channels & Providers')
        },
        {
            key: 'security',
            path: '/administration/security',
            label: i18n.t('Security & Roles'),
            icon: <IconApps24 />,
            description: i18n.t('User access, roles & sharing')
        },
        {
            key: 'importExport',
            path: '/administration/import-export',
            label: i18n.t('Import/Export'),
            icon: <IconUpload24 />,
            description: i18n.t('Config import and export')
        },
        {
            key: 'audit',
            path: '/administration/audit',
            label: i18n.t('Audit Logs'),
            icon: <IconView24 />,
            description: i18n.t('Global system audit logs')
        },
        {
            key: 'system',
            path: '/administration/system',
            label: i18n.t('System Settings'),
            icon: <IconSettings24 />,
            description: i18n.t('General system configuration')
        }
    ]

    // Hide specific sidebar items as requested
    const filteredMenuItems = menuItems.filter(item => !['metadata', 'security', 'assessments_create', 'integrations'].includes(item.key))
    
    const currentSection = menuItems.find(item => 
        location.pathname.startsWith(item.path)
    ) || menuItems[0]
    
    // Provide draft assessment for create flow so EditAssessmentPage can initialize without an id
    const createNewAssessmentDraft = () => ({
        name: '',
        description: '',
        assessmentType: 'baseline',
        priority: 'medium',
        status: 'draft',
        startDate: '',
        endDate: '',
        notifications: true,
        autoSync: true,
        validationAlerts: false,
        historicalComparison: false,
        methodology: 'automated',
        frequency: 'monthly',
        reportingLevel: 'facility',
        dataQualityDimensions: ['completeness', 'timeliness'],
        stakeholders: [],
        riskFactors: [],
        successCriteria: '',
        confidentialityLevel: 'internal',
        dataRetentionPeriod: '5years',
        publicAccess: false,
        tags: [],
        customFields: {}
    })

    const handleMenuClick = (item) => {
        if (item.key === 'assessments_create') {
            navigate(item.path, { state: { assessment: createNewAssessmentDraft() } })
        } else {
            navigate(item.path)
        }
    }
    
    return (
        <AdministrationContainer>
            <Sidebar>
                <SidebarHeader>
                    <h1>
                        <IconSettings24 />
                        {i18n.t('Administration')}
                    </h1>
                    <p>{i18n.t('System management and configuration')}</p>
                </SidebarHeader>
                
                <SidebarContent>
                    <Menu>
                        {filteredMenuItems.map(item => (
                            <MenuItem
                                key={item.key}
                                label={item.label}
                                icon={item.icon}
                                active={location.pathname === item.path || (item.key === 'assessments' && location.pathname === '/administration')}
                                onClick={() => handleMenuClick(item)}
                            />
                        ))}
                    </Menu>
                </SidebarContent>
            </Sidebar>
            
            <MainContent>
                
                <ContentBody>
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Routes>
                            <Route path="/" element={<ManageAssessments />} />
                            {/* Default to assessments when landing on /administration */}
                            <Route path="/assessments" element={<ManageAssessments />} />
                            <Route path="/assessments/create" element={<CreateAssessmentPage />} />
                            <Route path="/assessments/edit/:id" element={<CreateAssessmentPage />} />
                            {/* Pending sections (hidden/placeholder-free as requested) */}
                            <Route path="/metadata" element={<SystemConfiguration />} />
                            <Route path="/datasets" element={<DatasetsList />} />
                            <Route path="/datasets/:id" element={<React.Suspense fallback={<div>Loading…</div>}><DatasetDetailsLazy /></React.Suspense>} />
                            <Route path="/integrations" element={<SystemConfiguration />} />
                            <Route path="/notifications" element={<ChannelsProviders />} />
                            <Route path="/security" element={<DQAUserManagement />} />
                            <Route path="/import-export" element={<ImportExport />} />
                            <Route path="/audit" element={<AuditLogs />} />
                            <Route path="/system" element={<SystemConfiguration />} />
                        </Routes>
                    </div>
                </ContentBody>
            </MainContent>
        </AdministrationContainer>
    )
}

export default Administration