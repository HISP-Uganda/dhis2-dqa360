import React from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Menu, MenuItem, IconMail24, IconSettings24, Card, Box, NoticeBox } from '@dhis2/ui'
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

const OutboxLogs = () => (
    <Box>
        <h2>{i18n.t('Outbox & Logs')}</h2>
        <Card><Box padding="12px"><NoticeBox info title={i18n.t('Coming soon')}>{i18n.t('Outbox listing and delivery logs')}</NoticeBox></Box></Card>
    </Box>
)
const Rules = () => (
    <Box>
        <h2>{i18n.t('Rules')}</h2>
        <Card><Box padding="12px"><NoticeBox info title={i18n.t('Coming soon')}>{i18n.t('Define triggers and thresholds')}</NoticeBox></Box></Card>
    </Box>
)
const Templates = () => (
    <Box>
        <h2>{i18n.t('Templates')}</h2>
        <Card><Box padding="12px"><NoticeBox info title={i18n.t('Coming soon')}>{i18n.t('Manage message templates')}</NoticeBox></Box></Card>
    </Box>
)
const Diagnostics = () => (
    <Box>
        <h2>{i18n.t('Delivery Diagnostics')}</h2>
        <Card><Box padding="12px"><NoticeBox info title={i18n.t('Coming soon')}>{i18n.t('Channel and provider health')}</NoticeBox></Box></Card>
    </Box>
)

const menu = [
    { key: 'outbox', path: '/notifications/outbox', label: i18n.t('Outbox & Logs'), icon: <IconMail24 /> },
    { key: 'rules', path: '/notifications/rules', label: i18n.t('Rules'), icon: <IconSettings24 /> },
    { key: 'templates', path: '/notifications/templates', label: i18n.t('Templates'), icon: <IconSettings24 /> },
    { key: 'diagnostics', path: '/notifications/diagnostics', label: i18n.t('Delivery Diagnostics'), icon: <IconSettings24 /> }
]

export const Notifications = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const isActive = (p) => location.pathname === p || location.pathname.startsWith(p)

    return (
        <Container>
            <Sidebar>
                <SidebarHeader>
                    <h2>{i18n.t('Notifications')}</h2>
                    <p>{i18n.t('Rules, templates, outbox and diagnostics')}</p>
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
                        <Route path="/" element={<OutboxLogs />} />
                        <Route path="/outbox" element={<OutboxLogs />} />
                        <Route path="/rules" element={<Rules />} />
                        <Route path="/templates" element={<Templates />} />
                        <Route path="/diagnostics" element={<Diagnostics />} />
                    </Routes>
                </ContentInner>
            </Content>
        </Container>
    )
}

export default Notifications