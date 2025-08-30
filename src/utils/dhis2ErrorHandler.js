/**
 * DHIS2 Error Handler for DQA360
 * Specifically handles the API errors you're experiencing
 */

/**
 * Handle missing category combo references (404 errors)
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Array} missingCombos - Array of missing category combo IDs
 * @returns {Promise<Object>} Mapping of missing IDs to fallback IDs
 */
export const handleMissingCategoryCombos = async (dataEngine, missingCombos = []) => {
    console.log('🔍 Handling missing category combos:', missingCombos)
    
    const fallbackMapping = {}
    
    try {
        // Get the default category combo
        const defaultQuery = {
            defaultCombo: {
                resource: 'categoryCombos/default',
                params: {
                    fields: 'id,name,code'
                }
            }
        }
        
        const defaultResult = await dataEngine.query(defaultQuery)
        const defaultCombo = defaultResult.defaultCombo
        
        if (defaultCombo) {
            console.log('✅ Found default category combo:', defaultCombo.name)
            
            // Map all missing combos to the default
            missingCombos.forEach(missingId => {
                fallbackMapping[missingId] = defaultCombo.id
            })
            
            return {
                success: true,
                fallbackMapping,
                defaultCombo
            }
        }
        
        // If no default, try to find any available category combo
        const anyComboQuery = {
            combos: {
                resource: 'categoryCombos',
                params: {
                    fields: 'id,name,code',
                    pageSize: 1
                }
            }
        }
        
        const anyResult = await dataEngine.query(anyComboQuery)
        const availableCombos = anyResult.combos?.categoryCombos || []
        
        if (availableCombos.length > 0) {
            const fallbackCombo = availableCombos[0]
            console.log('✅ Using fallback category combo:', fallbackCombo.name)
            
            missingCombos.forEach(missingId => {
                fallbackMapping[missingId] = fallbackCombo.id
            })
            
            return {
                success: true,
                fallbackMapping,
                defaultCombo: fallbackCombo
            }
        }
        
        throw new Error('No category combos available in the system')
        
    } catch (error) {
        console.error('❌ Failed to handle missing category combos:', error)
        return {
            success: false,
            error: error.message,
            fallbackMapping: {}
        }
    }
}

/**
 * Handle missing dataset references (404 errors)
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Array} missingDatasets - Array of missing dataset IDs
 * @returns {Promise<Object>} Information about missing datasets
 */
export const handleMissingDatasets = async (dataEngine, missingDatasets = []) => {
    console.log('🔍 Checking missing datasets:', missingDatasets)
    
    const results = {
        found: [],
        missing: [],
        alternatives: []
    }
    
    for (const datasetId of missingDatasets) {
        try {
            // Try to find the dataset
            const query = {
                dataset: {
                    resource: `dataSets/${datasetId}`,
                    params: {
                        fields: 'id,name,code'
                    }
                }
            }
            
            const result = await dataEngine.query(query)
            if (result.dataset) {
                results.found.push(result.dataset)
                console.log(`✅ Found dataset: ${result.dataset.name}`)
            }
            
        } catch (error) {
            results.missing.push(datasetId)
            console.log(`❌ Dataset not found: ${datasetId}`)
            
            // Try to find similar datasets by code pattern
            try {
                const searchQuery = {
                    similar: {
                        resource: 'dataSets',
                        params: {
                            fields: 'id,name,code',
                            filter: `code:like:DQA360`,
                            pageSize: 5
                        }
                    }
                }
                
                const searchResult = await dataEngine.query(searchQuery)
                const similar = searchResult.similar?.dataSets || []
                
                if (similar.length > 0) {
                    results.alternatives.push(...similar)
                }
                
            } catch (searchError) {
                console.warn('Could not search for similar datasets:', searchError.message)
            }
        }
    }
    
    return results
}

/**
 * Handle 409 Conflict errors during metadata import
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Object} conflictData - Data that caused the conflict
 * @param {string} resourceType - Type of resource (dataSets, dataElements, etc.)
 * @returns {Promise<Object>} Resolution result
 */
