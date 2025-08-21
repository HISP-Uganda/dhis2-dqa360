import React from 'react'
import { Card, Box } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'

const ActivityItem = styled.div`
    padding: 12px 0;
    border-bottom: 1px solid #e0e0e0;
    
    &:last-child {
        border-bottom: none;
    }
`

const ActivityTime = styled.div`
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 4px;
`

const ActivityText = styled.div`
    font-size: 0.9rem;
    color: #333;
`

export const RecentActivity = () => {
    // Mock data - in real app, this would come from API
    const activities = [
        {
            time: '2 hours ago',
            text: i18n.t('New discrepancy reported at Health Center A')
        },
        {
            time: '4 hours ago',
            text: i18n.t('Correction submitted for Facility B')
        },
        {
            time: '6 hours ago',
            text: i18n.t('Assessment completed for District C')
        },
        {
            time: '1 day ago',
            text: i18n.t('Notification sent to 15 facilities')
        },
        {
            time: '2 days ago',
            text: i18n.t('New assessment created for Q4 2024')
        }
    ]

    return (
        <Card>
            <Box padding="16px">
                <h3>{i18n.t('Recent Activity')}</h3>
                {activities.map((activity, index) => (
                    <ActivityItem key={index}>
                        <ActivityTime>{activity.time}</ActivityTime>
                        <ActivityText>{activity.text}</ActivityText>
                    </ActivityItem>
                ))}
            </Box>
        </Card>
    )
}