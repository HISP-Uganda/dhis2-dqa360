import React from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Menu, MenuItem, IconEdit24, IconView24, IconApps24, IconUpload24, IconDownload24, IconSettings24 } from '@dhis2/ui'
import styled from 'styled-components'
import i18n from '@dhis2/d2-i18n'

// Pages
import RegisterEntry from './pages/RegisterEntry'
import SummaryEntry from './pages/SummaryEntry'
import ReportedData from './pages/ReportedData'
import Snapshots from './pages/Snapshots'
import CorrectionsEntry from './pages/CorrectionsEntry'
import ComparisonView from './pages/ComparisonView'
import ValidationDrafts from './pages/ValidationDrafts'
import ImportExport from './pages/ImportExport'

const Container = styled.div`
    display: flex;
    min-height: calc(100vh - 120px);
    background: #f8f9fa;
    border: 1px solid #e1e5e9;
`

const Sidebar = styled.aside`
    width: 240px;
    background: #fff;
    border-right: 1px solid #e1e5e9;
    display: flex;
    flex-direction: column;
`

const SidebarHeader = styled.div`
    padding: 10px 12px;
    border-bottom: 1px solid #e1e5e9;
    background: #1976d2;
    color: white;
    h2 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
    }
    p {
        margin: 2px 0 0 0;
        font-size: 12px;
        opacity: 0.95;
    }
`

const Content = styled.main`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`

const ContentInner = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 12px;
`

const menu = [
    { key: 'register', path: '/dqa-data/register', label: i18n.t('Register Entry'), icon: <IconApps24 /> },
    { key: 'summary', path: '/dqa-data/summary', label: i18n.t('Summary Entry'), icon: <IconSettings24 /> },
    { key: 'reported', path: '/dqa-data/reported', label: i18n.t('Reported Data'), icon: <IconView24 /> },
    { key: 'snapshots', path: '/dqa-data/reported/snapshots', label: i18n.t('Snapshots (History)'), icon: <IconView24 /> },
    { key: 'corrections', path: '/dqa-data/corrections', label: i18n.t('Corrections Entry'), icon: <IconEdit24 /> },
    { key: 'comparison', path: '/dqa-data/comparison', label: i18n.t('Comparison View'), icon: <IconSettings24 /> },
    { key: 'validation', path: '/dqa-data/validation', label: i18n.t('Validation & Drafts'), icon: <IconView24 /> },
    { key: 'io', path: '/dqa-data/io', label: i18n.t('Import/Export'), icon: <IconUpload24 /> }
]

export const DQAData = () => {
    const location = useLocation()
    const navigate = useNavigate()

    const isActive = (itemPath) => {
        return location.pathname === itemPath || location.pathname.startsWith(itemPath)
    }

    return (
        <Container>
            <Sidebar>
                <SidebarHeader>
                    <h2>{i18n.t('DQA Data')}</h2>
                    <p>{i18n.t('Entry, snapshots, comparison and validation')}</p>
                </SidebarHeader>
                <Menu>
                    {menu.map(item => (
                        <MenuItem
                            key={item.key}
                            label={item.label}
                            active={isActive(item.path)}
                            icon={item.icon}
                            onClick={() => navigate(item.path)}
                        />
                    ))}
                </Menu>
            </Sidebar>
            <Content>
                <ContentInner>
                    <Routes>
                        <Route path="/" element={<RegisterEntry />} />
                        <Route path="/register" element={<RegisterEntry />} />
                        <Route path="/summary" element={<SummaryEntry />} />
                        <Route path="/reported" element={<ReportedData />} />
                        <Route path="/reported/snapshots" element={<Snapshots />} />
                        <Route path="/corrections" element={<CorrectionsEntry />} />
                        <Route path="/comparison" element={<ComparisonView />} />
                        <Route path="/validation" element={<ValidationDrafts />} />
                        <Route path="/io" element={<ImportExport />} />
                    </Routes>
                </ContentInner>
            </Content>
        </Container>
    )
}

export default DQAData