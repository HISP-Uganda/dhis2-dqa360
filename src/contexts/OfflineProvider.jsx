import React, { createContext, useContext, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'

const OfflineContext = createContext()

// Mock DHIS2 user data for offline development
const mockUserData = {
    id: 'offline-user-123',
    username: 'admin',
    displayName: 'Offline Admin User',
    email: 'admin@dqa360.local',
    authorities: [
        'ALL',
        'DQA360_ADMIN',
        'DQA360_USER',
        'F_DATASTORE_PUBLIC_ADD',
        'F_DATASTORE_PUBLIC_DELETE'
    ],
    userGroups: [
        { id: 'dqa360-admins', name: 'DQA360 Administrators' },
        { id: 'dqa360-users', name: 'DQA360 Users' }
    ],
    userRoles: [
        {
            id: 'dqa360-admin-role',
            name: 'DQA360 Admin Role',
            authorities: ['ALL', 'DQA360_ADMIN', 'DQA360_USER']
        }
    ],
    settings: {
        keyUiLocale: 'en'
    }
}

// Mock data engine
const createMockDataEngine = () => ({
    query: async (query) => {
        console.log('🔧 Offline mode: Mock query:', query)
        
        if (query.me) {
            return { me: mockUserData }
        }
        
        if (query.systemInfo) {
            return { 
                systemInfo: {
                    version: '2.41.4.1',
                    revision: 'offline-dev',
                    buildTime: new Date().toISOString(),
                    serverDate: new Date().toISOString(),
                    systemName: 'DQA360 Offline Development',
                    instanceBaseUrl: 'http://localhost:3000'
                }
            }
        }
        
        if (query.userSettings) {
            return { userSettings: mockUserData.settings }
        }
        
        // Mock empty responses for other queries
        return {}
    },
    mutate: async (mutation) => {
        console.log('🔧 Offline mode: Mock mutation:', mutation)
        return { success: true }
    }
})

// Mock DHIS2 system info
const mockSystemInfo = {
    version: '2.41.4.1',
    revision: 'offline-dev',
    buildTime: new Date().toISOString(),
    serverDate: new Date().toISOString(),
    systemName: 'DQA360 Offline Development',
    instanceBaseUrl: 'http://localhost:3000'
}

export const OfflineProvider = ({ children }) => {
    const [isOfflineMode] = useState(true)
    const [userData] = useState(mockUserData)
    const [systemInfo] = useState(mockSystemInfo)

    const value = {
        isOfflineMode,
        userData,
        systemInfo,
        // Mock API functions
        engine: {
            query: async (query) => {
                console.log('🔧 Offline mode: Mock API query:', query)
                
                // Mock responses for common queries
                if (query.me) {
                    return { me: userData }
                }
                
                if (query.systemInfo) {
                    return { systemInfo }
                }
                
                if (query.userSettings) {
                    return { userSettings: userData.settings }
                }
                
                // Default empty response
                return {}
            },
            mutate: async (mutation) => {
                console.log('🔧 Offline mode: Mock API mutation:', mutation)
                return { success: true }
            }
        }
    }

    return (
        <OfflineContext.Provider value={value}>
            {children}
        </OfflineContext.Provider>
    )
}

export const useOfflineContext = () => {
    const context = useContext(OfflineContext)
    if (!context) {
        throw new Error('useOfflineContext must be used within OfflineProvider')
    }
    return context
}

export default OfflineProvider