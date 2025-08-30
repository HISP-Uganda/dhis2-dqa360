/**
 * ID Mapper Utility
 * Maps problematic hardcoded IDs to available alternatives
 */

// Problematic IDs from error logs
const PROBLEMATIC_IDS = {
    categoryCombos: ['esaNB4G5AHs', 'TUYu2OrnbXV', 'iexS9B0LKpd', 'qP9R7dIy9l0'],
    categories: ['O5P6e8yu1T6', 'aIn0fYpbJBB'],
    categoryOptions: ['SmYO0gIhf56', 'TxZHRyZzO7U', 'xxPa3FS6PdJ', 'aszipxCwbou', 'J54uo0MHP8h', 'EUk9GP2wlE7', 'OtOMRJIJ1oc'],
    dataSets: ['mdVgUOEm5NQ', 's2E0qbAHCMM', 'HT15afG5J4T']
}

// Cache for mappings
let idMappings = null
let fallbackObjects = null

/**
 * Initialize ID mappings by discovering available objects
 * @param {Object} dataEngine - DHIS2 data engine
 */
export const initializeIdMappings = async (dataEngine) => {
    if (idMappings) return idMappings

    console.log('🔄 Initializing ID mappings...')
    
    try {
        // Try to load existing mappings from datastore
        const existingMappings = await loadMappingsFromDatastore(dataEngine)
        if (existingMappings) {
            idMappings = existingMappings
            console.log('✅ Loaded existing ID mappings')
            return idMappings
        }

        // Create new mappings
        idMappings = await createIdMappings(dataEngine)
        
        // Store mappings for future use
        await storeMappingsToDatastore(dataEngine, idMappings)
        
        console.log('✅ ID mappings initialized')
        return idMappings

    } catch (error) {
        console.warn('⚠️ Could not initialize ID mappings:', error.message)
        // Return empty mappings to prevent errors
        idMappings = {
            categoryCombos: {},
            categories: {},
            categoryOptions: {},
            dataSets: {}
        }
        return idMappings
    }
}

/**
 * Load mappings from datastore
 * @param {Object} dataEngine - DHIS2 data engine
 */
const loadMappingsFromDatastore = async (dataEngine) => {
    try {
        const result = await dataEngine.query({
            mappings: {
                resource: 'dataStore/dqa360/idMappings'
            }
        })
        return result.mappings
    } catch (error) {
        return null
    }
}

/**
 * Store mappings to datastore
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Object} mappings - ID mappings
 */
const storeMappingsToDatastore = async (dataEngine, mappings) => {
    try {
        await dataEngine.mutate({
            resource: 'dataStore/dqa360/idMappings',
            type: 'create',
            data: mappings
        })
    } catch (error) {
        // Try update if create fails
        try {
            await dataEngine.mutate({
                resource: 'dataStore/dqa360/idMappings',
                type: 'update',
                data: mappings
            })
        } catch (updateError) {
            console.warn('Could not store ID mappings:', updateError.message)
        }
    }
}

/**
 * Create ID mappings by discovering available objects
 * @param {Object} dataEngine - DHIS2 data engine
 */
const createIdMappings = async (dataEngine) => {
    const mappings = {
        categoryCombos: {},
        categories: {},
        categoryOptions: {},
        dataSets: {}
    }

    // Get fallback objects
    fallbackObjects = await getFallbackObjects(dataEngine)

    // Map problematic category combos
    if (fallbackObjects.categoryCombo) {
        PROBLEMATIC_IDS.categoryCombos.forEach(problemId => {
            mappings.categoryCombos[problemId] = fallbackObjects.categoryCombo.id
        })
    }

    // Map problematic categories
    if (fallbackObjects.category) {
        PROBLEMATIC_IDS.categories.forEach(problemId => {
            mappings.categories[problemId] = fallbackObjects.category.id
        })
    }

    // Map problematic category options
    if (fallbackObjects.categoryOption) {
        PROBLEMATIC_IDS.categoryOptions.forEach(problemId => {
            mappings.categoryOptions[problemId] = fallbackObjects.categoryOption.id
        })
    }

    return mappings
}

/**
 * Get fallback objects for mapping
 * @param {Object} dataEngine - DHIS2 data engine
 */
