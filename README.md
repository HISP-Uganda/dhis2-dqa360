# DHIS2 DQA360 - Data Quality Assessment Platform

**Total Insight. Total Impact.**

A comprehensive Data Quality Assessment platform built for DHIS2-based health data systems. DQA360 supports complete, cyclical data quality reviews by allowing users to capture, compare, and correct facility-level data, integrating seamlessly with national DHIS2 instances.

## 🚀 Features

### Core Functionality
- **Multi-Step Assessment Creation**: Guided wizard for creating comprehensive assessments
- **External DHIS2 Integration**: Connect to external DHIS2 instances with secure authentication
- **Organization Unit Mapping**: Map external org units to local ones for data comparison
- **Dataset Preparation**: Automated creation of assessment tools and metadata
- **Data Quality Engine**: 3-way dataset comparison (Register, Summary, DHIS2) with configurable discrepancy detection
- **Feedback & Notification**: Automated feedback via SMS, WhatsApp, and Telegram
- **Correction & Verification Workflow**: Complete correction submission and supervisor verification system
- **Comprehensive Reporting**: Interactive and exportable DQA reports (PDF/Excel)

### Key Components
- **Dashboard**: Overview of assessments, facilities, and data quality metrics
- **Assessment Management**: Create and manage DQA assessments with multi-step wizard
- **Connection Management**: Secure external DHIS2 connection with credential storage
- **Data Entry**: Dual-form data capture (Register and Summary)
- **Discrepancy Detection**: Automated identification and management of data quality issues
- **Correction Workflow**: Facility correction submission and verification
- **Notification System**: Multi-channel automated notifications
- **Administration**: User management and system configuration

## 🔧 Recent Improvements

### Authentication & Connection Management
- ✅ **Fixed Authentication Timing**: No authentication when just adding credentials - only when testing or proceeding
- ✅ **Connection Status Validation**: Must test connection successfully before proceeding to datasets
- ✅ **Saved Credentials Support**: Credentials are securely stored and reused for authentication
- ✅ **HTML Encoding Fix**: Proper display of URLs in loading messages
- ✅ **Connection Status Display**: Clear visual indicators (Connected, Configured, Failed, Not configured)

### Organization Unit Mapping
- ✅ **Fixed Mapping Logic**: Correct local org units now show in target dropdown
- ✅ **Loading States**: Proper loading indicators during org unit fetching
- ✅ **Error Handling**: Comprehensive error handling for mapping operations

### Data Queries & Performance
- ✅ **Fixed Deprecated Paging**: Replaced `paging=false` with proper pagination
- ✅ **Pagination Support**: Handles large datasets with proper page-by-page loading
- ✅ **Performance Optimization**: Efficient data loading with configurable page sizes

## 🔐 Permission System

DQA360 implements automatic role-based access control with multiple permission levels:

### Permission Levels (Priority Order)

| Level | Access | Visual Indicator | Setup Required |
|-------|--------|------------------|----------------|
| **SUPERUSER** | Full system access | 🟠 SUPERUSER | None - Auto-detected |
| **DQA ADMIN** | Full DQA360 access | 🟢 DQA ADMIN | Add to "DQA360 Administrators" group |
| **DQA USER** | Basic DQA360 access | 🔵 DQA USER | Add to "DQA360 Users" group |
| **NO ACCESS** | No DQA360 access | ⚪ NO ACCESS | Default state |

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

## 🛠 Technology Stack

- **Frontend**: React 18 with DHIS2 UI Components
- **Routing**: React Router v6
- **Forms**: React Hook Form with validation
- **State Management**: React Hooks + Context API
- **DHIS2 Integration**: DHIS2 App Runtime
- **Authentication**: DHIS2 OAuth + Custom credential management
- **Styling**: DHIS2 UI Components + Custom CSS

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Access to a DHIS2 instance (for development/testing)

### Development Setup

1. **Clone the repository:**
```bash
git clone https://github.com/stephocay/dhis2-dqa360.git
cd dhis2-dqa360
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Start development server:**
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

The application will be available at `http://localhost:3000`

### Alternative Development Options

```bash
# With DHIS2 demo instance (recommended for development)
npm run start:demo

# For local DHIS2 instance
npm run start:local

# For development without proxy (requires manual DHIS2 setup)
npm start
```

## 📁 Project Structure

