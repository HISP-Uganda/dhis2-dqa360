import React, { useState, useEffect } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
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
    CircularLoader,
    NoticeBox,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    InputField,
    SingleSelect,
    SingleSelectOption,
    MultiSelect,
    MultiSelectOption,
    Checkbox,
    Tag
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { CenteredLoader } from '../../components/CenteredLoader'

// Dynamic query that will be created based on selected dataset
const createDataElementsQuery = (dataSetId) => ({
    dataSet: {
        resource: `dataSets/${dataSetId}`,
        params: {
            fields: 'id,displayName,periodType,dataSetElements[dataElement[id,displayName,valueType,domainType,aggregationType,categoryCombo[displayName]]]'
        }
    },
    categoryCombos: {
        resource: 'categoryCombos',
        params: {
            fields: 'id,displayName',
            pageSize: 50,
            page: 1
        }
    }
})

export const DataElementManagement = ({ dhis2Config, dataSets = [], selectedDataSet, value = [], onChange, onDataElementsSelect }) => {
    const [externalData, setExternalData] = useState(null)
    const [externalLoading, setExternalLoading] = useState(false)
    const [externalError, setExternalError] = useState(null)

    // Function to fetch dataset details from external DHIS2 for multiple datasets
    const fetchExternalDataSetDetails = async () => {
        if (!dhis2Config?.configured || !dataSets?.length) return

        setExternalLoading(true)
        setExternalError(null)

        try {
            const auth = btoa(`${dhis2Config.username}:${dhis2Config.password}`)
            
            // Fetch details for all selected datasets
            const dataSetPromises = dataSets.map(async (dataSet) => {
                const response = await fetch(`${dhis2Config.baseUrl}/api/dataSets/${dataSet.id}?fields=id,displayName,periodType,dataSetElements[dataElement[id,displayName,valueType,domainType,aggregationType,categoryCombo[displayName],code,description]]`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (response.ok) {
                    const result = await response.json()
                    return result
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }
            })

            const dataSetResults = await Promise.all(dataSetPromises)
            
            // Also fetch category combos
            const categoryResponse = await fetch(`${dhis2Config.baseUrl}/api/categoryCombos?fields=id,displayName&pageSize=1000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            })

            let categoryCombos = []
            if (categoryResponse.ok) {
                const categoryResult = await categoryResponse.json()
                categoryCombos = categoryResult.categoryCombos || []
            }

            setExternalData({
                dataSets: dataSetResults,
                categoryCombos: { categoryCombos }
            })
        } catch (error) {
            console.error('Error fetching external dataset details:', error)
            setExternalError(error.message)
        } finally {
            setExternalLoading(false)
        }
    }

    // Fetch external data when config or selected datasets change
    useEffect(() => {
        if (dhis2Config?.configured && dataSets?.length > 0) {
            fetchExternalDataSetDetails()
        }
    }, [dhis2Config, dataSets])

    // Mock data for development/testing when DHIS2 is not configured
    const mockDataSets = [
        {
            id: 'mock_dataset_1',
            displayName: 'ANC - Antenatal Care',
            periodType: 'Monthly',
            dataSetElements: [
                { 
                    dataElement: { 
                        id: 'de1', 
                        displayName: 'ANC 1st visit', 
                        code: 'ANC_1ST_VISIT',
                        description: 'Number of pregnant women who attended ANC for the first time',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'default' }
                    } 
                },
                { 
                    dataElement: { 
                        id: 'de2', 
                        displayName: 'ANC 4th visit', 
                        code: 'ANC_4TH_VISIT',
                        description: 'Number of pregnant women who attended ANC for the fourth time',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'default' }
                    } 
                },
                { 
                    dataElement: { 
                        id: 'de3', 
                        displayName: 'ANC IPT 1st dose', 
                        code: 'ANC_IPT_1ST',
                        description: 'Number of pregnant women who received IPT 1st dose during ANC',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'default' }
                    } 
                }
            ]
        },
        {
            id: 'mock_dataset_2',
            displayName: 'Immunization',
            periodType: 'Monthly',
            dataSetElements: [
                { 
                    dataElement: { 
                        id: 'de4', 
                        displayName: 'BCG doses given', 
                        code: 'BCG_DOSES',
                        description: 'Number of BCG doses administered to children',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'Age (<1 year, 1-4 years)' }
                    } 
                },
                { 
                    dataElement: { 
                        id: 'de5', 
                        displayName: 'OPV3 doses given', 
                        code: 'OPV3_DOSES',
                        description: 'Number of OPV3 doses administered to children',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'Age (<1 year, 1-4 years)' }
                    } 
                },
                { 
                    dataElement: { 
                        id: 'de6', 
                        displayName: 'Measles doses given', 
                        code: 'MEASLES_DOSES',
                        description: 'Number of measles vaccine doses administered to children',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'Age (<1 year, 1-4 years)' }
                    } 
                }
            ]
        },
        {
            id: 'mock_dataset_3',
            displayName: 'Malaria',
            periodType: 'Monthly',
            dataSetElements: [
                { 
                    dataElement: { 
                        id: 'de7', 
                        displayName: 'Malaria cases tested', 
                        code: 'MAL_TESTED',
                        description: 'Number of suspected malaria cases tested',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'Age and Gender' }
                    } 
                },
                { 
                    dataElement: { 
                        id: 'de8', 
                        displayName: 'Malaria cases confirmed', 
                        code: 'MAL_CONFIRMED',
                        description: 'Number of malaria cases confirmed positive',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'Age and Gender' }
                    } 
                },
                { 
                    dataElement: { 
                        id: 'de9', 
                        displayName: 'Malaria cases treated', 
                        code: 'MAL_TREATED',
                        description: 'Number of confirmed malaria cases treated',
                        valueType: 'INTEGER',
                        domainType: 'AGGREGATE',
                        aggregationType: 'SUM',
                        categoryCombo: { displayName: 'Age and Gender' }
                    } 
                },
                { 
                    dataElement: { 
                        id: 'de10', 
                        displayName: 'Malaria death rate', 
                        code: 'MAL_DEATH_RATE',
                        description: 'Percentage of malaria cases that resulted in death',
                        valueType: 'PERCENTAGE',
                        domainType: 'AGGREGATE',
                        aggregationType: 'AVERAGE',
                        categoryCombo: { displayName: 'Age and Gender' }
                    } 
                }
            ]
        }
    ]

    // Use external data if available, otherwise use mock data for development
    const data = externalData || { dataSets: dhis2Config?.configured ? [] : mockDataSets }
    const loading = externalLoading
    const error = externalError
    
    const [selectedElements, setSelectedElements] = useState(new Set())
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterValueType, setFilterValueType] = useState('')
    const [filterDataset, setFilterDataset] = useState('') // '' means show all datasets
    const [showSelectedOnly, setShowSelectedOnly] = useState(false)

    // Reset selected elements when datasets change
    useEffect(() => {
        setSelectedElements(new Set())
        setSearchTerm('')
        setFilterValueType('')
        setFilterDataset('')
        setShowSelectedOnly(false)
    }, [dataSets])

    // Extract data elements from all selected datasets and add dataset source info
    const availableElements = React.useMemo(() => {
        if (!data?.dataSets) {
            console.log('DataElementManagement - No dataSets in data:', data)
            return []
        }
        
        const elementsMap = new Map()
        
        data.dataSets.forEach(dataSet => {
            const elements = dataSet.dataSetElements?.map(dse => dse.dataElement).filter(Boolean) || []
            console.log(`DataElementManagement - Processing dataset ${dataSet.displayName}:`, elements.length, 'elements')
            
            elements.forEach(element => {
                if (!elementsMap.has(element.id)) {
                    elementsMap.set(element.id, {
                        ...element,
                        sourceDataSets: [{ id: dataSet.id, displayName: dataSet.displayName }]
                    })
                } else {
                    // Add this dataset as another source
                    const existing = elementsMap.get(element.id)
                    existing.sourceDataSets.push({ id: dataSet.id, displayName: dataSet.displayName })
                }
            })
        })
        
        const result = Array.from(elementsMap.values())
        console.log('DataElementManagement - Total unique elements:', result.length)
        
        return result
    }, [data])
    
    // Filter data elements based on search and filters
    const filteredElements = React.useMemo(() => {
        const filtered = availableElements.filter(element => {
            if (!element || !element.displayName) return false
            
            // Search in multiple fields for better user experience
            const searchFields = [
                element.displayName || '',
                element.code || '',
                element.description || ''
            ].join(' ').toLowerCase()
            
            const matchesSearch = !searchTerm || searchFields.includes(searchTerm.toLowerCase())
            const matchesValueType = !filterValueType || element.valueType === filterValueType
            const matchesDataset = !filterDataset || element.sourceDataSets?.some(ds => ds.id === filterDataset)
            const matchesSelection = !showSelectedOnly || selectedElements.has(element.id)
            
            return matchesSearch && matchesValueType && matchesDataset && matchesSelection
        })
        
        // Debug logging
        console.log('DataElementManagement - Filter Debug:', {
            totalElements: availableElements.length,
            filteredElements: filtered.length,
            searchTerm,
            filterValueType,
            filterDataset,
            showSelectedOnly,
            selectedCount: selectedElements.size
        })
        
        return filtered
    }, [availableElements, searchTerm, filterValueType, filterDataset, showSelectedOnly, selectedElements])

    const handleElementToggle = (elementId) => {
        const newSelected = new Set(selectedElements)
        if (newSelected.has(elementId)) {
            newSelected.delete(elementId)
        } else {
            newSelected.add(elementId)
        }
        setSelectedElements(newSelected)
    }

    const handleSelectAll = () => {
        if (selectedElements.size === filteredElements.length) {
            setSelectedElements(new Set())
        } else {
            setSelectedElements(new Set(filteredElements.map(el => el.id)))
        }
    }

    const getValueTypeColor = (valueType) => {
        const colors = {
            'INTEGER': 'blue',
            'NUMBER': 'green',
            'TEXT': 'orange',
            'BOOLEAN': 'purple',
            'DATE': 'red',
            'PERCENTAGE': 'teal'
        }
        return colors[valueType] || 'grey'
    }

    // Check if DHIS2 is configured
    if (!dhis2Config?.configured) {
        return (
            <Box>
                <NoticeBox warning title={i18n.t('DHIS2 Configuration Required')}>
                    {i18n.t('Please configure the external DHIS2 instance first in the DHIS2 Configuration tab.')}
                </NoticeBox>
            </Box>
        )
    }

    // Show message if no datasets are selected
    if (!dataSets || dataSets.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                <NoticeBox title={i18n.t('No Datasets Selected')}>
                    {i18n.t('Please select one or more datasets from the Data Sets tab to view their data elements.')}
                </NoticeBox>
            </Box>
        )
    }

    // Show loading state when fetching dataset-specific data elements
    if (loading) {
        return (
            <Box>
                <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>{i18n.t('Loading data elements from {{count}} selected datasets...', { count: dataSets.length })}</h3>
                    <Box display="flex" gap="8px" flexWrap="wrap" marginTop="8px">
                        {dataSets.map(ds => (
                            <Tag key={ds.id} color="blue">{ds.displayName}</Tag>
                        ))}
                    </Box>
                </Box>
                <CenteredLoader 
                    message={i18n.t('Loading data elements...')}
                    minHeight="300px"
                />
            </Box>
        )
    }

    // Show error state
    if (error) {
        return (
            <Box>
                <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>{i18n.t('Error loading data elements from selected datasets')}</h3>
                </Box>
                <NoticeBox error title={i18n.t('Error loading data elements')}>
                    {error}
                </NoticeBox>
            </Box>
        )
    }

    return (
        <Box>
            {/* Selected Datasets Header */}
            <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <h3 style={{ margin: '0 0 8px 0' }}>
                            {i18n.t('Selected Datasets ({{count}})', { count: dataSets.length })}
                        </h3>
                        <Box display="flex" gap="8px" alignItems="center" flexWrap="wrap" marginBottom="8px">
                            {dataSets.map(ds => (
                                <Tag key={ds.id} color="blue">{ds.displayName}</Tag>
                            ))}
                        </Box>
                        <span style={{ color: '#666', fontSize: '14px' }}>
                            {availableElements.length} {i18n.t('unique data elements available')}
                        </span>
                    </Box>
                    <ButtonStrip>
                        <Button onClick={() => setShowCreateModal(true)} disabled={selectedElements.size === 0}>
                            {i18n.t('Create Assessment Dataset')}
                        </Button>
                        <Button primary onClick={() => {
                            if (onChange && selectedElements.size > 0) {
                                const selectedElementsData = availableElements.filter(el => selectedElements.has(el.id))
                                onChange(selectedElementsData)
                            }
                        }} disabled={selectedElements.size === 0}>
                            {i18n.t('Continue to Organisation Units')} ({selectedElements.size})
                        </Button>
                    </ButtonStrip>
                </Box>
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                <h3>{i18n.t('Data Element Selection')}</h3>
            </Box>

            {/* Filters */}
            <Box display="flex" gap="16px" marginBottom="16px" alignItems="end">
                <Box flex="1">
                    <InputField
                        label={i18n.t('Search data elements')}
                        placeholder={i18n.t('Enter data element name...')}
                        value={searchTerm}
                        onChange={({ value }) => setSearchTerm(value)}
                    />
                </Box>
                <Box width="200px">
                    <SingleSelect
                        label={i18n.t('Value Type')}
                        placeholder={i18n.t('All types')}
                        selected={filterValueType}
                        onChange={({ selected }) => setFilterValueType(selected)}
                        clearable
                        clearText={i18n.t('Clear selection')}
                    >
                        <SingleSelectOption value="INTEGER" label={i18n.t('Integer')} />
                        <SingleSelectOption value="NUMBER" label={i18n.t('Number')} />
                        <SingleSelectOption value="TEXT" label={i18n.t('Text')} />
                        <SingleSelectOption value="BOOLEAN" label={i18n.t('Boolean')} />
                        <SingleSelectOption value="DATE" label={i18n.t('Date')} />
                        <SingleSelectOption value="PERCENTAGE" label={i18n.t('Percentage')} />
                    </SingleSelect>
                </Box>
                <Box width="200px">
                    <SingleSelect
                        label={i18n.t('Filter by Dataset')}
                        placeholder={i18n.t('All datasets')}
                        selected={filterDataset}
                        onChange={({ selected }) => setFilterDataset(selected)}
                        clearable
                        clearText={i18n.t('Clear selection')}
                    >
                        {dataSets.map(dataset => (
                            <SingleSelectOption 
                                key={dataset.id} 
                                value={dataset.id} 
                                label={dataset.displayName || dataset.name} 
                            />
                        ))}
                    </SingleSelect>
                </Box>
                <Box>
                    <Checkbox
                        label={i18n.t('Show selected only')}
                        checked={showSelectedOnly}
                        onChange={({ checked }) => setShowSelectedOnly(checked)}
                    />
                </Box>
            </Box>

            {/* Selection Summary */}
            {selectedElements.size > 0 && (
                <Box marginBottom="16px">
                    <NoticeBox title={i18n.t('Selection Summary')}>
                        {i18n.t('{{count}} data elements selected for assessment', { count: selectedElements.size })}
                    </NoticeBox>
                </Box>
            )}

            {/* Data Elements Table */}
            <DataTable>
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>
                            <Checkbox
                                checked={selectedElements.size === filteredElements.length && filteredElements.length > 0}
                                indeterminate={selectedElements.size > 0 && selectedElements.size < filteredElements.length}
                                onChange={handleSelectAll}
                            />
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Data Element Name')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Code')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Value Type')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Domain Type')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Aggregation Type')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Category Combo')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Source Datasets')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Description')}
                        </DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {filteredElements.map(element => {
                        const isSelected = selectedElements.has(element.id)
                        return (
                            <DataTableRow 
                                key={element.id}
                                style={{ 
                                    backgroundColor: isSelected ? '#f3e5f5' : 'transparent',
                                    borderLeft: isSelected ? '4px solid #9c27b0' : '4px solid transparent'
                                }}
                            >
                                <DataTableCell>
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={() => handleElementToggle(element.id)}
                                    />
                                </DataTableCell>
                            <DataTableCell>
                                <div style={{ fontWeight: '500' }}>{element.displayName}</div>
                            </DataTableCell>
                            <DataTableCell>
                                <code style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '2px' }}>
                                    {element.code || 'N/A'}
                                </code>
                            </DataTableCell>
                            <DataTableCell>
                                <Tag color={getValueTypeColor(element.valueType)}>
                                    {element.valueType}
                                </Tag>
                            </DataTableCell>
                            <DataTableCell>
                                <Tag color="neutral">{element.domainType}</Tag>
                            </DataTableCell>
                            <DataTableCell>
                                <Tag color="default">{element.aggregationType}</Tag>
                            </DataTableCell>
                            <DataTableCell>
                                <Box>
                                    {element.categoryCombo?.displayName ? (
                                        <Tag 
                                            color={element.categoryCombo.displayName === 'default' ? 'grey' : 'purple'}
                                            small
                                        >
                                            {element.categoryCombo.displayName}
                                        </Tag>
                                    ) : (
                                        <span style={{ fontSize: '12px', color: '#999' }}>
                                            {i18n.t('Not specified')}
                                        </span>
                                    )}
                                </Box>
                            </DataTableCell>
                            <DataTableCell>
                                <Box display="flex" flexDirection="column" gap="2px">
                                    {element.sourceDataSets?.map((ds, index) => (
                                        <Tag key={ds.id} color="blue" small>
                                            {ds.displayName}
                                        </Tag>
                                    ))}
                                    {element.sourceDataSets?.length > 1 && (
                                        <span style={{ fontSize: '11px', color: '#666' }}>
                                            Used in {element.sourceDataSets.length} datasets
                                        </span>
                                    )}
                                </Box>
                            </DataTableCell>
                            <DataTableCell>
                                <div style={{ fontSize: '12px', maxWidth: '200px', wordWrap: 'break-word' }}>
                                    {element.description || 'No description available'}
                                </div>
                            </DataTableCell>
                        </DataTableRow>
                        )
                    })}
                </DataTableBody>
            </DataTable>

            {filteredElements.length === 0 && (
                <Box padding="24px" textAlign="center">
                    <NoticeBox>
                        {searchTerm || filterValueType || showSelectedOnly
                            ? i18n.t('No data elements match your current filters')
                            : i18n.t('No data elements found')
                        }
                    </NoticeBox>
                </Box>
            )}

            {/* Create Assessment Dataset Modal */}
            {showCreateModal && (
                <CreateDatasetModal
                    selectedElements={Array.from(selectedElements)}
                    dataElements={availableElements}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </Box>
    )
}

const CreateDatasetModal = ({ selectedElements, dataElements, onClose }) => {
    const [datasetName, setDatasetName] = useState('')
    const [description, setDescription] = useState('')
    const [periodType, setPeriodType] = useState('')

    const selectedElementsData = dataElements.filter(el => selectedElements.includes(el.id))

    const handleCreate = () => {
        // Here you would typically make an API call to create the dataset
        console.log('Creating dataset:', {
            name: datasetName,
            description,
            periodType,
            dataElements: selectedElements
        })
        onClose()
    }

    return (
        <Modal large onClose={onClose}>
            <ModalTitle>{i18n.t('Create Assessment Dataset')}</ModalTitle>
            <ModalContent>
                <Box display="flex" flexDirection="column" gap="16px">
                    <InputField
                        label={i18n.t('Dataset Name')}
                        placeholder={i18n.t('Enter dataset name...')}
                        value={datasetName}
                        onChange={({ value }) => setDatasetName(value)}
                        required
                    />
                    
                    <InputField
                        label={i18n.t('Description')}
                        placeholder={i18n.t('Enter dataset description...')}
                        value={description}
                        onChange={({ value }) => setDescription(value)}
                    />

                    <SingleSelect
                        label={i18n.t('Period Type')}
                        placeholder={i18n.t('Select period type')}
                        selected={periodType}
                        onChange={({ selected }) => setPeriodType(selected)}
                        required
                    >
                        <SingleSelectOption value="Monthly" label={i18n.t('Monthly')} />
                        <SingleSelectOption value="Quarterly" label={i18n.t('Quarterly')} />
                        <SingleSelectOption value="Yearly" label={i18n.t('Yearly')} />
                        <SingleSelectOption value="Weekly" label={i18n.t('Weekly')} />
                    </SingleSelect>

                    <Box>
                        <h4>{i18n.t('Selected Data Elements')} ({selectedElementsData.length})</h4>
                        <Box maxHeight="200px" overflow="auto" border="1px solid #e0e0e0" padding="8px">
                            {selectedElementsData.map(element => (
                                <Box key={element.id} padding="4px 0" borderBottom="1px solid #f0f0f0">
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <span>{element.displayName}</span>
                                        <Tag color={element.valueType === 'INTEGER' ? 'blue' : 'green'}>
                                            {element.valueType}
                                        </Tag>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={onClose}>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button 
                        primary 
                        onClick={handleCreate}
                        disabled={!datasetName || !periodType || selectedElements.length === 0}
                    >
                        {i18n.t('Create Dataset')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}