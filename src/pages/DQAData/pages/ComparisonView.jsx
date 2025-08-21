import React, { useState } from 'react'
import { Card, Box, SingleSelect, SingleSelectOption, DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, Tag, Button, NoticeBox, Input } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useComparisonService } from '../../../services/comparisonService'

const ComparisonView = () => {
    const [mismatchFilter, setMismatchFilter] = useState('all')
    const [deltaMetric, setDeltaMetric] = useState('abs')
    const [period, setPeriod] = useState('202501')
    const [orgUnit, setOrgUnit] = useState('OU_123')
    const [status, setStatus] = useState(null)
    const [lastResults, setLastResults] = useState(null)

    const { runComparison } = useComparisonService()

    // TODO: wire to selected assessment in context
    const assessmentId = 'current-assessment'

    const doRun = async () => {
        try {
            setStatus(null)
            const res = await runComparison({ assessmentId, period, orgUnit })
            setLastResults(res)
            setStatus({ type: 'success', msg: i18n.t('Comparison completed') })
        } catch (e) {
            setStatus({ type: 'error', msg: e.message })
        }
    }

    return (
        <Box>
            <Box marginBottom="12px">
                <h2>{i18n.t('Comparison View')}</h2>
                <p>{i18n.t('Side-by-side view of Register | Summary | Reported | Corrections for the selected context')}</p>
            </Box>

            <Card>
                <Box padding="12px" display="flex" gap="12px" alignItems="center" flexWrap>
                    <SingleSelect selected={mismatchFilter} onChange={({ selected }) => setMismatchFilter(selected)}>
                        <SingleSelectOption value="all" label={i18n.t('All')} />
                        <SingleSelectOption value="mismatches" label={i18n.t('Only mismatches')} />
                        <SingleSelectOption value="missing" label={i18n.t('Only missing')} />
                    </SingleSelect>
                    <SingleSelect selected={deltaMetric} onChange={({ selected }) => setDeltaMetric(selected)}>
                        <SingleSelectOption value="abs" label={i18n.t('Absolute')} />
                        <SingleSelectOption value="pct" label={i18n.t('Percentage')} />
                    </SingleSelect>
                    {/* Minimal context controls (to be replaced by global selectors) */}
                    <Input dense placeholder={i18n.t('Period (e.g., 202501)')} value={period} onChange={({ value }) => setPeriod(value)} />
                    <Input dense placeholder={i18n.t('Org Unit ID')} value={orgUnit} onChange={({ value }) => setOrgUnit(value)} />
                    <Button primary onClick={doRun}>{i18n.t('Run Comparison')}</Button>
                </Box>
            </Card>

            {status && (
                <Box marginTop="8px">
                    <NoticeBox title={status.type === 'error' ? i18n.t('Error') : i18n.t('Success')} error={status.type === 'error'} valid={status.type === 'success'}>
                        {status.msg}
                    </NoticeBox>
                </Box>
            )}

            {lastResults && (
                <Card>
                    <Box padding="12px">
                        <p>{i18n.t('Last run')}: {new Date(lastResults.runAt).toLocaleString()}</p>
                        <p>{i18n.t('Total keys')}: {lastResults.total} | {i18n.t('Mismatches')}: {lastResults.mismatches} | {i18n.t('Missing')}: {lastResults.missing}</p>
                    </Box>
                </Card>
            )}

            <Card>
                <Box padding="12px">
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>{i18n.t('Data Element')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Register')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Summary')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Reported')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Corrections')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Delta')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            <DataTableRow>
                                <DataTableCell>ANC 1st Visit</DataTableCell>
                                <DataTableCell>50</DataTableCell>
                                <DataTableCell>52</DataTableCell>
                                <DataTableCell>54</DataTableCell>
                                <DataTableCell>52</DataTableCell>
                                <DataTableCell><Tag negative>-2</Tag></DataTableCell>
                            </DataTableRow>
                        </DataTableBody>
                    </DataTable>
                </Box>
            </Card>
        </Box>
    )
}

export default ComparisonView