import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { labourService, DailyLabourSummary } from '@/services/labour.service'
import { contractorService } from '@/services/contractor.service'
import {
  Users,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Wallet,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'

export default function LabourSummaryPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tradeFilter, setTradeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [page] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [trades, setTrades] = useState<string[]>([])
  const [rejectLogId, setRejectLogId] = useState<number | null>(null)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [paymentLogId, setPaymentLogId] = useState<number | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>('')

  const pid = Number(localStorage.getItem('selected_project_id')) || 0

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    trade: '',
    workers_count: 0,
    daily_rate: 0,
    contractor_id: 'none',
    remarks: '',
  })

  useEffect(() => {
    labourService.getTrades().then(setTrades).catch(console.error)
  }, [])

  const { data: contractorsData } = useQuery({
    queryKey: ['contractors', pid],
    queryFn: () => contractorService.list(pid, { size: 100 }),
    enabled: !!pid,
  })

  const contractors = contractorsData?.items || []

  const { data, isLoading, isError } = useQuery({
    queryKey: ['labour', pid, page, tradeFilter, dateFilter],
    queryFn: () =>
      labourService.list(pid, {
        page,
        size: 50,
        trade: tradeFilter !== 'all' ? tradeFilter : undefined,
        date_from: dateFilter || undefined,
        date_to: dateFilter || undefined,
      }),
    enabled: !!pid,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      labourService.create(pid, {
        date: form.date,
        trade: form.trade,
        workers_count: Number(form.workers_count),
        daily_rate: Number(form.daily_rate),
        contractor_id: form.contractor_id !== 'none' ? Number(form.contractor_id) : undefined,
        remarks: form.remarks || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labour'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Labour entry added successfully')
      setIsAddOpen(false)
      resetForm()
    },
    onError: () => toast.error('Failed to add labour entry'),
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, remarks }: { id: number, status: 'approved' | 'rejected', remarks?: string }) =>
      labourService.verify(id, status, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labour'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Labour entry verification updated')
      setRejectLogId(null)
      setRejectRemarks('')
    },
    onError: () => toast.error('Failed to verify labour entry'),
  })

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, paid_amount }: { id: number, paid_amount: number }) =>
      labourService.update(id, { paid_amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labour'] })
      toast.success('Payment updated successfully')
      setPaymentLogId(null)
      setPaymentAmount('')
    },
    onError: () => toast.error('Failed to update payment'),
  })

  const canManage = ['site_engineer', 'project_manager', 'company_owner'].includes(user?.role || '')

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      trade: '',
      workers_count: 0,
      daily_rate: 0,
      contractor_id: 'none',
      remarks: '',
    })
  }

  const getContractorName = (id?: number) => {
    if (!id) return 'Direct / Self'
    return contractors.find(c => c.id === id)?.name || 'Unknown'
  }

  const labourList = data?.items || []

  if (!pid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Labour Summary</h1>
          <p className="text-muted-foreground mt-1">Track daily workforce counts and costs</p>
        </div>
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No Project Selected"
          description="Please select a project from the top navigation bar to view its labour summary."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Labour Summary</h1>
          <p className="text-muted-foreground mt-1">Track daily workforce counts and costs</p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsAddOpen(true) }}
          className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Labour Entry
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={tradeFilter} onValueChange={(v) => setTradeFilter(v)}>
          <SelectTrigger className="w-[200px] rounded-xl">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by Trade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            {trades.map(t => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)} 
            className="w-[200px] rounded-xl"
          />
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="rounded-xl">
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LabourSkeleton />
      ) : isError ? (
        <EmptyState
          title="Error Loading Data"
          description="Failed to load labour summaries. Please try again."
        />
      ) : labourList.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No Labour Entries Yet"
          description="Start tracking your site workforce by adding the first labour entry."
          action={
            <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Labour Entry
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-border/50 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Trade</TableHead>
                <TableHead className="text-right font-semibold">Workers</TableHead>
                <TableHead className="text-right font-semibold">Daily Rate</TableHead>
                <TableHead className="text-right font-semibold">Total Cost</TableHead>
                <TableHead className="text-right font-semibold">Paid</TableHead>
                <TableHead className="text-right font-semibold">Pending</TableHead>
                <TableHead className="font-semibold">Contractor</TableHead>
                <TableHead className="font-semibold">Remarks</TableHead>
                {canManage && <TableHead className="text-right font-semibold">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {labourList.map((l: DailyLabourSummary) => (
                <TableRow key={l.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    {l.verification_status === 'approved' && <Badge className="bg-green-500">Approved</Badge>}
                    {l.verification_status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                    {l.verification_status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                  </TableCell>
                  <TableCell className="font-medium">{new Date(l.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize rounded-full border-primary/20 text-primary bg-primary/5">
                      {l.trade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-lg">{l.workers_count}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <IndianRupee className="h-3 w-3" />
                      <span>{l.daily_rate.toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 font-semibold text-green-600 dark:text-green-400">
                      <IndianRupee className="h-3 w-3" />
                      <span>{(l.workers_count * l.daily_rate).toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <IndianRupee className="h-3 w-3" />
                      <span>{(l.paid_amount || 0).toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-orange-500">
                      <IndianRupee className="h-3 w-3" />
                      <span>{((l.workers_count * l.daily_rate) - (l.paid_amount || 0)).toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{getContractorName(l.contractor_id)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {l.remarks || <span className="text-muted-foreground/40">—</span>}
                    {l.verification_remarks && (
                      <span className="block text-xs text-red-500 mt-1 whitespace-normal">
                        Reject Reason: {l.verification_remarks}
                      </span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {l.verification_status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" size="icon" className="text-green-600 h-8 w-8"
                            onClick={() => verifyMutation.mutate({ id: l.id, status: 'approved' })}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" size="icon" className="text-red-600 h-8 w-8"
                            onClick={() => setRejectLogId(l.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {l.verification_status === 'approved' && !l.contractor_id && (
                        <Button
                          variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-8"
                          onClick={() => {
                            setPaymentLogId(l.id)
                            setPaymentAmount(((l.workers_count * l.daily_rate) - (l.paid_amount || 0)).toString())
                          }}
                        >
                          <Wallet className="h-4 w-4 mr-1" /> Pay
                        </Button>
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
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}>
            <DialogHeader>
              <DialogTitle className="text-xl">Add Daily Labour Entry</DialogTitle>
              <DialogDescription>Record the workforce on site for a given day.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="l-date">Date *</Label>
                  <Input id="l-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="l-trade">Trade Category *</Label>
                  <Select value={form.trade} onValueChange={(v) => setForm({ ...form, trade: v })}>
                    <SelectTrigger id="l-trade">
                      <SelectValue placeholder="Select Trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {trades.map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="l-count">Worker Count *</Label>
                  <Input id="l-count" type="number" min="0" required value={form.workers_count || ''} onChange={(e) => setForm({ ...form, workers_count: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="l-rate">Daily Rate (₹) *</Label>
                  <Input id="l-rate" type="number" min="0" step="0.01" required value={form.daily_rate || ''} onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="l-contractor">Contractor (Optional)</Label>
                <Select value={form.contractor_id} onValueChange={(v) => setForm({ ...form, contractor_id: v })}>
                  <SelectTrigger id="l-contractor">
                    <SelectValue placeholder="Direct / Self" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Direct / Self</SelectItem>
                    {contractors.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="l-remarks">Remarks</Label>
                <Input id="l-remarks" placeholder="Optional notes..." value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !form.trade || form.workers_count <= 0}>
                {createMutation.isPending ? 'Saving...' : 'Save Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectLogId} onOpenChange={(open) => !open && setRejectLogId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reject Labour Entry</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this entry.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-remarks">Remarks / Reason</Label>
            <Input 
              id="reject-remarks" 
              value={rejectRemarks} 
              onChange={(e) => setRejectRemarks(e.target.value)} 
              placeholder="e.g., Incorrect worker count"
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

      <Dialog open={!!paymentLogId} onOpenChange={(open) => !open && setPaymentLogId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Enter the total amount paid so far for this direct labour entry.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="payment-amount">Total Paid Amount (₹)</Label>
            <Input 
              id="payment-amount" 
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount} 
              onChange={(e) => setPaymentAmount(e.target.value)} 
              placeholder="e.g., 1000"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentLogId(null)}>Cancel</Button>
            <Button 
              disabled={!paymentAmount || updatePaymentMutation.isPending}
              onClick={() => paymentLogId && updatePaymentMutation.mutate({ id: paymentLogId, paid_amount: Number(paymentAmount) })}
            >
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LabourSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden">
      <div className="bg-muted/30 px-4 py-3 flex gap-4">
        {['Date', 'Trade', 'Workers', 'Rate', 'Total', 'Contractor'].map(h => (
          <Skeleton key={h} className="h-4 w-20" />
        ))}
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-4 flex gap-4 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-12 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
