/**
 * Conflict Resolver Utility
 * Handles 409 conflicts by reusing existing objects instead of creating duplicates
 */

/**
 * Check for existing object before creation to prevent 409 conflicts
 * Uses object mappings to handle problematic IDs
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} resourceType - Type of resource (dataSets, dataElements, etc.)
 * @param {Object} objectData - Object data to check
 * @returns {Promise<Object|null>} Existing object or null
 */
export const checkExistingObject = async (dataEngine, resourceType, objectData) => {
    try {
        // First check if we have mappings for problematic IDs
        const mappedObject = await checkObjectMappings(dataEngine, resourceType, objectData)
        if (mappedObject) {
            return mappedObject
        }
        
        // Strategy 1: Check by code (most reliable)
        if (objectData.code) {
            const codeQuery = {
                existing: {
                    resource: resourceType,
                    params: {
                        fields: 'id,name,code,shortName,displayName',
                        filter: `code:eq:${objectData.code}`,
                        pageSize: 1
                    }
                }
            }
            
            const codeResult = await dataEngine.query(codeQuery)
            const existingByCode = codeResult.existing?.[resourceType]?.[0]
            
            if (existingByCode) {
                return existingByCode
            }
        }
        
        // Strategy 2: Check by name
        if (objectData.name) {
            const nameQuery = {
                existing: {
                    resource: resourceType,
                    params: {
                        fields: 'id,name,code,shortName,displayName',
                        filter: `name:eq:${objectData.name}`,
                        pageSize: 1
                    }
                }
            }
            
            const nameResult = await dataEngine.query(nameQuery)
            const existingByName = nameResult.existing?.[resourceType]?.[0]
            
            if (existingByName) {
                return existingByName
            }
        }
        
        // Strategy 3: Check by shortName
        if (objectData.shortName) {
            const shortNameQuery = {
                existing: {
                    resource: resourceType,
                    params: {
                        fields: 'id,name,code,shortName,displayName',
                        filter: `shortName:eq:${objectData.shortName}`,
                        pageSize: 1
                    }
                }
            }
            
            const shortNameResult = await dataEngine.query(shortNameQuery)
            const existingByShortName = shortNameResult.existing?.[resourceType]?.[0]
            
            if (existingByShortName) {
                return existingByShortName
            }
        }
        
        return null
        
    } catch (error) {
        // Silently handle errors - return null to proceed with creation
        return null
    }
}

/**
 * Check object mappings for problematic IDs
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} resourceType - Type of resource
 * @param {Object} objectData - Object data to check
 * @returns {Promise<Object|null>} Mapped object or null
 */
const checkObjectMappings = async (dataEngine, resourceType, objectData) => {
    try {
        const mappingsQuery = {
            mappings: {
                resource: 'dataStore/dqa360/objectMappings'
            }
        }
        
        const mappingsResult = await dataEngine.query(mappingsQuery)
        const mappings = mappingsResult.mappings || {}
        const resourceMappings = mappings[resourceType] || {}
        
        // Check if any of the object identifiers have mappings
        const identifiers = [objectData.id, objectData.code, objectData.name].filter(Boolean)
        
        for (const identifier of identifiers) {
            if (resourceMappings[identifier]) {
                const mappedId = resourceMappings[identifier]
                
                // Get the mapped object
                const mappedQuery = {
                    mapped: {
                        resource: `${resourceType}/${mappedId}`,
                        params: {
                            fields: 'id,name,code,shortName,displayName'
                        }
                    }
                }
                
                const mappedResult = await dataEngine.query(mappedQuery)
                if (mappedResult.mapped) {
                    return mappedResult.mapped
                }
            }
        }
        
        return null
        
    } catch (error) {
        // Mappings don't exist or error occurred - continue with normal flow
        return null
    }
}

/**
 * Create object with conflict resolution - reuse existing or create new
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} resourceType - Type of resource
 * @param {Object} objectData - Object to create
 * @returns {Promise<Object>} Creation result
 */
export const createWithConflictResolution = async (dataEngine, resourceType, objectData) => {
    try {
        // First, check if object already exists
        const existingObject = await checkExistingObject(dataEngine, resourceType, objectData)
        
        if (existingObject) {
            // Return existing object as if it was just created
            return {
                success: true,
                status: 'OK',
                response: {
                    uid: existingObject.id
                },
                object: existingObject,
                reused: true,
                created: false
            }
        }
        
        // Object doesn't exist, create it
        const mutation = {
            resource: resourceType,
            type: 'create',
            data: objectData
        }
        
        const result = await dataEngine.mutate(mutation)
        
        return {
            success: true,
            status: result.status,
            response: result.response,
            object: {
                ...objectData,
                id: result.response?.uid || objectData.id
            },
            reused: false,
            created: true
        }
        
    } catch (error) {
        // If we get a 409 conflict, try one more time to find existing object
        if (error.status === 409 || error.httpStatusCode === 409) {
            const existingObject = await checkExistingObject(dataEngine, resourceType, objectData)
            
            if (existingObject) {
                return {
                    success: true,
                    status: 'OK',
                    response: {
                        uid: existingObject.id
                    },
                    object: existingObject,
                    reused: true,
                    created: false,
                    conflictResolved: true
                }
            }
        }
        
        // Re-throw error if we can't resolve it
        throw error
    }
}

