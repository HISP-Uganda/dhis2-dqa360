import React from 'react'
import { Card, Box } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'

const StatCard = styled(Card)`
    min-width: 200px;
    text-align: center;
`

const StatNumber = styled.div`
    font-size: 2rem;
    font-weight: bold;
    color: #2c6693;
    margin-bottom: 8px;
`

const StatLabel = styled.div`
    color: #666;
    font-size: 0.9rem;
`

const StatItem = ({ number, label, color = '#2c6693' }) => (
    <StatCard>
        <Box padding="16px">
            <StatNumber style={{ color }}>{number}</StatNumber>
            <StatLabel>{label}</StatLabel>
        </Box>
    </StatCard>
)

export const DashboardStats = () => {
    // Mock data - in real app, this would come from API
    const stats = [
        { number: '24', label: i18n.t('Active Assessments'), color: '#2c6693' },
        { number: '156', label: i18n.t('Facilities'), color: '#4caf50' },
        { number: '89', label: i18n.t('Discrepancies Found'), color: '#ff9800' },
        { number: '67', label: i18n.t('Corrections Pending'), color: '#f44336' },
        { number: '92%', label: i18n.t('Data Quality Score'), color: '#4caf50' }
    ]

    return (
        <>
            {stats.map((stat, index) => (
                <StatItem
                    key={index}
                    number={stat.number}
                    label={stat.label}
                    color={stat.color}
                />
            ))}
        </>
    )
}