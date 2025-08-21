import React from 'react'
import {
    Box,
    NoticeBox,
    Button
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

export const AssessmentTemplates = ({ 
    dhis2Config, 
    selectedDataSet, 
    selectedDataElements, 
    selectedOrgUnits,
    onEditConfiguration 
}) => {
    return (
        <Box>
            <h3 style={{ margin: '0 0 16px 0' }}>
                {i18n.t('Assessment Templates')}
            </h3>
            
            <NoticeBox info title={i18n.t('Coming Soon')}>
                {i18n.t('Assessment template creation functionality will be available here. This will allow you to create reusable templates for data quality assessments based on your selected metadata.')}
            </NoticeBox>

            <Box marginTop="24px">
                <h4>{i18n.t('Selected Configuration Summary:')}</h4>
                <ul>
                    <li><strong>{i18n.t('Dataset')}:</strong> {selectedDataSet?.displayName || selectedDataSet?.name}</li>
                    <li><strong>{i18n.t('Data Elements')}:</strong> {selectedDataElements?.length || 0} {i18n.t('selected')}</li>
                    <li><strong>{i18n.t('Organisation Units')}:</strong> {selectedOrgUnits?.length || 0} {i18n.t('selected')}</li>
                </ul>
            </Box>

            <Box marginTop="24px">
                <Button onClick={onEditConfiguration}>
                    {i18n.t('Edit Configuration')}
                </Button>
            </Box>
        </Box>
    )
}