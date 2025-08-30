import { v4 as uuidv4 } from 'uuid'

/**
 * Utility functions for concept-based data elements mapping
 * 
 * Concept Structure:
 * {
 *   "concepts": [
 *     {
 *       "conceptId": "ANC1_FIRST_VISIT",
 *       "name": "ANC 1st visit (new this pregnancy)",
 *       "unit": "count",
 *       "valueType": "NUMBER",
 *       "bindings": [
 *         { "datasetId": "dsA", "source": [{ "de": "deA_ANC1", "expression": "#{deA_ANC1}" }] },
 *         { "datasetId": "dsB", "source": [{ "de": "deB_ANC", "coc": "first_visit", "expression": "#{deB_ANC.first_visit}" }] }
 *       ]
 *     }
 *   ]
 * }
 */

/**
 * Generate a concept ID from a data element name
 * Removes prefixes, normalizes the name, and creates a unique identifier
 */
export const generateConceptId = (name, existingIds = new Set()) => {
    if (!name) return `CONCEPT_${uuidv4().substring(0, 8).toUpperCase()}`
    
    // Remove common prefixes (dataset prefixes, assessment type prefixes)
    let cleanName = name
        .replace(/^(register|summary|reported|corrected)[\s_-]+/i, '') // Remove assessment type prefixes
        .replace(/^[A-Z]{2,4}[\s_-]+/i, '') // Remove short dataset prefixes (e.g., "ANC ", "MCH_")
        .replace(/^[^_\s]+_+/i, '') // Remove underscore-separated prefixes
        .trim()
    
    // Convert to concept ID format
    let conceptId = cleanName
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '') // Remove special characters except spaces
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_+/g, '_') // Collapse multiple underscores
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    
    // Ensure uniqueness
    let finalId = conceptId
    let counter = 1
    while (existingIds.has(finalId)) {
        finalId = `${conceptId}_${counter}`
        counter++
    }
    
    return finalId || `CONCEPT_${uuidv4().substring(0, 8).toUpperCase()}`
}

/**
 * Extract clean concept name from data element name
 * Removes prefixes and normalizes the display name
 */
export const extractConceptName = (name) => {
    if (!name) return 'Unnamed Concept'
    
    // Remove common prefixes but keep the meaningful part
    return name
        .replace(/^(register|summary|reported|corrected)[\s_-]+/i, '') // Remove assessment type prefixes
        .replace(/^[A-Z]{2,4}[\s_-]+/i, '') // Remove short dataset prefixes
        .replace(/^[^_\s]+_+/i, '') // Remove underscore-separated prefixes
        .trim() || name // Fallback to original if nothing left
}

/**
 * Create DHIS2 expression from data element and category option combo
 */
export const createDHIS2Expression = (dataElementId, categoryOptionComboId = null) => {
    if (categoryOptionComboId && categoryOptionComboId !== 'default') {
        return `#{${dataElementId}.${categoryOptionComboId}}`
    }
    return `#{${dataElementId}}`
}

/**
 * Group data elements by concept (clean name without prefixes)
 * Returns a map where keys are concept names and values are arrays of data elements
 */
export const groupDataElementsByConcept = (dataElements) => {
    const conceptGroups = new Map()
    
    dataElements.forEach(de => {
        const conceptName = extractConceptName(de.name || de.displayName)
        
        if (!conceptGroups.has(conceptName)) {
            conceptGroups.set(conceptName, [])
        }
        
        conceptGroups.get(conceptName).push(de)
    })
    
    return conceptGroups
}

/**
 * Transform current data elements structure to concept-based mapping
 * 
 * @param {Array} selectedDataElements - Array of selected data elements
 * @param {Array} datasets - Array of datasets with their data elements
 * @param {Object} options - Configuration options
 * @returns {Object} Concept-based mapping structure
 */
export const transformToConceptMapping = (selectedDataElements, datasets, options = {}) => {
    const {
        includeTransforms = true,
        generateExpressions = true,
        groupByConcept = true
    } = options
    
    if (!groupByConcept) {
        // Simple 1:1 mapping - each data element becomes a concept
        return createSimpleConceptMapping(selectedDataElements, datasets, { includeTransforms, generateExpressions })
    }
    
    // Group data elements by concept
    const conceptGroups = groupDataElementsByConcept(selectedDataElements)
    const concepts = []
    const existingIds = new Set()
    
    conceptGroups.forEach((elements, conceptName) => {
        const conceptId = generateConceptId(conceptName, existingIds)
        existingIds.add(conceptId)
        
        // Use the first element as the base for concept properties
        const baseElement = elements[0]
        
        const concept = {
            conceptId,
            name: conceptName,
            unit: inferUnit(baseElement.valueType),
            valueType: baseElement.valueType || 'NUMBER',
            bindings: []
        }
        
        // Create bindings for each dataset that contains these elements
        datasets.forEach(dataset => {
            const datasetElements = elements.filter(el => 
                dataset.dataElements?.some(dsEl => dsEl.id === el.id)
            )
            
            if (datasetElements.length === 0) return
            
            const binding = {
                datasetId: dataset.id,
                source: []
            }
            
            // Add source entries for each element in this dataset
            datasetElements.forEach(element => {
                const sourceEntry = {
                    de: element.id
                }
                
                // Add category option combo if not default
                if (element.categoryCombo && 
                    element.categoryCombo.id !== 'bjDvmb4bfuf' && 
                    element.categoryCombo.name?.toLowerCase() !== 'default') {
                    
                    // For elements with category combos, we might need to handle multiple COCs
                    if (element.categoryOptionCombos && element.categoryOptionCombos.length > 0) {
                        // Create separate source entries for each COC
                        element.categoryOptionCombos.forEach(coc => {
                            binding.source.push({
                                de: element.id,
                                coc: coc.id,
                                expression: generateExpressions ? createDHIS2Expression(element.id, coc.id) : undefined
                            })
                        })
                        return // Skip the default source entry below
                    }
                }
                
                // Add expression if requested
                if (generateExpressions) {
                    sourceEntry.expression = createDHIS2Expression(element.id)
                }
                
                binding.source.push(sourceEntry)
            })
            
            // Add transform if multiple elements need to be combined
            if (includeTransforms && datasetElements.length > 1) {
                binding.transform = {
                    type: 'sum' // Default to sum, could be configurable
                }
            }
            
            concept.bindings.push(binding)
        })
        
        concepts.push(concept)
    })
    
    return {
        version: '1.0',
        concepts,
        metadata: {
            generatedAt: new Date().toISOString(),
            totalConcepts: concepts.length,
            totalBindings: concepts.reduce((sum, c) => sum + c.bindings.length, 0)
        }
    }
}

