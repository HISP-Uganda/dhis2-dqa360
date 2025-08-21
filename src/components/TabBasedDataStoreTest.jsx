import React, { useState } from 'react'
import { useTabBasedDataStore } from '../services/tabBasedDataStoreService'
import { Button, Box, Card, CardContent, CircularLoader } from '@dhis2/ui'

export const TabBasedDataStoreTest = () => {
    const { saveAssessment, loadAssessment, loadAllAssessments, updateAssessmentTab } = useTabBasedDataStore()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)

    const testSaveAssessment = async () => {
        setLoading(true)
        try {
            const testAssessment = {
                id: 'test-assessment-' + Date.now(),
                name: 'Test Tab-Based Assessment',
                description: 'Testing the new tab-based structure',
                frequency: 'monthly',
                period: '2024',
                status: 'draft',
                createdBy: 'test-user',
                dhis2Config: {
                    baseUrl: 'https://test.dhis2.org',
                    username: 'test',
                    connectionStatus: 'connected'
                },
                selectedDataSets: ['ds1', 'ds2'],
                selectedDataElements: ['de1', 'de2', 'de3'],
                selectedOrgUnits: ['ou1', 'ou2'],
                orgUnitMappings: [
                    { source: 'ou1', target: 'local-ou1' },
                    { source: 'ou2', target: 'local-ou2' }
                ],
                datasets: {
                    register: { id: 'reg-ds', name: 'Register Dataset' },
                    summary: { id: 'sum-ds', name: 'Summary Dataset' },
                    reported: { id: 'rep-ds', name: 'Reported Dataset' },
                    correction: { id: 'cor-ds', name: 'Correction Dataset' }
                },
                dataElements: {
                    register: [{ id: 'de1', name: 'Data Element 1' }],
                    summary: [{ id: 'de2', name: 'Data Element 2' }]
                }
            }

            const savedAssessment = await saveAssessment(testAssessment)
            setResult({
                type: 'success',
                message: 'Assessment saved successfully with tab-based structure!',
                data: savedAssessment
            })
        } catch (error) {
            setResult({
                type: 'error',
                message: 'Error saving assessment: ' + error.message,
                data: error
            })
        } finally {
            setLoading(false)
        }
    }

    const testLoadAllAssessments = async () => {
        setLoading(true)
        try {
            const assessments = await loadAllAssessments()
            setResult({
                type: 'success',
                message: `Loaded ${assessments.length} assessments`,
                data: assessments
            })
        } catch (error) {
            setResult({
                type: 'error',
                message: 'Error loading assessments: ' + error.message,
                data: error
            })
        } finally {
            setLoading(false)
        }
    }

    const testUpdateTab = async () => {
        setLoading(true)
        try {
            // First, get all assessments to find one to update
            const assessments = await loadAllAssessments()
            if (assessments.length === 0) {
                throw new Error('No assessments found to update')
            }

            const assessmentId = assessments[0].id
            const updatedTabData = {
                name: 'Updated Assessment Name',
                description: 'Updated description via tab update',
                lastModifiedBy: 'tab-update-test'
            }

            const updatedAssessment = await updateAssessmentTab(assessmentId, 'info', updatedTabData)
            setResult({
                type: 'success',
                message: 'Assessment tab updated successfully!',
                data: updatedAssessment
            })
        } catch (error) {
            setResult({
                type: 'error',
                message: 'Error updating assessment tab: ' + error.message,
                data: error
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardContent>
                <Box>
                    <h3>Tab-Based DataStore Test</h3>
                    <p>Test the new tab-based assessment structure</p>
                    
                    <Box display="flex" gap="8px" marginBottom="16px">
                        <Button onClick={testSaveAssessment} disabled={loading}>
                            Test Save Assessment
                        </Button>
                        <Button onClick={testLoadAllAssessments} disabled={loading}>
                            Test Load All Assessments
                        </Button>
                        <Button onClick={testUpdateTab} disabled={loading}>
                            Test Update Tab
                        </Button>
                    </Box>

                    {loading && (
                        <Box display="flex" alignItems="center" gap="8px">
                            <CircularLoader small />
                            <span>Processing...</span>
                        </Box>
                    )}

                    {result && (
                        <Box marginTop="16px">
                            <h4 style={{ color: result.type === 'success' ? 'green' : 'red' }}>
                                {result.type === 'success' ? '✅ Success' : '❌ Error'}
                            </h4>
                            <p>{result.message}</p>
                            <details>
                                <summary>View Data</summary>
                                <pre style={{ 
                                    background: '#f5f5f5', 
                                    padding: '10px', 
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    overflow: 'auto',
                                    maxHeight: '300px'
                                }}>
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>
                            </details>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    )
}