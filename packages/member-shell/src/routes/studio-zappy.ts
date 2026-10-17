import 'server-only'
import type { StudioAiReservation } from '@sistemazero/core/ai-credits'
import { isStudioTutorSourcePath, STUDIO_TUTOR_SOURCE_HASH_RE } from '@sistemazero/core/studio'
import { STUDIO_PRO_ASSISTANCE_LIMITS } from '@sistemazero/core/studio/pro-assistance'
import { studioTutorContextHint } from '@sistemazero/studio/tutor-mode'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { RequestBodyTooLargeError, readBoundedJson } from '../lib/read-bounded-json'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { AiCreditsView } from '../lib/types'
import type { MembersClient } from '../server/clients'
import { loadPensaContext } from '../server/pensa/context'
import { pensaStudioTutorMission } from '../server/pensa/missions'
import { redactPensaText } from '../server/pensa/privacy'
import type { SessionModule } from '../server/session'
import { createStudioAiTransport } from '../server/studio-ai-transport'
import { earnedStudioTier } from '../server/studio-unlocks'
import { isStudioZappyAllowed, isStudioZappyAllowedForRequest } from '../server/zappy-access'
import {
  answerPreparedStudioZappy,
  deterministicZappyReply,
  deterministicZappySafetyReply,
  normalizeZappySearchQuery,
  prepareStudioZappyAnswer,
  studioZappyAiBudget,
  type ZappyContextInput,
} from '../server/zappy-ai'
import { redactZappySensitiveText } from '../server/zappy-safety'

const PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const SourcePath = z.string().min(1).max(240).refine(isStudioTutorSourcePath)
const SourceHash = z.string().regex(STUDIO_TUTOR_SOURCE_HASH_RE)
const SourceLine = z.number().int().min(1).max(10_000_000)
const Excerpt = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    sourceHash: SourceHash,
    startLine: SourceLine,
    endLine: SourceLine,
    mapping: z.enum(['lines', 'file']),
    truncated: z.boolean(),
    documentVersion: z.number().int().nonnegative().optional(),
    contextDigest: SourceHash.optional(),
  })
  .refine((value) => value.endLine >= value.startLine)
const QuestionBody = z.object({
  projectId: z.string().regex(PROJECT_ID),
  clientMessageId: z.string().uuid(),
  /**
   * A missão do Pensa aberta pelo handoff `?missao=`, opcional. Só vale para o plano atual,
   * o Estúdio e quem programa. Sem referência, usa a próxima ação calculada pelo servidor.
   */
  pensaMissionId: z.string().uuid().optional(),
  question: z.string().trim().min(1).max(1000),
  context: z.object({
    projectId: z.string().regex(PROJECT_ID),
    mode: z.enum(['blocks', 'bridge', 'code']),
    kind: z.enum(['classic', 'pro']),
    pro: z
      .object({
        revision: z.number().int().nonnegative(),
        decisions: z
          .object({
            version: z.literal(1),
            summary: z.string().max(STUDIO_PRO_ASSISTANCE_LIMITS.decisionSummaryChars),
          })
          .strict()
          .optional(),
        templateId: z.string().max(64).optional(),
        activeFile: z.string().max(240).optional(),
        intent: z.enum(['explain', 'investigate']).optional(),
        synchronization: z.enum(['ready', 'conflict']).optional(),
        selection: z
          .object({
            path: SourcePath,
            sourceHash: SourceHash,
            documentVersion: z.number().int().nonnegative(),
            startLine: SourceLine,
            endLine: SourceLine,
            startColumn: SourceLine,
            endColumn: SourceLine,
          })
          .refine(
            (value) =>
              value.endLine > value.startLine ||
              (value.endLine === value.startLine && value.endColumn >= value.startColumn),
          )
          .optional(),
        diagnostics: z
          .array(
            z.object({
              path: z.string().max(240),
              code: z.number().int(),
              line: z.number().int().positive(),
              message: z.string().max(600),
              source: z.literal('typescript').optional(),
              sourceHash: SourceHash.optional(),
              documentVersion: z.number().int().nonnegative().optional(),
            }),
          )
          .max(20)
          .optional(),
        installation: z.enum(['unavailable', 'indexing', 'ready', 'error']).optional(),
        installedPackages: z
          .array(z.object({ name: z.string().max(160), version: z.string().max(80) }))
          .max(40)
          .optional(),
      })
      .optional(),
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
    // ⚠️ Campo do contexto que NÃO estiver declarado aqui é DESCARTADO em
    // silêncio pelo Zod (`z.object` sem `.passthrough()`). Foi assim que o
    // comportamento/rascunhos/avisos quase foram para produção mortos: os testes
    // chamavam o montador de prompt direto e não passavam por esta borda.
    behavior: z
      .array(
        z.object({
          area: z.enum(['start', 'events', 'loops']),
          depth: z.number().int().min(0).max(12),
          type: z.string().min(1).max(128),
          blockId: z.string().min(1).max(128).optional(),
          values: z
            .array(z.object({ name: z.string().min(1).max(40), value: z.string().max(80) }))
            .max(8),
        }),
      )
      .max(160)
      .optional(),
    draftBlockIds: z.array(z.string().min(1).max(128)).max(60).optional(),
    semanticIssues: z
      .array(
        z.object({ blockId: z.string().min(1).max(128).optional(), message: z.string().max(300) }),
      )
      .max(10)
      .optional(),
    code: z
      .array(
        z.object({ path: SourcePath, content: z.string().max(20000), excerpt: Excerpt.optional() }),
      )
      .max(24)
      .optional(),
  }),
})
const FeedbackBody = z.object({
  projectId: z.string().regex(PROJECT_ID),
  responseId: z.string().uuid(),
  useful: z.boolean(),
})

