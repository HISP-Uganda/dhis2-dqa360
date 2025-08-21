import i18n from '@dhis2/d2-i18n'
import { useDataEngine } from '@dhis2/app-runtime'

// Assessment tool configurations
const ASSESSMENT_TOOLS = [
    {
        name: 'Primary Data Collection Tool',
        suffix: '_PRIMARY',
        description: 'Primary data collection tool for field data entry and validation'
    },
    {
        name: 'Summary Analysis Tool', 
        suffix: '_SUMMARY',
        description: 'Summary analysis tool for aggregated data review and reporting'
    },
    {
        name: 'DHIS2 Comparison Tool',
        suffix: '_DHIS2', 
        description: 'DHIS2 comparison tool for cross-referencing with system data'
    },
    {
        name: 'Data Correction Tool',
        suffix: '_CORRECTION',
        description: 'Data correction tool for identified discrepancies and adjustments'
    }
]

// Default category combo ID (this should be configurable)
/**
 * Get or create default category combo ID dynamically
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<string>} Default category combo ID
 */
const getDefaultCategoryComboId = async (dataEngine) => {
    try {
        // First try to find any existing default category combo
        const query = {
            categoryCombos: {
                resource: 'categoryCombos',
                params: {
                    fields: 'id,displayName,code,name',
                    filter: ['name:ilike:default', 'code:ilike:default'],
                    paging: true,
                    pageSize: 50
                }
            }
        }

        const result = await dataEngine.query(query)
        if (result.categoryCombos?.categoryCombos?.length > 0) {
            const defaultCombo = result.categoryCombos.categoryCombos[0]
            console.log(`✅ Found existing default category combo: ${defaultCombo.displayName}`)
            return defaultCombo.id
        }

        // If no default found, create one
        console.log('No default category combo found, creating one...')
        return await createDefaultCategoryCombo(dataEngine)
    } catch (error) {
        console.warn('Error getting default category combo, creating new one:', error)
        return await createDefaultCategoryCombo(dataEngine)
    }
}

// Helper function to generate local dataset ID
const generateLocalDatasetId = (suffix) => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `local_ds_${suffix.replace('_', '')}_${timestamp}_${random}`
}

/**
 * Ensure category combo exists, create if missing with full progress tracking
 * @param {string} categoryComboId - The category combo ID to check/create
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} The category combo ID (existing or newly created)
 */
const ensureCategoryComboExists = async (categoryComboId, dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'categoryCombo' })
        }
        console.log(`🔄 ${message}`)
    }

    try {
        updateProgress(`Checking if category combo exists: ${categoryComboId}`)
        
        // First, try to get the category combo to see if it exists
        const query = {
            categoryCombo: {
                resource: `categoryCombos/${categoryComboId}`,
                params: {
                    fields: 'id,displayName,categories[id,displayName,categoryOptions[id,displayName]]'
                }
            }
        }

        const result = await dataEngine.query(query)
        if (result.categoryCombo && result.categoryCombo.id) {
            updateProgress(`Category combo exists: ${result.categoryCombo.displayName}`)
            console.log(`✅ Category combo exists: ${result.categoryCombo.displayName}`)
            
            // Verify that the category combo has all required metadata
            const categoryCombo = result.categoryCombo
            if (categoryCombo.categories && categoryCombo.categories.length > 0) {
                for (const category of categoryCombo.categories) {
                    if (!category.categoryOptions || category.categoryOptions.length === 0) {
                        updateProgress(`Category ${category.displayName} missing options, will recreate`)
                        console.warn(`⚠️ Category ${category.displayName} has no options, recreating category combo`)
                        return await createDefaultCategoryCombo(dataEngine, onProgress)
                    }
                }
            }
            
            return categoryComboId
        }
    } catch (error) {
        updateProgress(`Category combo ${categoryComboId} not found, will create default`)
        console.log(`⚠️ Category combo ${categoryComboId} not found, will create default`)
    }

    // If category combo doesn't exist or is incomplete, create a default one
    return await createDefaultCategoryCombo(dataEngine, onProgress)
}

/**
 * Create a default category combo for data elements with full progress tracking
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} The newly created category combo ID
 */
