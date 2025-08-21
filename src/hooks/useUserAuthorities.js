import { useState, useEffect } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
import { overrideUserData, isDemoMode } from '../utils/demoUserOverride'

// Query to get current user information including authorities
const USER_QUERY = {
    me: {
        resource: 'me',
        params: {
            fields: [
                'id',
                'username',
                'firstName',
                'surname',
                'email',
                'authorities',
                'userRoles[id,name,authorities]',
                'userGroups[id,name]'
            ]
        }
    }
}

// DQA360 Authority Constants
export const DQA360_AUTHORITIES = {
    USER: 'DQA360_USER',
    ADMIN: 'DQA360_ADMIN'
}

/**
 * Custom hook to manage user authorities for DQA360
 * @returns {Object} User authority information and helper functions
 */
export const useUserAuthorities = () => {
    const { loading, error, data, refetch } = useDataQuery(USER_QUERY)
    const [userInfo, setUserInfo] = useState(null)
    const [authorities, setAuthorities] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (data?.me) {
            // Apply demo override if enabled
            const user = isDemoMode() ? overrideUserData(data.me) : data.me
            setUserInfo(user)
            
            // Combine direct authorities and role-based authorities
            const directAuthorities = user.authorities || []
            const roleAuthorities = user.userRoles?.reduce((acc, role) => {
                return [...acc, ...(role.authorities || [])]
            }, []) || []
            
            const allAuthorities = [...new Set([...directAuthorities, ...roleAuthorities])]
            
            // Note: In proxy/development mode, custom authorities from d2.config.js 
            // may not be available since the app isn't actually installed.
            // The system will automatically fall back to user groups.
            setAuthorities(allAuthorities)
            setIsLoading(false)
        }
    }, [data])

    // Check if user is a superuser
    const isSuperUser = () => {
        // Check for common superuser authorities
        const superUserAuthorities = [
            'ALL',
            'M_dhis-web-maintenance-appmanager',
            'M_dhis-web-maintenance',
            'F_SYSTEM_SETTING',
            'F_USER_ADD',
            'F_USER_DELETE'
        ]
        
        return superUserAuthorities.some(auth => authorities.includes(auth)) ||
               authorities.includes('ALL') ||
               (userInfo?.username === 'admin') // Common admin username
    }

    // Check if user has DQA360_USER authority (via authorities, user groups, or superuser)
    const isDQAUser = () => {
        // Superuser has full access
        if (isSuperUser()) {
            return true
        }
        
        // Check authorities first
        const hasUserAuthority = authorities.includes(DQA360_AUTHORITIES.USER) || 
                                authorities.includes(DQA360_AUTHORITIES.ADMIN) // Admin includes user permissions
        
        // Check user groups as fallback
        const userGroups = userInfo?.userGroups || []
        const hasUserGroup = userGroups.some(group => 
            group.name === 'DQA360 Users' || group.name === 'DQA360 Administrators'
        )
        
        return hasUserAuthority || hasUserGroup
    }

    // Check if user has DQA360_ADMIN authority (via authorities, user groups, or superuser)
    const isDQAAdmin = () => {
        // Superuser has full admin access
        if (isSuperUser()) {
            return true
        }
        
        // Check authorities first
        const hasAdminAuthority = authorities.includes(DQA360_AUTHORITIES.ADMIN)
        
        // Check user groups as fallback
        const userGroups = userInfo?.userGroups || []
        const hasAdminGroup = userGroups.some(group => 
            group.name === 'DQA360 Administrators'
        )
        
        return hasAdminAuthority || hasAdminGroup
    }

    // Check if user has specific authority
    const hasAuthority = (authority) => {
        return authorities.includes(authority)
    }

    // Check if user has any of the specified authorities
    const hasAnyAuthority = (authoritiesList) => {
        return authoritiesList.some(auth => authorities.includes(auth))
    }

    // Check if user has all of the specified authorities
    const hasAllAuthorities = (authoritiesList) => {
        return authoritiesList.every(auth => authorities.includes(auth))
    }

    // Get user's role names
    const getUserRoles = () => {
        return userInfo?.userRoles?.map(role => role.name) || []
    }

    // Check if user can access DQA360 at all
    const canAccessDQA360 = () => {
        return isDQAUser() || isDQAAdmin()
    }

    // Get user's display name
    const getUserDisplayName = () => {
        if (!userInfo) return ''
        const firstName = userInfo.firstName || ''
        const surname = userInfo.surname || ''
        return `${firstName} ${surname}`.trim() || userInfo.username || 'Unknown User'
    }

    return {
        // Loading states
        loading: loading || isLoading,
        error,
        
        // User information
        userInfo,
        authorities,
        userRoles: getUserRoles(),
        displayName: getUserDisplayName(),
        
        // Authority checks
        isDQAUser: isDQAUser(),
        isDQAAdmin: isDQAAdmin(),
        isSuperUser: isSuperUser(),
        canAccessDQA360: canAccessDQA360(),
        
        // Helper functions
        hasAuthority,
        hasAnyAuthority,
        hasAllAuthorities,
        
        // Utility functions
        refetch
    }
}