import { NextResponse } from 'next/server'
import { z } from 'zod'
import { saveVideoPosition } from '@/server/members'

const BodySchema = z.object({
  courseSlug: z.string().min(1).max(200),
  positionSeconds: z.number().int().min(0).max(100_000),
})

/**
 * Persiste a posição do vídeo (throttled no client). Aceita também o corpo do
 * `navigator.sendBeacon` (que pode chegar como text/plain) — por isso o parse é
 * tolerante a content-type. POST (beacon não faz PUT); o BFF repassa como PUT.
 */
export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await ctx.params
  let parsed: z.infer<typeof BodySchema>
  try {
    parsed = BodySchema.parse(JSON.parse(await req.text()))
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Corpo inválido' } },
      { status: 400 },
    )
  }
  const { status, body } = await saveVideoPosition(
    parsed.courseSlug,
    lessonId,
    parsed.positionSeconds,
  )
  return NextResponse.json(body ?? { ok: status === 200 }, { status })
}
