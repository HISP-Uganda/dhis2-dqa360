# DQA360 Permission System Guide

## 🎯 Overview

DQA360 implements a comprehensive role-based access control system that automatically creates necessary permissions and provides multiple levels of access control.

## 🔐 Permission Levels

### 1. **SUPERUSER** (Highest Priority)
- **Automatic Detection**: Users with system-level authorities
- **Full Access**: Complete access to all DQA360 features
- **Visual Indicator**: Orange "SUPERUSER" tag in header
- **No Setup Required**: Automatically detected

#### Superuser Detection Criteria:
```javascript
// Any user with these authorities is considered a superuser
const superUserAuthorities = [
    'ALL',                                    // Full system access
    'M_dhis-web-maintenance-appmanager',     // App management
    'M_dhis-web-maintenance',                // System maintenance
    'F_SYSTEM_SETTING',                      // System settings
    'F_USER_ADD',                            // User management
    'F_USER_DELETE'                          // User management
]

// OR username is 'admin' (common default)
```

### 2. **DQA ADMIN** (Administrative Access)
- **Setup Required**: Add user to "DQA360 Administrators" group
- **Full DQA360 Access**: All features including administration
- **Visual Indicator**: Green "DQA ADMIN" tag in header
- **Permissions**: Create assessments, manage system, configure settings

### 3. **DQA USER** (Basic Access)
- **Setup Required**: Add user to "DQA360 Users" group
- **Limited Access**: View data, generate reports, basic navigation
- **Visual Indicator**: Blue "DQA USER" tag in header
- **Permissions**: Read-only access to most features

### 4. **NO ACCESS** (Default)
- **No Setup**: Users not in any DQA360 group
- **No Access**: Cannot use DQA360 features
- **Visual Indicator**: Gray "NO ACCESS" tag in header

## 🚀 Automatic Setup

### Custom Authorities (d2.config.js)
DQA360 defines custom authorities in the DHIS2 app configuration:

```javascript
// d2.config.js
customAuthorities: [
    'DQA360_ADMIN',
    'DQA360_USER'
]
```

These authorities are automatically created by the DHIS2 platform when the app is installed.

### On App Startup
The DQA360 application automatically:

1. **Uses Custom Authorities** (defined in d2.config.js):
   - "DQA360_ADMIN"
   - "DQA360_USER"

2. **Falls back to User Groups** (if authorities not available):
   - "DQA360 Users"
   - "DQA360 Administrators"

3. **No complex initialization** - clean and simple startup

### Permission Detection Process
```javascript
// Simple process on permission check:
1. Check if user is superuser (automatic full access)
2. Check for custom authorities (DQA360_ADMIN, DQA360_USER)
3. Check for user group membership (fallback)
4. Default to no access if none found
```

## 👥 User Management

### For Superusers
- **No action required** - automatically have full access
- **Cannot be restricted** - superuser status overrides all other settings

### For Regular Users

#### Method 1: Using Custom Authorities (Preferred)
If custom authorities are available:
1. Go to DHIS2 Users app
2. Edit the user
3. Add authorities:
   - **"DQA360_USER"** for basic access
   - **"DQA360_ADMIN"** for admin access
4. Save

#### Method 2: Using User Groups (Fallback)
If custom authorities are not available:
1. Go to DHIS2 Users app
2. Edit the user
3. Add to user groups:
   - **"DQA360 Users"** for basic access
   - **"DQA360 Administrators"** for admin access
4. Save

#### Priority Order:
- Custom authorities take precedence over user groups
- Admin level access includes user level permissions

## 🔍 Permission Checking Logic

### Priority Order (Highest to Lowest):
1. **Superuser Check** - Overrides everything
2. **Custom Authorities** - Preferred method (DQA360_USER, DQA360_ADMIN)
3. **User Groups** - Fallback method (DQA360 Users, DQA360 Administrators)
4. **No Access** - Default state

