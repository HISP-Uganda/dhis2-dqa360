import React, { useState, useMemo, useCallback } from 'react'
import {
    Box,
    Button,
    ButtonStrip,
    Card,
    InputField,
    SingleSelectField,
    SingleSelectOption,
    TextAreaField,
    Tag,
    IconAdd24,
    IconDelete24,
    IconEdit24,
    IconChevronDown24,
    IconChevronRight24,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    NoticeBox,
    Checkbox
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import {
    transformToConceptMapping,
    generateConceptId,
    extractConceptName,
    createDHIS2Expression,
    validateConceptMapping,
    convertConceptMappingToLegacy
} from '../../../../utils/conceptMappingUtils'
import styles from './ConceptMappingManager.module.css'

/**
 * ConceptMappingManager Component
 * 
 * Manages concept-based data elements mapping where:
 * - Concepts represent logical data elements (without prefixes)
 * - Each concept can have bindings to multiple datasets
 * - Supports transformations and expressions
 */
const ConceptMappingManager = ({
    selectedDataElements = [],
    datasets = [],
    conceptMapping = null,
    onConceptMappingChange,
    readOnly = false
}) => {
    const [expandedConcepts, setExpandedConcepts] = useState(new Set())
    const [editingConcept, setEditingConcept] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [autoGrouping, setAutoGrouping] = useState(true)
    
    // Generate initial concept mapping if not provided
    const currentMapping = useMemo(() => {
        if (conceptMapping) return conceptMapping
        
        return transformToConceptMapping(selectedDataElements, datasets, {
            groupByConcept: autoGrouping,
            includeTransforms: true,
            generateExpressions: true
        })
    }, [conceptMapping, selectedDataElements, datasets, autoGrouping])
    
    // Validation
    const validationErrors = useMemo(() => {
        return validateConceptMapping(currentMapping)
    }, [currentMapping])
    
    // Toggle concept expansion
    const toggleConcept = useCallback((conceptId) => {
        setExpandedConcepts(prev => {
            const next = new Set(prev)
            if (next.has(conceptId)) {
                next.delete(conceptId)
            } else {
                next.add(conceptId)
            }
            return next
        })
    }, [])
    
    // Handle concept updates
    const updateConcept = useCallback((conceptId, updates) => {
        const updatedMapping = {
            ...currentMapping,
            concepts: currentMapping.concepts.map(concept =>
                concept.conceptId === conceptId
                    ? { ...concept, ...updates }
                    : concept
            )
        }
        onConceptMappingChange?.(updatedMapping)
    }, [currentMapping, onConceptMappingChange])
    
    // Add new concept
    const addConcept = useCallback((conceptData) => {
        const newConcept = {
            conceptId: generateConceptId(conceptData.name, new Set(currentMapping.concepts.map(c => c.conceptId))),
            name: conceptData.name,
            unit: conceptData.unit || 'count',
            valueType: conceptData.valueType || 'NUMBER',
            bindings: []
        }
        
        const updatedMapping = {
            ...currentMapping,
            concepts: [...currentMapping.concepts, newConcept]
        }
        onConceptMappingChange?.(updatedMapping)
        setShowCreateModal(false)
    }, [currentMapping, onConceptMappingChange])
    
    // Remove concept
    const removeConcept = useCallback((conceptId) => {
        const updatedMapping = {
            ...currentMapping,
            concepts: currentMapping.concepts.filter(c => c.conceptId !== conceptId)
        }
        onConceptMappingChange?.(updatedMapping)
    }, [currentMapping, onConceptMappingChange])
    
    // Add binding to concept
    const addBinding = useCallback((conceptId, datasetId) => {
        const concept = currentMapping.concepts.find(c => c.conceptId === conceptId)
        if (!concept) return
        
        const newBinding = {
            datasetId,
            source: []
        }
        
        updateConcept(conceptId, {
            bindings: [...concept.bindings, newBinding]
        })
    }, [currentMapping, updateConcept])
    
    // Update binding
    const updateBinding = useCallback((conceptId, bindingIndex, updates) => {
        const concept = currentMapping.concepts.find(c => c.conceptId === conceptId)
        if (!concept) return
        
        const updatedBindings = concept.bindings.map((binding, index) =>
            index === bindingIndex ? { ...binding, ...updates } : binding
        )
        
        updateConcept(conceptId, { bindings: updatedBindings })
    }, [currentMapping, updateConcept])
    
    // Remove binding
    const removeBinding = useCallback((conceptId, bindingIndex) => {
        const concept = currentMapping.concepts.find(c => c.conceptId === conceptId)
        if (!concept) return
        
        const updatedBindings = concept.bindings.filter((_, index) => index !== bindingIndex)
        updateConcept(conceptId, { bindings: updatedBindings })
    }, [currentMapping, updateConcept])
    
    // Regenerate mapping
    const regenerateMapping = useCallback(() => {
        const newMapping = transformToConceptMapping(selectedDataElements, datasets, {
            groupByConcept: autoGrouping,
            includeTransforms: true,
            generateExpressions: true
        })
        onConceptMappingChange?.(newMapping)
    }, [selectedDataElements, datasets, autoGrouping, onConceptMappingChange])
    
    if (!currentMapping?.concepts) {
        return (
            <NoticeBox title={i18n.t('No concept mapping available')}>
                {i18n.t('Select data elements first to generate concept mappings.')}
            </NoticeBox>
        )
    }
    
    return (
        <div className={styles.conceptMappingManager}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h3>{i18n.t('Concept-Based Data Elements Mapping')}</h3>
                    <div className={styles.stats}>
                        <Tag positive>{currentMapping.concepts.length} {i18n.t('concepts')}</Tag>
                        <Tag neutral>
                            {currentMapping.concepts.reduce((sum, c) => sum + c.bindings.length, 0)} {i18n.t('bindings')}
                        </Tag>
                    </div>
                </div>
                
                {!readOnly && (
                    <ButtonStrip>
                        <div className={styles.autoGroupingToggle}>
                            <Checkbox
                                checked={autoGrouping}
                                onChange={({ checked }) => setAutoGrouping(checked)}
                                label={i18n.t('Auto-group by concept')}
                            />
                        </div>
                        <Button onClick={regenerateMapping} small>
                            {i18n.t('Regenerate')}
                        </Button>
                        <Button onClick={() => setShowCreateModal(true)} primary small icon={<IconAdd24 />}>
                            {i18n.t('Add Concept')}
                        </Button>
                    </ButtonStrip>
                )}
            </div>
            
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <NoticeBox error title={i18n.t('Validation Errors')}>
                    <ul>
                        {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </NoticeBox>
            )}
            
            {/* Concepts List */}
            <div className={styles.conceptsList}>
                {currentMapping.concepts.map((concept) => (
                    <ConceptCard
                        key={concept.conceptId}
                        concept={concept}
                        datasets={datasets}
                        expanded={expandedConcepts.has(concept.conceptId)}
                        onToggle={() => toggleConcept(concept.conceptId)}
                        onUpdate={(updates) => updateConcept(concept.conceptId, updates)}
                        onRemove={() => removeConcept(concept.conceptId)}
                        onAddBinding={(datasetId) => addBinding(concept.conceptId, datasetId)}
                        onUpdateBinding={(bindingIndex, updates) => updateBinding(concept.conceptId, bindingIndex, updates)}
                        onRemoveBinding={(bindingIndex) => removeBinding(concept.conceptId, bindingIndex)}
                        readOnly={readOnly}
                    />
                ))}
            </div>
            
            {/* Create Concept Modal */}
            {showCreateModal && (
                <CreateConceptModal
                    onClose={() => setShowCreateModal(false)}
                    onSave={addConcept}
                    existingIds={new Set(currentMapping.concepts.map(c => c.conceptId))}
                />
            )}
        </div>
    )
}

