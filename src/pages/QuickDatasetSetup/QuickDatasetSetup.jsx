import React, { useState } from 'react'
import { 
    Box, 
    Button, 
    Card, 
    InputField,
    SingleSelect,
    SingleSelectOption,
    TextAreaField,
    ButtonStrip,
    NoticeBox,
    CircularLoader
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useNavigate } from 'react-router-dom'
import { usePageHeader } from '../../hooks/usePageHeader'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'
import { SleekCard } from '../../components/UI/SleekCard'

export const QuickDatasetSetup = () => {
    const navigate = useNavigate()
    const { saveAssessment } = useAssessmentDataStore()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        periodType: 'Monthly',
        category: 'DQA Assessment'
    })

    usePageHeader(
        i18n.t('Quick Dataset Setup'),
        i18n.t('Create a new dataset for data quality assessments')
    )

    const periodTypes = [
        { value: 'Daily', label: i18n.t('Daily') },
        { value: 'Weekly', label: i18n.t('Weekly') },
        { value: 'Monthly', label: i18n.t('Monthly') },
        { value: 'Quarterly', label: i18n.t('Quarterly') },
        { value: 'Yearly', label: i18n.t('Yearly') }
    ]

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleCreateDataset = async () => {
        if (!formData.name.trim()) {
            return
        }

        setLoading(true)
        try {
            const datasetConfig = {
                id: `dataset_${Date.now()}`,
                name: formData.name,
                description: formData.description,
                periodType: formData.periodType,
                category: formData.category,
                created: new Date().toISOString(),
                status: 'draft',
                type: 'dataset_template'
            }

            await saveAssessment(datasetConfig)
            
            // Navigate to full dataset configuration
            navigate('/administration/assessments')
        } catch (error) {
            console.error('Error creating dataset:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAdvancedSetup = () => {
        navigate('/administration/assessments')
    }

    return (
        <Box maxWidth="800px" margin="0 auto">
            <SleekCard elevated>
                <SleekCard.Header centerAlign>
                    <h2>{i18n.t('Quick Dataset Setup')}</h2>
                    <p>{i18n.t('Create a basic dataset template that can be used for data quality assessments')}</p>
                </SleekCard.Header>

                <SleekCard.Content>
                    <NoticeBox title={i18n.t('Quick Setup')}>
                        {i18n.t('This creates a basic dataset template. For advanced configuration with data elements, organization units, and detailed settings, use the full setup process.')}
                    </NoticeBox>

                    <Box marginTop="24px">
                        <Box marginBottom="16px">
                            <InputField
                                label={i18n.t('Dataset Name')}
                                value={formData.name}
                                onChange={({ value }) => handleInputChange('name', value)}
                                placeholder={i18n.t('Enter dataset name (e.g., "Malaria Treatment Data")')}
                                required
                            />
                        </Box>

                        <Box marginBottom="16px">
                            <TextAreaField
                                label={i18n.t('Description')}
                                value={formData.description}
                                onChange={({ value }) => handleInputChange('description', value)}
                                placeholder={i18n.t('Describe what this dataset will be used for...')}
                                rows={3}
                            />
                        </Box>

                        <Box marginBottom="16px">
                            <SingleSelect
                                label={i18n.t('Period Type')}
                                selected={formData.periodType}
                                onChange={({ selected }) => handleInputChange('periodType', selected)}
                            >
                                {periodTypes.map(type => (
                                    <SingleSelectOption
                                        key={type.value}
                                        value={type.value}
                                        label={type.label}
                                    />
                                ))}
                            </SingleSelect>
                        </Box>

                        <Box marginBottom="16px">
                            <InputField
                                label={i18n.t('Category')}
                                value={formData.category}
                                onChange={({ value }) => handleInputChange('category', value)}
                                placeholder={i18n.t('Dataset category')}
                            />
                        </Box>
                    </Box>
                </SleekCard.Content>

                <SleekCard.Actions justify="between">
                        <ButtonStrip>
                            <Button secondary onClick={() => navigate(-1)}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button secondary onClick={handleAdvancedSetup}>
                                {i18n.t('Advanced Setup')}
                            </Button>
                        </ButtonStrip>
                        
                        <Button 
                            primary 
                            onClick={handleCreateDataset}
                            disabled={!formData.name.trim() || loading}
                        >
                            {loading ? <CircularLoader small /> : i18n.t('Create Dataset Template')}
                        </Button>
                </SleekCard.Actions>
            </SleekCard>

            <Box marginTop="24px">
                <SleekCard compact>
                        <h3 style={{ margin: 0, marginBottom: '16px' }}>
                            {i18n.t('Next Steps')}
                        </h3>
                        <Box marginBottom="12px">
                            <strong>1. {i18n.t('Configure Data Elements')}</strong>
                            <p style={{ margin: '4px 0', color: '#6c757d' }}>
                                {i18n.t('Add specific data elements that will be collected in this dataset')}
                            </p>
                        </Box>
                        <Box marginBottom="12px">
                            <strong>2. {i18n.t('Assign Organization Units')}</strong>
                            <p style={{ margin: '4px 0', color: '#6c757d' }}>
                                {i18n.t('Select which facilities or organization units will use this dataset')}
                            </p>
                        </Box>
                        <Box marginBottom="12px">
                            <strong>3. {i18n.t('Create Assessment')}</strong>
                            <p style={{ margin: '4px 0', color: '#6c757d' }}>
                                {i18n.t('Use the configured dataset to create a data quality assessment')}
                            </p>
                        </Box>
                </SleekCard>
            </Box>
        </Box>
    )
}