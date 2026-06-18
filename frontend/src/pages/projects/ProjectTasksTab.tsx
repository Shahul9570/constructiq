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
import { projectTaskService } from '@/services/project-task.service'

interface ProjectTasksTabProps {
  projectId: number
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', weight_percentage: 0 })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => projectTaskService.list(projectId),
  })

  const createMutation = useMutation({
    mutationFn: () => projectTaskService.create(projectId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      setIsOpen(false)
      setFormData({ name: '', description: '', weight_percentage: 0 })
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
              <div className="space-y-2">
                <Label>Weight Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.weight_percentage}
                  onChange={(e) => setFormData({ ...formData, weight_percentage: parseFloat(e.target.value) })}
                  placeholder="e.g., 20"
                />
                <p className="text-xs text-muted-foreground">How much of the total project does this represent?</p>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !formData.name}>
                Save Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tasks?.map((task) => (
          <Card key={task.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">{task.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Weight: {task.weight_percentage}% of total project</p>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(task.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Task Progress</span>
                  <span className="font-medium">{task.progress_percentage.toFixed(1)}%</span>
                </div>
                <Progress value={task.progress_percentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  Contributes {(task.progress_percentage * task.weight_percentage / 100).toFixed(1)}% to overall
                </p>
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