const createDefaultCategoryCombo = async (dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'categoryCombo' })
        }
        console.log(`🔄 ${message}`)
    }

    try {
        updateProgress('Creating default category combo for assessment tools...')

        // Step 1: Ensure default category exists
        updateProgress('Step 1/4: Ensuring default category exists...')
        const defaultCategoryId = await ensureDefaultCategoryExists(dataEngine, onProgress)

        // Step 2: Generate UID for the category combo
        updateProgress('Step 2/4: Generating unique identifier...')
        const uidResult = await dataEngine.query({
            ids: {
                resource: 'system/id',
                params: { limit: 1 }
            }
        })
        const categoryComboId = uidResult.ids.codes[0]
        updateProgress(`Generated category combo ID: ${categoryComboId}`)

        // Step 3: Create the category combo
        updateProgress('Step 3/4: Creating category combo...')
        const timestamp = Date.now()
        const categoryComboPayload = {
            id: categoryComboId,
            name: 'DQA360 Default',
            displayName: 'DQA360 Default',
            code: `DQA360_DEFAULT_COMBO_${timestamp}`,
            description: 'Default category combo for DQA360 assessment tools',
            dataDimensionType: 'DISAGGREGATION',
            categories: [
                { id: defaultCategoryId }
            ],
            publicAccess: 'r-------',
            externalAccess: false
        }

        const mutation = {
            resource: 'categoryCombos',
            type: 'create',
            data: categoryComboPayload
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            updateProgress('Step 4/4: Category combo created successfully!')
            console.log(`✅ Created default category combo: ${categoryComboId}`)
            return categoryComboId
        } else {
            throw new Error(`Failed to create category combo: ${result.message}`)
        }
    } catch (error) {
        updateProgress(`Error creating category combo: ${error.message}`)
        console.error('Error creating default category combo:', error)
        
        // Try to find any existing category combo as fallback
        updateProgress('Attempting to find any existing category combo as fallback...')
        try {
            const fallbackQuery = {
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,displayName',
                        paging: true,
                        pageSize: 50
                    }
                }
            }
            
            const fallbackResult = await dataEngine.query(fallbackQuery)
            if (fallbackResult.categoryCombos?.categoryCombos?.length > 0) {
                const existingCombo = fallbackResult.categoryCombos.categoryCombos[0]
                updateProgress(`Using existing category combo: ${existingCombo.displayName}`)
                return existingCombo.id
            }
            
            updateProgress('No existing category combos found, creating minimal category combo...')
            return await createMinimalCategoryCombo(dataEngine, onProgress)
        } catch (fallbackError) {
            updateProgress('Failed to find existing category combo, creating minimal category combo...')
            return await createMinimalCategoryCombo(dataEngine, onProgress)
        }
    }
}

/**
 * Ensure default category exists, create if missing with progress tracking
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} The default category ID
 */
const ensureDefaultCategoryExists = async (dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'category' })
        }
        console.log(`🔄 ${message}`)
    }

    try {
        updateProgress('Checking if default category exists...')
        
        // Try to get any existing default-like category
        const query = {
            categories: {
                resource: 'categories',
                params: {
                    fields: 'id,displayName,code,name,categoryOptions[id,displayName]',
                    filter: ['name:ilike:default', 'code:ilike:default'],
                    paging: true,
                    pageSize: 50
                }
            }
        }

        const result = await dataEngine.query(query)
        if (result.categories && result.categories.categories && result.categories.categories.length > 0) {
            const defaultCategory = result.categories.categories[0]
            updateProgress(`Default category exists: ${defaultCategory.displayName}`)
            
            // Verify that the category has category options
            if (!defaultCategory.categoryOptions || defaultCategory.categoryOptions.length === 0) {
                updateProgress('Default category missing options, will recreate')
                console.warn(`⚠️ Default category has no options, recreating`)
                return await createDefaultCategory(dataEngine, onProgress)
            }
            
            console.log(`✅ Default category exists: ${defaultCategory.displayName}`)
            return defaultCategory.id
        }

        // If no default-like category found, try to get any category
        updateProgress('No default category found, checking for any existing category...')
        const anyCategoryQuery = {
            categories: {
                resource: 'categories',
                params: {
                    fields: 'id,displayName,categoryOptions[id,displayName]',
                    paging: true,
                    pageSize: 50
                }
            }
        }

        const anyResult = await dataEngine.query(anyCategoryQuery)
        if (anyResult.categories && anyResult.categories.categories && anyResult.categories.categories.length > 0) {
            const existingCategory = anyResult.categories.categories[0]
            
            // Verify that the category has category options
            if (existingCategory.categoryOptions && existingCategory.categoryOptions.length > 0) {
                updateProgress(`Using existing category: ${existingCategory.displayName}`)
                console.log(`✅ Using existing category: ${existingCategory.displayName}`)
                return existingCategory.id
            } else {
                updateProgress('Existing category missing options, will create new one')
                console.warn(`⚠️ Existing category has no options, creating new one`)
            }
        }
    } catch (error) {
        updateProgress('No categories found, will create one')
        console.log('No categories found, will create one')
    }

    // Create default category
    return await createDefaultCategory(dataEngine, onProgress)
}

/**
 * Create a default category with progress tracking
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} The newly created category ID
 */
const createDefaultCategory = async (dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'category' })
        }
        console.log(`🔄 ${message}`)
    }

    try {
        updateProgress('Creating default category...')

        // Step 1: First ensure default category option exists
        updateProgress('Step 1/3: Ensuring default category option exists...')
        const defaultCategoryOptionId = await ensureDefaultCategoryOptionExists(dataEngine, onProgress)

        // Step 2: Generate UID for the category
        updateProgress('Step 2/3: Generating unique identifier for category...')
        const uidResult = await dataEngine.query({
            ids: {
                resource: 'system/id',
                params: { limit: 1 }
            }
        })
        const categoryId = uidResult.ids.codes[0]
        updateProgress(`Generated category ID: ${categoryId}`)

        // Step 3: Create the category
        updateProgress('Step 3/3: Creating category...')
        const timestamp = Date.now()
        const categoryPayload = {
            id: categoryId,
            name: 'DQA360 Default',
            displayName: 'DQA360 Default',
            code: `DQA360_DEFAULT_CATEGORY_${timestamp}`,
            description: 'Default category for DQA360',
            dataDimension: true,
            dataDimensionType: 'DISAGGREGATION',
            categoryOptions: [
                { id: defaultCategoryOptionId }
            ],
            publicAccess: 'r-------',
            externalAccess: false
        }

        const mutation = {
            resource: 'categories',
            type: 'create',
            data: categoryPayload
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            updateProgress('Default category created successfully!')
            console.log(`✅ Created default category: ${categoryId}`)
            return categoryId
        } else {
            throw new Error(`Failed to create category: ${result.message}`)
        }
    } catch (error) {
        updateProgress(`Error creating default category: ${error.message}`)
        console.error('Error creating default category:', error)
        throw error
    }
}

