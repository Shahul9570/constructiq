import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { userService } from '@/services/user.service'
import { UserTable } from './components/UserTable'
import { EditUserDialog } from './components/EditUserDialog'
import { User, UserRole } from '@/types'

export default function UsersPage() {
  const queryClient = useQueryClient()
  
  // Filters state
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20
  
  // Dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Queries
  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', search, role, page],
    queryFn: () => userService.list({
      search: search || undefined,
      role: role !== 'all' ? role : undefined,
      page,
      size: pageSize,
    }),
  })

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => 
      userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
      setIsEditDialogOpen(false)
    },
    onError: () => {
      toast.error('Failed to update user')
    }
  })

  // Handlers
  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setIsEditDialogOpen(true)
  }

  const handleToggleStatus = (user: User) => {
    updateMutation.mutate({
      id: user.id,
      data: { is_active: !user.is_active }
    })
  }

  const handleSaveEdit = (userId: number, data: Partial<User>) => {
    updateMutation.mutate({ id: userId, data })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">User Management</h1>
          <p className="text-slate-400 mt-2">Manage platform users, their roles, and access.</p>
        </div>
      </div>

      <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row gap-4 justify-between bg-slate-900/50">
            <div className="flex flex-1 gap-4 items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 bg-slate-950/50 border-slate-800 focus-visible:ring-orange-500 text-slate-200"
                />
              </div>
              <div className="w-[180px]">
                <Select
                  value={role}
                  onValueChange={(val) => {
                    setRole(val)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-slate-950/50 border-slate-800 focus:ring-orange-500 text-slate-200">
                    <Filter className="w-4 h-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                    <SelectItem value={UserRole.COMPANY_OWNER}>Company Owner</SelectItem>
                    <SelectItem value={UserRole.PROJECT_MANAGER}>Project Manager</SelectItem>
                    <SelectItem value={UserRole.SITE_ENGINEER}>Site Engineer</SelectItem>
                    <SelectItem value={UserRole.CONTRACTOR}>Contractor</SelectItem>
                    <SelectItem value={UserRole.ACCOUNTANT}>Accountant</SelectItem>
                    <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="p-4">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
                Loading users...
              </div>
            ) : isError ? (
              <div className="py-20 text-center text-red-400 bg-red-950/20 rounded-xl border border-red-900/50">
                Failed to load users. Please try again.
              </div>
            ) : (
              <UserTable 
                users={data?.items || []} 
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <EditUserDialog
        user={selectedUser}
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleSaveEdit}
        isLoading={updateMutation.isPending}
      />
    </div>
  )
}
