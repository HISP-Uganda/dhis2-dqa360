# 📋 Complete Assessment Template Automation Guide

## 🎯 Overview
This guide covers the complete automation process for creating DHIS2 Assessment Templates, including all dependencies, validation steps, and error handling.

## 📊 DHIS2 Dataset Creation - Complete Dependency Chain

### **🔧 1. System Prerequisites**

#### **Required DHIS2 Permissions:**
- ✅ `F_DATAELEMENT_ADD` - Create data elements
- ✅ `F_DATASET_ADD` - Create datasets  
- ✅ `F_ORGANISATIONUNIT_VIEW` - View organisation units
- ✅ `F_CATEGORY_COMBO_VIEW` - View category combinations
- ✅ `F_METADATA_IMPORT` - Import metadata (if needed)

#### **Required System Components:**
- ✅ DHIS2 instance (v2.35+)
- ✅ Active user session
- ✅ Network connectivity
- ✅ Sufficient storage space

### **🔄 2. Automation Workflow Steps**

#### **Step 1: Prerequisites Validation** ⚡
```javascript
validatePrerequisites() {
    ✅ Dataset selected
    ✅ Data elements selected (≥1)
    ✅ Organisation units selected (≥1)
    ✅ Local metadata loaded
    ✅ Category combo available
    ✅ Data structure validated
}
```

#### **Step 2: Load System Metadata** 📊
```javascript
// Load local DHIS2 metadata
const localOrgUnits = await loadOrganisationUnits({
    fields: 'id,displayName,code,level,path',
    pageSize: 1000
})

const localDataElements = await loadDataElements({
    fields: 'id,displayName,code,valueType,domainType',
    pageSize: 1000
})

const categoryCombos = await loadCategoryCombinations({
    fields: 'id,displayName,name',
    filter: 'name:eq:default'
})
```

#### **Step 3: Process Data Elements** 🔧
```javascript
for (const externalDE of selectedDataElements) {
    // Check if data element exists locally
    const existingDE = findExistingDataElement(externalDE, localDataElements)
    
    if (existingDE && !alreadyProcessed(existingDE)) {
        // Use existing data element
        processedDataElements.push(existingDE)
    } else if (!existingDE) {
        // Create new data element
        const newDE = await createDataElement({
            name: `${externalDE.displayName} (Assessment)`,
            shortName: truncate(externalDE.displayName, 25),
            code: `${externalDE.code}_ASSESSMENT`,
            valueType: externalDE.valueType || 'INTEGER',
            domainType: 'AGGREGATE',
            aggregationType: 'SUM',
            categoryCombo: { id: getDefaultCategoryComboId() }
        })
        processedDataElements.push(newDE)
    }
}

// Remove duplicates
const uniqueDataElements = removeDuplicatesById(processedDataElements)
```

#### **Step 4: Map Organisation Units** 🗺️
```javascript
const mappedOrgUnits = selectedOrgUnits.map(externalOU => {
    // Find matching local organisation unit
    const localOU = localOrgUnits.find(localOU => 
        localOU.displayName === externalOU.displayName ||
        localOU.code === externalOU.code ||
        localOU.displayName.toLowerCase().includes(externalOU.displayName.toLowerCase())
    )
    
    return localOU || localOrgUnits[0] // Fallback to first available
}).filter(Boolean)
```

#### **Step 5: Create Assessment Datasets** 📋
```javascript
const assessmentTools = [
    {
        id: 'primary',
        suffix: '_PRIMARY',
        name: 'Primary Tools (Register)',
        description: 'Data collection from registers'
    },
    {
        id: 'summary', 
        suffix: '_SUMMARY',
        name: 'Summary Tools',
        description: 'Data from facility compiled summary reports'
    },
    {
        id: 'dhis2',
        suffix: '_DHIS2', 
        name: 'DHIS2 Submitted Data',
        description: 'Data from national DHIS2 instance'
    },
    {
        id: 'correction',
        suffix: '_CORRECTION',
        name: 'Correction Form', 
        description: 'Empty form for data submission when discrepancies are found'
    }
]

for (const tool of assessmentTools) {
    const dataset = await createDataset({
        name: `${sourceDataset.displayName}${tool.suffix}`,
        shortName: truncate(`${sourceDataset.displayName}${tool.suffix}`, 50),
        code: `${sourceDataset.id}${tool.suffix}`,
        periodType: sourceDataset.periodType || 'Monthly',
        dataSetElements: uniqueDataElements.map(de => ({
            dataElement: { id: de.id }
        })),
        organisationUnits: mappedOrgUnits.map(ou => ({ id: ou.id })),
        categoryCombo: { id: getDefaultCategoryComboId() },
        description: `${tool.description} - Generated from ${sourceDataset.displayName}`,
        expiryDays: 0,
        openFuturePeriods: 0,
        timelyDays: 15,
        notificationRecipients: [],
        publicAccess: 'r-------',
        externalAccess: false
    })
}
```