/**
 * Ensure default category option exists, create if missing with progress tracking
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} The default category option ID
 */
const ensureDefaultCategoryOptionExists = async (dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'categoryOption' })
        }
        console.log(`🔄 ${message}`)
    }

    try {
        updateProgress('Checking if default category option exists...')
        
        // Try to get any existing default-like category option
        const query = {
            categoryOptions: {
                resource: 'categoryOptions',
                params: {
                    fields: 'id,displayName,code,name',
                    filter: ['name:ilike:default', 'code:ilike:default'],
                    paging: true,
                    pageSize: 50
                }
            }
        }

        const result = await dataEngine.query(query)
        if (result.categoryOptions && result.categoryOptions.categoryOptions && result.categoryOptions.categoryOptions.length > 0) {
            const defaultCategoryOption = result.categoryOptions.categoryOptions[0]
            updateProgress(`Default category option exists: ${defaultCategoryOption.displayName}`)
            console.log(`✅ Default category option exists: ${defaultCategoryOption.displayName}`)
            return defaultCategoryOption.id
        }

        // If no default-like option found, try to get any category option
        updateProgress('No default category option found, checking for any existing category option...')
        const anyOptionQuery = {
            categoryOptions: {
                resource: 'categoryOptions',
                params: {
                    fields: 'id,displayName',
                    paging: true,
                    pageSize: 50
                }
            }
        }

        const anyResult = await dataEngine.query(anyOptionQuery)
        if (anyResult.categoryOptions && anyResult.categoryOptions.categoryOptions && anyResult.categoryOptions.categoryOptions.length > 0) {
            const existingOption = anyResult.categoryOptions.categoryOptions[0]
            updateProgress(`Using existing category option: ${existingOption.displayName}`)
            console.log(`✅ Using existing category option: ${existingOption.displayName}`)
            return existingOption.id
        }
    } catch (error) {
        updateProgress('No category options found, will create one')
        console.log('No category options found, will create one')
    }

    // Create default category option
    return await createDefaultCategoryOption(dataEngine, onProgress)
}

/**
 * Create a default category option with progress tracking
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} The newly created category option ID
 */
const createDefaultCategoryOption = async (dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'categoryOption' })
        }
        console.log(`🔄 ${message}`)
    }

    try {
        updateProgress('Creating default category option...')

        // Step 1: Generate UID for the category option
        updateProgress('Step 1/2: Generating unique identifier for category option...')
        const uidResult = await dataEngine.query({
            ids: {
                resource: 'system/id',
                params: { limit: 1 }
            }
        })
        const categoryOptionId = uidResult.ids.codes[0]
        updateProgress(`Generated category option ID: ${categoryOptionId}`)

        // Step 2: Create the category option
        updateProgress('Step 2/2: Creating category option...')
        const timestamp = Date.now()
        const categoryOptionPayload = {
            id: categoryOptionId,
            name: 'DQA360 Default',
            displayName: 'DQA360 Default',
            code: `DQA360_DEFAULT_OPTION_${timestamp}`,
            description: 'Default category option for DQA360',
            publicAccess: 'r-------',
            externalAccess: false
        }

        const mutation = {
            resource: 'categoryOptions',
            type: 'create',
            data: categoryOptionPayload
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            updateProgress('Default category option created successfully!')
            console.log(`✅ Created default category option: ${categoryOptionId}`)
            return categoryOptionId
        } else {
            throw new Error(`Failed to create category option: ${result.message}`)
        }
    } catch (error) {
        updateProgress(`Error creating default category option: ${error.message}`)
        console.error('Error creating default category option:', error)
        throw error
    }
}

/**
 * Create a minimal category combo as last resort fallback
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} The newly created minimal category combo ID
 */
