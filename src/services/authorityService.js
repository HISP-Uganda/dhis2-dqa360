/**
 * Authority Service - DQA360 Permission Management
 * Custom authorities are now managed by d2.config.js
 */

// DQA360 Authority Definitions (for reference)
export const DQA360_AUTHORITIES = {
    USER: 'DQA360_USER',
    ADMIN: 'DQA360_ADMIN'
}

// DQA360 User Group Definitions (fallback method)
export const DQA360_USER_GROUPS = {
    USERS: 'DQA360 Users',
    ADMINS: 'DQA360 Administrators'
}

/**
 * Simple authority and user group constants for easy reference
 */
export const AUTHORITY_NAMES = {
    DQA360_USER: 'DQA360_USER',
    DQA360_ADMIN: 'DQA360_ADMIN'
}

export const USER_GROUP_NAMES = {
    DQA360_USERS: 'DQA360 Users',
    DQA360_ADMINISTRATORS: 'DQA360 Administrators'
}