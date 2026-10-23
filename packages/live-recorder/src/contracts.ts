import { z } from 'zod'

export const recordingCommand = z.object({
  jobId: z.uuid(),
  occurrenceId: z.uuid(),
  generation: z.number().int().positive(),
  commandId: z.uuid(),
  commandVersion: z.number().int().positive(),
  desiredState: z.enum(['recording', 'paused', 'stopped']),
  leaseEndsAt: z.iso.datetime(),
  hardEndsAt: z.iso.datetime(),
  sources: z
    .array(
      z.object({
        role: z.literal('teacher'),
        kind: z.enum(['microphone', 'camera', 'demo']),
        sessionId: z.string().min(1).max(256),
        trackName: z.string().min(1).max(256),
      }),
    )
    .max(3)
    .refine(
      (sources) => new Set(sources.map((source) => source.sessionId)).size <= 1,
      'Recording sources must belong to one authorized teacher connection',
    ),
})
export type RecordingCommand = z.infer<typeof recordingCommand>
export type RecordingSource = RecordingCommand['sources'][number]
export interface RecordingSegment {
  sequence: number
  key: string
  checksum: string
  bytes: number
  startsAt: string
  endsAt: string
  durationMs: number
}
export interface RecordingManifest {
  version: 1
  eventSequence: number
  jobId: string
  occurrenceId: string
  generation: number
  state: 'starting' | 'recording' | 'paused' | 'processing' | 'review' | 'failed'
  segments: RecordingSegment[]
  gaps: { at: string; reason: 'pause' | 'source-change' | 'failure' }[]
  replayKey: string | null
  error: string | null
}