const getFallbackObjects = async (dataEngine) => {
    const fallbacks = {}

    try {
        // Get default category combo
        const categoryComboQuery = {
            categoryCombos: {
                resource: 'categoryCombos',
                params: {
                    fields: 'id,name,code',
                    filter: 'name:eq:default',
                    pageSize: 1
                }
            }
        }

        const categoryComboResult = await dataEngine.query(categoryComboQuery)
        if (categoryComboResult.categoryCombos?.categoryCombos?.length > 0) {
            fallbacks.categoryCombo = categoryComboResult.categoryCombos.categoryCombos[0]
        } else {
            // Get any category combo
            const anyComboQuery = {
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code',
                        pageSize: 1
                    }
                }
            }
            const anyComboResult = await dataEngine.query(anyComboQuery)
            if (anyComboResult.categoryCombos?.categoryCombos?.length > 0) {
                fallbacks.categoryCombo = anyComboResult.categoryCombos.categoryCombos[0]
            }
        }

        // Get default category
        const categoryQuery = {
            categories: {
                resource: 'categories',
                params: {
                    fields: 'id,name,code',
                    filter: 'name:eq:default',
                    pageSize: 1
                }
            }
        }

        const categoryResult = await dataEngine.query(categoryQuery)
        if (categoryResult.categories?.categories?.length > 0) {
            fallbacks.category = categoryResult.categories.categories[0]
        } else {
            // Get any category
            const anyCategoryQuery = {
                categories: {
                    resource: 'categories',
                    params: {
                        fields: 'id,name,code',
                        pageSize: 1
                    }
                }
            }
            const anyCategoryResult = await dataEngine.query(anyCategoryQuery)
            if (anyCategoryResult.categories?.categories?.length > 0) {
                fallbacks.category = anyCategoryResult.categories.categories[0]
            }
        }

        // Get default category option
        const categoryOptionQuery = {
            categoryOptions: {
                resource: 'categoryOptions',
                params: {
                    fields: 'id,name,code',
                    filter: 'name:eq:default',
                    pageSize: 1
                }
            }
        }

        const categoryOptionResult = await dataEngine.query(categoryOptionQuery)
        if (categoryOptionResult.categoryOptions?.categoryOptions?.length > 0) {
            fallbacks.categoryOption = categoryOptionResult.categoryOptions.categoryOptions[0]
        } else {
            // Get any category option
            const anyOptionQuery = {
                categoryOptions: {
                    resource: 'categoryOptions',
                    params: {
                        fields: 'id,name,code',
                        pageSize: 1
                    }
                }
            }
            const anyOptionResult = await dataEngine.query(anyOptionQuery)
            if (anyOptionResult.categoryOptions?.categoryOptions?.length > 0) {
                fallbacks.categoryOption = anyOptionResult.categoryOptions.categoryOptions[0]
            }
        }

    } catch (error) {
        console.warn('Could not get fallback objects:', error.message)
    }

    return fallbacks
}

/**
 * Map a problematic ID to a working alternative
 * @param {string} resourceType - Type of resource (categoryCombos, categories, etc.)
 * @param {string} problemId - Problematic ID to map
 * @returns {string} Mapped ID or original ID if no mapping exists
 */
export const mapId = (resourceType, problemId) => {
    if (!idMappings || !idMappings[resourceType]) {
        return problemId
    }

    const mappedId = idMappings[resourceType][problemId]
    if (mappedId) {
        console.log(`🔄 Mapped ${resourceType}/${problemId} → ${mappedId}`)
        return mappedId
    }

    return problemId
}

/**
 * Check if an ID is problematic
 * @param {string} resourceType - Type of resource
 * @param {string} id - ID to check
 * @returns {boolean} True if ID is problematic
 */
export const isProblematicId = (resourceType, id) => {
    return PROBLEMATIC_IDS[resourceType]?.includes(id) || false
}

/**
 * Map object references in data
 * @param {Object} data - Data object that may contain problematic ID references
 * @returns {Object} Data with mapped IDs
 */
export const mapObjectReferences = (data) => {
    if (!data || !idMappings) return data

    const mappedData = { ...data }

    // Map category combo references
    if (mappedData.categoryCombo?.id) {
        const mappedId = mapId('categoryCombos', mappedData.categoryCombo.id)
        if (mappedId !== mappedData.categoryCombo.id) {
            mappedData.categoryCombo = { ...mappedData.categoryCombo, id: mappedId }
        }
    }

    // Map category references
    if (mappedData.categories) {
        mappedData.categories = mappedData.categories.map(cat => {
            const mappedId = mapId('categories', cat.id)
            return mappedId !== cat.id ? { ...cat, id: mappedId } : cat
        })
    }

    // Map category option references
    if (mappedData.categoryOptions) {
        mappedData.categoryOptions = mappedData.categoryOptions.map(opt => {
            const mappedId = mapId('categoryOptions', opt.id)
            return mappedId !== opt.id ? { ...opt, id: mappedId } : opt
        })
    }

    // Map data set references
    if (mappedData.dataSet?.id) {
        const mappedId = mapId('dataSets', mappedData.dataSet.id)
        if (mappedId !== mappedData.dataSet.id) {
            mappedData.dataSet = { ...mappedData.dataSet, id: mappedId }
        }
    }

    return mappedData
}

/**
 * Clear ID mappings cache (useful for testing)
 */
export const clearMappingsCache = () => {
    idMappings = null
    fallbackObjects = null
}

export default {
    initializeIdMappings,
    mapId,
    isProblematicId,
    mapObjectReferences,
    clearMappingsCache
}