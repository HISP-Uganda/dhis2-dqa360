import React from 'react'
import { Box, CircularLoader } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

/**
 * Centered loading component that takes full viewport height
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @param {string} props.minHeight - Minimum height (default: 100vh)
 * @param {boolean} props.small - Use small loader
 */
export const CenteredLoader = ({ 
    message = i18n.t('Loading...'), 
    minHeight = '100vh',
    small = false 
}) => {
    return (
        <Box 
            display="flex" 
            flexDirection="column"
            justifyContent="center" 
            alignItems="center" 
            style={{ 
                minHeight: minHeight,
                width: '100%',
                position: 'relative'
            }}
        >
            <CircularLoader small={small} />
            {message && (
                <Box marginTop="16px">
                    <p style={{ 
                        margin: 0, 
                        color: '#666', 
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {message}
                    </p>
                </Box>
            )}
        </Box>
    )
}

/**
 * Card-based centered loader for use within cards
 */
export const CardCenteredLoader = ({ 
    message = i18n.t('Loading...'), 
    minHeight = '400px',
    small = false 
}) => {
    return (
        <Box 
            display="flex" 
            flexDirection="column"
            justifyContent="center" 
            alignItems="center" 
            style={{ 
                minHeight: minHeight,
                width: '100%',
                padding: '32px'
            }}
        >
            <CircularLoader small={small} />
            {message && (
                <Box marginTop="16px">
                    <p style={{ 
                        margin: 0, 
                        color: '#666', 
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {message}
                    </p>
                </Box>
            )}
        </Box>
    )
}