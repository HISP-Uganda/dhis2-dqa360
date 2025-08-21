import React from 'react'
import { Card, Box, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, InputField, Button, Tag } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

const CorrectionsEntry = () => {
    return (
        <Box>
            <Box marginBottom="12px">
                <h2>{i18n.t('Corrections Entry')}</h2>
                <p>{i18n.t('Propose and manage corrections with validation before submission')}</p>
            </Box>
            <Card>
                <Box padding="12px">
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Data Element')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Correction')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            <DataTableRow>
                                <DataTableCell>ANC 1st Visit</DataTableCell>
                                <DataTableCell><InputField type="number" dense /></DataTableCell>
                                <DataTableCell><Tag neutral>{i18n.t('Draft')}</Tag></DataTableCell>
                            </DataTableRow>
                        </DataTableBody>
                    </DataTable>
                    <Box marginTop="12px">
                        <Button primary>{i18n.t('Validate')}</Button>
                        <Button secondary style={{ marginLeft: 8 }}>{i18n.t('Submit')}</Button>
                    </Box>
                </Box>
            </Card>
        </Box>
    )
}

export default CorrectionsEntry