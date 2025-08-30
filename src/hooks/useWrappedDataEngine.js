/**
 * Custom hook that provides a wrapped data engine with automatic ID mapping
 */

import { useDataEngine } from '@dhis2/app-runtime'
import { useMemo } from 'react'
import { wrapDataEngine } from '../utils/dataEngineWrapper'

/**
 * Hook that provides a data engine wrapped with automatic ID mapping
 * @returns {Object} Wrapped data engine
 */
export const useWrappedDataEngine = () => {
    const originalDataEngine = useDataEngine()
    
    const wrappedDataEngine = useMemo(() => {
        return wrapDataEngine(originalDataEngine)
    }, [originalDataEngine])
    
    return wrappedDataEngine
}

export default useWrappedDataEngine