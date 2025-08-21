# DQA360 Demo Testing Guide

## 🎯 Overview

This guide explains how to test all DQA360 functionality using custom authorities in demo/proxy mode, including the new page header system and enhanced layout.

## ✨ New Features Added

### 1. **Page Header System**
- **PageHeader Component**: Clean, consistent page headers below the top navigation
- **PageContext**: Context provider for managing page information
- **usePageHeader Hook**: Easy way to set page titles and descriptions
- **Breadcrumb Support**: Navigation breadcrumbs for complex workflows

### 2. **Enhanced Layout Structure**
- **DHIS2 Header** (native DHIS2 shell)
- **Top Navigation** (app name, slogan, menu items)
- **Page Header** (title, description, breadcrumbs)
- **Main Content** (page content)

### 3. **Demo Authority System**
- **Custom Authority Override**: Simulates DQA360_USER and DQA360_ADMIN authorities
- **Demo Controls Panel**: Live switching between user roles during development
- **Superuser Support**: Full access including ALL authority
- **Real-time Role Switching**: Change permissions without server restart

### 4. **Administration Layout Fix**
- **Integrated Layout**: Administration now follows the same layout pattern
- **No More Overlay**: Removed full-screen overlay, now works within app layout
- **Consistent Navigation**: Same header and navigation structure

## 🔧 Demo Authority Configuration

### Available Roles

#### **User Role** (`DQA360_USER`)
- Basic access to DQA360 application
- Can view data and reports
- Cannot access administration features

#### **Admin Role** (`DQA360_ADMIN`)
- Full administrative access
- Can manage assessments
- Can access administration section
- Can configure system settings

#### **Superuser Role** (`ALL`)
- Complete system access
- All DQA360 authorities plus system authorities
- Full administrative privileges

### How It Works

The demo system overrides user data from the DHIS2 API by:

1. **Intercepting User Data**: `useUserAuthorities` hook applies demo overrides
2. **Adding Custom Authorities**: Injects `DQA360_USER`, `DQA360_ADMIN`, or `ALL`
3. **Creating User Groups**: Adds appropriate user groups for fallback permissions
4. **Role-based Access**: Permission system automatically grants access based on authorities

## 🚀 Testing Instructions

### Method 1: Using Demo Controls (Recommended)

1. **Start Demo Mode**:
   ```bash
   npm run start:demo
   ```

2. **Access Demo Controls**:
   - Look for the "🔧 Demo" button in the top-right corner
   - Click to expand the demo controls panel

3. **Switch User Roles**:
   - Toggle Demo Mode on/off
   - Select different user roles (User/Admin/Superuser)
   - Page will reload to apply changes

4. **Test Functionality**:
   - **User Role**: Should see basic features, no Administration menu
   - **Admin Role**: Should see Administration menu and all features
   - **Superuser Role**: Should have complete access to everything

### Method 2: Manual Configuration

Edit `/src/utils/demoUserOverride.js`:

```javascript
export const DEMO_CONFIG = {
    enabled: true,        // Enable/disable demo mode
    role: 'admin',        // Change to 'user', 'admin', or 'superuser'
    // ... rest of config
}
```

### Method 3: Using Built App

1. **Install the built app** (`build/bundle/DQA360-1.0.0.zip`) in your DHIS2 instance
2. **Demo controls work in development mode only**
3. **For production testing**, modify the demo config before building

## 📋 Testing Checklist

### ✅ Layout & Navigation
- [ ] DHIS2 header appears at top
- [ ] Top navigation shows app name and menu items
- [ ] Page headers appear below navigation with titles/descriptions
- [ ] Administration follows same layout (no overlay)
- [ ] Demo controls appear in development mode

### ✅ Permission Testing
- [ ] **User Role**: Can access Dashboard, DQA Data, DQA Reports, Notifications
- [ ] **User Role**: Cannot access Administration menu
- [ ] **Admin Role**: Can access all sections including Administration
- [ ] **Superuser Role**: Has complete access to everything
- [ ] Permission checks work correctly throughout the app

### ✅ Administration Section
- [ ] Administration menu appears for admin/superuser roles
- [ ] Administration page uses standard layout (not overlay)
- [ ] All admin features accessible (DataStore, Metadata, System, Users, Reports)
- [ ] Navigation between admin sections works correctly

### ✅ Page Headers
- [ ] Dashboard shows "Dashboard" title with description
- [ ] Administration shows "Administration" title with description
- [ ] Other pages can set custom headers using `usePageHeader`
- [ ] Breadcrumbs work when configured

## 🔄 Switching Between Modes

### Development Mode
- Demo controls visible
- Can switch roles in real-time
- Authorities are simulated

### Production Mode
- Demo controls hidden
- Uses real DHIS2 authorities
- Requires proper authority setup

## 📦 Installation Files

### Ready for Installation
- **File**: `build/bundle/DQA360-1.0.0.zip`
- **Size**: ~3.2MB
- **Installation**: Upload to DHIS2 App Management

### Features Included
- ✅ Page header system
- ✅ Enhanced layout structure
- ✅ Demo authority system (development only)
- ✅ Fixed administration layout
- ✅ Superuser support
- ✅ All existing DQA360 functionality

## 🛠️ For Real DHIS2 Deployment

When deploying to a real DHIS2 instance:

1. **Create Custom Authorities**:
   ```bash
   node setup-authorities.js --url=https://your-dhis2.org --username=admin --password=yourpass
   ```

2. **Create User Roles**:
   - Create "DQA360 User" role with `DQA360_USER` authority
   - Create "DQA360 Admin" role with `DQA360_ADMIN` authority

3. **Assign to Users**:
   - Assign appropriate roles to users
   - Superusers automatically get access via `ALL` authority

## 🎉 Summary

You now have a complete DQA360 application with:
- **Professional Layout**: Consistent with DHIS2 design patterns
- **Page Headers**: Clear navigation and context
- **Demo Testing**: Easy authority testing without server setup
- **Production Ready**: Built and packaged for installation
- **Full Functionality**: All features accessible based on user permissions

The demo authority system makes it easy to test all functionality without needing to set up complex DHIS2 user management, while the enhanced layout provides a professional, consistent user experience.