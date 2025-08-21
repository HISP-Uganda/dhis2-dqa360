# DQA360 Development Guide

## Quick Start Options

### 🚀 Option 1: Offline Mode (Recommended for UI Testing)

Perfect for testing the UI changes we just implemented:

```bash
chmod +x start-offline.js
npm run start:offline
```

**Features:**
- ✅ No DHIS2 connection required
- ✅ Mock authentication (admin user with full permissions)
- ✅ All UI functionality works
- ✅ Local data storage
- ✅ Perfect for testing our recent changes

### 🌐 Option 2: DHIS2 Demo Instance

If you want to connect to a real DHIS2 instance:

```bash
npm run start:demo
```

**Login Credentials:**
- Username: `admin`
- Password: `district`

### 🔧 Option 3: Local DHIS2 Instance

If you have a local DHIS2 running on port 8080:

```bash
npm run start:local
```

## Recent Changes Implemented

### ✅ 1. Assessment List UI Improvements
- **Minimum height**: Card now uses full available screen height
- **Centered content**: Empty state is perfectly centered
- **Better styling**: Improved typography and spacing

### ✅ 2. Edit Assessment Form Fixes
- **Working fields**: All form fields now work like the creation form
- **Proper validation**: Field validation and handlers implemented
- **Configuration arrays**: Added missing data quality dimensions, confidentiality levels, etc.

### ✅ 3. New Service Function
- **`getAssessmentLocalDatasets(assessmentId)`**: Function to retrieve local datasets for an assessment
- **Proper error handling**: Comprehensive error handling and logging

### ✅ 4. Fix ID Functionality
- **Moved to Admin**: Fix ID button moved from Manage Assessments to Datastore Management
- **Better UX**: Proper confirmation modal and warning indicators
- **No more null IDs**: All local datasets now have proper dhis2Id values

### ✅ 5. Datastore Management Enhancements
- **Fix ID tool**: Comprehensive tool to fix null dhis2Id values
- **Better organization**: All datastore tools in one place
- **Admin-only access**: Proper permission controls

## Testing Your Changes

### 1. Start the App
```bash
npm run start:offline
```

### 2. Test Assessment List
- Navigate to "Manage Assessments"
- If no assessments exist, you should see:
  - Centered empty state message
  - Full screen height card
  - Professional styling

### 3. Test Edit Functionality
- Create an assessment first
- Click "Edit" on any assessment
- All form fields should work properly
- Data quality dimensions should load from configuration array

### 4. Test Fix ID Feature
- Go to Administration > Datastore Management
- Look for "Fix Null DHIS2 IDs" action card
- Test the confirmation modal

### 5. Test New Service Function
Open browser console and test:
```javascript
// This function is now available in the service
getAssessmentLocalDatasets('your-assessment-id')
```

## Development Tips

### Offline Mode Benefits
- 🚀 **Fast startup**: No network dependencies
- 🔧 **Reliable**: Works even when DHIS2 demos are down
- 💾 **Local storage**: Data persists in browser localStorage
- 🎯 **UI focused**: Perfect for testing interface changes

### File Structure
```
src/
├── pages/ManageAssessments/
│   ├── ManageAssessments.jsx     # ✅ Updated with centered UI
│   └── EditAssessmentPage.jsx    # ✅ Fixed form fields
├── services/
│   └── tabBasedDataStoreService.js # ✅ Added getAssessmentLocalDatasets()
└── pages/Administration/
    └── DataStoreManagement.jsx   # ✅ Added Fix ID functionality
```

### Key Changes Made
1. **ManageAssessments.jsx**: Added `minHeight: 'calc(100vh - 200px)'` and flexbox centering
2. **EditAssessmentPage.jsx**: Added missing configuration arrays and proper field handlers
3. **tabBasedDataStoreService.js**: Implemented `getAssessmentLocalDatasets()` function
4. **DataStoreManagement.jsx**: Added Fix ID action card with confirmation modal

## Troubleshooting

### If you see "Unauthorized" errors:
1. Try offline mode: `npm run start:offline`
2. Check if DHIS2 demo is available
3. Verify your internet connection

### If changes don't appear:
1. Clear browser cache
2. Restart development server
3. Check browser console for errors

### If build fails:
1. Run `npm install` to update dependencies
2. Check for syntax errors in modified files
3. Run `npm run build` to verify production build

## Next Steps

All requested features are now implemented and ready for testing:

- ✅ Centered assessment list with minimum height
- ✅ Working edit assessment form fields  
- ✅ `getAssessmentLocalDatasets()` function available
- ✅ Fix ID functionality in Datastore Management
- ✅ No more null dhis2Id values

Start with offline mode to test the UI changes, then move to demo mode for full DHIS2 integration testing.