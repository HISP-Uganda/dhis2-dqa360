import { useDataEngine } from '@dhis2/app-runtime'

// DHIS2 API service functions
export const dhis2Service = {
    // Fetch organization units (facilities)
    getOrganisationUnits: async (engine, level = 4) => {
        const query = {
            organisationUnits: {
                resource: 'organisationUnits',
                params: {
                    fields: 'id,displayName,code,level,parent[id,displayName]',
                    pageSize: 200,
                    page: 1,
                    filter: `level:eq:${level}`
                }
            }
        }
        return engine.query(query)
    },

    // Fetch data sets
    getDataSets: async (engine) => {
        const query = {
            dataSets: {
                resource: 'dataSets',
                params: {
                    fields: 'id,displayName,code,periodType,organisationUnits[id],dataSetElements[dataElement[id]]',
                    pageSize: 200,
                    page: 1
                }
            }
        }
        return engine.query(query)
    },

    // Fetch comprehensive dataset metadata (for external DHIS2 instances)
    getDataSetWithMetadata: async (baseUrl, username, password, dataSetId) => {
        try {
            const auth = btoa(`${username}:${password}`)
            const headers = {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }

            // Fetch dataset with related metadata. Keep fields reasonably sized to avoid large payloads.
            const response = await fetch(`${baseUrl}/api/dataSets/${dataSetId}.json?fields=id,displayName,name,code,shortName,description,periodType,categoryCombo[id,displayName,name,code],dataSetElements[dataElement[id,displayName,name,code,shortName,formName,description,valueType,domainType,aggregationType,categoryCombo[id,displayName,name,code,categories[id,displayName,name,code,categoryOptions[id,displayName,name,code]]]]],organisationUnits[id,displayName,name,code,shortName,description,level,path,parent[id,displayName,name,code]]`, {
                headers
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const dataSet = await response.json()
            
            // Enhance the dataset with additional computed properties
            const enhancedDataSet = {
                ...dataSet,
                source: 'dhis2',
                isDhis2: true,
                isCustom: false,
                // Add summary statistics
                totalDataElements: dataSet.dataSetElements?.length || 0,
                totalOrgUnits: dataSet.organisationUnits?.length || 0,
                // Group data elements by type
                dataElementsByType: dataSet.dataSetElements?.reduce((acc, dse) => {
                    const type = dse.dataElement.valueType || 'UNKNOWN'
                    if (!acc[type]) acc[type] = []
                    acc[type].push(dse.dataElement)
                    return acc
                }, {}) || {},
                // Group org units by level
                orgUnitsByLevel: dataSet.organisationUnits?.reduce((acc, ou) => {
                    const level = ou.level || 0
                    if (!acc[level]) acc[level] = []
                    acc[level].push(ou)
                    return acc
                }, {}) || {}
            }

            console.log(`📊 Fetched comprehensive metadata for dataset: ${dataSet.displayName}`)
            console.log(`   - Data Elements: ${enhancedDataSet.totalDataElements}`)
            console.log(`   - Organisation Units: ${enhancedDataSet.totalOrgUnits}`)
            console.log(`   - Period Type: ${dataSet.periodType}`)

            return enhancedDataSet
        } catch (error) {
            console.error('Error fetching dataset metadata:', error)
            throw error
        }
    },

    // Fetch multiple datasets with metadata (batch operation)
    getDataSetsWithMetadata: async (baseUrl, username, password, pageSize = 50) => {
        try {
            const auth = btoa(`${username}:${password}`)
            const headers = {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }

            // Use a lighter fields selection to avoid huge payloads that can cause network errors.
            const fields = [
                'id',
                'displayName',
                'name',
                'code',
                'shortName',
                'description',
                'periodType',
                'categoryCombo[id,displayName]',
                // Minimal org unit info for count display
                'organisationUnits[id]',
                // Keep only minimal info for elements for counting/display; full details retrieved on demand
                'dataSetElements[dataElement[id,displayName,name,code,shortName]]'
            ].join(',')

            // Clamp page size to a safe upper bound to avoid giant responses
            const effectivePageSize = Math.max(20, Math.min(200, pageSize || 50))

            let page = 1
            let allDataSets = []
            let pager = null

            /* eslint-disable no-constant-condition */
            while (true) {
                const url = `${baseUrl}/api/dataSets.json?fields=${encodeURIComponent(fields)}&pageSize=${effectivePageSize}&page=${page}`
                const response = await fetch(url, { headers })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()
                const pageDataSets = Array.isArray(data?.dataSets) ? data.dataSets : []

                allDataSets = allDataSets.concat(pageDataSets)
                pager = data?.pager || pager

                if (!pager || page >= (pager.pageCount || 1) || pageDataSets.length === 0) {
                    break
                }

                page += 1
            }
            /* eslint-enable no-constant-condition */

            const enhancedDataSets = allDataSets.map(dataSet => ({
                ...dataSet,
                source: 'dhis2',
                isDhis2: true,
                isCustom: false,
                totalDataElements: dataSet.dataSetElements?.length || 0,
                totalOrgUnits: dataSet.organisationUnits?.length || 0
            }))

            console.log(`📊 Fetched ${enhancedDataSets.length} datasets with light metadata (paged, pageSize=${effectivePageSize})`)

            return {
                dataSets: enhancedDataSets,
                pager
            }
        } catch (error) {
            console.error('Error fetching datasets metadata (light):', error)

            // Fallback: fetch minimal fields only to avoid oversized responses
            try {
                const auth = btoa(`${username}:${password}`)
                const headers = {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
                const minimalFields = ['id','displayName','name','periodType','organisationUnits[id]'].join(',')
                const url = `${baseUrl}/api/dataSets.json?fields=${encodeURIComponent(minimalFields)}&pageSize=50&page=1`
                const response = await fetch(url, { headers })
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const data = await response.json()
                const list = Array.isArray(data?.dataSets) ? data.dataSets : []
                console.warn(`ℹ️ Fallback used: fetched ${list.length} datasets with minimal fields`)
                return { dataSets: list.map(ds => ({ ...ds, isDhis2: true, isCustom: false })), pager: data?.pager }
            } catch (fallbackError) {
                console.error('Error fetching datasets metadata (fallback):', fallbackError)
                throw fallbackError
            }
        }
    },

    // Fetch data values for comparison
    getDataValues: async (engine, { dataSet, orgUnit, period }) => {
        const query = {
            dataValues: {
                resource: 'dataValueSets',
                params: {
                    dataSet,
                    orgUnit,
                    period
                }
            }
        }
        return engine.query(query)
    },

    // Submit data values to DHIS2
    submitDataValues: async (engine, dataValues) => {
        const mutation = {
            resource: 'dataValueSets',
            type: 'create',
            data: dataValues
        }
        return engine.mutate(mutation)
    },

    // Generate UIDs using DHIS2 ID API
    generateUIDs: async (engine, count = 1) => {
        const query = {
            ids: {
                resource: 'system/id',
                params: {
                    limit: count
                }
            }
        }
        return engine.query(query)
    },

    // Get current user info
    getCurrentUser: async (engine) => {
        const query = {
            me: {
                resource: 'me',
                params: {
                    fields: 'id,displayName,email,authorities,organisationUnits[id,displayName]'
                }
            }
        }
        return engine.query(query)
    },

    // Get periods
    getPeriods: async (engine, periodType = 'Quarterly') => {
        const query = {
            periods: {
                resource: 'periods',
                params: {
                    fields: 'id,displayName,startDate,endDate',
                    filter: `periodType:eq:${periodType}`,
                    pageSize: 200,
                    page: 1
                }
            }
        }
        return engine.query(query)
    },

    // Create assessment template dataset on local DHIS2
    createAssessmentDataSet: async (engine, dataSetConfig) => {
        const mutation = {
            resource: 'dataSets',
            type: 'create',
            data: dataSetConfig
        }
        return engine.mutate(mutation)
    },

    // Create data elements for assessment
    createDataElements: async (engine, dataElements) => {
        const mutation = {
            resource: 'dataElements',
            type: 'create',
            data: {
                dataElements
            }
        }
        return engine.mutate(mutation)
    },

    // Create category combinations for assessment
    createCategoryCombinations: async (engine, categoryCombos) => {
        const mutation = {
            resource: 'categoryCombos',
            type: 'create',
            data: {
                categoryCombos
            }
        }
        return engine.mutate(mutation)
    },

    // Get existing data elements to avoid duplicates
    getExistingDataElements: async (engine, codes) => {
        const query = {
            dataElements: {
                resource: 'dataElements',
                params: {
                    fields: 'id,code,displayName',
                    filter: codes.map(code => `code:eq:${code}`).join(','),
                    pageSize: 200,
                    page: 1
                }
            }
        }
        return engine.query(query)
    },

    // DHIS2 Data Store: Assessments CRUD
    getAssessments: async (engine) => {
        const query = {
            assessments: {
                resource: 'dataStore/dqa360/assessments',
                params: { pageSize: 500, page: 1 }
            }
        }
        try {
            const res = await engine.query(query)
            return res.assessments || []
        } catch (e) {
            if (e.details?.httpStatusCode === 404) return []
            throw e
        }
    },
    saveAssessment: async (engine, assessment) => {
        const mutation = {
            resource: 'dataStore/dqa360/assessments',
            type: 'update',
            data: assessment,
            id: assessment.id
        }
        return engine.mutate(mutation)
    },
    createAssessment: async (engine, assessment) => {
        const mutation = {
            resource: 'dataStore/dqa360/assessments',
            type: 'create',
            data: assessment,
            id: assessment.id
        }
        return engine.mutate(mutation)
    },
    deleteAssessment: async (engine, id) => {
        const mutation = {
            resource: `dataStore/dqa360/assessments/${id}`,
            type: 'delete'
        }
        return engine.mutate(mutation)
    },
}

// Custom hook for DHIS2 service
export const useDhis2Service = () => {
    const engine = useDataEngine()
    
    return {
        getOrganisationUnits: (level) => dhis2Service.getOrganisationUnits(engine, level),
        getDataSets: () => dhis2Service.getDataSets(engine),
        getDataValues: (params) => dhis2Service.getDataValues(engine, params),
        submitDataValues: (dataValues) => dhis2Service.submitDataValues(engine, dataValues),
        getCurrentUser: () => dhis2Service.getCurrentUser(engine),
        getPeriods: (periodType) => dhis2Service.getPeriods(engine, periodType),
        createAssessmentDataSet: (dataSetConfig) => dhis2Service.createAssessmentDataSet(engine, dataSetConfig),
        createDataElements: (dataElements) => dhis2Service.createDataElements(engine, dataElements),
        createCategoryCombinations: (categoryCombos) => dhis2Service.createCategoryCombinations(engine, categoryCombos),
        getExistingDataElements: (codes) => dhis2Service.getExistingDataElements(engine, codes),
        getAssessments: () => dhis2Service.getAssessments(engine),
        saveAssessment: (assessment) => dhis2Service.saveAssessment(engine, assessment),
        createAssessment: (assessment) => dhis2Service.createAssessment(engine, assessment),
        deleteAssessment: (id) => dhis2Service.deleteAssessment(engine, id)
    }
}