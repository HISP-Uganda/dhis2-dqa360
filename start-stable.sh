#!/bin/bash

# Start DQA360 on port 3000 with proxy to DHIS2 stable instance
echo "🚀 Starting DQA360 on port 3000..."
echo "📡 Proxying to: https://play.im.dhis2.org/stable-2-40-8-2"
echo "🔑 Using credentials: admin:district"
echo ""

# Set environment variables for consistent behavior
export PORT=3000
export DHIS2_BASE_URL=https://play.im.dhis2.org/stable-2-40-8-2

# Start the application
yarn start

echo ""
echo "✅ Application should be available at: http://localhost:3000"