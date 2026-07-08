import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingService } from '@/services/billing.service'
import { format } from 'date-fns'
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileCheck,
  Plus,
  AlertCircle
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

export default function ClientBillingPage() {
  const selectedProjectNum = Number(localStorage.getItem('selected_project_id')) || undefined
  const queryClient = useQueryClient()

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    vendor_name: '',
    amount: '' as string | number,
    tax_amount: '' as string | number,
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    notes: '',
  })

  const { data: summary } = useQuery({
    queryKey: ['billing-summary', selectedProjectNum],
    queryFn: () => billingService.getSummary(selectedProjectNum!),
    enabled: !!selectedProjectNum,
  })

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['client-invoices', selectedProjectNum],
    queryFn: () => billingService.listInvoices(selectedProjectNum!),
    enabled: !!selectedProjectNum,
  })

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      billingService.createInvoice({
        project_id: selectedProjectNum!,
        invoice_type: 'client',
        invoice_number: invoiceForm.invoice_number,
        vendor_name: invoiceForm.vendor_name,
        amount: Number(invoiceForm.amount),
        tax_amount: Number(invoiceForm.tax_amount || 0),
        amount_paid: 0,
        issue_date: invoiceForm.issue_date,
        due_date: invoiceForm.due_date || undefined,
        notes: invoiceForm.notes,
        status: 'DRAFT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] })
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] })
      setIsInvoiceOpen(false)
      setInvoiceForm({
        invoice_number: '',
        vendor_name: '',
        amount: '',
        tax_amount: '',
        issue_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: '',
        notes: '',
      })
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: number) =>
      billingService.updateInvoice(invoiceId, { status: 'PAID', paid_date: format(new Date(), 'yyyy-MM-dd') }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] })
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] })
    },
  })

  const verifyPaymentMutation = useMutation({
    mutationFn: (invoiceId: number) => billingService.verifyPayment(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] })
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] })
    },
  })

  if (!selectedProjectNum) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <DollarSign className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-medium text-muted-foreground">Please select a project first</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Billing & Revenue</h1>
          <p className="text-muted-foreground">Track generated revenue, outstanding invoices, and project profit margins.</p>
        </div>
        <Button onClick={() => setIsInvoiceOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" /> Issue Invoice
        </Button>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue Billed</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">${summary.total_billed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Collected</CardTitle>
              <FileCheck className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.total_collected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Receivables</CardTitle>
              <Receipt className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">${summary.pending_receivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Profit Margin</CardTitle>
              {summary.is_profitable ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.is_profitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                {summary.profit_margin_percentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cost: ${summary.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
        <CardHeader>
          <CardTitle>Client Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-900/80">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client / Entity</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading invoices...</TableCell>
                  </TableRow>
                ) : invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No client invoices found.</TableCell>
                  </TableRow>
                ) : (
                  invoices?.map((inv) => (
                    <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-emerald-400">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.vendor_name || 'N/A'}</TableCell>
                      <TableCell>{inv.issue_date}</TableCell>
                      <TableCell>{inv.due_date || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={inv.status === 'PAID' ? 'default' : inv.status === 'DRAFT' || inv.status === 'SENT' ? 'secondary' : 'destructive'} 
                          className={`capitalize ${inv.status === 'PENDING_VERIFICATION' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : ''}`}
                        >
                          {inv.status.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-400">
                        ${inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.status === 'PENDING_VERIFICATION' && (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => verifyPaymentMutation.mutate(inv.id)}
                            disabled={verifyPaymentMutation.isPending}
                          >
                            ✓ Confirm Payment
                          </Button>
                        )}
                        {inv.status !== 'PAID' && inv.status !== 'PENDING_VERIFICATION' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                            onClick={() => markPaidMutation.mutate(inv.id)}
                            disabled={markPaidMutation.isPending}
                          >
                            Mark Paid
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

      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Issue Client Invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Invoice Number</Label>
                <Input
                  value={invoiceForm.invoice_number}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                  placeholder="INV-001"
                />
              </div>
              <div className="grid gap-2">
                <Label>Client / Entity Name</Label>
                <Input
                  value={invoiceForm.vendor_name}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor_name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Base Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tax Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceForm.tax_amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={invoiceForm.issue_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={invoiceForm.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                placeholder="Details of services rendered..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInvoiceOpen(false)} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button 
              onClick={() => createInvoiceMutation.mutate()} 
              disabled={createInvoiceMutation.isPending || !invoiceForm.invoice_number || !invoiceForm.amount}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createInvoiceMutation.isPending ? 'Saving...' : 'Save Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
