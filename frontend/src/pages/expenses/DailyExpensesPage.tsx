import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Calendar as CalendarIcon, Save } from 'lucide-react'
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
import { labourService, type DailyLabourSummary } from '@/services/labour.service'
import { contractorService } from '@/services/contractor.service'
import type { Contractor } from '@/types'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

export default function DailyExpensesPage() {
  const queryClient = useQueryClient()
  const pid = projectId()
  const [date, setDate] = useState<Date>(new Date())
  
  // State to hold uncommitted paid amounts
  const [paidAmounts, setPaidAmounts] = useState<Record<number, number>>({})

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
      toast.success('Payment recorded successfully')
    },
    onError: () => toast.error('Failed to record payment'),
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
      // Create date object and adjust for timezone offset so the local date matches the input string
      const selectedDate = new Date(e.target.value)
      const userTimezoneOffset = selectedDate.getTimezoneOffset() * 60000
      setDate(new Date(selectedDate.getTime() + userTimezoneOffset))
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

  const items = labourData?.items || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Expenses</h1>
          <p className="text-muted-foreground">Manage daily payouts for labour and teams</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Input 
            type="date"
            value={format(date, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            className="w-auto"
          />
        </div>
      </div>

      <Card>
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
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No labour logged for this date.</p>
              <p className="text-sm mt-1">Make sure you log labour in the Daily Progress or Labour tab first.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team / Contractor</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead className="text-center">Workers</TableHead>
                  <TableHead className="text-right">Daily Rate</TableHead>
                  <TableHead className="text-right">Accrued Cost</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[200px]">Amount Paid Today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const accruedCost = item.workers_count * item.daily_rate
                  const currentPaidValue = paidAmounts[item.id] !== undefined ? paidAmounts[item.id] : (item.paid_amount || 0)
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {getContractorName(item.contractor_id)}
                      </TableCell>
                      <TableCell className="capitalize">{item.trade}</TableCell>
                      <TableCell className="text-center">{item.workers_count}</TableCell>
                      <TableCell className="text-right">${item.daily_rate.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">${accruedCost.toLocaleString()}</TableCell>
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
                            className="w-24 text-right"
                            value={currentPaidValue}
                            onChange={(e) => handlePaidAmountChange(item.id, e.target.value)}
                            disabled={updatePaymentMutation.isPending}
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
