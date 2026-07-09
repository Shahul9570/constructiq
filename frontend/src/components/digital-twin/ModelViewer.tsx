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

function Model({ url, mappings, onMeshClick, onModelLoaded, clipHeight }: { url: string, mappings: any[], onMeshClick: (meshId: string, name: string) => void, onModelLoaded?: (names: string[]) => void, clipHeight: number }) {
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

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000), [])
  
  // Update clipping plane constant when slider changes
  useMemo(() => {
    clipPlane.constant = clipHeight
  }, [clipHeight, clipPlane])

  // Memoize override materials
  const materialMap = useMemo(() => {
    const map = new Map()
    mappings.forEach(m => {
      if (m.progress_percentage === 100) {
        map.set(m.mesh_node_id, null) // Signifies original material
      } else if (m.progress_percentage > 0) {
        map.set(m.mesh_node_id, new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          transparent: true,
          opacity: 0.7,
          clippingPlanes: [clipPlane]
        }))
      } else {
        map.set(m.mesh_node_id, new THREE.MeshStandardMaterial({
          color: '#64748b',
          wireframe: true,
          transparent: true,
          opacity: 0.3,
          clippingPlanes: [clipPlane]
        }))
      }
    })
    return map
  }, [mappings, clipPlane])

  // Apply materials and event listeners to meshes
  useMemo(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Cache original material
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material
        }

        // Apply clipping plane to original material
        const origMat = child.userData.originalMaterial
        if (origMat) {
          if (Array.isArray(origMat)) {
            origMat.forEach(m => { m.clippingPlanes = [clipPlane]; m.needsUpdate = true })
          } else {
            origMat.clippingPlanes = [clipPlane]
            origMat.needsUpdate = true
          }
        }

        const meshId = child.name
        const mapping = mappings.find(m => m.mesh_node_id === meshId)
        
        if (mapping) {
          child.userData = { ...child.userData, isMapped: true, meshId, name: mapping.name }
          
          if (materialMap.has(meshId)) {
            const overrideMat = materialMap.get(meshId)
            child.material = overrideMat ? overrideMat : origMat
          }
        } else {
          child.material = origMat
        }
      }
    })
  }, [scene, mappings, materialMap, clipPlane])

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
  const [clipHeight, setClipHeight] = useState(100)

  return (
    <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative">
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }} gl={{ localClippingEnabled: true }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Bounds fit clip observe margin={1.2}>
          <Model url={modelUrl} mappings={mappings} onMeshClick={onMeshClick} onModelLoaded={onModelLoaded} clipHeight={clipHeight} />
        </Bounds>
        
        <Environment preset="city" />
        <OrbitControls makeDefault />
      </Canvas>

      {/* Clipping Plane Slider */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Elevation Slicer</span>
        <input 
          type="range" 
          min="-5" 
          max="30" 
          step="0.5" 
          value={clipHeight}
          onChange={(e) => setClipHeight(parseFloat(e.target.value))}
          className="w-48 accent-emerald-500"
        />
        <button 
          onClick={() => setClipHeight(100)}
          className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
