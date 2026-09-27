/**
 * "Vestir com textura" na oficina nova: a textura da galeria da criança assada em cada face da
 * peça, na folha que a aba Pintar já preparou, como o "Vestir" do editor antigo.
 *
 * - Repetir (x % lado) ou Esticar (vizinho mais próximo), face por face, no retângulo dela e EM PÉ
 *   (`paintFaceView`): a linha de cima da textura fica em cima da face, olhando de fora.
 * - O índice 0 da textura (transparente) deixa a cor da peça aparecer, como lá.
 * - Cores: mesma cor reaproveita o índice, cor nova vira extra (até 48), sem vaga pega a mais
 *   parecida (`buildColorRemap`, o mesmo do editor antigo). Na folha de cores livres, a cor vai
 *   direto.
 * - É CÓPIA: apagar a textura depois não muda o modelo. Um passo de desfazer.
 */
import { hexToRgb } from '../core/color'
import { newId } from '../core/id'
import type { MoldaTextureAsset } from '../core/model'
import { type ApplyMode, buildColorRemap, sampleTextureSkin, textureColors } from '../texture/ops'
import { finishSceneCommand } from './commandContext'
import type { MoldaSceneDocument } from './document'
import { resolveScenePaintTarget, type ScenePaintTarget } from './imagePaint'
import {
  type ScenePaintFaceView,
  sceneFaceViewSize,
  sceneFaceViewTexel,
  scenePaintFaceView,
} from './paintFaceView'
import { ensureScenePaintSurface } from './paintSurface'
import { scenePaintIslandKey } from './paintSurfaceBounds'
import { cachedParametricMesh } from './parametricGeometry'
import { requireScene, SceneValidationError } from './validation'

/** Cada face (malha) ou superfície (forma e tubo) da peça, com o material que ela mostra. */
function pieceFaces(document: MoldaSceneDocument, nodeId: string) {
  const node = document.nodes.find((entry) => entry.id === nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha uma peça para vestir.')
  const geometry = document.geometries.find((entry) => entry.id === node.geometryId)
  if (!geometry) return { node, geometry, faces: [] as Array<readonly [string, string]> }
  const faces =
    geometry.kind === 'mesh'
      ? Object.entries(geometry.faces).map(
          ([key, face]) => [key, face.materialId ?? node.materialId] as const,
        )
      : [...new Set(cachedParametricMesh(geometry).surfaceByFace.values())].map(
          (key) => [key, geometry.surfaces[key]?.materialId ?? node.materialId] as const,
        )
  return { node, geometry, faces }
}

/**
 * As faces que mostram o material da pintura, em pé. As faces da mesma ILHA de UV dividem o
 * retângulo: a vista é calculada uma vez por ilha (numa malha importada com a UV contínua, antes
 * era uma conta da ilha inteira por face, e o Vestir levava minutos).
 */
function paintedFaces(document: MoldaSceneDocument, target: ScenePaintTarget) {
  const { geometry, faces } = pieceFaces(document, target.nodeId)
  const image = document.images.find((entry) => entry.id === target.imageId)
  if (!geometry || !image) return []
  const islands = new Map<string, string>()
  for (const [key, materialId] of faces) {
    if (materialId !== target.materialId) continue
    const island = scenePaintIslandKey(geometry, key)
    if (!islands.has(island)) islands.set(island, key)
  }
  const views = new Map<string, ScenePaintFaceView>()
  for (const key of islands.values()) {
    const view = scenePaintFaceView(geometry, key, image)
    if (!view) continue
    const { x0, y0, x1, y1 } = view.region
    const id = `${x0},${y0},${x1},${y1}`
    if (!views.has(id)) views.set(id, view)
  }
  return [...views.values()]
}

export function dressScenePaintTarget(
  document: MoldaSceneDocument,
  target: ScenePaintTarget,
  texture: MoldaTextureAsset,
  mode: ApplyMode,
): MoldaSceneDocument {
  const { image, layer, imageKind } = resolveScenePaintTarget(document, target)
  requireScene(imageKind === 'color', 'paint', 'A textura veste a cor da peça.')
  // Na pintura que se mexe a UV corre pela célula de cada quadro: vestir apagaria o movimento.
  requireScene(
    !image.flipbook,
    'flipbook',
    'A pintura desta peça se mexe. Vestir com textura apagaria os quadros dela.',
  )
  const views = paintedFaces(document, target)
  requireScene(views.length, 'face', 'Essa peça não mostra essa pintura em face nenhuma.')
  const sampled = views.map((view) => {
    const { width, height } = sceneFaceViewSize(view)
    return { view, skin: sampleTextureSkin(texture, width, height, mode) }
  })
  const colors = textureColors(texture)
  let next = document
  let write: (value: number, offset: number) => void
  const pixels = layer.pixels.slice()
  if (image.encoding === 'indexed') {
    const used = new Set<number>()
    for (const { skin } of sampled) for (const value of skin.data) if (value > 0) used.add(value)
    const remapped = buildColorRemap(colors, used, document)
    next = remapped.model
    write = (value, offset) => {
      pixels[offset] = value ? (remapped.map[value] ?? 0) : 0
    }
  } else {
    write = (value, offset) => {
      const hex = value ? colors[value] : undefined
      pixels.set(hex ? [...hexToRgb(hex), 255] : [0, 0, 0, 0], offset * 4)
    }
  }
  for (const { view, skin } of sampled)
    for (let row = 0; row < skin.height; row++)
      for (let column = 0; column < skin.width; column++) {
        const [x, y] = sceneFaceViewTexel(view, column, row)
        write(skin.data[row * skin.width + column]!, y * image.width + x)
      }
  // Vestir de novo com a mesma textura não muda nada: nenhum passo de desfazer vazio.
  if (next === document && pixels.every((value, i) => value === layer.pixels[i])) return document
  return finishSceneCommand({
    ...next,
    images: next.images.map((entry) =>
      entry.id === image.id
        ? {
            ...image,
            layers: image.layers.map((item) => (item === layer ? { ...item, pixels } : item)),
          }
        : entry,
    ),
  })
}

/**
 * Vestir a PEÇA inteira: cada material que ela mostra ganha o lugar da tinta (o mesmo preparo da
 * aba Pintar) e a textura, numa revisão só. Uma criação do editor antigo tem um material por face
 * pintada, e vestir só o material tocado deixava as outras faces lisas (o "Vestir" antigo vestia a
 * peça toda). Material que não dá para preparar (face torta sem consentimento, só mapas) fica
 * como está; se nenhum der, o erro do primeiro volta.
 */
export function dressScenePiece(
  document: MoldaSceneDocument,
  nodeId: string,
  texture: MoldaTextureAsset,
  mode: ApplyMode,
  nextId: () => string = newId,
): MoldaSceneDocument {
  const firstFace = new Map<string, string>()
  for (const [key, materialId] of pieceFaces(document, nodeId).faces)
    if (!firstFace.has(materialId)) firstFace.set(materialId, key)
  let next = document
  let dressed = 0
  let failure: unknown = null
  for (const faceId of firstFace.values()) {
    try {
      const surface = ensureScenePaintSurface(next, { nodeId, faceId }, nextId)
      if (surface.status !== 'ready') continue
      next = dressScenePaintTarget(surface.document, surface.target, texture, mode)
      dressed++
    } catch (error) {
      failure ??= error
    }
  }
  if (!dressed) {
    if (failure) throw failure
    throw new SceneValidationError('face', 'Essa peça não tem face para vestir.')
  }
  return next
}
