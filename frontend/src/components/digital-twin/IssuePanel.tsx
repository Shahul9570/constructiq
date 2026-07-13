import React, { useState } from 'react'
import { MapPin, Plus, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface IssuePanelProps {
  issues: any[]
  isClient: boolean
  addPinMode: boolean
  setAddPinMode: (mode: boolean) => void
  onAddIssue: (title: string, description: string, priority: string) => void
  onUpdateIssueStatus: (issueId: number, status: string) => void
  onFocusIssue: (issue: any) => void
  selectedPosition: { x: number, y: number, z: number } | null
}

export default function IssuePanel({ 
  issues, 
  isClient, 
  addPinMode, 
  setAddPinMode, 
  onAddIssue, 
  onUpdateIssueStatus, 
  onFocusIssue,
  selectedPosition 
}: IssuePanelProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !selectedPosition) return
    onAddIssue(title, description, priority)
    setTitle('')
    setDescription('')
    setPriority('medium')
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 w-80 text-sm">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-500" />
          3D Issue Tracking
        </h3>
        <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300">
          {issues.length} Issues
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Form state if pin mode is active and we have a point */}
        {!isClient && addPinMode && selectedPosition && (
          <div className="bg-slate-800 rounded-lg p-3 border border-emerald-500/50 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-emerald-400 text-xs uppercase tracking-wider">New Pin</h4>
              <button onClick={() => setAddPinMode(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <Input 
                placeholder="Issue title..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-900 border-slate-700 h-8 text-xs"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs h-16 resize-none focus:outline-none focus:border-emerald-500"
              />
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <Button type="submit" size="sm" className="w-full h-8 bg-emerald-600 hover:bg-emerald-500 text-white" disabled={!title.trim()}>
                Save Pin
              </Button>
            </form>
          </div>
        )}

        {/* Empty state if no issues and no add mode */}
        {issues.length === 0 && (!addPinMode || !selectedPosition) && (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active issues.</p>
            {!isClient && <p className="text-xs mt-1">Click "Drop Pin" to start.</p>}
          </div>
        )}

        {/* Issue List */}
        <div className="space-y-3">
          {issues.map(issue => (
            <div 
              key={issue.id} 
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${issue.status === 'resolved' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
              onClick={() => onFocusIssue(issue)}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className={`font-medium ${issue.status === 'resolved' ? 'text-slate-400 line-through' : 'text-slate-200'} truncate pr-2`}>{issue.title}</h4>
                {issue.status === 'resolved' ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : issue.priority === 'high' ? (
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                )}
              </div>
              
              {issue.description && (
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{issue.description}</p>
              )}
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                <span className="text-[10px] text-slate-500">{new Date(issue.created_at).toLocaleDateString()}</span>
                {!isClient && issue.status !== 'resolved' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateIssueStatus(issue.id, 'resolved') }}
                    className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Mark Resolved
                  </button>
                )}
                {!isClient && issue.status === 'resolved' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateIssueStatus(issue.id, 'open') }}
                    className="text-[10px] font-medium text-amber-400 hover:text-amber-300"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isClient && (
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
          {addPinMode ? (
            <div className="text-xs text-center text-emerald-400 animate-pulse flex items-center justify-center gap-2">
              <MapPin className="h-3 w-3" />
              Click anywhere on the 3D model
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => setAddPinMode(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Drop New Pin
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function Badge({ children, className, variant = 'default' }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}
