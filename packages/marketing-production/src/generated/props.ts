import { compositionInputSchema, idSchema } from '@sistemazero/marketing-contracts'
import { z } from 'zod'

/** Internal render-worker input. Never exposed as executable input in the app Player. */
export const generatedPropsSchema = z
  .object({
    input: compositionInputSchema,
    javascript: z.string().min(1).max(128000),
    assets: z.record(idSchema, z.string().url()),
  })
  .strict()
export type GeneratedProps = z.infer<typeof generatedPropsSchema>
export const defaultGenerated: GeneratedProps = {
  input: {
    schemaVersion: 1,
    width: 1080,
    height: 1920,
    fps: { numerator: 30, denominator: 1 },
    durationInFrames: 90,
    title: '',
    body: '',
    requiredText: [],
    assetIds: [],
    fontAssetId: null,
    background: '#172a46',
    accent: '#ffdb56',
  },
  javascript: 'exports.default = function GeneratedComposition(){return null}',
  assets: {},
}
