/**
 * Demo User Override for Testing Custom Authorities
 * 
 * This utility allows testing of custom authorities in demo/proxy mode
 * by overriding the user data returned from the API.
 */

// Demo configuration - change these values to test different permission levels
export const DEMO_CONFIG = {
    // Set to true to enable demo mode with custom authorities
    enabled: true,
    
    // User role: 'user', 'admin', or 'superuser'
    role: 'admin',
    
    // Custom user data to override
    userData: {
        user: {
            authorities: ['DQA360_USER'],
            userGroups: [{ id: 'dqa360-users', name: 'DQA360 Users' }],
            userRoles: [{
                id: 'dqa360-user-role',
                name: 'DQA360 User Role',
                authorities: ['DQA360_USER']
            }]
        },
        admin: {
            authorities: ['DQA360_USER', 'DQA360_ADMIN'],
            userGroups: [
                { id: 'dqa360-users', name: 'DQA360 Users' },
                { id: 'dqa360-admins', name: 'DQA360 Administrators' }
            ],
            userRoles: [{
                id: 'dqa360-admin-role',
                name: 'DQA360 Admin Role',
                authorities: ['DQA360_USER', 'DQA360_ADMIN']
            }]
        },
        superuser: {
            authorities: ['ALL', 'DQA360_USER', 'DQA360_ADMIN'],
            userGroups: [
                { id: 'dqa360-users', name: 'DQA360 Users' },
                { id: 'dqa360-admins', name: 'DQA360 Administrators' },
                { id: 'superuser', name: 'Superuser' }
            ],
            userRoles: [{
                id: 'superuser-role',
                name: 'Superuser Role',
                authorities: ['ALL']
            }]
        }
    }
};

/**
 * Override user data for demo purposes
 * @param {Object} originalUserData - Original user data from API
 * @returns {Object} Enhanced user data with custom authorities
 */
export const overrideUserData = (originalUserData) => {
    if (!DEMO_CONFIG.enabled) {
        return originalUserData;
    }
    
    const role = DEMO_CONFIG.role;
    const overrideData = DEMO_CONFIG.userData[role];
    
    if (!overrideData) {
        console.warn(`Demo role '${role}' not found, using original data`);
        return originalUserData;
    }
    
    // Merge original data with override data
    const enhancedData = {
        ...originalUserData,
        
        // Override authorities
        authorities: [
            ...(originalUserData.authorities || []),
            ...overrideData.authorities
        ].filter((auth, index, arr) => arr.indexOf(auth) === index), // Remove duplicates
        
        // Override user groups
        userGroups: [
            ...(originalUserData.userGroups || []),
            ...overrideData.userGroups
        ],
        
        // Override user roles
        userRoles: [
            ...(originalUserData.userRoles || []),
            ...overrideData.userRoles
        ]
    };
    
    // Log only once per session to avoid repetition
    if (!window.__DQA360_DEMO_LOGGED__) {
        window.__DQA360_DEMO_LOGGED__ = true
        console.log(`🔧 Demo mode: Enhanced user data for role '${role}'`)
        console.log(`📋 Added authorities: ${overrideData.authorities.join(', ')}`)
        console.log(`👥 Added user groups: ${overrideData.userGroups.map(g => g.name).join(', ')}`)
    }
    
    return enhancedData;
};

/**
 * Check if demo mode is enabled
 * @returns {boolean}
 */
export const isDemoMode = () => DEMO_CONFIG.enabled;

/**
 * Get current demo role
 * @returns {string}
 */
export const getDemoRole = () => DEMO_CONFIG.role;

/**
 * Set demo role (useful for testing)
 * @param {string} role - Role to set ('user', 'admin', 'superuser')
 */
export const setDemoRole = (role) => {
    if (DEMO_CONFIG.userData[role]) {
        DEMO_CONFIG.role = role;
        console.log(`🔄 Demo role changed to: ${role}`);
    } else {
        console.warn(`Invalid demo role: ${role}`);
    }
};

/**
 * Enable/disable demo mode
 * @param {boolean} enabled
 */
export const setDemoMode = (enabled) => {
    DEMO_CONFIG.enabled = enabled;
    console.log(`🔄 Demo mode ${enabled ? 'enabled' : 'disabled'}`);
};