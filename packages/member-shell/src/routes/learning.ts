import { isLearningAnswers } from '@sistemazero/core/learning'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type { CallOpts, GatewayResponse } from '../server/gateway'
import type { SessionModule } from '../server/session'

const invalidInput = () =>
  NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Dados da atividade inválidos.' } },
    { status: 400 },
  )

export function createLearningRoutes({
  session,
  gateway,
}: {
  session: Pick<SessionModule, 'getSession'>
  gateway: { gatewayFetch: (path: string, opts: CallOpts) => Promise<GatewayResponse> }
}) {
  const learningFields = {
    revision: z.string().min(1).max(32),
    answers: z.custom<import('@sistemazero/core/learning').LearningAnswers>(isLearningAnswers),
    hintsUsed: z.number().int().min(0).max(10),
  }
  const learningSchemas = {
    'project-check': z.object({ revision: z.uuid(), project: z.unknown() }).strict(),
    navigation: z.object({ sectionId: z.uuid() }).strict(),
    'section-help': z
      .object({
        sectionId: z.uuid(),
        body: z.string().trim().min(1).max(8000),
        requestId: z.uuid().optional(),
      })
      .strict(),
    'learning-progress': z
      .object({ ...learningFields, positionSeconds: z.number().int().min(0).max(86400).nullable() })
      .strict(),
    'learning-attempts': z.object({ ...learningFields, id: z.uuid() }).strict(),
  }
  function learningHandler(endpoint: keyof typeof learningSchemas, method: 'POST' | 'PUT') {
    return async (
      req: Request,
      ctx: { params: Promise<{ lessonId: string; blockId?: string; sectionId?: string }> },
    ) => {
      const user = await session.getSession()
      if (!user)
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada.' } },
          { status: 401 },
        )
      if (isReadonlyImpersonation(user))
        return NextResponse.json(
          {
            error: {
              code: 'IMPERSONATION_READONLY',
              message: 'Sessão de suporte é somente-leitura.',
            },
          },
          { status: 403 },
        )
      if (user.status !== 'active')
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Conta inativa.' } },
          { status: 403 },
        )
      if (req.headers.get('x-sz-viewer') !== user.id)
        return NextResponse.json(
          {
            error: {
              code: 'VIEWER_CHANGED',
              message: 'O perfil mudou. Abra a aula novamente para continuar no perfil atual.',
            },
          },
          { status: 409 },
        )
      const params = await ctx.params
      const needsSection = endpoint === 'project-check'
      const needsBlock = endpoint === 'learning-progress' || endpoint === 'learning-attempts'
      if (
        !z.uuid().safeParse(params.lessonId).success ||
        (needsSection && !z.uuid().safeParse(params.sectionId).success) ||
        (needsBlock && !z.uuid().safeParse(params.blockId).success)
      )
        return invalidInput()
      const raw = await req.text()
      if (new TextEncoder().encode(raw).length > (needsSection ? 2 * 1024 * 1024 : 64000))
        return NextResponse.json(
          { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Respostas excedem o limite.' } },
          { status: 413 },
        )
      let input: unknown
      try {
        input = JSON.parse(raw)
      } catch {
        return invalidInput()
      }
      const parsed = learningSchemas[endpoint].safeParse(input)
      if (!parsed.success) return invalidInput()
      const blockPath = needsBlock
        ? `/blocks/${encodeURIComponent(params.blockId ?? '')}`
        : needsSection
          ? `/sections/${encodeURIComponent(params.sectionId ?? '')}`
          : ''
      const { status, body } = await gateway.gatewayFetch(
        `/members/lessons/${encodeURIComponent(params.lessonId)}${blockPath}/${endpoint}`,
        { method, body: parsed.data },
      )
      return NextResponse.json(body ?? { ok: status === 200 }, {
        status,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }
  }
  const learningNavigation = { POST: learningHandler('navigation', 'PUT') }
  const learningProgress = { POST: learningHandler('learning-progress', 'PUT') }
  const learningAttempt = { POST: learningHandler('learning-attempts', 'POST') }
  const learningHelp = { POST: learningHandler('section-help', 'POST') }

  const learningProjectCheck = { POST: learningHandler('project-check', 'POST') }
  return {
    learningNavigation,
    learningProgress,
    learningAttempt,
    learningHelp,
    learningProjectCheck,
  }
}
