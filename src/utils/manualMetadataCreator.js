/**
 * Manual Metadata Creator Utility
 * 
 * Comprehensive utility for creating DHIS2 metadata manually including:
 * - Datasets
 * - Data Elements  
 * - Category Combos
 * - Categories
 * - Category Options
 * - Clean attachments management
 * - Datastore integration for persistence
 */

import i18n from '@dhis2/d2-i18n'

// Datastore configuration
const DATASTORE_NAMESPACE = 'dqa360-manual-metadata'
const DATASTORE_KEYS = {
    DATASETS: 'manual-datasets',
    DATA_ELEMENTS: 'manual-data-elements',
    CATEGORY_COMBOS: 'manual-category-combos',
    CATEGORIES: 'manual-categories',
    CATEGORY_OPTIONS: 'manual-category-options',
    ATTACHMENTS: 'manual-attachments',
    METADATA_REGISTRY: 'metadata-registry'
}

/**
 * Generate a DHIS2-compatible UID
 * @returns {string} 11-character UID
 */
const generateUID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    // First character must be a letter
    result += chars.charAt(Math.floor(Math.random() * 52))
    // Remaining 10 characters can be letters or numbers
    for (let i = 1; i < 11; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * Generate unique code with timestamp
 * @param {string} prefix - Code prefix
 * @returns {string} Unique code
 */
const generateUniqueCode = (prefix) => {
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}_${timestamp}`
}

/**
 * Validate metadata object structure
 * @param {Object} metadata - Metadata object to validate
 * @param {string} type - Type of metadata (dataset, dataElement, etc.)
 * @returns {Object} Validation result
 */
const validateMetadata = (metadata, type) => {
    const errors = []
    const warnings = []

    // Common validations
    if (!metadata.name || metadata.name.trim() === '') {
        errors.push(`${type} name is required`)
    }
    if (!metadata.code || metadata.code.trim() === '') {
        errors.push(`${type} code is required`)
    }
    if (!metadata.id) {
        metadata.id = generateUID()
        warnings.push(`Generated UID for ${type}: ${metadata.id}`)
    }

    // Type-specific validations
    switch (type) {
        case 'dataset':
            if (!metadata.periodType) {
                errors.push('Dataset period type is required')
            }
            if (!metadata.dataSetElements || metadata.dataSetElements.length === 0) {
                warnings.push('Dataset has no data elements')
            }
            if (!metadata.organisationUnits || metadata.organisationUnits.length === 0) {
                warnings.push('Dataset has no organization units')
            }
            break

        case 'dataElement':
            if (!metadata.valueType) {
                metadata.valueType = 'INTEGER'
                warnings.push('Set default value type to INTEGER')
            }
            if (!metadata.domainType) {
                metadata.domainType = 'AGGREGATE'
                warnings.push('Set default domain type to AGGREGATE')
            }
            if (!metadata.aggregationType) {
                metadata.aggregationType = 'SUM'
                warnings.push('Set default aggregation type to SUM')
            }
            break

        case 'categoryCombo':
            if (!metadata.categories || metadata.categories.length === 0) {
                errors.push('Category combo must have at least one category')
            }
            if (!metadata.dataDimensionType) {
                metadata.dataDimensionType = 'DISAGGREGATION'
                warnings.push('Set default data dimension type to DISAGGREGATION')
            }
            break

        case 'category':
            if (!metadata.categoryOptions || metadata.categoryOptions.length === 0) {
                errors.push('Category must have at least one category option')
            }
            if (!metadata.dataDimensionType) {
                metadata.dataDimensionType = 'DISAGGREGATION'
                warnings.push('Set default data dimension type to DISAGGREGATION')
            }
            break

        case 'categoryOption':
            // Category options have minimal requirements
            break
    }

    return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Clean and prepare metadata for DHIS2 creation
 * @param {Object} metadata - Raw metadata object
 * @param {string} type - Type of metadata
 * @returns {Object} Cleaned metadata object
 */
const cleanMetadata = (metadata, type) => {
    const cleaned = { ...metadata }

    // Remove any UI-specific properties
    delete cleaned.isEditing
    delete cleaned.isNew
    delete cleaned.tempId
    delete cleaned.uiState

    // Ensure required properties exist
    if (!cleaned.id) {
        cleaned.id = generateUID()
    }

    // Set common properties
    cleaned.publicAccess = cleaned.publicAccess || 'r-------'
    cleaned.externalAccess = cleaned.externalAccess || false
    cleaned.created = cleaned.created || new Date().toISOString()
    cleaned.lastUpdated = new Date().toISOString()

    // Type-specific cleaning
    switch (type) {
        case 'dataset':
            cleaned.expiryDays = cleaned.expiryDays || 0
            cleaned.openFuturePeriods = cleaned.openFuturePeriods || 0
            cleaned.timelyDays = cleaned.timelyDays || 15
            cleaned.fieldCombinationRequired = cleaned.fieldCombinationRequired || false
            cleaned.validCompleteOnly = cleaned.validCompleteOnly || false
            cleaned.noValueRequiresComment = cleaned.noValueRequiresComment || false
            cleaned.skipOffline = cleaned.skipOffline || false
            cleaned.dataElementDecoration = cleaned.dataElementDecoration || false
            cleaned.renderAsTabs = cleaned.renderAsTabs || false
            cleaned.renderHorizontally = cleaned.renderHorizontally || false
            break

        case 'dataElement':
            cleaned.zeroIsSignificant = cleaned.zeroIsSignificant || false
            cleaned.optionSetValue = cleaned.optionSetValue || false
            break

        case 'categoryCombo':
            // Ensure category combo has proper structure
            if (cleaned.categories) {
                cleaned.categories = cleaned.categories.map(cat => 
                    typeof cat === 'string' ? { id: cat } : cat
                )
            }
            break

        case 'category':
            cleaned.dataDimension = cleaned.dataDimension !== false
            if (cleaned.categoryOptions) {
                cleaned.categoryOptions = cleaned.categoryOptions.map(opt => 
                    typeof opt === 'string' ? { id: opt } : opt
                )
            }
            break
    }

    return cleaned
}

/**
 * Create attachment metadata for files
 * @param {File} file - File object
 * @param {string} metadataId - ID of metadata this attachment belongs to
 * @param {string} metadataType - Type of metadata
 * @returns {Object} Attachment metadata
 */
const createAttachmentMetadata = (file, metadataId, metadataType) => {
    return {
        id: generateUID(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        metadataId,
        metadataType,
        uploadDate: new Date().toISOString(),
        description: `Attachment for ${metadataType}: ${metadataId}`
    }
}

/**
 * Save metadata to datastore
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} key - Datastore key
 * @param {Object} data - Data to save
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<boolean>} Success status
 */
const saveToDatastore = async (dataEngine, key, data, onProgress = null) => {
    try {
        if (onProgress) {
            onProgress({ message: `Saving ${key} to datastore...`, step: 'datastore' })
        }

        const mutation = {
            resource: `dataStore/${DATASTORE_NAMESPACE}/${key}`,
            type: 'create',
            data
        }

        // Try to create first, if it exists, update instead
        try {
            await dataEngine.mutate(mutation)
        } catch (error) {
            if (error.httpStatusCode === 409) {
                // Key exists, update instead
                mutation.type = 'update'
                await dataEngine.mutate(mutation)
            } else {
                throw error
            }
        }

        if (onProgress) {
            onProgress({ message: `Successfully saved ${key}`, step: 'datastore' })
        }

        return true
    } catch (error) {
        console.error(`Error saving ${key} to datastore:`, error)
        if (onProgress) {
            onProgress({ message: `Error saving ${key}: ${error.message}`, step: 'datastore' })
        }
        return false
    }
}

/**
 * Load metadata from datastore
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} key - Datastore key
 * @returns {Promise<Object|null>} Loaded data or null if not found
 */
const loadFromDatastore = async (dataEngine, key) => {
    try {
        const query = {
            data: {
                resource: `dataStore/${DATASTORE_NAMESPACE}/${key}`
            }
        }

        const result = await dataEngine.query(query)
        return result.data
    } catch (error) {
        // Handle 404 errors gracefully (datastore key doesn't exist)
        if (error.httpStatusCode === 404 || 
            error.message?.includes('404') || 
            error.message?.includes('Not Found') ||
            error.details?.httpStatusCode === 404) {
            return null // Key doesn't exist, this is expected for fresh installations
        }
        console.error(`Error loading ${key} from datastore:`, error)
        throw error
    }
}

/**
 * Create category option in DHIS2 and save to datastore
 * @param {Object} categoryOption - Category option data
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Created category option with DHIS2 ID
 */
const createCategoryOption = async (categoryOption, dataEngine, onProgress = null) => {
    try {
        if (onProgress) {
            onProgress({ message: `Creating category option: ${categoryOption.name}`, step: 'categoryOption' })
        }

        // Validate and clean metadata
        const validation = validateMetadata(categoryOption, 'categoryOption')
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }

        const cleanedOption = cleanMetadata(categoryOption, 'categoryOption')

        // Create in DHIS2
        const mutation = {
            resource: 'categoryOptions',
            type: 'create',
            data: cleanedOption
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            const createdOption = {
                ...cleanedOption,
                dhis2Id: result.response?.uid || cleanedOption.id,
                createdInDHIS2: true,
                createdAt: new Date().toISOString()
            }

            // Save to datastore
            const existingOptions = await loadFromDatastore(dataEngine, DATASTORE_KEYS.CATEGORY_OPTIONS) || []
            existingOptions.push(createdOption)
            await saveToDatastore(dataEngine, DATASTORE_KEYS.CATEGORY_OPTIONS, existingOptions, onProgress)

            if (onProgress) {
                onProgress({ message: `Category option created successfully: ${categoryOption.name}`, step: 'categoryOption' })
            }

            return createdOption
        } else {
            throw new Error(`Failed to create category option: ${result.message}`)
        }
    } catch (error) {
        console.error('Error creating category option:', error)
        if (onProgress) {
            onProgress({ message: `Error creating category option: ${error.message}`, step: 'categoryOption' })
        }
        throw error
    }
}

/**
 * Create category in DHIS2 and save to datastore
 * @param {Object} category - Category data
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Created category with DHIS2 ID
 */
const createCategory = async (category, dataEngine, onProgress = null) => {
    try {
        if (onProgress) {
            onProgress({ message: `Creating category: ${category.name}`, step: 'category' })
        }

        // Validate and clean metadata
        const validation = validateMetadata(category, 'category')
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }

        const cleanedCategory = cleanMetadata(category, 'category')

        // Create in DHIS2
        const mutation = {
            resource: 'categories',
            type: 'create',
            data: cleanedCategory
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            const createdCategory = {
                ...cleanedCategory,
                dhis2Id: result.response?.uid || cleanedCategory.id,
                createdInDHIS2: true,
                createdAt: new Date().toISOString()
            }

            // Save to datastore
            const existingCategories = await loadFromDatastore(dataEngine, DATASTORE_KEYS.CATEGORIES) || []
            existingCategories.push(createdCategory)
            await saveToDatastore(dataEngine, DATASTORE_KEYS.CATEGORIES, existingCategories, onProgress)

            if (onProgress) {
                onProgress({ message: `Category created successfully: ${category.name}`, step: 'category' })
            }

            return createdCategory
        } else {
            throw new Error(`Failed to create category: ${result.message}`)
        }
    } catch (error) {
        console.error('Error creating category:', error)
        if (onProgress) {
            onProgress({ message: `Error creating category: ${error.message}`, step: 'category' })
        }
        throw error
    }
}

/**
 * Create category combo in DHIS2 and save to datastore
 * @param {Object} categoryCombo - Category combo data
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Created category combo with DHIS2 ID
 */
const createCategoryCombo = async (categoryCombo, dataEngine, onProgress = null) => {
    try {
        if (onProgress) {
            onProgress({ message: `Creating category combo: ${categoryCombo.name}`, step: 'categoryCombo' })
        }

        // Validate and clean metadata
        const validation = validateMetadata(categoryCombo, 'categoryCombo')
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }

        const cleanedCombo = cleanMetadata(categoryCombo, 'categoryCombo')

        // Create in DHIS2
        const mutation = {
            resource: 'categoryCombos',
            type: 'create',
            data: cleanedCombo
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            const createdCombo = {
                ...cleanedCombo,
                dhis2Id: result.response?.uid || cleanedCombo.id,
                createdInDHIS2: true,
                createdAt: new Date().toISOString()
            }

            // Save to datastore
            const existingCombos = await loadFromDatastore(dataEngine, DATASTORE_KEYS.CATEGORY_COMBOS) || []
            existingCombos.push(createdCombo)
            await saveToDatastore(dataEngine, DATASTORE_KEYS.CATEGORY_COMBOS, existingCombos, onProgress)

            if (onProgress) {
                onProgress({ message: `Category combo created successfully: ${categoryCombo.name}`, step: 'categoryCombo' })
            }

            return createdCombo
        } else {
            throw new Error(`Failed to create category combo: ${result.message}`)
        }
    } catch (error) {
        console.error('Error creating category combo:', error)
        if (onProgress) {
            onProgress({ message: `Error creating category combo: ${error.message}`, step: 'categoryCombo' })
        }
        throw error
    }
}

/**
 * Create data element in DHIS2 and save to datastore
 * @param {Object} dataElement - Data element data
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Created data element with DHIS2 ID
 */
const createDataElement = async (dataElement, dataEngine, onProgress = null) => {
    try {
        if (onProgress) {
            onProgress({ message: `Creating data element: ${dataElement.name}`, step: 'dataElement' })
        }

        // Validate and clean metadata
        const validation = validateMetadata(dataElement, 'dataElement')
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }

        const cleanedElement = cleanMetadata(dataElement, 'dataElement')

        // Ensure category combo exists
        if (!cleanedElement.categoryCombo || !cleanedElement.categoryCombo.id) {
            // Import the function from assessmentToolsCreator
            const { getDefaultCategoryComboId } = require('./assessmentToolsCreator')
            cleanedElement.categoryCombo = { id: await getDefaultCategoryComboId(dataEngine) }
        }

        // Create in DHIS2
        const mutation = {
            resource: 'dataElements',
            type: 'create',
            data: cleanedElement
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            const createdElement = {
                ...cleanedElement,
                dhis2Id: result.response?.uid || cleanedElement.id,
                createdInDHIS2: true,
                createdAt: new Date().toISOString()
            }

            // Save to datastore
            const existingElements = await loadFromDatastore(dataEngine, DATASTORE_KEYS.DATA_ELEMENTS) || []
            existingElements.push(createdElement)
            await saveToDatastore(dataEngine, DATASTORE_KEYS.DATA_ELEMENTS, existingElements, onProgress)

            if (onProgress) {
                onProgress({ message: `Data element created successfully: ${dataElement.name}`, step: 'dataElement' })
            }

            return createdElement
        } else {
            throw new Error(`Failed to create data element: ${result.message}`)
        }
    } catch (error) {
        console.error('Error creating data element:', error)
        if (onProgress) {
            onProgress({ message: `Error creating data element: ${error.message}`, step: 'dataElement' })
        }
        throw error
    }
}

/**
 * Create dataset in DHIS2 and save to datastore
 * @param {Object} dataset - Dataset data
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Created dataset with DHIS2 ID
 */
const createDataset = async (dataset, dataEngine, onProgress = null) => {
    try {
        if (onProgress) {
            onProgress({ message: `Creating dataset: ${dataset.name}`, step: 'dataset' })
        }

        // Validate and clean metadata
        const validation = validateMetadata(dataset, 'dataset')
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }

        const cleanedDataset = cleanMetadata(dataset, 'dataset')

        // Ensure category combo exists
        if (!cleanedDataset.categoryCombo || !cleanedDataset.categoryCombo.id) {
            // Import the function from assessmentToolsCreator
            const { getDefaultCategoryComboId } = require('./assessmentToolsCreator')
            cleanedDataset.categoryCombo = { id: await getDefaultCategoryComboId(dataEngine) }
        }

        // Create in DHIS2
        const mutation = {
            resource: 'dataSets',
            type: 'create',
            data: cleanedDataset
        }

        const result = await dataEngine.mutate(mutation)

        if (result.status === 'OK') {
            const createdDataset = {
                ...cleanedDataset,
                dhis2Id: result.response?.uid || cleanedDataset.id,
                createdInDHIS2: true,
                createdAt: new Date().toISOString(),
                isManuallyCreated: true
            }

            // Save to datastore
            const existingDatasets = await loadFromDatastore(dataEngine, DATASTORE_KEYS.DATASETS) || []
            existingDatasets.push(createdDataset)
            await saveToDatastore(dataEngine, DATASTORE_KEYS.DATASETS, existingDatasets, onProgress)

            if (onProgress) {
                onProgress({ message: `Dataset created successfully: ${dataset.name}`, step: 'dataset' })
            }

            return createdDataset
        } else {
            throw new Error(`Failed to create dataset: ${result.message}`)
        }
    } catch (error) {
        console.error('Error creating dataset:', error)
        if (onProgress) {
            onProgress({ message: `Error creating dataset: ${error.message}`, step: 'dataset' })
        }
        throw error
    }
}

/**
 * Process file attachments and save to datastore
 * @param {Array} files - Array of File objects
 * @param {string} metadataId - ID of metadata these attachments belong to
 * @param {string} metadataType - Type of metadata
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} Array of attachment metadata
 */
const processAttachments = async (files, metadataId, metadataType, dataEngine, onProgress = null) => {
    const attachments = []

    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        if (onProgress) {
            onProgress({ 
                message: `Processing attachment ${i + 1}/${files.length}: ${file.name}`, 
                step: 'attachments' 
            })
        }

        try {
            // Create attachment metadata
            const attachmentMeta = createAttachmentMetadata(file, metadataId, metadataType)

            // Convert file to base64 for storage
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result.split(',')[1])
                reader.onerror = reject
                reader.readAsDataURL(file)
            })

            const attachment = {
                ...attachmentMeta,
                data: base64Data
            }

            attachments.push(attachment)
        } catch (error) {
            console.error(`Error processing attachment ${file.name}:`, error)
            if (onProgress) {
                onProgress({ 
                    message: `Error processing attachment ${file.name}: ${error.message}`, 
                    step: 'attachments' 
                })
            }
        }
    }

    // Save attachments to datastore
    if (attachments.length > 0) {
        const existingAttachments = await loadFromDatastore(dataEngine, DATASTORE_KEYS.ATTACHMENTS) || []
        existingAttachments.push(...attachments)
        await saveToDatastore(dataEngine, DATASTORE_KEYS.ATTACHMENTS, existingAttachments, onProgress)
    }

    return attachments
}

/**
 * Create complete metadata package with all dependencies
 * @param {Object} metadataPackage - Complete metadata package
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Creation results
 */
const createMetadataPackage = async (metadataPackage, dataEngine, onProgress = null) => {
    const results = {
        success: true,
        created: {
            categoryOptions: [],
            categories: [],
            categoryCombos: [],
            dataElements: [],
            datasets: []
        },
        errors: [],
        attachments: []
    }

    try {
        if (onProgress) {
            onProgress({ message: 'Starting metadata package creation...', step: 'package' })
        }

        // Step 1: Create category options first
        if (metadataPackage.categoryOptions && metadataPackage.categoryOptions.length > 0) {
            for (const categoryOption of metadataPackage.categoryOptions) {
                try {
                    const created = await createCategoryOption(categoryOption, dataEngine, onProgress)
                    results.created.categoryOptions.push(created)
                } catch (error) {
                    results.errors.push({ type: 'categoryOption', item: categoryOption.name, error: error.message })
                }
            }
        }

        // Step 2: Create categories
        if (metadataPackage.categories && metadataPackage.categories.length > 0) {
            for (const category of metadataPackage.categories) {
                try {
                    const created = await createCategory(category, dataEngine, onProgress)
                    results.created.categories.push(created)
                } catch (error) {
                    results.errors.push({ type: 'category', item: category.name, error: error.message })
                }
            }
        }

        // Step 3: Create category combos
        if (metadataPackage.categoryCombos && metadataPackage.categoryCombos.length > 0) {
            for (const categoryCombo of metadataPackage.categoryCombos) {
                try {
                    const created = await createCategoryCombo(categoryCombo, dataEngine, onProgress)
                    results.created.categoryCombos.push(created)
                } catch (error) {
                    results.errors.push({ type: 'categoryCombo', item: categoryCombo.name, error: error.message })
                }
            }
        }

        // Step 4: Create data elements
        if (metadataPackage.dataElements && metadataPackage.dataElements.length > 0) {
            for (const dataElement of metadataPackage.dataElements) {
                try {
                    const created = await createDataElement(dataElement, dataEngine, onProgress)
                    results.created.dataElements.push(created)
                } catch (error) {
                    results.errors.push({ type: 'dataElement', item: dataElement.name, error: error.message })
                }
            }
        }

        // Step 5: Create datasets
        if (metadataPackage.datasets && metadataPackage.datasets.length > 0) {
            for (const dataset of metadataPackage.datasets) {
                try {
                    const created = await createDataset(dataset, dataEngine, onProgress)
                    results.created.datasets.push(created)
                } catch (error) {
                    results.errors.push({ type: 'dataset', item: dataset.name, error: error.message })
                }
            }
        }

        // Step 6: Process attachments
        if (metadataPackage.attachments && metadataPackage.attachments.length > 0) {
            for (const attachmentGroup of metadataPackage.attachments) {
                try {
                    const processed = await processAttachments(
                        attachmentGroup.files,
                        attachmentGroup.metadataId,
                        attachmentGroup.metadataType,
                        dataEngine,
                        onProgress
                    )
                    results.attachments.push(...processed)
                } catch (error) {
                    results.errors.push({ 
                        type: 'attachment', 
                        item: `${attachmentGroup.metadataType}:${attachmentGroup.metadataId}`, 
                        error: error.message 
                    })
                }
            }
        }

        // Update metadata registry
        const registry = {
            lastUpdated: new Date().toISOString(),
            totalCreated: {
                categoryOptions: results.created.categoryOptions.length,
                categories: results.created.categories.length,
                categoryCombos: results.created.categoryCombos.length,
                dataElements: results.created.dataElements.length,
                datasets: results.created.datasets.length
            },
            errors: results.errors.length
        }

        await saveToDatastore(dataEngine, DATASTORE_KEYS.METADATA_REGISTRY, registry, onProgress)

        if (onProgress) {
            onProgress({ 
                message: `Metadata package creation completed. Created: ${Object.values(registry.totalCreated).reduce((a, b) => a + b, 0)} items`, 
                step: 'package' 
            })
        }

        results.success = results.errors.length === 0

    } catch (error) {
        console.error('Error creating metadata package:', error)
        results.success = false
        results.errors.push({ type: 'package', item: 'overall', error: error.message })
        
        if (onProgress) {
            onProgress({ message: `Error creating metadata package: ${error.message}`, step: 'package' })
        }
    }

    return results
}

/**
 * Initialize empty datastore entries if they don't exist
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<void>}
 */
const initializeDatastoreIfNeeded = async (dataEngine) => {
    try {
        // Check if metadata registry exists (indicator of initialization)
        const registry = await loadFromDatastore(dataEngine, DATASTORE_KEYS.METADATA_REGISTRY)
        
        if (!registry) {
            // Initialize all datastore keys with empty structures
            const initPromises = [
                saveToDatastore(dataEngine, DATASTORE_KEYS.DATASETS, []),
                saveToDatastore(dataEngine, DATASTORE_KEYS.DATA_ELEMENTS, []),
                saveToDatastore(dataEngine, DATASTORE_KEYS.CATEGORY_COMBOS, []),
                saveToDatastore(dataEngine, DATASTORE_KEYS.CATEGORIES, []),
                saveToDatastore(dataEngine, DATASTORE_KEYS.CATEGORY_OPTIONS, []),
                saveToDatastore(dataEngine, DATASTORE_KEYS.ATTACHMENTS, []),
                saveToDatastore(dataEngine, DATASTORE_KEYS.METADATA_REGISTRY, {
                    version: '1.0.0',
                    lastUpdated: new Date().toISOString(),
                    totalItems: 0,
                    initialized: true
                })
            ]
            
            await Promise.all(initPromises)
            console.log('DQA360 manual metadata datastore initialized successfully')
        }
    } catch (error) {
        // Silently handle initialization errors - the app will work with defaults
        console.warn('Could not initialize datastore, using defaults:', error.message)
    }
}

/**
 * Load all manual metadata from datastore
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<Object>} All manual metadata
 */
const loadAllManualMetadata = async (dataEngine) => {
    try {
        // Initialize datastore if needed (prevents 404 errors)
        await initializeDatastoreIfNeeded(dataEngine)
        
        // Load all metadata types, handling 404s gracefully
        const results = await Promise.allSettled([
            loadFromDatastore(dataEngine, DATASTORE_KEYS.DATASETS),
            loadFromDatastore(dataEngine, DATASTORE_KEYS.DATA_ELEMENTS),
            loadFromDatastore(dataEngine, DATASTORE_KEYS.CATEGORY_COMBOS),
            loadFromDatastore(dataEngine, DATASTORE_KEYS.CATEGORIES),
            loadFromDatastore(dataEngine, DATASTORE_KEYS.CATEGORY_OPTIONS),
            loadFromDatastore(dataEngine, DATASTORE_KEYS.ATTACHMENTS),
            loadFromDatastore(dataEngine, DATASTORE_KEYS.METADATA_REGISTRY)
        ])

        // Extract values from settled promises, defaulting to empty arrays/objects
        const [datasets, dataElements, categoryCombos, categories, categoryOptions, attachments, registry] = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value
            } else {
                // Log only non-404 errors
                const error = result.reason
                if (!error.message?.includes('404') && !error.message?.includes('Not Found')) {
                    const keys = Object.values(DATASTORE_KEYS)
                    console.error(`Error loading ${keys[index]} from datastore:`, error)
                }
                return null
            }
        })

        return {
            datasets: datasets || [],
            dataElements: dataElements || [],
            categoryCombos: categoryCombos || [],
            categories: categories || [],
            categoryOptions: categoryOptions || [],
            attachments: attachments || [],
            registry: registry || {}
        }
    } catch (error) {
        console.error('Error loading manual metadata:', error)
        // Return empty collections instead of throwing
        return {
            datasets: [],
            dataElements: [],
            categoryCombos: [],
            categories: [],
            categoryOptions: [],
            attachments: [],
            registry: {}
        }
    }
}

/**
 * Delete metadata from DHIS2 and datastore
 * @param {string} metadataType - Type of metadata to delete
 * @param {string} metadataId - ID of metadata to delete
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<boolean>} Success status
 */
const deleteMetadata = async (metadataType, metadataId, dataEngine, onProgress = null) => {
    try {
        if (onProgress) {
            onProgress({ message: `Deleting ${metadataType}: ${metadataId}`, step: 'delete' })
        }

        // Map metadata types to DHIS2 resources
        const resourceMap = {
            dataset: 'dataSets',
            dataElement: 'dataElements',
            categoryCombo: 'categoryCombos',
            category: 'categories',
            categoryOption: 'categoryOptions'
        }

        const resource = resourceMap[metadataType]
        if (!resource) {
            throw new Error(`Unknown metadata type: ${metadataType}`)
        }

        // Delete from DHIS2
        const mutation = {
            resource: `${resource}/${metadataId}`,
            type: 'delete'
        }

        await dataEngine.mutate(mutation)

        // Remove from datastore
        const datastoreKeyMap = {
            dataset: DATASTORE_KEYS.DATASETS,
            dataElement: DATASTORE_KEYS.DATA_ELEMENTS,
            categoryCombo: DATASTORE_KEYS.CATEGORY_COMBOS,
            category: DATASTORE_KEYS.CATEGORIES,
            categoryOption: DATASTORE_KEYS.CATEGORY_OPTIONS
        }

        const datastoreKey = datastoreKeyMap[metadataType]
        const existingData = await loadFromDatastore(dataEngine, datastoreKey) || []
        const updatedData = existingData.filter(item => item.id !== metadataId && item.dhis2Id !== metadataId)
        await saveToDatastore(dataEngine, datastoreKey, updatedData, onProgress)

        if (onProgress) {
            onProgress({ message: `Successfully deleted ${metadataType}: ${metadataId}`, step: 'delete' })
        }

        return true
    } catch (error) {
        console.error(`Error deleting ${metadataType}:`, error)
        if (onProgress) {
            onProgress({ message: `Error deleting ${metadataType}: ${error.message}`, step: 'delete' })
        }
        return false
    }
}

export {
    generateUID,
    generateUniqueCode,
    validateMetadata,
    cleanMetadata,
    createAttachmentMetadata,
    saveToDatastore,
    loadFromDatastore,
    initializeDatastoreIfNeeded,
    createCategoryOption,
    createCategory,
    createCategoryCombo,
    createDataElement,
    createDataset,
    processAttachments,
    createMetadataPackage,
    loadAllManualMetadata,
    deleteMetadata,
    DATASTORE_NAMESPACE,
    DATASTORE_KEYS
}