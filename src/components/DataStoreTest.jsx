import React, { useState } from 'react'
import { Box, Button, Card, CircularLoader, NoticeBox } from '@dhis2/ui'
import { useAssessmentDataStore } from '../services/assessmentDataStoreService'

const DataStoreTest = () => {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    const {
        saveAssessment,
        getAssessments
    } = useAssessmentDataStore()

    const testCreateTestAssessment = async () => {
        setLoading(true)
        setError(null)
        try {
            const testAssessment = {
                id: `test_${Date.now()}`,
                name: 'Test Assessment',
                description: 'Test assessment for DataStore testing',
                status: 'draft'
            }
            
            const result = await saveAssessment(testAssessment, {}, [], [], [], [], [], null)
            setResult({
                action: 'Create Test Assessment',
                success: true,
                data: result
            })
            console.log('Test assessment created:', result)
        } catch (err) {
            setError(`Error creating test assessment: ${err.message}`)
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const testSaveAssessment = async () => {
        setLoading(true)
        setError(null)
        try {
            const testAssessment = {
                id: `test_assessment_${Date.now()}`,
                name: 'Test Assessment',
                description: 'This is a test assessment',
                type: 'baseline',
                status: 'draft',
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }

            const result = await saveAssessment(testAssessment)
            setResult({
                action: 'Save Test Assessment',
                success: true,
                data: result
            })
            console.log('Assessment saved:', result)
        } catch (err) {
            setError(`Error saving assessment: ${err.message}`)
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const testLoadAssessments = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getAssessments()
            setResult({
                action: 'Load All Assessments',
                success: true,
                data: result
            })
            console.log('Assessments loaded:', result)
        } catch (err) {
            setError(`Error loading assessments: ${err.message}`)
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box padding="24px">
            <Card>
                <Box padding="24px">
                    <h2>DataStore Service Test</h2>

                    <Box marginBottom="16px" display="flex" gap="8px" flexWrap="wrap">
                        <Button
                            onClick={testCreateTestAssessment}
                            disabled={loading}
                        >
                            Create Test Assessment
                        </Button>
                        <Button
                            onClick={testSaveAssessment}
                            disabled={loading}
                        >
                            Save Test Assessment
                        </Button>
                        <Button
                            onClick={testLoadAssessments}
                            disabled={loading}
                        >
                            Load Assessments
                        </Button>
                    </Box>

                    {loading && (
                        <Box display="flex" justifyContent="center" padding="24px">
                            <CircularLoader />
                        </Box>
                    )}

                    {error && (
                        <NoticeBox error title="Error">
                            {error}
                        </NoticeBox>
                    )}

                    {result && (
                        <Box marginTop="16px">
                            <NoticeBox
                                success={result.success}
                                error={!result.success}
                                title={`${result.action} - ${result.success ? 'Success' : 'Failed'}`}
                            >
                                <pre style={{
                                    fontSize: '12px',
                                    maxHeight: '300px',
                                    overflow: 'auto',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>
                            </NoticeBox>
                        </Box>
                    )}
                </Box>
            </Card>
        </Box>
    )
}

export default DataStoreTest