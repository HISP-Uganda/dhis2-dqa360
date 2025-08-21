import React from 'react'
import { Card, Box, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, Button, Tag } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

const Snapshots = () => {
    return (
        <Box>
            <Box marginBottom="12px">
                <h2>{i18n.t('Snapshots (History)')}</h2>
                <p>{i18n.t('Manage and view immutable snapshots of Reported data pulls')}</p>
            </Box>
            <Card>
                <Box padding="12px">
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Label')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Created')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Created by')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            <DataTableRow>
                                <DataTableCell>Latest</DataTableCell>
                                <DataTableCell>2025-01-15 10:00</DataTableCell>
                                <DataTableCell>Admin</DataTableCell>
                                <DataTableCell><Tag positive>{i18n.t('Ready')}</Tag></DataTableCell>
                                <DataTableCell>
                                    <Button small>{i18n.t('Use')}</Button>
                                </DataTableCell>
                            </DataTableRow>
                        </DataTableBody>
                    </DataTable>
                </Box>
            </Card>
        </Box>
    )
}

export default Snapshots