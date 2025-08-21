import React, { useState, useEffect } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
import {
    Box,
    Button,
    Card,
    CircularLoader,
    NoticeBox,
    InputField,
    SingleSelectField,
    SingleSelectOption,
    Checkbox
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

// Query to get organization unit hierarchy
const orgUnitHierarchyQuery = {
    organisationUnits: {
        resource: 'organisationUnits',
        params: {
            fields: 'id,displayName,level,path,parent[id,displayName],children[id,displayName,level]',
            pageSize: 1000,
            level: '1,2,3,4,5' // Get first 5 levels
        }
    }
}

export const OrganisationUnitTreeSelector = ({ 
    onSelect, 
    selectedOrgUnit = null,
    title = 'Select Parent Organisation Unit',
    placeholder = 'Choose a parent organisation unit...'
}) => {
    const [expandedNodes, setExpandedNodes] = useState(new Set())
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedLevel, setSelectedLevel] = useState('')
    
    const { loading, error, data } = useDataQuery(orgUnitHierarchyQuery)
    
    // Build tree structure from flat data
    const buildTree = (orgUnits) => {
        if (!orgUnits) return []
        
        const orgUnitMap = new Map()
        const rootNodes = []
        
        // First pass: create all nodes
        orgUnits.forEach(ou => {
            orgUnitMap.set(ou.id, {
                ...ou,
                children: []
            })
        })
        
        // Second pass: build parent-child relationships
        orgUnits.forEach(ou => {
            if (ou.parent) {
                const parent = orgUnitMap.get(ou.parent.id)
                if (parent) {
                    parent.children.push(orgUnitMap.get(ou.id))
                }
            } else {
                // Root level org unit
                rootNodes.push(orgUnitMap.get(ou.id))
            }
        })
        
        return rootNodes
    }
    
    const orgUnitTree = buildTree(data?.organisationUnits)
    
    // Filter org units based on search and level
    const filterOrgUnits = (nodes, searchTerm, selectedLevel) => {
        if (!searchTerm && !selectedLevel) return nodes
        
        return nodes.filter(node => {
            const matchesSearch = !searchTerm || 
                node.displayName.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesLevel = !selectedLevel || 
                node.level?.toString() === selectedLevel
            
            // Also check children recursively
            const hasMatchingChildren = node.children && 
                filterOrgUnits(node.children, searchTerm, selectedLevel).length > 0
            
            return (matchesSearch && matchesLevel) || hasMatchingChildren
        }).map(node => ({
            ...node,
            children: filterOrgUnits(node.children || [], searchTerm, selectedLevel)
        }))
    }
    
    const filteredTree = filterOrgUnits(orgUnitTree, searchTerm, selectedLevel)
    
    const toggleExpanded = (nodeId) => {
        const newExpanded = new Set(expandedNodes)
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId)
        } else {
            newExpanded.add(nodeId)
        }
        setExpandedNodes(newExpanded)
    }
    
    const handleSelect = (orgUnit) => {
        onSelect(orgUnit)
    }
    
    const renderNode = (node, level = 0) => {
        const isExpanded = expandedNodes.has(node.id)
        const isSelected = selectedOrgUnit?.id === node.id
        const hasChildren = node.children && node.children.length > 0
        
        return (
            <div key={node.id} style={{ marginLeft: `${level * 20}px` }}>
                <div 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #1976d2' : '1px solid transparent'
                    }}
                    onClick={() => handleSelect(node)}
                >
                    {hasChildren && (
                        <Button
                            small
                            secondary
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleExpanded(node.id)
                            }}
                            style={{ marginRight: '8px', minWidth: '24px', padding: '2px 6px' }}
                        >
                            {isExpanded ? '−' : '+'}
                        </Button>
                    )}
                    {!hasChildren && (
                        <div style={{ width: '32px', marginRight: '8px' }} />
                    )}
                    
                    <div style={{ flex: 1 }}>
                        <div style={{ 
                            fontWeight: isSelected ? '600' : 'normal',
                            color: isSelected ? '#1976d2' : '#333'
                        }}>
                            {node.displayName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            Level {node.level} • ID: {node.id}
                        </div>
                    </div>
                    
                    {isSelected && (
                        <div style={{ 
                            color: '#1976d2', 
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            ✓ Selected
                        </div>
                    )}
                </div>
                
                {isExpanded && hasChildren && (
                    <div>
                        {node.children.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        )
    }
    
    if (loading) {
        return (
            <Card style={{ padding: '24px', textAlign: 'center' }}>
                <CircularLoader />
                <div style={{ marginTop: '16px' }}>
                    {i18n.t('Loading organisation units...')}
                </div>
            </Card>
        )
    }
    
    if (error) {
        return (
            <NoticeBox error title={i18n.t('Error loading organisation units')}>
                {error.message}
            </NoticeBox>
        )
    }
    
    // Get unique levels for filter
    const availableLevels = [...new Set(
        data?.organisationUnits?.map(ou => ou.level) || []
    )].sort((a, b) => a - b)
    
    return (
        <Card style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>
                {title}
            </h4>
            
            {/* Filters */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr auto', 
                gap: '16px', 
                marginBottom: '16px' 
            }}>
                <InputField
                    placeholder={i18n.t('Search organisation units...')}
                    value={searchTerm}
                    onChange={({ value }) => setSearchTerm(value)}
                    dense
                />
                
                <SingleSelectField
                    selected={selectedLevel}
                    onChange={({ selected }) => setSelectedLevel(selected)}
                    placeholder={i18n.t('Filter by level')}
                    dense
                    clearable
                    style={{ minWidth: '150px' }}
                >
                    {availableLevels.map(level => (
                        <SingleSelectOption 
                            key={level} 
                            value={level.toString()} 
                            label={`${i18n.t('Level')} ${level}`} 
                        />
                    ))}
                </SingleSelectField>
            </div>
            
            {/* Selected org unit display */}
            {selectedOrgUnit && (
                <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f0f8ff', 
                    borderRadius: '4px',
                    marginBottom: '16px',
                    border: '1px solid #1976d2'
                }}>
                    <div style={{ fontWeight: '600', color: '#1976d2' }}>
                        {i18n.t('Selected Parent:')} {selectedOrgUnit.displayName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Level {selectedOrgUnit.level} • ID: {selectedOrgUnit.id}
                    </div>
                </div>
            )}
            
            {/* Tree */}
            <div style={{ 
                maxHeight: '400px', 
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '8px'
            }}>
                {filteredTree.length > 0 ? (
                    filteredTree.map(node => renderNode(node))
                ) : (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px', 
                        color: '#666' 
                    }}>
                        {searchTerm || selectedLevel ? 
                            i18n.t('No organisation units match your search criteria') :
                            i18n.t('No organisation units available')
                        }
                    </div>
                )}
            </div>
        </Card>
    )
}