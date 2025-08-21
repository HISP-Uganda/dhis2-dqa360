import React, { useState } from 'react'
import { Button, Card, NoticeBox, CircularLoader } from '@dhis2/ui'
import { useTabBasedDataStore } from '../services/tabBasedDataStoreService'

export const AssessmentSaveDebugger = () => {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    
    const { saveAssessment } = useTabBasedDataStore()
    
    const testSaveAssessment = async () => {
        setLoading(true)
        setError(null)
        setResult(null)
        
        try {
            console.log('🧪 Testing assessment save...')
            
            // Create a minimal test assessment
            const testAssessment = {
                id: `test_assessment_${Date.now()}`,
                name: 'Test Assessment',
                description: 'This is a test assessment to debug save functionality',
                status: 'draft',
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                createdBy: 'test-user',
                metadataSource: 'manual',
                selectedDataSets: [],
                selectedDataElements: [],
                selectedOrgUnits: [],
                dhis2Config: null,
                version: '2.0.0'
            }
            
            console.log('📋 Test assessment data:', testAssessment)
            
            // Try to save
            const savedAssessment = await saveAssessment(testAssessment)
            
            console.log('✅ Assessment saved successfully:', savedAssessment)
            setResult({
                success: true,
                message: 'Assessment saved successfully!',
                data: savedAssessment
            })
            
        } catch (error) {
            console.error('❌ Error saving test assessment:', error)
            setError({
                message: error.message || 'Unknown error',
                details: error.details || null,
                stack: error.stack
            })
        } finally {
            setLoading(false)
        }
    }
    
    return (
        <Card style={{ margin: '20px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>
                🧪 Assessment Save Debugger
            </h3>
            
            <p style={{ marginBottom: '16px', color: '#666' }}>
                This component tests the assessment save functionality to help debug any issues.
            </p>
            
            <Button 
                primary 
                onClick={testSaveAssessment}
                loading={loading}
                disabled={loading}
            >
                {loading ? 'Testing Save...' : 'Test Save Assessment'}
            </Button>
            
            {loading && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <CircularLoader small />
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                        Testing assessment save functionality...
                    </p>
                </div>
            )}
            
            {error && (
                <div style={{ marginTop: '16px' }}>
                    <NoticeBox error title="Save Failed">
                        <div>
                            <strong>Error:</strong> {error.message}
                        </div>
                        {error.details && (
                            <div style={{ marginTop: '8px' }}>
                                <strong>Details:</strong>
                                <pre style={{ 
                                    fontSize: '12px', 
                                    backgroundColor: '#f8f9fa', 
                                    padding: '8px', 
                                    borderRadius: '4px',
                                    overflow: 'auto',
                                    maxHeight: '200px'
                                }}>
                                    {JSON.stringify(error.details, null, 2)}
                                </pre>
                            </div>
                        )}
                    </NoticeBox>
                </div>
            )}
            
            {result && result.success && (
                <div style={{ marginTop: '16px' }}>
                    <NoticeBox success title="Save Successful">
                        <div>
                            <strong>Message:</strong> {result.message}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <strong>Assessment ID:</strong> {result.data.id}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <strong>Assessment Name:</strong> {result.data.info?.name || result.data.name}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <strong>Version:</strong> {result.data.version}
                        </div>
                    </NoticeBox>
                </div>
            )}
            
            <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#666'
            }}>
                <strong>Instructions:</strong>
                <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>Click "Test Save Assessment" to test the save functionality</li>
                    <li>Check the browser console for detailed logs</li>
                    <li>If successful, the assessment will be saved to the datastore</li>
                    <li>If failed, error details will be shown above</li>
                </ol>
            </div>
        </Card>
    )
}