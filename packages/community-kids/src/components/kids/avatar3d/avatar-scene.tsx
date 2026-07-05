'use client'

import { ContactShadows, useProgress } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { type RefObject, Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { AvatarSlot } from '@/lib/avatar3d-catalog'
import { recoverWebGLContext } from '@/lib/webgl-recovery'
import { useReducedMotion } from '../room/use-reduced-motion'
import { AvatarRig } from './avatar-rig'
import { CameraManager, type CamMode } from './camera-manager'

type Slots = Partial<Record<string, AvatarSlot>>
/** `portrait`: força um retrato de rosto (de frente), independente do enquadramento na tela. */
export type CaptureFn = (opts?: { portrait?: boolean }) => Promise<Blob | null>

/**
 * Estado de "carregando" ESTÁVEL p/ a cabine — espelha o `Experience.jsx` do WawaSensei: só
 * liga 50ms depois (não pisca em load instantâneo) e fica ligado por no MÍNIMO ~800ms (a
 * transformação SEMPRE dá pra ver). Sobre o `useProgress` (que some quando todo GLB carregou).
 * Tunável: subir o mínimo até 2000ms (como o WawaSensei) deixa o giro mais dramático.
 */
function useCabineLoading(): boolean {
  const { active } = useProgress()
  const [loading, setLoading] = useState(false)
  const startedAt = useRef(0)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    if (active) {
      t = setTimeout(() => {
        setLoading(true)
        startedAt.current = performance.now()
      }, 50)
    } else {
      t = setTimeout(
        () => setLoading(false),
        Math.max(0, 800 - (performance.now() - startedAt.current)),
      )
    }
    return () => clearTimeout(t)
  }, [active])
  return loading
}

/**
 * Ponte de CAPTURA: registra no pai (via `onReady`) uma função que tira a "foto" do
 * personagem. `preserveDrawingBuffer:true` + um `gl.render` forçado garantem o frame
 * (sem isso o `toBlob` sai preto). Recorta um quadrado central 512×512 (avatar redondo).
 * Só captura quando `canCapture` (cena pronta e nada carregando) — senão sai preto/meio-troca.
 */
function SnapshotBridge({
  onReady,
  canCapture,
  charRef,
}: {
  onReady: (capture: CaptureFn) => void
  canCapture: boolean
  charRef: RefObject<THREE.Group | null>
}) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  // ref com o estado MAIS RECENTE — a captura espera a cena assentar sem travar a UI nem nagar.
  const canCaptureRef = useRef(canCapture)
  canCaptureRef.current = canCapture
  // Câmera de RETRATO (rosto, DE FRENTE) reusada — "Salvar" sai sempre com a cara boa,
  // independente do enquadramento de corpo inteiro / da órbita que estiver na tela.
  const portraitCam = useRef(new THREE.PerspectiveCamera(45, 1, 0.01, 100))
  const tmpBox = useRef(new THREE.Box3())
  const tmpVec = useRef(new THREE.Vector3())
  useEffect(() => {
    const capture: CaptureFn = async (opts) => {
      // Espera a cena assentar (cabine/enquadramento) até ~2.5s — capturar no meio sai borrado.
      const start = performance.now()
      while (!canCaptureRef.current) {
        if (performance.now() - start > 2500) return null
        await new Promise((r) => setTimeout(r, 60))
      }
      let cam: THREE.Camera = camera
      // A imagem do avatar é um QUADRADO central (recorte abaixo). Para garantir que o conteúdo
      // certo caiba nesse quadrado (sem cortar cabeça/pés), a captura usa uma câmera própria:
      //  - "Salvar" (Personalizar) → RETRATO de rosto, de frente (imagem redonda sempre boa);
      //  - "Tirar foto" (Cabine)  → CORPO INTEIRO de FRENTE (a criança gira a tela só pra ADMIRAR
      //    a pose; a foto sai sempre de frente, com cabeça+pés). AMBOS via position.set + lookAt
      //    explícitos — confiável (a tentativa de "respeitar a órbita" via quaternion saía vazia).
      if (charRef.current) {
        charRef.current.updateWorldMatrix(true, true)
        tmpBox.current.setFromObject(charRef.current)
        if (!tmpBox.current.isEmpty()) {
          const b = tmpBox.current
          const c = b.getCenter(tmpVec.current)
          const h = Math.max(0.001, b.max.y - b.min.y)
          const cw = gl.domElement.width
          const ch = Math.max(1, gl.domElement.height)
          const pc = portraitCam.current
          pc.fov = 45
          pc.aspect = cw / ch
          if (opts?.portrait) {
            // Rosto, de frente (close no topo da cabeça).
            pc.position.set(c.x, b.max.y - h * 0.12, c.z + h * 0.9)
            pc.lookAt(c.x, b.max.y - h * 0.15, c.z)
          } else {
            // Corpo inteiro, de FRENTE. A altura `h` deve ocupar ~80% do QUADRADO central do
            // recorte (cabeça E pés). ⚠️ O personagem TEM PROFUNDIDADE (nariz/cabelo/aba do
            // chapéu e poses inclinadas ficam À FRENTE do centro): a cabeça, sendo o ponto
            // mais PRÓXIMO da câmera, é magnificada pela perspectiva e vazava o topo do quadro
            // com a margem de 10%. Por isso enquadramos a altura no PLANO FRONTAL do personagem
            // (`b.max.z`, o mais perto da câmera), não no centro — aí a cabeça ganha os 10% de
            // folga DE VERDADE e nunca é cortada (os pés, mais ao fundo, sobra ainda mais).
            const square = Math.min(cw, ch)
            const fitDist = (h * ch) / (2 * Math.tan((45 * Math.PI) / 360) * 0.8 * square)
            pc.position.set(c.x, c.y, b.max.z + fitDist)
            pc.lookAt(c.x, c.y, c.z)
          }
          pc.updateMatrixWorld()
          pc.updateProjectionMatrix()
          cam = pc
        }
      }
      gl.render(scene, cam)
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
  }, [gl, scene, camera, onReady, charRef])
  return null
}

