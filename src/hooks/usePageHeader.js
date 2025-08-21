import { useEffect } from 'react'
import { usePageContext } from '../contexts/PageContext'

export const usePageHeader = (title, description, breadcrumbs = []) => {
    const { setPageHeader, clearPageHeader } = usePageContext()
    
    useEffect(() => {
        // Set page header on mount
        if (title || description) {
            setPageHeader({ title, description, breadcrumbs })
        }
        
        // Cleanup on unmount
        return () => {
            clearPageHeader()
        }
    }, []) // Empty dependency array - only run on mount/unmount
}