import React, { useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    ButtonStrip,
    InputField,
    TextAreaField,
    SingleSelectField,
    SingleSelectOption,
    NoticeBox,
    CircularLoader,
    Tab,
    TabBar
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { OrganisationUnitTreeSelector } from './OrganisationUnitTreeSelector'

// Utility function to generate DHIS2-compatible UIDs
const generateUID = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = chars.charAt(Math.floor(Math.random() * 52)) // First char must be letter
    for (let i = 1; i < 11; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export const OrganisationUnitCreator = ({ 
    isOpen, 
    onClose, 
    onOrgUnitCreated,
    editingOrgUnit = null 
}) => {
    const dataEngine = useDataEngine()
    const [activeTab, setActiveTab] = useState('details')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    
    // Form state
    const [formData, setFormData] = useState({
        name: editingOrgUnit?.name || '',
        shortName: editingOrgUnit?.shortName || '',
        code: editingOrgUnit?.code || '',
        description: editingOrgUnit?.description || '',
        openingDate: editingOrgUnit?.openingDate || new Date().toISOString().split('T')[0],
        closedDate: editingOrgUnit?.closedDate || '',
        comment: editingOrgUnit?.comment || '',
        url: editingOrgUnit?.url || '',
        contactPerson: editingOrgUnit?.contactPerson || '',
        address: editingOrgUnit?.address || '',
        email: editingOrgUnit?.email || '',
        phoneNumber: editingOrgUnit?.phoneNumber || ''
    })
    
    const [selectedParent, setSelectedParent] = useState(
        editingOrgUnit?.parent || null
    )
    
    // Reset form when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            if (editingOrgUnit) {
                setFormData({
                    name: editingOrgUnit.name || '',
                    shortName: editingOrgUnit.shortName || '',
                    code: editingOrgUnit.code || '',
                    description: editingOrgUnit.description || '',
                    openingDate: editingOrgUnit.openingDate || new Date().toISOString().split('T')[0],
                    closedDate: editingOrgUnit.closedDate || '',
                    comment: editingOrgUnit.comment || '',
                    url: editingOrgUnit.url || '',
                    contactPerson: editingOrgUnit.contactPerson || '',
                    address: editingOrgUnit.address || '',
                    email: editingOrgUnit.email || '',
                    phoneNumber: editingOrgUnit.phoneNumber || ''
                })
                setSelectedParent(editingOrgUnit.parent || null)
            } else {
                setFormData({
                    name: '',
                    shortName: '',
                    code: '',
                    description: '',
                    openingDate: new Date().toISOString().split('T')[0],
                    closedDate: '',
                    comment: '',
                    url: '',
                    contactPerson: '',
                    address: '',
                    email: '',
                    phoneNumber: ''
                })
                setSelectedParent(null)
            }
            setError(null)
            setSuccess(null)
            setActiveTab('details')
        }
    }, [isOpen, editingOrgUnit])
    
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }
    
    const validateForm = () => {
        if (!formData.name.trim()) {
            setError(i18n.t('Organisation unit name is required'))
            return false
        }
        
        if (!selectedParent) {
            setError(i18n.t('Please select a parent organisation unit'))
            return false
        }
        
        return true
    }
    
    const handleSave = async () => {
        if (!validateForm()) return
        
        setLoading(true)
        setError(null)
        
        try {
            // Generate short name if not provided
            const shortName = formData.shortName.trim() || 
                formData.name.trim().substring(0, 50)
            
            // Prepare organisation unit data
            const orgUnitData = {
                id: editingOrgUnit?.id || generateUID(),
                name: formData.name.trim(),
                shortName: shortName,
                code: formData.code.trim() || undefined,
                description: formData.description.trim() || undefined,
                openingDate: formData.openingDate,
                closedDate: formData.closedDate || undefined,
                comment: formData.comment.trim() || undefined,
                url: formData.url.trim() || undefined,
                contactPerson: formData.contactPerson.trim() || undefined,
                address: formData.address.trim() || undefined,
                email: formData.email.trim() || undefined,
                phoneNumber: formData.phoneNumber.trim() || undefined,
                parent: {
                    id: selectedParent.id
                },
                level: selectedParent.level + 1,
                path: `${selectedParent.path}/${editingOrgUnit?.id || generateUID()}`,
                featureType: 'NONE'
            }
            
            // Remove undefined values
            Object.keys(orgUnitData).forEach(key => {
                if (orgUnitData[key] === undefined) {
                    delete orgUnitData[key]
                }
            })
            
            let result
            if (editingOrgUnit) {
                // Update existing organisation unit
                const updateMutation = {
                    resource: `organisationUnits/${editingOrgUnit.id}`,
                    type: 'update',
                    data: orgUnitData
                }
                result = await dataEngine.mutate(updateMutation)
            } else {
                // Create new organisation unit
                const createMutation = {
                    resource: 'organisationUnits',
                    type: 'create',
                    data: orgUnitData
                }
                result = await dataEngine.mutate(createMutation)
            }
            
            setSuccess(editingOrgUnit ? 
                i18n.t('Organisation unit updated successfully!') :
                i18n.t('Organisation unit created successfully!')
            )
            
            // Call callback with the created/updated org unit
            if (onOrgUnitCreated) {
                onOrgUnitCreated({
                    ...orgUnitData,
                    displayName: orgUnitData.name,
                    parent: selectedParent,
                    isCustom: true
                })
            }
            
            // Close modal after short delay
            setTimeout(() => {
                onClose()
            }, 1500)
            
        } catch (error) {
            console.error('Error saving organisation unit:', error)
            setError(error.message || i18n.t('Failed to save organisation unit'))
        } finally {
            setLoading(false)
        }
    }
    
    const handleClose = () => {
        if (!loading) {
            onClose()
        }
    }
    
    if (!isOpen) return null
    
    return (
        <Modal large onClose={handleClose}>
            <ModalTitle>
                {editingOrgUnit ? 
                    i18n.t('Edit Organisation Unit') : 
                    i18n.t('Create New Organisation Unit')
                }
            </ModalTitle>
            
            <ModalContent>
                <TabBar>
                    <Tab 
                        selected={activeTab === 'details'}
                        onClick={() => setActiveTab('details')}
                    >
                        {i18n.t('Basic Details')}
                    </Tab>
                    <Tab 
                        selected={activeTab === 'parent'}
                        onClick={() => setActiveTab('parent')}
                    >
                        {i18n.t('Parent Selection')}
                    </Tab>
                    <Tab 
                        selected={activeTab === 'contact'}
                        onClick={() => setActiveTab('contact')}
                    >
                        {i18n.t('Contact Information')}
                    </Tab>
                </TabBar>
                
                <div style={{ marginTop: '24px' }}>
                    {error && (
                        <NoticeBox error title={i18n.t('Error')}>
                            {error}
                        </NoticeBox>
                    )}
                    
                    {success && (
                        <NoticeBox valid title={i18n.t('Success')}>
                            {success}
                        </NoticeBox>
                    )}
                    
                    {activeTab === 'details' && (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <InputField
                                label={i18n.t('Name')}
                                required
                                value={formData.name}
                                onChange={({ value }) => handleInputChange('name', value)}
                                placeholder={i18n.t('Enter organisation unit name')}
                            />
                            
                            <InputField
                                label={i18n.t('Short Name')}
                                value={formData.shortName}
                                onChange={({ value }) => handleInputChange('shortName', value)}
                                placeholder={i18n.t('Enter short name (optional)')}
                                helpText={i18n.t('If not provided, will be auto-generated from name')}
                            />
                            
                            <InputField
                                label={i18n.t('Code')}
                                value={formData.code}
                                onChange={({ value }) => handleInputChange('code', value)}
                                placeholder={i18n.t('Enter unique code (optional)')}
                            />
                            
                            <TextAreaField
                                label={i18n.t('Description')}
                                value={formData.description}
                                onChange={({ value }) => handleInputChange('description', value)}
                                placeholder={i18n.t('Enter description (optional)')}
                                rows={3}
                            />
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <InputField
                                    label={i18n.t('Opening Date')}
                                    type="date"
                                    value={formData.openingDate}
                                    onChange={({ value }) => handleInputChange('openingDate', value)}
                                />
                                
                                <InputField
                                    label={i18n.t('Closing Date')}
                                    type="date"
                                    value={formData.closedDate}
                                    onChange={({ value }) => handleInputChange('closedDate', value)}
                                    helpText={i18n.t('Leave empty if still active')}
                                />
                            </div>
                            
                            <TextAreaField
                                label={i18n.t('Comment')}
                                value={formData.comment}
                                onChange={({ value }) => handleInputChange('comment', value)}
                                placeholder={i18n.t('Additional comments (optional)')}
                                rows={2}
                            />
                        </div>
                    )}
                    
                    {activeTab === 'parent' && (
                        <div>
                            <OrganisationUnitTreeSelector
                                onSelect={setSelectedParent}
                                selectedOrgUnit={selectedParent}
                                title={i18n.t('Select Parent Organisation Unit')}
                                placeholder={i18n.t('Choose where to create this organisation unit')}
                            />
                        </div>
                    )}
                    
                    {activeTab === 'contact' && (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <InputField
                                label={i18n.t('Contact Person')}
                                value={formData.contactPerson}
                                onChange={({ value }) => handleInputChange('contactPerson', value)}
                                placeholder={i18n.t('Name of contact person')}
                            />
                            
                            <InputField
                                label={i18n.t('Email')}
                                type="email"
                                value={formData.email}
                                onChange={({ value }) => handleInputChange('email', value)}
                                placeholder={i18n.t('Email address')}
                            />
                            
                            <InputField
                                label={i18n.t('Phone Number')}
                                value={formData.phoneNumber}
                                onChange={({ value }) => handleInputChange('phoneNumber', value)}
                                placeholder={i18n.t('Phone number')}
                            />
                            
                            <TextAreaField
                                label={i18n.t('Address')}
                                value={formData.address}
                                onChange={({ value }) => handleInputChange('address', value)}
                                placeholder={i18n.t('Physical address')}
                                rows={3}
                            />
                            
                            <InputField
                                label={i18n.t('Website URL')}
                                type="url"
                                value={formData.url}
                                onChange={({ value }) => handleInputChange('url', value)}
                                placeholder={i18n.t('Website URL (optional)')}
                            />
                        </div>
                    )}
                </div>
            </ModalContent>
            
            <ModalActions>
                <ButtonStrip end>
                    <Button secondary onClick={handleClose} disabled={loading}>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button primary onClick={handleSave} disabled={loading}>
                        {loading && <CircularLoader small />}
                        {editingOrgUnit ? i18n.t('Update') : i18n.t('Create')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}