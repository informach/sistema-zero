import { COLS, FLOOR_HALF_X, FLOOR_HALF_Z, ROWS } from './coords'

/**
 * O passeio do bichinho do quarto (regra pura, sem React), usado pelo `Pet3D`. Ele anda em linha
 * reta (4 direções) e, ao achar um móvel ou parede logo à frente, vira para uma direção livre.
 *
 * O jogo (Arquipélago) pode passar um ponto a evitar (`PetAvoid`, a criança): com ele o bichinho
 * também para e vira quando ela está perto e à frente dele, dá um passinho para o lado quando o
 * jogo pede (`nudge` muda) e o passarinho sobe (`lift`). Sem o ponto (a plataforma, o "Meu
 * quarto"), o passo é exatamente o de sempre: as mesmas contas e os mesmos sorteios.
 */

export type PetDir = { x: number; z: number }

export const PET_DIRS: readonly PetDir[] = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
]
const MARGIN = 0.45
/** Velocidade do passeio (m/s). */
export const PET_SPEED = 1.4
/** O passinho para o lado quando o jogo pede (m). */
export const PET_NUDGE = 0.6
/** Quão rápido o passarinho chega na altura pedida (maior, mais rápido). */
const LIFT_RATE = 6

/** Um ponto que o bichinho evita (coordenadas do quarto) e os pedidos do jogo. */
export interface PetAvoid {
  x: number
  z: number
  /** Perto disto (m) e à frente dele, o bichinho para e vira. */
  radius: number
  /** Cada vez que o número muda, o bichinho dá um passinho para o lado livre. */
  nudge?: number
  /** Quanto o passarinho sobe acima do voo de sempre (m); 0 ou ausente, voo de sempre. */
  lift?: number
}

export interface PetWalkState {
  x: number
  z: number
  dir: PetDir
  /** O último `nudge` visto (`null` antes do primeiro). */
  nudgeSeen: number | null
  /** O passinho em curso: quanto falta andar e para onde. */
  nudgeLeft: number
  nudgeDir: PetDir
  /** Quanto o passarinho está acima do voo de sempre agora. */
  lift: number
}

export function createPetWalk(x: number, z: number): PetWalkState {
  return {
    x,
    z,
    dir: { x: 1, z: 0 },
    nudgeSeen: null,
    nudgeLeft: 0,
    nudgeDir: { x: 1, z: 0 },
    lift: 0,
  }
}

/** A posição (x,z) do quarto está fora do chão OU numa célula ocupada por móvel? */
export function petBlocked(x: number, z: number, occ: ReadonlySet<string>): boolean {
  if (x < -FLOOR_HALF_X + MARGIN || x > FLOOR_HALF_X - MARGIN) return true
  if (z < -FLOOR_HALF_Z + MARGIN || z > FLOOR_HALF_Z - MARGIN) return true
  const cx = Math.floor(x + COLS / 2)
  const cz = Math.floor(z + ROWS / 2)
  return occ.has(`${cx},${cz}`)
}

/** O ponto a evitar está perto (dentro do raio) e no rumo `d` de quem está em (x, z)? */
export function petAvoidAhead(x: number, z: number, d: PetDir, avoid: PetAvoid | null): boolean {
  if (!avoid) return false
  const ax = avoid.x - x
  const az = avoid.z - z
  return ax * ax + az * az < avoid.radius * avoid.radius && d.x * ax + d.z * az > 0
}

/**
 * Para que lado dar o passinho: de lado em relação ao ponto a evitar, de preferência para onde o
 * bichinho já anda, senão o outro lado, senão para longe dele; `null` se nenhum está livre.
 */
export function petNudgeDir(
  s: Pick<PetWalkState, 'x' | 'z' | 'dir'>,
  avoid: PetAvoid,
  occ: ReadonlySet<string>,
): PetDir | null {
  let ux = s.x - avoid.x
  let uz = s.z - avoid.z
  const d = Math.hypot(ux, uz)
  if (d < 1e-6) {
    ux = -s.dir.x
    uz = -s.dir.z
  } else {
    ux /= d
    uz /= d
  }
  const a = { x: -uz, z: ux }
  const b = { x: uz, z: -ux }
  const first = a.x * s.dir.x + a.z * s.dir.z >= 0 ? a : b
  const second = first === a ? b : a
  for (const c of [first, second, { x: ux, z: uz }]) {
    if (!petBlocked(s.x + c.x * PET_NUDGE, s.z + c.z * PET_NUDGE, occ)) return c
  }
  return null
}

/**
 * Os pedidos do jogo que valem mesmo parado (menos movimento): o passinho e a subida do
 * passarinho. Devolve `true` se mexeu na posição. Sem ponto a evitar, não faz nada.
 */
export function petAvoidStep(
  s: PetWalkState,
  occ: ReadonlySet<string>,
  dt: number,
  avoid: PetAvoid | null,
): boolean {
  if (!avoid) return false
  const target = avoid.lift ?? 0
  s.lift += (target - s.lift) * (1 - Math.exp(-LIFT_RATE * dt))
  const n = avoid.nudge ?? 0
  if (s.nudgeSeen === null) s.nudgeSeen = n
  else if (n !== s.nudgeSeen) {
    s.nudgeSeen = n
    const side = petNudgeDir(s, avoid, occ)
    if (side) {
      s.nudgeDir = side
      s.nudgeLeft = PET_NUDGE
      s.dir = { x: side.x, z: side.z }
    }
  }
  if (s.nudgeLeft <= 0) return false
  const step = Math.min(s.nudgeLeft, Math.min(0.25, PET_SPEED * dt))
  const nx = s.x + s.nudgeDir.x * step
  const nz = s.z + s.nudgeDir.z * step
  if (petBlocked(nx, nz, occ)) {
    s.nudgeLeft = 0
    return false
  }
  s.x = nx
  s.z = nz
  s.nudgeLeft -= step
  return true
}

/**
 * Um passo do passeio. `random` é o sorteio da direção nova (o `Math.random` no jogo e na
 * plataforma; nos testes, um sorteio com semente). Sem `avoid` é o passo de sempre.
 */
export function petWalkStep(
  s: PetWalkState,
  occ: ReadonlySet<string>,
  dt: number,
  avoid: PetAvoid | null = null,
  random: () => number = Math.random,
): void {
  if (petAvoidStep(s, occ, dt, avoid)) return
  const step = Math.min(0.25, PET_SPEED * dt)
  const d = s.dir
  // Olha meio passo à frente: bate e vira ANTES de entrar no móvel/parede (ou na criança).
  if (petBlocked(s.x + d.x * 0.5, s.z + d.z * 0.5, occ) || petAvoidAhead(s.x, s.z, d, avoid)) {
    let picked: PetDir | null = null
    const start = Math.floor(random() * 4)
    for (let i = 0; i < 4; i++) {
      const cand = PET_DIRS[(start + i) % 4]
      if (
        cand &&
        !petBlocked(s.x + cand.x * 0.6, s.z + cand.z * 0.6, occ) &&
        !petAvoidAhead(s.x, s.z, cand, avoid)
      ) {
        picked = cand
        break
      }
    }
    s.dir = picked ?? { x: -d.x, z: -d.z } // sem saída → dá meia-volta
  } else {
    s.x += d.x * step
    s.z += d.z * step
  }
}
