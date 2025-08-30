import React, { useState, useEffect } from 'react'
import {
    Box,
    Card,
    Button,
    ButtonStrip,
    Checkbox,
    InputField,
    Input,
    MultiSelectField,
    MultiSelectOption,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    NoticeBox,
    Tag,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    IconEdit24,
    IconDelete24,
    IconMail24
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useSmsService } from '../services/smsService'

export const SMSReportingSetup = ({
    datasets = [],
    smsConfig = {},
    onConfigChange,
    assessmentData = {}
}) => {
    const { setupSmsForDatasets, getDatasetWithElements } = useSmsService()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [expandedDataset, setExpandedDataset] = useState(null)
    const [editingCommand, setEditingCommand] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [previewCommands, setPreviewCommands] = useState([])
    const [loadingPreview, setLoadingPreview] = useState(false)

    // Default SMS configuration
    const defaultConfig = {
        enabled: false,
        autoGenerate: true,
        separator: ',',
        commands: [],
        notifications: {
            enabled: true,
            recipients: [],
            events: ['data_received', 'validation_failed', 'completion_reminder']
        },
        messages: {
            defaultMessage: 'Thanks! SMS received.',
            wrongFormatMessage: 'Wrong format.',
            noUserMessage: 'Phone not linked to any user.',
            moreThanOneOrgUnitMessage: 'Multiple org units linked to your user; please contact admin.',
            successMessage: 'Saved.'
        }
    }

    const currentConfig = { ...defaultConfig, ...smsConfig }

    // Generate preview of SMS commands when datasets change
    useEffect(() => {
        if (currentConfig.enabled && currentConfig.autoGenerate && datasets.length > 0) {
            generatePreview()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datasets, currentConfig.enabled, currentConfig.autoGenerate])

    const generatePreview = async () => {
        setLoadingPreview(true)
        setError(null)
        try {
            const preview = []
            for (const dataset of datasets) {
                if (shouldGenerateSmsCommand(dataset)) {
                    const datasetDetails = await getDatasetWithElements(dataset.id)
                    const keyword = generateKeyword(dataset)
                    const codes = generateShortCodes(datasetDetails?.dataSetElements || [])
                    preview.push({
                        datasetId: dataset.id,
                        datasetName: dataset.name || dataset.displayName,
                        keyword,
                        codes,
                        separator: currentConfig.separator,
                        messages: currentConfig.messages,
                        elementCount: Object.keys(codes).length
                    })
                }
            }
            setPreviewCommands(preview)
        } catch (e) {
            console.error('Error generating SMS preview:', e)
            setError(i18n.t('Failed to generate SMS command preview'))
        } finally {
            setLoadingPreview(false)
        }
    }

    const shouldGenerateSmsCommand = (dataset) => {
        const name = (dataset.name || dataset.displayName || '').toLowerCase()
        return (
            name.includes('register') ||
            name.includes('summary') ||
            name.includes('correction') ||
            name.includes('dqa')
        )
    }

    const generateKeyword = (dataset) => {
        const name = dataset.name || dataset.displayName || ''
        const code = dataset.code || ''
        if (code) return code.toUpperCase()
        const words = name.split(' ').filter(Boolean)
        if (words.length === 1) {
            return words[0].substring(0, 6).toUpperCase()
        }
        return words.map(w => w.charAt(0)).join('').substring(0, 6).toUpperCase()
    }

    const generateShortCodes = (dataSetElements) => {
        const elements = (dataSetElements || []).map(e => e?.dataElement?.id).filter(Boolean)
        const codes = {}
        const letters = 'abcdefghijklmnopqrstuvwxyz'
        elements.forEach((elementId, index) => {
            let code = ''
            let n = index
            do {
                code = letters[n % letters.length] + code
                n = Math.floor(n / letters.length)
            } while (n > 0)
            codes[code] = elementId
        })
        return codes
    }

    const handleConfigChange = (updates) => {
        const newConfig = { ...currentConfig, ...updates }
        onConfigChange?.(newConfig)
    }

    const handleGenerateSmsCommands = async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const datasetsForSms = datasets.filter(shouldGenerateSmsCommand)
            const results = await setupSmsForDatasets({ datasets: datasetsForSms })
            handleConfigChange({
                commands: results,
                lastGenerated: new Date().toISOString()
            })
            setSuccess(
                i18n.t('SMS commands generated successfully for {{count}} datasets', {
                    count: results.length
                })
            )
        } catch (e) {
            console.error('Error generating SMS commands:', e)
            setError(e?.message || i18n.t('Failed to generate SMS commands'))
        } finally {
            setLoading(false)
        }
    }

    const handleEditCommand = (command) => {
        setEditingCommand(command)
        setModalOpen(true)
    }

    const handleSaveCommand = (updatedCommand) => {
        const updatedCommands = (currentConfig.commands || []).map(cmd =>
            cmd.datasetId === updatedCommand.datasetId ? updatedCommand : cmd
        )
        handleConfigChange({ commands: updatedCommands })
        setModalOpen(false)
        setEditingCommand(null)
    }

    const handleDeleteCommand = (datasetId) => {
        const updatedCommands = (currentConfig.commands || []).filter(cmd => cmd.datasetId !== datasetId)
        handleConfigChange({ commands: updatedCommands })
    }

    const notificationEvents = [
        { value: 'data_received', label: i18n.t('Data Received') },
        { value: 'validation_failed', label: i18n.t('Validation Failed') },
        { value: 'completion_reminder', label: i18n.t('Completion Reminder') },
        { value: 'deadline_approaching', label: i18n.t('Deadline Approaching') },
        { value: 'assessment_complete', label: i18n.t('Assessment Complete') }
    ]

    return (
        <Card>
            <Box padding="24px">
                <Box display="flex" alignItems="center" gap="12px" marginBottom="24px">
                    <IconMail24 />
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                        {i18n.t('SMS Reporting Setup')}
                    </h2>
                </Box>

                <Box display="flex" flexDirection="column" gap="24px">
                    {/* Enable SMS Reporting */}
                    <Box>
                        <Checkbox
                            checked={currentConfig.enabled}
                            label={i18n.t('Enable SMS reporting for this assessment')}
                            onChange={({ checked }) => handleConfigChange({ enabled: checked })}
                        />
                        <p style={{ margin: '8px 0 0 24px', fontSize: '14px', color: '#6C7B7F' }}>
                            {i18n.t('Allow data collection via SMS for selected datasets')}
                        </p>
                    </Box>

                    {currentConfig.enabled && (
                        <>
                            {/* Auto-generation Settings */}
                            <Box display="flex" flexDirection="column" gap="16px">
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                                    {i18n.t('Command Generation')}
                                </h3>

                                <Checkbox
                                    checked={currentConfig.autoGenerate}
                                    label={i18n.t(
                                        'Automatically generate SMS commands for Register, Summary, and Correction datasets'
                                    )}
                                    onChange={({ checked }) => handleConfigChange({ autoGenerate: checked })}
                                />

                                <Box display="flex" gap="16px">
                                    <Box flex="1">
                                        <InputField label={i18n.t('Data Separator')}>
                                            <Input
                                                value={currentConfig.separator}
                                                onChange={({ value }) =>
                                                    handleConfigChange({
                                                        separator: value,
                                                        messages: {
                                                            ...currentConfig.messages,
                                                            wrongFormatMessage: `Wrong format. Use: KEYWORD: a=...,b=...`
                                                        }
                                                    })
                                                }
                                                placeholder=","
                                            />
                                        </InputField>
                                    </Box>
                                </Box>
                            </Box>

                            {/* SMS Messages Configuration */}
                            <Box display="flex" flexDirection="column" gap="16px">
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                                    {i18n.t('SMS Response Messages')}
                                </h3>

                                <Box display="flex" flexDirection="column" gap="12px">
                                    <InputField label={i18n.t('Success Message')}>
                                        <Input
                                            value={currentConfig.messages.successMessage}
                                            onChange={({ value }) =>
                                                handleConfigChange({
                                                    messages: { ...currentConfig.messages, successMessage: value }
                                                })
                                            }
                                            placeholder={i18n.t('Saved.')}
                                        />
                                    </InputField>

                                    <InputField label={i18n.t('Default Message')}>
                                        <Input
                                            value={currentConfig.messages.defaultMessage}
                                            onChange={({ value }) =>
                                                handleConfigChange({
                                                    messages: { ...currentConfig.messages, defaultMessage: value }
                                                })
                                            }
                                            placeholder={i18n.t('Thanks! SMS received.')}
                                        />
                                    </InputField>

                                    <InputField label={i18n.t('Wrong Format Message')}>
                                        <Input
                                            value={currentConfig.messages.wrongFormatMessage}
                                            onChange={({ value }) =>
                                                handleConfigChange({
                                                    messages: { ...currentConfig.messages, wrongFormatMessage: value }
                                                })
                                            }
                                            placeholder={i18n.t('Wrong format.')}
                                        />
                                    </InputField>
                                </Box>
                            </Box>

                            {/* SMS Notifications */}
                            <Box display="flex" flexDirection="column" gap="16px">
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                                    {i18n.t('SMS Notifications')}
                                </h3>

                                <Checkbox
                                    checked={currentConfig.notifications.enabled}
                                    label={i18n.t('Enable SMS notifications')}
                                    onChange={({ checked }) =>
                                        handleConfigChange({
                                            notifications: { ...currentConfig.notifications, enabled: checked }
                                        })
                                    }
                                />

                                {currentConfig.notifications.enabled && (
                                    <MultiSelectField
                                        label={i18n.t('Notification Events')}
                                        selected={currentConfig.notifications.events}
                                        onChange={({ selected }) =>
                                            handleConfigChange({
                                                notifications: {
                                                    ...currentConfig.notifications,
                                                    events: selected
                                                }
                                            })
                                        }
                                    >
                                        {notificationEvents.map(event => (
                                            <MultiSelectOption
                                                key={event.value}
                                                value={event.value}
                                                label={event.label}
                                            />
                                        ))}
                                    </MultiSelectField>
                                )}
                            </Box>

                            {/* Command Preview/Generation */}
                            {datasets.length > 0 && (
                                <Box display="flex" flexDirection="column" gap="16px">
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                                            {i18n.t('SMS Commands')}
                                        </h3>
                                        <ButtonStrip>
                                            {currentConfig.autoGenerate && (
                                                <Button secondary onClick={generatePreview} loading={loadingPreview}>
                                                    {i18n.t('Preview Commands')}
                                                </Button>
                                            )}
                                            <Button
                                                primary
                                                onClick={handleGenerateSmsCommands}
                                                loading={loading}
                                                disabled={!currentConfig.autoGenerate}
                                            >
                                                {i18n.t('Generate SMS Commands')}
                                            </Button>
                                        </ButtonStrip>
                                    </Box>

                                    {/* Error/Success Messages */}
                                    {error && (
                                        <NoticeBox error title={i18n.t('Error')}>
                                            {error}
                                        </NoticeBox>
                                    )}
                                    {success && (
                                        <NoticeBox title={i18n.t('Success')}>
                                            {success}
                                        </NoticeBox>
                                    )}

                                    {/* Command Preview Table */}
                                    {(previewCommands.length > 0 || (currentConfig.commands || []).length > 0) && (
                                        <DataTable>
                                            <DataTableHead>
                                                <DataTableRow>
                                                    <DataTableColumnHeader>{i18n.t('Dataset')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('SMS Keyword')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Data Elements')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                                                    <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                                </DataTableRow>
                                            </DataTableHead>
                                            <DataTableBody>
                                                {(currentConfig.commands || []).map(command => (
                                                    <DataTableRow key={command.datasetId}>
                                                        <DataTableCell>{command.datasetName}</DataTableCell>
                                                        <DataTableCell>
                                                            <Tag positive>{command.keyword}</Tag>
                                                        </DataTableCell>
                                                        <DataTableCell>
                                                            {Object.keys(command.codes || {}).length} elements
                                                        </DataTableCell>
                                                        <DataTableCell>
                                                            <Tag positive>{i18n.t('Generated')}</Tag>
                                                        </DataTableCell>
                                                        <DataTableCell>
                                                            <ButtonStrip>
                                                                <Button
                                                                    small
                                                                    secondary
                                                                    icon={<IconEdit24 />}
                                                                    onClick={() => handleEditCommand(command)}
                                                                >
                                                                    {i18n.t('Edit')}
                                                                </Button>
                                                                <Button
                                                                    small
                                                                    destructive
                                                                    icon={<IconDelete24 />}
                                                                    onClick={() =>
                                                                        handleDeleteCommand(command.datasetId)
                                                                    }
                                                                >
                                                                    {i18n.t('Delete')}
                                                                </Button>
                                                            </ButtonStrip>
                                                        </DataTableCell>
                                                    </DataTableRow>
                                                ))}

                                                {previewCommands
                                                    .filter(
                                                        preview =>
                                                            !(currentConfig.commands || []).some(
                                                                cmd => cmd.datasetId === preview.datasetId
                                                            )
                                                    )
                                                    .map(preview => (
                                                        <DataTableRow key={`preview-${preview.datasetId}`}>
                                                            <DataTableCell>{preview.datasetName}</DataTableCell>
                                                            <DataTableCell>
                                                                <Tag neutral>{preview.keyword}</Tag>
                                                            </DataTableCell>
                                                            <DataTableCell>
                                                                {preview.elementCount} elements
                                                            </DataTableCell>
                                                            <DataTableCell>
                                                                <Tag neutral>{i18n.t('Preview')}</Tag>
                                                            </DataTableCell>
                                                            <DataTableCell>
                                                                <Button
                                                                    small
                                                                    secondary
                                                                    onClick={() =>
                                                                        setExpandedDataset(
                                                                            expandedDataset === preview.datasetId
                                                                                ? null
                                                                                : preview.datasetId
                                                                        )
                                                                    }
                                                                >
                                                                    {expandedDataset === preview.datasetId
                                                                        ? i18n.t('Hide')
                                                                        : i18n.t('View')}
                                                                </Button>
                                                            </DataTableCell>
                                                        </DataTableRow>
                                                    ))}
                                            </DataTableBody>
                                        </DataTable>
                                    )}

                                    {/* Expanded Dataset Details */}
                                    {expandedDataset && (
                                        <Box marginTop="16px">
                                            {previewCommands
                                                .filter(preview => preview.datasetId === expandedDataset)
                                                .map(preview => (
                                                    <Card key={preview.datasetId}>
                                                        <Box padding="16px">
                                                            <h4 style={{ margin: '0 0 16px 0' }}>
                                                                {i18n.t('SMS Command Details: {{name}}', {
                                                                    name: preview.datasetName
                                                                })}
                                                            </h4>
                                                            <Box display="flex" flexDirection="column" gap="12px">
                                                                <p>
                                                                    <strong>{i18n.t('Keyword')}:</strong>{' '}
                                                                    {preview.keyword}
                                                                </p>
                                                                <p>
                                                                    <strong>{i18n.t('Format')}:</strong>{' '}
                                                                    {preview.keyword}: a=value1
                                                                    {preview.separator}b=value2
                                                                    {preview.separator}...
                                                                </p>
                                                                <div>
                                                                    <strong>{i18n.t('Short Codes')}:</strong>
                                                                    <Box
                                                                        display="flex"
                                                                        flexWrap="wrap"
                                                                        gap="4px"
                                                                        marginTop="8px"
                                                                    >
                                                                        {Object.keys(preview.codes).map(code => (
                                                                            <Tag key={code} neutral small>
                                                                                {code}
                                                                            </Tag>
                                                                        ))}
                                                                    </Box>
                                                                </div>
                                                            </Box>
                                                        </Box>
                                                    </Card>
                                                ))}
                                        </Box>
                                    )}

                                    {/* Info about eligible datasets */}
                                    <NoticeBox title={i18n.t('SMS Command Generation')}>
                                        {i18n.t(
                                            'SMS commands will be automatically generated for datasets containing "Register", "Summary", or "Correction" in their names. {{count}} of {{total}} datasets are eligible.',
                                            {
                                                count: datasets.filter(shouldGenerateSmsCommand).length,
                                                total: datasets.length
                                            }
                                        )}
                                    </NoticeBox>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            {/* Edit Command Modal */}
            {modalOpen && editingCommand && (
                <Modal onClose={() => setModalOpen(false)} large style={{ background: '#fff' }}>
                    <ModalTitle>{i18n.t('Edit SMS Command')}</ModalTitle>
                    <ModalContent>
                        <SMSCommandEditor
                            command={editingCommand}
                            onSave={handleSaveCommand}
                            onCancel={() => setModalOpen(false)}
                        />
                    </ModalContent>
                </Modal>
            )}
        </Card>
    )
}

// SMS Command Editor Component
const SMSCommandEditor = ({ command, onSave, onCancel }) => {
    const [editedCommand, setEditedCommand] = useState({ ...command })

    const handleSave = () => onSave(editedCommand)

    return (
        <Box display="flex" flexDirection="column" gap="16px">
            <InputField label={i18n.t('SMS Keyword')}>
                <Input
                    value={editedCommand.keyword}
                    onChange={({ value }) => setEditedCommand(prev => ({ ...prev, keyword: value }))}
                />
            </InputField>

            <InputField label={i18n.t('Data Separator')}>
                <Input
                    value={editedCommand.separator}
                    onChange={({ value }) => setEditedCommand(prev => ({ ...prev, separator: value }))}
                />
            </InputField>

            <Box>
                <h4>{i18n.t('Short Codes')}</h4>
                <p style={{ fontSize: '14px', color: '#6C7B7F', marginBottom: '12px' }}>
                    {i18n.t('Map short codes to data elements for SMS data entry')}
                </p>
                <Box display="flex" flexDirection="column" gap="8px">
                    {Object.entries(editedCommand.codes || {}).map(([code, elementId]) => (
                        <Box key={code} display="flex" gap="8px" alignItems="center">
                            <Tag neutral>{code}</Tag>
                            <span>→</span>
                            <span style={{ fontSize: '14px' }}>{elementId}</span>
                        </Box>
                    ))}
                </Box>
            </Box>

            <ModalActions>
                <ButtonStrip>
                    <Button secondary onClick={onCancel}>{i18n.t('Cancel')}</Button>
                    <Button primary onClick={handleSave}>{i18n.t('Save Changes')}</Button>
                </ButtonStrip>
            </ModalActions>
        </Box>
    )
}

export default SMSReportingSetup