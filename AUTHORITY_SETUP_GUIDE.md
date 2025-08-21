# DQA360 Authority Setup Guide

This guide will help you set up the required authorities in your DHIS2 instance for the DQA360 application.

## 🎯 Overview

DQA360 uses two custom authorities to control access:

- **`DQA360_USER`** - Basic access to view data and reports
- **`DQA360_ADMIN`** - Full administrative access including system configuration

## 🚀 Quick Setup (Automated)

### Option 1: Using Node.js Script (Recommended)

```bash
# Run with default settings (localhost:8080, admin/district)
node setup-authorities.js

# Run with custom DHIS2 instance
node setup-authorities.js --url=https://your-dhis2.org --username=admin --password=yourpassword
```

### Option 2: Using Shell Script

```bash
# Edit the script first to set your DHIS2 credentials
nano setup-authorities.sh

# Run the script
./setup-authorities.sh
```

## 🔧 Manual Setup (Alternative)

If the automated scripts don't work, you can create authorities manually:

### Step 1: Create Authorities via API

```bash
# Create DQA360_USER authority
curl -X POST \
  -u admin:district \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DQA360_USER",
    "displayName": "DQA360 User",
    "description": "Basic access to DQA360 application - can view data and reports"
  }' \
  http://localhost:8080/api/authorities

# Create DQA360_ADMIN authority
curl -X POST \
  -u admin:district \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DQA360_ADMIN", 
    "displayName": "DQA360 Administrator",
    "description": "Full administrative access to DQA360 application - can manage assessments, configure system, and access all features"
  }' \
  http://localhost:8080/api/authorities
```

### Step 2: Verify Authorities Were Created

```bash
# List all authorities to verify
curl -u admin:district \
  "http://localhost:8080/api/authorities?filter=name:like:DQA360&fields=id,name,displayName"
```

## 👥 Setting Up User Roles

After creating the authorities, you need to assign them to user roles:

### 1. Access DHIS2 Users App

1. Log into your DHIS2 instance
2. Go to **Apps** → **Users**
3. Click on **User Role** tab

### 2. Create DQA360 User Role

1. Click **Add new** to create a new role
2. Fill in the details:
   - **Name**: `DQA360 User`
   - **Description**: `Basic DQA360 access - can view data and reports`
3. In the **Authorities** section, add:
   - `DQA360_USER`
   - Any other basic authorities your users need (e.g., `M_dhis-web-dashboard`)
4. Click **Save**

### 3. Create DQA360 Admin Role

1. Click **Add new** to create another role
2. Fill in the details:
   - **Name**: `DQA360 Administrator`
   - **Description**: `Full DQA360 administrative access`
3. In the **Authorities** section, add:
   - `DQA360_USER` (basic access)
   - `DQA360_ADMIN` (admin access)
   - Any other authorities your admins need
4. Click **Save**

## 👤 Assigning Roles to Users

### 1. Edit Existing Users

1. In the **Users** app, go to the **User** tab
2. Find the user you want to modify
3. Click the **Edit** button (pencil icon)
4. In the **User roles** section, assign the appropriate role:
   - `DQA360 User` for basic users
   - `DQA360 Administrator` for admin users
5. Click **Save**

### 2. Create New Users

1. Click **Add new** in the User tab
2. Fill in user details (username, password, etc.)
3. Assign the appropriate DQA360 role
4. Click **Save**

## 🧪 Testing the Setup

### 1. Test Basic User Access

1. Log in as a user with `DQA360_USER` role
2. Access the DQA360 app
3. Verify you can see:
   - ✅ Dashboard
   - ✅ DQA Data (view only)
   - ✅ DQA Reports
   - ✅ Notifications
4. Verify you CANNOT see:
   - ❌ Administration menu
   - ❌ Create Assessment button

### 2. Test Admin User Access

1. Log in as a user with `DQA360_ADMIN` role
2. Access the DQA360 app
3. Verify you can see:
   - ✅ All basic user features
   - ✅ Administration menu
   - ✅ Create Assessment button
   - ✅ Edit capabilities

## 🔍 Troubleshooting

### Authority Not Found Error

If you see "Authority not found" errors:

1. **Check if authorities exist**:
   ```bash
   curl -u admin:district \
     "http://localhost:8080/api/authorities?filter=name:like:DQA360"
   ```

2. **Re-run the setup script**:
   ```bash
   node setup-authorities.js
   ```

### Permission Denied

If you get permission denied errors:

1. **Check your DHIS2 credentials**
2. **Ensure your user has authority management permissions**
3. **Try with a superuser account**

### App Not Recognizing Authorities

If the app doesn't recognize the authorities:

1. **Clear browser cache**
2. **Restart the DQA360 app**
3. **Check browser console for errors**
4. **Verify user has the correct role assigned**

## 📋 Authority Reference

### DQA360_USER Permissions

- View dashboard and analytics
- Access DQA data (read-only)
- Generate and view reports
- View notifications
- Basic navigation

### DQA360_ADMIN Permissions

- All DQA360_USER permissions PLUS:
- Create and manage assessments
- Access administration panel
- Configure system settings
- Manage metadata
- User management (if combined with other authorities)
- Full CRUD operations

## 🆘 Need Help?

If you encounter issues:

1. **Check the browser console** for JavaScript errors
2. **Check DHIS2 logs** for server-side errors
3. **Verify network connectivity** to DHIS2
4. **Test with a different browser** or incognito mode
5. **Contact your DHIS2 administrator** for assistance

## 📝 Script Configuration

### Node.js Script Options

```bash
# Default configuration
node setup-authorities.js

# Custom configuration
node setup-authorities.js \
  --url=https://your-dhis2.org \
  --username=your-username \
  --password=your-password

# Show help
node setup-authorities.js --help
```

### Shell Script Configuration

Edit the variables at the top of `setup-authorities.sh`:

```bash
DHIS2_URL="http://localhost:8080"
DHIS2_USERNAME="admin"
DHIS2_PASSWORD="district"
```

---

**✅ Once setup is complete, your DQA360 application will have proper role-based access control!**