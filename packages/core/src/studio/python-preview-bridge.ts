import { z } from 'zod'

/** Permissions for the trusted service launcher only; learner execution remains opaque. */
export const STUDIO_PYTHON_PREVIEW_SANDBOX =
  'allow-scripts allow-same-origin allow-downloads allow-forms'

/** Status only, from the trusted outer launcher. Learner code never receives this channel. */
export const StudioPythonPreviewMessageSchema = z.strictObject({
  type: z.literal('studio-python-preview'),
  version: z.literal(1),
  session: z.string().uuid(),
  previewId: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(['loading', 'ready', 'unavailable']),
})

/** Host/outer-launcher channel only. Opaque learner frames have no authority here. */
export const StudioPythonPreviewAudioReadySchema = z.strictObject({
  type: z.literal('studio-python-preview-audio-ready'),
  version: z.literal(1),
  session: z.string().uuid(),
  previewId: z.string().regex(/^[a-f0-9]{64}$/),
  requestId: z.string().uuid(),
})
export const StudioPythonPreviewAudioSchema = z.strictObject({
  type: z.literal('studio-python-preview-audio'),
  version: z.literal(1),
  session: z.string().uuid(),
  previewId: z.string().regex(/^[a-f0-9]{64}$/),
  requestId: z.string().uuid(),
  sequence: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  muted: z.boolean(),
})
