'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { FLOOR_HALF_Z } from './coords'
import {
  createPetWalk,
  type PetAvoid,
  type PetWalkState,
  petAvoidStep,
  petWalkStep,
} from './pet-walk'
import { Ball, Box, Cone } from './prims'
import { RoomGlbModel } from './room-glb-model'

export type { PetAvoid } from './pet-walk'

/**
 * Reserva em primitivas dos bichinhos (gato/cachorro/passarinho), frente em +Z, centrados, base
 * em y=0. Desde 27/10/2026 o bichinho é o GLB do Blender, com o rabo e as asas animados no próprio
 * arquivo; estas formas só aparecem se ele não baixar.
 */
function Cat() {
  return (
    <group>
      <Ball s={[0.5, 0.42, 0.72]} p={[0, 0.3, 0]} m="grayDark" />
      <Ball s={[0.4, 0.4, 0.4]} p={[0, 0.5, 0.36]} m="grayDark" />
      <Cone s={[0.16, 0.22, 0.16]} p={[-0.12, 0.74, 0.36]} m="grayDark" />
      <Cone s={[0.16, 0.22, 0.16]} p={[0.12, 0.74, 0.36]} m="grayDark" />
      <Box s={[0.08, 0.08, 0.5]} p={[0, 0.42, -0.42]} m="grayDark" r={[0.5, 0, 0]} />
    </group>
  )
}
function Dog() {
  return (
    <group>
      <Ball s={[0.56, 0.46, 0.78]} p={[0, 0.32, 0]} m="wood" />
      <Ball s={[0.44, 0.44, 0.44]} p={[0, 0.5, 0.4]} m="wood" />
      <Box s={[0.14, 0.26, 0.1]} p={[-0.2, 0.5, 0.4]} m="woodDark" />
      <Box s={[0.14, 0.26, 0.1]} p={[0.2, 0.5, 0.4]} m="woodDark" />
      <Ball s={[0.16, 0.14, 0.16]} p={[0, 0.46, 0.62]} m="woodDark" />
      <Box s={[0.08, 0.08, 0.42]} p={[0, 0.5, -0.46]} m="wood" r={[-0.6, 0, 0]} />
    </group>
  )
}
function Bird() {
  return (
    <group>
      <Ball s={[0.34, 0.34, 0.42]} p={[0, 0.18, 0]} m="yellow" />
      <Ball s={[0.26, 0.26, 0.26]} p={[0, 0.36, 0.18]} m="yellow" />
      <Cone s={[0.1, 0.16, 0.1]} p={[0, 0.36, 0.36]} m="terracotta" r={[Math.PI / 2, 0, 0]} />
      <Box s={[0.28, 0.06, 0.2]} p={[-0.22, 0.2, 0]} m="terracotta" r={[0, 0, 0.3]} />
      <Box s={[0.28, 0.06, 0.2]} p={[0.22, 0.2, 0]} m="terracotta" r={[0, 0, -0.3]} />
    </group>
  )
}

/**
 * Pet ativo ANDANDO pelo chão com COLISÃO: caminha em linha reta (4 direções) e, ao
 * encontrar um móvel ou parede logo à frente, vira para uma direção livre (sem atravessar).
 * O passarinho flutua (bob em Y). Gateado por `prefers-reduced-motion` (pose neutra parada).
 * O `frameloop` da cena vira "always" quando há pet e o movimento é permitido.
 *
 * Opcionais, só do jogo (31/10/2026): `onPosition` recebe a posição (coordenadas do quarto) e o
 * rumo a cada quadro; `avoid` é um ponto a evitar (a criança), lido a cada quadro, com o
 * passinho e a subida do passarinho (`pet-walk.ts`). Sem eles o passeio é o de sempre.
 */
export function Pet3D({
  petId,
  occupied,
  reducedMotion,
  paused = false,
  onPosition,
  avoid,
}: {
  petId: string | null
  occupied: ReadonlySet<string>
  reducedMotion: boolean
  paused?: boolean
  onPosition?: (x: number, z: number, heading: number) => void
  avoid?: { readonly current: PetAvoid | null }
}) {
  const ref = useRef<Group>(null)
  const isBird = petId === 'pet-passaro'
  // Só a montagem define a posição declarativa. Uma nova renderização (pausa, por exemplo)
  // não deve sobrescrever a altura atual do pássaro com a altura inicial.
  const initialPosition = useMemo<[number, number, number]>(
    () => [0, isBird ? 0.7 : 0, FLOOR_HALF_Z - 1.5],
    [isBird],
  )
  const walk = useRef<PetWalkState>(createPetWalk(0, FLOOR_HALF_Z - 1.5))
  const time = useRef(0)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const s = walk.current
    const a = avoid?.current ?? null
    if (!paused && reducedMotion) {
      // Parado (menos movimento): só o que o jogo pede para dar passagem.
      if (a) {
        petAvoidStep(s, occupied, dt, a)
        g.position.x = s.x
        g.position.z = s.z
        if (isBird) g.position.y = 0.7 + s.lift
      }
    } else if (!paused) {
      time.current += Math.min(dt, 0.25)
      petWalkStep(s, occupied, dt, a)
      g.position.x = s.x
      g.position.z = s.z
      g.position.y = isBird ? 0.7 + s.lift + Math.sin(time.current * 3) * 0.14 : 0
      // Vira suavemente para a direção do passo (frente da mesh = +Z).
      const target = Math.atan2(s.dir.x, s.dir.z)
      let diff = target - g.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      g.rotation.y += diff * Math.min(1, dt * 10)
    }
    onPosition?.(s.x, s.z, Math.atan2(s.dir.x, s.dir.z))
  })

  if (!petId) return null
  return (
    <group ref={ref} position={initialPosition}>
      <RoomGlbModel
        itemId={petId}
        fallback={petId === 'pet-gato' ? <Cat /> : petId === 'pet-cachorro' ? <Dog /> : <Bird />}
      />
    </group>
  )
}
