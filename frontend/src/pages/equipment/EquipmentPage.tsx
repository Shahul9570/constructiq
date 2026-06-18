import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentService } from '@/services/equipment.service'
import {
  Wrench,
  Search,
  Plus,
  Clock,
  Fuel,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Equipment } from '@/types'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

export default function EquipmentPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isUsageOpen, setIsUsageOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)

  const [form, setForm] = useState({
    name: '',
    equipment_type: '',
    model_number: '',
    status: 'available',
    hourly_rate: 0,
    operator_name: '',
  })

  const [usageForm, setUsageForm] = useState({
    hours_used: 0,
    fuel_used: 0,
    date: new Date().toISOString().split('T')[0],
    operator_name: '',
    activity: '',
    notes: '',
  })

  const pid = projectId()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['equipment', pid, page, search, statusFilter, typeFilter],
    queryFn: () =>
      equipmentService.list(pid, {
        page,
        size: 50,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        equipment_type: typeFilter !== 'all' ? typeFilter : undefined,
      }),
    enabled: !!pid,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      equipmentService.create(pid, {
        name: form.name,
        equipment_type: form.equipment_type,
        model_number: form.model_number || undefined,
        status: form.status,
        hourly_rate: Number(form.hourly_rate),
        operator_name: form.operator_name || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Equipment added successfully')
      setIsAddOpen(false)
      resetForm()
    },
    onError: () => toast.error('Failed to add equipment'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      equipmentService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const usageMutation = useMutation({
    mutationFn: () =>
      equipmentService.recordUsage(selectedEquipment!.id, pid, {
        hours_used: Number(usageForm.hours_used),
        fuel_used: Number(usageForm.fuel_used) || undefined,
        date: usageForm.date,
        operator_name: usageForm.operator_name || undefined,
        activity: usageForm.activity || undefined,
        notes: usageForm.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Usage recorded')
      setIsUsageOpen(false)
      setSelectedEquipment(null)
      resetUsageForm()
    },
    onError: () => toast.error('Failed to record usage'),
  })

  const resetForm = () => {
    setForm({
      name: '',
      equipment_type: '',
      model_number: '',
      status: 'available',
      hourly_rate: 0,
      operator_name: '',
    })
  }

  const resetUsageForm = () => {
    setUsageForm({
      hours_used: 0,
      fuel_used: 0,
      date: new Date().toISOString().split('T')[0],
      operator_name: '',
      activity: '',
      notes: '',
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      available: 'default',
      in_use: 'secondary',
      maintenance: 'destructive',
      out_of_service: 'outline',
    }
    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const equipmentList = data?.items || []

  if (!pid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">Track project equipment and machinery</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project to view equipment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">Track project equipment and machinery</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="in_use">In Use</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="out_of_service">Out of Service</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="excavator">Excavator</SelectItem>
            <SelectItem value="crane">Crane</SelectItem>
            <SelectItem value="concrete_mixer">Concrete Mixer</SelectItem>
            <SelectItem value="compressor">Compressor</SelectItem>
            <SelectItem value="generator">Generator</SelectItem>
            <SelectItem value="welding">Welding</SelectItem>
            <SelectItem value="pump">Pump</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <EquipmentSkeleton />
      ) : isError ? (
        <div className="text-center py-12 text-red-500">Failed to load equipment</div>
      ) : equipmentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No equipment found</p>
          <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Hours Used</TableHead>
                <TableHead className="text-right">Fuel Used</TableHead>
                <TableHead>Last Maintenance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentList.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">{eq.name}</TableCell>
                  <TableCell className="capitalize">{eq.equipment_type}</TableCell>
                  <TableCell className="text-muted-foreground">{eq.model_number || '-'}</TableCell>
                  <TableCell>{getStatusBadge(eq.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{eq.total_hours_used.toFixed(1)}h</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Fuel className="h-3 w-3 text-muted-foreground" />
                      <span>{eq.total_fuel_used.toFixed(1)}L</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {eq.last_maintenance_date
                      ? new Date(eq.last_maintenance_date).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Select
                        value={eq.status}
                        onValueChange={(v) => statusMutation.mutate({ id: eq.id, status: v })}
                      >
                        <SelectTrigger className="h-8 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="in_use">In Use</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="out_of_service">Out of Service</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEquipment(eq)
                          setIsUsageOpen(true)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Usage
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}>
            <DialogHeader>
              <DialogTitle>Add Equipment</DialogTitle>
              <DialogDescription>Add new equipment or machinery.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="eq-name">Name *</Label>
                  <Input id="eq-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eq-type">Type *</Label>
                  <Select required value={form.equipment_type} onValueChange={(v) => setForm({ ...form, equipment_type: v })}>
                    <SelectTrigger id="eq-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excavator">Excavator</SelectItem>
                      <SelectItem value="crane">Crane</SelectItem>
                      <SelectItem value="concrete_mixer">Concrete Mixer</SelectItem>
                      <SelectItem value="compressor">Compressor</SelectItem>
                      <SelectItem value="generator">Generator</SelectItem>
                      <SelectItem value="welding">Welding</SelectItem>
                      <SelectItem value="pump">Pump</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="eq-model">Model Number</Label>
                  <Input id="eq-model" value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eq-rate">Hourly Rate ($)</Label>
                  <Input id="eq-rate" type="number" min="0" step="0.01" value={form.hourly_rate || ''} onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="eq-status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger id="eq-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="out_of_service">Out of Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eq-operator">Operator</Label>
                  <Input id="eq-operator" value={form.operator_name} onChange={(e) => setForm({ ...form, operator_name: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Equipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isUsageOpen} onOpenChange={setIsUsageOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={(e) => { e.preventDefault(); usageMutation.mutate() }}>
            <DialogHeader>
              <DialogTitle>Record Usage - {selectedEquipment?.name}</DialogTitle>
              <DialogDescription>Log hours and fuel consumption.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="us-hours">Hours Used *</Label>
                  <Input id="us-hours" type="number" min="0" step="0.5" required value={usageForm.hours_used || ''} onChange={(e) => setUsageForm({ ...usageForm, hours_used: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="us-fuel">Fuel Used (L)</Label>
                  <Input id="us-fuel" type="number" min="0" step="0.1" value={usageForm.fuel_used || ''} onChange={(e) => setUsageForm({ ...usageForm, fuel_used: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="us-date">Date</Label>
                <Input id="us-date" type="date" required value={usageForm.date} onChange={(e) => setUsageForm({ ...usageForm, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="us-operator">Operator</Label>
                  <Input id="us-operator" value={usageForm.operator_name} onChange={(e) => setUsageForm({ ...usageForm, operator_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="us-activity">Activity</Label>
                  <Input id="us-activity" value={usageForm.activity} onChange={(e) => setUsageForm({ ...usageForm, activity: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="us-notes">Notes</Label>
                <Input id="us-notes" value={usageForm.notes} onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUsageOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={usageMutation.isPending}>
                {usageMutation.isPending ? 'Recording...' : 'Record Usage'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EquipmentSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
