import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sun, CloudRain, Wind, AlertOctagon, Clock, Wrench, Plus, Filter, Calendar, FileText, CheckCircle, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'
import { siteDiaryService, SiteDiaryItem, CreateSiteDiaryInput } from '@/services/site-diary.service'
import { projectService } from '@/services/project.service'

export default function SiteDiaryPage() {
  const queryClient = useQueryClient()

  // State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [workImpactFilter, setWorkImpactFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form State
  const [form, setForm] = useState<CreateSiteDiaryInput>({
    project_id: 0,
    date: new Date().toISOString().split('T')[0],
    weather_condition: 'rain',
    temperature_c: 26,
    rainfall_mm: 15,
    work_impact: 'partial_stoppage',
    crane_stoppage_hours: 3.5,
    lost_man_hours: 48,
    impacted_activities: 'Foundation concreting, Crane tower lifting',
    delay_description: 'Heavy rainfall monsoon storm halted tower crane operation and curing work.',
    shift_type: 'day'
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.list(),
  })

  const projectList = Array.isArray(projectsData)
    ? projectsData
    : (projectsData?.items || [])

  const { data: diaries = [], isLoading } = useQuery({
    queryKey: ['site-diaries', selectedProjectId, workImpactFilter],
    queryFn: () => siteDiaryService.list({
      project_id: selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined,
      work_impact: workImpactFilter !== 'all' ? workImpactFilter : undefined,
    })
  })

  const { data: summary } = useQuery({
    queryKey: ['site-diary-summary', selectedProjectId],
    queryFn: () => siteDiaryService.getSummary({
      project_id: selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined,
    })
  })

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateSiteDiaryInput) => siteDiaryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diaries'] })
      queryClient.invalidateQueries({ queryKey: ['site-diary-summary'] })
      toast.success('Daily Site Diary & Weather log created!')
      setIsCreateOpen(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create site diary entry')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetProject = form.project_id || (projectList.length > 0 ? projectList[0].id : 0)
    if (!targetProject) {
      toast.error('Please select a project')
      return
    }
    createMutation.mutate({ ...form, project_id: targetProject })
  }

  const getWeatherIcon = (cond: string) => {
    switch (cond) {
      case 'rain':
      case 'heavy_rain':
        return <CloudRain className="h-4 w-4 text-blue-400" />
      case 'high_wind':
        return <Wind className="h-4 w-4 text-cyan-400" />
      case 'extreme_heat':
        return <Sun className="h-4 w-4 text-amber-400" />
      default:
        return <Sun className="h-4 w-4 text-orange-400" />
    }
  }

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'full_stoppage':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">Full Site Stoppage</span>
      case 'partial_stoppage':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Partial Stoppage</span>
      case 'minor_delay':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Minor Delay</span>
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Normal Work</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <CloudRain className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Daily Site Diary & Weather Delays</h1>
              <p className="text-slate-400 mt-1 text-sm">Environmental impact tracking, crane downtime logs, and contractual delay evidence.</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            if (projectList.length > 0 && !form.project_id) {
              setForm(f => ({ ...f, project_id: projectList[0].id }))
            }
            setIsCreateOpen(true)
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-950/50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log Weather & Site Diary
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Stoppage Days</p>
              <h3 className="text-2xl font-bold text-red-400 mt-1">{summary?.total_stoppage_days || 0} Days</h3>
              <p className="text-[11px] text-slate-500 mt-1">Weather Stoppage Events</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
              <AlertOctagon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Lost Man-Hours</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">{summary?.total_lost_man_hours || 0} hrs</h3>
              <p className="text-[11px] text-slate-500 mt-1">Cumulative Labour Delay</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Crane Downtime</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1">{summary?.total_crane_stoppage_hours || 0} hrs</h3>
              <p className="text-[11px] text-slate-500 mt-1">High Wind & Rain Stoppage</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
              <Wrench className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Rainfall</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">{summary?.total_rainfall_mm || 0} mm</h3>
              <p className="text-[11px] text-slate-500 mt-1">Monsoon Precipitation</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <CloudRain className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row gap-4 justify-between bg-slate-900/50">
            <div className="flex flex-1 gap-4 items-center flex-wrap">
              <div className="w-[220px]">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="bg-slate-950/50 border-slate-800 focus:ring-orange-500 text-slate-200">
                    <Filter className="w-4 h-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="all">All Projects</SelectItem>
                    {projectList.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[200px]">
                <Select value={workImpactFilter} onValueChange={setWorkImpactFilter}>
                  <SelectTrigger className="bg-slate-950/50 border-slate-800 focus:ring-orange-500 text-slate-200">
                    <Filter className="w-4 h-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="Work Impact" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="all">All Impact Types</SelectItem>
                    <SelectItem value="full_stoppage">Full Site Stoppage</SelectItem>
                    <SelectItem value="partial_stoppage">Partial Stoppage</SelectItem>
                    <SelectItem value="minor_delay">Minor Delay</SelectItem>
                    <SelectItem value="none">Normal Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Total Entries:</span>
              <span className="font-bold text-orange-400">{diaries.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
                Loading daily site diary records...
              </div>
            ) : diaries.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30 text-slate-400" />
                No site diary entries found for the selected criteria.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Project</th>
                    <th className="px-4 py-3.5">Weather & Temp</th>
                    <th className="px-4 py-3.5">Rainfall</th>
                    <th className="px-4 py-3.5">Work Impact</th>
                    <th className="px-4 py-3.5">Downtime (Hrs)</th>
                    <th className="px-4 py-3.5">Impacted Activities</th>
                    <th className="px-4 py-3.5">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
                  {diaries.map((item: SiteDiaryItem) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {item.date}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {item.project_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 capitalize">
                          {getWeatherIcon(item.weather_condition)}
                          <span className="text-slate-300">{item.weather_condition.replace('_', ' ')}</span>
                          <span className="text-slate-500 text-[11px]">({item.temperature_c}°C)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {item.rainfall_mm} mm
                      </td>
                      <td className="px-4 py-3">
                        {getImpactBadge(item.work_impact)}
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-400 font-semibold">
                        <div>{item.lost_man_hours} Man-Hrs</div>
                        <div className="text-[10px] text-cyan-400 font-normal">{item.crane_stoppage_hours} Crane-Hrs</div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                        {item.impacted_activities || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {item.logged_by_name || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Site Diary Entry Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-orange-400" />
              Log Site Diary & Weather Delay
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Project</label>
                <Select
                  value={String(form.project_id || (projectList[0]?.id || ''))}
                  onValueChange={(val) => setForm(f => ({ ...f, project_id: Number(val) }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 text-xs">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    {projectList.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                  className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Weather Condition</label>
                <Select
                  value={form.weather_condition}
                  onValueChange={(val) => setForm(f => ({ ...f, weather_condition: val }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="sunny">Sunny</SelectItem>
                    <SelectItem value="cloudy">Cloudy</SelectItem>
                    <SelectItem value="rain">Rain</SelectItem>
                    <SelectItem value="heavy_rain">Heavy Rain</SelectItem>
                    <SelectItem value="high_wind">High Wind</SelectItem>
                    <SelectItem value="extreme_heat">Extreme Heat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Temp (°C)</label>
                <Input
                  type="number"
                  value={form.temperature_c}
                  onChange={(e) => setForm(f => ({ ...f, temperature_c: Number(e.target.value) }))}
                  className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Rainfall (mm)</label>
                <Input
                  type="number"
                  value={form.rainfall_mm}
                  onChange={(e) => setForm(f => ({ ...f, rainfall_mm: Number(e.target.value) }))}
                  className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Work Impact</label>
                <Select
                  value={form.work_impact}
                  onValueChange={(val) => setForm(f => ({ ...f, work_impact: val }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="none">Normal Work</SelectItem>
                    <SelectItem value="minor_delay">Minor Delay</SelectItem>
                    <SelectItem value="partial_stoppage">Partial Stoppage</SelectItem>
                    <SelectItem value="full_stoppage">Full Site Stoppage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Lost Man-Hours</label>
                <Input
                  type="number"
                  value={form.lost_man_hours}
                  onChange={(e) => setForm(f => ({ ...f, lost_man_hours: Number(e.target.value) }))}
                  className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Crane Downtime (Hrs)</label>
                <Input
                  type="number"
                  value={form.crane_stoppage_hours}
                  onChange={(e) => setForm(f => ({ ...f, crane_stoppage_hours: Number(e.target.value) }))}
                  className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Impacted Activities</label>
              <Input
                placeholder="e.g. Tower crane lifting, Foundation concreting"
                value={form.impacted_activities || ''}
                onChange={(e) => setForm(f => ({ ...f, impacted_activities: e.target.value }))}
                className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Delay Narrative / Notes</label>
              <Input
                placeholder="Log reason for stoppage or delay..."
                value={form.delay_description || ''}
                onChange={(e) => setForm(f => ({ ...f, delay_description: e.target.value }))}
                className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-slate-400">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                {createMutation.isPending ? 'Logging...' : 'Save Site Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
