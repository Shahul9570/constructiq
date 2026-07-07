import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { financialService } from '@/services/financial.service'
import { projectService } from '@/services/project.service'
import {
  DollarSign,
  Wrench,
  Package,
  Users,
  TrendingDown,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export default function FinancialPage() {
  const [costCategory, setCostCategory] = useState<string>('all')
  const selectedProjectNum = Number(localStorage.getItem('selected_project_id')) || undefined

  const { data: project } = useQuery({
    queryKey: ['project-detail', selectedProjectNum],
    queryFn: () => projectService.get(selectedProjectNum!),
    enabled: !!selectedProjectNum,
  })

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['cost-summary', selectedProjectNum],
    queryFn: () => financialService.getSummary(selectedProjectNum!),
    enabled: !!selectedProjectNum,
  })

  const { data: budgetTracking, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget-tracking', selectedProjectNum],
    queryFn: () => financialService.getBudgetTracking(selectedProjectNum!),
    enabled: !!selectedProjectNum,
  })

  const { data: costs, isLoading: costsLoading } = useQuery({
    queryKey: ['costs', selectedProjectNum, costCategory],
    queryFn: () =>
      financialService.listCosts(selectedProjectNum!, {
        category: costCategory !== 'all' ? costCategory : undefined,
      }),
    enabled: !!selectedProjectNum,
  })

  const queryClient = useQueryClient()

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', selectedProjectNum],
    queryFn: () => financialService.listInvoices(selectedProjectNum!),
    enabled: !!selectedProjectNum,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => financialService.updateInvoice(id, { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
      queryClient.invalidateQueries({ queryKey: ['budget-tracking'] })
    },
  })

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    invoice_type: 'CLIENT',
    vendor_name: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
  })

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => financialService.createInvoice(selectedProjectNum!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
      queryClient.invalidateQueries({ queryKey: ['budget-tracking'] })
      setIsInvoiceOpen(false)
      setInvoiceForm({ invoice_number: '', invoice_type: 'CLIENT', vendor_name: '', amount: '', issue_date: new Date().toISOString().split('T')[0], due_date: '' })
    },
  })

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: 0,
    amount: '',
    payment_method: 'bank_transfer',
    notes: '',
  })

  const submitPaymentMutation = useMutation({
    mutationFn: (data: any) => financialService.submitPayment(data.invoice_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
      queryClient.invalidateQueries({ queryKey: ['budget-tracking'] })
      setIsPaymentOpen(false)
      setPaymentForm({ invoice_id: 0, amount: '', payment_method: 'bank_transfer', notes: '' })
    },
  })
    labour:    summary?.total_labour_cost    ?? 0,
    material:  summary?.total_material_cost  ?? 0,
    equipment: summary?.total_equipment_cost ?? 0,
    other:     (summary?.total_contractor_cost ?? 0) + (summary?.total_overhead_cost ?? 0),
    total:     summary?.total_cost           ?? 0,
  }

  const budget = budgetTracking || {
    total_budget: project?.budget || 0,
    total_spent: 0,
    remaining_budget: 0,
    utilization_percentage: 0,
  }

  const totalBudget = budget.total_budget || project?.budget || 0
  const utilizationPercent = totalBudget > 0 ? ((budget.total_spent || costSummary.total) / totalBudget) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial</h1>
          <p className="text-muted-foreground">Track project finances and budgets</p>
        </div>
        {selectedProjectNum && (
          <Button onClick={() => setIsInvoiceOpen(true)}>Create Invoice</Button>
        )}
      </div>

      {!selectedProjectNum ? (
        <div className="flex flex-col items-center justify-center py-16">
          <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project from the top navigation to view financial data</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Labour Cost
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(costSummary.labour || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Material Cost
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(costSummary.material || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Equipment Cost
                </CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(costSummary.equipment || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Cost
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(costSummary.total || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Budget Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-xl font-bold">${totalBudget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-xl font-bold">
                    ${(budget.total_spent || costSummary.total || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-xl font-bold">
                    ${(
                      totalBudget - (budget.total_spent || costSummary.total || 0)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-medium">{utilizationPercent.toFixed(1)}%</span>
                </div>
                <Progress
                  value={Math.min(100, utilizationPercent)}
                  className={utilizationPercent > 100 ? 'bg-red-200' : ''}
                />
                {utilizationPercent > 100 && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    Over budget by ${(budget.total_spent - totalBudget).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Cost Records</CardTitle>
                <Select value={costCategory} onValueChange={setCostCategory}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="labour">Labour</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {costsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : !costs?.length ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No cost records found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costs.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell className="capitalize">
                            <Badge variant="secondary">{cost.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {cost.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${cost.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(cost.date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : !invoices?.length ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No invoices found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">
                            {inv.invoice_number}
                          </TableCell>
                          <TableCell className="text-sm">
                            {inv.vendor_name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${inv.total_amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-amber-600">
                            ${(inv.total_amount - (inv.amount_paid || 0)).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                inv.status === 'paid'
                                  ? 'default'
                                  : inv.status === 'partially_paid'
                                    ? 'outline'
                                  : inv.status === 'pending_verification'
                                    ? 'outline'
                                    : inv.status === 'overdue'
                                      ? 'destructive'
                                      : 'secondary'
                              }
                              className="capitalize"
                            >
                              {inv.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.due_date
                              ? new Date(inv.due_date).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {inv.status === 'pending_verification' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'paid' })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'sent' })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                            {(inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'draft' || inv.status === 'partially_paid') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPaymentForm({
                                    invoice_id: inv.id,
                                    amount: (inv.total_amount - (inv.amount_paid || 0)).toString(),
                                    payment_method: 'bank_transfer',
                                    notes: ''
                                  })
                                  setIsPaymentOpen(true)
                                }}
                              >
                                Settle Payment
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Invoice Number</Label>
              <Input
                value={invoiceForm.invoice_number}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                placeholder="INV-001"
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={invoiceForm.invoice_type}
                onValueChange={(val) => setInvoiceForm({ ...invoiceForm, invoice_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Client (Accounts Receivable)</SelectItem>
                  <SelectItem value="MATERIAL">Material Supplier</SelectItem>
                  <SelectItem value="CONTRACTOR">Subcontractor</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipment Rental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {invoiceForm.invoice_type !== 'CLIENT' && (
              <div className="grid gap-2">
                <Label>Vendor Name</Label>
                <Input
                  value={invoiceForm.vendor_name}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor_name: e.target.value })}
                  placeholder="e.g. Acme Equipment Rentals"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                placeholder="0.00"
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInvoiceOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createInvoiceMutation.mutate({
                ...invoiceForm,
                amount: parseFloat(invoiceForm.amount),
                tax_amount: 0,
                status: 'sent',
                vendor_name: invoiceForm.vendor_name || undefined,
                due_date: invoiceForm.due_date || undefined,
              })}
              disabled={createInvoiceMutation.isPending || !invoiceForm.invoice_number || !invoiceForm.amount}
            >
              {createInvoiceMutation.isPending ? 'Saving...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(val) => setPaymentForm({ ...paymentForm, payment_method: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Transaction ID, Check #, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
            <Button
              onClick={() => submitPaymentMutation.mutate({
                ...paymentForm,
                amount: parseFloat(paymentForm.amount)
              })}
              disabled={submitPaymentMutation.isPending || !paymentForm.amount}
            >
              {submitPaymentMutation.isPending ? 'Processing...' : 'Submit Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
