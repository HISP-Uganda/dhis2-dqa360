import React, { useState } from 'react'
import { Card, Box, Button, SingleSelect, SingleSelectOption, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, Tag } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

const ReportedData = () => {
    const [snapshot, setSnapshot] = useState('latest')

    return (
        <Box>
            <Box marginBottom="12px">
                <h2>{i18n.t('Reported Data')}</h2>
                <p>{i18n.t('View reported values pulled from DHIS2/eHMIS. Choose a snapshot and compare to local datasets.')}</p>
            </Box>

            <Card>
                <Box padding="12px" display="flex" gap="12px">
                    <SingleSelect selected={snapshot} onChange={({selected}) => setSnapshot(selected)}>
                        <SingleSelectOption value="latest" label={i18n.t('Latest')} />
                        <SingleSelectOption value="2025-01-15T10:00" label={i18n.t('Snapshot 2025-01-15')} />
                    </SingleSelect>
                    <Button>{i18n.t('Refresh Reported')}</Button>
                    <Button secondary onClick={() => window.location.assign('/dqa-data/reported/snapshots')}>{i18n.t('View Snapshots')}</Button>
                </Box>
            </Card>

            <Card>
                <Box padding="12px">
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Data Element')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Reported')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            <DataTableRow>
                                <DataTableCell>ANC 1st Visit</DataTableCell>
                                <DataTableCell>54</DataTableCell>
                                <DataTableCell><Tag neutral>{i18n.t('OK')}</Tag></DataTableCell>
                            </DataTableRow>
                        </DataTableBody>
                    </DataTable>
                </Box>
            </Card>
        </Box>
    )
}

export default ReportedData