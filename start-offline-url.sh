#!/bin/bash

echo "🚀 Starting DQA360 in Offline Mode"
echo "=================================="
echo ""
echo "🔧 Mode: Complete Offline (No DHIS2 AppAdapter)"
echo "📱 App will be available at: http://localhost:3000?offline=true"
echo "👤 Mock User: admin (with full permissions)"
echo "⚡ Features: All UI functionality available"
echo ""
echo "💡 This bypasses DHIS2 authentication entirely"
echo "⚠️  Note: Data will be stored locally (not in DHIS2)"
echo ""

# Start the development server
npm start &

# Wait for server to start
sleep 5

# Open browser with offline mode
if command -v open >/dev/null 2>&1; then
    echo "🌐 Opening browser with offline mode..."
    open "http://localhost:3000?offline=true"
elif command -v xdg-open >/dev/null 2>&1; then
    echo "🌐 Opening browser with offline mode..."
    xdg-open "http://localhost:3000?offline=true"
else
    echo "🌐 Please open: http://localhost:3000?offline=true"
fi

# Keep the script running
wait