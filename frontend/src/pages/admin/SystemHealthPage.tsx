import { useQuery } from '@tanstack/react-query'
import { Activity, Server, Database, HardDrive, Users, FolderKanban, ShieldCheck, Cpu, HardHat, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { adminService } from '@/services/admin.service'

export default function SystemHealthPage() {
  const { data: health, isLoading, isError } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 10000, // auto refresh every 10 sec
  })

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0m'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) return `${hrs}h ${mins}m`
    return `${mins}m`
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
        Measuring system resources & database metrics...
      </div>
    )
  }

  if (isError || !health) {
    return (
      <div className="p-8 text-center text-red-400 bg-red-950/20 rounded-xl border border-red-900/50">
        Failed to fetch system health telemetry.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">System Telemetry & Health</h1>
              <p className="text-slate-400 mt-1 text-sm">Real-time platform resource monitoring, DB metrics, and storage telemetry.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-3.5 py-1.5 rounded-xl text-emerald-400 text-xs font-semibold">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          Platform Operational • Uptime {formatUptime(health.uptime_seconds)}
        </div>
      </div>

      {/* Top Health Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">CPU Usage</p>
              <h3 className="text-2xl font-bold text-white mt-1">{health.cpu_usage_percent.toFixed(1)}%</h3>
              <p className="text-[11px] text-slate-500 mt-1">Worker Core Load</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Cpu className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">RAM Usage</p>
              <h3 className="text-2xl font-bold text-white mt-1">{health.memory_usage_percent.toFixed(1)}%</h3>
              <p className="text-[11px] text-slate-500 mt-1">Virtual Memory</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Server className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Users</p>
              <h3 className="text-2xl font-bold text-white mt-1">{health.active_users} / {health.total_users}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Registered Platform Accounts</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 text-orange-400">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Storage Files</p>
              <h3 className="text-2xl font-bold text-white mt-1">{health.storage_status.total_files}</h3>
              <p className="text-[11px] text-slate-500 mt-1">{health.storage_status.provider}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <HardDrive className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database & Data Telemetry */}
        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-400" />
              Database & Records Volume
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Live count of entity records processed in PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <FolderKanban className="h-4 w-4 text-orange-400" />
                  Projects Tracked
                </div>
                <div className="text-xl font-bold text-white mt-2">{health.total_projects}</div>
              </div>

              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <HardHat className="h-4 w-4 text-amber-400" />
                  Workforce & Labour
                </div>
                <div className="text-xl font-bold text-white mt-2">{health.total_workers}</div>
              </div>

              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <FileText className="h-4 w-4 text-blue-400" />
                  Documents & Blueprints
                </div>
                <div className="text-xl font-bold text-white mt-2">{health.total_documents}</div>
              </div>

              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Audit Security Events
                </div>
                <div className="text-xl font-bold text-white mt-2">{health.total_audit_events}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Role Distribution */}
        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Role Distribution Spectrum
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Breakdown of registered user seats across platform roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(health.role_distribution).map(([role, count]) => {
              const percentage = Math.round((count / (health.total_users || 1)) * 100)
              return (
                <div key={role} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-300 capitalize">
                    <span>{role.replace('_', ' ')}</span>
                    <span className="text-slate-400">{count} users ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
