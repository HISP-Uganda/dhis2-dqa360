import React from 'react'
import { Box, Card, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

export const Discrepancies = () => {
    return (
        <Box>
            <h1>{i18n.t('Data Quality Discrepancies')}</h1>
            <p>{i18n.t('Review and manage data quality issues identified during assessments')}</p>
            
            <Card>
                <Box padding="16px">
                    <h3>{i18n.t('Discrepancy Management')}</h3>
                    <NoticeBox title={i18n.t('Feature Coming Soon')}>
                        {i18n.t('Discrepancy detection and management tools will be available here')}
                    </NoticeBox>
                </Box>
            </Card>
        </Box>
    )
}