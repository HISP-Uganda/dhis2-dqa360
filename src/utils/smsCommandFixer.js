import { smsService } from '../services/smsService'

/**
 * SMS Command COC Fixer Utility
 * 
 * This utility fixes SMS commands that were created with incorrect COCs.
 * It regenerates SMS codes with proper category option combos for data elements
 * that use non-default category combos.
 */

const DEFAULT_CC = 'bjDvmb4bfuf'  // Default category combo ID
const DEFAULT_COC = 'HllvX50cXC0' // Default category option combo ID

/**
 * Generate proper SMS codes for data elements with category combos
 */
const generateProperSmsCodes = async (dataElements, engine) => {
    const smsCodes = []
    
    for (let i = 0; i < dataElements.length && i < 70; i++) {
        const de = dataElements[i]
        const baseCode = String.fromCharCode(97 + (i % 26)) // a, b, c, ...
        
        // Check if this data element has a non-default category combo
        const hasCategoryCombo = de?.categoryCombo?.id && de.categoryCombo.id !== DEFAULT_CC
        
        if (hasCategoryCombo) {
            try {
                // Fetch the full category combo to get category option combos
                const ccResponse = await engine.query({
                    categoryCombo: {
                        resource: 'categoryCombos',
                        id: de.categoryCombo.id,
                        params: {
                            fields: 'id,name,categoryOptionCombos[id,name,code,categoryOptions[id,name,code]]'
                        }
                    }
                })
                
                const fullCC = ccResponse?.categoryCombo
                if (fullCC?.categoryOptionCombos?.length > 0) {
                    // Generate SMS codes for each category option combo
                    fullCC.categoryOptionCombos.forEach((coc, cocIdx) => {
                        smsCodes.push({
                            code: `${baseCode.toUpperCase()}${cocIdx + 1}`, // A1, A2, A3, A4
                            dataElement: de.id,
                            categoryOptionCombo: coc.id
                        })
                    })
                } else {
                    // Fallback to default COC if no category option combos found
                    smsCodes.push({
                        code: baseCode,
                        dataElement: de.id,
                        categoryOptionCombo: DEFAULT_COC
                    })
                }
            } catch (error) {
                console.warn(`Failed to fetch category combo for DE ${de.id}:`, error)
                // If fetching category combo fails, use default COC
                smsCodes.push({
                    code: baseCode,
                    dataElement: de.id,
                    categoryOptionCombo: DEFAULT_COC
                })
            }
        } else {
            // Data element uses default category combo
            smsCodes.push({
                code: baseCode,
                dataElement: de.id,
                categoryOptionCombo: DEFAULT_COC
            })
        }
    }
    
    return smsCodes
}

/**
 * Fix SMS command COCs for a single dataset
 */
export const fixSmsCommandCOCs = async (engine, smsCommandId, dataElements) => {
    try {
        console.log(`🔧 Fixing SMS command COCs for command: ${smsCommandId}`)
        
        // Generate proper SMS codes
        const properSmsCodes = await generateProperSmsCodes(dataElements, engine)
        
        // Convert to the format expected by DHIS2 SMS Command API
        const smsCodes = properSmsCodes.map(sc => ({
            code: sc.code,
            compulsory: false,
            dataElement: { id: sc.dataElement },
            optionId: { id: sc.categoryOptionCombo }
        }))
        
        // Update the SMS command with correct API format
        const result = await engine.mutate({
            resource: `smsCommands/${smsCommandId}`,
            type: 'update',
            data: { 
                smsCodes: smsCodes,
                completenessMethod: 'AT_LEAST_ONE_DATAVALUE'
            }
        })
        
        console.log(`✅ Fixed SMS command COCs for command: ${smsCommandId}`)
        console.log(`📊 Updated ${properSmsCodes.length} SMS codes:`, properSmsCodes.map(sc => 
            `${sc.code} → DE:${sc.dataElement} COC:${sc.categoryOptionCombo}`
        ))
        
        return {
            success: true,
            commandId: smsCommandId,
            updatedCodes: properSmsCodes,
            result
        }
    } catch (error) {
        console.error(`❌ Failed to fix SMS command COCs for command ${smsCommandId}:`, error)
        throw error
    }
}

/**
 * Fix SMS command COCs for multiple datasets
 */
export const fixAllSmsCommandCOCs = async (engine, createdDatasets) => {
    const results = []
    
    for (const dataset of createdDatasets) {
        if (dataset.sms?.id && dataset.dataElements?.length > 0) {
            try {
                const result = await fixSmsCommandCOCs(
                    engine, 
                    dataset.sms.id, 
                    dataset.dataElements
                )
                results.push(result)
            } catch (error) {
                results.push({
                    success: false,
                    commandId: dataset.sms.id,
                    datasetType: dataset.datasetType,
                    error: error.message
                })
            }
        }
    }
    
    return results
}

/**
 * Analyze SMS commands to identify COC issues
 */
export const analyzeSmsCommandCOCs = async (engine, createdDatasets) => {
    const analysis = []
    
    for (const dataset of createdDatasets) {
        if (dataset.sms?.id && dataset.dataElements?.length > 0) {
            try {
                // Fetch current SMS command
                const smsResponse = await engine.query({
                    smsCommand: {
                        resource: 'smsCommands',
                        id: dataset.sms.id,
                        params: {
                            fields: 'id,name,keyword,smsCodes[code,dataElement[id],categoryOptionCombo[id]]'
                        }
                    }
                })
                
                const smsCommand = smsResponse?.smsCommand
                if (smsCommand?.smsCodes) {
                    const issues = []
                    
                    // Check each SMS code
                    for (const smsCode of smsCommand.smsCodes) {
                        const isUsingDefaultCOC = smsCode.categoryOptionCombo?.id === DEFAULT_COC
                        
                        // Find the corresponding data element
                        const de = dataset.dataElements.find(d => d.id === smsCode.dataElement?.id)
                        const hasNonDefaultCC = de?.categoryCombo?.id && de.categoryCombo.id !== DEFAULT_CC
                        
                        if (isUsingDefaultCOC && hasNonDefaultCC) {
                            issues.push({
                                code: smsCode.code,
                                dataElement: smsCode.dataElement?.id,
                                currentCOC: smsCode.categoryOptionCombo?.id,
                                expectedCC: de.categoryCombo.id,
                                issue: 'Using default COC but data element has non-default category combo'
                            })
                        }
                    }
                    
                    analysis.push({
                        datasetType: dataset.datasetType,
                        smsCommandId: dataset.sms.id,
                        keyword: smsCommand.keyword,
                        totalCodes: smsCommand.smsCodes.length,
                        issues: issues,
                        needsFix: issues.length > 0
                    })
                }
            } catch (error) {
                analysis.push({
                    datasetType: dataset.datasetType,
                    smsCommandId: dataset.sms.id,
                    error: error.message,
                    needsFix: false
                })
            }
        }
    }
    
    return analysis
}