import { z } from 'zod'

export const UUID = z.uuid()
export const HASH = z.string().regex(/^[a-f0-9]{64}$/)
const identifier = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-zA-Z0-9_./:#-]+$/)
const path = z
  .string()
  .max(220)
  .regex(/^\/[a-z0-9/_-]*$/)
export const BrowserEvent = z
  .object({
    id: UUID,
    pageViewId: UUID,
    name: z.enum([
      'page_view',
      'section_view',
      'element_view',
      'click',
      'details_open',
      'image_zoom',
      'video_start',
      'video_progress',
      'quiz_question_view',
      'form_error',
    ]),
    path,
    revision: HASH,
    at: z.iso.datetime(),
    elementId: identifier.optional(),
    label: z.string().max(120).optional(),
    sectionId: identifier.optional(),
    destination: z
      .string()
      .max(220)
      .regex(/^\/[a-z0-9/_-]*(#[a-zA-Z0-9_-]+)?$/)
      .optional(),
    quizDefinitionId: HASH.optional(),
    questionId: identifier.optional(),
    quizAttemptId: UUID.optional(),
    position: z.number().int().min(1).max(100).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    errorCode: z.enum(['validation', 'network', 'session', 'unavailable']).optional(),
    viewport: z.number().int().min(240).max(3840).optional(),
    x: z.number().int().min(0).max(10000).optional(),
    y: z.number().int().min(0).max(10000).optional(),
  })
  .strict()

export const EventBatch = z
  .object({ sessionId: UUID, events: z.array(BrowserEvent).min(1).max(40) })
  .strict()
export const BootstrapBody = z
  .object({
    path,
    quizDefinitionId: HASH.optional(),
    attribution: z.unknown().optional(),
    device: z.enum(['mobile', 'tablet', 'desktop']),
    referrerHost: z
      .string()
      .max(150)
      .regex(/^[a-z0-9.-]+$/)
      .optional(),
  })
  .strict()
export const ConsentBody = z.object({ choice: z.enum(['accepted', 'rejected']) }).strict()

/** Enforce byte limit before JSON parsing, including chunked requests. */
export async function analyticsJson(request: Request): Promise<unknown> {
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 48 * 1024) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}
