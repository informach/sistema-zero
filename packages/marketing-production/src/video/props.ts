import { idSchema, videoSchema } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
export const timelinePropsSchema = z
  .object({ timeline: videoSchema, assets: z.record(idSchema, z.string().url()) })
  .strict()
export type TimelineProps = z.infer<typeof timelinePropsSchema>
export const defaultTimeline: TimelineProps = {
  assets: {},
  timeline: videoSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-timeline-v1',
    width: 1080,
    height: 1920,
    fps: { numerator: 30, denominator: 1 },
    durationInFrames: 150,
    tracks: [{ id: '45c1ddae-301d-4bca-b275-c2240f0f2e40', kind: 'visual', muted: false }],
    clips: [],
    captions: [],
    background: '#172a46',
    accent: '#ffdb56',
  }),
}
