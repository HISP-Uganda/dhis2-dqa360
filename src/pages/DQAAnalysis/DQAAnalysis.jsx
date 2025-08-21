import React from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Menu, MenuItem, IconVisualizationColumn24, IconTable24, IconSettings24 } from '@dhis2/ui'
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

// Placeholder pages
const CompareResults = () => (<div><h2>{i18n.t('Compare Results')}</h2><p>{i18n.t('Analytical comparison across datasets with tolerance profiles.')}</p></div>)
const Discrepancies = () => (<div><h2>{i18n.t('Discrepancies')}</h2><p>{i18n.t('List and triage discrepancies with deep links to data entry.')}</p></div>)
const DQDimensions = () => (<div><h2>{i18n.t('DQ Dimensions')}</h2><p>{i18n.t('Scores by completeness, consistency, accuracy, timeliness.')}</p></div>)
const SuccessCriteria = () => (<div><h2>{i18n.t('Success Criteria')}</h2><p>{i18n.t('Pass/Fail/Borderline by criteria set.')}</p></div>)
const EngineRuns = () => (<div><h2>{i18n.t('Engine Runs')}</h2><p>{i18n.t('History of analysis runs with status, trigger, version.')}</p></div>)
const RulesThresholds = () => (<div><h2>{i18n.t('Rules & Thresholds')}</h2><p>{i18n.t('Manage tolerance, dimension weights and success criteria.')}</p></div>)

const menu = [
    { key: 'compare', path: '/dqa-analysis/compare', label: i18n.t('Compare Results'), icon: <IconVisualizationColumn24 /> },
    { key: 'discrepancies', path: '/dqa-analysis/discrepancies', label: i18n.t('Discrepancies'), icon: <IconSettings24 /> },
    { key: 'dimensions', path: '/dqa-analysis/dimensions', label: i18n.t('DQ Dimensions'), icon: <IconTable24 /> },
    { key: 'success', path: '/dqa-analysis/success', label: i18n.t('Success Criteria'), icon: <IconSettings24 /> },
    { key: 'runs', path: '/dqa-analysis/runs', label: i18n.t('Engine Runs (History)'), icon: <IconSettings24 /> },
    { key: 'rules', path: '/dqa-analysis/rules', label: i18n.t('Rules & Thresholds'), icon: <IconSettings24 /> }
]

export const DQAAnalysis = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const isActive = (p) => location.pathname === p || location.pathname.startsWith(p)

    return (
        <Container>
            <Sidebar>
                <SidebarHeader>
                    <h2>{i18n.t('DQA Analysis')}</h2>
                    <p>{i18n.t('Compare, triage and score data quality')}</p>
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
                        <Route path="/" element={<CompareResults />} />
                        <Route path="/compare" element={<CompareResults />} />
                        <Route path="/discrepancies" element={<Discrepancies />} />
                        <Route path="/dimensions" element={<DQDimensions />} />
                        <Route path="/success" element={<SuccessCriteria />} />
                        <Route path="/runs" element={<EngineRuns />} />
                        <Route path="/rules" element={<RulesThresholds />} />
                    </Routes>
                </ContentInner>
            </Content>
        </Container>
    )
}

export default DQAAnalysis