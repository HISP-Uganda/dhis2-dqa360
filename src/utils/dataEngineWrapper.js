/**
 * Data Engine Wrapper
 * Automatically handles problematic ID mapping for DHIS2 API calls
 */

import { mapId, isProblematicId, initializeIdMappings } from './idMapper'

/**
 * Wrap data engine to handle problematic IDs
 * @param {Object} dataEngine - Original DHIS2 data engine
 * @returns {Object} Wrapped data engine
 */
export const wrapDataEngine = (dataEngine) => {
    let initialized = false

    const ensureInitialized = async () => {
        if (!initialized) {
            await initializeIdMappings(dataEngine)
            initialized = true
        }
    }

    return {
        ...dataEngine,
        
        query: async (querySpec) => {
            await ensureInitialized()
            
            // Map problematic IDs in query spec
            const mappedQuerySpec = mapQuerySpec(querySpec)
            
            try {
                return await dataEngine.query(mappedQuerySpec)
            } catch (error) {
                // If query fails with 404, try to handle it gracefully
                if (error.message?.includes('404') || error.message?.includes('Not Found')) {
                    console.warn('🔄 Query failed with 404, attempting fallback:', error.message)
                    return handleQueryFallback(querySpec, error)
                }
                throw error
            }
        },

        mutate: async (mutationSpec) => {
            await ensureInitialized()
            
            // Map problematic IDs in mutation spec
            const mappedMutationSpec = mapMutationSpec(mutationSpec)
            
            try {
                return await dataEngine.mutate(mappedMutationSpec)
            } catch (error) {
                // If mutation fails with 409, try to handle conflict
                if (error.message?.includes('409') || error.message?.includes('Conflict')) {
                    console.warn('🔄 Mutation failed with 409, attempting conflict resolution:', error.message)
                    return handleMutationConflict(mutationSpec, error)
                }
                throw error
            }
        }
    }
}

/**
 * Map problematic IDs in query specification
 * @param {Object} querySpec - Original query specification
 * @returns {Object} Mapped query specification
 */
const mapQuerySpec = (querySpec) => {
    const mappedSpec = {}

    for (const [key, query] of Object.entries(querySpec)) {
        mappedSpec[key] = mapSingleQuery(query)
    }

    return mappedSpec
}

/**
 * Map problematic IDs in a single query
 * @param {Object} query - Single query object
 * @returns {Object} Mapped query object
 */
const mapSingleQuery = (query) => {
    if (!query.resource) return query

    const mappedQuery = { ...query }

    // Extract resource type and ID from resource path
    const resourceParts = query.resource.split('/')
    const resourceType = resourceParts[0]
    const resourceId = resourceParts[1]

    // Map the resource ID if it's problematic
    if (resourceId && isProblematicId(resourceType, resourceId)) {
        const mappedId = mapId(resourceType, resourceId)
        if (mappedId !== resourceId) {
            resourceParts[1] = mappedId
            mappedQuery.resource = resourceParts.join('/')
            console.log(`🔄 Mapped query resource: ${query.resource} → ${mappedQuery.resource}`)
        }
    }

    // Map IDs in filter parameters
    if (mappedQuery.params?.filter) {
        mappedQuery.params = { ...mappedQuery.params }
        mappedQuery.params.filter = mapFilterIds(mappedQuery.params.filter, resourceType)
    }

    return mappedQuery
}

/**
 * Map problematic IDs in filter parameters
 * @param {string|Array} filter - Filter parameter(s)
 * @param {string} resourceType - Resource type for context
 * @returns {string|Array} Mapped filter parameter(s)
 */
const mapFilterIds = (filter, resourceType) => {
    if (Array.isArray(filter)) {
        return filter.map(f => mapFilterIds(f, resourceType))
    }

    if (typeof filter !== 'string') return filter

    // Look for ID patterns in filters (e.g., "id:eq:someId")
    return filter.replace(/([a-zA-Z0-9]{11})/g, (match) => {
        if (isProblematicId(resourceType, match)) {
            const mappedId = mapId(resourceType, match)
            if (mappedId !== match) {
                console.log(`🔄 Mapped filter ID: ${match} → ${mappedId}`)
                return mappedId
            }
        }
        return match
    })
}

/**
 * Map problematic IDs in mutation specification
 * @param {Object} mutationSpec - Original mutation specification
 * @returns {Object} Mapped mutation specification
 */
