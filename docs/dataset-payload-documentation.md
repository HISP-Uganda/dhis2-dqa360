# DHIS2 Dataset Payload Documentation

## Overview

This document describes the standard DHIS2 dataset payload structure used for creating DQA (Data Quality Assessment) datasets. The payload includes both datasets and their associated data elements.

## Payload Structure

### Root Level
```json
{
  "dataSets": [...],      // Array of dataset objects
  "dataElements": [...]   // Array of data element objects
}
```

## Dataset Object Structure

### Required Fields
- **`id`**: 11-character DHIS2 UID (e.g., "A1B2C3D4E5F")
- **`name`**: Full dataset name (max 230 characters)
- **`shortName`**: Short dataset name (max 50 characters)
- **`code`**: 8-character alphanumeric code (e.g., "A1B2C3D4")
- **`periodType`**: Period type (typically "Monthly")
- **`categoryCombo`**: Reference to category combination

### DQA Dataset Types
1. **Register**: For registering and tracking activities
2. **Summary**: For summarizing results and metrics
3. **Reported**: For reported data values and submission tracking
4. **Corrected**: For data corrections and quality improvements

### Dataset Configuration
```json
{
  "id": "A1B2C3D4E5F",
  "name": "Test Assessment - Register",
  "shortName": "Test Assessment - Register",
  "code": "A1B2C3D4",
  "description": "Dataset for registering and tracking data quality assessment activities",
  "periodType": "Monthly",
  "categoryCombo": {
    "id": "bjDvmb4bfuf"  // Default category combo
  },
  "dataSetElements": [
    {
      "dataElement": {
        "id": "REG001ELEM01"
      }
    }
  ],
  "organisationUnits": [
    {
      "id": "ImspTQPwCqd"
    }
  ]
}
```

## Data Element Object Structure

### Required Fields
- **`id`**: 11-character DHIS2 UID
- **`name`**: Full element name with prefix (max 230 characters)
- **`shortName`**: Short element name (max 50 characters)
- **`code`**: 8-character alphanumeric code
- **`valueType`**: Data type (INTEGER, TEXT, PERCENTAGE, etc.)
- **`aggregationType`**: How values are aggregated (SUM, AVERAGE, etc.)
- **`domainType`**: Always "AGGREGATE" for DQA elements
- **`categoryCombo`**: Reference to category combination

### Data Element Prefixes
- **REG**: Register dataset elements
- **SUM**: Summary dataset elements
- **RPT**: Reported dataset elements
- **COR**: Corrected dataset elements

### Data Element Configuration
```json
{
  "id": "REG001ELEM01",
  "name": "REG - New on AZT 10mg/ml + 3TC 10mg/ml + NVP 10mg/ml",
  "shortName": "REG - New on AZT 10mg/ml + 3TC 10mg/ml + NVP 10mg/ml",
  "code": "F5G6H7J8",
  "description": "Register dataset element for tracking new patients on AZT + 3TC + NVP regimen",
  "valueType": "INTEGER",
  "aggregationType": "SUM",
  "domainType": "AGGREGATE",
  "categoryCombo": {
    "id": "bjDvmb4bfuf"
  },
  "zeroIsSignificant": false
}
```

## Code Generation

### Dataset Codes
- **Format**: 8-character alphanumeric (A-Z, 0-9)
- **Example**: "A1B2C3D4", "F6G7H8J9"
- **Generation**: Timestamp-based with random components for uniqueness

### Data Element Codes
- **Format**: 8-character alphanumeric (A-Z, 0-9)
- **Example**: "F5G6H7J8", "M1N2P3Q4"
- **Generation**: Timestamp-based with random components for uniqueness

## Standard Properties

### Dataset Properties
```json
{
  "validCompleteOnly": false,
  "noValueRequiresComment": false,
  "skipOffline": false,
  "renderAsTabs": false,
  "renderHorizontally": false,
  "mobile": false,
  "version": 1,
  "expiryDays": 0,
  "timelyDays": 15,
  "notifyCompletingUser": false,
  "openFuturePeriods": 0,
  "fieldCombinationRequired": false,
  "publicAccess": "rw------",
  "externalAccess": false
}
```

### Data Element Properties
```json
{
  "zeroIsSignificant": false,
  "publicAccess": "rw------",
  "externalAccess": false
}
```

## Sharing Configuration

Both datasets and data elements include sharing configuration:

```json
{
  "sharing": {
    "owner": "admin",
    "external": false,
    "users": {},
    "userGroups": {},
    "public": "rw------"
  }
}
```

## Complete Example

See the following files for complete examples:
- `standard-dataset-payload.json` - Single dataset example
- `complete-dqa-dataset-payload.json` - All four DQA dataset types
- `dataset-payload-template.json` - Template with placeholders

## Usage

This payload structure is used by the DQA Dataset Creation Modal to create datasets in DHIS2. The payload is sent to the DHIS2 API endpoints:

- **Datasets**: `POST /api/dataSets`
- **Data Elements**: `POST /api/dataElements`

## Validation

Before sending the payload, ensure:
1. All UIDs are unique and 11 characters long
2. All codes are unique and 8 characters long
3. Names don't exceed character limits
4. Category combinations exist in the target DHIS2 instance
5. Organization units exist in the target DHIS2 instance