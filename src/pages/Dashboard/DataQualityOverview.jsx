import React from 'react'
import { Card, Box } from '@dhis2/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import i18n from '@dhis2/d2-i18n'

export const DataQualityOverview = () => {
    // Mock data - in real app, this would come from API
    const data = [
        { name: 'Jan', quality: 85, discrepancies: 12 },
        { name: 'Feb', quality: 88, discrepancies: 8 },
        { name: 'Mar', quality: 92, discrepancies: 6 },
        { name: 'Apr', quality: 89, discrepancies: 10 },
        { name: 'May', quality: 94, discrepancies: 4 },
        { name: 'Jun', quality: 91, discrepancies: 7 }
    ]

    return (
        <Card>
            <Box padding="16px">
                <h3>{i18n.t('Data Quality Trends')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="quality" fill="#4caf50" name={i18n.t('Quality Score (%)')} />
                        <Bar dataKey="discrepancies" fill="#ff9800" name={i18n.t('Discrepancies')} />
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Card>
    )
}