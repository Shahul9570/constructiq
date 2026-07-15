import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { billingService } from '@/services/billing.service'
import { format } from 'date-fns'
import {
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Box
} from 'lucide-react'

import { Button } from '@/components/ui/button'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function ClientPortalPage() {
  const selectedProjectNum = Number(localStorage.getItem('selected_project_id')) || undefined
  const queryClient = useQueryClient()

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  
  const [paymentForm, setPaymentForm] = useState({
    payment_method: '',
    notes: '',
    amount: 0,
  })

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['client-portal-invoices', selectedProjectNum],
    queryFn: () => billingService.getClientInvoices(selectedProjectNum!),
    enabled: !!selectedProjectNum,
  })

  const submitPaymentMutation = useMutation({
    mutationFn: () =>
      billingService.submitClientPayment(
        selectedInvoiceId!,
        paymentForm.payment_method,
        paymentForm.amount,
        paymentForm.notes
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-invoices'] })
      setIsPaymentModalOpen(false)
      setSelectedInvoiceId(null)
      setPaymentForm({ payment_method: '', notes: '', amount: 0 })
    },
  })

  const openPaymentModal = (inv: any) => {
    setSelectedInvoiceId(inv.id)
    setPaymentForm({ ...paymentForm, amount: inv.total_amount - (inv.amount_paid || 0) - (inv.pending_amount || 0) })
    setIsPaymentModalOpen(true)
  }

  if (!selectedProjectNum) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-medium text-muted-foreground">Please select your project to view invoices</h2>
      </div>
    )
  }

  // Calculate totals
  const totalDue = invoices?.filter(i => i.status !== 'PAID').reduce((acc, curr) => acc + (curr.total_amount - (curr.amount_paid || 0) - (curr.pending_amount || 0)), 0) || 0
  const totalPending = invoices?.reduce((acc, curr) => acc + (curr.pending_amount || 0), 0) || 0
  const totalPaid = invoices?.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Invoices</h1>
          <p className="text-muted-foreground">View and pay your project bills securely.</p>
        </div>
        
        <Link to={`/projects/${selectedProjectNum}/visualizer`}>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-900/20">
            <Box className="h-4 w-4" />
            View 3D Live Progress
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              ${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-900/80">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading invoices...</TableCell>
                  </TableRow>
                ) : invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found.</TableCell>
                  </TableRow>
                ) : (
                  invoices?.map((inv) => (
                    <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-slate-200">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.issue_date}</TableCell>
                      <TableCell>{inv.due_date || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={inv.status === 'PAID' ? 'default' : inv.status === 'PENDING_VERIFICATION' ? 'secondary' : 'destructive'} 
                          className={`capitalize ${
                            inv.status === 'PENDING_VERIFICATION' ? 'bg-blue-500/20 text-blue-400' : 
                            inv.status === 'PARTIALLY_PAID' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : ''
                          }`}
                        >
                          {inv.status.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400">
                        ${(inv.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-orange-400 font-medium">
                        ${(inv.total_amount - (inv.amount_paid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.status !== 'PAID' && inv.status !== 'PENDING_VERIFICATION' && (
                          <Button 
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => openPaymentModal(inv)}
                          >
                            <CreditCard className="mr-2 h-4 w-4" /> Pay Now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Submit Payment Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Input
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                placeholder="e.g., Bank Transfer, Credit Card"
              />
            </div>
            <div className="grid gap-2">
              <Label>Amount to Pay</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
              <span className="text-xs text-muted-foreground">You can edit this amount if you are making a partial payment.</span>
            </div>
            <div className="grid gap-2">
              <Label>Transaction ID / Reference Note</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Enter receipt or transaction number..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button 
              onClick={() => submitPaymentMutation.mutate()} 
              disabled={submitPaymentMutation.isPending || !paymentForm.payment_method}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitPaymentMutation.isPending ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
