/**
 * Smart Object Manager - Handles 404 (create new) and 409 (reuse existing) automatically
 */

import { generateUID } from './idGenerator'

/**
 * Smart object manager that handles DHIS2 metadata creation intelligently
 * - 404 errors: Creates new objects
 * - 409 conflicts: Reuses existing objects
 */
export class SmartObjectManager {
    constructor(dataEngine) {
        this.dataEngine = dataEngine
        this.cache = new Map()
        this.createdObjects = new Map()
    }

    /**
     * Get or create a category combo
     */
    async getOrCreateCategoryCombo(id, fallbackData = null) {
        const cacheKey = `categoryCombo_${id}`
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
        }

        try {
            // Try to fetch existing
            const response = await this.dataEngine.query({
                categoryCombo: {
                    resource: `categoryCombos/${id}`,
                    params: { fields: 'id,name,code,displayName' }
                }
            })
            
            const result = response.categoryCombo
            this.cache.set(cacheKey, result)
            console.log(`✅ Found existing category combo: ${result.name} (${result.id})`)
            return result
            
        } catch (error) {
            if (error.message?.includes('404') || error.details?.httpStatusCode === 404) {
                // 404: Create new category combo
                return await this.createCategoryCombo(id, fallbackData)
            }
            throw error
        }
    }

    /**
     * Create a new category combo
     */
    async createCategoryCombo(originalId, fallbackData = null) {
        const newId = generateUID()
        const categoryComboData = {
            id: newId,
            name: fallbackData?.name || `DQA360 Category Combo (${originalId})`,
            code: fallbackData?.code || `DQA360_CC_${originalId.slice(-6)}`,
            displayName: fallbackData?.displayName || fallbackData?.name || `DQA360 Category Combo (${originalId})`,
            dataDimensionType: 'DISAGGREGATION',
            categories: [await this.getOrCreateDefaultCategory()]
        }

        try {
            await this.dataEngine.mutate({
                resource: 'categoryCombos',
                type: 'create',
                data: categoryComboData
            })

            console.log(`✅ Created new category combo: ${categoryComboData.name} (${newId})`)
            this.cache.set(`categoryCombo_${originalId}`, categoryComboData)
            this.createdObjects.set(originalId, newId)
            return categoryComboData

        } catch (error) {
            if (error.message?.includes('409') || error.details?.httpStatusCode === 409) {
                // 409: Object already exists, find and reuse it
                return await this.findAndReuseCategoryCombo(originalId, categoryComboData)
            }
            throw error
        }
    }

    /**
     * Find and reuse existing category combo on 409 conflict
     */
    async findAndReuseCategoryCombo(originalId, attemptedData) {
        try {
            // Search by name or code
            const searchResponse = await this.dataEngine.query({
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code,displayName',
                        filter: [
                            `name:ilike:${attemptedData.name}`,
                            `code:eq:${attemptedData.code}`
                        ],
                        pageSize: 1
                    }
                }
            })

            if (searchResponse.categoryCombos?.categoryCombos?.length > 0) {
                const existingCombo = searchResponse.categoryCombos.categoryCombos[0]
                console.log(`🔄 409 Conflict: Reusing existing category combo: ${existingCombo.name} (${existingCombo.id})`)
                this.cache.set(`categoryCombo_${originalId}`, existingCombo)
                return existingCombo
            }

            // If not found by name/code, get default
            return await this.getDefaultCategoryCombo()

        } catch (error) {
            console.warn('Could not find existing category combo, using default:', error.message)
            return await this.getDefaultCategoryCombo()
        }
    }

    /**
     * Get or create a category
     */
    async getOrCreateCategory(id, fallbackData = null) {
        const cacheKey = `category_${id}`
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
        }

        try {
            const response = await this.dataEngine.query({
                category: {
                    resource: `categories/${id}`,
                    params: { fields: 'id,name,code,displayName' }
                }
            })
            
            const result = response.category
            this.cache.set(cacheKey, result)
            console.log(`✅ Found existing category: ${result.name} (${result.id})`)
            return result
            
        } catch (error) {
            if (error.message?.includes('404') || error.details?.httpStatusCode === 404) {
                return await this.createCategory(id, fallbackData)
            }
            throw error
        }
    }

    /**
     * Create a new category
     */
    async createCategory(originalId, fallbackData = null) {
        const newId = generateUID()
        const categoryData = {
            id: newId,
            name: fallbackData?.name || `DQA360 Category (${originalId})`,
            code: fallbackData?.code || `DQA360_C_${originalId.slice(-6)}`,
            displayName: fallbackData?.displayName || fallbackData?.name || `DQA360 Category (${originalId})`,
            dataDimensionType: 'DISAGGREGATION',
            categoryOptions: [await this.getOrCreateDefaultCategoryOption()]
        }

        try {
            await this.dataEngine.mutate({
                resource: 'categories',
                type: 'create',
                data: categoryData
            })

            console.log(`✅ Created new category: ${categoryData.name} (${newId})`)
            this.cache.set(`category_${originalId}`, categoryData)
            this.createdObjects.set(originalId, newId)
            return categoryData

        } catch (error) {
            if (error.message?.includes('409') || error.details?.httpStatusCode === 409) {
                return await this.findAndReuseCategory(originalId, categoryData)
            }
            throw error
        }
    }

    /**
     * Find and reuse existing category on 409 conflict
     */
    async findAndReuseCategory(originalId, attemptedData) {
        try {
            const searchResponse = await this.dataEngine.query({
                categories: {
                    resource: 'categories',
                    params: {
                        fields: 'id,name,code,displayName',
                        filter: [
                            `name:ilike:${attemptedData.name}`,
                            `code:eq:${attemptedData.code}`
                        ],
                        pageSize: 1
                    }
                }
            })

            if (searchResponse.categories?.categories?.length > 0) {
                const existingCategory = searchResponse.categories.categories[0]
                console.log(`🔄 409 Conflict: Reusing existing category: ${existingCategory.name} (${existingCategory.id})`)
                this.cache.set(`category_${originalId}`, existingCategory)
                return existingCategory
            }

            return await this.getDefaultCategory()

        } catch (error) {
            console.warn('Could not find existing category, using default:', error.message)
            return await this.getDefaultCategory()
        }
    }

    /**
     * Get or create a category option
     */
    async getOrCreateCategoryOption(id, fallbackData = null) {
        const cacheKey = `categoryOption_${id}`
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
        }

        try {
            const response = await this.dataEngine.query({
                categoryOption: {
                    resource: `categoryOptions/${id}`,
                    params: { fields: 'id,name,code,displayName' }
                }
            })
            
            const result = response.categoryOption
            this.cache.set(cacheKey, result)
            console.log(`✅ Found existing category option: ${result.name} (${result.id})`)
            return result
            
        } catch (error) {
            if (error.message?.includes('404') || error.details?.httpStatusCode === 404) {
                return await this.createCategoryOption(id, fallbackData)
            }
            throw error
        }
    }

    /**
     * Create a new category option
     */
    async createCategoryOption(originalId, fallbackData = null) {
        const newId = generateUID()
        const categoryOptionData = {
            id: newId,
            name: fallbackData?.name || `DQA360 Option (${originalId})`,
            code: fallbackData?.code || `DQA360_CO_${originalId.slice(-6)}`,
            displayName: fallbackData?.displayName || fallbackData?.name || `DQA360 Option (${originalId})`,
            shortName: fallbackData?.shortName || `DQA360 Option`
        }

        try {
            await this.dataEngine.mutate({
                resource: 'categoryOptions',
                type: 'create',
                data: categoryOptionData
            })

            console.log(`✅ Created new category option: ${categoryOptionData.name} (${newId})`)
            this.cache.set(`categoryOption_${originalId}`, categoryOptionData)
            this.createdObjects.set(originalId, newId)
            return categoryOptionData

        } catch (error) {
            if (error.message?.includes('409') || error.details?.httpStatusCode === 409) {
                return await this.findAndReuseCategoryOption(originalId, categoryOptionData)
            }
            throw error
        }
    }

    /**
     * Find and reuse existing category option on 409 conflict
     */
    async findAndReuseCategoryOption(originalId, attemptedData) {
        try {
            const searchResponse = await this.dataEngine.query({
                categoryOptions: {
                    resource: 'categoryOptions',
                    params: {
                        fields: 'id,name,code,displayName',
                        filter: [
                            `name:ilike:${attemptedData.name}`,
                            `code:eq:${attemptedData.code}`
                        ],
                        pageSize: 1
                    }
                }
            })

            if (searchResponse.categoryOptions?.categoryOptions?.length > 0) {
                const existingOption = searchResponse.categoryOptions.categoryOptions[0]
                console.log(`🔄 409 Conflict: Reusing existing category option: ${existingOption.name} (${existingOption.id})`)
                this.cache.set(`categoryOption_${originalId}`, existingOption)
                return existingOption
            }

            return await this.getDefaultCategoryOption()

        } catch (error) {
            console.warn('Could not find existing category option, using default:', error.message)
            return await this.getDefaultCategoryOption()
        }
    }

    /**
     * Get default category combo (fallback)
     */
    async getDefaultCategoryCombo() {
        try {
            const response = await this.dataEngine.query({
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code,displayName',
                        filter: 'name:eq:default',
                        pageSize: 1
                    }
                }
            })

            if (response.categoryCombos?.categoryCombos?.length > 0) {
                return response.categoryCombos.categoryCombos[0]
            }

            // If no default found, get any category combo
            const anyResponse = await this.dataEngine.query({
                categoryCombos: {
                    resource: 'categoryCombos',
                    params: {
                        fields: 'id,name,code,displayName',
                        pageSize: 1
                    }
                }
            })

            return anyResponse.categoryCombos?.categoryCombos?.[0] || null

        } catch (error) {
            console.warn('Could not get default category combo:', error.message)
            return null
        }
    }

    /**
     * Get default category (fallback)
     */
    async getDefaultCategory() {
        try {
            const response = await this.dataEngine.query({
                categories: {
                    resource: 'categories',
                    params: {
                        fields: 'id,name,code,displayName',
                        filter: 'name:eq:default',
                        pageSize: 1
                    }
                }
            })

            if (response.categories?.categories?.length > 0) {
                return response.categories.categories[0]
            }

            const anyResponse = await this.dataEngine.query({
                categories: {
                    resource: 'categories',
                    params: {
                        fields: 'id,name,code,displayName',
                        pageSize: 1
                    }
                }
            })

            return anyResponse.categories?.categories?.[0] || null

        } catch (error) {
            console.warn('Could not get default category:', error.message)
            return null
        }
    }

    /**
     * Get default category option (fallback)
     */
    async getDefaultCategoryOption() {
        try {
            const response = await this.dataEngine.query({
                categoryOptions: {
                    resource: 'categoryOptions',
                    params: {
                        fields: 'id,name,code,displayName',
                        filter: 'name:eq:default',
                        pageSize: 1
                    }
                }
            })

            if (response.categoryOptions?.categoryOptions?.length > 0) {
                return response.categoryOptions.categoryOptions[0]
            }

            const anyResponse = await this.dataEngine.query({
                categoryOptions: {
                    resource: 'categoryOptions',
                    params: {
                        fields: 'id,name,code,displayName',
                        pageSize: 1
                    }
                }
            })

            return anyResponse.categoryOptions?.categoryOptions?.[0] || null

        } catch (error) {
            console.warn('Could not get default category option:', error.message)
            return null
        }
    }

    /**
     * Get creation summary
     */
    getCreationSummary() {
        return {
            totalCreated: this.createdObjects.size,
            createdObjects: Array.from(this.createdObjects.entries()).map(([original, created]) => ({
                originalId: original,
                createdId: created
            })),
            cacheSize: this.cache.size
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear()
        this.createdObjects.clear()
    }
}

export default SmartObjectManager