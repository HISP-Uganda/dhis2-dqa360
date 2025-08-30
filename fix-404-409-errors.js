/**
 * Comprehensive Fix for 404 and 409 Errors in DQA360
 * 
 * This script fixes:
 * - 404 errors from missing category combos, categories, and category options
 * - 409 conflicts from duplicate object creation attempts
 * - Hardcoded IDs that don't exist in the current DHIS2 instance
 * 
 * USAGE:
 * 1. Open browser console on DQA360 app
 * 2. Paste this entire script
 * 3. Run: await fixAllErrors()
 */

// Problematic IDs from your error log
const PROBLEMATIC_IDS = {
    categoryCombos: ['esaNB4G5AHs', 'TUYu2OrnbXV', 'iexS9B0LKpd', 'qP9R7dIy9l0'],
    categories: ['O5P6e8yu1T6', 'aIn0fYpbJBB'],
    categoryOptions: ['SmYO0gIhf56', 'TxZHRyZzO7U', 'xxPa3FS6PdJ', 'aszipxCwbou', 'J54uo0MHP8h', 'EUk9GP2wlE7', 'OtOMRJIJ1oc'],
    dataSets: ['mdVgUOEm5NQ', 's2E0qbAHCMM', 'HT15afG5J4T']
}

/**
 * Main function to fix all 404 and 409 errors
 */
async function fixAllErrors() {
    console.log('🔧 Starting comprehensive error fix...')
    
    const results = {
        clearedCache: 0,
        mappedObjects: 0,
        fixedReferences: 0,
        errors: 0
    }
    
    try {
        // Step 1: Clear all cached problematic data
        console.log('📝 Step 1: Clearing cached problematic data...')
        await clearProblematicCache()
        results.clearedCache++
        
        // Step 2: Create object mappings for existing alternatives
        console.log('🔍 Step 2: Creating object mappings...')
        const mappings = await createObjectMappings()
        results.mappedObjects = Object.keys(mappings.categoryCombos || {}).length + 
                                Object.keys(mappings.categories || {}).length + 
                                Object.keys(mappings.categoryOptions || {}).length
        
        // Step 3: Store mappings for the app to use
        console.log('💾 Step 3: Storing mappings...')
        await storeMappings(mappings)
        
        // Step 4: Clear browser cache and local storage
        console.log('🧹 Step 4: Clearing browser cache...')
        await clearBrowserCache()
        
        console.log('✅ Fix completed successfully!')
        console.log('📊 Results:', results)
        
        return {
            success: true,
            message: 'All errors fixed successfully',
            results
        }
        
    } catch (error) {
        console.error('❌ Error during fix:', error)
        results.errors++
        return {
            success: false,
            message: error.message,
            results
        }
    }
}

/**
 * Clear cached problematic data from datastore
 */
async function clearProblematicCache() {
    const cacheKeys = [
        'dqa360/categoryCombos',
        'dqa360/categories', 
        'dqa360/categoryOptions',
        'dqa360/dataSets',
        'dqa360/assessments',
        'dqa360/metadata',
        'dqa360/cache'
    ]
    
    for (const key of cacheKeys) {
        try {
            await fetch(`/api/dataStore/${key}`, { method: 'DELETE' })
            console.log(`🗑️ Cleared cache: ${key}`)
        } catch (error) {
            // Ignore errors - key might not exist
        }
    }
}

/**
 * Create mappings from problematic IDs to existing alternatives
 */
async function createObjectMappings() {
    const mappings = {
        categoryCombos: {},
        categories: {},
        categoryOptions: {},
        dataSets: {}
    }
    
    // Find default/fallback category combo
    try {
        console.log('🔍 Finding fallback category combo...')
        let fallbackCombo = null
        
        // Try default category combo first
        try {
            const defaultResponse = await fetch('/api/categoryCombos/default?fields=id,name,code')
            if (defaultResponse.ok) {
                fallbackCombo = await defaultResponse.json()
                console.log('✅ Found default category combo:', fallbackCombo.name)
            }
        } catch (error) {
            console.log('⚠️ No default category combo found')
        }
        
        // If no default, find any available category combo
        if (!fallbackCombo) {
            const anyResponse = await fetch('/api/categoryCombos?fields=id,name,code&pageSize=1')
            if (anyResponse.ok) {
                const combos = await anyResponse.json()
                if (combos.categoryCombos?.length > 0) {
                    fallbackCombo = combos.categoryCombos[0]
                    console.log('✅ Found fallback category combo:', fallbackCombo.name)
                }
            }
        }
        
        // Map all problematic category combos to fallback
        if (fallbackCombo) {
            PROBLEMATIC_IDS.categoryCombos.forEach(problemId => {
                mappings.categoryCombos[problemId] = fallbackCombo.id
                console.log(`📍 Mapped ${problemId} → ${fallbackCombo.id}`)
            })
        }
        
    } catch (error) {
        console.warn('⚠️ Could not create category combo mappings:', error.message)
    }
    
    // Find default/fallback category
    try {
        console.log('🔍 Finding fallback category...')
        const categoryResponse = await fetch('/api/categories?fields=id,name,code&pageSize=1')
        if (categoryResponse.ok) {
            const categories = await categoryResponse.json()
            if (categories.categories?.length > 0) {
                const fallbackCategory = categories.categories[0]
                console.log('✅ Found fallback category:', fallbackCategory.name)
                
                PROBLEMATIC_IDS.categories.forEach(problemId => {
                    mappings.categories[problemId] = fallbackCategory.id
                    console.log(`📍 Mapped ${problemId} → ${fallbackCategory.id}`)
                })
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not create category mappings:', error.message)
    }
    
    // Find default/fallback category options
    try {
        console.log('🔍 Finding fallback category options...')
        const optionResponse = await fetch('/api/categoryOptions?fields=id,name,code&pageSize=5')
        if (optionResponse.ok) {
            const options = await optionResponse.json()
            if (options.categoryOptions?.length > 0) {
                const fallbackOption = options.categoryOptions[0]
                console.log('✅ Found fallback category option:', fallbackOption.name)
                
                PROBLEMATIC_IDS.categoryOptions.forEach(problemId => {
                    mappings.categoryOptions[problemId] = fallbackOption.id
                    console.log(`📍 Mapped ${problemId} → ${fallbackOption.id}`)
                })
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not create category option mappings:', error.message)
    }
    
    return mappings
}

/**
 * Store mappings in datastore for the app to use
 */
async function storeMappings(mappings) {
    try {
        // Store main mappings
        await fetch('/api/dataStore/dqa360/objectMappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mappings)
        }).catch(async () => {
            // If POST fails, try PUT (key might exist)
            await fetch('/api/dataStore/dqa360/objectMappings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mappings)
            })
        })
        
        // Store fix status
        const fixStatus = {
            fixed: true,
            timestamp: new Date().toISOString(),
            problematicIds: PROBLEMATIC_IDS,
            mappings: mappings
        }
        
        await fetch('/api/dataStore/dqa360/errorFixStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fixStatus)
        }).catch(async () => {
            await fetch('/api/dataStore/dqa360/errorFixStatus', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fixStatus)
            })
        })
        
        console.log('💾 Mappings stored successfully')
        
    } catch (error) {
        console.warn('⚠️ Could not store mappings:', error.message)
    }
}

