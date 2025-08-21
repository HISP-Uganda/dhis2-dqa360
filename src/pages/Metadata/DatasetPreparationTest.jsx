import React from 'react'
import { Card, Button } from '@dhis2/ui'
// import { DatasetPreparation } from './DatasetPreparation'
const DatasetPreparation = () => (
    <div style={{ padding: 20, border: '1px dashed #ccc' }}>
        <p>DatasetPreparation is not available in this build.</p>
    </div>
)

// Test component for DatasetPreparation
export const DatasetPreparationTest = () => {
    // Mock test data
    const mockProps = {
        assessmentId: 'test-assessment-123',
        assessmentName: 'Test Assessment',
        selectedDataElements: [
            {
                id: 'test-de-1',
                name: 'Test Data Element 1',
                shortName: 'Test DE 1',
                valueType: 'INTEGER',
                aggregationType: 'SUM'
            },
            {
                id: 'test-de-2', 
                name: 'Test Data Element 2',
                shortName: 'Test DE 2',
                valueType: 'INTEGER',
                aggregationType: 'SUM'
            }
        ],
        selectedOrgUnits: [
            {
                id: 'test-ou-1',
                name: 'Test Org Unit 1'
            }
        ],
        period: '2024',
        frequency: 'Monthly',
        dhis2Config: {
            url: 'https://play.im.dhis2.org/stable-2-41-4-1',
            username: 'admin',
            password: 'district'
        },
        onFinish: () => {
            console.log('Test: Dataset preparation finished')
        }
    }

    return (
        <div style={{ padding: '20px' }}>
            <Card style={{ marginBottom: '20px', padding: '20px' }}>
                <h2>Dataset Preparation Test</h2>
                <p>This is a test page for the DatasetPreparation component.</p>
                <Button onClick={() => console.log('Test props:', mockProps)}>
                    Log Test Props
                </Button>
            </Card>
            
            <DatasetPreparation {...mockProps} />
        </div>
    )
}

export default DatasetPreparationTest