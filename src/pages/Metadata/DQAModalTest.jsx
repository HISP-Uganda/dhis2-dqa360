import React, { useState } from 'react'
import { DQADatasetCreationModal } from '../../components/DQADatasetCreationModal'
import { Box, Button, Card, InputField } from '@dhis2/ui'

export const DQAModalTest = () => {
    const [showModal, setShowModal] = useState(false)
    const [result, setResult] = useState(null)
    
    const testData = {
        assessmentName: 'Test DQA Assessment',
        assessmentDescription: 'This is a test assessment to verify the DQA Dataset Creation Modal functionality',
        selectedDataElements: [
            {
                id: 'FTRrcoaog83',
                name: 'Accute Flaccid Paralysis (AFP) cases',
                displayName: 'Accute Flaccid Paralysis (AFP) cases',
                code: 'DE_359596',
                valueType: 'INTEGER_POSITIVE',
                aggregationType: 'SUM',
                categoryCombo: {
                    id: 'bjDvmb4bfuf',
                    name: 'default',
                    code: 'default'
                }
            },
            {
                id: 'P3jJH5Tu5VC',
                name: 'Acute Flaccid Paralysis (AFP) follow-up',
                displayName: 'Acute Flaccid Paralysis (AFP) follow-up',
                code: 'DE_359597',
                valueType: 'INTEGER_POSITIVE',
                aggregationType: 'SUM',
                categoryCombo: {
                    id: 'bjDvmb4bfuf',
                    name: 'default',
                    code: 'default'
                }
            },
            {
                id: 'FQ2o8UBlcrS',
                name: 'Births attended by skilled health personnel',
                displayName: 'Births attended by skilled health personnel',
                code: 'DE_359598',
                valueType: 'INTEGER_POSITIVE',
                aggregationType: 'SUM',
                categoryCombo: {
                    id: 'O4VaNks6tta',
                    name: 'Births',
                    code: 'BIRTHS'
                }
            }
        ],
        selectedOrgUnits: [
            {
                id: 'DiszpKrYNg8',
                name: 'Ngelehun CHC',
                displayName: 'Ngelehun CHC',
                code: 'OU_559',
                level: 4
            },
            {
                id: 'jUb8gELQApl',
                name: 'CHP Mahera',
                displayName: 'CHP Mahera',
                code: 'OU_560',
                level: 4
            },
            {
                id: 'TEQlaapDQoK',
                name: 'CHP Malen',
                displayName: 'CHP Malen',
                code: 'OU_561',
                level: 4
            }
        ]
    }

    const handleModalComplete = (result) => {
        console.log('🎉 DQA Modal completed with result:', result)
        setResult(result)
        setShowModal(false)
    }

    const handleModalClose = () => {
        console.log('❌ DQA Modal closed')
        setShowModal(false)
    }

    return (
        <Box padding="24px">
            <Card>
                <Box padding="24px">
                    <h1>DQA Dataset Creation Modal Test</h1>
                    
                    <Box marginBottom="24px">
                        <h3>Test Configuration:</h3>
                        <ul>
                            <li><strong>Assessment Name:</strong> {testData.assessmentName}</li>
                            <li><strong>Data Elements:</strong> {testData.selectedDataElements.length} (with different category combinations)</li>
                            <li><strong>Organization Units:</strong> {testData.selectedOrgUnits.length}</li>
                        </ul>
                    </Box>

                    <Box marginBottom="24px">
                        <h3>Data Elements with Category Combinations:</h3>
                        {testData.selectedDataElements.map((de, index) => (
                            <Box key={de.id} marginBottom="8px" padding="12px" style={{ backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <div><strong>{de.name}</strong></div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    Code: {de.code} | Category Combo: {de.categoryCombo.name} ({de.categoryCombo.id})
                                </div>
                            </Box>
                        ))}
                    </Box>

                    <Box marginBottom="24px">
                        <Button primary onClick={() => setShowModal(true)}>
                            Test DQA Dataset Creation Modal
                        </Button>
                    </Box>

                    {result && (
                        <Box marginTop="24px">
                            <Card>
                                <Box padding="16px">
                                    <h3>✅ Modal Result:</h3>
                                    <pre style={{ 
                                        backgroundColor: '#f8f9fa', 
                                        padding: '12px', 
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        overflow: 'auto',
                                        maxHeight: '400px'
                                    }}>
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </Box>
                            </Card>
                        </Box>
                    )}

                    <DQADatasetCreationModal
                        open={showModal}
                        onClose={handleModalClose}
                        onComplete={handleModalComplete}
                        assessmentName={testData.assessmentName}
                        assessmentDescription={testData.assessmentDescription}
                        selectedDataElements={testData.selectedDataElements}
                        selectedOrgUnits={testData.selectedOrgUnits}
                        metadataSource="manual"
                    />
                </Box>
            </Card>
        </Box>
    )
}