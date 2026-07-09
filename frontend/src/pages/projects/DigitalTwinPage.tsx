import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Box, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import ModelViewer from '@/components/digital-twin/ModelViewer'
import ProgressOverlay from '@/components/digital-twin/ProgressOverlay'
import api from '@/services/api'

// Temporary service function until we add it to a proper service class
const getDigitalTwinData = async (projectId: number) => {
  const { data } = await api.get(`/projects/${projectId}/digital-twin`)
  return data
}

export default function DigitalTwinPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedMeshId, setSelectedMeshId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)

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
      queryClient.invalidateQueries({ queryKey: ['digital-twin', projectId] })
    },
    onError: () => {
      toast.error('Failed to upload 3D model')
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

  const selectedMapping = data?.mappings?.find((m: any) => m.mesh_node_id === selectedMeshId) || null

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!data?.model_url) {
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
      </div>

      <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
        <ModelViewer 
          modelUrl={data.model_url} 
          mappings={data.mappings || []} 
          onMeshClick={handleMeshClick} 
        />
        <ProgressOverlay 
          selectedMeshId={selectedMeshId} 
          selectedName={selectedName}
          mapping={selectedMapping}
          onClose={() => setSelectedMeshId(null)}
        />
      </div>
    </div>
  )
}