```
src/
├── components/                 # Reusable UI components
│   ├── Layout/                # Layout components (Header, Navigation)
│   ├── AuthorityGuard/        # Permission-based access control
│   └── Router/                # Application routing
├── pages/                     # Main application pages
│   ├── Dashboard/             # Dashboard and overview
│   ├── ManageAssessments/     # Assessment creation & management
│   │   ├── AssessmentSteps/   # Multi-step assessment wizard
│   │   ├── CreateAssessmentPage.jsx
│   │   └── EditAssessmentPage.jsx
│   ├── DQAData/              # Data entry and management
│   ├── Administration/        # System administration
│   └── ViewAssessment/        # Assessment viewing and analysis
├── services/                  # API services and utilities
│   ├── assessmentDataStoreService.js
│   ├── dhis2Service.js
│   └── authorityService.js
├── utils/                     # Utility functions
│   ├── assessmentToolsCreator.js
│   └── manualMetadataCreator.js
├── hooks/                     # Custom React hooks
│   ├── useUserAuthorities.js
│   └── usePageHeader.js
└── constants/                 # Application constants
```

## 🔄 Assessment Creation Workflow

### Multi-Step Assessment Wizard

1. **Details Step**: Basic assessment information (name, dates, frequency)
2. **Connection Step**: Configure external DHIS2 connection (if needed)
   - Enter connection details (URL, credentials)
   - Test connection (required before proceeding)
   - Connection status validation
3. **Datasets Step**: Select datasets from local or external DHIS2
4. **Elements Step**: Choose specific data elements for assessment
5. **Units Step**: Select organization units for assessment
6. **Mapping Step**: Map external org units to local ones (for external sources)
7. **Preparation Step**: Generate assessment tools and metadata
8. **Review Step**: Final review and save assessment

### Connection Management Features

- **Secure Credential Storage**: Credentials saved locally for reuse
- **Connection Testing**: Validate connection before proceeding
- **Status Indicators**: Visual feedback on connection status
- **Error Handling**: Comprehensive error messages and recovery options

## 🔧 Key Workflows

### 1. External DHIS2 Integration
1. **Connection Setup**: Configure external DHIS2 instance details
2. **Authentication**: Test connection with credentials
3. **Dataset Loading**: Fetch available datasets from external instance
4. **Organization Unit Mapping**: Map external org units to local ones
5. **Data Synchronization**: Pull data for comparison and analysis

### 2. Assessment Preparation
1. **Metadata Creation**: Generate category combos, categories, and options
2. **Dataset Creation**: Create assessment-specific datasets
3. **Tool Generation**: Generate Primary, Summary, DHIS2, and Correction tools
4. **Validation**: Ensure all metadata is properly created

### 3. Data Quality Comparison
- **3-way comparison**: Register vs Summary vs DHIS2 data
- **Configurable thresholds**: Define acceptable variance levels
- **Automated flagging**: Highlight discrepancies based on severity
- **Visual indicators**: Color-coded alerts for different issue types

## 📜 Available Scripts

### Development
```bash
npm start          # Start development server
npm run start:demo # Start with DHIS2 demo instance
npm test           # Run tests
```

### Building & Deployment
```bash
npm run build      # Build for production
npm run deploy     # Deploy to DHIS2 instance
```

### Utilities
```bash
./start-dev.sh     # Quick development start
./setup-authorities.sh  # Setup user authorities
```

## 🔧 Configuration

### Environment Variables
```bash
# .env.development
REACT_APP_DHIS2_BASE_URL=https://play.im.dhis2.org/stable-2-41-4-1
```

### DHIS2 Configuration
```javascript
// d2.config.js
module.exports = {
    type: 'app',
    name: 'dqa360',
    title: 'DQA360',
    authorities: [
        'DQA360_USER',
        'DQA360_ADMIN'
    ]
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication fails when switching to external source**
   - ✅ Fixed: Authentication only happens when testing or proceeding to datasets

2. **Wrong org units in mapping dropdown**
   - ✅ Fixed: Correct local org units now show in target dropdown

3. **Deprecation warnings for paging=false**
   - ✅ Fixed: All queries now use proper pagination

4. **HTML encoding in loading messages**
   - ✅ Fixed: URLs display correctly without HTML entities

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('dqa360_debug', 'true')
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the BSD-3-Clause License.

## 📚 Learn More

- [DHIS2 Application Platform Documentation](https://platform.dhis2.nu/)
- [DHIS2 Application Runtime Documentation](https://runtime.dhis2.nu/)
- [React Documentation](https://reactjs.org/)

---

**DHIS2 DQA360** - Empowering teams to turn data quality insights into real, measurable impact.