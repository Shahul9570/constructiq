import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Activity, Image as ImageIcon, Save, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import toast from 'react-hot-toast'
import api from '@/services/api'

interface ProgressOverlayProps {
  projectId: number
  selectedMeshId: string | null
  selectedName: string | null
  mapping: any | null
  onClose: () => void
}

export default function ProgressOverlay({ projectId, selectedMeshId, selectedName, mapping, onClose }: ProgressOverlayProps) {
  const [progress, setProgress] = useState<number>(0)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (mapping) {
      setProgress(mapping.progress_percentage || 0)
    }
  }, [mapping])

  const updateMutation = useMutation({
    mutationFn: async (newProgress: number) => {
      const { data } = await api.patch(`/projects/${projectId}/digital-twin/structures/${selectedMeshId}`, {
        progress_percentage: newProgress
      })
      return data
    },
    onSuccess: () => {
      toast.success('Progress updated')
      queryClient.invalidateQueries({ queryKey: ['digital-twin', projectId] })
    },
    onError: () => {
      toast.error('Failed to update progress')
    }
  })

  if (!selectedMeshId) return null

  return (
    <Card className="absolute top-4 right-4 w-80 bg-slate-900/95 border-slate-700 shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
        <CardTitle className="text-sm font-medium text-slate-200">
          Element Details
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white">{selectedName || selectedMeshId}</h3>
          <p className="text-xs text-slate-400 font-mono mt-1">ID: {selectedMeshId}</p>
        </div>
        
        {mapping ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-slate-400">Completion</span>
                <span className="text-sm font-bold text-emerald-400">{progress}%</span>
              </div>
              <Slider 
                value={[progress]} 
                onValueChange={(vals) => setProgress(vals[0])} 
                max={100} 
                step={5}
                className="w-full"
              />
              
              <Button 
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                size="sm"
                onClick={() => updateMutation.mutate(progress)}
                disabled={updateMutation.isPending || progress === mapping.progress_percentage}
              >
                {updateMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : progress === 100 ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {progress === mapping.progress_percentage ? 'Saved' : 'Save Progress'}
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" className="h-14 flex-col gap-1 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <Activity className="h-4 w-4 text-orange-400" />
                <span className="text-xs">Logs</span>
              </Button>
              <Button variant="outline" size="sm" className="h-14 flex-col gap-1 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <ImageIcon className="h-4 w-4 text-blue-400" />
                <span className="text-xs">Photos</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-500 text-sm">
            No progress data mapped to this element.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
