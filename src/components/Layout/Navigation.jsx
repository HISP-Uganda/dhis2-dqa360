import React from 'react'
import { Menu, MenuItem } from '@dhis2/ui'
import { useNavigate, useLocation } from 'react-router-dom'
import i18n from '@dhis2/d2-i18n'
import { useUserAuthorities } from '../../hooks/useUserAuthorities'

export const Navigation = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { isDQAAdmin, loading } = useUserAuthorities()

    // Base menu items available to all DQA360 users
    const baseMenuItems = [
        { path: '/dashboards', label: i18n.t('Dashboards'), key: 'dashboards' },
        { path: '/assessments', label: i18n.t('Assessments'), key: 'assessments' },
        { path: '/dqa-data', label: i18n.t('DQA Data'), key: 'dqa-data' },
        { path: '/dqa-analysis', label: i18n.t('DQA Analysis'), key: 'dqa-analysis' },
        { path: '/notifications', label: i18n.t('Notifications'), key: 'notifications' },
        { path: '/help', label: i18n.t('Help'), key: 'help' }
    ]

    // Admin-only menu items
    const adminMenuItems = [
        { path: '/administration', label: i18n.t('Administration'), key: 'administration' }
    ]

    // Combine menu items based on user authority
    const menuItems = [
        ...baseMenuItems,
        ...(isDQAAdmin ? adminMenuItems : [])
    ]

    return (
        <Menu>
            {menuItems.map(item => (
                <MenuItem
                    key={item.key}
                    label={item.label}
                    active={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                />
            ))}
        </Menu>
    )
}