export const handleMetadataConflicts = async (dataEngine, conflictData, resourceType) => {
    console.log(`🔍 Handling ${resourceType} conflict for:`, conflictData.name || conflictData.code)
    
    try {
        // Strategy 1: Try to find existing object by code
        if (conflictData.code) {
            const existingQuery = {
                existing: {
                    resource: resourceType,
                    params: {
                        fields: 'id,name,code',
                        filter: `code:eq:${conflictData.code}`,
                        pageSize: 1
                    }
                }
            }
            
            const existingResult = await dataEngine.query(existingQuery)
            const existing = existingResult.existing?.[resourceType]?.[0]
            
            if (existing) {
                console.log(`✅ Found existing ${resourceType.slice(0, -1)}: ${existing.name}`)
                return {
                    strategy: 'reuse',
                    success: true,
                    object: existing,
                    message: `Reusing existing ${resourceType.slice(0, -1)}: ${existing.name}`
                }
            }
        }
        
        // Strategy 2: Create with unique identifiers
        const timestamp = Date.now().toString().slice(-8)
        const uniqueData = {
            ...conflictData,
            name: `${conflictData.name}_${timestamp}`,
            code: `${conflictData.code}_${timestamp}`,
            shortName: conflictData.shortName ? 
                `${conflictData.shortName} ${timestamp.slice(-4)}`.substring(0, 50) : 
                undefined
        }
        
        console.log(`🔄 Retrying with unique identifiers: ${uniqueData.name}`)
        
        const createMutation = {
            resource: resourceType,
            type: 'create',
            data: uniqueData
        }
        
        const createResult = await dataEngine.mutate(createMutation)
        
        if (createResult.status === 'OK') {
            console.log(`✅ Created ${resourceType.slice(0, -1)} with unique identifiers`)
            return {
                strategy: 'create_unique',
                success: true,
                object: {
                    ...uniqueData,
                    id: createResult.response?.uid || uniqueData.id
                },
                message: `Created ${resourceType.slice(0, -1)} with unique identifiers`
            }
        }
        
        throw new Error(`Failed to create ${resourceType.slice(0, -1)} even with unique identifiers`)
        
    } catch (error) {
        console.error(`❌ Failed to resolve ${resourceType} conflict:`, error)
        return {
            strategy: 'failed',
            success: false,
            error: error.message,
            message: `Could not resolve ${resourceType.slice(0, -1)} conflict`
        }
    }
}

/**
 * Comprehensive error recovery for assessment creation
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Object} assessmentData - Assessment data being processed
 * @returns {Promise<Object>} Recovery result
 */
export const recoverFromAssessmentErrors = async (dataEngine, assessmentData) => {
    console.log('🚀 Starting comprehensive error recovery for assessment creation...')
    
    const recovery = {
        categoryCombos: { success: false, mapping: {} },
        datasets: { success: false, results: {} },
        conflicts: { resolved: [], failed: [] },
        summary: { errors: 0, warnings: 0, fixes: 0 }
    }
    
    try {
        // Step 1: Handle missing category combos
        const missingCombos = ['TUYu2OrnbXV', 'iexS9B0LKpd', 'qP9R7dIy9l0'] // From your error log
        const comboRecovery = await handleMissingCategoryCombos(dataEngine, missingCombos)
        
        recovery.categoryCombos = comboRecovery
        if (comboRecovery.success) {
            recovery.summary.fixes += missingCombos.length
            console.log('✅ Category combo recovery successful')
        } else {
            recovery.summary.errors += 1
            console.log('❌ Category combo recovery failed')
        }
        
        // Step 2: Handle missing datasets
        const missingDatasets = ['mdVgUOEm5NQ', 's2E0qbAHCMM', 'HT15afG5J4T'] // From your error log
        const datasetRecovery = await handleMissingDatasets(dataEngine, missingDatasets)
        
        recovery.datasets = datasetRecovery
        if (datasetRecovery.missing.length === 0) {
            recovery.summary.fixes += missingDatasets.length
            console.log('✅ All datasets found or alternatives identified')
        } else {
            recovery.summary.warnings += datasetRecovery.missing.length
            console.log(`⚠️ ${datasetRecovery.missing.length} datasets still missing`)
        }
        
        // Step 3: Clear any problematic datastore entries
        try {
            const datastoreKeys = ['categoryCombos', 'dataElements', 'dataSets']
            for (const key of datastoreKeys) {
                try {
                    await dataEngine.mutate({
                        resource: `dataStore/dqa360/${key}`,
                        type: 'delete'
                    })
                    console.log(`🗑️ Cleared datastore key: ${key}`)
                    recovery.summary.fixes += 1
                } catch (deleteError) {
                    // Key might not exist, which is fine
                    console.log(`ℹ️ Datastore key ${key} not found or already cleared`)
                }
            }
        } catch (datastoreError) {
            console.warn('⚠️ Could not clear datastore entries:', datastoreError.message)
            recovery.summary.warnings += 1
        }
        
        console.log('✅ Error recovery completed')
        console.log(`📊 Summary: ${recovery.summary.fixes} fixes, ${recovery.summary.warnings} warnings, ${recovery.summary.errors} errors`)
        
        return recovery
        
    } catch (error) {
        console.error('❌ Error recovery failed:', error)
        recovery.summary.errors += 1
        return recovery
    }
}

