/**
 * Girar a pintura da face: 90° na região da face, em TODAS as camadas, com a mesma conta do
 * "Girar a pele" do editor antigo (`rotateSkin90`). Região que não é quadrada volta ao tamanho
 * dela pelo vizinho mais próximo, como lá. Os pixels fora da região não mudam, e só a camada
 * que muda ganha cópia. Quem chama faz um commit: um passo de desfazer.
 */
import { requireEditableAppearance, sceneAppearanceUsage } from './appearanceUsage'
import { finishSceneCommand } from './commandContext'
import type { ScenePixelRegion } from './composite'
import type { MoldaSceneDocument, SceneImage, SceneImageLayer } from './document'
import { readImageRegion } from './imageRegion'
import { sceneMaterialImageIds } from './materialImages'
import { requireScene } from './validation'

export function rotateScenePaintRegion(
  document: MoldaSceneDocument,
  imageId: string,
  region: ScenePixelRegion,
  /** 1 = no sentido do relógio (o de sempre); 3 = o contrário, para o lado do espelho. */
  turns: 1 | 3 = 1,
): MoldaSceneDocument {
  const usage = sceneAppearanceUsage(document)
  const image = usage.index.images.get(imageId)
  requireScene(image, 'image', 'Essa pintura não existe mais.')
  requireEditableAppearance(usage, usage.images.get(imageId) ?? [])
  const area = readImageRegion(region, image)
  const width = area.x1 - area.x0 + 1
  const height = area.y1 - area.y0 + 1
  const channels = image.encoding === 'indexed' ? 1 : 4
  const offset = (x: number, y: number) => ((area.y0 + y) * image.width + area.x0 + x) * channels
  let changed = false
  const layers = image.layers.map((layer): SceneImageLayer => {
    const source = layer.pixels
    // O bloco girado tem a largura da altura: (x, y) vai para (altura - 1 - y, x); no sentido
    // contrário, para (y, largura - 1 - x).
    const rotated = new Uint8Array(width * height * channels)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const from = offset(x, y)
        const to =
          (turns === 1 ? x * height + (height - 1 - y) : (width - 1 - x) * height + y) * channels
        for (let c = 0; c < channels; c++) rotated[to + c] = source[from + c]!
      }
    let pixels: Uint8Array | null = null
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const sx = Math.floor((x * height) / width)
        const sy = Math.floor((y * width) / height)
        const from = (sy * height + sx) * channels
        const to = offset(x, y)
        for (let c = 0; c < channels; c++) {
          const value = rotated[from + c]!
          if ((pixels ?? source)[to + c] === value) continue
          pixels ??= source.slice()
          pixels[to + c] = value
        }
      }
    if (!pixels) return layer
    changed = true
    return { ...layer, pixels }
  })
  if (!changed) return document
  return finishSceneCommand({
    ...document,
    images: document.images.map((entry) => (entry.id === imageId ? { ...image, layers } : entry)),
  })
}

/** O mesmo retângulo numa imagem de outro tamanho (um mapa do material menor que a cor). */
function scaleRegion(
  region: ScenePixelRegion,
  from: Pick<SceneImage, 'width' | 'height'>,
  to: Pick<SceneImage, 'width' | 'height'>,
): ScenePixelRegion {
  const axis = (low: number, high: number, a: number, b: number): [number, number] => {
    const start = Math.min(b - 1, Math.floor((low * b) / a))
    return [start, Math.min(b - 1, Math.max(start, Math.ceil(((high + 1) * b) / a) - 1))]
  }
  const [x0, x1] = axis(region.x0, region.x1, from.width, to.width)
  const [y0, y1] = axis(region.y0, region.y1, from.height, to.height)
  return { x0, y0, x1, y1 }
}

/**
 * Girar a pintura da FACE: a cor e os mapas do material (relevo, brilho, metal), que dividem a
 * mesma UV. Girar só a cor deixava os mapas desalinhados dela. Um passo de desfazer para quem
 * chama.
 */
export function rotateScenePaintFace(
  document: MoldaSceneDocument,
  face: { materialId: string; imageId: string },
  region: ScenePixelRegion,
  turns: 1 | 3 = 1,
): MoldaSceneDocument {
  const color = document.images.find((entry) => entry.id === face.imageId)
  requireScene(color, 'image', 'Essa pintura não existe mais.')
  let next = rotateScenePaintRegion(document, face.imageId, region, turns)
  const material = document.materials.find((entry) => entry.id === face.materialId)
  if (!material) return next
  for (const id of sceneMaterialImageIds(material)) {
    if (id === face.imageId) continue
    const image = next.images.find((entry) => entry.id === id)
    if (image) next = rotateScenePaintRegion(next, id, scaleRegion(region, color, image), turns)
  }
  return next
}
