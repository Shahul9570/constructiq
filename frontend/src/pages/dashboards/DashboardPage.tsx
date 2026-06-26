import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'
import { projectService } from '@/services/project.service'
import {
  Users,
  ClipboardCheck,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Building,
  CheckCircle,
  BarChart3,
  Wallet,
  Activity,
  CalendarDays,
  Image,
  MapPin,
  Calendar,
  FileText,
  Download,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedCard } from '@/components/ui/animated-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { financialService } from '@/services/financial.service'
import toast from 'react-hot-toast'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getFileUrl } from '@/lib/utils'
import type { UserRole } from '@/types'

type RoleSectionProps = {
  projectId: string
}

function SiteEngineerDashboard({ projectId }: RoleSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-site-engineer', projectId],
    queryFn: () => dashboardService.getSiteEngineer(Number(projectId)),
    enabled: !!projectId,
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return <EmptyState title="No Data" description="No dashboard data available" />

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        index={0}
        icon={<Users className="h-5 w-5" />}
        label="Total Labour Today"
        value={String(data.total_labour_today)}
      />
      <StatCard
        index={1}
        icon={<DollarSign className="h-5 w-5" />}
        label="Labour Cost Today"
        value={`₹${data.labour_cost_today.toLocaleString()}`}
      />
      <StatCard
        index={2}
        icon={<ClipboardCheck className="h-5 w-5" />}
        label="Today's Progress"
        value={`${data.today_progress.progress_percentage}%`}
      >
        <Progress value={data.today_progress.progress_percentage} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {data.today_progress.completed_quantity} / {data.today_progress.planned_quantity} units
        </p>
      </StatCard>
      <StatCard
        index={3}
        icon={<Package className="h-5 w-5" />}
        label="Material Consumption"
        value={data.today_material_consumption.toLocaleString()}
        subtext="units today"
      />
      <StatCard
        index={4}
        icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
        label="Low Stock Alerts"
        value={String(data.low_stock_alerts)}
        variant={data.low_stock_alerts > 0 ? 'destructive' : 'default'}
      />
    </div>
  )
}

function ProjectManagerDashboard({ projectId }: RoleSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-project-manager', projectId],
    queryFn: () => dashboardService.getProjectManager(Number(projectId)),
    enabled: !!projectId,
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return <EmptyState title="No Data" description="No dashboard data available" />

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        index={0}
        icon={<Activity className="h-5 w-5" />}
        label="Project Status"
        value={data.project_status.replace('_', ' ')}
      >
        <Badge
          variant={
            data.project_status === 'completed'
              ? 'default'
              : data.project_status === 'in_progress'
                ? 'secondary'
                : 'outline'
          }
          className="mt-1 capitalize"
        >
          {data.project_status.replace('_', ' ')}
        </Badge>
      </StatCard>
      <StatCard
        icon={<BarChart3 className="h-5 w-5" />}
        label="Progress"
        value={`${data.progress_percentage}%`}
      >
        <Progress value={data.progress_percentage} className="mt-2" />
      </StatCard>
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Delays"
        value={`${data.delays_days} days`}
        variant={data.delays_days > 0 ? 'destructive' : 'default'}
      />
      <StatCard
        icon={<DollarSign className="h-5 w-5" />}
        label="Budget Utilization"
        value={`${data.budget_utilization}%`}
        variant={data.is_over_budget ? 'destructive' : 'default'}
      >
        <Progress value={data.budget_utilization} className="mt-2" />
        {data.is_over_budget && (
          <p className="text-xs text-red-500 mt-1">Over budget!</p>
        )}
      </StatCard>
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Weekly Progress"
        value={`${data.weekly_progress}%`}
      >
        <Progress value={data.weekly_progress} className="mt-2" />
      </StatCard>
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Total Workers"
        value={String(data.total_workers)}
      />
    </div>
  )
}

function OwnerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-owner'],
    queryFn: () => dashboardService.getOwner(),
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return <EmptyState title="No Data" description="No portfolio data available" />

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building className="h-5 w-5" />}
          label="Total Projects"
          value={String(data.total_projects)}
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Active Projects"
          value={String(data.active_projects)}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Completed"
          value={String(data.completed_projects)}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="At Risk"
          value={String(data.projects_at_risk)}
          variant={data.projects_at_risk > 0 ? 'destructive' : 'default'}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Budget"
          value={`$${data.total_budget.toLocaleString()}`}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Total Spent"
          value={`$${data.total_spent.toLocaleString()}`}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Remaining"
          value={`$${data.remaining_budget.toLocaleString()}`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Budget Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.budget_health_percentage}%
            </div>
            <Progress value={data.budget_health_percentage} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overall_progress}%
            </div>
            <Progress value={data.overall_progress} className="mt-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AccountantDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-accountant'],
    queryFn: () => dashboardService.getOwner(),
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return <EmptyState title="No Data" description="No financial data available" />

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={<DollarSign className="h-5 w-5" />}
        label="Total Budget"
        value={`$${data.total_budget.toLocaleString()}`}
      />
      <StatCard
        icon={<Wallet className="h-5 w-5" />}
        label="Total Spent"
        value={`$${data.total_spent.toLocaleString()}`}
      />
      <StatCard
        icon={<DollarSign className="h-5 w-5" />}
        label="Remaining Budget"
        value={`$${data.remaining_budget.toLocaleString()}`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Budget Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.budget_health_percentage}%
          </div>
          <Progress value={data.budget_health_percentage} className="mt-2" />
        </CardContent>
      </Card>
    </div>
  )
}

