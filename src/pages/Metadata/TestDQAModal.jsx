import React, { useState } from 'react'
import { DQADatasetCreationModal } from '../../components/DQADatasetCreationModal'
import { Box, Button, Card, InputField } from '@dhis2/ui'

export const TestDQAModal = () => {
    const [showModal, setShowModal] = useState(false)
    const [testData, setTestData] = useState({
        assessmentName: 'Test DQA Assessment - Modal Only',
        selectedDataElements: [
            {
                id: 'test1',
                name: 'Test Data Element 1',
                displayName: 'Test Data Element 1',
                code: 'TEST_DE_1',
                valueType: 'INTEGER',
                aggregationType: 'SUM',
                categoryCombo: {
                    id: 'bjDvmb4bfuf',
                    name: 'default',
                    code: 'default'
                }
            },
            {
                id: 'test2',
                name: 'Test Data Element 2',
                displayName: 'Test Data Element 2',
                code: 'TEST_DE_2',
                valueType: 'PERCENTAGE',
                aggregationType: 'AVERAGE',
                categoryCombo: {
                    id: 'bjDvmb4bfuf',
                    name: 'default',
                    code: 'default'
                }
            }
        ],
        selectedOrgUnits: [
            {
                id: 'org1',
                name: 'Test Facility 1',
                displayName: 'Test Facility 1',
                code: 'TEST_FAC_1',
                level: 4
            },
            {
                id: 'org2',
                name: 'Test Facility 2',
                displayName: 'Test Facility 2',
                code: 'TEST_FAC_2',
                level: 4
            }
        ]
    })

    const handleComplete = (result) => {
        console.log('DQA Modal completed:', result)
        alert('DQA Dataset creation completed successfully!')
        setShowModal(false)
    }

    return (
        <Box 
            padding="24px" 
            style={{ 
                backgroundColor: '#ffffff',
                minHeight: '100vh'
            }}
        >
            <Card>
                <Box padding="24px">
                    <h1>DQA Dataset Creation Modal Test</h1>
                    
                    <Box marginBottom="16px">
                        <p>This page tests the DQADatasetCreationModal component in isolation.</p>
                    </Box>
                    
                    <Box marginBottom="16px">
                        <InputField
                            label="Assessment Name"
                            value={testData.assessmentName}
                            onChange={({ value }) => setTestData(prev => ({ ...prev, assessmentName: value }))}
                        />
                    </Box>
                    
                    <Box marginBottom="16px">
                        <p><strong>Test Data:</strong></p>
                        <ul>
                            <li>Data Elements: {testData.selectedDataElements.length}</li>
                            <li>Organization Units: {testData.selectedOrgUnits.length}</li>
                            <li>Instance Type: Local DHIS2</li>
                        </ul>
                    </Box>
                    
                    <Button primary onClick={() => setShowModal(true)}>
                        🏗️ Test DQA Dataset Creation Modal
                    </Button>
                </Box>
            </Card>

            {/* DQA Dataset Creation Modal */}
            {showModal && (
                <DQADatasetCreationModal
                    open={showModal}
                    onClose={() => setShowModal(false)}
                    onComplete={handleComplete}
                    dhis2Config={null} // Local instance
                    selectedOrgUnits={testData.selectedOrgUnits}
                    selectedDataElements={testData.selectedDataElements}
                    assessmentName={testData.assessmentName}
                    assessmentDescription={`Test assessment for DQA modal functionality`}
                    metadataSource="manual"
                />
            )}
        </Box>
    )
}