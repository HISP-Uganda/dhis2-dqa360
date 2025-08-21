import React, { useState, useCallback } from 'react'
import { 
    Box, 
    Button, 
    ButtonStrip,
    NoticeBox,
    CircularLoader,
    Divider,
    IconDownload24,
    IconUpload24,
    IconSync24,
    IconInfo24,
    IconWarning24,
    IconView24,
    IconSettings24,
    Tag,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'
import { useTabBasedDataStore } from '../../../services/tabBasedDataStoreService'
import { useAssessmentDataStore } from '../../../services/assessmentDataStoreService'
import { DataStoreMigration } from '../../../components/DataStoreMigration/DataStoreMigration'
import { DataStoreDebugger } from '../../../components/DataStoreDebugger'
import { useDataStoreBackup } from '../../../services/dataStoreBackupService'

const SectionContainer = styled.div`
    background: white;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e0e0e0;
`

const SectionTitle = styled.h3`
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 12px;
`

const ActionGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
`

const ActionCard = styled.div`
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    background: #f8f9fa;
    transition: all 0.2s ease;
    
    &:hover {
        border-color: #1976d2;
        box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
        background: white;
    }
    
    .action-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        
        h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        
        .action-icon {
            width: 24px;
            height: 24px;
            color: #1976d2;
        }
    }
    
    .action-description {
        color: #666;
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: 16px;
    }
    
    .action-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
`

const StatusIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    
    &.success {
        color: #2e7d32;
    }
    
    &.warning {
        color: #f57c00;
    }
    
    &.info {
        color: #1976d2;
    }
`

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
`

const StatCard = styled.div`
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    
    .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: #1976d2;
        margin-bottom: 8px;
    }
    
    .stat-label {
        font-size: 14px;
        color: #666;
        font-weight: 500;
    }
