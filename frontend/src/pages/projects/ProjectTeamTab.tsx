import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project.service'
import { userService } from '@/services/user.service'
import { useAuth } from '@/hooks/useAuth'
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface ProjectTeamTabProps {
  projectId: number
}

export default function ProjectTeamTab({ projectId }: ProjectTeamTabProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const canManage = user?.role === 'super_admin' || user?.role === 'company_owner' || user?.role === 'project_manager'

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectService.getMembers(projectId),
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const response = await userService.list({ size: 100 })
      return response.items
    },
    enabled: isAddOpen,
  })

  // Filter users who are not already in the project
  const availableUsers = allUsers.filter(u => !members.some(m => m.user_id === u.id))

  const addMutation = useMutation({
    mutationFn: () => projectService.addMember(projectId, { user_id: Number(selectedUserId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('Team member added successfully')
      setIsAddOpen(false)
      setSelectedUserId('')
    },
    onError: () => toast.error('Failed to add team member'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: number) => projectService.removeMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('Team member removed')
    },
    onError: () => toast.error('Failed to remove team member'),
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Team Members</h3>
          <p className="text-sm text-muted-foreground">Manage who has access to this project.</p>
        </div>
        {canManage && (
          <Button onClick={() => setIsAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Member
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingMembers ? (
          <p className="text-sm text-muted-foreground">Loading members...</p>
        ) : members.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-2xl bg-muted/20">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No team members assigned yet.</p>
          </div>
        ) : (
          members.map((member) => (
            <Card key={member.id} className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase">
                      {member.user_full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold">{member.user_full_name || 'Unknown User'}</p>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Mail className="h-3 w-3 mr-1" />
                        {member.user_email}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Shield className="h-3 w-3 mr-1" />
                        <span className="capitalize">{member.user_role?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {canManage && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this member?')) {
                        removeMutation.mutate(member.user_id)
                      }
                    }}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }}>
            <DialogHeader>
              <DialogTitle>Assign Team Member</DialogTitle>
              <DialogDescription>
                Select a user to grant them access to this project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user-select">Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.full_name || u.username} ({u.email}) - {u.role?.replace('_', ' ')}
                      </SelectItem>
                    ))}
                    {availableUsers.length === 0 && (
                      <SelectItem value="none" disabled>
                        No available users found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedUserId || addMutation.isPending}>
                {addMutation.isPending ? 'Assigning...' : 'Assign User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
