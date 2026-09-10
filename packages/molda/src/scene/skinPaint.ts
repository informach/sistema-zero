import type { Vec3 } from '../core/model'
import { sceneBounds } from './bounds'
import { requireSceneCommandBudget } from './commandContext'
import type { MoldaSceneDocument } from './document'
import { sameSceneContent } from './documentContent'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneNodeFlags } from './evaluate'
import { prepareMeshDistanceField, smoothMeshReach } from './meshDistanceField'
import type { SceneSkinInfluence } from './skin'
import {
  paintSceneSkinWeight,
  type SceneSkinPaintMix,
  type SceneSkinPaintRefusal,
} from './skinPaintWeights'
import { patchSceneSkinWeights } from './skinWeightPatch'
import * as v from './validation'

export interface SceneSkinPaintSettings {
  mode: 'add' | 'subtract'
  radius: number
  strength: number
}
/** Point is in the source mesh's world frame; a viewport mirror must first undo its reflection. */
export interface SceneSkinPaintSample {
  faceId: string
  point: Vec3
}
export interface SceneSkinPaintStats {
  touched: number
  changed: number
  refused: Record<SceneSkinPaintRefusal, number>
}

/** Detached stroke: only private masks/rows change. Authorial data and inverse binds are never written. */
export function createSceneSkinPaintStroke(
  document: MoldaSceneDocument,
  skinId: string,
  jointId: string,
  settings: SceneSkinPaintSettings,
) {
  v.record(settings, 'paint', ['mode', 'radius', 'strength'])
  const mode = v.choice(settings.mode, ['add', 'subtract'], 'paint.mode'),
    radius = v.number(settings.radius, 'paint.radius', Number.MIN_VALUE),
    strength = v.number(settings.strength, 'paint.strength', 0, 1),
    index = indexSceneDocument(document),
    skin = index.skins.get(v.id(skinId, 'skinId'))
  v.requireScene(skin, 'skinId', 'Escolha uma peça vinculada para pintar suas forças.')
  v.id(jointId, 'jointId')
  v.requireScene(
    skin.joints.some((joint) => joint.nodeId === jointId),
    'jointId',
    'Escolha um osso deste vínculo.',
  )
  const flags = evaluateSceneNodeFlags(index.scene).get(skin.nodeId),
    node = index.scene.nodes.get(skin.nodeId),
    mesh = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : null
  v.requireScene(
    !flags?.locked && !flags?.hidden,
    'skinId',
    'Mostre e destrave a peça para pintar suas forças.',
  )
  v.requireScene(mesh?.kind === 'mesh', 'skinId', 'Esta peça precisa de uma malha com pontos.')
  const field = prepareMeshDistanceField(
      mesh,
      index.scene.worldMatrices.get(skin.nodeId)!,
      radius,
      'surface',
    ),
    coverage = new Map<string, number>(),
    patch = new Map<string, SceneSkinInfluence[]>(),
    refused = new Map<string, SceneSkinPaintRefusal>(),
    counts: Record<SceneSkinPaintRefusal, number> = {
      'influence-limit': 0,
      'no-recipient': 0,
      precision: 0,
    }
  const stats = (): SceneSkinPaintStats => ({
    touched: coverage.size,
    changed: patch.size,
    refused: { ...counts },
  })
  const savedWeight = (vertexId: string) =>
    skin.weights[vertexId]!.find((row) => row.jointId === jointId)?.weight ?? 0
  const readPatch = () =>
    Object.fromEntries([...patch].map(([id, rows]) => [id, rows.map((row) => ({ ...row }))]))
  return {
    nodeId: skin.nodeId,
    skinId: skin.id,
    jointId,
    /** Each response owns its map. Only changed display values are returned, not the mutable stroke rows. */
    sample(sample: SceneSkinPaintSample) {
      v.record(sample, 'sample', ['faceId', 'point'])
      const faceId = v.id(sample.faceId, 'sample.faceId'),
        point = v.tuple(sample.point, 3, 'sample.point')
      v.requireScene(
        Object.hasOwn(mesh.faces, faceId),
        'sample.faceId',
        'Esta face não existe mais.',
      )
      const distance = field.query(
        mesh.faces[faceId]!.corners.map(({ vertexId }) => {
          const vertex = field.point(vertexId)
          return {
            id: vertexId,
            distance: Math.hypot(
              vertex[0] - point[0]!,
              vertex[1] - point[1]!,
              vertex[2] - point[2]!,
            ),
          }
        }),
      )
      // Stage the whole sample before changing private state, so malformed input cannot leave half a sample.
      const staged = [...distance].flatMap(([vertexId, distance]) => {
          const alpha = strength * smoothMeshReach(distance, radius)
          if (alpha <= (coverage.get(vertexId) ?? 0)) return []
          const original = skin.weights[vertexId]!,
            previous = savedWeight(vertexId),
            target = mode === 'add' ? previous + alpha * (1 - previous) : previous * (1 - alpha),
            roundedEndpoint =
              alpha < 1 &&
              ((mode === 'add' && previous < 1 && target === 1) ||
                (mode === 'subtract' && previous > 0 && target === 0)),
            result: SceneSkinPaintMix = roundedEndpoint
              ? { status: 'blocked', reason: 'precision' }
              : paintSceneSkinWeight(original, jointId, target)
          return [{ vertexId, alpha, previous, result }]
        }),
        delta = new Map<string, number>()
      for (const { vertexId, alpha, previous, result } of staged) {
        coverage.set(vertexId, alpha)
        const oldRefusal = refused.get(vertexId)
        if (oldRefusal) counts[oldRefusal]--
        refused.delete(vertexId)
        if (result.status === 'changed') {
          patch.set(vertexId, result.influences)
          delta.set(vertexId, result.influences.find((row) => row.jointId === jointId)!.weight)
        } else {
          if (patch.delete(vertexId)) delta.set(vertexId, previous)
          if (result.status === 'blocked') {
            refused.set(vertexId, result.reason)
            counts[result.reason]++
          }
        }
      }
      return { delta, stats: stats() }
    },
    /** Owned output for one eventual command. Reading it never gives the caller ownership of stroke state. */
    result() {
      return {
        patch: readPatch(),
        stats: stats(),
      }
    },
    /** Only the private stroke patch may use this checked context. No caller-supplied rows or index. */
    commit(current = document) {
      v.requireScene(
        sameSceneContent(document, current),
        'paint',
        'A criação mudou. Comece um novo traço.',
      )
      const next = patchSceneSkinWeights(skin, readPatch(), false)
      if (next === skin) return current
      requireSceneCommandBudget(current)
      const joints = new Set(skin.joints.map((joint) => joint.nodeId))
      for (const vertexId of patch.keys())
        for (const influence of next.weights[vertexId]!)
          v.requireScene(
            joints.has(influence.jointId),
            `skins.${skin.id}`,
            'Os pesos apontam para um osso fora do vínculo.',
          )
      // No topology, bind, node, material or image changed; the original index still proves their
      // references/costs. Bounds use those unchanged geometries/matrices, never the edited weights.
      sceneBounds(index)
      return { ...current, skins: current.skins!.map((entry) => (entry === skin ? next : entry)) }
    },
  }
}
