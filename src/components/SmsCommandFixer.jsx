import React, { useState } from 'react'
import { Button, NoticeBox, LinearLoader } from '@dhis2/ui'
import { useDataEngine } from '@dhis2/app-runtime'
import { fixAllSmsCommandCOCs, analyzeSmsCommandCOCs } from '../utils/smsCommandFixer'

/**
 * SMS Command Fixer Component
 * 
 * This component provides a UI to analyze and fix SMS commands that were created
 * with incorrect COCs (Category Option Combos).
 */
const SmsCommandFixer = ({ createdDatasets, onFixed }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isFixing, setIsFixing] = useState(false)
    const [analysis, setAnalysis] = useState(null)
    const [fixResults, setFixResults] = useState(null)
    const [error, setError] = useState(null)
    
    const engine = useDataEngine()
    
    const analyzeCommands = async () => {
        setIsAnalyzing(true)
        setError(null)
        
        try {
            const analysisResults = await analyzeSmsCommandCOCs(engine, createdDatasets)
            setAnalysis(analysisResults)
        } catch (err) {
            setError(`Analysis failed: ${err.message}`)
        } finally {
            setIsAnalyzing(false)
        }
    }
    
    const fixCommands = async () => {
        setIsFixing(true)
        setError(null)
        
        try {
            const results = await fixAllSmsCommandCOCs(engine, createdDatasets)
            setFixResults(results)
            onFixed?.(results)
        } catch (err) {
            setError(`Fix failed: ${err.message}`)
        } finally {
            setIsFixing(false)
        }
    }
    
    const hasIssues = analysis?.some(a => a.needsFix) || false
    const totalIssues = analysis?.reduce((sum, a) => sum + (a.issues?.length || 0), 0) || 0
    
    return (
        <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
                🔧 SMS Command COC Fixer
            </h3>
            
            <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: '14px' }}>
                This tool analyzes and fixes SMS commands that may be using incorrect Category Option Combos (COCs).
                Data elements with non-default category combos should have SMS codes like A1, A2, A3, A4 instead of simple letters.
            </p>
            
            {error && (
                <NoticeBox error title="Error">
                    {error}
                </NoticeBox>
            )}
            
            {isAnalyzing && (
                <div style={{ marginBottom: '16px' }}>
                    <LinearLoader />
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                        Analyzing SMS commands...
                    </p>
                </div>
            )}
            
            {isFixing && (
                <div style={{ marginBottom: '16px' }}>
                    <LinearLoader />
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                        Fixing SMS commands...
                    </p>
                </div>
            )}
            
            {analysis && (
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                        📊 Analysis Results
                    </h4>
                    
                    {hasIssues ? (
                        <NoticeBox warning title={`Found ${totalIssues} COC issues in ${analysis.filter(a => a.needsFix).length} SMS commands`}>
                            <div style={{ marginTop: '8px' }}>
                                {analysis.filter(a => a.needsFix).map((item, idx) => (
                                    <div key={idx} style={{ marginBottom: '8px' }}>
                                        <strong>{item.datasetType.toUpperCase()}</strong> ({item.keyword}): {item.issues.length} issues
                                        <ul style={{ margin: '4px 0 0 16px', fontSize: '12px' }}>
                                            {item.issues.slice(0, 3).map((issue, i) => (
                                                <li key={i}>
                                                    Code <code>{issue.code}</code> using default COC but DE has category combo
                                                </li>
                                            ))}
                                            {item.issues.length > 3 && (
                                                <li>... and {item.issues.length - 3} more</li>
                                            )}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </NoticeBox>
                    ) : (
                        <NoticeBox valid title="No COC issues found">
                            All SMS commands are using correct Category Option Combos.
                        </NoticeBox>
                    )}
                </div>
            )}
            
            {fixResults && (
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                        ✅ Fix Results
                    </h4>
                    
                    <NoticeBox valid title={`Successfully fixed ${fixResults.filter(r => r.success).length} SMS commands`}>
                        <div style={{ marginTop: '8px' }}>
                            {fixResults.filter(r => r.success).map((result, idx) => (
                                <div key={idx} style={{ marginBottom: '4px', fontSize: '12px' }}>
                                    <strong>Command {result.commandId}</strong>: Updated {result.updatedCodes.length} SMS codes
                                </div>
                            ))}
                            {fixResults.filter(r => !r.success).length > 0 && (
                                <div style={{ marginTop: '8px', color: '#b91c1c' }}>
                                    <strong>Failed:</strong>
                                    {fixResults.filter(r => !r.success).map((result, idx) => (
                                        <div key={idx} style={{ fontSize: '12px' }}>
                                            Command {result.commandId}: {result.error}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </NoticeBox>
                </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button 
                    secondary 
                    onClick={analyzeCommands}
                    disabled={isAnalyzing || isFixing}
                >
                    {isAnalyzing ? 'Analyzing...' : '🔍 Analyze SMS Commands'}
                </Button>
                
                {hasIssues && (
                    <Button 
                        primary 
                        onClick={fixCommands}
                        disabled={isAnalyzing || isFixing}
                    >
                        {isFixing ? 'Fixing...' : '🔧 Fix COC Issues'}
                    </Button>
                )}
                
                {analysis && !hasIssues && (
                    <span style={{ color: '#065f46', fontSize: '14px', fontWeight: 500 }}>
                        ✅ No fixes needed
                    </span>
                )}
            </div>
        </div>
    )
}

export default SmsCommandFixer