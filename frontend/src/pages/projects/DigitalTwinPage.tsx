import React, { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Box, Upload, AlertTriangle, Sparkles, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import ModelViewer, { MeshGeometry } from '@/components/digital-twin/ModelViewer'
import ProgressOverlay from '@/components/digital-twin/ProgressOverlay'
import StructureSidebar from '@/components/digital-twin/StructureSidebar'
import api from '@/services/api'

// Temporary service function until we add it to a proper service class
const getDigitalTwinData = async (projectId: number) => {
  const { data } = await api.get(`/projects/${projectId}/digital-twin`)
  return data
}

class ModelErrorBoundary extends React.Component<{ children: React.ReactNode, onReset: () => void }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, onReset: () => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-slate-900 rounded-xl border border-red-900/50 space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-medium text-slate-300">Failed to Load Model</h2>
          <p className="text-slate-500 max-w-md text-center">
            The 3D model file is missing or corrupted. This can happen if the storage was cleared.
          </p>
          <Button variant="outline" className="border-red-900 text-red-400 hover:bg-red-950" onClick={this.props.onReset}>
            Clear and Re-Upload Model
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function DigitalTwinPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedMeshId, setSelectedMeshId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [meshNames, setMeshNames] = useState<string[]>([])
  const [meshGeometry, setMeshGeometry] = useState<Record<string, MeshGeometry>>({})
  const [forceUpload, setForceUpload] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [focusMeshId, setFocusMeshId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['digital-twin', projectId],
    queryFn: () => getDigitalTwinData(projectId),
    enabled: !!projectId
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/projects/${projectId}/digital-twin/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return data
    },
    onSuccess: () => {
      toast.success('3D Model uploaded successfully')
      setForceUpload(false)
      queryClient.invalidateQueries({ queryKey: ['digital-twin', projectId] })
    },
    onError: () => {
      toast.error('Failed to upload 3D model')
    }
  })

  const syncMutation = useMutation({
    mutationFn: async (names: string[]) => {
      const { data } = await api.post(`/projects/${projectId}/digital-twin/sync`, { mesh_names: names })
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['digital-twin', projectId] })
    },
    onError: () => {
      toast.error('Failed to sync structures')
    }
  })

  const promptMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post(`/projects/${projectId}/digital-twin/prompt`, { prompt: text })
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Progress updated via AI')
      setPrompt('')
      queryClient.invalidateQueries({ queryKey: ['digital-twin', projectId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to process prompt')
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files[0])
    }
  }

  const handleMeshClick = (meshId: string, name: string) => {
    setSelectedMeshId(meshId)
    setSelectedName(name)
  }

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    promptMutation.mutate(prompt)
  }

  const isModelUploaded = !!data?.model_url && !forceUpload

  const selectedMapping = data?.mappings?.find((m: any) => m.mesh_node_id === selectedMeshId) || null

  const mappingIds = new Set(data?.mappings?.map((m: any) => m.mesh_node_id) || [])
  const needsSync = meshNames.length > 0 && (
    meshNames.some(name => !mappingIds.has(name)) || 
    (data?.mappings || []).some((m: any) => !meshNames.includes(m.mesh_node_id))
  )

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!data?.model_url || forceUpload) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" className="hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Live Progress Visualizer</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-[60vh] bg-slate-900 rounded-xl border border-slate-800 space-y-4">
          <Box className="h-12 w-12 text-slate-500" />
          <h2 className="text-xl font-medium text-slate-300">No 3D Model Available</h2>
          <p className="text-slate-500 max-w-md text-center">
            This project does not have an uploaded 3D model. Please upload a .glb file to enable the Digital Twin experience.
          </p>
          <input 
            type="file" 
            accept=".glb,.gltf"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-300 mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Model
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center gap-4 shrink-0">
        <Link to={`/projects/${projectId}`}>
          <Button variant="ghost" size="icon" className="hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Progress Visualizer</h1>
          <p className="text-sm text-slate-500">Interactive 3D structural model</p>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => setForceUpload(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Replace Model
          </Button>
          
          {needsSync && (
            <Button 
              variant="outline" 
              size="sm"
              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 animate-pulse"
              onClick={() => syncMutation.mutate(meshNames)}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400 mr-2" />
              ) : (
                <Box className="h-4 w-4 mr-2" />
              )}
              Auto-Sync Structures
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {isModelUploaded && (
          <StructureSidebar 
            mappings={data.mappings || []} 
            selectedMeshId={selectedMeshId}
            meshGeometry={meshGeometry}
            onSelectMesh={(id, name) => {
              setSelectedMeshId(id)
              setSelectedName(name)
              setFocusMeshId(id)
            }}
          />
        )}
        
        <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
          <ModelErrorBoundary onReset={() => setForceUpload(true)}>
            <ModelViewer 
              modelUrl={data.model_url.startsWith('http') ? data.model_url : `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}${data.model_url}`} 
              mappings={data.mappings || []} 
              selectedMeshId={selectedMeshId}
              focusMeshId={focusMeshId}
              onMeshClick={handleMeshClick} 
              onModelLoaded={(names, geo) => { setMeshNames(names); setMeshGeometry(geo) }}
            />
          </ModelErrorBoundary>
        <ProgressOverlay 
          projectId={projectId}
          selectedMeshId={selectedMeshId} 
          selectedName={selectedName}
          mapping={selectedMapping}
          onClose={() => setSelectedMeshId(null)}
        />

          {/* AI Command Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-10">
            <form 
              onSubmit={handlePromptSubmit} 
              className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-full border border-slate-700 shadow-2xl"
            >
              <div className="bg-emerald-500/20 p-2 rounded-full">
                <Sparkles className="h-5 w-5 text-emerald-400" />
              </div>
              <Input
                placeholder="e.g. 'Mark all interior walls as 50% complete' or 'Set bathtub to finished'"
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-slate-500"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={promptMutation.isPending}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-transform active:scale-95 disabled:opacity-50"
                disabled={promptMutation.isPending || !prompt.trim()}
              >
                {promptMutation.isPending ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
