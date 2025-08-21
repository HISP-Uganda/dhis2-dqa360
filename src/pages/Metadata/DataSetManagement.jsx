import React, { useState, useEffect } from 'react'
import {
    Box,
    Button,
    ButtonStrip,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    NoticeBox,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    InputField,
    SingleSelect,
    SingleSelectOption,
    Tag,
    Checkbox
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { CenteredLoader } from '../../components/CenteredLoader'

export const DataSetManagement = ({ dhis2Config, value = [], onChange, onNext }) => {
    const [selectedDataSets, setSelectedDataSets] = useState(new Set(value?.map(ds => ds.id) || []))
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedDataSet, setSelectedDataSet] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterPeriodType, setFilterPeriodType] = useState('')
    const [externalData, setExternalData] = useState(null)
    const [externalLoading, setExternalLoading] = useState(false)
    const [externalError, setExternalError] = useState(null)

    // Function to fetch datasets from external DHIS2
    const fetchExternalDataSets = async () => {
        if (!dhis2Config?.configured) return

        setExternalLoading(true)
        setExternalError(null)

        try {
            const auth = btoa(`${dhis2Config.username}:${dhis2Config.password}`)
            // Keep the dataset list payload small; fetch detailed info on demand elsewhere
            const fields = [
                'id',
                'displayName',
                'name',
                'periodType',
                'categoryCombo[id,displayName]',
                'organisationUnits[id,displayName]',
                'dataSetElements[dataElement[id,displayName]]'
            ].join(',')
            const response = await fetch(`${dhis2Config.baseUrl}/api/dataSets?fields=${encodeURIComponent(fields)}&pageSize=1000&paging=true`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            })

            if (response.ok) {
                const result = await response.json()
                setExternalData(result)
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
        } catch (error) {
            console.error('Error fetching external datasets:', error)
            // Preserve the Error object for consistent rendering
            setExternalError(error instanceof Error ? error : new Error(String(error)))
        } finally {
            setExternalLoading(false)
        }
    }

    // Fetch external datasets when config changes
    useEffect(() => {
        if (dhis2Config?.configured) {
            fetchExternalDataSets()
        }
    }, [dhis2Config?.configured, dhis2Config?.baseUrl, dhis2Config?.username, dhis2Config?.password])

    // Sync selected datasets when value prop changes
    useEffect(() => {
        setSelectedDataSets(new Set(value?.map(ds => ds.id) || []))
    }, [value])

    // Mock datasets for development/testing when DHIS2 is not configured
    const mockDataSets = [
        {
            id: 'mock_dataset_1',
            displayName: 'ANC - Antenatal Care',
            name: 'ANC - Antenatal Care',
            periodType: 'Monthly',
            dataSetElements: [
                { dataElement: { id: 'de1', displayName: 'ANC 1st visit' } },
                { dataElement: { id: 'de2', displayName: 'ANC 4th visit' } },
                { dataElement: { id: 'de3', displayName: 'ANC IPT 1st dose' } }
            ],
            organisationUnits: [
                { id: 'ou1', displayName: 'District Hospital' },
                { id: 'ou2', displayName: 'Health Center A' }
            ]
        },
        {
            id: 'mock_dataset_2',
            displayName: 'Immunization',
            name: 'Immunization',
            periodType: 'Monthly',
            dataSetElements: [
                { dataElement: { id: 'de4', displayName: 'BCG doses given' } },
                { dataElement: { id: 'de5', displayName: 'OPV3 doses given' } },
                { dataElement: { id: 'de6', displayName: 'Measles doses given' } }
            ],
            organisationUnits: [
                { id: 'ou1', displayName: 'District Hospital' },
                { id: 'ou3', displayName: 'Health Center B' }
            ]
        },
        {
            id: 'mock_dataset_3',
            displayName: 'Malaria',
            name: 'Malaria',
            periodType: 'Monthly',
            dataSetElements: [
                { dataElement: { id: 'de7', displayName: 'Malaria cases tested' } },
                { dataElement: { id: 'de8', displayName: 'Malaria cases confirmed' } },
                { dataElement: { id: 'de9', displayName: 'Malaria cases treated' } }
            ],
            organisationUnits: [
                { id: 'ou2', displayName: 'Health Center A' },
                { id: 'ou3', displayName: 'Health Center B' }
            ]
        }
    ]

    // Use external data if available, otherwise use mock data for development
    const data = externalData || { dataSets: dhis2Config?.configured ? [] : mockDataSets }
    const loading = externalLoading
    const error = externalError

    // Show configuration notice if DHIS2 is not configured but still allow using mock data
    const showConfigurationNotice = !dhis2Config?.configured

    if (loading) {
        return (
            <CenteredLoader 
                message={i18n.t('Loading datasets...')}
                minHeight="calc(100vh - 120px)"
            />
        )
    }

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Error loading datasets')}>
                {typeof error === 'string' ? error : (error?.message || String(error))}
            </NoticeBox>
        )
    }

    // Handle different possible data structures from DHIS2 API
    let dataSets = []
    if (data) {
        if (Array.isArray(data.dataSets)) {
            dataSets = data.dataSets
        } else if (Array.isArray(data)) {
            dataSets = data
        } else if (data.dataSets && Array.isArray(data.dataSets.dataSets)) {
            dataSets = data.dataSets.dataSets
        }
    }
    

    
    // Filter datasets with safety checks
    const filteredDataSets = dataSets.filter(dataSet => {
        if (!dataSet || typeof dataSet !== 'object') return false
        
        const displayName = dataSet.displayName || dataSet.name || ''
        const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPeriodType = !filterPeriodType || dataSet.periodType === filterPeriodType
        return matchesSearch && matchesPeriodType
    })


    const handleDataSetToggle = (dataSetId) => {
        const newSelected = new Set(selectedDataSets)
        if (newSelected.has(dataSetId)) {
            newSelected.delete(dataSetId)
        } else {
            newSelected.add(dataSetId)
        }
        setSelectedDataSets(newSelected)
        
        // Find the actual dataset objects and pass them to parent
        if (onChange) {
            const selectedDataSetObjects = dataSets.filter(ds => newSelected.has(ds.id))
            onChange(selectedDataSetObjects)
        }
    }

    const handleViewDetails = (dataSet) => {
        setSelectedDataSet(dataSet)
        setShowDetailsModal(true)
    }

    const getPeriodTypeColor = (periodType) => {
        const colors = {
            'Monthly': 'blue',
            'Quarterly': 'green',
            'Yearly': 'orange',
            'Weekly': 'purple',
            'Daily': 'red'
        }
        return colors[periodType] || 'grey'
    }

    // Helper function to get data elements count from dataSetElements structure
    const getDataElementsCount = (dataSetElements) => {
        if (!dataSetElements || !Array.isArray(dataSetElements)) return 0
        return dataSetElements.length
    }
    
    // Helper function to get organization units count
    const getOrganisationUnitsCount = (organisationUnits) => {
        if (!organisationUnits) return 0
        if (Array.isArray(organisationUnits)) return organisationUnits.length
        if (typeof organisationUnits === 'object' && organisationUnits.length !== undefined) return organisationUnits.length
        return 0
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                <h3>{i18n.t('Dataset Management')}</h3>
                <ButtonStrip>
                    <Button 
                        primary 
                        disabled={selectedDataSets.size === 0}
                        onClick={() => {
                            if (onChange) {
                                const selectedDataSetObjects = dataSets.filter(ds => selectedDataSets.has(ds.id))
                                onChange(selectedDataSetObjects)
                            }
                            // Auto-navigate to next step
                            if (onNext) {
                                setTimeout(() => onNext(), 100) // Small delay to ensure state update
                            }
                        }}
                    >
                        {i18n.t('Use for Assessment')} ({selectedDataSets.size})
                    </Button>
                    <Button secondary>
                        {i18n.t('Create New Dataset')}
                    </Button>
                </ButtonStrip>
            </Box>

            {/* Configuration Notice */}
            {showConfigurationNotice && (
                <Box marginBottom="16px">
                    <NoticeBox warning title={i18n.t('Using Demo Data')}>
                        {i18n.t('DHIS2 is not configured. Showing demo datasets for testing. Configure DHIS2 in the first tab to load real datasets.')}
                    </NoticeBox>
                </Box>
            )}

            {/* Filters */}
            <Box display="flex" gap="16px" marginBottom="16px" alignItems="end">
                <Box flex="1">
                    <InputField
                        label={i18n.t('Search datasets')}
                        placeholder={i18n.t('Enter dataset name...')}
                        value={searchTerm}
                        onChange={({ value }) => setSearchTerm(value)}
                    />
                </Box>
                <Box width="200px">
                    <SingleSelect
                        label={i18n.t('Period Type')}
                        placeholder={i18n.t('All periods')}
                        selected={filterPeriodType}
                        onChange={({ selected }) => setFilterPeriodType(selected)}
                        clearable
                        clearText={i18n.t('Clear selection')}
                    >
                        <SingleSelectOption value="Monthly" label={i18n.t('Monthly')} />
                        <SingleSelectOption value="Quarterly" label={i18n.t('Quarterly')} />
                        <SingleSelectOption value="Yearly" label={i18n.t('Yearly')} />
                        <SingleSelectOption value="Weekly" label={i18n.t('Weekly')} />
                        <SingleSelectOption value="Daily" label={i18n.t('Daily')} />
                    </SingleSelect>
                </Box>
            </Box>

            {/* Selection Summary */}
            {selectedDataSets.size > 0 && (
                <Box marginBottom="16px">
                    <NoticeBox title={i18n.t('Selection Summary')} positive>
                        <Box marginBottom="8px">
                            <strong>{i18n.t('{{count}} datasets selected for assessment', { count: selectedDataSets.size })}</strong>
                        </Box>
                        <Box display="flex" flexWrap="wrap" gap="4px">
                            {dataSets.filter(ds => selectedDataSets.has(ds.id)).map(ds => (
                                <Tag key={ds.id} color="positive" small>
                                    {ds.displayName || ds.name}
                                </Tag>
                            ))}
                        </Box>
                    </NoticeBox>
                </Box>
            )}

            {/* Datasets Table */}
            <DataTable>
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>
                            {i18n.t('Select')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Dataset Name')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Period Type')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Category Combo')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Data Elements')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Organisation Units')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Actions')}
                        </DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {filteredDataSets.map(dataSet => {
                        const isSelected = selectedDataSets.has(dataSet.id)
                        return (
                            <DataTableRow 
                                key={dataSet.id}
                                style={{ 
                                    backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                                    borderLeft: isSelected ? '4px solid #1976d2' : '4px solid transparent'
                                }}
                            >
                                <DataTableCell>
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={() => handleDataSetToggle(dataSet.id)}
                                    />
                                </DataTableCell>
                                <DataTableCell>
                                    <Box display="flex" alignItems="center" gap="8px">
                                        <span style={{ fontWeight: isSelected ? '600' : '400' }}>
                                            {dataSet.displayName || dataSet.name || 'Unnamed Dataset'}
                                        </span>
                                        {isSelected && (
                                            <Tag color="positive" small>
                                                {i18n.t('Selected')}
                                            </Tag>
                                        )}
                                    </Box>
                                </DataTableCell>
                            <DataTableCell>
                                <Tag color={getPeriodTypeColor(dataSet.periodType)}>
                                    {dataSet.periodType}
                                </Tag>
                            </DataTableCell>
                            <DataTableCell>
                                <Tag neutral>
                                    {dataSet.categoryCombo?.displayName || i18n.t('Default')}
                                </Tag>
                            </DataTableCell>
                            <DataTableCell>
                                {getDataElementsCount(dataSet.dataSetElements)}
                            </DataTableCell>
                            <DataTableCell>
                                {getOrganisationUnitsCount(dataSet.organisationUnits)} {i18n.t('units')}
                            </DataTableCell>
                            <DataTableCell>
                                <Button small onClick={() => handleViewDetails(dataSet)}>
                                    {i18n.t('View Details')}
                                </Button>
                            </DataTableCell>
                        </DataTableRow>
                        )
                    })}
                </DataTableBody>
            </DataTable>

            {filteredDataSets.length === 0 && (
                <Box padding="24px" textAlign="center">
                    <NoticeBox>
                        {searchTerm || filterPeriodType
                            ? i18n.t('No datasets match your current filters')
                            : dataSets.length === 0
                                ? i18n.t('No datasets found in the external DHIS2 instance')
                                : i18n.t('No datasets match your current filters')
                        }
                        {dataSets.length === 0 && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                                {i18n.t('Check your DHIS2 configuration and ensure the user has access to datasets.')}
                            </p>
                        )}
                    </NoticeBox>
                </Box>
            )}

            {/* Dataset Details Modal */}
            {showDetailsModal && selectedDataSet && (
                <DataSetDetailsModal
                    dataSet={selectedDataSet}
                    onClose={() => {
                        setShowDetailsModal(false)
                        setSelectedDataSet(null)
                    }}
                    onUse={() => {
                        const newSelected = new Set(selectedDataSets)
                        newSelected.add(selectedDataSet.id)
                        setSelectedDataSets(newSelected)
                        if (onChange) {
                            const selectedDataSetObjects = dataSets.filter(ds => newSelected.has(ds.id))
                            onChange(selectedDataSetObjects)
                        }
                        setShowDetailsModal(false)
                        setSelectedDataSet(null)
                    }}
                />
            )}
        </Box>
    )
}

