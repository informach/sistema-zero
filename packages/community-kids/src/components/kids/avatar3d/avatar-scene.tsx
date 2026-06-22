'use client'

import { ContactShadows, useProgress } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { AvatarSlot } from '@/lib/avatar3d-catalog'
import { recoverWebGLContext } from '@/lib/webgl-recovery'
import { useReducedMotion } from '../room/use-reduced-motion'
import { AvatarRig } from './avatar-rig'
import { CameraManager, type CamMode } from './camera-manager'

type Slots = Partial<Record<string, AvatarSlot>>
export type CaptureFn = () => Promise<Blob | null>

/**
 * Ponte de CAPTURA: registra no pai (via `onReady`) uma função que tira a "foto" do
 * personagem. `preserveDrawingBuffer:true` + um `gl.render` forçado garantem o frame
 * (sem isso o `toBlob` sai preto). Recorta um quadrado central 512×512 (avatar redondo).
 */
function SnapshotBridge({
  onReady,
  ready,
  fitKey,
  framedKey,
}: {
  onReady: (capture: CaptureFn) => void
  ready: boolean
  fitKey: string
  framedKey: string | null
}) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const { active } = useProgress()
  const canCapture = ready && framedKey === fitKey && !active

  useEffect(() => {
    const capture: CaptureFn = async () => {
      if (!canCapture) return null
      gl.render(scene, camera)
      const src = gl.domElement
      const size = Math.min(src.width, src.height)
      const sx = (src.width - size) / 2
      const sy = (src.height - size) / 2
      const out = document.createElement('canvas')
      out.width = 512
      out.height = 512
      const c = out.getContext('2d')
      if (!c) return null
      c.drawImage(src, sx, sy, size, size, 0, 0, 512, 512)
      return new Promise((resolve) => out.toBlob((b) => resolve(b), 'image/png'))
    }
    onReady(capture)
  }, [gl, scene, camera, onReady, canCapture])
  return null
}

function CaptureReadyBridge({
  ready,
  fitKey,
  framedKey,
  onCaptureReady,
}: {
  ready: boolean
  fitKey: string
  framedKey: string | null
  onCaptureReady: (ready: boolean) => void
}) {
  const { active } = useProgress()

  useEffect(() => {
    const ok = ready && framedKey === fitKey && !active
    if (!ok) {
      onCaptureReady(false)
      return
    }
    const raf = requestAnimationFrame(() => onCaptureReady(true))
    return () => {
      cancelAnimationFrame(raf)
      onCaptureReady(false)
    }
  }, [active, ready, fitKey, framedKey, onCaptureReady])

  return null
}

/**
 * Feixe de "teleporte" (estilo cabine do WawaSensei): cilindro brilhante que SOBE do pódio
 * quando alguma peça está carregando (`useProgress().active`) e some quando termina —
 * acompanhando o personagem que encolhe/gira no `avatar-rig`. Cosmético; cor da marca.
 */
function TeleporterBeam() {
  const group = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const { active } = useProgress()
  const reduced = useReducedMotion()
  const t = useRef(0)
  useFrame((_, dt) => {
    const wantOn = active && !reduced
    const k = Math.min(1, dt * 4)
    // Movimento reduzido: o feixe nunca aparece nem gira (some na hora).
    t.current = reduced ? 0 : THREE.MathUtils.lerp(t.current, wantOn ? 1 : 0, k)
    const g = group.current
    if (g) {
      g.scale.y = Math.max(0.0001, t.current)
      if (!reduced) g.rotation.y += dt * (active ? 2.2 : 0.3)
      g.visible = t.current > 0.01
    }
    const bm = beam.current?.material as THREE.MeshBasicMaterial | undefined
    if (bm) bm.opacity = 0.18 * t.current
    const rm = ring.current?.material as THREE.MeshBasicMaterial | undefined
    if (rm) rm.opacity = 0.65 * t.current
  })
  return (
    <group ref={group} scale={[1, 0.0001, 1]} visible={false}>
      <mesh ref={beam} position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 2.2, 28, 1, true]} />
        <meshBasicMaterial
          color="#7cf3ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.05, 28]} />
        <meshBasicMaterial color="#7cf3ff" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * Cena 3D do configurador (a ÚNICA tela do app que monta WebGL — em todo o resto o
 * `kids-avatar` mostra a FOTO). Personagem no pódio + luzes da marca + câmera `CameraControls`
 * (enquadra por modo/categoria, conserta o corte). `mode='photo'` libera órbita + retrato.
 */
export function AvatarScene({
  slots,
  onReady,
  onCaptureReady,
  fitKey,
  dark,
  mode = 'customize',
  pose = 'Idle',
  category = 'head',
}: {
  slots: Slots
  onReady: (c: CaptureFn) => void
  onCaptureReady: (ready: boolean) => void
  fitKey: string
  dark: boolean
  mode?: CamMode
  pose?: string
  category?: string
}) {
  const charRef = useRef<THREE.Group>(null)
  const lastFitKey = useRef<string | null>(null)
  const [ready, setReady] = useState(false)
  const [framedKey, setFramedKey] = useState<string | null>(null)

  useEffect(() => {
    if (lastFitKey.current === fitKey) return
    lastFitKey.current = fitKey
    setReady(false)
    setFramedKey(null)
    onCaptureReady(false)
  }, [fitKey, onCaptureReady])

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, 1.1, 5.5], fov: 45 }}
      onCreated={recoverWebGLContext}
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

      {/* Personagem GLB (suspende ao carregar as peças, peça-a-peça) — feet em y≈0 após o stand. */}
      <Suspense fallback={null}>
        <AvatarRig
          slots={slots}
          pose={pose}
          charRef={charRef}
          standKey={fitKey}
          onStood={() => setReady(true)}
        />
      </Suspense>

      {/* Pódio logo abaixo dos pés. */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.85, 0.1, 32]} />
        <meshStandardMaterial color={dark ? '#1b2230' : '#cfe7ee'} roughness={0.9} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={2.4} blur={2.6} far={2} />
      <TeleporterBeam />

      <CameraManager
        charRef={charRef}
        mode={mode}
        category={category}
        ready={ready}
        fitKey={fitKey}
        onFramed={setFramedKey}
      />
      <CaptureReadyBridge
        ready={ready}
        fitKey={fitKey}
        framedKey={framedKey}
        onCaptureReady={onCaptureReady}
      />
      <SnapshotBridge onReady={onReady} ready={ready} fitKey={fitKey} framedKey={framedKey} />
    </Canvas>
  )
}
