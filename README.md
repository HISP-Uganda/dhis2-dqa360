# DQA360 - Data Quality Assessment Platform

**Total Insight. Total Impact.**

DQA360 is a comprehensive Data Quality Assessment platform built for DHIS2-based health data systems. The application supports complete, cyclical data quality reviews by allowing users to capture, compare, and correct facility-level data, integrating seamlessly with national DHIS2 instances.

## Features

### Core Functionality
- **Data Capture & Integration**: Register and Summary data entry forms with DHIS2 API integration
- **Data Quality Engine**: 3-way dataset comparison (Register, Summary, DHIS2) with configurable discrepancy detection
- **Feedback & Notification**: Automated feedback via SMS, WhatsApp, and Telegram
- **Correction & Verification Workflow**: Complete correction submission and supervisor verification system
- **Comprehensive Reporting**: Interactive and exportable DQA reports (PDF/Excel)

### Key Components
- **Dashboard**: Overview of assessments, facilities, and data quality metrics
- **Assessment Management**: Create and manage DQA assessments
- **Data Entry**: Dual-form data capture (Register and Summary)
- **Discrepancy Detection**: Automated identification and management of data quality issues
- **Correction Workflow**: Facility correction submission and verification
- **Notification System**: Multi-channel automated notifications
- **Administration**: User management and system configuration

## Permission System

DQA360 implements automatic role-based access control with multiple permission levels:

### Permission Levels (Priority Order)

| Level | Access | Visual Indicator | Setup Required |
|-------|--------|------------------|----------------|
| **SUPERUSER** | Full system access | 🟠 SUPERUSER | None - Auto-detected |
| **DQA ADMIN** | Full DQA360 access | 🟢 DQA ADMIN | Add to "DQA360 Administrators" group |
| **DQA USER** | Basic DQA360 access | 🔵 DQA USER | Add to "DQA360 Users" group |
| **NO ACCESS** | No DQA360 access | ⚪ NO ACCESS | Default state |

### Automatic Setup
- **Custom authorities** defined in `d2.config.js` and created by DHIS2 platform
- **User groups** as fallback method (manual creation if needed)
- **Superusers** (system admins) get full access automatically
- **Clean startup** - no complex initialization process
- **Visual indicators** show user permission level in header

### User Management
**Method 1: Custom Authorities (Preferred)**
1. Go to DHIS2 Users app
2. Edit user and add authorities:
   - "DQA360_USER" for basic access
   - "DQA360_ADMIN" for admin access

**Method 2: User Groups (Fallback)**
1. Go to DHIS2 Users app
2. Edit user and add to groups:
   - "DQA360 Users" for basic access
   - "DQA360 Administrators" for admin access

**Note:** Superusers need no setup - automatically detected

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full system access: configuration, user management, dataset mapping, API, reports |
| **DQA Team Lead** | Create/manage assessments, oversee corrections, validate updates |
| **Data Collector** | Capture register & summary data, receive feedback |
| **Facility User** | Review discrepancies, submit corrections, receive notifications |
| **Viewer/Auditor** | Read-only access to reports and audit trails |

## Technology Stack

- **Frontend**: React 18 with DHIS2 UI Components
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Styling**: Styled Components + DHIS2 UI
- **State Management**: React Query
- **DHIS2 Integration**: DHIS2 App Runtime

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Access to a DHIS2 instance (for development/testing)

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd dqa360
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server with DHIS2 demo instance:
```bash
# Quick start with demo instance
./start-dev.sh

# Or manually with proxy
d2-app-scripts start --proxy https://play.im.dhis2.org/stable-2-41-4-1
```

**Demo Instance Credentials:**
- URL: https://play.im.dhis2.org/stable-2-41-4-1
- Username: `admin`
- Password: `district`

The application will be available at `http://localhost:3000` and automatically:
- Create DQA360 user groups
- Set up role-based permissions
- Detect superuser status
- Initialize the permission system

### Alternative Development Options

```bash
# With DHIS2 demo instance (recommended for development)
npm run start:demo

# For local DHIS2 instance
npm run start:local

# For development without proxy (requires manual DHIS2 setup)
npm start
```

### Building for Production

```bash
npm run build
# or
yarn build
```

### Deployment

```bash
npm run deploy
# or
yarn deploy
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout/         # Layout components (Header, Navigation, Layout)
│   └── Router/         # Application routing
├── pages/              # Main application pages
│   ├── Dashboard/      # Dashboard and overview components
│   ├── Assessments/    # Assessment management
│   ├── DataEntry/      # Data entry forms
│   ├── Discrepancies/  # Discrepancy management
│   ├── Corrections/    # Correction workflow
│   ├── Reports/        # Report generation
│   ├── Notifications/  # Notification management
│   └── Administration/ # System administration
├── services/           # API services and utilities
├── constants/          # Application constants
└── locales/           # Internationalization files
```

## Key Workflows

### 1. DQA Assessment Cycle
1. **Assessment Setup**: Admin defines datasets, data elements, and periods
2. **Data Capture**: Register/Summary forms filled by data collectors
3. **DHIS2 Data Fetch**: System pulls matching dataset from DHIS2 via API
4. **DQ Engine Run**: Compares Register, Summary, and DHIS2 values
5. **Feedback/Notification**: Facilities receive alerts or praise via chosen channel
6. **Correction Entry**: Facility submits corrections through the app
7. **Verification**: Supervisor reviews corrections; validated updates pushed to DHIS2
8. **Reporting**: DQA reports generated with actions documented

### 2. Data Quality Comparison
- **3-way comparison**: Register vs Summary vs DHIS2 data
- **Configurable thresholds**: Define acceptable variance levels
- **Automated flagging**: Highlight discrepancies based on severity
- **Visual indicators**: Color-coded alerts for different issue types

## Available Scripts

### `npm start` or `yarn start`
Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test` or `yarn test`
Launches the test runner and runs all available tests found in `/src`.

### `npm run build` or `yarn build`
Builds the app for production to the `build` folder. A deployable `.zip` file can be found in `build/bundle`!

### `npm run deploy` or `yarn deploy`
Deploys the built app to a running DHIS2 instance. You must run build before deploying.

## Configuration

The application can be configured through:
- **d2.config.js**: DHIS2 app configuration
- **Environment variables**: API endpoints and feature flags
- **Admin panel**: User roles, notification settings, DQ rules

## API Integration

DQA360 integrates with DHIS2 through:
- **Data retrieval**: Fetch organization units, datasets, and data values
- **Data submission**: Push corrections back to DHIS2
- **User management**: Leverage DHIS2 user authentication
- **Metadata sync**: Synchronize datasets and data elements

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the BSD-3-Clause License.

## Learn More

- [DHIS2 Application Platform Documentation](https://platform.dhis2.nu/)
- [DHIS2 Application Runtime Documentation](https://runtime.dhis2.nu/)
- [React Documentation](https://reactjs.org/)

---

**DQA360** - Empowering teams to turn data quality insights into real, measurable impact.