function ContractorDashboard() {
  const { user } = useAuth()
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.list({ page: 1, size: 100 }),
  })

  if (isLoading) return <DashboardSkeleton />
  if (!projects?.items.length) return <EmptyState title="No Projects" description="No projects assigned to you" />

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.items.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{project.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="capitalize">
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span>{project.progress_percentage}%</span>
              </div>
              <Progress value={project.progress_percentage} />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget</span>
                <span>${project.budget.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ClientDashboard() {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [paymentForm, setPaymentForm] = useState({ payment_method: 'Bank Transfer', notes: '' })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-client'],
    queryFn: () => dashboardService.getClient(),
  })

  const submitPaymentMutation = useMutation({
    mutationFn: (data: any) => financialService.submitPayment(selectedInvoiceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-client'] })
      setIsPaymentOpen(false)
      toast.success('Payment submitted for verification')
    },
    onError: () => toast.error('Failed to submit payment'),
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return <EmptyState title="No Data" description="No project linked to this account." />
  if (data.error) return <EmptyState title="Not Found" description={data.error} />

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building className="h-5 w-5" />}
          label="Project"
          value={data.project_name}
          subtext={data.location}
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Status"
          value={data.status.replace('_', ' ')}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Start Date"
          value={new Date(data.start_date).toLocaleDateString()}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Expected End"
          value={new Date(data.expected_end_date).toLocaleDateString()}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center space-y-4">
            <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-8 border-muted">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-muted stroke-current"
                  strokeWidth="8"
                  cx="50"
                  cy="50"
                  r="46"
                  fill="transparent"
                />
                <circle
                  className="text-primary stroke-current transition-all duration-1000 ease-in-out"
                  strokeWidth="8"
                  strokeLinecap="round"
                  cx="50"
                  cy="50"
                  r="46"
                  fill="transparent"
                  strokeDasharray={`${data.progress_percentage * 2.89} 289`}
                />
              </svg>
              <div className="text-center">
                <span className="text-4xl font-bold">{Math.round(data.progress_percentage)}%</span>
                <p className="text-sm text-muted-foreground mt-1">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_activities && data.recent_activities.length > 0 ? (
              <div className="space-y-4">
                {data.recent_activities.map((act: any, i: number) => (
                  <div key={i} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{act.activity}</p>
                      <p className="text-sm text-muted-foreground">{new Date(act.date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="secondary">{Math.round(act.progress)}% done</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No recent activities found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Photos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_photos && data.recent_photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {data.recent_photos.map((photo: any, i: number) => (
                <div key={i} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img src={getFileUrl(photo.url)} alt={photo.caption || 'Project photo'} className="w-full h-full object-cover" />
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-xs text-white truncate">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center flex flex-col items-center">
              <Image className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No photos uploaded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Financial Milestone Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Contract Value</span>
                <span className="font-semibold">${(data.budget || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold text-green-500">${(data.total_paid || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Next Payment Due</span>
                <span className="font-semibold text-orange-500">${(data.total_pending || 0).toLocaleString()}</span>
              </div>
              
              <Progress value={data.budget ? ((data.total_paid || 0) / data.budget) * 100 : 0} className="h-2" />
              
              {data.invoices && data.invoices.length > 0 && (
                <div className="pt-4 mt-4 border-t space-y-3">
                  <p className="text-sm font-medium">Recent Invoices</p>
                  {data.invoices.map((inv: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{inv.due_date ? `Due: ${new Date(inv.due_date).toLocaleDateString()}` : 'No due date'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">${inv.amount.toLocaleString()}</span>
                        <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'pending_verification' ? 'outline' : inv.status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize">{inv.status.replace('_', ' ')}</Badge>
                        {(inv.status === 'sent' || inv.status === 'overdue') && (
                          <Button size="sm" onClick={() => { setSelectedInvoiceId(inv.id); setIsPaymentOpen(true); }}>
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Secure Document Vault */}
        <Card>
          <CardHeader>
            <CardTitle>Secure Document Vault</CardTitle>
          </CardHeader>
          <CardContent>
            {data.documents && data.documents.length > 0 ? (
              <div className="space-y-4">
                {data.documents.map((doc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(doc.date).toLocaleDateString()} • {(doc.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={getFileUrl(doc.url)} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No documents available in your vault.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Payment Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Input
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                placeholder="Bank Transfer, Credit Card, etc."
              />
            </div>
            <div className="grid gap-2">
              <Label>Reference ID / Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="e.g. Transaction Ref: TRX12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
            <Button
              onClick={() => submitPaymentMutation.mutate(paymentForm)}
              disabled={submitPaymentMutation.isPending || !paymentForm.payment_method}
            >
              {submitPaymentMutation.isPending ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-super-admin'],
    queryFn: () => dashboardService.getSuperAdmin(),
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return <EmptyState title="No Data" description="No dashboard data available" />

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          icon={<Users className="h-5 w-5" />}
          label="Total Users"
          value={String(data.total_users)}
          subtext={`${data.active_users} Active Accounts`}
        />
        <StatCard
          index={1}
          icon={<Building className="h-5 w-5" />}
          label="Platform Projects"
          value={String(data.total_projects)}
          subtext={`${data.projects_by_status.in_progress} Currently In Progress`}
        />
        <StatCard
          index={2}
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Platform Budget"
          value={`₹${data.total_system_budget.toLocaleString()}`}
        />
        <StatCard
          index={3}
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Actual Spend"
          value={`₹${data.total_system_spent.toLocaleString()}`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recent_projects.map((project: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">Budget: ₹{project.budget.toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant={project.status === 'in_progress' ? 'default' : 'secondary'} className="capitalize">
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Active Users Ratio</span>
                  <span className="font-medium">{Math.round((data.active_users / (data.total_users || 1)) * 100)}%</span>
                </div>
                <Progress value={(data.active_users / (data.total_users || 1)) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Projects In Progress</span>
                  <span className="font-medium">{Math.round((data.projects_by_status.in_progress / (data.total_projects || 1)) * 100)}%</span>
                </div>
                <Progress value={(data.projects_by_status.in_progress / (data.total_projects || 1)) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">System Budget Consumed</span>
                  <span className="font-medium">{Math.round((data.total_system_spent / (data.total_system_budget || 1)) * 100)}%</span>
                </div>
                <Progress value={(data.total_system_spent / (data.total_system_budget || 1)) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const roleComponents: Record<UserRole, React.FC<RoleSectionProps>> = {
  site_engineer: SiteEngineerDashboard,
  project_manager: ProjectManagerDashboard,
  company_owner: OwnerDashboard as unknown as React.FC<RoleSectionProps>,
  super_admin: SuperAdminDashboard as unknown as React.FC<RoleSectionProps>,
  accountant: AccountantDashboard as unknown as React.FC<RoleSectionProps>,
  contractor: ContractorDashboard as unknown as React.FC<RoleSectionProps>,
  client: ClientDashboard as unknown as React.FC<RoleSectionProps>,
}

export default function DashboardPage() {
  const { user } = useAuth()
  const role = user?.role

  const selectedProjectId = localStorage.getItem('selected_project_id') || ''

  const RoleComponent = role ? roleComponents[role] : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.full_name || user?.username}
          </p>
        </div>
      </div>

      {!selectedProjectId && role !== 'company_owner' && role !== 'super_admin' && role !== 'client' ? (
        <EmptyState title="No Project Selected" description="Please select a project from the top navigation to view its dashboard." />
      ) : RoleComponent ? (
        <RoleComponent projectId={selectedProjectId} />
      ) : (
        <EmptyState title="Not Configured" description="Dashboard view not configured for your role" />
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  children,
  variant,
  index = 0,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  children?: React.ReactNode
  variant?: 'default' | 'destructive'
  index?: number
}) {
  const isDestructive = variant === 'destructive'
  return (
    <AnimatedCard
      index={index}
      className={`stat-card group ${
        isDestructive
          ? 'border-red-500/20 dark:border-red-500/20'
          : 'border-border/50'
      }`}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {label}
        </CardTitle>
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 ${
            isDestructive
              ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'
              : 'bg-primary/10 text-primary shadow-primary/10'
          }`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-3xl font-bold tracking-tight mb-1 ${
          isDestructive ? 'text-red-600 dark:text-red-400' : ''
        }`}>{value}</div>
        {subtext && (
          <p className="text-xs text-muted-foreground">{subtext}</p>
        )}
        {children}
      </CardContent>
    </AnimatedCard>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-6 rounded-2xl border border-border/50 bg-card space-y-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

