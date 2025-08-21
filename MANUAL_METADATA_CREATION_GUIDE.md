# Manual Metadata Creation System

## Overview

The Manual Metadata Creation System provides a comprehensive solution for creating, managing, and integrating DHIS2 metadata manually. This system supports creating all types of DHIS2 metadata with clean attachments and full datastore integration.

## Features

### ✅ **Complete Metadata Support**
- **Datasets**: Full dataset creation with all properties
- **Data Elements**: Complete data element management
- **Category Combos**: Category combination creation and management
- **Categories**: Category creation with option management
- **Category Options**: Individual category option creation
- **Clean Attachments**: File attachment management for all metadata types

### ✅ **Datastore Integration**
- **Persistent Storage**: All metadata saved to DHIS2 datastore
- **Managed Lifecycle**: Track creation, updates, and deletion
- **Sync Capabilities**: Sync with DHIS2 instance status
- **Export/Import**: Full metadata package export/import

### ✅ **Assessment Tool Integration**
- **Automatic Conversion**: Convert manual datasets to assessment tools
- **Local Dataset Creation**: Create local datasets for offline use
- **Tool Variants**: Generate 4 assessment tool variants per dataset
- **Progress Tracking**: Comprehensive progress reporting

## System Architecture

### Core Components

#### 1. Manual Metadata Creator (`manualMetadataCreator.js`)
```javascript
// Core utility functions
- generateUID()                    // Generate DHIS2-compatible UIDs
- validateMetadata()               // Validate metadata structure
- cleanMetadata()                  // Clean and prepare metadata
- createCategoryOption()           // Create category options
- createCategory()                 // Create categories
- createCategoryCombo()            // Create category combos
- createDataElement()              // Create data elements
- createDataset()                  // Create datasets
- processAttachments()             // Handle file attachments
- createMetadataPackage()          // Create complete packages
```

#### 2. Manual Metadata Creator Component (`ManualMetadataCreator.jsx`)
```javascript
// React component for UI management
- Tabbed interface for different metadata types
- Modal forms for creating/editing metadata
- File upload for attachments
- Progress tracking during creation
- Integration with DHIS2 data engine
```

#### 3. Manual Metadata Integration (`manualMetadataIntegration.js`)
```javascript
// Integration with assessment tools
- convertManualDatasetsToAssessmentTools()
- createAssessmentToolsFromManualMetadata()
- syncManualDatasetsWithDHIS2()
- createLocalDatasetsFromManual()
- exportManualMetadataPackage()
```

### Datastore Structure

#### Namespace: `dqa360-manual-metadata`

```javascript
const DATASTORE_KEYS = {
    DATASETS: 'manual-datasets',
    DATA_ELEMENTS: 'manual-data-elements',
    CATEGORY_COMBOS: 'manual-category-combos',
    CATEGORIES: 'manual-categories',
    CATEGORY_OPTIONS: 'manual-category-options',
    ATTACHMENTS: 'manual-attachments',
    METADATA_REGISTRY: 'metadata-registry'
}
```

#### Data Structure Examples

**Dataset Structure:**
```javascript
{
    id: "abc123def456",
    dhis2Id: "xyz789uvw012",
    name: "Malaria Case Management",
    code: "MALARIA_CM_2024",
    shortName: "Malaria CM",
    description: "Dataset for malaria case management data",
    periodType: "Monthly",
    dataSetElements: [
        {
            dataElement: { id: "dataElementId" },
            categoryCombo: { id: "categoryComboId" }
        }
    ],
    organisationUnits: [
        { id: "orgUnitId1" },
        { id: "orgUnitId2" }
    ],
    categoryCombo: { id: "defaultComboId" },
    createdInDHIS2: true,
    createdAt: "2024-01-15T10:30:00Z",
    lastUpdated: "2024-01-15T10:30:00Z",
    isManuallyCreated: true
}
```

**Attachment Structure:**
```javascript
{
    id: "attachment123",
    fileName: "dataset_documentation.pdf",
    fileSize: 1048576,
    mimeType: "application/pdf",
    metadataId: "abc123def456",
    metadataType: "dataset",
    uploadDate: "2024-01-15T10:30:00Z",
    description: "Documentation for dataset",
    data: "base64EncodedFileData..."
}
```

## Usage Guide

