import { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, PointerLockControls, Environment, Bounds, useBounds, Html } from '@react-three/drei'
import * as THREE from 'three'
import { MapPin, Footprints, MousePointerClick } from 'lucide-react'

export interface MeshGeometry {
  w: number; h: number; d: number
  cx: number; cy: number; cz: number
}

interface ModelViewerProps {
  modelUrl: string
  mappings: any[]
  selectedMeshId?: string | null
  focusMeshId?: string | null
  onMeshClick: (meshId: string, meshName: string) => void
  onModelLoaded?: (meshNames: string[], geometry: Record<string, MeshGeometry>) => void
  issues?: any[]
  addPinMode?: boolean
  onAddPin?: (position: {x: number, y: number, z: number}, meshId: string) => void
  onPinClick?: (issue: any) => void
}

function Model({ url, mappings, selectedMeshId, focusMeshId, onMeshClick, onModelLoaded, clipHeight, onTeleport, addPinMode, onAddPin }: { url: string, mappings: any[], selectedMeshId?: string | null, focusMeshId?: string | null, onMeshClick: (meshId: string, name: string) => void, onModelLoaded?: (names: string[], geometry: Record<string, MeshGeometry>) => void, clipHeight: number, onTeleport: (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Camera) => void, addPinMode?: boolean, onAddPin?: (p: any, m: string) => void }) {
  const { scene } = useGLTF(url)
  const [hovered, setHovered] = useState<string | null>(null)
  const loadedRef = useRef(false)
  const bounds = useBounds()

  // Extract mesh names + geometry on load
  useMemo(() => {
    if (!scene || loadedRef.current) return
    scene.updateMatrixWorld(true)
    const meshNames: string[] = []
    const geometry: Record<string, MeshGeometry> = {}
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name) {
        meshNames.push(child.name)
        const bbox = new THREE.Box3().setFromObject(child)
        const size = new THREE.Vector3()
        bbox.getSize(size)
        const center = new THREE.Vector3()
        bbox.getCenter(center)
        geometry[child.name] = {
          w: parseFloat(size.x.toFixed(3)),
          h: parseFloat(size.y.toFixed(3)),
          d: parseFloat(size.z.toFixed(3)),
          cx: parseFloat(center.x.toFixed(3)),
          cy: parseFloat(center.y.toFixed(3)),
          cz: parseFloat(center.z.toFixed(3)),
        }
      }
    })
    loadedRef.current = true
    if (onModelLoaded && meshNames.length > 0) {
      setTimeout(() => onModelLoaded(meshNames, geometry), 0)
    }
  }, [scene, onModelLoaded])

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000), [])
  
  useMemo(() => {
    clipPlane.constant = clipHeight
  }, [clipHeight, clipPlane])

  // Auto-zoom to the focused mesh
  useEffect(() => {
    if (!focusMeshId || !scene) return
    let targetMesh: THREE.Object3D | null = null
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && (child.name === focusMeshId || child.userData.meshId === focusMeshId)) {
        targetMesh = child
      }
    })
    if (targetMesh) {
      // Zoom camera to fit the focused mesh with some padding
      try {
        bounds.refresh(targetMesh).clip().fit()
      } catch (e) {
        // bounds may not be ready yet
      }
    }
  }, [focusMeshId, scene, bounds])

  useEffect(() => {
    scene.updateMatrixWorld(true)
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name !== 'progress_fill') {
        // Save original material once
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material
        }
        const origMat = child.userData.originalMaterial

        // Apply elevation slicer to all original materials
        const applyClipToMat = (mat: any) => {
          if (!mat) return
          if (Array.isArray(mat)) {
            mat.forEach(m => { m.clippingPlanes = [clipPlane]; m.needsUpdate = true })
          } else {
            mat.clippingPlanes = [clipPlane]
            mat.needsUpdate = true
          }
        }
        applyClipToMat(origMat)

        const meshId = child.name
        const mapping = mappings.find(m => m.mesh_node_id === meshId)

        // Remove existing fill child to reset each frame
        const existingFill = child.children.find(c => c.name === 'progress_fill')
        if (existingFill) child.remove(existingFill)

        const isSelected = meshId === selectedMeshId

        if (mapping) {
          child.userData = { ...child.userData, isMapped: true, meshId, name: mapping.name }
          const progress = Number(mapping.progress_percentage) || 0

          if (progress >= 100) {
            // FULLY BUILT: show original architect material
            if (isSelected) {
              const mat = Array.isArray(origMat)
                ? origMat.map((m: any) => { const c = m.clone(); c.emissive = new THREE.Color('#38bdf8'); c.emissiveIntensity = 0.4; c.clippingPlanes = [clipPlane]; return c })
                : (() => { const c = origMat.clone(); c.emissive = new THREE.Color('#38bdf8'); c.emissiveIntensity = 0.4; c.clippingPlanes = [clipPlane]; return c })()
              child.material = mat
            } else {
              child.material = origMat
            }
          } else if (progress <= 0) {
            // NOT STARTED: wireframe skeleton only
            child.material = new THREE.MeshStandardMaterial({
              color: isSelected ? '#38bdf8' : '#475569',
              wireframe: true,
              transparent: true,
              opacity: isSelected ? 0.7 : 0.25,
              clippingPlanes: [clipPlane]
            })
          } else {
            // PARTIAL: wireframe skeleton (full shape) + original material clipped at progress height
            child.material = new THREE.MeshStandardMaterial({
              color: isSelected ? '#38bdf8' : '#475569',
              wireframe: true,
              transparent: true,
              opacity: isSelected ? 0.6 : 0.2,
              clippingPlanes: [clipPlane]
            })

            // World-space bounding box for fill height
            const worldBBox = new THREE.Box3().setFromObject(child)
            const worldHeight = worldBBox.max.y - worldBBox.min.y
            const fillWorldY = worldBBox.min.y + (worldHeight * (progress / 100))
            // Plane clips ABOVE the fill level (normal points down = keep below)
            const progressPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), fillWorldY)

            // Clone original material(s) and add the progress clip plane
            const buildFillMaterial = (mat: any) => {
              if (!mat) return mat
              const cloned = mat.clone()
              const existing = Array.isArray(cloned.clippingPlanes) ? cloned.clippingPlanes : []
              cloned.clippingPlanes = [...existing, progressPlane]
              if (isSelected) {
                cloned.emissive = new THREE.Color('#38bdf8')
                cloned.emissiveIntensity = 0.3
              }
              cloned.needsUpdate = true
              return cloned
            }

            const fillMaterial = Array.isArray(origMat)
              ? origMat.map(buildFillMaterial)
              : buildFillMaterial(origMat)

            const fillMesh = new THREE.Mesh(child.geometry, fillMaterial)
            fillMesh.name = 'progress_fill'
            fillMesh.matrixAutoUpdate = false
            fillMesh.matrix.identity() // local identity — same transform as parent
            child.add(fillMesh)
          }
        } else {
          // Unmapped: restore original material
          child.material = origMat
        }
      }
    })
  }, [scene, mappings, clipPlane, selectedMeshId])

  return (
    <primitive 
      object={scene} 
      onClick={(e: any) => {
        e.stopPropagation()
        if (e.delta > 2) return

        // Walk through all ray intersections (sorted nearest-first) and
        // pick the FIRST named mesh that isn't an internal fill child.
        let chosenObj: any = null
        for (const hit of e.intersections) {
          let obj = hit.object
          // If we hit a progress_fill child, use its parent instead
          if (obj.name === 'progress_fill' && obj.parent) {
            obj = obj.parent
          }
          if (obj instanceof THREE.Mesh && obj.name && obj.name !== 'progress_fill') {
            chosenObj = obj
            break
          }
        }

        if (chosenObj) {
          const meshId = chosenObj.userData.meshId || chosenObj.name
          const meshName = chosenObj.userData.name || chosenObj.name
          
          if (addPinMode && onAddPin) {
            onAddPin(e.point, meshId)
            return
          }
          
          onMeshClick(meshId, meshName)
        }

        if (addPinMode) return;

        // Teleport to the exact clicked point
        const point = e.point
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

function WasdControls({ controlsRef, viewMode }: { controlsRef: React.RefObject<any>, viewMode: 'orbit' | 'walk' }) {
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
    if (!controlsRef.current && viewMode === 'orbit') return
    const speed = 5 * delta;
    const camera = state.camera
    
    // In PointerLock (walk) mode, camera rotation represents looking direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.y = 0
    if (forward.lengthSq() > 0) forward.normalize()
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    right.y = 0
    if (right.lengthSq() > 0) right.normalize()

    const moveVec = new THREE.Vector3()
    
    if (keys.current.w) moveVec.add(forward.clone().multiplyScalar(speed))
    if (keys.current.s) moveVec.add(forward.clone().multiplyScalar(-speed))
    if (keys.current.a) moveVec.add(right.clone().multiplyScalar(-speed))
    if (keys.current.d) moveVec.add(right.clone().multiplyScalar(speed))
    
    if (moveVec.lengthSq() > 0) {
      camera.position.add(moveVec)
      if (viewMode === 'orbit' && controlsRef.current) {
        controlsRef.current.target.add(moveVec)
        controlsRef.current.update()
      }
    }
  })

  return null
}

export default function ModelViewer({ modelUrl, mappings, selectedMeshId, focusMeshId, onMeshClick, onModelLoaded, issues = [], addPinMode = false, onAddPin, onPinClick }: ModelViewerProps) {
  const [clipHeight, setClipHeight] = useState(100)
  const [viewMode, setViewMode] = useState<'orbit' | 'walk'>('orbit')
  const controlsRef = useRef<any>(null)

  const handleTeleport = (point: THREE.Vector3, normal: THREE.Vector3, camera: THREE.Camera) => {
    const standPos = point.clone().add(normal.clone().multiplyScalar(1.5))
    standPos.y = point.y + 1.5 
    
    camera.position.copy(standPos)
    
    const lookDir = normal.clone().multiplyScalar(-1)
    const lookTarget = standPos.clone().add(lookDir)
    
    if (controlsRef.current) {
      controlsRef.current.target.copy(lookTarget)
      controlsRef.current.update()
    }
  }

  return (
    <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative">
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }} gl={{ localClippingEnabled: true }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Bounds fit clip observe margin={1.5}>
          <Model url={modelUrl} mappings={mappings} selectedMeshId={selectedMeshId} focusMeshId={focusMeshId} onMeshClick={onMeshClick} onModelLoaded={onModelLoaded} clipHeight={clipHeight} onTeleport={handleTeleport} addPinMode={addPinMode} onAddPin={onAddPin} />
          
          {issues.map(issue => (
            <Html 
              key={issue.id} 
              position={[issue.position.x, issue.position.y, issue.position.z]}
              center
              zIndexRange={[100, 0]}
            >
              <div 
                className={`relative group cursor-pointer transition-transform duration-200 hover:scale-125 ${selectedMeshId === issue.mesh_node_id ? 'scale-125' : ''}`}
                onClick={(e) => { e.stopPropagation(); onPinClick?.(issue) }}
              >
                <MapPin className={`h-8 w-8 drop-shadow-md ${issue.status === 'resolved' ? 'text-emerald-500' : issue.priority === 'high' ? 'text-rose-500' : 'text-amber-500'} fill-slate-900/80`} />
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="bg-slate-900 border border-slate-700 shadow-xl rounded-lg px-3 py-2 text-sm text-slate-200 text-left">
                    <p className="font-semibold">{issue.title}</p>
                    {issue.status === 'resolved' ? (
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mt-1 block">Resolved</span>
                    ) : (
                      <span className={`text-[10px] uppercase tracking-wider font-bold mt-1 block ${issue.priority === 'high' ? 'text-rose-400' : 'text-amber-400'}`}>{issue.priority} Priority</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-b border-r border-slate-700 transform rotate-45"></div>
                </div>
              </div>
            </Html>
          ))}
        </Bounds>
        
        <Environment preset="city" />
        {viewMode === 'orbit' ? (
          <OrbitControls ref={controlsRef} makeDefault />
        ) : (
          <PointerLockControls 
            makeDefault 
            ref={(node: any) => {
              if (node) {
                if (!node.update) node.update = () => {}
                if (!node.target) node.target = { copy: () => {}, add: () => {} } // Mock THREE.Vector3 interface required by <Bounds>
              }
            }}
          />
        )}
        <WasdControls controlsRef={controlsRef} viewMode={viewMode} />
      </Canvas>

      {/* View Mode Toggle Overlay */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-full border border-slate-800 shadow-xl flex items-center gap-1 z-10">
        <button
          onClick={() => setViewMode('orbit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            viewMode === 'orbit' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Orbit View
        </button>
        <button
          onClick={() => setViewMode('walk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            viewMode === 'walk' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Footprints className="w-4 h-4" />
          Walk View
        </button>
      </div>

      {/* Walk Mode Instruction Overlay */}
      {viewMode === 'walk' && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-2 rounded-full backdrop-blur-md flex items-center gap-3 animate-pulse pointer-events-none z-10">
          <MousePointerClick className="w-4 h-4" />
          <span className="text-sm font-medium tracking-wide">Click anywhere to look around. Press ESC to unlock. Use W A S D to walk.</span>
        </div>
      )}

      {/* Clipping Plane Slider */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4 z-10">
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
