import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { projectService } from '@/services/project.service'
import { labourService } from '@/services/labour.service'
import { materialService } from '@/services/material.service'
import { financialService } from '@/services/financial.service'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Package,
  Wrench,
  FileText,
  Image,
  BrainCircuit,
  ClipboardList,
  BarChart3,
  Box,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectTasksTab } from './ProjectTasksTab'
import ProjectTeamTab from './ProjectTeamTab'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  planning: { variant: 'outline', label: 'Planning' },
  in_progress: { variant: 'default', label: 'In Progress' },
  on_hold: { variant: 'secondary', label: 'On Hold' },
  completed: { variant: 'default', label: 'Completed' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
  archived: { variant: 'outline', label: 'Archived' },
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)

  const queryClient = useQueryClient()

  useEffect(() => {
    if (id) {
      localStorage.setItem('selected_project_id', id)
    }
  }, [id])

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId),
    enabled: !!projectId,
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => projectService.update(projectId, { status: newStatus as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Project status updated to Active')
    },
    onError: () => toast.error('Failed to update project status')
  })

  const progressMutation = useMutation({
    mutationFn: (newProgress: number) => projectService.update(projectId, { progress_percentage: newProgress } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: () => toast.error('Failed to update progress')
  })

  const { data: labour } = useQuery({
    queryKey: ['labour', projectId],
    queryFn: () => labourService.list(projectId, { page: 1, size: 50 }),
    enabled: !!projectId,
  })

  const { data: materials } = useQuery({
    queryKey: ['materials', projectId],
    queryFn: () => materialService.list(projectId, { page: 1, size: 50 }),
    enabled: !!projectId,
  })

  const { data: costs } = useQuery({
    queryKey: ['costs', projectId],
    queryFn: () => financialService.listCosts(projectId),
    enabled: !!projectId,
  })

  const { data: invoices } = useQuery({
    queryKey: ['invoices', projectId],
    queryFn: () => financialService.listInvoices(projectId),
    enabled: !!projectId,
  })

  const { data: budgetTracking } = useQuery({
    queryKey: ['budget-tracking', projectId],
    queryFn: () => financialService.getBudgetTracking(projectId),
    enabled: !!projectId,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">Project not found</p>
        <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge
              variant={statusConfig[project.status]?.variant || 'outline'}
              className="capitalize"
            >
              {statusConfig[project.status]?.label || project.status.replace('_', ' ')}
            </Badge>
            {project.status === 'planning' && (
              <Button 
                variant="default" 
                size="sm" 
                className="ml-2 h-7 px-3 text-xs"
                onClick={() => statusMutation.mutate('in_progress')}
                disabled={statusMutation.isPending}
              >
                Start Project
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => navigate(`/projects/${projectId}/visualizer`)}
            >
              <Box className="mr-2 h-4 w-4" />
              View 3D Live Progress
            </Button>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <MapPin className="h-3 w-3" />
            {project.location}
            <span className="mx-2">|</span>
            <Building2 className="h-3 w-3" />
            {project.client_name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="tasks">Tasks & Milestones</TabsTrigger>
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="workforce">Workforce</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="daily-logs">Daily Logs</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-6">
          <ProjectTeamTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ProjectTasksTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                  Overall Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.progress_percentage}%</div>
                <Progress value={project.progress_percentage} className="mt-2" />
                <div className="mt-4 flex gap-2 items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={project.progress_percentage}
                    onChange={(e) => progressMutation.mutate(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${project.budget.toLocaleString()}
                </div>
                {budgetTracking && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Spent: ${(budgetTracking.total_spent || 0).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  {Math.ceil(
                    (new Date(project.expected_end_date).getTime() -
                      new Date(project.start_date).getTime()) /
                    (1000 * 60 * 60 * 24)
                  )}{' '}
                  days
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(project.start_date).toLocaleDateString()} -{' '}
                  {new Date(project.expected_end_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Blocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.blocks?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total blocks</p>
              </CardContent>
            </Card>
          </div>

          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}

          {budgetTracking && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Budget Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">
                    ${(budgetTracking.total_budget || project.budget).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Spent</span>
                  <span className="font-medium">
                    ${(budgetTracking.total_spent || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-medium">
                    ${(budgetTracking.remaining || 0).toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={
                    budgetTracking.utilization_percentage ||
                    (budgetTracking.total_spent && project.budget
                      ? (budgetTracking.total_spent / project.budget) * 100
                      : 0)
                  }
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Project Blocks</h2>
          </div>
          {!project.blocks?.length ? (
            <EmptyTab message="No blocks defined for this project" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.blocks.map((block) => (
                <Card key={block.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{block.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground">{block.block_type}</div>
                    <Progress value={block.progress_percentage} />
                    <div className="text-sm text-muted-foreground">
                      {block.progress_percentage}% complete
                    </div>
                    {block.start_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(block.start_date).toLocaleDateString()}
                        {block.end_date && ` - ${new Date(block.end_date).toLocaleDateString()}`}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workforce" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Labour Summary</h2>
            <Badge variant="secondary">{labour?.items?.length || 0} entries</Badge>
          </div>
          {!labour?.items?.length ? (
            <EmptyTab message="No labour entries recorded for this project" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Worker Count</TableHead>
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labour.items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">{new Date(l.date).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{l.trade}</TableCell>
                    <TableCell>{l.workers_count}</TableCell>
                    <TableCell>${l.daily_rate}</TableCell>
                    <TableCell className="font-semibold text-green-600">${(l.workers_count * l.daily_rate).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Materials</h2>
            <Badge variant="secondary">{materials?.items?.length || 0} materials</Badge>
          </div>
          {!materials?.items?.length ? (
            <EmptyTab message="No materials tracked for this project" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {materials.items.map((material) => (
                <Card
                  key={material.id}
                  className={material.is_low_stock ? 'border-red-500/50' : ''}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{material.name}</CardTitle>
                      {material.is_low_stock && (
                        <Badge variant="destructive" className="text-xs">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span>{material.material_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stock</span>
                      <span className={material.is_low_stock ? 'text-red-500 font-medium' : ''}>
                        {material.current_stock} {material.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reorder at</span>
                      <span>
                        {material.reorder_level} {material.unit}
                      </span>
                    </div>
                    {material.supplier_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Supplier</span>
                        <span>{material.supplier_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <h2 className="text-lg font-semibold">Equipment</h2>
          <EmptyTab message="Equipment tracking coming soon" />
        </TabsContent>

        <TabsContent value="daily-logs" className="space-y-4">
          <h2 className="text-lg font-semibold">Daily Logs</h2>
          <EmptyTab message="No daily logs recorded yet" />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-4">Financial Overview</h2>
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${project.budget.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(costs?.reduce((s, c) => s + c.amount, 0) || 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{invoices?.length || 0}</div>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-sm font-semibold mb-2">Cost Records</h3>
            {!costs?.length ? (
              <EmptyTab message="No cost records" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="capitalize">{cost.category}</TableCell>
                      <TableCell>{cost.description || '-'}</TableCell>
                      <TableCell>${cost.amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(cost.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <h3 className="text-sm font-semibold mt-6 mb-2">Invoices</h3>
            {!invoices?.length ? (
              <EmptyTab message="No invoices" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell className="capitalize">{inv.invoice_type}</TableCell>
                      <TableCell>{inv.vendor_name || '-'}</TableCell>
                      <TableCell>${inv.total_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'default'
                              : inv.status === 'overdue'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="capitalize"
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Documents</h2>
          </div>
          <EmptyTab message="No documents uploaded" icon={<FileText className="h-8 w-8" />} />
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Photos</h2>
          </div>
          <EmptyTab message="No photos uploaded" icon={<Image className="h-8 w-8" />} />
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI Insights</h2>
          </div>
          <EmptyTab
            message="AI insights are being generated"
            icon={<BrainCircuit className="h-8 w-8" />}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyTab({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon || <ClipboardList className="h-8 w-8 mb-3" />}
      <p className="text-sm">{message}</p>
    </div>
  )
}
