# DQA360 Custom Authorities Implementation

## 🎯 Overview

DQA360 now uses the DHIS2 platform's built-in support for custom authorities through the `d2.config.js` configuration file. This is the recommended and most robust approach for implementing app-specific permissions.

## 🔧 Implementation

### 1. Configuration (d2.config.js)
```javascript
/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    name: 'DQA360',
    title: 'DQA360 - Data Quality Assessment',
    description: 'A comprehensive data quality assessment platform for DHIS2',

    entryPoints: {
        app: './src/App.jsx',
    },

    direction: 'auto',
    
    // Custom authorities automatically created by DHIS2 platform
    customAuthorities: [
        'DQA360_ADMIN',
        'DQA360_USER'
    ],
}
```

### 2. Authority Detection
```javascript
// src/services/authorityService.js
const checkCustomAuthorities = async (engine) => {
    try {
        const query = {
            me: {
                resource: 'me',
                params: {
                    fields: 'authorities'
                }
            }
        }
        
        const { me } = await engine.query(query)
        const authorities = me.authorities || []
        
        const hasCustomAuthorities = authorities.some(auth => 
            auth === 'DQA360_ADMIN' || auth === 'DQA360_USER'
        )
        
        if (hasCustomAuthorities) {
            console.log('✅ DQA360 custom authorities are available')
            return true
        } else {
            console.log('ℹ️ DQA360 custom authorities not found - using user groups')
            return false
        }
    } catch (error) {
        console.log('ℹ️ Could not check custom authorities - using user groups')
        return false
    }
}
```

### 3. Permission Logic
```javascript
// src/hooks/useUserAuthorities.js
const isDQAUser = () => {
    // 1. Superuser has full access
    if (isSuperUser()) {
        return true
    }
    
    // 2. Check custom authorities (preferred method)
    const hasUserAuthority = authorities.includes('DQA360_USER') || 
                            authorities.includes('DQA360_ADMIN') // Admin includes user permissions
    
    // 3. Check user groups as fallback
    const userGroups = userInfo?.userGroups || []
    const hasUserGroup = userGroups.some(group => 
        group.name === 'DQA360 Users' || group.name === 'DQA360 Administrators'
    )
    
    return hasUserAuthority || hasUserGroup
}
```

## 🚀 Benefits

### 1. **Platform Native**
- Uses DHIS2's built-in custom authority support
- Authorities are created automatically when app is installed
- No need for programmatic authority creation

### 2. **Robust Fallback**
- Automatically falls back to user groups if authorities not available
- Works in all DHIS2 versions and configurations
- Seamless user experience regardless of method used

### 3. **Clean Implementation**
- No more API errors trying to create authorities programmatically
- Cleaner console output
- Standard DHIS2 app development practice

### 4. **Better User Management**
- Authorities can be assigned directly in DHIS2 Users app
- More granular permission control
- Follows DHIS2 permission model

## 📋 Authority Definitions

| Authority | Purpose | Description |
|-----------|---------|-------------|
| `DQA360_ADMIN` | Administrative access | Full access to all DQA360 features including administration |
| `DQA360_USER` | Basic user access | Access to core DQA360 features for data quality assessment |

## 🔄 Migration from Old Approach

### Before (Programmatic Creation)
```javascript
// Old approach - tried to create authorities via API
const createAuthority = async (engine, authority) => {
    try {
        const mutation = {
            resource: 'authorities',
            type: 'create',
            data: authority
        }
        await engine.mutate(mutation) // Often failed with 405/409 errors
        return true
    } catch (error) {
        return false // Expected to fail in most instances
    }
}
```

### After (Configuration-Based)
```javascript
// New approach - authorities defined in d2.config.js
customAuthorities: [
    'DQA360_ADMIN',
    'DQA360_USER'
]

// Simple detection instead of creation
const checkCustomAuthorities = async (engine) => {
    const { me } = await engine.query({ me: { resource: 'me', params: { fields: 'authorities' } } })
    return me.authorities.some(auth => auth === 'DQA360_ADMIN' || auth === 'DQA360_USER')
}
```

## 🎯 Usage Instructions

### For App Developers
1. **No code changes needed** - authorities are automatically available
2. **Build and deploy** the app normally
3. **DHIS2 platform** handles authority creation

### Development Mode (Proxy)
When running through proxy (`npm run start:demo`):
- **Custom authorities may not be available** since app isn't actually installed
- **Automatic fallback to user groups** - system works seamlessly
- **No impact on functionality** - same user experience
- **Production deployment** will have custom authorities available

### For System Administrators
1. **Install the DQA360 app** - authorities are created automatically
2. **Assign authorities** to users via DHIS2 Users app:
   - Add `DQA360_USER` for basic access
   - Add `DQA360_ADMIN` for administrative access
3. **Fallback available** - user groups still work if authorities aren't supported

### For End Users
- **No difference** in user experience
- **Same visual indicators** in the app header
- **Same functionality** regardless of permission method used

## 🔍 Troubleshooting

### Custom Authorities Not Available
**Symptoms:**
- Console shows "DQA360 custom authorities not found - using user groups"
- Users need to be added to user groups instead of having authorities assigned

**Causes:**
- DHIS2 version doesn't support custom authorities
- App not properly installed/deployed
- DHIS2 configuration issue

**Solution:**
- **No action needed** - app automatically falls back to user groups
- User groups are created automatically and work the same way

### Authorities Not Working
**Check:**
1. App is properly installed in DHIS2
2. User has been assigned the correct authority (`DQA360_USER` or `DQA360_ADMIN`)
3. User has logged out and back in after authority assignment
4. Browser cache has been cleared

## 📊 Comparison

| Aspect | Old Approach | New Approach |
|--------|-------------|--------------|
| **Authority Creation** | Programmatic (often failed) | Platform-managed (reliable) |
| **Error Handling** | Complex fallback logic | Simple detection + fallback |
| **Console Output** | Cluttered with errors | Clean and informative |
| **Maintenance** | High (error-prone) | Low (platform-handled) |
| **Compatibility** | User groups only | Authorities + user groups |
| **User Experience** | Same | Same (but more robust) |

---

**✅ DQA360 now uses the most robust and recommended approach for DHIS2 app permissions!**