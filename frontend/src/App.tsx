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
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="labour" element={<LabourSummaryPage />} />
        <Route path="contractors" element={<ContractorsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="daily-progress" element={<DailyProgressPage />} />
        <Route path="financial" element={<FinancialPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="photos" element={<PhotosPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
