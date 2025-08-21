import React from 'react'
import { CssReset, CssVariables } from '@dhis2/ui'
import { AppRouter } from './components/Router/AppRouter'
import ErrorBoundary from './components/ErrorBoundary'
import { OfflineProvider } from './contexts/OfflineProvider'
import './locales'

// Mock DHIS2 context for offline mode
const OfflineApp = () => {
    return (
        <div>
            <CssReset />
            <CssVariables colors spacers elevations theme />
            <OfflineProvider>
                <ErrorBoundary>
                    <AppRouter />
                </ErrorBoundary>
            </OfflineProvider>
        </div>
    )
}

export default OfflineApp