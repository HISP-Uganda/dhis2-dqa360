import React, { useState, useEffect } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'

// DQA Data Elements Templates
const DQA_DATA_ELEMENTS = {
    register: [
        {
            name: 'DQA Register - Facilities Assessed',
            code: 'DQA_REG_FAC_ASSESSED',
            shortName: 'Facilities Assessed',
            description: 'Number of facilities assessed in DQA',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'DQA Register - Data Elements Reviewed',
            code: 'DQA_REG_DE_REVIEWED',
            shortName: 'Data Elements Reviewed',
            description: 'Number of data elements reviewed in DQA',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        }
    ],
    summary: [
        {
            name: 'DQA Summary - Overall Score',
            code: 'DQA_SUM_OVERALL_SCORE',
            shortName: 'Overall Score',
            description: 'Overall DQA score percentage',
            valueType: 'PERCENTAGE',
            aggregationType: 'AVERAGE'
        },
        {
            name: 'DQA Summary - Completeness Rate',
            code: 'DQA_SUM_COMPLETENESS',
            shortName: 'Completeness Rate',
            description: 'Data completeness rate percentage',
            valueType: 'PERCENTAGE',
            aggregationType: 'AVERAGE'
        }
    ],
    reported: [
        {
            name: 'DQA Reported - Issues Identified',
            code: 'DQA_RPT_ISSUES_ID',
            shortName: 'Issues Identified',
            description: 'Number of data quality issues identified',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'DQA Reported - Recommendations Made',
            code: 'DQA_RPT_RECOMMENDATIONS',
            shortName: 'Recommendations Made',
            description: 'Number of recommendations made',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        }
    ],
    corrected: [
        {
            name: 'DQA Corrected - Issues Resolved',
            code: 'DQA_COR_ISSUES_RESOLVED',
            shortName: 'Issues Resolved',
            description: 'Number of data quality issues resolved',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        },
        {
            name: 'DQA Corrected - Improvement Actions',
            code: 'DQA_COR_IMPROVEMENTS',
            shortName: 'Improvement Actions',
            description: 'Number of improvement actions implemented',
            valueType: 'INTEGER_POSITIVE',
            aggregationType: 'SUM'
        }
    ]
}

