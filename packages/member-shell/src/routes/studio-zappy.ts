import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveStudioTier } from '../lib/studio-tier'
import { consumeAiQuotaStrict } from '../server/ai-quota'
import type { MembersClient } from '../server/clients'
import type { SessionModule } from '../server/session'
import { isStudioZappyPilotAllowed } from '../server/zappy-access'
import {
  answerPreparedStudioZappy,
  deterministicZappyReply,
  deterministicZappySafetyReply,
  normalizeZappySearchQuery,
  prepareStudioZappyAnswer,
  type ZappyContextInput,
} from '../server/zappy-ai'
import { redactZappySensitiveText } from '../server/zappy-safety'

const PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const QuestionBody = z.object({
  projectId: z.string().regex(PROJECT_ID),
  clientMessageId: z.string().uuid(),
  question: z.string().trim().min(1).max(1000),
  context: z.object({
    projectId: z.string().regex(PROJECT_ID),
    mode: z.enum(['blocks', 'bridge', 'code']),
    kind: z.enum(['classic', 'pro']),
    blocks: z
      .array(
        z.object({
          id: z.string().min(1).max(128),
          type: z.string().min(1).max(128),
          parentId: z.string().max(128).optional(),
          input: z.string().max(80).optional(),
          topLevel: z.boolean(),
        }),
      )
      .max(600),
    installedExtensions: z.array(z.string().min(1).max(128)).max(20),
    selectedBlockId: z.string().max(128).nullable(),
    lastError: z.string().max(2000).nullable(),
    code: z
      .array(z.object({ path: z.string().min(1).max(240), content: z.string().max(20000) }))
      .max(24)
      .optional(),
  }),
})
const FeedbackBody = z.object({
  projectId: z.string().regex(PROJECT_ID),
  responseId: z.string().uuid(),
  useful: z.boolean(),
})

function error(code: string, status: number, message?: string): NextResponse {
  return NextResponse.json({ error: { code, ...(message ? { message } : {}) } }, { status })
}

async function hasStudioAccess(members: MembersClient): Promise<boolean> {
  const result = await members.checkStudioAccess()
  return result.status === 200 && result.body?.access?.['estudio-completo'] === true
}

function safeProfileName(value: string | undefined): string {
  const normalized = Array.from(value ?? '')
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join('')
    .trim()
    .slice(0, 40)
  return normalized || 'criador'
}

function historyQuery(req: Request): { projectId: string; before?: string } | null {
  const params = new URL(req.url).searchParams
  const projectId = params.get('projectId') ?? ''
  const before = params.get('before') ?? undefined
  if (!PROJECT_ID.test(projectId) || (before && !z.string().uuid().safeParse(before).success)) {
    return null
  }
  return { projectId, ...(before ? { before } : {}) }
}

function outcomeFor(response: { scope: string }) {
  if (response.scope === 'needs-context') return 'needs-context' as const
  if (['redirect-pensa', 'redirect-pinta', 'unsupported'].includes(response.scope)) {
    return 'refusal' as const
  }
  return 'normal' as const
}

function signedActor(user: Awaited<ReturnType<SessionModule['getSession']>>) {
  if (!user) throw new Error('Sessão ausente')
  return {
    userId: user.id,
    accountId: user.activeProfile?.accountId ?? user.id,
    privileged: user.status === 'active' && ['superadmin', 'admin', 'staff'].includes(user.role),
  }
}

type ZappyOutcome = 'normal' | 'refusal' | 'needs-context' | 'quota' | 'error'