/**
 * Individual Concept Card Component
 */
const ConceptCard = ({
    concept,
    datasets,
    expanded,
    onToggle,
    onUpdate,
    onRemove,
    onAddBinding,
    onUpdateBinding,
    onRemoveBinding,
    readOnly
}) => {
    const [editing, setEditing] = useState(false)
    const [editData, setEditData] = useState({
        name: concept.name,
        unit: concept.unit,
        valueType: concept.valueType
    })
    
    const availableDatasets = useMemo(() => {
        const boundDatasetIds = new Set(concept.bindings.map(b => b.datasetId))
        return datasets.filter(ds => !boundDatasetIds.has(ds.id))
    }, [concept.bindings, datasets])
    
    const handleSave = () => {
        onUpdate(editData)
        setEditing(false)
    }
    
    const handleCancel = () => {
        setEditData({
            name: concept.name,
            unit: concept.unit,
            valueType: concept.valueType
        })
        setEditing(false)
    }
    
    return (
        <Card className={styles.conceptCard}>
            {/* Concept Header */}
            <div className={styles.conceptHeader} onClick={onToggle}>
                <div className={styles.conceptHeaderLeft}>
                    {expanded ? <IconChevronDown24 /> : <IconChevronRight24 />}
                    <div className={styles.conceptInfo}>
                        <div className={styles.conceptName}>
                            {editing ? (
                                <InputField
                                    value={editData.name}
                                    onChange={({ value }) => setEditData(prev => ({ ...prev, name: value }))}
                                    onClick={(e) => e.stopPropagation()}
                                    dense
                                />
                            ) : (
                                <strong>{concept.name}</strong>
                            )}
                        </div>
                        <div className={styles.conceptMeta}>
                            <code>{concept.conceptId}</code>
                            <span>•</span>
                            <span>{concept.valueType}</span>
                            <span>•</span>
                            <span>{concept.unit}</span>
                            <span>•</span>
                            <span>{concept.bindings.length} {i18n.t('bindings')}</span>
                        </div>
                    </div>
                </div>
                
                {!readOnly && (
                    <div className={styles.conceptActions} onClick={(e) => e.stopPropagation()}>
                        {editing ? (
                            <ButtonStrip>
                                <Button onClick={handleSave} small primary>
                                    {i18n.t('Save')}
                                </Button>
                                <Button onClick={handleCancel} small>
                                    {i18n.t('Cancel')}
                                </Button>
                            </ButtonStrip>
                        ) : (
                            <ButtonStrip>
                                <Button onClick={() => setEditing(true)} small icon={<IconEdit24 />}>
                                    {i18n.t('Edit')}
                                </Button>
                                <Button onClick={onRemove} small destructive icon={<IconDelete24 />}>
                                    {i18n.t('Remove')}
                                </Button>
                            </ButtonStrip>
                        )}
                    </div>
                )}
            </div>
            
            {/* Concept Details (when expanded) */}
            {expanded && (
                <div className={styles.conceptDetails}>
                    {editing && (
                        <div className={styles.editForm}>
                            <div className={styles.formRow}>
                                <SingleSelectField
                                    label={i18n.t('Value Type')}
                                    selected={editData.valueType}
                                    onChange={({ selected }) => setEditData(prev => ({ ...prev, valueType: selected }))}
                                    dense
                                >
                                    <SingleSelectOption value="NUMBER" label="NUMBER" />
                                    <SingleSelectOption value="INTEGER" label="INTEGER" />
                                    <SingleSelectOption value="PERCENTAGE" label="PERCENTAGE" />
                                    <SingleSelectOption value="BOOLEAN" label="BOOLEAN" />
                                    <SingleSelectOption value="TEXT" label="TEXT" />
                                    <SingleSelectOption value="DATE" label="DATE" />
                                </SingleSelectField>
                                
                                <SingleSelectField
                                    label={i18n.t('Unit')}
                                    selected={editData.unit}
                                    onChange={({ selected }) => setEditData(prev => ({ ...prev, unit: selected }))}
                                    dense
                                >
                                    <SingleSelectOption value="count" label={i18n.t('Count')} />
                                    <SingleSelectOption value="percent" label={i18n.t('Percent')} />
                                    <SingleSelectOption value="boolean" label={i18n.t('Boolean')} />
                                    <SingleSelectOption value="text" label={i18n.t('Text')} />
                                    <SingleSelectOption value="date" label={i18n.t('Date')} />
                                </SingleSelectField>
                            </div>
                        </div>
                    )}
                    
                    {/* Bindings */}
                    <div className={styles.bindings}>
                        <div className={styles.bindingsHeader}>
                            <h4>{i18n.t('Dataset Bindings')}</h4>
                            {!readOnly && availableDatasets.length > 0 && (
                                <SingleSelectField
                                    placeholder={i18n.t('Add binding to dataset...')}
                                    onChange={({ selected }) => {
                                        onAddBinding(selected)
                                    }}
                                    dense
                                >
                                    {availableDatasets.map(ds => (
                                        <SingleSelectOption key={ds.id} value={ds.id} label={ds.name} />
                                    ))}
                                </SingleSelectField>
                            )}
                        </div>
                        
                        {concept.bindings.map((binding, index) => (
                            <BindingCard
                                key={`${binding.datasetId}-${index}`}
                                binding={binding}
                                datasets={datasets}
                                onUpdate={(updates) => onUpdateBinding(index, updates)}
                                onRemove={() => onRemoveBinding(index)}
                                readOnly={readOnly}
                            />
                        ))}
                        
                        {concept.bindings.length === 0 && (
                            <div className={styles.noBindings}>
                                {i18n.t('No dataset bindings configured')}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Card>
    )
}

/**
 * Individual Binding Card Component
 */
const BindingCard = ({ binding, datasets, onUpdate, onRemove, readOnly }) => {
    const dataset = datasets.find(ds => ds.id === binding.datasetId)
    
    return (
        <div className={styles.bindingCard}>
            <div className={styles.bindingHeader}>
                <div className={styles.bindingInfo}>
                    <strong>{dataset?.name || binding.datasetId}</strong>
                    <div className={styles.bindingMeta}>
                        {binding.source.length} {i18n.t('source elements')}
                        {binding.transform && (
                            <>
                                <span>•</span>
                                <Tag small>{binding.transform.type}</Tag>
                            </>
                        )}
                    </div>
                </div>
                
                {!readOnly && (
                    <Button onClick={onRemove} small destructive icon={<IconDelete24 />}>
                        {i18n.t('Remove')}
                    </Button>
                )}
            </div>
            
            {/* Source Elements */}
            <div className={styles.sourceElements}>
                {binding.source.map((source, index) => (
                    <div key={index} className={styles.sourceElement}>
                        <code>{source.de}</code>
                        {source.coc && <code>.{source.coc}</code>}
                        {source.expression && (
                            <div className={styles.expression}>
                                <small>{source.expression}</small>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Create Concept Modal Component
 */
const CreateConceptModal = ({ onClose, onSave, existingIds }) => {
    const [formData, setFormData] = useState({
        name: '',
        valueType: 'NUMBER',
        unit: 'count'
    })
    
    const handleSave = () => {
        if (!formData.name.trim()) return
        onSave(formData)
    }
    
    return (
        <Modal onClose={onClose}>
            <ModalTitle>{i18n.t('Create New Concept')}</ModalTitle>
            <ModalContent>
                <div className={styles.createForm}>
                    <InputField
                        label={i18n.t('Concept Name')}
                        value={formData.name}
                        onChange={({ value }) => setFormData(prev => ({ ...prev, name: value }))}
                        placeholder={i18n.t('Enter concept name...')}
                    />
                    
                    <SingleSelectField
                        label={i18n.t('Value Type')}
                        selected={formData.valueType}
                        onChange={({ selected }) => setFormData(prev => ({ ...prev, valueType: selected }))}
                    >
                        <SingleSelectOption value="NUMBER" label="NUMBER" />
                        <SingleSelectOption value="INTEGER" label="INTEGER" />
                        <SingleSelectOption value="PERCENTAGE" label="PERCENTAGE" />
                        <SingleSelectOption value="BOOLEAN" label="BOOLEAN" />
                        <SingleSelectOption value="TEXT" label="TEXT" />
                        <SingleSelectOption value="DATE" label="DATE" />
                    </SingleSelectField>
                    
                    <SingleSelectField
                        label={i18n.t('Unit')}
                        selected={formData.unit}
                        onChange={({ selected }) => setFormData(prev => ({ ...prev, unit: selected }))}
                    >
                        <SingleSelectOption value="count" label={i18n.t('Count')} />
                        <SingleSelectOption value="percent" label={i18n.t('Percent')} />
                        <SingleSelectOption value="boolean" label={i18n.t('Boolean')} />
                        <SingleSelectOption value="text" label={i18n.t('Text')} />
                        <SingleSelectOption value="date" label={i18n.t('Date')} />
                    </SingleSelectField>
                </div>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onClose}>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button onClick={handleSave} primary disabled={!formData.name.trim()}>
                        {i18n.t('Create')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}

export default ConceptMappingManager