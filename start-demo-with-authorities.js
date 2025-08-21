#!/usr/bin/env node

/**
 * DQA360 Demo Server with Custom Authorities
 * 
 * This script starts the development server with proxy configuration
 * that simulates custom authorities for testing all functionality.
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

// Import our proxy configuration
const { proxyConfig, DEMO_USER_CONFIG, DQA360_AUTHORITIES } = require('./proxy-config');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from build directory
const buildPath = path.join(__dirname, 'build', 'app');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
} else {
    console.log('⚠️  Build directory not found. Run "npm run build" first.');
}

// Enhanced /api/me endpoint for demo
app.get('/api/me', (req, res) => {
    const role = DEMO_USER_CONFIG.role;
    const authorities = DEMO_USER_CONFIG.authorities[role] || DEMO_USER_CONFIG.authorities.admin;
    const userGroups = DEMO_USER_CONFIG.userGroups[role] || DEMO_USER_CONFIG.userGroups.admin;
    
    const demoUser = {
        id: 'demo-user-123',
        username: 'demo_user',
        firstName: 'Demo',
        surname: 'User',
        displayName: 'Demo User',
        email: 'demo@dqa360.org',
        
        // Custom authorities for DQA360
        authorities: [
            // Standard DHIS2 authorities
            'F_DATAVALUE_ADD',
            'F_DATAVALUE_DELETE',
            'F_DATASET_PUBLIC_ADD',
            'F_DATASET_PRIVATE_ADD',
            'F_DATAELEMENT_PUBLIC_ADD',
            'F_DATAELEMENT_PRIVATE_ADD',
            'F_ORGANISATIONUNIT_ADD',
            'F_USER_VIEW',
            // Add superuser authority if role is superuser
            ...(role === 'superuser' ? ['ALL'] : []),
            // Add DQA360 custom authorities
            ...authorities
        ],
        
        // User roles with authorities
        userRoles: [
            {
                id: `dqa360-${role}-role`,
                name: `DQA360 ${role.charAt(0).toUpperCase() + role.slice(1)} Role`,
                authorities: authorities
            }
        ],
        
        // User groups
        userGroups: userGroups,
        
        // System info
        version: '2.40.0',
        revision: 'demo-build',
        buildTime: new Date().toISOString()
    };
    
    console.log(`🔧 Serving demo user with role: ${role}`);
    console.log(`📋 Authorities: ${authorities.join(', ')}`);
    
    res.json(demoUser);
});

// Proxy other API calls to DHIS2 demo instance
Object.keys(proxyConfig).forEach(path => {
    if (path !== '/api/me') {
        app.use(path, createProxyMiddleware(proxyConfig[path]));
    }
});

// Serve the app for all other routes
app.get('*', (req, res) => {
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('App not built. Run "npm run build" first.');
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 DQA360 Demo Server with Custom Authorities');
    console.log('==============================================');
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log(`👤 Demo user role: ${DEMO_USER_CONFIG.role}`);
    console.log(`🔑 Available authorities:`);
    
    const authorities = DEMO_USER_CONFIG.authorities[DEMO_USER_CONFIG.role] || DEMO_USER_CONFIG.authorities.admin;
    authorities.forEach(auth => {
        console.log(`   • ${auth}`);
    });
    
    console.log('');
    console.log('🔧 To change user role, edit DEMO_USER_CONFIG.role in proxy-config.js');
    console.log('   Available roles: user, admin, superuser');
    console.log('');
    console.log('✨ All DQA360 functionality should now be accessible!');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down demo server...');
    process.exit(0);
});