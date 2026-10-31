import type { Vec3 } from '../core/model'
import { turnOf, unit } from './characterQuaternion'
import { CHARACTER_JOINT_ROLES, type CharacterRole } from './characterRig'
import { SCENE_LIMITS } from './limits'
import type { Quaternion } from './matrix'
import * as v from './validation'

/**
 * Movimentos de personagem como DADOS: poses-chave de cada osso no espaço do personagem (X =
 * esquerda, Y = cima, Z = frente), presas ao osso de cima, e a trilha do quadril em comprimentos
 * de perna. Assim um movimento serve em qualquer esqueleto de personagem, como os do Mixamo
 * servem em qualquer personagem, e um movimento feito à mão vira um movimento pronto.
 */
export interface CharacterMotionKey {
  /** Fase de 0 (começo) a 1 (fim do ciclo). */
  at: number
  /** Giros dos ossos; o osso que não aparece fica no repouso. */
  pose: Partial<Record<CharacterRole, Quaternion>>
  /** Quadril para cima, para a esquerda e para a frente, em comprimentos de perna. */
  air?: number
  sway?: number
  forward?: number
}
export interface CharacterMotionData {
  name: string
  /** Duração padrão, em segundos. */
  duration: number
  loop: boolean
  /** Quantas poses por ciclo vão para a linha do tempo. */
  steps: number
  /** Plantados: pés no lugar de repouso, pernas por cinemática inversa. Livres: pernas dos dados. */
  feet: 'plantados' | 'livres'
  /** Com pés livres, a sola mais baixa encosta no chão a cada quadro (sentar, cair). */
  contact: boolean
  keys: CharacterMotionKey[]
}

const KEY_FIELDS = ['at', 'pose', 'air', 'sway', 'forward'] as const
const DATA_FIELDS = ['name', 'duration', 'loop', 'steps', 'feet', 'contact', 'keys'] as const

/** Confere um movimento vindo de fora (biblioteca guardada, arquivo): nada além do formato. */
export function readCharacterMotionData(raw: unknown, path = 'motion'): CharacterMotionData {
  const row = v.record(raw, path, DATA_FIELDS)
  const keys = v.list(row.keys, `${path}.keys`, 240).map((item, i) => {
    const key = v.record(item, `${path}.keys[${i}]`, KEY_FIELDS)
    const pose: CharacterMotionKey['pose'] = {}
    for (const [role, value] of Object.entries(v.record(key.pose, `${path}.keys[${i}].pose`))) {
      v.requireScene(
        (CHARACTER_JOINT_ROLES as readonly string[]).includes(role),
        `${path}.keys[${i}].pose.${role}`,
        'Osso desconhecido.',
      )
      const q = v.tuple(value, 4, `${path}.keys[${i}].pose.${role}`)
      v.requireScene(Math.hypot(...q) > 0.5, `${path}.keys[${i}].pose.${role}`, 'Giro inválido.')
      pose[role as CharacterRole] = unit(q as Quaternion)
    }
    const offset = (name: 'air' | 'sway' | 'forward') =>
      key[name] === undefined
        ? {}
        : { [name]: v.number(key[name], `${path}.keys[${i}].${name}`, -100, 100) }
    return {
      at: v.number(key.at, `${path}.keys[${i}].at`, 0, 1),
      pose,
      ...offset('air'),
      ...offset('sway'),
      ...offset('forward'),
    }
  })
  v.requireScene(keys.length > 0, `${path}.keys`, 'O movimento precisa de uma pose.')
  for (let i = 1; i < keys.length; i++)
    v.requireScene(keys[i]!.at > keys[i - 1]!.at, `${path}.keys[${i}].at`, 'Poses fora de ordem.')
  return {
    name: v.text(v.text(row.name, `${path}.name`, 48).trim(), `${path}.name`, 48),
    duration: v.number(row.duration, `${path}.duration`, 0.1, SCENE_LIMITS.animationSeconds),
    loop: v.boolean(row.loop, `${path}.loop`),
    steps: v.number(row.steps, `${path}.steps`, 2, 120, true),
    feet: v.choice(row.feet, ['plantados', 'livres'] as const, `${path}.feet`),
    contact: v.boolean(row.contact, `${path}.contact`),
    keys,
  }
}

