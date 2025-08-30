import React, { useState } from 'react'
import {
    Box,
    Button,
    ButtonStrip,
    Input,
    InputField,
    TextArea,
    SingleSelect,
    SingleSelectOption,
    Card,
    IconAdd24,
    IconEdit24,
    IconDelete24,
    Table,
    TableHead,
    TableRowHead,
    TableCellHead,
    TableBody,
    TableRow,
    TableCell,
    Tag,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    NoticeBox,
    Divider,
    Chip
} from '@dhis2/ui'
import { useForm, Controller } from 'react-hook-form'
import i18n from '@dhis2/d2-i18n'
import { DataElementModal } from './DataElementModal'

export const ManualDatasetCreator = ({ value, onChange, error, errorMessage, fullCategoryCombos = [] }) => {
    const [datasetModal, setDatasetModal] = useState(false)
    const [dataElementModal, setDataElementModal] = useState(false)
    const [editingDataElement, setEditingDataElement] = useState(null)

    const dataset = value || {
        name: '',
        shortName: '',
        code: '',
        description: '',
        periodType: 'Monthly',
        dataElements: []
    }

    const handleDatasetChange = (field, newValue) => {
        const updatedDataset = {
            ...dataset,
            [field]: newValue
        }
        onChange(updatedDataset)
    }

    const handleAddDataElement = (dataElement) => {
        const updatedDataElements = [...dataset.dataElements, {
            ...dataElement,
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }]
        handleDatasetChange('dataElements', updatedDataElements)
        setDataElementModal(false)
    }

    const handleEditDataElement = (dataElement) => {
        const updatedDataElements = dataset.dataElements.map(de =>
            de.id === dataElement.id ? dataElement : de
        )
        handleDatasetChange('dataElements', updatedDataElements)
        setEditingDataElement(null)
        setDataElementModal(false)
    }

    const handleDeleteDataElement = (id) => {
        const updatedDataElements = dataset.dataElements.filter(de => de.id !== id)
        handleDatasetChange('dataElements', updatedDataElements)
    }

    const openEditDataElement = (dataElement) => {
        setEditingDataElement(dataElement)
        setDataElementModal(true)
    }

    const getValueTypeDisplay = (valueType) => {
        const types = {
            'TEXT': 'Text',
            'LONG_TEXT': 'Long Text',
            'NUMBER': 'Number',
            'INTEGER': 'Integer',
            'INTEGER_POSITIVE': 'Positive Integer',
            'INTEGER_NEGATIVE': 'Negative Integer',
            'INTEGER_ZERO_OR_POSITIVE': 'Zero or Positive Integer',
            'PERCENTAGE': 'Percentage',
            'BOOLEAN': 'Yes/No',
            'TRUE_ONLY': 'Yes Only',
            'DATE': 'Date',
            'DATETIME': 'Date & Time'
        }
        return types[valueType] || valueType
    }

    return (
        <Box>
            <Card>
                <Box padding="16px">
                    <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                            {i18n.t('Dataset Configuration')}
                        </h3>
                        <Button
                            small
                            secondary
                            icon={<IconEdit24 />}
                            onClick={() => setDatasetModal(true)}
                        >
                            {dataset.name ? i18n.t('Edit Dataset') : i18n.t('Configure Dataset')}
                        </Button>
                    </Box>

                    {(error || errorMessage) && (
                        <Box marginBottom="16px">
                            <NoticeBox error>
                                {errorMessage || error}
                            </NoticeBox>
                        </Box>
                    )}

                    {dataset.name ? (
                        <Box>
                            <Box display="flex" flexDirection="column" gap="8px" marginBottom="16px">
                                <Box display="flex" gap="16px">
                                    <Box>
                                        <strong>{i18n.t('Name')}:</strong> {dataset.name}
                                    </Box>
                                    <Box>
                                        <strong>{i18n.t('Short Name')}:</strong> {dataset.shortName}
                                    </Box>
                                    <Box>
                                        <strong>{i18n.t('Period Type')}:</strong> {dataset.periodType}
                                    </Box>
                                </Box>
                                {dataset.description && (
                                    <Box>
                                        <strong>{i18n.t('Description')}:</strong> {dataset.description}
                                    </Box>
                                )}
                            </Box>
                            <Divider />
                        </Box>
                    ) : (
                        <NoticeBox>
                            {i18n.t('Please configure the dataset properties to get started')}
                        </NoticeBox>
                    )}
                </Box>
            </Card>

            {/* Data Elements Section */}
            <Card style={{ marginTop: '16px' }}>
                <Box padding="16px">
                    <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                            {i18n.t('Data Elements')} ({dataset.dataElements.length})
                        </h3>
                        <Button
                            small
                            primary
                            icon={<IconAdd24 />}
                            onClick={() => {
                                setEditingDataElement(null)
                                setDataElementModal(true)
                            }}
                            disabled={!dataset.name}
                        >
                            {i18n.t('Add Data Element')}
                        </Button>
                    </Box>

                    {dataset.dataElements.length > 0 ? (
                        <Table>
                            <TableHead>
                                <TableRowHead>
                                    <TableCellHead>{i18n.t('Name')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Code')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Value Type')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Aggregation')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Actions')}</TableCellHead>
                                </TableRowHead>
                            </TableHead>
                            <TableBody>
                                {dataset.dataElements.map((dataElement) => (
                                    <TableRow key={dataElement.id}>
                                        <TableCell>
                                            <Box>
                                                <div style={{ fontWeight: 500 }}>{dataElement.name}</div>
                                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                                                    {dataElement.id}
                                                </div>
                                                {dataElement.description && (
                                                    <div style={{ fontSize: '12px', color: '#6C7B7F', marginTop: '2px' }}>
                                                        {dataElement.description}
                                                    </div>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <code style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '2px' }}>
                                                {dataElement.code}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <Tag positive={dataElement.valueType === 'INTEGER'}>
                                                {getValueTypeDisplay(dataElement.valueType)}
                                            </Tag>
                                        </TableCell>
                                        <TableCell>
                                            <Chip>{dataElement.aggregationType}</Chip>
                                        </TableCell>
                                        <TableCell>
                                            <ButtonStrip>
                                                <Button
                                                    small
                                                    secondary
                                                    icon={<IconEdit24 />}
                                                    onClick={() => openEditDataElement(dataElement)}
                                                >
                                                    {i18n.t('Edit')}
                                                </Button>
                                                <Button
                                                    small
                                                    destructive
                                                    icon={<IconDelete24 />}
                                                    onClick={() => handleDeleteDataElement(dataElement.id)}
                                                >
                                                    {i18n.t('Delete')}
                                                </Button>
                                            </ButtonStrip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <NoticeBox>
                            {dataset.name
                                ? i18n.t('No data elements added yet. Click "Add Data Element" to get started.')
                                : i18n.t('Configure the dataset first before adding data elements.')
                            }
                        </NoticeBox>
                    )}
                </Box>
            </Card>

            {/* Dataset Configuration Modal */}
            {datasetModal && (
                <DatasetConfigModal
                    onClose={() => setDatasetModal(false)}
                    dataset={dataset}
                    onSave={(updatedDataset) => {
                        onChange(updatedDataset)
                        setDatasetModal(false)
                    }}
                />
            )}

            {/* Data Element Modal */}
            {dataElementModal && (
                <DataElementModal
                    isOpen={dataElementModal}
                    onClose={() => {
                        setDataElementModal(false)
                        setEditingDataElement(null)
                    }}
                    dataElement={editingDataElement}
                    onSave={editingDataElement ? handleEditDataElement : handleAddDataElement}
                    fullCategoryCombos={fullCategoryCombos}
                />
            )}
        </Box>
    )
}

// Dataset Configuration Modal Component
const DatasetConfigModal = ({ onClose, dataset, onSave }) => {
    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: dataset.name || '',
            shortName: dataset.shortName || '',
            code: dataset.code || '',
            description: dataset.description || '',
            periodType: dataset.periodType || 'Monthly'
        }
    })

    const onSubmit = (formData) => {
        // Generate short name and code if not provided
        const updatedData = {
            ...dataset,
            ...formData,
            shortName: formData.shortName || formData.name.substring(0, 50),
            code: formData.code || formData.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50)
        }
        onSave(updatedData)
    }

    return (
        <Modal large onClose={onClose} style={{ background: '#fff' }}>
            <ModalTitle>{i18n.t('Dataset Configuration')}</ModalTitle>
            <ModalContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box display="flex" flexDirection="column" gap="16px">
                        <Controller
                            name="name"
                            control={control}
                            rules={{ required: i18n.t('Dataset name is required') }}
                            render={({ field }) => (
                                <InputField
                                    label={i18n.t('Dataset Name')}
                                    required
                                    error={!!errors.name}
                                    validationText={errors.name?.message}
                                >
                                    <Input {...field} placeholder={i18n.t('Enter dataset name')} />
                                </InputField>
                            )}
                        />

                        <Box display="flex" gap="16px">
                            <Box flex="1">
                                <Controller
                                    name="shortName"
                                    control={control}
                                    render={({ field }) => (
                                        <InputField label={i18n.t('Short Name')}>
                                            <Input {...field} placeholder={i18n.t('Auto-generated if empty')} />
                                        </InputField>
                                    )}
                                />
                            </Box>
                            <Box flex="1">
                                <Controller
                                    name="code"
                                    control={control}
                                    render={({ field }) => (
                                        <InputField label={i18n.t('Code')}>
                                            <Input {...field} placeholder={i18n.t('Auto-generated if empty')} />
                                        </InputField>
                                    )}
                                />
                            </Box>
                        </Box>

                        <Controller
                            name="periodType"
                            control={control}
                            render={({ field }) => (
                                <InputField label={i18n.t('Period Type')}>
                                    <SingleSelect
                                        selected={field.value}
                                        onChange={({ selected }) => field.onChange(selected)}
                                    >
                                        <SingleSelectOption value="Daily" label={i18n.t('Daily')} />
                                        <SingleSelectOption value="Weekly" label={i18n.t('Weekly')} />
                                        <SingleSelectOption value="Monthly" label={i18n.t('Monthly')} />
                                        <SingleSelectOption value="Quarterly" label={i18n.t('Quarterly')} />
                                        <SingleSelectOption value="Yearly" label={i18n.t('Yearly')} />
                                    </SingleSelect>
                                </InputField>
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <InputField label={i18n.t('Description')}>
                                    <TextArea {...field} placeholder={i18n.t('Enter dataset description')} rows={3} />
                                </InputField>
                            )}
                        />
                    </Box>
                </form>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onClose} secondary>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button onClick={handleSubmit(onSubmit)} primary>
                        {i18n.t('Save Dataset')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}
