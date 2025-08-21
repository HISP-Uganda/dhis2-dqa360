import React, { useState } from 'react'
import { Box } from '@dhis2/ui'
import { useNavigate, useLocation } from 'react-router-dom'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'
import { useUserAuthorities } from '../../hooks/useUserAuthorities'


const TopNavContainer = styled.div`
    background: #ffffff;
    border-bottom: 1px solid #e0e0e0;
    padding: 0 8px;
    position: fixed;
    top: 48px;
    left: 0;
    right: 0;
    z-index: 1100;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    @media (max-width: 768px) {
        padding: 0 4px;
        height: 44px;
        top: 44px;
    }
`

const Brand = styled.div`
    display: flex;
    flex-direction: column;
    cursor: pointer;
    
    h1 {
        margin: 0;
        color: #1976d2;
        font-size: 18px;
        font-weight: 500;
        line-height: 1;
    }
    
    small {
        color: #6c757d;
        font-size: 10px;
        margin-top: 1px;
        font-weight: 400;
    }
    
    @media (max-width: 768px) {
        h1 {
            font-size: 16px;
        }
        
        small {
            display: none;
        }
    }
`

const NavigationMenu = styled.nav`
    display: flex;
    align-items: center;
    gap: 0;
    
    @media (max-width: 1024px) {
        display: ${props => props.mobileOpen ? 'flex' : 'none'};
        position: absolute;
        top: 100%;
        right: 0;
        left: 0;
        flex-direction: column;
        background-color: #ffffff;
        border-top: 1px solid #e0e0e0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
    }
    
    @media (min-width: 1025px) {
        display: flex !important;
    }
`

const NavItem = styled.div`
    position: relative;
    padding: 12px 16px;
    cursor: pointer;
    color: #666;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.2s ease;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
    
    ${props => props.active && `
        color: #1976d2;
        border-bottom-color: #1976d2;
        background-color: rgba(25, 118, 210, 0.04);
    `}
    
    &:hover {
        color: #1976d2;
        background-color: rgba(25, 118, 210, 0.04);
    }
    
    @media (max-width: 1024px) {
        width: 100%;
        padding: 16px 24px;
        border-bottom: 1px solid #f0f0f0;
        border-left: 3px solid transparent;
        
        ${props => props.active && `
            border-left-color: #1976d2;
            border-bottom-color: transparent;
        `}
    }
    
    @media (max-width: 768px) {
        font-size: 13px;
    }
`

const MobileMenuButton = styled.button`
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    color: #666;
    
    &:hover {
        background-color: rgba(25, 118, 210, 0.04);
        color: #1976d2;
    }
    
    @media (max-width: 1024px) {
        display: block;
    }
`

const MenuIcon = styled.div`
    width: 24px;
    height: 18px;
    position: relative;
    
    span {
        display: block;
        position: absolute;
        height: 2px;
        width: 100%;
        background: currentColor;
        border-radius: 1px;
        opacity: 1;
        left: 0;
        transform: rotate(0deg);
        transition: .25s ease-in-out;
        
        &:nth-child(1) {
            top: ${props => props.open ? '8px' : '0px'};
            transform: ${props => props.open ? 'rotate(135deg)' : 'rotate(0deg)'};
        }
        
        &:nth-child(2) {
            top: 8px;
            opacity: ${props => props.open ? '0' : '1'};
            left: ${props => props.open ? '-60px' : '0px'};
        }
        
        &:nth-child(3) {
            top: ${props => props.open ? '8px' : '16px'};
            transform: ${props => props.open ? 'rotate(-135deg)' : 'rotate(0deg)'};
        }
    }
`



export const TopNavigation = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { hasAuthority } = useUserAuthorities()

    const menuItems = [
        { path: '/dashboards', label: i18n.t('Dashboards'), key: 'dashboards' },
        { path: '/assessments', label: i18n.t('Assessments'), key: 'assessments' },
        { path: '/dqa-data', label: i18n.t('DQA Data'), key: 'dqa-data' },
        { path: '/dqa-analysis', label: i18n.t('DQA Analysis'), key: 'dqa-analysis' },
        { path: '/notifications', label: i18n.t('Notifications'), key: 'notifications' },
        { path: '/administration', label: i18n.t('Administration'), key: 'administration' },
        { path: '/help', label: i18n.t('Help'), key: 'help' }
    ]

    const handleNavigation = (path) => {
        navigate(path)
        setMobileMenuOpen(false)
    }



    return (
        <TopNavContainer>
            <Brand onClick={() => handleNavigation('/dashboards')}>
                <h1>DQA360</h1>
                <small>{i18n.t('Total Insight. Total Impact.')}</small>
            </Brand>
            
            <MobileMenuButton onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <MenuIcon open={mobileMenuOpen}>
                    <span></span>
                    <span></span>
                    <span></span>
                </MenuIcon>
            </MobileMenuButton>
            
            <Box display="flex" alignItems="center">
                <NavigationMenu mobileOpen={mobileMenuOpen}>
                    {menuItems.map(item => {
                        // Hide Administration menu if user doesn't have admin authority
                        if (item.key === 'administration' && !hasAuthority('DQA360_ADMIN')) {
                            return null
                        }
                        
                        // Check if current path matches the item path or is a sub-path
                        const isActive = location.pathname === item.path || 
                                       (item.path !== '/' && location.pathname.startsWith(item.path))
                        
                        return (
                            <NavItem
                                key={item.key}
                                active={isActive}
                                onClick={() => handleNavigation(item.path)}
                            >
                                {item.label}
                            </NavItem>
                        )
                    })}
                </NavigationMenu>
                

            </Box>
        </TopNavContainer>
    )
}