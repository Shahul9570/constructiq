import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'

interface RequireRoleProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export default function RequireRole({ children, allowedRoles }: RequireRoleProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect unauthorized users to their dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
