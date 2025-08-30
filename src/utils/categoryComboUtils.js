/**
 * ======================================================================
 * CategoryCombo Hierarchy Querying Utilities
 * ======================================================================
 * 
 * This module provides utilities to query complete CategoryCombo hierarchies:
 * DataElement → CategoryCombo → Categories → CategoryOptions
 * 
 * Key Features:
 * - Complete hierarchy retrieval in single queries
 * - Fallback mechanisms for partial data
 * - Detailed logging for debugging
 * - Support for both direct CC queries and DE-based queries
 */

/**
 * Enhanced fields for complete CategoryCombo hierarchy
 */
export const CATEGORY_COMBO_FIELDS = {
    // Complete CategoryCombo with full hierarchy
    FULL: 'id,name,code,displayName,dataDimension,categories[id,name,code,displayName,categoryOptions[id,name,code,displayName,shortName]]',
    
    // DataElement with complete CategoryCombo
    DATA_ELEMENT_WITH_CC: 'id,name,code,displayName,valueType,categoryCombo[id,name,code,displayName,dataDimension,categories[id,name,code,displayName,categoryOptions[id,name,code,displayName,shortName]]]',
    
    // Basic CategoryCombo (minimal)
    BASIC: 'id,name,code,displayName',
    
    // CategoryCombo with categories only (no options)
    WITH_CATEGORIES: 'id,name,code,displayName,categories[id,name,code,displayName]'
}

/**
 * Query CategoryCombo with complete hierarchy
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Object} params - Query parameters
 * @param {string} params.id - CategoryCombo ID
 * @param {string} params.code - CategoryCombo code
 * @param {string} params.name - CategoryCombo name
 * @param {Function} addLog - Optional logging function
 * @returns {Promise<Object|null>} Complete CategoryCombo with hierarchy
 */
export const queryCategoryComboWithHierarchy = async (dataEngine, { id, code, name }, addLog = console.log) => {
    const fields = CATEGORY_COMBO_FIELDS.FULL
    
    // Try by ID first (most efficient)
    if (id && /^[A-Za-z][A-Za-z0-9]{10}$/.test(id)) {
        try {
            const res = await dataEngine.query({ 
                item: { 
                    resource: 'categoryCombos', 
                    id, 
                    params: { fields } 
                } 
            })
            
            if (res?.item?.id) {
                const cc = res.item
                addLog(`✅ Found CategoryCombo by ID: ${cc.name} (${cc.id})`)
                logCategoryComboStructure(cc, addLog)
                return cc
            }
        } catch (e) {
            addLog(`⚠️ Error finding CategoryCombo by ID: ${e?.message || e}`)
        }
    }
    
    // Try by code
    if (code) {
        try {
            const res = await dataEngine.query({
                list: { 
                    resource: 'categoryCombos', 
                    params: { 
                        fields, 
                        filter: `code:eq:${code}`, 
                        pageSize: 1 
                    } 
                },
            })
            
            const coll = res?.list?.categoryCombos || []
            const item = Array.isArray(coll) ? coll[0] : null
            
            if (item?.id) {
                addLog(`✅ Found CategoryCombo by code: ${item.name} (${item.id})`)
                logCategoryComboStructure(item, addLog)
                return item
            }
        } catch (e) {
            addLog(`⚠️ Error finding CategoryCombo by code: ${e?.message || e}`)
        }
    }
    
    // Try by name
    if (name) {
        try {
            const res = await dataEngine.query({
                list: { 
                    resource: 'categoryCombos', 
                    params: { 
                        fields, 
                        filter: `name:eq:${name}`, 
                        pageSize: 1 
                    } 
                },
            })
            
            const coll = res?.list?.categoryCombos || []
            const item = Array.isArray(coll) ? coll[0] : null
            
            if (item?.id) {
                addLog(`✅ Found CategoryCombo by name: ${item.name} (${item.id})`)
                logCategoryComboStructure(item, addLog)
                return item
            }
        } catch (e) {
            addLog(`⚠️ Error finding CategoryCombo by name: ${e?.message || e}`)
        }
    }
    
    addLog(`❌ CategoryCombo not found with provided criteria`)
    return null
}

/**
 * Query DataElement with complete CategoryCombo hierarchy
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {string} dataElementId - DataElement ID
 * @param {Function} addLog - Optional logging function
 * @returns {Promise<Object|null>} DataElement with complete CategoryCombo
 */
