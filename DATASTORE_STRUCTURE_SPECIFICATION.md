# DQA360 DataStore Structure Specification

## 📋 **Overview**

This document defines the standard structure for storing DQA360 assessments in DHIS2 dataStore. The structure is designed to be:
- **Scalable**: Handle hundreds of assessments efficiently
- **Maintainable**: Clear separation of concerns and data types
- **Backward Compatible**: Support migration from older formats
- **Performance Optimized**: Fast loading and querying

## 🏗️ **DataStore Architecture**

### **Primary Namespace: `DQA360_ASSESSMENTS`**

All DQA360 assessment data is stored under this single namespace to:
- Avoid namespace conflicts
- Simplify permission management
- Enable efficient bulk operations
- Maintain clear data ownership

## 📊 **Data Structure**

### **1. Assessment Index (`assessments-index`)**

**Purpose**: Master index of all assessments for fast listing and metadata queries.

**Key**: `assessments-index`

**Structure**:
```json
{
  "version": "2.0.0",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "totalAssessments": 15,
  "assessments": [
    "assessment_1705312200000_001",
    "assessment_1705312200000_002",
    "assessment_1705312200000_003"
  ],
  "metadata": {
    "createdBy": "system",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "description": "Master index of all DQA360 assessments"
  }
}
```

### **2. Individual Assessments (`assessment_{timestamp}_{counter}`)**

**Purpose**: Store complete assessment data with tab-based structure.

**Key Format**: `assessment_{timestamp}_{counter}`
- `timestamp`: Unix timestamp when created
- `counter`: Sequential number for uniqueness

**Example Key**: `assessment_1705312200000_001`

**Structure**:
```json
{
  "id": "assessment_1705312200000_001",
  "version": "2.0.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "lastUpdated": "2024-01-15T14:45:00.000Z",
  
  "info": {
    "name": "Monthly Health Facility Assessment - January 2024",
    "description": "Comprehensive data quality assessment for health facilities",
    "frequency": "monthly",
    "period": "202401",
    "status": "active",
    "createdBy": "john.doe",
    "lastModifiedBy": "jane.smith",
    "tags": ["health", "monthly", "facilities"],
    "notes": "Focus on completeness and consistency indicators"
  },
  
  "dhis2Config": {
    "baseUrl": "https://dhis2.example.com",
    "username": "dqa_user",
    "configured": true,
    "lastTested": "2024-01-15T09:00:00.000Z",
    "connectionStatus": "success",
    "version": "2.40.1",
    "apiVersion": "40"
  },
  
  "datasets": {
    "selected": [
      {
        "id": "dataset_001",
        "name": "Monthly Health Facility Report",
        "periodType": "Monthly",
        "categoryCombo": "default"
      }
    ],
    "metadata": {
      "totalSelected": 1,
      "lastUpdated": "2024-01-15T10:30:00.000Z",
      "source": "dhis2_api"
    }
  },
  
  "dataElements": {
    "selected": [
      {
        "id": "de_001",
        "name": "Total Outpatient Visits",
        "valueType": "INTEGER",
        "categoryCombo": "default"
      }
    ],
    "metadata": {
      "totalSelected": 1,
      "lastUpdated": "2024-01-15T10:30:00.000Z",
      "source": "dhis2_api"
    },
    "mappings": {
      "de_001": {
        "localName": "Outpatient Visits",
        "validationRules": ["positive_integer", "range_0_10000"]
      }
    }
  },
  
  "orgUnits": {
    "selected": [
      {
        "id": "ou_001",
        "name": "District Hospital A",
        "level": 4,
        "path": "/country/region/district/hospital_a"
      }
    ],
    "metadata": {
      "totalSelected": 1,
      "hierarchyLevels": [4],
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    "hierarchy": {
      "maxLevel": 5,
      "selectedLevels": [4],
      "filterCriteria": "level_4_facilities"
    }
  },
  
  "orgUnitMapping": {
    "mappings": [
      {
        "externalId": "EXT_001",
        "externalName": "External Hospital A",
        "dhis2Id": "ou_001",
        "dhis2Name": "District Hospital A",
        "confidence": 0.95,
        "mappingType": "automatic"
      }
    ],
    "localOrgUnits": [
      {
        "id": "EXT_001",
        "name": "External Hospital A",
        "code": "EHA001"
      }
    ],
    "mappingRules": {
      "autoMapping": true,
      "confidenceThreshold": 0.8,
      "allowManualOverride": true
    },
    "statistics": {
      "totalMappings": 1,
      "automaticMappings": 1,
      "manualMappings": 0,
      "unmappedCount": 0
    }
  },
  
  "localDatasets": {
    "info": {
      "totalDatasets": 4,
      "datasetTypes": ["register", "summary", "reported", "correction"],
      "creationStatus": "completed",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "lastModified": "2024-01-15T11:30:00.000Z"
    },
    "createdDatasets": [
      {
        "id": "local_ds_001",
        "name": "DQA360 Register Dataset - Assessment 001",
        "type": "register",
        "dhis2Id": "created_ds_001",
        "sharing": {
          "public": "rw------"
        },
        "publicAccess": "r-------",
        "dataElements": ["de_001", "de_002"]
      }
    ]
  },
  
  "statistics": {
    "dataQuality": {
      "completeness": 85.5,
      "consistency": 92.3,
      "accuracy": 78.9,
      "timeliness": 95.2
    },
    "lastCalculated": "2024-01-15T14:00:00.000Z",
    "calculationDuration": 1250
  }
}
```

