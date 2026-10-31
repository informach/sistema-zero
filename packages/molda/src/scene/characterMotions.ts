import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationTrack } from './animation'
import {
  CHARACTER_MOTION_DATA,
  type CharacterMotionData,
  type CharacterMotionDataKind,
  type CharacterMotionKey,
  readCharacterMotionData,
} from './characterMotionLibrary'
import {
  about,
  add,
  arc,
  chain,
  conjugate,
  DEG,
  dot,
  IDENTITY,
  length,
  mul,
  power,
  rotate,
  rotationOf,
  scale,
  slerp,
  sub,
  unit,
  X,
  Y,
  Z,
} from './characterQuaternion'
import {
  CHARACTER_JOINT_ROLES,
  CHARACTER_PARENT,
  type CharacterRig,
  type CharacterRole,
  findCharacterRigs,
} from './characterRig'
import { allocateSceneId, finishSceneCommand } from './commandContext'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { SCENE_LIMITS } from './limits'
import { affineInverse, type Quaternion, transformDirection, transformPoint } from './matrix'
import { sceneGeometryMesh } from './parametricGeometry'
import { readSceneAnimationClip } from './readAnimation'
import { prepareSceneAnimation, prepareSceneAnimationPreview } from './sampleAnimation'
import * as v from './validation'

/** Os quatro feitos por conta (pés, voo); os outros são dados (`characterMotionLibrary.ts`). */
const GENERATED = ['idle', 'walk', 'run', 'jump'] as const
type GeneratedMotion = (typeof GENERATED)[number]
export const CHARACTER_MOTIONS = [
  ...GENERATED,
  ...(Object.keys(CHARACTER_MOTION_DATA) as CharacterMotionDataKind[]),
] as const
export type CharacterMotion = GeneratedMotion | CharacterMotionDataKind
export type CharacterMotionCategory = 'mover' | 'brincar' | 'dancar' | 'emocoes'
export type CharacterMotionControl = 'speed' | 'strength' | 'arms' | 'inPlace'
export interface CharacterMotionInfo {
  category: CharacterMotionCategory
  /** Duração padrão, em segundos. */
  duration: number
  loop: boolean
  /** Os controles que fazem sentido neste movimento (como os de cada animação do Mixamo). */
  controls: readonly CharacterMotionControl[]
}
const BASIC = ['speed', 'strength', 'arms'] as const
const GENERATED_INFO: Record<GeneratedMotion, CharacterMotionInfo & { steps: number }> = {
  idle: { category: 'mover', duration: 3, loop: true, controls: BASIC, steps: 36 },
  walk: { category: 'mover', duration: 1, loop: true, controls: [...BASIC, 'inPlace'], steps: 24 },
  run: { category: 'mover', duration: 0.7, loop: true, controls: [...BASIC, 'inPlace'], steps: 24 },
  jump: { category: 'mover', duration: 1.2, loop: true, controls: BASIC, steps: 36 },
}
const DATA_CATEGORY: Record<CharacterMotionDataKind, CharacterMotionCategory> = {
  crouch: 'mover',
  sit: 'mover',
  fall: 'mover',
  wave: 'brincar',
  clap: 'brincar',
  push: 'brincar',
  punch: 'brincar',
  dance: 'dancar',
  cheer: 'emocoes',
  lookAround: 'emocoes',
  startle: 'emocoes',
}
/** Categoria, duração, repetição e controles de cada movimento pronto. */
export const CHARACTER_MOTION_INFO = Object.fromEntries(
  CHARACTER_MOTIONS.map((kind) => {
    if (kind in GENERATED_INFO) return [kind, GENERATED_INFO[kind as GeneratedMotion]]
    const data = CHARACTER_MOTION_DATA[kind as CharacterMotionDataKind]
    return [
      kind,
      {
        category: DATA_CATEGORY[kind as CharacterMotionDataKind],
        duration: data.duration,
        loop: data.loop,
        controls: BASIC,
      },
    ]
  }),
) as Record<CharacterMotion, CharacterMotionInfo>
export const CHARACTER_MOTION_DURATION = Object.fromEntries(
  CHARACTER_MOTIONS.map((kind) => [kind, CHARACTER_MOTION_INFO[kind].duration]),
) as Record<CharacterMotion, number>
const COPY_MISSING_CLIP = 'O movimento guardado que seria trocado não existe mais.'
/** Força: 1 é o movimento padrão; de metade a uma vez e meia. */
export const CHARACTER_MOTION_AMOUNT = { minimum: 0.5, maximum: 1.5 } as const

