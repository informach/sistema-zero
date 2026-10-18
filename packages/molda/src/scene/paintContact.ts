import type { MoldaSceneDocument, SceneGeometry } from './document'
import { indexSceneDocument } from './documentIndex'
import { buildSceneGeometry, triangleUv } from './geometry'
import { sceneFlipbookRegion, sceneFlipbookTexel } from './imageFlipbook'
import {
  resolveScenePaintTarget,
  type ScenePaintContact,
  type ScenePaintSample,
  type ScenePaintTarget,
} from './imagePaint'
import { ensureScenePaintSurface } from './paintSurface'
import { scenePaintFaceBounds, scenePaintIslandKey } from './paintSurfaceBounds'
import { requireScene, SceneValidationError } from './validation'

export interface ScenePaintPreparationIssue {
  nodeId: string
  faceId?: string
  faces: readonly string[]
}

/** A recoverable authoring choice, distinct from an invalid paint gesture. */
export class ScenePaintPreparationRequired extends SceneValidationError {
  constructor(readonly issue: ScenePaintPreparationIssue) {
    super('paint.face', 'Prepare a pintura desta peça para começar a desenhar.')
  }
}

const buffers = new WeakMap<SceneGeometry, ReturnType<typeof buildSceneGeometry>>()

/** The geometry is unchanged by paint preparation; only its UV/material bindings change. */
export function sampleScenePaintContact(
  document: MoldaSceneDocument,
  target: ScenePaintTarget,
  contact: ScenePaintContact,
): ScenePaintSample {
  const { image } = resolveScenePaintTarget(document, target)
  const index = indexSceneDocument(document)
  const node = index.scene.nodes.get(contact.nodeId)
  const geometry = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : undefined
  requireScene(
    geometry && target.nodeId === contact.nodeId,
    'paint',
    'Essa peça mudou. Comece o traço novamente.',
  )
  let mesh = buffers.get(geometry)
  if (!mesh) {
    mesh = buildSceneGeometry(geometry)
    buffers.set(geometry, mesh)
  }
  requireScene(
    mesh.faceIds[contact.triangle] === contact.faceId,
    'paint.face',
    'A face mudou. Comece o traço novamente.',
  )
  const uv = triangleUv(mesh, contact.triangle, contact.barycentric)
  const frame = image.flipbook ? contact.frame : 0
  const point = sceneFlipbookTexel(image, uv, frame)
  requireScene(point, 'paint.uv', 'Esta face precisa de uma área de pintura dentro da folha.')
  const cell = image.flipbook ? sceneFlipbookRegion(image, frame) : undefined
  const bounds = scenePaintFaceBounds(geometry, contact.faceId, image, cell) || cell
  return {
    target,
    point,
    faceId: contact.faceId,
    region: JSON.stringify([
      contact.nodeId,
      target.imageId,
      scenePaintIslandKey(geometry, contact.faceId),
      frame,
    ]),
    ...(bounds ? { bounds } : {}),
  }
}

/** Pure copy-on-write preparation joins the stroke's transaction, never a separate history step. */
export function prepareScenePaintContact(
  document: MoldaSceneDocument,
  contact: ScenePaintContact,
): { document: MoldaSceneDocument; target: ScenePaintTarget; sample: ScenePaintSample } {
  const result = ensureScenePaintSurface(document, contact)
  if (result.status === 'crooked')
    throw new ScenePaintPreparationRequired({
      nodeId: contact.nodeId,
      faceId: contact.faceId,
      faces: result.faces,
    })
  const reflected = contact.mirror
    ? prepareScenePaintContact(result.document, contact.mirror)
    : null
  const prepared = reflected?.document ?? result.document
  const sample = sampleScenePaintContact(prepared, result.target, contact)
  return {
    document: prepared,
    target: result.target,
    sample: reflected ? { ...sample, mirror: reflected.sample } : sample,
  }
}
