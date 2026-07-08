import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/dashboards/DashboardPage'
import ProjectsPage from '@/pages/projects/ProjectsPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'
import DigitalTwinPage from '@/pages/projects/DigitalTwinPage'
import LabourSummaryPage from '@/pages/workforce/LabourSummaryPage'
import ContractorsPage from '@/pages/contractors/ContractorsPage'
import MaterialsPage from '@/pages/materials/MaterialsPage'
import EquipmentPage from '@/pages/equipment/EquipmentPage'
import DailyProgressPage from '@/pages/daily-progress/DailyProgressPage'
import DailyExpensesPage from '@/pages/expenses/DailyExpensesPage'
import FinancialPage from '@/pages/financial/FinancialPage'
import ClientBillingPage from '@/pages/financial/ClientBillingPage'
import ClientPortalPage from '@/pages/financial/ClientPortalPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import PhotosPage from '@/pages/photos/PhotosPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import AIAssistantPage from '@/pages/ai/AIAssistantPage'
import SettingsPage from '@/pages/settings/SettingsPage'

import UsersPage from '@/pages/users/UsersPage'

import RequireRole from '@/components/auth/RequireRole'
import { UserRole } from '@/types'

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
        <Route path="projects/:id/visualizer" element={<DigitalTwinPage />} />
        
        {/* Only admins/owners/managers can view users */}
        <Route path="users" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER]}><UsersPage /></RequireRole>} />
        
        {/* Operations - exclude contractors */}
        <Route path="labour" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT]}><LabourSummaryPage /></RequireRole>} />
        <Route path="contractors" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT]}><ContractorsPage /></RequireRole>} />
        <Route path="materials" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT]}><MaterialsPage /></RequireRole>} />
        <Route path="equipment" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT]}><EquipmentPage /></RequireRole>} />
        <Route path="daily-expenses" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT]}><DailyExpensesPage /></RequireRole>} />
        
        {/* Daily Progress - everyone except accountant & client */}
        <Route path="daily-progress" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.CONTRACTOR]}><DailyProgressPage /></RequireRole>} />
        
        {/* Financials - admins, owners, PMs, and accountants */}
        <Route path="financial" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT]}><FinancialPage /></RequireRole>} />
        <Route path="client-billing" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.ACCOUNTANT]}><ClientBillingPage /></RequireRole>} />
        <Route path="client-portal" element={<RequireRole allowedRoles={[UserRole.CLIENT]}><ClientPortalPage /></RequireRole>} />
        
        {/* Records - widely accessible */}
        <Route path="documents" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.CONTRACTOR, UserRole.ACCOUNTANT, UserRole.CLIENT]}><DocumentsPage /></RequireRole>} />
        <Route path="photos" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.CONTRACTOR, UserRole.ACCOUNTANT, UserRole.CLIENT]}><PhotosPage /></RequireRole>} />
        <Route path="reports" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT, UserRole.CLIENT]}><ReportsPage /></RequireRole>} />
        
        {/* System */}
        <Route path="ai" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER]}><AIAssistantPage /></RequireRole>} />
        <Route path="settings" element={<RequireRole allowedRoles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.ACCOUNTANT]}><SettingsPage /></RequireRole>} />
      </Route>
    </Routes>
  )
}
