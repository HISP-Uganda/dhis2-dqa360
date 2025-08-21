import React from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
import { usePageHeader } from '../../hooks/usePageHeader'
import { 
    Card, 
    Box, 
    CircularLoader, 
    NoticeBox,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { DashboardStats } from './DashboardStats'
import { RecentActivity } from './RecentActivity'
import { DataQualityOverview } from './DataQualityOverview'
import { CenteredLoader } from '../../components/CenteredLoader'

const query = {
    organisationUnits: {
        resource: 'organisationUnits',
        params: {
            fields: 'id,displayName,level',
            pageSize: 1000,
            page: 1,
            filter: 'level:eq:4' // Facility level
        }
    }
}

export const Dashboard = () => {
    const { data, loading, error } = useDataQuery(query)
    
    usePageHeader(
        i18n.t('Dashboard'),
        i18n.t('Overview of your data quality assessments and system status')
    )

    if (loading) {
        return (
            <CenteredLoader 
                message={i18n.t('Loading dashboard...')}
                minHeight="calc(100vh - 120px)"
            />
        )
    }

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Error loading dashboard')}>
                {error.message}
            </NoticeBox>
        )
    }

    return (
        <Box style={{ minHeight: 'calc(100vh - 120px)' }}>
            <h1>{i18n.t('DQA360 Dashboard')}</h1>
            <p>{i18n.t('Total Insight. Total Impact.')}</p>
            
            <Box display="flex" gap="16px" marginBottom="24px">
                <DashboardStats />
            </Box>

            <Box display="flex" gap="16px" marginBottom="24px">
                <Box flex="2">
                    <DataQualityOverview />
                </Box>
                <Box flex="1">
                    <RecentActivity />
                </Box>
            </Box>

            <Card>
                <Box padding="16px">
                    <h3>{i18n.t('Facilities Overview')}</h3>
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>
                                    {i18n.t('Facility Name')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader>
                                    {i18n.t('Level')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader>
                                    {i18n.t('Status')}
                                </DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {data?.organisationUnits?.organisationUnits?.slice(0, 10).map(facility => (
                                <DataTableRow key={facility.id}>
                                    <DataTableCell>{facility.displayName}</DataTableCell>
                                    <DataTableCell>{facility.level}</DataTableCell>
                                    <DataTableCell>{i18n.t('Active')}</DataTableCell>
                                </DataTableRow>
                            ))}
                        </DataTableBody>
                    </DataTable>
                </Box>
            </Card>
        </Box>
    )
}