const createMinimalCategoryCombo = async (dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'minimalCategoryCombo' })
        }
        console.log(`🔄 ${message}`)
    }

    try {
        updateProgress('Creating minimal category combo as fallback...')

        // Generate UIDs
        const uidResult = await dataEngine.query({
            ids: {
                resource: 'system/id',
                params: { limit: 3 } // Need 3 UIDs: categoryOption, category, categoryCombo
            }
        })
        const [categoryOptionId, categoryId, categoryComboId] = uidResult.ids.codes

        // Step 1: Create minimal category option
        updateProgress('Step 1/3: Creating minimal category option...')
        const categoryOptionPayload = {
            id: categoryOptionId,
            name: 'DQA360 Default',
            displayName: 'DQA360 Default',
            code: `DQA360_DEFAULT_${Date.now()}`,
            description: 'Minimal category option for DQA360',
            publicAccess: 'r-------',
            externalAccess: false
        }

        await dataEngine.mutate({
            resource: 'categoryOptions',
            type: 'create',
            data: categoryOptionPayload
        })

        // Step 2: Create minimal category
        updateProgress('Step 2/3: Creating minimal category...')
        const categoryPayload = {
            id: categoryId,
            name: 'DQA360 Default',
            displayName: 'DQA360 Default',
            code: `DQA360_DEFAULT_${Date.now()}`,
            description: 'Minimal category for DQA360',
            dataDimension: true,
            dataDimensionType: 'DISAGGREGATION',
            categoryOptions: [{ id: categoryOptionId }],
            publicAccess: 'r-------',
            externalAccess: false
        }

        await dataEngine.mutate({
            resource: 'categories',
            type: 'create',
            data: categoryPayload
        })

        // Step 3: Create minimal category combo
        updateProgress('Step 3/3: Creating minimal category combo...')
        const categoryComboPayload = {
            id: categoryComboId,
            name: 'DQA360 Minimal',
            displayName: 'DQA360 Minimal',
            code: `DQA360_MINIMAL_${Date.now()}`,
            description: 'Minimal category combo for DQA360 as fallback',
            dataDimensionType: 'DISAGGREGATION',
            categories: [{ id: categoryId }],
            publicAccess: 'r-------',
            externalAccess: false
        }

        const result = await dataEngine.mutate({
            resource: 'categoryCombos',
            type: 'create',
            data: categoryComboPayload
        })

        if (result.status === 'OK') {
            updateProgress('Minimal category combo created successfully!')
            console.log(`✅ Created minimal category combo: ${categoryComboId}`)
            return categoryComboId
        } else {
            throw new Error(`Failed to create minimal category combo: ${result.message}`)
        }
    } catch (error) {
        updateProgress(`Error creating minimal category combo: ${error.message}`)
        console.error('Error creating minimal category combo:', error)
        
        // As absolute last resort, try to find ANY category combo in the system
        try {
            const lastResortQuery = {
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,displayName',
                        paging: true,
                        pageSize: 50
                    }
                }
            }
            
            const lastResortResult = await dataEngine.query(lastResortQuery)
            if (lastResortResult.categoryCombos?.categoryCombos?.length > 0) {
                const anyCombo = lastResortResult.categoryCombos.categoryCombos[0]
                updateProgress(`Using any available category combo as last resort: ${anyCombo.displayName}`)
                return anyCombo.id
            }
            
            // If absolutely nothing exists, throw error
            throw new Error('No category combos exist in the system and unable to create new ones')
        } catch (finalError) {
            updateProgress('Critical error: No category combos available and unable to create')
            throw new Error('Critical error: No category combos available in system')
        }
    }
}

/**
 * Create assessment tools (4 DHIS2 datasets) for a given configuration
 * @param {Object} config - Configuration object
 * @param {Object} config.dhis2Config - DHIS2 connection configuration (for external data only)
 * @param {Object} config.dataEngine - DHIS2 data engine for local instance operations
 * @param {Object} config.selectedDataSet - Selected source dataset
 * @param {Array} config.dataElements - Selected data elements
 * @param {Array} config.orgUnits - Selected organisation units
 * @param {Function} config.onProgress - Progress callback function
 * @returns {Promise<Object>} Result object with success status and created datasets
 */
export const createAssessmentTools = async (config) => {
    const { dhis2Config, dataEngine, selectedDataSet, dataElements, orgUnits, onProgress } = config

    // Validate prerequisites
    if (!dataEngine) {
        throw new Error(i18n.t('DHIS2 data engine is required for creating assessment tools'))
    }
    
    if (!selectedDataSet) {
        throw new Error(i18n.t('Source dataset selection is required'))
    }
    
    if (!dataElements || dataElements.length === 0) {
        throw new Error(i18n.t('At least one data element must be selected'))
    }
    
    if (!orgUnits || orgUnits.length === 0) {
        throw new Error(i18n.t('At least one organisation unit must be selected'))
    }

    console.log('=== Starting Assessment Tool Creation ===')
    console.log('Selected Dataset:', selectedDataSet)
    console.log('Selected Data Elements:', dataElements.length)
    console.log('Selected Org Units:', orgUnits.length)

    const results = {
        success: false,
        createdDatasets: [],
        errors: [],
        summary: {
            total: ASSESSMENT_TOOLS.length,
            successful: 0,
            failed: 0
        }
    }

    // Progress tracking
    const updateProgress = (step, total, message) => {
        if (onProgress) {
            onProgress({
                current: step,
                total: total,
                message: message,
                percentage: Math.round((step / total) * 100)
            })
        }
    }

    try {
        // Step 1: Prepare data elements (ensure they exist)
        updateProgress(1, ASSESSMENT_TOOLS.length + 1, i18n.t('Preparing data elements...'))
        
        const validDataElements = dataElements.filter(de => de && de.id)
        if (validDataElements.length === 0) {
            throw new Error(i18n.t('No valid data elements with IDs found'))
        }

        // Remove duplicates
        const uniqueDataElements = validDataElements.filter((de, index, self) => 
            index === self.findIndex(d => d.id === de.id)
        )

        console.log(`Prepared ${uniqueDataElements.length} unique data elements`)

        // Step 2: Validate organisation units
        const validOrgUnits = orgUnits.filter(ou => ou && ou.id)
        if (validOrgUnits.length === 0) {
            throw new Error(i18n.t('No valid organisation units with IDs found'))
        }

        console.log(`Validated ${validOrgUnits.length} organisation units`)

        // Step 3: Create each assessment tool dataset
        for (let i = 0; i < ASSESSMENT_TOOLS.length; i++) {
            const toolConfig = ASSESSMENT_TOOLS[i]
            const stepNumber = i + 2 // +2 because step 1 was preparation
            
            updateProgress(stepNumber, ASSESSMENT_TOOLS.length + 1, 
                i18n.t('Creating {{toolName}}...', { toolName: toolConfig.name }))

            try {
                const datasetResult = await createSingleDataset({
                    toolConfig,
                    selectedDataSet,
                    dataElements: uniqueDataElements,
                    orgUnits: validOrgUnits,
                    dhis2Config,
                    dataEngine,
                    onProgress: (progressInfo) => {
                        // Enhanced progress callback that includes tool context
                        if (onProgress) {
                            onProgress({
                                current: stepNumber,
                                total: ASSESSMENT_TOOLS.length + 1,
                                message: `${toolConfig.name}: ${progressInfo.message}`,
                                percentage: Math.round((stepNumber / (ASSESSMENT_TOOLS.length + 1)) * 100),
                                step: progressInfo.step,
                                tool: toolConfig.name
                            })
                        }
                    }
                })

                if (datasetResult.success) {
                    results.createdDatasets.push(datasetResult.dataSet)
                    results.summary.successful++
                    console.log(`✅ Successfully created: ${toolConfig.name}`)
                } else {
                    results.errors.push({
                        tool: toolConfig.name,
                        error: datasetResult.error
                    })
                    results.summary.failed++
                    console.error(`❌ Failed to create: ${toolConfig.name}`, datasetResult.error)
                }
            } catch (error) {
                results.errors.push({
                    tool: toolConfig.name,
                    error: error.message || error
                })
                results.summary.failed++
                console.error(`❌ Exception creating: ${toolConfig.name}`, error)
            }
        }

        // Final step
        updateProgress(ASSESSMENT_TOOLS.length + 1, ASSESSMENT_TOOLS.length + 1, 
            i18n.t('Assessment creation completed'))

        // Determine overall success
        results.success = results.summary.successful > 0

        console.log('=== Assessment Tool Creation Summary ===')
        console.log(`Total: ${results.summary.total}`)
        console.log(`Successful: ${results.summary.successful}`)
        console.log(`Failed: ${results.summary.failed}`)
        console.log('Created Datasets:', results.createdDatasets.map(ds => ds.name))

        return results

    } catch (error) {
        console.error('❌ Fatal error during assessment creation:', error)
        results.error = error.message || error
        return results
    }
}

