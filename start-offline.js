#!/usr/bin/env node

/**
 * DQA360 Offline Development Mode
 * 
 * This script starts the app in offline mode without requiring DHIS2 connection.
 * Perfect for testing UI changes and functionality without external dependencies.
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting DQA360 in Offline Development Mode')
console.log('===============================================')
console.log('📱 App will be available at: http://localhost:3000')
console.log('🔧 Mode: Offline (No DHIS2 connection required)')
console.log('👤 Mock User: admin (with full permissions)')
console.log('⚡ Features: All UI functionality available')
console.log('')
console.log('💡 This mode is perfect for:')
console.log('   • Testing UI changes')
console.log('   • Developing new features')
console.log('   • Demo purposes')
console.log('   • When DHIS2 instances are unavailable')
console.log('')
console.log('⚠️  Note: Data will be stored locally (not in DHIS2)')
console.log('')

// Set environment variables for offline mode
process.env.REACT_APP_OFFLINE_MODE = 'true'
process.env.REACT_APP_DHIS2_BASE_URL = 'http://localhost:3000'

// Start the development server
const startProcess = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true
})

startProcess.on('error', (error) => {
    console.error('❌ Failed to start development server:', error.message)
    process.exit(1)
})

startProcess.on('close', (code) => {
    if (code !== 0) {
        console.error(`❌ Development server exited with code ${code}`)
        process.exit(code)
    }
})

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down DQA360 offline development server...')
    startProcess.kill('SIGINT')
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down DQA360 offline development server...')
    startProcess.kill('SIGTERM')
    process.exit(0)
})