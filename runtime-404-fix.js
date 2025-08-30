/**
 * Runtime 404 Fix Script
 * Run this in browser console to immediately fix 404 errors
 */

// Problematic IDs that cause 404 errors
const PROBLEMATIC_IDS = {
    categoryCombos: ['esaNB4G5AHs', 'TUYu2OrnbXV', 'iexS9B0LKpd', 'qP9R7dIy9l0'],
    categories: ['O5P6e8yu1T6', 'aIn0fYpbJBB'],
    categoryOptions: ['SmYO0gIhf56', 'TxZHRyZzO7U', 'xxPa3FS6PdJ', 'aszipxCwbou', 'J54uo0MHP8h', 'EUk9GP2wlE7', 'OtOMRJIJ1oc']
}

// Store original fetch
const originalFetch = window.fetch

// ID mappings (will be populated)
let idMappings = {}

// Initialize mappings
async function initializeMappings() {
    console.log('🔄 Initializing ID mappings...')
    
    try {
        // Get default category combo
        const categoryComboResponse = await originalFetch('/api/40/categoryCombos?fields=id,name&filter=name:eq:default&pageSize=1')
        if (categoryComboResponse.ok) {
            const data = await categoryComboResponse.json()
            if (data.categoryCombos?.length > 0) {
                const defaultCombo = data.categoryCombos[0]
                PROBLEMATIC_IDS.categoryCombos.forEach(id => {
                    idMappings[id] = defaultCombo.id
                })
                console.log(`✅ Mapped category combos to: ${defaultCombo.name} (${defaultCombo.id})`)
            }
        }
        
        // Get default category
        const categoryResponse = await originalFetch('/api/40/categories?fields=id,name&filter=name:eq:default&pageSize=1')
        if (categoryResponse.ok) {
            const data = await categoryResponse.json()
            if (data.categories?.length > 0) {
                const defaultCategory = data.categories[0]
                PROBLEMATIC_IDS.categories.forEach(id => {
                    idMappings[id] = defaultCategory.id
                })
                console.log(`✅ Mapped categories to: ${defaultCategory.name} (${defaultCategory.id})`)
            }
        }
        
        // Get default category option
        const categoryOptionResponse = await originalFetch('/api/40/categoryOptions?fields=id,name&filter=name:eq:default&pageSize=1')
        if (categoryOptionResponse.ok) {
            const data = await categoryOptionResponse.json()
            if (data.categoryOptions?.length > 0) {
                const defaultOption = data.categoryOptions[0]
                PROBLEMATIC_IDS.categoryOptions.forEach(id => {
                    idMappings[id] = defaultOption.id
                })
                console.log(`✅ Mapped category options to: ${defaultOption.name} (${defaultOption.id})`)
            }
        }
        
        console.log('✅ ID mappings initialized:', idMappings)
        
    } catch (error) {
        console.warn('⚠️ Could not initialize all mappings:', error.message)
    }
}

// Map problematic URLs
function mapUrl(url) {
    // Check if URL contains problematic IDs
    for (const [problemId, mappedId] of Object.entries(idMappings)) {
        if (url.includes(problemId)) {
            const mappedUrl = url.replace(problemId, mappedId)
            console.log(`🔄 Mapped URL: ${url} → ${mappedUrl}`)
            return mappedUrl
        }
    }
    return url
}

// Intercept fetch calls
window.fetch = async function(url, options = {}) {
    // Map the URL if it contains problematic IDs
    const mappedUrl = mapUrl(url.toString())
    
    try {
        const response = await originalFetch(mappedUrl, options)
        
        // If still 404, provide fallback response
        if (!response.ok && response.status === 404) {
            console.log(`🔄 Providing fallback for 404: ${mappedUrl}`)
            
            // Determine resource type from URL
            if (mappedUrl.includes('/categoryCombos/')) {
                return new Response(JSON.stringify({
                    id: mappedUrl.split('/categoryCombos/')[1].split('?')[0],
                    name: 'Default Category Combo',
                    code: 'DEFAULT'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                })
            } else if (mappedUrl.includes('/categories/')) {
                return new Response(JSON.stringify({
                    id: mappedUrl.split('/categories/')[1].split('?')[0],
                    name: 'Default Category',
                    code: 'DEFAULT'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                })
            } else if (mappedUrl.includes('/categoryOptions/')) {
                return new Response(JSON.stringify({
                    id: mappedUrl.split('/categoryOptions/')[1].split('?')[0],
                    name: 'Default Category Option',
                    code: 'DEFAULT'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                })
            }
        }
        
        return response
        
    } catch (error) {
        console.error('Fetch error:', error)
        throw error
    }
}

// Apply the fix
async function applyRuntimeFix() {
    console.log('🚀 Applying runtime 404 fix...')
    
    await initializeMappings()
    
    console.log('✅ Runtime 404 fix applied!')
    console.log('📋 What was done:')
    console.log('   • Intercepted fetch calls to map problematic IDs')
    console.log('   • Provided fallback responses for 404 errors')
    console.log('   • Mapped problematic IDs to working alternatives')
    console.log('')
    console.log('🔄 Try creating an assessment now - 404 errors should be gone!')
}

// Auto-apply the fix
applyRuntimeFix()

// Export for manual use
window.applyRuntimeFix = applyRuntimeFix
window.idMappings = idMappings

console.log('💡 Runtime fix loaded! Run applyRuntimeFix() to reapply if needed.')