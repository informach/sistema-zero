'use client'

import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import type { AvatarSlot } from '@/lib/avatar3d-catalog'
import { AvatarRig } from './avatar-rig'

type Slots = Partial<Record<string, AvatarSlot>>
export type CaptureFn = () => Promise<Blob | null>

/**
 * Ponte de CAPTURA: registra no pai (via `onReady`) uma função que tira a "foto" do
 * personagem. `preserveDrawingBuffer:true` + um `gl.render` forçado garantem o frame
 * (sem isso o `toBlob` sai preto). Recorta um quadrado central 512×512 (avatar redondo).
 */
function SnapshotBridge({ onReady }: { onReady: (capture: CaptureFn) => void }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const capture: CaptureFn = async () => {
      gl.render(scene, camera)
      const src = gl.domElement
      const size = Math.min(src.width, src.height)
      const sx = (src.width - size) / 2
      const sy = (src.height - size) / 2
      const out = document.createElement('canvas')
      out.width = 512
      out.height = 512
      const ctx = out.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(src, sx, sy, size, size, 0, 0, 512, 512)
      return new Promise((resolve) => out.toBlob((b) => resolve(b), 'image/png'))
    }
    onReady(capture)
  }, [gl, scene, camera, onReady])
  return null
}

/**
 * Cena 3D do configurador (a ÚNICA tela do app que monta WebGL — em todo o resto o
 * `kids-avatar` mostra a FOTO). Personagem no pódio + luzes da marca + órbita limitada.
 */
export function AvatarScene({
  slots,
  onReady,
  dark,
}: {
  slots: Slots
  onReady: (c: CaptureFn) => void
  dark: boolean
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, 1.0, 3.2], fov: 42 }}
    >
      <color attach="background" args={[dark ? '#0d1117' : '#eaf4f7']} />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight
        position={[-4, 3, -2]}
        intensity={0.5}
        color={dark ? '#c4f042' : '#7fd4e8'}
      />

      {/* Personagem GLB (suspende ao carregar as peças) — feet em y≈0. */}
      <Suspense fallback={null}>
        <AvatarRig slots={slots} />
      </Suspense>
      {/* Pódio logo abaixo dos pés. */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.85, 0.1, 32]} />
        <meshStandardMaterial color={dark ? '#1b2230' : '#cfe7ee'} roughness={0.9} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={2.4} blur={2.6} far={2} />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2}
        maxDistance={5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, 0.85, 0]}
      />
      <SnapshotBridge onReady={onReady} />
    </Canvas>
  )
}
