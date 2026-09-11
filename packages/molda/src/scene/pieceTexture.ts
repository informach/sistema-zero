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
import { parametricMesh } from './parametricGeometry'
import { requireScene } from './validation'

/** As faces que mostram o material da pintura, em pé; duas faces na mesma região valem uma. */
function paintedFaces(document: MoldaSceneDocument, target: ScenePaintTarget) {
  const node = document.nodes.find((entry) => entry.id === target.nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha uma peça para vestir.')
  const geometry = document.geometries.find((entry) => entry.id === node.geometryId)
  const image = document.images.find((entry) => entry.id === target.imageId)
  if (!geometry || !image) return []
  const faces =
    geometry.kind === 'mesh'
      ? Object.entries(geometry.faces).map(([key, face]) => [key, face.materialId] as const)
      : [...new Set(parametricMesh(geometry).surfaceByFace.values())].map(
          (key) => [key, geometry.surfaces[key]?.materialId] as const,
        )
  const views = new Map<string, ScenePaintFaceView>()
  for (const [key, materialId] of faces) {
    if ((materialId ?? node.materialId) !== target.materialId) continue
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