/**
 * Validate system readiness before assessment creation
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<Object>} Validation result
 */
export const validateSystemReadiness = async (dataEngine) => {
    console.log('🔍 Validating system readiness...')
    
    const validation = {
        ready: false,
        checks: {
            defaultCategoryCombo: false,
            userPermissions: false,
            systemResources: false
        },
        issues: [],
        recommendations: []
    }
    
    try {
        // Check 1: Default category combo availability
        try {
            const defaultQuery = {
                defaultCombo: {
                    resource: 'categoryCombos/default',
                    params: { fields: 'id,name' }
                }
            }
            
            const defaultResult = await dataEngine.query(defaultQuery)
            if (defaultResult.defaultCombo) {
                validation.checks.defaultCategoryCombo = true
                console.log('✅ Default category combo available')
            } else {
                validation.issues.push('Default category combo not accessible')
                validation.recommendations.push('Ensure DHIS2 system has a default category combo configured')
            }
        } catch (error) {
            validation.issues.push('Cannot access default category combo')
            validation.recommendations.push('Check DHIS2 system configuration and user permissions')
        }
        
        // Check 2: User permissions
        try {
            const userQuery = {
                me: {
                    resource: 'me',
                    params: { fields: 'id,username,authorities' }
                }
            }
            
            const userResult = await dataEngine.query(userQuery)
            const user = userResult.me
            
            const hasMetadataAuth = user.authorities?.some(auth => 
                auth.includes('F_METADATA') || 
                auth.includes('F_DATASET_PUBLIC_ADD') ||
                auth.includes('ALL')
            )
            
            if (hasMetadataAuth) {
                validation.checks.userPermissions = true
                console.log('✅ User has metadata creation permissions')
            } else {
                validation.issues.push('User lacks metadata creation permissions')
                validation.recommendations.push('Grant metadata creation authorities to the user')
            }
        } catch (error) {
            validation.issues.push('Cannot verify user permissions')
            validation.recommendations.push('Check user authentication and system access')
        }
        
        // Check 3: System resources
        try {
            const systemQuery = {
                info: {
                    resource: 'system/info',
                    params: { fields: 'version,revision' }
                }
            }
            
            const systemResult = await dataEngine.query(systemQuery)
            if (systemResult.info) {
                validation.checks.systemResources = true
                console.log('✅ System resources accessible')
            }
        } catch (error) {
            validation.issues.push('System resources not accessible')
            validation.recommendations.push('Check DHIS2 system status and connectivity')
        }
        
        // Overall readiness
        validation.ready = Object.values(validation.checks).every(check => check)
        
        if (validation.ready) {
            console.log('✅ System is ready for assessment creation')
        } else {
            console.log('⚠️ System has issues that may affect assessment creation')
            validation.issues.forEach(issue => console.log(`  - ${issue}`))
        }
        
        return validation
        
    } catch (error) {
        console.error('❌ System validation failed:', error)
        validation.issues.push(`System validation error: ${error.message}`)
        return validation
    }
}

export default {
    handleMissingCategoryCombos,
    handleMissingDatasets,
    handleMetadataConflicts,
    recoverFromAssessmentErrors,
    validateSystemReadiness
}