import React from 'react'
import { Box, IconApps24, Tag } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'
import { useUserAuthorities } from '../../hooks/useUserAuthorities'

const CustomHeaderBar = styled.div`
    background-color: #2c6693;
    color: white;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`

const AppTitle = styled.div`
    font-size: 18px;
    font-weight: 500;
`

const UserProfile = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
`

const UserInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`

const SuperUserTag = styled(Tag)`
    background-color: #ff6b35 !important;
    color: white !important;
    font-size: 11px !important;
    font-weight: bold !important;
`

const AdminTag = styled(Tag)`
    background-color: #4caf50 !important;
    color: white !important;
    font-size: 11px !important;
`

const UserTag = styled(Tag)`
    background-color: #2196f3 !important;
    color: white !important;
    font-size: 11px !important;
`

export const Header = () => {
    const { 
        loading, 
        error, 
        displayName, 
        isDQAUser, 
        isDQAAdmin, 
        isSuperUser 
    } = useUserAuthorities()

    if (loading) return (
        <CustomHeaderBar>
            <AppTitle>{i18n.t('DQA360')}</AppTitle>
            <UserProfile>Loading...</UserProfile>
        </CustomHeaderBar>
    )
    
    if (error) return (
        <CustomHeaderBar>
            <AppTitle>{i18n.t('DQA360')}</AppTitle>
            <UserProfile>Error loading user</UserProfile>
        </CustomHeaderBar>
    )

    const getUserTag = () => {
        if (isSuperUser) {
            return <SuperUserTag>SUPERUSER</SuperUserTag>
        }
        if (isDQAAdmin) {
            return <AdminTag>DQA ADMIN</AdminTag>
        }
        if (isDQAUser) {
            return <UserTag>DQA USER</UserTag>
        }
        return <Tag neutral>NO ACCESS</Tag>
    }

    return (
        <CustomHeaderBar>
            <AppTitle>{i18n.t('DQA360')}</AppTitle>
            <UserProfile>
                {getUserTag()}
                <UserInfo>
                    <IconApps24 />
                    <span>{displayName || 'User'}</span>
                </UserInfo>
            </UserProfile>
        </CustomHeaderBar>
    )
}