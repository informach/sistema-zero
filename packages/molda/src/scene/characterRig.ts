import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { allocateSceneId, finishSceneCommand, sceneCommandSelection } from './commandContext'
import { convertSceneNodesToMesh } from './commands'
import type { ModelSceneNode, MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneNodeFlags } from './evaluate'
import { affineInverse, affineMultiply, identityMatrix, transformPoint } from './matrix'
import { divideSceneByWorldPlane } from './modelGuides'
import { sceneGeometryMesh } from './parametricGeometry'
import type { SceneSkinInfluence } from './skin'
import { createSceneSkin } from './skinCommands'
import { requireScene, SceneValidationError } from './validation'

/**
 * Esqueleto de personagem: um esqueleto humano padrão (como o do Mixamo ou do Rigify), encaixado
 * por poucos pontos marcados de frente. O papel de cada osso vem da FORMA da hierarquia (quem é
 * filho de quem) e da direção dos ossos, não do nome nem de um campo no arquivo: renomear não
 * quebra, a cópia da galeria continua reconhecida e um esqueleto feito à mão com a mesma forma
 * também serve. Eixos canônicos: X = esquerda do personagem, Y = cima, Z = frente.
 */
export type CharacterSide = 'L' | 'R'
type Limb = 'shoulder' | 'upperArm' | 'forearm' | 'hand' | 'handTip'
type Leg = 'thigh' | 'shin' | 'foot' | 'toe'
export type CharacterRole =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'headTip'
  | `${Limb | Leg}${CharacterSide}`

const SIDES = ['L', 'R'] as const
const NAMES: Record<CharacterRole, string> = {
  hips: 'Quadril',
  spine: 'Barriga',
  chest: 'Peito',
  neck: 'Pescoço',
  head: 'Cabeça',
  headTip: 'Topo da cabeça',
  shoulderL: 'Ombro esquerdo',
  upperArmL: 'Braço esquerdo',
  forearmL: 'Antebraço esquerdo',
  handL: 'Mão esquerda',
  handTipL: 'Ponta da mão esquerda',
  thighL: 'Coxa esquerda',
  shinL: 'Canela esquerda',
  footL: 'Pé esquerdo',
  toeL: 'Ponta do pé esquerdo',
  shoulderR: 'Ombro direito',
  upperArmR: 'Braço direito',
  forearmR: 'Antebraço direito',
  handR: 'Mão direita',
  handTipR: 'Ponta da mão direita',
  thighR: 'Coxa direita',
  shinR: 'Canela direita',
  footR: 'Pé direito',
  toeR: 'Ponta do pé direito',
}
/** Pai de cada papel; a ordem é a de criação (pai antes do filho). */
const PARENT: ReadonlyArray<readonly [CharacterRole, CharacterRole | null]> = [
  ['hips', null],
  ['spine', 'hips'],
  ['chest', 'spine'],
  ['neck', 'chest'],
  ['head', 'neck'],
  ['headTip', 'head'],
  ...SIDES.flatMap((s) => [
    [`shoulder${s}`, 'chest'] as const,
    [`upperArm${s}`, `shoulder${s}`] as const,
    [`forearm${s}`, `upperArm${s}`] as const,
    [`hand${s}`, `forearm${s}`] as const,
    [`handTip${s}`, `hand${s}`] as const,
    [`thigh${s}`, 'hips'] as const,
    [`shin${s}`, `thigh${s}`] as const,
    [`foot${s}`, `shin${s}`] as const,
    [`toe${s}`, `foot${s}`] as const,
  ]),
]
export const CHARACTER_ROLES: readonly CharacterRole[] = PARENT.map(([role]) => role)
export const CHARACTER_PARENT = new Map(PARENT)
const TIPS = new Set<CharacterRole>(['headTip', 'handTipL', 'handTipR', 'toeL', 'toeR'])
/** Os 19 ossos que dobram; as pontas só marcam até onde vai o último osso. */
export const CHARACTER_JOINT_ROLES = CHARACTER_ROLES.filter((role) => !TIPS.has(role))

