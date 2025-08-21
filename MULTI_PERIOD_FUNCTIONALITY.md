# Multi-Period Data Entry Functionality

## Overview

The DQA360 application supports multi-period data entry, allowing assessments with different frequencies to enable data collection for multiple sub-periods based on the original DHIS2 dataset's reporting period type.

## Key Concepts

### 1. Assessment Frequency vs Dataset Period Type

**Assessment Frequency**: How often the assessment is conducted (quarterly, annually, etc.)
**Dataset Period Type**: The original DHIS2 dataset's reporting period type (Monthly, Quarterly, Yearly, etc.)

**Important**: Dataset period types are preserved from the original DHIS2 configuration, NOT derived from assessment frequency.

### 2. Multi-Period Logic

When an **Assessment Frequency** is broader than the **Dataset Period Type**, the system automatically calculates and enables data entry for all relevant sub-periods within the assessment period.

### Examples:

1. **Quarterly Assessment with Monthly Datasets**
   - Assessment Period: `2024Q3`
   - Assessment Frequency: `quarterly`
   - Original DHIS2 Dataset Period Type: `Monthly` (from source datasets)
   - **Result**: Data entry enabled for July 2024, August 2024, September 2024

2. **Annual Assessment with Quarterly Datasets**
   - Assessment Period: `2024`
   - Assessment Frequency: `annually`
   - Original DHIS2 Dataset Period Type: `Quarterly` (from source datasets)
   - **Result**: Data entry enabled for Q1 2024, Q2 2024, Q3 2024, Q4 2024

3. **Annual Assessment with Mixed Period Types**
   - Assessment Period: `2024`
   - Assessment Frequency: `annually`
   - Original DHIS2 Datasets:
     - Monthly datasets → 12 periods (Jan-Dec 2024)
     - Quarterly datasets → 4 periods (Q1-Q4 2024)
     - Yearly datasets → 1 period (2024)
   - **Result**: Different datasets enable different numbers of data entry periods

4. **Quarterly Assessment with Quarterly Datasets**
   - Assessment Period: `2024Q3`
   - Assessment Frequency: `quarterly`
   - Original DHIS2 Dataset Period Type: `Quarterly` (from source datasets)
   - **Result**: Single period data entry (2024Q3) - no sub-periods needed

## Implementation Details

### 1. Period Utilities (`src/utils/periodUtils.js`)

**Key Functions:**
- `calculateSubPeriods(assessmentPeriod, assessmentFrequency, datasetPeriodType)`: Calculates all available periods for data entry
- `needsSubPeriods(assessmentFrequency, datasetPeriodType)`: Determines if sub-periods are needed
- `getPeriodTypeFromFrequency(frequency)`: Maps assessment frequency to DHIS2 period type
- `getPeriodTypeDisplayName(periodType)`: Provides user-friendly period type names

**Supported Period Calculations:**
- Quarterly → Monthly (3 months per quarter)
- Quarterly → Weekly (13 weeks per quarter)
- Annual → Quarterly (4 quarters per year)
- Annual → Monthly (12 months per year)
- Monthly → Weekly (4-5 weeks per month)
- Monthly → Daily (28-31 days per month)

### 2. Assessment Creation

**Enhanced Assessment Wizard:**
- Added frequency selector in assessment creation form
- Real-time period configuration preview
- Visual display of available data entry periods
- Automatic calculation and validation

**Assessment Object Structure:**
```javascript
{
  id: "assessment_id",
  name: "Assessment Name",
  period: "2024Q3",
  frequency: "quarterly", // NEW: Assessment frequency
  status: "active",
  datasets: {
    register: { id: "...", periodType: "Monthly" },
    summary: { id: "...", periodType: "Monthly" },
    reported: { id: "...", periodType: "Monthly" },
    correction: { id: "...", periodType: "Monthly" }
  }
}
```

### 3. Data Quality Modal Enhancements

**Multi-Period Data Entry:**
- Period selector dropdown when multiple periods are available
- Dynamic data loading based on selected period
- Period information display showing:
  - Assessment period vs current data period
  - Period type and available periods count
  - Visual period navigation

**User Interface:**
- Clear indication of current data entry period
- Easy switching between available periods
- Contextual information about period configuration

### 4. Assessment Management

**Enhanced Assessment List:**
- Period configuration details in assessment overview
- Visual indicators for multi-period assessments
- Dataset status with period type information

**Assessment Details Modal:**
- Comprehensive period configuration section
- Visual display of all available data entry periods
- Clear mapping between assessment and dataset periods

## User Experience

### Assessment Creation Flow

1. **Basic Information**
   - Enter assessment name
   - Select assessment period (e.g., "2024Q3")
   - Choose frequency (e.g., "quarterly")

2. **Period Configuration Preview**
   - Automatic calculation of dataset period type
   - Display of available data entry periods
   - Visual confirmation of period setup

3. **Dataset Creation**
   - Datasets created with appropriate period types
   - Period information stored in assessment metadata

### Data Entry Flow

1. **Assessment Selection**
   - View assessments with period configuration details
   - Identify multi-period assessments

2. **Data Quality Check**
   - Select specific period for data entry (if multiple available)
   - Enter data for register, summary, and correction datasets
   - Compare with reported data for selected period

3. **Period Navigation**
   - Easy switching between available periods
   - Consistent data entry interface across periods
   - Period-specific data validation and comparison

## Technical Benefits

1. **Flexible Period Management**: Supports various assessment and reporting frequencies
2. **Automatic Period Calculation**: No manual period configuration required
3. **Consistent Data Structure**: Unified approach across different period types
4. **User-Friendly Interface**: Clear visual indicators and easy navigation
5. **Scalable Architecture**: Easy to extend for additional period types

## Testing

Use the `AssessmentTestData` component to create sample assessments:

1. **Multi-Period Assessment (Q3→Monthly)**
   - Creates quarterly assessment with monthly datasets
   - Demonstrates July, August, September data entry periods

2. **Standard Assessment**
   - Creates assessment with matching frequency and period type
   - Shows single-period data entry

3. **Draft Assessment**
   - Creates assessment without datasets
   - Shows period configuration without data entry capability

## Future Enhancements

1. **Custom Period Ranges**: Allow users to define custom period ranges
2. **Period Templates**: Pre-defined period configurations for common scenarios
3. **Bulk Period Operations**: Operations across multiple periods simultaneously
4. **Period-based Reporting**: Generate reports aggregated across multiple periods
5. **Advanced Period Validation**: Enhanced validation for complex period scenarios

## Configuration Examples

### Quarterly Assessment with Monthly Data Entry
```javascript
{
  period: "2024Q1",
  frequency: "quarterly",
  // Results in periods: ["202401", "202402", "202403"]
}
```

### Annual Assessment with Quarterly Data Entry
```javascript
{
  period: "2024",
  frequency: "annually",
  // Results in periods: ["2024Q1", "2024Q2", "2024Q3", "2024Q4"]
}
```

### Monthly Assessment with Weekly Data Entry
```javascript
{
  period: "202406",
  frequency: "monthly",
  // Results in periods: ["2024W23", "2024W24", "2024W25", "2024W26"]
}
```

This multi-period functionality provides a comprehensive solution for flexible data quality assessments across different reporting frequencies and periods.