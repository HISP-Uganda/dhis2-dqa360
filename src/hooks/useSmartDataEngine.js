/**
 * Smart Data Engine Hook
 * Provides a data engine that automatically handles 404 (create new) and 409 (reuse existing)
 */

import { useDataEngine } from '@dhis2/app-runtime'
import { useMemo } from 'react'
import { wrapDataEngineWithSmartHandling } from '../utils/smartDataEngineWrapper'

/**
 * Hook that provides a smart data engine with automatic error handling
 * @returns {Object} Smart data engine with enhanced capabilities
 */
export function useSmartDataEngine() {
    const originalDataEngine = useDataEngine()
    
    const smartDataEngine = useMemo(() => {
        return wrapDataEngineWithSmartHandling(originalDataEngine)
    }, [originalDataEngine])
    
    return smartDataEngine
}

export default useSmartDataEngine