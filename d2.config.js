/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    name: 'DQA360',
    title: 'DQA360 - Data Quality Assessment',
    description: 'A comprehensive data quality assessment platform for DHIS2',

    entryPoints: {
        app: './src/App.jsx',
    },

    direction: 'auto',
    
    customAuthorities: [
        'DQA360_ADMIN',
        'DQA360_USER'
    ],

    // Development configuration
    development: {
        port: 3000,
        // Default proxy - can be overridden with DHIS2_BASE_URL environment variable
        proxy: process.env.DHIS2_BASE_URL || 'https://play.im.dhis2.org/stable-2-40-8-2'
    }
}

module.exports = config