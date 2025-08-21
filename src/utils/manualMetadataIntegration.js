/**
 * Manual Metadata Integration Utility
 * 
 * Integrates manually created metadata with the assessment tools creator
 * and manages the conversion between manual metadata and DHIS2 datasets
 */

import { loadAllManualMetadata, saveToDatastore, DATASTORE_KEYS } from './manualMetadataCreator'
import { createAssessmentTools } from './assessmentToolsCreator'

/**
 * Convert manual datasets to assessment tool format
 * @param {Array} manualDatasets - Array of manually created datasets
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<Array>} Array of assessment tools
 */
const convertManualDatasetsToAssessmentTools = async (manualDatasets, dataEngine) => {
    const assessmentTools = []

    for (const dataset of manualDatasets) {
        if (!dataset.createdInDHIS2) {
            console.warn(`Dataset ${dataset.name} not created in DHIS2, skipping...`)
            continue
        }

        // Create assessment tool structure
        const assessmentTool = {
            id: dataset.dhis2Id,
            name: dataset.name,
            displayName: dataset.displayName || dataset.name,
            code: dataset.code,
            description: dataset.description,
            periodType: dataset.periodType,
            dataSetElements: dataset.dataSetElements || [],
            organisationUnits: dataset.organisationUnits || [],
            categoryCombo: dataset.categoryCombo,
            
            // Assessment-specific properties
            toolType: 'MANUAL',
            isManuallyCreated: true,
            createdAt: dataset.createdAt,
            lastUpdated: dataset.lastUpdated,
            
            // DHIS2 URLs
            datasetUrl: `/dhis-web-dataset-reports/index.html#/dataset/${dataset.dhis2Id}`,
            datasetApiUrl: `/api/dataSets/${dataset.dhis2Id}`,
            
            // Status
            status: 'active',
            isLocal: false
        }

        assessmentTools.push(assessmentTool)
    }

    return assessmentTools
}

/**
 * Create assessment tools from manual metadata
 * @param {Object} config - Configuration object
 * @param {Object} config.dataEngine - DHIS2 data engine
 * @param {Array} config.selectedDatasets - Selected manual datasets
 * @param {Array} config.orgUnits - Organization units
 * @param {Function} config.onProgress - Progress callback
 * @returns {Promise<Object>} Assessment creation results
 */