export interface CharacterMotionOptions {
  /** Um movimento pronto, ou `custom` com os dados em `data` (um movimento guardado da pessoa). */
  kind: CharacterMotion | 'custom'
  data?: CharacterMotionData
  name: string
  duration: number
  amount: number
  /** Id de um movimento guardado que este substitui no lugar (mesmo id e nome). */
  replaces?: string
  /**
   * No lugar (padrão): o personagem anda sem sair do lugar, e o jogo é que o leva. Desligado, o
   * corpo anda para a frente no ritmo dos passos e o pé apoiado fica parado no chão.
   */
  inPlace?: boolean
  /**
   * Braços: graus a mais (afastados) ou a menos (junto do corpo) sobre o ângulo que o Molda
   * calcula para o braço caído não atravessar o tronco.
   */
  arms?: number
}

/** Quanto dá para juntar ou afastar os braços, em graus, sobre o ângulo calculado. */
export const CHARACTER_MOTION_ARMS = { minimum: -10, maximum: 30 } as const

// ---- Poses ---------------------------------------------------------------------------------
/** Giros de cada osso no espaço do personagem, presos ao osso de cima. */
type Pose = Partial<Record<CharacterRole, Quaternion>>
interface Frame {
  pose: Pose
  /** Altura extra do quadril além do contato com o chão, em comprimentos de perna. */
  air: number
  /** Deslocamento lateral do quadril, em comprimentos de perna. */
  sway: number
  /**
   * Pés guiados: as pernas são refeitas (cinemática inversa) para cada tornozelo ir ao alvo. Com
   * eles, `air` é a altura do quadril em relação ao repouso (o pé de apoio pode baixá-la).
   */
  feet?: Record<'L' | 'R', Foot>
  /** Quanto o corpo anda para a frente num ciclo, em comprimentos de perna, fora do "No lugar". */
  travel?: number
  /** Quadril para a frente, em comprimentos de perna. */
  forward?: number
  /** Pés livres sem contato: a altura do quadril é a dos dados, sem encostar a sola no chão. */
  free?: boolean
}
interface Foot {
  /** Alvo do tornozelo a partir do repouso, em comprimentos de perna (esquerda, cima, frente). */
  offset: Vec3
  /** Inclinação do pé no mundo, em graus (positivo: ponta para baixo). */
  pitch: number
  /** Apoiado no chão: o quadril desce se preciso para a perna alcançar. */
  ground: boolean
}
/** Os dois pés no repouso, apoiados. */
const STANDING: Record<'L' | 'R', Foot> = {
  L: { offset: [0, 0, 0], pitch: 0, ground: true },
  R: { offset: [0, 0, 0], pitch: 0, ground: true },
}

/** Interpola valores marcados ao longo da fase (0 a 1), suavizando entre as marcas. */
function curve(points: ReadonlyArray<readonly [number, number]>, u: number) {
  const t = ((u % 1) + 1) % 1
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, va] = points[i]!
    const [b, vb] = points[i + 1]!
    if (t <= b) {
      const s = (t - a) / (b - a || 1)
      return va + (vb - va) * (s * s * (3 - 2 * s))
    }
  }
  return points.at(-1)![1]
}

/**
 * Uma pose por fase. As pernas balançam em X (negativo = para frente), o joelho dobra para trás e
 * o tornozelo segue a inclinação que o PÉ deve ter no mundo, descontando coxa e joelho.
 */
/** Pose de um movimento em dados: entre as poses-chave vizinhas, com começo e fim suaves. */
function frameFromData(data: CharacterMotionData, u: number, amount: number): Frame {
  const t = data.loop ? ((u % 1) + 1) % 1 : Math.max(0, Math.min(1, u))
  const keys = data.keys
  const first = keys[0]!
  const last = keys.at(-1)!
  let a = last
  let b = first
  let from = last.at - 1
  let to = first.at
  if (t >= last.at) {
    a = last
    b = data.loop ? first : last
    from = last.at
    to = data.loop ? first.at + 1 : last.at
  } else if (t < first.at) {
    if (!data.loop) {
      a = first
      from = first.at
    }
  } else
    for (let i = 0; i + 1 < keys.length; i++)
      if (t >= keys[i]!.at && t < keys[i + 1]!.at) {
        a = keys[i]!
        b = keys[i + 1]!
        from = a.at
        to = b.at
        break
      }
  const span = to - from
  const raw = span > 1e-9 ? Math.max(0, Math.min(1, (t - from) / span)) : 0
  const w = raw * raw * (3 - 2 * raw)
  const pose: Pose = {}
  for (const role of new Set([
    ...Object.keys(a.pose),
    ...Object.keys(b.pose),
  ]) as Set<CharacterRole>)
    pose[role] = power(slerp(a.pose[role] ?? IDENTITY, b.pose[role] ?? IDENTITY, w), amount)
  const mix = (name: 'air' | 'sway' | 'forward') =>
    amount * ((a[name] ?? 0) + w * ((b[name] ?? 0) - (a[name] ?? 0)))
  return {
    pose,
    air: mix('air'),
    sway: mix('sway'),
    forward: mix('forward'),
    feet: data.feet === 'plantados' ? STANDING : undefined,
    free: data.feet === 'livres' && !data.contact,
  }
}

