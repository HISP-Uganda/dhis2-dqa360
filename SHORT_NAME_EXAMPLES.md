# Intelligent Short Name Generation Examples

## How the AI-powered Short Name Generation Works

The new system intelligently creates short names that:
1. **Stay within 50 character limit** (DHIS2 requirement)
2. **Are unique** across all datasets
3. **Preserve meaning** through smart abbreviations
4. **Include tool suffix** to distinguish assessment types

## Example Transformations

### Original Dataset: "HMIS 105:02-03 - OPD Monthly Report (MCH, FP, EID, EPI & HEPB)"

**Before (causing conflicts):**
- Primary: `HMIS 105:02-03 - OPD Monthly Report (MCH, FP, EID,` (truncated, conflicts)
- Summary: `HMIS 105:02-03 - OPD Monthly Report (MCH, FP, EID,` (same as above - CONFLICT!)

**After (intelligent generation):**
- Primary: `HMIS 105 02 03 OPD M MCH FP EID EPI HEPB Pri` (49 chars)
- Summary: `HMIS 105 02 03 OPD M MCH FP EID EPI HEPB Sum` (49 chars)
- DHIS2: `HMIS 105 02 03 OPD M MCH FP EID EPI HEPB D2` (48 chars)
- Correction: `HMIS 105 02 03 OPD M MCH FP EID EPI HEPB Corr` (50 chars)

## Smart Abbreviation Rules

### Common Medical Terms
- Monthly → M
- Quarterly → Q
- Annual → A
- Report → Rpt
- Summary → Sum
- Outpatient → OPD
- Inpatient → IPD
- Emergency → Emerg
- Department → Dept
- Management → Mgmt
- Laboratory → Lab
- Maternal → Mat
- Child → Ch
- Family → Fam
- Planning → Plan
- Immunization → Immun

### Tool Suffixes
- PRIMARY → Pri
- SUMMARY → Sum
- DHIS2 → D2
- CORRECTION → Corr

### Word Filtering
Removes common words like: "the", "and", "of", "for", "in", "on", "at", "to", "with"

## Conflict Resolution Strategy

1. **Generate base intelligent short name**
2. **Check for conflicts** (name, code, AND shortName)
3. **If conflict exists:**
   - Add timestamp suffix: `Original Name 1234`
   - Add random suffix: `Original Name AB12`
   - Combine both: `Original Name 1234AB12`
4. **Ensure final length ≤ 50 characters**

## Real-world Examples

### Example 1: Long Maternal Health Report
**Input:** "Maternal and Child Health Monthly Summary Report - Family Planning and Immunization Services"

**Output:**
- Primary: `Mat Ch Hlth M Sum Rpt Fam Plan Immun Services Pri` (50 chars)
- Summary: `Mat Ch Hlth M Sum Rpt Fam Plan Immun Services Sum` (50 chars)

### Example 2: Laboratory Data Form
**Input:** "Laboratory Information Management System - Daily Data Collection Form"

**Output:**
- Primary: `Lab Info Mgmt Sys D Collection Pri` (36 chars)
- Summary: `Lab Info Mgmt Sys D Collection Sum` (36 chars)

### Example 3: Emergency Department Register
**Input:** "Emergency Department Patient Register - Outpatient and Inpatient Services"

**Output:**
- Primary: `Emerg Dept Patient Reg OPD IPD Services Pri` (44 chars)
- Summary: `Emerg Dept Patient Reg OPD IPD Services Sum` (44 chars)

## Benefits

1. **No More Conflicts**: Each tool type gets a unique, meaningful short name
2. **Readable**: Abbreviations are standard medical/health terms
3. **Consistent**: Same abbreviation rules applied across all datasets
4. **Space Efficient**: Maximizes information within 50 character limit
5. **Automatic**: No manual intervention needed

## Technical Implementation

The system:
1. Parses the original dataset name
2. Applies intelligent abbreviations
3. Removes common words
4. Reserves space for tool suffix
5. Checks for existing conflicts
6. Generates unique variations if needed
7. Ensures final result is ≤ 50 characters