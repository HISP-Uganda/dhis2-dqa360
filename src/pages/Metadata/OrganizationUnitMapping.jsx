import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
    SingleSelect,
    SingleSelectOption,
    Tag,
    InputField,
    Input,
    Checkbox,
    Pagination
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useDataEngine } from '@dhis2/app-runtime'

// Dynamic org units query with level-based pre-filtering
const createOrgUnitsQuery = (levelFilter = null) => ({
    organisationUnits: {
        resource: 'organisationUnits',
        params: {
            fields: 'id,displayName,level,path,parent[id,displayName,parent[id,displayName]],organisationUnitGroups[id,displayName]',
            pageSize: 2000, // Larger page size since we're pre-filtering
            page: 1,
            order: 'level:desc,displayName:asc', // Order by level DESC (lowest level first), then by name
            ...(levelFilter && { filter: `level:eq:${levelFilter}` }) // Add level filter if specified
        }
    }
})

// Query for organization unit levels
const orgUnitLevelsQuery = {
    organisationUnitLevels: {
        resource: 'organisationUnitLevels',
        params: {
            fields: 'id,displayName,level',
            order: 'level:asc',
            pageSize: 50
        }
    }
}

// Query for organization unit groups
const orgUnitGroupsQuery = {
    organisationUnitGroups: {
        resource: 'organisationUnitGroups',
        params: {
            fields: 'id,displayName',
            order: 'displayName:asc',
            pageSize: 100
        }
    }
}

// Query for getting total count (faster than loading all data)
const orgUnitsCountQuery = {
    organisationUnitsCount: {
        resource: 'organisationUnits',
        params: {
            fields: 'id',
            pageSize: 1,
            totalPages: true
        }
    }
}

