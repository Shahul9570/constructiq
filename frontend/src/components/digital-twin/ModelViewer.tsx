import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, Bounds, Html } from '@react-three/drei'
import * as THREE from 'three'

interface ModelViewerProps {
  modelUrl: string
  mappings: any[]
  onMeshClick: (meshId: string, meshName: string) => void
  onModelLoaded?: (meshNames: string[]) => void
}

function Model({ url, mappings, onMeshClick, onModelLoaded }: { url: string, mappings: any[], onMeshClick: (meshId: string, name: string) => void, onModelLoaded?: (names: string[]) => void }) {
  const { scene } = useGLTF(url)
  const [hovered, setHovered] = useState<string | null>(null)
  const loadedRef = useRef(false)

  // Extract mesh names on load
  useMemo(() => {
    if (!scene || loadedRef.current) return
    const meshNames: string[] = []
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name) {
        meshNames.push(child.name)
      }
    })
    loadedRef.current = true
    if (onModelLoaded && meshNames.length > 0) {
      // Defer state update to avoid during render
      setTimeout(() => onModelLoaded(meshNames), 0)
    }
  }, [scene, onModelLoaded])

  // Memoize materials based on progress
  const materialMap = useMemo(() => {
    const map = new Map()
    mappings.forEach(m => {
      const mat = new THREE.MeshStandardMaterial({
        color: m.progress_percentage === 100 ? '#10b981' : (m.progress_percentage > 0 ? '#fbbf24' : '#94a3b8'),
        transparent: true,
        opacity: m.progress_percentage === 0 ? 0.5 : 0.9,
      })
      map.set(m.mesh_node_id, mat)
    })
    return map
  }, [mappings])

  // Apply materials and event listeners to meshes
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const meshId = child.name
      const mapping = mappings.find(m => m.mesh_node_id === meshId)
      
      if (mapping) {
        if (materialMap.has(meshId)) {
          child.material = materialMap.get(meshId)
        }
        
        // Ensure the mesh has userData for event handling
        child.userData = { isMapped: true, meshId, name: mapping.name }
      }
    }
  })

  return (
    <primitive 
      object={scene} 
      onClick={(e: any) => {
        e.stopPropagation()
        const userData = e.object.userData
        if (userData.isMapped) {
          onMeshClick(userData.meshId, userData.name)
        }
      }}
      onPointerOver={(e: any) => {
        e.stopPropagation()
        if (e.object.userData.isMapped) setHovered(e.object.userData.meshId)
      }}
      onPointerOut={(e: any) => {
        e.stopPropagation()
        setHovered(null)
      }}
    />
  )
}

export default function ModelViewer({ modelUrl, mappings, onMeshClick, onModelLoaded }: ModelViewerProps) {
  return (
    <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative">
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Bounds fit clip observe margin={1.2}>
          <Model url={modelUrl} mappings={mappings} onMeshClick={onMeshClick} onModelLoaded={onModelLoaded} />
        </Bounds>
        
        <Environment preset="city" />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  )
}
