import { bffAnswer } from '~/lib/bff'
import { staffAccess } from '~/server/access'
import { gatewayFetch, paths } from '~/server/gateway'
import { studioContextOf } from '~/server/lessons'

export const dynamic = 'force-dynamic'
// A conferência de um projeto no servidor leva até 165 s (a mesma folga do Kids).
export const maxDuration = 180

type Ctx = { params: Promise<{ lessonId: string; rest: string[] }> }

async function answer(req: Request, ctx: Ctx): Promise<Response> {
  const access = await staffAccess()
  if (!access) return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  const { lessonId, rest } = await ctx.params
  const result = bffAnswer(req.method, rest)
  if (result.kind === 'json') return Response.json(result.body, { status: result.status })
  if (result.kind === 'studio-context') {
    const context = studioContextOf(lessonId, result.blockId)
    return context
      ? Response.json(context)
      : Response.json(
          { error: { code: 'LESSON_NOT_OPEN', message: 'Abra a aula de novo no palco.' } },
          { status: 409 },
        )
  }
  const body = await req.json().catch(() => undefined)
  const res = await gatewayFetch(paths.projectCheck(lessonId, result.sectionId), {
    method: 'POST',
    body,
    access: access.token,
    timeoutMs: 165_000,
  })
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  })
}

export const GET = answer
export const POST = answer
