import React, { useState, useEffect } from 'react'
import { useDataQuery, useDataEngine } from '@dhis2/app-runtime'
import {
    Box,
    Button,
    ButtonStrip,
    Input,
    InputField,
    TextArea,
    SingleSelect,
    SingleSelectOption,
    MultiSelect,
    MultiSelectOption,
    CircularLoader,
    NoticeBox,
    Card,
    IconInfo24,
    IconAdd24 as IconSave24,
    Chip,
    LinearLoader
} from '@dhis2/ui'
import { useForm, Controller, useWatch } from 'react-hook-form'
import i18n from '@dhis2/d2-i18n'


const query = {
    dataSets: {
        resource: 'dataSets',
        params: {
            fields: 'id,displayName,periodType,dataElements[id,displayName]',
            pageSize: 100,
            page: 1
        }
    },
    organisationUnits: {
        resource: 'organisationUnits',
        params: {
            fields: 'id,displayName,level,path,parent[id,displayName]',
            pageSize: 1000,
            page: 1,
            filter: ['level:ge:3', 'level:le:5'], // Flexible level range (district to facility)
            order: 'level:asc,displayName:asc'
        }
    },
    organisationUnitLevels: {
        resource: 'organisationUnitLevels',
        params: {
            fields: 'id,displayName,level',
            pageSize: 20,
            page: 1,
            order: 'level:asc'
        }
    },
    dataElements: {
        resource: 'dataElements',
        params: {
            fields: 'id,displayName,valueType',
            pageSize: 1000,
            page: 1,
            filter: 'domainType:eq:AGGREGATE'
        }
    }
}

