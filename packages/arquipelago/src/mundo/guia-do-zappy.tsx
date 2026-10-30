import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from 'three'
import { useJogo } from '../estado/contexto'
import { guiaDoZappy } from '../estado/primeiros-passos'
import { CORPO } from '../sistemas/corpo'

/** O facho: um cilindro de luz dourada no lugar que o Zappy mostra, como a luz do Farol. */
const FACHO = { raio: 0.55, altura: 4.2 } as const
/** Mais longe que isso da criança, o facho e o Zappy não vão (o alvo fica na ilha central). */
export const ALCANCE_DO_GUIA = 30

/** O degradê do facho: forte no chão, sumindo para cima (feito uma vez, no aparelho). */
function texturaDoFacho(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const tela = document.createElement('canvas')
  tela.width = 2
  tela.height = 64
  const c = tela.getContext('2d')
  if (!c) return null
  const g = c.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0, 'rgba(255,216,79,0)')
  g.addColorStop(1, 'rgba(255,216,79,1)')
  c.fillStyle = g
  c.fillRect(0, 0, 2, 64)
  return new CanvasTexture(tela)
}

/**
 * O que o tutorial mostra no mundo (`guiaDoZappy`): o facho em cima do alvo, um anel no chão em
 * volta dele e o círculo de luz do "andar". Lê a cada quadro, fora do React; sem guia, nada aparece.
 */
export function GuiaDoZappyNoMundo() {
  const { loja, rastro } = useJogo()
  const reduzido = useReducedMotion()
  const facho = useRef<Group>(null)
  const anel = useRef<Mesh>(null)
  const circulo = useRef<Mesh>(null)
  const luzDoFacho = useRef<MeshBasicMaterial>(null)
  const textura = useMemo(texturaDoFacho, [])
  useEffect(() => () => textura?.dispose(), [textura])
  useFrame(({ clock }) => {
    const guia = guiaDoZappy(loja)
    const pe = rastro.y - CORPO.doCentroAoPe
    const pulso = reduzido ? 1 : 0.8 + 0.2 * Math.sin(clock.elapsedTime * 3)
    const alvo =
      guia.alvo && Math.hypot(guia.alvo.x - rastro.x, guia.alvo.z - rastro.z) < ALCANCE_DO_GUIA
        ? guia.alvo
        : null
    if (facho.current) {
      facho.current.visible = alvo !== null
      if (alvo) facho.current.position.set(alvo.x, pe, alvo.z)
    }
    if (luzDoFacho.current) luzDoFacho.current.opacity = 0.55 * pulso
    if (anel.current) anel.current.scale.setScalar(reduzido ? 1 : 0.9 + 0.1 * pulso)
    if (circulo.current) {
      const c = guia.circulo
      circulo.current.visible = c !== null
      if (c) {
        circulo.current.position.set(c.x, pe + 0.04, c.z)
        circulo.current.scale.setScalar(c.raio)
      }
    }
  })
  return (
    <>
      <group ref={facho} name="facho-do-zappy" visible={false}>
        <mesh position={[0, FACHO.altura / 2, 0]} renderOrder={2}>
          <cylinderGeometry args={[FACHO.raio, FACHO.raio, FACHO.altura, 24, 1, true]} />
          <meshBasicMaterial
            ref={luzDoFacho}
            map={textura ?? undefined}
            color="#ffd84f"
            transparent
            opacity={0.55}
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
          />
        </mesh>
        <mesh ref={anel} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <ringGeometry args={[FACHO.raio + 0.1, FACHO.raio + 0.28, 48]} />
          <meshBasicMaterial
            color="#ffd84f"
            transparent
            opacity={0.9}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      </group>
      <mesh
        ref={circulo}
        name="circulo-do-andar"
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        {/* Raio 1: a escala vira o raio de verdade. */}
        <ringGeometry args={[0.94, 1, 64]} />
        <meshBasicMaterial
          color="#ffe68a"
          transparent
          opacity={0.85}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </>
  )
}
