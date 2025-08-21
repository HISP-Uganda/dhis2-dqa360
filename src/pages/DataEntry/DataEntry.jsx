import React, { useState } from 'react'
import {
    Box,
    Card,
    Tab,
    TabBar,
    Button,
    ButtonStrip,
    NoticeBox
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

export const DataEntry = () => {
    const [activeTab, setActiveTab] = useState('register')

    return (
        <Box>
            <Box marginBottom="24px">
                <h1>{i18n.t('Data Entry')}</h1>
                <p>{i18n.t('Enter register and summary data for comparison with DHIS2')}</p>
            </Box>

            <Card>
                <Box padding="16px">
                    <TabBar>
                        <Tab
                            selected={activeTab === 'register'}
                            onClick={() => setActiveTab('register')}
                        >
                            {i18n.t('Register Data')}
                        </Tab>
                        <Tab
                            selected={activeTab === 'summary'}
                            onClick={() => setActiveTab('summary')}
                        >
                            {i18n.t('Summary Data')}
                        </Tab>
                    </TabBar>
                </Box>
                <Box padding="16px">
                    {activeTab === 'register' && (
                        <Box>
                            <h3>{i18n.t('Register Data Entry')}</h3>
                            <p>{i18n.t('Enter data as recorded in facility registers')}</p>
                            <NoticeBox title={i18n.t('Feature Coming Soon')}>
                                {i18n.t('Register data entry forms will be available here')}
                            </NoticeBox>
                        </Box>
                    )}
                    {activeTab === 'summary' && (
                        <Box>
                            <h3>{i18n.t('Summary Data Entry')}</h3>
                            <p>{i18n.t('Enter data as recorded in facility summary reports')}</p>
                            <NoticeBox title={i18n.t('Feature Coming Soon')}>
                                {i18n.t('Summary data entry forms will be available here')}
                            </NoticeBox>
                        </Box>
                    )}
                </Box>
            </Card>
        </Box>
    )
}