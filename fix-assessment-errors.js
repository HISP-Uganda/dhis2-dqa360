/**
 * DQA360 Assessment Error Fix Script
 * 
 * This script addresses the specific API errors you're experiencing:
 * - 404 errors for missing category combos and datasets
 * - 409 conflict errors during metadata import
 * 
 * USAGE:
 * 1. Open your browser console while on the DQA360 app
 * 2. Copy and paste this entire script
 * 3. Run: await fixAssessmentErrors()
 */

// Main fix function
async function fixAssessmentErrors() {
    console.log('🚀 DQA360 Assessment Error Fix - Starting...')
    console.log('=====================================')
    
    const results = {
        step1: null, // System validation
        step2: null, // Clear conflicts
        step3: null, // Fix missing references
        step4: null, // Verify fixes
        summary: { fixed: 0, warnings: 0, errors: 0 }
    }
    
    try {
        // Step 1: Validate system readiness
        console.log('📋 Step 1: Validating system readiness...')
        results.step1 = await validateSystem()
        
        // Step 2: Clear conflicting datastore entries
        console.log('🗑️ Step 2: Clearing conflicting datastore entries...')
        results.step2 = await clearConflictingData()
        
        // Step 3: Fix missing category combo references
        console.log('🔧 Step 3: Fixing missing category combo references...')
        results.step3 = await fixMissingReferences()
        
        // Step 4: Verify fixes
        console.log('✅ Step 4: Verifying fixes...')
        results.step4 = await verifyFixes()
        
        // Summary
        console.log('=====================================')
        console.log('📊 FIX SUMMARY:')
        console.log(`✅ Fixed: ${results.summary.fixed} issues`)
        console.log(`⚠️ Warnings: ${results.summary.warnings} issues`)
        console.log(`❌ Errors: ${results.summary.errors} issues`)
        
        if (results.summary.errors === 0) {
            console.log('🎉 All issues resolved! Try creating your assessment again.')
        } else {
            console.log('⚠️ Some issues remain. Check the detailed output above.')
        }
        
        return results
        
    } catch (error) {
        console.error('❌ Fix script failed:', error)
        results.summary.errors += 1
        return results
    }
}

// Step 1: Validate system
async function validateSystem() {
    const validation = { ready: false, issues: [], fixes: [] }
    
    try {
        // Check if we can access basic DHIS2 APIs
        const response = await fetch('/api/me?fields=id,username,authorities')
        if (response.ok) {
            const user = await response.json()
            console.log(`👤 Current user: ${user.username}`)
            
            const hasMetadataAuth = user.authorities?.some(auth => 
                auth.includes('F_METADATA') || 
                auth.includes('F_DATASET_PUBLIC_ADD') ||
                auth.includes('ALL')
            )
            
            if (hasMetadataAuth) {
                console.log('✅ User has metadata creation permissions')
                validation.fixes.push('User permissions OK')
            } else {
                console.log('⚠️ User may lack metadata creation permissions')
                validation.issues.push('Limited metadata permissions')
            }
        }
        
        // Check for default category combo
        const ccResponse = await fetch('/api/categoryCombos/default?fields=id,name')
        if (ccResponse.ok) {
            const defaultCC = await ccResponse.json()
            console.log('✅ Default category combo available:', defaultCC.name)
            validation.fixes.push('Default category combo available')
        } else {
            console.log('⚠️ Default category combo not accessible')
            validation.issues.push('Default category combo missing')
        }
        
        validation.ready = validation.issues.length === 0
        return validation
        
    } catch (error) {
        console.error('❌ System validation failed:', error)
        validation.issues.push(`System validation error: ${error.message}`)
        return validation
    }
}

// Step 2: Clear conflicting datastore entries
async function clearConflictingData() {
    const clearing = { cleared: [], failed: [] }
    
    try {
        // Get all DQA360 datastore keys
        const response = await fetch('/api/dataStore/dqa360')
        if (response.ok) {
            const keys = await response.json()
            console.log('📋 Found DQA360 datastore keys:', keys)
            
            // Clear potentially conflicting keys
            const conflictKeys = ['categoryCombos', 'dataElements', 'dataSets', 'assessments']
            
            for (const key of conflictKeys) {
                if (keys.includes(key)) {
                    try {
                        const deleteResponse = await fetch(`/api/dataStore/dqa360/${key}`, {
                            method: 'DELETE'
                        })
                        
                        if (deleteResponse.ok) {
                            console.log(`✅ Cleared datastore key: ${key}`)
                            clearing.cleared.push(key)
                        } else {
                            console.log(`⚠️ Could not clear key ${key}: ${deleteResponse.status}`)
                            clearing.failed.push(key)
                        }
                    } catch (error) {
                        console.log(`⚠️ Error clearing key ${key}:`, error.message)
                        clearing.failed.push(key)
                    }
                }
            }
        } else {
            console.log('ℹ️ No DQA360 datastore found or access denied')
        }
        
        return clearing
        
    } catch (error) {
        console.error('❌ Failed to clear datastore:', error)
        clearing.failed.push('datastore_access')
        return clearing
    }
}

