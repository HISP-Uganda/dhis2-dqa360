/**
 * Utility functions for handling periods and period calculations
 */

/**
 * Get DHIS2 period type from assessment frequency
 * NOTE: This is used for fallback only. In practice, dataset period type 
 * should come from the original DHIS2 dataset configuration.
 */
export const getPeriodTypeFromFrequency = (frequency) => {
    switch (frequency) {
        case 'daily':
            return 'Daily'
        case 'weekly':
            return 'Weekly'
        case 'monthly':
            return 'Monthly'
        case 'quarterly':
            return 'Quarterly'
        case 'annually':
            return 'Yearly'
        default:
            return 'Monthly'
    }
}

/**
 * Determine if multi-period data entry is needed
 * @param {string} assessmentFrequency - Assessment frequency (quarterly, annually, etc.)
 * @param {string} datasetPeriodType - Dataset period type from DHIS2 (Monthly, Weekly, etc.)
 * @returns {boolean} True if multiple periods are needed for data entry
 */
export const needsMultiPeriodEntry = (assessmentFrequency, datasetPeriodType) => {
    // Multi-period is needed when assessment frequency is broader than dataset period type
    const frequencyHierarchy = {
        'daily': 1,
        'weekly': 2, 
        'monthly': 3,
        'quarterly': 4,
        'annually': 5
    }
    
    const periodTypeHierarchy = {
        'Daily': 1,
        'Weekly': 2,
        'Monthly': 3,
        'Quarterly': 4,
        'Yearly': 5
    }
    
    const assessmentLevel = frequencyHierarchy[assessmentFrequency] || 3
    const datasetLevel = periodTypeHierarchy[datasetPeriodType] || 3
    
    return assessmentLevel > datasetLevel
}

/**
 * Get dataset period types from selected datasets
 * @param {Array} selectedDataSets - Array of selected datasets from DHIS2
 * @returns {Array} Array of unique period types found in the datasets
 */
export const getDatasetPeriodTypes = (selectedDataSets = []) => {
    const periodTypes = new Set()
    
    selectedDataSets.forEach(dataset => {
        if (dataset.periodType) {
            periodTypes.add(dataset.periodType)
        }
    })
    
    return Array.from(periodTypes)
}

/**
 * Calculate sub-periods within an assessment period based on dataset periodType
 * @param {string} assessmentPeriod - The assessment period (e.g., "2024Q1", "2024")
 * @param {string} assessmentFrequency - The assessment frequency (e.g., "quarterly", "annually")
 * @param {string} datasetPeriodType - The dataset period type from DHIS2 (e.g., "Monthly", "Weekly")
 * @returns {Array} Array of period objects with id, name, and displayName
 */
