import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, List, ChevronRight, Edit2, Check, X, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import api from '@/services/api'
import toast from 'react-hot-toast'

import { MeshGeometry } from '@/components/digital-twin/ModelViewer'

interface StructureSidebarProps {
  mappings: any[]
  selectedMeshId: string | null
  meshGeometry?: Record<string, MeshGeometry>
  onSelectMesh: (meshId: string, name: string) => void
}

export default function StructureSidebar({ mappings, selectedMeshId, meshGeometry = {}, onSelectMesh }: StructureSidebarProps) {
  const { id: projectId } = useParams()
  const queryClient = useQueryClient()
  
  const [search, setSearch] = useState('')
  const [editingMeshId, setEditingMeshId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const updateNameMutation = useMutation({
    mutationFn: async ({ meshId, name }: { meshId: string, name: string }) => {
      const { data } = await api.patch(`/projects/${projectId}/digital-twin/structures/${meshId}/name`, { name })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-twin', projectId] })
      setEditingMeshId(null)
      toast.success('Name updated successfully')
    },
    onError: () => {
      toast.error('Failed to update name')
    }
  })

  const handleSaveName = (meshId: string) => {
    if (!editName.trim()) {
      setEditingMeshId(null)
      return
    }
    updateNameMutation.mutate({ meshId, name: editName })
  }

  const autoRenameMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/projects/${projectId}/digital-twin/auto-rename`, { geometry: meshGeometry })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['digital-twin', projectId] })
      toast.success(data.message || 'Structures renamed successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to auto-rename')
    }
  })

  const filteredMappings = mappings.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.mesh_node_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-80 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <List className="h-4 w-4" />
            Structure Explorer
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => autoRenameMutation.mutate()}
            disabled={autoRenameMutation.isPending || mappings.length === 0}
            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
            title="Use AI to rename all parts to human-readable labels"
          >
            {autoRenameMutation.isPending ? (
              <div className="h-3 w-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {autoRenameMutation.isPending ? 'Renaming...' : 'Smart Rename'}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search parts..." 
            className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/50"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
        {filteredMappings.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            No components found.
          </div>
        ) : (
          <div className="space-y-1">
            {filteredMappings.map((m) => {
              const isSelected = selectedMeshId === m.mesh_node_id
              const isComplete = m.progress_percentage === 100
              const isStarted = m.progress_percentage > 0 && m.progress_percentage < 100
              
              return (
                <div key={m.mesh_node_id} className={`w-full rounded-md flex items-center justify-between group transition-colors overflow-hidden ${
                  isSelected 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                }`}>
                  {editingMeshId === m.mesh_node_id ? (
                    <div className="flex-1 flex items-center gap-1 p-1">
                      <Input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-xs bg-slate-950 border-slate-700"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName(m.mesh_node_id)}
                      />
                      <button onClick={() => handleSaveName(m.mesh_node_id)} className="p-1 hover:text-emerald-400">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingMeshId(null)} className="p-1 hover:text-red-400">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectMesh(m.mesh_node_id, m.name)}
                      className="flex-1 flex items-center justify-between px-3 py-2 text-left"
                    >
                      <div className="truncate pr-2 flex-1 flex items-center gap-2">
                        <span className="text-sm font-medium block truncate" title={m.name}>{m.name}</span>
                        {isSelected && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditName(m.name)
                              setEditingMeshId(m.mesh_node_id)
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-emerald-500/20 transition-opacity"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {isComplete ? (
                          <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 border-0 h-5 px-1.5 text-[10px]">100%</Badge>
                        ) : isStarted ? (
                          <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 border-0 h-5 px-1.5 text-[10px]">{Math.round(m.progress_percentage)}%</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-700 h-5 px-1.5 text-[10px]">0%</Badge>
                        )}
                        <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'translate-x-0.5 opacity-100' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                      </div>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
