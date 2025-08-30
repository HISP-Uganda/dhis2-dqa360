import { useDataEngine } from '@dhis2/app-runtime'
import { handleDatastoreError, withSuppressed404s } from '../utils/errorHandler'
import { useAuditLog } from './auditService'

/**
 * Tab-based Service for managing assessments in DHIS2 dataStore
 * Organizes assessment data by tabs for easier editing and updating
 */

const NAMESPACE = 'dqa360'
// Keys use 'assessment_{timestamp}_{counter}' directly as ID; no extra prefix

/**
 * Custom hook for tab-based assessment dataStore operations
 */
export const useTabBasedDataStore = () => {
    const engine = useDataEngine()

    /**
     * Generate assessment key from ID (identity)
     */
    const getAssessmentKey = (assessmentId) => assessmentId

    /**
     * Initialize the dataStore namespace
     */
    const initializeDataStore = async () => {
        try {
            // Check if namespace exists by trying to query it
            await engine.query({
                data: {
                    resource: `dataStore/${NAMESPACE}`,
                    params: {}
                }
            })
        } catch (error) {
            if (error.details?.httpStatusCode === 404) {
                // Create namespace with initial structure
                await engine.mutate({
                    resource: `dataStore/${NAMESPACE}/assessments-index`,
                    type: 'create',
                    data: {
                        assessments: [],
                        lastUpdated: new Date().toISOString(),
                        version: '2.0.0' // Tab-based version
                    }
                })
                console.log('DataStore namespace initialized with tab-based structure')
            } else {
                throw error
            }
        }
    }

    /**
     * Save assessment with tab-based structure
     */
    const { logEvent } = useAuditLog()

    const saveAssessment = async (assessment) => {
        try {
            console.log('💾 Saving assessment with optimized structure:', assessment.id)
            
            // Skip datastore initialization if not needed (performance optimization)
            const skipInit = assessment.version === '2.0.0' && assessment.info && assessment.dhis2Config
            if (!skipInit) {
                await initializeDataStore()
            }
            
            // Optimize: If assessment already follows standard structure, use it directly
            let standardAssessment
            
            if (assessment.version === '2.0.0' && assessment.info && assessment.dhis2Config) {
                // Already in standard format - just update timestamp (fast path)
                standardAssessment = {
                    ...assessment,
                    lastUpdated: new Date().toISOString()
                }
                console.log('⚡ Assessment already in standard format - using fast path')
            } else {
                // Transform legacy format to standard format (only when needed)
                console.log('🔄 Transforming legacy assessment to standard format')
                const currentTime = new Date().toISOString()
                
                // Optimize: Only create objects that don't exist, reuse existing ones
                standardAssessment = {
                    // Core identification
                    id: assessment.id,
                    version: '2.0.0',
                    createdAt: assessment.createdAt || assessment.created || currentTime,
                    lastUpdated: currentTime,
                    
                    // Basic information tab - reuse existing if available
                    info: assessment.info || {
                        name: assessment.name || 'Untitled Assessment',
                        description: assessment.description || '',
                        frequency: assessment.frequency || 'monthly',
                        period: assessment.period || '',
                        status: assessment.status || 'draft',
                        createdBy: assessment.createdBy || 'system',
                        lastModifiedBy: assessment.lastModifiedBy || assessment.createdBy || 'system',
                        tags: assessment.tags || [],
                        notes: assessment.notes || assessment.objectives || ''
                    },
                    
                    // DHIS2 configuration tab - reuse existing if available
                    dhis2Config: assessment.dhis2Config || {
                        baseUrl: '',
                        username: '',
                        configured: false,
                        lastTested: null,
                        connectionStatus: 'not_tested',
                        version: '',
                        apiVersion: ''
                    },
                    
                    // Datasets tab - optimize array length calculation
                    datasets: assessment.datasets || (() => {
                        const selected = assessment.selectedDataSets || []
                        return {
                            selected,
                            metadata: {
                                totalSelected: selected.length,
                                lastUpdated: currentTime,
                                source: assessment.metadataSource || 'manual'
                            }
                        }
                    })(),
                    
                    // Data elements tab - optimize array length calculation
                    dataElements: assessment.dataElements || (() => {
                        const selected = assessment.selectedDataElements || []
                        return {
                            selected,
                            metadata: {
                                totalSelected: selected.length,
                                lastUpdated: currentTime,
                                source: assessment.metadataSource || 'manual'
                            },
                            mappings: assessment.dataElementMappings || {}
                        }
                    })(),
                    
                    // Organization units tab - optimize array length calculation
                    orgUnits: assessment.orgUnits || (() => {
                        const selected = assessment.selectedOrgUnits || []
                        return {
                            selected,
                            metadata: {
                                totalSelected: selected.length,
                                hierarchyLevels: [],
                                lastUpdated: currentTime
                            },
                            hierarchy: {}
                        }
                    })(),
                    
                    // Organization unit mapping tab - reuse existing if available
                    orgUnitMapping: assessment.orgUnitMapping || {
                        mappings: assessment.orgUnitMappings || [],
                        localOrgUnits: [],
                        mappingRules: {},
                        statistics: {
                            totalMappings: 0,
                            automaticMappings: 0,
                            manualMappings: 0,
                            unmappedCount: 0
                        }
                    },
                    
                    // Local datasets tab - reuse existing if available
                    localDatasets: assessment.localDatasets || {
                        info: {
                            totalDatasets: 0,
                            datasetTypes: [],
                            creationStatus: 'pending',
                            createdAt: null,
                            lastModified: null
                        },
                        createdDatasets: []
                    },
                    
                    // Statistics - reuse existing if available
                    statistics: assessment.statistics || {
                        dataQuality: {
                            completeness: null,
                            consistency: null,
                            accuracy: null,
                            timeliness: null
                        },
                        lastCalculated: null,
                        calculationDuration: null
                    }
                }
            }
            
            // Generate assessment key using standard format
            const assessmentKey = standardAssessment.id
            
            // Save to datastore (main operation)
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/${assessmentKey}`,
                type: 'update',
                data: standardAssessment
            })
            
            // Optimize: Run index update and audit logging in parallel (non-blocking)
            const backgroundTasks = [
                updateAssessmentInIndex(standardAssessment).catch(e => 
                    console.warn('Index update failed (non-blocking):', e)
                ),
                logEvent({
                    action: 'assessment.save',
                    entityType: 'assessment',
                    entityId: standardAssessment.id,
                    entityName: standardAssessment.info?.name,
                    status: 'success',
                    message: 'Assessment saved',
                    context: { version: standardAssessment.version },
                }).catch(e => 
                    console.warn('Audit log failed (non-blocking):', e)
                )
            ]
            
            // Don't wait for background tasks to complete - let them run async
            Promise.allSettled(backgroundTasks)

            console.log('✅ Assessment saved with standard DQA360 structure:', {
                id: standardAssessment.id,
                name: standardAssessment.info.name,
                version: standardAssessment.version,
                structure: {
                    info: !!standardAssessment.info.name,
                    dhis2Config: standardAssessment.dhis2Config.configured,
                    datasets: standardAssessment.datasets.metadata?.totalSelected || 0,
                    dataElements: standardAssessment.dataElements.metadata?.totalSelected || 0,
                    orgUnits: standardAssessment.orgUnits.metadata?.totalSelected || 0,
                    mappings: standardAssessment.orgUnitMapping.statistics?.totalMappings || 0,
                    localDatasets: standardAssessment.localDatasets.info?.totalDatasets || 0
                }
            })
            
            return standardAssessment
        } catch (error) {
            try {
                await logEvent({
                    action: 'assessment.save',
                    entityType: 'assessment',
                    entityId: assessment?.id || '',
                    entityName: assessment?.name || '',
                    status: 'failure',
                    message: error?.message || 'Error saving assessment',
                    context: { stack: error?.stack },
                })
            } catch (_) {}
            console.error('❌ Error saving assessment with standard structure:', error)
            throw error
        }
    }

    /**
     * Load assessment with tab-based structure
     */
    const loadAssessment = async (assessmentId) => {
        try {
            const assessmentKey = getAssessmentKey(assessmentId)
            
            const result = await engine.query({
                data: {
                    resource: `dataStore/${NAMESPACE}/${assessmentKey}`
                }
            })
            
            const assessment = result.data
            
            console.log('✅ Assessment loaded with tab-based structure:', {
                id: assessment.id,
                version: assessment.version,
                tabs: {
                    info: !!assessment.info?.name,
                    dhis2Config: !!assessment.dhis2Config?.baseUrl,
                    datasets: assessment.datasets?.selected?.length || 0,
                    dataElements: Object.keys(assessment.dataElements?.metadata || {}).length,
                    orgUnits: assessment.orgUnits?.selected?.length || 0,
                    orgUnitMapping: assessment.orgUnitMapping?.mappings?.length || 0,
                    localDatasets: assessment.localDatasets?.createdDatasets?.length || 0
                }
            })
            
            return assessment
        } catch (error) {
            console.error('❌ Error loading assessment:', error)
            throw error
        }
    }

    /**
     * Update specific tab data
     */
    const updateAssessmentTab = async (assessmentId, tabName, tabData, userInfo = null) => {
        try {
            const assessment = await loadAssessment(assessmentId)
            
            // Update specific tab
            assessment[tabName] = {
                ...assessment[tabName],
                ...tabData
            }
            assessment.lastUpdated = new Date().toISOString()
            
            // Update lastModifiedBy if user info is provided
            if (userInfo) {
                const username = userInfo.username || 'unknown'
                const firstName = userInfo.firstName || userInfo.name || ''
                const lastName = userInfo.surname || userInfo.lastName || ''
                
                let userString
                if (firstName && lastName) {
                    userString = `${username} (${firstName} ${lastName})`
                } else if (firstName) {
                    userString = `${username} (${firstName})`
                } else {
                    userString = username
                }
                
                assessment.lastModifiedBy = userString
                // Also update in the info tab if it exists
                if (assessment.info) {
                    assessment.info.lastModifiedBy = userString
                }
            }
            
            // Save updated assessment
            const assessmentKey = getAssessmentKey(assessmentId)
            
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/${assessmentKey}`,
                type: 'update',
                data: assessment
            })

            // Audit log (non-blocking)
            try {
                await logEvent({
                    action: 'assessment.updateTab',
                    entityType: 'assessment',
                    entityId: assessmentId,
                    entityName: assessment?.info?.name,
                    status: 'success',
                    message: `Tab updated: ${tabName}`,
                    context: { tab: tabName },
                    after: { [tabName]: tabData },
                })
            } catch (_) {}
            
            console.log(`✅ Assessment tab '${tabName}' updated successfully`)
            return assessment
        } catch (error) {
            console.error(`❌ Error updating assessment tab '${tabName}':`, error)
            throw error
        }
    }

    /**
     * Load all assessments
     */
    const loadAllAssessments = async () => {
        return await withSuppressed404s(async () => {
            try {
                console.log('📋 Loading legacy assessments from namespace:', NAMESPACE)
                
                // Try to get assessments index first
                let assessmentKeys = []
                try {
                    const indexResult = await engine.query({
                        data: {
                            resource: `dataStore/${NAMESPACE}/assessments-index`
                        }
                    })
                    assessmentKeys = indexResult.data.assessments || []
                    console.log('📋 Found legacy assessments index with', assessmentKeys.length, 'assessments')
                } catch (indexError) {
                  const errorResult = handleDatastoreError(indexError, 'Load legacy assessments index', NAMESPACE)
                    if (errorResult.expected) {
                          // Fallback to scanning the datastore directly
                        try {
                            const namespaceResult = await engine.query({
                                data: {
                                    resource: `dataStore/${NAMESPACE}`
                                }
                            })
                            
                            // Filter for assessment keys (exclude index and other metadata)
                            assessmentKeys = namespaceResult.data.filter(key => 
                                key.startsWith('assessment-') && 
                                !key.includes('-index') && 
                                !key.includes('-metadata')
                            )
                            console.log('📋 Found', assessmentKeys.length, 'legacy assessment keys by scanning')
                        } catch (scanError) {
                           const scanResult = handleDatastoreError(scanError, 'Scan legacy datastore', NAMESPACE)
                            if (scanResult.expected) {
                                return []
                            }
                             return []
                        }
                    } else {
                        throw indexError
                    }
                }
            
            if (assessmentKeys.length === 0) {
                console.log('📭 No legacy assessments found')
                return []
            }
            
            // Load all assessments
            const assessments = []
            for (const key of assessmentKeys) {
                try {
                    const result = await engine.query({
                        data: {
                            resource: `dataStore/${NAMESPACE}/${key}`
                        }
                    })
                    assessments.push(result.data)
                } catch (error) {
                    console.warn(`Failed to load assessment with key: ${key}`, error)
                }
            }
            
                console.log(`✅ Loaded ${assessments.length} assessments with tab-based structure`)
                return assessments
            } catch (error) {
                console.error('❌ Error loading assessments:', error)
                return []
            }
        }, 'legacy-assessments-load')
    }

    /**
     * Update assessment in index with standard structure
     */
    const updateAssessmentInIndex = async (assessment) => {
        try {
            const assessmentKey = assessment.id // Use direct ID as key in standard format
            
            // Get current index
            let indexData
            try {
                const result = await engine.query({
                    data: {
                        resource: `dataStore/${NAMESPACE}/assessments-index`
                    }
                })
                indexData = result.data
            } catch (error) {
                // Create new index if it doesn't exist
                console.log('📋 Creating new assessment index with standard structure')
                indexData = {
                    version: '2.0.0',
                    lastUpdated: new Date().toISOString(),
                    totalAssessments: 0,
                    assessments: [],
                    metadata: {
                        createdBy: 'system',
                        createdAt: new Date().toISOString(),
                        description: 'Master index of all DQA360 assessments'
                    }
                }
            }
            
            // Ensure assessments array exists and convert old format if needed
            if (!indexData.assessments || !Array.isArray(indexData.assessments)) {
                indexData.assessments = []
            }
            
            // Update to standard index format if needed
            if (!indexData.version || indexData.version !== '2.0.0') {
                console.log('🔄 Upgrading index to standard format')
                indexData = {
                    version: '2.0.0',
                    lastUpdated: new Date().toISOString(),
                    totalAssessments: indexData.assessments?.length || 0,
                    assessments: indexData.assessments || [],
                    metadata: {
                        createdBy: 'system',
                        createdAt: indexData.createdAt || new Date().toISOString(),
                        description: 'Master index of all DQA360 assessments'
                    }
                }
            }
            
            // Add or update assessment in index
            if (!indexData.assessments.includes(assessmentKey)) {
                indexData.assessments.push(assessmentKey)
                console.log(`📝 Added assessment ${assessmentKey} to index`)
            } else {
                console.log(`📝 Assessment ${assessmentKey} already in index`)
            }
            
            // Update index metadata
            indexData.totalAssessments = indexData.assessments.length
            indexData.lastUpdated = new Date().toISOString()
            
            // Save updated index
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/assessments-index`,
                type: 'update',
                data: indexData
            })
            
            console.log('✅ Assessment index updated with standard structure:', {
                totalAssessments: indexData.totalAssessments,
                latestAssessment: assessmentKey
            })
            
        } catch (error) {
            console.error('❌ Error updating assessment index:', error)
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
            
            // Remove from index
            const indexResult = await engine.query({
                data: {
                    resource: `dataStore/${NAMESPACE}/assessments-index`
                }
            })
            
            const indexData = indexResult.data
            indexData.assessments = indexData.assessments.filter(key => key !== assessmentKey)
            indexData.lastUpdated = new Date().toISOString()
            
            await engine.mutate({
                resource: `dataStore/${NAMESPACE}/assessments-index`,
                type: 'update',
                data: indexData
            })
            
            console.log(`✅ Assessment ${assessmentId} deleted successfully`)
        } catch (error) {
            console.error('❌ Error deleting assessment:', error)
            throw error
        }
    }

    /**
     * Simple migration function to convert old assessments
     */
    const migrateOldAssessments = async () => {
        try {
            console.log('🔄 Checking for old assessments to migrate...')
            
            // Check old namespace
            const oldNamespace = 'DQA360'
            let oldAssessments = []
            
            try {
                const keysResult = await engine.query({
                    data: { resource: `dataStore/${oldNamespace}` }
                })
                
                const keys = keysResult.data || []
                console.log(`📋 Found ${keys.length} keys in old namespace`)
                
                // Load potential assessments
                for (const key of keys) {
                    if (key.includes('assessment') || key.startsWith('assessment-')) {
                        try {
                            const result = await engine.query({
                                data: { resource: `dataStore/${oldNamespace}/${key}` }
                            })
                            
                            const data = result.data
                            if (data.name || data.selectedDataSets) {
                                oldAssessments.push({ key, data })
                            }
                        } catch (e) {
                            console.warn(`Failed to load ${key}:`, e)
                        }
                    }
                }
            } catch (e) {
                console.log('No old namespace found:', e.message)
                return { migrated: 0, message: 'No old assessments found' }
            }
            
            if (oldAssessments.length === 0) {
                return { migrated: 0, message: 'No old assessments to migrate' }
            }
            
            console.log(`🔄 Migrating ${oldAssessments.length} assessments...`)
            await initializeDataStore()
            
            let migrated = 0
            for (const { data } of oldAssessments) {
                try {
                    const newAssessment = {
                        id: data.id || `migrated_${Date.now()}_${migrated}`,
                        version: '2.0.0',
                        lastUpdated: new Date().toISOString(),
                        createdAt: data.created || data.createdAt || new Date().toISOString(),
                        
                        info: {
                            name: data.name || 'Migrated Assessment',
                            description: data.description || '',
                            frequency: data.frequency || 'monthly',
                            status: data.status || 'draft',
                            createdBy: data.createdBy || 'migrated'
                        },
                        
                        dhis2Config: {
                            baseUrl: data.dhis2Config?.baseUrl || '',
                            configured: !!(data.dhis2Config?.baseUrl)
                        },
                        
                        datasets: {
                            selected: data.selectedDataSets || []
                        },
                        
                        dataElements: {
                            selected: data.selectedDataElements || []
                        },
                        
                        orgUnits: {
                            selected: data.selectedOrgUnits || []
                        }
                    }
                    
                    await saveAssessment(newAssessment)
                    migrated++
                    console.log(`✅ Migrated: ${newAssessment.info.name}`)
                    
                } catch (e) {
                    console.error(`❌ Failed to migrate assessment:`, e)
                }
            }
            
            return { 
                migrated, 
                total: oldAssessments.length,
                message: `Migrated ${migrated} assessments` 
            }
            
        } catch (error) {
            console.error('❌ Migration failed:', error)
            throw error
        }
    }

    /**
     * Get local datasets for a specific assessment
     */
    const getAssessmentLocalDatasets = async (assessmentId) => {
        try {
            const assessments = await loadAllAssessments()
            const assessment = assessments.find(a => a.id === assessmentId)
            
            if (!assessment) {
                throw new Error(`Assessment with ID ${assessmentId} not found`)
            }
            
            return assessment.localDatasets || null
        } catch (error) {
            console.error('Error getting assessment local datasets:', error)
            throw error
        }
    }

    /**
     * Validate assessment completeness before activation
     */
    const validateAssessmentCompleteness = (assessment) => {
        const missing = []
        if (!assessment?.info?.name) missing.push('info.name')
        if (!assessment?.dhis2Config?.configured) missing.push('dhis2Config.configured')
        const dsSel = Array.isArray(assessment?.datasets?.selected) ? assessment.datasets.selected.length : 0
        if (dsSel <= 0) missing.push('datasets.selected')
        const deSel = Array.isArray(assessment?.dataElements?.selected) ? assessment.dataElements.selected.length : 0
        if (deSel <= 0) missing.push('dataElements.selected')
        const ouSel = Array.isArray(assessment?.orgUnits?.selected) ? assessment.orgUnits.selected.length : 0
        if (ouSel <= 0) missing.push('orgUnits.selected')
        const created = assessment?.localDatasets?.createdDatasets || []
        const createdCount = Array.isArray(created) ? created.length : (created ? Object.keys(created).length : 0)
        const creationStatus = assessment?.localDatasets?.info?.creationStatus
        if (!(creationStatus === 'completed' || createdCount >= 1)) {
            missing.push('localDatasets.createdDatasets')
        }
        return { passed: missing.length === 0, missing }
    }

    /**
     * Finalize assessment: validate and set status to active (or provided)
     */
    const finalizeAssessment = async (assessmentId, status = 'active') => {
        const assessmentKey = getAssessmentKey(assessmentId)
        // Load current assessment
        const result = await engine.query({
            data: { resource: `dataStore/${NAMESPACE}/${assessmentKey}` }
        })
        const assessment = result.data
        const validation = validateAssessmentCompleteness(assessment)
        if (!validation.passed) {
            const err = new Error(`Validation failed: missing ${validation.missing.join(', ')}`)
            err.validation = validation
            throw err
        }
        // Update statuses (root + info for compatibility)
        assessment.status = status
        if (!assessment.info) assessment.info = {}
        assessment.info.status = status
        assessment.lastUpdated = new Date().toISOString()

        await engine.mutate({
            resource: `dataStore/${NAMESPACE}/${assessmentKey}`,
            type: 'update',
            data: assessment
        })
        await updateAssessmentInIndex(assessment)
        return { success: true, status, validation }
    }

    return {
        saveAssessment,
        loadAssessment,
        updateAssessmentTab,
        loadAllAssessments,
        deleteAssessment,
        initializeDataStore,
        migrateOldAssessments,
        getAssessmentLocalDatasets,
        finalizeAssessment
    }
}