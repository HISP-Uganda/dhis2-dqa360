import React, { useState } from 'react'
import { 
    Card, 
    Box, 
    Button, 
    NoticeBox, 
    Tag,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useSmsService } from '../services/smsService'

export const SMSIntegrationTest = () => {
    const { setupSmsForDatasets } = useSmsService()
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState([])
    const [error, setError] = useState(null)

    // Test datasets (simulating Register, Summary, and Correction datasets)
    const testDatasets = [
        {
            id: 'test_register_001',
            name: 'DQA Register Dataset',
            displayName: 'DQA Register Dataset',
            code: 'DQA_REG'
        },
        {
            id: 'test_summary_001', 
            name: 'DQA Summary Dataset',
            displayName: 'DQA Summary Dataset',
            code: 'DQA_SUM'
        },
        {
            id: 'test_correction_001',
            name: 'DQA Correction Dataset', 
            displayName: 'DQA Correction Dataset',
            code: 'DQA_COR'
        },
        {
            id: 'test_other_001',
            name: 'Other Dataset',
            displayName: 'Other Dataset', 
            code: 'OTHER'
        }
    ]

    const handleTestSmsSetup = async () => {
        setLoading(true)
        setError(null)
        setResults([])

        try {
            console.log('Testing SMS setup with datasets:', testDatasets)
            const smsResults = await setupSmsForDatasets({ datasets: testDatasets })
            console.log('SMS setup results:', smsResults)
            setResults(smsResults)
        } catch (err) {
            console.error('SMS setup test failed:', err)
            setError(err.message || 'SMS setup test failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <Box padding="24px">
                <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                    📱 SMS Integration Test
                </h2>
                
                <p style={{ margin: '0 0 24px 0', color: '#6C7B7F' }}>
                    Test the SMS reporting setup functionality with sample datasets.
                </p>

                <Box marginBottom="24px">
                    <Button 
                        primary 
                        onClick={handleTestSmsSetup}
                        loading={loading}
                        disabled={loading}
                    >
                        {loading ? 'Testing SMS Setup...' : 'Test SMS Setup'}
                    </Button>
                </Box>

                {error && (
                    <Box marginBottom="16px">
                        <NoticeBox error title="Test Failed">
                            {error}
                        </NoticeBox>
                    </Box>
                )}

                {results.length > 0 && (
                    <Box>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500 }}>
                            Test Results
                        </h3>
                        
                        <NoticeBox title="SMS Setup Results">
                            {i18n.t('SMS commands generated for {{count}} eligible datasets', {
                                count: results.length
                            })}
                        </NoticeBox>

                        <Box marginTop="16px">
                            <DataTable>
                                <DataTableHead>
                                    <DataTableRow>
                                        <DataTableColumnHeader>Dataset</DataTableColumnHeader>
                                        <DataTableColumnHeader>SMS Keyword</DataTableColumnHeader>
                                        <DataTableColumnHeader>Elements</DataTableColumnHeader>
                                        <DataTableColumnHeader>Status</DataTableColumnHeader>
                                    </DataTableRow>
                                </DataTableHead>
                                <DataTableBody>
                                    {results.map(result => (
                                        <DataTableRow key={result.datasetId}>
                                            <DataTableCell>
                                                {result.datasetName}
                                            </DataTableCell>
                                            <DataTableCell>
                                                <Tag positive>{result.keyword}</Tag>
                                            </DataTableCell>
                                            <DataTableCell>
                                                {result.elementCount || Object.keys(result.codes || {}).length} elements
                                            </DataTableCell>
                                            <DataTableCell>
                                                <Tag positive>{result.status}</Tag>
                                            </DataTableCell>
                                        </DataTableRow>
                                    ))}
                                </DataTableBody>
                            </DataTable>
                        </Box>
                    </Box>
                )}

                <Box marginTop="24px">
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500 }}>
                        Test Datasets
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6C7B7F' }}>
                        The following datasets will be used for testing. Only Register, Summary, and Correction datasets should generate SMS commands.
                    </p>
                    
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>Dataset Name</DataTableColumnHeader>
                                <DataTableColumnHeader>Code</DataTableColumnHeader>
                                <DataTableColumnHeader>Expected SMS</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {testDatasets.map(dataset => {
                                const shouldGenerateSms = dataset.name.toLowerCase().includes('register') ||
                                                        dataset.name.toLowerCase().includes('summary') ||
                                                        dataset.name.toLowerCase().includes('correction')
                                return (
                                    <DataTableRow key={dataset.id}>
                                        <DataTableCell>{dataset.name}</DataTableCell>
                                        <DataTableCell>
                                            <code>{dataset.code}</code>
                                        </DataTableCell>
                                        <DataTableCell>
                                            {shouldGenerateSms ? (
                                                <Tag positive>Yes</Tag>
                                            ) : (
                                                <Tag neutral>No</Tag>
                                            )}
                                        </DataTableCell>
                                    </DataTableRow>
                                )
                            })}
                        </DataTableBody>
                    </DataTable>
                </Box>
            </Box>
        </Card>
    )
}

export default SMSIntegrationTest