/**
 * Feixe de "teleporte" (cabine do WawaSensei): cilindro brilhante que SOBE do pódio enquanto
 * `loading` (peça nova carregando) e some quando termina — acompanha o personagem que
 * encolhe/gira no `avatar-rig`. Cosmético; cor da marca. Movimento reduzido → nunca aparece.
 */
function TeleporterBeam({ loading }: { loading: boolean }) {
  const group = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const reduced = useReducedMotion()
  const t = useRef(0)
  useFrame((_, dt) => {
    const wantOn = loading && !reduced
    const k = Math.min(1, dt * 4)
    t.current = reduced ? 0 : THREE.MathUtils.lerp(t.current, wantOn ? 1 : 0, k)
    const g = group.current
    if (g) {
      g.scale.y = Math.max(0.0001, t.current)
      if (!reduced) g.rotation.y += dt * (loading ? 2.2 : 0.3)
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
 * Conteúdo da cena (dentro do `<Canvas>` p/ usar `useProgress`/`useThree`). O personagem fica em
 * pé UMA vez (`onStood` → `ready`); a câmera enquadra só em [mode, ready] (não a cada peça/cor —
 * fim do "recarrega a cena"); a cabine gira por `loading` (com duração mínima visível). Captura
 * liberada quando `ready && !loading`.
 */
function SceneContents({
  slots,
  pose,
  mode,
  dark,
  onReady,
}: {
  slots: Slots
  pose: string
  mode: CamMode
  dark: boolean
  onReady: (c: CaptureFn) => void
}) {
  const charRef = useRef<THREE.Group>(null)
  const [ready, setReady] = useState(false)
  const loading = useCabineLoading()
  const canCapture = ready && !loading

  return (
    <>
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

      {/* Personagem GLB — Suspense POR peça (no rig); fica em pé UMA vez. */}
      <Suspense fallback={null}>
        <AvatarRig
          slots={slots}
          pose={pose}
          loading={loading}
          charRef={charRef}
          onStood={() => setReady(true)}
        />
      </Suspense>

      {/* Pódio logo abaixo dos pés. */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.85, 0.1, 32]} />
        <meshStandardMaterial color={dark ? '#1b2230' : '#cfe7ee'} roughness={0.9} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={2.4} blur={2.6} far={2} />
      <TeleporterBeam loading={loading} />

      <CameraManager mode={mode} ready={ready} />
      <SnapshotBridge onReady={onReady} canCapture={canCapture} charRef={charRef} />
    </>
  )
}

/**
 * Cena 3D do configurador (a ÚNICA tela do app que monta WebGL — em todo o resto o
 * `kids-avatar` mostra a FOTO). Câmera `CameraControls`: CORPO INTEIRO em Personalizar, RETRATO
 * na Cabine de fotos. Trocar peça NÃO mexe a câmera (só a cabine gira).
 */
export function AvatarScene({
  slots,
  onReady,
  dark,
  mode = 'customize',
  pose = 'Idle',
}: {
  slots: Slots
  onReady: (c: CaptureFn) => void
  dark: boolean
  mode?: CamMode
  pose?: string
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, 1.0, 6.5], fov: 45 }}
      onCreated={recoverWebGLContext}
    >
      <SceneContents slots={slots} pose={pose} mode={mode} dark={dark} onReady={onReady} />
    </Canvas>
  )
}