const DataSetDetailsModal = ({ dataSet, onClose, onUse }) => {
    // Extract data elements from dataSetElements structure
    const dataElements = dataSet.dataSetElements?.map(dse => dse.dataElement).filter(Boolean) || []
    const organisationUnits = dataSet.organisationUnits || []

    return (
        <Modal large onClose={onClose}>
            <ModalTitle>{i18n.t('Dataset Details: {{name}}', { name: dataSet.displayName })}</ModalTitle>
            <ModalContent>
                <Box display="flex" flexDirection="column" gap="24px">
                    {/* Basic Information */}
                    <Box>
                        <h4>{i18n.t('Basic Information')}</h4>
                        <Box display="flex" flexDirection="column" gap="8px">
                            <Box display="flex" gap="16px">
                                <strong>{i18n.t('Name')}:</strong>
                                <span>{dataSet.displayName}</span>
                            </Box>
                            <Box display="flex" gap="16px">
                                <strong>{i18n.t('Period Type')}:</strong>
                                <Tag color="blue">{dataSet.periodType}</Tag>
                            </Box>
                            <Box display="flex" gap="16px">
                                <strong>{i18n.t('ID')}:</strong>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{dataSet.id}</span>
                            </Box>
                        </Box>
                    </Box>

                    {/* Data Elements */}
                    <Box>
                        <h4>{i18n.t('Data Elements')} ({dataElements.length})</h4>
                        {dataElements.length > 0 ? (
                            <Box maxHeight="200px" overflow="auto" border="1px solid #e0e0e0" padding="8px">
                                {dataElements.map(element => (
                                    <Box key={element.id} padding="4px 0" borderBottom="1px solid #f0f0f0">
                                        <div style={{ marginBottom: '2px' }}>
                                            <span style={{ fontWeight: '500' }}>{element.displayName}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#666', display: 'flex', gap: '12px' }}>
                                            <span>
                                                <strong>ID:</strong> {element.id}
                                            </span>
                                            {element.categoryCombo && (
                                                <span>
                                                    <strong>Category Combo:</strong> {element.categoryCombo.displayName || element.categoryCombo.id}
                                                </span>
                                            )}
                                            {element.valueType && (
                                                <span>
                                                    <strong>Type:</strong> {element.valueType}
                                                </span>
                                            )}
                                        </div>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <NoticeBox>
                                {i18n.t('No data elements assigned to this dataset')}
                            </NoticeBox>
                        )}
                    </Box>

                    {/* Organisation Units */}
                    <Box>
                        <h4>{i18n.t('Organisation Units')} ({organisationUnits.length})</h4>
                        {organisationUnits.length > 0 ? (
                            <Box maxHeight="200px" overflow="auto" border="1px solid #e0e0e0" padding="8px">
                                {organisationUnits.slice(0, 20).map(unit => (
                                    <Box key={unit.id} padding="4px 0" borderBottom="1px solid #f0f0f0">
                                        <span>{unit.displayName}</span>
                                    </Box>
                                ))}
                                {organisationUnits.length > 20 && (
                                    <Box padding="8px" textAlign="center" color="#666">
                                        {i18n.t('... and {{count}} more', { count: organisationUnits.length - 20 })}
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <NoticeBox>
                                {i18n.t('No organisation units assigned to this dataset')}
                            </NoticeBox>
                        )}
                    </Box>
                </Box>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={onClose}>
                        {i18n.t('Close')}
                    </Button>
                    <Button primary onClick={onUse}>
                        {i18n.t('Use for Assessment')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}