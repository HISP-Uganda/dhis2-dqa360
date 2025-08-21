import React from 'react'
import { Box, Button, ButtonStrip } from '@dhis2/ui'
import { useAssessmentDataStore } from '../services/assessmentDataStoreService'

const AssessmentTestData = () => {
    const { saveAssessment, getAssessments } = useAssessmentDataStore()

    const createSampleAssessment = async () => {
        const sampleAssessment = {
            id: 'test_assessment_2024Q1',
            name: 'Test Assessment Q1 2024',
            period: '2024Q1',
            frequency: 'quarterly',
            status: 'active',
            metadataSource: 'dhis2',
            dhis2Config: {
                baseUrl: 'https://play.dhis2.org/2.40.4'
            },
            dataSets: [],
            dataElements: [
                {
                    id: 'test_de_1',
                    name: 'Test Data Element 1',
                    displayName: 'Test Data Element 1',
                    valueType: 'INTEGER'
                },
                {
                    id: 'test_de_2',
                    name: 'Test Data Element 2',
                    displayName: 'Test Data Element 2',
                    valueType: 'TEXT'
                }
            ],
            orgUnits: [
                {
                    id: 'test_ou_1',
                    name: 'Test Facility 1'
                },
                {
                    id: 'test_ou_2',
                    name: 'Test Facility 2'
                }
            ],
            orgUnitMappings: [],
            created: new Date().toISOString(),
            datasets: {
                register: {
                    id: 'test_ds_register',
                    name: 'Test Assessment Q1 2024 - Register Data',
                    code: 'TEST_REG_2024Q1',
                    created: true
                },
                summary: {
                    id: 'test_ds_summary',
                    name: 'Test Assessment Q1 2024 - Summary Data',
                    code: 'TEST_SUM_2024Q1',
                    created: true
                },
                reported: {
                    id: 'test_ds_reported',
                    name: 'Test Assessment Q1 2024 - Reported Data',
                    code: 'TEST_REP_2024Q1',
                    created: true
                },
                correction: {
                    id: 'test_ds_correction',
                    name: 'Test Assessment Q1 2024 - Correction Data',
                    code: 'TEST_COR_2024Q1',
                    created: true
                }
            },
            datasetCreationCompleted: true
        }

        try {
            await saveAssessment(sampleAssessment)
            console.log('Sample assessment created successfully')
            alert('Sample assessment created successfully!')
        } catch (error) {
            console.error('Error creating sample assessment:', error)
            alert('Error creating sample assessment: ' + error.message)
        }
    }

    const createDraftAssessment = async () => {
        const draftAssessment = {
            id: 'draft_assessment_2024Q2',
            name: 'Draft Assessment Q2 2024',
            period: '202406',
            frequency: 'monthly',
            status: 'draft',
            metadataSource: 'manual',
            manualMetadata: {
                strategy: 'separate_datasets'
            },
            dataSets: [],
            dataElements: [
                {
                    id: 'draft_de_1',
                    name: 'Draft Data Element 1',
                    displayName: 'Draft Data Element 1',
                    valueType: 'INTEGER'
                }
            ],
            orgUnits: [
                {
                    id: 'draft_ou_1',
                    name: 'Draft Facility 1'
                }
            ],
            orgUnitMappings: [],
            created: new Date().toISOString(),
            datasets: {
                register: null,
                summary: null,
                reported: null,
                correction: null
            },
            datasetCreationCompleted: false
        }

        try {
            await saveAssessment(draftAssessment)
            console.log('Draft assessment created successfully')
            alert('Draft assessment created successfully!')
        } catch (error) {
            console.error('Error creating draft assessment:', error)
            alert('Error creating draft assessment: ' + error.message)
        }
    }

    const createMultiPeriodAssessment = async () => {
        const multiPeriodAssessment = {
            id: 'multi_period_assessment_2024Q3',
            name: 'Multi-Period Assessment Q3 2024',
            period: '2024Q3',
            frequency: 'quarterly', // Quarterly assessment
            status: 'active',
            metadataSource: 'dhis2',
            dhis2Config: {
                baseUrl: 'https://play.dhis2.org/2.40.4'
            },
            dataSets: [
                {
                    id: 'multi_ds_source_1',
                    name: 'Monthly Health Facility Data',
                    displayName: 'Monthly Health Facility Data',
                    periodType: 'Monthly' // This is the key - dataset period type from DHIS2
                },
                {
                    id: 'multi_ds_source_2',
                    name: 'Monthly Community Data',
                    displayName: 'Monthly Community Data',
                    periodType: 'Monthly'
                }
            ],
            dataElements: [
                {
                    id: 'multi_de_1',
                    name: 'Monthly Reporting Data Element 1',
                    displayName: 'Monthly Reporting Data Element 1',
                    valueType: 'INTEGER'
                },
                {
                    id: 'multi_de_2',
                    name: 'Monthly Reporting Data Element 2',
                    displayName: 'Monthly Reporting Data Element 2',
                    valueType: 'INTEGER'
                }
            ],
            orgUnits: [
                {
                    id: 'multi_ou_1',
                    name: 'Multi-Period Facility 1'
                },
                {
                    id: 'multi_ou_2',
                    name: 'Multi-Period Facility 2'
                }
            ],
            orgUnitMappings: [],
            created: new Date().toISOString(),
            datasets: {
                register: {
                    id: 'multi_ds_register',
                    name: 'Multi-Period Assessment Q3 2024 - Register Data',
                    code: 'MULTI_REG_2024Q3',
                    created: true,
                    periodType: 'Monthly' // Monthly datasets for quarterly assessment
                },
                summary: {
                    id: 'multi_ds_summary',
                    name: 'Multi-Period Assessment Q3 2024 - Summary Data',
                    code: 'MULTI_SUM_2024Q3',
                    created: true,
                    periodType: 'Monthly'
                },
                reported: {
                    id: 'multi_ds_reported',
                    name: 'Multi-Period Assessment Q3 2024 - Reported Data',
                    code: 'MULTI_REP_2024Q3',
                    created: true,
                    periodType: 'Monthly'
                },
                correction: {
                    id: 'multi_ds_correction',
                    name: 'Multi-Period Assessment Q3 2024 - Correction Data',
                    code: 'MULTI_COR_2024Q3',
                    created: true,
                    periodType: 'Monthly'
                }
            },
            datasetCreationCompleted: true
        }

        try {
            await saveAssessment(multiPeriodAssessment)
            console.log('Multi-period assessment created successfully')
            alert('Multi-period assessment created successfully! This assessment has quarterly frequency with monthly datasets, enabling data entry for July, August, and September 2024.')
        } catch (error) {
            console.error('Error creating multi-period assessment:', error)
            alert('Error creating multi-period assessment: ' + error.message)
        }
    }

    const createMixedPeriodAssessment = async () => {
        const mixedPeriodAssessment = {
            id: 'mixed_period_assessment_2024',
            name: 'Mixed Period Types Assessment 2024',
            period: '2024',
            frequency: 'annually', // Annual assessment
            status: 'active',
            metadataSource: 'dhis2',
            dhis2Config: {
                baseUrl: 'https://play.dhis2.org/2.40.4'
            },
            dataSets: [
                {
                    id: 'mixed_ds_monthly',
                    name: 'Monthly Facility Reports',
                    displayName: 'Monthly Facility Reports',
                    periodType: 'Monthly' // Will need 12 periods
                },
                {
                    id: 'mixed_ds_quarterly',
                    name: 'Quarterly Program Reports',
                    displayName: 'Quarterly Program Reports',
                    periodType: 'Quarterly' // Will need 4 periods
                },
                {
                    id: 'mixed_ds_yearly',
                    name: 'Annual Summary Report',
                    displayName: 'Annual Summary Report',
                    periodType: 'Yearly' // Will need 1 period
                }
            ],
            dataElements: [
                {
                    id: 'mixed_de_1',
                    name: 'Mixed Reporting Data Element 1',
                    displayName: 'Mixed Reporting Data Element 1',
                    valueType: 'INTEGER'
                }
            ],
            orgUnits: [
                {
                    id: 'mixed_ou_1',
                    name: 'Mixed Period Facility 1'
                }
            ],
            orgUnitMappings: [],
            created: new Date().toISOString(),
            datasets: {
                register: { id: 'mixed_ds_register', name: 'Mixed Assessment 2024 - Register Data', created: true },
                summary: { id: 'mixed_ds_summary', name: 'Mixed Assessment 2024 - Summary Data', created: true },
                reported: { id: 'mixed_ds_reported', name: 'Mixed Assessment 2024 - Reported Data', created: true },
                correction: { id: 'mixed_ds_correction', name: 'Mixed Assessment 2024 - Correction Data', created: true }
            },
            datasetCreationCompleted: true
        }

        try {
            await saveAssessment(mixedPeriodAssessment)
            console.log('Mixed period assessment created successfully')
            alert('Mixed period assessment created successfully! This demonstrates annual assessment with different dataset period types: Monthly (12 periods), Quarterly (4 periods), and Yearly (1 period).')
        } catch (error) {
            console.error('Error creating mixed period assessment:', error)
            alert('Error creating mixed period assessment: ' + error.message)
        }
    }

    const listAllAssessments = async () => {
        try {
            const assessments = await getAssessments()
            console.log('All assessments:', assessments)
            alert(`Found ${assessments.length} assessments. Check console for details.`)
        } catch (error) {
            console.error('Error loading assessments:', error)
            alert('Error loading assessments: ' + error.message)
        }
    }

    return (
        <Box padding="24px">
            <h3>Assessment Test Data</h3>
            <p>Use these buttons to create sample assessment data for testing:</p>
            <ButtonStrip>
                <Button onClick={createSampleAssessment}>
                    Create Sample Assessment (with datasets)
                </Button>
                <Button onClick={createDraftAssessment}>
                    Create Draft Assessment (no datasets)
                </Button>
                <Button onClick={createMultiPeriodAssessment}>
                    Create Multi-Period Assessment (Q3→Monthly)
                </Button>
                <Button onClick={createMixedPeriodAssessment}>
                    Create Mixed Period Assessment (Annual→Mixed)
                </Button>
                <Button onClick={listAllAssessments}>
                    List All Assessments
                </Button>
            </ButtonStrip>
        </Box>
    )
}

export default AssessmentTestData