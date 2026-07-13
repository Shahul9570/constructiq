import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, UserX, Search, Loader2, Link2, Unlink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface ClientLinkCardProps {
  projectId: string | number
  clientName?: string | null
  clientId?: number | null
  canEdit: boolean
}

export default function ClientLinkCard({ projectId, clientName, clientId, canEdit }: ClientLinkCardProps) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showInput, setShowInput] = useState(false)
  const [searching, setSearching] = useState(false)

  const linkMutation = useMutation({
    mutationFn: async (clientEmail: string) => {
      const { data } = await api.patch(`/projects/${projectId}/link-client`, { client_email: clientEmail })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', String(projectId)] })
      toast.success(`Client "${data.client_name}" linked successfully!`)
      setEmail('')
      setSuggestions([])
      setShowInput(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to link client')
    },
  })

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/projects/${projectId}/link-client`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', String(projectId)] })
      toast.success('Client unlinked from project')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to unlink client')
    },
  })

  const handleSearch = async (value: string) => {
    setEmail(value)
    if (value.length < 2) { setSuggestions([]); return }
    setSearching(true)
    try {
      const { data } = await api.get(`/projects/search-clients?email=${encodeURIComponent(value)}`)
      setSuggestions(data)
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Linked Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {clientId ? (
          /* Client IS linked */
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-100">{clientName}</p>
              <Badge variant="outline" className="mt-1 text-xs border-emerald-500/40 text-emerald-400">
                Active Client
              </Badge>
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                onClick={() => unlinkMutation.mutate()}
                disabled={unlinkMutation.isPending}
              >
                {unlinkMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Unlink className="h-4 w-4" />}
                Unlink
              </Button>
            )}
          </div>
        ) : (
          /* No client linked */
          <div className="space-y-2">
            <p className="text-sm text-slate-500">No client linked to this project yet.</p>
            {canEdit && !showInput && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 gap-2"
                onClick={() => setShowInput(true)}
              >
                <Link2 className="h-4 w-4" />
                Link a Client
              </Button>
            )}
            {canEdit && showInput && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    autoFocus
                    placeholder="Search client by email..."
                    value={email}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-700 text-sm"
                  />
                  {searching && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-500" />
                  )}
                </div>

                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                  <div className="rounded-md border border-slate-700 bg-slate-950 shadow-xl overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setEmail(s.email)
                          setSuggestions([])
                          linkMutation.mutate(s.email)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors"
                      >
                        <p className="text-sm font-medium text-slate-200">{s.full_name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Direct email submit if no suggestions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => linkMutation.mutate(email)}
                    disabled={!email.includes('@') || linkMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                  >
                    {linkMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <UserCheck className="h-4 w-4" />}
                    Link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowInput(false); setEmail(''); setSuggestions([]) }}
                    className="text-slate-500"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