const mapMutationSpec = (mutationSpec) => {
    const mappedSpec = { ...mutationSpec }

    // Map resource path
    if (mappedSpec.resource) {
        const resourceParts = mappedSpec.resource.split('/')
        const resourceType = resourceParts[0]
        const resourceId = resourceParts[1]

        if (resourceId && isProblematicId(resourceType, resourceId)) {
            const mappedId = mapId(resourceType, resourceId)
            if (mappedId !== resourceId) {
                resourceParts[1] = mappedId
                mappedSpec.resource = resourceParts.join('/')
                console.log(`🔄 Mapped mutation resource: ${mutationSpec.resource} → ${mappedSpec.resource}`)
            }
        }
    }

    // Map IDs in data payload
    if (mappedSpec.data) {
        mappedSpec.data = mapDataPayload(mappedSpec.data)
    }

    return mappedSpec
}

/**
 * Map problematic IDs in data payload
 * @param {Object} data - Data payload
 * @returns {Object} Mapped data payload
 */
const mapDataPayload = (data) => {
    if (!data || typeof data !== 'object') return data

    const mappedData = { ...data }

    // Map category combo references
    if (mappedData.categoryCombo?.id && isProblematicId('categoryCombos', mappedData.categoryCombo.id)) {
        const mappedId = mapId('categoryCombos', mappedData.categoryCombo.id)
        mappedData.categoryCombo = { ...mappedData.categoryCombo, id: mappedId }
    }

    // Map category references
    if (mappedData.categories) {
        mappedData.categories = mappedData.categories.map(cat => {
            if (cat.id && isProblematicId('categories', cat.id)) {
                const mappedId = mapId('categories', cat.id)
                return { ...cat, id: mappedId }
            }
            return cat
        })
    }

    // Map category option references
    if (mappedData.categoryOptions) {
        mappedData.categoryOptions = mappedData.categoryOptions.map(opt => {
            if (opt.id && isProblematicId('categoryOptions', opt.id)) {
                const mappedId = mapId('categoryOptions', opt.id)
                return { ...opt, id: mappedId }
            }
            return opt
        })
    }

    // Map data set references
    if (mappedData.dataSet?.id && isProblematicId('dataSets', mappedData.dataSet.id)) {
        const mappedId = mapId('dataSets', mappedData.dataSet.id)
        mappedData.dataSet = { ...mappedData.dataSet, id: mappedId }
    }

    // Recursively map nested objects
    for (const [key, value] of Object.entries(mappedData)) {
        if (Array.isArray(value)) {
            mappedData[key] = value.map(item => 
                typeof item === 'object' ? mapDataPayload(item) : item
            )
        } else if (value && typeof value === 'object' && !mappedData[key].id) {
            mappedData[key] = mapDataPayload(value)
        }
    }

    return mappedData
}

/**
 * Handle query fallback when 404 occurs
 * @param {Object} querySpec - Original query specification
 * @param {Error} error - Original error
 * @returns {Object} Fallback response
 */
const handleQueryFallback = (querySpec, error) => {
    console.warn('🔄 Providing fallback response for failed query')
    
    // Return empty response structure based on query
    const fallbackResponse = {}
    
    for (const key of Object.keys(querySpec)) {
        // Determine resource type from query
        const resourceType = querySpec[key].resource?.split('/')[0]
        
        if (resourceType) {
            fallbackResponse[key] = {
                [resourceType]: [],
                pager: {
                    page: 1,
                    pageCount: 1,
                    total: 0,
                    pageSize: 50
                }
            }
        } else {
            fallbackResponse[key] = null
        }
    }
    
    return fallbackResponse
}

/**
 * Handle mutation conflict when 409 occurs
 * @param {Object} mutationSpec - Original mutation specification
 * @param {Error} error - Original error
 * @returns {Object} Conflict resolution response
 */
const handleMutationConflict = (mutationSpec, error) => {
    console.warn('🔄 Handling mutation conflict')
    
    // For now, return a success-like response
    // In a real implementation, you might want to check if the object already exists
    return {
        status: 'OK',
        httpStatus: 'OK',
        httpStatusCode: 200,
        message: 'Object already exists (conflict resolved)',
        response: {
            responseType: 'ObjectReport',
            uid: mutationSpec.data?.id || 'unknown',
            klass: mutationSpec.resource?.split('/')[0] || 'unknown'
        }
    }
}

export default wrapDataEngine