// Utility function to generate 6-character alphanumeric codes
const generateUID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export const DQADatasetCreationModal = ({ 
    open, 
    onClose, 
    assessmentName, 
    selectedOrgUnits = [] 
}) => {
    const dataEngine = useDataEngine()
    
    // State management
    const [isCreating, setIsCreating] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [error, setError] = useState(null)
    const [currentStep, setCurrentStep] = useState(0)
    const [progress, setProgress] = useState({ current: 0, total: 4, message: '' })
    const [liveProgress, setLiveProgress] = useState([])

    // Add live progress message
    const addLiveProgress = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        const newItem = {
            id: Date.now() + Math.random(),
            timestamp,
            message,
            type
        }
        setLiveProgress(prev => [...prev, newItem])
    }

    // Check if metadata already exists
    const checkExistingMetadata = async (type, code) => {
        if (!code) return null
        
        try {
            let resource = ''
            switch (type) {
                case 'dataElement':
                    resource = 'dataElements'
                    break
                case 'dataSet':
                    resource = 'dataSets'
                    break
                default:
                    return null
            }

            const query = {
                [resource]: {
                    resource: resource,
                    params: {
                        fields: 'id,name,code,shortName,displayName',
                        filter: `code:eq:${code}`,
                        pageSize: 1
                    }
                }
            }

            const result = await dataEngine.query(query)
            const items = result[resource][resource]
            return items && items.length > 0 ? items[0] : null
        } catch (err) {
            console.warn(`Could not check existing ${type} with code ${code}:`, err)
            return null
        }
    }

    // Check by name as well (fallback)
    const checkExistingMetadataByName = async (type, name) => {
        if (!name) return null
        
        try {
            let resource = ''
            switch (type) {
                case 'dataElement':
                    resource = 'dataElements'
                    break
                case 'dataSet':
                    resource = 'dataSets'
                    break
                default:
                    return null
            }

            const query = {
                [resource]: {
                    resource: resource,
                    params: {
                        fields: 'id,name,code,shortName,displayName',
                        filter: `name:eq:${name}`,
                        pageSize: 1
                    }
                }
            }

            const result = await dataEngine.query(query)
            const items = result[resource][resource]
            return items && items.length > 0 ? items[0] : null
        } catch (err) {
            console.warn(`Could not check existing ${type} by name ${name}:`, err)
            return null
        }
    }

    // Create a single dataset with all its dependencies
    const createDatasetWithDependencies = async (datasetType, datasetNumber, totalDatasets) => {
        addLiveProgress(`  🔍 Checking dataset requirements...`, 'info')
        
        // 1. Get data elements for this dataset type
        const dataElementTemplates = DQA_DATA_ELEMENTS[datasetType] || []
        addLiveProgress(`  📊 Found ${dataElementTemplates.length} data elements to process`, 'info')
        
        const createdDataElements = []
        
        // 2. Process each data element and its dependencies
        for (let i = 0; i < dataElementTemplates.length; i++) {
            const template = dataElementTemplates[i]
            const elementNumber = i + 1
            
            addLiveProgress(`    📈 Element ${elementNumber}/${dataElementTemplates.length}: ${template.name}`, 'info')
            
            try {
                // Check if data element already exists
                let existingElement = await checkExistingMetadata('dataElement', template.code)
                if (!existingElement) {
                    existingElement = await checkExistingMetadataByName('dataElement', template.name)
                }
                
                if (existingElement) {
                    addLiveProgress(`    ♻️ Using existing data element: ${existingElement.name}`, 'reuse')
                    createdDataElements.push(existingElement)
                    continue
                }
                
                // Create the data element with default category combo
                const dataElement = {
                    id: generateUID(),
                    name: template.name,
                    code: template.code,
                    shortName: template.shortName || template.name.substring(0, 50),
                    description: template.description,
                    valueType: template.valueType || 'NUMBER',
                    aggregationType: template.aggregationType || 'SUM',
                    domainType: 'AGGREGATE',
                    categoryCombo: { id: 'bjDvmb4bfuf' } // default combo
                }
                
                const mutation = {
                    resource: 'dataElements',
                    type: 'create',
                    data: dataElement
                }
                
                await dataEngine.mutate(mutation)
                createdDataElements.push(dataElement)
                addLiveProgress(`    ✅ Created data element: ${dataElement.name}`, 'success')
                
            } catch (error) {
                addLiveProgress(`    ❌ Failed to create data element: ${template.name} - ${error.message}`, 'error')
                throw error
            }
        }
        
        // 3. Create the dataset
        addLiveProgress(`  📋 Creating dataset: ${datasetType}`, 'info')
        
        const datasetConfig = {
            register: {
                name: `${assessmentName} - Register`,
                code: generateUID(),
                description: `${assessmentName} - Dataset for registering and tracking data quality assessment activities`,
                periodType: 'Monthly'
            },
            summary: {
                name: `${assessmentName} - Summary`,
                code: generateUID(),
                description: `${assessmentName} - Dataset for summarizing data quality assessment results and metrics`,
                periodType: 'Monthly'
            },
            reported: {
                name: `${assessmentName} - Reported`,
                code: generateUID(),
                description: `${assessmentName} - Dataset for reported data values and submission tracking`,
                periodType: 'Monthly'
            },
            corrected: {
                name: `${assessmentName} - Corrected`,
                code: generateUID(),
                description: `${assessmentName} - Dataset for data corrections and quality improvement actions`,
                periodType: 'Monthly'
            }
        }[datasetType]
        
        // Check if dataset already exists
        let existingDataset = await checkExistingMetadata('dataSet', datasetConfig.code)
        if (!existingDataset) {
            existingDataset = await checkExistingMetadataByName('dataSet', datasetConfig.name)
        }
        
        if (existingDataset) {
            addLiveProgress(`  ♻️ Using existing dataset: ${existingDataset.name}`, 'reuse')
            return existingDataset
        }
        
        // Create new dataset
        const dataset = {
            id: generateUID(),
            name: datasetConfig.name,
            code: datasetConfig.code,
            shortName: datasetConfig.name.substring(0, 50),
            description: datasetConfig.description,
            periodType: datasetConfig.periodType,
            dataSetElements: createdDataElements.map(de => ({
                dataElement: { id: de.id },
                categoryCombo: { id: 'bjDvmb4bfuf' }
            })),
            organisationUnits: selectedOrgUnits.map(ou => ({ id: ou.id }))
        }
        
        const mutation = {
            resource: 'dataSets',
            type: 'create',
            data: dataset
        }
        
        await dataEngine.mutate(mutation)
        addLiveProgress(`  ✅ Created dataset: ${dataset.name} with ${createdDataElements.length} data elements`, 'success')
        
        return dataset
    }

    // Main creation process - Dataset-focused approach
    const createDQAMetadata = async () => {
        setIsCreating(true)
        setError(null)
        setCurrentStep(0)

        try {
            addLiveProgress(`🚀 Starting DQA metadata creation for: ${assessmentName}`, 'info')
            
            // Dataset types to create
            const datasetTypes = ['register', 'summary', 'reported', 'corrected']
            const createdDatasets = []
            
            addLiveProgress(`📊 Creating ${datasetTypes.length} DQA datasets...`, 'info')
            
            for (let i = 0; i < datasetTypes.length; i++) {
                const datasetType = datasetTypes[i]
                const datasetNumber = i + 1
                
                addLiveProgress(`\n📋 Dataset ${datasetNumber}/${datasetTypes.length}: ${datasetType.toUpperCase()}`, 'info')
                
                try {
                    // Create dataset with dependencies
                    const dataset = await createDatasetWithDependencies(datasetType, datasetNumber, datasetTypes.length)
                    createdDatasets.push(dataset)
                    
                    addLiveProgress(`✅ Dataset ${datasetNumber} completed: ${dataset.name}`, 'success')
                    setCurrentStep(datasetNumber)
                    setProgress({ current: datasetNumber, total: datasetTypes.length, message: `Created ${datasetNumber}/${datasetTypes.length} datasets` })
                    
                } catch (error) {
                    addLiveProgress(`❌ Dataset ${datasetNumber} failed: ${error.message}`, 'error')
                    throw error
                }
            }
            
            addLiveProgress(`\n🎉 All ${createdDatasets.length} datasets created successfully!`, 'success')
            setProgress({ current: datasetTypes.length, total: datasetTypes.length, message: 'All datasets created successfully!' })
            setCompleted(true)
            
            console.log('✅ DQA metadata creation completed successfully!')
            addLiveProgress(`🎉 DQA metadata creation completed successfully for: ${assessmentName}`, 'success')
            
        } catch (err) {
            console.error('❌ DQA metadata creation failed:', err)
            setError(err.message)
            addLiveProgress(`❌ Creation failed: ${err.message}`, 'error')
        } finally {
            setIsCreating(false)
        }
    }

    // Start creation when modal opens
    useEffect(() => {
        if (open && !isCreating && !completed && !error) {
            // Reset state first
            setCurrentStep(0)
            setProgress({ current: 0, total: 4, message: '' })
            setLiveProgress([])
            setError(null)
            setIsCreating(false)
            setCompleted(false)
            
            // Start creation after a short delay
            setTimeout(() => {
                createDQAMetadata()
            }, 1000)
        }
    }, [open])

    const handleClose = () => {
        if (!isCreating) {
            onClose()
        }
    }

    if (!open) return null

    return (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.8)', 
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '1200px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
                {/* Terminal Header */}
                <div style={{
                    backgroundColor: '#2d2d2d',
                    padding: '12px 20px',
                    borderBottom: '1px solid #404040',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <span style={{ marginRight: '8px' }}>🏗️</span>
                        Creating DQA Datasets - {assessmentName}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }}></div>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }}></div>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27ca3f' }}></div>
                    </div>
                </div>

                {/* Terminal Content */}
                <div style={{
                    flex: 1,
                    backgroundColor: '#1e1e1e',
                    padding: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Progress Bar */}
                    {progress.total > 0 && (
                        <div style={{ 
                            marginBottom: '20px',
                            padding: '12px 16px',
                            backgroundColor: '#2d2d2d',
                            borderRadius: '6px',
                            border: '1px solid #404040'
                        }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '8px'
                            }}>
                                <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                                    Progress: {progress.current}/{progress.total} datasets
                                </span>
                                <span style={{ color: '#00ff00', fontSize: '14px' }}>
                                    {Math.round((progress.current / progress.total) * 100)}%
                                </span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: '#404040',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${(progress.current / progress.total) * 100}%`,
                                    height: '100%',
                                    backgroundColor: '#00ff00',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div style={{ 
                            marginBottom: '20px',
                            padding: '16px',
                            backgroundColor: '#2d1b1b',
                            border: '1px solid #ff4444',
                            borderRadius: '6px'
                        }}>
                            <div style={{ color: '#ff4444', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                                ❌ Creation Failed
                            </div>
                            <div style={{ color: '#ffaaaa', fontSize: '14px' }}>
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Success Display */}
                    {completed && !error && (
                        <div style={{ 
                            marginBottom: '20px',
                            padding: '16px',
                            backgroundColor: '#1b2d1b',
                            border: '1px solid #44ff44',
                            borderRadius: '6px'
                        }}>
                            <div style={{ color: '#44ff44', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                                ✅ Creation Completed Successfully
                            </div>
                            <div style={{ color: '#aaffaa', fontSize: '14px' }}>
                                All DQA datasets have been created successfully!
                            </div>
                        </div>
                    )}

                    {/* Terminal Output */}
                    <div style={{
                        flex: 1,
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #404040',
                        borderRadius: '6px',
                        padding: '16px',
                        overflow: 'auto',
                        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                        fontSize: '13px',
                        lineHeight: '1.4'
                    }}>
                        {liveProgress.length === 0 && (
                            <div style={{ color: '#888888', fontStyle: 'italic' }}>
                                Waiting for process to start...
                            </div>
                        )}
                        
                        {liveProgress.map((item, index) => {
                            const isLastItem = index === liveProgress.length - 1
                            return (
                                <div key={item.id} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    marginBottom: item.message.startsWith('\n') ? '12px' : '4px',
                                    opacity: isLastItem && isCreating ? 1 : 0.9
                                }}>
                                    <span style={{ 
                                        color: '#666666', 
                                        marginRight: '12px',
                                        minWidth: '80px',
                                        fontSize: '11px'
                                    }}>
                                        {item.timestamp}
                                    </span>
                                    <span style={{ 
                                        color: item.type === 'success' ? '#00ff00' :
                                               item.type === 'error' ? '#ff4444' :
                                               item.type === 'warning' ? '#ffaa00' :
                                               item.type === 'reuse' ? '#00aaff' :
                                               '#ffffff',
                                        flex: 1,
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {item.message.replace(/^\n/, '')}
                                    </span>
                                </div>
                            )
                        })}
                        
                        {isCreating && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '8px',
                                color: '#00ff00'
                            }}>
                                <span style={{ marginRight: '8px' }}>▶</span>
                                <span style={{ animation: 'blink 1s infinite' }}>Processing...</span>
                            </div>
                        )}
                    </div>

                    {/* Terminal Footer */}
                    <div style={{
                        marginTop: '16px',
                        padding: '12px 16px',
                        backgroundColor: '#2d2d2d',
                        borderRadius: '6px',
                        border: '1px solid #404040',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ color: '#888888', fontSize: '12px' }}>
                            DQA Dataset Creation Terminal
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isCreating}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: isCreating ? '#404040' : '#ff5f56',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: isCreating ? 'not-allowed' : 'pointer',
                                opacity: isCreating ? 0.5 : 1
                            }}
                        >
                            {isCreating ? 'Creating...' : 'Close'}
                        </button>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </div>
    )
}

export default DQADatasetCreationModal