/**
 * Create a single dataset for an assessment tool with progress tracking
 */
const createSingleDataset = async ({ toolConfig, selectedDataSet, dataElements, orgUnits, dhis2Config, dataEngine, onProgress = null }) => {
    try {
        // Generate unique identifiers
        const timestamp = Date.now().toString().slice(-6)
        const baseDataSetName = selectedDataSet?.displayName || 'Unknown Dataset'
        const baseDataSetCode = selectedDataSet?.code || 'UNKNOWN'
        
        const dataSetName = `${baseDataSetName}${toolConfig.suffix}`
        const dataSetCode = `${baseDataSetCode}${toolConfig.suffix}_${timestamp}`
        
        // Generate intelligent short name with timestamp
        const baseShortName = selectedDataSet?.displayName || 'Unknown Dataset'
        const toolType = toolConfig.suffix.replace('_', ' ').trim()
        const uniqueShortName = `${baseShortName} ${toolType} ${timestamp}`.substring(0, 50)

        console.log(`Creating assessment tool: ${dataSetName}`)

        // Step 1: First ensure all data elements exist in DHIS2 with full category combo creation
        console.log(`Verifying/creating ${dataElements.length} data elements...`)
        const verifiedDataElements = await ensureDataElementsExist(dataElements, dataEngine, toolConfig.suffix, onProgress)

        if (verifiedDataElements.length === 0) {
            console.warn(`⚠️ No data elements found for ${toolConfig.name}, creating fallback data elements`)
            
            // Create fallback data elements for the tool with full category combo creation
            const fallbackElements = await createFallbackDataElements(toolConfig, dataEngine, onProgress)
            if (fallbackElements.length > 0) {
                verifiedDataElements.push(...fallbackElements)
                console.log(`✅ Created ${fallbackElements.length} fallback data elements for ${toolConfig.name}`)
            } else {
                throw new Error(`No valid data elements available for ${toolConfig.name}`)
            }
        }

        console.log(`✅ Verified ${verifiedDataElements.length} data elements`)

        // Step 2: Ensure dataset category combo exists
        if (onProgress) {
            onProgress({ message: 'Ensuring dataset category combo exists...', step: 'datasetCategoryCombo' })
        }
        const datasetCategoryComboId = await ensureCategoryComboExists(
            selectedDataSet?.categoryCombo?.id || await getDefaultCategoryComboId(dataEngine), 
            dataEngine, 
            onProgress
        )

        // Step 3: Create dataset object with verified data elements and category combos
        const dataSet = {
            name: dataSetName,
            shortName: uniqueShortName,
            code: dataSetCode,
            periodType: selectedDataSet?.periodType || 'Monthly',
            dataSetElements: verifiedDataElements.map(de => ({
                dataElement: { id: de.id },
                categoryCombo: { id: de.categoryCombo?.id || datasetCategoryComboId }
            })),
            organisationUnits: orgUnits.map(ou => ({ id: ou.id })),
            categoryCombo: { id: datasetCategoryComboId },
            description: `${toolConfig.description} - Generated from ${selectedDataSet?.displayName || 'Unknown Dataset'}`,
            expiryDays: 0,
            openFuturePeriods: 0,
            timelyDays: 15,
            publicAccess: 'r-------',
            externalAccess: false
        }

        console.log(`Creating dataset: ${dataSetName} with ${verifiedDataElements.length} data elements`)

        // Step 4: Create the dataset using DHIS2 API
        try {
            const result = await createDataSet({ dataSet, dataEngine })

            return { 
                success: true, 
                dataSet: { 
                    ...dataSet, 
                    id: result.response.uid,
                    dhis2Id: result.response.uid,
                    datasetUrl: result.response.datasetUrl,
                    datasetApiUrl: result.response.datasetApiUrl,
                    toolType: toolConfig.suffix,
                    dataElementCount: verifiedDataElements.length,
                    createdAt: result.response.created,
                    status: 'created'
                }
            }
        } catch (dhis2Error) {
            console.warn(`⚠️ DHIS2 API creation failed for ${toolConfig.name}, creating local dataset:`, dhis2Error.message)
            
            // Fallback: Create local dataset with generated ID
            const localId = generateLocalDatasetId(toolConfig.suffix)
            
            return { 
                success: true, 
                dataSet: { 
                    ...dataSet, 
                    id: localId,
                    dhis2Id: null, // Indicates this is a local dataset
                    datasetUrl: null,
                    datasetApiUrl: null,
                    toolType: toolConfig.suffix,
                    dataElementCount: verifiedDataElements.length,
                    createdAt: new Date().toISOString(),
                    status: 'local', // Different status to indicate local creation
                    isLocal: true
                }
            }
        }

    } catch (error) {
        console.error(`Error creating dataset for ${toolConfig.name}:`, error)
        
        // Handle specific DHIS2 errors
        if (error.status === 409 || error.httpStatusCode === 409) {
            console.log(`409 Conflict detected for ${toolConfig.name}, trying with more unique identifiers...`)
            
            try {
                // Generate more unique identifiers for retry
                const moreUniqueTimestamp = Date.now().toString()
                const retryDataSetName = `${dataSetName}_${moreUniqueTimestamp.slice(-8)}`
                const retryDataSetCode = `${dataSetCode}_${moreUniqueTimestamp.slice(-8)}`
                const retryShortName = `${uniqueShortName} ${moreUniqueTimestamp.slice(-4)}`.substring(0, 50)
                
                // Re-verify data elements for retry using local data engine with progress tracking
                const verifiedDataElements = await ensureDataElementsExist(dataElements, dataEngine, toolConfig.suffix, onProgress)

                // Ensure retry dataset category combo exists
                const retryDatasetCategoryComboId = await ensureCategoryComboExists(
                    selectedDataSet?.categoryCombo?.id || await getDefaultCategoryComboId(dataEngine), 
                    dataEngine, 
                    onProgress
                )

                const retryDataSet = {
                    name: retryDataSetName,
                    shortName: retryShortName,
                    code: retryDataSetCode,
                    periodType: selectedDataSet?.periodType || 'Monthly',
                    dataSetElements: verifiedDataElements.map(de => ({
                        dataElement: { id: de.id },
                        categoryCombo: { id: de.categoryCombo?.id || retryDatasetCategoryComboId }
                    })),
                    organisationUnits: orgUnits.map(ou => ({ id: ou.id })),
                    categoryCombo: { id: retryDatasetCategoryComboId },
                    description: `${toolConfig.description} - Generated from ${selectedDataSet?.displayName || 'Unknown Dataset'}`,
                    expiryDays: 0,
                    openFuturePeriods: 0,
                    timelyDays: 15,
                    publicAccess: 'r-------',
                    externalAccess: false
                }
                
                console.log(`Retrying dataset creation with unique identifiers`)
                
                try {
                    const retryResult = await createDataSet({ dataSet: retryDataSet, dataEngine })

                    return { 
                        success: true, 
                        dataSet: { 
                            ...retryDataSet, 
                            id: retryResult.response.uid,
                            dhis2Id: retryResult.response.uid,
                            datasetUrl: retryResult.response.datasetUrl,
                            datasetApiUrl: retryResult.response.datasetApiUrl,
                            toolType: toolConfig.suffix,
                            dataElementCount: verifiedDataElements.length,
                            createdAt: retryResult.response.created,
                            status: 'created'
                        }
                    }
                } catch (retryError) {
                    console.warn(`⚠️ Retry also failed for ${toolConfig.name}, creating local dataset:`, retryError.message)
                    
                    // Fallback: Create local dataset with generated ID
                    const localId = generateLocalDatasetId(toolConfig.suffix)
                    
                    return { 
                        success: true, 
                        dataSet: { 
                            ...retryDataSet, 
                            id: localId,
                            dhis2Id: null, // Indicates this is a local dataset
                            datasetUrl: null,
                            datasetApiUrl: null,
                            toolType: toolConfig.suffix,
                            dataElementCount: verifiedDataElements.length,
                            createdAt: new Date().toISOString(),
                            status: 'local', // Different status to indicate local creation
                            isLocal: true
                        }
                    }
                }
            } catch (outerRetryError) {
                console.error(`❌ Error during retry attempt for ${toolConfig.name}:`, outerRetryError)
                // Fall through to final fallback
            }
        }
        
        // Final fallback: Create local dataset
        console.warn(`⚠️ All DHIS2 attempts failed for ${toolConfig.name}, creating local dataset:`, error.message)
        
        const localId = generateLocalDatasetId(toolConfig.suffix)
        
        // Ensure category combo exists for final fallback
        const fallbackCategoryComboId = await ensureCategoryComboExists(
            selectedDataSet?.categoryCombo?.id || await getDefaultCategoryComboId(dataEngine), 
            dataEngine, 
            onProgress
        )
        
        // Create local dataset object since dataSet is not in scope here
        const localDataSet = {
            name: dataSetName,
            shortName: uniqueShortName,
            code: dataSetCode,
            periodType: selectedDataSet?.periodType || 'Monthly',
            dataSetElements: verifiedDataElements.map(de => ({
                dataElement: { id: de.id },
                categoryCombo: { id: de.categoryCombo?.id || fallbackCategoryComboId },
            })),
            organisationUnits: orgUnits.map(ou => ({ id: ou.id })),
            categoryCombo: { id: fallbackCategoryComboId },
        }
        
        return { 
            success: true, 
            dataSet: { 
                ...localDataSet, 
                id: localId,
                dhis2Id: null, // Indicates this is a local dataset
                datasetUrl: null,
                datasetApiUrl: null,
                toolType: toolConfig.suffix,
                dataElementCount: verifiedDataElements.length,
                createdAt: new Date().toISOString(),
                status: 'local', // Different status to indicate local creation
                isLocal: true
            }
        }
    }
}

