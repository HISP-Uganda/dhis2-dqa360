#!/bin/bash

# DQA360 Development Startup Script
# For development and testing purposes only

echo "🚀 Starting DQA360 Development Environment"
echo "=========================================="
echo "📡 Connecting to DHIS2 Demo Instance"
echo "🌐 Proxy: https://play.dhis2.org/dev"
echo ""
echo "👤 Demo Login Credentials:"
echo "   Username: admin"
echo "   Password: district"
echo ""
echo "🔧 Development Features:"
echo "   • Automatic permission setup"
echo "   • Superuser detection"
echo "   • User group creation"
echo "   • Role-based access control"
echo ""
echo "📱 DQA360 will be available at: http://localhost:3000"
echo ""
echo "⚠️  This is for DEVELOPMENT ONLY - not for production use"
echo ""

# Start the application with DHIS2 demo proxy
npm run start:demo