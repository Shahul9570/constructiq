import { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, Bounds, useBounds, PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'

interface ModelViewerProps {
  modelUrl: string
  mappings: any[]
  onMeshClick: (meshId: string, meshName: string) => void
  onModelLoaded?: (meshNames: string[]) => void
}

function Model({ url, mappings, onMeshClick, onModelLoaded, clipHeight, onTeleport }: { url: string, mappings: any[], onMeshClick: (meshId: string, name: string) => void, onModelLoaded?: (names: string[]) => void, clipHeight: number, onTeleport: (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Camera) => void }) {
  const { scene } = useGLTF(url)
  const [hovered, setHovered] = useState<string | null>(null)
  const loadedRef = useRef(false)
  const bounds = useBounds()

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
      setTimeout(() => onModelLoaded(meshNames), 0)
    }
  }, [scene, onModelLoaded])

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000), [])
  
  useMemo(() => {
    clipPlane.constant = clipHeight
  }, [clipHeight, clipPlane])

  const materialMap = useMemo(() => {
    const map = new Map()
    mappings.forEach(m => {
      if (m.progress_percentage === 100) {
        map.set(m.mesh_node_id, null)
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

  useMemo(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material
        }

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
        if (e.delta > 2) return
        
        const userData = e.object.userData
        if (userData.isMapped) {
          onMeshClick(userData.meshId, userData.name)
        }
        
        // Teleport logic
        const point = e.point
        // Get the world normal of the clicked face
        const normal = e.face?.normal?.clone() || new THREE.Vector3(0, 1, 0)
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(e.object.matrixWorld)
        normal.applyMatrix3(normalMatrix).normalize()
        
        onTeleport(point, normal, e.camera)
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

function FirstPersonCamera() {
  const keys = useRef({ w: false, a: false, s: false, d: false })
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (keys.current.hasOwnProperty(k)) (keys.current as any)[k] = true
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (keys.current.hasOwnProperty(k)) (keys.current as any)[k] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useFrame((state, delta) => {
    const speed = 5 * delta;
    if (keys.current.w) state.camera.translateZ(-speed)
    if (keys.current.s) state.camera.translateZ(speed)
    if (keys.current.a) state.camera.translateX(-speed)
    if (keys.current.d) state.camera.translateX(speed)
  })

  return <PointerLockControls />
}

export default function ModelViewer({ modelUrl, mappings, onMeshClick, onModelLoaded }: ModelViewerProps) {
  const [clipHeight, setClipHeight] = useState(100)
  const [viewMode, setViewMode] = useState<'orbit' | 'walk'>('orbit')

  const handleTeleport = (point: THREE.Vector3, normal: THREE.Vector3, camera: THREE.Camera) => {
    // 1. Position camera slightly outside the clicked surface to avoid clipping inside the door
    // If it's a floor (normal pointing mostly up), stand on it. If a wall, stand back.
    const standPos = point.clone().add(normal.clone().multiplyScalar(1.5))
    standPos.y = point.y + 1.5 // Eye level relative to the click point
    
    camera.position.copy(standPos)
    
    // 2. Look exactly opposite to the normal (look INSIDE the room/building)
    const lookDir = normal.clone().multiplyScalar(-1)
    const lookTarget = standPos.clone().add(lookDir)
    camera.lookAt(lookTarget)
    
    // 3. Switch to Walk Mode so they can immediately look around
    setViewMode('walk')
  }

  return (
    <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative">
      <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md rounded-lg p-1 border border-slate-800 flex gap-1">
        <button
          onClick={() => setViewMode('orbit')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'orbit' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          Orbit View
        </button>
        <button
          onClick={() => setViewMode('walk')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'walk' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          Walk Mode
        </button>
      </div>
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }} gl={{ localClippingEnabled: true }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Bounds fit clip observe margin={1.2}>
          <Model url={modelUrl} mappings={mappings} onMeshClick={onMeshClick} onModelLoaded={onModelLoaded} clipHeight={clipHeight} onTeleport={handleTeleport} />
        </Bounds>
        
        <Environment preset="city" />
        {viewMode === 'orbit' ? <OrbitControls makeDefault /> : <FirstPersonCamera />}
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
