#!/usr/bin/env node

const https = require('https');

const testConnection = (url, auth) => {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: '/api/me',
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(auth).toString('base64')}`,
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const user = JSON.parse(data);
                        resolve({
                            success: true,
                            user: user.displayName || user.username,
                            authorities: user.authorities?.length || 0
                        });
                    } catch (e) {
                        resolve({ success: true, user: 'Unknown', authorities: 0 });
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Connection timeout'));
        });

        req.end();
    });
};

const testInstances = [
    { name: 'DHIS2 Stable 2.42.1', url: 'https://play.dhis2.org/stable-2-42-1', auth: 'admin:district' },
    { name: 'DHIS2 Stable 2.41.4.1', url: 'https://play.dhis2.org/stable-2-41-4-1', auth: 'admin:district' },
    { name: 'DHIS2 Dev Master', url: 'https://play.dhis2.org/dev', auth: 'admin:district' }
];

console.log('🔍 Testing DHIS2 Demo Instances...\n');

Promise.allSettled(
    testInstances.map(async (instance) => {
        try {
            console.log(`⏳ Testing ${instance.name}...`);
            const result = await testConnection(instance.url, instance.auth);
            console.log(`✅ ${instance.name}: Connected as ${result.user} (${result.authorities} authorities)`);
            return { ...instance, ...result };
        } catch (error) {
            console.log(`❌ ${instance.name}: ${error.message}`);
            return { ...instance, success: false, error: error.message };
        }
    })
).then((results) => {
    console.log('\n📊 Connection Test Results:');
    console.log('================================');
    
    const successful = results.filter(r => r.value?.success);
    const failed = results.filter(r => !r.value?.success);
    
    if (successful.length > 0) {
        console.log('\n✅ Working Instances:');
        successful.forEach(r => {
            console.log(`   • ${r.value.name}: ${r.value.url}`);
        });
        
        console.log('\n🚀 Recommended start command:');
        console.log(`   npm run start:demo`);
    }
    
    if (failed.length > 0) {
        console.log('\n❌ Failed Instances:');
        failed.forEach(r => {
            console.log(`   • ${r.value.name}: ${r.value.error}`);
        });
    }
    
    console.log('\n💡 If all instances fail, try:');
    console.log('   1. Check your internet connection');
    console.log('   2. Try a different DHIS2 demo instance');
    console.log('   3. Use a local DHIS2 instance with npm run start:local');
});