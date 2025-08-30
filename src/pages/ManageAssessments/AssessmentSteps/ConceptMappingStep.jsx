import React, { useState, useMemo, useCallback } from 'react'
import {
    Box,
    Button,
    ButtonStrip,
    NoticeBox,
    Tab,
    TabBar,
    Card,
    Tag,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    TextAreaField
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import ConceptMappingManager from './components/ConceptMappingManager'
import {
    transformToConceptMapping,
    validateConceptMapping,
    convertConceptMappingToLegacy
} from '../../../utils/conceptMappingUtils'

/**
 * ConceptMappingStep Component
 * 
 * This step allows users to create concept-based data elements mapping
 * where data elements are grouped by logical concepts and mapped across datasets.
 * 
 * Props:
 * - selectedDataElements: Array of selected data elements from ElementsStep
 * - datasets: Array of datasets with their data elements
 * - conceptMapping: Current concept mapping object
 * - onConceptMappingChange: Callback when concept mapping changes
 * - onNext: Callback to proceed to next step
 * - onPrevious: Callback to go back to previous step
 */
const ConceptMappingStep = ({
    selectedDataElements = [],
    datasets = [],
    conceptMapping = null,
    onConceptMappingChange,
    onNext,
    onPrevious,
    readOnly = false
}) => {
    const [activeTab, setActiveTab] = useState('mapping')
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [previewFormat, setPreviewFormat] = useState('json')
    
    // Statistics
    const stats = useMemo(() => {
        if (!conceptMapping?.concepts) {
            return {
                totalConcepts: 0,
                totalBindings: 0,
                totalDataElements: selectedDataElements.length,
                totalDatasets: datasets.length,
                mappedDataElements: 0,
                unmappedDataElements: selectedDataElements.length
            }
        }
        
        const totalBindings = conceptMapping.concepts.reduce((sum, c) => sum + c.bindings.length, 0)
        const mappedElementIds = new Set()
        
        // Count mapped data elements
        conceptMapping.concepts.forEach(concept => {
            concept.bindings.forEach(binding => {
                binding.source.forEach(source => {
                    mappedElementIds.add(source.de)
                })
            })
        })
        
        return {
            totalConcepts: conceptMapping.concepts.length,
            totalBindings,
            totalDataElements: selectedDataElements.length,
            totalDatasets: datasets.length,
            mappedDataElements: mappedElementIds.size,
            unmappedDataElements: selectedDataElements.length - mappedElementIds.size
        }
    }, [conceptMapping, selectedDataElements, datasets])
    
    // Validation
    const validation = useMemo(() => {
        if (!conceptMapping) {
            return {
                isValid: false,
                errors: [i18n.t('No concept mapping available')],
                warnings: []
            }
        }
        
        const errors = validateConceptMapping(conceptMapping)
        const warnings = []
        
        // Check for unmapped data elements
        if (stats.unmappedDataElements > 0) {
            warnings.push(
                i18n.t('{{count}} data elements are not mapped to any concept', {
                    count: stats.unmappedDataElements
                })
            )
        }
        
        // Check for concepts without bindings
        const conceptsWithoutBindings = conceptMapping.concepts.filter(c => c.bindings.length === 0)
        if (conceptsWithoutBindings.length > 0) {
            warnings.push(
                i18n.t('{{count}} concepts have no dataset bindings', {
                    count: conceptsWithoutBindings.length
                })
            )
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        }
    }, [conceptMapping, stats])
    
    // Generate initial mapping if none exists
    const handleGenerateMapping = useCallback(() => {
        const newMapping = transformToConceptMapping(selectedDataElements, datasets, {
            groupByConcept: true,
            includeTransforms: true,
            generateExpressions: true
        })
        onConceptMappingChange?.(newMapping)
    }, [selectedDataElements, datasets, onConceptMappingChange])
    
    // Export mapping in different formats
    const exportMapping = useCallback((format) => {
        if (!conceptMapping) return ''
        
        switch (format) {
            case 'json':
                return JSON.stringify(conceptMapping, null, 2)
            case 'legacy':
                const legacyMapping = convertConceptMappingToLegacy(conceptMapping)
                return JSON.stringify(legacyMapping, null, 2)
            case 'summary':
                return generateMappingSummary(conceptMapping, stats)
            default:
                return JSON.stringify(conceptMapping, null, 2)
        }
    }, [conceptMapping, stats])
    
    // Handle next step
    const handleNext = useCallback(() => {
        if (validation.isValid) {
            onNext?.()
        }
    }, [validation.isValid, onNext])
    
    if (selectedDataElements.length === 0) {
        return (
            <div style={{ padding: 20 }}>
                <NoticeBox title={i18n.t('No data elements selected')}>
                    {i18n.t('Please go back to the Elements step and select data elements first.')}
                </NoticeBox>
                <ButtonStrip style={{ marginTop: 16 }}>
                    <Button onClick={onPrevious}>
                        {i18n.t('Back to Elements')}
                    </Button>
                </ButtonStrip>
            </div>
        )
    }
    
    return (
        <div style={{ padding: 0 }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600 }}>
                    {i18n.t('Data Elements Concept Mapping')}
                </h3>
                <p style={{ margin: 0, color: '#6c757d', fontSize: 14 }}>
                    {i18n.t('Create logical concepts from your data elements and map them across datasets. This enables cross-dataset analysis and standardized reporting.')}
                </p>
            </div>
            
            {/* Statistics Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 16, 
                marginBottom: 20 
            }}>
                <Card style={{ padding: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#0d6efd' }}>
                            {stats.totalConcepts}
                        </div>
                        <div style={{ fontSize: 12, color: '#6c757d' }}>
                            {i18n.t('Concepts')}
                        </div>
                    </div>
                </Card>
                
                <Card style={{ padding: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#198754' }}>
                            {stats.mappedDataElements}
                        </div>
                        <div style={{ fontSize: 12, color: '#6c757d' }}>
                            {i18n.t('Mapped Elements')}
                        </div>
                    </div>
                </Card>
                
                <Card style={{ padding: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fd7e14' }}>
                            {stats.totalBindings}
                        </div>
                        <div style={{ fontSize: 12, color: '#6c757d' }}>
                            {i18n.t('Dataset Bindings')}
                        </div>
                    </div>
                </Card>
                
                <Card style={{ padding: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                            fontSize: 24, 
                            fontWeight: 'bold', 
                            color: stats.unmappedDataElements > 0 ? '#dc3545' : '#6c757d' 
                        }}>
                            {stats.unmappedDataElements}
                        </div>
                        <div style={{ fontSize: 12, color: '#6c757d' }}>
                            {i18n.t('Unmapped Elements')}
                        </div>
                    </div>
                </Card>
            </div>
            
            {/* Validation Messages */}
            {validation.errors.length > 0 && (
                <NoticeBox error title={i18n.t('Validation Errors')} style={{ marginBottom: 16 }}>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {validation.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </NoticeBox>
            )}
            
            {validation.warnings.length > 0 && (
                <NoticeBox warning title={i18n.t('Warnings')} style={{ marginBottom: 16 }}>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {validation.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                        ))}
                    </ul>
                </NoticeBox>
            )}
            
            {/* Tabs */}
            <TabBar>
                <Tab selected={activeTab === 'mapping'} onClick={() => setActiveTab('mapping')}>
                    {i18n.t('Concept Mapping')}
                </Tab>
                <Tab selected={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
                    {i18n.t('Preview & Export')}
                </Tab>
            </TabBar>
            
            {/* Tab Content */}
            <div style={{ marginTop: 20 }}>
                {activeTab === 'mapping' && (
                    <div>
                        {!conceptMapping ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <h4>{i18n.t('No concept mapping created yet')}</h4>
                                <p style={{ color: '#6c757d', marginBottom: 20 }}>
                                    {i18n.t('Generate an initial concept mapping from your selected data elements.')}
                                </p>
                                <Button onClick={handleGenerateMapping} primary>
                                    {i18n.t('Generate Concept Mapping')}
                                </Button>
                            </div>
                        ) : (
                            <ConceptMappingManager
                                selectedDataElements={selectedDataElements}
                                datasets={datasets}
                                conceptMapping={conceptMapping}
                                onConceptMappingChange={onConceptMappingChange}
                                readOnly={readOnly}
                            />
                        )}
                    </div>
                )}
                
                {activeTab === 'preview' && (
                    <PreviewTab
                        conceptMapping={conceptMapping}
                        stats={stats}
                        onExport={exportMapping}
                        onShowModal={() => setShowPreviewModal(true)}
                    />
                )}
            </div>
            
            {/* Navigation */}
            <div style={{ 
                marginTop: 32, 
                paddingTop: 20, 
                borderTop: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Button onClick={onPrevious}>
                    {i18n.t('Previous')}
                </Button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {validation.isValid ? (
                        <Tag positive>{i18n.t('Ready to proceed')}</Tag>
                    ) : (
                        <Tag negative>{i18n.t('Fix errors to continue')}</Tag>
                    )}
                    
                    <Button 
                        onClick={handleNext} 
                        primary 
                        disabled={!validation.isValid}
                    >
                        {i18n.t('Next')}
                    </Button>
                </div>
            </div>
            
            {/* Preview Modal */}
            {showPreviewModal && (
                <PreviewModal
                    conceptMapping={conceptMapping}
                    format={previewFormat}
                    onFormatChange={setPreviewFormat}
                    onExport={exportMapping}
                    onClose={() => setShowPreviewModal(false)}
                />
            )}
        </div>
    )
}

/**
 * Preview Tab Component
 */
const PreviewTab = ({ conceptMapping, stats, onExport, onShowModal }) => {
    if (!conceptMapping) {
        return (
            <NoticeBox title={i18n.t('No mapping to preview')}>
                {i18n.t('Create a concept mapping first to see the preview.')}
            </NoticeBox>
        )
    }
    
    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h4>{i18n.t('Mapping Summary')}</h4>
                <div style={{ 
                    background: '#f8f9fa', 
                    padding: 16, 
                    borderRadius: 6, 
                    border: '1px solid #e9ecef' 
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <strong>{i18n.t('Concepts:')}</strong> {stats.totalConcepts}<br/>
                            <strong>{i18n.t('Dataset Bindings:')}</strong> {stats.totalBindings}<br/>
                            <strong>{i18n.t('Mapped Elements:')}</strong> {stats.mappedDataElements}
                        </div>
                        <div>
                            <strong>{i18n.t('Total Elements:')}</strong> {stats.totalDataElements}<br/>
                            <strong>{i18n.t('Total Datasets:')}</strong> {stats.totalDatasets}<br/>
                            <strong>{i18n.t('Unmapped Elements:')}</strong> {stats.unmappedDataElements}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
                <h4>{i18n.t('Concept List')}</h4>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                    {conceptMapping.concepts.map((concept, index) => (
                        <div 
                            key={concept.conceptId} 
                            style={{ 
                                padding: 12, 
                                borderBottom: index < conceptMapping.concepts.length - 1 ? '1px solid #e9ecef' : 'none',
                                background: index % 2 === 0 ? '#f8f9fa' : 'white'
                            }}
                        >
                            <div style={{ fontWeight: 'bold' }}>{concept.name}</div>
                            <div style={{ fontSize: 12, color: '#6c757d' }}>
                                <code>{concept.conceptId}</code> • {concept.valueType} • {concept.bindings.length} bindings
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <ButtonStrip>
                <Button onClick={onShowModal}>
                    {i18n.t('View Full Preview')}
                </Button>
                <Button onClick={() => downloadFile(onExport('json'), 'concept-mapping.json', 'application/json')}>
                    {i18n.t('Download JSON')}
                </Button>
                <Button onClick={() => downloadFile(onExport('legacy'), 'legacy-mapping.json', 'application/json')}>
                    {i18n.t('Download Legacy Format')}
                </Button>
            </ButtonStrip>
        </div>
    )
}

/**
 * Preview Modal Component
 */
const PreviewModal = ({ conceptMapping, format, onFormatChange, onExport, onClose }) => {
    const previewContent = onExport(format)
    
    return (
        <Modal large onClose={onClose}>
            <ModalTitle>{i18n.t('Concept Mapping Preview')}</ModalTitle>
            <ModalContent>
                <div style={{ marginBottom: 16 }}>
                    <ButtonStrip>
                        <Button 
                            small 
                            onClick={() => onFormatChange('json')}
                            primary={format === 'json'}
                        >
                            {i18n.t('JSON Format')}
                        </Button>
                        <Button 
                            small 
                            onClick={() => onFormatChange('legacy')}
                            primary={format === 'legacy'}
                        >
                            {i18n.t('Legacy Format')}
                        </Button>
                        <Button 
                            small 
                            onClick={() => onFormatChange('summary')}
                            primary={format === 'summary'}
                        >
                            {i18n.t('Summary')}
                        </Button>
                    </ButtonStrip>
                </div>
                
                <TextAreaField
                    value={previewContent}
                    rows={20}
                    readOnly
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onClose}>
                        {i18n.t('Close')}
                    </Button>
                    <Button 
                        onClick={() => {
                            navigator.clipboard.writeText(previewContent)
                            // Could show a toast notification here
                        }}
                        primary
                    >
                        {i18n.t('Copy to Clipboard')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}

/**
 * Generate mapping summary text
 */
const generateMappingSummary = (conceptMapping, stats) => {
    let summary = `# Concept Mapping Summary\n\n`
    summary += `Generated: ${new Date().toISOString()}\n`
    summary += `Version: ${conceptMapping.version || '1.0'}\n\n`
    
    summary += `## Statistics\n`
    summary += `- Total Concepts: ${stats.totalConcepts}\n`
    summary += `- Total Bindings: ${stats.totalBindings}\n`
    summary += `- Mapped Elements: ${stats.mappedDataElements}\n`
    summary += `- Unmapped Elements: ${stats.unmappedDataElements}\n\n`
    
    summary += `## Concepts\n\n`
    
    conceptMapping.concepts.forEach((concept, index) => {
        summary += `### ${index + 1}. ${concept.name}\n`
        summary += `- **ID:** ${concept.conceptId}\n`
        summary += `- **Type:** ${concept.valueType}\n`
        summary += `- **Unit:** ${concept.unit}\n`
        summary += `- **Bindings:** ${concept.bindings.length}\n\n`
        
        if (concept.bindings.length > 0) {
            summary += `**Dataset Bindings:**\n`
            concept.bindings.forEach((binding, bindingIndex) => {
                summary += `${bindingIndex + 1}. Dataset: ${binding.datasetId}\n`
                summary += `   - Sources: ${binding.source.length}\n`
                if (binding.transform) {
                    summary += `   - Transform: ${binding.transform.type}\n`
                }
                binding.source.forEach((source, sourceIndex) => {
                    summary += `     ${sourceIndex + 1}. ${source.de}${source.coc ? `.${source.coc}` : ''}\n`
                })
            })
            summary += `\n`
        }
    })
    
    return summary
}

/**
 * Download file utility
 */
const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export default ConceptMappingStep