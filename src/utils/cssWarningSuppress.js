/**
 * CSS Warning Suppression Utility
 * 
 * This utility suppresses StyleSheet warnings that occur when CSS-in-JS libraries
 * try to inject CSS rules containing Mozilla-specific pseudo-elements in non-Firefox browsers.
 * 
 * The warnings are harmless but create noise in the console during development.
 */

/**
 * Check if the current browser is Firefox
 */
const isFirefox = () => {
    return navigator.userAgent.toLowerCase().includes('firefox')
}

/**
 * Check if a CSS rule contains Mozilla-specific pseudo-elements or pseudo-classes
 */
const containsMozillaSpecificCSS = (cssText) => {
    if (!cssText || typeof cssText !== 'string') return false
    
    const mozillaSelectors = [
        '::-moz-focus-inner',
        ':-moz-focusring',
        '::-moz-selection',
        '::-moz-placeholder',
        ':-moz-any-link',
        ':-moz-read-only',
        ':-moz-read-write',
        '::-moz-progress-bar',
        '::-moz-range-track',
        '::-moz-range-thumb'
    ]
    
    return mozillaSelectors.some(selector => cssText.includes(selector))
}

/**
 * Patch CSSStyleSheet.insertRule to filter out problematic Mozilla-specific rules
 */
const patchInsertRule = () => {
    // Only patch in non-Firefox browsers
    if (isFirefox()) {
        console.log('🦊 Firefox detected - Mozilla CSS rules are supported')
        return
    }
    
    // Store the original insertRule method
    const originalInsertRule = CSSStyleSheet.prototype.insertRule
    
    // Override insertRule to filter out Mozilla-specific rules
    CSSStyleSheet.prototype.insertRule = function(rule, index) {
        try {
            // Check if the rule contains Mozilla-specific CSS
            if (containsMozillaSpecificCSS(rule)) {
                // Silently ignore the rule instead of throwing an error
                console.debug('🔇 Suppressed Mozilla-specific CSS rule:', rule)
                return 0 // Return a valid index
            }
            
            // Call the original method for valid rules
            return originalInsertRule.call(this, rule, index)
        } catch (error) {
            // If the rule is still invalid, log it but don't throw
            if (error.message && error.message.includes('illegal rule')) {
                console.debug('🔇 Suppressed illegal CSS rule:', rule, error.message)
                return 0
            }
            // Re-throw other types of errors
            throw error
        }
    }
    
    console.log('🛡️ CSS warning suppression activated for Mozilla-specific rules')
}

/**
 * Patch console.warn to filter out specific CSS warnings
 */
const patchConsoleWarn = () => {
    const originalWarn = console.warn
    
    console.warn = function(...args) {
        const message = args.join(' ')
        
        // Filter out specific CSS warnings
        const suppressedWarnings = [
            'StyleSheet: illegal rule',
            'Failed to execute \'insertRule\' on \'CSSStyleSheet\'',
            'moz-focus-inner',
            'moz-focusring'
        ]
        
        const shouldSuppress = suppressedWarnings.some(warning => 
            message.includes(warning)
        )
        
        if (shouldSuppress) {
            console.debug('🔇 Suppressed CSS warning:', ...args)
            return
        }
        
        // Call original warn for other messages
        originalWarn.apply(console, args)
    }
}

/**
 * Initialize CSS warning suppression
 * Call this early in the application lifecycle
 */
export const initializeCSSWarningSuppress = () => {
    try {
        patchInsertRule()
        patchConsoleWarn()
        console.log('✅ CSS warning suppression initialized')
    } catch (error) {
        console.error('❌ Failed to initialize CSS warning suppression:', error)
    }
}

/**
 * Restore original CSS methods (for testing or cleanup)
 */
export const restoreCSSMethods = () => {
    // This would require storing original methods, but for production use
    // we typically don't need to restore them
    console.log('ℹ️ CSS method restoration not implemented (not typically needed)')
}

/**
 * Check if CSS warning suppression is active
 */
export const isCSSWarningSuppressionActive = () => {
    return !isFirefox() && CSSStyleSheet.prototype.insertRule.toString().includes('containsMozillaSpecificCSS')
}

// Auto-initialize in development mode
if (process.env.NODE_ENV === 'development') {
    // Use a small delay to ensure DOM is ready
    setTimeout(initializeCSSWarningSuppress, 0)
}