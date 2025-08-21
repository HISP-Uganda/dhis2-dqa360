/**
 * DHIS2 Link Utilities
 * Helper functions for creating links to DHIS2 resources
 */

/**
 * Generate a link to a DHIS2 dataset
 * @param {string} baseUrl - DHIS2 base URL
 * @param {string} datasetId - Dataset UID
 * @returns {string} - Full URL to the dataset in DHIS2
 */
export const generateDatasetLink = (baseUrl, datasetId) => {
    if (!baseUrl || !datasetId) {
        return null
    }
    
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    
    // Return link to dataset maintenance app
    return `${cleanBaseUrl}/dhis-web-maintenance/#/list/dataSetSection/dataSet`
}

/**
 * Generate a link to DHIS2 data entry for a specific dataset
 * @param {string} baseUrl - DHIS2 base URL
 * @param {string} datasetId - Dataset UID
 * @param {string} orgUnitId - Organization Unit UID (optional)
 * @param {string} period - Period (optional)
 * @returns {string} - Full URL to data entry
 */
export const generateDataEntryLink = (baseUrl, datasetId, orgUnitId = null, period = null) => {
    if (!baseUrl || !datasetId) {
        return null
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    let url = `${cleanBaseUrl}/dhis-web-dataentry/#/datasets/${datasetId}`
    
    const params = []
    if (orgUnitId) {
        params.push(`ou=${orgUnitId}`)
    }
    if (period) {
        params.push(`pe=${period}`)
    }
    
    if (params.length > 0) {
        url += `?${params.join('&')}`
    }
    
    return url
}

/**
 * Generate a link to DHIS2 analytics/data visualizer for a dataset
 * @param {string} baseUrl - DHIS2 base URL
 * @param {string} datasetId - Dataset UID
 * @returns {string} - Full URL to analytics
 */
export const generateAnalyticsLink = (baseUrl, datasetId) => {
    if (!baseUrl || !datasetId) {
        return null
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    return `${cleanBaseUrl}/dhis-web-data-visualizer/#/?id=${datasetId}`
}

/**
 * Generate a link to DHIS2 dataset reports
 * @param {string} baseUrl - DHIS2 base URL
 * @param {string} datasetId - Dataset UID
 * @returns {string} - Full URL to dataset reports
 */
export const generateDatasetReportLink = (baseUrl, datasetId) => {
    if (!baseUrl || !datasetId) {
        return null
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    return `${cleanBaseUrl}/dhis-web-reporting/#/standard-report?ds=${datasetId}`
}

/**
 * Check if a dataset exists in DHIS2 by making a HEAD request
 * @param {object} engine - DHIS2 data engine
 * @param {string} datasetId - Dataset UID
 * @returns {Promise<boolean>} - True if dataset exists
 */
export const checkDatasetExists = async (engine, datasetId) => {
    if (!engine || !datasetId) {
        return false
    }
    
    try {
        await engine.query({
            dataset: {
                resource: `dataSets/${datasetId}`,
                params: {
                    fields: 'id'
                }
            }
        })
        return true
    } catch (error) {
        return false
    }
}

/**
 * Get dataset status information
 * @param {object} localDataset - Local dataset object
 * @param {string} baseUrl - DHIS2 base URL
 * @returns {object} - Dataset status and links
 */
export const getDatasetStatus = (localDataset, baseUrl) => {
    if (!localDataset) {
        return {
            status: 'unknown',
            canLink: false,
            links: {}
        }
    }
    
    const hasLocalId = !!localDataset.id
    const hasDhis2Id = !!localDataset.dhis2Id
    const isCreatedInDhis2 = localDataset.dhis2Created === true
    
    let status = 'draft'
    if (isCreatedInDhis2) {
        status = 'created'
    } else if (hasDhis2Id) {
        status = 'ready_to_create'
    }
    
    const canLink = isCreatedInDhis2 && hasDhis2Id && baseUrl
    
    const links = canLink ? {
        maintenance: generateDatasetLink(baseUrl, localDataset.dhis2Id),
        dataEntry: generateDataEntryLink(baseUrl, localDataset.dhis2Id),
        analytics: generateAnalyticsLink(baseUrl, localDataset.dhis2Id),
        reports: generateDatasetReportLink(baseUrl, localDataset.dhis2Id)
    } : {}
    
    return {
        status,
        canLink,
        links,
        localId: localDataset.id,
        dhis2Id: localDataset.dhis2Id,
        createdAt: localDataset.dhis2CreatedAt,
        hasComponents: (localDataset.dataElements?.length || 0) > 0 && (localDataset.orgUnits?.length || 0) > 0
    }
}

/**
 * Format dataset status for display
 * @param {string} status - Dataset status
 * @returns {object} - Display information
 */
export const formatDatasetStatus = (status) => {
    const statusMap = {
        draft: {
            label: 'Draft',
            color: 'grey',
            icon: '📝',
            description: 'Dataset is being prepared'
        },
        ready_to_create: {
            label: 'Ready to Create',
            color: 'blue',
            icon: '🔄',
            description: 'Dataset has UID and is ready to be created in DHIS2'
        },
        created: {
            label: 'Created in DHIS2',
            color: 'green',
            icon: '✅',
            description: 'Dataset exists in DHIS2 and can be accessed'
        },
        unknown: {
            label: 'Unknown',
            color: 'red',
            icon: '❓',
            description: 'Dataset status cannot be determined'
        }
    }
    
    return statusMap[status] || statusMap.unknown
}