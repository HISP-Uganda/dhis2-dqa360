/**
 * Proxy Configuration for DQA360 Demo Mode
 * 
 * This configuration allows testing of custom authorities in proxy/demo mode
 * by intercepting API calls and modifying responses to include DQA360 authorities.
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

// DQA360 Custom Authorities
const DQA360_AUTHORITIES = {
    USER: 'DQA360_USER',
    ADMIN: 'DQA360_ADMIN'
};

// Demo user configuration - modify this to test different permission levels
const DEMO_USER_CONFIG = {
    // Set to 'user' for basic user permissions, 'admin' for full admin, 'superuser' for all permissions
    role: 'admin', // Change this to test different roles
    
    // Custom authorities to add based on role
    authorities: {
        user: [DQA360_AUTHORITIES.USER],
        admin: [DQA360_AUTHORITIES.USER, DQA360_AUTHORITIES.ADMIN],
        superuser: ['ALL'] // Superuser gets ALL authority
    },
    
    // User groups to add based on role
    userGroups: {
        user: [{ id: 'dqa360-users', name: 'DQA360 Users' }],
        admin: [
            { id: 'dqa360-users', name: 'DQA360 Users' },
            { id: 'dqa360-admins', name: 'DQA360 Administrators' }
        ],
        superuser: [
            { id: 'dqa360-users', name: 'DQA360 Users' },
            { id: 'dqa360-admins', name: 'DQA360 Administrators' },
            { id: 'superuser', name: 'Superuser' }
        ]
    }
};

// Function to modify user data with DQA360 authorities
function enhanceUserData(userData, role = 'admin') {
    const config = DEMO_USER_CONFIG;
    
    // Add custom authorities
    const customAuthorities = config.authorities[role] || config.authorities.admin;
    const existingAuthorities = userData.authorities || [];
    userData.authorities = [...new Set([...existingAuthorities, ...customAuthorities])];
    
    // Add user groups
    const customUserGroups = config.userGroups[role] || config.userGroups.admin;
    const existingUserGroups = userData.userGroups || [];
    userData.userGroups = [...existingUserGroups, ...customUserGroups];
    
    // Add user roles with authorities
    const roleAuthorities = customAuthorities;
    const customRole = {
        id: `dqa360-${role}-role`,
        name: `DQA360 ${role.charAt(0).toUpperCase() + role.slice(1)} Role`,
        authorities: roleAuthorities
    };
    
    const existingUserRoles = userData.userRoles || [];
    userData.userRoles = [...existingUserRoles, customRole];
    
    console.log(`🔧 Enhanced user data for role: ${role}`);
    console.log(`📋 Added authorities: ${customAuthorities.join(', ')}`);
    console.log(`👥 Added user groups: ${customUserGroups.map(g => g.name).join(', ')}`);
    
    return userData;
}

// Proxy configuration
const proxyConfig = {
    '/api/**': {
        target: 'https://play.dhis2.org/dev',
        changeOrigin: true,
        secure: true,
        logLevel: 'info',
        
        // Intercept responses to modify user data
        onProxyRes: function(proxyRes, req, res) {
            // Only intercept /api/me endpoint
            if (req.url.includes('/api/me') && !req.url.includes('/api/me/')) {
                let body = '';
                
                proxyRes.on('data', function(chunk) {
                    body += chunk;
                });
                
                proxyRes.on('end', function() {
                    try {
                        const userData = JSON.parse(body);
                        const enhancedData = enhanceUserData(userData, DEMO_USER_CONFIG.role);
                        
                        // Clear the original response
                        res.removeHeader('content-length');
                        res.removeHeader('content-encoding');
                        
                        // Send enhanced data
                        const enhancedBody = JSON.stringify(enhancedData);
                        res.writeHead(proxyRes.statusCode, proxyRes.headers);
                        res.end(enhancedBody);
                        
                        console.log(`✅ Enhanced /api/me response for ${userData.displayName || userData.username}`);
                    } catch (error) {
                        console.error('❌ Error enhancing user data:', error);
                        // Fall back to original response
                        res.writeHead(proxyRes.statusCode, proxyRes.headers);
                        res.end(body);
                    }
                });
                
                // Prevent default response handling
                return;
            }
        },
        
        // Add authentication headers
        onProxyReq: function(proxyReq, req, res) {
            // Add basic auth for demo instance
            const auth = Buffer.from('admin:district').toString('base64');
            proxyReq.setHeader('Authorization', `Basic ${auth}`);
        }
    }
};

module.exports = {
    proxyConfig,
    DQA360_AUTHORITIES,
    DEMO_USER_CONFIG,
    enhanceUserData
};