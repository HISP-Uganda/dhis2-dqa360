/**
 * Error handling utilities for DQA360
 * Provides consistent error handling and logging across the application
 */

/**
 * Check if an error is an expected 404 that shouldn't be logged as an error
 * @param {Error} error - The error to check
 * @param {string} context - Context information about where the error occurred
 * @returns {boolean} - True if this is an expected 404
 */
export const isExpected404 = (error, context = '') => {
    if (!error) return false
    
    const is404 = error.details?.httpStatusCode === 404 || 
                  error.message?.includes('404') || 
                  error.message?.includes('Not Found')
    
    if (!is404) return false
    
    // Check for expected 404 contexts
    const expectedContexts = [
        'datastore-namespace-scan',
        'assessments-index-load',
        'legacy-assessments-load',
        'logo-banner-load'
    ]
    
    return expectedContexts.includes(context)
}

/**
 * Log an error appropriately based on whether it's expected or not
 * @param {Error} error - The error to log
 * @param {string} message - Custom message to log
 * @param {string} context - Context about where the error occurred
 */
export const logError = (error, message, context = '') => {
    if (isExpected404(error, context)) {
        // Don't log expected 404s as errors - just as info
        console.log(`ℹ️ ${message} (expected for fresh installations)`)
    } else {
        console.error(`❌ ${message}:`, error)
    }
}

/**
 * Handle datastore errors consistently
 * @param {Error} error - The error to handle
 * @param {string} operation - Description of the operation that failed
 * @param {string} namespace - The datastore namespace involved
 * @returns {Object} - Standardized error response
 */
export const handleDatastoreError = (error, operation, namespace = '') => {
    const is404 = error.details?.httpStatusCode === 404 || 
                  error.message?.includes('404') || 
                  error.message?.includes('Not Found')
    
    if (is404) {
        const namespaceInfo = namespace ? ` in namespace '${namespace}'` : ''
        console.log(`📭 ${operation}${namespaceInfo} - not found (expected for fresh installations)`)
        return {
            success: false,
            error: 'not_found',
            message: `${operation} not found`,
            expected: true,
            data: null
        }
    }
    
    console.error(`❌ ${operation} failed:`, error)
    return {
        success: false,
        error: 'unknown',
        message: error.message || 'Unknown error occurred',
        expected: false,
        data: null
    }
}

/**
 * Suppress console errors for expected 404s during development
 * This can be used to temporarily override console.error for specific operations
 */
export const withSuppressed404s = async (operation, context = '') => {
    const originalError = console.error
    
    console.error = (...args) => {
        // Check if this looks like a 404 error
        const errorString = args.join(' ')
        if (errorString.includes('404') && errorString.includes('Not Found')) {
            // Don't log 404s during this operation
            return
        }
        // Log other errors normally
        originalError.apply(console, args)
    }
    
    try {
        return await operation()
    } finally {
        // Restore original console.error
        console.error = originalError
    }
}