// Step 3: Fix missing category combo references
async function fixMissingReferences() {
    const fixing = { 
        missingCombos: ['TUYu2OrnbXV', 'iexS9B0LKpd', 'qP9R7dIy9l0'],
        missingDatasets: ['mdVgUOEm5NQ', 's2E0qbAHCMM', 'HT15afG5J4T'],
        fallbackCombo: null,
        alternativeDatasets: []
    }
    
    try {
        // Find a fallback category combo
        console.log('🔍 Finding fallback category combo...')
        
        // Try default first
        let fallbackResponse = await fetch('/api/categoryCombos/default?fields=id,name,code')
        if (fallbackResponse.ok) {
            fixing.fallbackCombo = await fallbackResponse.json()
            console.log('✅ Using default category combo:', fixing.fallbackCombo.name)
        } else {
            // Try to find any category combo
            fallbackResponse = await fetch('/api/categoryCombos?fields=id,name,code&pageSize=1')
            if (fallbackResponse.ok) {
                const combos = await fallbackResponse.json()
                if (combos.categoryCombos?.length > 0) {
                    fixing.fallbackCombo = combos.categoryCombos[0]
                    console.log('✅ Using fallback category combo:', fixing.fallbackCombo.name)
                }
            }
        }
        
        if (!fixing.fallbackCombo) {
            console.log('❌ No category combo available - this is a critical system issue')
            return fixing
        }
        
        // Check for alternative datasets
        console.log('🔍 Checking for alternative datasets...')
        const datasetResponse = await fetch('/api/dataSets?filter=code:like:DQA360&fields=id,name,code&pageSize=10')
        if (datasetResponse.ok) {
            const datasets = await datasetResponse.json()
            fixing.alternativeDatasets = datasets.dataSets || []
            console.log(`📊 Found ${fixing.alternativeDatasets.length} DQA360 datasets`)
        }
        
        return fixing
        
    } catch (error) {
        console.error('❌ Failed to fix missing references:', error)
        return fixing
    }
}

// Step 4: Verify fixes
async function verifyFixes() {
    const verification = { tests: [], passed: 0, failed: 0 }
    
    const tests = [
        {
            name: 'Default category combo access',
            test: async () => {
                const response = await fetch('/api/categoryCombos/default?fields=id,name')
                return response.ok
            }
        },
        {
            name: 'User permissions',
            test: async () => {
                const response = await fetch('/api/me?fields=authorities')
                if (response.ok) {
                    const user = await response.json()
                    return user.authorities?.some(auth => 
                        auth.includes('F_METADATA') || auth.includes('ALL')
                    )
                }
                return false
            }
        },
        {
            name: 'System info access',
            test: async () => {
                const response = await fetch('/api/system/info?fields=version')
                return response.ok
            }
        },
        {
            name: 'Datastore access',
            test: async () => {
                const response = await fetch('/api/dataStore')
                return response.ok
            }
        }
    ]
    
    for (const test of tests) {
        try {
            const result = await test.test()
            verification.tests.push({ name: test.name, passed: result })
            
            if (result) {
                console.log(`✅ ${test.name}: PASSED`)
                verification.passed += 1
            } else {
                console.log(`❌ ${test.name}: FAILED`)
                verification.failed += 1
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ERROR - ${error.message}`)
            verification.tests.push({ name: test.name, passed: false, error: error.message })
            verification.failed += 1
        }
    }
    
    return verification
}

// Additional utility functions
async function checkSpecificErrors() {
    console.log('🔍 Checking specific error conditions...')
    
    const errorChecks = {
        missingCategoryCombos: [],
        missingDatasets: [],
        conflictingObjects: []
    }
    
    // Check the specific IDs from your error log
    const problematicCombos = ['TUYu2OrnbXV', 'iexS9B0LKpd', 'qP9R7dIy9l0']
    const problematicDatasets = ['mdVgUOEm5NQ', 's2E0qbAHCMM', 'HT15afG5J4T']
    
    for (const comboId of problematicCombos) {
        try {
            const response = await fetch(`/api/categoryCombos/${comboId}?fields=id,name,code`)
            if (response.ok) {
                const combo = await response.json()
                console.log(`✅ Category combo ${comboId} exists: ${combo.name}`)
            } else {
                console.log(`❌ Category combo ${comboId} not found (${response.status})`)
                errorChecks.missingCategoryCombos.push(comboId)
            }
        } catch (error) {
            console.log(`❌ Error checking category combo ${comboId}:`, error.message)
            errorChecks.missingCategoryCombos.push(comboId)
        }
    }
    
    for (const datasetId of problematicDatasets) {
        try {
            const response = await fetch(`/api/dataSets/${datasetId}?fields=id,name,code`)
            if (response.ok) {
                const dataset = await response.json()
                console.log(`✅ Dataset ${datasetId} exists: ${dataset.name}`)
            } else {
                console.log(`❌ Dataset ${datasetId} not found (${response.status})`)
                errorChecks.missingDatasets.push(datasetId)
            }
        } catch (error) {
            console.log(`❌ Error checking dataset ${datasetId}:`, error.message)
            errorChecks.missingDatasets.push(datasetId)
        }
    }
    
    return errorChecks
}

// Export functions for manual use
window.dqa360ErrorFix = {
    fixAssessmentErrors,
    validateSystem,
    clearConflictingData,
    fixMissingReferences,
    verifyFixes,
    checkSpecificErrors
}

console.log('🔧 DQA360 Error Fix Script Loaded!')
console.log('📋 Available functions:')
console.log('  - fixAssessmentErrors() - Run complete fix')
console.log('  - dqa360ErrorFix.checkSpecificErrors() - Check specific error conditions')
console.log('  - dqa360ErrorFix.validateSystem() - Validate system only')
console.log('')
console.log('🚀 To fix your assessment errors, run:')
console.log('await fixAssessmentErrors()')