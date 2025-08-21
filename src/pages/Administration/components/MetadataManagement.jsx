import React, { useState, useEffect } from 'react'
import {
    Box,
    Button,
    Card,
    Tab,
    TabBar,
    NoticeBox
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { DHIS2Configuration } from '../../Metadata/DHIS2Configuration'
import { DataElementManagement } from '../../Metadata/DataElementManagement'
import { DataSetManagement } from '../../Metadata/DataSetManagement'
import { OrganisationUnitManagement } from '../../Metadata/OrganisationUnitManagement'
import { AssessmentTemplates } from '../../Metadata/AssessmentTemplates'

export const MetadataManagement = () => {
    const [activeTab, setActiveTab] = useState('dhis2Config')
    const [dhis2Config, setDhis2Config] = useState(null)
    const [selectedDataSet, setSelectedDataSet] = useState(null)
    const [selectedDataElements, setSelectedDataElements] = useState([])
    const [selectedOrgUnits, setSelectedOrgUnits] = useState([])
    const [isEditingConfig, setIsEditingConfig] = useState(false)

    return (
        <Box>
            <Box marginBottom="24px">
                <p>{i18n.t('Start by selecting a dataset, then view its data elements, select organisation units, and create assessment templates')}</p>
            </Box>

            <Card>
                <Box padding="16px">
                    <TabBar>
                        <Tab
                            selected={activeTab === 'dhis2Config'}
                            onClick={() => setActiveTab('dhis2Config')}
                        >
                            {dhis2Config?.configured ? '✅ ' : ''}{i18n.t('1. DHIS2 Configuration')}
                        </Tab>
                        <Tab
                            selected={activeTab === 'dataSets'}
                            onClick={() => setActiveTab('dataSets')}
                            disabled={!dhis2Config?.configured}
                        >
                            {i18n.t('2. Data Sets')}
                        </Tab>
                        <Tab
                            selected={activeTab === 'dataElements'}
                            onClick={() => setActiveTab('dataElements')}
                            disabled={!dhis2Config?.configured || !selectedDataSet}
                        >
                            {i18n.t('3. Data Elements')}
                        </Tab>
                        <Tab
                            selected={activeTab === 'organisationUnits'}
                            onClick={() => setActiveTab('organisationUnits')}
                            disabled={!dhis2Config?.configured || !selectedDataSet}
                        >
                            {i18n.t('4. Organisation Units')}
                        </Tab>
                        <Tab
                            selected={activeTab === 'templates'}
                            onClick={() => setActiveTab('templates')}
                            disabled={!dhis2Config?.configured || !selectedDataSet || selectedDataElements.length === 0 || selectedOrgUnits.length === 0}
                        >
                            {i18n.t('5. Assessment Templates')}
                        </Tab>
                    </TabBar>
                </Box>
                
                <Box padding="16px">
                    {activeTab === 'dhis2Config' && (
                        <DHIS2Configuration 
                            isEditing={isEditingConfig}
                            onConfigured={(config) => {
                                setDhis2Config(config)
                                // Only auto-navigate to next step if this is initial configuration, not editing
                                if (config?.configured && !isEditingConfig) {
                                    setActiveTab('dataSets')
                                }
                                // Reset editing flag after configuration
                                setIsEditingConfig(false)
                            }}
                        />
                    )}
                    {activeTab === 'dataSets' && (
                        <DataSetManagement 
                            dhis2Config={dhis2Config}
                            onDataSetSelect={(dataSet) => {
                                setSelectedDataSet(dataSet)
                                setActiveTab('dataElements')
                            }}
                        />
                    )}
                    {activeTab === 'dataElements' && (
                        <DataElementManagement 
                            dhis2Config={dhis2Config}
                            selectedDataSet={selectedDataSet}
                            onDataElementsSelect={(dataElements) => {
                                setSelectedDataElements(dataElements)
                                setActiveTab('organisationUnits')
                            }}
                        />
                    )}
                    {activeTab === 'organisationUnits' && (
                        <OrganisationUnitManagement 
                            dhis2Config={dhis2Config}
                            selectedDataSet={selectedDataSet}
                            selectedDataElements={selectedDataElements}
                            onCreateTemplate={(data) => {
                                setSelectedOrgUnits(data.organisationUnits)
                                setActiveTab('templates')
                            }}
                        />
                    )}
                    {activeTab === 'templates' && (
                        <AssessmentTemplates 
                            dhis2Config={dhis2Config}
                            selectedDataSet={selectedDataSet}
                            selectedDataElements={selectedDataElements}
                            selectedOrgUnits={selectedOrgUnits}
                            onEditConfiguration={() => {
                                setIsEditingConfig(true)
                                setActiveTab('dhis2Config')
                            }}
                        />
                    )}
                </Box>
            </Card>
        </Box>
    )
}