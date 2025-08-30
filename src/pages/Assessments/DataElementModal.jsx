import React, { useState, useEffect } from 'react'
import {
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    ButtonStrip,
    Input,
    InputField,
    TextArea,
    SingleSelect,
    SingleSelectOption,
    CheckboxField,
    Box,
    Divider,
    NoticeBox,
    Tab,
    TabBar,
    IconInfo16
} from '@dhis2/ui'
import { useForm, Controller, useWatch } from 'react-hook-form'
import i18n from '@dhis2/d2-i18n'

export const DataElementModal = ({ onClose, dataElement, onSave, fullCategoryCombos = [] }) => {
    const [activeTab, setActiveTab] = useState('basic')

    const { control, handleSubmit, formState: { errors }, setValue } = useForm({
        defaultValues: {
            // Basic Information
            name: dataElement?.name || '',
            shortName: dataElement?.shortName || '',
            code: dataElement?.code || '',
            description: dataElement?.description || '',
            formName: dataElement?.formName || '',

            // Value and Domain
            valueType: dataElement?.valueType || 'INTEGER',
            domainType: dataElement?.domainType || 'AGGREGATE',
            aggregationType: dataElement?.aggregationType || 'SUM',

            // Advanced Options
            zeroIsSignificant: dataElement?.zeroIsSignificant || false,
            url: dataElement?.url || '',

            // Validation
            mandatory: dataElement?.mandatory || false,
            minValue: dataElement?.minValue || '',
            maxValue: dataElement?.maxValue || '',

            // Categories (simplified for now)
            categoryCombo: dataElement?.categoryCombo || 'default'
        }
    })

    const watchedValueType = useWatch({ control, name: 'valueType' })
    const watchedName = useWatch({ control, name: 'name' })

    // Auto-generate short name and code when name changes
    useEffect(() => {
        if (watchedName && !dataElement) { // Only auto-generate for new data elements
            const shortName = watchedName.substring(0, 50)
            const code = watchedName.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50)
            setValue('shortName', shortName)
            setValue('code', code)
        }
    }, [watchedName, dataElement, setValue])

    const onSubmit = (formData) => {
        // Find the selected CategoryCombo's full data
        const categoryComboOptions = getCategoryComboOptions()
        const selectedCCOption = categoryComboOptions.find(opt => opt.value === formData.categoryCombo)
        const fullCategoryCombo = selectedCCOption?.fullCategoryCombo || null

        const processedData = {
            ...formData,
            id: dataElement?.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            // Ensure numeric fields are properly handled
            minValue: formData.minValue ? Number(formData.minValue) : null,
            maxValue: formData.maxValue ? Number(formData.maxValue) : null,
            // Include fullCategoryCombo for external CategoryCombo creation
            fullCategoryCombo: fullCategoryCombo,
        }
        onSave(processedData)
    }

    const getAggregationOptions = (valueType) => {
        const numericTypes = ['INTEGER', 'INTEGER_POSITIVE', 'INTEGER_NEGATIVE', 'INTEGER_ZERO_OR_POSITIVE', 'NUMBER', 'PERCENTAGE']

        if (numericTypes.includes(valueType)) {
            return [
                { value: 'SUM', label: i18n.t('Sum') },
                { value: 'AVERAGE', label: i18n.t('Average') },
                { value: 'COUNT', label: i18n.t('Count') },
                { value: 'MIN', label: i18n.t('Minimum') },
                { value: 'MAX', label: i18n.t('Maximum') },
                { value: 'NONE', label: i18n.t('None') }
            ]
        } else {
            return [
                { value: 'COUNT', label: i18n.t('Count') },
                { value: 'NONE', label: i18n.t('None') }
            ]
        }
    }

    const isNumericType = (valueType) => {
        return ['INTEGER', 'INTEGER_POSITIVE', 'INTEGER_NEGATIVE', 'INTEGER_ZERO_OR_POSITIVE', 'NUMBER', 'PERCENTAGE'].includes(valueType)
    }

    // Generate CategoryCombo options from fullCategoryCombos
    const getCategoryComboOptions = () => {
        const options = [
            { value: 'default', label: i18n.t('Default (No disaggregation)') }
        ]

        if (Array.isArray(fullCategoryCombos) && fullCategoryCombos.length > 0) {
            fullCategoryCombos.forEach(cc => {
                if (cc && cc.id && cc.id !== 'bjDvmb4bfuf') { // Skip default CC
                    const label = cc.displayName || cc.name || cc.code || cc.id
                    const categoriesInfo = cc.categories && cc.categories.length > 0 
                        ? ` (${cc.categories.length} ${cc.categories.length === 1 ? i18n.t('category') : i18n.t('categories')})`
                        : ''
                    
                    options.push({
                        value: cc.id,
                        label: `${label}${categoriesInfo}`,
                        fullCategoryCombo: cc // Store full object for later use
                    })
                }
            })
        }

        return options
    }

    return (
        <Modal large position="middle" onClose={onClose} style={{ background: '#fff' }}>
            <ModalTitle>
                {dataElement ? i18n.t('Edit Data Element') : i18n.t('Add Data Element')}
            </ModalTitle>
            <ModalContent>
                <Box>
                    <TabBar>
                        <Tab
                            selected={activeTab === 'basic'}
                            onClick={() => setActiveTab('basic')}
                        >
                            {i18n.t('Basic Information')}
                        </Tab>
                        <Tab
                            selected={activeTab === 'advanced'}
                            onClick={() => setActiveTab('advanced')}
                        >
                            {i18n.t('Advanced Options')}
                        </Tab>
                        <Tab
                            selected={activeTab === 'validation'}
                            onClick={() => setActiveTab('validation')}
                        >
                            {i18n.t('Validation')}
                        </Tab>
                    </TabBar>

                    <Box marginTop="16px">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            {/* Basic Information Tab */}
                            {activeTab === 'basic' && (
                                <Box display="flex" flexDirection="column" gap="16px">
                                    <Controller
                                        name="name"
                                        control={control}
                                        rules={{ required: i18n.t('Data element name is required') }}
                                        render={({ field }) => (
                                            <InputField
                                                label={i18n.t('Name')}
                                                required
                                                error={!!errors.name}
                                                validationText={errors.name?.message}
                                            >
                                                <Input {...field} placeholder={i18n.t('Enter data element name')} />
                                            </InputField>
                                        )}
                                    />

                                    <Box display="flex" gap="16px">
                                        <Box flex="1">
                                            <Controller
                                                name="shortName"
                                                control={control}
                                                rules={{ required: i18n.t('Short name is required') }}
                                                render={({ field }) => (
                                                    <InputField
                                                        label={i18n.t('Short Name')}
                                                        required
                                                        error={!!errors.shortName}
                                                        validationText={errors.shortName?.message}
                                                    >
                                                        <Input {...field} placeholder={i18n.t('Max 50 characters')} />
                                                    </InputField>
                                                )}
                                            />
                                        </Box>
                                        <Box flex="1">
                                            <Controller
                                                name="code"
                                                control={control}
                                                rules={{ required: i18n.t('Code is required') }}
                                                render={({ field }) => (
                                                    <InputField
                                                        label={i18n.t('Code')}
                                                        required
                                                        error={!!errors.code}
                                                        validationText={errors.code?.message}
                                                    >
                                                        <Input {...field} placeholder={i18n.t('Unique identifier')} />
                                                    </InputField>
                                                )}
                                            />
                                        </Box>
                                    </Box>

                                    <Controller
                                        name="formName"
                                        control={control}
                                        render={({ field }) => (
                                            <InputField label={i18n.t('Form Name')}>
                                                <Input {...field} placeholder={i18n.t('Name to display in forms (optional)')} />
                                            </InputField>
                                        )}
                                    />

                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <InputField label={i18n.t('Description')}>
                                                <TextArea {...field} placeholder={i18n.t('Describe this data element')} rows={3} />
                                            </InputField>
                                        )}
                                    />

                                    <Divider />

                                    <Box display="flex" gap="16px">
                                        <Box flex="1">
                                            <Controller
                                                name="valueType"
                                                control={control}
                                                render={({ field }) => (
                                                    <InputField label={i18n.t('Value Type')}>
                                                        <SingleSelect
                                                            selected={field.value}
                                                            onChange={({ selected }) => field.onChange(selected)}
                                                        >
                                                            <SingleSelectOption value="TEXT" label={i18n.t('Text')} />
                                                            <SingleSelectOption value="LONG_TEXT" label={i18n.t('Long Text')} />
                                                            <SingleSelectOption value="NUMBER" label={i18n.t('Number')} />
                                                            <SingleSelectOption value="INTEGER" label={i18n.t('Integer')} />
                                                            <SingleSelectOption value="INTEGER_POSITIVE" label={i18n.t('Positive Integer')} />
                                                            <SingleSelectOption value="INTEGER_NEGATIVE" label={i18n.t('Negative Integer')} />
                                                            <SingleSelectOption value="INTEGER_ZERO_OR_POSITIVE" label={i18n.t('Zero or Positive Integer')} />
                                                            <SingleSelectOption value="PERCENTAGE" label={i18n.t('Percentage')} />
                                                            <SingleSelectOption value="BOOLEAN" label={i18n.t('Yes/No')} />
                                                            <SingleSelectOption value="TRUE_ONLY" label={i18n.t('Yes Only')} />
                                                            <SingleSelectOption value="DATE" label={i18n.t('Date')} />
                                                            <SingleSelectOption value="DATETIME" label={i18n.t('Date & Time')} />
                                                        </SingleSelect>
                                                    </InputField>
                                                )}
                                            />
                                        </Box>
                                        <Box flex="1">
                                            <Controller
                                                name="aggregationType"
                                                control={control}
                                                render={({ field }) => (
                                                    <InputField
                                                        label={i18n.t('Aggregation Type')}
                                                        helpText={i18n.t('How values should be aggregated across periods and organisation units')}
                                                    >
                                                        <SingleSelect
                                                            selected={field.value}
                                                            onChange={({ selected }) => field.onChange(selected)}
                                                        >
                                                            {getAggregationOptions(watchedValueType).map(option => (
                                                                <SingleSelectOption
                                                                    key={option.value}
                                                                    value={option.value}
                                                                    label={option.label}
                                                                />
                                                            ))}
                                                        </SingleSelect>
                                                    </InputField>
                                                )}
                                            />
                                        </Box>
                                    </Box>

                                    <Controller
                                        name="domainType"
                                        control={control}
                                        render={({ field }) => (
                                            <InputField label={i18n.t('Domain Type')}>
                                                <SingleSelect
                                                    selected={field.value}
                                                    onChange={({ selected }) => field.onChange(selected)}
                                                >
                                                    <SingleSelectOption value="AGGREGATE" label={i18n.t('Aggregate')} />
                                                    <SingleSelectOption value="TRACKER" label={i18n.t('Tracker')} />
                                                </SingleSelect>
                                            </InputField>
                                        )}
                                    />
                                </Box>
                            )}

                            {/* Advanced Options Tab */}
                            {activeTab === 'advanced' && (
                                <Box display="flex" flexDirection="column" gap="16px">
                                    <Controller
                                        name="zeroIsSignificant"
                                        control={control}
                                        render={({ field }) => (
                                            <CheckboxField
                                                {...field}
                                                checked={field.value}
                                                label={i18n.t('Zero is significant')}
                                                helpText={i18n.t('Check this if zero values should be stored and not treated as missing data')}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="url"
                                        control={control}
                                        render={({ field }) => (
                                            <InputField
                                                label={i18n.t('URL')}
                                                helpText={i18n.t('Link to additional information about this data element')}
                                            >
                                                <Input {...field} placeholder={i18n.t('https://example.com')} />
                                            </InputField>
                                        )}
                                    />

                                    <Controller
                                        name="categoryCombo"
                                        control={control}
                                        render={({ field }) => (
                                            <InputField
                                                label={i18n.t('Category Combination')}
                                                helpText={i18n.t('Defines how this data element can be disaggregated')}
                                            >
                                                <SingleSelect
                                                    selected={field.value}
                                                    onChange={({ selected }) => field.onChange(selected)}
                                                >
                                                    {getCategoryComboOptions().map(option => (
                                                        <SingleSelectOption 
                                                            key={option.value} 
                                                            value={option.value} 
                                                            label={option.label} 
                                                        />
                                                    ))}
                                                </SingleSelect>
                                            </InputField>
                                        )}
                                    />

                                    <NoticeBox>
                                        <Box display="flex" alignItems="center" gap="8px">
                                            <IconInfo16 />
                                            <span>{i18n.t('Advanced options affect how data is collected and analyzed. Use default values unless you have specific requirements.')}</span>
                                        </Box>
                                    </NoticeBox>
                                </Box>
                            )}

                            {/* Validation Tab */}
                            {activeTab === 'validation' && (
                                <Box display="flex" flexDirection="column" gap="16px">
                                    <Controller
                                        name="mandatory"
                                        control={control}
                                        render={({ field }) => (
                                            <CheckboxField
                                                {...field}
                                                checked={field.value}
                                                label={i18n.t('Mandatory field')}
                                                helpText={i18n.t('Users must enter a value for this data element')}
                                            />
                                        )}
                                    />

                                    {isNumericType(watchedValueType) && (
                                        <Box>
                                            <Box marginBottom="8px">
                                                <strong>{i18n.t('Value Range')}</strong>
                                            </Box>
                                            <Box display="flex" gap="16px">
                                                <Box flex="1">
                                                    <Controller
                                                        name="minValue"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <InputField label={i18n.t('Minimum Value')}>
                                                                <Input
                                                                    {...field}
                                                                    type="number"
                                                                    placeholder={i18n.t('No minimum')}
                                                                />
                                                            </InputField>
                                                        )}
                                                    />
                                                </Box>
                                                <Box flex="1">
                                                    <Controller
                                                        name="maxValue"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <InputField label={i18n.t('Maximum Value')}>
                                                                <Input
                                                                    {...field}
                                                                    type="number"
                                                                    placeholder={i18n.t('No maximum')}
                                                                />
                                                            </InputField>
                                                        )}
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>
                                    )}

                                    <NoticeBox>
                                        <Box display="flex" alignItems="center" gap="8px">
                                            <IconInfo16 />
                                            <span>{i18n.t('Validation rules help ensure data quality by preventing invalid entries during data collection.')}</span>
                                        </Box>
                                    </NoticeBox>
                                </Box>
                            )}
                        </form>
                    </Box>
                </Box>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onClose} secondary>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button onClick={handleSubmit(onSubmit)} primary>
                        {dataElement ? i18n.t('Update Data Element') : i18n.t('Add Data Element')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}