/** Pontos marcados de frente. Com espelho, um lado só (5); sem espelho, os dois (8). */
export const CHARACTER_MARKS = ['chin', 'groin', 'elbow', 'wrist', 'knee'] as const
export type CharacterMark = (typeof CHARACTER_MARKS)[number]
export function characterMarkSequence(mirror: boolean): CharacterMark[] {
  return mirror ? [...CHARACTER_MARKS] : [...CHARACTER_MARKS, 'elbow', 'wrist', 'knee']
}

type Layout = Record<CharacterRole, Vec3>

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n]
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalize = (a: Vec3): Vec3 => scale(a, 1 / (length(a) || 1))

interface Target {
  meshIds: string[]
  /** Triângulos no mundo, para medir a profundidade do corpo. */
  triangles: Array<[Vec3, Vec3, Vec3]>
  vertices: Vec3[]
  min: Vec3
  max: Vec3
  parentId: string | null
  /** Quantas dessas peças já têm ossos (que a montagem troca pelos do personagem). */
  replaced: number
}

/** As peças que o esqueleto vai mover: visíveis e destravadas. Ossos antigos são trocados. */
export function characterRigTarget(source: MoldaSceneDocument, ids: readonly string[]): Target {
  const selected = sceneCommandSelection(
    source,
    ids.length ? ids : source.nodes.filter((node) => node.parentId === null).map((node) => node.id),
  )
  const flags = evaluateSceneNodeFlags(selected.index.scene)
  const meshIds = [...selected.covered].filter((id) => {
    const node = selected.index.scene.nodes.get(id)
    const flag = flags.get(id)
    return node?.kind === 'mesh' && !flag?.hidden && !flag?.locked
  })
  requireScene(meshIds.length > 0, 'nodes', 'Escolha o personagem: peças visíveis e destravadas.')
  const replaced = meshIds.filter((id) => selected.index.skinsByNode.has(id)).length
  const triangles: Target['triangles'] = []
  const vertices: Vec3[] = []
  for (const id of meshIds) {
    const node = selected.index.scene.nodes.get(id)
    const geometry = node?.kind === 'mesh' ? selected.index.geometries.get(node.geometryId) : null
    if (!geometry) continue
    const world = selected.index.scene.worldMatrices.get(id)!
    const mesh = sceneGeometryMesh(geometry)
    const points = new Map(
      Object.entries(mesh.vertices).map(([vertexId, point]) => [
        vertexId,
        transformPoint(world, point),
      ]),
    )
    vertices.push(...points.values())
    for (const face of Object.values(mesh.faces)) {
      const corners = face.corners.map((corner) => points.get(corner.vertexId)!)
      for (let i = 1; i + 1 < corners.length; i++)
        triangles.push([corners[0]!, corners[i]!, corners[i + 1]!])
    }
  }
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const point of vertices)
    for (const axis of [0, 1, 2] as const) {
      min[axis] = Math.min(min[axis], point[axis])
      max[axis] = Math.max(max[axis], point[axis])
    }
  // O esqueleto mora junto do personagem: dentro do grupo escolhido ou ao lado das peças.
  const roots = [...selected.roots].map((id) => selected.index.scene.nodes.get(id)!)
  const parents = new Set(roots.map((node) => node.parentId))
  const parentId =
    roots.length === 1 && roots[0]!.kind === 'group'
      ? roots[0]!.id
      : parents.size === 1
        ? roots[0]!.parentId
        : null
  return { meshIds, triangles, vertices, min, max, parentId, replaced }
}