`

export const DataStoreManagement = () => {
    const { migrateOldAssessments, loadAllAssessments, updateAssessmentTab } = useTabBasedDataStore()
    const { getAssessments } = useAssessmentDataStore()
    const { exportDataStore, importDataStore } = useDataStoreBackup()
    
    // State management
    const [loading, setLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)
    const [showMigration, setShowMigration] = useState(false)
    const [showDebugger, setShowDebugger] = useState(false)
    const [operationStats, setOperationStats] = useState({
        totalAssessments: 0,
        migratedAssessments: 0,
        lastMigration: null,
        lastExport: null
    })
    
    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        type: 'warning'
    })

    const showConfirmation = (title, message, action, type = 'warning') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            action,
            type
        })
    }
    
    const hideConfirmation = () => {
        setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            action: null,
            type: 'warning'
        })
    }
    
    // Clear messages after timeout
    const clearMessages = useCallback(() => {
        setTimeout(() => {
            setSuccessMessage(null)
            setErrorMessage(null)
        }, 5000)
    }, [])
    
    // Update operation stats
    const updateStats = useCallback((updates) => {
        setOperationStats(prev => ({
            ...prev,
            ...updates
        }))
    }, [])

    // Handle DataStore Migration
    const handleMigrateAssessments = async () => {
        const performMigration = async () => {
            setLoading(true)
            setErrorMessage(null)
            setSuccessMessage(null)
            
            try {
                console.log('🔄 Starting assessment migration...')
                const result = await migrateOldAssessments()
                updateStats({ totalAssessments: result.assessments })
                
                if (result.migrated > 0) {
                    setSuccessMessage(`✅ Migration completed successfully: ${result.migrated} assessments migrated to standard structure`)
                    updateStats({ 
                        migratedAssessments: result.migrated,
                        lastMigration: new Date().toISOString()
                    })
                } else {
                    setSuccessMessage('ℹ️ No assessments needed migration - all are already in standard format')
                }
                
                console.log('✅ Migration completed:', result)
            } catch (error) {
                console.error('❌ Migration failed:', error)
                setErrorMessage(`❌ Migration failed: ${error.message}`)
            } finally {
                setLoading(false)
                clearMessages()
                hideConfirmation()
            }
        }
        
        showConfirmation(
            'Confirm Assessment Migration',
            'This will migrate all assessments to the latest standard structure. This operation is safe but may take a few moments. Continue?',
            performMigration,
            'info'
        )
    }

    // Helper function to generate local dataset ID
    const generateLocalDatasetId = (suffix, timestamp) => {
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        return `local_ds_${suffix.replace('_', '')}_${timestamp}_${random}`
    }

    // Handle Fix Null DHIS2 IDs
    const handleFixNullDhis2Ids = async () => {
        const performFix = async () => {
            setLoading(true)
            setErrorMessage(null)
            setSuccessMessage(null)
            
            try {
                console.log('🔧 Starting fix for assessments with null dhis2Id values...')
                
                // Get all assessments
                const assessments = await loadAllAssessments()
                console.log(`📊 Found ${assessments.length} assessments to check`)
                
                const fixResults = {
                    total: assessments.length,
                    fixed: 0,
                    alreadyCorrect: 0,
                    errors: []
                }
                
                for (const assessment of assessments) {
                    try {
                        console.log(`🔍 Checking assessment: ${assessment.info?.name || assessment.id}`)
                        
                        // Check if this assessment has datasets with null dhis2Id
                        const hasNullDhis2Ids = assessment.localDatasets?.createdDatasets?.some(ds => ds.dhis2Id === null)
                        
                        if (!hasNullDhis2Ids) {
                            console.log(`✅ Assessment ${assessment.id} already has correct dhis2Id values`)
                            fixResults.alreadyCorrect++
                            continue
                        }
                        
                        console.log(`🔧 Fixing assessment ${assessment.id} with null dhis2Id values`)
                        
                        // Create a timestamp for this assessment (use existing createdAt or current time)
                        const assessmentTimestamp = assessment.localDatasets?.info?.createdAt 
                            ? new Date(assessment.localDatasets.info.createdAt).getTime()
                            : Date.now()
                        
                        // Fix each dataset
                        const fixedDatasets = assessment.localDatasets.createdDatasets.map(dataset => {
                            if (dataset.dhis2Id === null) {
                                // Generate a proper local ID based on the dataset type
                                const suffix = dataset.type || 'unknown'
                                const newLocalId = generateLocalDatasetId(suffix, assessmentTimestamp)
                                
                                console.log(`  📝 Fixing dataset ${dataset.name}: ${dataset.id} -> ${newLocalId}`)
                                
                                return {
                                    ...dataset,
                                    id: newLocalId,
                                    dhis2Id: newLocalId, // Set dhis2Id to the local ID since these are local datasets
                                    status: 'local',
                                    isLocal: true,
                                    fixedAt: new Date().toISOString()
                                }
                            }
                            return dataset
                        })
                        
                        // Update the assessment's localDatasets
                        const updatedLocalDatasets = {
                            ...assessment.localDatasets,
                            createdDatasets: fixedDatasets,
                            info: {
                                ...assessment.localDatasets.info,
                                creationStatus: 'completed', // Change from 'failed' to 'completed'
                                fixedAt: new Date().toISOString(),
                                fixNote: 'Fixed null dhis2Id values with proper local IDs'
                            }
                        }
                        
                        // Update the assessment in the datastore
                        await updateAssessmentTab(assessment.id, 'localDatasets', updatedLocalDatasets)
                        
                        console.log(`✅ Fixed assessment ${assessment.id}`)
                        fixResults.fixed++
                        
                    } catch (error) {
                        console.error(`❌ Error fixing assessment ${assessment.id}:`, error)
                        fixResults.errors.push({
                            assessmentId: assessment.id,
                            error: error.message
                        })
                    }
                }
                
                console.log('🎉 Fix operation completed!')
                console.log(`📊 Results:`)
                console.log(`  - Total assessments: ${fixResults.total}`)
                console.log(`  - Fixed: ${fixResults.fixed}`)
                console.log(`  - Already correct: ${fixResults.alreadyCorrect}`)
                console.log(`  - Errors: ${fixResults.errors.length}`)
                
                if (fixResults.fixed > 0) {
                    setSuccessMessage(`✅ Successfully fixed ${fixResults.fixed} assessment(s) with null dhis2Id values`)
                } else if (fixResults.alreadyCorrect === fixResults.total) {
                    setSuccessMessage('ℹ️ All assessments already have correct dhis2Id values')
                } else {
                    setSuccessMessage('ℹ️ Fix operation completed, but no assessments needed fixing')
                }
                
                if (fixResults.errors.length > 0) {
                    console.error('❌ Errors encountered:', fixResults.errors)
                    setErrorMessage(`⚠️ Fixed ${fixResults.fixed} assessments, but encountered ${fixResults.errors.length} errors`)
                }
                
            } catch (error) {
                console.error('❌ Error fixing assessments:', error)
                setErrorMessage(`❌ Failed to fix assessments: ${error.message}`)
            } finally {
                setLoading(false)
                clearMessages()
                hideConfirmation()
            }
        }
        
        showConfirmation(
            'Fix Null DHIS2 IDs',
            'This will fix assessments that have null dhis2Id values in their local datasets by generating proper local IDs. This operation is safe and will not affect working assessments. Continue?',
            performFix,
            'info'
        )
    }

    // Handle DataStore Export
    const handleExportDataStore = async () => {
        const performExport = async () => {
            setLoading(true)
            setErrorMessage(null)
            setSuccessMessage(null)
            
            try {
                console.log('🔄 Starting DataStore export...')
                await exportDataStore()
                setSuccessMessage('✅ DataStore exported successfully')
                updateStats({ lastExport: new Date().toISOString() })
                console.log('✅ Export completed')
            } catch (error) {
                console.error('❌ Export failed:', error)
                setErrorMessage(`❌ Export failed: ${error.message}`)
            } finally {
                setLoading(false)
                clearMessages()
                hideConfirmation()
            }
        }
        
        showConfirmation(
            'Confirm DataStore Export',
            'This will download a complete backup of your DataStore as a JSON file. Continue?',
            performExport,
            'info'
        )
    }

    // Handle DataStore Import
    const handleImportDataStore = async () => {
        const performImport = async () => {
            setLoading(true)
            setErrorMessage(null)
            setSuccessMessage(null)
            
            try {
                console.log('🔄 Starting DataStore import...')
                await importDataStore()
                setSuccessMessage('✅ DataStore imported successfully')
                console.log('✅ Import completed')
            } catch (error) {
                console.error('❌ Import failed:', error)
                setErrorMessage(`❌ Import failed: ${error.message}`)
            } finally {
                setLoading(false)
                clearMessages()
                hideConfirmation()
            }
        }
        
        showConfirmation(
            'Confirm DataStore Import',
            'This will restore your DataStore from a backup file. This operation will overwrite existing data. Continue?',
            performImport,
            'warning'
        )
    }

    // Handle Dataset Inspection
    const handleInspectDatasets = async () => {
        setLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null)
        
        try {
            console.log('🔄 Starting dataset inspection...')
            const assessments = await getAssessments()
            const assessmentCount = Array.isArray(assessments) ? assessments.length : Object.keys(assessments || {}).length
            setSuccessMessage(`✅ DataStore inspection completed: ${assessmentCount} assessments found`)
            console.log('✅ Inspection completed:', { assessmentCount })
        } catch (error) {
            console.error('❌ Inspection failed:', error)
            setErrorMessage(`❌ Inspection failed: ${error.message}`)
        } finally {
            setLoading(false)
            clearMessages()
        }
    }

    return (
        <div>
            {/* Success/Error Messages */}
            {successMessage && (
                <NoticeBox title={i18n.t('Success')} valid style={{ marginBottom: '24px' }}>
                    {successMessage}
                </NoticeBox>
            )}
            
            {errorMessage && (
                <NoticeBox title={i18n.t('Error')} error style={{ marginBottom: '24px' }}>
                    {errorMessage}
                </NoticeBox>
            )}

            {/* Loading Indicator */}
            {loading && (
                <Box display="flex" justifyContent="center" alignItems="center" style={{ marginBottom: '24px' }}>
                    <CircularLoader />
                    <span style={{ marginLeft: '12px' }}>{i18n.t('Processing...')}</span>
                </Box>
            )}

            {/* Statistics Overview */}
            <SectionContainer>
                <SectionTitle>
                    <IconInfo24 />
                    {i18n.t('DataStore Overview')}
                </SectionTitle>
                
                <StatsGrid>
                    <StatCard>
                        <div className="stat-value">{operationStats.totalAssessments}</div>
                        <div className="stat-label">{i18n.t('Total Assessments')}</div>
                    </StatCard>
                    <StatCard>
                        <div className="stat-value">{operationStats.migratedAssessments}</div>
                        <div className="stat-label">{i18n.t('Migrated Assessments')}</div>
                    </StatCard>
                    <StatCard>
                        <div className="stat-value">
                            {operationStats.lastMigration ? new Date(operationStats.lastMigration).toLocaleDateString() : '-'}
                        </div>
                        <div className="stat-label">{i18n.t('Last Migration')}</div>
                    </StatCard>
                    <StatCard>
                        <div className="stat-value">
                            {operationStats.lastExport ? new Date(operationStats.lastExport).toLocaleDateString() : '-'}
                        </div>
                        <div className="stat-label">{i18n.t('Last Export')}</div>
                    </StatCard>
                </StatsGrid>
            </SectionContainer>

            {/* Core Operations */}
            <SectionContainer>
                <SectionTitle>
                    <IconSync24 />
                    {i18n.t('Core Operations')}
                </SectionTitle>
                
                <ActionGrid>
                    <ActionCard>
                        <div className="action-header">
                            <IconSync24 className="action-icon" />
                            <h4>{i18n.t('Migrate Assessments')}</h4>
                        </div>
                        <div className="action-description">
                            {i18n.t('Convert assessments to the latest standard structure for improved performance and compatibility.')}
                        </div>
                        <div className="action-footer">
                            <StatusIndicator className="info">
                                <IconInfo24 />
                                {i18n.t('Safe Operation')}
                            </StatusIndicator>
                            <Button primary onClick={handleMigrateAssessments} disabled={loading}>
                                {i18n.t('Migrate')}
                            </Button>
                        </div>
                    </ActionCard>

                    <ActionCard>
                        <div className="action-header">
                            <IconDownload24 className="action-icon" />
                            <h4>{i18n.t('Export DataStore')}</h4>
                        </div>
                        <div className="action-description">
                            {i18n.t('Download a complete backup of your DataStore as a JSON file for safekeeping or migration.')}
                        </div>
                        <div className="action-footer">
                            <StatusIndicator className="success">
                                <IconView24 />
                                {i18n.t('Backup Ready')}
                            </StatusIndicator>
                            <Button primary onClick={handleExportDataStore} disabled={loading}>
                                {i18n.t('Export')}
                            </Button>
                        </div>
                    </ActionCard>

                    <ActionCard>
                        <div className="action-header">
                            <IconUpload24 className="action-icon" />
                            <h4>{i18n.t('Import DataStore')}</h4>
                        </div>
                        <div className="action-description">
                            {i18n.t('Restore your DataStore from a previously exported backup file.')}
                        </div>
                        <div className="action-footer">
                            <StatusIndicator className="warning">
                                <IconWarning24 />
                                {i18n.t('Overwrites Data')}
                            </StatusIndicator>
                            <Button primary onClick={handleImportDataStore} disabled={loading}>
                                {i18n.t('Import')}
                            </Button>
                        </div>
                    </ActionCard>

                    <ActionCard>
                        <div className="action-header">
                            <IconSettings24 className="action-icon" />
                            <h4>{i18n.t('Fix Null DHIS2 IDs')}</h4>
                        </div>
                        <div className="action-description">
                            {i18n.t('Fix assessments that have null dhis2Id values in their local datasets by generating proper local IDs.')}
                        </div>
                        <div className="action-footer">
                            <StatusIndicator className="warning">
                                <IconWarning24 />
                                {i18n.t('Data Repair')}
                            </StatusIndicator>
                            <Button primary onClick={handleFixNullDhis2Ids} disabled={loading}>
                                {i18n.t('Fix IDs')}
                            </Button>
                        </div>
                    </ActionCard>

                    <ActionCard>
                        <div className="action-header">
                            <IconInfo24 className="action-icon" />
                            <h4>{i18n.t('Inspect Datasets')}</h4>
                        </div>
                        <div className="action-description">
                            {i18n.t('Analyze dataset structures across all assessments to identify patterns and issues.')}
                        </div>
                        <div className="action-footer">
                            <StatusIndicator className="info">
                                <IconInfo24 />
                                {i18n.t('Analysis Tool')}
                            </StatusIndicator>
                            <Button primary onClick={handleInspectDatasets} disabled={loading}>
                                {i18n.t('Inspect')}
                            </Button>
                        </div>
                    </ActionCard>
                </ActionGrid>
            </SectionContainer>

            {/* Advanced Tools */}
            <SectionContainer>
                <SectionTitle>
                    <IconSettings24 />
                    {i18n.t('Advanced Tools')}
                </SectionTitle>
                
                <Box display="flex" gap="16px" style={{ marginBottom: '20px' }}>
                    <Button 
                        secondary 
                        onClick={() => setShowMigration(!showMigration)}
                    >
                        {showMigration ? i18n.t('Hide Migration Panel') : i18n.t('Show Migration Panel')}
                    </Button>
                    
                    <Button 
                        secondary 
                        onClick={() => setShowDebugger(!showDebugger)}
                    >
                        {showDebugger ? i18n.t('Hide DataStore Debugger') : i18n.t('Show DataStore Debugger')}
                    </Button>
                </Box>

                {showMigration && (
                    <Box style={{ marginBottom: '20px' }}>
                        <DataStoreMigration />
                    </Box>
                )}

                {showDebugger && (
                    <Box>
                        <DataStoreDebugger />
                    </Box>
                )}
            </SectionContainer>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <Modal onClose={hideConfirmation}>
                    <ModalTitle>{confirmModal.title}</ModalTitle>
                    <ModalContent>
                        <p>{confirmModal.message}</p>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button secondary onClick={hideConfirmation}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button 
                                primary={confirmModal.type === 'info'}
                                destructive={confirmModal.type === 'warning'}
                                onClick={() => {
                                    if (confirmModal.action) {
                                        confirmModal.action()
                                    }
                                }}
                            >
                                {i18n.t('Confirm')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </div>
    )
}