### 1. Creating Category Options

```javascript
import { createCategoryOption } from '../utils/manualMetadataCreator'

const categoryOption = {
    name: 'Under 5 years',
    code: 'AGE_UNDER_5',
    displayName: 'Under 5 years',
    description: 'Age group for children under 5 years'
}

const result = await createCategoryOption(categoryOption, dataEngine, onProgress)
```

### 2. Creating Categories

```javascript
import { createCategory } from '../utils/manualMetadataCreator'

const category = {
    name: 'Age Groups',
    code: 'AGE_GROUPS',
    displayName: 'Age Groups',
    description: 'Age group disaggregation',
    dataDimensionType: 'DISAGGREGATION',
    categoryOptions: [
        { id: 'option1Id' },
        { id: 'option2Id' }
    ]
}

const result = await createCategory(category, dataEngine, onProgress)
```

### 3. Creating Category Combos

```javascript
import { createCategoryCombo } from '../utils/manualMetadataCreator'

const categoryCombo = {
    name: 'Age and Gender',
    code: 'AGE_GENDER_COMBO',
    displayName: 'Age and Gender',
    description: 'Age and gender disaggregation',
    dataDimensionType: 'DISAGGREGATION',
    categories: [
        { id: 'ageCategoryId' },
        { id: 'genderCategoryId' }
    ]
}

const result = await createCategoryCombo(categoryCombo, dataEngine, onProgress)
```

### 4. Creating Data Elements

```javascript
import { createDataElement } from '../utils/manualMetadataCreator'

const dataElement = {
    name: 'Malaria cases treated',
    code: 'MALARIA_CASES_TREATED',
    shortName: 'Malaria treated',
    description: 'Number of malaria cases treated',
    valueType: 'INTEGER',
    domainType: 'AGGREGATE',
    aggregationType: 'SUM',
    categoryCombo: { id: 'categoryComboId' }
}

const result = await createDataElement(dataElement, dataEngine, onProgress)
```

### 5. Creating Datasets

```javascript
import { createDataset } from '../utils/manualMetadataCreator'

const dataset = {
    name: 'Malaria Monthly Report',
    code: 'MALARIA_MONTHLY',
    shortName: 'Malaria Monthly',
    description: 'Monthly malaria reporting dataset',
    periodType: 'Monthly',
    dataSetElements: [
        {
            dataElement: { id: 'dataElementId1' },
            categoryCombo: { id: 'categoryComboId' }
        }
    ],
    organisationUnits: [
        { id: 'orgUnitId1' },
        { id: 'orgUnitId2' }
    ],
    categoryCombo: { id: 'defaultComboId' }
}

const result = await createDataset(dataset, dataEngine, onProgress)
```

### 6. Processing Attachments

```javascript
import { processAttachments } from '../utils/manualMetadataCreator'

const files = [file1, file2] // File objects from input
const metadataId = 'datasetId123'
const metadataType = 'dataset'

const attachments = await processAttachments(
    files, 
    metadataId, 
    metadataType, 
    dataEngine, 
    onProgress
)
```

### 7. Creating Complete Metadata Package

```javascript
import { createMetadataPackage } from '../utils/manualMetadataCreator'

const metadataPackage = {
    categoryOptions: [/* category options */],
    categories: [/* categories */],
    categoryCombos: [/* category combos */],
    dataElements: [/* data elements */],
    datasets: [/* datasets */],
    attachments: [/* attachment groups */]
}

const results = await createMetadataPackage(metadataPackage, dataEngine, onProgress)
```

## Integration with Assessment Tools

### 1. Convert Manual Datasets to Assessment Tools

```javascript
import { createAssessmentToolsFromManualMetadata } from '../utils/manualMetadataIntegration'

const config = {
    dataEngine,
    selectedDatasets: ['dataset1Id', 'dataset2Id'],
    orgUnits: [{ id: 'orgUnit1' }],
    onProgress: (progress) => console.log(progress.message)
}

const results = await createAssessmentToolsFromManualMetadata(config)
```

### 2. Create Local Datasets

```javascript
import { createLocalDatasetsFromManual } from '../utils/manualMetadataIntegration'

const manualDatasets = [/* manual datasets */]
const localDatasets = await createLocalDatasetsFromManual(
    manualDatasets, 
    dataEngine, 
    onProgress
)
```

