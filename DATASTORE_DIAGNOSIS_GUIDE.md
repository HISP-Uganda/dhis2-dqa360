# DataStore Structure Diagnosis Guide

## 🔍 **Issue: Empty Assessment List Despite Having Assessments**

You mentioned that your assessment list is empty despite having many assessments in the datastore. This is likely due to a **data structure mismatch** between how assessments are stored and how they're being loaded.

## 🛠️ **Diagnostic Tools Added**

### 1. **DataStore Debugger Component**
- **Location**: Added to ManageAssessments page
- **Purpose**: Check what's actually in your datastore
- **How to use**: Click "Check DataStore" button

### 2. **Migration Function**
- **Purpose**: Convert old format assessments to new format
- **How to use**: Click "Migrate Old Assessments" button

## 📊 **Current DataStore Structure**

Your application now uses **two different datastore namespaces**:

### **New Format: `DQA360_ASSESSMENTS`**
```javascript
// Tab-based structure (v2.0.0)
{
  id: "assessment_123",
  version: "2.0.0",
  info: { name, description, frequency, status },
  dhis2Config: { baseUrl, configured },
  datasets: { selected: [...] },
  dataElements: { selected: [...] },
  orgUnits: { selected: [...] }
}
```

### **Old Format: `DQA360`**
```javascript
// Flat structure (v1.x)
{
  id: "assessment_123",
  name: "Assessment Name",
  selectedDataSets: [...],
  selectedDataElements: [...],
  selectedOrgUnits: [...]
}
```

## 🔍 **How to Diagnose Your Issue**

### **Step 1: Check DataStore Structure**
1. Go to **Manage Assessments** page
2. Find the **"DataStore Structure Check"** section
3. Click **"Check DataStore"** button
4. Review the results:
   - **DQA360_ASSESSMENTS**: New format assessments
   - **DQA360**: Old format assessments

### **Step 2: Analyze the Results**

**If you see assessments in `DQA360` namespace:**
- ✅ Your assessments exist but are in old format
- 🔄 **Solution**: Use "Migrate Old Assessments" button

**If you see assessments in `DQA360_ASSESSMENTS` namespace:**
- ✅ Your assessments are in new format
- 🔍 **Issue**: Loading function might have a bug

**If you see no assessments in either namespace:**
- ❌ Assessments might be in a different location
- 🔍 Check browser console for errors

### **Step 3: Migration (if needed)**
1. Click **"Migrate Old Assessments"** button
2. Wait for migration to complete
3. Check the success message
4. Refresh the page to see migrated assessments

## 🚨 **Common Issues & Solutions**

### **Issue 1: Assessments in Old Format**
**Symptoms**: 
- DataStore check shows assessments in `DQA360` namespace
- Assessment list is empty

**Solution**: 
```bash
1. Click "Migrate Old Assessments"
2. Wait for completion message
3. Refresh assessments list
```

### **Issue 2: Index File Missing**
**Symptoms**: 
- Console shows "assessments-index not found"
- New assessments can't be loaded

**Solution**: 
```bash
1. Create a new assessment (this initializes the index)
2. Or run migration (this also initializes the index)
```

### **Issue 3: Permission Issues**
**Symptoms**: 
- 403 Forbidden errors in console
- Can't access dataStore

**Solution**: 
```bash
1. Check DHIS2 user permissions
2. Ensure dataStore read/write access
```

## 📋 **Expected Console Output**

### **Successful DataStore Check:**
```
🔍 Checking dataStore structure...
📊 DataStore Report: {
  DQA360_ASSESSMENTS: { keys: [...], count: 5 },
  DQA360: { keys: [...], count: 3 }
}
```

### **Successful Migration:**
```
🔄 Checking for old assessments to migrate...
📋 Found 3 keys in old namespace
🔄 Migrating 3 assessments...
✅ Migrated: Assessment 1
✅ Migrated: Assessment 2  
✅ Migrated: Assessment 3
```

### **Successful Assessment Loading:**
```
🚀 Initial assessment loading...
✅ Loaded 5 assessments with tab-based structure
🎉 Initial assessments loaded successfully: 5 assessments
```

## 🎯 **Next Steps**

1. **Run the DataStore check** to see your current structure
2. **Share the results** with me (copy the console output)
3. **Run migration if needed** (if assessments are in old format)
4. **Check if assessments appear** after migration

## 🧹 **Cleanup After Diagnosis**

Once your assessments are loading properly, you can remove the debug tools:

1. Remove `<DataStoreDebugger />` from ManageAssessments.jsx
2. Remove the import: `import { DataStoreDebugger } from '../../components/DataStoreDebugger'`
3. Delete the file: `src/components/DataStoreDebugger.jsx`

**Please run the DataStore check and let me know what you find!** 🔍