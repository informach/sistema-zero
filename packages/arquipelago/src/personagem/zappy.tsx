import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { Component, type ReactNode, Suspense, useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  type Group,
  MathUtils,
  type Mesh,
  type MeshBasicMaterial,
  MeshStandardMaterial,
  type PointLight,
} from 'three'
import zappyGlb from '../assets/zappy.glb'
import { useJogo } from '../estado/contexto'

/**
 * O caminho que o Bun devolve é relativo à pasta da saída, não à página: resolve contra o próprio
 * módulo (no Kids o jogo vem de `/api/arquipelago/cliente/`, com a página em `/arquipelago`).
 */
const URL_DO_ZAPPY = new URL(zappyGlb, import.meta.url).href
/** O modelo tem ~2 de altura (das patinhas às antenas); no ombro do personagem fica com ~0,6. */
const ESCALA = 0.3
/** A bunda do Zappy no espaço do modelo (no Blender: y 0,38 para trás e z -0,2). */
const BUNDA: [number, number, number] = [0, -0.2, -0.38]

/** O Zappy, o vagalume guia, voando perto do ombro. À noite a bunda dele ilumina em volta. */
export function Zappy() {
  const { rastro, ambiente } = useJogo()
  const camera = useThree((s) => s.camera)
  const grupo = useRef<Group>(null)
  const luz = useRef<PointLight>(null)
  const brilho = useRef({ forca: 1 })
  const voando = useRef(false)
  const anterior = useRef({ x: 0, z: 0 })
  useFrame(({ clock }, dt) => {
    const g = grupo.current
    if (!g) return
    const t = clock.elapsedTime
    const alvoX = rastro.x + Math.cos(rastro.giro) * 0.9 + Math.sin(t * 1.3) * 0.25
    const alvoZ = rastro.z - Math.sin(rastro.giro) * 0.9 + Math.cos(t * 1.1) * 0.25
    const alvoY = rastro.y + 1.3 + Math.sin(t * 2.4) * 0.12
    const k = 1 - Math.exp(-dt * 4)
    g.position.x += (alvoX - g.position.x) * k
    g.position.y += (alvoY - g.position.y) * k
    g.position.z += (alvoZ - g.position.z) * k
    // Vira para onde está voando; parado, vira o rosto para a câmera.
    const vx = (g.position.x - anterior.current.x) / Math.max(dt, 1e-3)
    const vz = (g.position.z - anterior.current.z) / Math.max(dt, 1e-3)
    anterior.current = { x: g.position.x, z: g.position.z }
    const rapido = vx * vx + vz * vz > 0.6
    voando.current = rapido
    const alvoGiro = rapido
      ? Math.atan2(vx, vz)
      : Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z)
    const delta =
      MathUtils.euclideanModulo(alvoGiro - g.rotation.y + Math.PI, Math.PI * 2) - Math.PI
    g.rotation.y += delta * (1 - Math.exp(-dt * 5))
    // A bunda pulsa devagar; à noite brilha bem mais e a luz alcança longe.
    const noite = 1 - ambiente.luz
    brilho.current.forca = (1.4 + noite * 3.2) * (0.82 + 0.18 * Math.sin(t * 2.1))
    if (luz.current) luz.current.intensity = 2 + noite * 14
  })
  return (
    <group ref={grupo}>
      <Barreira reserva={<Bolinha />}>
        <Suspense fallback={<Bolinha />}>
          <ModeloDoZappy brilho={brilho} voando={voando} />
        </Suspense>
      </Barreira>
      <pointLight
        ref={luz}
        color="#e6ff7a"
        distance={9}
        intensity={2}
        position={[0, -0.1 + BUNDA[1] * ESCALA, BUNDA[2] * ESCALA]}
      />
    </group>
  )
}

function ModeloDoZappy({
  brilho,
  voando,
}: {
  brilho: { current: { forca: number } }
  voando: { current: boolean }
}) {
  const gltf = useGLTF(URL_DO_ZAPPY, false, false)
  const raiz = useRef<Group>(null)
  const reduzido = useReducedMotion()
  const { scene, luzes } = useMemo(() => {
    const copia = gltf.scene.clone(true)
    const achadas: MeshStandardMaterial[] = []
    copia.traverse((o) => {
      const m = (o as Mesh).material
      if (m instanceof MeshStandardMaterial && m.name === 'luz') {
        const propria = m.clone()
        ;(o as Mesh).material = propria
        achadas.push(propria)
      }
    })
    return { scene: copia, luzes: achadas }
  }, [gltf.scene])
  const { actions } = useAnimations(gltf.animations, raiz)
  const atual = useRef<'voar' | 'parado' | null>(null)
  const halo = useRef<MeshBasicMaterial>(null)
  useEffect(() => {
    for (const a of Object.values(actions)) a?.setEffectiveTimeScale(reduzido ? 0.25 : 1)
  }, [actions, reduzido])
  useFrame(() => {
    const quer = voando.current ? 'voar' : 'parado'
    if (quer !== atual.current) {
      const de = atual.current ? actions[atual.current] : null
      const para = actions[quer]
      para?.reset().fadeIn(0.25).play()
      de?.fadeOut(0.25)
      atual.current = quer
    }
    for (const m of luzes) m.emissiveIntensity = brilho.current.forca
    // O halo deixa a bunda acesa visível de qualquer lado (de frente o corpo a esconde).
    if (halo.current) halo.current.opacity = Math.min(0.5, 0.07 * brilho.current.forca)
  })
  return (
    <group ref={raiz} scale={ESCALA} position={[0, -0.1, 0]}>
      <primitive object={scene} />
      <mesh position={BUNDA}>
        <sphereGeometry args={[0.5, 14, 10]} />
        <meshBasicMaterial
          ref={halo}
          color="#e6ff6a"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/** A bolinha de luz de antes: aparece enquanto o modelo baixa ou se ele não vier. */
function Bolinha() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#fff6b0" emissive="#ffd84f" emissiveIntensity={3} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshBasicMaterial color="#ffe58a" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </>
  )
}

/** Se o arquivo do Zappy falhar, o jogo segue com a bolinha (nunca derruba a cena). */
class Barreira extends Component<{ reserva: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() {
    return { erro: true }
  }
  render() {
    return this.state.erro ? this.props.reserva : this.props.children
  }
}
