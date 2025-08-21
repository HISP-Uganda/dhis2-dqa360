import React from 'react'
import { Card, Box, SingleSelect, SingleSelectOption, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, InputField, Button, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

const RegisterEntry = () => {
    return (
        <Box>
            <Box marginBottom="12px">
                <h2>{i18n.t('Register Entry')}</h2>
                <p>{i18n.t('Capture facility-level source data for the selected assessment, period and org unit')}</p>
            </Box>

            <Card>
                <Box padding="12px">
                    <Box display="flex" gap="12px" marginBottom="8px">
                        <SingleSelect placeholder={i18n.t('Data Element Group')}>
                            <SingleSelectOption value="all" label={i18n.t('All groups')} />
                        </SingleSelect>
                        <SingleSelect placeholder={i18n.t('Category Option Combo')}>
                            <SingleSelectOption value="default" label={i18n.t('Default')} />
                        </SingleSelect>
                    </Box>

                    <NoticeBox info title={i18n.t('Context')}>
                        {i18n.t('This page will respect the global Assessment, Period and Org Unit context selectors.')}
                    </NoticeBox>

                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Data Element')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Value')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            <DataTableRow>
                                <DataTableCell>ANC 1st Visit</DataTableCell>
                                <DataTableCell>
                                    <InputField type="number" dense />
                                </DataTableCell>
                                <DataTableCell>{i18n.t('Incomplete')}</DataTableCell>
                            </DataTableRow>
                        </DataTableBody>
                    </DataTable>

                    <Box marginTop="12px">
                        <Button primary>{i18n.t('Save')}</Button>
                    </Box>
                </Box>
            </Card>
        </Box>
    )
}

export default RegisterEntry