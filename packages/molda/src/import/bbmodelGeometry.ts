import { type BbmodelGeometryPlan, planBbmodelGeometry } from './bbmodelGeometryPlan'
import type { BbmodelGeometrySource, BbmodelTextureReference } from './bbmodelGeometryTypes'
import type { BbmodelGraph } from './bbmodelGraph'
import { bbmodelIdentifier, requireBbmodel } from './bbmodelInput'
import { readBbmodelNodeProperties } from './bbmodelNodeProperties'
import {
  bbmodelBoolean,
  bbmodelKeyPath,
  bbmodelNumber,
  bbmodelVec2,
  bbmodelVec3,
  bbmodelVec4,
} from './bbmodelValues'

function texture(value: unknown, path: string): BbmodelTextureReference {
  if (value === undefined) return { kind: 'default' }
  if (value === null) return { kind: 'disabled' }
  if (value === false) return { kind: 'none' }
  if (typeof value === 'string') return { kind: 'uuid', uuid: bbmodelIdentifier(value, path) }
  requireBbmodel(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
    path,
    'A referência de textura precisa ser um índice ou identificador válido.',
  )
  return { kind: 'index', index: value }
}

function materialize(plan: BbmodelGeometryPlan): BbmodelGeometrySource {
  if (plan.kind === 'unresolved') return plan
  const { source, path, node } = plan
  const common = readBbmodelNodeProperties(source, path)
  if (plan.kind === 'cube') {
    return {
      kind: 'cube',
      node,
      ...common,
      from: bbmodelVec3(source.from, `${path}.from`),
      to: bbmodelVec3(source.to, `${path}.to`),
      inflate: source.inflate === undefined ? 0 : bbmodelNumber(source.inflate, `${path}.inflate`),
      stretch: bbmodelVec3(
        source.stretch === undefined ? [1, 1, 1] : source.stretch,
        `${path}.stretch`,
      ),
      rescale: bbmodelBoolean(source.rescale, `${path}.rescale`, false),
      mirrorUv: bbmodelBoolean(source.mirror_uv, `${path}.mirror_uv`, false),
      uvOffset: bbmodelVec2(
        source.uv_offset === undefined ? [0, 0] : source.uv_offset,
        `${path}.uv_offset`,
      ),
      boxUv:
        source.box_uv === undefined ? null : bbmodelBoolean(source.box_uv, `${path}.box_uv`, false),
      faces: plan.faces.map((face) => ({
        direction: face.direction,
        uv: bbmodelVec4(face.source.uv, `${face.path}.uv`),
        rotation:
          face.source.rotation === undefined
            ? 0
            : bbmodelNumber(face.source.rotation, `${face.path}.rotation`),
        texture: texture(face.source.texture, `${face.path}.texture`),
        source: face.source,
      })),
    }
  }
  const byVertex = new Map<string, number>()
  const positions = new Float64Array(plan.vertexIds.length * 3)
  for (let i = 0; i < plan.vertexIds.length; i++) {
    const id = plan.vertexIds[i]!
    byVertex.set(id, i)
    positions.set(bbmodelVec3(plan.vertices[id], bbmodelKeyPath(`${path}.vertices`, id)), i * 3)
  }
  const faces = plan.faces.map((face) => {
    const vertices = new Uint32Array(face.vertices.length)
    for (let i = 0; i < face.vertices.length; i++) {
      const vertexPath = `${face.path}.vertices[${i}]`
      const id = bbmodelIdentifier(face.vertices[i], vertexPath)
      const index = byVertex.get(id)
      requireBbmodel(
        index !== undefined,
        vertexPath,
        'Uma face aponta para um vértice que não existe nesta malha.',
      )
      vertices[i] = index
    }
    const uv = new Map(
      face.uvKeys.map((id) => [
        id,
        bbmodelVec2(face.uv[id], bbmodelKeyPath(`${face.path}.uv`, id)),
      ]),
    )
    return {
      id: face.id,
      vertices,
      uv,
      texture: texture(face.source.texture, `${face.path}.texture`),
      source: face.source,
    }
  })
  return { kind: 'mesh', node, ...common, vertexIds: plan.vertexIds, positions, faces }
}

/** Typed source geometry, NOT a native conversion or an approval of appearance/element semantics. */
export function readBbmodelGeometry(graph: BbmodelGraph): BbmodelGeometrySource[] {
  const plans = planBbmodelGeometry(graph)
  return plans.map(materialize)
}
