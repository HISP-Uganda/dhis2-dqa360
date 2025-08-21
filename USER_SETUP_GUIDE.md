# DQA360 User Setup Guide

## ✅ User Groups Created Successfully!

The following user groups have been created in your DHIS2 instance:

- **DQA360 Users** - Basic access to view data and reports
- **DQA360 Administrators** - Full administrative access

## 🚀 Quick Setup Steps

### 1. Access DHIS2 Users App

1. Log into your DHIS2 instance at `http://localhost:8080`
2. Go to **Apps** → **Users**

### 2. Add Users to Groups

#### Option A: Add Existing Users to Groups

1. In the Users app, click on the **User** tab
2. Find the user you want to modify
3. Click the **Edit** button (pencil icon)
4. Scroll down to the **User groups** section
5. Click **Add** and select:
   - **DQA360 Users** for basic users
   - **DQA360 Administrators** for admin users
6. Click **Save**

#### Option B: Create New Users with Groups

1. In the Users app, click **Add new** in the User tab
2. Fill in user details:
   - **Username**: (e.g., `dqa_user1`)
   - **Password**: (set a secure password)
   - **First name** and **Surname**
   - **Email** (optional)
3. In the **User groups** section, add:
   - **DQA360 Users** for basic users
   - **DQA360 Administrators** for admin users
4. Click **Save**

## 🧪 Testing the Setup

### Test Basic User Access

1. **Create a test user** with only **DQA360 Users** group
2. **Log out** of your admin account
3. **Log in** as the test user
4. **Access the DQA360 app**
5. **Verify you can see**:
   - ✅ Dashboard
   - ✅ DQA Data (view only)
   - ✅ DQA Reports
   - ✅ Notifications
6. **Verify you CANNOT see**:
   - ❌ Administration menu
   - ❌ Create Assessment button

### Test Admin User Access

1. **Create a test user** with **DQA360 Administrators** group
2. **Log out** and **log in** as the admin test user
3. **Access the DQA360 app**
4. **Verify you can see**:
   - ✅ All basic user features
   - ✅ Administration menu
   - ✅ Create Assessment button
   - ✅ Edit capabilities

## 📋 User Group Details

### DQA360 Users Group
- **Purpose**: Basic access to DQA360 application
- **Permissions**:
  - View dashboard and analytics
  - Access DQA data (read-only)
  - Generate and view reports
  - View notifications
  - Basic navigation

### DQA360 Administrators Group
- **Purpose**: Full administrative access to DQA360
- **Permissions**:
  - All DQA360 Users permissions PLUS:
  - Create and manage assessments
  - Access administration panel
  - Configure system settings
  - Manage metadata
  - Full CRUD operations

## 🔧 Advanced Configuration

### Adding Multiple Groups

Users can be in both groups if needed:
1. Add user to **DQA360 Users** for basic access
2. Add user to **DQA360 Administrators** for admin access
3. The system will automatically grant admin permissions

### Bulk User Management

For multiple users:
1. Use DHIS2's **Import/Export** app
2. Export current users to CSV
3. Add user group assignments
4. Import the modified CSV

## 🔍 Troubleshooting

### User Can't Access DQA360

**Check:**
1. User is in at least one DQA360 group
2. User has logged out and back in
3. Browser cache is cleared
4. No JavaScript errors in browser console

### Admin Features Not Showing

**Check:**
1. User is in **DQA360 Administrators** group
2. User has refreshed the page
3. Check browser console for errors

### Groups Not Found

If groups are missing:
```bash
# Re-run the setup script
./setup-usergroups.sh
```

## 📝 Manual Group Creation (If Needed)

If the script didn't work, create groups manually:

### Via DHIS2 Web Interface

1. Go to **Apps** → **Users**
2. Click on **User group** tab
3. Click **Add new**
4. Create group with:
   - **Name**: `DQA360 Users`
   - **Description**: `Basic DQA360 users - can view data and reports`
5. Repeat for `DQA360 Administrators`

### Via API (Alternative)

```bash
# Create DQA360 Users group
curl -X POST \
  -u admin:district \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DQA360 Users",
    "description": "Basic DQA360 users - can view data and reports"
  }' \
  http://localhost:8080/api/userGroups

# Create DQA360 Administrators group
curl -X POST \
  -u admin:district \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DQA360 Administrators",
    "description": "DQA360 administrators - full access to all features"
  }' \
  http://localhost:8080/api/userGroups
```

## 🎯 Example User Setup

### Basic User Example

```
Username: dqa_viewer
Password: ViewOnly123!
Groups: DQA360 Users
Access: Read-only access to DQA360
```

### Admin User Example

```
Username: dqa_admin
Password: AdminAccess123!
Groups: DQA360 Administrators
Access: Full administrative access to DQA360
```

## 🚀 Ready to Test!

Once you've added users to the appropriate groups:

1. **Access DQA360** at `http://localhost:3001`
2. **Test with different user accounts**
3. **Verify role-based access control** is working
4. **Report any issues** for further assistance

## 📞 Support

If you encounter issues:

1. **Check browser console** for JavaScript errors
2. **Check DHIS2 logs** for server-side errors
3. **Verify user group membership** in DHIS2 Users app
4. **Test with a different browser** or incognito mode

---

**✅ Your DQA360 application now has proper user group-based access control!**