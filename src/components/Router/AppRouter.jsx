import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from '../Layout/Layout'
import { PageProvider } from '../../contexts/PageContext'
import { Dashboard } from '../../pages/Dashboard/Dashboard'
import { Assessments } from '../../pages/Assessments/Assessments'
import { Administration } from '../../pages/Administration/Administration'
import { ViewAssessment } from '../../pages/ViewAssessment/ViewAssessment'
import { DQAData } from '../../pages/DQAData/DQAData'
import { DQAAnalysis } from '../../pages/DQAAnalysis/DQAAnalysis'
import { DQAReports } from '../../pages/DQAReports/DQAReports'
import { Reports } from '../../pages/Reports/Reports'
import { Metadata } from '../../pages/Metadata/Metadata'
import { Help } from '../../pages/Help/Help'
import { ManageAssessments } from '../../pages/ManageAssessments/ManageAssessments'
import { AuthorityGuard, DQAAdminGuard } from '../AuthorityGuard/AuthorityGuard'

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
                        <Route path="/dashboard/*" element={<Dashboard />} />
                        <Route path="/assessments/*" element={<Assessments />} />
                        <Route path="/manage-assessments/*" element={<ManageAssessments />} />
                        <Route path="/dqa-data/*" element={<DQAData />} />
                        <Route path="/dqa-analysis/*" element={<DQAAnalysis />} />
                        <Route path="/dqa-reports/*" element={<DQAReports />} />
                        <Route path="/reports/*" element={<Reports />} />
                        <Route path="/metadata/*" element={<Metadata />} />
                        <Route path="/help/*" element={<Help />} />
                        
                        {/* Administration Routes (Admin Only) */}
                        <Route path="/administration/*" element={
                            <DQAAdminGuard>
                                <Administration />
                            </DQAAdminGuard>
                        } />
                        
                        {/* Assessment View Routes */}
                        <Route path="/view-assessment/:id" element={<ViewAssessment />} />
                        
                        {/* Legacy Routes for backward compatibility */}
                        <Route path="/dqa-data/view/:id" element={<ViewAssessment />} />
                        <Route path="/assessments/view/:id" element={<ViewAssessment />} />
                        <Route path="/dashboards/*" element={<Dashboard />} />
                        
                        {/* Redirect root to dashboard */}
                        <Route path="/" element={<Dashboard />} />
                    </Routes>
                    </Layout>
                </PageProvider>
            </AuthorityGuard>
        </Router>
    )
}