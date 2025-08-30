import React, { useState, useEffect, useMemo } from 'react'
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
    Card,
    InputField,
    SingleSelectField,
    SingleSelectOption,
    Tag,
    Checkbox,
    Pagination
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { CenteredLoader } from './CenteredLoader'

export const AssessmentDataSetSelection = ({ 
    dhis2Config, 
    onDataSetSelected, 
    selectedDataSet,
    onDataSetsSelected, // New prop for multiple selection
    selectedDataSets = [], // New prop for multiple selection
    onDataElementsSelected,
    selectedDataElements = [],
    mode = 'datasets', // 'datasets' or 'dataelements'
    multiSelect = false, // New prop to enable multi-select mode
    customDatasets = [] // New prop for custom datasets
}) => {
    const [loading, setLoading] = useState(false)
    const [dataSets, setDataSets] = useState([])
    const [dataElements, setDataElements] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(25)

    // Fetch datasets from DHIS2 and combine with custom datasets
    const fetchDataSets = async () => {
        setLoading(true)
        setError(null)
        
        try {
            let dhis2DataSets = []
            
            // Fetch DHIS2 datasets if configured
            if (dhis2Config?.configured) {
                console.log('🔄 Fetching datasets with comprehensive metadata...')
                
                // Import the enhanced dhis2Service
                const { dhis2Service } = await import('../services/dhis2Service')
                
                // Use the enhanced metadata fetching function
                const result = await dhis2Service.getDataSetsWithMetadata(
                    dhis2Config.baseUrl,
                    dhis2Config.username,
                    dhis2Config.password,
                    1000 // pageSize
                )
                
                dhis2DataSets = result.dataSets || []
                
                console.log(`✅ Loaded ${dhis2DataSets.length} DHIS2 datasets with comprehensive metadata`)
                console.log('📊 Sample dataset structure:', dhis2DataSets[0] ? {
                    id: dhis2DataSets[0].id,
                    displayName: dhis2DataSets[0].displayName,
                    totalDataElements: dhis2DataSets[0].totalDataElements,
                    totalOrgUnits: dhis2DataSets[0].totalOrgUnits,
                    periodType: dhis2DataSets[0].periodType
                } : 'No datasets found')
            }
            
            // Add manual datasets with proper formatting
            const manualDatasets = memoizedCustomDatasets.map(ds => ({
                ...ds,
                source: 'manual',
                isCustom: true,
                isDhis2: false,
                isManual: true,
                displayName: ds.displayName || ds.name,
                // Ensure manual datasets have the expected structure
                dataSetElements: ds.dataSetElements || []
            }))
            
            // Combine DHIS2 and manual datasets into localDatasets
            const localDatasets = [...dhis2DataSets, ...manualDatasets]
            setDataSets(localDatasets)
            
            console.log(`📊 Loaded ${dhis2DataSets.length} DHIS2 datasets and ${manualDatasets.length} manual datasets`)
            console.log(`📊 Total localDatasets: ${localDatasets.length}`)
        } catch (err) {
            console.error('Error fetching datasets:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Extract data elements from selected dataset(s)
    useEffect(() => {
        if (multiSelect && selectedDataSets.length > 0) {
            // Combine data elements from all selected datasets
            const elementsMap = new Map()
            selectedDataSets.forEach(dataSet => {
                if (dataSet.dataSetElements) {
                    dataSet.dataSetElements.forEach(dse => {
                        const element = dse.dataElement
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
                }
            })
            setDataElements(Array.from(elementsMap.values()))
        } else if (!multiSelect && selectedDataSet && selectedDataSet.dataSetElements) {
            const elements = selectedDataSet.dataSetElements.map(dse => ({
                ...dse.dataElement,
                sourceDataSets: [{ id: selectedDataSet.id, displayName: selectedDataSet.displayName }]
            }))
            setDataElements(elements)
        } else {
            setDataElements([])
        }
    }, [selectedDataSet, selectedDataSets, multiSelect])

    // Memoize custom datasets to prevent unnecessary re-renders
    const memoizedCustomDatasets = useMemo(() => {
        return Array.isArray(customDatasets) ? customDatasets : []
    }, [customDatasets])

    // Load datasets when component mounts, config changes, or custom datasets change
    useEffect(() => {
        console.log('🔄 AssessmentDataSetSelection: Fetching datasets...')
        console.log('📊 DHIS2 Config:', dhis2Config?.configured ? 'Configured' : 'Not configured')
        console.log('📊 Custom datasets count:', memoizedCustomDatasets.length)
        fetchDataSets()
    }, [dhis2Config?.configured, dhis2Config?.baseUrl, dhis2Config?.username, memoizedCustomDatasets.length])

    // Filter datasets based on search term
    const filteredDataSets = dataSets.filter(ds => 
        ds.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ds.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Filter data elements based on search term
    const filteredDataElements = dataElements.filter(de => 
        de.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Pagination calculations for datasets
    const totalDataSets = filteredDataSets.length
    const totalDataSetPages = Math.ceil(totalDataSets / itemsPerPage)
    const dataSetStartIndex = (currentPage - 1) * itemsPerPage
    const dataSetEndIndex = dataSetStartIndex + itemsPerPage
    const paginatedDataSets = filteredDataSets.slice(dataSetStartIndex, dataSetEndIndex)

    // Pagination calculations for data elements
    const totalDataElements = filteredDataElements.length
    const totalDataElementPages = Math.ceil(totalDataElements / itemsPerPage)
    const dataElementStartIndex = (currentPage - 1) * itemsPerPage
    const dataElementEndIndex = dataElementStartIndex + itemsPerPage
    const paginatedDataElements = filteredDataElements.slice(dataElementStartIndex, dataElementEndIndex)

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    // Fetch detailed metadata for a specific dataset
    const fetchDataSetDetails = async (dataSet) => {
        if (!dataSet.isDhis2 || !dhis2Config?.configured) {
            return dataSet // Return as-is for manual datasets
        }

        try {
            console.log(`🔄 Fetching detailed metadata for dataset: ${dataSet.displayName}`)
            
            // Import the enhanced dhis2Service
            const { dhis2Service } = await import('../services/dhis2Service')
            
            // Fetch comprehensive metadata for this specific dataset
            const detailedDataSet = await dhis2Service.getDataSetWithMetadata(
                dhis2Config.baseUrl,
                dhis2Config.username,
                dhis2Config.password,
                dataSet.id
            )
            
            console.log(`✅ Loaded detailed metadata for: ${detailedDataSet.displayName}`)
            console.log(`   - Data Elements: ${detailedDataSet.totalDataElements}`)
            console.log(`   - Organisation Units: ${detailedDataSet.totalOrgUnits}`)
            
            return detailedDataSet
        } catch (error) {
            console.error('Error fetching dataset details:', error)
            // Return original dataset if detailed fetch fails
            return dataSet
        }
    }

    // Handle dataset selection (single mode)
    const handleDataSetSelect = async (dataSet) => {
        // Show loading state while fetching details
        setLoading(true)
        
        try {
            // Fetch detailed metadata
            const detailedDataSet = await fetchDataSetDetails(dataSet)
            onDataSetSelected(detailedDataSet)
        } catch (error) {
            console.error('Error selecting dataset:', error)
            // Fallback to original dataset
            onDataSetSelected(dataSet)
        } finally {
            setLoading(false)
        }
    }

    // Handle dataset selection (multi mode)
    const handleDataSetToggle = (dataSet) => {
        if (!multiSelect) {
            handleDataSetSelect(dataSet)
            return
        }

        const isSelected = selectedDataSets.includes(dataSet.id)
        let newSelectedIds
        let newSelectedDatasets

        if (isSelected) {
            newSelectedIds = selectedDataSets.filter(id => id !== dataSet.id)
            newSelectedDatasets = filteredDataSets.filter(ds => newSelectedIds.includes(ds.id))
        } else {
            newSelectedIds = [...selectedDataSets, dataSet.id]
            newSelectedDatasets = filteredDataSets.filter(ds => newSelectedIds.includes(ds.id))
        }

        onDataSetsSelected(newSelectedIds, newSelectedDatasets)
    }

    // Select all datasets (multi mode)
    const handleSelectAllDataSets = () => {
        if (!multiSelect) return

        if (filteredDataSets.every(ds => selectedDataSets.includes(ds.id))) {
            onDataSetsSelected([], [])
        } else {
            onDataSetsSelected(filteredDataSets.map(ds => ds.id), [...filteredDataSets])
        }
    }

    // Handle data element selection
    const handleDataElementToggle = (dataElement) => {
        const isSelected = selectedDataElements.some(de => de.id === dataElement.id)
        let newSelection
        
        if (isSelected) {
            newSelection = selectedDataElements.filter(de => de.id !== dataElement.id)
        } else {
            newSelection = [...selectedDataElements, dataElement]
        }
        
        onDataElementsSelected(newSelection)
    }

    // Select all data elements
    const handleSelectAll = () => {
        if (selectedDataElements.length === dataElements.length) {
            onDataElementsSelected([])
        } else {
            onDataElementsSelected([...dataElements])
        }
    }

    // Allow proceeding without connection test - will attempt to load datasets directly
    // if (!dhis2Config?.configured) {
    //     return (
    //         <NoticeBox warning title={i18n.t('DHIS2 Connection Required')}>
    //             {i18n.t('Please configure your DHIS2 connection first before selecting datasets.')}
    //         </NoticeBox>
    //     )
    // }

    if (loading) {
        return (
            <CenteredLoader 
                message={i18n.t('Loading datasets...')}
                minHeight="200px"
            />
        )
    }

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Error Loading Data')}>
                {error}
                <Box marginTop="16px">
                    <Button onClick={fetchDataSets}>
                        {i18n.t('Retry')}
                    </Button>
                </Box>
            </NoticeBox>
        )
    }

    if (mode === 'datasets') {
        return (
            <Box>
                <Card style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>
                        {i18n.t('Select Dataset')}
                    </h3>
                    <p style={{ margin: '0 0 24px 0', color: '#6c757d' }}>
                        {i18n.t('Choose the dataset that contains the data elements you want to assess for data quality.')}
                    </p>

                    <InputField
                        label={i18n.t('Search Datasets')}
                        value={searchTerm}
                        onChange={({ value }) => setSearchTerm(value)}
                        placeholder={i18n.t('Search by dataset name...')}
                        style={{ marginBottom: '16px' }}
                    />

                    {/* Dataset Source Summary */}
                    {dataSets.length > 0 && (
                        <Box style={{ 
                            marginBottom: '24px', 
                            padding: '12px 16px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '6px',
                            border: '1px solid #e9ecef'
                        }}>
                            <Box display="flex" alignItems="center" gap="16px" style={{ fontSize: '14px', color: '#495057' }}>
                                <span>
                                    📊 <strong>{dataSets.length}</strong> {i18n.t('total datasets')}
                                </span>
                                <span>
                                    🔗 <strong>{dataSets.filter(ds => ds.isDhis2).length}</strong> {i18n.t('from DHIS2')}
                                </span>
                                <span>
                                    ✏️ <strong>{dataSets.filter(ds => ds.isManual).length}</strong> {i18n.t('manual datasets')}
                                </span>
                            </Box>
                        </Box>
                    )}

                    {/* Selection Summary */}
                    {multiSelect ? (
                        selectedDataSets.length > 0 && (
                            <Box style={{ marginBottom: '24px' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginBottom: '12px' }}>
                                    <Tag positive>
                                        {selectedDataSets.length} {i18n.t('datasets selected')}
                                    </Tag>
                                    <Button
                                        small
                                        secondary
                                        onClick={handleSelectAllDataSets}
                                    >
                                        {selectedDataSets.length === filteredDataSets.length ? i18n.t('Deselect All') : i18n.t('Select All')}
                                    </Button>
                                </Box>
                                <Box display="flex" flexWrap="wrap" gap="4px">
                                    {(Array.isArray(selectedDataSets) ? dataSets.filter(ds => selectedDataSets.includes(ds.id)) : []).map(ds => (
                                        <Tag key={ds.id} positive small>
                                            {ds.displayName}
                                        </Tag>
                                    ))}
                                </Box>
                            </Box>
                        )
                    ) : (
                        selectedDataSet && (
                            <Box style={{ marginBottom: '24px' }}>
                                <Tag positive>
                                    {i18n.t('Selected')}: {selectedDataSet.displayName}
                                </Tag>
                            </Box>
                        )
                    )}
                </Card>

                <Card style={{ padding: '24px' }}>
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                {multiSelect && (
                                    <DataTableColumnHeader width="60px">
                                        <Checkbox
                                            checked={filteredDataSets.every(ds => selectedDataSets.includes(ds.id)) && filteredDataSets.length > 0}
                                            indeterminate={filteredDataSets.some(ds => selectedDataSets.includes(ds.id)) && !filteredDataSets.every(ds => selectedDataSets.includes(ds.id))}
                                            onChange={handleSelectAllDataSets}
                                        />
                                    </DataTableColumnHeader>
                                )}
                                <DataTableColumnHeader>{i18n.t('Dataset Name')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Source')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Period Type')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Category Combo')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Data Elements')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Org Units')}</DataTableColumnHeader>
                                {!multiSelect && <DataTableColumnHeader>{i18n.t('Action')}</DataTableColumnHeader>}
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {paginatedDataSets.map(dataSet => {
                                const isSelected = multiSelect 
                                    ? selectedDataSets.includes(dataSet.id)
                                    : selectedDataSet?.id === dataSet.id
                                
                                return (
                                    <DataTableRow 
                                        key={dataSet.id}
                                        style={{ 
                                            backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                                            borderLeft: isSelected ? '4px solid #1976d2' : '4px solid transparent'
                                        }}
                                    >
                                        {multiSelect && (
                                            <DataTableCell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => handleDataSetToggle(dataSet)}
                                                />
                                            </DataTableCell>
                                        )}
                                        <DataTableCell>
                                            <Box display="flex" alignItems="center" gap="8px">
                                                <span style={{ fontWeight: isSelected ? '600' : '400' }}>
                                                    {dataSet.displayName}
                                                </span>
                                                {/* Source indicator */}
                                                {dataSet.isDhis2 && (
                                                    <Tag neutral small>
                                                        🔗 DHIS2
                                                    </Tag>
                                                )}
                                                {dataSet.isManual && (
                                                    <Tag neutral small>
                                                        ✏️ Manual
                                                    </Tag>
                                                )}
                                                {isSelected && (
                                                    <Tag positive small>
                                                        {i18n.t('Selected')}
                                                    </Tag>
                                                )}
                                            </Box>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <Tag 
                                                positive={dataSet.isCustom}
                                                neutral={!dataSet.isCustom}
                                                small
                                            >
                                                {dataSet.isCustom ? i18n.t('Custom') : i18n.t('DHIS2')}
                                            </Tag>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <Tag neutral>{dataSet.periodType}</Tag>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <Tag neutral>{dataSet.categoryCombo?.displayName || i18n.t('Default')}</Tag>
                                        </DataTableCell>
                                        <DataTableCell>
                                            {dataSet.totalDataElements || dataSet.dataSetElements?.length || 0}
                                        </DataTableCell>
                                        <DataTableCell>
                                            {dataSet.totalOrgUnits || dataSet.organisationUnits?.length || 0}
                                        </DataTableCell>
                                        {!multiSelect && (
                                            <DataTableCell>
                                                <Button
                                                    small
                                                    primary={selectedDataSet?.id === dataSet.id}
                                                    secondary={selectedDataSet?.id !== dataSet.id}
                                                    onClick={() => handleDataSetSelect(dataSet)}
                                                >
                                                    {selectedDataSet?.id === dataSet.id ? i18n.t('Selected') : i18n.t('Select')}
                                                </Button>
                                            </DataTableCell>
                                        )}
                                    </DataTableRow>
                                )
                            })}
                        </DataTableBody>
                    </DataTable>

                    {/* Pagination Controls for Datasets */}
                    {totalDataSetPages > 1 && (
                        <Box padding="16px" display="flex" justifyContent="space-between" alignItems="center" borderTop="1px solid #e8eaed">
                            <Box fontSize="14px" color="#666">
                                {i18n.t('Showing {{start}}-{{end}} of {{total}} datasets', {
                                    start: dataSetStartIndex + 1,
                                    end: Math.min(dataSetEndIndex, totalDataSets),
                                    total: totalDataSets
                                })}
                            </Box>
                            <Pagination
                                page={currentPage}
                                pageCount={totalDataSetPages}
                                pageSize={itemsPerPage}
                                total={totalDataSets}
                                onPageChange={setCurrentPage}
                                hidePageSizeSelect
                            />
                        </Box>
                    )}

                    {filteredDataSets.length === 0 && (
                        <Box textAlign="center" padding="32px">
                            <p style={{ color: '#6c757d' }}>
                                {searchTerm ? i18n.t('No datasets found matching your search.') : i18n.t('No datasets available.')}
                            </p>
                        </Box>
                    )}
                </Card>
            </Box>
        )
    }

    if (mode === 'dataelements') {
        const hasSelectedDatasets = multiSelect ? selectedDataSets.length > 0 : selectedDataSet
        
        if (!hasSelectedDatasets) {
            return (
                <NoticeBox warning title={i18n.t('Dataset Required')}>
                    {multiSelect 
                        ? i18n.t('Please select at least one dataset first before choosing data elements.')
                        : i18n.t('Please select a dataset first before choosing data elements.')
                    }
                </NoticeBox>
            )
        }

        return (
            <Box>
                <Card style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>
                        {i18n.t('Select Data Elements')}
                    </h3>
                    <p style={{ margin: '0 0 16px 0', color: '#6c757d' }}>
                        {multiSelect 
                            ? i18n.t('Choose the specific data elements from the selected datasets that you want to include in your data quality assessment.')
                            : i18n.t('Choose the specific data elements from') + ' ' + selectedDataSet.displayName + ' ' + i18n.t('that you want to include in your data quality assessment.')
                        }
                    </p>

                    {/* Show selected datasets summary */}
                    {multiSelect && selectedDataSets.length > 0 && (
                        <Box style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#495057' }}>
                                {i18n.t('Selected Datasets')}:
                            </div>
                            <Box display="flex" flexWrap="wrap" gap="4px">
                                {selectedDataSets.map(ds => (
                                    <Tag key={ds.id} neutral small>
                                        {ds.displayName}
                                    </Tag>
                                ))}
                            </Box>
                        </Box>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginBottom: '24px' }}>
                        <Tag neutral>
                            {selectedDataElements.length} {i18n.t('of')} {dataElements.length} {i18n.t('selected')}
                        </Tag>
                        <Button
                            small
                            secondary
                            onClick={handleSelectAll}
                        >
                            {selectedDataElements.length === dataElements.length ? i18n.t('Deselect All') : i18n.t('Select All')}
                        </Button>
                    </Box>

                    <InputField
                        label={i18n.t('Search Data Elements')}
                        value={searchTerm}
                        onChange={({ value }) => setSearchTerm(value)}
                        placeholder={i18n.t('Search by data element name...')}
                        style={{ marginBottom: '24px' }}
                    />
                </Card>

                <Card style={{ padding: '24px' }}>
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader width="60px">{i18n.t('Select')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Data Element Name')}</DataTableColumnHeader>
                                <DataTableColumnHeader width="120px">{i18n.t('Value Type')}</DataTableColumnHeader>
                                <DataTableColumnHeader width="120px">{i18n.t('Domain Type')}</DataTableColumnHeader>
                                <DataTableColumnHeader>{i18n.t('Category Combo')}</DataTableColumnHeader>
                                {multiSelect && <DataTableColumnHeader>{i18n.t('Source Datasets')}</DataTableColumnHeader>}
                                <DataTableColumnHeader width="200px">{i18n.t('ID')}</DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {paginatedDataElements.map(dataElement => (
                                <DataTableRow key={dataElement.id}>
                                    <DataTableCell>
                                        <Checkbox
                                            checked={selectedDataElements.some(de => de.id === dataElement.id)}
                                            onChange={() => handleDataElementToggle(dataElement)}
                                        />
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Box>
                                            <strong style={{ fontSize: '14px', color: '#2c3e50' }}>
                                                {dataElement.displayName}
                                            </strong>
                                        </Box>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Tag 
                                            neutral={dataElement.valueType !== 'NUMBER'}
                                            positive={dataElement.valueType === 'NUMBER'}
                                            style={{ fontSize: '11px' }}
                                        >
                                            {dataElement.valueType || 'TEXT'}
                                        </Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Tag 
                                            neutral={dataElement.domainType !== 'AGGREGATE'}
                                            positive={dataElement.domainType === 'AGGREGATE'}
                                            style={{ fontSize: '11px' }}
                                        >
                                            {dataElement.domainType || 'AGGREGATE'}
                                        </Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Box>
                                            <div style={{ fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                                                {dataElement.categoryCombo?.displayName || 'Default'}
                                            </div>
                                            {dataElement.categoryCombo?.categories && dataElement.categoryCombo.categories.length > 0 && (
                                                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                                                    {dataElement.categoryCombo.categories.map(cat => cat.displayName).join(', ')}
                                                </div>
                                            )}
                                        </Box>
                                    </DataTableCell>
                                    {multiSelect && (
                                        <DataTableCell>
                                            <Box display="flex" flexDirection="column" gap="2px">
                                                {dataElement.sourceDataSets?.map((ds, index) => (
                                                    <Tag key={ds.id} neutral small>
                                                        {ds.displayName}
                                                    </Tag>
                                                ))}
                                                {dataElement.sourceDataSets?.length > 1 && (
                                                    <span style={{ fontSize: '11px', color: '#666' }}>
                                                        Used in {dataElement.sourceDataSets.length} datasets
                                                    </span>
                                                )}
                                            </Box>
                                        </DataTableCell>
                                    )}
                                    <DataTableCell style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6c757d' }}>
                                        {dataElement.id}
                                    </DataTableCell>
                                </DataTableRow>
                            ))}
                        </DataTableBody>
                    </DataTable>

                    {/* Pagination Controls for Data Elements */}
                    {totalDataElementPages > 1 && (
                        <Box padding="16px" display="flex" justifyContent="space-between" alignItems="center" borderTop="1px solid #e8eaed">
                            <Box fontSize="14px" color="#666">
                                {i18n.t('Showing {{start}}-{{end}} of {{total}} data elements', {
                                    start: dataElementStartIndex + 1,
                                    end: Math.min(dataElementEndIndex, totalDataElements),
                                    total: totalDataElements
                                })}
                            </Box>
                            <Pagination
                                page={currentPage}
                                pageCount={totalDataElementPages}
                                pageSize={itemsPerPage}
                                total={totalDataElements}
                                onPageChange={setCurrentPage}
                                hidePageSizeSelect
                            />
                        </Box>
                    )}

                    {filteredDataElements.length === 0 && (
                        <Box textAlign="center" padding="32px">
                            <p style={{ color: '#6c757d' }}>
                                {searchTerm ? i18n.t('No data elements found matching your search.') : i18n.t('No data elements available in this dataset.')}
                            </p>
                        </Box>
                    )}
                </Card>
            </Box>
        )
    }

    return null
}