function frame(kind: GeneratedMotion, u: number, amount: number): Frame {
  const k = amount
  const p = u * Math.PI * 2
  const s = Math.sin(p)
  const pose: Pose = {}
  const legs = (
    thigh: (side: 1 | -1) => number,
    knee: (side: 1 | -1) => number,
    foot: (side: 1 | -1) => number,
  ) => {
    for (const [role, side] of [
      ['L', 1],
      ['R', -1],
    ] as const) {
      const t = thigh(side)
      const n = knee(side)
      pose[`thigh${role}`] = about(X, t)
      pose[`shin${role}`] = about(X, n)
      pose[`foot${role}`] = about(X, foot(side) - t - n)
    }
  }
  const arms = (swing: (side: 1 | -1) => number, flex: (side: 1 | -1) => number) => {
    for (const [role, side] of [
      ['L', 1],
      ['R', -1],
    ] as const) {
      pose[`upperArm${role}`] = about(X, swing(side))
      pose[`forearm${role}`] = about(X, -flex(side))
    }
  }
  /**
   * Passada guiada pelos pés: no apoio o pé fica no chão e vai para trás em velocidade constante
   * (o corpo é que anda); no balanço sobe e volta para a frente. Esquerdo em u = 0, direito em
   * meio ciclo. O calcanhar sai do chão no fim do apoio, girando na ponta.
   */
  const gait = (
    stance: number,
    stride: number,
    height: number,
    swing: ReadonlyArray<readonly [number, number]>,
  ) => {
    const feet = {} as Record<'L' | 'R', Foot>
    for (const [role, shift] of [
      ['L', 0],
      ['R', 0.5],
    ] as const) {
      const phase = (u + shift) % 1
      if (phase < stance) {
        const t = phase / stance
        feet[role] = {
          offset: [0, 0, stride * (0.5 - t)],
          pitch: t > 0.8 ? swing[0]![1] * k * ((t - 0.8) / 0.2) ** 2 : 0,
          ground: true,
        }
      } else {
        const w = (phase - stance) / (1 - stance)
        feet[role] = {
          offset: [0, height * Math.sin(Math.PI * w), stride * (w * w * (3 - 2 * w) - 0.5)],
          pitch: k * curve(swing, w),
          ground: false,
        }
      }
    }
    return feet
  }
  if (kind === 'walk') {
    // Perna esquerda pisa em u = 0; o braço do mesmo lado vai para trás quando ela vai à frente.
    const STANCE = 0.6
    const stride = 0.7 * k
    const feet = gait(STANCE, stride, 0.12 * k, [
      [0, 25],
      [0.4, 5],
      [0.85, -12],
      [1, 0],
    ])
    // Meio do apoio de um pé só (u = 0,3 e 0,8): o quadril passa por cima, mais alto.
    const step = (2 * u) % 1
    arms(
      (side) => 20 * k * side * s,
      (side) => (14 + 10 * Math.max(0, -side * s)) * k,
    )
    pose.hips = about(Y, -5 * k * s)
    pose.spine = about(X, 4 * k)
    pose.chest = chain(about(Y, 9 * k * s), about(X, 2 * k))
    pose.neck = about(Y, -3 * k * s)
    pose.head = chain(about(Y, -2 * k * s), about(X, -4 * k))
    return {
      pose,
      air: -0.015 * k + 0.012 * k * Math.cos(2 * Math.PI * (step - 0.6)),
      sway: 0.015 * k * Math.cos(2 * Math.PI * (u - 0.3)),
      feet,
      travel: stride / STANCE,
    }
  }
  if (kind === 'run') {
    // Apoio curto: entre um pé e outro o corpo voa.
    const STANCE = 0.35
    const stride = 0.9 * k
    const feet = gait(STANCE, stride, 0.3 * k, [
      [0, 35],
      [0.35, 40],
      [0.8, -10],
      [1, 0],
    ])
    const step = (2 * u) % 1
    const press = STANCE * 2
    arms(
      (side) => 40 * k * side * s,
      (side) => (75 + 15 * Math.max(0, -side * s)) * k,
    )
    pose.hips = about(Y, -8 * k * s)
    pose.spine = about(X, 10 * k)
    pose.chest = chain(about(Y, 12 * k * s), about(X, 4 * k))
    pose.neck = about(X, -6 * k)
    pose.head = chain(about(Y, -4 * k * s), about(X, -6 * k))
    // Dois passos por ciclo: amortece no apoio e sobe no voo.
    const air =
      step < press
        ? -0.04 * k * Math.sin((Math.PI * step) / press)
        : 0.05 * k * Math.sin((Math.PI * (step - press)) / (1 - press))
    return { pose, air: air - 0.02 * k, sway: 0, feet, travel: stride / STANCE }
  }
  if (kind === 'idle') {
    // Respira devagar e transfere um pouco o peso de um lado para o outro.
    arms(
      (side) => 4 * k * side * Math.sin(p + Math.PI / 3),
      () => 12 * k,
    )
    pose.hips = about(Z, 3 * k * s)
    pose.spine = chain(about(Z, -2 * k * s), about(X, 2 * k * Math.sin(p - Math.PI / 4)))
    pose.chest = about(X, 4 * k * Math.sin(p - Math.PI / 2))
    pose.neck = about(Z, -1.5 * k * s)
    pose.head = chain(about(Y, 8 * k * Math.sin(p / 2) ** 3), about(X, -2 * k * s))
    // Os pés não saem do lugar: o quadril desce um pouco (joelhos soltos) e respira junto.
    return {
      pose,
      air: -k * (0.012 + 0.004 * (1 - Math.cos(p))),
      sway: 0.025 * k * s,
      feet: STANDING,
    }
  }
  // Pular no lugar: agacha, empurra, voa, cai amortecendo e volta à pose de pé.
  const crouch = curve(
    [
      [0, 0],
      [0.25, 1],
      [0.35, -0.3],
      [0.5, 0.2],
      [0.65, 0],
      [0.78, 0.8],
      [1, 0],
    ],
    u,
  )
  const tuck = curve(
    [
      [0, 0],
      [0.35, 0],
      [0.5, 1],
      [0.65, 0],
      [1, 0],
    ],
    u,
  )
  const reach = curve(
    [
      [0, 0],
      [0.25, -1],
      [0.4, 1],
      [0.6, 0.6],
      [0.78, -0.3],
      [1, 0],
    ],
    u,
  )
  const bend = Math.max(0, crouch)
  legs(
    () => k * (-40 * bend - 35 * tuck),
    () => k * (75 * bend + 50 * tuck),
    () => k * (crouch < 0 ? -35 * crouch : 0) + k * 10 * tuck,
  )
  // Braços: vão para trás ao agachar e sobem para frente no impulso.
  arms(
    () => k * 45 * Math.min(0, reach) - k * 120 * Math.max(0, reach),
    () => k * (15 + 20 * bend),
  )
  pose.spine = about(X, k * 18 * bend)
  pose.chest = about(X, k * 10 * bend)
  pose.head = about(X, -k * 12 * bend)
  const air = u > 0.35 && u < 0.65 ? 0.45 * k * Math.sin((Math.PI * (u - 0.35)) / 0.3) : 0
  return { pose, air, sway: 0 }
}

