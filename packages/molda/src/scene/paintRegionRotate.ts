/**
 * Girar a pintura da face: 90° na região da face, em TODAS as camadas, com a mesma conta do
 * "Girar a pele" do editor antigo (`rotateSkin90`). Região que não é quadrada volta ao tamanho
 * dela pelo vizinho mais próximo, como lá. Os pixels fora da região não mudam, e só a camada
 * que muda ganha cópia. Quem chama faz um commit: um passo de desfazer.
 */
import { requireEditableAppearance, sceneAppearanceUsage } from './appearanceUsage'
import { finishSceneCommand } from './commandContext'
import type { ScenePixelRegion } from './composite'
import type { MoldaSceneDocument, SceneImageLayer } from './document'
import { readImageRegion } from './imageRegion'
import { requireScene } from './validation'

export function rotateScenePaintRegion(
  document: MoldaSceneDocument,
  imageId: string,
  region: ScenePixelRegion,
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
    // O bloco girado tem a largura da altura: (x, y) vai para (altura - 1 - y, x).
    const rotated = new Uint8Array(width * height * channels)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const from = offset(x, y)
        const to = (x * height + (height - 1 - y)) * channels
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
