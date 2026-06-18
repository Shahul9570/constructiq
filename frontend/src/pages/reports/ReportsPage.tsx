import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/report.service'
import {
  FileText,
  Download,
  Calendar,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

type ReportType = 'daily' | 'weekly' | 'monthly' | 'labour' | 'material' | 'cost'

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('daily')
  const [exportFormat, setExportFormat] = useState('json')
  const [generatedReport, setGeneratedReport] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0])
  const [weeklyDate, setWeeklyDate] = useState(new Date().toISOString().split('T')[0])
  const [monthYear, setMonthYear] = useState(new Date().getFullYear())
  const [monthNum, setMonthNum] = useState(new Date().getMonth() + 1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const pid = projectId()

  const handleGenerate = async () => {
    if (!pid) {
      toast.error('Select a project first')
      return
    }
    setIsGenerating(true)
    setGeneratedReport(null)
    try {
      let result: any
      switch (reportType) {
        case 'daily':
          result = await reportService.getDaily(pid, dailyDate, exportFormat)
          break
        case 'weekly':
          result = await reportService.getWeekly(pid, weeklyDate, exportFormat)
          break
        case 'monthly':
          result = await reportService.getMonthly(pid, monthYear, monthNum, exportFormat)
          break
        case 'labour':
          result = await reportService.getLabour(pid, dateFrom, dateTo, exportFormat)
          break
        case 'material':
          result = await reportService.getMaterial(pid, dateFrom, dateTo, exportFormat)
          break
        case 'cost':
          result = await reportService.getCost(pid, dateFrom, dateTo, exportFormat)
          break
      }
      setGeneratedReport(result)
      toast.success('Report generated successfully')
    } catch (err) {
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!pid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate project reports</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project to generate reports</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate project reports</p>
      </div>

      <Tabs value={reportType} onValueChange={(v) => { setReportType(v as ReportType); setGeneratedReport(null) }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="labour">Labour</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              {reportType === 'daily' && (
                <div className="grid gap-2 flex-1">
                  <Label>Report Date</Label>
                  <Input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
                </div>
              )}
              {reportType === 'weekly' && (
                <div className="grid gap-2 flex-1">
                  <Label>Week Ending Date</Label>
                  <Input type="date" value={weeklyDate} onChange={(e) => setWeeklyDate(e.target.value)} />
                </div>
              )}
              {reportType === 'monthly' && (
                <div className="flex gap-4 flex-1">
                  <div className="grid gap-2 flex-1">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={monthYear}
                      onChange={(e) => setMonthYear(Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2 flex-1">
                    <Label>Month</Label>
                    <Select value={String(monthNum)} onValueChange={(v) => setMonthNum(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {(reportType === 'labour' || reportType === 'material' || reportType === 'cost') && (
                <div className="flex gap-4 flex-1">
                  <div className="grid gap-2 flex-1">
                    <Label>From</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="grid gap-2 flex-1">
                    <Label>To</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="grid gap-2 min-w-[140px]">
                <Label>Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={isGenerating} className="min-w-[140px]">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Tabs>

      {isGenerating && (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}

      {generatedReport && !isGenerating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded-lg p-4 overflow-auto max-h-[600px] text-sm whitespace-pre-wrap font-mono">
              {typeof generatedReport === 'string'
                ? generatedReport
                : JSON.stringify(generatedReport, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