const createAssessmentToolsFromManualMetadata = async (config) => {
    const { dataEngine, selectedDatasets, orgUnits, onProgress } = config

    try {
        if (onProgress) {
            onProgress({
                current: 1,
                total: 4,
                message: 'Loading manual metadata...',
                percentage: 25
            })
        }

        // Load all manual metadata
        const manualMetadata = await loadAllManualMetadata(dataEngine)

        if (onProgress) {
            onProgress({
                current: 2,
                total: 4,
                message: 'Converting manual datasets to assessment tools...',
                percentage: 50
            })
        }

        // Filter selected datasets
        const filteredDatasets = manualMetadata.datasets.filter(dataset => 
            selectedDatasets.includes(dataset.id) && dataset.createdInDHIS2
        )

        if (filteredDatasets.length === 0) {
            throw new Error('No valid manual datasets selected or created in DHIS2')
        }

        // Convert to assessment tools
        const assessmentTools = await convertManualDatasetsToAssessmentTools(filteredDatasets, dataEngine)

        if (onProgress) {
            onProgress({
                current: 3,
                total: 4,
                message: 'Creating assessment tool variants...',
                percentage: 75
            })
        }

        // Create the 4 assessment tool variants for each manual dataset
        const results = {
            success: true,
            createdDatasets: [],
            summary: {
                total: assessmentTools.length * 4, // 4 variants per dataset
                successful: 0,
                failed: 0
            },
            errors: []
        }

        // Assessment tool configurations
        const ASSESSMENT_TOOLS = [
            { name: 'Register Review', suffix: '_REGISTER', description: 'Register data review tool' },
            { name: 'Summary Review', suffix: '_SUMMARY', description: 'Summary data review tool' },
            { name: 'Reported Data', suffix: '_REPORTED', description: 'Reported data tool' },
            { name: 'Corrected Data', suffix: '_CORRECTED', description: 'Corrected data tool' }
        ]

        for (const baseDataset of assessmentTools) {
            for (const toolConfig of ASSESSMENT_TOOLS) {
                try {
                    // Create variant dataset
                    const variantDataset = {
                        ...baseDataset,
                        id: `${baseDataset.id}${toolConfig.suffix}`,
                        name: `${baseDataset.name}${toolConfig.suffix}`,
                        displayName: `${baseDataset.displayName}${toolConfig.suffix}`,
                        code: `${baseDataset.code}${toolConfig.suffix}`,
                        description: `${toolConfig.description} - ${baseDataset.description}`,
                        toolType: toolConfig.suffix.replace('_', ''),
                        baseDatasetId: baseDataset.id,
                        
                        // Update URLs for variant
                        datasetUrl: `/dhis-web-dataset-reports/index.html#/dataset/${baseDataset.id}${toolConfig.suffix}`,
                        datasetApiUrl: `/api/dataSets/${baseDataset.id}${toolConfig.suffix}`
                    }

                    results.createdDatasets.push(variantDataset)
                    results.summary.successful++

                    if (onProgress) {
                        onProgress({
                            current: 3,
                            total: 4,
                            message: `Created ${toolConfig.name} for ${baseDataset.name}`,
                            percentage: 75
                        })
                    }

                } catch (error) {
                    results.errors.push({
                        tool: `${baseDataset.name}${toolConfig.suffix}`,
                        error: error.message
                    })
                    results.summary.failed++
                }
            }
        }

        if (onProgress) {
            onProgress({
                current: 4,
                total: 4,
                message: 'Saving assessment tools to datastore...',
                percentage: 100
            })
        }

        // Save assessment tools to datastore
        await saveToDatastore(
            dataEngine, 
            'manual-assessment-tools', 
            results.createdDatasets, 
            onProgress
        )

        results.success = results.summary.failed === 0

        return results

    } catch (error) {
        console.error('Error creating assessment tools from manual metadata:', error)
        
        if (onProgress) {
            onProgress({
                current: 4,
                total: 4,
                message: `Error: ${error.message}`,
                percentage: 100
            })
        }

        return {
            success: false,
            createdDatasets: [],
            summary: { total: 0, successful: 0, failed: 1 },
            errors: [{ tool: 'overall', error: error.message }]
        }
    }
}

/**
 * Sync manual datasets with DHIS2 local datasets
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Sync results
 */
const syncManualDatasetsWithDHIS2 = async (dataEngine, onProgress = null) => {
    try {
        if (onProgress) {
            onProgress({ message: 'Loading manual metadata...', step: 'sync' })
        }

        // Load manual metadata
        const manualMetadata = await loadAllManualMetadata(dataEngine)
        const manualDatasets = manualMetadata.datasets.filter(ds => ds.createdInDHIS2)

        if (manualDatasets.length === 0) {
            return {
                success: true,
                message: 'No manual datasets found in DHIS2',
                synced: 0
            }
        }

        if (onProgress) {
            onProgress({ message: 'Querying DHIS2 for dataset status...', step: 'sync' })
        }

        // Check which datasets still exist in DHIS2
        const syncResults = {
            success: true,
            synced: 0,
            removed: 0,
            errors: []
        }

        for (const dataset of manualDatasets) {
            try {
                // Check if dataset exists in DHIS2
                const query = {
                    dataset: {
                        resource: `dataSets/${dataset.dhis2Id}`,
                        params: {
                            fields: 'id,name,displayName,lastUpdated'
                        }
                    }
                }

                const result = await dataEngine.query(query)
                
                if (result.dataset) {
                    // Dataset exists, update local metadata if needed
                    if (result.dataset.lastUpdated !== dataset.lastUpdated) {
                        dataset.lastUpdated = result.dataset.lastUpdated
                        dataset.syncedAt = new Date().toISOString()
                        syncResults.synced++
                    }
                } else {
                    // Dataset doesn't exist in DHIS2 anymore
                    dataset.createdInDHIS2 = false
                    dataset.removedFromDHIS2 = true
                    dataset.removedAt = new Date().toISOString()
                    syncResults.removed++
                }

            } catch (error) {
                if (error.httpStatusCode === 404) {
                    // Dataset not found in DHIS2
                    dataset.createdInDHIS2 = false
                    dataset.removedFromDHIS2 = true
                    dataset.removedAt = new Date().toISOString()
                    syncResults.removed++
                } else {
                    syncResults.errors.push({
                        dataset: dataset.name,
                        error: error.message
                    })
                }
            }
        }

        // Save updated metadata back to datastore
        await saveToDatastore(dataEngine, DATASTORE_KEYS.DATASETS, manualMetadata.datasets, onProgress)

        if (onProgress) {
            onProgress({ 
                message: `Sync completed. Synced: ${syncResults.synced}, Removed: ${syncResults.removed}`, 
                step: 'sync' 
            })
        }

        return syncResults

    } catch (error) {
        console.error('Error syncing manual datasets:', error)
        
        if (onProgress) {
            onProgress({ message: `Sync error: ${error.message}`, step: 'sync' })
        }

        return {
            success: false,
            error: error.message,
            synced: 0,
            removed: 0
        }
    }
}