// ---- Autoria dos movimentos prontos ----------------------------------------------------------
/** Graus (dobra X, torce Y, inclina Z). `both` espelha: o lado direito inverte torção e inclinação. */
type Angles = Partial<Record<CharacterRole, Vec3>>
interface Draft {
  both?: Partial<
    Record<'shoulder' | 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'foot', Vec3>
  >
  pose?: Angles
  air?: number
  sway?: number
  forward?: number
}
function key(at: number, draft: Draft): CharacterMotionKey {
  const angles: Angles = { ...draft.pose }
  for (const [limb, [x, y, z]] of Object.entries(draft.both ?? {}) as Array<[string, Vec3]>) {
    angles[`${limb}L` as CharacterRole] ??= [x, y, z]
    angles[`${limb}R` as CharacterRole] ??= [x, -y, -z]
  }
  const pose: CharacterMotionKey['pose'] = {}
  for (const [role, value] of Object.entries(angles) as Array<[CharacterRole, Vec3]>)
    pose[role] = turnOf(value).map((n) => Math.round(n * 1e6) / 1e6) as Quaternion
  return { at, pose, air: draft.air, sway: draft.sway, forward: draft.forward }
}
const motion = (
  name: string,
  duration: number,
  options: Pick<CharacterMotionData, 'loop' | 'steps' | 'feet' | 'contact'>,
  keys: CharacterMotionKey[],
): CharacterMotionData => ({ name, duration, ...options, keys })
const LOOP = { loop: true, steps: 24, feet: 'plantados', contact: false } as const
const ONCE = { loop: false, steps: 30, feet: 'plantados', contact: false } as const
/** Braços soltos ao lado do corpo, cotovelo levemente dobrado. */
const RELAXED = { upperArm: [0, 0, 0], forearm: [-12, 0, 0] } as const satisfies Draft['both']

/**
 * Os movimentos prontos que são dados. Braços: X negativo leva o braço para a frente, Z abre para
 * o lado; antebraço com X negativo dobra o cotovelo. Coluna com X positivo inclina para a frente.
 */