/**
 * Ensure data elements exist in DHIS2 before creating datasets with progress tracking
 * Now uses local DHIS2 instance via data engine instead of external DHIS2
 */
const ensureDataElementsExist = async (dataElements, dataEngine, toolSuffix, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'dataElementVerification' })
        }
        console.log(`🔄 ${message}`)
    }

    const verifiedElements = []
    updateProgress(`Verifying ${dataElements.length} data elements...`)

    for (let i = 0; i < dataElements.length; i++) {
        const dataElement = dataElements[i]
        try {
            updateProgress(`Verifying data element ${i + 1}/${dataElements.length}: ${dataElement.displayName || dataElement.id}`)

            // Check if data element exists on local DHIS2 instance
            const exists = await checkDataElementExists(dataElement.id, dataEngine)

            if (exists) {
                updateProgress(`Data element exists: ${dataElement.displayName || dataElement.id}`)
                console.log(`✅ Data element exists: ${dataElement.displayName || dataElement.id}`)
                verifiedElements.push(dataElement)
            } else {
                updateProgress(`Data element missing: ${dataElement.displayName || dataElement.id}`)
                console.log(`⚠️ Data element missing: ${dataElement.displayName || dataElement.id}`)

                // If it's from the conflict resolver (prefixed), try to create it on local instance
                if (dataElement.uid && dataElement.name && toolSuffix) {
                    updateProgress(`Creating missing data element: ${dataElement.displayName || dataElement.id}`)
                    const created = await createMissingDataElement(dataElement, dataEngine, onProgress)
                    if (created) {
                        verifiedElements.push(created)
                        updateProgress(`Successfully created data element: ${dataElement.displayName || dataElement.id}`)
                    }
                }
            }
        } catch (error) {
            updateProgress(`Error verifying data element ${dataElement.id}: ${error.message}`)
            console.error(`Error verifying data element ${dataElement.id}:`, error)
            // Continue with other elements
        }
    }

    updateProgress(`Verified ${verifiedElements.length}/${dataElements.length} data elements`)
    return verifiedElements
}

