import React, { useState } from 'react'
import { Search, List, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface StructureSidebarProps {
  mappings: any[]
  selectedMeshId: string | null
  onSelectMesh: (meshId: string, name: string) => void
}

export default function StructureSidebar({ mappings, selectedMeshId, onSelectMesh }: StructureSidebarProps) {
  const [search, setSearch] = useState('')

  const filteredMappings = mappings.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.mesh_node_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-80 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <List className="h-4 w-4" />
          Structure Explorer
        </h2>
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
                <button
                  key={m.mesh_node_id}
                  onClick={() => onSelectMesh(m.mesh_node_id, m.name)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between group transition-colors ${
                    isSelected 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2 flex-1">
                    <span className="text-sm font-medium block truncate">{m.name}</span>
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