// ---- Clipe ---------------------------------------------------------------------------------
function rigFor(document: MoldaSceneDocument, ids: readonly string[]) {
  const rigs = findCharacterRigs(document)
  v.requireScene(rigs.length > 0, 'rig', 'Monte o esqueleto de personagem antes.')
  if (rigs.length === 1) return rigs[0]!
  const index = indexSceneDocument(document)
  const chosen = new Set<string>()
  for (const id of ids)
    for (let n: string | null = id; n; n = index.scene.nodes.get(n)?.parentId ?? null) chosen.add(n)
  const owners = new Map<string, CharacterRig>()
  for (const rig of rigs) for (const joint of rig.joints.values()) owners.set(joint, rig)
  for (const skin of document.skins ?? [])
    if (chosen.has(skin.nodeId))
      for (const joint of skin.joints) {
        const rig = owners.get(joint.nodeId)
        if (rig) return rig
      }
  for (const rig of rigs) if ([...rig.joints.values()].some((id) => chosen.has(id))) return rig
  v.requireScene(false, 'rig', 'Escolha qual personagem vai se mexer.')
  return rigs[0]!
}

/**
 * Ângulo do braço caído (graus a partir da vertical) para o cotovelo passar do lado do tronco:
 * mede a meia-largura do tronco e a grossura do braço nos pontos que cada osso move mais. Sem
 * pesos para medir, vale o ângulo de sempre (12°).
 */
