import React from 'react'
import { Box, Card, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

export const Reports = () => {
    return (
        <Box>
            <h1>{i18n.t('DQA Reports')}</h1>
            <p>{i18n.t('Generate and export comprehensive data quality assessment reports')}</p>
            
            <Card>
                <Box padding="16px">
                    <h3>{i18n.t('Report Generation')}</h3>
                    <NoticeBox title={i18n.t('Feature Coming Soon')}>
                        {i18n.t('Report templates, export options (PDF/Excel), and report scheduling will be available here')}
                    </NoticeBox>
                </Box>
            </Card>
        </Box>
    )
}