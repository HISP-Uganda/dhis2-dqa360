# Critical Dataset Creation Fixes

## Problem Summary
The dataset creation is failing with "Invalid query - Unknown query or mutation type undefined" errors due to incorrect DHIS2 API call structure.

## Root Cause
The DHIS2 dataEngine.mutate() calls are using the wrong structure:
- **WRONG**: `{ variables: { dataElements: [...] } }`
- **CORRECT**: `{ data: { dataElements: [...] } }`

## Critical Fixes Required

### Fix 1: Data Elements Creation API Call
**File**: `/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx`
**Line**: ~464-469

**REPLACE THIS:**
```javascript
const createResponse = await dataEngine.mutate({
    createElements: metadataQueries.createDataElements
}, { variables: { dataElements: processedElements } })
```

**WITH THIS:**
```javascript
const createResponse = await dataEngine.mutate({
    createElements: {
        ...metadataQueries.createDataElements,
        data: { dataElements: processedElements }
    }
})
```

### Fix 2: Dataset Creation API Call
**File**: `/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx`
**Line**: ~608-612

**REPLACE THIS:**
```javascript
const response = await dataEngine.mutate({
    createDataset: metadataQueries.createDatasets
}, { variables: { dataSets: [payload] } })
```

**WITH THIS:**
```javascript
const response = await dataEngine.mutate({
    createDataset: {
        ...metadataQueries.createDatasets,
        data: { dataSets: [payload] }
    }
})
```

### Fix 3: Variable Scope Issue in Dataset Payload Creation
**File**: `/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx`
**Line**: ~558-590

**REPLACE THIS:**
```javascript
const dataset = datasets[datasetType]
const datasetElements = dataElements[datasetType] || []

// ... payload creation ...

report.metadata.datasetPayload = payload
report.steps.payload = {
    status: 'completed',
    elements: datasetElements.length,
    orgUnits: orgUnits.length
}

updateProgress(datasetIndex, 6, 'completed', `Payload ready (${datasetElements.length} elements, ${orgUnits.length} org units)`)
addLog(`✓ Dataset payload created`, 'success', datasetType)
```

**WITH THIS:**
```javascript
const dataset = datasets[datasetType]
// Use the processed data elements from the validation step
const processedDataElements = report.metadata.dataElements || []

const payload = {
    id: dataset.id || generateUID(),
    name: dataset.name || `${assessmentName} - ${datasetType.toUpperCase()} Dataset`,
    shortName: dataset.shortName || `${assessmentName} ${datasetType.toUpperCase()}`,
    code: dataset.code || `${assessmentName.replace(/\s+/g, '_').toUpperCase()}_${datasetType.toUpperCase()}_DS`,
    description: dataset.description || `Dataset for ${assessmentName} - ${datasetType} data collection`,
    formName: dataset.formName || dataset.name || `${assessmentName} - ${datasetType.toUpperCase()}`,
    periodType: dataset.periodType || 'Monthly',
    expiryDays: dataset.expiryDays || 0,
    openFuturePeriods: dataset.openFuturePeriods || 0,
    timelyDays: dataset.timelyDays || 15,
    compulsoryDataElementOperands: dataset.compulsoryDataElementOperands || false,
    skipOffline: dataset.skipOffline || false,
    dataElementDecoration: dataset.dataElementDecoration || false,
    renderAsTabs: dataset.renderAsTabs || false,
    categoryCombo: { id: 'bjDvmb4bfuf' },
    dataSetElements: processedDataElements
        .filter(de => de && de.id) // Only include elements with valid IDs
        .map(de => ({
            dataElement: { id: de.id }
        })),
    organisationUnits: orgUnits.filter(ou => ou && ou.id).map(ou => ({ 
        id: ou.id // Preserve original org unit IDs from the local instance
    }))
}

addLog(`📋 Dataset payload: ${payload.name}`, 'info', datasetType)
addLog(`📋 Data elements: ${payload.dataSetElements.length}`, 'info', datasetType)
addLog(`📋 Organization units: ${payload.organisationUnits.length}`, 'info', datasetType)

report.metadata.datasetPayload = payload
report.steps.payload = {
    status: 'completed',
    elements: payload.dataSetElements.length,
    orgUnits: payload.organisationUnits.length,
    payload: payload
}

updateProgress(datasetIndex, 6, 'completed', `Payload ready (${payload.dataSetElements.length} elements, ${payload.organisationUnits.length} org units)`)
addLog(`✅ Dataset payload created successfully`, 'success', datasetType)
```

## Expected Results After Fixes
1. ✅ No more "Invalid query - Unknown query or mutation type undefined" errors
2. ✅ Data elements will be created successfully
3. ✅ Datasets will be created successfully
4. ✅ Process will complete without critical failures

## Manual Application Instructions
If the file keeps reverting due to file synchronization:
1. Stop any development servers or file watchers
2. Apply the fixes manually using a text editor
3. Save the file
4. Run `npm run build` to rebuild the application
5. Test the dataset creation functionality

## File Synchronization Issue
Your development environment appears to have automatic file synchronization or hot reloading that keeps reverting changes. Consider:
1. Temporarily disabling file watchers
2. Making changes directly in your IDE
3. Committing changes to version control immediately after making them