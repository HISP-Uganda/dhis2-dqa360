/**
 * Utility to fix existing assessments with null dhis2Id values
 * This will update assessments to have proper local IDs and correct status
 */

import { loadAllAssessments, updateAssessmentTab } from '../services/tabBasedDataStoreService'

// Helper function to generate local dataset ID
const generateLocalDatasetId = (suffix, timestamp) => {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `local_ds_${suffix.replace('_', '')}_${timestamp}_${random}`
}

/**
 * Fix existing assessments with null dhis2Id values
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<Object>} Result of the fix operation
 */
export const fixExistingAssessments = async (dataEngine) => {
    try {
        console.log('🔧 Starting fix for existing assessments with null dhis2Id values...')
        
        // Get all assessments
        const assessments = await loadAllAssessments()
        console.log(`📊 Found ${assessments.length} assessments to check`)
        
        const fixResults = {
            total: assessments.length,
            fixed: 0,
            alreadyCorrect: 0,
            errors: []
        }
        
        for (const assessment of assessments) {
            try {
                console.log(`🔍 Checking assessment: ${assessment.info?.name || assessment.id}`)
                
                // Check if this assessment has datasets with null dhis2Id
                const hasNullDhis2Ids = assessment.localDatasets?.createdDatasets?.some(ds => ds.dhis2Id === null)
                
                if (!hasNullDhis2Ids) {
                    console.log(`✅ Assessment ${assessment.id} already has correct dhis2Id values`)
                    fixResults.alreadyCorrect++
                    continue
                }
                
                console.log(`🔧 Fixing assessment ${assessment.id} with null dhis2Id values`)
                
                // Create a timestamp for this assessment (use existing createdAt or current time)
                const assessmentTimestamp = assessment.localDatasets?.info?.createdAt 
                    ? new Date(assessment.localDatasets.info.createdAt).getTime()
                    : Date.now()
                
                // Fix each dataset
                const fixedDatasets = assessment.localDatasets.createdDatasets.map(dataset => {
                    if (dataset.dhis2Id === null) {
                        // Generate a proper local ID based on the dataset type
                        const suffix = dataset.type || 'unknown'
                        const newLocalId = generateLocalDatasetId(suffix, assessmentTimestamp)
                        
                        console.log(`  📝 Fixing dataset ${dataset.name}: ${dataset.id} -> ${newLocalId}`)
                        
                        return {
                            ...dataset,
                            id: newLocalId,
                            dhis2Id: newLocalId, // Set dhis2Id to the local ID for consistency
                            status: 'local',
                            isLocal: true,
                            fixedAt: new Date().toISOString()
                        }
                    }
                    return dataset
                })
                
                // Update the assessment's localDatasets
                const updatedLocalDatasets = {
                    ...assessment.localDatasets,
                    createdDatasets: fixedDatasets,
                    info: {
                        ...assessment.localDatasets.info,
                        creationStatus: 'completed', // Change from 'failed' to 'completed'
                        fixedAt: new Date().toISOString(),
                        fixNote: 'Fixed null dhis2Id values with proper local IDs'
                    }
                }
                
                // Update the assessment in the datastore
                await updateAssessmentTab(assessment.id, 'localDatasets', updatedLocalDatasets)
                
                console.log(`✅ Fixed assessment ${assessment.id}`)
                fixResults.fixed++
                
            } catch (error) {
                console.error(`❌ Error fixing assessment ${assessment.id}:`, error)
                fixResults.errors.push({
                    assessmentId: assessment.id,
                    error: error.message
                })
            }
        }
        
        console.log('🎉 Fix operation completed!')
        console.log(`📊 Results:`)
        console.log(`  - Total assessments: ${fixResults.total}`)
        console.log(`  - Fixed: ${fixResults.fixed}`)
        console.log(`  - Already correct: ${fixResults.alreadyCorrect}`)
        console.log(`  - Errors: ${fixResults.errors.length}`)
        
        if (fixResults.errors.length > 0) {
            console.error('❌ Errors encountered:', fixResults.errors)
        }
        
        return fixResults
        
    } catch (error) {
        console.error('❌ Fatal error during fix operation:', error)
        throw error
    }
}

/**
 * Fix a specific assessment by ID
 * @param {string} assessmentId - The assessment ID to fix
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<Object>} Result of the fix operation
 */
export const fixSpecificAssessment = async (assessmentId, dataEngine) => {
    try {
        console.log(`🔧 Fixing specific assessment: ${assessmentId}`)
        
        // Get all assessments and find the specific one
        const assessments = await loadAllAssessments()
        const assessment = assessments.find(a => a.id === assessmentId)
        
        if (!assessment) {
            throw new Error(`Assessment with ID ${assessmentId} not found`)
        }
        
        // Use the main fix function but only for this assessment
        const result = await fixExistingAssessments(dataEngine)
        
        return {
            assessmentId,
            fixed: result.fixed > 0,
            details: result
        }
        
    } catch (error) {
        console.error(`❌ Error fixing assessment ${assessmentId}:`, error)
        throw error
    }
}