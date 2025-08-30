import React, { useMemo, useState } from 'react'
import { Button, NoticeBox, Tag, AlertBar } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useDataEngine } from '@dhis2/app-runtime'
import jsPDF from 'jspdf'
import { useNavigate } from 'react-router-dom'
import SmsCommandFixer from '../../../components/SmsCommandFixer'

/**
 * ReviewStep (no cards/rounded UI)
 * - Consumes mappingPayload produced by DatasetCreationModal
 * - Renders the required "ElementMapping" table (binder + 4 dataset columns)
 * - Shows created datasets and SMS commands
 * - Validates that everything needed exists; if so, enables "Save Assessment"
 * - Saving happens here (via saveAssessmentPayload prop)
 */

const prettyType = (t) => {
    const map = { register: 'Register', summary: 'Summary', reported: 'Reported', corrected: 'Corrected' }
    return map[(t || '').toLowerCase()] || t
}

const gatherFrom = (data) => {
    // accept multiple historical shapes
    const creation = data?.creationPayload || {}
    const mp = creation?.mappingPayload || data?.mappingPayload || data?.handoff?.mappingPayload || data?.savedPayload?.mappingPayload || {}
    const elementsMapping = mp?.elementsMapping || data?.elementMappings || creation?.elementMappings || []
    const created = creation?.localDatasets?.createdDatasets || data?.createdDatasets || []
    const smsCommands =
        (data?.sms?.commands) ||
        (creation?.sms?.commands) ||
        created.map((d) => d?.sms).filter(Boolean) ||
        []
    const selectedDatasets = Array.isArray(data?.selectedDatasets)
        ? data.selectedDatasets
        : (Array.isArray(data?.datasets) ? data.datasets : [])
    const selectedOrgUnits = Array.isArray(data?.selectedOrgUnits)
        ? data.selectedOrgUnits
        : (Array.isArray(data?.orgUnits) ? data.orgUnits : [])
    const selectedDataElements = Array.isArray(data?.selectedDataElements) ? data.selectedDataElements : (Array.isArray(data?.dataElements) ? data.dataElements : [])
    return { elementsMapping, created, smsCommands, selectedDatasets, selectedOrgUnits, selectedDataElements, mappingPayload: mp }
}

const ElementCell = ({ mappingForType }) => {
    if (!mappingForType) {
        return <div style={cellNoItem}>—</div>
    }
    const list = mappingForType.dataElements || []
    const transform = mappingForType.transform
    return (
        <div>
            {list.map((de, i) => {
                // Handle categoryOptionCombo safely - it could be an object with id, or just a string id
                const cocId = typeof de?.categoryOptionCombo === 'object' 
                    ? de.categoryOptionCombo?.id 
                    : de?.categoryOptionCombo
                const coc = cocId ? `@${cocId}` : ''
                const expr = de?.expression || (de?.id ? `#{${de.id}${cocId ? `.${cocId}` : ''}}` : '')
                return (
                    <div key={i} style={{ marginBottom: 6 }}>
                        <div><code>{de.code}</code>{coc && <code>{coc}</code>} — “{de.name || '—'}”</div>
                        <div style={{ fontSize: 12, color: '#666' }}>• expr <code>{expr}</code></div>
                    </div>
                )
            })}
            {transform && (
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                    • <span>transform:</span>{' '}
                    <code>{transform.type === 'sum' ? 'sum' : transform.expr ? `expr = ${transform.expr}` : transform.type}</code>
                </div>
            )}
        </div>
    )
}

const cellNoItem = {
    padding: 8,
    border: '1px dashed #ddd',
    background: '#fafafa',
    textAlign: 'center',
    color: '#999',
}

