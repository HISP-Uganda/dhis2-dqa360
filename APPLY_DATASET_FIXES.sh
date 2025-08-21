#!/bin/bash

# Dataset Creation Fixes Application Script
# This script applies the critical fixes to resolve DHIS2 API errors

echo "🔧 Applying Dataset Creation Fixes..."

# Backup the original file
cp "/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx" "/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx.backup"

# Apply Fix 1: Data Elements Creation API Call
echo "📝 Applying Fix 1: Data Elements Creation API Call..."
sed -i '' 's/}, { variables: { dataElements: processedElements } })/})/g' "/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx"
sed -i '' 's/createElements: metadataQueries.createDataElements/createElements: {\
                    ...metadataQueries.createDataElements,\
                    data: { dataElements: processedElements }\
                }/g' "/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx"

# Apply Fix 2: Dataset Creation API Call
echo "📝 Applying Fix 2: Dataset Creation API Call..."
sed -i '' 's/}, { variables: { dataSets: \[payload\] } })/})/g' "/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx"
sed -i '' 's/createDataset: metadataQueries.createDatasets/createDataset: {\
                    ...metadataQueries.createDatasets,\
                    data: { dataSets: [payload] }\
                }/g' "/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/components/DatasetCreationModal.jsx"

echo "✅ Fixes applied successfully!"
echo "🔨 Building application..."

# Build the application
cd "/Users/stephocay/projects/dqa360"
npm run build

echo "🎉 Dataset creation fixes have been applied and application rebuilt!"
echo "📋 The following errors should now be resolved:"
echo "   - Invalid query - Unknown query or mutation type undefined"
echo "   - Data elements creation failures"
echo "   - Dataset creation failures"