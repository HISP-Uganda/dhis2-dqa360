import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from '../Layout/Layout'
import { PageProvider } from '../../contexts/PageContext'
import { Dashboards } from '../../pages/Dashboards/Dashboards'
import { Assessments } from '../../pages/Assessments/Assessments'
import { Notifications } from '../../pages/Notifications/Notifications'
import { Administration } from '../../pages/Administration/Administration'
import { ViewAssessment } from '../../pages/ViewAssessment/ViewAssessment'
import { DQAData } from '../../pages/DQAData/DQAData'
import { DQAAnalysis } from '../../pages/DQAAnalysis/DQAAnalysis'
import { TestMultiSelect } from '../../pages/TestMultiSelect'
import DataStoreTest from '../DataStoreTest'
import { TestDataStore } from '../../pages/TestDataStore'
import { QuickDatasetSetup } from '../../pages/QuickDatasetSetup/QuickDatasetSetup'
import { DatasetPreparationTest } from '../../pages/Metadata/DatasetPreparationTest'
import { DQAModalTest } from '../../pages/Metadata/DQAModalTest'
import { TestDQAModal } from '../../pages/Metadata/TestDQAModal'
import { AuthorityGuard, DQAAdminGuard } from '../AuthorityGuard/AuthorityGuard'
// import DataStoreTest from '../DataStoreTest'

export const AppRouter = () => {
    return (
        <Router
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
            }}
        >
            <AuthorityGuard>
                <PageProvider>
                    <Layout>
                    <Routes>
                        {/* Main Navigation Routes */}
                        <Route path="/dashboards/*" element={<Dashboards />} />
                        <Route path="/assessments" element={<Assessments />} />
                        <Route path="/dqa-data/*" element={<DQAData />} />
                        <Route path="/dqa-analysis/*" element={<DQAAnalysis />} />
                        <Route path="/notifications/*" element={<Notifications />} />
                        
                        {/* Administration Routes (Admin Only) */}
                        <Route path="/administration/*" element={
                            <DQAAdminGuard>
                                <Administration />
                            </DQAAdminGuard>
                        } />
                        

                        
                        {/* Legacy View Routes for backward compatibility */}
                        <Route path="/dqa-data/view/:id" element={<ViewAssessment />} />
                        <Route path="/assessments/view/:id" element={<ViewAssessment />} />
                        <Route path="/dashboard" element={<Dashboards />} />
                        
                        {/* Utility Routes (Admin Only) */}
                        <Route path="/quick-dataset-setup" element={
                            <DQAAdminGuard>
                                <QuickDatasetSetup />
                            </DQAAdminGuard>
                        } />
                        
                        {/* Development/Testing Routes */}
                        <Route path="/test-multiselect" element={<TestMultiSelect />} />
                        <Route path="/test-datastore" element={<DataStoreTest />} />
                        <Route path="/test-datastore-new" element={<TestDataStore />} />
                        <Route path="/test-dataset-preparation" element={<DatasetPreparationTest />} />
                        <Route path="/test-dqa-modal" element={<DQAModalTest />} />
                        <Route path="/test-dqa-modal-simple" element={<TestDQAModal />} />
                        {/* Redirect root to dashboards for consistency */}
                        <Route path="/" element={<Dashboards />} />
                    </Routes>
                    </Layout>
                </PageProvider>
            </AuthorityGuard>
        </Router>
    )
}