import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Edit, ShieldAlert, ShieldCheck } from 'lucide-react'
import { User, UserRole } from '@/types'
import { format } from 'date-fns'

interface UserTableProps {
  users: User[]
  onEdit: (user: User) => void
  onToggleStatus: (user: User) => void
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'destructive'
    case UserRole.COMPANY_OWNER:
      return 'default'
    case UserRole.PROJECT_MANAGER:
      return 'secondary'
    case UserRole.CLIENT:
      return 'outline'
    default:
      return 'secondary'
  }
}

const formatRole = (role: string) => {
  return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function UserTable({ users, onEdit, onToggleStatus }: UserTableProps) {
  if (!users || users.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/20 rounded-xl border border-slate-800/60">
        No users found matching your criteria.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-900/60">
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="font-semibold text-slate-300">Name</TableHead>
            <TableHead className="font-semibold text-slate-300">Contact</TableHead>
            <TableHead className="font-semibold text-slate-300">Role</TableHead>
            <TableHead className="font-semibold text-slate-300">Status</TableHead>
            <TableHead className="font-semibold text-slate-300">Joined</TableHead>
            <TableHead className="text-right font-semibold text-slate-300">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
              <TableCell>
                <div className="font-medium text-slate-200">{user.full_name}</div>
                <div className="text-xs text-slate-500">@{user.username}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-300">{user.email}</div>
                {user.phone && <div className="text-xs text-slate-500">{user.phone}</div>}
              </TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role) as any} className="capitalize">
                  {formatRole(user.role)}
                </Badge>
              </TableCell>
              <TableCell>
                {user.is_active ? (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/20 bg-emerald-400/10">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400 border-slate-700 bg-slate-800">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-slate-400">
                {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'Unknown'}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-800 hover:text-white">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                    <DropdownMenuLabel className="text-slate-300">Actions</DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={() => onEdit(user)}
                      className="cursor-pointer text-slate-300 focus:bg-slate-800 focus:text-white"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem 
                      onClick={() => onToggleStatus(user)}
                      className="cursor-pointer text-slate-300 focus:bg-slate-800 focus:text-white"
                    >
                      {user.is_active ? (
                        <>
                          <ShieldAlert className="mr-2 h-4 w-4 text-orange-400" />
                          <span className="text-orange-400">Deactivate</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-400">Activate</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
