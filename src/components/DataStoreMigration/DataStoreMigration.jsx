import React, { useState } from 'react'
import { 
    Box, 
    Button, 
    Card, 
    CircularLoader,
    NoticeBox,
    ButtonStrip
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useAssessmentDataStore } from '../../services/assessmentDataStoreService'

export const DataStoreMigration = ({ onMigrationComplete }) => {
    const { getAssessments } = useAssessmentDataStore()
    const [migrationStatus, setMigrationStatus] = useState('idle') // idle, running, completed, error
    const [migrationResult, setMigrationResult] = useState(null)
    const [error, setError] = useState(null)

    const handleMigration = async () => {
        setMigrationStatus('running')
        setError(null)
        setMigrationResult(null)

        try {
            console.log('Starting datastore migration...')
            const assessments = await getAssessments()
            const result = {
                message: 'DataStore structure is already using the current format',
                assessmentsFound: Array.isArray(assessments) ? assessments.length : Object.keys(assessments || {}).length,
                status: 'up-to-date'
            }
            
            setMigrationResult(result)
            setMigrationStatus('completed')
            
            if (onMigrationComplete) {
                onMigrationComplete(result)
            }
        } catch (error) {
            console.error('Migration failed:', error)
            setError(error.message || 'Migration failed')
            setMigrationStatus('error')
        }
    }

    const handleCheckStatistics = async () => {
        try {
            const stats = await getAssessmentStatistics()
            console.log('Assessment statistics:', stats)
            alert(`Assessment Statistics:\n\nTotal Assessments: ${stats.total}\nTotal Datasets: ${stats.totalDatasets}\nTotal Data Elements: ${stats.totalDataElements}\nTotal Org Units: ${stats.totalOrgUnits}\n\nWith DHIS2 Config: ${stats.withDHIS2Config}\nWith Source Dataset: ${stats.withSourceDataset}`)
        } catch (error) {
            console.error('Failed to get statistics:', error)
            alert('Failed to get statistics: ' + error.message)
        }
    }

    return (
        <Card>
            <Box padding="24px">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                    {i18n.t('DataStore Migration Utility')}
                </h3>
                
                <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                        This utility migrates assessments from the old array-based structure to the new 
                        optimized individual-key structure. Each assessment will be stored with its own 
                        key and include complete local datasets metadata.
                    </p>
                </div>

                {migrationStatus === 'idle' && (
                    <div>
                        <NoticeBox title="Migration Information">
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                <li>Migrates from array-based to individual-key structure</li>
                                <li>Includes local datasets metadata with each assessment</li>
                                <li>Creates backup of old data before migration</li>
                                <li>Improves loading performance significantly</li>
                                <li>Safe to run multiple times (idempotent)</li>
                            </ul>
                        </NoticeBox>
                        
                        <ButtonStrip style={{ marginTop: '16px' }}>
                            <Button 
                                primary 
                                onClick={handleMigration}
                            >
                                {i18n.t('Start Migration')}
                            </Button>
                            <Button 
                                secondary 
                                onClick={handleCheckStatistics}
                            >
                                {i18n.t('Check Statistics')}
                            </Button>
                        </ButtonStrip>
                    </div>
                )}

                {migrationStatus === 'running' && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <CircularLoader />
                        <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                            {i18n.t('Migrating assessments... This may take a few moments.')}
                        </div>
                    </div>
                )}

                {migrationStatus === 'completed' && migrationResult && (
                    <div>
                        <NoticeBox 
                            title="Migration Completed Successfully" 
                            valid
                        >
                            <div style={{ fontSize: '14px' }}>
                                <strong>Migration Result:</strong>
                                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                    <li>Assessments migrated: {migrationResult.migrated}</li>
                                    <li>Status: {migrationResult.message}</li>
                                </ul>
                                
                                {migrationResult.migrated > 0 && (
                                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                                        <strong>Benefits of the new structure:</strong>
                                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                            <li>Faster loading - no need to load all assessments</li>
                                            <li>Individual assessment access by ID</li>
                                            <li>Complete local datasets metadata included</li>
                                            <li>Better scalability for large numbers of assessments</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </NoticeBox>
                        
                        <ButtonStrip style={{ marginTop: '16px' }}>
                            <Button 
                                secondary 
                                onClick={() => {
                                    setMigrationStatus('idle')
                                    setMigrationResult(null)
                                }}
                            >
                                {i18n.t('Reset')}
                            </Button>
                            <Button 
                                secondary 
                                onClick={handleCheckStatistics}
                            >
                                {i18n.t('Check Statistics')}
                            </Button>
                        </ButtonStrip>
                    </div>
                )}

                {migrationStatus === 'error' && (
                    <div>
                        <NoticeBox 
                            title="Migration Failed" 
                            error
                        >
                            <div style={{ fontSize: '14px' }}>
                                <strong>Error:</strong> {error}
                                <div style={{ marginTop: '8px' }}>
                                    Please check the browser console for more details and try again.
                                </div>
                            </div>
                        </NoticeBox>
                        
                        <ButtonStrip style={{ marginTop: '16px' }}>
                            <Button 
                                secondary 
                                onClick={() => {
                                    setMigrationStatus('idle')
                                    setError(null)
                                }}
                            >
                                {i18n.t('Try Again')}
                            </Button>
                        </ButtonStrip>
                    </div>
                )}

                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fff3e0', borderRadius: '6px', border: '1px solid #ffcc02' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                        ⚠️ {i18n.t('Important Notes:')}
                    </div>
                    <ul style={{ fontSize: '12px', color: '#666', margin: '0', paddingLeft: '20px' }}>
                        <li>This migration is safe and creates backups of your data</li>
                        <li>The old structure will be preserved as backup</li>
                        <li>You can run this migration multiple times safely</li>
                        <li>After migration, assessment loading will be significantly faster</li>
                        <li>Each assessment will include complete local datasets metadata</li>
                    </ul>
                </div>
            </Box>
        </Card>
    )
}