/**
 * Script to help diagnose and fix metadata conflicts in DQA360
 * Run this in your browser console while on the DQA360 app
 */

// Function to clear DQA360 datastore entries that might be causing conflicts
async function clearDQA360DataStore() {
    try {
        console.log('🔍 Checking DQA360 datastore entries...')
        
        // Get all datastore keys for dqa360 namespace
        const response = await fetch('/api/dataStore/dqa360', {
            headers: {
                'Accept': 'application/json'
            }
        })
        
        if (response.ok) {
            const keys = await response.json()
            console.log('📋 Found datastore keys:', keys)
            
            // Optionally clear specific keys that might be causing conflicts
            const conflictKeys = ['categoryCombos', 'dataElements', 'dataSets', 'assessments']
            
            for (const key of conflictKeys) {
                if (keys.includes(key)) {
                    console.log(`🗑️ Clearing ${key}...`)
                    try {
                        await fetch(`/api/dataStore/dqa360/${key}`, {
                            method: 'DELETE'
                        })
                        console.log(`✅ Cleared ${key}`)
                    } catch (error) {
                        console.log(`⚠️ Could not clear ${key}:`, error.message)
                    }
                }
            }
        } else {
            console.log('ℹ️ No DQA360 datastore found or access denied')
        }
    } catch (error) {
        console.error('❌ Error accessing datastore:', error)
    }
}

// Function to check for conflicting metadata objects
async function checkConflictingMetadata() {
    console.log('🔍 Checking for conflicting metadata...')
    
    const checks = [
        {
            name: 'Category Combos',
            endpoint: '/api/categoryCombos?filter=code:like:DQA360&fields=id,name,code'
        },
        {
            name: 'Data Elements', 
            endpoint: '/api/dataElements?filter=code:like:DQA360&fields=id,name,code'
        },
        {
            name: 'Data Sets',
            endpoint: '/api/dataSets?filter=code:like:DQA360&fields=id,name,code'
        }
    ]
    
    for (const check of checks) {
        try {
            const response = await fetch(check.endpoint)
            if (response.ok) {
                const data = await response.json()
                const items = data[check.name.toLowerCase().replace(' ', '')] || []
                console.log(`📊 ${check.name}: ${items.length} DQA360 objects found`)
                if (items.length > 0) {
                    console.table(items)
                }
            }
        } catch (error) {
            console.log(`⚠️ Could not check ${check.name}:`, error.message)
        }
    }
}

// Function to validate system requirements
async function validateSystemRequirements() {
    console.log('🔍 Validating system requirements...')
    
    try {
        // Check if we have a default category combo
        const defaultCCResponse = await fetch('/api/categoryCombos/default?fields=id,name')
        if (defaultCCResponse.ok) {
            const defaultCC = await defaultCCResponse.json()
            console.log('✅ Default category combo available:', defaultCC.name)
        } else {
            console.log('⚠️ Default category combo not accessible')
        }
        
        // Check user permissions
        const meResponse = await fetch('/api/me?fields=id,username,authorities')
        if (meResponse.ok) {
            const user = await meResponse.json()
            const hasMetadataAuth = user.authorities?.some(auth => 
                auth.includes('F_METADATA') || auth.includes('ALL')
            )
            console.log('👤 Current user:', user.username)
            console.log('🔐 Has metadata permissions:', hasMetadataAuth)
        }
        
    } catch (error) {
        console.error('❌ Error validating system:', error)
    }
}

// Main diagnostic function
async function diagnoseDQA360Issues() {
    console.log('🚀 Starting DQA360 diagnostic...')
    console.log('=====================================')
    
    await validateSystemRequirements()
    console.log('=====================================')
    
    await checkConflictingMetadata()
    console.log('=====================================')
    
    await clearDQA360DataStore()
    console.log('=====================================')
    
    console.log('✅ Diagnostic complete!')
    console.log('💡 Try creating a new assessment now.')
}

// Export functions for manual use
window.dqa360Diagnostic = {
    diagnoseDQA360Issues,
    clearDQA360DataStore,
    checkConflictingMetadata,
    validateSystemRequirements
}

console.log('🔧 DQA360 diagnostic tools loaded!')
console.log('Run: dqa360Diagnostic.diagnoseDQA360Issues()')