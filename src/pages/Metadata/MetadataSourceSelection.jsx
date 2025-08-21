import React, { useState } from 'react'
import {
    Box,
    Button,
    ButtonStrip,
    Card,
    Radio,
    NoticeBox,
    Divider
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { DHIS2Configuration } from './DHIS2Configuration'
import ManualMetadataCreation from './ManualMetadataCreation'

const MetadataSourceSelection = ({ onMetadataSelected, onBack }) => {
    const [selectedSource, setSelectedSource] = useState('dhis2') // 'dhis2' or 'manual'
    const [showConfiguration, setShowConfiguration] = useState(false)
    const [dhis2Config, setDhis2Config] = useState(null)

    const handleSourceSelection = () => {
        if (selectedSource === 'dhis2') {
            setShowConfiguration(true)
        } else {
            // For manual creation, we'll show the manual metadata creation component
            setShowConfiguration(true)
        }
    }

    const handleDHIS2ConfigComplete = (config) => {
        setDhis2Config(config)
        onMetadataSelected({
            source: 'dhis2',
            config: config
        })
    }

    const handleManualMetadataComplete = (metadata) => {
        onMetadataSelected({
            source: 'manual',
            metadata: metadata
        })
    }

    if (showConfiguration) {
        if (selectedSource === 'dhis2') {
            return (
                <DHIS2Configuration 
                    value={dhis2Config}
                    onChange={handleDHIS2ConfigComplete}
                    onBack={() => setShowConfiguration(false)}
                />
            )
        } else {
            return (
                <ManualMetadataCreation
                    onMetadataCreated={handleManualMetadataComplete}
                    onClose={() => setShowConfiguration(false)}
                />
            )
        }
    }

    return (
        <Box>
            <Box marginBottom="24px">
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#212934' }}>
                    {i18n.t('Choose Metadata Source')}
                </h2>
                <Box marginTop="8px" fontSize="14px" color="#6c757d">
                    {i18n.t('Select how you want to provide metadata for your assessment')}
                </Box>
            </Box>

            <Box display="flex" flexDirection="column" gap="24px">
                {/* DHIS2 Connection Option */}
                <Card>
                    <Box padding="24px">
                        <Box display="flex" alignItems="flex-start" gap="16px">
                            <Radio
                                checked={selectedSource === 'dhis2'}
                                onChange={() => setSelectedSource('dhis2')}
                                value="dhis2"
                                name="metadataSource"
                            />
                            <Box flex="1">
                                <Box marginBottom="8px">
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>
                                        {i18n.t('External DHIS2 instance')}
                                    </h3>
                                </Box>
                                <Box marginBottom="16px" fontSize="14px" color="#6c757d">
                                    {i18n.t('Pull datasets, data elements, and organization units directly from an external DHIS2 instance')}
                                </Box>
                                
                                <Box marginBottom="16px">
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#212934' }}>
                                        {i18n.t('Advantages:')}
                                    </h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#6c757d' }}>
                                        <li>{i18n.t('Access to existing metadata and configurations')}</li>
                                        <li>{i18n.t('Automatic synchronization with DHIS2 structure')}</li>
                                        <li>{i18n.t('Real-time data validation against DHIS2 standards')}</li>
                                        <li>{i18n.t('Seamless integration with existing workflows')}</li>
                                    </ul>
                                </Box>

                                <NoticeBox>
                                    {i18n.t('Requires network connection and valid DHIS2 credentials')}
                                </NoticeBox>
                            </Box>
                        </Box>
                    </Box>
                </Card>

                {/* Manual Creation Option */}
                <Card>
                    <Box padding="24px">
                        <Box display="flex" alignItems="flex-start" gap="16px">
                            <Radio
                                checked={selectedSource === 'manual'}
                                onChange={() => setSelectedSource('manual')}
                                value="manual"
                                name="metadataSource"
                            />
                            <Box flex="1">
                                <Box marginBottom="8px">
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>
                                        {i18n.t('Local (This instance)')}
                                    </h3>
                                </Box>
                                <Box marginBottom="16px" fontSize="14px" color="#6c757d">
                                    {i18n.t('Use metadata from this local DHIS2 instance. Access existing datasets, data elements, and organization units from the current system.')}
                                </Box>
                                
                                <Box marginBottom="16px">
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#212934' }}>
                                        {i18n.t('Advantages:')}
                                    </h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#6c757d' }}>
                                        <li>{i18n.t('Direct access to local metadata')}</li>
                                        <li>{i18n.t('No additional network configuration required')}</li>
                                        <li>{i18n.t('Uses existing organizational structure')}</li>
                                        <li>{i18n.t('Leverages current DHIS2 setup and permissions')}</li>
                                    </ul>
                                </Box>

                                <NoticeBox>
                                    {i18n.t('Uses metadata from the current DHIS2 instance you are logged into')}
                                </NoticeBox>
                            </Box>
                        </Box>
                    </Box>
                </Card>
            </Box>

            <Divider margin="32px 0" />

            <ButtonStrip>
                <Button primary onClick={handleSourceSelection}>
                    {selectedSource === 'dhis2' ? i18n.t('Configure External DHIS2 Connection') : i18n.t('Use Local Instance Metadata')}
                </Button>
                <Button onClick={onBack}>
                    {i18n.t('Back')}
                </Button>
            </ButtonStrip>
        </Box>
    )
}

export default MetadataSourceSelection