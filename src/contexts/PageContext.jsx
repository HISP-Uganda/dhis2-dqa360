import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

const PageContext = createContext()

export const usePageContext = () => {
    const context = useContext(PageContext)
    if (!context) {
        throw new Error('usePageContext must be used within a PageProvider')
    }
    return context
}

export const PageProvider = ({ children }) => {
    const [pageInfo, setPageInfo] = useState({
        title: '',
        description: '',
        breadcrumbs: []
    })

    const setPageHeader = useCallback(({ title, description, breadcrumbs = [] }) => {
        setPageInfo(prevInfo => {
            // Only update if values have actually changed
            if (prevInfo.title === title && 
                prevInfo.description === description && 
                JSON.stringify(prevInfo.breadcrumbs) === JSON.stringify(breadcrumbs)) {
                return prevInfo
            }
            return { title, description, breadcrumbs }
        })
    }, [])

    const clearPageHeader = useCallback(() => {
        setPageInfo(prevInfo => {
            // Only clear if not already cleared
            if (prevInfo.title === '' && prevInfo.description === '' && prevInfo.breadcrumbs.length === 0) {
                return prevInfo
            }
            return { title: '', description: '', breadcrumbs: [] }
        })
    }, [])

    const contextValue = useMemo(() => ({
        pageInfo,
        setPageHeader,
        clearPageHeader
    }), [pageInfo, setPageHeader, clearPageHeader])

    return (
        <PageContext.Provider value={contextValue}>
            {children}
        </PageContext.Provider>
    )
}