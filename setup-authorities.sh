#!/bin/bash

# DQA360 Authority Setup Script (Shell version)
# This script creates the required authorities in DHIS2 for the DQA360 application.

# Configuration - Update these values for your DHIS2 instance
DHIS2_URL="http://localhost:8080"
DHIS2_USERNAME="admin"
DHIS2_PASSWORD="district"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 DQA360 Authority Setup Script${NC}"
echo "=================================="
echo -e "📡 Connecting to: ${DHIS2_URL}"
echo -e "👤 Username: ${DHIS2_USERNAME}"
echo ""

# Test connection first
echo -e "${BLUE}🔍 Testing DHIS2 connection...${NC}"
response=$(curl -s -w "%{http_code}" -u "${DHIS2_USERNAME}:${DHIS2_PASSWORD}" \
    -H "Content-Type: application/json" \
    "${DHIS2_URL}/api/me" -o /tmp/dhis2_test.json)

if [ "$response" = "200" ]; then
    user_name=$(cat /tmp/dhis2_test.json | grep -o '"displayName":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Connected to DHIS2 as: ${user_name}${NC}"
else
    echo -e "${RED}❌ Failed to connect to DHIS2. Status: ${response}${NC}"
    echo ""
    echo -e "${YELLOW}📝 Please check:${NC}"
    echo "   1. DHIS2 is running and accessible"
    echo "   2. Base URL is correct"
    echo "   3. Username and password are correct"
    echo "   4. User has sufficient permissions"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Setting up DQA360 authorities...${NC}"
echo ""

# Function to check if authority exists
check_authority_exists() {
    local authority_name=$1
    response=$(curl -s -w "%{http_code}" -u "${DHIS2_USERNAME}:${DHIS2_PASSWORD}" \
        -H "Content-Type: application/json" \
        "${DHIS2_URL}/api/authorities?filter=name:eq:${authority_name}&fields=id,name" \
        -o /tmp/authority_check.json)
    
    if [ "$response" = "200" ]; then
        count=$(cat /tmp/authority_check.json | grep -o '"authorities":\[' | wc -l)
        if [ "$count" -gt 0 ]; then
            authorities_content=$(cat /tmp/authority_check.json | grep -o '"authorities":\[[^]]*\]')
            if [[ "$authorities_content" == *"$authority_name"* ]]; then
                return 0  # exists
            fi
        fi
    fi
    return 1  # doesn't exist
}

# Function to create authority
create_authority() {
    local name=$1
    local display_name=$2
    local description=$3
    
    authority_json="{
        \"name\": \"${name}\",
        \"displayName\": \"${display_name}\",
        \"description\": \"${description}\"
    }"
    
    response=$(curl -s -w "%{http_code}" -u "${DHIS2_USERNAME}:${DHIS2_PASSWORD}" \
        -H "Content-Type: application/json" \
        -X POST \
        -d "${authority_json}" \
        "${DHIS2_URL}/api/authorities" \
        -o /tmp/authority_create.json)
    
    if [ "$response" = "201" ]; then
        echo -e "${GREEN}✅ Successfully created authority: ${name}${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to create authority ${name}. Status: ${response}${NC}"
        if [ -f /tmp/authority_create.json ]; then
            cat /tmp/authority_create.json
        fi
        return 1
    fi
}

# Setup authorities
created_count=0
existing_count=0

# DQA360_USER Authority
echo -e "${BLUE}🔍 Checking authority: DQA360_USER${NC}"
if check_authority_exists "DQA360_USER"; then
    echo -e "${YELLOW}ℹ️  Authority DQA360_USER already exists - skipping${NC}"
    ((existing_count++))
else
    echo -e "${BLUE}➕ Creating authority: DQA360_USER${NC}"
    if create_authority "DQA360_USER" "DQA360 User" "Basic access to DQA360 application - can view data and reports"; then
        ((created_count++))
    fi
fi
echo ""

# DQA360_ADMIN Authority
echo -e "${BLUE}🔍 Checking authority: DQA360_ADMIN${NC}"
if check_authority_exists "DQA360_ADMIN"; then
    echo -e "${YELLOW}ℹ️  Authority DQA360_ADMIN already exists - skipping${NC}"
    ((existing_count++))
else
    echo -e "${BLUE}➕ Creating authority: DQA360_ADMIN${NC}"
    if create_authority "DQA360_ADMIN" "DQA360 Administrator" "Full administrative access to DQA360 application - can manage assessments, configure system, and access all features"; then
        ((created_count++))
    fi
fi
echo ""

# Summary
echo -e "${BLUE}📊 Setup Summary:${NC}"
echo -e "   ${GREEN}✅ Created: ${created_count} authorities${NC}"
echo -e "   ${YELLOW}ℹ️  Existing: ${existing_count} authorities${NC}"
echo -e "   📝 Total: 2 authorities"
echo ""

if [ $((created_count + existing_count)) -gt 0 ]; then
    echo -e "${GREEN}🎉 Authority setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "   1. Go to DHIS2 Users app"
    echo "   2. Create or edit user roles"
    echo "   3. Add the following authorities to roles:"
    echo "      • DQA360_USER - for basic users"
    echo "      • DQA360_ADMIN - for administrators"
    echo "   4. Assign roles to users"
    echo "   5. Test the DQA360 application"
else
    echo -e "${RED}❌ No authorities were created. Please check the errors above.${NC}"
fi

# Cleanup temp files
rm -f /tmp/dhis2_test.json /tmp/authority_check.json /tmp/authority_create.json