/** Meio do corpo na profundidade: a reta de frente para trás atravessa a peça em dois pontos. */
function bodyDepth(target: Target, x: number, y: number, fallback: number) {
  const hits: number[] = []
  for (const [a, b, c] of target.triangles) {
    // Triângulo projetado no plano XY; coordenadas baricêntricas do ponto (x, y).
    const d = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
    if (Math.abs(d) < 1e-12) continue
    const u = ((x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1])) / d
    const v = ((b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1])) / d
    if (u < 0 || v < 0 || u + v > 1) continue
    hits.push(a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2]))
  }
  return hits.length >= 2 ? (Math.min(...hits) + Math.max(...hits)) / 2 : fallback
}

/**
 * Posição de cada osso (no mundo) a partir dos pontos marcados de frente. O resto vem das
 * proporções do corpo: a altura total, a linha queixo-virilha e o comprimento do braço.
 */
export function layoutCharacterSkeleton(
  source: MoldaSceneDocument,
  ids: readonly string[],
  points: readonly Vec3[],
  mirror: boolean,
): Layout {
  const target = characterRigTarget(source, ids)
  const sequence = characterMarkSequence(mirror)
  requireScene(points.length === sequence.length, 'points', 'Marque todos os pontos pedidos.')
  const [chin, groin, elbowA, wristA, kneeA] = points as [Vec3, Vec3, Vec3, Vec3, Vec3]
  const span = chin[1] - groin[1]
  requireScene(span > 0, 'points', 'O queixo precisa ficar acima da virilha.')
  const center = groin[0]
  const flip = (point: Vec3): Vec3 => [2 * center - point[0], point[1], point[2]]
  const elbowB = mirror ? flip(elbowA) : points[5]!
  const wristB = mirror ? flip(wristA) : points[6]!
  const kneeB = mirror ? flip(kneeA) : points[7]!
  requireScene(
    kneeA[1] < groin[1] && kneeB[1] < groin[1],
    'points',
    'Os joelhos precisam ficar abaixo da virilha.',
  )
  // Olhando de frente, a esquerda do personagem fica do lado +X da tela.
  const sideOf = (point: Vec3): CharacterSide => (point[0] >= center ? 'L' : 'R')
  requireScene(
    sideOf(elbowA) !== sideOf(elbowB) && sideOf(kneeA) !== sideOf(kneeB),
    'points',
    'Marque um braço e uma perna de cada lado.',
  )
  const arms = { [sideOf(elbowA)]: [elbowA, wristA], [sideOf(elbowB)]: [elbowB, wristB] } as Record<
    CharacterSide,
    [Vec3, Vec3]
  >
  const knees = { [sideOf(kneeA)]: kneeA, [sideOf(kneeB)]: kneeB } as Record<CharacterSide, Vec3>
  const floor = target.min[1]
  const top = Math.max(target.max[1], chin[1])
  const mid = (target.min[2] + target.max[2]) / 2
  const at = (x: number, y: number): Vec3 => [x, y, bodyDepth(target, x, y, mid)]
  const layout = {} as Layout
  layout.hips = at(center, groin[1] + 0.12 * span)
  layout.spine = at(center, groin[1] + 0.35 * span)
  layout.chest = at(center, groin[1] + 0.6 * span)
  layout.neck = at(center, chin[1] - 0.14 * span)
  layout.head = at(center, chin[1] - 0.03 * span)
  layout.headTip = [center, top, layout.head[2]]
  for (const side of SIDES) {
    const [elbow, wrist] = arms[side]
    const forearm = sub(wrist, elbow)
    requireScene(length(forearm) > 0, 'points', 'Marque o pulso longe do cotovelo.')
    // O braço tem mais ou menos o tamanho do antebraço; o ombro não passa do pescoço.
    let shoulder = sub(elbow, forearm)
    shoulder = [
      center +
        Math.sign(elbow[0] - center) *
          Math.min(Math.abs(shoulder[0] - center), Math.abs(elbow[0] - center)),
      Math.min(shoulder[1], layout.neck[1]),
      shoulder[2],
    ]
    layout[`upperArm${side}`] = at(shoulder[0], shoulder[1])
    layout[`shoulder${side}`] = at(
      center + 0.35 * (shoulder[0] - center),
      (layout.neck[1] + layout.chest[1]) / 2,
    )
    layout[`forearm${side}`] = at(elbow[0], elbow[1])
    layout[`hand${side}`] = at(wrist[0], wrist[1])
    layout[`handTip${side}`] = add(layout[`hand${side}`], scale(forearm, 0.4))
    const knee = knees[side]
    const kneePoint = at(knee[0], knee[1])
    layout[`thigh${side}`] = at(center + 0.9 * (knee[0] - center), groin[1])
    layout[`shin${side}`] = kneePoint
    const ankleY = floor + 0.15 * (knee[1] - floor)
    const ankle: Vec3 = [knee[0], ankleY, kneePoint[2]]
    layout[`foot${side}`] = ankle
    // A ponta do pé vai até a frente da peça na altura do pé, do lado dessa perna.
    const width = Math.abs(knee[0] - center) || 1e-3
    let toe = ankle[2] + 0.5 * (knee[1] - ankleY)
    let found = false
    for (const point of target.vertices)
      if (point[1] <= ankleY && Math.abs(point[0] - knee[0]) <= width) {
        toe = found ? Math.max(toe, point[2]) : point[2]
        found = true
      }
    layout[`toe${side}`] = [
      knee[0],
      floor + 0.02 * (knee[1] - floor),
      Math.max(toe, ankle[2] + 1e-3),
    ]
  }
  return layout
}