function armClearance(
  document: MoldaSceneDocument,
  rig: CharacterRig,
  index: ReturnType<typeof indexSceneDocument>,
  inCanonical: (p: Vec3) => Vec3,
): Record<'L' | 'R', number> {
  const DEFAULT = 12
  const roleOf = new Map([...rig.joints].map(([role, id]) => [id, role]))
  const position = (role: CharacterRole) =>
    transformPoint(index.scene.worldMatrices.get(rig.joints.get(role)!)!, [0, 0, 0])
  const hips = position('hips')
  const local = (p: Vec3) => inCanonical(sub(p, hips))
  const torso = { L: 0, R: 0 }
  const radius = { L: 0, R: 0 }
  const arm = (['L', 'R'] as const).map((side) => ({
    side,
    from: local(position(`upperArm${side}`)),
    to: local(position(`hand${side}`)),
  }))
  for (const skin of document.skins ?? []) {
    const node = index.scene.nodes.get(skin.nodeId)
    const geometry = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : undefined
    if (!geometry) continue
    const world = index.scene.worldMatrices.get(skin.nodeId)!
    const vertices = sceneGeometryMesh(geometry).vertices
    for (const [vertexId, influences] of Object.entries(skin.weights)) {
      const point = vertices[vertexId]
      if (!point || !influences.length) continue
      const strongest = influences.reduce((a, b) => (b.weight > a.weight ? b : a))
      const role = roleOf.get(strongest.jointId)
      if (!role) continue
      const p = local(transformPoint(world, point))
      if (role === 'hips' || role === 'spine' || role === 'chest') {
        torso.L = Math.max(torso.L, p[0])
        torso.R = Math.max(torso.R, -p[0])
        continue
      }
      for (const { side, from, to } of arm)
        if (role === `upperArm${side}` || role === `forearm${side}`) {
          const along = sub(to, from)
          const t = Math.max(0, Math.min(1, dot(sub(p, from), along) / (dot(along, along) || 1)))
          radius[side] = Math.max(radius[side], length(sub(sub(p, from), scale(along, t))))
        }
    }
  }
  const result = { L: DEFAULT, R: DEFAULT }
  for (const { side, from, to } of arm) {
    if (!torso[side] || !radius[side]) continue
    // No meio do braço (o cotovelo), o centro do braço precisa estar a um raio da beira do tronco.
    const half = 0.5 * length(sub(to, from))
    const outside = side === 'L' ? from[0] : -from[0]
    const need = (torso[side] + radius[side] - outside) / (half || 1)
    const angle = Math.asin(Math.max(-1, Math.min(1, need))) / DEG
    result[side] = Math.max(DEFAULT, Math.min(45, angle))
  }
  return result
}

/**
 * O espaço de um esqueleto de personagem: de onde vêm os giros (eixos do personagem), o braço caído
 * de repouso e o tamanho da perna. Serve para criar um movimento e para ler um movimento de volta.
 */
function rigSpace(document: MoldaSceneDocument, rig: CharacterRig, arms: number) {
  const index = indexSceneDocument(document)
  const world = (id: string) => index.scene.worldMatrices.get(id)!
  const position = (id: string) => transformPoint(world(id), [0, 0, 0])
  const joint = (role: CharacterRole) => rig.joints.get(role)!
  // Canônico → mundo: colunas esquerda, cima, frente.
  const canonical = rotationOf([...rig.left, 0, ...rig.up, 0, ...rig.front, 0, 0, 0, 0, 1])
  const toCanonical = conjugate(canonical)
  const rest = (role: CharacterRole) => mul(toCanonical, rotationOf(world(joint(role))))
  const inCanonical = (p: Vec3) => rotate(toCanonical, p)
  // Braços caídos: o giro que leva o braço da pose modelada (em T, por exemplo) para baixo, aberto
  // o bastante para não atravessar o tronco (como o Arm-Space do Mixamo), mais o ajuste pedido.
  const clearance = armClearance(document, rig, index, inCanonical)
  const hang = new Map<'L' | 'R', Quaternion>()
  for (const side of ['L', 'R'] as const) {
    const direction = inCanonical(
      sub(position(joint(`hand${side}`)), position(joint(`upperArm${side}`))),
    )
    const open = Math.max(2, Math.min(60, clearance[side] + arms)) * DEG
    const target: Vec3 = [(side === 'L' ? 1 : -1) * Math.sin(open), -Math.cos(open), 0]
    hang.set(side, arc(direction, target))
  }
  /** Giros relativos (presos ao osso de cima) → trilha local de cada osso. */
  const local = (pose: Pose) => {
    const result = new Map<CharacterRole, Quaternion>()
    for (const [role] of rig.joints) {
      if (role.startsWith('handTip') || role.startsWith('toe') || role === 'headTip') continue
      let turn = pose[role] ?? IDENTITY
      const side = role.endsWith('L') ? 'L' : role.endsWith('R') ? 'R' : null
      if (side && role.startsWith('upperArm')) turn = mul(turn, hang.get(side)!)
      // Abaixo do braço, o eixo X de dobra é o do braço já caído.
      if (side && (role.startsWith('forearm') || role.startsWith('hand'))) {
        const b = hang.get(side)!
        turn = chain(conjugate(b), turn, b)
      }
      const r = rest(role)
      result.set(role, unit(chain(conjugate(r), turn, r)))
    }
    return result
  }
  const legLength =
    length(sub(position(joint('thighL')), position(joint('shinL')))) +
    length(sub(position(joint('shinL')), position(joint('footL'))))
  return { index, world, position, joint, rest, toCanonical, inCanonical, hang, local, legLength }
}

