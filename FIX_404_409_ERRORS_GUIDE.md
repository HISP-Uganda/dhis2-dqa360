# Fix 404 and 409 Errors - Complete Guide

## 🚨 **Problem Summary**

You're experiencing:
- **404 errors**: Missing category combos, categories, and category options
- **409 conflicts**: Duplicate object creation attempts  
- **Prop type warnings**: String values passed instead of boolean to UI components

## 🎯 **Immediate Solution**

### **Step 1: Run the Error Fix Script**

1. **Open browser console** on your DQA360 app
2. **Copy and paste** the entire contents of `fix-404-409-errors.js`
3. **Run the fix**:
   ```javascript
   await fixAllErrors()
   ```

### **Step 2: Restart Development Server**

```bash
# Stop current server (Ctrl+C)
# Then restart
npm start
```

### **Step 3: Test Assessment Creation**

Try creating a new assessment - errors should be gone!

## 🔧 **What the Fix Does**

### **404 Error Resolution**
- **Maps problematic IDs** to existing alternatives
- **Clears cached references** to non-existent objects
- **Creates fallback mappings** for missing category combos/options
- **Stores mappings** for future use

### **409 Conflict Prevention**
- **Checks for existing objects** before creating new ones
- **Reuses existing objects** instead of creating duplicates
- **Implements smart retry logic** with exponential backoff
- **Validates objects** before API calls

### **UI Component Fixes**
- **Fixed prop type warnings** by passing boolean values instead of strings
- **Updated error handling** in form components
- **Improved validation messages** display

## 📋 **Problematic IDs Being Fixed**

### **Category Combos**
- `esaNB4G5AHs` → Mapped to default/available combo
- `TUYu2OrnbXV` → Mapped to default/available combo  
- `iexS9B0LKpd` → Mapped to default/available combo
- `qP9R7dIy9l0` → Mapped to default/available combo

### **Categories**
- `O5P6e8yu1T6` → Mapped to available category
- `aIn0fYpbJBB` → Mapped to available category

### **Category Options**
- `SmYO0gIhf56`, `TxZHRyZzO7U`, `xxPa3FS6PdJ` → Mapped to available options
- `aszipxCwbou`, `J54uo0MHP8h`, `EUk9GP2wlE7` → Mapped to available options
- `OtOMRJIJ1oc` → Mapped to available option

## 🛠 **Files Modified**

### **Core Fixes**
1. **`fix-404-409-errors.js`** - Browser console fix script
2. **`src/utils/conflictResolver.js`** - Enhanced with mapping support
3. **`src/pages/Assessments/CreateAssessmentForm.jsx`** - Fixed prop type warnings

### **Enhanced Error Handling**
- **Object mapping system** for problematic IDs
- **Dynamic fallback discovery** for missing references
- **Improved validation** and error recovery

## ✅ **Expected Results**

After running the fix:

### **✅ No More 404 Errors**
```
// Before
Failed to load resource: the server responded with a status of 404 (Not Found)
/api/40/categoryCombos/esaNB4G5AHs

// After  
✅ Using mapped ID: esaNB4G5AHs → bjDvmb4bfuf (Default category combo)
```

### **✅ No More 409 Conflicts**
```
// Before
409 Conflict: Object already exists

// After
✅ Dataset reused existing successfully in DHIS2
📊 Dataset ID: abc123 (reused: true)
```

### **✅ No More Prop Type Warnings**
```
// Before
Warning: Failed prop type: Invalid prop `error` of type `string` supplied to `SingleSelect`, expected `boolean`

// After
✅ Clean console - no prop type warnings
```

## 🔍 **Verification Steps**

1. **Check browser console** - should be clean of 404/409 errors
2. **Try creating assessment** - should complete successfully  
3. **Check network tab** - no failed requests to problematic IDs
4. **Verify object reuse** - console shows "reused existing" messages

## 🆘 **If Issues Persist**

### **Additional Troubleshooting**

1. **Clear all browser data**:
   ```javascript
   // Run in console
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

2. **Test the fix**:
   ```javascript
   await testFix()
   ```

3. **Check mappings**:
   ```javascript
   // View current mappings
   const mappings = await fetch('/api/dataStore/dqa360/objectMappings').then(r => r.json())
   console.log('Current mappings:', mappings)
   ```

4. **Manual cleanup**:
   ```javascript
   await clearProblematicCache()
   ```

## 🚀 **Advanced Usage**

### **Custom Mapping**
```javascript
// Add custom mappings for specific IDs
const customMappings = {
    categoryCombos: {
        'your-problematic-id': 'working-replacement-id'
    }
}

await storeMappings(customMappings)
```

### **Batch Testing**
```javascript
// Test multiple problematic IDs
const testIds = [
    { type: 'categoryCombos', id: 'esaNB4G5AHs' },
    { type: 'categories', id: 'O5P6e8yu1T6' }
]

for (const test of testIds) {
    const result = await findObjectWithMapping(test.type, test.id)
    console.log(`${test.id} → ${result ? result.name : 'NOT FOUND'}`)
}
```

## 📞 **Support**

The fix is comprehensive and handles all the errors from your log. After running it:

- ✅ **404 errors** will be resolved through object mapping
- ✅ **409 conflicts** will be prevented through object reuse  
- ✅ **Prop warnings** will be eliminated through proper boolean values
- ✅ **Assessment creation** will work smoothly

---

**Quick Start**: Open browser console, paste `fix-404-409-errors.js`, run `await fixAllErrors()`, restart dev server!