/**
 * Smart Data Engine Wrapper
 * Automatically handles 404 (create new) and 409 (reuse existing) scenarios
 */

import { SmartObjectManager } from './smartObjectManager'

/**
 * Wrap the data engine with smart object management
 * @param {Object} originalDataEngine The original DHIS2 data engine
 * @returns {Object} Wrapped data engine with smart handling
 */
export function wrapDataEngineWithSmartHandling(originalDataEngine) {
    const smartManager = new SmartObjectManager(originalDataEngine)
    
    // Store original methods
    const originalQuery = originalDataEngine.query.bind(originalDataEngine)
    const originalMutate = originalDataEngine.mutate.bind(originalDataEngine)

    return {
        ...originalDataEngine,
        
        /**
         * Enhanced query method with smart 404 handling
         */
        query: async function(queryConfig) {
            try {
                return await originalQuery(queryConfig)
            } catch (error) {
                // Handle 404 errors by creating missing objects
                if (error.message?.includes('404') || error.details?.httpStatusCode === 404) {
                    return await handleQuery404(queryConfig, error, smartManager)
                }
                throw error
            }
        },

        /**
         * Enhanced mutate method with smart 409 handling
         */
        mutate: async function(mutationConfig) {
            try {
                return await originalMutate(mutationConfig)
            } catch (error) {
                // Handle 409 conflicts by reusing existing objects
                if (error.message?.includes('409') || error.details?.httpStatusCode === 409) {
                    return await handleMutation409(mutationConfig, error, smartManager, originalDataEngine)
                }
                throw error
            }
        },

        /**
         * Get smart manager instance
         */
        getSmartManager: () => smartManager,

        /**
         * Get creation summary
         */
        getCreationSummary: () => smartManager.getCreationSummary()
    }
}

/**
 * Handle 404 errors in queries by creating missing objects
 */
async function handleQuery404(queryConfig, error, smartManager) {
    console.log('🔍 Handling 404 error by creating missing object...')
    
    // Extract resource info from query
    const queryKey = Object.keys(queryConfig)[0]
    const query = queryConfig[queryKey]
    
    if (!query.resource) {
        throw error // Can't handle without resource info
    }

    // Parse resource path to get type and ID
    const resourceParts = query.resource.split('/')
    const resourceType = resourceParts[0]
    const resourceId = resourceParts[1]

    if (!resourceId) {
        throw error // Can't handle without specific ID
    }

    let createdObject = null

    // Handle different resource types
    switch (resourceType) {
        case 'categoryCombos':
            createdObject = await smartManager.getOrCreateCategoryCombo(resourceId)
            break
        case 'categories':
            createdObject = await smartManager.getOrCreateCategory(resourceId)
            break
        case 'categoryOptions':
            createdObject = await smartManager.getOrCreateCategoryOption(resourceId)
            break
        default:
            console.warn(`Cannot auto-create resource type: ${resourceType}`)
            throw error
    }

    if (createdObject) {
        // Return the created object in the expected query format
        return {
            [queryKey]: createdObject
        }
    }

    throw error
}

/**
 * Handle 409 conflicts in mutations by reusing existing objects
 */
async function handleMutation409(mutationConfig, error, smartManager, originalDataEngine) {
    console.log('🔄 Handling 409 conflict by reusing existing object...')
    
    const { resource, data } = mutationConfig
    
    if (!resource || !data) {
        throw error
    }

    let existingObject = null

    // Handle different resource types
    switch (resource) {
        case 'categoryCombos':
            existingObject = await findExistingCategoryCombo(data, originalDataEngine)
            break
        case 'categories':
            existingObject = await findExistingCategory(data, originalDataEngine)
            break
        case 'categoryOptions':
            existingObject = await findExistingCategoryOption(data, originalDataEngine)
            break
        case 'dataSets':
            existingObject = await findExistingDataSet(data, originalDataEngine)
            break
        case 'dataElements':
            existingObject = await findExistingDataElement(data, originalDataEngine)
            break
        default:
            console.warn(`Cannot auto-reuse resource type: ${resource}`)
            throw error
    }

    if (existingObject) {
        console.log(`✅ 409 Conflict resolved: Reusing existing ${resource.slice(0, -1)}: ${existingObject.name} (${existingObject.id})`)
        return {
            status: 'OK',
            response: {
                uid: existingObject.id,
                ...existingObject
            }
        }
    }

    throw error
}

/**
 * Find existing category combo by name or code
 */
async function findExistingCategoryCombo(data, dataEngine) {
    try {
        const searchResponse = await dataEngine.query({
            categoryCombos: {
                resource: 'categoryCombos',
                params: {
                    fields: 'id,name,code,displayName',
                    filter: [
                        `name:eq:${data.name}`,
                        `code:eq:${data.code}`
                    ],
                    pageSize: 1
                }
            }
        })

        return searchResponse.categoryCombos?.categoryCombos?.[0] || null
    } catch (error) {
        console.warn('Could not search for existing category combo:', error.message)
        return null
    }
}

/**
 * Find existing category by name or code
 */
async function findExistingCategory(data, dataEngine) {
    try {
        const searchResponse = await dataEngine.query({
            categories: {
                resource: 'categories',
                params: {
                    fields: 'id,name,code,displayName',
                    filter: [
                        `name:eq:${data.name}`,
                        `code:eq:${data.code}`
                    ],
                    pageSize: 1
                }
            }
        })

        return searchResponse.categories?.categories?.[0] || null
    } catch (error) {
        console.warn('Could not search for existing category:', error.message)
        return null
    }
}

/**
 * Find existing category option by name or code
 */
async function findExistingCategoryOption(data, dataEngine) {
    try {
        const searchResponse = await dataEngine.query({
            categoryOptions: {
                resource: 'categoryOptions',
                params: {
                    fields: 'id,name,code,displayName',
                    filter: [
                        `name:eq:${data.name}`,
                        `code:eq:${data.code}`
                    ],
                    pageSize: 1
                }
            }
        })

        return searchResponse.categoryOptions?.categoryOptions?.[0] || null
    } catch (error) {
        console.warn('Could not search for existing category option:', error.message)
        return null
    }
}

/**
 * Find existing data set by name or code
 */
async function findExistingDataSet(data, dataEngine) {
    try {
        const searchResponse = await dataEngine.query({
            dataSets: {
                resource: 'dataSets',
                params: {
                    fields: 'id,name,code,displayName',
                    filter: [
                        `name:eq:${data.name}`,
                        `code:eq:${data.code}`
                    ],
                    pageSize: 1
                }
            }
        })

        return searchResponse.dataSets?.dataSets?.[0] || null
    } catch (error) {
        console.warn('Could not search for existing data set:', error.message)
        return null
    }
}

/**
 * Find existing data element by name or code
 */
async function findExistingDataElement(data, dataEngine) {
    try {
        const searchResponse = await dataEngine.query({
            dataElements: {
                resource: 'dataElements',
                params: {
                    fields: 'id,name,code,displayName',
                    filter: [
                        `name:eq:${data.name}`,
                        `code:eq:${data.code}`
                    ],
                    pageSize: 1
                }
            }
        })

        return searchResponse.dataElements?.dataElements?.[0] || null
    } catch (error) {
        console.warn('Could not search for existing data element:', error.message)
        return null
    }
}

export default wrapDataEngineWithSmartHandling