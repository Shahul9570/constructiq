import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { materialService } from '@/services/material.service'
import { projectService } from '@/services/project.service'
import {
  Package,
  Search,
  Plus,
  Truck,
  MinusCircle,
  AlertTriangle,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { Label } from '@/components/ui/label'

export default function MaterialsPage() {
  const queryClient = useQueryClient()
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isArrivalOpen, setIsArrivalOpen] = useState(false)
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null)
  
  const [expandedMaterial, setExpandedMaterial] = useState<number | null>(null)
  const [settleArrivalId, setSettleArrivalId] = useState<number | null>(null)
  const [settleAmount, setSettleAmount] = useState<number>(0)
  const [historyArrivalId, setHistoryArrivalId] = useState<number | null>(null)

  const [createForm, setCreateForm] = useState({
    name: '',
    material_type: '',
    unit: '',
    current_stock: 0,
    reorder_level: 0,
    unit_price: 0,
    supplier_name: '',
  })

  const [arrivalForm, setArrivalForm] = useState({
    quantity: 0,
    supplier_name: '',
    invoice_number: '',
    invoice_amount: 0,
    paid_amount: 0,
    arrival_date: new Date().toISOString().split('T')[0],
  })

  const [consumptionForm, setConsumptionForm] = useState({
    quantity: 0,
    work_area: '',
    consumption_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const { data: projects } = useQuery({
    queryKey: ['projects-minimal'],
    queryFn: () => projectService.list({ page: 1, size: 100 }),
  })

  const selectedProjectNum = selectedProject ? Number(selectedProject) : projects?.items?.[0]?.id

  const { data, isLoading, isError } = useQuery({
    queryKey: ['materials', selectedProjectNum, page, search, typeFilter],
    queryFn: () =>
      materialService.list(selectedProjectNum!, {
        page,
        size: 50,
        search: search || undefined,
        material_type: typeFilter !== 'all' ? typeFilter : undefined,
      }),
    enabled: !!selectedProjectNum,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      materialService.create(selectedProjectNum!, {
        name: createForm.name,
        material_type: createForm.material_type,
        unit: createForm.unit,
        current_stock: Number(createForm.current_stock),
        reorder_level: Number(createForm.reorder_level),
        unit_price: Number(createForm.unit_price),
        supplier_name: createForm.supplier_name || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
  })

  const arrivalMutation = useMutation({
    mutationFn: () =>
      materialService.addArrival(selectedMaterial!, {
        quantity: Number(arrivalForm.quantity),
        supplier_name: arrivalForm.supplier_name || undefined,
        invoice_number: arrivalForm.invoice_number || undefined,
        invoice_amount: Number(arrivalForm.invoice_amount),
        paid_amount: Number(arrivalForm.paid_amount),
        arrival_date: arrivalForm.arrival_date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      setIsArrivalOpen(false)
      setSelectedMaterial(null)
      resetArrivalForm()
    },
  })

  const consumptionMutation = useMutation({
    mutationFn: () =>
      materialService.addConsumption(selectedMaterial!, {
        quantity: Number(consumptionForm.quantity),
        work_area: consumptionForm.work_area || undefined,
        consumption_date: consumptionForm.consumption_date,
        notes: consumptionForm.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      setIsConsumptionOpen(false)
      setSelectedMaterial(null)
      resetConsumptionForm()
    },
  })

  const settleMutation = useMutation({
    mutationFn: () => {
      return materialService.addPayment(settleArrivalId!, {
        amount: Number(settleAmount),
        payment_date: new Date().toISOString().split('T')[0],
        notes: 'Manual payment settlement',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      setSettleArrivalId(null)
      setSettleAmount(0)
    },
  })

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      material_type: '',
      unit: '',
      current_stock: 0,
      reorder_level: 0,
      unit_price: 0,
      supplier_name: '',
    })
  }

  const resetArrivalForm = () => {
    setArrivalForm({
      quantity: 0,
      supplier_name: '',
      invoice_number: '',
      invoice_amount: 0,
      paid_amount: 0,
      arrival_date: new Date().toISOString().split('T')[0],
    })
  }

  const resetConsumptionForm = () => {
    setConsumptionForm({
      quantity: 0,
      work_area: '',
      consumption_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const handleArrival = (e: React.FormEvent) => {
    e.preventDefault()
    arrivalMutation.mutate()
  }

  const handleConsumption = (e: React.FormEvent) => {
    e.preventDefault()
    consumptionMutation.mutate()
  }

  const lowStockMaterials = data?.items?.filter((m) => m.is_low_stock) || []
  const materials = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Materials</h1>
          <p className="text-muted-foreground">Track material inventory and stock</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.items?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cement">Cement</SelectItem>
            <SelectItem value="steel">Steel</SelectItem>
            <SelectItem value="aggregate">Aggregate</SelectItem>
            <SelectItem value="brick">Brick</SelectItem>
            <SelectItem value="wood">Wood</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="plumbing">Plumbing</SelectItem>
            <SelectItem value="finishing">Finishing</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lowStockMaterials.length > 0 && (
        <Card className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
                Low Stock Alerts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockMaterials.map((m) => (
                <Badge key={m.id} variant="destructive">
                  {m.name} - {m.current_stock} {m.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedProjectNum ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project to view materials</p>
        </div>
      ) : isLoading ? (
        <MaterialsSkeleton />
      ) : isError ? (
        <div className="text-center py-12 text-red-500">Failed to load materials</div>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No materials found</p>
          <p className="text-muted-foreground text-sm mb-4">
            {search || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add materials to track inventory'}
          </p>
          {!search && typeFilter === 'all' && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => {
                const stockPercent =
                  material.reorder_level > 0
                    ? Math.min(100, (material.current_stock / (material.reorder_level * 2)) * 100)
                    : 50
                const isExpanded = expandedMaterial === material.id
                return (
                  <React.Fragment key={material.id}>
                    <TableRow
                      className={`cursor-pointer ${material.is_low_stock ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
                      onClick={() => setExpandedMaterial(isExpanded ? null : material.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {material.name}
                          {material.is_low_stock && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{material.material_type}</TableCell>
                      <TableCell>
                        <span className={material.is_low_stock ? 'text-red-600 font-medium' : ''}>
                          {material.current_stock} {material.unit}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={stockPercent}
                            className={`h-2 w-16 ${
                              material.is_low_stock ? 'bg-red-200' : ''
                            }`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {material.current_stock}/{material.reorder_level * 2} {material.unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>${material.unit_price.toFixed(2)}</TableCell>
                      <TableCell>{material.supplier_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMaterial(material.id)
                              setIsArrivalOpen(true)
                            }}
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            Arrival
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMaterial(material.id)
                              setIsConsumptionOpen(true)
                            }}
                          >
                            <MinusCircle className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-4 border-b">
                            <h4 className="font-semibold mb-2">Deliveries Ledger</h4>
                            {material.arrivals && material.arrivals.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Supplier & Invoice</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Invoice Amt</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Pending</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {material.arrivals.map((arrival) => {
                                    const pending = arrival.invoice_amount - arrival.paid_amount
                                    return (
                                      <TableRow key={arrival.id}>
                                        <TableCell>{arrival.arrival_date}</TableCell>
                                        <TableCell>
                                          <div className="font-medium">{arrival.supplier_name || '-'}</div>
                                          <div className="text-xs text-muted-foreground">{arrival.invoice_number || 'No invoice'}</div>
                                        </TableCell>
                                        <TableCell>{arrival.quantity} {material.unit}</TableCell>
                                        <TableCell>${arrival.invoice_amount.toLocaleString()}</TableCell>
                                        <TableCell>${arrival.paid_amount.toLocaleString()}</TableCell>
                                        <TableCell>
                                          {pending > 0 ? (
                                            <span className="text-red-500 font-medium">${pending.toLocaleString()}</span>
                                          ) : (
                                            <span className="text-green-500">Settled</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                          <Button size="sm" variant="ghost" className="text-blue-600 h-8" onClick={() => setHistoryArrivalId(arrival.id)}>
                                            History
                                          </Button>
                                          {pending > 0 && (
                                            <Button size="sm" variant="outline" className="h-8" onClick={() => setSettleArrivalId(arrival.id)}>
                                              Pay
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground">No deliveries recorded yet.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>

          {data && data.total > 50 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of {data.total}
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
                  disabled={page * 50 >= data.total}
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
              <DialogTitle>Add Material</DialogTitle>
              <DialogDescription>Add a new material to track inventory.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="mat-name">Material Name</Label>
                  <Input
                    id="mat-name"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mat-type">Type</Label>
                  <Select
                    value={createForm.material_type || undefined}
                    onValueChange={(v) => setCreateForm({ ...createForm, material_type: v })}
                    required
                  >
                    <SelectTrigger id="mat-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cement">Cement</SelectItem>
                      <SelectItem value="steel">Steel</SelectItem>
                      <SelectItem value="sand">Sand</SelectItem>
                      <SelectItem value="aggregate">Aggregate</SelectItem>
                      <SelectItem value="bricks">Bricks</SelectItem>
                      <SelectItem value="paint">Paint</SelectItem>
                      <SelectItem value="tiles">Tiles</SelectItem>
                      <SelectItem value="wood">Wood</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="mat-unit">Unit</Label>
                  <Select
                    value={createForm.unit || undefined}
                    onValueChange={(v) => setCreateForm({ ...createForm, unit: v })}
                    required
                  >
                    <SelectTrigger id="mat-unit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">KG</SelectItem>
                      <SelectItem value="tonne">Tonne</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="cubic_ft">Cubic Ft</SelectItem>
                      <SelectItem value="cubic_m">Cubic M</SelectItem>
                      <SelectItem value="numbers">Numbers</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                      <SelectItem value="square_ft">Square Ft</SelectItem>
                      <SelectItem value="rolls">Rolls</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mat-stock">Initial Stock</Label>
                  <Input
                    id="mat-stock"
                    type="number"
                    min="0"
                    required
                    value={createForm.current_stock || ''}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, current_stock: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mat-reorder">Reorder Level</Label>
                  <Input
                    id="mat-reorder"
                    type="number"
                    min="0"
                    required
                    value={createForm.reorder_level || ''}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, reorder_level: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="mat-price">Unit Price ($)</Label>
                  <Input
                    id="mat-price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={createForm.unit_price || ''}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, unit_price: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mat-supplier">Supplier (optional)</Label>
                  <Input
                    id="mat-supplier"
                    value={createForm.supplier_name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, supplier_name: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isArrivalOpen} onOpenChange={setIsArrivalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleArrival}>
            <DialogHeader>
              <DialogTitle>Record Material Arrival</DialogTitle>
              <DialogDescription>Add stock from a new delivery.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="arr-qty">Quantity</Label>
                <Input
                  id="arr-qty"
                  type="number"
                  min="0"
                  required
                  value={arrivalForm.quantity || ''}
                  onChange={(e) =>
                    setArrivalForm({ ...arrivalForm, quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="arr-supplier">Supplier (optional)</Label>
                <Input
                  id="arr-supplier"
                  value={arrivalForm.supplier_name}
                  onChange={(e) =>
                    setArrivalForm({ ...arrivalForm, supplier_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="arr-invoice">Invoice # (optional)</Label>
                  <Input
                    id="arr-invoice"
                    value={arrivalForm.invoice_number}
                    onChange={(e) =>
                      setArrivalForm({ ...arrivalForm, invoice_number: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="arr-amount">Invoice Amount ($)</Label>
                  <Input
                    id="arr-amount"
                    type="number"
                    min="0"
                    value={arrivalForm.invoice_amount || ''}
                    onChange={(e) =>
                      setArrivalForm({ ...arrivalForm, invoice_amount: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="arr-paid">Paid Amount ($)</Label>
                  <Input
                    id="arr-paid"
                    type="number"
                    min="0"
                    value={arrivalForm.paid_amount || ''}
                    onChange={(e) =>
                      setArrivalForm({ ...arrivalForm, paid_amount: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="arr-date">Arrival Date</Label>
                <Input
                  id="arr-date"
                  type="date"
                  required
                  value={arrivalForm.arrival_date}
                  onChange={(e) =>
                    setArrivalForm({ ...arrivalForm, arrival_date: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsArrivalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={arrivalMutation.isPending}>
                {arrivalMutation.isPending ? 'Recording...' : 'Record Arrival'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isConsumptionOpen} onOpenChange={setIsConsumptionOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleConsumption}>
            <DialogHeader>
              <DialogTitle>Record Material Consumption</DialogTitle>
              <DialogDescription>Log material used on site.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="con-qty">Quantity Used</Label>
                <Input
                  id="con-qty"
                  type="number"
                  min="0"
                  required
                  value={consumptionForm.quantity || ''}
                  onChange={(e) =>
                    setConsumptionForm({ ...consumptionForm, quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="con-area">Work Area (optional)</Label>
                <Input
                  id="con-area"
                  value={consumptionForm.work_area}
                  onChange={(e) =>
                    setConsumptionForm({ ...consumptionForm, work_area: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="con-date">Date</Label>
                <Input
                  id="con-date"
                  type="date"
                  required
                  value={consumptionForm.consumption_date}
                  onChange={(e) =>
                    setConsumptionForm({ ...consumptionForm, consumption_date: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="con-notes">Notes (optional)</Label>
                <Input
                  id="con-notes"
                  value={consumptionForm.notes}
                  onChange={(e) =>
                    setConsumptionForm({ ...consumptionForm, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsConsumptionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={consumptionMutation.isPending}>
                {consumptionMutation.isPending ? 'Recording...' : 'Record Consumption'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={settleArrivalId !== null} onOpenChange={(open) => !open && setSettleArrivalId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={(e) => { e.preventDefault(); settleMutation.mutate(); }}>
            <DialogHeader>
              <DialogTitle>Settle Delivery Payment</DialogTitle>
              <DialogDescription>Enter the amount you are paying today towards this delivery.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="settle-amt">Payment Amount ($)</Label>
                <Input
                  id="settle-amt"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={settleAmount || ''}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettleArrivalId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={settleMutation.isPending || !settleAmount}>
                {settleMutation.isPending ? 'Processing...' : 'Settle Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={historyArrivalId !== null} onOpenChange={(open) => !open && setHistoryArrivalId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>A log of all payments made for this delivery.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {historyArrivalId && (
              (() => {
                const arrival = materials.flatMap(m => m.arrivals).find(a => a.id === historyArrivalId)
                if (!arrival || !arrival.payments || arrival.payments.length === 0) {
                  return <p className="text-muted-foreground text-center py-4">No payments recorded yet.</p>
                }
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arrival.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.payment_date}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ${payment.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              })()
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryArrivalId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MaterialsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted rounded animate-pulse" />
      ))}
    </div>
  )
}
