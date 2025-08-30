/**
 * Metadata Error Recovery Utilities for DQA360
 * Handles common DHIS2 metadata creation errors and provides recovery strategies
 */

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Operation result
 */
export const retryWithBackoff = async (operation, maxRetries = 3, baseDelay = 1000) => {
    let lastError
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error
            
            if (attempt === maxRetries) {
                throw error
            }
            
            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt)
            console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
    
    throw lastError
}

/**
 * Find and reuse existing objects to avoid 409 conflicts
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} resourceType - Type of resource (dataSets, dataElements, etc.)
 * @param {Object} objectData - Object data that would cause conflict
 * @returns {Promise<Object>} Existing object or null if not found
 */
export const findExistingObject = async (dataEngine, resourceType, objectData) => {
    try {
        // Strategy 1: Find by code (most reliable)
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
                return {
                    success: true,
                    strategy: 'found_by_code',
                    object: existingByCode,
                    reused: true
                }
            }
        }
        
        // Strategy 2: Find by name
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
                return {
                    success: true,
                    strategy: 'found_by_name',
                    object: existingByName,
                    reused: true
                }
            }
        }
        
        // Strategy 3: Find by shortName
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
                return {
                    success: true,
                    strategy: 'found_by_shortname',
                    object: existingByShortName,
                    reused: true
                }
            }
        }
        
        return {
            success: false,
            strategy: 'not_found',
            object: null,
            reused: false
        }
        
    } catch (error) {
        return {
            success: false,
            strategy: 'search_failed',
            error: error.message,
            object: null,
            reused: false
        }
    }
}

/**
 * Handle 409 Conflict errors by generating unique identifiers (fallback only)
 * @param {Object} originalObject - Original object that caused conflict
 * @param {string} suffix - Additional suffix for uniqueness
 * @returns {Object} Modified object with unique identifiers
 */
export const handleConflictError = (originalObject, suffix = '') => {
    const timestamp = Date.now().toString()
    const uniqueSuffix = suffix || timestamp.slice(-8)
    
    return {
        ...originalObject,
        name: `${originalObject.name}_${uniqueSuffix}`,
        code: `${originalObject.code}_${uniqueSuffix}`,
        shortName: originalObject.shortName ? 
            `${originalObject.shortName} ${uniqueSuffix}`.substring(0, 50) : 
            undefined
    }
}

/**
 * Validate metadata object before creation
 * @param {Object} metadataObject - Object to validate
 * @param {string} objectType - Type of object (dataSet, dataElement, etc.)
 * @returns {Object} Validation result
 */
export const validateMetadataObject = (metadataObject, objectType) => {
    const errors = []
    const warnings = []
    
    // Common validations
    if (!metadataObject.name || metadataObject.name.trim().length === 0) {
        errors.push('Name is required')
    }
    
    if (!metadataObject.code || metadataObject.code.trim().length === 0) {
        errors.push('Code is required')
    }
    
    if (metadataObject.name && metadataObject.name.length > 230) {
        errors.push('Name is too long (max 230 characters)')
    }
    
    if (metadataObject.code && metadataObject.code.length > 50) {
        errors.push('Code is too long (max 50 characters)')
    }
    
    // Object-specific validations
    switch (objectType) {
        case 'dataSet':
            if (!metadataObject.periodType) {
                errors.push('Period type is required for datasets')
            }
            
            if (!metadataObject.dataSetElements || metadataObject.dataSetElements.length === 0) {
                warnings.push('Dataset has no data elements')
            }
            
            if (!metadataObject.organisationUnits || metadataObject.organisationUnits.length === 0) {
                warnings.push('Dataset has no organisation units')
            }
            break
            
        case 'dataElement':
            if (!metadataObject.valueType) {
                errors.push('Value type is required for data elements')
            }
            
            if (!metadataObject.domainType) {
                errors.push('Domain type is required for data elements')
            }
            break
            
        case 'categoryCombo':
            if (!metadataObject.categories || metadataObject.categories.length === 0) {
                errors.push('Category combo must have at least one category')
            }
            break
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    }
}

/**
 * Clean metadata object by removing invalid properties
 * @param {Object} metadataObject - Object to clean
 * @param {string} objectType - Type of object
 * @returns {Object} Cleaned object
 */
export const cleanMetadataObject = (metadataObject, objectType) => {
    const cleaned = { ...metadataObject }
    
    // Remove null/undefined values
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === null || cleaned[key] === undefined) {
            delete cleaned[key]
        }
    })
    
    // Ensure required properties have defaults
    switch (objectType) {
        case 'dataSet':
            cleaned.periodType = cleaned.periodType || 'Monthly'
            cleaned.expiryDays = cleaned.expiryDays || 0
            cleaned.openFuturePeriods = cleaned.openFuturePeriods || 0
            cleaned.dataSetElements = cleaned.dataSetElements || []
            cleaned.organisationUnits = cleaned.organisationUnits || []
            break
            
        case 'dataElement':
            cleaned.valueType = cleaned.valueType || 'INTEGER'
            cleaned.domainType = cleaned.domainType || 'AGGREGATE'
            cleaned.aggregationType = cleaned.aggregationType || 'SUM'
            break
            
        case 'categoryCombo':
            cleaned.dataDimensionType = cleaned.dataDimensionType || 'DISAGGREGATION'
            cleaned.categories = cleaned.categories || []
            break
    }
    
    return cleaned
}