/** Segmentos para desenhar a prévia do esqueleto. */
export function characterSkeletonSegments(layout: Layout) {
  return PARENT.flatMap(([role, parent]) =>
    parent ? [[layout[parent], layout[role]] as const] : [],
  )
}

const smooth = (t: number) => {
  const n = Math.max(0, Math.min(1, t))
  return n * n * (3 - 2 * n)
}

/**
 * Forças do esqueleto de personagem: cada ponto segue o osso mais perto (o trecho entre a junta e
 * a próxima) e só mistura perto das juntas, metade-metade em cima da dobra. A sugestão genérica
 * mistura ao longo do osso inteiro, o que faz o joelho puxar o meio da coxa.
 */
export function characterSkinWeights(
  positions: ReadonlyArray<readonly [string, Vec3]>,
  joints: ReadonlyMap<CharacterRole, { id: string; position: Vec3 }>,
) {
  const BAND = 0.3
  const segments = PARENT.flatMap(([role, parent]) => {
    if (!parent) return []
    const from = joints.get(parent)!.position
    const to = joints.get(role)!.position
    const delta = sub(to, from)
    const size = length(delta)
    if (!(size > 0)) return []
    return [{ owner: parent, child: TIPS.has(role) ? null : role, from, delta, size }]
  })
  const weights: Record<string, SceneSkinInfluence[]> = {}
  for (const [vertexId, point] of positions) {
    let best = segments[0]!
    let bestDistance = Infinity
    let bestT = 0
    for (const segment of segments) {
      const offset = sub(point, segment.from)
      const t = Math.max(0, Math.min(1, dot(offset, segment.delta) / segment.size ** 2))
      const distance = length(sub(offset, scale(segment.delta, t)))
      if (distance < bestDistance - 1e-12) {
        best = segment
        bestDistance = distance
        bestT = t
      }
    }
    const mix = new Map<CharacterRole, number>([[best.owner, 1]])
    const parent = CHARACTER_PARENT.get(best.owner)
    if (best.child && bestT > 1 - BAND) {
      const share = 0.5 * smooth((bestT - (1 - BAND)) / BAND)
      mix.set(best.owner, 1 - share)
      mix.set(best.child, share)
    } else if (parent && bestT < BAND) {
      const share = 0.5 * (1 - smooth(bestT / BAND))
      mix.set(best.owner, 1 - share)
      mix.set(parent, share)
    }
    weights[vertexId] = [...mix]
      .filter(([, weight]) => Math.fround(weight) > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([role, weight]) => ({ jointId: joints.get(role)!.id, weight }))
    const total = weights[vertexId]!.reduce((sum, row) => sum + row.weight, 0)
    for (const row of weights[vertexId]!) row.weight /= total
  }
  return weights
}

