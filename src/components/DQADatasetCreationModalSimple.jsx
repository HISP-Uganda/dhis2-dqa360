import React, { useState, useEffect } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    ButtonStrip,
    CircularLoader,
    NoticeBox,
    LinearLoader
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

// Utility function to generate DHIS2 UIDs
const generateUID = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 11; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Generate 8-character alphanumeric code for dataset codes
const generateDatasetCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// DQA Dataset definitions
const getDQADatasets = (assessmentName, assessmentDescription = '', nameFormat = 'suffix') => {
    const createShortName = (fullName) => {
        return fullName.length <= 50 ? fullName : fullName.substring(0, 47) + '...'
    }

    const formatDatasetName = (assessmentName, datasetType) => {
        if (nameFormat === 'prefix') {
            return `${datasetType} - ${assessmentName}`
        } else {
            return `${assessmentName} - ${datasetType}`
        }
    }

    return {
        register: {
            name: formatDatasetName(assessmentName, 'Register'),
            shortName: createShortName(formatDatasetName(assessmentName, 'Register')),
            code: generateDatasetCode(),
            description: `${assessmentDescription || assessmentName} - Dataset for registering and tracking data quality assessment activities`,
            periodType: 'Monthly'
        },
        summary: {
            name: formatDatasetName(assessmentName, 'Summary'),
            shortName: createShortName(formatDatasetName(assessmentName, 'Summary')),
            code: generateDatasetCode(),
            description: `${assessmentDescription || assessmentName} - Dataset for summarizing data quality assessment results and metrics`,
            periodType: 'Monthly'
        },
        reported: {
            name: formatDatasetName(assessmentName, 'Reported'),
            shortName: createShortName(formatDatasetName(assessmentName, 'Reported')),
            code: generateDatasetCode(),
            description: `${assessmentDescription || assessmentName} - Dataset for reported data values and submission tracking`,
            periodType: 'Monthly'
        },
        corrected: {
            name: formatDatasetName(assessmentName, 'Corrected'),
            shortName: createShortName(formatDatasetName(assessmentName, 'Corrected')),
            code: generateDatasetCode(),
            description: `${assessmentDescription || assessmentName} - Dataset for data corrections and quality improvement actions`,
            periodType: 'Monthly'
        }
    }
}

// Generate data elements based on selected data elements for each dataset type
const generateDQADataElements = (selectedDataElements, assessmentName) => {
    const datasetTypes = {
        register: { suffix: 'REG', prefix: 'Register' },
        summary: { suffix: 'SUM', prefix: 'Summary' },
        reported: { suffix: 'RPT', prefix: 'Reported' },
        corrected: { suffix: 'COR', prefix: 'Corrected' }
    }
    
    const fallbackElements = [
        { 
            name: 'Assessment Status', 
            code: 'ASSESSMENT_STATUS', 
            valueType: 'TEXT', 
            description: 'Current status of the assessment'
        },
        { 
            name: 'Completion Rate', 
            code: 'COMPLETION_RATE', 
            valueType: 'PERCENTAGE', 
            description: 'Percentage of completion'
        },
        { 
            name: 'Quality Score', 
            code: 'QUALITY_SCORE', 
            valueType: 'INTEGER_POSITIVE', 
            description: 'Overall quality score'
        }
    ]
    
    const elementsToUse = selectedDataElements && selectedDataElements.length > 0 ? selectedDataElements : fallbackElements
    const generatedElements = {}
    
    Object.entries(datasetTypes).forEach(([datasetType, config]) => {
        generatedElements[datasetType] = elementsToUse.map((originalElement, index) => {
            const newCode = generateDatasetCode()
            const newUID = generateUID()
            
            const finalName = `${config.suffix} - ${originalElement.name}`.substring(0, 230)
            const finalShortName = `${config.suffix} - ${(originalElement.shortName || originalElement.name)}`.substring(0, 50)
            
            return {
                id: newUID,
                name: finalName,
                code: newCode,
                shortName: finalShortName,
                description: (originalElement.description || originalElement.name).substring(0, 255),
                valueType: originalElement.valueType || 'INTEGER',
                aggregationType: originalElement.aggregationType || 'SUM',
                domainType: 'AGGREGATE',
                categoryCombo: { id: 'bjDvmb4bfuf' },
                zeroIsSignificant: false,
                datasetType: datasetType,
                originalElement: originalElement
            }
        })
    })
    
    return generatedElements
}

