import React from 'react'
import i18n from '@dhis2/d2-i18n'
import { Card, NoticeBox } from '@dhis2/ui'

export const Help = () => {
    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>
                {i18n.t('Help & Documentation')}
            </h1>
            
            <div style={{ display: 'grid', gap: 24 }}>
                <Card>
                    <div style={{ padding: 24 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
                            {i18n.t('Getting Started')}
                        </h2>
                        <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
                            {i18n.t('DQA360 is a comprehensive data quality assessment tool for DHIS2. Use this application to:')}
                        </p>
                        <ul style={{ marginLeft: 20, lineHeight: 1.8 }}>
                            <li>{i18n.t('Create and manage data quality assessments')}</li>
                            <li>{i18n.t('Analyze data quality across different dimensions')}</li>
                            <li>{i18n.t('Generate comprehensive reports')}</li>
                            <li>{i18n.t('Configure metadata and organizational units')}</li>
                        </ul>
                    </div>
                </Card>

                <Card>
                    <div style={{ padding: 24 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
                            {i18n.t('Quick Navigation')}
                        </h2>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                                <strong>{i18n.t('Dashboard')}</strong> - {i18n.t('Overview of your assessments and system status')}
                            </div>
                            <div>
                                <strong>{i18n.t('Assessments')}</strong> - {i18n.t('View and manage existing assessments')}
                            </div>
                            <div>
                                <strong>{i18n.t('Manage Assessments')}</strong> - {i18n.t('Create new assessments with step-by-step wizard')}
                            </div>
                            <div>
                                <strong>{i18n.t('DQA Data')}</strong> - {i18n.t('Access and review assessment data')}
                            </div>
                            <div>
                                <strong>{i18n.t('DQA Analysis')}</strong> - {i18n.t('Perform detailed data quality analysis')}
                            </div>
                            <div>
                                <strong>{i18n.t('Reports')}</strong> - {i18n.t('Generate and export assessment reports')}
                            </div>
                            <div>
                                <strong>{i18n.t('Metadata')}</strong> - {i18n.t('Configure datasets, data elements, and organizational units')}
                            </div>
                        </div>
                    </div>
                </Card>

                <NoticeBox title={i18n.t('Need More Help?')}>
                    {i18n.t('For detailed documentation and support, please contact your system administrator or refer to the DHIS2 DQA360 documentation.')}
                </NoticeBox>
            </div>
        </div>
    )
}