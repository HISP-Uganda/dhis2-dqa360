import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { CircularLoader, Tag, Button } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styles from './SMSCommandPreview.module.css'
import jsPDF from 'jspdf'

// Externalized SMS Preview with support for real COCs
const SMSCommandPreview = ({
    currentElements,
    datasets,
    activeTab,
    fetchRealCOCs,
    expandSmsCodesForCategoryOptions,
    fetchFullCategoryCombo,
    onComputed,
}) => {
    const [expandedCodesWithRealCOCs, setExpandedCodesWithRealCOCs] = useState([])
    const [loading, setLoading] = useState(false)
    // Collapsible state for Category Combo object per DE
    const [openCC, setOpenCC] = useState(() => new Set())
    
    const toggleCC = useCallback((id) => {
        setOpenCC(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])
    
    // Memoize element grouping to avoid recalculation on every render
    const elementGroups = useMemo(() => {
        const elementsByComboId = new Map()
        const defaultElements = []
        
        for (const de of currentElements) {
            const categoryCombo = de.fullCategoryCombo || de.originalCategoryCombo || de.categoryCombo
            const isDefaultCategoryCombo = !categoryCombo ||
                categoryCombo.id === 'bjDvmb4bfuf' ||
                String(categoryCombo.name || '').toLowerCase() === 'default'

            if (isDefaultCategoryCombo) {
                defaultElements.push(de)
            } else {
                const comboId = categoryCombo.id
                if (!elementsByComboId.has(comboId)) {
                    elementsByComboId.set(comboId, [])
                }
                elementsByComboId.get(comboId).push(de)
            }
        }
        
        return { elementsByComboId, defaultElements }
    }, [currentElements])

    useEffect(() => {
        let cancelled = false
        const withTimeout = (p, ms) => {
            return new Promise((resolve) => {
                let done = false
                const timer = setTimeout(() => { if (!done) resolve(null) }, ms)
                p.then(v => { if (!done) { done = true; clearTimeout(timer); resolve(v) } })
                 .catch(() => { if (!done) { done = true; clearTimeout(timer); resolve(null) } })
            })
        }

        const loadRealCOCs = async () => {
            setLoading(true)
            try {
                const expandedCodes = []
                const { elementsByComboId, defaultElements } = elementGroups
                
                // Process default elements immediately (no API calls needed)
                for (const de of defaultElements) {
                    const codes = expandSmsCodesForCategoryOptions(de)
                    expandedCodes.push(...codes)
                }
                
                // Process non-default elements in parallel batches with timeouts
                const comboPromises = Array.from(elementsByComboId.entries()).map(async ([comboId, elements]) => {
                    try {
                        // Try real COCs first with timeout
                        const realCOCs = await withTimeout(Promise.resolve(fetchRealCOCs(comboId)), 6000)
                        
                        if (Array.isArray(realCOCs) && realCOCs.length > 0) {
                            return elements.flatMap(de => expandSmsCodesForCategoryOptions(de, realCOCs))
                        } else {
                            // Fallback to full CC (also with timeout)
                            const firstElement = elements[0]
                            const fullCC = (firstElement.fullCategoryCombo && Array.isArray(firstElement.fullCategoryCombo.categories) && firstElement.fullCategoryCombo.categories.length > 0)
                                ? firstElement.fullCategoryCombo
                                : await withTimeout(Promise.resolve(fetchFullCategoryCombo(comboId)), 5000)
                            
                            if (fullCC && Array.isArray(fullCC.categories) && fullCC.categories.length > 0) {
                                const categories = fullCC.categories
                                const hasOptions = categories.every(cat => Array.isArray(cat.categoryOptions) && cat.categoryOptions.length > 0)
                                if (hasOptions) {
                                    const genCombos = (cats) => {
                                        if (cats.length === 0) return [[]]
                                        const [first, ...rest] = cats
                                        const restCombos = genCombos(rest)
                                        const out = []
                                        for (const opt of (first.categoryOptions || [])) {
                                            for (const r of restCombos) out.push([opt, ...r])
                                        }
                                        return out
                                    }
                                    const optionCombos = genCombos(categories)
                                    return elements.flatMap(de => optionCombos.map((opts, idx) => ({
                                        smsCode: `${de.smsCode}${idx + 1}`,
                                        categoryOptionCombo: {
                                            name: (opts || []).map(o => o?.name || o?.displayName || o?.shortName || o?.code || '').filter(Boolean).join(', ').trim() || 'default',
                                            code: (opts || []).map(o => o?.code || o?.shortName || o?.name || '').filter(Boolean).join('_').trim(),
                                            categoryOptions: opts,
                                        },
                                        displayName: `${de.displayName || de.name}${opts?.length ? ` (${opts.map(o => o?.name || o?.displayName || o?.shortName || o?.code || '').filter(Boolean).join(', ')})` : ''}`,
                                        dataElement: de,
                                    })))
                                }
                            }
                            // Final fallback
                            return elements.flatMap(de => expandSmsCodesForCategoryOptions(de))
                        }
                    } catch (_) {
                        return elements.flatMap(de => expandSmsCodesForCategoryOptions(de))
                    }
                })
                
                const comboResults = await Promise.all(comboPromises)
                for (const result of comboResults) expandedCodes.push(...(result || []))
                if (!cancelled) setExpandedCodesWithRealCOCs(expandedCodes)
            } catch (e) {
                const fallbackCodes = currentElements.flatMap(de => expandSmsCodesForCategoryOptions(de))
                if (!cancelled) setExpandedCodesWithRealCOCs(fallbackCodes)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        if (currentElements.length > 0) loadRealCOCs()
        return () => { cancelled = true }
    }, [elementGroups, fetchRealCOCs, expandSmsCodesForCategoryOptions, fetchFullCategoryCombo])

    // Notify parent with computed smsCodes so they can be persisted and reused
    // Avoid infinite parent-child update loops by snapshotting dataset cfg once per change
    const lastEmittedRef = useRef('')
    useEffect(() => {
        if (!onComputed) return
        if (!datasets || !activeTab) return
        if (!Array.isArray(expandedCodesWithRealCOCs)) return
        const cfg = (datasets && datasets[activeTab]) || {}
        // Build a stable signature: keyword + seps + codes length + first/last code
        const sig = JSON.stringify({
            k: cfg.smsKeyword || '',
            s: cfg.smsSeparator || ' ',
            cs: (cfg.smsCodeSeparator && cfg.smsCodeSeparator.length) ? cfg.smsCodeSeparator : '.',
            cvs: (cfg.smsCodeValueSeparator && cfg.smsCodeValueSeparator.length) ? cfg.smsCodeValueSeparator : '.',
            n: expandedCodesWithRealCOCs.length,
            a: expandedCodesWithRealCOCs[0]?.smsCode,
            b: expandedCodesWithRealCOCs[expandedCodesWithRealCOCs.length - 1]?.smsCode,
        })
        if (lastEmittedRef.current === sig) return
        lastEmittedRef.current = sig
        try {
            const command = {
                datasetType: activeTab,
                keyword: cfg.smsKeyword || '',
                separator: cfg.smsSeparator || ' ',
                codeSeparator: (cfg.smsCodeSeparator && cfg.smsCodeSeparator.length) ? cfg.smsCodeSeparator : '.',
                codeValueSeparator: (cfg.smsCodeValueSeparator && cfg.smsCodeValueSeparator.length) ? cfg.smsCodeValueSeparator : '.',
                smsCodes: expandedCodesWithRealCOCs.map(c => ({
                    code: c.smsCode,
                    dataElement: { id: c?.dataElement?.id },
                    categoryOptionCombo: c.categoryOptionCombo ? {
                        id: c.categoryOptionCombo.id || 'bjDvmb4bfuf',
                        name: c.categoryOptionCombo.name,
                        code: c.categoryOptionCombo.code,
                    } : { id: 'bjDvmb4bfuf' }
                }))
            }
            onComputed(command)
        } catch (_) {}
    }, [expandedCodesWithRealCOCs, onComputed, datasets, activeTab])

    const cfg = (datasets && datasets[activeTab]) || {}
    const keywordDataSep = cfg.smsSeparator || ' '
    const codeCodeSep = (cfg.smsCodeSeparator && cfg.smsCodeSeparator.length) ? cfg.smsCodeSeparator : '.'
    const codeValueSep = (cfg.smsCodeValueSeparator && cfg.smsCodeValueSeparator.length) ? cfg.smsCodeValueSeparator : '.'

    // Memoize computed values to avoid recalculation on every render
    const computedValues = useMemo(() => {
        // Build one code per DE for the command format (base code for default, first COC for non-default)
        const groupsByElement = currentElements.map(de => expandedCodesWithRealCOCs.filter(c => c.dataElement.id === de.id))
        const codesForFormat = groupsByElement.map(g => (g && g.length > 0 ? g[0] : null)).filter(Boolean)

        // Prepare text blocks per requested format (no borders)
        const baseLines = currentElements.map(de => `${de.smsCode}: ${de.name}`)
        const firstCodeLines = currentElements.map(de => {
            const group = expandedCodesWithRealCOCs.filter(c => c.dataElement.id === de.id)
            if (group.length === 0) return `${de.smsCode}: default`
            const first = group[0]
            return `${first.smsCode}: ${first.categoryOptionCombo ? (first.categoryOptionCombo.name || 'default') : 'default'}`
        })

        // All codes: include all expanded codes for every DE and COC
        const allCodesOrdered = currentElements.flatMap(de => expandedCodesWithRealCOCs.filter(c => c.dataElement.id === de.id))

        // NEW: Use all expanded DE-COC codes for the template and example
        const smsFormat = `${datasets[activeTab].smsKeyword}${keywordDataSep}${allCodesOrdered.map(c => `${c.smsCode}${codeValueSep}VALUE`).join(codeCodeSep)}`
        const smsExample = `${datasets[activeTab].smsKeyword}${keywordDataSep}${allCodesOrdered.map((c, i) => `${c.smsCode}${codeValueSep}${(i + 1) * 5}`).join(codeCodeSep)}`

        // Build final SMS commands with random values and compute SMS counts (160 chars per SMS)
        const randVal = () => Math.floor(Math.random() * 101)

        const minimalCodes = codesForFormat
        const minimalFinal = `${datasets[activeTab].smsKeyword}${keywordDataSep}${minimalCodes.map(c => `${c.smsCode}${codeValueSep}${randVal()}`).join(codeCodeSep)}`
        const minimalLen = minimalFinal.length
        const minimalSmsCount = Math.ceil(minimalLen / 160)

        const allCodesFinal = `${datasets[activeTab].smsKeyword}${keywordDataSep}${allCodesOrdered.map(c => `${c.smsCode}${codeValueSep}${randVal()}`).join(codeCodeSep)}`
        const allCodesLen = allCodesFinal.length
        const allCodesSmsCount = Math.ceil(allCodesLen / 160)
        
        return {
            codesForFormat,
            baseLines,
            firstCodeLines,
            smsFormat,
            smsExample,
            minimalFinal,
            minimalLen,
            minimalSmsCount,
            allCodesOrdered,
            allCodesFinal,
            allCodesLen,
            allCodesSmsCount
        }
    }, [currentElements, expandedCodesWithRealCOCs, datasets, activeTab, keywordDataSep, codeCodeSep, codeValueSep])
    
    const {
        codesForFormat,
        baseLines,
        firstCodeLines,
        smsFormat,
        smsExample,
        minimalFinal,
        minimalLen,
        minimalSmsCount,
        allCodesOrdered,
        allCodesFinal,
        allCodesLen,
        allCodesSmsCount
    } = computedValues

    if (loading) {
        return (
            <div className={styles.loaderWrap}>
                <CircularLoader small />
                <div className={styles.loaderText}>
                    {i18n.t('Loading real category option combos...')}
                </div>
            </div>
        )
    }

    // Export helpers with enhanced formatting and comprehensive content
    const exportPdf = () => {
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

        // Document Header with better spacing
        writeLines('DQA360 SMS Reporting User Guide', { bold: true, size: 20, color: primaryColor, spacing: 24 })
        addSpacing(8)
        
        const datasetName = datasets[activeTab]?.name || 'Dataset'
        const datasetType = ({ register: 'Register', summary: 'Summary', reported: 'Reported', corrected: 'Corrected' }[activeTab]) || 'General'
        
        writeLines(`${datasetType} Dataset: ${datasetName}`, { bold: true, size: 14, color: secondaryColor, spacing: 20 })
        addSpacing(16)

        // Introduction section with enhanced description
        writeLines('Overview', { bold: true, size: 16, color: primaryColor, spacing: 20 })
        addSpacing(8)
        
        const introText = `This comprehensive guide provides detailed instructions for SMS-based data reporting using the DQA360 system. ` +
            `The ${datasetType.toLowerCase()} dataset "${datasetName}" has been configured to accept data submissions via SMS messages. ` +
            `This document outlines the exact format, codes, and procedures required for successful data transmission.`
        
        writeLines(introText, { size: 11, color: textColor, spacing: 16 })
        addSpacing(20)

        // Configuration Details
        writeLines('SMS Configuration', { bold: true, size: 16, color: primaryColor, spacing: 20 })
        addSpacing(8)
        
        const configText = `The SMS system uses specific separators to parse your data correctly. Please ensure you follow these exact formatting rules:`
        writeLines(configText, { size: 11, color: textColor, spacing: 16 })
        addSpacing(12)
        
        // Configuration table with better formatting
        const configItems = [
            { label: 'Keyword-Data Separator', value: keywordDataSep === ' ' ? 'Space ( )' : `"${keywordDataSep}"`, desc: 'Separates the SMS keyword from data values' },
            { label: 'Code-Code Separator', value: codeCodeSep === ' ' ? 'Space ( )' : `"${codeCodeSep}"`, desc: 'Separates different data element codes' },
            { label: 'Code-Value Separator', value: codeValueSep === ' ' ? 'Space ( )' : `"${codeValueSep}"`, desc: 'Separates each code from its value' }
        ]
        
        configItems.forEach(item => {
            writeLines(`• ${item.label}: ${item.value}`, { bold: true, size: 10, color: secondaryColor, spacing: 14 })
            writeLines(`  ${item.desc}`, { size: 9, color: lightTextColor, spacing: 12 })
            addSpacing(4)
        })
        addSpacing(20)

        // SMS Command Template with enhanced presentation
        writeLines('SMS Command Template', { bold: true, size: 16, color: primaryColor, spacing: 20 })
        addSpacing(8)
        
        const templateDesc = `Use this exact template format when sending SMS data. Replace "VALUE" with your actual numeric data:`
        writeLines(templateDesc, { size: 11, color: textColor, spacing: 16 })
        addSpacing(12)
        
        // Enhanced template box with proper text wrapping
        const boxPadding = 15
        const templateBoxWidth = contentW - boxPadding * 2
        
        // Set font before measuring text
        doc.setFont('courier', 'bold')
        doc.setFontSize(12)
        const boxLines = doc.splitTextToSize(smsFormat, templateBoxWidth)
        const lineHeight = 16
        const boxHeight = Math.max(boxLines.length * lineHeight + boxPadding * 2, 50)
        ensureSpace(boxHeight + 20)
        
        // Template box with enhanced styling
        doc.setDrawColor(10, 94, 189)
        doc.setLineWidth(2)
        doc.setFillColor(240, 248, 255)
        doc.rect(margin, y, contentW, boxHeight, 'FD')
        
        doc.setTextColor(0, 0, 0)
        doc.setFont('courier', 'bold')
        doc.setFontSize(12)
        let ty = y + boxPadding + 12
        boxLines.forEach(ln => { 
            doc.text(ln, margin + boxPadding, ty)
            ty += lineHeight 
        })
        y += boxHeight + 20

        // Example section with multiple examples
        writeLines('SMS Examples', { bold: true, size: 16, color: primaryColor, spacing: 20 })
        addSpacing(8)
        
        const exampleDesc = `Here are practical examples showing how to format your SMS messages with sample data:`
        writeLines(exampleDesc, { size: 11, color: textColor, spacing: 16 })
        addSpacing(12)
        
        // Generate multiple examples with different data patterns
        const generateExample = (multiplier = 1, description = '') => {
            return allCodesOrdered.map((c, i) => {
                const value = Math.floor((i + 1) * 5 * multiplier)
                return `${c.smsCode}${codeValueSep}${value}`
            }).join(codeCodeSep)
        }
        
        const examples = [
            { desc: 'Example 1 - Basic data entry:', data: generateExample(1) },
            { desc: 'Example 2 - Higher values:', data: generateExample(2) },
            { desc: 'Example 3 - Mixed data:', data: allCodesOrdered.map((c, i) => `${c.smsCode}${codeValueSep}${[10, 25, 0, 15, 8, 32, 7][i % 7] || (i + 1) * 3}`).join(codeCodeSep) }
        ]
        
        examples.forEach((example, idx) => {
            writeLines(example.desc, { bold: true, size: 11, color: accentColor, spacing: 16 })
            const fullExample = `${datasets[activeTab].smsKeyword}${keywordDataSep}${example.data}`
            
            // Example box with proper text wrapping
            const exampleBoxPadding = 12
            const exampleBoxWidth = contentW - exampleBoxPadding * 2
            
            // Set font before measuring text
            doc.setFont('courier', 'normal')
            doc.setFontSize(11)
            const exampleLines = doc.splitTextToSize(fullExample, exampleBoxWidth)
            const exampleLineHeight = 14
            const exampleHeight = Math.max(exampleLines.length * exampleLineHeight + exampleBoxPadding * 2, 40)
            ensureSpace(exampleHeight + 10)
            
            doc.setDrawColor(255, 87, 34)
            doc.setLineWidth(1)
            doc.setFillColor(255, 248, 240)
            doc.rect(margin, y, contentW, exampleHeight, 'FD')
            
            doc.setTextColor(0, 0, 0)
            doc.setFont('courier', 'normal')
            doc.setFontSize(11)
            let ey = y + exampleBoxPadding + 12
            exampleLines.forEach(ln => { 
                doc.text(ln, margin + exampleBoxPadding, ey)
                ey += exampleLineHeight 
            })
            y += exampleHeight + 12
        })
        addSpacing(20)

        // Enhanced Code Reference Table
        writeLines('SMS Code Reference', { bold: true, size: 16, color: primaryColor, spacing: 20 })
        addSpacing(8)
        
        const codeRefDesc = `Each SMS code corresponds to a specific data element and category combination. Use this reference to understand what data each code represents:`
        writeLines(codeRefDesc, { size: 11, color: textColor, spacing: 16 })
        addSpacing(16)
        
        // Enhanced table with better formatting
        const codeColW = 80
        const gap = 15
        const dataColW = contentW - codeColW - gap
        
        const writeRow = (c1, c2, { header = false, alternate = false } = {}) => {
            const rowHeight = 18
            ensureSpace(rowHeight + 4)
            
            // Alternate row background
            if (alternate && !header) {
                doc.setFillColor(248, 248, 248)
                doc.rect(margin - 5, y - 2, contentW + 10, rowHeight, 'F')
            }
            
            const font = header ? 'helvetica' : 'helvetica'
            const size = header ? 12 : 10
            const bold = header
            const color = header ? primaryColor : textColor
            
            doc.setFont(font, bold ? 'bold' : 'normal')
            doc.setFontSize(size)
            doc.setTextColor(color[0], color[1], color[2])
            
            const c1Lines = doc.splitTextToSize(c1, codeColW)
            const c2Lines = doc.splitTextToSize(c2, dataColW)
            const rowLines = Math.max(c1Lines.length, c2Lines.length)
            
            for (let i = 0; i < rowLines; i++) {
                const t1 = c1Lines[i] || ''
                const t2 = c2Lines[i] || ''
                
                if (i === 0 || t1) {
                    doc.setFont(header ? 'helvetica' : 'courier', bold ? 'bold' : (i === 0 ? 'bold' : 'normal'))
                    doc.text(t1, margin, y)
                }
                
                if (i === 0 || t2) {
                    doc.setFont('helvetica', 'normal')
                    doc.text(t2, margin + codeColW + gap, y)
                }
                
                if (i < rowLines - 1) y += 14
            }
            y += rowHeight
        }
        
        // Table header
        writeRow('SMS Code', 'Data Element Description', { header: true })
        addSpacing(4)
        
        // Table rows with alternating colors
        allCodesOrdered.forEach((c, index) => {
            const deType = ({ register: 'REG', summary: 'SUM', reported: 'RPT', corrected: 'COR' }[activeTab]) || 'GEN'
            const deName = c.dataElement?.name || c.dataElement?.displayName || c.dataElement?.shortName || 'Data Element'
            const cocName = c.categoryOptionCombo ? (c.categoryOptionCombo.displayName || c.categoryOptionCombo.name || 'default') : 'default'
            const label = `${deType} - ${deName}${cocName !== 'default' ? ` (${cocName})` : ''}`
            
            writeRow(String(c.smsCode), label, { alternate: index % 2 === 1 })
        })
        
        addSpacing(20)

        // Usage Instructions
        writeLines('Usage Instructions', { bold: true, size: 16, color: primaryColor, spacing: 20 })
        addSpacing(8)
        
        const instructions = [
            '1. Collect your data from the register or source documents',
            '2. Format your SMS using the template above, replacing VALUE with actual numbers',
            '3. Send the SMS to the designated number provided by your system administrator',
            '4. Wait for confirmation message to ensure successful data submission',
            '5. Keep a record of sent messages for your own tracking purposes'
        ]
        
        instructions.forEach(instruction => {
            writeLines(instruction, { size: 11, color: textColor, spacing: 16 })
            addSpacing(4)
        })
        
        addSpacing(20)

        // Footer information
        writeLines('Important Notes', { bold: true, size: 14, color: accentColor, spacing: 18 })
        addSpacing(8)
        
        const notes = [
            '• Ensure all numeric values are accurate before sending',
            '• Do not include spaces within individual numbers',
            '• Contact your supervisor if you receive error messages',
            '• This guide is specific to the current dataset configuration'
        ]
        
        notes.forEach(note => {
            writeLines(note, { size: 10, color: lightTextColor, spacing: 14 })
            addSpacing(2)
        })

        // Save with enhanced filename
        const timestamp = new Date().toISOString().split('T')[0]
        doc.save(`${datasetName.replace(/[^a-zA-Z0-9]/g, '_')}_SMS_Guide_${timestamp}.pdf`)
    }

    const exportWord = () => {
        const title = 'DQA360 - SMS Reporting User Aide.'
        const sectionCss = `
            body { font-family: Arial, sans-serif; }
            h1 { color: #0A5EBD; }
            h2 { color: #008060; }
            h3 { color: #777; }
            pre { background: #f6f6f6; padding: 8px; border: 1px solid #ddd; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #E6F4EA; color: #145A32; border: 1px solid #C5E1CD; font-size: 12px }
        `
        const descHtml = allCodesOrdered.map(c => {
            const label = `${c.dataElement?.name || c.dataElement?.displayName || c.dataElement?.shortName || 'DE'} ${c.categoryOptionCombo ? (c.categoryOptionCombo.displayName || c.categoryOptionCombo.name) : 'default'}`
            return `<div>• <code class="badge">${c.smsCode}</code> — <span>${label}</span></div>`
        }).join('')
        const tableRows = allCodesOrdered.map(c => {
            const label = `${c.dataElement?.name || c.dataElement?.displayName || c.dataElement?.shortName || 'DE'} ${c.categoryOptionCombo ? (c.categoryOptionCombo.displayName || c.categoryOptionCombo.name) : 'default'}`
            return `<tr><td style=\"padding:4px 8px;vertical-align:top;font-family:Courier New,monospace\">${c.smsCode}</td><td style=\"padding:4px 8px;vertical-align:top\">${label}</td></tr>`
        }).join('')
        const datasetName = datasets[activeTab]?.name || ''
        const html = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>${title}</title><style>${sectionCss}</style></head><body>` +
            `<h1>${title}</h1>` +
            `<h2>${i18n.t('Separator Configuration:')} ${i18n.t('Keyword-Data')}: ${keywordDataSep === ' ' ? 'Space' : keywordDataSep}, ${i18n.t('Code-Code')}: ${codeCodeSep === ' ' ? 'Space' : codeCodeSep}, ${i18n.t('Code-Value')}: ${codeValueSep === ' ' ? 'Space' : codeValueSep}</h2>` +
            `<p style=\"color:#777\">This is an SMS reporting guide for the ${datasetName} dataset. Data must be recounted from a Register and formatted as below.</p>` +
            `<h3>${i18n.t('SMS Command Template')}</h3>` +
            `<pre style=\"border:1px solid #0A5EBD;background:#E6F0FF;padding:8px;white-space:pre-wrap;word-break:break-word\">${smsFormat}</pre>` +
            `<h3>${i18n.t('Description of Codes:')}</h3>` +
            `<table style=\"width:100%;border-collapse:collapse\">` +
            `<thead><tr><th style=\"text-align:left;padding:4px 8px\">SMS Code</th><th style=\"text-align:left;padding:4px 8px\">Data Element</th></tr></thead>` +
            `<tbody>${tableRows}</tbody>` +
            `</table>` +
            `</body></html>`
        const blob = new Blob([html], { type: 'application/msword' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${datasets[activeTab].name || 'sms-preview'}.doc`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 0)
    }

    return (
        <div>
            <div style={{ marginTop: 8, fontWeight: 600 }}>
                {i18n.t('Dataelement Category Option Combo allocated its SMS Codes')}
            </div>
            {!expandedCodesWithRealCOCs.length && (
                <div style={{ marginTop: 6 }}>
                    {loading ? (
                        <>
                            <div>{i18n.t('Loading real category option combos...')}</div>
                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>{i18n.t('Taking longer to generate preview.')}</div>
                        </>
                    ) : (
                        <div>{i18n.t('Preparing preview...')}</div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 6 }}>
                {currentElements.map(de => {
                    const deExpanded = expandedCodesWithRealCOCs.filter(c => c.dataElement.id === de.id)
                    const categoryCombo = de.fullCategoryCombo || de.originalCategoryCombo || de.categoryCombo
                    const isDefault = !categoryCombo || categoryCombo.id === 'bjDvmb4bfuf' || String(categoryCombo.name || '').toLowerCase() === 'default'
                    const count = deExpanded.length || (isDefault ? 1 : 0)

                    // Dataset type short label
                    const typeShort = ({ register: 'REG', summary: 'SUM', reported: 'RPT', corrected: 'COR' }[activeTab]) || 'GEN'

                    // Normalize DE name to avoid duplicate prefixes like "REG - REG - ..."
                    const rawDeName = (de.displayName || de.name || '').trim()
                    const prefixToken = `${typeShort} - `
                    const deNameNoPrefix = rawDeName.toUpperCase().startsWith(prefixToken.toUpperCase())
                        ? rawDeName.substring(prefixToken.length).trim()
                        : rawDeName

                    // For itemized lines: A1: REG - <DE name (no prefix)> <COC name>
                    const lines = (deExpanded.length > 0 ? deExpanded : [{ smsCode: de.smsCode, categoryOptionCombo: null }])
                        .map(c => {
                            const cocName = c.categoryOptionCombo ? (c.categoryOptionCombo.name || c.categoryOptionCombo.displayName || 'default') : 'default'
                            return `${c.smsCode}: ${typeShort} - ${deNameNoPrefix} ${cocName}`
                        })
                        .join('\n')

                    return (
                        <div key={de.id} style={{ marginBottom: 12 }}>
                            <div>📊 {typeShort} - {de.name}</div>
                            <div>{i18n.t('Expanded SMS Codes:')} ({count} {i18n.t('combinations')})</div>
                            <div style={{ marginTop: 2 }}>
                                <code style={{ whiteSpace: 'pre-wrap' }}>{lines}</code>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div style={{ marginTop: 12 }}>
                <strong>{i18n.t('FINAL SMS COMMAND TEMPLATE')}</strong>
                <div style={{ marginTop: 6 }}>
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{smsFormat}</code>
                </div>
            </div>

            <div style={{ marginTop: 12 }}>
                <strong>{i18n.t('FINAL SMS COMMAND examples (with random values)')}</strong>
                <div style={{ marginTop: 6 }}>
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{smsExample}</code>
                </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <Button small onClick={exportPdf}>{i18n.t('Export JOB AIDE (PDF)')}</Button>
                <Button small onClick={exportWord} secondary>{i18n.t('Download JOB AIDE (Word)')}</Button>
            </div>
        </div>
    )
}

export default SMSCommandPreview