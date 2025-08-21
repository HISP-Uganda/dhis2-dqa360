import React from 'react'
import { NoticeBox, CircularLoader, Box } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useUserAuthorities, DQA360_AUTHORITIES } from '../../hooks/useUserAuthorities'
import styled from 'styled-components'

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    flex-direction: column;
    gap: 16px;
`

const AccessDeniedContainer = styled.div`
    max-width: 600px;
    margin: 40px auto;
    padding: 0 16px;
`

/**
 * AuthorityGuard component to protect content based on user authorities
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if user has required authority
 * @param {string|string[]} props.requiredAuthority - Required authority/authorities
 * @param {boolean} props.requireAll - If true, user must have ALL authorities (default: false - requires ANY)
 * @param {React.ReactNode} props.fallback - Custom fallback content when access is denied
 * @param {boolean} props.showLoading - Whether to show loading state (default: true)
 * @param {string} props.deniedMessage - Custom access denied message
 */
export const AuthorityGuard = ({
    children,
    requiredAuthority,
    requireAll = false,
    fallback = null,
    showLoading = true,
    deniedMessage = null
}) => {
    const { 
        loading, 
        error, 
        hasAuthority, 
        hasAnyAuthority, 
        hasAllAuthorities,
        canAccessDQA360,
        displayName
    } = useUserAuthorities()

    // Show loading state
    if (loading && showLoading) {
        return (
            <LoadingContainer>
                <CircularLoader />
                <span>{i18n.t('Checking permissions...')}</span>
            </LoadingContainer>
        )
    }

    // Handle error state
    if (error) {
        return (
            <AccessDeniedContainer>
                <NoticeBox title={i18n.t('Error')} error>
                    {i18n.t('Unable to verify user permissions. Please try refreshing the page.')}
                    <br />
                    <small>{error.message}</small>
                </NoticeBox>
            </AccessDeniedContainer>
        )
    }

    // Check if user can access DQA360 at all
    if (!canAccessDQA360) {
        return (
            <AccessDeniedContainer>
                <NoticeBox title={i18n.t('Access Denied')} error>
                    <p>
                        {i18n.t('You do not have permission to access DQA360. Please contact your system administrator to request access.')}
                    </p>
                    <p>
                        <strong>{i18n.t('Required authorities:')}</strong>
                        <br />
                        • {DQA360_AUTHORITIES.USER} ({i18n.t('DQA360 User')})
                        <br />
                        • {DQA360_AUTHORITIES.ADMIN} ({i18n.t('DQA360 Administrator')})
                    </p>
                    <p>
                        <small>{i18n.t('Current user:')} {displayName}</small>
                    </p>
                </NoticeBox>
            </AccessDeniedContainer>
        )
    }

    // If no specific authority is required, just check general DQA360 access
    if (!requiredAuthority) {
        return children
    }

    // Check specific authority requirements
    let hasRequiredAccess = false

    if (Array.isArray(requiredAuthority)) {
        if (requireAll) {
            hasRequiredAccess = hasAllAuthorities(requiredAuthority)
        } else {
            hasRequiredAccess = hasAnyAuthority(requiredAuthority)
        }
    } else {
        hasRequiredAccess = hasAuthority(requiredAuthority)
    }

    // If user has required access, render children
    if (hasRequiredAccess) {
        return children
    }

    // If custom fallback is provided, use it
    if (fallback) {
        return fallback
    }

    // Default access denied message
    const defaultMessage = deniedMessage || i18n.t('You do not have sufficient permissions to access this feature.')
    const requiredAuths = Array.isArray(requiredAuthority) ? requiredAuthority : [requiredAuthority]

    return (
        <AccessDeniedContainer>
            <NoticeBox title={i18n.t('Insufficient Permissions')} warning>
                <p>{defaultMessage}</p>
                <p>
                    <strong>{i18n.t('Required authorities:')}</strong>
                    <br />
                    {requiredAuths.map(auth => (
                        <span key={auth}>
                            • {auth}
                            {auth === DQA360_AUTHORITIES.USER && ` (${i18n.t('DQA360 User')})`}
                            {auth === DQA360_AUTHORITIES.ADMIN && ` (${i18n.t('DQA360 Administrator')})`}
                            <br />
                        </span>
                    ))}
                </p>
                <p>
                    <small>{i18n.t('Current user:')} {displayName}</small>
                </p>
            </NoticeBox>
        </AccessDeniedContainer>
    )
}

/**
 * Convenience component for DQA360 User access
 */
export const DQAUserGuard = ({ children, ...props }) => (
    <AuthorityGuard 
        requiredAuthority={DQA360_AUTHORITIES.USER} 
        {...props}
    >
        {children}
    </AuthorityGuard>
)

/**
 * Convenience component for DQA360 Admin access
 */
export const DQAAdminGuard = ({ children, ...props }) => (
    <AuthorityGuard 
        requiredAuthority={DQA360_AUTHORITIES.ADMIN}
        deniedMessage={i18n.t('This feature is only available to DQA360 Administrators.')}
        {...props}
    >
        {children}
    </AuthorityGuard>
)

export default AuthorityGuard