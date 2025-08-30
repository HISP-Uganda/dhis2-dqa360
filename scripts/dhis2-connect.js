#!/usr/bin/env node

/**
 * DHIS2 Connection Helper Script
 * 
 * This script helps you easily connect to different DHIS2 instances
 * and handles CORS issues by using the built-in proxy.
 */

const fs = require('fs');
const path = require('path');

// Common DHIS2 instances
const DHIS2_INSTANCES = {
    'demo': 'https://play.dhis2.org/40.2.2',
    'stable': 'https://play.im.dhis2.org/stable-2-40-8-2',
    'dev': 'https://play.im.dhis2.org/dev',
    'local': 'http://localhost:8080',
    'custom': null // Will prompt for URL
};

function showUsage() {
    console.log('\n🔗 DHIS2 Connection Helper\n');
    console.log('Usage: node scripts/dhis2-connect.js [instance]\n');
    console.log('Available instances:');
    Object.keys(DHIS2_INSTANCES).forEach(key => {
        if (key !== 'custom') {
            console.log(`  ${key.padEnd(8)} - ${DHIS2_INSTANCES[key]}`);
        } else {
            console.log(`  ${key.padEnd(8)} - Enter custom URL`);
        }
    });
    console.log('\nExamples:');
    console.log('  node scripts/dhis2-connect.js demo');
    console.log('  node scripts/dhis2-connect.js local');
    console.log('  node scripts/dhis2-connect.js custom');
    console.log('\n');
}

function updateConfig(baseUrl) {
    const configPath = path.join(__dirname, '..', 'd2.config.js');
    
    try {
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Update the proxy URL in the config
        const proxyRegex = /proxy:\s*process\.env\.DHIS2_BASE_URL\s*\|\|\s*['"`]([^'"`]+)['"`]/;
        const newProxyLine = `proxy: process.env.DHIS2_BASE_URL || '${baseUrl}'`;
        
        if (proxyRegex.test(configContent)) {
            configContent = configContent.replace(proxyRegex, newProxyLine);
        } else {
            console.error('❌ Could not find proxy configuration in d2.config.js');
            return false;
        }
        
        fs.writeFileSync(configPath, configContent);
        console.log(`✅ Updated d2.config.js proxy to: ${baseUrl}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error updating config:', error.message);
        return false;
    }
}

function createEnvFile(baseUrl) {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = `# DHIS2 Configuration\nDHIS2_BASE_URL=${baseUrl}\n`;
    
    try {
        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Created .env.local with DHIS2_BASE_URL=${baseUrl}`);
        return true;
    } catch (error) {
        console.error('❌ Error creating .env.local:', error.message);
        return false;
    }
}

async function promptForCustomUrl() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('Enter your DHIS2 server URL (e.g., https://your-dhis2.org): ', (url) => {
            rl.close();
            resolve(url.trim());
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showUsage();
        return;
    }
    
    const instanceKey = args[0].toLowerCase();
    
    if (!DHIS2_INSTANCES.hasOwnProperty(instanceKey)) {
        console.error(`❌ Unknown instance: ${instanceKey}`);
        showUsage();
        return;
    }
    
    let baseUrl = DHIS2_INSTANCES[instanceKey];
    
    if (instanceKey === 'custom') {
        baseUrl = await promptForCustomUrl();
        if (!baseUrl) {
            console.error('❌ No URL provided');
            return;
        }
        
        // Validate URL format
        try {
            new URL(baseUrl);
        } catch (error) {
            console.error('❌ Invalid URL format');
            return;
        }
    }
    
    console.log(`\n🔗 Configuring connection to: ${baseUrl}\n`);
    
    // Update both config file and environment variable
    const configUpdated = updateConfig(baseUrl);
    const envCreated = createEnvFile(baseUrl);
    
    if (configUpdated && envCreated) {
        console.log('\n✅ Configuration updated successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Restart your development server: npm start');
        console.log('2. The app will now proxy requests through the DHIS2 app platform');
        console.log('3. This bypasses CORS issues for development');
        
        if (instanceKey !== 'local') {
            console.log('\n⚠️  For external servers, you may also need to:');
            console.log('   - Ask your DHIS2 admin to add http://localhost:3000 to CORS allowlist');
            console.log('   - Ensure you have valid credentials for the DHIS2 instance');
        }
        
        console.log('\n🚀 Ready to develop!');
    } else {
        console.log('\n❌ Configuration update failed');
    }
}

// Run the script
main().catch(console.error);