export function createStudioZappyRoutes(deps: { members: MembersClient; session: SessionModule }) {
  const { members, session: sessions } = deps

  const studioZappyHistory = {
    GET: async (req: Request) => {
      const user = await sessions.getSession()
      const query = historyQuery(req)
      if (!user) return error('UNAUTHORIZED', 401)
      if (!isStudioZappyPilotAllowed(user)) return error('ZAPPY_NOT_ENABLED', 403)
      if (!query) return error('INVALID_INPUT', 400)
      if (!(await hasStudioAccess(members))) return error('FORBIDDEN', 403)

      const result = await members.zappyHistory(query.projectId, query.before)
      return NextResponse.json(result.body ?? { messages: [], nextCursor: null }, {
        status: result.status,
      })
    },
    DELETE: async (req: Request) => {
      const user = await sessions.getSession()
      const query = historyQuery(req)
      if (!user) return error('UNAUTHORIZED', 401)
      if (user.act) return error('IMPERSONATION_READONLY', 403)
      if (!isStudioZappyPilotAllowed(user)) return error('ZAPPY_NOT_ENABLED', 403)
      if (!query) return error('INVALID_INPUT', 400)
      if (!(await hasStudioAccess(members))) return error('FORBIDDEN', 403)
      const result = await members.zappyDeleteHistory(query.projectId)
      return NextResponse.json(result.body ?? { ok: false }, { status: result.status })
    },
  }

  const studioZappyMessage = {
    POST: async (req: Request) => {
      const startedAt = Date.now()
      const user = await sessions.getSession()
      if (!user) return error('UNAUTHORIZED', 401)
      if (user.act) return error('IMPERSONATION_READONLY', 403)
      if (!isStudioZappyPilotAllowed(user)) return error('ZAPPY_NOT_ENABLED', 403)
      let raw: unknown
      try {
        raw = await req.json()
      } catch {
        return error('INVALID_INPUT', 400)
      }
      const parsed = QuestionBody.safeParse(raw)
      if (!parsed.success || parsed.data.projectId !== parsed.data.context.projectId) {
        return error('INVALID_INPUT', 400)
      }
      if (!(await hasStudioAccess(members))) return error('FORBIDDEN', 403)
      const safeQuestion = redactZappySensitiveText(parsed.data.question)

      // Rank/modos/extensões vêm do members + catálogo da carreira, nunca do cliente.
      const gamification = await members.getGamification()
      if (gamification.status !== 200) return error('ZAPPY_UNAVAILABLE', 503)
      const tier = resolveStudioTier(gamification.body?.level?.slug ?? 'noob', user.role)
      const context = parsed.data.context as ZappyContextInput
      if (!tier.allowedModes.includes(context.mode)) return error('FORBIDDEN_MODE', 403)
      if (context.kind === 'pro' && !tier.pro) return error('FORBIDDEN_MODE', 403)
      if (context.installedExtensions.some((id) => !tier.allowedExtensions.includes(id))) {
        return error('FORBIDDEN_EXTENSION', 403)
      }

      const reserved = await members.zappyReserveQuestion({
        actor: signedActor(user),
        projectId: parsed.data.projectId,
        clientMessageId: parsed.data.clientMessageId,
        question: safeQuestion.text,
      })
      if (reserved.status !== 200 || !reserved.body) {
        return NextResponse.json(reserved.body ?? { error: { code: 'ZAPPY_UNAVAILABLE' } }, {
          status: reserved.status,
        })
      }
      // Idempotência: repetição concluída retorna a MESMA resposta sem rate/quota/modelo.
      if (!reserved.body.created) {
        if (reserved.body.rateLimited) return error('RATE_LIMITED', 429)
        return reserved.body.response
          ? NextResponse.json(reserved.body.response)
          : error('ZAPPY_IN_PROGRESS', 409)
      }
      const questionId = reserved.body.questionId
      if (!questionId) return error('ZAPPY_UNAVAILABLE', 503)

      const complete = async (
        response: NonNullable<typeof reserved.body.response>,
        outcome: ZappyOutcome = outcomeFor(response),
      ) => {
        const saved = await members.zappyCompleteQuestion(questionId, {
          actor: signedActor(user),
          projectId: parsed.data.projectId,
          latencyMs: Date.now() - startedAt,
          response,
          outcome,
        })
        return NextResponse.json(saved.body ?? response, {
          status: saved.status === 200 ? 200 : 502,
        })
      }

      const safetyReply = deterministicZappySafetyReply(parsed.data.question, safeQuestion.hadPii)
      if (safetyReply) return complete(safetyReply)

      const fixed = deterministicZappyReply(safeQuestion.text)
      if (fixed) return complete(fixed)

      let knowledge: Awaited<ReturnType<typeof members.zappyKnowledgeSearch>>['body']
      try {
        const searchQuery = await normalizeZappySearchQuery(safeQuestion.text)
        const knowledgeResult = await members.zappyKnowledgeSearch(searchQuery, 5)
        if (knowledgeResult.status !== 200 || !knowledgeResult.body) {
          throw new Error(`Base do Zappy indisponível (${knowledgeResult.status})`)
        }
        knowledge = knowledgeResult.body
      } catch (cause) {
        console.error('[studio-zappy] falha ao recuperar conhecimento', { cause })
        return complete(
          {
            id: crypto.randomUUID(),
            text: 'Não consegui consultar as aulas agora. Rode o jogo ou selecione o bloco e tente novamente.',
            scope: 'needs-context',
            blockReferences: [],
            createdAt: new Date().toISOString(),
          },
          'error',
        )
      }

      let prepared: ReturnType<typeof prepareStudioZappyAnswer>
      try {
        prepared = prepareStudioZappyAnswer({
          question: safeQuestion.text,
          context: {
            ...context,
            // Modo Blocos nunca aceita código, mesmo se o cliente forjado enviar.
            ...(context.mode === 'blocks' ? { code: undefined } : {}),
            selectedBlockId: context.blocks.some((block) => block.id === context.selectedBlockId)
              ? context.selectedBlockId
              : null,
          },
          tier,
          profileName: safeProfileName(user.activeProfile?.name),
          knowledge: knowledge.hits,
        })
      } catch (cause) {
        console.error('[studio-zappy] falha ao preparar resposta', { cause })
        return complete(
          {
            id: crypto.randomUUID(),
            text: 'Não consegui preparar essa explicação agora. Rode o jogo ou selecione o bloco e tente novamente.',
            scope: 'needs-context',
            blockReferences: [],
            createdAt: new Date().toISOString(),
          },
          'error',
        )
      }

      const quota = await consumeAiQuotaStrict(members, 'studio-zappy')
      if (!quota.allowed) {
        const response = deterministicZappyReply('assunto externo') ?? {
          id: crypto.randomUUID(),
          text: 'O Zappy descansa agora. Tente novamente mais tarde.',
          scope: 'unsupported' as const,
          blockReferences: [],
          createdAt: new Date().toISOString(),
        }
        if (quota.scope === 'unavailable') {
          response.text = 'O Zappy não conseguiu acordar agora. Tente novamente em alguns minutos.'
          return complete(response, 'error')
        }
        response.text =
          quota.scope === 'day'
            ? 'Por hoje a gente já estudou bastante! Amanhã tem mais 🤖'
            : 'A ajuda deste mês acabou. No mês que vem tem mais 🤖'
        return complete(response, 'quota')
      }

      try {
        const response = await answerPreparedStudioZappy(prepared)
        return complete(response)
      } catch (cause) {
        console.error('[studio-zappy] falha ao responder', { cause })
        return complete(
          {
            id: crypto.randomUUID(),
            text: 'Não consegui pensar nessa agora. Rode o jogo ou selecione o bloco e tente de novo.',
            scope: 'needs-context',
            blockReferences: [],
            createdAt: new Date().toISOString(),
          },
          'error',
        )
      }
    },
  }

  const studioZappyFeedback = {
    POST: async (req: Request) => {
      const user = await sessions.getSession()
      if (!user) return error('UNAUTHORIZED', 401)
      if (user.act) return error('IMPERSONATION_READONLY', 403)
      if (!isStudioZappyPilotAllowed(user)) return error('ZAPPY_NOT_ENABLED', 403)
      let raw: unknown
      try {
        raw = await req.json()
      } catch {
        return error('INVALID_INPUT', 400)
      }
      const parsed = FeedbackBody.safeParse(raw)
      if (!parsed.success) return error('INVALID_INPUT', 400)
      if (!(await hasStudioAccess(members))) return error('FORBIDDEN', 403)
      const result = await members.zappyFeedback(parsed.data)
      return NextResponse.json(result.body ?? { ok: false }, { status: result.status })
    },
  }

  return { studioZappyHistory, studioZappyMessage, studioZappyFeedback }
}
