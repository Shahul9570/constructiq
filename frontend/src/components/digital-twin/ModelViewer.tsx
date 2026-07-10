import { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, Bounds, useBounds } from '@react-three/drei'
import * as THREE from 'three'

interface ModelViewerProps {
  modelUrl: string
  mappings: any[]
  selectedMeshId?: string | null
  onMeshClick: (meshId: string, meshName: string) => void
  onModelLoaded?: (meshNames: string[]) => void
}

function Model({ url, mappings, selectedMeshId, onMeshClick, onModelLoaded, clipHeight, onTeleport }: { url: string, mappings: any[], selectedMeshId?: string | null, onMeshClick: (meshId: string, name: string) => void, onModelLoaded?: (names: string[]) => void, clipHeight: number, onTeleport: (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Camera) => void }) {
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

  useEffect(() => {
    scene.updateMatrixWorld(true)
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name !== 'progress_fill') {
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
        
        // Remove existing fill clone to reset state
        const existingFill = child.children.find(c => c.name === 'progress_fill')
        if (existingFill) {
          child.remove(existingFill)
        }
        
        if (mapping) {
          child.userData = { ...child.userData, isMapped: true, meshId, name: mapping.name }
          const progress = Number(mapping.progress_percentage) || 0
          const isSelected = meshId === selectedMeshId
          const highlightColor = isSelected ? new THREE.Color('#38bdf8') : new THREE.Color(0x000000)
          
          if (progress >= 100) {
            child.material = origMat.clone ? origMat.clone() : origMat
            if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial) {
              child.material.emissive = highlightColor
              child.material.emissiveIntensity = isSelected ? 0.5 : 0
            }
          } else if (progress <= 0) {
            child.material = new THREE.MeshStandardMaterial({
              color: isSelected ? '#38bdf8' : '#64748b',
              emissive: highlightColor,
              emissiveIntensity: isSelected ? 0.5 : 0,
              wireframe: true,
              transparent: true,
              opacity: isSelected ? 0.8 : 0.3,
              clippingPlanes: [clipPlane]
            })
          } else {
            // Partial Progress: Base wireframe
            child.material = new THREE.MeshStandardMaterial({
              color: isSelected ? '#38bdf8' : '#64748b',
              emissive: highlightColor,
              emissiveIntensity: isSelected ? 0.5 : 0,
              wireframe: true,
              transparent: true,
              opacity: isSelected ? 0.8 : 0.3,
              clippingPlanes: [clipPlane]
            })

            // Calculate clipping plane for partial fill in WORLD SPACE
            const worldBBox = new THREE.Box3().setFromObject(child)
            const worldHeight = worldBBox.max.y - worldBBox.min.y
            const fillWorldY = worldBBox.min.y + (worldHeight * (progress / 100))

            // Create plane pointing DOWN (0, -1, 0) in world space
            const worldPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), fillWorldY)

            // Dynamic color
            const startColor = new THREE.Color('#ef4444')
            const midColor = new THREE.Color('#eab308')
            const endColor = new THREE.Color('#10b981')
            let finalColor = new THREE.Color()
            if (progress < 50) finalColor.lerpColors(startColor, midColor, progress / 50)
            else finalColor.lerpColors(midColor, endColor, (progress - 50) / 50)

            const fillMat = new THREE.MeshStandardMaterial({
              color: finalColor,
              emissive: highlightColor,
              emissiveIntensity: isSelected ? 0.5 : 0,
              transparent: true,
              opacity: 0.9,
              side: THREE.DoubleSide,
              clippingPlanes: [clipPlane, worldPlane],
              depthWrite: false // Prevent severe Z-fighting with wireframe
            })

            const fillMesh = new THREE.Mesh(child.geometry, fillMat)
            fillMesh.name = 'progress_fill'
            child.add(fillMesh)
          }
        } else {
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
        
        const obj = e.object
        // Fire for any named mesh (not progress_fill children)
        if (obj.name && obj.name !== 'progress_fill') {
          const meshId = obj.userData.meshId || obj.name
          const meshName = obj.userData.name || obj.name
          onMeshClick(meshId, meshName)
        }
        
        // Teleport logic
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

function WasdControls({ controlsRef }: { controlsRef: React.RefObject<any> }) {
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
    if (!controlsRef.current) return
    const speed = 5 * delta;
    const controls = controlsRef.current
    const camera = state.camera
    
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
      controls.target.add(moveVec)
      controls.update()
    }
  })

  return null
}

export default function ModelViewer({ modelUrl, mappings, selectedMeshId, onMeshClick, onModelLoaded }: ModelViewerProps) {
  const [clipHeight, setClipHeight] = useState(100)
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
        
        <Bounds fit clip observe margin={1.2}>
          <Model url={modelUrl} mappings={mappings} selectedMeshId={selectedMeshId} onMeshClick={onMeshClick} onModelLoaded={onModelLoaded} clipHeight={clipHeight} onTeleport={handleTeleport} />
        </Bounds>
        
        <Environment preset="city" />
        <OrbitControls ref={controlsRef} makeDefault />
        <WasdControls controlsRef={controlsRef} />
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