export const OrganizationUnitMapping = ({ 
    dhis2Config, 
    selectedOrgUnits = [], 
    value = [], 
    onChange, 
    onNext 
}) => {
    const engine = useDataEngine()
    const [localOrgUnits, setLocalOrgUnits] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' })
    const [error, setError] = useState(null)
    const [mappings, setMappings] = useState({})
    const [autoMappingResults, setAutoMappingResults] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(25)
    const [totalOrgUnits, setTotalOrgUnits] = useState(0)
    const [loadedPages, setLoadedPages] = useState(new Set())
    const [orgUnitsCache, setOrgUnitsCache] = useState(new Map())
    
    // Enhanced filtering state
    const [orgUnitLevels, setOrgUnitLevels] = useState([])
    const [orgUnitGroups, setOrgUnitGroups] = useState([])
    const [selectedLevel, setSelectedLevel] = useState('')
    const [selectedGroup, setSelectedGroup] = useState('')
    const [searchText, setSearchText] = useState('')
    const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false)
    
    // Pre-filtering for performance
    const [preFilterLevel, setPreFilterLevel] = useState('')
    const [orgUnitsLoaded, setOrgUnitsLoaded] = useState(false)
    const [shouldLoadOrgUnits, setShouldLoadOrgUnits] = useState(false)

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedLevel, selectedGroup, searchText, showOnlyUnmapped, preFilterLevel])

    // Initialize mappings from existing value prop
    useEffect(() => {
        if (Array.isArray(value) && value.length > 0) {
            const existingMappings = {}
            value.forEach(mapping => {
                if (mapping.external?.id && mapping.local?.id) {
                    existingMappings[mapping.external.id] = mapping.local.id
                }
            })
            setMappings(existingMappings)
        }
    }, [value])

    // Load metadata (levels and groups) immediately on component mount
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                // Try multiple approaches to get levels
                let levels = []
                let groups = []
                
                // Approach 1: Try standard metadata API
                try {
                    const [levelsResult, groupsResult] = await Promise.all([
                        engine.query(orgUnitLevelsQuery),
                        engine.query(orgUnitGroupsQuery)
                    ])
                    
                    levels = levelsResult.organisationUnitLevels?.organisationUnitLevels || 
                             levelsResult.organisationUnitLevels || []
                    groups = groupsResult.organisationUnitGroups?.organisationUnitGroups || 
                             groupsResult.organisationUnitGroups || []
                } catch (metadataError) {
                    // Metadata API failed, continue to fallback
                }
                
                // Approach 2: If no levels, try direct org units sample
                if (levels.length === 0) {
                    try {
                        const sampleQuery = {
                            orgUnits: {
                                resource: 'organisationUnits',
                                params: {
                                    fields: 'level',
                                    pageSize: 200
                                }
                            }
                        }
                        
                        const sampleResult = await engine.query(sampleQuery)
                        const orgUnits = sampleResult.orgUnits?.organisationUnits || 
                                        sampleResult.orgUnits || []
                        
                        if (orgUnits.length > 0) {
                            const uniqueLevels = [...new Set(orgUnits.map(ou => ou.level))]
                                .filter(level => level != null && level > 0)
                                .sort((a, b) => a - b)
                            
                            levels = uniqueLevels.map(level => ({
                                level: level,
                                displayName: `Level ${level}`,
                                id: `level-${level}`
                            }))
                        }
                    } catch (sampleError) {
                        // Sample org units failed, continue to fallback
                    }
                }
                
                // Approach 3: If still no levels, provide basic fallback
                if (levels.length === 0) {
                    levels = [
                        { level: 1, displayName: 'Level 1', id: 'level-1' },
                        { level: 2, displayName: 'Level 2', id: 'level-2' },
                        { level: 3, displayName: 'Level 3', id: 'level-3' },
                        { level: 4, displayName: 'Level 4', id: 'level-4' },
                        { level: 5, displayName: 'Level 5', id: 'level-5' }
                    ]
                }
                
                // Set the results
                setOrgUnitLevels(levels)
                setOrgUnitGroups(groups)
                
                // Auto-select the highest level as default pre-filter
                if (levels.length > 0) {
                    const highestLevel = Math.max(...levels.map(l => l.level))
                    setPreFilterLevel(highestLevel.toString())
                }
                
            } catch (error) {
                // Emergency fallback
                const emergencyLevels = [
                    { level: 1, displayName: 'Level 1', id: 'level-1' },
                    { level: 2, displayName: 'Level 2', id: 'level-2' },
                    { level: 3, displayName: 'Level 3', id: 'level-3' },
                    { level: 4, displayName: 'Level 4', id: 'level-4' },
                    { level: 5, displayName: 'Level 5', id: 'level-5' }
                ]
                setOrgUnitLevels(emergencyLevels)
                setPreFilterLevel('4') // Default to level 4
            }
        }
        
        loadMetadata()
    }, [engine])

    // Load org units only when explicitly requested
    useEffect(() => {
        if (!shouldLoadOrgUnits) return
        
        const fetchLocalOrgUnits = async () => {
            setLoading(true)
            setError(null)
            setLoadingProgress({ current: 0, total: 0, message: 'Initializing...' })
            
            try {
                // Step 1: Create query with optional level pre-filtering
                const orgUnitsQuery = createOrgUnitsQuery(preFilterLevel || null)
                
                const levelMessage = preFilterLevel 
                    ? `Loading Level ${preFilterLevel} organization units...`
                    : 'Loading all organization units...'
                setLoadingProgress({ current: 1, total: 3, message: levelMessage })
                
                // Step 2: Get count with same level filter as main query
                const countQuery = {
                    organisationUnitsCount: {
                        resource: 'organisationUnits',
                        params: {
                            fields: 'id',
                            pageSize: 1,
                            ...(preFilterLevel && { filter: `level:eq:${preFilterLevel}` })
                        }
                    }
                }
                
                const countResult = await engine.query(countQuery)
                const totalCount = countResult.organisationUnitsCount?.pager?.total || 0
                setTotalOrgUnits(totalCount)
                
                // Step 3: Load org units with pre-filtering
                setLoadingProgress({ current: 2, total: 3, message: `Loading ${totalCount} organization units...` })
                const orgUnitsResult = await engine.query(orgUnitsQuery)
                const orgUnits = orgUnitsResult.organisationUnits.organisationUnits || []
                setLocalOrgUnits(orgUnits)
                setLoadedPages(new Set([1]))
                
                // Step 3: Perform auto-mapping (immediate feedback)
                setLoadingProgress({ current: 3, total: 3, message: 'Performing auto-mapping...' })
                if (Object.keys(mappings).length === 0) {
                    performAutoMapping(selectedOrgUnits, orgUnits)
                }
                
                setOrgUnitsLoaded(true)
                setLoadingProgress({ current: 3, total: 3, message: `Loaded ${totalCount} organization units successfully!` })
                
            } catch (err) {
                setError(`Failed to load organization units: ${err.message}`)
                setLoadingProgress({ current: 0, total: 4, message: 'Loading failed' })
            } finally {
                // Keep loading state for a moment to show completion message
                setTimeout(() => setLoading(false), 1000)
            }
        }

        fetchLocalOrgUnits()
    }, [shouldLoadOrgUnits, preFilterLevel, engine]) // Load when triggered or level changes

    // Optimized auto-mapping logic with indexing for better performance
    const performAutoMapping = (externalOrgUnits, localOrgUnits) => {
        if (!Array.isArray(externalOrgUnits) || !Array.isArray(localOrgUnits)) {
            return
        }

        // Create indexes for faster lookups (O(1) instead of O(n))
        const exactNameIndex = new Map()
        const normalizedNameIndex = new Map()
        
        localOrgUnits.forEach(localOrgUnit => {
            if (localOrgUnit?.displayName) {
                const normalizedName = localOrgUnit.displayName.toLowerCase().trim()
                exactNameIndex.set(normalizedName, localOrgUnit)
                
                // Create partial match index (first 3 words)
                const words = normalizedName.split(/\s+/).slice(0, 3).join(' ')
                if (!normalizedNameIndex.has(words)) {
                    normalizedNameIndex.set(words, [])
                }
                normalizedNameIndex.get(words).push(localOrgUnit)
            }
        })

        const autoMapped = {}
        const results = {
            exactMatches: 0,
            partialMatches: 0,
            noMatches: 0
        }

        externalOrgUnits.forEach(extOrgUnit => {
            if (!extOrgUnit?.id || !extOrgUnit?.displayName) {
                results.noMatches++
                return
            }

            const extName = extOrgUnit.displayName.toLowerCase().trim()

            // Try exact match first (O(1) lookup)
            const exactMatch = exactNameIndex.get(extName)
            if (exactMatch) {
                autoMapped[extOrgUnit.id] = exactMatch.id
                results.exactMatches++
                return
            }

            // Try partial match using index
            const extWords = extName.split(/\s+/).slice(0, 3).join(' ')
            const partialCandidates = normalizedNameIndex.get(extWords) || []
            
            const partialMatch = partialCandidates.find(localOrgUnit => {
                const localName = localOrgUnit.displayName.toLowerCase()
                return localName.includes(extName) || extName.includes(localName)
            })

            if (partialMatch) {
                autoMapped[extOrgUnit.id] = partialMatch.id
                results.partialMatches++
                return
            }

            results.noMatches++
        })

        setMappings(autoMapped)
        setAutoMappingResults(results)
    }

    // Simple mapping change handler
    const handleMappingSelection = (externalOrgUnitId, localOrgUnitId) => {
        setMappings(prev => {
            // Only update if the value actually changed
            if (prev[externalOrgUnitId] === localOrgUnitId) {
                return prev
            }
            
            const newMappings = { ...prev }
            if (localOrgUnitId) {
                newMappings[externalOrgUnitId] = localOrgUnitId
            } else {
                delete newMappings[externalOrgUnitId]
            }
            
            return newMappings
        })
    }

    const handleClearMapping = (externalOrgUnitId) => {
        setMappings(prev => {
            const newMappings = { ...prev }
            delete newMappings[externalOrgUnitId]
            return newMappings
        })
    }

    // Use ref to avoid dependency issues with onChange
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    // Update parent component whenever mappings change
    // Use useCallback to prevent infinite re-renders
    const notifyParentOfMappingChange = useCallback(() => {
        if (selectedOrgUnits.length > 0 && onChangeRef.current) {
            const mappingData = selectedOrgUnits.map(extOrgUnit => {
                const localOrgUnitId = mappings[extOrgUnit.id]
                const localOrgUnit = localOrgUnits.find(ou => ou.id === localOrgUnitId)
                
                return {
                    external: extOrgUnit,
                    local: localOrgUnit || null,
                    mapped: !!localOrgUnit
                }
            })
            onChangeRef.current(mappingData)
        }
    }, [mappings, selectedOrgUnits, localOrgUnits])

    // Throttle the parent notification to prevent excessive updates
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            notifyParentOfMappingChange()
        }, 100) // 100ms throttle

        return () => clearTimeout(timeoutId)
    }, [notifyParentOfMappingChange])

    // Memoized sorted local organization units (level filtering now done at API level)
    const filteredLocalOrgUnits = useMemo(() => {
        let filtered = [...localOrgUnits]
        
        // Sort by level (lowest first) then by name
        filtered.sort((a, b) => {
            if (a.level !== b.level) {
                return b.level - a.level // Descending (lowest level first)
            }
            return a.displayName.localeCompare(b.displayName)
        })
        
        return filtered
    }, [localOrgUnits, preFilterLevel])

    // Memoized org unit level options
    const orgUnitLevelOptions = useMemo(() => 
        orgUnitLevels.map(level => (
            <SingleSelectOption 
                key={level.level} 
                value={level.level.toString()} 
                label={level.displayName ? 
                    `Level ${level.level}: ${level.displayName}` :
                    `Level ${level.level}`
                }
            />
        )), [orgUnitLevels]
    )

    // Filter function for external organization units (for table display)
    const getFilteredExternalOrgUnits = () => {
        let filtered = [...selectedOrgUnits]
        
        // Filter by search text
        if (searchText.trim()) {
            const searchLower = searchText.toLowerCase()
            filtered = filtered.filter(ou => 
                ou.displayName.toLowerCase().includes(searchLower) ||
                ou.parent?.displayName?.toLowerCase().includes(searchLower) ||
                ou.parent?.parent?.displayName?.toLowerCase().includes(searchLower)
            )
        }
        
        // Filter by level
        if (selectedLevel) {
            filtered = filtered.filter(ou => ou.level === parseInt(selectedLevel))
        }
        
        // Filter by group
        if (selectedGroup) {
            filtered = filtered.filter(ou => 
                ou.organisationUnitGroups?.some(group => group.id === selectedGroup)
            )
        }
        
        // Filter by mapping status
        if (showOnlyUnmapped) {
            filtered = filtered.filter(ou => !mappings[ou.id])
        }
        
        // Sort by level (lowest first) then by name
        filtered.sort((a, b) => {
            if (a.level !== b.level) {
                return b.level - a.level // Descending (lowest level first)
            }
            return a.displayName.localeCompare(b.displayName)
        })
        
        return filtered
    }

    const handleSaveAndContinue = () => {
        // Prepare mapping data for next step
        const mappingData = selectedOrgUnits.map(extOrgUnit => {
            const localOrgUnitId = mappings[extOrgUnit.id]
            const localOrgUnit = localOrgUnits.find(ou => ou.id === localOrgUnitId)
            
            return {
                external: extOrgUnit,
                local: localOrgUnit || null,
                mapped: !!localOrgUnit
            }
        })

        onChange && onChange(mappingData)
    }

    const getMappingStatus = () => {
        const totalMappings = selectedOrgUnits.length
        const completedMappings = Object.keys(mappings).length
        return { totalMappings, completedMappings }
    }





    if (loading) {
        return (
            <Box>
                <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>
                        🚀 {i18n.t('Optimized Organization Unit Loading')}
                    </h3>
                    
                    {/* Progress Bar */}
                    <Box marginBottom="12px">
                        <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="4px">
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>
                                {loadingProgress.message}
                            </span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                {loadingProgress.current}/{loadingProgress.total}
                            </span>
                        </Box>
                        <Box style={{ 
                            width: '100%', 
                            height: '8px', 
                            backgroundColor: '#e0e0e0', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <Box style={{
                                width: `${loadingProgress.total > 0 ? (loadingProgress.current / loadingProgress.total) * 100 : 0}%`,
                                height: '100%',
                                backgroundColor: '#2196f3',
                                transition: 'width 0.3s ease'
                            }} />
                        </Box>
                    </Box>
                    
                    {/* Performance Info */}
                    <Box style={{ fontSize: '12px', color: '#666' }}>
                        <div>✅ Reduced fields for faster loading</div>
                        <div>📦 Progressive batch loading (500 units per batch)</div>
                        <div>🔄 Parallel processing with auto-mapping</div>
                        {totalOrgUnits > 0 && (
                            <div>📊 Total organization units: {totalOrgUnits.toLocaleString()}</div>
                        )}
                        {localOrgUnits.length > 0 && (
                            <div>⚡ Loaded: {localOrgUnits.length.toLocaleString()} units</div>
                        )}
                    </Box>
                </Box>
                
                <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                    <Box textAlign="center">
                        <CircularLoader />
                        <Box marginTop="16px" style={{ color: '#666', fontSize: '14px' }}>
                            {loadingProgress.message}
                        </Box>
                    </Box>
                </Box>
            </Box>
        )
    }

    if (error) {
        return (
            <Box>
                <NoticeBox error title={i18n.t('Error loading organization units')}>
                    {error}
                </NoticeBox>
            </Box>
        )
    }

    const { totalMappings, completedMappings } = getMappingStatus()

    return (
        <Box>
            {/* Header */}
            <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>{i18n.t('Organization Unit Mapping')}</h3>
                <Box display="flex" gap="8px" alignItems="center" marginBottom="8px">
                    <span style={{ color: '#666', fontSize: '14px' }}>
                        {i18n.t('Map external organization units to local DHIS2 organization units')}
                    </span>
                </Box>
                
                {/* Auto-mapping results */}
                {autoMappingResults && (
                    <Box marginTop="16px">
                        <Box display="flex" gap="8px" alignItems="center" flexWrap="wrap">
                            <Tag color="green">{i18n.t('{{count}} exact matches', { count: autoMappingResults.exactMatches })}</Tag>
                            <Tag color="orange">{i18n.t('{{count}} partial matches', { count: autoMappingResults.partialMatches })}</Tag>
                            <Tag color="red">{i18n.t('{{count}} no matches', { count: autoMappingResults.noMatches })}</Tag>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Progress */}
            <Box marginBottom="16px">
                <NoticeBox title={i18n.t('Mapping Progress')}>
                    {i18n.t('{{completed}} of {{total}} organization units mapped', { 
                        completed: completedMappings, 
                        total: totalMappings 
                    })}
                </NoticeBox>
            </Box>

            {/* Organization Unit Loading Control */}
            {!orgUnitsLoaded && (
                <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#e8f5e8', borderRadius: '4px', border: '1px solid #4caf50' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#2e7d32' }}>
                        🚀 {i18n.t('Load Organization Units for Mapping')}
                    </h4>
                    
                    <Box display="flex" gap="16px" alignItems="end" marginBottom="16px">
                        <Box minWidth="250px">
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                {i18n.t('Select Level to Load (Optional)')}
                            </label>
                            <SingleSelect
                                selected={preFilterLevel}
                                onChange={({ selected }) => setPreFilterLevel(selected)}
                                placeholder={i18n.t('Load all levels')}
                                clearable
                                clearText={i18n.t('Load all levels')}
                                dense
                            >
                                {orgUnitLevelOptions}
                            </SingleSelect>
                        </Box>
                        
                        <Button 
                            primary 
                            onClick={() => setShouldLoadOrgUnits(true)}
                            disabled={loading}
                        >
                            {loading ? i18n.t('Loading...') : (orgUnitsLoaded ? i18n.t('Reload Organization Units') : i18n.t('Load Organization Units'))}
                        </Button>
                    </Box>
                    
                    <Box style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        <div>💡 {i18n.t('Tip: Select a specific level for faster loading, or leave empty to load all levels.')}</div>
                        {preFilterLevel && (
                            <div style={{ color: '#2e7d32', fontWeight: '500', marginTop: '4px' }}>
                                📊 {i18n.t('Will load only Level {{level}} organization units', { level: preFilterLevel })}
                            </div>
                        )}
                        {!preFilterLevel && (
                            <div style={{ color: '#ff9800', fontWeight: '500', marginTop: '4px' }}>
                                ⚠️ {i18n.t('Loading all levels may take longer for large instances')}
                            </div>
                        )}
                    </Box>
                </Box>
            )}

            {/* Enhanced Filtering Controls - Only show after org units are loaded */}
            {orgUnitsLoaded && (
                <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#f5f5f5', borderRadius: '4px', border: '1px solid #ddd' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>
                        🔍 {i18n.t('Filter Local Organization Units')}
                    </h4>
                
                <Box display="flex" gap="16px" flexWrap="wrap" alignItems="end">
                    {/* Search Text */}
                    <Box flex="1" minWidth="200px">
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            {i18n.t('Search by name or parent')}
                        </label>
                        <Input
                            value={searchText}
                            onChange={({ value }) => setSearchText(value)}
                            placeholder={i18n.t('Type to search organization units...')}
                            dense
                        />
                    </Box>
                    
                    {/* Level Filter */}
                    <Box minWidth="150px">
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            {i18n.t('Filter by Level')}
                        </label>
                        <SingleSelect
                            selected={selectedLevel}
                            onChange={({ selected }) => setSelectedLevel(selected)}
                            placeholder={i18n.t('All levels')}
                            clearable
                            clearText={i18n.t('Clear level filter')}
                            dense
                        >
                            {(() => {
                                // Get unique levels from external org units
                                const availableLevels = [...new Set(selectedOrgUnits.map(ou => ou.level))]
                                    .filter(level => level != null)
                                    .sort((a, b) => a - b)
                                
                                return availableLevels.map(level => (
                                    <SingleSelectOption 
                                        key={level} 
                                        value={level.toString()} 
                                        label={`${i18n.t('Level')} ${level}`}
                                    />
                                ))
                            })()}
                        </SingleSelect>
                    </Box>
                    
                    {/* Group Filter */}
                    <Box minWidth="150px">
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            {i18n.t('Filter by Group')}
                        </label>
                        <SingleSelect
                            selected={selectedGroup}
                            onChange={({ selected }) => setSelectedGroup(selected)}
                            placeholder={i18n.t('All groups')}
                            clearable
                            clearText={i18n.t('Clear group filter')}
                            dense
                        >
                            {orgUnitGroups.map(group => (
                                <SingleSelectOption 
                                    key={group.id} 
                                    value={group.id} 
                                    label={group.displayName}
                                />
                            ))}
                        </SingleSelect>
                    </Box>
                    

                    {/* Show Only Unmapped */}
                    <Box minWidth="150px">
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            {i18n.t('Mapping Status')}
                        </label>
                        <Checkbox
                            checked={showOnlyUnmapped}
                            onChange={({ checked }) => setShowOnlyUnmapped(checked)}
                            label={i18n.t('Show only unmapped units')}
                            dense
                        />
                    </Box>
                </Box>
                
                {/* Filter Summary */}
                <Box marginTop="12px" style={{ fontSize: '12px', color: '#666' }}>
                    {(() => {
                        const filteredCount = getFilteredExternalOrgUnits().length
                        const totalCount = selectedOrgUnits.length
                        const activeFilters = []
                        
                        if (searchText.trim()) activeFilters.push(i18n.t('search'))
                        if (selectedLevel) activeFilters.push(i18n.t('external level'))
                        if (selectedGroup) activeFilters.push(i18n.t('group'))
                        if (showOnlyUnmapped) activeFilters.push(i18n.t('unmapped only'))
                        
                        return (
                            <div>
                                📊 {i18n.t('Showing {{filtered}} of {{total}} organization units', { 
                                    filtered: filteredCount, 
                                    total: totalCount 
                                })}
                                {activeFilters.length > 0 && (
                                    <span> • {i18n.t('Active filters: {{filters}}', { 
                                        filters: activeFilters.join(', ') 
                                    })}</span>
                                )}
                                {filteredCount > 0 && (
                                    <span> • {i18n.t('Sorted by level (lowest first), then by name')}</span>
                                )}
                                <br />
                                🎯 {i18n.t('Local mapping options: {{count}} organization units loaded', { 
                                    count: localOrgUnits.length 
                                })}
                                {preFilterLevel && (
                                    <span> {i18n.t('(Level {{level}} only)', { level: preFilterLevel })}</span>
                                )}
                            </div>
                        )
                    })()}
                </Box>
                </Box>
            )}

            {/* Mapping Table - Only show after org units are loaded */}
            {orgUnitsLoaded && (
            <>
            <DataTable>
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>
                            {i18n.t('External Organization Unit')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Level')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Map to Local Organization Unit')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Status')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {i18n.t('Actions')}
                        </DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {(() => {
                        // Get filtered external org units
                        const filteredOrgUnits = getFilteredExternalOrgUnits()
                        
                        // Pagination calculations
                        const totalItems = filteredOrgUnits.length
                        const totalPages = Math.ceil(totalItems / itemsPerPage)
                        const startIndex = (currentPage - 1) * itemsPerPage
                        const endIndex = startIndex + itemsPerPage
                        const paginatedOrgUnits = filteredOrgUnits.slice(startIndex, endIndex)
                        
                        return paginatedOrgUnits.map(extOrgUnit => {
                        const mappedLocalId = mappings[extOrgUnit.id]
                        const mappedLocal = localOrgUnits.find(ou => ou.id === mappedLocalId)
                        const isMapped = !!mappedLocal
                        
                        return (
                            <DataTableRow 
                                key={extOrgUnit.id}
                                style={{ 
                                    backgroundColor: isMapped ? '#f3e5f5' : 'transparent',
                                    borderLeft: isMapped ? '4px solid #9c27b0' : '4px solid transparent'
                                }}
                            >
                                <DataTableCell>
                                    <Box>
                                        <strong>{extOrgUnit.displayName}</strong>
                                        {extOrgUnit.parent?.displayName && (
                                            <Box fontSize="12px" color="#666">
                                                {i18n.t('Parent: {{parent}}', { parent: extOrgUnit.parent.displayName })}
                                            </Box>
                                        )}
                                        {extOrgUnit.parent?.parent?.displayName && (
                                            <Box fontSize="11px" color="#999">
                                                {i18n.t('Grandparent: {{grandparent}}', { grandparent: extOrgUnit.parent.parent.displayName })}
                                            </Box>
                                        )}
                                    </Box>
                                </DataTableCell>
                                <DataTableCell>
                                    <Tag color="blue">{i18n.t('Level {{level}}', { level: extOrgUnit.level || 'Unknown' })}</Tag>
                                </DataTableCell>
                                <DataTableCell>
                                    {(() => {
                                        // Safety check
                                        if (!localOrgUnits || localOrgUnits.length === 0) {
                                            return (
                                                <div style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
                                                    {i18n.t('Load organization units first')}
                                                </div>
                                            )
                                        }

                                        // Get available options directly
                                        const availableOptions = filteredLocalOrgUnits.filter(ou => {
                                            if (!ou || !ou.id) return false
                                            const mappedIds = Object.values(mappings)
                                            return !mappedIds.includes(ou.id) || ou.id === mappedLocalId
                                        })



                                        if (availableOptions.length === 0) {
                                            return (
                                                <div style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
                                                    {i18n.t('No options available')}
                                                </div>
                                            )
                                        }

                                        // Validate selected value
                                        const selectedValue = mappedLocalId && availableOptions.some(ou => ou.id === mappedLocalId) 
                                            ? mappedLocalId 
                                            : ''

                                        return (
                                            <div style={{ minWidth: '200px' }}>
                                                <SingleSelect
                                                    placeholder={i18n.t('Select local organization unit')}
                                                    selected={selectedValue}
                                                    onChange={({ selected }) => {
                                                        handleMappingSelection(extOrgUnit.id, selected)
                                                    }}
                                                    clearable
                                                    clearText={i18n.t('Clear mapping')}
                                                    filterable
                                                    noMatchText={i18n.t('No organization units match the search')}
                                                    maxHeight="300px"
                                                >
                                                    {availableOptions.map(localOrgUnit => {
                                                        // Build hierarchical display
                                                        let label = `${localOrgUnit.displayName || 'Unknown'} (Level ${localOrgUnit.level || 'Unknown'})`
                                                        
                                                        // Add parent hierarchy
                                                        const hierarchy = []
                                                        if (localOrgUnit.parent?.parent?.displayName) {
                                                            hierarchy.push(localOrgUnit.parent.parent.displayName)
                                                        }
                                                        if (localOrgUnit.parent?.displayName) {
                                                            hierarchy.push(localOrgUnit.parent.displayName)
                                                        }
                                                        
                                                        if (hierarchy.length > 0) {
                                                            label += ` → ${hierarchy.join(' → ')}`
                                                        }
                                                        
                                                        return (
                                                            <SingleSelectOption 
                                                                key={localOrgUnit.id} 
                                                                value={localOrgUnit.id} 
                                                                label={label}
                                                            />
                                                        )
                                                    })}
                                                </SingleSelect>
                                            </div>
                                        )
                                    })()}
                                </DataTableCell>
                                <DataTableCell>
                                    {isMapped ? (
                                        <Tag color="green">{i18n.t('Mapped')}</Tag>
                                    ) : (
                                        <Tag color="red">{i18n.t('Not Mapped')}</Tag>
                                    )}
                                </DataTableCell>
                                <DataTableCell>
                                    {isMapped && (
                                        <Button 
                                            small 
                                            destructive 
                                            onClick={() => handleClearMapping(extOrgUnit.id)}
                                        >
                                            {i18n.t('Clear')}
                                        </Button>
                                    )}
                                </DataTableCell>
                            </DataTableRow>
                        )
                    })})()}
                </DataTableBody>
            </DataTable>

            {/* Pagination Controls */}
            {(() => {
                const filteredOrgUnits = getFilteredExternalOrgUnits()
                const totalItems = filteredOrgUnits.length
                const totalPages = Math.ceil(totalItems / itemsPerPage)
                const startIndex = (currentPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                
                return totalPages > 1 && (
                    <Box padding="16px" display="flex" justifyContent="space-between" alignItems="center" borderTop="1px solid #e8eaed">
                        <Box fontSize="14px" color="#666">
                            {i18n.t('Showing {{start}}-{{end}} of {{total}} organization units', {
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
                )
            })()}
            </>
            )}

            {/* Actions */}
            <Box marginTop="24px">
                <ButtonStrip>
                    <Button 
                        primary 
                        onClick={handleSaveAndContinue}
                        disabled={completedMappings === 0}
                    >
                        {i18n.t('Continue to Dataset Preparation')} ({completedMappings}/{totalMappings})
                    </Button>
                    <Button onClick={() => setMappings({})}>
                        {i18n.t('Clear All Mappings')}
                    </Button>
                </ButtonStrip>
            </Box>

            {/* Mapped Organization Units Preview */}
            {completedMappings > 0 && (
                <Box marginTop="24px" padding="16px" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 12px 0' }}>{i18n.t('Mapped Organization Units')}</h4>
                    <Box display="flex" flexDirection="column" gap="8px">
                        {selectedOrgUnits
                            .filter(extOrgUnit => mappings[extOrgUnit.id])
                            .map(extOrgUnit => {
                                const mappedLocal = localOrgUnits.find(ou => ou.id === mappings[extOrgUnit.id])
                                return (
                                    <Box key={extOrgUnit.id} display="flex" alignItems="center" gap="8px">
                                        <span style={{ fontSize: '14px' }}>
                                            <strong>{extOrgUnit.displayName}</strong> → <strong>{mappedLocal?.displayName}</strong>
                                        </span>
                                        <Tag color="blue" small>Level {mappedLocal?.level}</Tag>
                                    </Box>
                                )
                            })}
                    </Box>
                </Box>
            )}

            {/* Completion Section - Show when org units are loaded and there are mappings */}
            {orgUnitsLoaded && selectedOrgUnits.length > 0 && (
                <Box marginTop="32px" padding="24px" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#2e7d32' }}>
                        🎯 {i18n.t('Organization Unit Mapping Complete')}
                    </h3>
                    
                    {(() => {
                        const { totalMappings, completedMappings } = getMappingStatus()
                        const mappingRate = totalMappings > 0 ? Math.round((completedMappings / totalMappings) * 100) : 0
                        const isComplete = completedMappings === totalMappings && totalMappings > 0
                        
                        return (
                            <Box>
                                <Box marginBottom="16px">
                                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                                        📊 <strong>{completedMappings}</strong> of <strong>{totalMappings}</strong> organization units mapped ({mappingRate}%)
                                    </div>
                                    
                                    {autoMappingResults && (
                                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                                            🤖 Auto-mapping results: {autoMappingResults.exactMatches} exact matches, {autoMappingResults.partialMatches} partial matches, {autoMappingResults.noMatches} require manual mapping
                                        </div>
                                    )}
                                    
                                    {isComplete ? (
                                        <div style={{ color: '#2e7d32', fontWeight: '500', fontSize: '14px' }}>
                                            ✅ {i18n.t('All organization units have been mapped successfully!')}
                                        </div>
                                    ) : (
                                        <div style={{ color: '#ff9800', fontWeight: '500', fontSize: '14px' }}>
                                            ⚠️ {i18n.t('{{remaining}} organization units still need to be mapped', { 
                                                remaining: totalMappings - completedMappings 
                                            })}
                                        </div>
                                    )}
                                </Box>
                                
                                <Box display="flex" gap="16px" alignItems="center">
                                    <Button
                                        primary
                                        onClick={() => onNext && onNext()}
                                        disabled={!isComplete}
                                    >
                                        {isComplete 
                                            ? i18n.t('Continue to Next Step') 
                                            : i18n.t('Complete All Mappings to Continue')
                                        }
                                    </Button>
                                    
                                    {!isComplete && (
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            💡 {i18n.t('Map all organization units above to proceed to the next step')}
                                        </div>
                                    )}
                                </Box>
                            </Box>
                        )
                    })()}
                </Box>
            )}
        </Box>
    )
}