### Code Implementation:
```javascript
const isDQAUser = () => {
    // 1. Superuser has full access
    if (isSuperUser()) return true
    
    // 2. Check custom authorities (preferred)
    if (authorities.includes('DQA360_USER') || 
        authorities.includes('DQA360_ADMIN')) return true
    
    // 3. Check user groups (fallback)
    const userGroups = userInfo?.userGroups || []
    return userGroups.some(group => 
        group.name === 'DQA360 Users' || 
        group.name === 'DQA360 Administrators'
    )
}
```

### Custom Authorities vs User Groups
- **Custom Authorities**: Defined in `d2.config.js`, created by DHIS2 platform
- **User Groups**: Created programmatically, work in all DHIS2 versions
- **Automatic Fallback**: App uses authorities first, then user groups
- **Seamless Experience**: Users don't need to know which method is being used

## 🎨 Visual Indicators

### Header Tags
The application header shows the user's permission level:

- **🟠 SUPERUSER** - Full system access
- **🟢 DQA ADMIN** - Full DQA360 access
- **🔵 DQA USER** - Basic DQA360 access
- **⚪ NO ACCESS** - No DQA360 access

### UI Elements
- **Navigation Menu**: Shows/hides based on permissions
- **Create Assessment Button**: Only visible to admins and superusers
- **Administration Section**: Protected for admin-level access only

## 🛠️ Troubleshooting

### User Can't Access DQA360

**Check in order:**
1. **Is user a superuser?** - Should have automatic access
2. **Is user in a DQA360 group?** - Check DHIS2 Users app
3. **Has user logged out/in?** - Required after group changes
4. **Browser cache cleared?** - May cache old permissions

### Admin Features Not Showing

**Verify:**
1. User is in "DQA360 Administrators" group (not just "DQA360 Users")
2. User has refreshed the page after group assignment
3. Check browser console for JavaScript errors

### Groups Not Created

**If automatic setup failed:**
```bash
# Re-run the setup script
./setup-usergroups.sh

# Or create manually via DHIS2 Users app
```

### Custom Authorities Not Working

**This is normal!** Most DHIS2 instances don't support custom authorities. The system automatically falls back to user groups, which work in all DHIS2 versions.

## 📋 Testing Scenarios

### Test Superuser Access
1. Log in as system admin (usually 'admin' user)
2. Access DQA360
3. Should see "SUPERUSER" tag
4. Should have access to all features

### Test Admin User
1. Create/edit a regular user
2. Add to "DQA360 Administrators" group
3. Log in as that user
4. Should see "DQA ADMIN" tag
5. Should see Administration menu and Create Assessment button

### Test Basic User
1. Create/edit a regular user
2. Add to "DQA360 Users" group only
3. Log in as that user
4. Should see "DQA USER" tag
5. Should NOT see Administration menu or Create Assessment button

### Test No Access
1. Create/edit a regular user
2. Don't add to any DQA360 groups
3. Log in as that user
4. Should see "NO ACCESS" tag
5. Should have limited or no access to DQA360 features

## 🔧 Advanced Configuration

### Custom Superuser Detection
To add custom superuser detection logic, modify the `isSuperUser()` function in `useUserAuthorities.js`:

```javascript
const isSuperUser = () => {
    // Add your custom logic here
    const customSuperUsers = ['your-admin-username']
    
    return superUserAuthorities.some(auth => authorities.includes(auth)) ||
           authorities.includes('ALL') ||
           customSuperUsers.includes(userInfo?.username)
}
```

### Environment-Specific Settings
For different DHIS2 environments, you may need to adjust:
- Superuser authority names
- User group names
- Permission checking logic

## 📞 Support

### Common Issues
1. **"Permission denied" errors** - Check user group membership
2. **"Groups not found" errors** - Re-run setup script
3. **"Features not showing" errors** - Clear browser cache, check console

### Debug Information
The browser console shows detailed permission information:
- User authorities loaded
- Group memberships
- Permission check results
- Setup process status

---

**✅ The DQA360 permission system provides flexible, automatic, and secure access control for all user types!**