export const calculateSubPeriods = (assessmentPeriod, assessmentFrequency, datasetPeriodType) => {
    const periods = []
    
    try {
        // Handle quarterly assessment with monthly datasets
        if (assessmentFrequency === 'quarterly' && datasetPeriodType === 'Monthly') {
            const year = assessmentPeriod.substring(0, 4)
            const quarter = assessmentPeriod.substring(5, 6)
            
            const quarterMonths = {
                '1': ['01', '02', '03'],
                '2': ['04', '05', '06'],
                '3': ['07', '08', '09'],
                '4': ['10', '11', '12']
            }
            
            const months = quarterMonths[quarter] || []
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ]
            
            months.forEach(month => {
                const monthIndex = parseInt(month) - 1
                periods.push({
                    id: `${year}${month}`,
                    name: `${year}${month}`,
                    displayName: `${monthNames[monthIndex]} ${year}`,
                    periodType: 'Monthly'
                })
            })
        }
        
        // Handle quarterly assessment with weekly datasets
        else if (assessmentFrequency === 'quarterly' && datasetPeriodType === 'Weekly') {
            const year = parseInt(assessmentPeriod.substring(0, 4))
            const quarter = parseInt(assessmentPeriod.substring(5, 6))
            
            // Calculate weeks in the quarter (approximately 13 weeks per quarter)
            const startWeek = (quarter - 1) * 13 + 1
            const endWeek = quarter * 13
            
            for (let week = startWeek; week <= endWeek; week++) {
                const weekStr = week.toString().padStart(2, '0')
                periods.push({
                    id: `${year}W${weekStr}`,
                    name: `${year}W${weekStr}`,
                    displayName: `Week ${weekStr}, ${year}`,
                    periodType: 'Weekly'
                })
            }
        }
        
        // Handle annually assessment with quarterly datasets
        else if (assessmentFrequency === 'annually' && datasetPeriodType === 'Quarterly') {
            const year = assessmentPeriod
            
            for (let quarter = 1; quarter <= 4; quarter++) {
                periods.push({
                    id: `${year}Q${quarter}`,
                    name: `${year}Q${quarter}`,
                    displayName: `Q${quarter} ${year}`,
                    periodType: 'Quarterly'
                })
            }
        }
        
        // Handle annually assessment with monthly datasets
        else if (assessmentFrequency === 'annually' && datasetPeriodType === 'Monthly') {
            const year = assessmentPeriod
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ]
            
            for (let month = 1; month <= 12; month++) {
                const monthStr = month.toString().padStart(2, '0')
                periods.push({
                    id: `${year}${monthStr}`,
                    name: `${year}${monthStr}`,
                    displayName: `${monthNames[month - 1]} ${year}`,
                    periodType: 'Monthly'
                })
            }
        }
        
        // Handle monthly assessment with weekly datasets
        else if (assessmentFrequency === 'monthly' && datasetPeriodType === 'Weekly') {
            const year = parseInt(assessmentPeriod.substring(0, 4))
            const month = parseInt(assessmentPeriod.substring(4, 6))
            
            // Calculate weeks in the month (approximately 4-5 weeks)
            const weeksInMonth = getWeeksInMonth(year, month)
            
            weeksInMonth.forEach(week => {
                periods.push({
                    id: week.id,
                    name: week.id,
                    displayName: week.displayName,
                    periodType: 'Weekly'
                })
            })
        }
        
        // Handle monthly assessment with daily datasets
        else if (assessmentFrequency === 'monthly' && datasetPeriodType === 'Daily') {
            const year = parseInt(assessmentPeriod.substring(0, 4))
            const month = parseInt(assessmentPeriod.substring(4, 6))
            
            const daysInMonth = new Date(year, month, 0).getDate()
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dayStr = day.toString().padStart(2, '0')
                const monthStr = month.toString().padStart(2, '0')
                periods.push({
                    id: `${year}${monthStr}${dayStr}`,
                    name: `${year}${monthStr}${dayStr}`,
                    displayName: `${dayStr}/${monthStr}/${year}`,
                    periodType: 'Daily'
                })
            }
        }
        
        // If periods match or no sub-periods needed, return the original period
        else {
            periods.push({
                id: assessmentPeriod,
                name: assessmentPeriod,
                displayName: formatPeriodDisplay(assessmentPeriod, assessmentFrequency),
                periodType: getPeriodTypeFromFrequency(assessmentFrequency)
            })
        }
        
    } catch (error) {
        console.error('Error calculating sub-periods:', error)
        // Fallback to original period
        periods.push({
            id: assessmentPeriod,
            name: assessmentPeriod,
            displayName: assessmentPeriod,
            periodType: getPeriodTypeFromFrequency(assessmentFrequency)
        })
    }
    
    return periods
}

/**
 * Get weeks in a specific month
 */
const getWeeksInMonth = (year, month) => {
    const weeks = []
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    
    // Simple approximation - get week numbers for the month
    let currentDate = new Date(firstDay)
    let weekNumber = getWeekNumber(currentDate)
    
    while (currentDate <= lastDay) {
        const currentWeek = getWeekNumber(currentDate)
        if (currentWeek !== weekNumber) {
            weeks.push({
                id: `${year}W${weekNumber.toString().padStart(2, '0')}`,
                displayName: `Week ${weekNumber}, ${year}`
            })
            weekNumber = currentWeek
        }
        currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Add the last week
    weeks.push({
        id: `${year}W${weekNumber.toString().padStart(2, '0')}`,
        displayName: `Week ${weekNumber}, ${year}`
    })
    
    return weeks
}

/**
 * Get ISO week number
 */
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/**
 * Format period for display
 */
const formatPeriodDisplay = (period, frequency) => {
    switch (frequency) {
        case 'quarterly':
            const year = period.substring(0, 4)
            const quarter = period.substring(5, 6)
            return `Q${quarter} ${year}`
        case 'annually':
            return period
        case 'monthly':
            const monthYear = period.substring(0, 4)
            const month = period.substring(4, 6)
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ]
            return `${monthNames[parseInt(month) - 1]} ${monthYear}`
        default:
            return period
    }
}

/**
 * Check if sub-periods are needed
 */
export const needsSubPeriods = (assessmentFrequency, datasetPeriodType) => {
    const frequencyHierarchy = {
        'daily': 1,
        'weekly': 2,
        'monthly': 3,
        'quarterly': 4,
        'annually': 5
    }
    
    const periodTypeHierarchy = {
        'Daily': 1,
        'Weekly': 2,
        'Monthly': 3,
        'Quarterly': 4,
        'Yearly': 5
    }
    
    const assessmentLevel = frequencyHierarchy[assessmentFrequency] || 3
    const datasetLevel = periodTypeHierarchy[datasetPeriodType] || 3
    
    return assessmentLevel > datasetLevel
}

/**
 * Get period type display name
 */
export const getPeriodTypeDisplayName = (periodType) => {
    const displayNames = {
        'Daily': 'Daily',
        'Weekly': 'Weekly',
        'Monthly': 'Monthly',
        'Quarterly': 'Quarterly',
        'Yearly': 'Yearly'
    }
    return displayNames[periodType] || periodType
}