/**
 * Handle metadata creation with comprehensive error recovery
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} resource - DHIS2 resource type
 * @param {Object} metadataObject - Object to create
 * @param {Object} options - Options for error recovery
 * @returns {Promise<Object>} Creation result
 */
export const createMetadataWithRecovery = async (
    dataEngine, 
    resource, 
    metadataObject, 
    options = {}
) => {
    const {
        maxRetries = 3,
        validateFirst = true,
        cleanFirst = true,
        onProgress = null,
        objectType = resource.replace(/s$/, '') // Remove trailing 's'
    } = options
    
    let workingObject = { ...metadataObject }
    
    // Step 1: Validate if requested
    if (validateFirst) {
        const validation = validateMetadataObject(workingObject, objectType)
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }
        
        if (validation.warnings.length > 0 && onProgress) {
            onProgress({ 
                message: `Warnings: ${validation.warnings.join(', ')}`, 
                step: 'validation' 
            })
        }
    }
    
    // Step 2: Clean if requested
    if (cleanFirst) {
        workingObject = cleanMetadataObject(workingObject, objectType)
    }
    
    // Step 3: Check for existing objects first to avoid conflicts
    const existingCheck = await findExistingObject(dataEngine, resource, workingObject)
    
    if (existingCheck.success && existingCheck.reused) {
        if (onProgress) {
            onProgress({ 
                message: `Reusing existing ${objectType}: ${existingCheck.object.name}`, 
                step: 'reused' 
            })
        }
        
        return {
            success: true,
            result: {
                status: 'OK',
                response: {
                    uid: existingCheck.object.id
                }
            },
            object: existingCheck.object,
            reused: true
        }
    }
    
    // Step 4: Attempt creation with retry logic
    return await retryWithBackoff(async () => {
        try {
            const mutation = {
                resource,
                type: 'create',
                data: workingObject
            }
            
            const result = await dataEngine.mutate(mutation)
            
            if (onProgress) {
                onProgress({ 
                    message: `Successfully created ${objectType}: ${workingObject.name}`, 
                    step: 'success' 
                })
            }
            
            return {
                success: true,
                result,
                object: workingObject,
                reused: false
            }
            
        } catch (error) {
            // Handle specific error types
            if (error.status === 409 || error.httpStatusCode === 409) {
                // Try to find existing object again (might have been created by another process)
                const conflictCheck = await findExistingObject(dataEngine, resource, workingObject)
                
                if (conflictCheck.success && conflictCheck.reused) {
                    if (onProgress) {
                        onProgress({ 
                            message: `Found existing ${objectType} during conflict: ${conflictCheck.object.name}`, 
                            step: 'conflict_resolved' 
                        })
                    }
                    
                    return {
                        success: true,
                        result: {
                            status: 'OK',
                            response: {
                                uid: conflictCheck.object.id
                            }
                        },
                        object: conflictCheck.object,
                        reused: true
                    }
                }
                
                // If no existing object found, don't create duplicates - just fail gracefully
                throw new Error(`Object with similar properties already exists: ${workingObject.name}`)
            }
            
            // Handle validation errors
            if (error.status === 400 || error.httpStatusCode === 400) {
                console.error('Validation error details:', error.details || error.message)
                if (onProgress) {
                    onProgress({ 
                        message: `Validation error: ${error.message}`, 
                        step: 'error' 
                    })
                }
            }
            
            throw error
        }
    }, maxRetries)
}

/**
 * Batch create metadata objects with error recovery
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} resource - DHIS2 resource type
 * @param {Array} metadataObjects - Objects to create
 * @param {Object} options - Options for error recovery
 * @returns {Promise<Array>} Creation results
 */
export const batchCreateMetadataWithRecovery = async (
    dataEngine,
    resource,
    metadataObjects,
    options = {}
) => {
    const {
        concurrency = 3,
        onProgress = null,
        continueOnError = true
    } = options
    
    const results = []
    const errors = []
    
    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < metadataObjects.length; i += concurrency) {
        const batch = metadataObjects.slice(i, i + concurrency)
        
        const batchPromises = batch.map(async (obj, index) => {
            try {
                const result = await createMetadataWithRecovery(
                    dataEngine,
                    resource,
                    obj,
                    {
                        ...options,
                        onProgress: onProgress ? (progress) => {
                            onProgress({
                                ...progress,
                                objectIndex: i + index,
                                totalObjects: metadataObjects.length
                            })
                        } : null
                    }
                )
                
                results.push(result)
                return result
                
            } catch (error) {
                const errorInfo = {
                    object: obj,
                    error: error.message,
                    index: i + index
                }
                
                errors.push(errorInfo)
                
                if (!continueOnError) {
                    throw error
                }
                
                console.error(`Failed to create ${resource} at index ${i + index}:`, error)
                return null
            }
        })
        
        await Promise.all(batchPromises)
    }
    
    return {
        successes: results.filter(r => r !== null),
        errors,
        totalProcessed: metadataObjects.length,
        successCount: results.filter(r => r !== null).length,
        errorCount: errors.length
    }
}

export default {
    retryWithBackoff,
    findExistingObject,
    handleConflictError,
    validateMetadataObject,
    cleanMetadataObject,
    createMetadataWithRecovery,
    batchCreateMetadataWithRecovery
}