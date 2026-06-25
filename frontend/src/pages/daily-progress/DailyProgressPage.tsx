import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dailyProgressService } from '@/services/daily-progress.service'
import {
  ClipboardList,
  Plus,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Users,
  Activity,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

export default function DailyProgressPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isAddOpen, setIsAddOpen] = useState(false)
  
  // Verification states
  const [rejectLogId, setRejectLogId] = useState<number | null>(null)
  const [rejectRemarks, setRejectRemarks] = useState('')

  const [form, setForm] = useState({
    area: '',
    activity: '',
    task_id: '',
    planned_quantity: 0,
    completed_quantity: 0,
    unit: '',
    workers_count: 0,
    labour_hours: 0,
    remarks: '',
    weather_condition: '',
  })

  const pid = projectId()

  const { data: tasks } = useQuery({
    queryKey: ['project-tasks', pid],
    queryFn: () => {
      import('@/services/project-task.service').then(m => m.projectTaskService.list(pid))
      return [] as any[] // Temporarily returning empty to avoid complex dynamic imports in component body, wait I should use standard import
    },
    enabled: false // Will fix this import properly below
  })

  // Actually, let's just fetch tasks
  const { data: projectTasks } = useQuery({
    queryKey: ['project-tasks', pid],
    queryFn: async () => {
      const { projectTaskService } = await import('@/services/project-task.service')
      return projectTaskService.list(pid)
    },
    enabled: !!pid,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['daily-progress', pid, selectedDate],
    queryFn: () =>
      dailyProgressService.list(pid, {
        date_from: selectedDate,
        date_to: selectedDate,
        size: 100,
      }),
    enabled: !!pid,
  })

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['daily-summary', pid, selectedDate],
    queryFn: () => dailyProgressService.getDailySummary(pid, selectedDate),
    enabled: !!pid,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      dailyProgressService.create(pid, {
        date: selectedDate,
        area: form.area,
        activity: form.activity,
        task_id: form.task_id ? Number(form.task_id) : undefined,
        planned_quantity: Number(form.planned_quantity),
        completed_quantity: Number(form.completed_quantity),
        unit: form.unit,
        workers_count: Number(form.workers_count),
        labour_hours: Number(form.labour_hours),
        remarks: form.remarks || undefined,
        weather_condition: form.weather_condition || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-progress'] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
      // also invalidate project tasks since progress updated
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] })
      // and overall project progress
      queryClient.invalidateQueries({ queryKey: ['project', pid] })
      toast.success('Work log added')
      setIsAddOpen(false)
      resetForm()
    },
    onError: () => toast.error('Failed to add work log'),
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, remarks }: { id: number, status: 'approved' | 'rejected', remarks?: string }) =>
      dailyProgressService.verify(id, status, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-progress'] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['project', pid] })
      toast.success('Log verification updated')
      setRejectLogId(null)
      setRejectRemarks('')
    },
    onError: () => toast.error('Failed to verify work log'),
  })

  const canManage = ['site_engineer', 'project_manager', 'company_owner'].includes(user?.role || '')

  const resetForm = () => {
    setForm({
      task_id: '',
      area: '',
      activity: '',
      planned_quantity: 0,
      completed_quantity: 0,
      unit: '',
      workers_count: 0,
      labour_hours: 0,
      remarks: '',
      weather_condition: '',
    })
  }

  const logs = data?.items || []
  const dailySummary = summary || {
    total_activities: 0,
    total_planned: 0,
    total_completed: 0,
    overall_progress: 0,
    total_workers: 0,
  }

  if (!pid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Progress</h1>
          <p className="text-muted-foreground">Track daily work logs and progress</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project to view daily progress</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Progress</h1>
          <p className="text-muted-foreground">Track daily work logs and progress</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Work Log
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-[200px]"
        />
      </div>

      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Activities
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailySummary.total_activities || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overall Progress
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(dailySummary.overall_progress || 0).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Workers on Site
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailySummary.total_workers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed / Planned
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dailySummary.total_completed || 0} / {dailySummary.total_planned || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <ProgressSkeleton />
      ) : isError ? (
        <div className="text-center py-12 text-red-500">Failed to load daily progress</div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No work logs for this date</p>
          <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Work Log
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Planned Qty</TableHead>
                <TableHead className="text-right">Completed Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Progress %</TableHead>
                <TableHead className="text-center">Workers</TableHead>
                <TableHead>Remarks</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.verification_status === 'approved' && <Badge className="bg-green-500">Approved</Badge>}
                    {log.verification_status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                    {log.verification_status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                  </TableCell>
                  <TableCell className="font-medium">{log.area}</TableCell>
                  <TableCell>{log.activity}</TableCell>
                  <TableCell className="text-right">{log.planned_quantity}</TableCell>
                  <TableCell className="text-right">{log.completed_quantity}</TableCell>
                  <TableCell>{log.unit}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={log.progress_percentage >= 100 ? 'default' : 'secondary'}
                    >
                      {log.progress_percentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{log.workers_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.remarks || '-'}
                    {log.verification_remarks && (
                      <span className="block text-xs text-red-500 mt-1">
                        Reject Reason: {log.verification_remarks}
                      </span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {log.verification_status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-green-600 h-8 w-8"
                            onClick={() => verifyMutation.mutate({ id: log.id, status: 'approved' })}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-600 h-8 w-8"
                            onClick={() => setRejectLogId(log.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}>
            <DialogHeader>
              <DialogTitle>Add Work Log</DialogTitle>
              <DialogDescription>Record daily work progress for {selectedDate}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dl-task">Project Task</Label>
                <select 
                  id="dl-task"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.task_id}
                  onChange={(e) => setForm({ ...form, task_id: e.target.value })}
                >
                  <option value="">Select a specific task (Optional)</option>
                  {projectTasks?.map(task => (
                    <option key={task.id} value={task.id}>{task.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Select the major task to automatically update the overall project progress.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dl-area">Area *</Label>
                  <Input id="dl-area" required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dl-activity">Activity Detail *</Label>
                  <Input id="dl-activity" required value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="e.g., Pouring concrete" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dl-planned">Planned Qty *</Label>
                  <Input id="dl-planned" type="number" min="0" required value={form.planned_quantity || ''} onChange={(e) => setForm({ ...form, planned_quantity: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dl-completed">Completed Qty *</Label>
                  <Input id="dl-completed" type="number" min="0" required value={form.completed_quantity || ''} onChange={(e) => setForm({ ...form, completed_quantity: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dl-unit">Unit *</Label>
                  <Input id="dl-unit" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dl-workers">Workers Count *</Label>
                  <Input id="dl-workers" type="number" min="0" required value={form.workers_count || ''} onChange={(e) => setForm({ ...form, workers_count: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dl-hours">Labour Hours</Label>
                  <Input id="dl-hours" type="number" min="0" step="0.5" value={form.labour_hours || ''} onChange={(e) => setForm({ ...form, labour_hours: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dl-weather">Weather</Label>
                  <Input id="dl-weather" value={form.weather_condition} onChange={(e) => setForm({ ...form, weather_condition: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dl-remarks">Remarks</Label>
                  <Input id="dl-remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Work Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectLogId} onOpenChange={(open) => !open && setRejectLogId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reject Work Log</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this work log.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-remarks">Remarks / Reason</Label>
            <Input 
              id="reject-remarks" 
              value={rejectRemarks} 
              onChange={(e) => setRejectRemarks(e.target.value)} 
              placeholder="e.g., Incorrect quantity, please revise"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectLogId(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              disabled={!rejectRemarks.trim() || verifyMutation.isPending}
              onClick={() => rejectLogId && verifyMutation.mutate({ id: rejectLogId, status: 'rejected', remarks: rejectRemarks })}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