/**
 * Get fallback category combo for missing references
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<Object|null>} Default or fallback category combo
 */
export const getFallbackCategoryCombo = async (dataEngine) => {
    try {
        // Try default category combo first
        const defaultQuery = {
            defaultCombo: {
                resource: 'categoryCombos/default',
                params: {
                    fields: 'id,name,code'
                }
            }
        }
        
        const defaultResult = await dataEngine.query(defaultQuery)
        if (defaultResult.defaultCombo) {
            return defaultResult.defaultCombo
        }
        
        // Fallback to any available category combo
        const anyQuery = {
            combos: {
                resource: 'categoryCombos',
                params: {
                    fields: 'id,name,code',
                    pageSize: 1
                }
            }
        }
        
        const anyResult = await dataEngine.query(anyQuery)
        const availableCombos = anyResult.combos?.categoryCombos || []
        
        if (availableCombos.length > 0) {
            return availableCombos[0]
        }
        
        return null
        
    } catch (error) {
        return null
    }
}

/**
 * Replace missing category combo references with available ones
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Object} objectData - Object with potentially missing category combo references
 * @returns {Promise<Object>} Object with valid category combo references
 */
export const fixMissingCategoryComboReferences = async (dataEngine, objectData) => {
    const fixedObject = { ...objectData }
    
    // Get fallback category combo
    const fallbackCombo = await getFallbackCategoryCombo(dataEngine)
    
    if (!fallbackCombo) {
        return fixedObject // Can't fix without a fallback
    }
    
    // Extended list of problematic category combo IDs from error logs
    const problematicCombos = [
        'TUYu2OrnbXV', 'iexS9B0LKpd', 'qP9R7dIy9l0', 'esaNB4G5AHs'
    ]
    
    // Problematic categories and category options
    const problematicCategories = ['O5P6e8yu1T6', 'aIn0fYpbJBB']
    const problematicCategoryOptions = [
        'SmYO0gIhf56', 'TxZHRyZzO7U', 'xxPa3FS6PdJ', 'aszipxCwbou', 
        'J54uo0MHP8h', 'EUk9GP2wlE7', 'OtOMRJIJ1oc'
    ]
    
    // Fix category combo references in the object
    if (fixedObject.categoryCombo && problematicCombos.includes(fixedObject.categoryCombo.id)) {
        fixedObject.categoryCombo = { id: fallbackCombo.id }
    }
    
    // Fix category combo references in data elements
    if (fixedObject.dataSetElements) {
        fixedObject.dataSetElements = fixedObject.dataSetElements.map(dse => {
            if (dse.categoryCombo && problematicCombos.includes(dse.categoryCombo.id)) {
                return {
                    ...dse,
                    categoryCombo: { id: fallbackCombo.id }
                }
            }
            return dse
        })
    }
    
    // Fix category combo references in data elements array
    if (fixedObject.dataElements) {
        fixedObject.dataElements = fixedObject.dataElements.map(de => {
            if (de.categoryCombo && problematicCombos.includes(de.categoryCombo.id)) {
                return {
                    ...de,
                    categoryCombo: { id: fallbackCombo.id }
                }
            }
            return de
        })
    }
    
    // Fix category references
    if (fixedObject.categories) {
        fixedObject.categories = fixedObject.categories.filter(cat => 
            !problematicCategories.includes(cat.id)
        )
    }
    
    // Fix category option references
    if (fixedObject.categoryOptions) {
        fixedObject.categoryOptions = fixedObject.categoryOptions.filter(opt => 
            !problematicCategoryOptions.includes(opt.id)
        )
    }
    
    // Fix nested category and category option references
    if (fixedObject.categoryCombo && fixedObject.categoryCombo.categories) {
        fixedObject.categoryCombo.categories = fixedObject.categoryCombo.categories.map(cat => {
            if (problematicCategories.includes(cat.id)) {
                return null // Will be filtered out
            }
            
            if (cat.categoryOptions) {
                cat.categoryOptions = cat.categoryOptions.filter(opt => 
                    !problematicCategoryOptions.includes(opt.id)
                )
            }
            
            return cat
        }).filter(Boolean)
    }
    
    return fixedObject
}

export default {
    checkExistingObject,
    createWithConflictResolution,
    getFallbackCategoryCombo,
    fixMissingCategoryComboReferences
}