---
description: Repository Information Overview
alwaysApply: true
---

# DQA360 Information

## Summary
DQA360 is a comprehensive Data Quality Assessment platform built for DHIS2-based health data systems. The application supports complete, cyclical data quality reviews by allowing users to capture, compare, and correct facility-level data, integrating seamlessly with national DHIS2 instances.

## Structure
- **src/**: Main application source code containing components, pages, services, and utilities
- **docs/**: Documentation files for various features and fixes
- **i18n/**: Internationalization files
- **.zencoder/**: Zencoder configuration and rules
- **.d2/**: DHIS2 application platform configuration

## Language & Runtime
**Language**: JavaScript (React)
**Version**: React 18.2.0
**Build System**: DHIS2 App Platform (d2-app-scripts)
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- @dhis2/app-runtime: ^3.14.4
- @dhis2/ui: ^9.11.3
- react: ^18.2.0
- react-dom: ^18.2.0
- react-router-dom: ^6.8.1
- react-hook-form: ^7.43.5
- react-query: ^3.39.3
- recharts: ^2.5.0
- styled-components: ^5.3.9
- lodash: ^4.17.21
- jspdf: ^3.0.1
- date-fns: ^2.29.3

**Development Dependencies**:
- @dhis2/cli-app-scripts: ^12.6.4

## Build & Installation
```bash
# Install dependencies
npm install

# Development with DHIS2 demo instance
npm run start:demo

# Build for production
npm run build

# Deploy to DHIS2 instance
npm run deploy
```

## DHIS2 Configuration
**App Type**: DHIS2 Web Application
**Entry Point**: src/App.jsx
**Custom Authorities**:
- DQA360_ADMIN: Full administrative access
- DQA360_USER: Basic application access

**Development Proxy**: https://play.im.dhis2.org/stable-2-41-4-1

## Testing
**Framework**: Jest (via d2-app-scripts)
**Test Location**: src/*.test.jsx files
**Run Command**:
```bash
npm test
```

## Key Components
**Main Pages**:
- Dashboards: Overview of assessments and metrics
- Assessments: Assessment management
- DQA Data: Data entry and management
- DQA Analysis: Data quality analysis
- Administration: System configuration (admin only)

**Core Features**:
- Data capture and integration with DHIS2
- 3-way dataset comparison (Register, Summary, DHIS2)
- Automated feedback and notifications
- Correction and verification workflow
- Comprehensive reporting