/**
 * "Guardar como movimento pronto": lê um movimento do personagem (feito à mão, por exemplo) como
 * dados que servem em qualquer outro esqueleto. Lê o que a pessoa vê: a pose de cada osso no mundo
 * em cada quadro, comparada com o repouso, e o quadril em comprimentos de perna.
 */
export function characterMotionFromClip(
  document: MoldaSceneDocument,
  clipId: string,
  ids: readonly string[],
): CharacterMotionData {
  const clip = document.animations?.find((item) => item.id === clipId)
  v.requireScene(clip, 'clip', 'Esse movimento não existe mais.')
  const rig = rigFor(document, ids)
  const space = rigSpace(document, rig, 0)
  const { joint, toCanonical, hang, legLength } = space
  const restWorld = (role: CharacterRole) => rotationOf(space.world(joint(role)))
  const sampler = prepareSceneAnimation(document, clip.id)
  const count = Math.max(8, Math.min(60, Math.round(clip.duration * 24)))
  const total = clip.loop ? count : count + 1
  const hipsRest = space.position(joint('hips'))
  const keys: CharacterMotionKey[] = []
  for (let i = 0; i < total; i++) {
    const at = i / count
    const matrices = sampler.sample(at * clip.duration, false).worldMatrices
    // Giro de cada osso em relação ao repouso, nos eixos do personagem.
    const global = new Map<CharacterRole, Quaternion>()
    for (const role of CHARACTER_JOINT_ROLES) {
      const now = rotationOf(matrices.get(joint(role))!)
      global.set(
        role,
        unit(chain(toCanonical, now, conjugate(restWorld(role)), conjugate(toCanonical))),
      )
    }
    const pose: CharacterMotionKey['pose'] = {}
    for (const role of CHARACTER_JOINT_ROLES) {
      const parent = CHARACTER_PARENT.get(role)
      let turn = parent ? mul(conjugate(global.get(parent)!), global.get(role)!) : global.get(role)!
      const side = role.endsWith('L') ? 'L' : role.endsWith('R') ? 'R' : null
      // Desfaz o braço caído de repouso: o movimento guardado não depende da pose modelada.
      if (side && role.startsWith('upperArm')) turn = mul(turn, conjugate(hang.get(side)!))
      if (side && (role.startsWith('forearm') || role.startsWith('hand'))) {
        const b = hang.get(side)!
        turn = chain(b, turn, conjugate(b))
      }
      const value = unit(turn)
      if (Math.abs(value[3]) < 0.99999)
        pose[role] = value.map((n) => Math.round(n * 1e6) / 1e6) as Quaternion
    }
    const hips = rotate(
      toCanonical,
      sub(transformPoint(matrices.get(joint('hips'))!, [0, 0, 0]), hipsRest),
    )
    const round = (n: number) => Math.round((n / legLength) * 1e5) / 1e5
    keys.push({ at, pose, sway: round(hips[0]), air: round(hips[1]), forward: round(hips[2]) })
  }
  return {
    name: clip.name,
    duration: clip.duration,
    loop: clip.loop,
    steps: count,
    feet: 'livres',
    contact: false,
    keys,
  }
}

/** O esqueleto de personagem da escolha (o único, ou o dono das peças escolhidas). */
export function characterRigFor(document: MoldaSceneDocument, ids: readonly string[]) {
  return rigFor(document, ids)
}

/**
 * O movimento `name` de um esqueleto: o clipe com esse nome (ou "nome 2", "nome 3"…, como os nomes
 * repetidos ficam) que mexe os ossos dele. Dois personagens podem ter cada um o seu "Andando".
 */
export function isCharacterMotionClip(
  clip: SceneAnimationClip,
  name: string,
  joints: ReadonlySet<string>,
) {
  const sameName =
    clip.name === name ||
    (clip.name.startsWith(`${name} `) && /^\d+$/.test(clip.name.slice(name.length + 1)))
  return sameName && clip.tracks.some((track) => joints.has(track.nodeId))
}

/** Existe um esqueleto de personagem para receber movimentos prontos? */
export function hasCharacterRig(document: MoldaSceneDocument) {
  return findCharacterRigs(document).length > 0
}

/**
 * Cria um movimento de personagem editável (trilhas relativas nos ossos). O quadril sobe e desce
 * para o pé mais baixo encostar no chão em cada quadro, medido pela mesma pose que o app desenha.
 */