## 🔍 Error Handling & Recovery

### **Common Issues & Solutions**

#### **1. Duplicate Data Elements** ⚠️
**Problem:** Same data element added multiple times to dataset
**Solution:** 
```javascript
// Filter unique data elements by ID
const uniqueDataElements = dataElements.filter((de, index, self) => 
    index === self.findIndex(d => d.id === de.id)
)
```

#### **2. Invalid Category Combo** ⚠️
**Problem:** Category combination doesn't exist
**Solution:**
```javascript
const getDefaultCategoryComboId = () => {
    const defaultCombo = categoryCombos?.categoryCombos?.find(cc => 
        cc?.name?.toLowerCase().includes('default')
    )
    return defaultCombo?.id || 'bjDvmb4bfuf' // Common fallback
}
```

#### **3. Missing Permissions** ⚠️
**Problem:** User lacks required authorities
**Solution:**
```javascript
// Check user authorities before proceeding
const hasRequiredPermissions = await checkUserAuthorities([
    'F_DATAELEMENT_ADD',
    'F_DATASET_ADD'
])
if (!hasRequiredPermissions) {
    throw new Error('Insufficient permissions to create datasets')
}
```

#### **4. Organisation Unit Mapping Failures** ⚠️
**Problem:** External org units don't exist locally
**Solution:**
```javascript
// Use fuzzy matching and fallbacks
const findBestMatch = (externalOU, localOrgUnits) => {
    // Exact match
    let match = localOrgUnits.find(ou => ou.displayName === externalOU.displayName)
    if (match) return match
    
    // Code match
    match = localOrgUnits.find(ou => ou.code === externalOU.code)
    if (match) return match
    
    // Fuzzy match
    match = localOrgUnits.find(ou => 
        ou.displayName.toLowerCase().includes(externalOU.displayName.toLowerCase())
    )
    if (match) return match
    
    // Fallback to first available
    return localOrgUnits[0]
}
```

## 📊 Progress Tracking

### **Progress States**
1. **🔄 Initializing** - Loading system metadata
2. **🔧 Processing Data Elements** - Creating/mapping data elements  
3. **🗺️ Processing Organisation Units** - Mapping org units
4. **📋 Creating Primary Dataset** - Creating primary assessment tool
5. **📋 Creating Summary Dataset** - Creating summary assessment tool
6. **📋 Creating DHIS2 Dataset** - Creating DHIS2 data tool
7. **📋 Creating Correction Dataset** - Creating correction form
8. **✅ Completed** - All tools created successfully

### **Error States**
- **❌ Validation Failed** - Prerequisites not met
- **❌ Permission Denied** - Insufficient user permissions  
- **❌ Creation Failed** - API errors during creation
- **⚠️ Partial Success** - Some tools created, others failed

## 🚀 Usage Instructions

### **1. Prerequisites Check**
```bash
# Ensure user has required permissions
# Verify DHIS2 connectivity
# Confirm metadata is loaded
```

### **2. Select Source Data**
```javascript
// Select external dataset
// Choose data elements (≥1)
// Choose organisation units (≥1)
```

### **3. Run Automation**
```javascript
// Click "Create Assessment Tools"
// Monitor progress in console
// Handle any errors that occur
```

### **4. Verify Results**
```javascript
// Check that 4 datasets were created:
// - [Dataset]_PRIMARY
// - [Dataset]_SUMMARY  
// - [Dataset]_DHIS2
// - [Dataset]_CORRECTION
```

## 🔧 Technical Implementation

### **Key Functions**
- `validatePrerequisites()` - Comprehensive validation
- `ensureDataElementsExist()` - Data element processing
- `mapOrganisationUnits()` - Org unit mapping
- `createAssessmentDataSet()` - Dataset creation
- `handleCreateAssessmentTools()` - Main orchestration

### **Error Recovery**
- Automatic retries for network issues
- Fallback values for missing metadata
- Partial success handling
- Detailed error reporting

### **Performance Optimization**
- Batch processing where possible
- Efficient duplicate detection
- Minimal API calls
- Progress feedback

## 📝 Validation Checklist

Before running automation, ensure:

- [ ] ✅ User has dataset creation permissions
- [ ] ✅ Source dataset is selected
- [ ] ✅ At least 1 data element is selected
- [ ] ✅ At least 1 organisation unit is selected
- [ ] ✅ Local DHIS2 metadata is loaded
- [ ] ✅ Default category combination exists
- [ ] ✅ Network connectivity is stable
- [ ] ✅ Sufficient storage space available

## 🎯 Success Criteria

Automation is successful when:

- [ ] ✅ All 4 assessment datasets created
- [ ] ✅ No duplicate data elements in datasets
- [ ] ✅ All organisation units properly mapped
- [ ] ✅ Datasets have correct metadata structure
- [ ] ✅ No API errors during creation
- [ ] ✅ Progress tracking works correctly
- [ ] ✅ Error handling functions properly