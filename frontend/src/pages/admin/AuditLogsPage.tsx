import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, Search, Filter, RefreshCw, Terminal, ChevronLeft, ChevronRight, Globe, Calendar } from 'lucide-react'
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
import { adminService, AuditLogItem } from '@/services/admin.service'

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-logs', page, action, search],
    queryFn: () => adminService.getAuditLogs({ page, size: pageSize, action: action !== 'all' ? action : undefined, search: search || undefined }),
  })

  const logs = data?.items || []
  const totalPages = data?.pages || 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">System Audit Logs</h1>
              <p className="text-slate-400 mt-1 text-sm">Real-time security trail, compliance tracking, and platform actions.</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 shadow-lg"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Logs
        </Button>
      </div>

      <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row gap-4 justify-between bg-slate-900/50">
            <div className="flex flex-1 gap-4 items-center flex-wrap">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search logs by action, IP, or user..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 bg-slate-950/50 border-slate-800 focus-visible:ring-orange-500 text-slate-200"
                />
              </div>
              <div className="w-[200px]">
                <Select
                  value={action}
                  onValueChange={(val) => {
                    setAction(val)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-slate-950/50 border-slate-800 focus:ring-orange-500 text-slate-200">
                    <Filter className="w-4 h-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="Action Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="USER_STATUS_UPDATED">USER_STATUS_UPDATED</SelectItem>
                    <SelectItem value="PLATFORM_SETTINGS_UPDATED">PLATFORM_SETTINGS_UPDATED</SelectItem>
                    <SelectItem value="USER_REGISTERED">USER_REGISTERED</SelectItem>
                    <SelectItem value="LOGIN_SUCCESS">LOGIN_SUCCESS</SelectItem>
                    <SelectItem value="PROJECT_CREATED">PROJECT_CREATED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
              <span>Total Audit Records:</span>
              <span className="font-bold text-orange-400">{data?.total || 0}</span>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
                Fetching security audit trail...
              </div>
            ) : isError ? (
              <div className="p-8 text-center text-red-400 bg-red-950/20 m-4 rounded-xl border border-red-900/50">
                Failed to load audit logs. Please try refreshing.
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <Terminal className="h-12 w-12 mx-auto mb-3 opacity-30 text-slate-400" />
                No audit log entries match your criteria.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Action</th>
                    <th className="px-4 py-3.5">Entity</th>
                    <th className="px-4 py-3.5">IP Address</th>
                    <th className="px-4 py-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {logs.map((log: AuditLogItem) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-semibold shrink-0">
                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="text-white font-medium text-xs">{log.user_name || 'System'}</div>
                            <div className="text-[11px] text-slate-500">{log.user_email || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {log.entity_type ? `${log.entity_type} #${log.entity_id || ''}` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-slate-500" />
                          {log.ip_address || '127.0.0.1'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800/60 flex items-center justify-between bg-slate-900/50">
              <span className="text-xs text-slate-400">
                Page <span className="text-white font-bold">{page}</span> of{' '}
                <span className="text-white font-bold">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-slate-950/50 border-slate-800 text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="bg-slate-950/50 border-slate-800 text-slate-300 hover:text-white"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
