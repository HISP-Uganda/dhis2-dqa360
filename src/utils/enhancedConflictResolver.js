/**
 * Enhanced Conflict Resolver
 * Handles both 404 (create new) and 409 (reuse existing) scenarios intelligently
 */

import { generateUID } from './idGenerator'

/**
 * Enhanced conflict resolver that handles DHIS2 metadata creation with smart error handling
 */
export class EnhancedConflictResolver {
    constructor(dataEngine) {
        this.dataEngine = dataEngine
        this.createdObjects = new Map()
        this.reusedObjects = new Map()
        this.cache = new Map()
    }

    /**
     * Create dataset with smart conflict resolution
     */
    async createDatasetWithResolution(datasetData, dataElements = []) {
        console.log(`🚀 Creating dataset: ${datasetData.name}`)
        
        try {
            // First attempt to create the dataset
            const result = await this.dataEngine.mutate({
                resource: 'dataSets',
                type: 'create',
                data: {
                    ...datasetData,
                    dataSetElements: dataElements.map(de => ({
                        dataElement: { id: de.id },
                        categoryCombo: de.categoryCombo || null
                    }))
                }
            })

            console.log(`✅ Dataset created successfully: ${datasetData.name} (${result.response.uid})`)
            this.createdObjects.set(datasetData.name, result.response.uid)
            return result

        } catch (error) {
            if (error.message?.includes('409') || error.details?.httpStatusCode === 409) {
                // 409 Conflict: Reuse existing dataset
                return await this.handleDatasetConflict(datasetData, dataElements, error)
            } else if (error.message?.includes('404') || error.details?.httpStatusCode === 404) {
                // 404 Error: Create missing dependencies first
                return await this.handleDatasetDependencies(datasetData, dataElements, error)
            }
            throw error
        }
    }

    /**
     * Handle 409 conflicts by reusing existing datasets
     */
    async handleDatasetConflict(datasetData, dataElements, originalError) {
        console.log(`🔄 409 Conflict: Searching for existing dataset to reuse...`)
        
        try {
            // Search for existing dataset by name
            const searchResponse = await this.dataEngine.query({
                dataSets: {
                    resource: 'dataSets',
                    params: {
                        fields: 'id,name,code,displayName',
                        filter: `name:eq:${datasetData.name}`,
                        pageSize: 1
                    }
                }
            })

            if (searchResponse.dataSets?.dataSets?.length > 0) {
                const existingDataset = searchResponse.dataSets.dataSets[0]
                console.log(`✅ 409 Conflict resolved: Reusing existing dataset: ${existingDataset.name} (${existingDataset.id})`)
                
                this.reusedObjects.set(datasetData.name, existingDataset.id)
                
                return {
                    status: 'OK',
                    response: {
                        uid: existingDataset.id,
                        ...existingDataset
                    }
                }
            }

            // If not found by name, search by code
            if (datasetData.code) {
                const codeSearchResponse = await this.dataEngine.query({
                    dataSets: {
                        resource: 'dataSets',
                        params: {
                            fields: 'id,name,code,displayName',
                            filter: `code:eq:${datasetData.code}`,
                            pageSize: 1
                        }
                    }
                })

                if (codeSearchResponse.dataSets?.dataSets?.length > 0) {
                    const existingDataset = codeSearchResponse.dataSets.dataSets[0]
                    console.log(`✅ 409 Conflict resolved by code: Reusing existing dataset: ${existingDataset.name} (${existingDataset.id})`)
                    
                    this.reusedObjects.set(datasetData.code, existingDataset.id)
                    
                    return {
                        status: 'OK',
                        response: {
                            uid: existingDataset.id,
                            ...existingDataset
                        }
                    }
                }
            }

            console.warn('Could not find existing dataset to reuse')
            throw originalError

        } catch (searchError) {
            console.warn('Error searching for existing dataset:', searchError.message)
            throw originalError
        }
    }

    /**
     * Handle 404 errors by creating missing dependencies
     */
    async handleDatasetDependencies(datasetData, dataElements, originalError) {
        console.log(`🔍 404 Error: Creating missing dependencies for dataset...`)
        
        try {
            // Create missing data elements first
            const resolvedDataElements = []
            
            for (const dataElement of dataElements) {
                const resolvedDE = await this.createDataElementWithResolution(dataElement)
                resolvedDataElements.push(resolvedDE)
            }

            // Retry dataset creation with resolved dependencies
            const result = await this.dataEngine.mutate({
                resource: 'dataSets',
                type: 'create',
                data: {
                    ...datasetData,
                    dataSetElements: resolvedDataElements.map(de => ({
                        dataElement: { id: de.id },
                        categoryCombo: de.categoryCombo || null
                    }))
                }
            })

            console.log(`✅ Dataset created after resolving dependencies: ${datasetData.name} (${result.response.uid})`)
            this.createdObjects.set(datasetData.name, result.response.uid)
            return result

        } catch (dependencyError) {
            console.warn('Could not resolve dataset dependencies:', dependencyError.message)
            throw originalError
        }
    }

