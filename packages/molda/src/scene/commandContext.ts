import { sceneBounds } from './bounds'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneNodeFlags } from './evaluate'
import { selectSceneSubtrees } from './graph'
import { SCENE_LIMITS } from './limits'
import { requireScene, id as validateId } from './validation'

export function allocateSceneId(document: MoldaSceneDocument, nextId: () => string) {
  const occupied = new Set(
    [
      document.nodes,
      document.geometries,
      document.materials,
      document.images,
      document.mirrors,
      document.animations ?? [],
      document.skins ?? [],
    ]
      .flat()
      .map((entry) => entry.id),
  )
  return () => {
    const id = validateId(nextId(), 'id')
    requireScene(!occupied.has(id), 'id', 'Essa identidade já está em uso.')
    occupied.add(id)
    return id
  }
}

export function sceneCommandSelection(document: MoldaSceneDocument, ids: readonly string[]) {
  const index = indexSceneDocument(document)
  const { selected, covered, roots } = selectSceneSubtrees(index.scene, ids)
  const locked = new Set<string>()
  for (const [id, flags] of evaluateSceneNodeFlags(index.scene)) if (flags.locked) locked.add(id)
  return { index, selected, covered, roots, locked }
}

export function requireEditableScene(selected: ReturnType<typeof sceneCommandSelection>) {
  for (const id of selected.covered)
    requireScene(
      !selected.locked.has(id),
      `nodes.${id}`,
      'Destrave a peça para fazer essa mudança.',
    )
}

/** Counts not covered by the structural document index. Does not replace reference/bounds validation. */
export function requireSceneCommandBudget(document: MoldaSceneDocument): void {
  requireScene(
    document.nodes.length <= SCENE_LIMITS.nodes &&
      document.geometries.length <= SCENE_LIMITS.geometries &&
      document.materials.length <= SCENE_LIMITS.materials &&
      document.images.length <= SCENE_LIMITS.images,
    '$',
    'Essa mudança ultrapassa o tamanho permitido para uma criação.',
  )
  let pixelBytes = 0
  let layers = 0
  for (const image of document.images) {
    layers += image.layers.length
    for (const layer of image.layers) pixelBytes += layer.pixels.byteLength
  }
  requireScene(
    pixelBytes <= SCENE_LIMITS.pixelBytes && layers <= SCENE_LIMITS.images,
    'images',
    'Essa mudança ultrapassa o espaço para pintura.',
  )
}

/** Shared command boundary: derived costs without cloning untouched authorial pixels. */
export function finishSceneCommand(document: MoldaSceneDocument): MoldaSceneDocument {
  requireSceneCommandBudget(document)
  sceneBounds(indexSceneDocument(document))
  return document
}
