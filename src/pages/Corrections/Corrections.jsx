import React from 'react'
import { Box, Card, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

export const Corrections = () => {
    return (
        <Box>
            <h1>{i18n.t('Data Corrections')}</h1>
            <p>{i18n.t('Manage and track data corrections submitted by facilities')}</p>
            
            <Card>
                <Box padding="16px">
                    <h3>{i18n.t('Corrections Management')}</h3>
                    <NoticeBox title={i18n.t('Feature Coming Soon')}>
                        {i18n.t('Correction submission forms, verification workflows, and correction tracking will be available here')}
                    </NoticeBox>
                </Box>
            </Card>
        </Box>
    )
}