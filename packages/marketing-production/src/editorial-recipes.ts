import {
  type ArtComposition,
  type ArtLayer,
  type ArtRecipeId,
  artSchema,
  CDC_ART_LABELS,
} from '@sistemazero/marketing-contracts'

const id = (index: number) => `4c245b10-6e36-48c4-89ae-${String(index).padStart(12, '0')}`
/** Versioned native reconstruction of the acervo's typography, palette and spacing. */
export function editorialRecipe(
  recipe: ArtRecipeId,
  options: { body: string; format: string; imageAssetIds: string[] },
): ArtComposition {
  const story = ['story', 'reel'].includes(options.format),
    height = story ? 1920 : 1350
  const top = story ? 250 : 122,
    bottom = story ? 240 : 102,
    contentHeight = height - top - bottom
  const layer = (index: number, x: number, y: number, width: number, height: number) => ({
    id: id(index),
    frame: { x, y, width, height },
    opacity: 1,
    protected: false,
  })
  const label = (index: number, text: string, y: number): ArtLayer => ({
    ...layer(index, 64, y, 952, 32),
    kind: 'text',
    source: 'literal',
    text,
    paragraphs: [],
    fontSize: 22,
    lineHeight: 1.2,
    weight: '800',
    align: 'left',
    color: '#194bd7',
    protected: true,
  })
  const layers: ArtLayer[] = [
    label(1, CDC_ART_LABELS[0], story ? 180 : 44),
    label(2, CDC_ART_LABELS[1], height - bottom + 48),
  ]
  const evidence = ['cdc-evidence-v1', 'cdc-comparison-v1'].includes(recipe)
  const count = recipe === 'cdc-comparison-v1' ? 2 : 1
  const images = options.imageAssetIds.slice(0, count)
  if (evidence && images.length !== count)
    throw new Error(`A receita precisa de ${count} imagem(ns) de referência confirmada(s)`)
  const withImage = recipe !== 'cdc-quote-v1' && images.length > 0
  const textHeight = withImage ? Math.round(contentHeight * 0.4) : contentHeight
  if (recipe === 'cdc-quote-v1')
    layers.push({
      ...layer(3, 64, top, 952, contentHeight),
      kind: 'shape',
      shape: 'rectangle',
      color: '#ffffff',
      radius: 24,
    })
  const inset = recipe === 'cdc-quote-v1' ? 40 : 0
  layers.push({
    ...layer(4, 64 + inset, top + inset, 952 - inset * 2, textHeight - inset * 2),
    kind: 'text',
    source: 'body',
    text: '',
    paragraphs: [],
    fontSize:
      options.body.length > 230
        ? 44
        : options.body.length > 130 || (withImage && /\n/.test(options.body))
          ? 54
          : 72,
    lineHeight: 1.16,
    weight: '800',
    align: 'left',
    color: '#172a46',
  })
  if (withImage) {
    const imageY = top + textHeight + 28,
      imageWidth = count === 2 ? 462 : 952
    for (const [index, assetId] of images.entries())
      layers.push({
        ...layer(
          10 + index,
          64 + index * (imageWidth + 28),
          imageY,
          imageWidth,
          height - bottom - imageY,
        ),
        kind: 'image',
        assetId,
        fit: 'contain',
        radius: 24,
      })
  }
  layers.push({
    ...layer(20, 0, height - 8, 1080, 8),
    kind: 'shape',
    shape: 'rectangle',
    color: '#ffdb56',
    radius: 0,
    protected: true,
  })
  return artSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-art-v1',
    designRecipeId: recipe,
    width: 1080,
    height,
    background: '#fffcf4',
    fontAssetId: null,
    layers,
  })
}
