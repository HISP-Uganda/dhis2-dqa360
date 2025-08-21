# Changelog

All notable changes to DHIS2 DQA360 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive development documentation
- Contributing guidelines for developers
- Git attributes for cross-platform compatibility

### Changed
- Consolidated multiple documentation files into single development guide
- Improved repository structure and organization

## [1.0.0] - 2024-12-19

### Added
- **Multi-Step Assessment Creation Wizard**
  - 8-step guided assessment creation process
  - Details, Connection, Datasets, Elements, Units, Mapping, Preparation, Review steps
  - Form validation and progress tracking
  - Save and resume functionality

- **External DHIS2 Integration**
  - Secure credential storage and management
  - Connection testing and validation
  - Dataset and metadata synchronization
  - Organization unit mapping between external and local instances

- **Permission System**
  - Role-based access control with 4 permission levels
  - Automatic superuser detection
  - Custom authorities (DQA360_USER, DQA360_ADMIN)
  - User group fallback support
  - Visual permission indicators in header

- **Data Quality Engine**
  - 3-way data comparison (Register vs Summary vs DHIS2)
  - Configurable variance thresholds
  - Automated discrepancy detection
  - Visual indicators for data quality issues

- **Assessment Management**
  - Create, edit, and manage DQA assessments
  - Assessment templates and reusable configurations
  - Comprehensive assessment metadata storage
  - Assessment status tracking and workflow

- **Organization Unit Management**
  - Organization unit tree selection
  - External to local org unit mapping
  - Hierarchical org unit display
  - Bulk org unit operations

- **Metadata Management**
  - Automated category combo creation
  - Category and category option management
  - Dataset preparation and validation
  - Manual metadata creation tools

- **Data Entry System**
  - Register and Summary data entry forms
  - DHIS2 data integration
  - Data validation and verification
  - Correction workflow management

- **Administration Panel**
  - User management and role assignment
  - System configuration and settings
  - Audit logs and activity tracking
  - Data store management

- **Notification System**
  - Multi-channel notifications (SMS, WhatsApp, Telegram)
  - Automated feedback generation
  - Notification configuration and templates
  - Delivery status tracking

- **Reporting System**
  - Interactive DQA reports
  - PDF and Excel export capabilities
  - Data quality metrics and analytics
  - Custom report generation

### Fixed
- **Authentication Timing Issues**
  - Removed authentication when just adding credentials
  - Authentication only triggered when testing connection or proceeding to datasets
  - Proper connection status validation before proceeding
  - Enhanced error handling for authentication failures

- **Organization Unit Mapping Logic**
  - Fixed local org units not showing in target dropdown
  - Corrected org unit loading and filtering logic
  - Improved loading states during org unit fetching
  - Enhanced error handling for mapping operations

- **Deprecated DHIS2 API Usage**
  - Replaced `paging=false` with proper pagination (`paging=true, pageSize=1000`)
  - Implemented pagination handling for large datasets
  - Added support for page-by-page data loading
  - Fixed deprecation warnings in console

- **HTML Encoding Issues**
  - Fixed HTML entities appearing in loading messages
  - Proper URL display without encoding artifacts
  - Corrected string handling and display logic

- **Connection Status Display**
  - Added clear visual indicators for connection status
  - Color-coded status tags (Connected, Configured, Failed, Not configured)
  - Real-time status updates during connection testing
  - Improved user feedback for connection states

### Changed
- **Assessment Creation Workflow**
  - Restructured into multi-step wizard format
  - Improved user experience with guided process
  - Enhanced validation and error handling
  - Better progress tracking and navigation

- **Data Store Structure**
  - Migrated to tab-based data store organization
  - Improved data structure for better performance
  - Enhanced data integrity and validation
  - Better support for concurrent access

- **Permission System Implementation**
  - Simplified permission detection logic
  - Automatic role assignment based on authorities
  - Improved fallback mechanisms
  - Better integration with DHIS2 user system

- **API Integration**
  - Enhanced error handling for API calls
  - Improved retry logic for failed requests
  - Better timeout handling
  - Optimized query performance

### Security
- **Credential Management**
  - Secure local storage of external DHIS2 credentials
  - Encrypted credential transmission
  - Proper session management
  - Enhanced authentication security

- **Access Control**
  - Implemented proper authorization checks
  - Role-based feature access
  - Secure API endpoint protection
  - User activity auditing

### Performance
- **Query Optimization**
  - Implemented proper pagination for all data queries
  - Reduced API call frequency
  - Optimized data loading strategies
  - Enhanced caching mechanisms

- **UI Performance**
  - Improved component rendering efficiency
  - Better loading state management
  - Reduced unnecessary re-renders
  - Optimized bundle size

### Technical Improvements
- **Code Quality**
  - Consistent code formatting and style
  - Improved error handling throughout application
  - Better separation of concerns
  - Enhanced component reusability

- **Development Experience**
  - Comprehensive development documentation
  - Improved debugging capabilities
  - Better development scripts and tools
  - Enhanced testing capabilities

- **Build and Deployment**
  - Optimized build process
  - Improved deployment scripts
  - Better environment configuration
  - Enhanced CI/CD readiness

## [0.9.0] - 2024-11-15

### Added
- Initial project structure and basic components
- DHIS2 app platform integration
- Basic authentication and routing
- Core data entry forms
- Initial assessment management

### Changed
- Migrated from class components to functional components
- Updated to React 18 and modern hooks
- Improved DHIS2 UI component integration

### Fixed
- Initial bug fixes and stability improvements
- Basic error handling implementation
- Form validation improvements

## [0.1.0] - 2024-10-01

### Added
- Initial project setup
- Basic DHIS2 integration
- Core application structure
- Development environment configuration

---

## Release Notes

### Version 1.0.0 Highlights

This major release represents a complete, production-ready DHIS2 Data Quality Assessment platform with comprehensive features for health data systems. Key achievements include:

- **Complete Assessment Workflow**: From creation to reporting, with full external DHIS2 integration
- **Robust Permission System**: Automatic role detection with multiple access levels
- **Production-Ready**: Comprehensive error handling, security, and performance optimizations
- **Developer-Friendly**: Extensive documentation, contribution guidelines, and development tools

### Upgrade Notes

- This is the first stable release - no upgrade path required
- All features are backward compatible with DHIS2 2.38+
- Requires Node.js 16+ for development
- See DEVELOPMENT.md for detailed setup instructions

### Breaking Changes

- None (initial stable release)

### Deprecations

- None

### Known Issues

- Large organization unit trees (>10,000 units) may experience slower loading
- External DHIS2 connections require CORS configuration for web-based access
- Some advanced analytics features require DHIS2 2.40+ for optimal performance

### Support

For support, bug reports, or feature requests:
- Create an issue on GitHub: https://github.com/HISP-Uganda/dhis2-dqa360/issues
- Refer to DEVELOPMENT.md for troubleshooting
- Check CONTRIBUTING.md for development guidelines