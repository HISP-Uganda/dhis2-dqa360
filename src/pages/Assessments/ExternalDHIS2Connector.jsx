import React, { useState, useEffect } from 'react'
import {
    Box,
    Button,
    ButtonStrip,
    Input,
    InputField,
    SingleSelect,
    SingleSelectOption,
    MultiSelect,
    MultiSelectOption,
    Card,
    IconAdd24,
    IconView24,
    IconDelete24 as IconCross24,
    Table,
    TableHead,
    TableRowHead,
    TableCellHead,
    TableBody,
    TableRow,
    TableCell,
    Tag,
    NoticeBox,
    CircularLoader,
    Divider,
    Chip,
    CheckboxField
} from '@dhis2/ui'
import { useForm, Controller } from 'react-hook-form'
import i18n from '@dhis2/d2-i18n'

export const ExternalDHIS2Connector = ({ value, onChange, error }) => {
    const [connectionStatus, setConnectionStatus] = useState('disconnected') // 'disconnected', 'connecting', 'connected', 'error'
    const [loadingDatasets, setLoadingDatasets] = useState(false)
    const [loadingOrgUnits, setLoadingOrgUnits] = useState(false)
    const [externalData, setExternalData] = useState({
        datasets: [],
        selectedDatasets: [],
        dataElements: [],
        organisationUnits: []
    })

    const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm({
        defaultValues: {
            serverUrl: value?.serverUrl || '',
            username: value?.username || '',
            password: value?.password || '',
            selectedDatasets: value?.selectedDatasets || []
        }
    })

    const serverUrl = watch('serverUrl')
    const username = watch('username')
    const password = watch('password')
    const selectedDatasets = watch('selectedDatasets')

    // Mock API call to external DHIS2 instance
    const testConnection = async (url, user, pass) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Mock response - in real implementation, this would be an actual API call
        if (url && user && pass) {
            return {
                success: true,
                instanceInfo: {
                    version: '2.40.8.1',
                    name: 'External DHIS2 Instance'
                }
            }
        }
        throw new Error('Invalid credentials or server URL')
    }

    const loadExternalDatasets = async (url, user, pass) => {
        // Simulate API call to external DHIS2
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Mock datasets - in real implementation, fetch from external API
        return [
            {
                id: 'ext_ds_1',
                displayName: 'Maternal Health Monthly Report',
                periodType: 'Monthly',
                dataElementCount: 15
            },
            {
                id: 'ext_ds_2',
                displayName: 'Child Health Quarterly Report',
                periodType: 'Quarterly',
                dataElementCount: 8
            },
            {
                id: 'ext_ds_3',
                displayName: 'Immunization Coverage Report',
                periodType: 'Monthly',
                dataElementCount: 12
            }
        ]
    }

    const loadDatasetDetails = async (url, user, pass, datasetIds) => {
        // Simulate API call to get data elements for selected datasets
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Mock data elements with assessment type separation
        const mockDataElements = [
            {
                id: 'ext_de_1',
                displayName: 'ANC 1st visit',
                valueType: 'INTEGER',
                aggregationType: 'SUM',
                datasetId: 'ext_ds_1',
                assessmentTypes: ['Completeness', 'Timeliness', 'Consistency', 'Accuracy'] // Available for all assessment types
            },
            {
                id: 'ext_de_2',
                displayName: 'ANC 4th visit',
                valueType: 'INTEGER',
                aggregationType: 'SUM',
                datasetId: 'ext_ds_1',
                assessmentTypes: ['Completeness', 'Timeliness', 'Consistency', 'Accuracy']
            },
            {
                id: 'ext_de_3',
                displayName: 'Child weight monitoring',
                valueType: 'INTEGER',
                aggregationType: 'SUM',
                datasetId: 'ext_ds_2',
                assessmentTypes: ['Completeness', 'Timeliness', 'Consistency', 'Accuracy']
            }
        ]

        return mockDataElements.filter(de => datasetIds.includes(de.datasetId))
    }

    const loadExternalOrgUnits = async (url, user, pass) => {
        // Simulate API call to external DHIS2
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Mock organization units
        return [
            {
                id: 'ext_ou_1',
                displayName: 'External Health Center A',
                level: 4
            },
            {
                id: 'ext_ou_2',
                displayName: 'External Health Center B',
                level: 4
            },
            {
                id: 'ext_ou_3',
                displayName: 'External District Hospital',
                level: 3
            }
        ]
    }

    const handleConnect = async () => {
        if (!serverUrl || !username || !password) {
            return
        }

        setConnectionStatus('connecting')
        try {
            await testConnection(serverUrl, username, password)
            setConnectionStatus('connected')

            // Load datasets after successful connection
            await handleLoadDatasets()
        } catch (error) {
            setConnectionStatus('error')
            console.error('Connection failed:', error)
        }
    }

    const handleLoadDatasets = async () => {
        setLoadingDatasets(true)
        try {
            const datasets = await loadExternalDatasets(serverUrl, username, password)
            setExternalData(prev => ({ ...prev, datasets }))
        } catch (error) {
            console.error('Failed to load datasets:', error)
        } finally {
            setLoadingDatasets(false)
        }
    }

    const handleDatasetSelection = async (datasetIds) => {
        setValue('selectedDatasets', datasetIds)
        setExternalData(prev => ({ ...prev, selectedDatasets: datasetIds }))

        if (datasetIds.length > 0) {
            try {
                const dataElements = await loadDatasetDetails(serverUrl, username, password, datasetIds)
                setExternalData(prev => ({ ...prev, dataElements }))
            } catch (error) {
                console.error('Failed to load data elements:', error)
            }
        } else {
            setExternalData(prev => ({ ...prev, dataElements: [] }))
        }
    }

    const handleLoadOrgUnits = async () => {
        setLoadingOrgUnits(true)
        try {
            const orgUnits = await loadExternalOrgUnits(serverUrl, username, password)
            setExternalData(prev => ({ ...prev, organisationUnits: orgUnits }))
        } catch (error) {
            console.error('Failed to load organization units:', error)
        } finally {
            setLoadingOrgUnits(false)
        }
    }

    // Update parent component when data changes
    useEffect(() => {
        if (connectionStatus === 'connected' && externalData.selectedDatasets.length > 0) {
            onChange({
                serverUrl,
                username,
                password,
                selectedDatasets: externalData.selectedDatasets,
                dataElements: externalData.dataElements,
                organisationUnits: externalData.organisationUnits,
                datasets: externalData.datasets.filter(ds =>
                    externalData.selectedDatasets.includes(ds.id)
                )
            })
        }
    }, [connectionStatus, externalData, serverUrl, username, password, onChange])

    const getConnectionStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return 'positive'
            case 'connecting': return 'neutral'
            case 'error': return 'critical'
            default: return 'neutral'
        }
    }

    const getConnectionStatusIcon = () => {
        switch (connectionStatus) {
            case 'connected': return <IconView24 />
            case 'connecting': return <CircularLoader small />
            case 'error': return <IconCross24 />
            default: return null
        }
    }

    return (
        <Box>
            {/* Connection Configuration */}
            <Card>
                <Box padding="16px">
                    <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                            {i18n.t('DHIS2 Connection')}
                        </h3>
                        <Box display="flex" alignItems="center" gap="8px">
                            <Tag {...{ [getConnectionStatusColor()]: true }}>
                                {getConnectionStatusIcon()}
                                <span style={{ marginLeft: '4px' }}>
                                    {connectionStatus === 'connected' && i18n.t('Connected')}
                                    {connectionStatus === 'connecting' && i18n.t('Connecting...')}
                                    {connectionStatus === 'error' && i18n.t('Connection Failed')}
                                    {connectionStatus === 'disconnected' && i18n.t('Not Connected')}
                                </span>
                            </Tag>
                        </Box>
                    </Box>

                    {error && (
                        <Box marginBottom="16px">
                            <NoticeBox error>
                                {error}
                            </NoticeBox>
                        </Box>
                    )}

                    <Box display="flex" flexDirection="column" gap="16px">
                        <Controller
                            name="serverUrl"
                            control={control}
                            rules={{ required: i18n.t('Server URL is required') }}
                            render={({ field }) => (
                                <InputField
                                    label={i18n.t('DHIS2 Server URL')}
                                    required
                                    error={!!errors.serverUrl}
                                    validationText={errors.serverUrl?.message}
                                >
                                    <Input
                                        {...field}
                                        placeholder={i18n.t('https://dhis2-instance.org')}
                                        disabled={connectionStatus === 'connected'}
                                    />
                                </InputField>
                            )}
                        />

                        <Box display="flex" gap="16px">
                            <Box flex="1">
                                <Controller
                                    name="username"
                                    control={control}
                                    rules={{ required: i18n.t('Username is required') }}
                                    render={({ field }) => (
                                        <InputField
                                            label={i18n.t('Username')}
                                            required
                                            error={!!errors.username}
                                            validationText={errors.username?.message}
                                        >
                                            <Input
                                                {...field}
                                                placeholder={i18n.t('Enter username')}
                                                disabled={connectionStatus === 'connected'}
                                            />
                                        </InputField>
                                    )}
                                />
                            </Box>
                            <Box flex="1">
                                <Controller
                                    name="password"
                                    control={control}
                                    rules={{ required: i18n.t('Password is required') }}
                                    render={({ field }) => (
                                        <InputField
                                            label={i18n.t('Password')}
                                            required
                                            error={!!errors.password}
                                            validationText={errors.password?.message}
                                        >
                                            <Input
                                                {...field}
                                                type="password"
                                                placeholder={i18n.t('Enter password')}
                                                disabled={connectionStatus === 'connected'}
                                            />
                                        </InputField>
                                    )}
                                />
                            </Box>
                        </Box>

                        <ButtonStrip>
                            {connectionStatus !== 'connected' ? (
                                <Button
                                    primary
                                    onClick={handleConnect}
                                    loading={connectionStatus === 'connecting'}
                                    disabled={!serverUrl || !username || !password}
                                >
                                    {i18n.t('Connect')}
                                </Button>
                            ) : (
                                <Button
                                    secondary
                                    onClick={() => {
                                        setConnectionStatus('disconnected')
                                        setExternalData({ datasets: [], selectedDatasets: [], dataElements: [], organisationUnits: [] })
                                    }}
                                >
                                    {i18n.t('Disconnect')}
                                </Button>
                            )}
                        </ButtonStrip>
                    </Box>
                </Box>
            </Card>

            {/* Dataset Selection */}
            {connectionStatus === 'connected' && (
                <Card style={{ marginTop: '16px' }}>
                    <Box padding="16px">
                        <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                {i18n.t('Available Datasets')} ({externalData.datasets.length})
                            </h3>
                            <Button
                                small
                                secondary
                                onClick={handleLoadDatasets}
                                loading={loadingDatasets}
                            >
                                {i18n.t('Refresh')}
                            </Button>
                        </Box>

                        {externalData.datasets.length > 0 ? (
                            <Box>
                                <Controller
                                    name="selectedDatasets"
                                    control={control}
                                    render={({ field }) => (
                                        <InputField label={i18n.t('Select Datasets')}>
                                            <MultiSelect
                                                {...field}
                                                placeholder={i18n.t('Choose datasets to import')}
                                                onChange={({ selected }) => {
                                                    field.onChange(selected)
                                                    handleDatasetSelection(selected)
                                                }}
                                            >
                                                {externalData.datasets.map(dataset => (
                                                    <MultiSelectOption
                                                        key={dataset.id}
                                                        value={dataset.id}
                                                        label={`${dataset.displayName} (${dataset.dataElementCount} elements)`}
                                                    />
                                                ))}
                                            </MultiSelect>
                                        </InputField>
                                    )}
                                />

                                {externalData.selectedDatasets.length > 0 && (
                                    <Box marginTop="16px">
                                        <Divider />
                                        <Box marginTop="16px">
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                                                {i18n.t('Selected Datasets')}
                                            </h4>
                                            <Box display="flex" gap="8px" flexWrap="wrap">
                                                {externalData.datasets
                                                    .filter(ds => externalData.selectedDatasets.includes(ds.id))
                                                    .map(dataset => (
                                                        <Chip key={dataset.id}>
                                                            {dataset.displayName}
                                                        </Chip>
                                                    ))
                                                }
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <NoticeBox>
                                {loadingDatasets
                                    ? i18n.t('Loading datasets...')
                                    : i18n.t('No datasets found in the external instance')
                                }
                            </NoticeBox>
                        )}
                    </Box>
                </Card>
            )}

            {/* Data Elements Preview */}
            {connectionStatus === 'connected' && externalData.dataElements.length > 0 && (
                <Card style={{ marginTop: '16px' }}>
                    <Box padding="16px">
                        <Box marginBottom="16px">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                {i18n.t('Data Elements')} ({externalData.dataElements.length})
                            </h3>
                        </Box>

                        <Table>
                            <TableHead>
                                <TableRowHead>
                                    <TableCellHead>{i18n.t('Name')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Value Type')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Aggregation')}</TableCellHead>
                                    <TableCellHead>{i18n.t('Dataset')}</TableCellHead>
                                </TableRowHead>
                            </TableHead>
                            <TableBody>
                                {externalData.dataElements.map((dataElement) => (
                                    <TableRow key={dataElement.id}>
                                        <TableCell>{dataElement.displayName}</TableCell>
                                        <TableCell>
                                            <Tag positive={dataElement.valueType === 'INTEGER'}>
                                                {dataElement.valueType}
                                            </Tag>
                                        </TableCell>
                                        <TableCell>
                                            <Chip>{dataElement.aggregationType}</Chip>
                                        </TableCell>
                                        <TableCell>
                                            {externalData.datasets.find(ds => ds.id === dataElement.datasetId)?.displayName}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Card>
            )}

            {/* Organization Units */}
            {connectionStatus === 'connected' && (
                <Card style={{ marginTop: '16px' }}>
                    <Box padding="16px">
                        <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                {i18n.t('Organization Units')} ({externalData.organisationUnits.length})
                            </h3>
                            <Button
                                small
                                secondary
                                onClick={handleLoadOrgUnits}
                                loading={loadingOrgUnits}
                            >
                                {i18n.t('Load Organization Units')}
                            </Button>
                        </Box>

                        {externalData.organisationUnits.length > 0 ? (
                            <Box display="flex" gap="8px" flexWrap="wrap">
                                {externalData.organisationUnits.map(orgUnit => (
                                    <Chip key={orgUnit.id}>
                                        {orgUnit.displayName}
                                    </Chip>
                                ))}
                            </Box>
                        ) : (
                            <NoticeBox>
                                {loadingOrgUnits
                                    ? i18n.t('Loading organization units...')
                                    : i18n.t('Click "Load Organization Units" to fetch facilities from the external instance')
                                }
                            </NoticeBox>
                        )}
                    </Box>
                </Card>
            )}
        </Box>
    )
}