/**
 * Create simple 1:1 concept mapping (each data element = one concept)
 */
export const createSimpleConceptMapping = (selectedDataElements, datasets, options = {}) => {
    const { includeTransforms, generateExpressions } = options
    const concepts = []
    const existingIds = new Set()
    
    selectedDataElements.forEach(element => {
        const conceptId = generateConceptId(element.name || element.displayName, existingIds)
        existingIds.add(conceptId)
        
        const concept = {
            conceptId,
            name: extractConceptName(element.name || element.displayName),
            unit: inferUnit(element.valueType),
            valueType: element.valueType || 'NUMBER',
            bindings: []
        }
        
        // Find which datasets contain this element
        datasets.forEach(dataset => {
            const isInDataset = dataset.dataElements?.some(dsEl => dsEl.id === element.id)
            if (!isInDataset) return
            
            const binding = {
                datasetId: dataset.id,
                source: [{
                    de: element.id,
                    expression: generateExpressions ? createDHIS2Expression(element.id) : undefined
                }]
            }
            
            concept.bindings.push(binding)
        })
        
        concepts.push(concept)
    })
    
    return {
        version: '1.0',
        concepts,
        metadata: {
            generatedAt: new Date().toISOString(),
            totalConcepts: concepts.length,
            totalBindings: concepts.reduce((sum, c) => sum + c.bindings.length, 0)
        }
    }
}

/**
 * Infer unit from value type
 */
export const inferUnit = (valueType) => {
    switch (valueType?.toUpperCase()) {
        case 'NUMBER':
        case 'INTEGER':
        case 'INTEGER_POSITIVE':
        case 'INTEGER_NEGATIVE':
        case 'INTEGER_ZERO_OR_POSITIVE':
            return 'count'
        case 'PERCENTAGE':
            return 'percent'
        case 'BOOLEAN':
        case 'TRUE_ONLY':
            return 'boolean'
        case 'DATE':
        case 'DATETIME':
        case 'TIME':
            return 'date'
        default:
            return 'text'
    }
}

/**
 * Validate concept mapping structure
 */
export const validateConceptMapping = (conceptMapping) => {
    const errors = []
    
    if (!conceptMapping || typeof conceptMapping !== 'object') {
        errors.push('Concept mapping must be an object')
        return errors
    }
    
    if (!Array.isArray(conceptMapping.concepts)) {
        errors.push('Concepts must be an array')
        return errors
    }
    
    const conceptIds = new Set()
    
    conceptMapping.concepts.forEach((concept, index) => {
        const prefix = `Concept ${index + 1}`
        
        if (!concept.conceptId) {
            errors.push(`${prefix}: Missing conceptId`)
        } else if (conceptIds.has(concept.conceptId)) {
            errors.push(`${prefix}: Duplicate conceptId "${concept.conceptId}"`)
        } else {
            conceptIds.add(concept.conceptId)
        }
        
        if (!concept.name) {
            errors.push(`${prefix}: Missing name`)
        }
        
        if (!concept.valueType) {
            errors.push(`${prefix}: Missing valueType`)
        }
        
        if (!Array.isArray(concept.bindings)) {
            errors.push(`${prefix}: Bindings must be an array`)
        } else {
            concept.bindings.forEach((binding, bindingIndex) => {
                const bindingPrefix = `${prefix}, Binding ${bindingIndex + 1}`
                
                if (!binding.datasetId) {
                    errors.push(`${bindingPrefix}: Missing datasetId`)
                }
                
                if (!Array.isArray(binding.source)) {
                    errors.push(`${bindingPrefix}: Source must be an array`)
                } else if (binding.source.length === 0) {
                    errors.push(`${bindingPrefix}: Source cannot be empty`)
                }
            })
        }
    })
    
    return errors
}

/**
 * Convert concept mapping back to legacy element mappings format
 * For backward compatibility
 */
export const convertConceptMappingToLegacy = (conceptMapping) => {
    const elementMappings = []
    
    if (!conceptMapping?.concepts) return elementMappings
    
    conceptMapping.concepts.forEach(concept => {
        concept.bindings.forEach(binding => {
            binding.source.forEach(source => {
                elementMappings.push({
                    conceptId: concept.conceptId,
                    conceptName: concept.name,
                    datasetId: binding.datasetId,
                    dataElementId: source.de,
                    categoryOptionComboId: source.coc || null,
                    expression: source.expression || null,
                    transform: binding.transform || null,
                    valueType: concept.valueType,
                    unit: concept.unit
                })
            })
        })
    })
    
    return elementMappings
}