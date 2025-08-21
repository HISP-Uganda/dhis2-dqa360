import React, { useEffect, useMemo, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Box,
    Button,
    InputField,
    NoticeBox,
    CircularLoader,
    Tag,
    Modal,
    ModalTitle,
    ModalContent,
    LinearLoader,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import DatasetCreationModal from '../../../components/DatasetCreationModal'
import { dhis2Service } from '../../../services/dhis2Service'
import styles from '../../Metadata/DatasetPreparation.module.css'

// Datastore operations
const DATASTORE_NAMESPACE = 'dqa360'

// Datastore queries
const datastoreQueries = {
    getAssessment: {
        resource: `dataStore/${DATASTORE_NAMESPACE}`,
        id: ({ assessmentId }) => assessmentId,
    },
    saveAssessment: {
        resource: `dataStore/${DATASTORE_NAMESPACE}`,
        id: ({ assessmentId }) => assessmentId,
        type: 'update',
        data: ({ data }) => data,
    },
}

// Dataset types configuration
const datasetTypes = ['register', 'summary', 'reported', 'corrected']

// Helper label/icon/color mappers
const getDatasetTypePrefix = (datasetType) =>
    ({
        register: 'REG',
        summary: 'SUM',
        reported: 'RPT',
        corrected: 'COR',
    }[datasetType] || 'GEN')

const getDatasetTypeLabel = (type) =>
    ({
        register: i18n.t('Register'),
        summary: i18n.t('Summary'),
        reported: i18n.t('Reported'),
        corrected: i18n.t('Corrected'),
    }[type] || type)

const getDatasetTypeIcon = (type) =>
    ({
        register: '📝',
        summary: '📊',
        reported: '📋',
        corrected: '✏️',
    }[type] || '📄')

const getDatasetTypeDescription = (type) =>
    ({
        register: i18n.t('Data collection from health facilities'),
        summary: i18n.t('Aggregated data for analysis'),
        reported: i18n.t('External DHIS2 reported data'),
        corrected: i18n.t('Corrected data after validation'),
    }[type] || i18n.t('Dataset for DQA assessment'))

// Fast local UID generator for preview
const generateUID = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 11; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

const generateCode = async (prefix = '') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = prefix.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString(36).slice(-2).toUpperCase()
    result += timestamp
    for (let i = result.length; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// A, B, C, ..., Z, AA, AB, ...
const generateSmsCode = (index) => {
    let result = ''
    let num = index
    do {
        result = String.fromCharCode(65 + (num % 26)) + result
        num = Math.floor(num / 26) - 1
    } while (num >= 0)
    return result
}

// Ported DatasetPreparation implementation
const DatasetPreparationPorted = ({
                                      assessmentId,
                                      assessmentName,
                                      assessmentData,
                                      selectedDataElements = [],
                                      selectedOrgUnits = [],
                                      period,
                                      frequency,
                                      onFinish,
                                  }) => {
    // State management
    const [loading, setLoading] = useState(true)
    const [saving] = useState(false)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('register')

    // Dataset and data element states
    const [datasets, setDatasets] = useState({})
    const [datasetDataElements, setDatasetDataElements] = useState({
        register: [],
        summary: [],
        reported: [],
        corrected: [],
    })

    // Modal states
    const [showProgressModal, setShowProgressModal] = useState(false)
    const [showCreationModal, setShowCreationModal] = useState(false)
    const [creationProgress, setCreationProgress] = useState({
        stage: '',
        currentItem: '',
        current: 0,
        total: 0,
    })

    // SMS Reporting state (global defaults; dataset-level smsEnabled controls auto-code mapping)
    const [smsConfig] = useState({
        autoGenerate: true,
        separator: ' ', 
    })

    const dataEngine = useDataEngine()

    // Update functions
    const updateDataset = (datasetType, field, value) => {
        setDatasets((prev) => ({
            ...prev,
            [datasetType]: {
                ...prev[datasetType],
                [field]: value,
            },
        }))
    }

    const updateDataElement = (datasetType, elementId, field, value) => {
        setDatasetDataElements((prev) => ({
            ...prev,
            [datasetType]: (prev[datasetType] || []).map((el) =>
                el.id === elementId ? { ...el, [field]: value } : el
            ),
        }))
    }

    // Initialize component
    useEffect(() => {
        initializeDatasets()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        assessmentId,
        Array.isArray(selectedDataElements) ? selectedDataElements.length : 0,
        Array.isArray(selectedOrgUnits) ? selectedOrgUnits.length : 0,
    ])

    const initializeDatasets = async () => {
        try {
            setLoading(true)
            setError(null)

            // Load existing assessment data if available
            let existingData = null
            if (assessmentId) {
                try {
                    const response = await dataEngine.query(
                        { assessment: datastoreQueries.getAssessment },
                        { variables: { assessmentId } }
                    )
                    existingData = response.assessment
                } catch (_) {
                    /* ignore */
                }
            }

            // Initialize datasets
            const initialDatasets = {}
            const initialDataElements = {
                register: [],
                summary: [],
                reported: [],
                corrected: [],
            }

            // Default SMS command keywords
            const defaultCommands = {
                register: 'DQA_REGISTER',
                summary: 'DQA_SUMMARY',
                reported: 'DQA_REPORTED',
                corrected: 'DQA_CORRECTED',
            }

            // Generate per-dataset run UIDs (unique among the four datasets)
            const usedRunUids = new Set()

            // Create datasets for each type
            for (const type of datasetTypes) {
                const existingDataset = existingData?.datasets?.[type]
                const smsDefault = ['register', 'summary', 'corrected'].includes(type)

                // Per-dataset generated UID (new for each run)
                let generatedUidForRun = generateUID()
                while (usedRunUids.has(generatedUidForRun)) {
                    generatedUidForRun = generateUID()
                }
                usedRunUids.add(generatedUidForRun)

                initialDatasets[type] = {
                    id: existingDataset?.id || generateUID(),
                    name: existingDataset?.name || `${assessmentName} - ${getDatasetTypeLabel(type)}`,
                    shortName:
                        existingDataset?.shortName ||
                        `${assessmentName} - ${getDatasetTypeLabel(type)}`,
                    code:
                        existingDataset?.code ||
                        (await generateCode(getDatasetTypePrefix(type))),
                    formName:
                        existingDataset?.formName ||
                        `${assessmentName} - ${getDatasetTypeLabel(type)}`,
                    description:
                        existingDataset?.description ||
                        i18n.t('Dataset for {{desc}}', {
                            desc: getDatasetTypeDescription(type),
                        }),
                    periodType: 'Monthly',
                    categoryCombo: { id: 'bjDvmb4bfuf' }, // Default category combo
                    // Sharing defaults
                    sharingPublicAccess: existingDataset?.sharingPublicAccess || 'rw------',
                    sharingExternal: existingDataset?.sharingExternal ?? false,
                    // SMS configuration defaults
                    smsEnabled: existingDataset?.smsEnabled ?? smsDefault,
                    smsCommandName:
                        existingDataset?.smsCommandName ||
                        `${assessmentName} - ${getDatasetTypeLabel(type)} SMS`,
                    smsKeyword:
                        existingDataset?.smsKeyword &&
                        existingDataset.smsKeyword.trim().length > 0
                            ? existingDataset.smsKeyword
                            : defaultCommands[type],
                    smsSeparator: existingDataset?.smsSeparator || ' ', 
                    smsSuccessMessage:
                        existingDataset?.smsSuccessMessage ||
                        i18n.t('Thank you! Your data was received successfully.'),
                    smsWrongFormatMessage:
                        existingDataset?.smsWrongFormatMessage ||
                        i18n.t('Wrong format. Please use the correct SMS structure.'),
                    smsNoUserMessage:
                        existingDataset?.smsNoUserMessage ||
                        i18n.t('No DHIS2 user is linked to your number.'),
                    smsMoreThanOneOrgUnitMessage:
                        existingDataset?.smsMoreThanOneOrgUnitMessage ||
                        i18n.t('Multiple org units found. Please contact support.'),
                    smsNoCodesMessage:
                        existingDataset?.smsNoCodesMessage ||
                        i18n.t('No data codes found. Include values after the command.'),
                    // New: store the generated run UID in the dataset config so the creator can embed it as attributeValues
                    generatedUidForRun,
                    dataSetElements: [],
                    organisationUnits: (selectedOrgUnits || []).map((ou) => ({
                        id: ou.id,
                        name: ou.name,
                        code: ou.code,
                        displayName: ou.displayName,
                        level: ou.level,
                        parent: ou.parent
                            ? { id: ou.parent.id, name: ou.parent.name }
                            : undefined,
                    })),
                }

                // Create data elements for this dataset type
                const existingElements = existingData?.dataElements?.[type] || []
                const elementsToCreate =
                    existingElements.length > 0 ? existingElements : selectedDataElements || []

                for (const sourceElement of elementsToCreate) {
                    const idx = initialDataElements[type].length
                    const elementId =
                        sourceElement.id && existingElements.length > 0
                            ? sourceElement.id
                            : generateUID()
                    const elementCode =
                        sourceElement.code && existingElements.length > 0
                            ? sourceElement.code
                            : `${getDatasetTypePrefix(type)}${Date.now()
                                .toString(36)
                                .slice(-2)
                                .toUpperCase()}${Math.random()
                                .toString(36)
                                .slice(-2)
                                .toUpperCase()}`

                    const dataElement = {
                        id: elementId,
                        name: `${getDatasetTypePrefix(type)} - ${
                            sourceElement.name || sourceElement.displayName
                        }`,
                        shortName: `${getDatasetTypePrefix(type)} - ${
                            sourceElement.shortName ||
                            sourceElement.name ||
                            sourceElement.displayName
                        }`,
                        code: elementCode,
                        formName: `${getDatasetTypePrefix(type)} - ${
                            sourceElement.formName ||
                            sourceElement.name ||
                            sourceElement.displayName
                        }`,
                        description: i18n.t(
                            '{{typeLabel}} dataset element for {{name}}',
                            {
                                typeLabel: getDatasetTypeLabel(type),
                                name: sourceElement.name || sourceElement.displayName,
                            }
                        ),
                        valueType: sourceElement.valueType || 'INTEGER',
                        aggregationType: sourceElement.aggregationType || 'SUM',
                        domainType: 'AGGREGATE',
                        categoryCombo: {
                            id: sourceElement.categoryCombo?.id || 'bjDvmb4bfuf',
                        },
                        zeroIsSignificant: !!sourceElement.zeroIsSignificant,
                        // Pre-generate SMS codes per dataset when enabled and autoGenerate on
                        smsCode:
                            initialDatasets[type].smsEnabled && smsConfig.autoGenerate
                                ? generateSmsCode(idx)
                                : undefined,
                    }

                    initialDataElements[type].push(dataElement)
                    initialDatasets[type].dataSetElements.push({
                        dataElement: { id: elementId },
                    })
                }
            }

            setDatasets(initialDatasets)
            setDatasetDataElements(initialDataElements)
        } catch (err) {
            setError(
                i18n.t('Failed to initialize datasets: {{msg}}', { msg: err.message })
            )
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 160,
                }}
            >
                <CircularLoader />
            </div>
        )
    }

    const currentOrgUnits = datasets[activeTab]?.organisationUnits || []
    const currentElements = datasetDataElements[activeTab] || []

    return (
        <div className={styles.container}>
            {error && (
                <NoticeBox error title={i18n.t('Error')}>
                    {error}
                </NoticeBox>
            )}

            {/* Tabs */}
            <div className={styles.tabs}>
                {datasetTypes.map((type) => (
                    <button
                        key={type}
                        className={`${styles.tab} ${
                            activeTab === type ? styles.activeTab : ''
                        }`}
                        onClick={() => setActiveTab(type)}
                    >
                        <span className={styles.tabIcon}>{getDatasetTypeIcon(type)}</span>
                        <span className={styles.tabLabel}>
                            {getDatasetTypeLabel(type)}
                        </span>
                        <span className={styles.countPill}>
                            {(datasetDataElements[type] || []).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Active Tab Content */}
            {datasets[activeTab] && (
                <div className={styles.tabContent}>
                    {/* Dataset Configuration */}
                    <div className={styles.configSection}>
                        <div className={styles.configHeader}>
                            <h3 className={styles.sectionTitle}>
                                {i18n.t('Dataset Configuration')}
                            </h3>
                            <p className={styles.sectionDescription}>
                                {i18n.t('Configure dataset details and SMS reporting')}
                            </p>
                        </div>

                        <div className={styles.formGrid}>
                            <InputField
                                dense
                                label={i18n.t('Dataset Name')}
                                value={datasets[activeTab].name || ''}
                                onChange={({ value }) =>
                                    updateDataset(activeTab, 'name', value)
                                }
                            />
                            <InputField
                                dense
                                label={i18n.t('Short Name')}
                                value={datasets[activeTab].shortName || ''}
                                onChange={({ value }) =>
                                    updateDataset(activeTab, 'shortName', value)
                                }
                            />
                            <InputField
                                dense
                                label={i18n.t('Code')}
                                value={datasets[activeTab].code || ''}
                                onChange={({ value }) =>
                                    updateDataset(activeTab, 'code', value)
                                }
                            />
                            <InputField
                                dense
                                label={i18n.t('Form Name')}
                                value={
                                    datasets[activeTab].formName ||
                                    datasets[activeTab].name ||
                                    ''
                                }
                                onChange={({ value }) =>
                                    updateDataset(activeTab, 'formName', value)
                                }
                            />
                            <InputField
                                dense
                                label={i18n.t('Dataset UID (preview)')}
                                value={datasets[activeTab].generatedUidForRun || ''}
                                readOnly
                            />
                            <InputField
                                dense
                                label={i18n.t('Period Type')}
                                value={datasets[activeTab].periodType || 'Monthly'}
                                onChange={({ value }) =>
                                    updateDataset(activeTab, 'periodType', value)
                                }
                            />
                            <InputField
                                dense
                                label={i18n.t('Description')}
                                value={datasets[activeTab].description || ''}
                                onChange={({ value }) =>
                                    updateDataset(activeTab, 'description', value)
                                }
                            />
                            <InputField
                                dense
                                label={i18n.t('Category Combo UID')}
                                value={datasets[activeTab]?.categoryCombo?.id || 'bjDvmb4bfuf'}
                                onChange={({ value }) =>
                                    updateDataset(activeTab, 'categoryCombo', { id: value })
                                }
                            />
                            <SingleSelectField
                                dense
                                label={i18n.t('Form Type')}
                                selected={datasets[activeTab].formType || 'DEFAULT'}
                                onChange={({ selected }) => updateDataset(activeTab, 'formType', selected)}
                            >
                                <SingleSelectOption value="DEFAULT" label="DEFAULT" />
                                <SingleSelectOption value="CUSTOM" label="CUSTOM" />
                                <SingleSelectOption value="SECTION" label="SECTION" />
                                <SingleSelectOption value="SECTION_MULTIORG" label="SECTION_MULTIORG" />
                            </SingleSelectField>
                            <SingleSelectField
                                dense
                                label={i18n.t('Aggregation Type')}
                                selected={datasets[activeTab].aggregationType || 'SUM'}
                                onChange={({ selected }) => updateDataset(activeTab, 'aggregationType', selected)}
                            >
                                <SingleSelectOption value="SUM" label="SUM" />
                                <SingleSelectOption value="AVERAGE" label="AVERAGE" />
                            </SingleSelectField>
                            <InputField
                                dense
                                label={i18n.t('Timely Days')}
                                type="number"
                                value={Number.isInteger(datasets[activeTab].timelyDays) ? String(datasets[activeTab].timelyDays) : '15'}
                                onChange={({ value }) => updateDataset(activeTab, 'timelyDays', parseInt(value || '0', 10))}
                            />
                            <InputField
                                dense
                                label={i18n.t('Open Future Periods')}
                                type="number"
                                value={Number.isInteger(datasets[activeTab].openFuturePeriods) ? String(datasets[activeTab].openFuturePeriods) : '0'}
                                onChange={({ value }) => updateDataset(activeTab, 'openFuturePeriods', parseInt(value || '0', 10))}
                            />
                            <InputField
                                dense
                                label={i18n.t('Expiry Days')}
                                type="number"
                                value={Number.isInteger(datasets[activeTab].expiryDays) ? String(datasets[activeTab].expiryDays) : '0'}
                                onChange={({ value }) => updateDataset(activeTab, 'expiryDays', parseInt(value || '0', 10))}
                            />
                            <InputField
                                dense
                                label={i18n.t('Open Periods After CO End Date')}
                                type="number"
                                value={Number.isInteger(datasets[activeTab].openPeriodsAfterCoEndDate) ? String(datasets[activeTab].openPeriodsAfterCoEndDate) : '0'}
                                onChange={({ value }) => updateDataset(activeTab, 'openPeriodsAfterCoEndDate', parseInt(value || '0', 10))}
                            />
                            <InputField
                                dense
                                label={i18n.t('Version')}
                                type="number"
                                value={Number.isInteger(datasets[activeTab].version) ? String(datasets[activeTab].version) : '1'}
                                onChange={({ value }) => updateDataset(activeTab, 'version', parseInt(value || '1', 10))}
                            />
                        </div>

                        {/* Data Elements Section (Preview) */}
                        <div className={styles.dataElementsSection}>
                            <div className={styles.dataElementsHeader}>
                                <h3 className={styles.dataElementsTitle}>
                                    {i18n.t('Data Elements')}
                                </h3>
                                <p className={styles.sectionDescription}>
                                    {i18n.t(
                                        'Preview of elements included in this dataset'
                                    )}
                                </p>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table
                                    style={{ width: '100%', borderCollapse: 'collapse' }}
                                >
                                    <thead>
                                    <tr>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('Name')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('Short Name')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('UID')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('Code')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('Form Name')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('Value Type')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('Aggregation')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('Domain')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('Category Combo')}
                                        </th>
                                        <th
                                            style={{
                                                textAlign: 'left',
                                                padding: 8,
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            {i18n.t('SMS Code')}
                                        </th>

                                    </tr>
                                    </thead>
                                    <tbody>
                                    {currentElements.map((de) => (
                                        <tr key={de.id}>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.name}
                                            </td>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.shortName}
                                            </td>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.id}
                                            </td>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.code}
                                            </td>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.formName}
                                            </td>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.valueType}
                                            </td>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.aggregationType}
                                            </td>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.domainType}
                                            </td>
                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {de.categoryCombo?.id || ''}
                                            </td>

                                            <td
                                                style={{
                                                    padding: 8,
                                                    borderBottom:
                                                        '1px solid #f3f4f6',
                                                }}
                                            >
                                                {datasets[activeTab].smsEnabled ? (
                                                    <InputField
                                                        dense
                                                        value={de.smsCode || ''}
                                                        onChange={({ value }) =>
                                                            updateDataElement(
                                                                activeTab,
                                                                de.id,
                                                                'smsCode',
                                                                value
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    <Tag neutral>—</Tag>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Org Units Section */}
                        <div className={styles.configSection}>
                            <div className={styles.sectionHeader}>
                                <h4 className={styles.sectionTitle}>
                                    🏢 {i18n.t('Assigned Organisation Units')}
                                </h4>
                                <p className={styles.sectionDescription}>
                                    {i18n.t(
                                        'These org units will be linked to the dataset'
                                    )}
                                </p>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{ marginBottom: 8, fontWeight: 600 }}>
                                    {i18n.t('Total: {{count}}', {
                                        count: currentOrgUnits.length,
                                    })}
                                </div>
                                <table
                                    style={{ width: '100%', borderCollapse: 'collapse' }}
                                >
                                    <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                            {i18n.t('Name')}
                                        </th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                            {i18n.t('ID')}
                                        </th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                            {i18n.t('Code')}
                                        </th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                            {i18n.t('Level')}
                                        </th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                            {i18n.t('Parent')}
                                        </th>
                                        <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                                            {i18n.t('Path')}
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {currentOrgUnits.map((ou) => (
                                        <tr key={ou.id}>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                                {ou.displayName || ou.name || ou.id}
                                            </td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                                {ou.id}
                                            </td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                                {ou.code || '—'}
                                            </td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                                {ou.level ?? '—'}
                                            </td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                                                {ou.parent?.name || ou.parent?.id || '—'}
                                            </td>
                                            <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', fontSize: 12 }}>
                                                {ou.path || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Sharing Settings Section */}
                        <div className={styles.configSection}>
                            <div className={styles.sectionHeader}>
                                <h4 className={styles.sectionTitle}>
                                    🔐 {i18n.t('Dataset Sharing Settings')}
                                </h4>
                                <p className={styles.sectionDescription}>
                                    {i18n.t(
                                        'Control who can see and capture data for this dataset'
                                    )}
                                </p>
                            </div>
                            <div className={styles.formGrid}>
                                <SingleSelectField
                                    label={i18n.t('Public access')}
                                    selected={
                                        datasets[activeTab].sharingPublicAccess ||
                                        'rw------'
                                    }
                                    onChange={({ selected }) =>
                                        updateDataset(
                                            activeTab,
                                            'sharingPublicAccess',
                                            selected
                                        )
                                    }
                                    dense
                                >
                                    <SingleSelectOption
                                        value="rw------"
                                        label={i18n.t('Can capture and view')}
                                    />
                                    <SingleSelectOption
                                        value="r-------"
                                        label={i18n.t('Can view only')}
                                    />
                                    <SingleSelectOption
                                        value="--------"
                                        label={i18n.t('No public access')}
                                    />
                                </SingleSelectField>

                                <SingleSelectField
                                    label={i18n.t('External access')}
                                    selected={String(
                                        !!datasets[activeTab].sharingExternal
                                    )}
                                    onChange={({ selected }) =>
                                        updateDataset(
                                            activeTab,
                                            'sharingExternal',
                                            selected === 'true'
                                        )
                                    }
                                    dense
                                >
                                    <SingleSelectOption
                                        value="false"
                                        label={i18n.t('Disabled')}
                                    />
                                    <SingleSelectOption
                                        value="true"
                                        label={i18n.t('Enabled')}
                                    />
                                </SingleSelectField>
                            </div>
                        </div>

                        {/* SMS Reporting Section */}
                        <div className={styles.smsSection}>
                            <div className={styles.sectionHeader}>
                                <h4 className={styles.sectionTitle}>
                                    📱 {i18n.t('SMS Reporting')}
                                </h4>
                                <p className={styles.sectionDescription}>
                                    {i18n.t('Enable and configure SMS reporting options')}
                                </p>
                            </div>
                            <div className={styles.smsControls}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={!!datasets[activeTab].smsEnabled}
                                        onChange={(e) =>
                                            updateDataset(
                                                activeTab,
                                                'smsEnabled',
                                                e.target.checked
                                            )
                                        }
                                    />
                                    <span>{i18n.t('Enable SMS for this dataset')}</span>
                                </label>

                                {datasets[activeTab].smsEnabled && (
                                    <div className={styles.formGridFull}>
                                        {/* Command basics */}
                                        <div className={styles.formGrid}>
                                            {/* SMS Command Name */}
                                            <InputField
                                                dense
                                                label={i18n.t('SMS Command Name')}
                                                helpText={i18n.t('Defaults to "{{name}}" if left empty', {
                                                    name: `${(datasets[activeTab].name || `${assessmentName} - ${getDatasetTypeLabel(activeTab)}`)} ${i18n.t('SMS')}`
                                                })}
                                                value={datasets[activeTab].smsCommandName || ''}
                                                onChange={({ value }) =>
                                                    updateDataset(
                                                        activeTab,
                                                        'smsCommandName',
                                                        value
                                                    )
                                                }
                                                onBlur={() => {
                                                    const current = datasets[activeTab].smsCommandName
                                                    if (!current || !current.trim()) {
                                                        const defName = `${(datasets[activeTab].name || `${assessmentName} - ${getDatasetTypeLabel(activeTab)}`)} ${i18n.t('SMS')}`
                                                        updateDataset(activeTab, 'smsCommandName', defName)
                                                    }
                                                }}
                                            />

                                            {/* SMS Command Keyword */}
                                            <InputField
                                                dense
                                                label={i18n.t('SMS Command Keyword')}
                                                helpText={i18n.t(
                                                    'Defaults to a dataset-specific keyword if left empty'
                                                )}
                                                value={datasets[activeTab].smsKeyword || ''}
                                                onChange={({ value }) =>
                                                    updateDataset(
                                                        activeTab,
                                                        'smsKeyword',
                                                        value
                                                    )
                                                }
                                            />

                                            <div>
                                                <SingleSelectField
                                                    dense
                                                    label={i18n.t(
                                                        'Separator (Keyword and data separator)'
                                                    )}
                                                    selected={
                                                        datasets[activeTab].smsSeparator ||
                                                        ','
                                                    }
                                                    onChange={({ selected }) =>
                                                        updateDataset(
                                                            activeTab,
                                                            'smsSeparator',
                                                            selected
                                                        )
                                                    }
                                                >
                                                    {[
                                                        ',',
                                                        ' ',
                                                        '-',
                                                        ':',
                                                        ';',
                                                        '|',
                                                        '/',
                                                        '#',
                                                        '@',
                                                        '+',
                                                        '.',
                                                    ].map((ch) => (
                                                        <SingleSelectOption
                                                            key={ch}
                                                            value={ch}
                                                            label={
                                                                ch === ' '
                                                                    ? i18n.t('Space')
                                                                    : ch
                                                            }
                                                        />
                                                    ))}
                                                </SingleSelectField>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#6c757d',
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    {i18n.t(
                                                        'Used to separate the keyword from codes and between key=value pairs'
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Response messages */}
                                        <h5 className={styles.subsectionTitle}>
                                            📨 {i18n.t('SMS Response Messages')}
                                        </h5>
                                        <div className={styles.formGrid}>
                                            <InputField
                                                dense
                                                label={i18n.t('Success message')}
                                                value={
                                                    datasets[activeTab]
                                                        .smsSuccessMessage || ''
                                                }
                                                onChange={({ value }) =>
                                                    updateDataset(
                                                        activeTab,
                                                        'smsSuccessMessage',
                                                        value
                                                    )
                                                }
                                            />
                                            <InputField
                                                dense
                                                label={i18n.t('Wrong format message')}
                                                value={
                                                    datasets[activeTab]
                                                        .smsWrongFormatMessage || ''
                                                }
                                                onChange={({ value }) =>
                                                    updateDataset(
                                                        activeTab,
                                                        'smsWrongFormatMessage',
                                                        value
                                                    )
                                                }
                                            />
                                            <InputField
                                                dense
                                                label={i18n.t('No user message')}
                                                value={
                                                    datasets[activeTab]
                                                        .smsNoUserMessage || ''
                                                }
                                                onChange={({ value }) =>
                                                    updateDataset(
                                                        activeTab,
                                                        'smsNoUserMessage',
                                                        value
                                                    )
                                                }
                                            />
                                            <InputField
                                                dense
                                                label={i18n.t(
                                                    'More than one orgunit message'
                                                )}
                                                value={
                                                    datasets[activeTab]
                                                        .smsMoreThanOneOrgUnitMessage ||
                                                    ''
                                                }
                                                onChange={({ value }) =>
                                                    updateDataset(
                                                        activeTab,
                                                        'smsMoreThanOneOrgUnitMessage',
                                                        value
                                                    )
                                                }
                                            />
                                            <InputField
                                                dense
                                                label={i18n.t('No codes message')}
                                                helpText={i18n.t(
                                                    'Shown when only the command is received'
                                                )}
                                                value={
                                                    datasets[activeTab]
                                                        .smsNoCodesMessage || ''
                                                }
                                                onChange={({ value }) =>
                                                    updateDataset(
                                                        activeTab,
                                                        'smsNoCodesMessage',
                                                        value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
                <Button
                    primary
                    onClick={() => setShowCreationModal(true)}
                    disabled={saving || Object.keys(datasets).length === 0}
                >
                    🚀 {i18n.t('Create DQA Datasets')}
                </Button>

            </div>

            {/* Progress Modal */}
            {showProgressModal && (
                <Modal large onClose={() => setShowProgressModal(false)}>
                    <ModalTitle>{i18n.t('Creating DQA Datasets')}</ModalTitle>
                    <ModalContent>
                        <div className={styles.progressContent}>
                            <LinearLoader />
                            <Box marginTop="16px">
                                <p className={styles.progressText}>
                                    {creationProgress.stage}
                                </p>
                                <p className={styles.progressSubtext}>
                                    {creationProgress.currentItem}
                                </p>
                                {creationProgress.total > 0 && (
                                    <p className={styles.progressCounter}>
                                        {i18n.t('Progress: {{current}} of {{total}}', {
                                            current: creationProgress.current,
                                            total: creationProgress.total,
                                        })}
                                    </p>
                                )}
                            </Box>
                        </div>
                    </ModalContent>
                </Modal>
            )}

            {/* Creation Modal */}
            {showCreationModal && (
                <DatasetCreationModal
                    isOpen={showCreationModal}
                    onClose={() => {
                        setShowCreationModal(false)
                        try { onFinish?.(true) } catch (_) {}
                    }}
                    datasets={datasets}
                    dataElements={datasetDataElements}
                    orgUnits={selectedOrgUnits}
                    assessmentName={assessmentName}
                    onAllDatasetsCreated={(report) => {
                        // Keep the modal open until the user closes it manually
                    }}
                    saveAssessmentPayload={async (payload) => {
                        try {
                            const assessmentPayload = {
                                id: assessmentId,
                                name: assessmentName,
                                datasets,
                                dataElements: datasetDataElements,
                                orgUnits: selectedOrgUnits,
                                period,
                                frequency,
                                creationPayload: payload,
                                lastModified: new Date().toISOString(),
                            }
                            
                            // Add external connection info if available
                            if (assessmentData?.externalConnection) {
                                assessmentPayload.externalConnection = assessmentData.externalConnection
                            }
                            
                            await (async (assessmentData) => {
                                try {
                                    await dhis2Service.saveAssessment(dataEngine, assessmentData)
                                } catch (error) {
                                    if (
                                        error.details?.httpStatusCode === 404 ||
                                        error.httpStatusCode === 404
                                    ) {
                                        await dhis2Service.createAssessment(
                                            dataEngine,
                                            assessmentData
                                        )
                                    } else {
                                        throw error
                                    }
                                }
                            })(assessmentPayload)
                            
                            // Return the payload with external connection info for the modal
                            return assessmentPayload
                        } catch (_) {
                            // non-fatal in UI
                        }
                    }}
                />
            )}
        </div>
    )
}

// Wrapper to adapt ManageAssessments step props to the ported component
const PreparationStep = ({
                             assessmentData,
                             selectedDataElements = [],
                             selectedOrgUnits: selectedOrgUnitsProp = [],
                             orgUnits: orgUnitsProp = [],
                             onComplete,
                         }) => {
    const assessmentId = assessmentData?.id || assessmentData?.assessmentId || ''
    const assessmentName =
        assessmentData?.name || assessmentData?.assessmentName || i18n.t('Assessment')
    const period = assessmentData?.period || ''
    const frequency = assessmentData?.frequency || 'Monthly'
    const selectedOrgUnits =
        selectedOrgUnitsProp && selectedOrgUnitsProp.length > 0
            ? selectedOrgUnitsProp
            : assessmentData?.orgUnits || orgUnitsProp || []

    return (
        <DatasetPreparationPorted
            assessmentId={assessmentId}
            assessmentName={assessmentName}
            assessmentData={assessmentData}
            selectedDataElements={selectedDataElements}
            selectedOrgUnits={selectedOrgUnits}
            period={period}
            frequency={frequency}
            onFinish={() => {
                if (typeof onComplete === 'function') onComplete(true)
            }}
        />
    )
}

export default PreparationStep