### 3. Sync with DHIS2

```javascript
import { syncManualDatasetsWithDHIS2 } from '../utils/manualMetadataIntegration'

const syncResults = await syncManualDatasetsWithDHIS2(dataEngine, onProgress)
console.log(`Synced: ${syncResults.synced}, Removed: ${syncResults.removed}`)
```

## Component Usage

### Basic Component Usage

```jsx
import ManualMetadataCreator from '../components/ManualMetadataCreator/ManualMetadataCreator'

const MyComponent = () => {
    const handleMetadataCreated = (results) => {
        console.log('Metadata created:', results)
        // Handle successful creation
    }

    const handleClose = () => {
        // Handle component close
    }

    return (
        <ManualMetadataCreator
            onMetadataCreated={handleMetadataCreated}
            onClose={handleClose}
        />
    )
}
```

### Progress Tracking

```javascript
const onProgress = (progressInfo) => {
    console.log(`Step: ${progressInfo.step}`)
    console.log(`Message: ${progressInfo.message}`)
    console.log(`Percentage: ${progressInfo.percentage}%`)
}
```

## Validation and Error Handling

### Metadata Validation

```javascript
import { validateMetadata } from '../utils/manualMetadataCreator'

const validation = validateMetadata(metadata, 'dataset')
if (!validation.isValid) {
    console.error('Validation errors:', validation.errors)
    console.warn('Validation warnings:', validation.warnings)
}
```

### Error Handling Patterns

```javascript
try {
    const result = await createDataset(dataset, dataEngine, onProgress)
    console.log('Dataset created:', result)
} catch (error) {
    console.error('Creation failed:', error.message)
    // Handle error appropriately
}
```

## Best Practices

### 1. **Metadata Naming Conventions**
- Use descriptive, consistent names
- Include timestamps for uniqueness
- Follow organizational naming standards

### 2. **Code Generation**
- Use `generateUniqueCode()` for unique codes
- Include meaningful prefixes
- Avoid special characters

### 3. **Category Structure**
- Create category options first
- Then create categories
- Finally create category combos
- Validate relationships

### 4. **File Attachments**
- Keep file sizes reasonable (< 10MB)
- Use descriptive file names
- Include documentation for complex metadata

### 5. **Progress Tracking**
- Always provide progress callbacks
- Give meaningful progress messages
- Handle progress updates in UI

### 6. **Error Recovery**
- Implement retry logic for network errors
- Provide clear error messages to users
- Log detailed errors for debugging

## Troubleshooting

### Common Issues

#### 1. **Validation Errors**
```javascript
// Check required fields
if (!metadata.name || !metadata.code) {
    throw new Error('Name and code are required')
}
```

#### 2. **DHIS2 Creation Failures**
```javascript
// Check DHIS2 response
if (result.status !== 'OK') {
    throw new Error(`DHIS2 error: ${result.message}`)
}
```

#### 3. **Datastore Save Failures**
```javascript
// Handle datastore conflicts
try {
    await dataEngine.mutate({ resource: 'dataStore/...', type: 'create', data })
} catch (error) {
    if (error.httpStatusCode === 409) {
        // Key exists, update instead
        await dataEngine.mutate({ resource: 'dataStore/...', type: 'update', data })
    }
}
```

#### 4. **Attachment Processing Errors**
```javascript
// Validate file types and sizes
if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large (max 10MB)')
}
```

## Performance Considerations

### 1. **Batch Operations**
- Create metadata in dependency order
- Use Promise.all for independent operations
- Implement progress tracking for long operations

### 2. **Memory Management**
- Process large files in chunks
- Clean up temporary data
- Use streaming for large attachments

### 3. **Network Optimization**
- Implement retry logic with exponential backoff
- Compress large payloads
- Use appropriate timeout values

## Security Considerations

### 1. **File Upload Security**
- Validate file types and sizes
- Scan for malicious content
- Store files securely in datastore

### 2. **Metadata Validation**
- Sanitize user inputs
- Validate against DHIS2 schemas
- Prevent injection attacks

### 3. **Access Control**
- Respect DHIS2 user permissions
- Validate user access to metadata creation
- Log all metadata operations

This comprehensive system provides a complete solution for manual metadata creation with full DHIS2 integration, attachment support, and assessment tool compatibility.