export const CreateAssessmentForm = ({ onClose, editingAssessment = null }) => {
    const { data, loading, error } = useDataQuery(query)
    const engine = useDataEngine()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState(null)
    const [currentStep, setCurrentStep] = useState(1)
    const [draftId, setDraftId] = useState(editingAssessment?.id || `draft_${Date.now()}`)

    const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm({
        defaultValues: {
            name: '',
            description: '',
            assessmentSource: 'existing',
            dataSet: '',
            period: '2024Q4',
            organisationUnits: [],
            manualDataset: null,
            externalConnection: null,
            dataConflictResolution: null
        }
    })

    const assessmentSource = useWatch({ control, name: 'assessmentSource' })
    const externalConnection = useWatch({ control, name: 'externalConnection' })
    const manualDataset = useWatch({ control, name: 'manualDataset' })
    const formData = watch()

    // Load saved draft on component mount
    useEffect(() => {
        const loadSavedDraft = async () => {
            if (editingAssessment) {
                // Load existing assessment for editing
                Object.keys(editingAssessment).forEach(key => {
                    if (formData.hasOwnProperty(key)) {
                        setValue(key, editingAssessment[key])
                    }
                })
                setCurrentStep(editingAssessment.currentStep || 1)
            } else {
                // Try to load saved draft from dataStore
                try {
                    const savedDraft = await loadDraftFromDataStore(draftId)
                    if (savedDraft) {
                        Object.keys(savedDraft.formData).forEach(key => {
                            setValue(key, savedDraft.formData[key])
                        })
                        setCurrentStep(savedDraft.currentStep || 1)
                        setLastSaved(new Date(savedDraft.lastSaved))
                    }
                } catch (error) {
                    console.log('No saved draft found or error loading:', error)
                }
            }
        }

        if (!loading) {
            loadSavedDraft()
        }
    }, [loading, editingAssessment, draftId, setValue])

    // Auto-save functionality - saves every 30 seconds
    useEffect(() => {
        const autoSaveInterval = setInterval(() => {
            if (formData.name) { // Only auto-save if there's some content
                saveDraft(false) // Silent save
            }
        }, 30000) // 30 seconds

        return () => clearInterval(autoSaveInterval)
    }, [formData])

    const loadDraftFromDataStore = async (id) => {
        try {
            const query = {
                draft: {
                    resource: `dataStore/dqa360-drafts/${id}`
                }
            }
            const result = await engine.query(query)
            return result.draft
        } catch (error) {
            return null
        }
    }

    const saveDraftToDataStore = async (draftData, showNotification = true) => {
        try {
            const mutation = {
                resource: `dataStore/dqa360-drafts/${draftId}`,
                type: 'update',
                data: draftData
            }

            try {
                await engine.mutate(mutation)
            } catch (error) {
                // If update fails (draft doesn't exist), create it
                const createMutation = {
                    resource: `dataStore/dqa360-drafts/${draftId}`,
                    type: 'create',
                    data: draftData
                }
                await engine.mutate(createMutation)
            }

            if (showNotification) {
                setLastSaved(new Date())
            }
            return true
        } catch (error) {
            console.error('Failed to save draft:', error)
            return false
        }
    }

    const saveDraft = async (showNotification = true) => {
        setIsSaving(true)

        const draftData = {
            formData,
            currentStep,
            lastSaved: new Date().toISOString(),
            completionStatus: getCompletionStatus()
        }

        const success = await saveDraftToDataStore(draftData, showNotification)

        setIsSaving(false)
        return success
    }

    const getCompletionStatus = () => {
        const status = {
            basicInfo: !!(formData.name && formData.description),
            assessmentSource: !!formData.assessmentSource,
            datasetConfiguration: false,
            dataConflictResolution: false,
            assessmentConfiguration: !!(formData.period && formData.organisationUnits?.length > 0)
        }

        // Check dataset configuration based on source
        if (formData.assessmentSource === 'existing') {
            status.datasetConfiguration = !!formData.dataSet
        } else if (formData.assessmentSource === 'manual') {
            status.datasetConfiguration = !!(formData.manualDataset?.name && formData.manualDataset?.dataElements?.length > 0)
        } else if (formData.assessmentSource === 'external') {
            status.datasetConfiguration = !!(formData.externalConnection?.selectedDatasets?.length > 0)
        }

        // Check data conflict resolution
        status.dataConflictResolution = !!formData.dataConflictResolution

        return status
    }

    const getDataElementsForResolution = () => {
        if (assessmentSource === 'external' && externalConnection?.dataElements) {
            return externalConnection.dataElements
        }
        if (assessmentSource === 'manual' && manualDataset?.dataElements) {
            return manualDataset.dataElements
        }
        if (assessmentSource === 'existing' && data?.dataSets?.dataSets) {
            const selectedDataset = data.dataSets.dataSets.find(ds => ds.id === watch('dataSet'))
            return selectedDataset?.dataElements || []
        }
        return []
    }

    const onSubmit = async (formData) => {
        setIsSubmitting(true)
        try {
            console.log('Creating assessment:', formData)
            
            // Save as final assessment (not draft)
            const finalAssessment = {
                ...formData,
                id: editingAssessment?.id || `assessment_${Date.now()}`,
                status: 'active',
                createdAt: editingAssessment?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            // Save to assessments dataStore
            // ... API call implementation ...

            // Clean up draft after successful submission
            if (!editingAssessment) {
                await deleteDraft()
            }

            onClose()
        } catch (error) {
            console.error('Error creating assessment:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const deleteDraft = async () => {
        try {
            const mutation = {
                resource: `dataStore/dqa360-drafts/${draftId}`,
                type: 'delete'
            }
            await engine.mutate(mutation)
        } catch (error) {
            console.log('No draft to delete or error deleting:', error)
        }
    }

    const handleStepChange = async (newStep) => {
        // Save current progress before changing steps
        await saveDraft()
        setCurrentStep(newStep)
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" padding="24px">
                <CircularLoader />
            </Box>
        )
    }

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Error loading form data')}>
                {error.message}
            </NoticeBox>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap="24px">
                {/* Progress and Save Status */}
                <Card>
                    <Box padding="16px">
                        <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                {editingAssessment ? i18n.t('Edit Assessment') : i18n.t('Create Assessment')}
                            </h3>
                            <Box display="flex" alignItems="center" gap="16px">
                                {lastSaved && (
                                    <span style={{ fontSize: '12px', color: '#6C7B7F' }}>
                                        {i18n.t('Last saved')}: {lastSaved.toLocaleTimeString()}
                                    </span>
                                )}
                                <Button
                                    small
                                    secondary
                                    icon={<IconSave24 />}
                                    onClick={() => saveDraft(true)}
                                    loading={isSaving}
                                >
                                    {i18n.t('Save Draft')}
                                </Button>
                            </Box>
                        </Box>

                        {/* Progress Indicators */}
                        <Box display="flex" gap="8px" flexWrap="wrap">
                            {Object.entries(getCompletionStatus()).map(([key, completed]) => (
                                <Chip key={key} neutral={!completed} positive={completed}>
                                    {i18n.t(key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))}
                                </Chip>
                            ))}
                        </Box>

                        {isSaving && (
                            <Box marginTop="8px">
                                <LinearLoader amount={100} />
                            </Box>
                        )}
                    </Box>
                </Card>

                {/* Basic Information */}
                <Card>
                    <Box padding="16px">
                        <Box marginBottom="16px">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                {i18n.t('Basic Information')}
                            </h3>
                        </Box>

                        <Box display="flex" flexDirection="column" gap="16px">
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: i18n.t('Assessment name is required') }}
                                render={({ field }) => (
                                    <InputField
                                        label={i18n.t('Assessment Name')}
                                        required
                                        error={!!errors.name}
                                        validationText={errors.name?.message}
                                    >
                                        <Input {...field} placeholder={i18n.t('Enter assessment name')} />
                                    </InputField>
                                )}
                            />

                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <InputField label={i18n.t('Description')}>
                                        <TextArea {...field} placeholder={i18n.t('Enter assessment description')} rows={3} />
                                    </InputField>
                                )}
                            />
                        </Box>
                    </Box>
                </Card>

                {/* Assessment Source */}
                <Card>
                    <Box padding="16px">
                        <Box marginBottom="16px">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                {i18n.t('Assessment Source')}
                            </h3>
                        </Box>

                        <Controller
                            name="assessmentSource"
                            control={control}
                            render={({ field }) => (
                                <InputField label={i18n.t('Data Source')}>
                                    <SingleSelect
                                        {...field}
                                        placeholder={i18n.t('Select assessment source')}
                                    >
                                        <SingleSelectOption
                                            value="existing"
                                            label={i18n.t('Use Existing Dataset')}
                                        />
                                        <SingleSelectOption
                                            value="manual"
                                            label={i18n.t('Manually Create Dataset')}
                                        />
                                        <SingleSelectOption
                                            value="external"
                                            label={i18n.t('Connect to DHIS2 Instance')}
                                        />
                                    </SingleSelect>
                                </InputField>
                            )}
                        />

                        {assessmentSource === 'existing' && (
                            <Box marginTop="16px">
                                <NoticeBox>
                                    <Box display="flex" alignItems="center" gap="8px">
                                        <IconInfo24 />
                                        <span>{i18n.t('Select an existing dataset from your DHIS2 instance')}</span>
                                    </Box>
                                </NoticeBox>
                            </Box>
                        )}

                        {assessmentSource === 'manual' && (
                            <Box marginTop="16px">
                                <NoticeBox>
                                    <Box display="flex" alignItems="center" gap="8px">
                                        <IconInfo24 />
                                        <span>{i18n.t('Create a custom dataset by defining data elements and their properties')}</span>
                                    </Box>
                                </NoticeBox>
                            </Box>
                        )}

                        {assessmentSource === 'external' && (
                            <Box marginTop="16px">
                                <NoticeBox>
                                    <Box display="flex" alignItems="center" gap="8px">
                                        <IconInfo24 />
                                        <span>{i18n.t('Connect to an external DHIS2 instance to import datasets and data elements')}</span>
                                    </Box>
                                </NoticeBox>
                            </Box>
                        )}
                    </Box>
                </Card>

                {/* Dataset Configuration */}
                {assessmentSource === 'existing' && (
                    <Card>
                        <Box padding="16px">
                            <Box marginBottom="16px">
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                    {i18n.t('Dataset Configuration')}
                                </h3>
                            </Box>

                            <Controller
                                name="dataSet"
                                control={control}
                                rules={{ required: assessmentSource === 'existing' ? i18n.t('Data set is required') : false }}
                                render={({ field }) => (
                                    <InputField
                                        label={i18n.t('Data Set')}
                                        required
                                        error={!!errors.dataSet}
                                        validationText={errors.dataSet?.message}
                                    >
                                        <SingleSelect
                                            {...field}
                                            placeholder={i18n.t('Select data set')}
                                            filterable
                                            noMatchText={i18n.t('No data sets match the search')}
                                        >
                                            {data?.dataSets?.dataSets?.map(dataSet => (
                                                <SingleSelectOption
                                                    key={dataSet.id}
                                                    value={dataSet.id}
                                                    label={dataSet.displayName}
                                                />
                                            ))}
                                        </SingleSelect>
                                    </InputField>
                                )}
                            />
                        </Box>
                    </Card>
                )}

                {/* Manual Dataset Creator */}
                {assessmentSource === 'manual' && (
                    <Controller
                        name="manualDataset"
                        control={control}
                        rules={{ required: assessmentSource === 'manual' ? i18n.t('Dataset configuration is required') : false }}
                        render={({ field }) => (
                            <ManualDatasetCreator
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.manualDataset?.message}
                            />
                        )}
                    />
                )}

                {/* External DHIS2 Connector */}
                {assessmentSource === 'external' && (
                    <Controller
                        name="externalConnection"
                        control={control}
                        rules={{ required: assessmentSource === 'external' ? i18n.t('External connection is required') : false }}
                        render={({ field }) => (
                            <ExternalDHIS2Connector
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.externalConnection?.message}
                            />
                        )}
                    />
                )}

                {/* Data Conflict Resolution */}
                {(assessmentSource === 'manual' && manualDataset?.dataElements?.length > 0) ||
                 (assessmentSource === 'external' && externalConnection?.dataElements?.length > 0) ||
                 (assessmentSource === 'existing' && watch('dataSet')) ? (
                    <Controller
                        name="dataConflictResolution"
                        control={control}
                        rules={{ required: i18n.t('Data conflict resolution strategy is required') }}
                        render={({ field }) => (
                            <AssessmentDataConflictResolver
                                value={field.value}
                                onChange={field.onChange}
                                dataElements={getDataElementsForResolution()}
                                error={errors.dataConflictResolution?.message}
                            />
                        )}
                    />
                ) : null}

                {/* Assessment Configuration */}
                <Card>
                    <Box padding="16px">
                        <Box marginBottom="16px">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                {i18n.t('Assessment Configuration')}
                            </h3>
                        </Box>

                        <Box display="flex" flexDirection="column" gap="16px">
                            <Controller
                                name="period"
                                control={control}
                                rules={{ required: i18n.t('Period is required') }}
                                render={({ field }) => (
                                    <InputField
                                        label={i18n.t('Period')}
                                        required
                                        error={!!errors.period}
                                        validationText={errors.period?.message}
                                    >
                                        <SingleSelect
                                            {...field}
                                            placeholder={i18n.t('Select period')}
                                        >
                                            <SingleSelectOption value="2024Q4" label="2024 Q4" />
                                            <SingleSelectOption value="2024Q3" label="2024 Q3" />
                                            <SingleSelectOption value="2024Q2" label="2024 Q2" />
                                            <SingleSelectOption value="2024Q1" label="2024 Q1" />
                                        </SingleSelect>
                                    </InputField>
                                )}
                            />

                            <Controller
                                name="organisationUnits"
                                control={control}
                                rules={{ required: i18n.t('At least one facility must be selected') }}
                                render={({ field }) => (
                                    <InputField
                                        label={i18n.t('Facilities')}
                                        required
                                        error={!!errors.organisationUnits}
                                        validationText={errors.organisationUnits?.message}
                                    >
                                        <MultiSelect
                                            {...field}
                                            placeholder={i18n.t('Select facilities')}
                                            filterable
                                            noMatchText={i18n.t('No facilities match the search')}
                                        >
                                            {/* Show org units based on assessment source */}
                                            {assessmentSource === 'existing' &&
                                                data?.organisationUnits?.organisationUnits?.map(orgUnit => (
                                                    <MultiSelectOption
                                                        key={orgUnit.id}
                                                        value={orgUnit.id}
                                                        label={orgUnit.displayName}
                                                    />
                                                ))
                                            }
                                            {assessmentSource === 'external' &&
                                                field.value?.organisationUnits?.map(orgUnit => (
                                                    <MultiSelectOption
                                                        key={orgUnit.id}
                                                        value={orgUnit.id}
                                                        label={orgUnit.displayName}
                                                    />
                                                ))
                                            }
                                        </MultiSelect>
                                    </InputField>
                                )}
                            />
                        </Box>
                    </Box>
                </Card>

                <ButtonStrip end>
                    <Button onClick={onClose} secondary>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button
                        secondary
                        onClick={() => saveDraft(true)}
                        loading={isSaving}
                    >
                        {i18n.t('Save & Continue Later')}
                    </Button>
                    <Button type="submit" primary loading={isSubmitting}>
                        {editingAssessment ? i18n.t('Update Assessment') : i18n.t('Create Assessment')}
                    </Button>
                </ButtonStrip>
            </Box>
        </form>
    )
}