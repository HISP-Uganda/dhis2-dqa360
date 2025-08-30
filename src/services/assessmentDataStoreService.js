import { useDataEngine } from '@dhis2/app-runtime'
import { handleDatastoreError, withSuppressed404s } from '../utils/errorHandler'

/**
 * DataStore Service for DQA360 Assessments
 * Implements the well-nested structure as specified:
 * 
 * Assessment_XX: {
 *   Info: { all attributes },
 *   Dhis2config: {
 *     info: { all attributes for dhis2 configs },
 *     datasetsSelected: [{
 *       info: { all datasets attributes },
 *       dataElements: [{ all attributes specified }],
 *       organisationUnits: [{ all attributes }]
 *     }],
 *     orgUnitMapping: [ mapping details ]
 *   },
 *   localDatasetsCreated: [{
 *     info: { all attributes },
 *     dataElements: [],
 *     orgUnits: [],
 *     sharingSettings: []
 *   }]
 * }
 */

const NAMESPACE = 'dqa360'
const ASSESSMENT_KEY_PREFIX = 'assessment_'

export const useAssessmentDataStore = () => {
    const engine = useDataEngine()

    /**
     * Generate assessment key from ID with proper prefix
     */
    const getAssessmentKey = (assessmentId) => {
        // If already has prefix, return as-is
        if (assessmentId && assessmentId.startsWith(ASSESSMENT_KEY_PREFIX)) {
            return assessmentId
        }
        // Otherwise add prefix
        return `${ASSESSMENT_KEY_PREFIX}${assessmentId || Date.now()}`
    }

    /**
     * Initialize the dataStore namespace
     */
    const initializeDataStore = async () => {
        try {
            await engine.query({
                data: {
                    resource: `dataStore/${NAMESPACE}`,
                    params: {}
                }
            })
        } catch (error) {
            if (error.details?.httpStatusCode === 404) {
                await engine.mutate({
                    resource: `dataStore/${NAMESPACE}/assessments-index`,
                    type: 'create',
                    data: {
                        assessments: [],
                        lastUpdated: new Date().toISOString(),
                        version: '3.0.0',
                        structure: 'nested'
                    }
                })
                console.log('✅ DataStore namespace initialized with nested structure')
            } else {
                throw error
            }
        }
    }

    /**
     * Create the assessment structure
     */
    const createAssessmentStructure = (assessmentData, dhis2Config, selectedDataSets, selectedDataElements, selectedOrgUnits, orgUnitMappings, localDatasets, userInfo) => {
        const currentTime = new Date().toISOString()
        // Generate unique assessment ID if not provided
        const assessmentId = assessmentData.id || `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        return {
            // Core identification
            id: assessmentId,
            version: '3.0.0',
            structure: 'nested',
            createdAt: currentTime,
            lastUpdated: currentTime,

            // Metadata source for the entire assessment (manual or dhis2)
            metadataSource: assessmentData.metadataSource || (dhis2Config?.baseUrl ? 'dhis2' : 'manual'),

            // Tab 1: Assessment Information
            Info: {
                // Basic Details
                name: assessmentData.name || '',
                description: assessmentData.description || '',
                objectives: assessmentData.objectives || '',
                scope: assessmentData.scope || '',
                
                // Assessment Configuration
                assessmentType: assessmentData.assessmentType || 'baseline',
                priority: assessmentData.priority || 'medium',
                methodology: assessmentData.methodology || 'automated',
                frequency: assessmentData.frequency || 'monthly',
                reportingLevel: assessmentData.reportingLevel || 'facility',

                
                // Dates and Timeline
                startDate: assessmentData.startDate || '',
                endDate: assessmentData.endDate || '',
                period: assessmentData.period || '',
                
                // Data Quality Configuration
                dataQualityDimensions: assessmentData.dataQualityDimensions || ['completeness', 'timeliness'],
                // New key as per latest structure; keep both for compatibility
                dataDimensionsQuality: assessmentData.dataDimensionsQuality || assessmentData.dataQualityDimensions || ['completeness', 'timeliness'],
                
                // Stakeholders and Management
                stakeholders: assessmentData.stakeholders || [],
                riskFactors: assessmentData.riskFactors || [],
                successCriteria: assessmentData.successCriteria || '',
                
                // Settings and Preferences
                notifications: assessmentData.notifications !== undefined ? assessmentData.notifications : true,
                autoSync: assessmentData.autoSync !== undefined ? assessmentData.autoSync : true,
                validationAlerts: assessmentData.validationAlerts !== undefined ? assessmentData.validationAlerts : false,
                historicalComparison: assessmentData.historicalComparison !== undefined ? assessmentData.historicalComparison : false,
                
                // Security and Access
                confidentialityLevel: assessmentData.confidentialityLevel || 'internal',
                dataRetentionPeriod: assessmentData.dataRetentionPeriod || '5years',
                publicAccess: assessmentData.publicAccess !== undefined ? assessmentData.publicAccess : false,
                
                // Metadata
                status: assessmentData.status || 'draft',
                tags: assessmentData.tags || [],
                customFields: assessmentData.customFields || {},
                
                // Audit Information
                createdBy: userInfo ? {
                    id: userInfo.id || 'unknown',
                    username: userInfo.username || 'unknown',
                    displayName: userInfo.displayName || userInfo.username || 'Unknown User',
                    email: userInfo.email || ''
                } : null,
                lastModifiedBy: userInfo ? {
                    id: userInfo.id || 'unknown',
                    username: userInfo.username || 'unknown',
                    displayName: userInfo.displayName || userInfo.username || 'Unknown User',
                    email: userInfo.email || ''
                } : null,
                
                // Follow-up Assessment Reference
                baselineAssessmentId: assessmentData.baselineAssessmentId || null,
                
                // Additional Notes
                notes: assessmentData.notes || '',
                
                // SMS Reporting Configuration
                smsConfig: assessmentData.smsConfig ? {
                    enabled: assessmentData.smsConfig.enabled || false,
                    autoGenerate: assessmentData.smsConfig.autoGenerate || true,
                    separator: assessmentData.smsConfig.separator || ',',
                    commands: assessmentData.smsConfig.commands || [],
                    notifications: {
                        enabled: assessmentData.smsConfig.notifications?.enabled || true,
                        recipients: assessmentData.smsConfig.notifications?.recipients || [],
                        events: assessmentData.smsConfig.notifications?.events || ['data_received', 'validation_failed', 'completion_reminder']
                    },
                    messages: {
                        // Backward-compatible defaults
                        defaultMessage: assessmentData.smsConfig.messages?.defaultMessage || 'Thanks! SMS received.',
                        successMessage: assessmentData.smsConfig.messages?.successMessage || 'Saved.',
                        wrongFormatMessage: assessmentData.smsConfig.messages?.wrongFormatMessage || 'Wrong format.',
                        noUserMessage: assessmentData.smsConfig.messages?.noUserMessage || 'Phone not linked to any user.',
                        moreThanOneOrgUnitMessage: assessmentData.smsConfig.messages?.moreThanOneOrgUnitMessage || 'Multiple org units linked to your user; please contact admin.',
                        // New defaults
                        emptyCodesMessage: assessmentData.smsConfig.messages?.emptyCodesMessage || 'No codes provided. Please include data codes.',
                        commandOnlyMessage: assessmentData.smsConfig.messages?.commandOnlyMessage || 'Command received without data. Please include codes.',
                        defaultReplyMessage: assessmentData.smsConfig.messages?.defaultReplyMessage || 'Thanks! SMS received.'
                    },
                    // Default command names (based on dataset type); callers can override
                    defaultCommandName: assessmentData.smsConfig.defaultCommandName || 'DQA_REGISTER',
                    defaultCommandNamesByType: assessmentData.smsConfig.defaultCommandNamesByType || {
                        register: 'DQA_REGISTER',
                        summary: 'DQA_SUMMARY',
                        reported: 'DQA_REPORTED',
                        corrected: 'DQA_CORRECTED'
                    },
                    lastGenerated: assessmentData.smsConfig.lastGenerated || null,
                    generatedBy: userInfo?.username || 'system'
                } : {
                    enabled: false,
                    autoGenerate: true,
                    separator: ',',
                    commands: [],
                    notifications: { enabled: true, recipients: [], events: [] },
                    messages: {
                        defaultMessage: 'Thanks! SMS received.',
                        successMessage: 'Saved.',
                        wrongFormatMessage: 'Wrong format.',
                        noUserMessage: 'Phone not linked to any user.',
                        moreThanOneOrgUnitMessage: 'Multiple org units linked to your user; please contact admin.',
                        emptyCodesMessage: 'No codes provided. Please include data codes.',
                        commandOnlyMessage: 'Command received without data. Please include codes.',
                        defaultReplyMessage: 'Thanks! SMS received.'
                    },
                    defaultCommandName: 'DQA_REGISTER',
                    defaultCommandNamesByType: {
                        register: 'DQA_REGISTER',
                        summary: 'DQA_SUMMARY',
                        reported: 'DQA_REPORTED',
                        corrected: 'DQA_CORRECTED'
                    },
                    lastGenerated: null,
                    generatedBy: null
                }
            },

            // Tab 2: DHIS2 Connection Configuration (moved under Info for new structure)
            Dhis2config: {
                // Connection Information
                info: {
                    baseUrl: dhis2Config?.baseUrl || '',
                    username: dhis2Config?.username || '',
                    password: dhis2Config?.password || '',
                    configured: !!(dhis2Config?.baseUrl && dhis2Config?.username && dhis2Config?.password),
                    
                    // Connection Status
                    lastTested: dhis2Config?.lastTested || null,
                    connectionStatus: dhis2Config?.connectionStatus || 'not_tested',
                    lastSuccessfulConnection: dhis2Config?.lastSuccessfulConnection || null,
                    
                    // DHIS2 Instance Information
                    version: dhis2Config?.version || '',
                    apiVersion: dhis2Config?.apiVersion || '',
                    systemName: dhis2Config?.systemName || '',
                    instanceType: dhis2Config?.instanceType || 'production',
                    
                    // Configuration Metadata
                    configuredAt: dhis2Config?.configuredAt || currentTime,
                    lastModified: currentTime,
                    
                    // Additional Settings
                    timeout: dhis2Config?.timeout || 30000,
                    retryAttempts: dhis2Config?.retryAttempts || 3,
                    useSSL: dhis2Config?.useSSL !== undefined ? dhis2Config.useSSL : true
                },

                // Datasets Selected with Full Details
                datasetsSelected: (Array.isArray(selectedDataSets) ? selectedDataSets : [])
                    .filter(dataset => dataset && typeof dataset === 'object')
                    .map(dataset => ({
                    // Dataset Basic Information
                    info: {
                        id: dataset.id || '',
                        name: dataset.name || dataset.displayName || '',
                        displayName: dataset.displayName || dataset.name || '',
                        code: dataset.code || '',
                        description: dataset.description || '',
                        
                        // Dataset Configuration
                        periodType: dataset.periodType || 'Monthly',
                        categoryCombo: dataset.categoryCombo || { id: 'default', name: 'default' },
                        
                        // Dataset Properties
                        openFuturePeriods: dataset.openFuturePeriods || 0,
                        expiryDays: dataset.expiryDays || 0,
                        timelyDays: dataset.timelyDays || 15,
                        notificationRecipients: dataset.notificationRecipients || [],
                        
                        // Workflow
                        workflow: dataset.workflow || null,
                        approvalWorkflow: dataset.approvalWorkflow || null,
                        
                        // Metadata
                        created: dataset.created || currentTime,
                        lastUpdated: dataset.lastUpdated || currentTime,
                        
                        // Access and Sharing
                        publicAccess: dataset.publicAccess || 'r-------',
                        userAccesses: dataset.userAccesses || [],
                        userGroupAccesses: dataset.userGroupAccesses || [],
                        
                        // Additional Properties
                        mobile: dataset.mobile !== undefined ? dataset.mobile : false,
                        version: dataset.version || 1,
                        fieldCombinationRequired: dataset.fieldCombinationRequired !== undefined ? dataset.fieldCombinationRequired : false,
                        validCompleteOnly: dataset.validCompleteOnly !== undefined ? dataset.validCompleteOnly : false,
                        noValueRequiresComment: dataset.noValueRequiresComment !== undefined ? dataset.noValueRequiresComment : false,
                        skipOffline: dataset.skipOffline !== undefined ? dataset.skipOffline : false,
                        dataElementDecoration: dataset.dataElementDecoration !== undefined ? dataset.dataElementDecoration : false,
                        renderAsTabs: dataset.renderAsTabs !== undefined ? dataset.renderAsTabs : false,
                        renderHorizontally: dataset.renderHorizontally !== undefined ? dataset.renderHorizontally : false
                    },

                    // Data Elements with Full Details
                    dataElements: (Array.isArray(selectedDataElements) ? selectedDataElements : [])
                        .filter(de => de && typeof de === 'object' && de.id)
                        .filter(de => dataset.dataSetElements?.some(dse => dse.dataElement?.id === de.id) || true)
                        .map(dataElement => ({
                            // Basic Information
                            id: dataElement.id || '',
                            name: dataElement.name || dataElement.displayName || '',
                            displayName: dataElement.displayName || dataElement.name || '',
                            code: dataElement.code || '',
                            description: dataElement.description || '',
                            
                            // Data Element Properties
                            valueType: dataElement.valueType || 'TEXT',
                            domainType: dataElement.domainType || 'AGGREGATE',
                            aggregationType: dataElement.aggregationType || 'SUM',
                            
                            // Categories and Options
                            categoryCombo: dataElement.categoryCombo || { id: 'default', name: 'default' },
                            optionSet: dataElement.optionSet || null,
                            commentOptionSet: dataElement.commentOptionSet || null,
                            
                            // Validation and Constraints
                            zeroIsSignificant: dataElement.zeroIsSignificant !== undefined ? dataElement.zeroIsSignificant : false,
                            url: dataElement.url || '',
                            
                            // Metadata
                            created: dataElement.created || currentTime,
                            lastUpdated: dataElement.lastUpdated || currentTime,
                            
                            // Access and Sharing
                            publicAccess: dataElement.publicAccess || 'r-------',
                            userAccesses: dataElement.userAccesses || [],
                            userGroupAccesses: dataElement.userGroupAccesses || [],
                            
                            // Additional Properties
                            formName: dataElement.formName || '',
                            style: dataElement.style || {},
                            legendSets: dataElement.legendSets || [],
                            aggregationLevels: dataElement.aggregationLevels || [],
                            
                            // DQA360 Specific
                            selectedForAssessment: true,
                            assessmentPriority: dataElement.assessmentPriority || 'normal',
                            qualityDimensions: dataElement.qualityDimensions || ['completeness', 'timeliness']
                        })),

                    // Organisation Units with Full Details
                    organisationUnits: (Array.isArray(selectedOrgUnits) ? selectedOrgUnits : [])
                        .filter(orgUnit => orgUnit && typeof orgUnit === 'object' && orgUnit.id)
                        .map(orgUnit => ({
                        // Basic Information
                        id: orgUnit.id || '',
                        name: orgUnit.name || orgUnit.displayName || '',
                        displayName: orgUnit.displayName || orgUnit.name || '',
                        code: orgUnit.code || '',
                        description: orgUnit.description || '',
                        
                        // Hierarchy Information
                        level: orgUnit.level || 1,
                        path: orgUnit.path || `/${orgUnit.id}`,
                        parent: orgUnit.parent || null,
                        children: orgUnit.children || [],
                        
                        // Geographic Information
                        coordinates: orgUnit.coordinates || null,
                        featureType: orgUnit.featureType || 'NONE',
                        geometry: orgUnit.geometry || null,
                        
                        // Contact Information
                        address: orgUnit.address || '',
                        email: orgUnit.email || '',
                        phoneNumber: orgUnit.phoneNumber || '',
                        contactPerson: orgUnit.contactPerson || '',
                        
                        // Dates
                        openingDate: orgUnit.openingDate || null,
                        closedDate: orgUnit.closedDate || null,
                        
                        // Metadata
                        created: orgUnit.created || currentTime,
                        lastUpdated: orgUnit.lastUpdated || currentTime,
                        
                        // Access and Sharing
                        publicAccess: orgUnit.publicAccess || 'r-------',
                        userAccesses: orgUnit.userAccesses || [],
                        userGroupAccesses: orgUnit.userGroupAccesses || [],
                        
                        // Additional Properties
                        url: orgUnit.url || '',
                        image: orgUnit.image || null,
                        comment: orgUnit.comment || '',
                        
                        // DQA360 Specific
                        selectedForAssessment: true,
                        assessmentRole: orgUnit.assessmentRole || 'data_source',
                        reportingFrequency: orgUnit.reportingFrequency || assessmentData.frequency || 'monthly'
                    }))
                })),

                // Organisation Unit Mapping Details
                orgUnitMapping: (Array.isArray(orgUnitMappings) ? orgUnitMappings : [])
                    .filter(mapping => mapping && typeof mapping === 'object' && mapping.mapped)
                    .map(mapping => ({
                        // External (Local) Organisation Unit
                        external: {
                            id: mapping.external?.id || '',
                            name: mapping.external?.displayName || mapping.external?.name || '',
                            code: mapping.external?.code || '',
                            level: mapping.external?.level || 1,
                            path: mapping.external?.path || ''
                        },
                        
                        // DHIS2 Organisation Unit
                        dhis2: {
                            id: mapping.local?.id || '',
                            name: mapping.local?.displayName || mapping.local?.name || '',
                            code: mapping.local?.code || '',
                            level: mapping.local?.level || 1,
                            path: mapping.local?.path || ''
                        },
                        
                        // Mapping Details
                        mappingType: mapping.mappingType || 'manual',
                        confidence: mapping.confidence || 1.0,
                        status: mapping.status || 'active',
                        
                        // Metadata
                        createdAt: mapping.createdAt || currentTime,
                        createdBy: userInfo?.username || 'system',
                        lastModified: currentTime,
                        modifiedBy: userInfo?.username || 'system',
                        
                        // Validation
                        validated: mapping.validated !== undefined ? mapping.validated : false,
                        validatedBy: mapping.validatedBy || null,
                        validatedAt: mapping.validatedAt || null,
                        
                        // Notes
                        notes: mapping.notes || '',
                        issues: mapping.issues || []
                    }))
            },

            // Tab 3: Local Datasets Created
            localDatasetsCreated: (Array.isArray(localDatasets) ? localDatasets : [])
                .filter(localDataset => localDataset && typeof localDataset === 'object')
                .map(localDataset => {
                console.log('🔍 Processing local dataset:', {
                    id: localDataset.id,
                    name: localDataset.name,
                    dhis2Id: localDataset.dhis2Id,
                    dataElementsCount: localDataset.dataElements?.length || 0,
                    orgUnitsCount: localDataset.orgUnits?.length || 0,
                    fallbackDataElementsCount: selectedDataElements?.length || 0,
                    fallbackOrgUnitsCount: selectedOrgUnits?.length || 0
                })
                
                return {
                // Dataset Information
                info: {
                    id: localDataset.id || `local_ds_${Date.now()}`,
                    name: localDataset.name || '',
                    displayName: localDataset.displayName || localDataset.name || '',
                    code: localDataset.code || '',
                    description: localDataset.description || '',
                    
                    // Dataset Type and Purpose
                    type: localDataset.type || 'assessment',
                    purpose: localDataset.purpose || 'data_quality_assessment',
                    category: localDataset.category || 'dqa360',
                    
                    // DHIS2 Integration
                    dhis2Id: localDataset.dhis2Id || null,
                    dhis2Created: localDataset.dhis2Created !== undefined ? localDataset.dhis2Created : false,
                    dhis2CreatedAt: localDataset.dhis2CreatedAt || null,
                    
                    // Configuration
                    periodType: localDataset.periodType || assessmentData.frequency || 'Monthly',
                    categoryCombo: localDataset.categoryCombo || 'default',
                    
                    // Workflow
                    workflow: localDataset.workflow || null,
                    approvalWorkflow: localDataset.approvalWorkflow || null,
                    
                    // Properties
                    openFuturePeriods: localDataset.openFuturePeriods || 0,
                    expiryDays: localDataset.expiryDays || 0,
                    timelyDays: localDataset.timelyDays || 15,
                    
                    // Status
                    status: localDataset.status || 'draft',
                    active: localDataset.active !== undefined ? localDataset.active : true,
                    
                    // Metadata
                    created: localDataset.created || currentTime,
                    lastUpdated: currentTime,
                    createdBy: userInfo?.username || 'system',
                    lastModifiedBy: userInfo?.username || 'system',
                    
                    // Version Control
                    version: localDataset.version || 1,
                    versionHistory: localDataset.versionHistory || []
                },

                // Data Elements
                dataElements: (Array.isArray(localDataset.dataElements) ? localDataset.dataElements : 
                              Array.isArray(selectedDataElements) ? selectedDataElements : [])
                    .filter(de => de && typeof de === 'object' && de.id)
                    .map(de => ({
                    id: de.id || '',
                    name: de.name || de.displayName || '',
                    displayName: de.displayName || de.name || '',
                    code: de.code || '',
                    valueType: de.valueType || 'TEXT',
                    domainType: de.domainType || 'AGGREGATE',
                    aggregationType: de.aggregationType || 'SUM',
                    categoryCombo: de.categoryCombo || 'default',
                    
                    // DQA360 Specific Properties
                    qualityDimensions: de.qualityDimensions || ['completeness'],
                    assessmentWeight: de.assessmentWeight || 1.0,
                    criticalIndicator: de.criticalIndicator !== undefined ? de.criticalIndicator : false,
                    
                    // Inclusion Details
                    includedAt: currentTime,
                    includedBy: userInfo?.username || 'system',
                    inclusionReason: de.inclusionReason || 'selected_for_assessment'
                })),

                // Organisation Units
                orgUnits: (Array.isArray(localDataset.orgUnits) ? localDataset.orgUnits : 
                          Array.isArray(selectedOrgUnits) ? selectedOrgUnits : [])
                    .filter(ou => ou && typeof ou === 'object' && ou.id)
                    .map(ou => ({
                    id: ou.id || '',
                    name: ou.name || ou.displayName || '',
                    displayName: ou.displayName || ou.name || '',
                    code: ou.code || '',
                    level: ou.level || 1,
                    path: ou.path || `/${ou.id}`,
                    
                    // Assignment Details
                    assignedAt: currentTime,
                    assignedBy: userInfo?.username || 'system',
                    assignmentType: ou.assignmentType || 'data_collection',
                    reportingResponsibility: ou.reportingResponsibility !== undefined ? ou.reportingResponsibility : true
                })),

                // Sharing Settings
                sharingSettings: localDataset.sharingSettings || [{
                    // Public Access
                    publicAccess: localDataset.publicAccess || 'r-------',
                    
                    // User Access
                    userAccesses: localDataset.userAccesses || [],
                    
                    // User Group Access
                    userGroupAccesses: localDataset.userGroupAccesses || [],
                    
                    // External Access
                    externalAccess: localDataset.externalAccess !== undefined ? localDataset.externalAccess : false,
                    
                    // Sharing Configuration
                    sharingConfiguration: {
                        allowPublicAccess: localDataset.allowPublicAccess !== undefined ? localDataset.allowPublicAccess : false,
                        allowExternalAccess: localDataset.allowExternalAccess !== undefined ? localDataset.allowExternalAccess : false,
                        inheritFromParent: localDataset.inheritFromParent !== undefined ? localDataset.inheritFromParent : true
                    },
                    
                    // Metadata
                    lastModified: currentTime,
                    modifiedBy: userInfo?.username || 'system'
                }],

                // SMS Configuration for dataset-level operations
                smsConfig: localDataset.smsConfig || {
                    enabled: false,
                    autoGenerate: true,
                    separator: ',',
                    commands: [],
                    notifications: { enabled: true, recipients: [], events: ['data_received', 'validation_failed', 'completion_reminder'] },
                    messages: {
                        defaultMessage: 'Thanks! SMS received.',
                        successMessage: 'Saved.',
                        wrongFormatMessage: 'Wrong format.',
                        noUserMessage: 'Phone not linked to any user.',
                        moreThanOneOrgUnitMessage: 'Multiple org units linked to your user; please contact admin.',
                        emptyCodesMessage: 'No codes provided. Please include data codes.',
                        commandOnlyMessage: 'Command received without data. Please include codes.',
                        defaultReplyMessage: 'Thanks! SMS received.'
                    },
                    defaultCommandName: 'DQA_REGISTER',
                    lastGenerated: null,
                    generatedBy: userInfo?.username || 'system'
                }
            }
        })
        }
    }

    /**
     * Save assessment with nested structure
     */
    const saveAssessment = async (assessmentData, dhis2Config, selectedDataSets, selectedDataElements, selectedOrgUnits, orgUnitMappings, localDatasets, userInfo) => {
        try {
            console.log('💾 Saving assessment with nested structure')
            
            await initializeDataStore()
            
            // Create the nested structure
            const assessment = createAssessmentStructure(
                assessmentData, 
                dhis2Config, 
                selectedDataSets, 
                selectedDataElements, 
                selectedOrgUnits, 
                orgUnitMappings, 
                localDatasets, 
                userInfo
            )
            
            // Ensure new structure has Info.Dhis2config for compatibility, then remove top-level
            if (!assessment.Info?.Dhis2config && assessment.Dhis2config) {
                assessment.Info = assessment.Info || {}
                assessment.Info.Dhis2config = assessment.Dhis2config
            }
            if (assessment.Dhis2config) {
                delete assessment.Dhis2config
            }

            const _dhCfg = (assessment.Info && assessment.Info.Dhis2config) ? assessment.Info.Dhis2config : { info: {}, datasetsSelected: [] }
            console.log('📋 Assessment structure:', {
                id: assessment.id,
                version: assessment.version,
                structure: assessment.structure,
                infoFields: Object.keys(assessment.Info || {}).length,
                dhis2ConfigFields: Object.keys(_dhCfg.info || {}).length,
                datasetsSelected: (_dhCfg.datasetsSelected || []).length,
                localDatasetsCreated: (assessment.localDatasetsCreated || []).length
            })
            
            // Save to dataStore
            const assessmentKey = getAssessmentKey(assessment.id)
            
            // Log what we're about to save
            console.log('💾 About to save assessment:', {
                id: assessment.id,
                version: assessment.version,
                localDatasetsCreatedCount: assessment.localDatasetsCreated?.length || 0,
                hasLocalDatasetsCreated: !!assessment.localDatasetsCreated,
                assessmentKey
            })
            
            try {
                // Try to update existing assessment
                await engine.mutate({
                    resource: `dataStore/${NAMESPACE}/${assessmentKey}`,
                    type: 'update',
                    data: assessment
                })
                console.log('✅ Assessment updated successfully')
            } catch (updateError) {
                if (updateError.details?.httpStatusCode === 404) {
                    // Create new assessment
                    await engine.mutate({
                        resource: `dataStore/${NAMESPACE}/${assessmentKey}`,
                        type: 'create',
                        data: assessment
                    })
                    console.log('✅ Assessment created successfully')
                } else {
                    throw updateError
                }
            }
            
            // Update assessments index
            await updateAssessmentsIndex(assessment)
            
            return assessment
            
        } catch (error) {
            console.error('❌ Error saving assessment:', error)
            throw error
        }
    }

    /**
     * Update the assessments index
     */
    const updateAssessmentsIndex = async (assessment) => {
        try {
            // Get current index
            let index
            try {
                const response = await engine.query({
                    data: {
                        resource: `dataStore/${NAMESPACE}/assessments-index`
                    }
                })
                index = response.data
            } catch (error) {
                if (error.details?.httpStatusCode === 404) {
                    index = {
                        assessments: [],
                        lastUpdated: new Date().toISOString(),
                        version: '3.0.0',
                        structure: 'nested'
                    }
                } else {
                    throw error
                }
            }
            
            // Update or add assessment in index
            const existingIndex = index.assessments.findIndex(a => a.id === assessment.id)
            const assessmentSummary = {
                id: assessment.id,
                name: assessment.Info.name,
                status: assessment.Info.status,
                assessmentType: assessment.Info.assessmentType,
                createdAt: assessment.createdAt,
                lastUpdated: assessment.lastUpdated,
                createdBy: assessment.Info.createdBy?.username || 'system'
            }
            
            if (existingIndex >= 0) {
                index.assessments[existingIndex] = assessmentSummary
            } else {
                index.assessments.push(assessmentSummary)
            }
            
            index.lastUpdated = new Date().toISOString()
            
            // Save updated index
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/assessments-index`,
                type: 'update',
                data: index
            })
            
        } catch (error) {
            console.error('❌ Error updating assessments index:', error)
            // Don't throw - index update failure shouldn't prevent assessment save
        }
    }

    // Add a simple cache and loading state to prevent repeated calls
    let assessmentsCache = null
    let isLoadingAssessments = false
    let lastLoadTime = 0
    const CACHE_DURATION = 30000 // 30 seconds cache

    /**
     * Get all assessments from index, with fallback to direct datastore scan
     */
    const getAssessments = async () => {
        console.log('📊 assessmentDataStoreService.getAssessments() called')
        
        // Check if we're already loading
        if (isLoadingAssessments) {
            console.log('⏳ Already loading assessments, waiting...')
            // Wait for the current load to complete
            while (isLoadingAssessments) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            return assessmentsCache || []
        }
        
        // Check cache validity
        const now = Date.now()
        if (assessmentsCache && (now - lastLoadTime) < CACHE_DURATION) {
            console.log('📊 Returning cached assessments:', assessmentsCache.length)
            return assessmentsCache
        }
        
        isLoadingAssessments = true
        
        return await withSuppressed404s(async () => {
            try {
                // First try to get from index with timeout
                console.log('📊 Attempting to load assessments index from datastore...')
                
                // Create a timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Datastore query timeout')), 8000) // 8 second timeout
                })
                
                // Race the query against the timeout
                const response = await Promise.race([
                    engine.query({
                        data: {
                            resource: `dataStore/${NAMESPACE}/assessments-index`
                        }
                    }),
                    timeoutPromise
                ])
                const indexData = response.data.assessments || []
                
                // If index has data, cache and return it
                if (indexData.length > 0) {
                    console.log('📊 Loaded assessments from index:', indexData.length)
                    assessmentsCache = indexData
                    lastLoadTime = now
                    return indexData
                }
                
                // If index is empty, fall back to scanning datastore
                console.log('📊 Index empty, scanning datastore directly...')
                const datastoreTimeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Datastore scan timeout')), 5000) // 5 second timeout for scan
                })
                
                const datastoreResults = await Promise.race([
                    getAssessmentsFromDataStore(),
                    datastoreTimeoutPromise
                ])
                assessmentsCache = datastoreResults
                lastLoadTime = now
                return datastoreResults
                
            } catch (error) {
                if (error.message?.includes('timeout')) {
                    console.log('⏱️ Datastore index query timed out - trying direct scan...')
                    // Try scanning datastore directly with timeout
                    try {
                        const scanTimeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Direct scan timeout')), 3000) // 3 second timeout for direct scan
                        })
                        
                        const datastoreResults = await Promise.race([
                            getAssessmentsFromDataStore(),
                            scanTimeoutPromise
                        ])
                        assessmentsCache = datastoreResults
                        lastLoadTime = now
                        return datastoreResults
                    } catch (scanError) {
                        console.log('⏱️ Direct scan also timed out - assuming fresh installation')
                        assessmentsCache = []
                        lastLoadTime = now
                        return []
                    }
                }
                
                const errorResult = handleDatastoreError(error, 'Load assessments index', NAMESPACE)
                if (errorResult.expected) {
                    // Try scanning datastore directly
                    try {
                        const fallbackTimeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Fallback datastore scan timeout')), 5000) // 5 second timeout
                        })
                        
                        const datastoreResults = await Promise.race([
                            getAssessmentsFromDataStore(),
                            fallbackTimeoutPromise
                        ])
                        assessmentsCache = datastoreResults
                        lastLoadTime = now
                        return datastoreResults
                    } catch (datastoreError) {
                        if (datastoreError.message?.includes('timeout')) {
                            console.log('⏱️ Datastore scan timed out - assuming fresh installation')
                            assessmentsCache = []
                            lastLoadTime = now
                            return []
                        }
                        
                        const datastoreResult = handleDatastoreError(datastoreError, 'Scan datastore for assessments', NAMESPACE)
                        if (datastoreResult.expected) {
                            // Fresh installation - no assessments yet
                            assessmentsCache = []
                            lastLoadTime = now
                            return []
                        }
                        // Unexpected error
                        assessmentsCache = []
                        lastLoadTime = now
                        return []
                    }
                }
                // Unexpected error with index
                assessmentsCache = []
                lastLoadTime = now
                return []
            } finally {
                isLoadingAssessments = false
            }
        }, 'assessments-index-load')
    }

    /**
     * Fallback method to scan datastore directly for assessments
     */
    const getAssessmentsFromDataStore = async () => {
        console.log('📊 getAssessmentsFromDataStore() called - scanning datastore directly')
        try {
            // Get all keys in the namespace
            console.log('📊 Querying datastore namespace:', NAMESPACE)
            const response = await engine.query({
                data: {
                    resource: `dataStore/${NAMESPACE}`
                }
            })
            
            const keys = response.data || []
            const assessmentKeys = keys.filter(key => key.startsWith(ASSESSMENT_KEY_PREFIX))
            
            console.log('📊 Found assessment keys:', assessmentKeys)
            
            // Load each assessment
            const assessments = []
            for (const key of assessmentKeys) {
                try {
                    const assessmentResponse = await engine.query({
                        data: {
                            resource: `dataStore/${NAMESPACE}/${key}`
                        }
                    })
                    
                    const assessment = assessmentResponse.data
                    // Create summary for list view
                    const assessmentSummary = {
                        id: assessment.id,
                        name: assessment.Info?.name || assessment.name || 'Unnamed Assessment',
                        status: assessment.Info?.status || assessment.status || 'draft',
                        assessmentType: assessment.Info?.assessmentType || assessment.assessmentType,
                        createdAt: assessment.createdAt || assessment.created,
                        lastUpdated: assessment.lastUpdated || assessment.updated,
                        createdBy: assessment.Info?.createdBy?.username || assessment.createdBy || 'system',
                        // Include full data for compatibility
                        Info: assessment.Info || assessment,
                        localDatasetsCreated: assessment.localDatasetsCreated || [],
                        // Ensure orgUnitMapping is available at top level for backward compatibility
                        orgUnitMapping: (assessment.Info?.Dhis2config?.orgUnitMapping) || []
                    }
                    
                    assessments.push(assessmentSummary)
                } catch (assessmentError) {
                    console.warn(`Failed to load assessment ${key}:`, assessmentError)
                }
            }
            
            console.log('📊 Loaded assessments from datastore scan:', assessments.length)
            
            // If we found assessments, rebuild the index
            if (assessments.length > 0) {
                console.log('📊 Rebuilding assessments index...')
                await rebuildAssessmentsIndex(assessments)
            }
            
            return assessments
            
        } catch (error) {
            if (error.details?.httpStatusCode === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
                console.log('📊 Datastore namespace does not exist yet - starting fresh')
                return []
            }
            console.error('❌ Error scanning datastore for assessments:', error)
            return []
        }
    }

    /**
     * Rebuild the assessments index from existing assessments
     */
    const rebuildAssessmentsIndex = async (assessments) => {
        try {
            const index = {
                assessments: assessments.map(assessment => ({
                    id: assessment.id,
                    name: assessment.name,
                    status: assessment.status,
                    assessmentType: assessment.assessmentType,
                    createdAt: assessment.createdAt,
                    lastUpdated: assessment.lastUpdated,
                    createdBy: assessment.createdBy
                })),
                lastUpdated: new Date().toISOString(),
                version: '3.0.0',
                structure: 'nested'
            }
            
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/assessments-index`,
                type: 'create',
                data: index
            })
            
            console.log('✅ Assessments index rebuilt successfully')
        } catch (error) {
            console.warn('⚠️ Failed to rebuild assessments index:', error)
        }
    }

    /**
     * Get single assessment
     */
    const getAssessment = async (assessmentId) => {
        try {
            const assessmentKey = getAssessmentKey(assessmentId)
            const response = await engine.query({
                data: {
                    resource: `dataStore/${NAMESPACE}/${assessmentKey}`
                }
            })
            
            // Log what we retrieved
            console.log('📥 Retrieved assessment:', {
                id: response.data.id,
                version: response.data.version,
                localDatasetsCreatedCount: response.data.localDatasetsCreated?.length || 0,
                hasLocalDatasetsCreated: !!response.data.localDatasetsCreated,
                assessmentKey
            })
            
            // Normalize structure: ensure Info.Dhis2config exists and remove top-level Dhis2config
            const normalized = response.data || {}
            if (normalized.Dhis2config) {
                normalized.Info = normalized.Info || {}
                if (!normalized.Info.Dhis2config) {
                    normalized.Info.Dhis2config = normalized.Dhis2config
                }
                delete normalized.Dhis2config
            }
            // Ensure Info.dataDimensionsQuality exists (fallback to dataQualityDimensions)
            if (normalized.Info) {
                normalized.Info.dataDimensionsQuality = normalized.Info.dataDimensionsQuality || normalized.Info.dataQualityDimensions || ['completeness', 'timeliness']
            }
            // Ensure each local dataset has smsConfig
            if (Array.isArray(normalized.localDatasetsCreated)) {
                normalized.localDatasetsCreated = normalized.localDatasetsCreated.map(ds => ({
                    ...ds,
                    smsConfig: ds.smsConfig || {
                        enabled: false,
                        autoGenerate: true,
                        separator: ',',
                        commands: [],
                        notifications: { enabled: true, recipients: [], events: ['data_received', 'validation_failed', 'completion_reminder'] },
                        messages: {
                            defaultMessage: 'Thanks! SMS received.',
                            successMessage: 'Saved.',
                            wrongFormatMessage: 'Wrong format.',
                            noUserMessage: 'Phone not linked to any user.',
                            moreThanOneOrgUnitMessage: 'Multiple org units linked to your user; please contact admin.',
                            emptyCodesMessage: 'No codes provided. Please include data codes.',
                            commandOnlyMessage: 'Command received without data. Please include codes.',
                            defaultReplyMessage: 'Thanks! SMS received.'
                        },
                        defaultCommandName: 'DQA_REGISTER',
                        lastGenerated: null,
                        generatedBy: normalized.Info?.lastModifiedBy?.username || normalized.Info?.createdBy?.username || 'system'
                    }
                }))
            }

            return normalized
        } catch (error) {
            if (error.details?.httpStatusCode === 404) {
                return null
            }
            throw error
        }
    }

    /**
     * Delete assessment
     */
    const deleteAssessment = async (assessmentId) => {
        try {
            const assessmentKey = getAssessmentKey(assessmentId)
            
            // Delete assessment
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/${assessmentKey}`,
                type: 'delete'
            })
            
            // Update index
            const response = await engine.query({
                data: {
                    resource: `dataStore/${NAMESPACE}/assessments-index`
                }
            })
            const index = response.data
            index.assessments = index.assessments.filter(a => a.id !== assessmentId)
            index.lastUpdated = new Date().toISOString()
            
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/assessments-index`,
                type: 'update',
                data: index
            })
            
            return true
        } catch (error) {
            console.error('❌ Error deleting assessment:', error)
            throw error
        }
    }

    /**
     * Clear assessments cache to force fresh load
     */
    const clearAssessmentsCache = () => {
        console.log('🧹 Clearing assessments cache')
        assessmentsCache = null
        lastLoadTime = 0
        isLoadingAssessments = false
    }

    return {
        initializeDataStore,
        saveAssessment,
        getAssessments,
        getAssessment,
        deleteAssessment,
        createAssessmentStructure,
        clearAssessmentsCache
    }
}