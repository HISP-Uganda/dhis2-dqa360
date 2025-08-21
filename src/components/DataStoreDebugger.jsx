import React, { useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import { Button, Card, NoticeBox } from '@dhis2/ui'

export const DataStoreDebugger = () => {
    const engine = useDataEngine()
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    
    const checkDataStore = async () => {
        setLoading(true)
        setResult(null)
        
        try {
            console.log('🔍 Comprehensive dataStore scan...')
            
            // First, try to get all available namespaces
            let allNamespaces = []
            try {
                const namespacesResult = await engine.query({
                    data: { resource: 'dataStore' }
                })
                allNamespaces = namespacesResult.data || []
                console.log('📋 All available namespaces:', allNamespaces)
            } catch (e) {
                console.warn('Could not get all namespaces:', e.message)
            }
            
            // Check common DQA360 related namespaces
            const namespacesToCheck = [
                'DQA360_ASSESSMENTS',  // New tab-based format
                'DQA360',              // Old flat format
                'dqa360',
                'assessments',
                'ASSESSMENTS',
                ...allNamespaces.filter(ns => 
                    ns.toLowerCase().includes('dqa') || 
                    ns.toLowerCase().includes('assessment') ||
                    ns.toLowerCase().includes('360') ||
                    ns.toLowerCase().includes('metadata')
                )
            ]
            
            // Remove duplicates
            const uniqueNamespaces = [...new Set(namespacesToCheck)]
            console.log('🔍 Checking namespaces:', uniqueNamespaces)
            
            const report = { 
                allNamespaces: allNamespaces,
                checkedNamespaces: {}
            }
            
            for (const namespace of uniqueNamespaces) {
                try {
                    const keysResult = await engine.query({
                        data: { resource: `dataStore/${namespace}` }
                    })
                    
                    const keys = keysResult.data || []
                    report.checkedNamespaces[namespace] = { 
                        keys, 
                        count: keys.length, 
                        samples: [],
                        status: 'found'
                    }
                    
                    console.log(`📂 ${namespace}: ${keys.length} keys found`)
                    
                    // Get samples from keys that might be assessments
                    let assessmentKeys = keys.filter(key => 
                        key.toLowerCase().includes('assessment') ||
                        key.includes('_') ||
                        key.length > 10 // Likely to be assessment IDs
                    ).slice(0, 3)
                    
                    // Special handling for assessment-related keys
                    if (keys.includes('assessments')) {
                        assessmentKeys = ['assessments', ...assessmentKeys.filter(k => k !== 'assessments')].slice(0, 3)
                    }
                    
                    for (const key of assessmentKeys) {
                        try {
                            const dataResult = await engine.query({
                                data: { resource: `dataStore/${namespace}/${key}` }
                            })
                            
                            const data = dataResult.data
                            
                            // Special handling for 'assessments' key which might contain an array
                            if (key === 'assessments' && Array.isArray(data)) {
                                report.checkedNamespaces[namespace].samples.push({
                                    key,
                                    name: `Array of ${data.length} assessments`,
                                    hasTabStructure: false,
                                    hasOldStructure: data.some(item => item.selectedDataSets || item.selectedDataElements),
                                    hasAssessmentData: data.length > 0,
                                    version: 'Array format',
                                    id: 'Multiple assessments',
                                    structure: data.length > 0 ? Object.keys(data[0]).slice(0, 10) : [],
                                    dataSize: JSON.stringify(data).length,
                                    isAssessmentArray: true,
                                    assessmentCount: data.length,
                                    sampleAssessment: data.length > 0 ? {
                                        name: data[0].name,
                                        id: data[0].id,
                                        hasDataSets: !!(data[0].selectedDataSets?.length),
                                        hasDataElements: !!(data[0].selectedDataElements?.length)
                                    } : null
                                })
                            } else {
                                report.checkedNamespaces[namespace].samples.push({
                                    key,
                                    name: data.name || data.info?.name || data.title || 'No name',
                                    hasTabStructure: !!(data.info && data.dhis2Config),
                                    hasOldStructure: !!(data.selectedDataSets || data.selectedDataElements),
                                    hasAssessmentData: !!(data.name || data.selectedDataSets || data.info?.name),
                                    version: data.version,
                                    id: data.id,
                                    structure: Object.keys(data).slice(0, 10),
                                    dataSize: JSON.stringify(data).length
                                })
                            }
                        } catch (e) {
                            report.checkedNamespaces[namespace].samples.push({ 
                                key, 
                                error: e.message 
                            })
                        }
                    }
                } catch (e) {
                    report.checkedNamespaces[namespace] = { 
                        error: e.message,
                        status: 'not_found'
                    }
                }
            }
            
            console.log('📊 Comprehensive DataStore Report:', report)
            setResult(report)
            
        } catch (error) {
            console.error('❌ Error in comprehensive scan:', error)
            setResult({ error: error.message })
        } finally {
            setLoading(false)
        }
    }
    
    return (
        <Card style={{ margin: '20px 0', padding: '20px' }}>
            <h3>🔍 DataStore Structure Check</h3>
            <Button primary onClick={checkDataStore} loading={loading}>
                Check DataStore
            </Button>
            
            {result && (
                <div style={{ marginTop: '16px' }}>
                    {result.error ? (
                        <NoticeBox error title="Error">
                            {result.error}
                        </NoticeBox>
                    ) : (
                        <div>
                            {/* Show all available namespaces */}
                            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#e8f4fd', borderRadius: '4px' }}>
                                <h4 style={{ margin: '0 0 8px 0' }}>🌐 All Available Namespaces ({result.allNamespaces?.length || 0})</h4>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    {result.allNamespaces?.length > 0 ? (
                                        result.allNamespaces.join(', ')
                                    ) : (
                                        'No namespaces found or access denied'
                                    )}
                                </div>
                            </div>

                            {/* Show checked namespaces */}
                            <h4>🔍 Checked Namespaces:</h4>
                            {Object.entries(result.checkedNamespaces || {}).map(([namespace, data]) => (
                                <div key={namespace} style={{ 
                                    marginBottom: '16px', 
                                    padding: '12px', 
                                    border: '1px solid #ddd', 
                                    borderRadius: '4px',
                                    backgroundColor: data.status === 'found' ? '#f0f8f0' : '#fff5f5'
                                }}>
                                    <h4 style={{ margin: '0 0 8px 0' }}>
                                        📂 {namespace} 
                                        {data.status === 'found' ? (
                                            <span style={{ color: 'green', fontSize: '12px' }}> ✅ FOUND</span>
                                        ) : (
                                            <span style={{ color: 'red', fontSize: '12px' }}> ❌ NOT FOUND</span>
                                        )}
                                    </h4>
                                    
                                    {data.error ? (
                                        <p style={{ color: 'red', fontSize: '12px', margin: '4px 0' }}>
                                            Error: {data.error}
                                        </p>
                                    ) : (
                                        <div>
                                            <p style={{ margin: '4px 0' }}>
                                                <strong>Keys found:</strong> {data.count}
                                            </p>
                                            
                                            {data.keys?.length > 0 && (
                                                <div style={{ fontSize: '11px', marginBottom: '8px', color: '#666' }}>
                                                    <strong>All keys:</strong> {data.keys.slice(0, 10).join(', ')}
                                                    {data.keys.length > 10 && ` ... and ${data.keys.length - 10} more`}
                                                </div>
                                            )}
                                            
                                            {data.samples?.length > 0 && (
                                                <div>
                                                    <strong style={{ fontSize: '12px' }}>Assessment-like Data:</strong>
                                                    {data.samples.map((sample, i) => (
                                                        <div key={i} style={{ 
                                                            fontSize: '10px', 
                                                            backgroundColor: sample.hasAssessmentData ? '#e8f5e8' : '#f8f8f8', 
                                                            padding: '6px', 
                                                            margin: '4px 0',
                                                            borderRadius: '3px',
                                                            border: sample.hasAssessmentData ? '1px solid #4caf50' : '1px solid #ddd'
                                                        }}>
                                                            <div><strong>Key:</strong> {sample.key}</div>
                                                            <div><strong>Name:</strong> {sample.name}</div>
                                                            <div><strong>ID:</strong> {sample.id || 'N/A'}</div>
                                                            <div><strong>Version:</strong> {sample.version || 'N/A'}</div>
                                                            <div><strong>Assessment Data:</strong> {sample.hasAssessmentData ? '✅ YES' : '❌ NO'}</div>
                                                            <div><strong>New Format:</strong> {sample.hasTabStructure ? '✅' : '❌'}</div>
                                                            <div><strong>Old Format:</strong> {sample.hasOldStructure ? '✅' : '❌'}</div>
                                                            {sample.isAssessmentArray && (
                                                                <div style={{ backgroundColor: '#fff3cd', padding: '4px', borderRadius: '2px', margin: '2px 0' }}>
                                                                    <div><strong>🎯 ASSESSMENT ARRAY FOUND!</strong></div>
                                                                    <div><strong>Count:</strong> {sample.assessmentCount} assessments</div>
                                                                    {sample.sampleAssessment && (
                                                                        <div>
                                                                            <div><strong>Sample:</strong> {sample.sampleAssessment.name}</div>
                                                                            <div><strong>Has DataSets:</strong> {sample.sampleAssessment.hasDataSets ? '✅' : '❌'}</div>
                                                                            <div><strong>Has DataElements:</strong> {sample.sampleAssessment.hasDataElements ? '✅' : '❌'}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div><strong>Structure:</strong> {sample.structure?.join(', ') || 'N/A'}</div>
                                                            <div><strong>Size:</strong> {sample.dataSize ? `${sample.dataSize} chars` : 'N/A'}</div>
                                                            {sample.error && <div style={{color: 'red'}}><strong>Error:</strong> {sample.error}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Card>
    )
}