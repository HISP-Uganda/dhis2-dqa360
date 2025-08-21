import React, { useRef, useEffect } from 'react'
import { InputField } from '@dhis2/ui'

/**
 * Custom DateInputField component that automatically opens the date picker on focus
 * This provides a better user experience by eliminating the need to click the calendar icon
 */
export const DateInputField = ({ label, value, onChange, required, ...props }) => {
    const containerRef = useRef(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Find the actual input element within the DHIS2 InputField
        const inputElement = container.querySelector('input[type="date"]')
        if (!inputElement) return

        const handleFocus = () => {
            // Small delay to ensure the input is ready and avoid conflicts
            setTimeout(() => {
                if (inputElement.showPicker) {
                    try {
                        inputElement.showPicker()
                    } catch (error) {
                        // Silently handle browsers that don't support showPicker
                        // This is expected in some browsers and not an error
                    }
                }
            }, 50)
        }

        const handleClick = () => {
            // Also trigger on click for consistency
            if (inputElement.showPicker) {
                try {
                    inputElement.showPicker()
                } catch (error) {
                    // Silently handle browsers that don't support showPicker
                }
            }
        }

        // Add event listeners
        inputElement.addEventListener('focus', handleFocus)
        inputElement.addEventListener('click', handleClick)

        // Cleanup function to remove event listeners
        return () => {
            if (inputElement) {
                inputElement.removeEventListener('focus', handleFocus)
                inputElement.removeEventListener('click', handleClick)
            }
        }
    }, [value]) // Re-run when value changes to ensure the input element is found

    return (
        <div ref={containerRef}>
            <InputField
                {...props}
                label={label}
                type="date"
                value={value}
                onChange={onChange}
                required={required}
            />
        </div>
    )
}