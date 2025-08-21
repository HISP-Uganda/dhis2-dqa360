// Application constants
export const APP_NAME = 'DQA360'
export const APP_TAGLINE = 'Total Insight. Total Impact.'

// User roles
export const USER_ROLES = {
    ADMIN: 'admin',
    DQA_TEAM_LEAD: 'dqa_team_lead',
    DATA_COLLECTOR: 'data_collector',
    FACILITY_USER: 'facility_user',
    VIEWER: 'viewer'
}

// Assessment statuses
export const ASSESSMENT_STATUS = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    ARCHIVED: 'archived'
}

// Discrepancy severity levels
export const DISCREPANCY_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
}

// Discrepancy statuses
export const DISCREPANCY_STATUS = {
    PENDING: 'pending',
    INVESTIGATING: 'investigating',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed'
}

// Data entry types
export const DATA_ENTRY_TYPES = {
    REGISTER: 'register',
    SUMMARY: 'summary',
    DHIS2: 'dhis2',
    CORRECTION: 'correction'
}

// Notification channels
export const NOTIFICATION_CHANNELS = {
    SMS: 'sms',
    WHATSAPP: 'whatsapp',
    TELEGRAM: 'telegram',
    EMAIL: 'email'
}

// Notification types
export const NOTIFICATION_TYPES = {
    ALERT: 'alert',
    PRAISE: 'praise',
    REMINDER: 'reminder',
    SYSTEM: 'system'
}

// API endpoints (relative to DHIS2 base URL)
export const API_ENDPOINTS = {
    DATA_SETS: 'dataSets',
    DATA_VALUES: 'dataValueSets',
    ORG_UNITS: 'organisationUnits',
    PERIODS: 'periods',
    ME: 'me',
    USERS: 'users'
}

// Default pagination
export const DEFAULT_PAGE_SIZE = 20

// Date formats
export const DATE_FORMATS = {
    DISPLAY: 'YYYY-MM-DD',
    API: 'YYYY-MM-DD',
    PERIOD: 'YYYYMM'
}

// Colors for charts and UI
export const COLORS = {
    PRIMARY: '#2c6693',
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    INFO: '#2196f3',
    NEUTRAL: '#9e9e9e'
}