/**
 * Create fallback data elements when original data elements are missing with full category combo creation
 */
const createFallbackDataElements = async (toolConfig, dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'fallbackDataElements' })
        }
        console.log(`🔄 ${message}`)
    }

    const fallbackElements = []
    
    try {
        updateProgress(`Creating fallback data elements for ${toolConfig.name}...`)

        // Step 1: Ensure category combo exists for fallback elements
        updateProgress('Ensuring category combo exists for fallback data elements...')
        const categoryComboId = await ensureCategoryComboExists(await getDefaultCategoryComboId(dataEngine), dataEngine, onProgress)

        // Create basic fallback data elements based on tool type
        const baseElements = [
            {
                name: `${toolConfig.name} - Data Value 1`,
                shortName: `${toolConfig.name} DV1`,
                code: `${toolConfig.suffix}_DV1_${Date.now()}`,
                valueType: 'INTEGER',
                domainType: 'AGGREGATE',
                aggregationType: 'SUM'
            },
            {
                name: `${toolConfig.name} - Data Value 2`,
                shortName: `${toolConfig.name} DV2`,
                code: `${toolConfig.suffix}_DV2_${Date.now()}`,
                valueType: 'INTEGER',
                domainType: 'AGGREGATE',
                aggregationType: 'SUM'
            }
        ]
        
        // Step 2: Create each fallback data element
        for (let i = 0; i < baseElements.length; i++) {
            const element = baseElements[i]
            try {
                updateProgress(`Creating fallback data element ${i + 1}/${baseElements.length}: ${element.name}`)

                const result = await dataEngine.mutate({
                    resource: 'dataElements',
                    type: 'create',
                    data: {
                        ...element,
                        categoryCombo: { id: categoryComboId }
                    }
                })
                
                if (result.response?.uid) {
                    fallbackElements.push({
                        id: result.response.uid,
                        displayName: element.name,
                        name: element.name,
                        code: element.code,
                        valueType: element.valueType,
                        domainType: element.domainType,
                        aggregationType: element.aggregationType,
                        categoryCombo: { id: categoryComboId }
                    })
                    updateProgress(`Created fallback data element: ${element.name}`)
                    console.log(`✅ Created fallback data element: ${element.name}`)
                }
            } catch (error) {
                updateProgress(`Failed to create fallback data element: ${element.name}`)
                console.warn(`⚠️ Failed to create fallback data element ${element.name}:`, error)
            }
        }

        updateProgress(`Created ${fallbackElements.length} fallback data elements for ${toolConfig.name}`)
    } catch (error) {
        updateProgress(`Error creating fallback data elements: ${error.message}`)
        console.error('Error creating fallback data elements:', error)
    }
    
    return fallbackElements
}