/**
 * Get manual datasets that can be used for assessment creation
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<Array>} Available manual datasets
 */
const getAvailableManualDatasets = async (dataEngine) => {
    try {
        const manualMetadata = await loadAllManualMetadata(dataEngine)
        
        // Return only datasets that have been created in DHIS2
        return manualMetadata.datasets.filter(dataset => 
            dataset.createdInDHIS2 && !dataset.removedFromDHIS2
        )
    } catch (error) {
        console.error('Error loading available manual datasets:', error)
        return []
    }
}

/**
 * Create local datasets from manual metadata for offline use
 * @param {Array} manualDatasets - Manual datasets to convert
 * @param {Object} dataEngine - DHIS2 data engine
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} Local datasets
 */
const createLocalDatasetsFromManual = async (manualDatasets, dataEngine, onProgress = null) => {
    const localDatasets = []

    for (let i = 0; i < manualDatasets.length; i++) {
        const dataset = manualDatasets[i]
        
        if (onProgress) {
            onProgress({
                message: `Creating local dataset ${i + 1}/${manualDatasets.length}: ${dataset.name}`,
                step: 'localDatasets'
            })
        }

        try {
            // Create local dataset structure
            const localDataset = {
                id: `local_${dataset.id}`,
                originalId: dataset.dhis2Id,
                name: dataset.name,
                displayName: dataset.displayName,
                code: dataset.code,
                description: dataset.description,
                periodType: dataset.periodType,
                
                // Data structure
                dataSetElements: dataset.dataSetElements,
                organisationUnits: dataset.organisationUnits,
                categoryCombo: dataset.categoryCombo,
                
                // Local properties
                isLocal: true,
                isManuallyCreated: true,
                createdAt: new Date().toISOString(),
                baseDataset: dataset,
                
                // Offline capabilities
                supportsOffline: true,
                lastSyncedAt: null,
                pendingData: []
            }

            localDatasets.push(localDataset)

        } catch (error) {
            console.error(`Error creating local dataset for ${dataset.name}:`, error)
            
            if (onProgress) {
                onProgress({
                    message: `Error creating local dataset: ${error.message}`,
                    step: 'localDatasets'
                })
            }
        }
    }

    // Save local datasets to datastore
    if (localDatasets.length > 0) {
        await saveToDatastore(dataEngine, 'local-datasets', localDatasets, onProgress)
    }

    return localDatasets
}

/**
 * Export manual metadata package for backup or sharing
 * @param {Object} dataEngine - DHIS2 data engine
 * @returns {Promise<Object>} Exportable metadata package
 */
const exportManualMetadataPackage = async (dataEngine) => {
    try {
        const manualMetadata = await loadAllManualMetadata(dataEngine)
        
        return {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            namespace: 'dqa360-manual-metadata',
            metadata: manualMetadata,
            summary: {
                datasets: manualMetadata.datasets.length,
                dataElements: manualMetadata.dataElements.length,
                categoryCombos: manualMetadata.categoryCombos.length,
                categories: manualMetadata.categories.length,
                categoryOptions: manualMetadata.categoryOptions.length,
                attachments: manualMetadata.attachments.length
            }
        }
    } catch (error) {
        console.error('Error exporting manual metadata package:', error)
        throw error
    }
}

export {
    convertManualDatasetsToAssessmentTools,
    createAssessmentToolsFromManualMetadata,
    syncManualDatasetsWithDHIS2,
    getAvailableManualDatasets,
    createLocalDatasetsFromManual,
    exportManualMetadataPackage
}