import React, { useState, useEffect, useMemo } from 'react'
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
    InputField,
    Checkbox,
    Tag,
    Pagination,
    SingleSelectField,
    SingleSelectOption
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { CenteredLoader } from '../../components/CenteredLoader'
import { OrganisationUnitCreator } from '../../components/OrganisationUnitCreator'

// Helper function to get color for org unit level
const getLevelColor = (level) => {
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
    return colors[(level - 1) % colors.length] || 'neutral'
}

// Dynamic query that will be created based on selected dataset
const createOrganisationUnitsQuery = (dataSetId) => ({
    dataSet: {
        resource: `dataSets/${dataSetId}`,
        params: {
            fields: 'id,displayName,organisationUnits[id,displayName,level,path,parent[id,displayName,parent[id,displayName]]]'
        }
    }
})

// Query for multiple datasets
const createMultipleDataSetsQuery = (dataSetIds) => {
    const queries = {}
    dataSetIds.forEach((id, index) => {
        queries[`dataSet${index}`] = {
            resource: `dataSets/${id}`,
            params: {
                fields: 'id,displayName,organisationUnits[id,displayName,level,path,parent[id,displayName,parent[id,displayName]]]'
            }
        }
    })
    return queries
}

export const OrganisationUnitManagement = ({ dhis2Config, dataSets = [], selectedDataSet, selectedDataElements, value = [], onChange, onOrganisationUnitsSelected, selectedOrganisationUnits, onCreateTemplate, metadataSource = 'manual' }) => {
    const [externalData, setExternalData] = useState(null)
    const [externalLoading, setExternalLoading] = useState(false)
    const [externalError, setExternalError] = useState(null)
    
    // Organization unit creation state
    const [orgUnitCreatorOpen, setOrgUnitCreatorOpen] = useState(false)
    const [editingOrgUnit, setEditingOrgUnit] = useState(null)
    const [customOrgUnits, setCustomOrgUnits] = useState([])

    // Memoize datasets to query to prevent unnecessary re-renders
    const datasetsToQuery = useMemo(() => {
        return dataSets?.length > 0 ? dataSets : (selectedDataSet ? [selectedDataSet] : [])
    }, [dataSets, selectedDataSet])
    
    const shouldQueryLocal = datasetsToQuery.length > 0 && metadataSource === 'manual'
    
    // Memoize the query to prevent recreation on every render
    const queryToUse = useMemo(() => {
        if (!shouldQueryLocal) {
            return { dataSet: { resource: 'me', params: {} } }
        }
        
        return datasetsToQuery.length === 1 ? 
            createOrganisationUnitsQuery(datasetsToQuery[0].id) : 
            createMultipleDataSetsQuery(datasetsToQuery.map(ds => ds.id))
    }, [shouldQueryLocal, datasetsToQuery])
    
    const { loading: localLoading, error: localError, data: localData } = useDataQuery(
        queryToUse,
        { 
            lazy: !shouldQueryLocal
        }
    )

    // Function to fetch dataset organisation units from external DHIS2
    const fetchExternalOrgUnits = async () => {
        const datasetsToFetch = dataSets?.length > 0 ? dataSets : (selectedDataSet ? [selectedDataSet] : [])
        if (metadataSource !== 'dhis2' || !dhis2Config?.configured || datasetsToFetch.length === 0) return

        setExternalLoading(true)
        setExternalError(null)

        try {
            const auth = btoa(`${dhis2Config.username}:${dhis2Config.password}`)
            
            // Fetch organization units for all selected datasets
            const promises = datasetsToFetch.map(async (dataset) => {
                const response = await fetch(`${dhis2Config.baseUrl}/api/dataSets/${dataset.id}?fields=id,displayName,organisationUnits[id,displayName,level,path,parent[id,displayName,parent[id,displayName]]]`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (response.ok) {
                    const result = await response.json()
                    return { dataset, orgUnits: result.organisationUnits || [] }
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }
            })

            const results = await Promise.all(promises)
            
            // Merge organization units from all datasets, removing duplicates
            const orgUnitsMap = new Map()
            const datasetInfo = []
            
            results.forEach(({ dataset, orgUnits }) => {
                datasetInfo.push({ id: dataset.id, displayName: dataset.displayName, orgUnitsCount: orgUnits.length })
                
                orgUnits.forEach(orgUnit => {
                    if (!orgUnitsMap.has(orgUnit.id)) {
                        orgUnitsMap.set(orgUnit.id, {
                            ...orgUnit,
                            datasets: [dataset.displayName]
                        })
                    } else {
                        // Add dataset name to existing org unit
                        const existing = orgUnitsMap.get(orgUnit.id)
                        if (!existing.datasets.includes(dataset.displayName)) {
                            existing.datasets.push(dataset.displayName)
                        }
                    }
                })
            })

            const mergedOrgUnits = Array.from(orgUnitsMap.values())
            
            setExternalData({ 
                dataSets: datasetInfo,
                organisationUnits: mergedOrgUnits,
                totalOrgUnits: mergedOrgUnits.length
            })
        } catch (error) {
            console.error('Error fetching external organisation units:', error)
            setExternalError(error.message)
        } finally {
            setExternalLoading(false)
        }
    }

    // Fetch external data when config or selected dataset changes (only for external DHIS2)
    useEffect(() => {
        if (metadataSource === 'dhis2' && dhis2Config?.configured && (dataSets?.length > 0 || selectedDataSet)) {
            fetchExternalOrgUnits()
        }
    }, [metadataSource, dhis2Config?.configured, dhis2Config?.baseUrl, dhis2Config?.username, dataSets?.map(ds => ds.id).join(','), selectedDataSet?.id])

    // Use appropriate data source based on metadataSource
    const baseData = metadataSource === 'dhis2' ? externalData : (() => {
        if (!localData) return null
        
        // Handle single dataset response
        if (localData.dataSet) {
            return {
                dataSets: [{ 
                    id: localData.dataSet.id, 
                    displayName: localData.dataSet.displayName, 
                    orgUnitsCount: localData.dataSet.organisationUnits?.length || 0 
                }],
                organisationUnits: localData.dataSet.organisationUnits || [],
                totalOrgUnits: localData.dataSet.organisationUnits?.length || 0
            }
        }
        
        // Handle multiple datasets response
        const orgUnitsMap = new Map()
        const datasetInfo = []
        
        Object.keys(localData).forEach(key => {
            if (key.startsWith('dataSet') && localData[key]) {
                const dataset = localData[key]
                datasetInfo.push({ 
                    id: dataset.id, 
                    displayName: dataset.displayName, 
                    orgUnitsCount: dataset.organisationUnits?.length || 0 
                })
                
                // Merge organization units, removing duplicates
                dataset.organisationUnits?.forEach(orgUnit => {
                    if (!orgUnitsMap.has(orgUnit.id)) {
                        orgUnitsMap.set(orgUnit.id, {
                            ...orgUnit,
                            datasets: [dataset.displayName]
                        })
                    } else {
                        // Add dataset name to existing org unit
                        const existing = orgUnitsMap.get(orgUnit.id)
                        if (!existing.datasets.includes(dataset.displayName)) {
                            existing.datasets.push(dataset.displayName)
                        }
                    }
                })
            }
        })
        
        const mergedOrgUnits = Array.from(orgUnitsMap.values())
        
        return {
            dataSets: datasetInfo,
            organisationUnits: mergedOrgUnits,
            totalOrgUnits: mergedOrgUnits.length
        }
    })()
    
    // Combine base data with custom org units
    const data = baseData ? {
        ...baseData,
        organisationUnits: [
            ...(baseData.organisationUnits || []),
            ...customOrgUnits
        ],
        totalOrgUnits: (baseData.organisationUnits?.length || 0) + customOrgUnits.length
    } : null
    const loading = metadataSource === 'dhis2' ? externalLoading : localLoading
    const error = metadataSource === 'dhis2' ? externalError : localError
    
    // Use props for selected org units, with fallback to local state if not provided
    const [localSelectedOrgUnits, setLocalSelectedOrgUnits] = useState(new Set())
    const selectedOrgUnits = value?.length > 0 ? new Set(value.map(ou => ou.id)) : 
                            selectedOrganisationUnits ? new Set(selectedOrganisationUnits) : 
                            localSelectedOrgUnits
    const setSelectedOrgUnits = onChange ? 
        (newSet) => {
            const selectedOrgUnitObjects = data?.organisationUnits?.filter(ou => newSet.has(ou.id)) || []
            onChange(selectedOrgUnitObjects)
        } :
        onOrganisationUnitsSelected ? 
        (newSet) => onOrganisationUnitsSelected(Array.from(newSet)) : 
        setLocalSelectedOrgUnits
    const [searchTerm, setSearchTerm] = useState('')
    const [filterLevel, setFilterLevel] = useState('')
    const [showSelectedOnly, setShowSelectedOnly] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(25)

    // Reset selected org units when dataset changes
    useEffect(() => {
        if (onChange) {
            onChange([])
        } else if (onOrganisationUnitsSelected) {
            onOrganisationUnitsSelected([])
        } else {
            setLocalSelectedOrgUnits(new Set())
        }
        setSearchTerm('')
        setFilterLevel('')
        setShowSelectedOnly(false)
    }, [dataSets?.map(ds => ds.id).join(','), selectedDataSet?.id]) // Only depend on dataset IDs

    // Get organisation units from the merged data
    const availableOrgUnits = data?.organisationUnits || []
    
    // Filter organisation units based on search and filters
    const filteredOrgUnits = availableOrgUnits.filter(orgUnit => {
        const matchesSearch = orgUnit.displayName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesLevel = !filterLevel || orgUnit.level?.toString() === filterLevel
        const matchesSelection = !showSelectedOnly || selectedOrgUnits.has(orgUnit.id)
        
        return matchesSearch && matchesLevel && matchesSelection
    })

    // Pagination calculations
    const totalItems = filteredOrgUnits.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedOrgUnits = filteredOrgUnits.slice(startIndex, endIndex)

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, filterLevel, showSelectedOnly])

    const handleOrgUnitToggle = (orgUnitId) => {
        const newSelected = new Set(selectedOrgUnits)
        if (newSelected.has(orgUnitId)) {
            newSelected.delete(orgUnitId)
        } else {
            newSelected.add(orgUnitId)
        }
        setSelectedOrgUnits(newSelected)
    }

    // Organization unit creation handlers
    const handleCreateOrgUnit = () => {
        setEditingOrgUnit(null)
        setOrgUnitCreatorOpen(true)
    }
    
    const handleEditOrgUnit = (orgUnit) => {
        setEditingOrgUnit(orgUnit)
        setOrgUnitCreatorOpen(true)
    }
    
    const handleOrgUnitCreated = (newOrgUnit) => {
        if (editingOrgUnit) {
            // Update existing custom org unit
            setCustomOrgUnits(prev => 
                prev.map(ou => ou.id === editingOrgUnit.id ? newOrgUnit : ou)
            )
        } else {
            // Add new custom org unit
            setCustomOrgUnits(prev => [...prev, newOrgUnit])
        }
        setOrgUnitCreatorOpen(false)
        setEditingOrgUnit(null)
    }
    
    const handleDeleteCustomOrgUnit = (orgUnitId) => {
        setCustomOrgUnits(prev => prev.filter(ou => ou.id !== orgUnitId))
        // Also remove from selection if selected
        const newSelected = new Set(selectedOrgUnits)
        newSelected.delete(orgUnitId)
        setSelectedOrgUnits(newSelected)
    }

    const handleSelectAll = () => {
        if (selectedOrgUnits.size === filteredOrgUnits.length) {
            setSelectedOrgUnits(new Set())
        } else {
            setSelectedOrgUnits(new Set(filteredOrgUnits.map(ou => ou.id)))
        }
    }

    const getLevelColor = (level) => {
        const colors = {
            '1': 'blue',
            '2': 'green', 
            '3': 'orange',
            '4': 'purple',
            '5': 'red',
            '6': 'teal'
        }
        return colors[level?.toString()] || 'grey'
    }

    // Check if DHIS2 is configured (only for external DHIS2 metadata source)
    if (metadataSource === 'dhis2' && !dhis2Config?.configured) {
        return (
            <Box>
                <NoticeBox warning title={i18n.t('DHIS2 Configuration Required')}>
                    {i18n.t('Please configure the external DHIS2 instance first in the DHIS2 Configuration tab.')}
                </NoticeBox>
            </Box>
        )
    }

    // Show message if no dataset is selected
    const hasDatasets = (dataSets && dataSets.length > 0) || selectedDataSet
    if (!hasDatasets) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                <NoticeBox title={i18n.t('No Dataset Selected')}>
                    {i18n.t('Please select a dataset from the Data Sets tab to view its organisation units.')}
                </NoticeBox>
            </Box>
        )
    }

    // Show loading state when fetching dataset-specific organisation units
    if (loading) {
        return (
            <Box>
                <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>
                        {dataSets?.length > 0 
                            ? i18n.t('Loading organisation units for selected datasets...')
                            : i18n.t('Loading organisation units for: {{name}}', { name: selectedDataSet?.displayName || selectedDataSet?.name || 'Unknown' })
                        }
                    </h3>
                </Box>
                <CenteredLoader 
                    message={
                        !selectedDataSet 
                            ? i18n.t('Loading organisation units...') 
                            : i18n.t('Loading organisation units for: {{name}}', { name: selectedDataSet?.displayName || selectedDataSet?.name || 'Unknown' })
                    }
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
                    <h3 style={{ margin: '0 0 8px 0' }}>
                        {dataSets?.length > 0 
                            ? i18n.t('Error loading organisation units for selected datasets')
                            : i18n.t('Error loading: {{name}}', { name: selectedDataSet?.displayName || selectedDataSet?.name || 'Unknown' })
                        }
                    </h3>
                </Box>
                <NoticeBox error title={i18n.t('Error loading organisation units')}>
                    {error.message}
                </NoticeBox>
            </Box>
        )
    }

    return (
        <Box>
            {/* Clean, consolidated header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                <Box>
                    <h3 style={{ margin: '0 0 8px 0' }}>
                        {i18n.t('Organisation Unit Selection')}
                    </h3>
                    {/* Single consolidated summary row */}
                    <Box display="flex" gap="12px" alignItems="center" flexWrap="wrap">
                        {/* Dataset tags */}
                        {dataSets?.length > 0 ? (
                            data?.dataSets?.map(ds => (
                                <Tag key={ds.id} color="blue">
                                    {ds.displayName} ({ds.orgUnitsCount || 0})
                                </Tag>
                            ))
                        ) : selectedDataSet ? (
                            <Tag color="blue">
                                {selectedDataSet?.displayName || selectedDataSet?.name} ({availableOrgUnits.length})
                            </Tag>
                        ) : null}
                        
                        {/* Summary stats */}
                        {(dataSets?.length > 0 || selectedDataSet) && (
                            <>
                                <span style={{ color: '#666', fontSize: '14px' }}>•</span>
                                <span style={{ color: '#666', fontSize: '14px' }}>
                                    {availableOrgUnits.length} {i18n.t('org units available')}
                                </span>
                                {customOrgUnits.length > 0 && (
                                    <>
                                        <span style={{ color: '#666', fontSize: '14px' }}>•</span>
                                        <span style={{ color: '#28a745', fontSize: '14px', fontWeight: '500' }}>
                                            {customOrgUnits.length} {i18n.t('custom created')}
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
                
                <ButtonStrip>
                    <Button secondary onClick={handleCreateOrgUnit}>
                        {i18n.t('+ Create Organisation Unit')}
                    </Button>
                    {onCreateTemplate && (
                        <Button primary onClick={() => {
                            if (selectedOrgUnits.size > 0) {
                                const selectedOrgUnitsData = availableOrgUnits.filter(ou => selectedOrgUnits.has(ou.id))
                                onCreateTemplate({
                                    dataSet: selectedDataSet,
                                    dataElements: selectedDataElements,
                                    organisationUnits: selectedOrgUnitsData
                                })
                            }
                        }} disabled={selectedOrgUnits.size === 0}>
                            {i18n.t('Create Template')} ({selectedOrgUnits.size})
                        </Button>
                    )}
                </ButtonStrip>
            </Box>

            {/* Filters */}
            <Box display="flex" gap="16px" marginBottom="16px" alignItems="end">
                <Box flex="1">
                    <InputField
                        label={i18n.t('Search organisation units')}
                        placeholder={i18n.t('Enter organisation unit name...')}
                        value={searchTerm}
                        onChange={({ value }) => setSearchTerm(value)}
                    />
                </Box>
                <Box width="150px">
                    <InputField
                        label={i18n.t('Level')}
                        placeholder={i18n.t('All levels')}
                        value={filterLevel}
                        onChange={({ value }) => setFilterLevel(value)}
                    />
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
            {selectedOrgUnits.size > 0 && (
                <Box marginBottom="16px">
                    <NoticeBox title={i18n.t('Selection Summary')}>
                        {i18n.t('{{count}} organisation units selected for assessment', { count: selectedOrgUnits.size })}
                    </NoticeBox>
                </Box>
            )}

            {/* Organisation Units Table */}
            <DataTable>
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>
                            <Checkbox
                                checked={selectedOrgUnits.size === filteredOrgUnits.length && filteredOrgUnits.length > 0}
                                indeterminate={selectedOrgUnits.size > 0 && selectedOrgUnits.size < filteredOrgUnits.length}
                                onChange={handleSelectAll}
                            />
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Organisation Unit Name')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Level')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Parent Hierarchy')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Path')}
                        </DataTableColumnHeader>
                        {dataSets?.length > 1 && (
                            <DataTableColumnHeader>
                                {i18n.t('Datasets')}
                            </DataTableColumnHeader>
                        )}
                        <DataTableColumnHeader width="120px">
                            {i18n.t('Actions')}
                        </DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {paginatedOrgUnits.map(orgUnit => (
                        <DataTableRow key={orgUnit.id}>
                            <DataTableCell>
                                <Checkbox
                                    checked={selectedOrgUnits.has(orgUnit.id)}
                                    onChange={() => handleOrgUnitToggle(orgUnit.id)}
                                />
                            </DataTableCell>
                            <DataTableCell>{orgUnit.displayName}</DataTableCell>
                            <DataTableCell>
                                {orgUnit.level && (
                                    <Tag color={getLevelColor(orgUnit.level)}>
                                        Level {orgUnit.level}
                                    </Tag>
                                )}
                            </DataTableCell>
                            <DataTableCell>
                                <Box display="flex" flexDirection="column" gap="2px">
                                    {orgUnit.parent?.displayName && (
                                        <Box fontSize="13px" fontWeight="500">
                                            {i18n.t('Parent: {{name}}', { name: orgUnit.parent.displayName })}
                                        </Box>
                                    )}
                                    {orgUnit.parent?.parent?.displayName && (
                                        <Box fontSize="12px" color="#666">
                                            {i18n.t('Grandparent: {{name}}', { name: orgUnit.parent.parent.displayName })}
                                        </Box>
                                    )}
                                    {!orgUnit.parent?.displayName && (
                                        <Box fontSize="13px" color="#999">-</Box>
                                    )}
                                </Box>
                            </DataTableCell>
                            <DataTableCell>
                                <span style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                                    {orgUnit.path || '-'}
                                </span>
                            </DataTableCell>
                            {dataSets?.length > 1 && (
                                <DataTableCell>
                                    <Box display="flex" gap="4px" flexWrap="wrap">
                                        {orgUnit.datasets?.map(datasetName => (
                                            <Tag key={datasetName} color="neutral" style={{ fontSize: '11px' }}>
                                                {datasetName}
                                            </Tag>
                                        ))}
                                    </Box>
                                </DataTableCell>
                            )}
                            <DataTableCell>
                                <Box display="flex" gap="4px">
                                    {orgUnit.isCustom ? (
                                        <>
                                            <Button
                                                small
                                                secondary
                                                onClick={() => handleEditOrgUnit(orgUnit)}
                                            >
                                                {i18n.t('Edit')}
                                            </Button>
                                            <Button
                                                small
                                                destructive
                                                onClick={() => handleDeleteCustomOrgUnit(orgUnit.id)}
                                            >
                                                {i18n.t('Delete')}
                                            </Button>
                                        </>
                                    ) : (
                                        <Tag neutral style={{ fontSize: '11px' }}>
                                            {i18n.t('DHIS2')}
                                        </Tag>
                                    )}
                                </Box>
                            </DataTableCell>
                        </DataTableRow>
                    ))}
                </DataTableBody>
            </DataTable>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <Box padding="16px" display="flex" justifyContent="space-between" alignItems="center" borderTop="1px solid #e8eaed">
                    <Box fontSize="14px" color="#666">
                        {i18n.t('Showing {{start}}-{{end}} of {{total}} organisation units', {
                            start: startIndex + 1,
                            end: Math.min(endIndex, totalItems),
                            total: totalItems
                        })}
                    </Box>
                    <Pagination
                        page={currentPage}
                        pageCount={totalPages}
                        pageSize={itemsPerPage}
                        total={totalItems}
                        onPageChange={setCurrentPage}
                        hidePageSizeSelect
                    />
                </Box>
            )}

            {filteredOrgUnits.length === 0 && (
                <Box padding="24px" textAlign="center">
                    <NoticeBox>
                        {searchTerm || filterLevel || showSelectedOnly
                            ? i18n.t('No organisation units match your current filters')
                            : i18n.t('No organisation units found')
                        }
                    </NoticeBox>
                </Box>
            )}
            
            {/* Organisation Unit Creator Modal */}
            <OrganisationUnitCreator
                isOpen={orgUnitCreatorOpen}
                onClose={() => {
                    setOrgUnitCreatorOpen(false)
                    setEditingOrgUnit(null)
                }}
                onOrgUnitCreated={handleOrgUnitCreated}
                editingOrgUnit={editingOrgUnit}
            />
        </Box>
    )
}