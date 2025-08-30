import React, { useState, useEffect } from 'react'
import {
    Box,
    Button,
    ButtonStrip,
    Card,
    InputField,
    TextAreaField,
    SingleSelect,
    SingleSelectOption,
    MultiSelect,
    MultiSelectOption,
    Tag,
    NoticeBox,
    CircularLoader,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    TabBar,
    Tab,
    Divider,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    IconAdd16,
    IconEdit16,
    IconDelete16,
    IconAttachment16,
    FileInput,
    FileInputField,
    LinearLoader
} from '@dhis2/ui'
import { useDataEngine } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import {
    generateUID,
    generateUniqueCode,
    validateMetadata,
    createMetadataPackage,
    loadAllManualMetadata,
    deleteMetadata,
    processAttachments
} from '../../utils/manualMetadataCreator'

const ManualMetadataCreator = ({ onMetadataCreated, onClose }) => {
    const dataEngine = useDataEngine()
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState({ message: '', percentage: 0 })
    
    // Metadata state
    const [datasets, setDatasets] = useState([])
    const [dataElements, setDataElements] = useState([])
    const [categoryCombos, setCategoryCombos] = useState([])
    const [categories, setCategories] = useState([])
    const [categoryOptions, setCategoryOptions] = useState([])
    const [attachments, setAttachments] = useState([])
    
    // Modal states
    const [showDatasetModal, setShowDatasetModal] = useState(false)
    const [showDataElementModal, setShowDataElementModal] = useState(false)
    // const [showCategoryComboModal, setShowCategoryComboModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [showCategoryOptionModal, setShowCategoryOptionModal] = useState(false)
    const [showAttachmentModal, setShowAttachmentModal] = useState(false)
    
    // Form states
    const [editingItem, setEditingItem] = useState(null)
    const [currentForm, setCurrentForm] = useState({})
    const [selectedFiles, setSelectedFiles] = useState([])
    
    // Load existing metadata on component mount
    useEffect(() => {
        loadExistingMetadata()
    }, [])

    const loadExistingMetadata = async () => {
        try {
            setLoading(true)
            const metadata = await loadAllManualMetadata(dataEngine)
            
            setDatasets(metadata.datasets)
            setDataElements(metadata.dataElements)
            setCategoryCombos(metadata.categoryCombos)
            setCategories(metadata.categories)
            setCategoryOptions(metadata.categoryOptions)
            setAttachments(metadata.attachments)
        } catch (error) {
            console.error('Error loading existing metadata:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleProgressUpdate = (progressInfo) => {
        setProgress({
            message: progressInfo.message,
            percentage: progressInfo.percentage || 0,
            step: progressInfo.step
        })
    }

    // Category Option Management
    const handleCreateCategoryOption = () => {
        setCurrentForm({
            id: generateUID(),
            name: '',
            code: '',
            displayName: '',
            description: ''
        })
        setEditingItem(null)
        setShowCategoryOptionModal(true)
    }

    const handleEditCategoryOption = (option) => {
        setCurrentForm({ ...option })
        setEditingItem(option)
        setShowCategoryOptionModal(true)
    }

    const handleSaveCategoryOption = () => {
        const validation = validateMetadata(currentForm, 'categoryOption')
        if (!validation.isValid) {
            alert(`Validation errors: ${validation.errors.join(', ')}`)
            return
        }

        if (editingItem) {
            setCategoryOptions(prev => prev.map(item => 
                item.id === editingItem.id ? currentForm : item
            ))
        } else {
            setCategoryOptions(prev => [...prev, currentForm])
        }

        setShowCategoryOptionModal(false)
        setCurrentForm({})
        setEditingItem(null)
    }

    const handleDeleteCategoryOption = async (option) => {
        if (option.createdInDHIS2) {
            const success = await deleteMetadata('categoryOption', option.dhis2Id, dataEngine, handleProgressUpdate)
            if (!success) return
        }
        
        setCategoryOptions(prev => prev.filter(item => item.id !== option.id))
    }

    // Category Management
    const handleCreateCategory = () => {
        setCurrentForm({
            id: generateUID(),
            name: '',
            code: '',
            displayName: '',
            description: '',
            dataDimension: true,
            dataDimensionType: 'DISAGGREGATION',
            categoryOptions: []
        })
        setEditingItem(null)
        setShowCategoryModal(true)
    }

    const handleEditCategory = (category) => {
        setCurrentForm({ ...category })
        setEditingItem(category)
        setShowCategoryModal(true)
    }

    const handleSaveCategory = () => {
        const validation = validateMetadata(currentForm, 'category')
        if (!validation.isValid) {
            alert(`Validation errors: ${validation.errors.join(', ')}`)
            return
        }

        if (editingItem) {
            setCategories(prev => prev.map(item => 
                item.id === editingItem.id ? currentForm : item
            ))
        } else {
            setCategories(prev => [...prev, currentForm])
        }

        setShowCategoryModal(false)
        setCurrentForm({})
        setEditingItem(null)
    }

    const handleDeleteCategory = async (category) => {
        if (category.createdInDHIS2) {
            const success = await deleteMetadata('category', category.dhis2Id, dataEngine, handleProgressUpdate)
            if (!success) return
        }
        
        setCategories(prev => prev.filter(item => item.id !== category.id))
    }

    // Category Combo Management
    const handleCreateCategoryCombo = () => {
        setCurrentForm({
            id: generateUID(),
            name: '',
            code: '',
            displayName: '',
            description: '',
            dataDimensionType: 'DISAGGREGATION',
            categories: []
        })
        setEditingItem(null)
        // setShowCategoryComboModal(true)
    }

    const handleEditCategoryCombo = (combo) => {
        setCurrentForm({ ...combo })
        setEditingItem(combo)
        // setShowCategoryComboModal(true)
    }

    const handleSaveCategoryCombo = () => {
        const validation = validateMetadata(currentForm, 'categoryCombo')
        if (!validation.isValid) {
            alert(`Validation errors: ${validation.errors.join(', ')}`)
            return
        }

        if (editingItem) {
            setCategoryCombos(prev => prev.map(item => 
                item.id === editingItem.id ? currentForm : item
            ))
        } else {
            setCategoryCombos(prev => [...prev, currentForm])
        }

        // setShowCategoryComboModal(false)
        setCurrentForm({})
        setEditingItem(null)
    }

    const handleDeleteCategoryCombo = async (combo) => {
        if (combo.createdInDHIS2) {
            const success = await deleteMetadata('categoryCombo', combo.dhis2Id, dataEngine, handleProgressUpdate)
            if (!success) return
        }
        
        setCategoryCombos(prev => prev.filter(item => item.id !== combo.id))
    }

    // Data Element Management
    const handleCreateDataElement = () => {
        setCurrentForm({
            id: generateUID(),
            name: '',
            code: '',
            shortName: '',
            description: '',
            formName: '',
            valueType: 'INTEGER',
            domainType: 'AGGREGATE',
            aggregationType: 'SUM',
            categoryCombo: null
        })
        setEditingItem(null)
        setShowDataElementModal(true)
    }

    const handleEditDataElement = (element) => {
        setCurrentForm({ ...element })
        setEditingItem(element)
        setShowDataElementModal(true)
    }

    const handleSaveDataElement = () => {
        const validation = validateMetadata(currentForm, 'dataElement')
        if (!validation.isValid) {
            alert(`Validation errors: ${validation.errors.join(', ')}`)
            return
        }

        if (editingItem) {
            setDataElements(prev => prev.map(item => 
                item.id === editingItem.id ? currentForm : item
            ))
        } else {
            setDataElements(prev => [...prev, currentForm])
        }

        setShowDataElementModal(false)
        setCurrentForm({})
        setEditingItem(null)
    }

    const handleDeleteDataElement = async (element) => {
        if (element.createdInDHIS2) {
            const success = await deleteMetadata('dataElement', element.dhis2Id, dataEngine, handleProgressUpdate)
            if (!success) return
        }
        
        setDataElements(prev => prev.filter(item => item.id !== element.id))
    }

    // Dataset Management
    const handleCreateDataset = () => {
        setCurrentForm({
            id: generateUID(),
            name: '',
            code: '',
            shortName: '',
            description: '',
            periodType: 'Monthly',
            dataSetElements: [],
            organisationUnits: [],
            categoryCombo: null,
            expiryDays: 0,
            openFuturePeriods: 0,
            timelyDays: 15
        })
        setEditingItem(null)
        setShowDatasetModal(true)
    }

    const handleEditDataset = (dataset) => {
        setCurrentForm({ ...dataset })
        setEditingItem(dataset)
        setShowDatasetModal(true)
    }

    const handleSaveDataset = () => {
        const validation = validateMetadata(currentForm, 'dataset')
        if (!validation.isValid) {
            alert(`Validation errors: ${validation.errors.join(', ')}`)
            return
        }

        if (editingItem) {
            setDatasets(prev => prev.map(item => 
                item.id === editingItem.id ? currentForm : item
            ))
        } else {
            setDatasets(prev => [...prev, currentForm])
        }

        setShowDatasetModal(false)
        setCurrentForm({})
        setEditingItem(null)
    }

    const handleDeleteDataset = async (dataset) => {
        if (dataset.createdInDHIS2) {
            const success = await deleteMetadata('dataset', dataset.dhis2Id, dataEngine, handleProgressUpdate)
            if (!success) return
        }
        
        setDatasets(prev => prev.filter(item => item.id !== dataset.id))
    }

    // Attachment Management
    const handleAddAttachment = (metadataType, metadataId) => {
        setCurrentForm({ metadataType, metadataId })
        setSelectedFiles([])
        setShowAttachmentModal(true)
    }

    const handleSaveAttachments = async () => {
        if (selectedFiles.length === 0) return

        try {
            setLoading(true)
            const processedAttachments = await processAttachments(
                selectedFiles,
                currentForm.metadataId,
                currentForm.metadataType,
                dataEngine,
                handleProgressUpdate
            )

            setAttachments(prev => [...prev, ...processedAttachments])
            setShowAttachmentModal(false)
            setSelectedFiles([])
            setCurrentForm({})
        } catch (error) {
            console.error('Error processing attachments:', error)
            alert(`Error processing attachments: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    // Create all metadata in DHIS2
    const handleCreateInDHIS2 = async () => {
        try {
            setLoading(true)
            
            const metadataPackage = {
                categoryOptions,
                categories,
                categoryCombos,
                dataElements,
                datasets,
                attachments: attachments.reduce((acc, attachment) => {
                    const existing = acc.find(group => 
                        group.metadataId === attachment.metadataId && 
                        group.metadataType === attachment.metadataType
                    )
                    
                    if (existing) {
                        existing.files.push(attachment)
                    } else {
                        acc.push({
                            metadataId: attachment.metadataId,
                            metadataType: attachment.metadataType,
                            files: [attachment]
                        })
                    }
                    
                    return acc
                }, [])
            }

            const results = await createMetadataPackage(metadataPackage, dataEngine, handleProgressUpdate)

            if (results.success) {
                alert(i18n.t('All metadata created successfully in DHIS2!'))
                if (onMetadataCreated) {
                    onMetadataCreated(results)
                }
            } else {
                alert(i18n.t('Some metadata creation failed. Check console for details.'))
                console.error('Metadata creation errors:', results.errors)
            }

            // Reload metadata to get DHIS2 IDs
            await loadExistingMetadata()

        } catch (error) {
            console.error('Error creating metadata package:', error)
            alert(`Error creating metadata: ${error.message}`)
        } finally {
            setLoading(false)
            setProgress({ message: '', percentage: 0 })
        }
    }

    const renderOverview = () => (
        <Box>
            <Card>
                <Box padding="16px">
                    <h3>{i18n.t('Metadata Overview')}</h3>
                    <Box display="flex" gap="16px" marginTop="16px">
                        <Box>
                            <strong>{i18n.t('Category Options')}: </strong>
                            <Tag>{categoryOptions.length}</Tag>
                        </Box>
                        <Box>
                            <strong>{i18n.t('Categories')}: </strong>
                            <Tag>{categories.length}</Tag>
                        </Box>
                        <Box>
                            <strong>{i18n.t('Category Combos')}: </strong>
                            <Tag>{categoryCombos.length}</Tag>
                        </Box>
                        <Box>
                            <strong>{i18n.t('Data Elements')}: </strong>
                            <Tag>{dataElements.length}</Tag>
                        </Box>
                        <Box>
                            <strong>{i18n.t('Datasets')}: </strong>
                            <Tag>{datasets.length}</Tag>
                        </Box>
                        <Box>
                            <strong>{i18n.t('Attachments')}: </strong>
                            <Tag>{attachments.length}</Tag>
                        </Box>
                    </Box>
                    
                    {loading && (
                        <Box marginTop="16px">
                            <LinearLoader />
                            <Box marginTop="8px" fontSize="14px" color="#6c757d">
                                {progress.message}
                            </Box>
                        </Box>
                    )}
                    
                    <ButtonStrip marginTop="24px">
                        <Button 
                            primary 
                            onClick={handleCreateInDHIS2}
                            disabled={loading || (categoryOptions.length === 0 && categories.length === 0 && categoryCombos.length === 0 && dataElements.length === 0 && datasets.length === 0)}
                        >
                            {loading ? i18n.t('Creating...') : i18n.t('Create All in DHIS2')}
                        </Button>
                        <Button onClick={onClose}>
                            {i18n.t('Close')}
                        </Button>
                    </ButtonStrip>
                </Box>
            </Card>
        </Box>
    )

    const renderCategoryOptions = () => (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                <h3>{i18n.t('Category Options')}</h3>
                <Button small onClick={handleCreateCategoryOption}>
                    <IconAdd16 />
                    {i18n.t('Add Category Option')}
                </Button>
            </Box>
            
            <DataTable>
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                        <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                        <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                        <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {categoryOptions.map(option => (
                        <DataTableRow key={option.id}>
                            <DataTableCell>{option.name}</DataTableCell>
                            <DataTableCell>{option.code}</DataTableCell>
                            <DataTableCell>
                                {option.createdInDHIS2 ? (
                                    <Tag positive>{i18n.t('Created in DHIS2')}</Tag>
                                ) : (
                                    <Tag neutral>{i18n.t('Local only')}</Tag>
                                )}
                            </DataTableCell>
                            <DataTableCell>
                                <ButtonStrip>
                                    <Button small onClick={() => handleEditCategoryOption(option)}>
                                        <IconEdit16 />
                                    </Button>
                                    <Button small onClick={() => handleDeleteCategoryOption(option)}>
                                        <IconDelete16 />
                                    </Button>
                                    <Button small onClick={() => handleAddAttachment('categoryOption', option.id)}>
                                        <IconAttachment16 />
                                    </Button>
                                </ButtonStrip>
                            </DataTableCell>
                        </DataTableRow>
                    ))}
                </DataTableBody>
            </DataTable>
        </Box>
    )

    // Similar render functions for other metadata types would go here...
    // For brevity, I'll show the structure for categories and then indicate the pattern

    const renderCategories = () => (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                <h3>{i18n.t('Categories')}</h3>
                <Button small onClick={handleCreateCategory}>
                    <IconAdd16 />
                    {i18n.t('Add Category')}
                </Button>
            </Box>
            
            <DataTable>
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader>{i18n.t('Name')}</DataTableColumnHeader>
                        <DataTableColumnHeader>{i18n.t('Code')}</DataTableColumnHeader>
                        <DataTableColumnHeader>{i18n.t('Options Count')}</DataTableColumnHeader>
                        <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                        <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {categories.map(category => (
                        <DataTableRow key={category.id}>
                            <DataTableCell>{category.name}</DataTableCell>
                            <DataTableCell>{category.code}</DataTableCell>
                            <DataTableCell>{category.categoryOptions?.length || 0}</DataTableCell>
                            <DataTableCell>
                                {category.createdInDHIS2 ? (
                                    <Tag positive>{i18n.t('Created in DHIS2')}</Tag>
                                ) : (
                                    <Tag neutral>{i18n.t('Local only')}</Tag>
                                )}
                            </DataTableCell>
                            <DataTableCell>
                                <ButtonStrip>
                                    <Button small onClick={() => handleEditCategory(category)}>
                                        <IconEdit16 />
                                    </Button>
                                    <Button small onClick={() => handleDeleteCategory(category)}>
                                        <IconDelete16 />
                                    </Button>
                                    <Button small onClick={() => handleAddAttachment('category', category.id)}>
                                        <IconAttachment16 />
                                    </Button>
                                </ButtonStrip>
                            </DataTableCell>
                        </DataTableRow>
                    ))}
                </DataTableBody>
            </DataTable>
        </Box>
    )


    return (
        <Box>
            <Box marginBottom="24px">
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#212934' }}>
                    {i18n.t('Manual Metadata Creator')}
                </h2>
                <Box marginTop="8px" fontSize="14px" color="#6c757d">
                    {i18n.t('Create and manage DHIS2 metadata with attachments and datastore integration')}
                </Box>
            </Box>

            <TabBar>
                <Tab selected={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                    {i18n.t('Overview')}
                </Tab>
                <Tab selected={activeTab === 'categoryOptions'} onClick={() => setActiveTab('categoryOptions')}>
                    {i18n.t('Category Options')} ({categoryOptions.length})
                </Tab>
                <Tab selected={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>
                    {i18n.t('Categories')} ({categories.length})
                </Tab>

                <Tab selected={activeTab === 'dataElements'} onClick={() => setActiveTab('dataElements')}>
                    {i18n.t('Data Elements')} ({dataElements.length})
                </Tab>
                <Tab selected={activeTab === 'datasets'} onClick={() => setActiveTab('datasets')}>
                    {i18n.t('Datasets')} ({datasets.length})
                </Tab>
            </TabBar>

            <Box marginTop="24px">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'categoryOptions' && renderCategoryOptions()}
                {activeTab === 'categories' && renderCategories()}
                {/* Add other tab renders here following the same pattern */}
            </Box>

            {/* Category Option Modal */}
            {showCategoryOptionModal && (
                <Modal onClose={() => setShowCategoryOptionModal(false)}>
                    <ModalTitle>
                        {editingItem ? i18n.t('Edit Category Option') : i18n.t('Create Category Option')}
                    </ModalTitle>
                    <ModalContent>
                        <Box display="flex" flexDirection="column" gap="16px">
                            <InputField
                                label={i18n.t('Name')}
                                value={currentForm.name || ''}
                                onChange={({ value }) => setCurrentForm(prev => ({ ...prev, name: value }))}
                                required
                            />
                            <InputField
                                label={i18n.t('Code')}
                                value={currentForm.code || ''}
                                onChange={({ value }) => setCurrentForm(prev => ({ ...prev, code: value }))}
                                required
                            />
                            <InputField
                                label={i18n.t('Display Name')}
                                value={currentForm.displayName || ''}
                                onChange={({ value }) => setCurrentForm(prev => ({ ...prev, displayName: value }))}
                            />
                            <TextAreaField
                                label={i18n.t('Description')}
                                value={currentForm.description || ''}
                                onChange={({ value }) => setCurrentForm(prev => ({ ...prev, description: value }))}
                            />
                        </Box>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button onClick={() => setShowCategoryOptionModal(false)}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button primary onClick={handleSaveCategoryOption}>
                                {i18n.t('Save')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <Modal large onClose={() => setShowCategoryModal(false)}>
                    <ModalTitle>
                        {editingItem ? i18n.t('Edit Category') : i18n.t('Create Category')}
                    </ModalTitle>
                    <ModalContent>
                        <Box display="flex" flexDirection="column" gap="16px">
                            <InputField
                                label={i18n.t('Name')}
                                value={currentForm.name || ''}
                                onChange={({ value }) => setCurrentForm(prev => ({ ...prev, name: value }))}
                                required
                            />
                            <InputField
                                label={i18n.t('Code')}
                                value={currentForm.code || ''}
                                onChange={({ value }) => setCurrentForm(prev => ({ ...prev, code: value }))}
                                required
                            />
                            <InputField
                                label={i18n.t('Display Name')}
                                value={currentForm.displayName || ''}
                                onChange={({ value }) => setCurrentForm(prev => ({ ...prev, displayName: value }))}
                            />
                            <TextAreaField
                                label={i18n.t('Description')}
                                value={currentForm.description || ''}
                                onChange={({ value }) => setCurrentForm(prev => ({ ...prev, description: value }))}
                            />
                            <SingleSelect
                                label={i18n.t('Data Dimension Type')}
                                selected={currentForm.dataDimensionType || 'DISAGGREGATION'}
                                onChange={({ selected }) => setCurrentForm(prev => ({ ...prev, dataDimensionType: selected }))}
                            >
                                <SingleSelectOption value="DISAGGREGATION" label="Disaggregation" />
                                <SingleSelectOption value="ATTRIBUTE" label="Attribute" />
                            </SingleSelect>
                            <MultiSelect
                                label={i18n.t('Category Options')}
                                selected={currentForm.categoryOptions?.map(opt => opt.id) || []}
                                onChange={({ selected }) => {
                                    const selectedOptions = categoryOptions.filter(opt => selected.includes(opt.id))
                                    setCurrentForm(prev => ({ ...prev, categoryOptions: selectedOptions }))
                                }}
                            >
                                {categoryOptions.map(option => (
                                    <MultiSelectOption key={option.id} value={option.id} label={option.name} />
                                ))}
                            </MultiSelect>
                        </Box>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button onClick={() => setShowCategoryModal(false)}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button primary onClick={handleSaveCategory}>
                                {i18n.t('Save')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}


            {/* Attachment Modal */}
            {showAttachmentModal && (
                <Modal onClose={() => setShowAttachmentModal(false)}>
                    <ModalTitle>
                        {i18n.t('Add Attachments')}
                    </ModalTitle>
                    <ModalContent>
                        <Box display="flex" flexDirection="column" gap="16px">
                            <Box>
                                <strong>{i18n.t('Metadata Type')}: </strong>
                                {currentForm.metadataType}
                            </Box>
                            <Box>
                                <strong>{i18n.t('Metadata ID')}: </strong>
                                {currentForm.metadataId}
                            </Box>
                            <FileInputField
                                label={i18n.t('Select Files')}
                                multiple
                                onChange={({ files }) => setSelectedFiles(files)}
                            />
                            {selectedFiles.length > 0 && (
                                <Box>
                                    <strong>{i18n.t('Selected Files')}:</strong>
                                    {selectedFiles.map((file, index) => (
                                        <Box key={index} marginTop="4px">
                                            • {file.name} ({Math.round(file.size / 1024)} KB)
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button onClick={() => setShowAttachmentModal(false)}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button 
                                primary 
                                onClick={handleSaveAttachments}
                                disabled={selectedFiles.length === 0 || loading}
                            >
                                {loading ? i18n.t('Processing...') : i18n.t('Save Attachments')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </Box>
    )
}

export default ManualMetadataCreator