/**
 * Check if a data element exists in local DHIS2 instance
 */
const checkDataElementExists = async (dataElementId, dataEngine) => {
    try {
        const query = {
            dataElement: {
                resource: `dataElements/${dataElementId}`,
                params: {
                    fields: 'id,displayName'
                }
            }
        }

        const result = await dataEngine.query(query)
        return result.dataElement && result.dataElement.id
    } catch (error) {
        console.error(`Error checking data element existence:`, error)
        return false
    }
}

/**
 * Create a missing data element on local DHIS2 instance with full category combo creation
 */
const createMissingDataElement = async (dataElement, dataEngine, onProgress = null) => {
    const updateProgress = (message) => {
        if (onProgress) {
            onProgress({ message, step: 'dataElement' })
        }
        console.log(`🔄 ${message}`)
    }

    try {
        updateProgress(`Creating missing data element: ${dataElement.name}`)

        // Step 1: Preserve the original category combo if available, otherwise use default
        let categoryComboId = dataElement.categoryCombo?.id || await getDefaultCategoryComboId(dataEngine)
        
        // Step 2: Ensure the category combo exists (either original or default) with full metadata
        updateProgress(`Ensuring category combo exists for data element: ${dataElement.name}`)
        categoryComboId = await ensureCategoryComboExists(categoryComboId, dataEngine, onProgress)

        // Step 3: Create the data element with verified category combo
        updateProgress(`Creating data element with category combo: ${categoryComboId}`)
        const dataElementPayload = {
            id: dataElement.uid,
            name: dataElement.name,
            shortName: dataElement.shortName || dataElement.name.substring(0, 50),
            code: dataElement.code,
            description: dataElement.description || '',
            formName: dataElement.formName || dataElement.name,
            valueType: dataElement.valueType || 'INTEGER',
            domainType: dataElement.domainType || 'AGGREGATE',
            aggregationType: dataElement.aggregationType || 'SUM',
            categoryCombo: { id: categoryComboId },
            publicAccess: 'r-------',
            externalAccess: false
        }

        console.log(`Creating missing data element on local DHIS2: ${dataElement.name}`)

        const mutation = {
            resource: 'dataElements',
            type: 'create',
            data: dataElementPayload
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            updateProgress(`Data element created successfully: ${dataElement.name}`)
            console.log(`✅ Created data element on local DHIS2: ${dataElement.name}`)
            return {
                ...dataElement,
                id: dataElement.uid, // Use the generated UID
                categoryCombo: { id: categoryComboId } // Include the verified category combo
            }
        } else {
            updateProgress(`Failed to create data element: ${result.message}`)
            console.error(`Failed to create data element: ${result.message}`)
            return null
        }
    } catch (error) {
        updateProgress(`Error creating data element: ${error.message}`)
        console.error(`Error creating data element on local DHIS2:`, error)
        return null
    }
}

/**
 * Create a dataset in DHIS2 and return the result with proper ID and URL
 * @param {Object} params - Parameters object
 * @param {Object} params.dataSet - Dataset configuration
 * @param {Object} params.dataEngine - DHIS2 data engine
 * @returns {Promise<Object>} Creation result with DHIS2 ID and URL
 */
const createDataSet = async ({ dataSet, dataEngine }) => {
    try {
        console.log(`🔄 Creating dataset in DHIS2: ${dataSet.name}`)
        
        // Generate a proper DHIS2 UID if not provided
        if (!dataSet.id) {
            const uidResult = await dataEngine.query({
                ids: {
                    resource: 'system/id',
                    params: { limit: 1 }
                }
            })
            dataSet.id = uidResult.ids.codes[0]
            console.log(`📝 Generated DHIS2 UID: ${dataSet.id}`)
        }
        
        // Create the dataset in DHIS2
        const mutation = {
            resource: 'dataSets',
            type: 'create',
            data: dataSet
        }
        
        const result = await dataEngine.mutate(mutation)
        
        if (result.status === 'OK' || result.response?.uid) {
            const dhis2Id = result.response?.uid || dataSet.id
            
            // Generate the dataset URL for DHIS2 UI access
            const baseUrl = window.location.origin
            const datasetUrl = `${baseUrl}/dhis-web-maintenance/#/list/dataSetSection/dataSet`
            const datasetApiUrl = `${baseUrl}/api/dataSets/${dhis2Id}`
            
            console.log(`✅ Dataset created successfully in DHIS2`)
            console.log(`📊 Dataset ID: ${dhis2Id}`)
            console.log(`🔗 Dataset URL: ${datasetUrl}`)
            console.log(`🔗 API URL: ${datasetApiUrl}`)
            
            return {
                status: 'OK',
                response: {
                    uid: dhis2Id,
                    datasetUrl: datasetUrl,
                    datasetApiUrl: datasetApiUrl,
                    name: dataSet.name,
                    created: new Date().toISOString()
                }
            }
        } else {
            console.error(`❌ Failed to create dataset: ${result.message || 'Unknown error'}`)
            throw new Error(`Dataset creation failed: ${result.message || 'Unknown error'}`)
        }
        
    } catch (error) {
        console.error(`❌ Error creating dataset in DHIS2:`, error)
        
        // Return a structured error response
        throw {
            status: 'ERROR',
            message: error.message || 'Dataset creation failed',
            error: error,
            httpStatusCode: error.httpStatusCode || error.status || 500
        }
    }
}