/** Remover ossos do modelo: as peças voltam a ser peças soltas, sem vínculo nem movimentos de osso. */
export function removeCharacterBones(source: MoldaSceneDocument, ids: readonly string[]) {
  const target = characterRigTarget(source, ids)
  requireScene(target.replaced > 0, 'skins', 'Estas peças não têm ossos para remover.')
  return removeOldBones(source, target.meshIds)
}

/**
 * Tira os ossos antigos das peças do personagem: o vínculo de cada peça, os ossos que ninguém
 * mais usa (nunca uma peça nem o que está pendurado nela) e os movimentos que ficaram vazios.
 */
function removeOldBones(source: MoldaSceneDocument, meshIds: readonly string[]) {
  const chosen = new Set(meshIds)
  const removed = (source.skins ?? []).filter((skin) => chosen.has(skin.nodeId))
  if (!removed.length) return source
  const kept = (source.skins ?? []).filter((skin) => !chosen.has(skin.nodeId))
  const stillUsed = new Set(kept.flatMap((skin) => skin.joints.map((joint) => joint.nodeId)))
  const children = new Map<string, string[]>()
  for (const node of source.nodes)
    if (node.parentId)
      children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id])
  const kind = new Map(source.nodes.map((node) => [node.id, node.kind]))
  const free = (id: string): boolean =>
    kind.get(id) !== 'mesh' && !stillUsed.has(id) && (children.get(id) ?? []).every(free)
  const candidates = new Set(removed.flatMap((skin) => skin.joints.map((joint) => joint.nodeId)))
  const parent = new Map(source.nodes.map((node) => [node.id, node.parentId]))
  const doomed = new Set<string>()
  for (const id of candidates) if (free(id)) doomed.add(id)
  // Só os de cima de cada galho: apagar um osso leva junto o que está abaixo dele.
  const roots = [...doomed].filter((id) => {
    for (let up = parent.get(id); up; up = parent.get(up)) if (doomed.has(up)) return false
    return true
  })
  const gone = new Set<string>()
  const collect = (id: string) => {
    gone.add(id)
    for (const child of children.get(id) ?? []) collect(child)
  }
  for (const id of roots) collect(id)
  return finishSceneCommand({
    ...source,
    nodes: source.nodes.filter((node) => !gone.has(node.id)),
    skins: kept,
    ...(source.animations === undefined
      ? {}
      : {
          animations: source.animations.flatMap((clip) => {
            // Trilhas dos ossos antigos saem todas, até as de um osso que fica segurando uma peça.
            const tracks = clip.tracks.filter(
              (track) => !gone.has(track.nodeId) && !candidates.has(track.nodeId),
            )
            if (tracks.length === clip.tracks.length) return [clip]
            return tracks.length ? [{ ...clip, tracks }] : []
          }),
        }),
  })
}

/** Juntas que ganham um corte na peça para a dobra ter pontos (um cubo só tem os 8 cantos). */
const DIVIDED: readonly CharacterRole[] = [
  'spine',
  'chest',
  'neck',
  ...SIDES.flatMap(
    (s) => [`upperArm${s}`, `forearm${s}`, `hand${s}`, `shin${s}`, `foot${s}`] as const,
  ),
  ...SIDES.map((s) => `thigh${s}` as const),
]

/**
 * Monta o esqueleto num passo só: converte as formas em malha, corta as peças nas juntas, cria os
 * ossos e liga cada peça com as forças do esqueleto.
 */
