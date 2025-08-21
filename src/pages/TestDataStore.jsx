import React, { useState } from 'react'
import { 
    Box, 
    Button, 
    Card, 
    NoticeBox,
    CircularLoader,
    Tab,
    TabBar
} from '@dhis2/ui'
import { DataStoreViewer } from '../components/DataStoreViewer'
import { useAssessmentDataStore } from '../services/assessmentDataStoreService'
import { useUserAuthorities } from '../hooks/useUserAuthorities'

export const TestDataStore = () => {
    const { saveAssessment, createAssessmentStructure } = useAssessmentDataStore()
    const { userInfo } = useUserAuthorities()
    const [activeTab, setActiveTab] = useState('viewer')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    const createTestAssessment = async () => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            // Sample assessment data
            const assessmentData = {
                id: `test_assessment_${Date.now()}`,
                name: 'Test Assessment - Nested Structure',
                description: 'This is a test assessment to verify the nested datastore structure',
                objectives: 'Test all data quality dimensions and verify proper nesting',
                scope: 'National level data quality assessment',
                assessmentType: 'baseline',
                priority: 'high',
                methodology: 'automated',
                frequency: 'monthly',
                reportingLevel: 'facility',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                dataQualityDimensions: ['completeness', 'timeliness', 'accuracy', 'consistency'],
                stakeholders: ['Data Manager', 'M&E Officer', 'Program Manager'],
                riskFactors: ['Network connectivity', 'Staff capacity', 'Data quality'],
                successCriteria: 'Achieve 95% completeness and 90% timeliness',
                notifications: true,
                autoSync: true,
                validationAlerts: true,
                historicalComparison: false,
                confidentialityLevel: 'internal',
                dataRetentionPeriod: '5years',
                publicAccess: false,
                status: 'draft',
                tags: ['test', 'nested-structure', 'dqa360'],
                customFields: {
                    testField: 'test value',
                    priority: 'high'
                }
            }

            // Sample DHIS2 configuration
            const dhis2Config = {
                baseUrl: 'https://play.dhis2.org/stable-2-42-1',
                username: 'admin',
                password: 'district',
                configured: true,
                lastTested: new Date().toISOString(),
                connectionStatus: 'connected',
                lastSuccessfulConnection: new Date().toISOString(),
                version: '2.42.1',
                apiVersion: '42',
                systemName: 'DHIS2 Demo',
                instanceType: 'demo',
                configuredAt: new Date().toISOString(),
                timeout: 30000,
                retryAttempts: 3,
                useSSL: true
            }

            // Sample datasets
            const selectedDataSets = [
                {
                    id: 'dataset_001',
                    name: 'Primary Health Care Dataset',
                    displayName: 'Primary Health Care Dataset',
                    code: 'PHC_DS',
                    description: 'Dataset for primary health care indicators',
                    periodType: 'Monthly',
                    categoryCombo: { id: 'default', name: 'default' },
                    openFuturePeriods: 2,
                    expiryDays: 30,
                    timelyDays: 15,
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    publicAccess: 'r-------',
                    userAccesses: [],
                    userGroupAccesses: []
                },
                {
                    id: 'dataset_002',
                    name: 'Maternal Health Dataset',
                    displayName: 'Maternal Health Dataset',
                    code: 'MH_DS',
                    description: 'Dataset for maternal health indicators',
                    periodType: 'Monthly',
                    categoryCombo: { id: 'default', name: 'default' },
                    openFuturePeriods: 1,
                    expiryDays: 15,
                    timelyDays: 10,
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    publicAccess: 'r-------',
                    userAccesses: [],
                    userGroupAccesses: []
                }
            ]

            // Sample data elements
            const selectedDataElements = [
                {
                    id: 'de_001',
                    name: 'ANC 1st visit',
                    displayName: 'ANC 1st visit',
                    code: 'ANC_1ST',
                    description: 'Number of pregnant women with first ANC visit',
                    valueType: 'INTEGER',
                    domainType: 'AGGREGATE',
                    aggregationType: 'SUM',
                    categoryCombo: { id: 'default', name: 'default' },
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    publicAccess: 'r-------',
                    qualityDimensions: ['completeness', 'timeliness'],
                    assessmentPriority: 'high',
                    criticalIndicator: true
                },
                {
                    id: 'de_002',
                    name: 'Deliveries in facility',
                    displayName: 'Deliveries in facility',
                    code: 'DELIV_FAC',
                    description: 'Number of deliveries conducted in health facility',
                    valueType: 'INTEGER',
                    domainType: 'AGGREGATE',
                    aggregationType: 'SUM',
                    categoryCombo: { id: 'default', name: 'default' },
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    publicAccess: 'r-------',
                    qualityDimensions: ['completeness', 'accuracy'],
                    assessmentPriority: 'high',
                    criticalIndicator: true
                }
            ]

            // Sample organisation units
            const selectedOrgUnits = [
                {
                    id: 'ou_001',
                    name: 'District Hospital',
                    displayName: 'District Hospital',
                    code: 'DH_001',
                    description: 'Main district hospital',
                    level: 3,
                    path: '/country/region/district/hospital',
                    coordinates: '[12.345, 67.890]',
                    address: '123 Hospital Street',
                    email: 'hospital@health.gov',
                    phoneNumber: '+1234567890',
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    publicAccess: 'r-------',
                    assessmentRole: 'data_source',
                    reportingFrequency: 'monthly'
                },
                {
                    id: 'ou_002',
                    name: 'Health Center A',
                    displayName: 'Health Center A',
                    code: 'HC_A',
                    description: 'Primary health center A',
                    level: 4,
                    path: '/country/region/district/health_center_a',
                    coordinates: '[12.123, 67.456]',
                    address: '456 Health Street',
                    email: 'hc_a@health.gov',
                    phoneNumber: '+1234567891',
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    publicAccess: 'r-------',
                    assessmentRole: 'data_source',
                    reportingFrequency: 'monthly'
                }
            ]

            // Sample organisation unit mappings
            const orgUnitMappings = [
                {
                    external: {
                        id: 'ext_ou_001',
                        name: 'External District Hospital',
                        code: 'EXT_DH_001',
                        level: 3,
                        path: '/external/district/hospital'
                    },
                    dhis2: {
                        id: 'ou_001',
                        name: 'District Hospital',
                        code: 'DH_001',
                        level: 3,
                        path: '/country/region/district/hospital'
                    },
                    mappingType: 'manual',
                    confidence: 1.0,
                    status: 'active',
                    validated: true,
                    validatedBy: userInfo?.username || 'admin',
                    validatedAt: new Date().toISOString(),
                    notes: 'Manually verified mapping',
                    mapped: true
                }
            ]

            // Sample local datasets
            const localDatasets = [
                {
                    id: `local_ds_register_${assessmentData.id}`,
                    name: `DQA360 Register Dataset - ${assessmentData.name}`,
                    type: 'register',
                    purpose: 'data_quality_assessment',
                    category: 'dqa360',
                    dhis2Id: null,
                    dhis2Created: false,
                    periodType: 'Monthly',
                    categoryCombo: 'default',
                    status: 'draft',
                    active: true,
                    version: 1,
                    publicAccess: 'r-------',
                    userAccesses: [],
                    userGroupAccesses: [],
                    sharingSettings: [{
                        publicAccess: 'r-------',
                        userAccesses: [],
                        userGroupAccesses: [],
                        externalAccess: false,
                        sharingConfiguration: {
                            allowPublicAccess: false,
                            allowExternalAccess: false,
                            inheritFromParent: true
                        }
                    }]
                }
            ]

            console.log('🧪 Creating test assessment with nested structure...')
            
            const savedAssessment = await saveAssessment(
                assessmentData,
                dhis2Config,
                selectedDataSets,
                selectedDataElements,
                selectedOrgUnits,
                orgUnitMappings,
                localDatasets,
                userInfo
            )

            setResult(savedAssessment)
            console.log('✅ Test assessment created successfully:', savedAssessment)

        } catch (err) {
            console.error('❌ Error creating test assessment:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const tabs = [
        { id: 'viewer', label: 'DataStore Viewer' },
        { id: 'test', label: 'Create Test Assessment' }
    ]

    return (
        <Box padding="20px">
            <h2>DataStore Testing</h2>
            <p>This page allows you to test and view the nested datastore structure for DQA360 assessments.</p>

            <TabBar>
                {tabs.map(tab => (
                    <Tab 
                        key={tab.id}
                        selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </Tab>
                ))}
            </TabBar>

            <Box marginTop="20px">
                {activeTab === 'viewer' && (
                    <DataStoreViewer />
                )}

                {activeTab === 'test' && (
                    <Card>
                        <Box padding="16px">
                            <h3>Create Test Assessment</h3>
                            <p>Click the button below to create a test assessment with the nested structure.</p>

                            {error && (
                                <NoticeBox error title="Error">
                                    {error}
                                </NoticeBox>
                            )}

                            {result && (
                                <NoticeBox success title="Success">
                                    Test assessment created successfully! ID: {result.id}
                                    <br />
                                    Structure version: {result.version}
                                    <br />
                                    Check the DataStore Viewer tab to see the results.
                                </NoticeBox>
                            )}

                            <Box marginTop="16px">
                                <Button 
                                    primary 
                                    onClick={createTestAssessment}
                                    loading={loading}
                                    disabled={loading}
                                >
                                    {loading ? 'Creating Test Assessment...' : 'Create Test Assessment'}
                                </Button>
                            </Box>

                            {loading && (
                                <Box marginTop="16px" style={{ display: 'flex', justifyContent: 'center' }}>
                                    <CircularLoader />
                                </Box>
                            )}
                        </Box>
                    </Card>
                )}
            </Box>
        </Box>
    )
}

export default TestDataStore