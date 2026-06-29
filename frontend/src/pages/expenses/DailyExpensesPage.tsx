import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Calendar as CalendarIcon, Save, Plus } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { labourService } from '@/services/labour.service'
import { contractorService } from '@/services/contractor.service'
import { financialService } from '@/services/financial.service'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

export default function DailyExpensesPage() {
  const queryClient = useQueryClient()
  const pid = projectId()
  const [date, setDate] = useState<Date>(new Date())
  
  // State to hold uncommitted paid amounts
  const [paidAmounts, setPaidAmounts] = useState<Record<number, number>>({})

  // Modal state for Other Expenses
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState<{
    category: string
    amount: string
    description: string
    date: string
    reference_id?: string
  }>({
    category: 'material',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  })

  // Fetch Direct Labour Summary
  const { data: directLabourSummary } = useQuery({
    queryKey: ['direct-labour-summary', pid],
    queryFn: () => labourService.getDirectLabourSummary(pid),
    enabled: !!pid,
  })

  // Fetch Labour Summaries for the selected date
  const { data: labourData, isLoading: isLoadingLabour } = useQuery({
    queryKey: ['labour-expenses', pid, format(date, 'yyyy-MM-dd')],
    queryFn: () =>
      labourService.list(pid, {
        date_from: format(date, 'yyyy-MM-dd'),
        date_to: format(date, 'yyyy-MM-dd'),
        size: 100,
      }),
    enabled: !!pid,
  })

  // Fetch Contractors to map names
  const { data: contractorsData } = useQuery({
    queryKey: ['contractors-list', pid],
    queryFn: () => contractorService.list(pid, { size: 100 }),
    enabled: !!pid,
  })

  // Fetch Other Expenses (Cost Records) for the selected date
  const { data: costsData, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['daily-costs', pid, format(date, 'yyyy-MM-dd')],
    queryFn: () => financialService.listCosts(pid, {
      date_from: format(date, 'yyyy-MM-dd'),
      date_to: format(date, 'yyyy-MM-dd'),
    }),
    enabled: !!pid,
  })

  const contractors = contractorsData?.items || []
  const getContractorName = (id?: number) => {
    if (!id) return 'Direct Labour'
    return contractors.find(c => c.id === id)?.name || `Team #${id}`
  }

  // Update paid amount mutation
  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, paid_amount }: { id: number, paid_amount: number }) => 
      labourService.update(id, { paid_amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labour-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['contractors'] }) // Invalidate ledger
      queryClient.invalidateQueries({ queryKey: ['direct-labour-summary'] }) // Invalidate direct labour ledger
      toast.success('Payment recorded successfully')
    },
    onError: () => toast.error('Failed to record payment'),
  })

  // Add other expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: (data: any) => financialService.addCost(pid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-costs'] })
      toast.success('Expense logged successfully')
      setIsExpenseOpen(false)
      setExpenseForm({ category: 'material', amount: '', description: '', date: format(date, 'yyyy-MM-dd') })
    },
    onError: () => {
      toast.error('Failed to log expense')
    }
  })

  const handlePaidAmountChange = (id: number, value: string) => {
    setPaidAmounts(prev => ({
      ...prev,
      [id]: Number(value)
    }))
  }

  const handleSavePayment = (id: number) => {
    const amount = paidAmounts[id]
    if (amount === undefined || amount < 0) {
      toast.error('Invalid amount')
      return
    }
    updatePaymentMutation.mutate({ id, paid_amount: amount })
  }

  // Initialize paidAmounts from fetched data
  useEffect(() => {
    if (labourData?.items) {
      const initial: Record<number, number> = {}
      labourData.items.forEach(item => {
        if (item.paid_amount) {
          initial[item.id] = item.paid_amount
        }
      })
      setPaidAmounts(initial)
    }
  }, [labourData])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const selectedDate = new Date(e.target.value)
      const userTimezoneOffset = selectedDate.getTimezoneOffset() * 60000
      const newDate = new Date(selectedDate.getTime() + userTimezoneOffset)
      setDate(newDate)
      setExpenseForm(prev => ({ ...prev, date: format(newDate, 'yyyy-MM-dd') }))
    }
  }

  if (!pid) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <DollarSign className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-medium text-muted-foreground">Please select a project first</h2>
      </div>
    )
  }

  const labourItems = labourData?.items || []
  const costItems = costsData || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Expenses</h1>
          <p className="text-muted-foreground">Manage and track all daily outlays for your project</p>
        </div>
        
        <div className="flex items-center gap-4">
          {directLabourSummary && (
            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 px-4 py-2 rounded-lg flex flex-col items-end">
              <span className="text-xs uppercase font-semibold tracking-wider opacity-80">Direct Labour Pending</span>
              <span className="text-lg font-bold">${directLabourSummary.pending_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-lg h-[46px]">
            <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
            <Input 
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="w-auto border-0 bg-transparent focus-visible:ring-0 text-sm font-medium"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="labour" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <TabsTrigger value="labour" className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Labour Payouts
          </TabsTrigger>
          <TabsTrigger value="other" className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Other Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="labour" className="space-y-4 outline-none">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Labour Payouts for {format(date, 'MMM do, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLabour ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : labourItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-slate-800 rounded-xl">
                  <p>No labour logged for this date.</p>
                  <p className="text-sm mt-1">Make sure you log labour in the Daily Progress or Labour tab first.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-900/80">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead>Team / Contractor</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead className="text-center">Workers</TableHead>
                        <TableHead className="text-right">Daily Cost</TableHead>
                        <TableHead className="text-right">Total Pending Balance</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[200px]">Amount Paid Today</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labourItems.map((item) => {
                        const accruedCost = item.workers_count * item.daily_rate
                        const currentPaidValue = paidAmounts[item.id] !== undefined ? paidAmounts[item.id] : (item.paid_amount || 0)
                        const contractor = contractors.find(c => c.id === item.contractor_id)
                        const pendingBalance = contractor ? contractor.pending_amount : accruedCost - currentPaidValue
                        
                        return (
                          <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/30">
                            <TableCell className="font-medium">
                              {getContractorName(item.contractor_id)}
                            </TableCell>
                            <TableCell className="capitalize">{item.trade}</TableCell>
                            <TableCell className="text-center">{item.workers_count}</TableCell>
                            <TableCell className="text-right">${accruedCost.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold text-orange-400">
                              ${pendingBalance.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={item.verification_status === 'approved' ? 'default' : 'secondary'}
                                className="capitalize"
                              >
                                {item.verification_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  min="0"
                                  placeholder="0.00"
                                  className="w-24 text-right bg-slate-900 border-slate-700"
                                  value={currentPaidValue}
                                  onChange={(e) => handlePaidAmountChange(item.id, e.target.value)}
                                  disabled={updatePaymentMutation.isPending}
                                />
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                  onClick={() => handleSavePayment(item.id)}
                                  disabled={updatePaymentMutation.isPending || currentPaidValue === item.paid_amount}
                                  title="Save Payment"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other" className="space-y-4 outline-none">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle>Other Expenses for {format(date, 'MMM do, yyyy')}</CardTitle>
              <Button 
                onClick={() => setIsExpenseOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Log Expense
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingCosts ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : costItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-slate-800 rounded-xl">
                  <p>No other expenses logged for this date.</p>
                  <p className="text-sm mt-1">Click 'Log Expense' to add material, equipment, or miscellaneous costs.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-900/80">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costItems.map((cost) => (
                        <TableRow key={cost.id} className="border-slate-800 hover:bg-slate-800/30">
                          <TableCell className="capitalize font-medium text-slate-300">
                            {cost.category}
                          </TableCell>
                          <TableCell>{cost.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={cost.status === 'approved' ? 'default' : cost.status === 'rejected' ? 'destructive' : 'secondary'}
                              className="capitalize"
                            >
                              {cost.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-orange-400">
                            ${cost.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-white">Log Daily Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label className="text-slate-400">Category</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v, reference_id: undefined })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {expenseForm.category === 'contractor' && (
              <div className="grid gap-2">
                <Label className="text-slate-400">Select Contractor</Label>
                <Select 
                  value={expenseForm.reference_id} 
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, reference_id: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Select a contractor" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    {contractors.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label className="text-slate-400">Amount ($)</Label>
              <Input
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0.00"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-400">Description</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="e.g. Paid contractor for cement delivery"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-400">Date</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsExpenseOpen(false)} className="hover:bg-slate-800 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={() => addExpenseMutation.mutate({
                ...expenseForm,
                amount: parseFloat(expenseForm.amount),
                reference_type: expenseForm.category === 'contractor' ? 'contractor' : undefined,
                reference_id: expenseForm.reference_id ? parseInt(expenseForm.reference_id) : undefined
              })}
              disabled={addExpenseMutation.isPending || !expenseForm.amount || !expenseForm.description || (expenseForm.category === 'contractor' && !expenseForm.reference_id)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {addExpenseMutation.isPending ? 'Logging...' : 'Log Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