const ReviewStep = ({
                        assessmentData,
                        onBack,
                        saveAssessmentPayload,   // legacy internal save method
                        saving,
                        onDownload,
                        onPrint,
                        onSave,                 // parent-provided save handler (preferred)
                        buildPayload,          // parent-provided payload builder (preferred)
                        userInfo,              // user information for created/modified metadata
                    }) => {
    const [saveStatus, setSaveStatus] = useState(null) // success, error, null
    const [saveMessage, setSaveMessage] = useState('')
    const [isDownloading, setIsDownloading] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)
    const [isSavingLocal, setIsSavingLocal] = useState(false)
    
    const {
        elementsMapping,
        created,
        smsCommands,
        selectedDatasets,
        selectedOrgUnits,
        selectedDataElements,
        mappingPayload,
    } = useMemo(() => gatherFrom(assessmentData || {}), [assessmentData])

    const engine = useDataEngine()
    const navigate = useNavigate()

    const isReady = useMemo(() => {
        const has4 = ['register', 'summary', 'reported', 'corrected']
            .every((t) => created.find((d) => d.datasetType === t && d.id))
        const hasLinks = (elementsMapping || []).length > 0
        // Resolve selected arrays robustly
        const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets
        const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
        return !!(assessmentData?.name && (dsSel?.length || 0) > 0 && (ouSel?.length || 0) > 0 && has4 && hasLinks)
    }, [assessmentData, created, elementsMapping, selectedDatasets, selectedOrgUnits])

    // row source
    const rows = Array.isArray(elementsMapping) ? elementsMapping : []

    // Build complete Assessment Payload per requirements
    const buildFinalPayload = () => {
        const now = new Date().toISOString()
        const metaSource = (assessmentData?.metadataSource || 'local').toLowerCase()
        const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : (Array.isArray(selectedDatasets) ? selectedDatasets : [])
        const deSel = Array.isArray(selectedDataElements?.selected) ? selectedDataElements.selected : (Array.isArray(selectedDataElements) ? selectedDataElements : [])
        const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : (Array.isArray(selectedOrgUnits) ? selectedOrgUnits : [])
        const ouMap = metaSource === 'external' ? (assessmentData?.orgUnitMapping?.mappings || assessmentData?.orgUnitMappings || []) : 'N/A'

        return {
            id: assessmentData?.id || `assessment_${Date.now()}`,
            version: '3.0.0',
            structure: 'nested',
            createdAt: assessmentData?.createdAt || now,
            lastUpdated: now,
            metadataSource: metaSource, // local | external

            // Nested Info as required by list and datastore
            Info: {
                name: assessmentData?.name || '',
                description: assessmentData?.description || '',
                objectives: assessmentData?.objectives || '',
                scope: assessmentData?.scope || '',
                assessmentType: assessmentData?.assessmentType || 'baseline',
                priority: assessmentData?.priority || 'medium',
                methodology: assessmentData?.methodology || 'automated',
                frequency: assessmentData?.frequency || 'monthly',
                reportingLevel: assessmentData?.reportingLevel || 'facility',
                startDate: assessmentData?.startDate || '',
                endDate: assessmentData?.endDate || '',
                period: assessmentData?.period || '',
                dataQualityDimensions: assessmentData?.dataQualityDimensions || ['completeness', 'timeliness'],
                dataDimensionsQuality: assessmentData?.dataDimensionsQuality || assessmentData?.dataQualityDimensions || ['completeness', 'timeliness'],
                stakeholders: assessmentData?.stakeholders || [],
                riskFactors: assessmentData?.riskFactors || [],
                successCriteria: assessmentData?.successCriteria || '',
                successCriteriaPredefined: assessmentData?.successCriteriaPredefined || [],
                notes: assessmentData?.notes || '',
                notifications: assessmentData?.notifications !== undefined ? assessmentData.notifications : true,
                autoSync: assessmentData?.autoSync !== undefined ? assessmentData.autoSync : true,
                validationAlerts: assessmentData?.validationAlerts !== undefined ? assessmentData.validationAlerts : false,
                historicalComparison: assessmentData?.historicalComparison !== undefined ? assessmentData.historicalComparison : false,
                confidentialityLevel: assessmentData?.confidentialityLevel || 'internal',
                dataRetentionPeriod: assessmentData?.dataRetentionPeriod || '5years',
                publicAccess: assessmentData?.publicAccess !== undefined ? assessmentData.publicAccess : false,
                status: assessmentData?.status || 'draft',
                tags: assessmentData?.tags || [],
                customFields: assessmentData?.customFields || {},
                baselineAssessmentId: assessmentData?.baselineAssessmentId || null,
                // User information for tracking
                createdBy: userInfo ? {
                    id: userInfo.id,
                    username: userInfo.username,
                    displayName: userInfo.displayName || `${userInfo.firstName || ''} ${userInfo.surname || ''}`.trim() || userInfo.username,
                    firstName: userInfo.firstName,
                    surname: userInfo.surname
                } : null,
                lastModifiedBy: userInfo ? {
                    id: userInfo.id,
                    username: userInfo.username,
                    displayName: userInfo.displayName || `${userInfo.firstName || ''} ${userInfo.surname || ''}`.trim() || userInfo.username,
                    firstName: userInfo.firstName,
                    surname: userInfo.surname
                } : null,
                // Connection + selections nested under Dhis2config
                Dhis2config: {
                    info: assessmentData?.externalConfig || assessmentData?.dhis2Config?.info || {},
                    datasetsSelected: dsSel,
                    orgUnitMapping: ouMap,
                },
                smsConfig: {
                    ...(assessmentData?.smsConfig || {}),
                    commands: smsCommands || [],
                },
            },

            // Created datasets and mappings
            localDatasetsCreated: (created || []).map(d => ({
                id: d.id,
                name: d.name,
                code: d.code,
                datasetType: d.datasetType,
                alias: d.alias,
                categoryCombo: d.categoryCombo,
                periodType: d.periodType || 'Monthly',
                sms: d.sms || null,
                dataElements: d.dataElements || [],
                orgUnits: d.orgUnits || [],
                sharing: d.sharing || null,
                // Additional metadata from enhanced DatasetCreationModal
                shortName: d.shortName || '',
                formName: d.formName || '',
                description: d.description || '',
                timelyDays: d.timelyDays ?? 15,
                openFuturePeriods: d.openFuturePeriods ?? 0,
                expiryDays: d.expiryDays ?? 0,
                openPeriodsAfterCoEndDate: d.openPeriodsAfterCoEndDate ?? 0,
                version: d.version ?? 1,
                formType: d.formType || 'DEFAULT',
                status: d.status || 'unknown',
                elementsCount: d.elementsCount || (d.dataElements || []).length,
                orgUnitsCount: d.orgUnitsCount || (d.orgUnits || []).length,
            })),
            elementMappings: rows,
        }
    }

    const downloadFinalPayload = async () => {
        if (isDownloading) return
        
        try {
            setIsDownloading(true)
            const payload = typeof buildPayload === 'function' ? buildPayload() : buildFinalPayload()
            
            // Enhanced payload with metadata
            const enhancedPayload = {
                ...payload,
                exportInfo: {
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'DQA360 Assessment Tool',
                    version: '1.0.0',
                    format: 'DQA360-Assessment-JSON',
                    description: 'Complete assessment configuration including datasets, mappings, and SMS commands'
                }
            }
            
            const blob = new Blob([JSON.stringify(enhancedPayload, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            
            // Enhanced filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0]
            const safeName = (payload.Info?.name || payload.details?.name || 'assessment').replace(/[^a-zA-Z0-9]/g, '_')
            a.download = `DQA360_${safeName}_${timestamp}.json`
            
            a.href = url
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            
            setSaveStatus('success')
            setSaveMessage('Assessment payload downloaded successfully!')
            setTimeout(() => setSaveStatus(null), 3000)
            
        } catch (error) {
            console.error('Download failed:', error)
            setSaveStatus('error')
            setSaveMessage('Failed to download assessment payload')
            setTimeout(() => setSaveStatus(null), 5000)
        } finally {
            setIsDownloading(false)
        }
    }

    const handleSave = async () => {
        if (saving) return
        
        try {
            setSaveStatus(null)
            setSaveMessage('')
            
            const payload = typeof buildPayload === 'function' ? buildPayload() : buildFinalPayload()
            
            // Prefer parent onSave. After success, navigate to list.
            if (typeof onSave === 'function') {
                await onSave(payload)
                setSaveStatus('success')
                setSaveMessage(`Assessment "${payload.Info?.name || payload.details?.name}" saved successfully!`)
                navigate('/administration/assessments')
                return
            }

            // Legacy handler, then navigate
            if (typeof saveAssessmentPayload === 'function') {
                await saveAssessmentPayload(payload)
                setSaveStatus('success')
                setSaveMessage(`Assessment "${payload.Info?.name || payload.details?.name}" saved successfully!`)
                navigate('/administration/assessments')
                return
            }
            
            // Fallback: save directly to dataStore with unique key and update index
            const key = payload.id
            
            // Try to create new assessment
            try {
                await engine.mutate({ 
                    resource: `dataStore/dqa360/${key}`, 
                    type: 'create', 
                    data: payload 
                })
            } catch (createError) {
                // If creation fails (already exists), try update
                if (createError.message?.includes('already exists') || createError.httpStatusCode === 409) {
                    await engine.mutate({ 
                        resource: `dataStore/dqa360/${key}`, 
                        type: 'update', 
                        data: payload 
                    })
                } else {
                    throw createError
                }
            }
            
            // Update index with better error handling
            try {
                let idx
                try {
                    const res = await engine.query({ data: { resource: `dataStore/dqa360/assessments-index` } })
                    idx = res?.data || { assessments: [], lastUpdated: null }
                } catch (indexError) {
                    // Create index if it doesn't exist
                    idx = { assessments: [], lastUpdated: null }
                }
                
                const item = { 
                    id: key, 
                    name: payload.details?.name || key, 
                    createdAt: payload.createdAt, 
                    lastUpdated: payload.lastUpdated,
                    status: payload.details?.status || 'draft',
                    datasetsCount: payload.datasetsCreated?.length || 0,
                    mappingsCount: payload.dataElementsMappings?.length || 0
                }
                
                const exists = Array.isArray(idx.assessments) && idx.assessments.find((a) => a.id === key)
                const next = exists 
                    ? idx.assessments.map((a) => (a.id === key ? item : a)) 
                    : [...(idx.assessments || []), item]
                
                const updatedIndex = { 
                    ...idx, 
                    assessments: next, 
                    lastUpdated: new Date().toISOString() 
                }
                
                try {
                    await engine.mutate({ 
                        resource: `dataStore/dqa360/assessments-index`, 
                        type: 'update', 
                        data: updatedIndex 
                    })
                } catch (updateIndexError) {
                    // Try to create index if update fails
                    await engine.mutate({ 
                        resource: `dataStore/dqa360/assessments-index`, 
                        type: 'create', 
                        data: updatedIndex 
                    })
                }
            } catch (indexError) {
                console.warn('Failed to update assessments index:', indexError)
                // Don't fail the save operation for index issues
            }
            
            setSaveStatus('success')
            setSaveMessage(`Assessment "${payload.details?.name}" saved successfully to DHIS2 dataStore!`)
            navigate('/administration/assessments')
            
        } catch (error) {
            console.error('Save failed:', error)
            setSaveStatus('error')
            setSaveMessage(`Failed to save assessment: ${error.message || 'Unknown error'}`)
        }
    }

    const handlePrintSummary = async () => {
        if (isPrinting) return
        
        try {
            setIsPrinting(true)
            const payload = typeof buildPayload === 'function' ? buildPayload() : buildFinalPayload()
            
            const doc = new jsPDF({ unit: 'pt', format: 'a4' })
            const pageW = doc.internal.pageSize.getWidth()
            const pageH = doc.internal.pageSize.getHeight()
            const margin = 50
            const contentW = pageW - margin * 2
            let y = margin
            
            const ensureSpace = (need = 20) => {
                if (y + need > pageH - margin) {
                    doc.addPage()
                    y = margin
                }
            }
            
            const addSpacing = (space = 12) => {
                y += space
            }
            
            const writeLines = (text, { bold = false, font = 'helvetica', size = 12, color = [0, 0, 0], spacing = 18 } = {}) => {
                doc.setFont(font, bold ? 'bold' : 'normal')
                doc.setFontSize(size)
                doc.setTextColor(color[0], color[1], color[2])
                const lines = doc.splitTextToSize(text, contentW)
                for (const ln of lines) {
                    ensureSpace(spacing)
                    doc.text(ln, margin, y)
                    y += spacing
                }
            }

            // Enhanced color palette
            const primaryColor = [10, 94, 189]      // DQA360 Blue
            const secondaryColor = [0, 128, 96]     // Teal
            const accentColor = [255, 87, 34]       // Orange
            const textColor = [60, 60, 60]          // Dark Gray
            const lightTextColor = [120, 120, 120]  // Light Gray

            // Document Header
            writeLines('DQA360 Assessment Summary Report', { bold: true, size: 20, color: primaryColor, spacing: 24 })
            addSpacing(8)
            
            writeLines(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { size: 10, color: lightTextColor, spacing: 14 })
            addSpacing(20)

            // Assessment Details
            writeLines('Assessment Details', { bold: true, size: 16, color: primaryColor, spacing: 20 })
            addSpacing(8)
            
            const details = [
                { label: 'Name', value: payload.details?.name || '—' },
                { label: 'Description', value: payload.details?.description || '—' },
                { label: 'Period', value: payload.details?.period || '—' },
                { label: 'Frequency', value: payload.details?.frequency || '—' },
                { label: 'Start Date', value: payload.details?.startDate || '—' },
                { label: 'End Date', value: payload.details?.endDate || '—' },
                { label: 'Reporting Level', value: payload.details?.reportingLevel || '—' },
                { label: 'Status', value: payload.details?.status || 'draft' }
            ]
            
            details.forEach(item => {
                writeLines(`${item.label}: ${item.value}`, { size: 11, color: textColor, spacing: 16 })
            })
            addSpacing(20)

            // Connection Information
            writeLines('Connection Information', { bold: true, size: 16, color: primaryColor, spacing: 20 })
            addSpacing(8)
            
            writeLines(`Type: ${payload.connection?.type || 'local'}`, { size: 11, color: textColor, spacing: 16 })
            if (payload.connection?.info) {
                writeLines(`Base URL: ${payload.connection.info.baseUrl || '—'}`, { size: 11, color: textColor, spacing: 16 })
                writeLines(`Version: ${payload.connection.info.version || '—'}`, { size: 11, color: textColor, spacing: 16 })
            }
            addSpacing(20)

            // Summary Statistics
            writeLines('Summary Statistics', { bold: true, size: 16, color: primaryColor, spacing: 20 })
            addSpacing(8)
            
            const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets
            const deSel = Array.isArray(selectedDataElements?.selected) ? selectedDataElements.selected : selectedDataElements
            const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
            
            const stats = [
                { label: 'Datasets Selected', value: dsSel?.length || 0 },
                { label: 'Data Elements Selected', value: deSel?.length || 0 },
                { label: 'Organisation Units Selected', value: ouSel?.length || 0 },
                { label: 'DQA Datasets Created', value: `${created?.length || 0}/4` },
                { label: 'Element Mappings', value: rows.length },
                { label: 'SMS Commands', value: (smsCommands || []).length }
            ]
            
            stats.forEach(stat => {
                writeLines(`${stat.label}: ${stat.value}`, { size: 11, color: textColor, spacing: 16 })
            })
            addSpacing(20)

            // Created Datasets
            if (created && created.length > 0) {
                writeLines('Created DQA Datasets', { bold: true, size: 16, color: primaryColor, spacing: 20 })
                addSpacing(8)
                
                created.forEach((dataset, index) => {
                    writeLines(`${index + 1}. ${prettyType(dataset.datasetType)} Dataset`, { bold: true, size: 12, color: secondaryColor, spacing: 16 })
                    writeLines(`   Name: ${dataset.name || '—'}`, { size: 10, color: textColor, spacing: 14 })
                    writeLines(`   ID: ${dataset.id || '—'}`, { size: 10, color: textColor, spacing: 14 })
                    writeLines(`   Period Type: ${dataset.periodType || '—'}`, { size: 10, color: textColor, spacing: 14 })
                    addSpacing(8)
                })
                addSpacing(20)
            }

            // SMS Commands Summary
            if (smsCommands && smsCommands.length > 0) {
                writeLines('SMS Commands Summary', { bold: true, size: 16, color: primaryColor, spacing: 20 })
                addSpacing(8)
                
                smsCommands.forEach((cmd, index) => {
                    writeLines(`${index + 1}. ${prettyType(cmd.datasetType)} SMS Command`, { bold: true, size: 12, color: secondaryColor, spacing: 16 })
                    writeLines(`   Keyword: ${cmd.keyword || '—'}`, { size: 10, color: textColor, spacing: 14 })
                    writeLines(`   Codes: ${cmd.smsCodes?.length || 0}`, { size: 10, color: textColor, spacing: 14 })
                    writeLines(`   Status: ${cmd.created ? 'Created Successfully' : 'Creation Failed'}`, { size: 10, color: cmd.created ? [0, 128, 0] : [255, 0, 0], spacing: 14 })
                    addSpacing(8)
                })
                addSpacing(20)
            }

            // Element Mappings Summary
            if (rows && rows.length > 0) {
                writeLines('Element Mappings Summary', { bold: true, size: 16, color: primaryColor, spacing: 20 })
                addSpacing(8)
                
                writeLines(`Total mappings: ${rows.length}`, { size: 11, color: textColor, spacing: 16 })
                
                // Group by binder element
                const groupedMappings = rows.reduce((acc, row) => {
                    const binderName = row.binderElement?.name || 'Unknown'
                    if (!acc[binderName]) acc[binderName] = []
                    acc[binderName].push(row)
                    return acc
                }, {})
                
                Object.entries(groupedMappings).forEach(([binderName, mappings]) => {
                    writeLines(`${binderName}:`, { bold: true, size: 11, color: secondaryColor, spacing: 16 })
                    mappings.forEach(mapping => {
                        const types = ['register', 'summary', 'reported', 'corrected']
                        const mappedTypes = types.filter(type => mapping[type]?.dataElements?.length > 0)
                        writeLines(`   → Mapped to: ${mappedTypes.map(prettyType).join(', ') || 'None'}`, { size: 10, color: textColor, spacing: 14 })
                    })
                    addSpacing(4)
                })
            }

            // Footer
            addSpacing(30)
            writeLines('This report was generated by DQA360 Assessment Tool', { size: 9, color: lightTextColor, spacing: 12 })
            writeLines('For more information, visit the DQA360 documentation', { size: 9, color: lightTextColor, spacing: 12 })

            // Save PDF
            const timestamp = new Date().toISOString().split('T')[0]
            const safeName = (payload.details?.name || 'assessment').replace(/[^a-zA-Z0-9]/g, '_')
            doc.save(`DQA360_Assessment_Summary_${safeName}_${timestamp}.pdf`)
            
            setSaveStatus('success')
            setSaveMessage('Assessment summary printed to PDF successfully!')
            setTimeout(() => setSaveStatus(null), 3000)
            
        } catch (error) {
            console.error('Print failed:', error)
            setSaveStatus('error')
            setSaveMessage('Failed to generate assessment summary')
            setTimeout(() => setSaveStatus(null), 5000)
        } finally {
            setIsPrinting(false)
        }
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16 }}>
            <h1 style={{ margin: '8px 0' }}>Assessment Review</h1>

            {!isReady && (
                <NoticeBox warning title="Not ready to save">
                    Please make sure: name, selected datasets, organisation units, 4 DQA datasets created, and element mappings are all present.
                </NoticeBox>
            )}

            {/* Overview summary */}
            {(() => {
                const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets
                const deSel = Array.isArray(selectedDataElements?.selected) ? selectedDataElements.selected : selectedDataElements
                const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 8, margin: '12px 0' }}>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Datasets selected</div><div><strong>{dsSel?.length || 0}</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Org Units</div><div><strong>{ouSel?.length || 0}</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Data Elements</div><div><strong>{deSel?.length || 0}</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Created DQA datasets</div><div><strong>{created?.length || 0}/4</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>Cross-dataset links</div><div><strong>{rows.length}</strong></div></div>
                        <div><div style={{ color: '#666', fontSize: 12 }}>SMS Commands</div><div><strong>{(smsCommands || []).length}</strong></div></div>
                    </div>
                )
            })()}

            {/* 1. Details */}
            <h2 style={{ marginTop: 16 }}>Details</h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={th}>Field</th>
                            <th style={th}>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style={td}>Name</td><td style={td}>{assessmentData?.name || '—'}</td></tr>
                        <tr><td style={td}>Description</td><td style={td}>{assessmentData?.description || '—'}</td></tr>
                        <tr><td style={td}>Period</td><td style={td}>{assessmentData?.period || '—'}</td></tr>
                        <tr><td style={td}>Frequency</td><td style={td}>{assessmentData?.frequency || '—'}</td></tr>
                        <tr><td style={td}>Start</td><td style={td}>{assessmentData?.startDate || '—'}</td></tr>
                        <tr><td style={td}>End</td><td style={td}>{assessmentData?.endDate || '—'}</td></tr>
                        <tr><td style={td}>Reporting level</td><td style={td}>{assessmentData?.reportingLevel || '—'}</td></tr>
                        <tr><td style={td}>Status</td><td style={td}>{assessmentData?.status || 'draft'}</td></tr>
                    </tbody>
                </table>
            </div>

            {/* 2. Connection */}
            <h2 style={{ marginTop: 16 }}>Connection</h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={th}>Field</th>
                            <th style={th}>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style={td}>Type</td><td style={td}>{(assessmentData?.metadataSource || 'local').toLowerCase()}</td></tr>
                        {assessmentData?.dhis2Config?.info && (
                            <>
                                <tr><td style={td}>Base URL</td><td style={td}>{assessmentData.dhis2Config.info.baseUrl || '—'}</td></tr>
                                <tr><td style={td}>Version</td><td style={td}>{assessmentData.dhis2Config.info.version || '—'}</td></tr>
                                <tr><td style={td}>API</td><td style={td}>{assessmentData.dhis2Config.info.apiVersion || '—'}</td></tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 3. Datasets Selected */}
            <h2 style={{ marginTop: 16 }}>Datasets Selected</h2>
            {(() => {
                const dsSel = Array.isArray(selectedDatasets?.selected) ? selectedDatasets.selected : selectedDatasets
                return !dsSel || dsSel.length === 0 ? (
                    <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={th}>ID</th>
                                    <th style={th}>Code</th>
                                    <th style={th}>Name</th>
                                    <th style={th}>PeriodType</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dsSel.map((d, i) => (
                                    <tr key={i}>
                                        <td style={td}><code>{d.id || '—'}</code></td>
                                        <td style={td}><code>{d.code || '—'}</code></td>
                                        <td style={td}>{d.name || d.displayName || '—'}</td>
                                        <td style={td}>{d.periodType || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            {/* 4. DataElements Selected */}
            <h2 style={{ marginTop: 16 }}>DataElements Selected</h2>
            {(() => {
                const deSel = Array.isArray(selectedDataElements?.selected) ? selectedDataElements.selected : selectedDataElements
                return !deSel || deSel.length === 0 ? (
                    <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={th}>ID</th>
                                    <th style={th}>Code</th>
                                    <th style={th}>Name</th>
                                    <th style={th}>Value Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deSel.slice(0, 200).map((d, i) => (
                                    <tr key={i}>
                                        <td style={td}><code>{d.id || '—'}</code></td>
                                        <td style={td}><code>{d.code || '—'}</code></td>
                                        <td style={td}>{d.name || '—'}</td>
                                        <td style={td}>{d.valueType || '—'}</td>
                                    </tr>
                                ))}
                                {deSel.length > 200 && (
                                    <tr><td style={td} colSpan={4}>… {deSel.length - 200} more</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            {/* 5. OrganisationUnits Selected */}
            <h2 style={{ marginTop: 16 }}>OrganisationUnits Selected</h2>
            {(() => {
                const ouSel = Array.isArray(selectedOrgUnits?.selected) ? selectedOrgUnits.selected : selectedOrgUnits
                return !ouSel || ouSel.length === 0 ? (
                    <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={th}>ID</th>
                                    <th style={th}>Code</th>
                                    <th style={th}>Name</th>
                                    <th style={th}>Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ouSel.slice(0, 200).map((o, i) => (
                                    <tr key={i}>
                                        <td style={td}><code>{o.id || '—'}</code></td>
                                        <td style={td}><code>{o.code || '—'}</code></td>
                                        <td style={td}>{o.name || '—'}</td>
                                        <td style={td}>{o.level ?? '—'}</td>
                                    </tr>
                                ))}
                                {ouSel.length > 200 && (
                                    <tr><td style={td} colSpan={4}>… {ouSel.length - 200} more</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            {/* 6. OrgUnit Mapping */}
            <h2 style={{ marginTop: 16 }}>OrgUnit Mapping</h2>
            {(() => {
                const metaSource = (assessmentData?.metadataSource || 'local').toLowerCase()
                if (metaSource !== 'external') return <div style={{ padding: 8, border: '1px solid #eee' }}>N/A</div>
                const mappings = assessmentData?.orgUnitMapping?.mappings || assessmentData?.orgUnitMappings || []
                return mappings.length === 0 ? (
                    <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={th}>Source OrgUnit</th>
                                    <th style={th}>Target OrgUnit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappings.slice(0, 500).map((m, i) => (
                                    <tr key={i}>
                                        <td style={td}><code>{m.sourceId || m.source}</code></td>
                                        <td style={td}><code>{m.targetId || m.target}</code></td>
                                    </tr>
                                ))}
                                {mappings.length > 500 && (
                                    <tr><td style={td} colSpan={2}>… {mappings.length - 500} more</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            {/* 7. Datasets Created */}
            <h2 style={{ marginTop: 16 }}>Created DQA Datasets ({created?.length || 0})</h2>
            {(!created || created.length === 0) ? (
                <div style={{ padding: 8, border: '1px solid #eee' }}>No created datasets</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={th}>Type</th>
                            <th style={th}>Name</th>
                            <th style={th}>Code</th>
                            <th style={th}>UID</th>
                            <th style={th}>Elements</th>
                            <th style={th}>Org Units</th>
                            <th style={th}>Period</th>
                            <th style={th}>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(created || []).map((d, i) => (
                            <tr key={i}>
                                <td style={td}>{prettyType(d.datasetType)}</td>
                                <td style={td}>{d.name}</td>
                                <td style={td}><code>{d.code}</code></td>
                                <td style={td}><code>{d.id || '—'}</code></td>
                                <td style={td}>{d.elements || 0}</td>
                                <td style={td}>{d.orgUnits || 0}</td>
                                <td style={td}>{d.periodType || 'Monthly'}</td>
                                <td style={td}>{d.status === 'completed' ? '✅' : '❌'}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Element Mappings */}
            <h2 style={{ marginTop: 24 }}>🔗 Cross-Dataset Element Mappings ({rows.length})</h2>
            <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
                Each binder (<code>mappingId</code>) links related data elements across the 4 DQA datasets.
                The table shows codes, optional COC suffixes, expressions, and transforms.
            </div>
            {rows.length === 0 ? (
                <div style={{ padding: 8, border: '1px solid #eee' }}>
                    No mappings<br/>Run dataset creation to populate this table.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={th}>Binder (<code>mappingId</code>)</th>
                            <th style={th}>Register (dsA)</th>
                            <th style={th}>Summary (dsB)</th>
                            <th style={th}>Reported (dsC)</th>
                            <th style={th}>Corrected (dsD)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row, i) => {
                            // row.mappings: [{ dataset:{type,alias,id}, dataElements:[...] , transform? }]
                            const byType = {}
                            ;(row.mappings || []).forEach((m) => { byType[m.dataset?.type] = m })
                            return (
                                <tr key={row.mappingId || i}>
                                    <td style={td}>
                                        <div style={{ fontWeight: 600 }}>{row.mappingId}</div>
                                        <div style={{ fontSize: 12, color: '#666' }}>{row.dataElementName || '—'}</div>
                                        {row.valueType && <div style={{ fontSize: 12, color: '#999' }}>{row.valueType}</div>}
                                    </td>
                                    <td style={td}><ElementCell mappingForType={byType.register} /></td>
                                    <td style={td}><ElementCell mappingForType={byType.summary} /></td>
                                    <td style={td}><ElementCell mappingForType={byType.reported} /></td>
                                    <td style={td}><ElementCell mappingForType={byType.corrected} /></td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SMS commands */}
            <h2 style={{ marginTop: 24 }}>📱 SMS Commands ({(smsCommands || []).length})</h2>
            {(!smsCommands || smsCommands.length === 0) ? (
                <div style={{ padding: 8, border: '1px solid #eee' }}>None</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={th}>Dataset</th>
                            <th style={th}>Keyword</th>
                            <th style={th}>Separator</th>
                            <th style={th}>Template</th>
                            <th style={th}>Codes</th>
                            <th style={th}>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {smsCommands.map((c, i) => {
                            // Use configured separators like the Preview: keyword-data, code-code, code-value
                            const keywordDataSep = (c.keywordDataSeparator ?? c.separator ?? ' ')
                            const codeCodeSep = (c.codeSeparator ?? '.')
                            const codeValueSep = (c.codeValueSeparator ?? '.')

                            const sepLabel =
                                keywordDataSep === ' ' ? 'Space' :
                                keywordDataSep === ',' ? 'Comma' :
                                keywordDataSep === '.' ? 'Dot' :
                                keywordDataSep === ';' ? 'Semicolon' :
                                keywordDataSep === ':' ? 'Colon' :
                                keywordDataSep === '|' ? 'Pipe' :
                                keywordDataSep === '/' ? 'Slash' :
                                keywordDataSep === '-' ? 'Dash' :
                                keywordDataSep === '_' ? 'Underscore' :
                                keywordDataSep === '\t' ? 'Tab' : keywordDataSep

                            // Prefer rich entries with DE and COC if available
                            let entries = []
                            if (Array.isArray(c.smsCodes)) {
                                entries = c.smsCodes.map(sc => ({
                                    code: String(sc.code || ''),
                                    deName: String(sc.dataElement?.name || sc.dataElement?.displayName || sc.dataElement?.shortName || ''),
                                    cocName: String(sc.categoryOptionCombo?.displayName || sc.categoryOptionCombo?.name || '')
                                }))
                            } else if (Array.isArray(c.expandedCodes)) {
                                entries = c.expandedCodes.map(ec => ({
                                    code: String(ec.code || ec.smsCode || ''),
                                    deName: String(ec.dataElement?.name || ec.dataElement?.displayName || ''),
                                    cocName: String(ec.categoryOptionCombo?.name || '')
                                }))
                            } else if (Array.isArray(c.codes)) {
                                entries = c.codes.map(k => ({ code: String(k || '') }))
                            } else if (c.codes && typeof c.codes === 'object') {
                                entries = Object.keys(c.codes).map(k => ({ code: String(k || '') }))
                            }

                            // For backwards compatibility: if createdDatasets[].sms.smsCodes exists, merge into entries when same datasetType
                            if ((!entries || entries.length === 0) && Array.isArray(created)) {
                                const match = created.find(d => d?.sms?.smsCodes && (!c.datasetType || d.datasetType === c.datasetType))
                                if (match?.sms?.smsCodes) {
                                    entries = match.sms.smsCodes.map(sc => ({
                                        code: String(sc.code || ''),
                                        deName: String(sc.dataElement?.name || ''),
                                        cocName: String(sc.categoryOptionCombo?.name || '')
                                    }))
                                }
                            }

                            const codeList = entries.map(e => e.code)

                            // Build Final SMS Command (deterministic sample values like Preview)
                            const values = codeList.map((_, idx) => String((idx + 1) * 5))
                            const body = codeList.map((k, idx) => `${k}${codeValueSep}${values[idx]}`).join(codeCodeSep)
                            const finalCmd = `${c.keyword}${keywordDataSep}${body}`

                            // Short display with ellipsis if very long
                            const shortBody = codeList.slice(0, 3).map((k, idx) => `${k}${codeValueSep}<v${idx + 1}>`).join(codeCodeSep)
                            const template = `${c.keyword}${keywordDataSep}${shortBody}${codeList.length > 3 ? `${codeCodeSep}…` : ''}`

                            return (
                                <tr key={i}>
                                    <td style={td}>
                                        <Tag>{c.datasetType ? prettyType(c.datasetType) : '—'}</Tag>
                                    </td>
                                    <td style={td}><code>{c.keyword}</code></td>
                                    <td style={td}><code>{sepLabel}</code></td>
                                    <td style={td}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 520 }} title={finalCmd}>
                                            <code>{template}</code>
                                        </div>
                                    </td>
                                    <td style={td}>
                                        {codeList.length}
                                        {codeList.length ? ` (${entries.slice(0, 6).map(e => e.cocName ? `${String(e.code)}→${String(e.cocName)}` : String(e.code)).join(', ')}${codeList.length > 6 ? ', …' : ''})` : ''}
                                    </td>
                                    <td style={td}>{c.created ? '✅ created' : '❌ failed'}</td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SMS Command COC Fixer */}
            {created && created.length > 0 && smsCommands && smsCommands.length > 0 && (
                <SmsCommandFixer 
                    createdDatasets={created}
                    onFixed={(results) => {
                        console.log('SMS commands fixed:', results)
                        // Optionally refresh the assessment data or show a success message
                    }}
                />
            )}

            {/* Status Messages */}
            {saveStatus && (
                <div style={{ marginTop: 16 }}>
                    <AlertBar 
                        success={saveStatus === 'success'} 
                        critical={saveStatus === 'error'}
                        onHidden={() => setSaveStatus(null)}
                    >
                        {saveMessage}
                    </AlertBar>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
                {onBack && (
                    <Button secondary onClick={onBack}>
                        ← Back
                    </Button>
                )}
                
                <Button 
                    onClick={onDownload || downloadFinalPayload}
                    disabled={isDownloading}
                    loading={isDownloading}
                    icon={isDownloading ? undefined : '📥'}
                >
                    {isDownloading ? 'Downloading...' : 'Download JSON Payload'}
                </Button>
                
                <Button 
                    onClick={onPrint || handlePrintSummary}
                    disabled={isPrinting}
                    loading={isPrinting}
                    icon={isPrinting ? undefined : '🖨️'}
                >
                    {isPrinting ? 'Generating PDF...' : 'Print Summary'}
                </Button>
                
                <Button 
                    primary 
                    onClick={handleSave} 
                    disabled={!isReady || saving} 
                    loading={saving}
                    icon={saving ? undefined : '💾'}
                >
                    {saving ? 'Saving...' : '💾 Save Assessment'}
                </Button>
            </div>
            
            {/* Help Text */}
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4, fontSize: 12, color: '#666' }}>
                <strong>Actions Help:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    <li><strong>Download JSON Payload:</strong> Downloads the complete assessment configuration as a JSON file for backup or sharing</li>
                    <li><strong>Print Summary:</strong> Generates a comprehensive PDF report with all assessment details, statistics, and configurations</li>
                    <li><strong>Save Assessment:</strong> Saves the assessment to DHIS2 dataStore for future access and management</li>
                </ul>
            </div>
        </div>
    )
}

const th = { textAlign: 'left', borderBottom: '2px solid #ccc', padding: '10px 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.4px' }
const td = { borderBottom: '1px solid #eee', padding: '10px 8px', verticalAlign: 'top', fontSize: 14 }

export default ReviewStep