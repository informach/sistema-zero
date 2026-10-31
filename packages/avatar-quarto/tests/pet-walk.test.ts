import { describe, expect, test } from 'bun:test'
import { COLS, FLOOR_HALF_X, FLOOR_HALF_Z, ROWS } from '../src/quarto/coords'
import {
  createPetWalk,
  PET_NUDGE,
  type PetAvoid,
  petAvoidAhead,
  petBlocked,
  petWalkStep,
} from '../src/quarto/pet-walk'

/**
 * O passeio do bichinho do quarto (31/10/2026). O jogo ganhou um ponto a evitar (a criança), mas o
 * "Meu quarto" da plataforma não passa nada e precisa andar EXATAMENTE como antes. A referência
 * abaixo é a cópia literal do laço que morava no `useFrame` do `Pet3D` até esta data.
 */

type Dir = { x: number; z: number }
const DIRS: Dir[] = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
]
const MARGIN = 0.45
function blocked(x: number, z: number, occ: ReadonlySet<string>): boolean {
  if (x < -FLOOR_HALF_X + MARGIN || x > FLOOR_HALF_X - MARGIN) return true
  if (z < -FLOOR_HALF_Z + MARGIN || z > FLOOR_HALF_Z - MARGIN) return true
  const cx = Math.floor(x + COLS / 2)
  const cz = Math.floor(z + ROWS / 2)
  return occ.has(`${cx},${cz}`)
}
function passoAntigo(
  pos: { x: number; z: number },
  dir: { current: Dir },
  occupied: ReadonlySet<string>,
  dt: number,
  random: () => number,
) {
  const speed = 1.4
  const step = Math.min(0.25, speed * dt)
  const d = dir.current
  if (blocked(pos.x + d.x * 0.5, pos.z + d.z * 0.5, occupied)) {
    let picked: Dir | null = null
    const start = Math.floor(random() * 4)
    for (let i = 0; i < 4; i++) {
      const cand = DIRS[(start + i) % 4]
      if (cand && !blocked(pos.x + cand.x * 0.6, pos.z + cand.z * 0.6, occupied)) {
        picked = cand
        break
      }
    }
    dir.current = picked ?? { x: -d.x, z: -d.z }
  } else {
    pos.x += d.x * step
    pos.z += d.z * step
  }
}

/** Sorteio com semente (o mesmo nos dois lados da comparação). */
function sorteio(semente: number) {
  let s = semente >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const MOVEIS = new Set(['2,3', '3,3', '7,5', '8,1', '8,2', '5,6', '0,0', '11,7'])
const DTS = [1 / 60, 1 / 144, 1 / 30, 0.05, 0.3]

describe('o passeio do bichinho do quarto', () => {
  test('sem ponto a evitar, a trajetória é idêntica à de antes (Meu quarto)', () => {
    for (const semente of [1, 7, 42]) {
      for (const avoid of [undefined, null] as const) {
        const antigo = { x: 0, z: FLOOR_HALF_Z - 1.5 }
        const dirAntiga = { current: { x: 1, z: 0 } as Dir }
        const novo = createPetWalk(0, FLOOR_HALF_Z - 1.5)
        const ra = sorteio(semente)
        const rn = sorteio(semente)
        for (let i = 0; i < 4000; i++) {
          const dt = DTS[i % DTS.length] ?? 1 / 60
          passoAntigo(antigo, dirAntiga, MOVEIS, dt, ra)
          petWalkStep(novo, MOVEIS, dt, avoid, rn)
          expect(novo.x).toBe(antigo.x)
          expect(novo.z).toBe(antigo.z)
          expect(novo.dir).toEqual(dirAntiga.current)
        }
        expect(novo.lift).toBe(0)
      }
    }
  })

  test('um ponto a evitar longe do bichinho não muda nada do caminho', () => {
    const longe: PetAvoid = { x: 40, z: 40, radius: 0.9, nudge: 0, lift: 0 }
    const a = createPetWalk(0, FLOOR_HALF_Z - 1.5)
    const b = createPetWalk(0, FLOOR_HALF_Z - 1.5)
    const ra = sorteio(3)
    const rb = sorteio(3)
    for (let i = 0; i < 2000; i++) {
      petWalkStep(a, MOVEIS, 1 / 60, null, ra)
      petWalkStep(b, MOVEIS, 1 / 60, longe, rb)
      expect(b.x).toBe(a.x)
      expect(b.z).toBe(a.z)
    }
  })

  test('a criança perto e à frente: ele para e vira para outro lado livre', () => {
    const s = createPetWalk(0, 0)
    s.dir = { x: 1, z: 0 }
    const crianca: PetAvoid = { x: 0.7, z: 0, radius: 0.9 }
    expect(petAvoidAhead(s.x, s.z, s.dir, crianca)).toBe(true)
    petWalkStep(s, new Set(), 1 / 60, crianca, () => 0)
    // Não andou neste passo e o rumo novo não aponta para ela.
    expect(s.x).toBe(0)
    expect(s.dir.x * crianca.x + s.dir.z * crianca.z).toBeLessThanOrEqual(0)
    for (let i = 0; i < 120; i++) petWalkStep(s, new Set(), 1 / 60, crianca, Math.random)
    expect(Math.hypot(s.x - crianca.x, s.z - crianca.z)).toBeGreaterThan(0.7)
  })

  test('com ela atrás ele segue andando (não para à toa)', () => {
    const s = createPetWalk(0, 0)
    s.dir = { x: 1, z: 0 }
    petWalkStep(s, new Set(), 1 / 60, { x: -0.5, z: 0, radius: 0.9 }, () => 0)
    expect(s.x).toBeGreaterThan(0)
  })

  test('o passinho vai para o lado livre (a parede de um lado)', () => {
    // Encostado na parede de baixo (z negativo): o lado livre é +z.
    const z0 = -FLOOR_HALF_Z + 0.9
    const s = createPetWalk(0, z0)
    s.dir = { x: 0, z: -1 }
    const crianca: PetAvoid = { x: -0.7, z: z0, radius: 0.9, nudge: 0 }
    petWalkStep(s, new Set(), 1 / 60, crianca, () => 0) // vê o número pela primeira vez
    crianca.nudge = 1
    for (let i = 0; i < 60; i++) petWalkStep(s, new Set(), 1 / 60, crianca, () => 0)
    expect(s.z - z0).toBeGreaterThan(PET_NUDGE * 0.9)
    expect(petBlocked(s.x, s.z, new Set())).toBe(false)
  })

  test('o passarinho sobe quando o jogo pede e volta depois', () => {
    const s = createPetWalk(0, 0)
    const crianca: PetAvoid = { x: 3, z: 0, radius: 0.9, lift: 1.6 }
    for (let i = 0; i < 60; i++) petWalkStep(s, MOVEIS, 1 / 60, crianca, () => 0)
    expect(s.lift).toBeGreaterThan(1.5)
    crianca.lift = 0
    for (let i = 0; i < 120; i++) petWalkStep(s, MOVEIS, 1 / 60, crianca, () => 0)
    expect(s.lift).toBeLessThan(0.05)
  })
})