export function createCharacterMotion(
  document: MoldaSceneDocument,
  ids: readonly string[],
  options: CharacterMotionOptions,
  nextId = newId,
) {
  const row = v.record(options, 'motion', [
    'kind',
    'data',
    'name',
    'duration',
    'amount',
    'replaces',
    'inPlace',
    'arms',
  ])
  const kind = v.choice(row.kind, [...CHARACTER_MOTIONS, 'custom'] as const, 'kind')
  const data =
    kind === 'custom'
      ? readCharacterMotionData(row.data, 'data')
      : kind in CHARACTER_MOTION_DATA
        ? CHARACTER_MOTION_DATA[kind as CharacterMotionDataKind]
        : null
  v.requireScene(
    kind === 'custom' || row.data === undefined,
    'data',
    'Dados só para movimento guardado.',
  )
  const duration = v.number(row.duration, 'duration', 0.1, SCENE_LIMITS.animationSeconds)
  const amount = v.number(
    row.amount,
    'amount',
    CHARACTER_MOTION_AMOUNT.minimum,
    CHARACTER_MOTION_AMOUNT.maximum,
  )
  const name = v.text(v.text(row.name, 'name', 48).trim(), 'name', 48)
  v.requireScene(
    row.inPlace === undefined || typeof row.inPlace === 'boolean',
    'inPlace',
    'Escolha se o movimento fica no lugar.',
  )
  const inPlace = row.inPlace !== false
  const arms =
    row.arms === undefined
      ? 0
      : v.number(row.arms, 'arms', CHARACTER_MOTION_ARMS.minimum, CHARACTER_MOTION_ARMS.maximum)
  const rig = rigFor(document, ids)
  const { world, position, joint, inCanonical, local, legLength } = rigSpace(document, rig, arms)
  const steps = data ? data.steps : GENERATED_INFO[kind as GeneratedMotion].steps
  const loop = data ? data.loop : GENERATED_INFO[kind as GeneratedMotion].loop
  const times = Array.from({ length: steps + 1 }, (_, i) => (duration * i) / steps)
  // Repetindo, o último quadro é o primeiro (emenda); uma vez só, termina na última pose.
  const frames = times.map((_, i) => {
    const u = loop && i === steps ? 0 : i / steps
    return data ? frameFromData(data, u, amount) : frame(kind as GeneratedMotion, u, amount)
  })
  // Pés guiados: coxa e joelho levam cada tornozelo ao alvo, e o pé fica na inclinação pedida.
  const hipsAt = position(joint('hips'))
  const at = (role: CharacterRole) => inCanonical(sub(position(joint(role)), hipsAt))
  const legs = (['L', 'R'] as const).map((side) => {
    const hip = at(`thigh${side}`)
    const knee = at(`shin${side}`)
    const ankle = at(`foot${side}`)
    const toe = at(`toe${side}`)
    const thigh = sub(knee, hip)
    const shin = sub(ankle, knee)
    const span = (bend: number) => length(add(thigh, rotate(about(X, bend), shin)))
    const foot = Math.hypot(toe[2] - ankle[2], toe[0] - ankle[0])
    return { side, hip, ankle, thigh, shin, span, reach: span(0), foot }
  })
  for (const f of frames) {
    const feet = f.feet
    if (!feet) continue
    const hips = f.pose.hips ?? IDENTITY
    // O pé girando na ponta (ou no calcanhar) levanta o tornozelo.
    const target = (leg: (typeof legs)[number]) => {
      const foot = feet[leg.side]
      const tilt = foot.pitch * DEG
      const raise = tilt > 0 ? leg.foot * Math.sin(tilt) : 0.25 * leg.foot * Math.sin(-tilt)
      return add(leg.ankle, add(scale(foot.offset, legLength), [0, raise, 0]))
    }
    // O quadril fica na altura pedida, a não ser que um pé apoiado não alcance: aí ele desce.
    let height = f.air * legLength
    for (const leg of legs) {
      if (!feet[leg.side].ground) continue
      const d = sub(target(leg), add([f.sway * legLength, 0, 0], rotate(hips, leg.hip)))
      const room = (0.995 * leg.reach) ** 2 - d[0] ** 2 - d[2] ** 2
      height = Math.min(height, d[1] + Math.sqrt(Math.max(0, room)))
    }
    f.air = height / legLength
    const moved: Vec3 = [f.sway * legLength, height, 0]
    for (const leg of legs) {
      const reach = sub(target(leg), add(moved, rotate(hips, leg.hip)))
      // O joelho dobra até a perna caber na distância (dobra só para trás, como o de verdade).
      let low = 0
      let high = 150
      const fits = leg.span(0) > length(reach)
      if (fits)
        for (let i = 0; i < 40; i++) {
          const mid = (low + high) / 2
          if (leg.span(mid) > length(reach)) low = mid
          else high = mid
        }
      const bend = fits ? (low + high) / 2 : 0
      const turn = arc(add(leg.thigh, rotate(about(X, bend), leg.shin)), reach)
      f.pose[`thigh${leg.side}`] = mul(conjugate(hips), turn)
      f.pose[`shin${leg.side}`] = about(X, bend)
      f.pose[`foot${leg.side}`] = mul(
        conjugate(mul(turn, about(X, bend))),
        about(X, feet[leg.side].pitch),
      )
    }
  }
  const rotations = frames.map((f) => local(f.pose))
  const tracks: SceneAnimationTrack[] = [...rotations[0]!.keys()].map((role) => ({
    nodeId: joint(role),
    channel: 'rotation',
    keys: times.map((time, i) => ({
      time,
      value: rotations[i]!.get(role)!,
      interpolation: 'linear' as const,
    })),
  }))
  // Contato com o chão: a sola (calcanhar e ponta) do pé mais baixo fica na altura de repouso.
  const soles = (['L', 'R'] as const).flatMap((side) => {
    const ankle = position(joint(`foot${side}`))
    const toe = position(joint(`toe${side}`))
    const footLength = length(sub(toe, ankle))
    const ground = Math.min(dot(toe, rig.up), dot(ankle, rig.up))
    const down = (p: Vec3) => sub(p, scale(rig.up, dot(p, rig.up) - ground))
    const heel = sub(down(ankle), scale(rig.front, 0.25 * footLength))
    const inverse = affineInverse(world(joint(`foot${side}`)))!
    return [heel, down(toe)].map((p) => ({ side, local: transformPoint(inverse, p) }))
  })
  const floor = Math.min(
    ...soles.map(({ side, local: point }) =>
      dot(transformPoint(world(joint(`foot${side}`)), point), rig.up),
    ),
  )
  const draft: SceneAnimationClip = readSceneAnimationClip({
    id: 'motion-draft',
    name: 'draft',
    duration,
    fps: 24,
    loop,
    space: 'local-delta',
    tracks,
  })
  const sampler = prepareSceneAnimationPreview(document, draft)
  const rootWorld = world(rig.rootId)
  const rootInverse = affineInverse(rootWorld)
  v.requireScene(
    rootInverse,
    'rig',
    'O quadril do personagem precisa de um tamanho maior que zero.',
  )
  const lifts = times.map((time, i) => {
    const pose = sampler.sample(i === steps ? 0 : time, false)
    const lowest = Math.min(
      ...soles.map(({ side, local: point }) =>
        dot(transformPoint(pose.worldMatrices.get(joint(`foot${side}`))!, point), rig.up),
      ),
    )
    // Com pés guiados, a altura já é a que as pernas esperam (a cinemática inversa é exata).
    if (frames[i]!.feet || frames[i]!.free) return frames[i]!.air * legLength
    return floor - lowest + frames[i]!.air * legLength
  })
  tracks.push({
    nodeId: rig.rootId,
    channel: 'translation',
    keys: times.map((time, i) => {
      // Fora do "No lugar", o corpo anda o que os pés empurraram: o pé apoiado fica parado.
      const travel = inPlace ? 0 : (frames[i]!.travel ?? 0) * (i / steps) * legLength
      const moved = add(
        add(scale(rig.up, lifts[i]!), scale(rig.left, frames[i]!.sway * legLength)),
        scale(rig.front, travel + (frames[i]!.forward ?? 0) * legLength),
      )
      return {
        time,
        value: transformDirection(rootInverse, moved),
        interpolation: 'linear' as const,
      }
    }),
  })
  const keys = tracks.length * (steps + 1)
  const replaced =
    row.replaces === undefined
      ? -1
      : (document.animations ?? []).findIndex(
          (clip) => clip.id === v.text(row.replaces, 'replaces', 64),
        )
  v.requireScene(row.replaces === undefined || replaced >= 0, 'replaces', COPY_MISSING_CLIP)
  const old = document.animations?.[replaced]
  const current = indexSceneDocument(document)
  const oldKeys = old?.tracks.reduce((sum, track) => sum + track.keys.length, 0) ?? 0
  v.requireScene(
    current.animations.size - (old ? 1 : 0) < SCENE_LIMITS.animationClips &&
      current.animationTrackCount - (old?.tracks.length ?? 0) + tracks.length <=
        SCENE_LIMITS.animationTracks &&
      current.animationKeyCount - oldKeys + keys <= SCENE_LIMITS.animationKeys,
    'motion',
    'Esse movimento ultrapassa o orçamento de animação da criação.',
  )
  if (old) {
    const clip = readSceneAnimationClip({ ...draft, id: old.id, name: old.name, tracks })
    const animations = [...document.animations!]
    animations[replaced] = clip
    return finishSceneCommand({ ...document, animations })
  }
  const taken = new Set((document.animations ?? []).map((clip) => clip.name))
  let unique = name
  for (let copy = 2; taken.has(unique); copy++)
    unique = `${name.slice(0, 48 - ` ${copy}`.length).trimEnd()} ${copy}`
  const clip = readSceneAnimationClip({
    ...draft,
    id: allocateSceneId(document, nextId)(),
    name: unique,
    tracks,
  })
  return finishSceneCommand({ ...document, animations: [...(document.animations ?? []), clip] })
}
