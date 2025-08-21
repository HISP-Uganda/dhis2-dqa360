# DHIS2 Dataset Creation - Complete Automation Workflow

## 🎯 Prerequisites Validation

### 1. System Requirements
- [ ] DHIS2 instance accessible
- [ ] User with appropriate permissions:
  - [ ] Create Data Elements
  - [ ] Create Datasets
  - [ ] View Organisation Units
  - [ ] View Category Combinations

### 2. Data Validation
- [ ] External dataset selected
- [ ] Data elements identified
- [ ] Organisation units mapped
- [ ] Category combinations available

## 🔄 Automation Steps

### Step 1: Load System Metadata
```javascript
// Load local DHIS2 metadata
const localOrgUnits = await loadOrganisationUnits()
const localDataElements = await loadDataElements()
const categoryCombos = await loadCategoryCombinations()
```

### Step 2: Process External Data Elements
```javascript
for (const externalDE of selectedDataElements) {
    // Check if data element exists locally
    const existingDE = findExistingDataElement(externalDE, localDataElements)
    
    if (existingDE) {
        // Use existing data element
        processedDataElements.push(existingDE)
    } else {
        // Create new data element
        const newDE = await createDataElement({
            name: `${externalDE.displayName} (Assessment)`,
            shortName: externalDE.displayName.substring(0, 25),
            code: `${externalDE.code}_ASSESSMENT`,
            valueType: externalDE.valueType || 'INTEGER',
            domainType: 'AGGREGATE',
            aggregationType: 'SUM',
            categoryCombo: { id: getDefaultCategoryComboId() }
        })
        processedDataElements.push(newDE)
    }
}
```

### Step 3: Map Organisation Units
```javascript
const mappedOrgUnits = mapOrganisationUnits(selectedOrgUnits, localOrgUnits)
```

### Step 4: Create Assessment Datasets
```javascript
const assessmentTools = [
    { suffix: '_PRIMARY', name: 'Primary Tools (Register)' },
    { suffix: '_SUMMARY', name: 'Summary Tools' },
    { suffix: '_DHIS2', name: 'DHIS2 Submitted Data' },
    { suffix: '_CORRECTION', name: 'Correction Form' }
]

for (const tool of assessmentTools) {
    const dataset = await createDataset({
        name: `${sourceDataset.displayName}${tool.suffix}`,
        code: `${sourceDataset.id}${tool.suffix}`,
        dataSetElements: processedDataElements.map(de => ({
            dataElement: { id: de.id }
        })),
        organisationUnits: mappedOrgUnits.map(ou => ({ id: ou.id })),
        // ... other properties
    })
}
```

## 🔍 Error Handling & Validation

### Common Issues & Solutions

1. **Duplicate Data Elements**
   - Problem: Same data element added multiple times
   - Solution: Filter unique data elements by ID

2. **Invalid Category Combo**
   - Problem: Category combo doesn't exist
   - Solution: Use default category combo as fallback

3. **Missing Permissions**
   - Problem: User can't create metadata
   - Solution: Check user authorities before proceeding

4. **Invalid Organisation Units**
   - Problem: Org units don't exist in local instance
   - Solution: Map to existing org units or use fallback

## 📊 Progress Tracking

### Progress States
1. **Initializing** - Loading system metadata
2. **Processing Data Elements** - Creating/mapping data elements
3. **Processing Organisation Units** - Mapping org units
4. **Creating Datasets** - Creating assessment tools
5. **Completed** - All tools created successfully

### Error States
- **Validation Failed** - Prerequisites not met
- **Permission Denied** - Insufficient user permissions
- **Creation Failed** - API errors during creation
- **Partial Success** - Some tools created, others failed