export const DQADatasetCreationModalSimple = ({
    open,
    onClose,
    onComplete,
    dhis2Config,
    selectedOrgUnits = [],
    selectedDataElements = [],
    assessmentName = '',
    assessmentDescription = '',
    metadataSource = 'manual'
}) => {
    const dataEngine = useDataEngine()
    const [currentStep, setCurrentStep] = useState(0)
    const [liveProgress, setLiveProgress] = useState([])
    const [error, setError] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const [completed, setCompleted] = useState(false)

    const [nameFormat, setNameFormat] = useState('suffix')
    
    const DQA_DATASETS = getDQADatasets(assessmentName, assessmentDescription, nameFormat)
    const DQA_DATA_ELEMENTS = generateDQADataElements(selectedDataElements, assessmentName)

    const processSteps = [
        'Preparing Metadata',
        'Creating Data Elements',
        'Creating Datasets',
        'Finalizing'
    ]

    const addLiveProgress = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        setLiveProgress(prev => [...prev, { 
            id: Date.now(), 
            message, 
            type,
            timestamp 
        }])
    }

    // Simple metadata creation using batch import
    const createDQAMetadata = async () => {
        if (isCreating) return
        
        setIsCreating(true)
        setError(null)
        setCompleted(false)
        setCurrentStep(0)
        setLiveProgress([])

        const startTime = Date.now()

        try {
            addLiveProgress(`🚀 Starting DQA Dataset Creation...`, 'info')
            addLiveProgress(`📋 Assessment: ${assessmentName}`, 'info')
            addLiveProgress(`📊 Target Datasets: ${Object.keys(DQA_DATASETS).length}`, 'info')
            addLiveProgress(`🔢 Source Data Elements: ${selectedDataElements.length}`, 'info')
            addLiveProgress(`🏢 Organization Units: ${selectedOrgUnits.length}`, 'info')
            addLiveProgress(``, 'info')
            
            setCurrentStep(1)
            addLiveProgress(`> Step 1: Creating Data Elements...`, 'info')
            
            const allCreatedDataElements = []
            const allCreatedDatasets = []
            
            // Create data elements one by one with proper error handling
            for (const [datasetType, elements] of Object.entries(DQA_DATA_ELEMENTS)) {
                addLiveProgress(`  📝 Creating ${datasetType.toUpperCase()} elements...`, 'info')
                
                for (const element of elements) {
                    try {
                        // Simple data element payload
                        const elementPayload = {
                            id: element.id,
                            name: element.name,
                            shortName: element.shortName,
                            code: element.code,
                            description: element.description,
                            valueType: element.valueType,
                            aggregationType: element.aggregationType,
                            domainType: element.domainType,
                            categoryCombo: element.categoryCombo,
                            zeroIsSignificant: element.zeroIsSignificant
                        }
                        
                        const mutation = {
                            resource: 'dataElements',
                            type: 'create',
                            data: elementPayload
                        }
                        
                        await dataEngine.mutate(mutation)
                        allCreatedDataElements.push(element)
                        addLiveProgress(`    ✓ ${element.name} (${element.code})`, 'success')
                        
                    } catch (err) {
                        // If creation fails, try to find existing element
                        addLiveProgress(`    ⚠️ Failed to create ${element.name}: ${err.message}`, 'warning')
                        
                        try {
                            // Try to find existing element by code
                            const query = {
                                dataElements: {
                                    resource: 'dataElements',
                                    params: {
                                        filter: `code:eq:${element.code}`,
                                        fields: 'id,name,code'
                                    }
                                }
                            }
                            
                            const result = await dataEngine.query(query)
                            if (result.dataElements.dataElements.length > 0) {
                                const existingElement = result.dataElements.dataElements[0]
                                allCreatedDataElements.push({...element, id: existingElement.id})
                                addLiveProgress(`    ♻️ Using existing: ${existingElement.name}`, 'reuse')
                            } else {
                                // Generate new code and try again
                                const newCode = generateDatasetCode()
                                const retryElement = {...element, code: newCode}
                                
                                const retryMutation = {
                                    resource: 'dataElements',
                                    type: 'create',
                                    data: {
                                        id: retryElement.id,
                                        name: retryElement.name,
                                        shortName: retryElement.shortName,
                                        code: retryElement.code,
                                        description: retryElement.description,
                                        valueType: retryElement.valueType,
                                        aggregationType: retryElement.aggregationType,
                                        domainType: retryElement.domainType,
                                        categoryCombo: retryElement.categoryCombo,
                                        zeroIsSignificant: retryElement.zeroIsSignificant
                                    }
                                }
                                
                                await dataEngine.mutate(retryMutation)
                                allCreatedDataElements.push(retryElement)
                                addLiveProgress(`    ✓ Created with new code: ${retryElement.name} (${retryElement.code})`, 'success')
                            }
                        } catch (retryErr) {
                            addLiveProgress(`    ❌ Failed to resolve: ${retryErr.message}`, 'error')
                            throw retryErr
                        }
                    }
                }
            }
            
            setCurrentStep(2)
            addLiveProgress(`> Step 2: Creating Datasets...`, 'info')
            
            // Create datasets
            for (const [datasetType, datasetConfig] of Object.entries(DQA_DATASETS)) {
                addLiveProgress(`  📊 Creating ${datasetType.toUpperCase()} dataset...`, 'info')
                
                // Get elements for this dataset
                const datasetElements = allCreatedDataElements.filter(el => el.datasetType === datasetType)
                
                try {
                    const datasetPayload = {
                        id: generateUID(),
                        name: datasetConfig.name,
                        shortName: datasetConfig.shortName,
                        code: datasetConfig.code,
                        description: datasetConfig.description,
                        periodType: datasetConfig.periodType,
                        categoryCombo: { id: 'bjDvmb4bfuf' },
                        dataSetElements: datasetElements.map(de => ({ 
                            dataElement: { id: de.id }
                        })),
                        organisationUnits: selectedOrgUnits.map(ou => ({ id: ou.id }))
                    }
                    
                    const mutation = {
                        resource: 'dataSets',
                        type: 'create',
                        data: datasetPayload
                    }
                    
                    await dataEngine.mutate(mutation)
                    allCreatedDatasets.push(datasetPayload)
                    addLiveProgress(`    ✓ ${datasetConfig.name} (${datasetConfig.code}) - ${datasetElements.length} elements`, 'success')
                    
                } catch (err) {
                    addLiveProgress(`    ❌ Failed to create dataset: ${err.message}`, 'error')
                    
                    // Try to find existing dataset
                    try {
                        const query = {
                            dataSets: {
                                resource: 'dataSets',
                                params: {
                                    filter: `code:eq:${datasetConfig.code}`,
                                    fields: 'id,name,code'
                                }
                            }
                        }
                        
                        const result = await dataEngine.query(query)
                        if (result.dataSets.dataSets.length > 0) {
                            const existingDataset = result.dataSets.dataSets[0]
                            allCreatedDatasets.push({...datasetConfig, id: existingDataset.id})
                            addLiveProgress(`    ♻️ Using existing dataset: ${existingDataset.name}`, 'reuse')
                        } else {
                            throw err
                        }
                    } catch (findErr) {
                        addLiveProgress(`    ❌ Could not resolve dataset conflict`, 'error')
                        throw err
                    }
                }
            }
            
            setCurrentStep(3)
            addLiveProgress(`> Step 3: Finalizing...`, 'info')
            
            const totalTime = (Date.now() - startTime) / 1000
            addLiveProgress(``, 'info')
            addLiveProgress(`🎉 DQA Dataset Creation Completed!`, 'success')
            addLiveProgress(``, 'info')
            addLiveProgress(`📊 SUMMARY:`, 'success')
            addLiveProgress(`   • Datasets: ${allCreatedDatasets.length}`, 'success')
            addLiveProgress(`   • Data Elements: ${allCreatedDataElements.length}`, 'success')
            addLiveProgress(`   • Organization Units: ${selectedOrgUnits.length}`, 'success')
            addLiveProgress(`   • Processing Time: ${totalTime.toFixed(1)}s`, 'success')
            
            setCompleted(true)
            setCurrentStep(4)
            
            if (onComplete) {
                onComplete({
                    categoryOptions: [],
                    categories: [],
                    categoryCombos: [{ id: 'bjDvmb4bfuf', name: 'default' }],
                    dataElements: allCreatedDataElements,
                    datasets: allCreatedDatasets,
                    elementMappings: [],
                    summary: {
                        categoryOptions: 0,
                        categories: 0,
                        categoryCombos: 1,
                        dataElements: allCreatedDataElements.length,
                        datasets: allCreatedDatasets.length,
                        mappings: 0
                    }
                })
            }
            
        } catch (err) {
            console.error('❌ DQA metadata creation failed:', err)
            const totalTime = (Date.now() - startTime) / 1000
            
            addLiveProgress(``, 'error')
            addLiveProgress(`❌ PROCESS FAILED: ${err.message}`, 'error')
            addLiveProgress(`   • Processing Time: ${totalTime.toFixed(1)}s`, 'warning')
            
            setError(err.message)
        } finally {
            setIsCreating(false)
        }
    }

    // Start creation when modal opens
    useEffect(() => {
        if (open && !isCreating && !completed && !error) {
            setCurrentStep(0)
            setLiveProgress([])
            setError(null)
            setIsCreating(false)
            setCompleted(false)
            
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

    return (
        <Modal large open={open} onClose={handleClose}>
            <ModalTitle>
                {i18n.t('Create DQA Datasets')}
            </ModalTitle>
            <ModalContent>
                <div style={{ minHeight: '400px' }}>
                    {/* Processing Indicator */}
                    {isCreating && (
                        <div style={{ 
                            marginBottom: '15px',
                            padding: '12px',
                            backgroundColor: '#e3f2fd',
                            border: '1px solid #2196f3',
                            borderRadius: '4px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <CircularLoader small />
                                <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                                    Processing... Step {currentStep} of {processSteps.length}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {processSteps[currentStep - 1] || 'Initializing...'}
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <NoticeBox error title="Error">
                            {error}
                        </NoticeBox>
                    )}

                    {/* Success Display */}
                    {completed && !error && (
                        <NoticeBox valid title="Success">
                            All DQA datasets and metadata have been created successfully
                        </NoticeBox>
                    )}

                    {/* Progress Output */}
                    <div style={{ 
                        backgroundColor: '#fafafa',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '12px',
                        minHeight: '300px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '12px'
                    }}>
                        {liveProgress.map((item) => (
                            <div key={item.id} style={{
                                marginBottom: '4px',
                                lineHeight: '1.4',
                                color: item.type === 'success' ? '#2e7d32' :
                                       item.type === 'error' ? '#d32f2f' :
                                       item.type === 'warning' ? '#f57c00' :
                                       item.type === 'reuse' ? '#1976d2' :
                                       '#333333'
                            }}>
                                <span style={{ 
                                    color: '#666', 
                                    marginRight: '8px',
                                    fontSize: '10px'
                                }}>
                                    [{item.timestamp}]
                                </span>
                                <span>{item.message}</span>
                            </div>
                        ))}
                        
                        {/* Cursor */}
                        {isCreating && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '10px'
                            }}>
                                <span style={{ marginRight: '8px', color: '#666' }}>
                                    [{new Date().toLocaleTimeString()}]
                                </span>
                                <span style={{ 
                                    backgroundColor: '#00ff00',
                                    color: '#000',
                                    padding: '0 2px',
                                    animation: 'blink 1s infinite'
                                }}>
                                    _
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={handleClose} disabled={isCreating}>
                        {completed ? i18n.t('Close') : i18n.t('Cancel')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
            
            <style jsx>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </Modal>
    )
}