export function buildCharacterRig(
  source: MoldaSceneDocument,
  ids: readonly string[],
  layout: Layout,
  nextId: () => string = newId,
) {
  const target = characterRigTarget(source, ids)
  let document = convertSceneNodesToMesh(
    removeOldBones(source, target.meshIds),
    target.meshIds,
    nextId,
  )
  if (target.parentId && !document.nodes.some((node) => node.id === target.parentId))
    target.parentId = null
  const height = target.max[1] - target.min[1] || 1
  for (const role of DIVIDED) {
    const parent = CHARACTER_PARENT.get(role)!
    const child = PARENT.find(([, p]) => p === role)![0]
    const normal = normalize(sub(layout[child], layout[parent]))
    const origin = layout[role]
    const index = indexSceneDocument(document)
    for (const meshId of target.meshIds) {
      const node = index.scene.nodes.get(meshId)
      const geometry = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : null
      if (geometry?.kind !== 'mesh') continue
      const world = index.scene.worldMatrices.get(meshId)!
      const reach = 0.02 * height
      const inside = [0, 1, 2].every((axis) => {
        const values = Object.values(geometry.vertices).map((p) => transformPoint(world, p)[axis]!)
        return (
          Math.min(...values) - reach <= origin[axis]! &&
          origin[axis]! <= Math.max(...values) + reach
        )
      })
      if (!inside) continue
      try {
        document = divideSceneByWorldPlane(document, meshId, { origin, normal })
      } catch (error) {
        // Uma peça que não aceita o corte (UV torto, por exemplo) só dobra menos macio.
        if (!(error instanceof SceneValidationError)) throw error
      }
    }
  }
  const index = indexSceneDocument(document)
  const parentWorld = target.parentId
    ? index.scene.worldMatrices.get(target.parentId)!
    : identityMatrix()
  const inverse = affineInverse(parentWorld)
  requireScene(inverse, 'parent', 'O grupo do personagem precisa de um tamanho maior que zero.')
  const allocate = allocateSceneId(document, nextId)
  const jointIds = new Map(CHARACTER_ROLES.map((role) => [role, allocate()]))
  const nodes: ModelSceneNode[] = PARENT.map(([role, parent]) => {
    const point = layout[role]
    const world = identityMatrix()
    for (const axis of [0, 1, 2] as const) world[12 + axis] = point[axis]
    return {
      id: jointIds.get(role)!,
      name: NAMES[role],
      kind: TIPS.has(role) ? 'locator' : 'group',
      parentId: parent ? jointIds.get(parent)! : target.parentId,
      hidden: false,
      locked: false,
      transform: parent
        ? {
            kind: 'trs',
            translation: sub(point, layout[parent]),
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          }
        : { kind: 'affine', matrix: affineMultiply(inverse, world) },
    }
  })
  document = finishSceneCommand({ ...document, nodes: [...document.nodes, ...nodes] })
  const joints = new Map(
    CHARACTER_ROLES.map((role) => [role, { id: jointIds.get(role)!, position: layout[role] }]),
  )
  const skinJoints = CHARACTER_JOINT_ROLES.map((role) => jointIds.get(role)!)
  for (const meshId of target.meshIds) {
    const current = indexSceneDocument(document)
    const node = current.scene.nodes.get(meshId)
    const geometry = node?.kind === 'mesh' ? current.geometries.get(node.geometryId) : null
    if (geometry?.kind !== 'mesh') continue
    const world = current.scene.worldMatrices.get(meshId)!
    const positions = Object.entries(geometry.vertices).map(
      ([vertexId, point]) => [vertexId, transformPoint(world, point)] as const,
    )
    document = createSceneSkin(
      document,
      {
        name: `Ossos · ${node!.name}`.slice(0, 48),
        nodeId: meshId,
        jointIds: skinJoints,
        weights: characterSkinWeights(positions, joints),
      },
      nextId,
    )
  }
  return { document, rootId: jointIds.get('hips')!, pieces: target.meshIds.length }
}

