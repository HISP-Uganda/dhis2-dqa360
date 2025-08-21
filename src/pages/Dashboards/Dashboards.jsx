import React from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Menu, MenuItem, IconVisualizationColumn24, IconApps24, IconTextBox24, IconDownload24, IconSettings24 } from '@dhis2/ui'
import styled from 'styled-components'
import i18n from '@dhis2/d2-i18n'

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
    h2 { margin: 0; font-size: 14px; font-weight: 600; }
    p { margin: 2px 0 0 0; font-size: 12px; opacity: 0.95; }
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

const Overview = () => (<div><h2>{i18n.t('Overview')}</h2><p>{i18n.t('At-a-glance visuals with drill-downs')}</p></div>)
const FacilityDashboard = () => (<div><h2>{i18n.t('Facility Dashboard')}</h2></div>)
const Trends = () => (<div><h2>{i18n.t('Trends & Time Series')}</h2></div>)
const Heatmap = () => (<div><h2>{i18n.t('Discrepancy Heatmap')}</h2></div>)
const Dimensions = () => (<div><h2>{i18n.t('DQ Dimensions Dashboard')}</h2></div>)
const SuccessCriteria = () => (<div><h2>{i18n.t('Success Criteria Dashboard')}</h2></div>)
const ExportsSharing = () => (<div><h2>{i18n.t('Exports & Sharing')}</h2></div>)

const menu = [
    { key: 'overview', path: '/dashboards/overview', label: i18n.t('Overview'), icon: <IconVisualizationColumn24 /> },
    { key: 'facility', path: '/dashboards/facility', label: i18n.t('Facility Dashboard'), icon: <IconApps24 /> },
    { key: 'trends', path: '/dashboards/trends', label: i18n.t('Trends & Time Series'), icon: <IconSettings24 /> },
    { key: 'heatmap', path: '/dashboards/heatmap', label: i18n.t('Discrepancy Heatmap'), icon: <IconSettings24 /> },
    { key: 'dimensions', path: '/dashboards/dimensions', label: i18n.t('DQ Dimensions Dashboard'), icon: <IconSettings24 /> },
    { key: 'success', path: '/dashboards/success', label: i18n.t('Success Criteria Dashboard'), icon: <IconTextBox24 /> },
    { key: 'exports', path: '/dashboards/exports', label: i18n.t('Exports & Sharing'), icon: <IconDownload24 /> }
]

export const Dashboards = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const isActive = (p) => location.pathname === p || location.pathname.startsWith(p)

    return (
        <Container>
            <Sidebar>
                <SidebarHeader>
                    <h2>{i18n.t('Dashboards')}</h2>
                    <p>{i18n.t('Visual summaries and exports')}</p>
                </SidebarHeader>
                <Menu>
                    {menu.map(item => (
                        <MenuItem key={item.key} label={item.label} icon={item.icon} active={isActive(item.path)} onClick={() => navigate(item.path)} />
                    ))}
                </Menu>
            </Sidebar>
            <Content>
                <ContentInner>
                    <Routes>
                        <Route path="/" element={<Overview />} />
                        <Route path="/overview" element={<Overview />} />
                        <Route path="/facility" element={<FacilityDashboard />} />
                        <Route path="/trends" element={<Trends />} />
                        <Route path="/heatmap" element={<Heatmap />} />
                        <Route path="/dimensions" element={<Dimensions />} />
                        <Route path="/success" element={<SuccessCriteria />} />
                        <Route path="/exports" element={<ExportsSharing />} />
                    </Routes>
                </ContentInner>
            </Content>
        </Container>
    )
}

export default Dashboards