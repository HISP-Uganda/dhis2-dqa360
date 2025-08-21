import React from 'react'
import { Card, Box, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, Tag, SingleSelect, SingleSelectOption } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

const ValidationDrafts = () => {
    return (
        <Box>
            <Box marginBottom="12px">
                <h2>{i18n.t('Validation & Drafts')}</h2>
                <p>{i18n.t('View rule failures and work on drafts assigned to you')}</p>
            </Box>
            <Card>
                <Box padding="12px" display="flex" gap="12px">
                    <SingleSelect placeholder={i18n.t('Rule type')}>
                        <SingleSelectOption value="mandatory" label={i18n.t('Mandatory')} />
                        <SingleSelectOption value="consistency" label={i18n.t('Consistency')} />
                        <SingleSelectOption value="custom" label={i18n.t('Custom')} />
                    </SingleSelect>
                    <SingleSelect placeholder={i18n.t('Validation state')}>
                        <SingleSelectOption value="errors" label={i18n.t('Errors')} />
                        <SingleSelectOption value="warnings" label={i18n.t('Warnings')} />
                    </SingleSelect>
                </Box>
            </Card>
            <Card>
                <Box padding="12px">
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Rule')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Item')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Severity')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Assignee')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            <DataTableRow>
                                <DataTableCell>Register vs Summary within tolerance</DataTableCell>
                                <DataTableCell>ANC 1st visit</DataTableCell>
                                <DataTableCell><Tag negative>High</Tag></DataTableCell>
                                <DataTableCell>Data Manager</DataTableCell>
                            </DataTableRow>
                        </DataTableBody>
                    </DataTable>
                </Box>
            </Card>
        </Box>
    )
}

export default ValidationDrafts