export interface CharacterRig {
  rootId: string
  joints: ReadonlyMap<CharacterRole, string>
  /** Mundo → canônico do personagem: colunas esquerda, cima e frente. */
  left: Vec3
  up: Vec3
  front: Vec3
}

/** Reconhece esqueletos de personagem pela forma da hierarquia. */
export function findCharacterRigs(document: MoldaSceneDocument): CharacterRig[] {
  const index = indexSceneDocument(document)
  const children = new Map<string, string[]>()
  for (const node of document.nodes)
    if (node.kind !== 'mesh' && node.parentId !== null) {
      const list = children.get(node.parentId) ?? []
      list.push(node.id)
      children.set(node.parentId, list)
    }
  const kids = (id: string) => children.get(id) ?? []
  const kind = (id: string) => index.scene.nodes.get(id)?.kind
  const position = (id: string) => transformPoint(index.scene.worldMatrices.get(id)!, [0, 0, 0])
  /** Corrente de juntas com um filho só, terminando numa ponta sem filhos. */
  const chain = (start: string, links: number): string[] | null => {
    const path = [start]
    let current = start
    for (let i = 0; i < links; i++) {
      const next = kids(current)
      if (next.length !== 1 || kind(current) !== 'group') return null
      current = next[0]!
      path.push(current)
    }
    return kids(current).length === 0 ? path : null
  }
  const rigs: CharacterRig[] = []
  for (const node of document.nodes) {
    if (node.kind !== 'group') continue
    const hipKids = kids(node.id)
    if (hipKids.length !== 3) continue
    const legs = hipKids.map((id) => chain(id, 3)).filter((path) => path !== null)
    const spineId = hipKids.find((id) => !legs.some((path) => path[0] === id))
    if (legs.length !== 2 || !spineId || kind(spineId) !== 'group') continue
    const spineKids = kids(spineId)
    if (spineKids.length !== 1 || kind(spineKids[0]!) !== 'group') continue
    const chestId = spineKids[0]!
    const chestKids = kids(chestId)
    if (chestKids.length !== 3) continue
    const necks = chestKids.map((id) => chain(id, 2)).filter((path) => path !== null)
    const arms = chestKids.map((id) => chain(id, 4)).filter((path) => path !== null)
    if (necks.length !== 1 || arms.length !== 2) continue
    const hips = position(node.id)
    const up = normalize(sub(position(necks[0]![0]!), hips))
    let front: Vec3 = [0, 0, 0]
    for (const leg of legs) front = add(front, sub(position(leg[3]!), position(leg[2]!)))
    front = sub(front, scale(up, dot(front, up)))
    if (length(front) < 1e-9) front = sub([0, 0, 1], scale(up, up[2]))
    front = normalize(front)
    const left = normalize(cross(up, front))
    const side = (id: string): CharacterSide =>
      dot(sub(position(id), hips), left) >= 0 ? 'L' : 'R'
    const [legA, legB] = legs as [string[], string[]]
    const [armA, armB] = arms as [string[], string[]]
    if (side(legA[0]!) === side(legB[0]!) || side(armA[1]!) === side(armB[1]!)) continue
    const joints = new Map<CharacterRole, string>([
      ['hips', node.id],
      ['spine', spineId],
      ['chest', chestId],
      ['neck', necks[0]![0]!],
      ['head', necks[0]![1]!],
      ['headTip', necks[0]![2]!],
    ])
    for (const leg of legs) {
      const s = side(leg[0]!)
      for (const [i, role] of (['thigh', 'shin', 'foot', 'toe'] as const).entries())
        joints.set(`${role}${s}`, leg[i]!)
    }
    for (const arm of arms) {
      const s = side(arm[1]!)
      for (const [i, role] of (
        ['shoulder', 'upperArm', 'forearm', 'hand', 'handTip'] as const
      ).entries())
        joints.set(`${role}${s}`, arm[i]!)
    }
    rigs.push({ rootId: node.id, joints, left, up, front })
  }
  return rigs
}