    /**
     * Create data element with smart conflict resolution
     */
    async createDataElementWithResolution(dataElementData) {
        console.log(`📝 Creating data element: ${dataElementData.name}`)
        
        try {
            // Ensure required dependencies exist
            const resolvedData = await this.resolveDataElementDependencies(dataElementData)
            
            const result = await this.dataEngine.mutate({
                resource: 'dataElements',
                type: 'create',
                data: resolvedData
            })

            console.log(`✅ Data element created: ${dataElementData.name} (${result.response.uid})`)
            this.createdObjects.set(dataElementData.name, result.response.uid)
            
            return {
                id: result.response.uid,
                ...resolvedData
            }

        } catch (error) {
            if (error.message?.includes('409') || error.details?.httpStatusCode === 409) {
                // 409 Conflict: Reuse existing data element
                return await this.handleDataElementConflict(dataElementData, error)
            }
            throw error
        }
    }

    /**
     * Handle data element conflicts by reusing existing ones
     */
    async handleDataElementConflict(dataElementData, originalError) {
        console.log(`🔄 409 Conflict: Searching for existing data element to reuse...`)
        
        try {
            const searchResponse = await this.dataEngine.query({
                dataElements: {
                    resource: 'dataElements',
                    params: {
                        fields: 'id,name,code,displayName,valueType,aggregationType',
                        filter: `name:eq:${dataElementData.name}`,
                        pageSize: 1
                    }
                }
            })

            if (searchResponse.dataElements?.dataElements?.length > 0) {
                const existingDE = searchResponse.dataElements.dataElements[0]
                console.log(`✅ 409 Conflict resolved: Reusing existing data element: ${existingDE.name} (${existingDE.id})`)
                
                this.reusedObjects.set(dataElementData.name, existingDE.id)
                return existingDE
            }

            throw originalError

        } catch (searchError) {
            console.warn('Error searching for existing data element:', searchError.message)
            throw originalError
        }
    }

    /**
     * Resolve data element dependencies (category combo, etc.)
     */
    async resolveDataElementDependencies(dataElementData) {
        const resolvedData = { ...dataElementData }

        // Ensure category combo exists
        if (dataElementData.categoryCombo?.id) {
            try {
                await this.dataEngine.query({
                    categoryCombo: {
                        resource: `categoryCombos/${dataElementData.categoryCombo.id}`,
                        params: { fields: 'id' }
                    }
                })
            } catch (error) {
                if (error.message?.includes('404')) {
                    // Create or get default category combo
                    const defaultCombo = await this.getOrCreateDefaultCategoryCombo()
                    resolvedData.categoryCombo = { id: defaultCombo.id }
                    console.log(`🔄 Replaced missing category combo with default: ${defaultCombo.id}`)
                }
            }
        } else {
            // Use default category combo if none specified
            const defaultCombo = await this.getOrCreateDefaultCategoryCombo()
            resolvedData.categoryCombo = { id: defaultCombo.id }
        }

        return resolvedData
    }

    /**
     * Get or create default category combo
     */
    async getOrCreateDefaultCategoryCombo() {
        const cacheKey = 'defaultCategoryCombo'
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
        }

        try {
            // Try to get existing default category combo
            const response = await this.dataEngine.query({
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code',
                        filter: 'name:eq:default',
                        pageSize: 1
                    }
                }
            })

            if (response.categoryCombos?.categoryCombos?.length > 0) {
                const defaultCombo = response.categoryCombos.categoryCombos[0]
                this.cache.set(cacheKey, defaultCombo)
                return defaultCombo
            }

            // If no default found, get any category combo
            const anyResponse = await this.dataEngine.query({
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code',
                        pageSize: 1
                    }
                }
            })

            if (anyResponse.categoryCombos?.categoryCombos?.length > 0) {
                const anyCombo = anyResponse.categoryCombos.categoryCombos[0]
                this.cache.set(cacheKey, anyCombo)
                return anyCombo
            }

            // Create new default category combo if none exist
            return await this.createDefaultCategoryCombo()

        } catch (error) {
            console.warn('Could not get default category combo:', error.message)
            return await this.createDefaultCategoryCombo()
        }
    }

    /**
     * Create a new default category combo
     */
    async createDefaultCategoryCombo() {
        const newId = generateUID()
        const categoryComboData = {
            id: newId,
            name: 'DQA360 Default Category Combo',
            code: 'DQA360_DEFAULT_CC',
            displayName: 'DQA360 Default Category Combo',
            dataDimensionType: 'DISAGGREGATION',
            categories: []
        }

        try {
            await this.dataEngine.mutate({
                resource: 'categoryCombos',
                type: 'create',
                data: categoryComboData
            })

            console.log(`✅ Created default category combo: ${categoryComboData.name} (${newId})`)
            this.cache.set('defaultCategoryCombo', categoryComboData)
            this.createdObjects.set('defaultCategoryCombo', newId)
            return categoryComboData

        } catch (error) {
            console.warn('Could not create default category combo:', error.message)
            // Return a mock object as fallback
            return {
                id: newId,
                name: 'DQA360 Default Category Combo',
                code: 'DQA360_DEFAULT_CC'
            }
        }
    }

    /**
     * Get resolution summary
     */
    getResolutionSummary() {
        return {
            totalCreated: this.createdObjects.size,
            totalReused: this.reusedObjects.size,
            createdObjects: Array.from(this.createdObjects.entries()),
            reusedObjects: Array.from(this.reusedObjects.entries()),
            cacheSize: this.cache.size
        }
    }

    /**
     * Clear all caches and tracking
     */
    clear() {
        this.createdObjects.clear()
        this.reusedObjects.clear()
        this.cache.clear()
    }
}

export default EnhancedConflictResolver