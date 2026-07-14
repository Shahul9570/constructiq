import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractorService } from '@/services/contractor.service'
import { projectService } from '@/services/project.service'
import {
  Users,
  Search,
  Plus,
  Trash2,
  DollarSign,
  Star,
  Phone,
  Building2,
  AlertTriangle,
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
import { useAuth } from '@/hooks/useAuth'
import type { Contractor, ContractorPayment } from '@/types'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

export default function ContractorsPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'project_manager' || user?.role === 'company_owner' || user?.role === 'super_admin' || user?.role === 'site_engineer'
  
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [payments, setPayments] = useState<ContractorPayment[]>([])

  const [form, setForm] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    trade: '',
    team_size: 0,
    contract_amount: 0,
    paid_amount: 0,
    rating: 0,
    user_id: '' as string | number,
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
  })

  const pid = projectId()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contractors', pid, page, search],
    queryFn: () =>
      contractorService.list(pid, {
        page,
        size: 50,
        search: search || undefined,
      }),
    enabled: !!pid,
  })

  const { data: paymentData, refetch: refetchPayments } = useQuery({
    queryKey: ['contractor-payments', selectedContractor?.id],
    queryFn: () => contractorService.listPayments(selectedContractor!.id),
    enabled: !!selectedContractor && isPaymentOpen,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', pid],
    queryFn: () => projectService.getMembers(pid),
    enabled: !!pid && isManager,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      contractorService.create(pid, {
        name: form.name,
        company_name: form.company_name || undefined,
        phone: form.phone,
        email: form.email || undefined,
        trade: form.trade || undefined,
        team_size: Number(form.team_size),
        contract_amount: Number(form.contract_amount),
        paid_amount: Number(form.paid_amount),
        rating: Number(form.rating),
        user_id: form.user_id ? Number(form.user_id) : undefined,
        project_id: pid,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      toast.success('Contractor added successfully')
      setIsAddOpen(false)
      resetForm()
    },
    onError: () => toast.error('Failed to add contractor'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      contractorService.update(selectedContractor!.id, {
        name: form.name,
        company_name: form.company_name || undefined,
        phone: form.phone,
        email: form.email || undefined,
        trade: form.trade || undefined,
        team_size: Number(form.team_size),
        contract_amount: Number(form.contract_amount),
        paid_amount: Number(form.paid_amount),
        rating: Number(form.rating),
        user_id: form.user_id ? Number(form.user_id) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      toast.success('Contractor updated successfully')
      setIsEditOpen(false)
      setSelectedContractor(null)
    },
    onError: () => toast.error('Failed to update contractor'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => contractorService.delete(selectedContractor!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      toast.success('Contractor deleted successfully')
      setIsDeleteOpen(false)
      setSelectedContractor(null)
    },
    onError: () => toast.error('Failed to delete contractor'),
  })

  const paymentMutation = useMutation({
    mutationFn: () =>
      contractorService.createPayment(selectedContractor!.id, {
        amount: Number(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method || undefined,
        notes: paymentForm.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      refetchPayments()
      toast.success('Payment recorded')
      setPaymentForm({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        notes: '',
      })
    },
    onError: () => toast.error('Failed to record payment'),
  })

  const resetForm = () => {
    setForm({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      trade: '',
      team_size: 0,
      contract_amount: 0,
      paid_amount: 0,
      rating: 0,
      user_id: '',
    })
  }

  const openEdit = (c: Contractor) => {
    setSelectedContractor(c)
    setForm({
      name: c.name,
      company_name: c.company_name || '',
      phone: c.phone,
      email: c.email || '',
      trade: c.trade || '',
      team_size: c.team_size,
      contract_amount: c.contract_amount,
      paid_amount: c.paid_amount,
      rating: c.rating,
      user_id: c.user_id || '',
    })
    setIsEditOpen(true)
  }

  const openPayments = (c: Contractor) => {
    setSelectedContractor(c)
    setIsPaymentOpen(true)
  }

  const contractors = data?.items || []

  if (!pid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contractors</h1>
          <p className="text-muted-foreground">Manage project contractors</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project to view contractors</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contractors</h1>
          <p className="text-muted-foreground">Manage project contractors</p>
        </div>
        {isManager && (
          <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contractor
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search contractors..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <ContractorsSkeleton />
      ) : isError ? (
        <div className="text-center py-12 text-red-500">Failed to load contractors</div>
      ) : contractors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No contractors found</p>
          {isManager && (
            <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contractor
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead className="text-center">Team Size</TableHead>
                <TableHead className="text-right">Contract</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                {isManager && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span>{c.company_name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{c.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.trade || 'General'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{c.team_size}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${c.contract_amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    ${c.paid_amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {c.pending_amount < 0 ? (
                      <span className="text-red-500 whitespace-nowrap font-bold flex items-center justify-end gap-1" title="Warning: Contractor has been overpaid relative to the contract amount.">
                        <AlertTriangle className="h-3 w-3" />
                        Overpaid: ${Math.abs(c.pending_amount).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-orange-600 whitespace-nowrap">${c.pending_amount.toLocaleString()}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{c.rating.toFixed(1)}</span>
                    </div>
                  </TableCell>
                  {isManager && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openPayments(c)}>
                          <DollarSign className="h-3 w-3 mr-1" />
                          Payments
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedContractor(c); setIsDeleteOpen(true) }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
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
              <DialogTitle>Add Contractor</DialogTitle>
              <DialogDescription>Add a new contractor to the project.</DialogDescription>
            </DialogHeader>
            <ContractorFormFields form={form} setForm={setForm} members={members} />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Contractor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate() }}>
            <DialogHeader>
              <DialogTitle>Edit Contractor</DialogTitle>
              <DialogDescription>Update contractor details.</DialogDescription>
            </DialogHeader>
            <ContractorFormFields form={form} setForm={setForm} members={members} />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Contractor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedContractor?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Payment History - {selectedContractor?.name}</DialogTitle>
            <DialogDescription>View and record payments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (selectedContractor) paymentMutation.mutate()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
            >
              <div className="grid gap-2">
                <Label htmlFor="pay-amount">Amount ($)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0"
                  required
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-date">Date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-method">Method</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                >
                  <SelectTrigger id="pay-method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-notes">Notes</Label>
                <Input
                  id="pay-notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Button type="submit" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>

            <div>
              <h4 className="text-sm font-medium mb-2">Payment History</h4>
              {!paymentData || paymentData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentData.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-medium">${p.amount.toLocaleString()}</TableCell>
                        <TableCell className="capitalize">{p.payment_method || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ContractorFormFields({
  form,
  setForm,
  members,
}: {
  form: {
    name: string
    company_name: string
    phone: string
    email: string
    trade: string
    team_size: number
    contract_amount: number
    paid_amount: number
    rating: number
    user_id: string | number
  }
  setForm: React.Dispatch<React.SetStateAction<any>>
  members: any[]
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="c-name">Name *</Label>
          <Input id="c-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-user">Link to User Account</Label>
          <Select
            value={form.user_id ? String(form.user_id) : undefined}
            onValueChange={(v) => setForm({ ...form, user_id: v })}
          >
            <SelectTrigger id="c-user">
              <SelectValue placeholder="Select user (optional)" />
            </SelectTrigger>
            <SelectContent>
              {members.map(m => (
                <SelectItem key={m.user_id} value={String(m.user_id)}>
                  {m.user_full_name} ({m.user_role?.replace('_', ' ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="c-company">Company</Label>
          <Input id="c-company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="c-phone">Phone *</Label>
          <Input id="c-phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-email">Email</Label>
          <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="c-trade">Trade</Label>
          <Input id="c-trade" value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-team">Team Size</Label>
          <Input id="c-team" type="number" min="0" value={form.team_size || ''} onChange={(e) => setForm({ ...form, team_size: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="c-contract">Contract Amount ($)</Label>
          <Input id="c-contract" type="number" min="0" value={form.contract_amount || ''} onChange={(e) => setForm({ ...form, contract_amount: Number(e.target.value) })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-paid">Paid Amount ($)</Label>
          <Input id="c-paid" type="number" min="0" value={form.paid_amount || ''} onChange={(e) => setForm({ ...form, paid_amount: Number(e.target.value) })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-rating">Rating (0-5)</Label>
          <Input id="c-rating" type="number" min="0" max="5" step="0.1" value={form.rating || ''} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
        </div>
      </div>
    </div>
  )
}

function ContractorsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
