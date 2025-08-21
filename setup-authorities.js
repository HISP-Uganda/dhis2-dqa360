#!/usr/bin/env node

/**
 * DQA360 Authority Setup Script
 * 
 * This script creates the required authorities in DHIS2 for the DQA360 application.
 * Run this script against your DHIS2 instance to set up the necessary permissions.
 */

const https = require('https');
const http = require('http');

// Configuration - Update these values for your DHIS2 instance
const DHIS2_CONFIG = {
    baseUrl: 'http://localhost:8080', // Change to your DHIS2 URL
    username: 'admin',                // Change to your DHIS2 username
    password: 'district',             // Change to your DHIS2 password
};

// DQA360 Authorities to create
const DQA360_AUTHORITIES = [
    {
        name: 'DQA360_USER',
        displayName: 'DQA360 User',
        description: 'Basic access to DQA360 application - can view data and reports'
    },
    {
        name: 'DQA360_ADMIN',
        displayName: 'DQA360 Administrator', 
        description: 'Full administrative access to DQA360 application - can manage assessments, configure system, and access all features'
    }
];

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const protocol = options.protocol === 'https:' ? https : http;
        
        const req = protocol.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        statusCode: res.statusCode,
                        data: parsedData,
                        headers: res.headers
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData,
                        headers: res.headers
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Function to create basic auth header
function createAuthHeader(username, password) {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return `Basic ${credentials}`;
}

// Function to check if authority exists
async function checkAuthorityExists(authorityName) {
    const url = new URL(`${DHIS2_CONFIG.baseUrl}/api/authorities`);
    
    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}?filter=name:eq:${authorityName}&fields=id,name`,
        method: 'GET',
        headers: {
            'Authorization': createAuthHeader(DHIS2_CONFIG.username, DHIS2_CONFIG.password),
            'Content-Type': 'application/json'
        }
    };
    
    try {
        const response = await makeRequest(options);
        
        if (response.statusCode === 200 && response.data.authorities) {
            return response.data.authorities.length > 0;
        }
        return false;
    } catch (error) {
        console.error(`Error checking authority ${authorityName}:`, error.message);
        return false;
    }
}

// Function to create authority
async function createAuthority(authority) {
    const url = new URL(`${DHIS2_CONFIG.baseUrl}/api/authorities`);
    
    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
            'Authorization': createAuthHeader(DHIS2_CONFIG.username, DHIS2_CONFIG.password),
            'Content-Type': 'application/json'
        }
    };
    
    try {
        const response = await makeRequest(options, authority);
        
        if (response.statusCode === 201) {
            console.log(`✅ Successfully created authority: ${authority.name}`);
            return true;
        } else {
            console.error(`❌ Failed to create authority ${authority.name}:`, response.data);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error creating authority ${authority.name}:`, error.message);
        return false;
    }
}

// Function to test DHIS2 connection
async function testConnection() {
    const url = new URL(`${DHIS2_CONFIG.baseUrl}/api/me`);
    
    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        headers: {
            'Authorization': createAuthHeader(DHIS2_CONFIG.username, DHIS2_CONFIG.password),
            'Content-Type': 'application/json'
        }
    };
    
    try {
        const response = await makeRequest(options);
        
        if (response.statusCode === 200) {
            console.log(`✅ Connected to DHIS2 as: ${response.data.displayName || response.data.name}`);
            console.log(`📍 DHIS2 Version: ${response.data.version || 'Unknown'}`);
            return true;
        } else {
            console.error(`❌ Failed to connect to DHIS2. Status: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Connection error:`, error.message);
        return false;
    }
}

// Main setup function
async function setupAuthorities() {
    console.log('🚀 DQA360 Authority Setup Script');
    console.log('==================================');
    console.log(`📡 Connecting to: ${DHIS2_CONFIG.baseUrl}`);
    console.log(`👤 Username: ${DHIS2_CONFIG.username}`);
    console.log('');
    
    // Test connection first
    console.log('🔍 Testing DHIS2 connection...');
    const connected = await testConnection();
    
    if (!connected) {
        console.log('');
        console.log('❌ Setup failed - Could not connect to DHIS2');
        console.log('');
        console.log('📝 Please check:');
        console.log('   1. DHIS2 is running and accessible');
        console.log('   2. Base URL is correct');
        console.log('   3. Username and password are correct');
        console.log('   4. User has sufficient permissions');
        process.exit(1);
    }
    
    console.log('');
    console.log('🔧 Setting up DQA360 authorities...');
    console.log('');
    
    let createdCount = 0;
    let existingCount = 0;
    
    for (const authority of DQA360_AUTHORITIES) {
        console.log(`🔍 Checking authority: ${authority.name}`);
        
        const exists = await checkAuthorityExists(authority.name);
        
        if (exists) {
            console.log(`ℹ️  Authority ${authority.name} already exists - skipping`);
            existingCount++;
        } else {
            console.log(`➕ Creating authority: ${authority.name}`);
            const created = await createAuthority(authority);
            
            if (created) {
                createdCount++;
            }
        }
        
        console.log('');
    }
    
    // Summary
    console.log('📊 Setup Summary:');
    console.log(`   ✅ Created: ${createdCount} authorities`);
    console.log(`   ℹ️  Existing: ${existingCount} authorities`);
    console.log(`   📝 Total: ${DQA360_AUTHORITIES.length} authorities`);
    console.log('');
    
    if (createdCount > 0 || existingCount > 0) {
        console.log('🎉 Authority setup completed successfully!');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('   1. Go to DHIS2 Users app');
        console.log('   2. Create or edit user roles');
        console.log('   3. Add the following authorities to roles:');
        console.log('      • DQA360_USER - for basic users');
        console.log('      • DQA360_ADMIN - for administrators');
        console.log('   4. Assign roles to users');
        console.log('   5. Test the DQA360 application');
    } else {
        console.log('❌ No authorities were created. Please check the errors above.');
    }
}

// Handle command line arguments
if (process.argv.length > 2) {
    const args = process.argv.slice(2);
    
    args.forEach(arg => {
        if (arg.startsWith('--url=')) {
            DHIS2_CONFIG.baseUrl = arg.split('=')[1];
        } else if (arg.startsWith('--username=')) {
            DHIS2_CONFIG.username = arg.split('=')[1];
        } else if (arg.startsWith('--password=')) {
            DHIS2_CONFIG.password = arg.split('=')[1];
        } else if (arg === '--help' || arg === '-h') {
            console.log('DQA360 Authority Setup Script');
            console.log('');
            console.log('Usage:');
            console.log('  node setup-authorities.js [options]');
            console.log('');
            console.log('Options:');
            console.log('  --url=<url>           DHIS2 base URL (default: http://localhost:8080)');
            console.log('  --username=<user>     DHIS2 username (default: admin)');
            console.log('  --password=<pass>     DHIS2 password (default: district)');
            console.log('  --help, -h            Show this help message');
            console.log('');
            console.log('Examples:');
            console.log('  node setup-authorities.js');
            console.log('  node setup-authorities.js --url=https://play.dhis2.org/dev --username=admin --password=district');
            process.exit(0);
        }
    });
}

// Run the setup
setupAuthorities().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});