import React, { useState } from 'react'
import { Box, Card } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { AssessmentDataSetSelection } from '../components/AssessmentDataSetSelection'

export const TestMultiSelect = () => {
    const [dhis2Config, setDhis2Config] = useState({
        baseUrl: 'https://play.dhis2.org/40.2.2',
        username: 'admin',
        password: 'district'
    })
    const [selectedDataSets, setSelectedDataSets] = useState([])
    const [selectedDataElements, setSelectedDataElements] = useState([])

    return (
        <Box padding="24px">
            <Card style={{ padding: '24px', marginBottom: '24px' }}>
                <h1>{i18n.t('Multi-Select Dataset Test')}</h1>
                <p>{i18n.t('This page tests the multi-select functionality for datasets.')}</p>
                
                <div style={{ marginBottom: '16px' }}>
                    <strong>{i18n.t('Selected Datasets')}: {selectedDataSets.length}</strong>
                    {selectedDataSets.map(ds => (
                        <div key={ds.id} style={{ marginLeft: '16px', fontSize: '14px' }}>
                            • {ds.displayName}
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <strong>{i18n.t('Selected Data Elements')}: {selectedDataElements.length}</strong>
                </div>
            </Card>

            <Card style={{ padding: '24px', marginBottom: '24px' }}>
                <h2>{i18n.t('Dataset Selection (Multi-Select Mode)')}</h2>
                <AssessmentDataSetSelection
                    dhis2Config={dhis2Config}
                    multiSelect={true}
                    selectedDataSets={selectedDataSets}
                    onDataSetsSelected={setSelectedDataSets}
                    mode="datasets"
                />
            </Card>

            <Card style={{ padding: '24px' }}>
                <h2>{i18n.t('Data Element Selection')}</h2>
                <AssessmentDataSetSelection
                    dhis2Config={dhis2Config}
                    multiSelect={true}
                    selectedDataSets={selectedDataSets}
                    onDataSetsSelected={setSelectedDataSets}
                    selectedDataElements={selectedDataElements}
                    onDataElementsSelected={setSelectedDataElements}
                    mode="dataelements"
                />
            </Card>
        </Box>
    )
}