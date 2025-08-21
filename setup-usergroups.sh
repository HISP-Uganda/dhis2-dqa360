#!/bin/bash

# DQA360 User Groups Setup Script
# This script creates the required user groups in DHIS2 for the DQA360 application.

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

echo -e "${BLUE}🚀 DQA360 User Groups Setup Script${NC}"
echo "===================================="
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
echo -e "${BLUE}🔧 Setting up DQA360 user groups...${NC}"
echo ""

# Function to check if user group exists
check_usergroup_exists() {
    local group_name=$1
    response=$(curl -s -w "%{http_code}" -u "${DHIS2_USERNAME}:${DHIS2_PASSWORD}" \
        -H "Content-Type: application/json" \
        "${DHIS2_URL}/api/userGroups?filter=name:eq:${group_name}&fields=id,name" \
        -o /tmp/usergroup_check.json)
    
    if [ "$response" = "200" ]; then
        count=$(cat /tmp/usergroup_check.json | grep -o '"userGroups":\[' | wc -l)
        if [ "$count" -gt 0 ]; then
            usergroups_content=$(cat /tmp/usergroup_check.json | grep -o '"userGroups":\[[^]]*\]')
            if [[ "$usergroups_content" == *"$group_name"* ]]; then
                return 0  # exists
            fi
        fi
    fi
    return 1  # doesn't exist
}

# Function to create user group
create_usergroup() {
    local name=$1
    local description=$2
    
    usergroup_json="{
        \"name\": \"${name}\",
        \"description\": \"${description}\"
    }"
    
    response=$(curl -s -w "%{http_code}" -u "${DHIS2_USERNAME}:${DHIS2_PASSWORD}" \
        -H "Content-Type: application/json" \
        -X POST \
        -d "${usergroup_json}" \
        "${DHIS2_URL}/api/userGroups" \
        -o /tmp/usergroup_create.json)
    
    if [ "$response" = "201" ]; then
        echo -e "${GREEN}✅ Successfully created user group: ${name}${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to create user group ${name}. Status: ${response}${NC}"
        if [ -f /tmp/usergroup_create.json ]; then
            cat /tmp/usergroup_create.json
        fi
        return 1
    fi
}

# Setup user groups
created_count=0
existing_count=0

# DQA360 Users Group
echo -e "${BLUE}🔍 Checking user group: DQA360 Users${NC}"
if check_usergroup_exists "DQA360 Users"; then
    echo -e "${YELLOW}ℹ️  User group 'DQA360 Users' already exists - skipping${NC}"
    ((existing_count++))
else
    echo -e "${BLUE}➕ Creating user group: DQA360 Users${NC}"
    if create_usergroup "DQA360 Users" "Basic DQA360 users - can view data and reports"; then
        ((created_count++))
    fi
fi
echo ""

# DQA360 Administrators Group
echo -e "${BLUE}🔍 Checking user group: DQA360 Administrators${NC}"
if check_usergroup_exists "DQA360 Administrators"; then
    echo -e "${YELLOW}ℹ️  User group 'DQA360 Administrators' already exists - skipping${NC}"
    ((existing_count++))
else
    echo -e "${BLUE}➕ Creating user group: DQA360 Administrators${NC}"
    if create_usergroup "DQA360 Administrators" "DQA360 administrators - full access to all features"; then
        ((created_count++))
    fi
fi
echo ""

# Summary
echo -e "${BLUE}📊 Setup Summary:${NC}"
echo -e "   ${GREEN}✅ Created: ${created_count} user groups${NC}"
echo -e "   ${YELLOW}ℹ️  Existing: ${existing_count} user groups${NC}"
echo -e "   📝 Total: 2 user groups"
echo ""

if [ $((created_count + existing_count)) -gt 0 ]; then
    echo -e "${GREEN}🎉 User groups setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "   1. Go to DHIS2 Users app"
    echo "   2. Add users to the appropriate groups:"
    echo "      • 'DQA360 Users' - for basic users"
    echo "      • 'DQA360 Administrators' - for administrators"
    echo "   3. Test the DQA360 application"
    echo ""
    echo -e "${BLUE}📝 User Group IDs (save these):${NC}"
    
    # Get and display user group IDs
    curl -s -u "${DHIS2_USERNAME}:${DHIS2_PASSWORD}" \
        "${DHIS2_URL}/api/userGroups?filter=name:like:DQA360&fields=id,name" | \
        grep -E '"id"|"name"' | \
        sed 's/.*"id" *: *"\([^"]*\)".*/   ID: \1/' | \
        sed 's/.*"name" *: *"\([^"]*\)".*/   Name: \1/'
else
    echo -e "${RED}❌ No user groups were created. Please check the errors above.${NC}"
fi

# Cleanup temp files
rm -f /tmp/dhis2_test.json /tmp/usergroup_check.json /tmp/usergroup_create.json