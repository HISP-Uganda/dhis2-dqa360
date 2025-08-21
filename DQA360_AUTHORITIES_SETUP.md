# DQA360 User Authorities Setup Guide

This guide explains how to set up the required user authorities for DQA360 in your DHIS2 instance.

## Required Authorities

DQA360 uses two main authorities to control access:

### 1. DQA360_USER (DQA360 User)
- **Authority Code**: `DQA360_USER`
- **Display Name**: DQA360 User
- **Description**: Basic access to DQA360 application for viewing assessments and reports
- **Permissions**:
  - View Dashboard
  - Access DQA Data (view assessments)
  - View DQA Reports
  - Access Notifications
  - View assessment details

### 2. DQA360_ADMIN (DQA360 Administrator)
- **Authority Code**: `DQA360_ADMIN`
- **Display Name**: DQA360 Administrator
- **Description**: Full administrative access to DQA360 including assessment creation and system management
- **Permissions**:
  - All DQA360_USER permissions
  - Create new assessments
  - Edit existing assessments
  - Access Administration section
  - DataStore management
  - Metadata management
  - System configuration
  - User management
  - Reports configuration

## Setting Up Authorities in DHIS2

### Step 1: Create the Authorities

1. **Login to DHIS2** as a system administrator
2. **Navigate to**: Apps → Users → User authorities
3. **Click**: "Add new" button

#### Create DQA360_USER Authority:
- **Name**: DQA360_USER
- **Description**: DQA360 User - Basic access to view assessments and reports
- **Click**: Save

#### Create DQA360_ADMIN Authority:
- **Name**: DQA360_ADMIN
- **Description**: DQA360 Administrator - Full access including assessment creation and administration
- **Click**: Save

### Step 2: Create User Roles

1. **Navigate to**: Apps → Users → User roles
2. **Click**: "Add new" button

#### Create DQA360 User Role:
- **Name**: DQA360 User
- **Description**: Standard DQA360 user role for viewing assessments and reports
- **Authorities**: 
  - Select `DQA360_USER`
  - Add any additional DHIS2 authorities as needed (e.g., basic data viewing)
- **Click**: Save

#### Create DQA360 Administrator Role:
- **Name**: DQA360 Administrator
- **Description**: Administrative role for DQA360 with full access
- **Authorities**: 
  - Select `DQA360_ADMIN`
  - Select `DQA360_USER` (admins inherit user permissions)
  - Add any additional DHIS2 authorities as needed
- **Click**: Save

### Step 3: Assign Roles to Users

1. **Navigate to**: Apps → Users → Users
2. **Select** a user or create a new user
3. **In the user form**:
   - **User roles**: Assign either "DQA360 User" or "DQA360 Administrator" role
   - **Organisation units**: Assign appropriate organisation units
4. **Click**: Save

## Authority Hierarchy

```
DQA360_ADMIN (Administrator)
├── Full access to all DQA360 features
├── Can create and edit assessments
├── Access to Administration section
├── All DQA360_USER permissions
└── System management capabilities

DQA360_USER (Standard User)
├── View Dashboard
├── View DQA Data (assessments)
├── View DQA Reports
├── Access Notifications
└── View assessment details (read-only)
```

## Testing Authority Setup

### For DQA360_USER:
1. Login with a user having DQA360_USER role
2. Verify you can see:
   - Dashboard
   - DQA Data (view only)
   - DQA Reports
   - Notifications
3. Verify you CANNOT see:
   - Administration menu item
   - "Create New Assessment" button

### For DQA360_ADMIN:
1. Login with a user having DQA360_ADMIN role
2. Verify you can see:
   - All DQA360_USER features
   - Administration menu item
   - "Create New Assessment" button
   - Full access to Administration sections

## Troubleshooting

### Issue: User cannot access DQA360 at all
**Solution**: 
- Ensure user has either DQA360_USER or DQA360_ADMIN authority
- Check that the authority names are exactly: `DQA360_USER` and `DQA360_ADMIN`
- Verify user is assigned to appropriate organisation units

### Issue: Admin user cannot see Administration menu
**Solution**:
- Ensure user has DQA360_ADMIN authority (not just DQA360_USER)
- Clear browser cache and refresh
- Check browser console for any JavaScript errors

### Issue: Authority not found error
**Solution**:
- Verify authorities are created with exact names: `DQA360_USER` and `DQA360_ADMIN`
- Check that authorities are assigned to user roles
- Ensure user roles are assigned to users

## Security Best Practices

1. **Principle of Least Privilege**: Only assign DQA360_ADMIN to users who need administrative access
2. **Regular Review**: Periodically review user assignments and remove unnecessary permissions
3. **Organisation Unit Access**: Ensure users only have access to appropriate organisation units
4. **Role Separation**: Consider creating additional specialized roles if needed (e.g., DQA360_REPORTER)

## Additional Configuration

### Custom Roles (Optional)
You can create additional specialized roles:

- **DQA360_REPORTER**: For users who only need to generate reports
- **DQA360_ANALYST**: For users who need advanced analysis features
- **DQA360_VIEWER**: For read-only access to specific assessments

### Integration with Existing Roles
DQA360 authorities can be added to existing DHIS2 user roles:
- Add DQA360_USER to existing "Data Entry" roles
- Add DQA360_ADMIN to existing "System Administrator" roles

## Support

If you encounter issues with authority setup:
1. Check the browser console for error messages
2. Verify DHIS2 logs for authentication errors
3. Ensure all authority names match exactly (case-sensitive)
4. Contact your DHIS2 system administrator for assistance