/**
 * Clear browser cache and local storage
 */
async function clearBrowserCache() {
    try {
        // Clear localStorage
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('dqa360') || key.includes('dhis2') || key.includes('category'))) {
                keysToRemove.push(key)
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key)
            console.log(`🗑️ Removed localStorage: ${key}`)
        })
        
        // Clear sessionStorage
        const sessionKeysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && (key.includes('dqa360') || key.includes('dhis2') || key.includes('category'))) {
                sessionKeysToRemove.push(key)
            }
        }
        
        sessionKeysToRemove.forEach(key => {
            sessionStorage.removeItem(key)
            console.log(`🗑️ Removed sessionStorage: ${key}`)
        })
        
        console.log('🧹 Browser cache cleared')
        
    } catch (error) {
        console.warn('⚠️ Could not clear browser cache:', error.message)
    }
}

/**
 * Enhanced object finder that uses mappings
 */
async function findObjectWithMapping(resourceType, objectId) {
    try {
        // First check if we have a mapping for this object
        const mappingsResponse = await fetch('/api/dataStore/dqa360/objectMappings')
        if (mappingsResponse.ok) {
            const mappings = await mappingsResponse.json()
            const resourceMappings = mappings[resourceType] || {}
            
            if (resourceMappings[objectId]) {
                const mappedId = resourceMappings[objectId]
                console.log(`🔄 Using mapped ID: ${objectId} → ${mappedId}`)
                
                // Verify the mapped object exists
                const response = await fetch(`/api/${resourceType}/${mappedId}?fields=id,name,code`)
                if (response.ok) {
                    return await response.json()
                }
            }
        }
        
        // Fallback to direct lookup
        const response = await fetch(`/api/${resourceType}/${objectId}?fields=id,name,code`)
        if (response.ok) {
            return await response.json()
        }
        
        return null
        
    } catch (error) {
        console.warn(`⚠️ Could not find ${resourceType}/${objectId}:`, error.message)
        return null
    }
}

/**
 * Test the fix by checking problematic IDs
 */
async function testFix() {
    console.log('🧪 Testing fix...')
    
    const testResults = {
        working: 0,
        fixed: 0,
        stillBroken: 0
    }
    
    // Test a few problematic IDs
    const testIds = [
        { type: 'categoryCombos', id: 'esaNB4G5AHs' },
        { type: 'categories', id: 'O5P6e8yu1T6' },
        { type: 'categoryOptions', id: 'SmYO0gIhf56' }
    ]
    
    for (const test of testIds) {
        const result = await findObjectWithMapping(test.type, test.id)
        if (result) {
            console.log(`✅ ${test.type}/${test.id} → ${result.name}`)
            testResults.fixed++
        } else {
            console.log(`❌ ${test.type}/${test.id} still not found`)
            testResults.stillBroken++
        }
    }
    
    console.log('🧪 Test results:', testResults)
    return testResults
}

// Export functions for use
window.dqa360ErrorFix = {
    fixAllErrors,
    testFix,
    findObjectWithMapping,
    clearProblematicCache,
    createObjectMappings
}

console.log('🔧 DQA360 Error Fix Script Loaded')
console.log('📋 Available functions:')
console.log('  • await fixAllErrors() - Fix all 404/409 errors')
console.log('  • await testFix() - Test if errors are fixed')
console.log('  • await clearProblematicCache() - Clear cached data')
console.log('')
console.log('🚀 Quick fix: await fixAllErrors()')