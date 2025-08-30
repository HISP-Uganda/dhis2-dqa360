import React, { useState, useEffect } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Box,
    Button,
    ButtonStrip,
    Input,
    InputField,
    SingleSelect,
    SingleSelectOption,
    Card,
    NoticeBox,
    Table,
    TableHead,
    TableRowHead,
    TableCellHead,
    TableBody,
    TableRow,
    TableCell,
    Tag,
    Chip,
    CheckboxField,
    Divider,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    IconEdit24,
    IconAdd24
} from '@dhis2/ui'
import { useForm, Controller } from 'react-hook-form'
import i18n from '@dhis2/d2-i18n'

// Generate UIDs using DHIS2 ID API
const generateUIDs = async (engine, count) => {
    try {
        const query = {
            ids: {
                resource: 'system/id',
                params: {
                    limit: count
                }
            }
        }
        const result = await engine.query(query)
        return result.ids.codes || []
    } catch (error) {
        console.error('Failed to generate UIDs from DHIS2:', error)
        // Fallback to manual generation if API fails
        return Array.from({ length: count }, () => generateFallbackUID())
    }
}

// Fallback UID generation (only used if DHIS2 API fails)
const generateFallbackUID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    // First character must be a letter
    result += chars.charAt(Math.floor(Math.random() * 52))
    // Remaining 10 characters can be letters or numbers
    for (let i = 1; i < 11; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Generate short name by truncating and ensuring uniqueness
const generateShortName = (fullName, maxLength = 50) => {
    if (fullName.length <= maxLength) return fullName
    return fullName.substring(0, maxLength - 3) + '...'
}

// Create auto-mapping structure
const createDataElementMapping = (originalDataElements, prefixedDataElements) => {
    const mapping = {
        originalToMapped: {},
        mappedToOriginal: {},
        assessmentTypeMapping: {}
    }

    originalDataElements.forEach(originalDE => {
        const mappedElements = prefixedDataElements.filter(pDE => pDE.originalId === originalDE.id)

        mapping.originalToMapped[originalDE.id] = mappedElements.map(mDE => ({
            uid: mDE.uid,
            assessmentType: mDE.assessmentType,
            name: mDE.name,
            code: mDE.code
        }))

        mappedElements.forEach(mDE => {
            mapping.mappedToOriginal[mDE.uid] = {
                originalId: originalDE.id,
                originalName: originalDE.displayName || originalDE.name,
                originalCode: originalDE.code || originalDE.id
            }
        })
    })

    // Group by assessment type for easier access
    const assessmentTypes = ['completeness', 'timeliness', 'consistency', 'accuracy']
    assessmentTypes.forEach(type => {
        mapping.assessmentTypeMapping[type] = prefixedDataElements
            .filter(pDE => pDE.assessmentType === type)
            .map(pDE => ({
                uid: pDE.uid,
                originalId: pDE.originalId,
                name: pDE.name,
                code: pDE.code
            }))
    })

    return mapping
}

export const AssessmentDataConflictResolver = ({ value, onChange, dataElements, error, errorMessage }) => {
    const [editingDataElement, setEditingDataElement] = useState(null)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [isGeneratingUIDs, setIsGeneratingUIDs] = useState(false)
    const engine = useDataEngine()

    const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm({
        defaultValues: {
            prefixPattern: value?.prefixPattern || '{datasetType} - {dataElementName}',
            codePattern: value?.codePattern || '{typeCode}_{originalCode}',
            createMapping: value?.createMapping !== false, // Default to true
            generateShortNames: value?.generateShortNames !== false // Default to true
        }
    })

    const prefixPattern = watch('prefixPattern')
    const codePattern = watch('codePattern')

    const datasetTypes = [
        { id: 'reported', name: 'Reported Dataset', code: 'RPT', useOriginalUID: true },
        { id: 'register', name: 'Register Dataset', code: 'REG', useOriginalUID: false },
        { id: 'summary', name: 'Summary Dataset', code: 'SUM', useOriginalUID: false },
        { id: 'correction', name: 'Correction Dataset', code: 'COR', useOriginalUID: false }
    ]

    const generatePrefixedDataElements = async (useExistingUIDs = true) => {
        if (!dataElements || dataElements.length === 0) return []

        // Calculate how many new UIDs we need
        const elementsNeedingNewUIDs = []
        dataElements.forEach(de => {
            datasetTypes.forEach(type => {
                if (!type.useOriginalUID) {
                    const existingPrefixed = value?.prefixedDataElements?.find(
                        pde => pde.originalId === de.id && pde.datasetType === type.id
                    )
                    if (!useExistingUIDs || !existingPrefixed?.uid) {
                        elementsNeedingNewUIDs.push({ originalId: de.id, datasetType: type.id })
                    }
                }
            })
        })

        // Generate UIDs using DHIS2 API
        let newUIDs = []
        if (elementsNeedingNewUIDs.length > 0) {
            setIsGeneratingUIDs(true)
            try {
                newUIDs = await generateUIDs(engine, elementsNeedingNewUIDs.length)
            } catch (error) {
                console.error('Failed to generate UIDs:', error)
                // Fallback to manual generation
                newUIDs = elementsNeedingNewUIDs.map(() => generateFallbackUID())
            } finally {
                setIsGeneratingUIDs(false)
            }
        }

        let uidIndex = 0

        return dataElements.map(de =>
            datasetTypes.map(type => {
                const originalCode = de.code || de.id || 'DE'
                const generatedName = prefixPattern
                    .replace('{datasetType}', type.name)
                    .replace('{dataElementName}', de.displayName || de.name)

                const generatedCode = codePattern
                    .replace('{typeCode}', type.code)
                    .replace('{originalCode}', originalCode)

                const existingPrefixed = value?.prefixedDataElements?.find(
                    pde => pde.originalId === de.id && pde.datasetType === type.id
                )

                let elementUID
                if (type.useOriginalUID) {
                    elementUID = de.uid || de.id
                } else if (useExistingUIDs && existingPrefixed?.uid) {
                    elementUID = existingPrefixed.uid
                } else {
                    elementUID = newUIDs[uidIndex++] || generateFallbackUID()
                }

                return {
                    ...de,
                    uid: elementUID,
                    originalId: de.id,
                    originalUID: de.uid || de.id,
                    id: existingPrefixed?.id || `${type.code}_${de.id}`,
                    name: existingPrefixed?.name || generatedName,
                    displayName: existingPrefixed?.displayName || generatedName,
                    code: existingPrefixed?.code || generatedCode,
                    shortName: existingPrefixed?.shortName || generateShortName(generatedName),
                    formName: existingPrefixed?.formName || (existingPrefixed?.name || generatedName),
                    datasetType: type.id,
                    datasetTypeName: type.name,
                    datasetTypeCode: type.code,
                    useOriginalUID: type.useOriginalUID,
                    isCustom: !!existingPrefixed?.isCustom
                }
            })
        ).flat()
    }

    const [prefixedDataElements, setPrefixedDataElements] = useState([])

    useEffect(() => {
        const initializePrefixedElements = async () => {
            if (dataElements && dataElements.length > 0) {
                const newPrefixed = await generatePrefixedDataElements(true)
                setPrefixedDataElements(newPrefixed)

                // Create auto-mapping for all four datasets
                const autoMapping = createDataElementMapping(dataElements, newPrefixed)

                // Generate dataset UIDs
                const datasetUIDs = await generateUIDs(engine, datasetTypes.length)

                // Update parent component with mapping
                onChange({
                    strategy: 'prefixing',
                    prefixPattern,
                    codePattern,
                    createMapping: watch('createMapping'),
                    generateShortNames: watch('generateShortNames'),
                    prefixedDataElements: newPrefixed,
                    dataElementMapping: autoMapping,
                    assessmentDatasets: datasetTypes.map((type, index) => ({
                        id: `dataset_${type.id}`,
                        uid: datasetUIDs[index] || generateFallbackUID(),
                        name: `${type.name}`,
                        code: `DS_${type.code}`,
                        datasetType: type.id,
                        dataElements: newPrefixed.filter(de => de.datasetType === type.id)
                    }))
                })
            }
        }

        initializePrefixedElements()
    }, [dataElements, prefixPattern, codePattern, watch('createMapping'), watch('generateShortNames')])

    const handleEditDataElement = (dataElement) => {
        setEditingDataElement(dataElement)
        setEditModalOpen(true)
    }

    const handleSaveEditedDataElement = (editedDataElement) => {
        const updatedElements = prefixedDataElements.map(de =>
            de.uid === editedDataElement.uid ? { ...editedDataElement, isCustom: true } : de
        )
        setPrefixedDataElements(updatedElements)

        // Update mapping when data element is edited
        const updatedMapping = createDataElementMapping(dataElements, updatedElements)

        // Notify parent about the update
        onChange({
            strategy: 'prefixing',
            prefixPattern,
            codePattern,
            createMapping: watch('createMapping'),
            generateShortNames: watch('generateShortNames'),
            prefixedDataElements: updatedElements,
            dataElementMapping: updatedMapping,
            assessmentDatasets: datasetTypes.map(type => ({
                id: `dataset_${type.id}`,
                uid: generateUID(),
                name: `${type.name} Assessment Dataset`,
                code: `DS_${type.code}`,
                assessmentType: type.id,
                dataElements: updatedElements.filter(de => de.datasetType === type.id)
            }))
        })

        setEditModalOpen(false)
        setEditingDataElement(null)
    }

    const handleRegenerateAll = async () => {
        const newPrefixed = await generatePrefixedDataElements(false) // Force new UIDs
        setPrefixedDataElements(newPrefixed)
    }

    const getDataElementsByType = (assessmentTypeId) => {
        return prefixedDataElements.filter(de => de.datasetType === assessmentTypeId)
    }

    const onSubmit = (formData) => {
        const result = {
            strategy: 'prefixing',
            ...formData,
            prefixedDataElements,
            assessmentDatasets: datasetTypes.map(type => ({
                id: `dataset_${type.id}`,
                uid: generateUID(),
                name: `${type.name} Assessment Dataset`,
                code: `DS_${type.code}`,
                assessmentType: type.id,
                dataElements: getDataElementsByType(type.id)
            }))
        }
        onChange(result)
    }

    return (
        <Box>
            <Card>
                <Box padding="16px">
                    <Box marginBottom="16px">
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                            {i18n.t('Dataset Preparation - Data Element Prefixing')}
                        </h3>
                        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6C7B7F' }}>
                            {i18n.t('Generate unique data elements for each assessment type to prevent data conflicts')}
                        </p>
                    </Box>

                    {error && (
                        <Box marginBottom="16px">
                            <NoticeBox error>
                                {error}
                            </NoticeBox>
                        </Box>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Box display="flex" flexDirection="column" gap="16px">
                            {/* Configuration */}
                            <Box display="flex" gap="16px">
                                <Box flex="1">
                                    <Controller
                                        name="prefixPattern"
                                        control={control}
                                        render={({ field }) => (
                                            <InputField
                                                label={i18n.t('Name Pattern')}
                                                helpText={i18n.t('Use {assessmentType} and {dataElementName} as placeholders')}
                                            >
                                                <Input {...field} placeholder="{assessmentType} - {dataElementName}" />
                                            </InputField>
                                        )}
                                    />
                                </Box>
                                <Box flex="1">
                                    <Controller
                                        name="codePattern"
                                        control={control}
                                        render={({ field }) => (
                                            <InputField
                                                label={i18n.t('Code Pattern')}
                                                helpText={i18n.t('Use {typeCode} and {originalCode} as placeholders')}
                                            >
                                                <Input {...field} placeholder="{typeCode}_{originalCode}" />
                                            </InputField>
                                        )}
                                    />
                                </Box>
                            </Box>

                            <Box display="flex" gap="16px">
                                <Controller
                                    name="createMapping"
                                    control={control}
                                    render={({ field }) => (
                                        <CheckboxField
                                            {...field}
                                            checked={field.value}
                                            label={i18n.t('Create mapping between original and prefixed data elements')}
                                        />
                                    )}
                                />
                                <Controller
                                    name="generateShortNames"
                                    control={control}
                                    render={({ field }) => (
                                        <CheckboxField
                                            {...field}
                                            checked={field.value}
                                            label={i18n.t('Auto-generate short names (truncate at 50 characters)')}
                                        />
                                    )}
                                />
                            </Box>

                            <ButtonStrip>
                                <Button secondary onClick={handleRegenerateAll} loading={isGeneratingUIDs}>
                                    {i18n.t('Regenerate All')}
                                </Button>
                            </ButtonStrip>
                        </Box>
                    </form>
                </Box>
            </Card>

            {/* Generated Data Elements by Assessment Type */}
            {datasetTypes.map(type => {
                const typeDataElements = getDataElementsByType(type.id)
                return (
                    <Card key={type.id} style={{ marginTop: '16px' }}>
                        <Box padding="16px">
                            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                                    {type.name} Dataset ({typeDataElements.length} {i18n.t('Data Elements')})
                                </h4>
                                <Tag positive>
                                    {type.code}
                                </Tag>
                            </Box>

                            {typeDataElements.length > 0 ? (
                                <Table>
                                    <TableHead>
                                        <TableRowHead>
                                            <TableCellHead>{i18n.t('Name')}</TableCellHead>
                                            <TableCellHead>{i18n.t('Code')}</TableCellHead>
                                            <TableCellHead>{i18n.t('UID')}</TableCellHead>
                                            <TableCellHead>{i18n.t('Value Type')}</TableCellHead>
                                            <TableCellHead>{i18n.t('Actions')}</TableCellHead>
                                        </TableRowHead>
                                    </TableHead>
                                    <TableBody>
                                        {typeDataElements.map((dataElement) => (
                                            <TableRow key={dataElement.uid}>
                                                <TableCell>
                                                    <Box>
                                                        <div style={{ fontWeight: 500 }}>
                                                            {dataElement.name}
                                                            {dataElement.isCustom && (
                                                                <Chip style={{ marginLeft: '8px' }}>
                                                                    {i18n.t('Custom')}
                                                                </Chip>
                                                            )}
                                                        </div>
                                                        {dataElement.shortName && dataElement.shortName !== dataElement.name && (
                                                            <div style={{ fontSize: '12px', color: '#6C7B7F', marginTop: '2px' }}>
                                                                {i18n.t('Short')}: {dataElement.shortName}
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
                                                    <code style={{ fontSize: '11px', backgroundColor: '#e8f4fd', padding: '2px 4px', borderRadius: '2px' }}>
                                                        {dataElement.uid}
                                                    </code>
                                                </TableCell>
                                                <TableCell>
                                                    <Tag positive={dataElement.valueType === 'INTEGER'}>
                                                        {dataElement.valueType}
                                                    </Tag>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        small
                                                        secondary
                                                        icon={<IconEdit24 />}
                                                        onClick={() => handleEditDataElement(dataElement)}
                                                    >
                                                        {i18n.t('Edit')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <NoticeBox>
                                    {i18n.t('No data elements generated for this assessment type')}
                                </NoticeBox>
                            )}
                        </Box>
                    </Card>
                )
            })}

            {/* Auto-Mapping Overview */}
            {watch('createMapping') && prefixedDataElements.length > 0 && (
                <Card style={{ marginTop: '16px' }}>
                    <Box padding="16px">
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                            {i18n.t('Data Element Mapping Overview')}
                        </h4>
                        <p style={{ margin: '8px 0 16px 0', fontSize: '12px', color: '#6C7B7F' }}>
                            {i18n.t('Shows how original data elements are mapped to assessment-specific data elements')}
                        </p>

                        <Table>
                            <TableHead>
                                <TableRowHead>
                                    <TableCellHead>{i18n.t('Original Data Element')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Reported')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Register')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Summary')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Correction')}</TableCellHead>
                                </TableRowHead>
                            </TableHead>
                            <TableBody>
                                {dataElements?.map((originalDE) => {
                                    const mappedElements = prefixedDataElements.filter(pDE => pDE.originalId === originalDE.id)
                                    const mappingByType = {}
                                    mappedElements.forEach(mDE => {
                                        mappingByType[mDE.datasetType] = mDE
                                    })

                                    return (
                                        <TableRow key={originalDE.id}>
                                            <TableCell>
                                                <Box>
                                                    <div style={{ fontWeight: 500 }}>{originalDE.displayName || originalDE.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#6C7B7F' }}>
                                                        {originalDE.code || originalDE.id}
                                                    </div>
                                                </Box>
                                            </TableCell>
                                            {datasetTypes.map(type => (
                                                <TableCell key={type.id}>
                                                    {mappingByType[type.id] ? (
                                                        <Box>
                                                            <div style={{ fontSize: '12px', fontWeight: 500 }}>
                                                                {mappingByType[type.id].name}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: '#6C7B7F' }}>
                                                                {mappingByType[type.id].code}
                                                            </div>
                                                            <div style={{ fontSize: '9px', backgroundColor: '#e8f4fd', padding: '1px 3px', borderRadius: '2px', marginTop: '2px', display: 'inline-block' }}>
                                                                {mappingByType[type.id].uid}
                                                            </div>
                                                        </Box>
                                                    ) : (
                                                        <span style={{ color: '#999' }}>-</span>
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </Box>
                </Card>
            )}

            {/* Summary */}
            <Card style={{ marginTop: '16px' }}>
                <Box padding="16px">
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                        {i18n.t('Implementation Summary')}
                    </h4>

                    <Box marginTop="12px">
                        <Box display="flex" flexDirection="column" gap="8px">
                            <Box>📊 <strong>{i18n.t('Datasets')}:</strong> 4 separate datasets (one per assessment type)</Box>
                            <Box>🏷️ <strong>{i18n.t('Data Elements')}:</strong> {prefixedDataElements.length} total ({dataElements?.length || 0} × 4)</Box>
                            <Box>🔗 <strong>{i18n.t('Mapping')}:</strong> {watch('createMapping') ? 'Enabled' : 'Disabled'}</Box>
                            <Box>💾 <strong>{i18n.t('Data Storage')}:</strong> Unique data elements prevent conflicts</Box>
                            <Box>🆔 <strong>{i18n.t('UIDs')}:</strong> Generated for all data elements and datasets</Box>
                        </Box>
                    </Box>
                </Box>
            </Card>

            {/* Edit Data Element Modal */}
            {editModalOpen && editingDataElement && (
                <DataElementEditModal
                    dataElement={editingDataElement}
                    onClose={() => {
                        setEditModalOpen(false)
                        setEditingDataElement(null)
                    }}
                    onSave={handleSaveEditedDataElement}
                />
            )}
        </Box>
    )
}

// Data Element Edit Modal Component
const DataElementEditModal = ({ dataElement, onClose, onSave }) => {
    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: dataElement.name,
            shortName: dataElement.shortName,
            formName: dataElement.formName || dataElement.name,
            description: dataElement.description || ''
        }
    })

    const onSubmit = (formData) => {
        onSave({
            ...dataElement,
            ...formData
        })
    }

    return (
        <Modal large position="middle" onClose={onClose} style={{ background: '#fff' }}>
            <ModalTitle>
                {i18n.t('Edit Data Element')} - {dataElement.datasetTypeName}
            </ModalTitle>
            <ModalContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box display="flex" flexDirection="column" gap="16px">
                        {/* Non-editable Fields */}
                        <Box display="flex" flexDirection="column" gap="8px" padding="16px" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                            <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#6C7B7F' }}>
                                {i18n.t('Non-editable Properties')}
                            </h5>
                            <Box display="flex" gap="16px">
                                <Box flex="1">
                                    <strong>{i18n.t('UID')}:</strong>{' '}
                                    <code style={{ fontSize: '12px', backgroundColor: '#e8f4fd', padding: '2px 4px', borderRadius: '2px' }}>
                                        {dataElement.uid}
                                    </code>
                                    {dataElement.useOriginalUID && (
                                        <Chip style={{ marginLeft: '8px', fontSize: '10px' }}>
                                            {i18n.t('Original UID')}
                                        </Chip>
                                    )}
                                </Box>
                                <Box flex="1">
                                    <strong>{i18n.t('Value Type')}:</strong>{' '}
                                    <Tag positive={dataElement.valueType === 'INTEGER'}>
                                        {dataElement.valueType}
                                    </Tag>
                                </Box>
                            </Box>
                            <Box>
                                <strong>{i18n.t('Code')}:</strong>{' '}
                                <code style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '2px' }}>
                                    {dataElement.code}
                                </code>
                            </Box>
                        </Box>

                        {/* Editable Fields */}
                        <Box display="flex" flexDirection="column" gap="16px">
                            <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                                {i18n.t('Editable Properties')}
                            </h5>

                            <Controller
                                name="name"
                                control={control}
                                rules={{
                                    required: i18n.t('Name is required'),
                                    maxLength: { value: 230, message: i18n.t('Name must be less than 230 characters') }
                                }}
                                render={({ field }) => (
                                    <InputField
                                        label={i18n.t('Data Element Name')}
                                        required
                                        error={!!errors.name}
                                        validationText={errors.name?.message}
                                        helpText={i18n.t('Maximum 230 characters')}
                                    >
                                        <Input {...field} placeholder={i18n.t('Enter data element name')} />
                                    </InputField>
                                )}
                            />

                            <Controller
                                name="shortName"
                                control={control}
                                rules={{
                                    required: i18n.t('Short name is required'),
                                    maxLength: { value: 50, message: i18n.t('Short name must be 50 characters or less') }
                                }}
                                render={({ field }) => (
                                    <InputField
                                        label={i18n.t('Short Name')}
                                        required
                                        error={!!errors.shortName}
                                        validationText={errors.shortName?.message}
                                        helpText={i18n.t('Maximum 50 characters')}
                                    >
                                        <Input {...field} placeholder={i18n.t('Enter short name')} />
                                    </InputField>
                                )}
                            />

                            <Controller
                                name="formName"
                                control={control}
                                rules={{
                                    maxLength: { value: 230, message: i18n.t('Form name must be less than 230 characters') }
                                }}
                                render={({ field }) => (
                                    <InputField
                                        label={i18n.t('Form Name')}
                                        error={!!errors.formName}
                                        validationText={errors.formName?.message}
                                        helpText={i18n.t('Name to display in data entry forms (optional)')}
                                    >
                                        <Input {...field} placeholder={i18n.t('Enter form name')} />
                                    </InputField>
                                )}
                            />

                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <InputField
                                        label={i18n.t('Description')}
                                        helpText={i18n.t('Optional description for this data element')}
                                    >
                                        <Input {...field} placeholder={i18n.t('Enter description')} />
                                    </InputField>
                                )}
                            />
                        </Box>

                        {/* Dataset Type Information */}
                        <Box padding="12px" style={{ backgroundColor: '#e8f4fd', borderRadius: '4px' }}>
                            <Box display="flex" alignItems="center" gap="8px">
                                <Tag positive>
                                    {dataElement.datasetTypeCode}
                                </Tag>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                    {dataElement.datasetTypeName}
                                </span>
                            </Box>
                            {dataElement.originalId && (
                                <div style={{ fontSize: '12px', color: '#6C7B7F', marginTop: '4px' }}>
                                    {i18n.t('Mapped from')}: {dataElement.originalId}
                                </div>
                            )}
                        </Box>
                    </Box>
                </form>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onClose} secondary>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button onClick={handleSubmit(onSubmit)} primary>
                        {i18n.t('Save Changes')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}
