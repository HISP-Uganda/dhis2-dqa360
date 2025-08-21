#!/usr/bin/env node

const fs = require('fs');

const filePath = '/Users/stephocay/projects/dqa360/.d2/shell/src/D2App/pages/Metadata/DatasetPreparation.jsx';

console.log('🧹 Cleaning up duplicates and fixing syntax...');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove the second occurrence of the period types functions (lines 342-417)
const lines = content.split('\n');
const cleanedLines = [];
let skipLines = false;
let skipCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Start skipping from the second occurrence of "// 🔄 DHIS2 Data Fetching Functions"
    if (line.includes('// 🔄 DHIS2 Data Fetching Functions') && skipCount === 0) {
        skipCount++;
        cleanedLines.push(line);
    } else if (line.includes('// 🔄 DHIS2 Data Fetching Functions') && skipCount === 1) {
        skipLines = true;
        continue;
    } else if (skipLines && line.includes('// Generate DHIS2-compliant UID')) {
        skipLines = false;
        cleanedLines.push(line);
    } else if (!skipLines) {
        cleanedLines.push(line);
    }
}

content = cleanedLines.join('\n');

// Fix the syntax issue in return statement
content = content.replace(
    /return \(\s+<Box>\s+\/\/ 🔄 Component Effects[\s\S]*?useEffect\(\(\) => \{\s+fetchPeriodTypes\(\)\s+\}, \[\]\)/,
    `// 🔄 Component Effects
    
    // Fetch period types when component mounts
    useEffect(() => {
        fetchPeriodTypes()
    }, [])

    return (
        <Box>`
);

// Write the file back
fs.writeFileSync(filePath, content);

console.log('✅ Cleanup completed!');
console.log('📋 Changes made:');
console.log('  ✅ Removed duplicate period types functions');
console.log('  ✅ Fixed syntax issue in return statement');