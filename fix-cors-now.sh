#!/bin/bash

# Quick CORS Fix Script for DQA360
# This script immediately fixes CORS issues by configuring the proxy

echo "🔧 DQA360 CORS Quick Fix"
echo "========================"
echo ""

# Check if we're in the right directory
if [ ! -f "d2.config.js" ]; then
    echo "❌ Error: Please run this script from the DQA360 project root directory"
    exit 1
fi

# Create .env.local with demo server (no CORS issues)
echo "📝 Creating .env.local with DHIS2 demo server..."
cat > .env.local << EOF
# DHIS2 Configuration - Demo Server (No CORS Issues)
DHIS2_BASE_URL=https://play.dhis2.org/40.2.2
EOF

echo "✅ Created .env.local"

# Kill any existing dev server
echo "🛑 Stopping any existing development server..."
pkill -f "d2-app-scripts start" 2>/dev/null || true
sleep 2

echo ""
echo "✅ CORS Fix Applied!"
echo ""
echo "📋 What was done:"
echo "   • Configured proxy to use DHIS2 demo server"
echo "   • Demo server has CORS properly configured"
echo "   • No admin access needed"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npm start"
echo "   2. Open: http://localhost:3000"
echo "   3. Try creating an assessment - CORS errors should be gone!"
echo ""
echo "🔄 To use a different DHIS2 server later:"
echo "   • Run: npm run dhis2:connect"
echo "   • Or edit .env.local manually"
echo ""
echo "🎉 Ready to develop without CORS issues!"