import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { User, UserRole } from '@/types'

interface EditUserDialogProps {
  user: User | null
  open: boolean
  onClose: () => void
  onSave: (userId: number, data: Partial<User>) => void
  isLoading?: boolean
}

export function EditUserDialog({ user, open, onClose, onSave, isLoading }: EditUserDialogProps) {
  const [role, setRole] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)

  useEffect(() => {
    if (user) {
      setRole(user.role)
      setIsActive(user.is_active)
    }
  }, [user])

  const handleSave = () => {
    if (!user) return
    onSave(user.id, { role: role as UserRole, is_active: isActive })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User - {user?.full_name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <div className="col-span-3">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
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
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="active-status" className="text-right">
              Active Status
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch
                id="active-status"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active-status" className="font-normal">
                {isActive ? 'Active (Can login)' : 'Inactive (Access blocked)'}
              </Label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !role}>
            {isLoading ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