export const queryDataElementWithCategoryCombo = async (dataEngine, dataElementId, addLog = console.log) => {
    const fields = CATEGORY_COMBO_FIELDS.DATA_ELEMENT_WITH_CC
    
    try {
        const res = await dataEngine.query({ 
            item: { 
                resource: 'dataElements', 
                id: dataElementId, 
                params: { fields } 
            } 
        })
        
        if (res?.item?.id) {
            const de = res.item
            const cc = de.categoryCombo
            
            addLog(`✅ Found DataElement: ${de.name} (${de.id})`)
            
            if (cc) {
                addLog(`📊 CategoryCombo: ${cc.name} (${cc.id})`)
                logCategoryComboStructure(cc, addLog)
            } else {
                addLog(`⚠️ No CategoryCombo found for DataElement`)
            }
            
            return de
        }
    } catch (e) {
        addLog(`❌ Error fetching DataElement with CategoryCombo: ${e?.message || e}`)
    }
    
    return null
}

/**
 * Query multiple DataElements with their CategoryCombos
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Array<string>} dataElementIds - Array of DataElement IDs
 * @param {Function} addLog - Optional logging function
 * @returns {Promise<Array>} Array of DataElements with CategoryCombos
 */
export const queryMultipleDataElementsWithCategoryCombos = async (dataEngine, dataElementIds, addLog = console.log) => {
    const fields = CATEGORY_COMBO_FIELDS.DATA_ELEMENT_WITH_CC
    const results = []
    
    addLog(`🔍 Querying ${dataElementIds.length} DataElements with CategoryCombos...`)
    
    for (let i = 0; i < dataElementIds.length; i++) {
        const id = dataElementIds[i]
        addLog(`[${i + 1}/${dataElementIds.length}] Querying DataElement: ${id}`)
        
        const de = await queryDataElementWithCategoryCombo(dataEngine, id, addLog)
        if (de) {
            results.push(de)
        }
        
        // Small delay to avoid overwhelming the server
        if (i < dataElementIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }
    
    addLog(`✅ Successfully queried ${results.length}/${dataElementIds.length} DataElements`)
    return results
}

/**
 * Log CategoryCombo structure in a readable format
 * @param {Object} categoryCombo - CategoryCombo object
 * @param {Function} addLog - Logging function
 */
export const logCategoryComboStructure = (categoryCombo, addLog = console.log) => {
    if (!categoryCombo) {
        addLog(`❌ No CategoryCombo to log`)
        return
    }
    
    const cc = categoryCombo
    addLog(`📊 CategoryCombo Structure:`)
    addLog(`   Name: ${cc.name}`)
    addLog(`   Code: ${cc.code || 'N/A'}`)
    addLog(`   ID: ${cc.id}`)
    addLog(`   Data Dimension: ${cc.dataDimension || 'N/A'}`)
    
    if (cc.categories && cc.categories.length > 0) {
        addLog(`   Categories (${cc.categories.length}):`)
        
        cc.categories.forEach((cat, catIndex) => {
            addLog(`     [${catIndex + 1}] ${cat.name} (${cat.code || 'no code'}) - ID: ${cat.id}`)
            
            if (cat.categoryOptions && cat.categoryOptions.length > 0) {
                addLog(`         Options (${cat.categoryOptions.length}):`)
                cat.categoryOptions.forEach((opt, optIndex) => {
                    addLog(`           [${optIndex + 1}] ${opt.name} (${opt.code || 'no code'}) - ID: ${opt.id}`)
                })
            } else {
                addLog(`         ⚠️ No category options found`)
            }
        })
        
        // Calculate total combinations
        const totalCombinations = cc.categories.reduce((total, cat) => {
            return total * (cat.categoryOptions?.length || 1)
        }, 1)
        addLog(`   📈 Total Category Option Combinations: ${totalCombinations}`)
        
    } else {
        addLog(`   ⚠️ No categories found (likely default category combo)`)
    }
}

/**
 * Extract category option combinations from CategoryCombo
 * @param {Object} categoryCombo - CategoryCombo with complete hierarchy
 * @returns {Array} Array of category option combinations
 */
export const extractCategoryOptionCombinations = (categoryCombo) => {
    if (!categoryCombo?.categories || categoryCombo.categories.length === 0) {
        return [{ name: 'default', code: 'default', categoryOptions: [] }]
    }
    
    const combinations = []
    
    // Generate all possible combinations
    const generateCombinations = (categories, currentCombination = [], categoryIndex = 0) => {
        if (categoryIndex >= categories.length) {
            // We have a complete combination
            const name = currentCombination.map(opt => opt.name).join(', ')
            const code = currentCombination.map(opt => opt.code || opt.name).join('_')
            
            combinations.push({
                name,
                code,
                categoryOptions: [...currentCombination]
            })
            return
        }
        
        const category = categories[categoryIndex]
        const options = category.categoryOptions || []
        
        if (options.length === 0) {
            // Skip this category if no options
            generateCombinations(categories, currentCombination, categoryIndex + 1)
        } else {
            // Try each option in this category
            options.forEach(option => {
                generateCombinations(
                    categories, 
                    [...currentCombination, option], 
                    categoryIndex + 1
                )
            })
        }
    }
    
    generateCombinations(categoryCombo.categories)
    return combinations
}

/**
 * Compare two CategoryCombos for structural differences
 * @param {Object} cc1 - First CategoryCombo
 * @param {Object} cc2 - Second CategoryCombo
 * @param {Function} addLog - Optional logging function
 * @returns {Object} Comparison result
 */
export const compareCategoryCombos = (cc1, cc2, addLog = console.log) => {
    const result = {
        identical: false,
        differences: [],
        summary: ''
    }
    
    if (!cc1 || !cc2) {
        result.differences.push('One or both CategoryCombos are null/undefined')
        result.summary = 'Cannot compare null CategoryCombos'
        return result
    }
    
    addLog(`🔍 Comparing CategoryCombos:`)
    addLog(`   CC1: ${cc1.name} (${cc1.id})`)
    addLog(`   CC2: ${cc2.name} (${cc2.id})`)
    
    // Compare basic properties
    if (cc1.id !== cc2.id) {
        result.differences.push(`Different IDs: ${cc1.id} vs ${cc2.id}`)
    }
    
    if (cc1.name !== cc2.name) {
        result.differences.push(`Different names: ${cc1.name} vs ${cc2.name}`)
    }
    
    if (cc1.code !== cc2.code) {
        result.differences.push(`Different codes: ${cc1.code} vs ${cc2.code}`)
    }
    
    // Compare categories
    const cat1Count = cc1.categories?.length || 0
    const cat2Count = cc2.categories?.length || 0
    
    if (cat1Count !== cat2Count) {
        result.differences.push(`Different category counts: ${cat1Count} vs ${cat2Count}`)
    } else if (cat1Count > 0) {
        // Compare each category
        for (let i = 0; i < cat1Count; i++) {
            const cat1 = cc1.categories[i]
            const cat2 = cc2.categories[i]
            
            if (cat1.id !== cat2.id) {
                result.differences.push(`Category ${i + 1} different IDs: ${cat1.id} vs ${cat2.id}`)
            }
            
            const opt1Count = cat1.categoryOptions?.length || 0
            const opt2Count = cat2.categoryOptions?.length || 0
            
            if (opt1Count !== opt2Count) {
                result.differences.push(`Category ${i + 1} different option counts: ${opt1Count} vs ${opt2Count}`)
            }
        }
    }
    
    result.identical = result.differences.length === 0
    result.summary = result.identical 
        ? 'CategoryCombos are structurally identical' 
        : `Found ${result.differences.length} differences`
    
    addLog(`📊 Comparison result: ${result.summary}`)
    if (result.differences.length > 0) {
        result.differences.forEach(diff => addLog(`   - ${diff}`))
    }
    
    return result
}

/**
 * Usage examples and demonstrations
 */
export const demonstrateUsage = async (dataEngine, addLog = console.log) => {
    addLog(`🚀 CategoryCombo Querying Demonstration`)
    addLog(`=====================================`)
    
    // Example 1: Query CategoryCombo by ID
    addLog(`\n📋 Example 1: Query CategoryCombo by ID`)
    const cc1 = await queryCategoryComboWithHierarchy(
        dataEngine, 
        { id: 'bjDvmb4bfuf' }, // Default category combo
        addLog
    )
    
    // Example 2: Query DataElement with CategoryCombo
    addLog(`\n📋 Example 2: Query DataElement with CategoryCombo`)
    // You would need a real DataElement ID here
    // const de1 = await queryDataElementWithCategoryCombo(dataEngine, 'someDataElementId', addLog)
    
    // Example 3: Extract combinations
    if (cc1) {
        addLog(`\n📋 Example 3: Extract Category Option Combinations`)
        const combinations = extractCategoryOptionCombinations(cc1)
        addLog(`Found ${combinations.length} combinations:`)
        combinations.slice(0, 5).forEach((combo, index) => {
            addLog(`  [${index + 1}] ${combo.name} (${combo.code})`)
        })
        if (combinations.length > 5) {
            addLog(`  ... and ${combinations.length - 5} more`)
        }
    }
    
    addLog(`\n✅ Demonstration complete!`)
}

export default {
    CATEGORY_COMBO_FIELDS,
    queryCategoryComboWithHierarchy,
    queryDataElementWithCategoryCombo,
    queryMultipleDataElementsWithCategoryCombos,
    logCategoryComboStructure,
    extractCategoryOptionCombinations,
    compareCategoryCombos,
    demonstrateUsage
}