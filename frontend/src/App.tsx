import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/dashboards/DashboardPage'
import ProjectsPage from '@/pages/projects/ProjectsPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'
import LabourSummaryPage from '@/pages/workforce/LabourSummaryPage'
import ContractorsPage from '@/pages/contractors/ContractorsPage'
import MaterialsPage from '@/pages/materials/MaterialsPage'
import EquipmentPage from '@/pages/equipment/EquipmentPage'
import DailyProgressPage from '@/pages/daily-progress/DailyProgressPage'
import FinancialPage from '@/pages/financial/FinancialPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import PhotosPage from '@/pages/photos/PhotosPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import AIAssistantPage from '@/pages/ai/AIAssistantPage'
import SettingsPage from '@/pages/settings/SettingsPage'

import UsersPage from '@/pages/users/UsersPage'

import RequireRole from '@/components/auth/RequireRole'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* All roles can view projects */}
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        
        {/* Only admins/owners/managers can view users */}
        <Route path="users" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager']}><UsersPage /></RequireRole>} />
        
        {/* Operations - exclude contractors & accountants */}
        <Route path="labour" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer']}><LabourSummaryPage /></RequireRole>} />
        <Route path="contractors" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer']}><ContractorsPage /></RequireRole>} />
        <Route path="materials" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer']}><MaterialsPage /></RequireRole>} />
        <Route path="equipment" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer']}><EquipmentPage /></RequireRole>} />
        
        {/* Daily Progress - everyone except accountant & client */}
        <Route path="daily-progress" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer', 'contractor']}><DailyProgressPage /></RequireRole>} />
        
        {/* Financials - only admins, owners, and accountants */}
        <Route path="financial" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'accountant']}><FinancialPage /></RequireRole>} />
        
        {/* Records - widely accessible */}
        <Route path="documents" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer', 'contractor', 'accountant', 'client']}><DocumentsPage /></RequireRole>} />
        <Route path="photos" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer', 'contractor', 'accountant', 'client']}><PhotosPage /></RequireRole>} />
        <Route path="reports" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer', 'accountant', 'client']}><ReportsPage /></RequireRole>} />
        
        {/* System */}
        <Route path="ai" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer']}><AIAssistantPage /></RequireRole>} />
        <Route path="settings" element={<RequireRole allowedRoles={['super_admin', 'company_owner', 'project_manager', 'site_engineer', 'accountant']}><SettingsPage /></RequireRole>} />
      </Route>
    </Routes>
  )
}
