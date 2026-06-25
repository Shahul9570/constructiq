import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { projectTaskService } from '@/services/project-task.service'
import { projectService } from '@/services/project.service'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'

interface ProjectTasksTabProps {
  projectId: number
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState<{ 
    name: string, description: string, weight_percentage: number, assigned_to_id?: string,
    area?: string, quantity?: number, unit?: string, work_type?: string, start_date?: string, end_date?: string
  }>({ 
    name: '', description: '', weight_percentage: 0, assigned_to_id: 'none',
    area: '', quantity: 0, unit: '', work_type: '', start_date: '', end_date: ''
  })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => projectTaskService.list(projectId),
  })

  const { data: members } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectService.getMembers(projectId),
  })

  const createMutation = useMutation({
    mutationFn: () => projectTaskService.create(projectId, {
      ...formData,
      assigned_to_id: formData.assigned_to_id !== 'none' ? Number(formData.assigned_to_id) : undefined,
      quantity: formData.quantity ? Number(formData.quantity) : undefined,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      setIsOpen(false)
      setFormData({ 
        name: '', description: '', weight_percentage: 0, assigned_to_id: 'none',
        area: '', quantity: 0, unit: '', work_type: '', start_date: '', end_date: ''
      })
      toast.success('Task created successfully')
    },
    onError: () => toast.error('Failed to create task'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectTaskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      toast.success('Task deleted')
    },
  })

  const totalWeight = tasks?.reduce((sum, task) => sum + task.weight_percentage, 0) || 0

  if (isLoading) return <div>Loading tasks...</div>

  // Site Engineers, PMs, and Owners can create and assign tasks
  const canManageTasks = ['site_engineer', 'project_manager', 'company_owner'].includes(user?.role || '')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Project Tasks & Milestones</h3>
          <p className="text-sm text-muted-foreground">
            Define weighted tasks to automatically track true project progress.
            <span className={`ml-2 font-medium ${totalWeight === 100 ? 'text-green-500' : 'text-orange-500'}`}>
              Total Weight: {totalWeight}%
            </span>
          </p>
        </div>
        {canManageTasks && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Project Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Task Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Foundation, Framing"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight Percentage (%)</Label>
                    <Input
                      type="number" min="0" max="100" value={formData.weight_percentage}
                      onChange={(e) => setFormData({ ...formData, weight_percentage: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Work Type</Label>
                    <Input value={formData.work_type} onChange={(e) => setFormData({ ...formData, work_type: e.target.value })} placeholder="e.g., Concrete" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Area</Label>
                    <Input value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="sq.ft" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign To (Optional)</Label>
                  <Select value={formData.assigned_to_id} onValueChange={(val) => setFormData({ ...formData, assigned_to_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members?.map((m: any) => (
                        <SelectItem key={m.id} value={m.user_id.toString()}>
                          {m.user_full_name} ({m.user_role?.replace('_', ' ') || 'member'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !formData.name}>
                  Save Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tasks?.map((task) => (
          <Card key={task.id} className={task.assigned_to_id === user?.id ? "border-primary" : ""}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {task.name}
                  {task.status === 'completed' && <Badge className="bg-green-500">Done</Badge>}
                  {task.status === 'in_progress' && <Badge variant="secondary">In Progress</Badge>}
                  {task.assigned_to_id === user?.id && <Badge variant="outline" className="border-primary text-primary">My Task</Badge>}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Weight: {task.weight_percentage}% | Assigned: {task.assigned_to_name || 'Unassigned'}
                </p>
              </div>
              {canManageTasks && (
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(task.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="mt-2 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {task.area && <div><span className="font-medium text-foreground">Area:</span> {task.area}</div>}
                  {task.work_type && <div><span className="font-medium text-foreground">Type:</span> {task.work_type}</div>}
                  {task.quantity && task.unit && <div><span className="font-medium text-foreground">Quantity:</span> {task.quantity} {task.unit}</div>}
                  {task.start_date && task.end_date && (
                    <div className="col-span-2">
                      <span className="font-medium text-foreground">Schedule:</span> {new Date(task.start_date).toLocaleDateString()} - {new Date(task.end_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Task Progress</span>
                    <span className="font-medium">{task.progress_percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={task.progress_percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    Contributes {(task.progress_percentage * task.weight_percentage / 100).toFixed(1)}% to overall
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {tasks?.length === 0 && (
          <div className="col-span-full py-12 text-center border rounded-lg border-dashed">
            <p className="text-muted-foreground">No tasks defined yet. Add tasks to start tracking weighted progress.</p>
          </div>
        )}
      </div>
    </div>
  )
}
