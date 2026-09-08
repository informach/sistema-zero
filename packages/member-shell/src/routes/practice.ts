import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type { CallOpts, GatewayResponse } from '../server/gateway'
import type { SessionModule } from '../server/session'

const UUID = z.uuid()
const Slug = z.string().min(1).max(200)
const Start = z.strictObject({ id: UUID, courseSlug: Slug, lessonId: UUID, blockId: UUID })
const Answers = z.strictObject({
  answers: z.record(z.string().min(1).max(100), z.array(z.string().min(1).max(100)).min(1).max(50)),
})
const invalid = () =>
  NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Entrada inválida.' } },
    { status: 400 },
  )
function upstream(result: GatewayResponse) {
  return NextResponse.json(
    result.body ?? {
      error: { code: 'PRACTICE_UNAVAILABLE', message: 'Não conseguimos abrir a prática agora.' },
    },
    { status: result.body == null && result.status === 200 ? 502 : result.status },
  )
}

export function createPracticeRoutes(deps: {
  gateway: { gatewayFetch(path: string, opts?: CallOpts): Promise<GatewayResponse> }
  session: Pick<SessionModule, 'getSession'>
  audience: 'kids' | 'adult'
}) {
  async function guard(req: Request, writable = false) {
    const user = await deps.session.getSession()
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
    if (deps.audience !== 'kids' || !user.activeProfile)
      return NextResponse.json({ error: { code: 'PROFILE_REQUIRED' } }, { status: 403 })
    if (writable && isReadonlyImpersonation(user))
      return NextResponse.json({ error: { code: 'IMPERSONATION_READONLY' } }, { status: 403 })
    if (req.headers.get('x-sz-viewer') !== user.id)
      return NextResponse.json(
        {
          error: {
            code: 'VIEWER_CHANGED',
            message: 'O perfil mudou. Atualize esta página antes de continuar a prática.',
          },
        },
        { status: 409 },
      )
    return null
  }
  return {
    practiceTopics: {
      GET: async (req: Request) => {
        const denied = await guard(req)
        if (denied) return denied
        const parsed = Slug.safeParse(new URL(req.url).searchParams.get('courseSlug'))
        if (!parsed.success) return invalid()
        return upstream(
          await deps.gateway.gatewayFetch('/members/practice/topics', {
            query: { courseSlug: parsed.data },
          }),
        )
      },
    },
    practiceSessions: {
      GET: async (req: Request) => {
        const denied = await guard(req)
        if (denied) return denied
        return upstream(await deps.gateway.gatewayFetch('/members/practice/sessions'))
      },
      POST: async (req: Request) => {
        const denied = await guard(req, true)
        if (denied) return denied
        const parsed = Start.safeParse(await req.json().catch(() => null))
        if (!parsed.success) return invalid()
        return upstream(
          await deps.gateway.gatewayFetch('/members/practice/sessions', {
            method: 'POST',
            body: parsed.data,
          }),
        )
      },
    },
    practiceSession: {
      GET: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const denied = await guard(req)
        if (denied) return denied
        const parsed = UUID.safeParse((await ctx.params).id)
        if (!parsed.success) return invalid()
        return upstream(
          await deps.gateway.gatewayFetch(`/members/practice/sessions/${parsed.data}`),
        )
      },
    },
    practiceAnswers: {
      POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const denied = await guard(req, true)
        if (denied) return denied
        const id = UUID.safeParse((await ctx.params).id)
        const parsed = Answers.safeParse(await req.json().catch(() => null))
        if (!id.success || !parsed.success) return invalid()
        return upstream(
          await deps.gateway.gatewayFetch(`/members/practice/sessions/${id.data}/answers`, {
            method: 'POST',
            body: parsed.data,
          }),
        )
      },
    },
  }
}
