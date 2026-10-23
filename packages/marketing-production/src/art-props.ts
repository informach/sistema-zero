import { artSchema, idSchema } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
export const artPropsSchema = z
  .object({
    composition: artSchema,
    body: z.string().max(100000),
    title: z.string().max(300),
    assets: z.record(idSchema, z.string().url()),
  })
  .strict()
export type ArtProps = z.infer<typeof artPropsSchema>
export const defaultArt: ArtProps = {
  body: 'Uma ideia ganha forma.',
  title: 'Composição editorial',
  assets: {},
  composition: {
    schemaVersion: 1,
    recipeVersion: 'marketing-art-v1',
    width: 1080,
    height: 1350,
    background: '#fffcf4',
    fontAssetId: null,
    layers: [
      {
        id: '0598cad4-2f6f-4615-a141-6065f651ed34',
        kind: 'text',
        frame: { x: 64, y: 140, width: 952, height: 1060 },
        source: 'body',
        text: '',
        paragraphs: [],
        fontSize: 64,
        lineHeight: 1.2,
        weight: '800',
        align: 'left',
        color: '#172a46',
        opacity: 1,
        protected: false,
      },
    ],
  },
}