const QUESTION_BODY_MAX_BYTES = 1024 * 1024
const FEEDBACK_BODY_MAX_BYTES = 16 * 1024

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

type ZappyOutcome = 'normal' | 'refusal' | 'needs-context' | 'quota' | 'error' | 'rejected'

export function createStudioZappyRoutes(deps: { members: MembersClient; session: SessionModule }) {
  const { members, session: sessions } = deps

  const studioZappyHistory = {
    GET: async (req: Request) => {
      const user = await sessions.getSession()
      const query = historyQuery(req)
      if (!user) return error('UNAUTHORIZED', 401)
      if (!(await isStudioZappyAllowedForRequest(members, user)))
        return error('ZAPPY_NOT_ENABLED', 403)
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
      if (isReadonlyImpersonation(user)) return error('IMPERSONATION_READONLY', 403)
      if (!(await isStudioZappyAllowedForRequest(members, user)))
        return error('ZAPPY_NOT_ENABLED', 403)
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
      if (isReadonlyImpersonation(user)) return error('IMPERSONATION_READONLY', 403)
      let raw: unknown
      try {
        raw = await readBoundedJson(req, QUESTION_BODY_MAX_BYTES)
      } catch (cause) {
        if (cause instanceof RequestBodyTooLargeError) return error('PAYLOAD_TOO_LARGE', 413)
        return error('INVALID_INPUT', 400)
      }
      const parsed = QuestionBody.safeParse(raw)
      if (!parsed.success || parsed.data.projectId !== parsed.data.context.projectId) {
        return error('INVALID_INPUT', 400)
      }
      // Posse, rank e blocos conquistados são INDEPENDENTES: em série custavam idas inteiras
      // de latência com a criança esperando. A ordem das CHECAGENS abaixo continua a mesma —
      // só a espera virou uma só. A equipe tem o passe livre e nem pergunta pelos blocos.
      const privileged = isPrivilegedRole(user.role)
      const context = parsed.data.context as ZappyContextInput
      const [studioAccess, gamification, unlocks] = await Promise.all([
        hasStudioAccess(members),
        members.getGamification(),
        privileged || context.kind === 'pro' ? null : members.getStudioUnlocks(),
      ])
      if (!studioAccess) return error('FORBIDDEN', 403)
      const safeQuestion = redactZappySensitiveText(parsed.data.question)

      // Rank/modos/extensões vêm do members + catálogo da jornada, nunca do cliente.
      if (gamification.status !== 200) return error('ZAPPY_UNAVAILABLE', 503)
      const levelSlug = gamification.body?.level?.slug
      // Reusa o rank desta rota para não consultar o members duas vezes.
      if (!isStudioZappyAllowed(user, levelSlug)) return error('ZAPPY_NOT_ENABLED', 403)
      // O tutor oferece os MESMOS blocos que a paleta: os conquistados nos cursos (a equipe
      // tem o passe livre e não precisa deles). Falhou: indisponível, nunca "sem blocos".
      let unlockedBlocks: readonly string[] = []
      if (!privileged && context.kind !== 'pro') {
        if (unlocks?.status !== 200 || !unlocks.body) return error('ZAPPY_UNAVAILABLE', 503)
        unlockedBlocks = unlocks.body.blocks
      }
      const tier = earnedStudioTier(levelSlug ?? 'noob', user.role, unlockedBlocks)
      if (context.kind === 'pro' && context.mode !== 'code') return error('INVALID_INPUT', 400)
      if (context.kind !== 'pro' && !tier.hasPalette) return error('ZAPPY_NOT_ENABLED', 403)
      // allowedModes descreve as visualizações CLÁSSICAS. Pro tem capacidade própria.
      if (context.kind !== 'pro' && !tier.allowedModes.includes(context.mode))
        return error('FORBIDDEN_MODE', 403)
      if (context.kind === 'pro' && !tier.pro) return error('FORBIDDEN_MODE', 403)
      // O projeto Pro é liberado pelo nível (modo Código), não pelos blocos dos cursos.
      if (
        context.kind !== 'pro' &&
        context.installedExtensions.some((id) => !tier.allowedExtensions.includes(id))
      ) {
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
        // Replay: mesmo envelope, sem saldo (nada foi consumido agora) — o painel
        // mantém o número que já tinha em vez de zerar.
        return reserved.body.response
          ? NextResponse.json({ response: reserved.body.response, credits: null })
          : error('ZAPPY_IN_PROGRESS', 409)
      }
      const questionId = reserved.body.questionId
      if (!questionId) return error('ZAPPY_UNAVAILABLE', 503)

      // ⚠️ O saldo (`credits`) viaja no ENVELOPE da resposta HTTP, NUNCA dentro do
      // objeto `response` — esse é o que vai para o jsonb `zappy_messages.response`,
      // e crédito é volátil: gravado ali, o histórico replayado mostraria um saldo
      // de dias atrás como se fosse o de agora.
      let freshCredits: AiCreditsView | undefined
      const complete = async (
        response: NonNullable<typeof reserved.body.response>,
        outcome: ZappyOutcome = outcomeFor(response),
        rejection?: string,
      ) => {
        const responseWithMode = {
          ...response,
          kind: context.kind,
          ...(context.kind === 'pro' ? { intent: context.pro?.intent ?? 'explain' } : {}),
        }
        const saved = await members.zappyCompleteQuestion(questionId, {
          actor: signedActor(user),
          projectId: parsed.data.projectId,
          latencyMs: Date.now() - startedAt,
          response: responseWithMode,
          outcome,
          ...(rejection ? { rejection } : {}),
        })
        return NextResponse.json(
          { response: saved.body ?? responseWithMode, credits: freshCredits ?? null },
          { status: saved.status === 200 ? 200 : 502 },
        )
      }

      const safetyReply = deterministicZappySafetyReply(
        parsed.data.question,
        safeQuestion.hadPii,
        context.kind,
      )
      if (safetyReply) return complete(safetyReply)

      const fixed = deterministicZappyReply(safeQuestion.text, context.kind)
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
            text: `Não consegui consultar as fases agora. ${studioTutorContextHint(context.kind)} Tente novamente.`,
            scope: 'needs-context',
            blockReferences: [],
            createdAt: new Date().toISOString(),
          },
          'error',
        )
      }

      let prepared: ReturnType<typeof prepareStudioZappyAnswer>
      try {
        const pensaId =
          /^pensa-([a-f0-9]{8})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{12})$/.exec(
            parsed.data.projectId,
          )
        let pensaMission: ZappyContextInput['pensaMission']
        if (pensaId)
          try {
            const pensa = await loadPensaContext(
              members,
              user,
              {
                profileId: user.id,
                accountId: user.activeProfile?.accountId ?? user.id,
                privileged: isPrivilegedRole(user.role),
              },
              pensaId.slice(1).join('-'),
              '',
            )
            const mission = pensaStudioTutorMission(pensa.view, parsed.data.pensaMissionId)
            if (mission)
              pensaMission = {
                title: redactPensaText(mission.title).text,
                expected: redactPensaText(mission.objective).text,
                rules: mission.rules.map((rule) => redactPensaText(rule.text).text),
                checks: mission.checks.map(
                  (check) => redactPensaText(`${check.action}. ${check.expected}`).text,
                ),
                lastTest:
                  pensa.view.progress.find((item) => item.missionId === mission.id)?.verification
                    ?.note ?? null,
              }
          } catch {
            console.info('[pensa] contexto de missão indisponível no tutor')
          }
        prepared = prepareStudioZappyAnswer({
          question: safeQuestion.text,
          context: {
            ...context,
            ...(pensaMission ? { pensaMission } : {}),
            // Toda visualização clássica ensina com blocos, inclusive a Ponte.
            ...(context.kind !== 'pro' ? { code: undefined, pro: undefined } : {}),
            selectedBlockId: context.blocks.some((block) => block.id === context.selectedBlockId)
              ? context.selectedBlockId
              : null,
          },
          tier,
          profileName: safeProfileName(user.activeProfile?.name),
          knowledge: knowledge.hits,
          // Memória: últimos turnos da conversa vêm na reserva (members antigo
          // sem o campo → sem memória, degrada sem quebrar).
          recentTurns: reserved.body.recentMessages,
        })
      } catch (cause) {
        console.error('[studio-zappy] falha ao preparar resposta', { cause })
        return complete(
          {
            id: crypto.randomUUID(),
            text: `Não consegui preparar essa explicação agora. ${studioTutorContextHint(context.kind)} Tente novamente.`,
            scope: 'needs-context',
            blockReferences: [],
            createdAt: new Date().toISOString(),
          },
          'error',
        )
      }

      const aiRequest = {
        ...studioZappyAiBudget(prepared),
        runId: questionId,
        projectId: parsed.data.projectId,
        purpose: 'tutor' as const,
      }
      let quota: StudioAiReservation | { allowed: false; scope: 'unavailable' }
      try {
        const result = await members.studioAiUsage(signedActor(user), {
          operation: 'reserve',
          request: aiRequest,
        })
        quota =
          result.status === 200 && result.body?.reservation
            ? result.body.reservation
            : { allowed: false, scope: 'unavailable' }
      } catch {
        quota = { allowed: false, scope: 'unavailable' }
      }
      // A variante `unavailable` não carrega saldo (o members nem respondeu).
      freshCredits = 'credits' in quota ? quota.credits : undefined
      if (!quota.allowed) {
        const response: NonNullable<typeof reserved.body.response> = {
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
        if (quota.scope === 'connection') {
          response.text =
            'A conexão de IA precisa da atenção do responsável. Ele pode conferir isso na área da família.'
          return complete(response, 'error')
        }
        if (quota.scope === 'busy') {
          response.text =
            'Já estou ajudando sua família em outra tarefa. Aguarde um instante e tente novamente.'
          return complete(response, 'error')
        }
        // ⚠️ O `scope` da RESPOSTA precisa virar 'quota' — o 'quota' do `complete`
        // abaixo é só o OUTCOME (analítica do admin). Sem esta linha o scope
        // continuava 'unsupported' e o painel renderizava o limite como aula,
        // com os polegares de "isso ajudou?", que é justamente o que a separação
        // de aviso × ensino veio consertar.
        response.scope = 'quota'
        response.text =
          quota.scope === 'day' || quota.scope === 'cost-day'
            ? 'Por hoje a gente já conversou bastante! Amanhã tem mais ✨'
            : 'A ajuda deste mês acabou. No mês que vem tem mais ✨'
        return complete(response, 'quota')
      }

      const execution = createStudioAiTransport({
        members,
        actor: signedActor(user),
        request: aiRequest,
        reservation: quota,
        signal: req.signal,
      })
      let answer: NonNullable<typeof reserved.body.response>
      let answerOutcome: ZappyOutcome | undefined
      let rejection: string | undefined
      try {
        const result = await answerPreparedStudioZappy(prepared, {
          startedAt,
          transport: execution.transport,
          signal: req.signal,
        })
        answer = result.response
        rejection = result.rejection
        answerOutcome = rejection ? 'rejected' : outcomeFor(answer)
      } catch (cause) {
        console.error('[studio-zappy] falha ao responder', { cause })
        answer = {
          id: crypto.randomUUID(),
          text: `Não consegui pensar nessa agora. ${studioTutorContextHint(context.kind)} Tente novamente.`,
          scope: 'needs-context',
          blockReferences: [],
          createdAt: new Date().toISOString(),
        }
        answerOutcome = 'error'
      } finally {
        await execution.finish()
        // The reserve was a hold; re-read after settlement/release for the next interaction.
        const credits = await members.getAiCredits().catch(() => null)
        if (credits?.status === 200 && credits.body) freshCredits = credits.body
      }
      return complete(answer, answerOutcome, rejection)
    },
  }

  const studioZappyFeedback = {
    POST: async (req: Request) => {
      const user = await sessions.getSession()
      if (!user) return error('UNAUTHORIZED', 401)
      if (isReadonlyImpersonation(user)) return error('IMPERSONATION_READONLY', 403)
      if (!(await isStudioZappyAllowedForRequest(members, user)))
        return error('ZAPPY_NOT_ENABLED', 403)
      let raw: unknown
      try {
        raw = await readBoundedJson(req, FEEDBACK_BODY_MAX_BYTES)
      } catch (cause) {
        if (cause instanceof RequestBodyTooLargeError) return error('PAYLOAD_TOO_LARGE', 413)
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
