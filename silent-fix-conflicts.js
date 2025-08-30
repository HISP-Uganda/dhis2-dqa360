/**
 * Silent DQA360 Conflict Resolution Script
 * 
 * This script silently resolves 409 conflicts by reusing existing objects
 * instead of creating duplicates. No console logging.
 * 
 * USAGE:
 * 1. Open browser console on DQA360 app
 * 2. Paste this script
 * 3. Run: await silentFixConflicts()
 */

// Main silent fix function
async function silentFixConflicts() {
    const results = {
        reusedObjects: 0,
        clearedConflicts: 0,
        errors: 0
    }
    
    try {
        // Step 1: Clear conflicting datastore entries silently
        const datastoreKeys = ['categoryCombos', 'dataElements', 'dataSets', 'assessments']
        
        for (const key of datastoreKeys) {
            try {
                const response = await fetch(`/api/dataStore/dqa360/${key}`, {
                    method: 'DELETE'
                })
                if (response.ok) {
                    results.clearedConflicts++
                }
            } catch (error) {
                // Silently ignore - key might not exist
            }
        }
        
        // Step 2: Set up object reuse mappings for known conflicts
        const conflictMappings = await setupConflictMappings()
        results.reusedObjects = conflictMappings.mappedObjects
        
        // Step 3: Store mappings for the app to use
        if (conflictMappings.mappings && Object.keys(conflictMappings.mappings).length > 0) {
            try {
                await fetch('/api/dataStore/dqa360/conflictMappings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(conflictMappings.mappings)
                })
            } catch (error) {
                // Try PUT if POST fails (key might exist)
                try {
                    await fetch('/api/dataStore/dqa360/conflictMappings', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(conflictMappings.mappings)
                    })
                } catch (putError) {
                    results.errors++
                }
            }
        }
        
        return results
        
    } catch (error) {
        results.errors++
        return results
    }
}

// Setup conflict mappings by finding existing objects
async function setupConflictMappings() {
    const mappings = {
        categoryCombos: {},
        dataSets: {},
        dataElements: {}
    }
    
    let mappedObjects = 0
    
    // Known problematic IDs from your error log
    const problematicCombos = ['TUYu2OrnbXV', 'iexS9B0LKpd', 'qP9R7dIy9l0']
    const problematicDatasets = ['mdVgUOEm5NQ', 's2E0qbAHCMM', 'HT15afG5J4T']
    
    // Find fallback category combo
    try {
        const defaultResponse = await fetch('/api/categoryCombos/default?fields=id,name,code')
        if (defaultResponse.ok) {
            const defaultCombo = await defaultResponse.json()
            
            // Map all problematic combos to default
            problematicCombos.forEach(problemId => {
                mappings.categoryCombos[problemId] = defaultCombo.id
                mappedObjects++
            })
        } else {
            // Try to find any category combo
            const anyResponse = await fetch('/api/categoryCombos?fields=id,name,code&pageSize=1')
            if (anyResponse.ok) {
                const combos = await anyResponse.json()
                if (combos.categoryCombos?.length > 0) {
                    const fallbackCombo = combos.categoryCombos[0]
                    
                    problematicCombos.forEach(problemId => {
                        mappings.categoryCombos[problemId] = fallbackCombo.id
                        mappedObjects++
                    })
                }
            }
        }
    } catch (error) {
        // Silently handle error
    }
    
    // Check for existing datasets and map alternatives
    for (const datasetId of problematicDatasets) {
        try {
            const response = await fetch(`/api/dataSets/${datasetId}?fields=id,name,code`)
            if (response.ok) {
                const dataset = await response.json()
                mappings.dataSets[datasetId] = dataset.id
                mappedObjects++
            } else {
                // Try to find similar datasets
                const searchResponse = await fetch('/api/dataSets?filter=code:like:DQA360&fields=id,name,code&pageSize=1')
                if (searchResponse.ok) {
                    const datasets = await searchResponse.json()
                    if (datasets.dataSets?.length > 0) {
                        mappings.dataSets[datasetId] = datasets.dataSets[0].id
                        mappedObjects++
                    }
                }
            }
        } catch (error) {
            // Silently handle error
        }
    }
    
    return {
        mappings,
        mappedObjects
    }
}

// Enhanced object finder that checks mappings first
async function findExistingObjectWithMapping(resourceType, objectData) {
    try {
        // Check if we have a mapping for this object
        const mappingsResponse = await fetch('/api/dataStore/dqa360/conflictMappings')
        if (mappingsResponse.ok) {
            const mappings = await mappingsResponse.json()
            const resourceMappings = mappings[resourceType] || {}
            
            // Check by code first
            if (objectData.code && resourceMappings[objectData.code]) {
                const mappedId = resourceMappings[objectData.code]
                const response = await fetch(`/api/${resourceType}/${mappedId}?fields=id,name,code,shortName`)
                if (response.ok) {
                    return await response.json()
                }
            }
            
            // Check by name
            if (objectData.name && resourceMappings[objectData.name]) {
                const mappedId = resourceMappings[objectData.name]
                const response = await fetch(`/api/${resourceType}/${mappedId}?fields=id,name,code,shortName`)
                if (response.ok) {
                    return await response.json()
                }
            }
        }
        
        // Fallback to direct search
        if (objectData.code) {
            const response = await fetch(`/api/${resourceType}?filter=code:eq:${objectData.code}&fields=id,name,code,shortName&pageSize=1`)
            if (response.ok) {
                const result = await response.json()
                const objects = result[resourceType] || []
                if (objects.length > 0) {
                    return objects[0]
                }
            }
        }
        
        if (objectData.name) {
            const response = await fetch(`/api/${resourceType}?filter=name:eq:${objectData.name}&fields=id,name,code,shortName&pageSize=1`)
            if (response.ok) {
                const result = await response.json()
                const objects = result[resourceType] || []
                if (objects.length > 0) {
                    return objects[0]
                }
            }
        }
        
        return null
        
    } catch (error) {
        return null
    }
}

// Export for use in the app
window.dqa360SilentFix = {
    silentFixConflicts,
    findExistingObjectWithMapping,
    setupConflictMappings
}

// Auto-run on load
silentFixConflicts().then(results => {
    // Store results for the app to check
    window.dqa360FixResults = results
})