export const CHARACTER_MOTION_DATA = {
  crouch: motion('Agachar', 2, LOOP, [
    key(0, { both: RELAXED, air: -0.02 }),
    key(0.5, {
      both: { upperArm: [-60, 0, 8], forearm: [-25, 0, 0] },
      pose: { spine: [22, 0, 0], chest: [10, 0, 0], head: [-20, 0, 0] },
      air: -0.32,
      forward: -0.06,
    }),
    key(1, { both: RELAXED, air: -0.02 }),
  ]),
  fall: motion('Cair', 1.6, { loop: false, steps: 32, feet: 'livres', contact: true }, [
    key(0, { both: RELAXED }),
    key(0.2, {
      both: { upperArm: [-20, 0, 55], forearm: [-30, 0, 0], thigh: [-8, 0, 0], shin: [10, 0, 0] },
      pose: { spine: [-12, 0, 0], head: [10, 0, 0] },
    }),
    key(0.55, {
      both: { upperArm: [-35, 0, 70], forearm: [-20, 0, 0], thigh: [-35, 0, 0], shin: [40, 0, 0] },
      pose: { hips: [-55, 0, 0], spine: [-5, 0, 0], head: [25, 0, 0] },
      forward: -0.25,
    }),
    key(1, {
      both: { upperArm: [0, 0, 75], forearm: [-5, 0, 0], thigh: [-5, 0, 0], shin: [5, 0, 0] },
      pose: { hips: [-86, 0, 0], head: [20, 0, 0] },
      forward: -0.55,
      air: 0.04,
    }),
  ]),
  wave: motion('Acenar', 1.2, LOOP, [
    key(0, {
      pose: {
        upperArmR: [-10, 0, -140],
        forearmR: [-35, 0, 0],
        upperArmL: [0, 0, 0],
        forearmL: [-12, 0, 0],
        spine: [0, 0, 3],
        head: [0, -8, 4],
      },
    }),
    key(0.5, {
      pose: {
        upperArmR: [-10, 0, -158],
        forearmR: [-15, 0, 0],
        upperArmL: [0, 0, 0],
        forearmL: [-12, 0, 0],
        spine: [0, 0, 4],
        head: [0, -8, 6],
      },
    }),
    key(1, {
      pose: {
        upperArmR: [-10, 0, -140],
        forearmR: [-35, 0, 0],
        upperArmL: [0, 0, 0],
        forearmL: [-12, 0, 0],
        spine: [0, 0, 3],
        head: [0, -8, 4],
      },
    }),
  ]),
  clap: motion('Bater palmas', 0.7, LOOP, [
    key(0, { both: { upperArm: [-55, 0, 18], forearm: [-55, 0, 0] }, pose: { head: [-6, 0, 0] } }),
    key(0.5, {
      both: { upperArm: [-58, 0, -14], forearm: [-50, 0, 0] },
      pose: { head: [-6, 0, 0], chest: [3, 0, 0] },
      air: -0.015,
    }),
    key(1, { both: { upperArm: [-55, 0, 18], forearm: [-55, 0, 0] }, pose: { head: [-6, 0, 0] } }),
  ]),
  push: motion('Empurrar', 1.4, LOOP, [
    key(0, {
      both: { upperArm: [-80, 0, 6], forearm: [-70, 0, 0] },
      pose: { spine: [15, 0, 0], chest: [6, 0, 0], head: [-14, 0, 0] },
      air: -0.06,
    }),
    key(0.5, {
      both: { upperArm: [-86, 0, 4], forearm: [-8, 0, 0] },
      pose: { spine: [25, 0, 0], chest: [8, 0, 0], head: [-22, 0, 0] },
      air: -0.09,
      forward: 0.1,
    }),
    key(1, {
      both: { upperArm: [-80, 0, 6], forearm: [-70, 0, 0] },
      pose: { spine: [15, 0, 0], chest: [6, 0, 0], head: [-14, 0, 0] },
      air: -0.06,
    }),
  ]),
  punch: motion('Golpe de leve', 1, LOOP, [
    key(0, {
      both: { upperArm: [-35, 0, 10], forearm: [-110, 0, 0] },
      pose: { spine: [8, 0, 0] },
      air: -0.05,
    }),
    key(0.25, {
      pose: {
        upperArmL: [-85, 0, -5],
        forearmL: [-5, 0, 0],
        upperArmR: [-35, 0, -10],
        forearmR: [-110, 0, 0],
        chest: [6, -18, 0],
        spine: [8, -6, 0],
      },
      air: -0.05,
    }),
    key(0.5, {
      both: { upperArm: [-35, 0, 10], forearm: [-110, 0, 0] },
      pose: { spine: [8, 0, 0] },
      air: -0.05,
    }),
    key(0.75, {
      pose: {
        upperArmR: [-85, 0, 5],
        forearmR: [-5, 0, 0],
        upperArmL: [-35, 0, 10],
        forearmL: [-110, 0, 0],
        chest: [6, 18, 0],
        spine: [8, 6, 0],
      },
      air: -0.05,
    }),
    key(1, {
      both: { upperArm: [-35, 0, 10], forearm: [-110, 0, 0] },
      pose: { spine: [8, 0, 0] },
      air: -0.05,
    }),
  ]),
  dance: motion('Dançar', 2, { ...LOOP, steps: 32 }, [
    key(0, { both: { upperArm: [-20, 0, 25], forearm: [-50, 0, 0] }, air: -0.03 }),
    key(0.25, {
      pose: {
        upperArmL: [-10, 0, 150],
        forearmL: [-30, 0, 0],
        upperArmR: [-20, 0, -25],
        forearmR: [-60, 0, 0],
        hips: [0, 0, 6],
        chest: [0, 12, -4],
        head: [0, 0, -8],
      },
      sway: 0.05,
      air: -0.08,
    }),
    key(0.5, { both: { upperArm: [-20, 0, 25], forearm: [-50, 0, 0] }, air: -0.03 }),
    key(0.75, {
      pose: {
        upperArmR: [-10, 0, -150],
        forearmR: [-30, 0, 0],
        upperArmL: [-20, 0, 25],
        forearmL: [-60, 0, 0],
        hips: [0, 0, -6],
        chest: [0, -12, 4],
        head: [0, 0, 8],
      },
      sway: -0.05,
      air: -0.08,
    }),
    key(1, { both: { upperArm: [-20, 0, 25], forearm: [-50, 0, 0] }, air: -0.03 }),
  ]),
  cheer: motion('Comemorar', 1, LOOP, [
    key(0, {
      both: { upperArm: [-10, 0, 150], forearm: [-15, 0, 0] },
      pose: { head: [-12, 0, 0], chest: [-6, 0, 0] },
      air: -0.02,
    }),
    key(0.5, {
      both: { upperArm: [-15, 0, 135], forearm: [-55, 0, 0] },
      pose: { head: [-4, 0, 0], spine: [6, 0, 0] },
      air: -0.12,
    }),
    key(1, {
      both: { upperArm: [-10, 0, 150], forearm: [-15, 0, 0] },
      pose: { head: [-12, 0, 0], chest: [-6, 0, 0] },
      air: -0.02,
    }),
  ]),
  lookAround: motion('Olhar em volta', 3, { ...LOOP, steps: 36 }, [
    key(0, { both: RELAXED }),
    key(0.25, {
      both: RELAXED,
      pose: { head: [-5, 45, 0], neck: [0, 15, 0], chest: [0, 12, 0] },
    }),
    key(0.5, { both: RELAXED, pose: { head: [-8, 0, 0] } }),
    key(0.75, {
      both: RELAXED,
      pose: { head: [-5, -45, 0], neck: [0, -15, 0], chest: [0, -12, 0] },
    }),
    key(1, { both: RELAXED }),
  ]),
  startle: motion('Levar um susto', 1.2, ONCE, [
    key(0, { both: RELAXED }),
    key(0.15, {
      both: { upperArm: [-70, 0, 35], forearm: [-95, 0, 0] },
      pose: { spine: [-14, 0, 0], chest: [-6, 0, 0], head: [-12, 0, 0] },
      forward: -0.1,
      air: -0.04,
    }),
    key(0.55, {
      both: { upperArm: [-65, 0, 30], forearm: [-90, 0, 0] },
      pose: { spine: [-10, 0, 0], head: [-8, 0, 0] },
      forward: -0.08,
      air: -0.05,
    }),
    key(1, {
      both: { upperArm: [-20, 0, 10], forearm: [-50, 0, 0] },
      pose: { spine: [-3, 0, 0] },
      forward: -0.03,
      air: -0.03,
    }),
  ]),
  sit: motion('Sentar', 1.5, { loop: false, steps: 30, feet: 'livres', contact: true }, [
    key(0, { both: RELAXED }),
    key(0.55, {
      both: { upperArm: [-30, 0, 8], forearm: [-25, 0, 0], thigh: [-50, 0, 0], shin: [50, 0, 0] },
      pose: { spine: [28, 0, 0], head: [-18, 0, 0] },
      forward: -0.2,
    }),
    key(1, {
      both: { upperArm: [-35, 0, 5], forearm: [-20, 0, 0], thigh: [-88, 0, 0], shin: [88, 0, 0] },
      pose: { spine: [10, 0, 0], head: [-6, 0, 0] },
      forward: -0.42,
    }),
  ]),
} satisfies Record<string, CharacterMotionData>

export type CharacterMotionDataKind = keyof typeof CHARACTER_MOTION_DATA
