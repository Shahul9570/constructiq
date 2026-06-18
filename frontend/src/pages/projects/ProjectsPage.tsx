import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project.service'
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import type { Project, ProjectStatus, User } from '@/types'
import { UserRole } from '@/types'
import { userService } from '@/services/user.service'
import { useAuth } from '@/hooks/useAuth'

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  planning: { variant: 'outline', label: 'Planning' },
  in_progress: { variant: 'default', label: 'In Progress' },
  on_hold: { variant: 'secondary', label: 'On Hold' },
  completed: { variant: 'default', label: 'Completed' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
  archived: { variant: 'outline', label: 'Archived' },
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    client_name: '',
    client_id: undefined as number | undefined,
    location: '',
    start_date: '',
    expected_end_date: '',
    budget: 0,
    description: '',
    status: 'planning' as ProjectStatus,
    project_type: 'residential',
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => userService.list({ role: 'client', size: 100 }),
    enabled: isCreateOpen,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['projects', page, search, statusFilter],
    queryFn: () =>
      projectService.list({
        page,
        size: 20,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      projectService.create({
        ...createForm,
        budget: Number(createForm.budget),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsCreateOpen(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => projectService.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  const resetForm = () => {
    setCreateForm({
      name: '',
      client_name: '',
      client_id: undefined,
      location: '',
      start_date: '',
      expected_end_date: '',
      budget: 0,
      description: '',
      status: 'planning' as ProjectStatus,
      project_type: 'residential',
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const filteredProjects = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage all construction projects</p>
        </div>
        {user && [UserRole.SUPER_ADMIN, UserRole.COMPANY_OWNER, UserRole.PROJECT_MANAGER, UserRole.CONTRACTOR].includes(user.role) && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ProjectsSkeleton />
      ) : isError ? (
        <div className="text-center py-12 text-red-500">Failed to load projects</div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No projects found</p>
          <p className="text-muted-foreground text-sm mb-4">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first project to get started'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.client_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {project.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusConfig[project.status]?.variant || 'outline'}
                        className="capitalize"
                      >
                        {statusConfig[project.status]?.label || project.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress_percentage} className="w-20" />
                        <span className="text-sm text-muted-foreground">
                          {project.progress_percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>${project.budget.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.start_date).toLocaleDateString()} -{' '}
                        {new Date(project.expected_end_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/projects/${project.id}`)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              archiveMutation.mutate(project.id)
                            }}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Are you sure you want to delete this project?')) {
                                deleteMutation.mutate(project.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:hidden">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <Badge
                      variant={statusConfig[project.status]?.variant || 'outline'}
                      className="capitalize"
                    >
                      {statusConfig[project.status]?.label || project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {project.client_name}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {project.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress_percentage} className="flex-1" />
                    <span className="text-muted-foreground">{project.progress_percentage}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    ${project.budget.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data && data.total > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new construction project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client">Client</Label>
                <select
                  id="client"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={createForm.client_id || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value ? Number(e.target.value) : undefined
                    const selectedClient = clientsData?.items.find((c) => c.id === selectedId)
                    setCreateForm({ 
                      ...createForm, 
                      client_id: selectedId,
                      client_name: selectedClient ? selectedClient.full_name : ''
                    })
                  }}
                >
                  <option value="">Select a client (Optional)</option>
                  {clientsData?.items.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name} ({client.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Select a registered client to link them to this project.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  required
                  value={createForm.location}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Project Type</Label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={createForm.project_type}
                  onChange={(e) => setCreateForm({ ...createForm, project_type: e.target.value })}
                >
                  <option value="residential">Residential (Auto-generates tasks)</option>
                  <option value="commercial">Commercial (Auto-generates tasks)</option>
                  <option value="industrial">Industrial</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-xs text-muted-foreground">Select Residential or Commercial to automatically generate a standard task checklist.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start">Start Date</Label>
                  <Input
                    id="start"
                    type="date"
                    required
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">Expected End Date</Label>
                  <Input
                    id="end"
                    type="date"
                    required
                    value={createForm.expected_end_date}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, expected_end_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  required
                  value={createForm.budget || ''}
                  onChange={(e) => setCreateForm({ ...createForm, budget: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
