import type { ArtComposition } from '@sistemazero/marketing-contracts'
/** A starter recipe, subsequently editable by AI. Public text is bound to copy. */
export function imageRecipe(imageAssetId: string, format: string, body: string): ArtComposition {
  const height = ['story', 'reel'].includes(format) ? 1920 : 1350,
    width = 1080
  const textHeight = Math.round(height * 0.39),
    imageTop = 64 + textHeight + 40
  return {
    schemaVersion: 1,
    recipeVersion: 'marketing-art-v1',
    width,
    height,
    background: '#fffcf4',
    fontAssetId: null,
    layers: [
      {
        id: '0598cad4-2f6f-4615-a141-6065f651ed34',
        kind: 'text',
        frame: { x: 64, y: 64, width: 952, height: textHeight },
        source: 'body',
        text: '',
        paragraphs: [],
        fontSize: body.length > 220 ? 42 : body.length > 130 ? 54 : 68,
        lineHeight: 1.2,
        weight: '800',
        align: 'left',
        color: '#172a46',
        opacity: 1,
        protected: false,
      },
      {
        id: imageAssetId,
        kind: 'image',
        assetId: imageAssetId,
        frame: { x: 64, y: imageTop, width: 952, height: height - imageTop - 64 },
        radius: 24,
        fit: 'cover',
        opacity: 1,
        protected: false,
      },
    ],
  }
}
