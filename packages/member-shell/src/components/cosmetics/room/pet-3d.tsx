'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { COLS, FLOOR_HALF_X, FLOOR_HALF_Z, ROWS } from './coords'
import { Ball, Box, Cone } from './prims'

/** Bichinhos low-poly (gato/cachorro/passarinho) — frente em +Z, centrados, base em y=0. */
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

type Dir = { x: number; z: number }
const DIRS: Dir[] = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
]
const MARGIN = 0.45

/** A posição (x,z) do mundo está fora do chão OU numa célula ocupada por móvel? */
function blocked(x: number, z: number, occ: ReadonlySet<string>): boolean {
  if (x < -FLOOR_HALF_X + MARGIN || x > FLOOR_HALF_X - MARGIN) return true
  if (z < -FLOOR_HALF_Z + MARGIN || z > FLOOR_HALF_Z - MARGIN) return true
  const cx = Math.floor(x + COLS / 2)
  const cz = Math.floor(z + ROWS / 2)
  return occ.has(`${cx},${cz}`)
}

/**
 * Pet ativo ANDANDO pelo chão com COLISÃO: caminha em linha reta (4 direções) e, ao
 * encontrar um móvel ou parede logo à frente, vira para uma direção livre (sem atravessar).
 * O passarinho flutua (bob em Y). Gateado por `prefers-reduced-motion` (pose neutra parada).
 * O `frameloop` da cena vira "always" quando há pet e o movimento é permitido.
 */
export function Pet3D({
  petId,
  occupied,
  reducedMotion,
}: {
  petId: string | null
  occupied: ReadonlySet<string>
  reducedMotion: boolean
}) {
  const ref = useRef<Group>(null)
  const isBird = petId === 'pet-passaro'
  const pos = useRef({ x: 0, z: FLOOR_HALF_Z - 1.5 })
  const dir = useRef<Dir>({ x: 1, z: 0 })
  const speed = 1.4

  useFrame((s, dt) => {
    const g = ref.current
    if (!g || reducedMotion) return
    const step = Math.min(0.25, speed * dt)
    const d = dir.current
    // Olha meio passo à frente: bate e vira ANTES de entrar no móvel/parede.
    if (blocked(pos.current.x + d.x * 0.5, pos.current.z + d.z * 0.5, occupied)) {
      let picked: Dir | null = null
      const start = Math.floor(Math.random() * 4)
      for (let i = 0; i < 4; i++) {
        const cand = DIRS[(start + i) % 4]
        if (
          cand &&
          !blocked(pos.current.x + cand.x * 0.6, pos.current.z + cand.z * 0.6, occupied)
        ) {
          picked = cand
          break
        }
      }
      dir.current = picked ?? { x: -d.x, z: -d.z } // sem saída → dá meia-volta
    } else {
      pos.current.x += d.x * step
      pos.current.z += d.z * step
    }
    g.position.x = pos.current.x
    g.position.z = pos.current.z
    g.position.y = isBird ? 0.7 + Math.sin(s.clock.elapsedTime * 3) * 0.14 : 0
    // Vira suavemente para a direção do passo (frente da mesh = +Z).
    const target = Math.atan2(dir.current.x, dir.current.z)
    let diff = target - g.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    g.rotation.y += diff * Math.min(1, dt * 10)
  })

  if (!petId) return null
  return (
    <group ref={ref} position={[pos.current.x, isBird ? 0.7 : 0, pos.current.z]}>
      {petId === 'pet-gato' ? <Cat /> : petId === 'pet-cachorro' ? <Dog /> : <Bird />}
    </group>
  )
}