## 🔧 **Implementation Standards**

### **Key Generation Rules**

1. **Assessment Keys**: `assessment_{timestamp}_{counter}`
   - `timestamp`: Unix timestamp (milliseconds)
   - `counter`: 3-digit zero-padded sequential number
   - Example: `assessment_1705312200000_001`

2. **Index Key**: Always `assessments-index`

### **Version Management**

- **Current Version**: `2.0.0`
- **Version Format**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Backward Compatibility**: Support for v1.x during migration period

### **Data Validation Rules**

1. **Required Fields**:
   - `id`, `version`, `createdAt`, `lastUpdated`
   - `info.name` (minimum 3 characters)
   - `info.status` (enum: draft, active, completed, archived)

2. **Field Constraints**:
   - `info.name`: 3-255 characters
   - `info.frequency`: enum (daily, weekly, monthly, quarterly, yearly)
   - `dhis2Config.baseUrl`: Valid URL format
   - All timestamps: ISO 8601 format

3. **Data Integrity**:
   - Assessment ID must match the dataStore key
   - Index must be updated when assessments are created/deleted
   - All referenced IDs must be valid DHIS2 identifiers

## 🚀 **Performance Considerations**

### **Indexing Strategy**

1. **Master Index**: Fast assessment listing without loading full data
2. **Lazy Loading**: Load assessment details only when needed
3. **Caching**: Cache frequently accessed assessments
4. **Pagination**: Support for large assessment lists

### **Query Patterns**

1. **List All Assessments**: Query index only
2. **Load Assessment**: Direct key access
3. **Search Assessments**: Filter index, then load matches
4. **Bulk Operations**: Batch API calls

### **Size Limits**

- **Single Assessment**: Max 1MB (recommended < 500KB)
- **Index File**: Max 100KB (supports ~1000 assessments)
- **Total Namespace**: No DHIS2 limit, but monitor performance

## 🔄 **Migration Strategy**

### **From Legacy Formats**

1. **Old Namespace (`DQA360`)**:
   ```javascript
   // Old format
   {
     name: "Assessment",
     selectedDataSets: [...],
     selectedDataElements: [...]
   }
   
   // Convert to new format
   {
     info: { name: "Assessment" },
     datasets: { selected: [...] },
     dataElements: { selected: [...] }
   }
   ```

2. **Metadata Service Format (`dqa360-metadata`)**:
   ```javascript
   // Old: Array in 'assessments' key
   [
     { name: "Assessment 1", ... },
     { name: "Assessment 2", ... }
   ]
   
   // Convert to: Individual assessment keys
   assessment_1705312200000_001: { info: { name: "Assessment 1" }, ... }
   assessment_1705312200000_002: { info: { name: "Assessment 2" }, ... }
   ```

### **Migration Process**

1. **Detection**: Scan for old format data
2. **Conversion**: Transform to new structure
3. **Validation**: Ensure data integrity
4. **Index Update**: Add to master index
5. **Cleanup**: Archive old format (optional)

## 🛡️ **Security & Permissions**

### **DataStore Permissions**

- **Namespace**: `DQA360_ASSESSMENTS`
- **Required Permissions**: 
  - `F_DATASTORE_PUBLIC_ADD`
  - `F_DATASTORE_PUBLIC_DELETE`
- **Access Level**: Public read, authenticated write

### **Data Privacy**

- **No Personal Data**: Assessments contain only metadata and configuration
- **Audit Trail**: Track creation and modification timestamps
- **User Attribution**: Store creator and modifier information

## 📝 **API Usage Examples**

### **Create Assessment**
```javascript
// 1. Generate unique key
const key = `assessment_${Date.now()}_001`

// 2. Save assessment
await engine.mutate({
  resource: `dataStore/DQA360_ASSESSMENTS/${key}`,
  type: 'create',
  data: assessmentData
})

// 3. Update index
await updateAssessmentIndex(key)
```

### **Load All Assessments**
```javascript
// 1. Load index
const index = await engine.query({
  data: { resource: 'dataStore/DQA360_ASSESSMENTS/assessments-index' }
})

// 2. Load individual assessments
const assessments = await Promise.all(
  index.data.assessments.map(key => 
    engine.query({
      data: { resource: `dataStore/DQA360_ASSESSMENTS/${key}` }
    })
  )
)
```

### **Search Assessments**
```javascript
// 1. Load index
const index = await loadIndex()

// 2. Filter by criteria (client-side)
const filtered = index.assessments.filter(key => 
  key.includes('2024') // Example: filter by year
)

// 3. Load matching assessments
const results = await loadAssessments(filtered)
```

## ✅ **Validation Checklist**

Before implementing, ensure:

- [ ] Namespace `DQA360_ASSESSMENTS` is available
- [ ] User has dataStore permissions
- [ ] Assessment key generation is unique
- [ ] Index is updated atomically
- [ ] Data validation is enforced
- [ ] Migration path is tested
- [ ] Performance benchmarks are met
- [ ] Error handling is comprehensive

## 🔮 **Future Enhancements**

1. **Versioning**: Support for assessment versioning
2. **Templates**: Reusable assessment templates
3. **Sharing**: Assessment sharing between users
4. **Backup**: Automated backup and restore
5. **Analytics**: Built-in assessment analytics
6. **Notifications**: Assessment status notifications

---

**This specification provides a robust, scalable foundation for DQA360 assessment storage that can grow with your needs while maintaining performance and data integrity.**