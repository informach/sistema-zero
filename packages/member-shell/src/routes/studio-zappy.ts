import 'server-only'
import type { StudioAiReservation } from '@sistemazero/core/ai-credits'
import { canonicalJson } from '@sistemazero/core/creations'
import { isStudioTutorSourcePath, STUDIO_TUTOR_SOURCE_HASH_RE } from '@sistemazero/core/studio'
import { STUDIO_PRO_ASSISTANCE_LIMITS } from '@sistemazero/core/studio/pro-assistance'
import { StudioProjectIdSchema } from '@sistemazero/core/studio/project-document'
import { STUDIO_READABLE_PROJECT_ID_PATTERN } from '@sistemazero/core/studio/project-format'
import { StudioPythonAnalysisAuthorizationSchema } from '@sistemazero/core/studio/python-language-authorization'
import type { StudioPythonProvidedModuleDescriptor } from '@sistemazero/core/studio/python-provided-modules'
import {
  createStudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { StudioTutorEnvironmentSchema } from '@sistemazero/core/studio/tutor-environment'
import type { PythonCatalogEntry } from '@sistemazero/studio/python-authoring'
import { studioTutorContextHint } from '@sistemazero/studio/tutor-mode'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { isKidsStaffPreview, kidsJourneyAccess } from '../lib/kids-journey-access'
import { learnerIdentity } from '../lib/learner-identity'
import { RequestBodyTooLargeError, readBoundedJson } from '../lib/read-bounded-json'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { AiCreditsView } from '../lib/types'
import { hasAdultCapability } from '../server/adult-capabilities'
import type { MembersClient } from '../server/clients'
import { loadPensaContext } from '../server/pensa/context'
import { pensaStudioTutorMission } from '../server/pensa/missions'
import { redactPensaText } from '../server/pensa/privacy'
import { validatePythonAnalysisDecision } from '../server/python-analysis-decision'
import type { SessionModule } from '../server/session'
import { createStudioAiTransport } from '../server/studio-ai-transport'
import { adultStudioTier, kidsStudioTier } from '../server/studio-unlocks'
import { getStudioZappyAccessForRequest, isStudioZappyAllowed } from '../server/zappy-access'
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
import { streamZappyAnswer } from '../server/zappy-transport'

const SourcePath = z.string().min(1).max(240).refine(isStudioTutorSourcePath)
const ReadableProjectId = z.string().regex(STUDIO_READABLE_PROJECT_ID_PATTERN)
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
  authorization: StudioPythonAnalysisAuthorizationSchema.optional(),
  transportVersion: z.literal(1).optional(),
  projectId: ReadableProjectId,
  clientMessageId: z.string().uuid(),
  /**
   * A missão do Pensa aberta pelo handoff `?missao=`, opcional. Só vale para o plano atual,
   * o Estúdio e quem programa. Sem referência, usa a próxima ação calculada pelo servidor.
   */
  pensaMissionId: z.string().uuid().optional(),
  question: z.string().trim().min(1).max(1000),
  context: z.object({
    environment: StudioTutorEnvironmentSchema.optional(),
    python: z
      .strictObject({
        activeFile: SourcePath,
        workspace: z.enum(['ready', 'pending', 'unavailable']),
        source: z
          .array(
            z.object({
              path: SourcePath,
              content: z.string().max(20000),
              excerpt: Excerpt.optional(),
            }),
          )
          .max(24),
      })
      .optional(),
    projectId: ReadableProjectId,
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
        templateId: z.string().max(80).optional(),
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
              code: z.union([z.number().int(), z.string().min(1).max(128)]),
              line: z.number().int().positive(),
              message: z.string().max(600),
              source: z.enum(['typescript', 'pyright']).optional(),
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
  projectId: ReadableProjectId,
  responseId: z.string().uuid(),
  useful: z.boolean(),
})
const ContextualHistoryBody = z.discriminatedUnion('operation', [
  z.strictObject({
    operation: z.literal('history'),
    projectId: StudioProjectIdSchema,
    before: z.uuid().optional(),
    authorization: StudioPythonAnalysisAuthorizationSchema,
  }),
  z.strictObject({
    operation: z.literal('delete-history'),
    projectId: StudioProjectIdSchema,
    authorization: StudioPythonAnalysisAuthorizationSchema,
  }),
  z.strictObject({
    operation: z.literal('feedback'),
    ...FeedbackBody.shape,
    projectId: StudioProjectIdSchema,
    authorization: StudioPythonAnalysisAuthorizationSchema,
  }),
])

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
  if (
    !ReadableProjectId.safeParse(projectId).success ||
    (before && !z.string().uuid().safeParse(before).success)
  ) {
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

export function createStudioZappyRoutes(deps: {
  members: MembersClient
  session: SessionModule
  audience?: 'kids' | 'adult'
}) {
  const { members, session: sessions, audience = 'kids' } = deps
  const allowed = (user: NonNullable<Awaited<ReturnType<SessionModule['getSession']>>>) =>
    audience === 'adult'
      ? hasAdultCapability(members, user, 'ai').then((yes) =>
          yes ? ('allowed' as const) : ('locked' as const),
        )
      : getStudioZappyAccessForRequest(members, user)

  const studioZappyHistory = {
    POST: async (req: Request) => {
      const user = await sessions.getSession()
      if (!user) return error('UNAUTHORIZED', 401)
      if (isReadonlyImpersonation(user)) return error('IMPERSONATION_READONLY', 403)
      let raw: unknown
      try {
        raw = await readBoundedJson(req, 2_001_024)
      } catch (cause) {
        return error(
          cause instanceof RequestBodyTooLargeError ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT',
          cause instanceof RequestBodyTooLargeError ? 413 : 400,
        )
      }
      const parsed = ContextualHistoryBody.safeParse(raw)
      if (!parsed.success || parsed.data.projectId !== parsed.data.authorization.subject.id)
        return error('INVALID_INPUT', 400)
      const capability = await allowed(user)
      if (capability === 'unavailable') return error('ZAPPY_UNAVAILABLE', 503)
      if (capability !== 'allowed') return error('ZAPPY_NOT_ENABLED', 403)
      const input = parsed.data
      try {
        const approved = await members.authorizePythonAnalysis(input.authorization)
        if (approved.status !== 200)
          return NextResponse.json(approved.body, { status: approved.status })
        if (
          !(await validatePythonAnalysisDecision(approved.body, input.authorization, {
            userId: user.id,
            accountId: user.activeProfile?.accountId ?? user.id,
          }))
        )
          return error('ZAPPY_UNAVAILABLE', 503)
      } catch {
        return error('ZAPPY_UNAVAILABLE', 503)
      }
      req.signal.throwIfAborted()
      const result =
        input.operation === 'history'
          ? await members.zappyHistory(input.projectId, input.before)
          : input.operation === 'delete-history'
            ? await members.zappyDeleteHistory(input.projectId)
            : await members.zappyFeedback({
                projectId: input.projectId,
                responseId: input.responseId,
                useful: input.useful,
              })
      return NextResponse.json(result.body ?? { error: { code: 'ZAPPY_UNAVAILABLE' } }, {
        status: result.status,
      })
    },
    GET: async (req: Request) => {
      const user = await sessions.getSession()
      const query = historyQuery(req)
      if (!user) return error('UNAUTHORIZED', 401)
      const capability = await allowed(user)
      if (capability === 'unavailable') return error('ZAPPY_UNAVAILABLE', 503)
      if (capability !== 'allowed') return error('ZAPPY_NOT_ENABLED', 403)
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
      const capability = await allowed(user)
      if (capability === 'unavailable') return error('ZAPPY_UNAVAILABLE', 503)
      if (capability !== 'allowed') return error('ZAPPY_NOT_ENABLED', 403)
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
      // Product and published policy are independent reads. Kids curriculum is requested only
      // after the view distinguishes a learner from an explicit read-only team preview.
      const privileged = isPrivilegedRole(user.role)
      const context: ZappyContextInput = parsed.data.context
      const python = context.environment?.programmingLanguage === 'python'
      if (
        (!python &&
          (context.python || parsed.data.authorization || parsed.data.transportVersion)) ||
        context.pro?.diagnostics?.some((item) =>
          python
            ? item.source === 'typescript'
            : item.source === 'pyright' || typeof item.code === 'string',
        )
      )
        return error('INVALID_INPUT', 400)
      let pythonCatalog: readonly PythonCatalogEntry[] | undefined
      let pythonProvidedModules: readonly StudioPythonProvidedModuleDescriptor[] | undefined
      let pythonAuthorizationExpiresAt: number | undefined
      if (python) {
        const authorization = parsed.data.authorization
        const environment = context.environment
        if (
          !authorization ||
          parsed.data.transportVersion !== 1 ||
          environment?.programmingLanguage !== 'python'
        )
          return error('INVALID_INPUT', 400)
        const subject = authorization.subject
        if (
          subject.programmingLanguage !== 'python' ||
          subject.id !== context.projectId ||
          subject.kind !== context.kind ||
          subject.mode !== context.mode ||
          canonicalJson(subject.runtime) !== canonicalJson(environment.runtime) ||
          canonicalJson(subject.installedExtensions) !== canonicalJson(environment.extensions) ||
          subject.python.entrypoint !== environment.entrypoint ||
          subject.python.dependencyLock.pythonVersion !== environment.pythonVersion ||
          (context.pro?.templateId && context.pro.templateId !== subject.proMeta?.templateId)
        )
          return error('INVALID_INPUT', 400)
        try {
          const result = await members.authorizePythonAnalysis(authorization)
          if (result.status !== 200)
            return NextResponse.json(result.body, { status: result.status })
          const decision = await validatePythonAnalysisDecision(result.body, authorization, {
            userId: user.id,
            accountId: user.activeProfile?.accountId ?? user.id,
          })
          if (!decision) return error('ZAPPY_UNAVAILABLE', 503)
          // Members resolves `assist` from the exact release, context grants and curation.
          if (!decision.capabilities.includes('assist'))
            return error(
              'RUNTIME_ASSIST_NOT_ALLOWED',
              403,
              'O ambiente Python deste projeto ainda não oferece o Zappy.',
            )
          pythonAuthorizationExpiresAt = decision.expiresAt
          const { loadPythonAuthoring, selectPythonPalette } = await import(
            '@sistemazero/studio/python-authoring'
          )
          const catalog = await createStudioRuntimeCatalog(decision.catalog)
          const release = selectStudioRuntimeRelease(catalog, decision.runtime)
          if (release?.manifest.programmingLanguage !== 'python')
            return error('ZAPPY_UNAVAILABLE', 503)
          pythonProvidedModules = release.manifest.python?.providedModules?.map(
            (module) => module.descriptor,
          )
          const loaded = await loadPythonAuthoring(subject, {
            catalog,
            pythonAuthoring: [{ runtime: decision.runtime, blockIds: decision.blockIds }],
          })
          pythonCatalog = selectPythonPalette({
            ...loaded,
            level: decision.curation.pythonLevel ?? 1,
            allowBlocks: decision.curation.allowBlocks,
            allowCategories: decision.curation.allowCategories,
            installedExtensions: new Set(
              [...loaded.installedExtensions].filter((id) =>
                decision.grantedExtensionIds.includes(id),
              ),
            ),
          }).entries
        } catch {
          return error('ZAPPY_UNAVAILABLE', 503)
        }
      }
      const [studioAccess, gamification, unlocks] = await Promise.all([
        python ? true : hasStudioAccess(members),
        members.getGamification(),
        python || audience === 'kids' || privileged || context.kind === 'pro'
          ? null
          : members.getStudioUnlocks(),
      ])
      if (!studioAccess) return error('FORBIDDEN', 403)
      const safeQuestion = redactZappySensitiveText(parsed.data.question)

      // Capabilities and curriculum come from Members, never from client rank/role claims.
      if (gamification.status !== 200) return error('ZAPPY_UNAVAILABLE', 503)
      const kids = audience === 'kids' ? kidsJourneyAccess(gamification.body) : null
      if (audience === 'kids' && !kids) return error('ZAPPY_UNAVAILABLE', 503)
      // Reuse the published view rather than reading policy twice.
      if (
        audience === 'adult'
          ? !learnerIdentity(user, 'adult') ||
            !gamification.body?.journey?.capabilities.includes('ai')
          : !isStudioZappyAllowed(user, kids)
      )
        return error('ZAPPY_NOT_ENABLED', 403)
      // O tutor oferece os MESMOS blocos que a paleta: os conquistados nos cursos (a equipe
      // tem o passe livre e não precisa deles). Falhou: indisponível, nunca "sem blocos".
      let unlockedBlocks: readonly string[] = []
      const fullPalette =
        audience === 'adult' ? privileged : Boolean(kids && isKidsStaffPreview(kids))
      if (!python && !fullPalette && context.kind !== 'pro') {
        // This GET may reconcile curriculum grants. Never call it for staff preview.
        const curriculum =
          audience === 'adult' ? unlocks : await members.getStudioUnlocks().catch(() => null)
        if (curriculum?.status !== 200 || !curriculum.body) return error('ZAPPY_UNAVAILABLE', 503)
        unlockedBlocks = curriculum.body.blocks
      }
      if (audience === 'adult' && !gamification.body?.journey)
        return error('ZAPPY_UNAVAILABLE', 503)
      const tier =
        audience === 'adult' && gamification.body?.journey
          ? adultStudioTier(gamification.body.journey, user.role, unlockedBlocks)
          : kids
            ? kidsStudioTier(kids, unlockedBlocks)
            : null
      if (!tier) return error('ZAPPY_UNAVAILABLE', 503)
      if (context.kind === 'pro' && context.mode !== 'code') return error('INVALID_INPUT', 400)
      if (!python && context.kind !== 'pro' && !tier.hasPalette)
        return error('ZAPPY_NOT_ENABLED', 403)
      // allowedModes descreve as visualizações CLÁSSICAS. Pro tem capacidade própria.
      if (!python && context.kind !== 'pro' && !tier.allowedModes.includes(context.mode))
        return error('FORBIDDEN_MODE', 403)
      if (!python && context.kind === 'pro' && !tier.pro) return error('FORBIDDEN_MODE', 403)
      // O projeto Pro é liberado pelo nível (modo Código), não pelos blocos dos cursos.
      if (
        !python &&
        context.kind !== 'pro' &&
        context.installedExtensions.some((id) => !tier.allowedExtensions.includes(id))
      ) {
        return error('FORBIDDEN_EXTENSION', 403)
      }

      const answer = async (signal: AbortSignal) => {
        signal.throwIfAborted()
        if (
          pythonAuthorizationExpiresAt !== undefined &&
          pythonAuthorizationExpiresAt <= Date.now()
        )
          return error(
            'ZAPPY_CONTEXT_EXPIRED',
            409,
            'O contexto mudou enquanto eu preparava a ajuda. Tente novamente.',
          )
        const reserved = await members.zappyReserveQuestion({
          actor: signedActor(user),
          projectId: parsed.data.projectId,
          clientMessageId: parsed.data.clientMessageId,
          question: safeQuestion.text,
          ...(python ? { programmingLanguage: 'python' as const } : {}),
        })
        if (reserved.status !== 200 || !reserved.body) {
          return NextResponse.json(reserved.body ?? { error: { code: 'ZAPPY_UNAVAILABLE' } }, {
            status: reserved.status,
          })
        }
        // Idempotência: repetição concluída retorna a MESMA resposta sem rate/quota/modelo.
        if (!reserved.body.created) {
          if (reserved.body.rateLimited) return error('RATE_LIMITED', 429)
          if (
            reserved.body.response &&
            (reserved.body.response.programmingLanguage ?? 'javascript') !==
              (python ? 'python' : 'javascript')
          )
            return error('ZAPPY_CONTEXT_CONFLICT', 409)
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
            ...(python ? { programmingLanguage: 'python' as const } : {}),
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

        const fixed = deterministicZappyReply(
          safeQuestion.text,
          context.kind,
          python ? 'python' : 'javascript',
        )
        if (fixed) return complete(fixed)

        let knowledge: Awaited<ReturnType<typeof members.zappyKnowledgeSearch>>['body']
        try {
          const searchQuery = await normalizeZappySearchQuery(safeQuestion.text)
          const knowledgeResult = python
            ? { status: 200, body: { hits: [] } }
            : await members.zappyKnowledgeSearch(searchQuery, 5)
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
          if (!python && pensaId)
            try {
              const pensa = await loadPensaContext(
                members,
                user,
                {
                  profileId: user.id,
                  accountId: user.activeProfile?.accountId ?? user.id,
                  privileged: isPrivilegedRole(user.role),
                  ...(audience === 'adult' ? { audience: 'adult' as const } : {}),
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
            audience,
            question: safeQuestion.text,
            pythonCatalog,
            pythonProvidedModules,
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
            profileName:
              audience === 'adult' ? 'Criador' : safeProfileName(user.activeProfile?.name),
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
            response.text =
              'O Zappy não conseguiu acordar agora. Tente novamente em alguns minutos.'
            return complete(response, 'error')
          }
          if (quota.scope === 'connection') {
            response.text =
              'A conexão do Zappy precisa da atenção do responsável. Ele pode conferir isso na área da família.'
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
          signal,
        })
        let answer: NonNullable<typeof reserved.body.response>
        let answerOutcome: ZappyOutcome | undefined
        let rejection: string | undefined
        try {
          const result = await answerPreparedStudioZappy(prepared, {
            startedAt,
            transport: execution.transport,
            signal,
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
      }
      return python ? streamZappyAnswer(answer, req.signal) : answer(req.signal)
    },
  }

  const studioZappyFeedback = {
    POST: async (req: Request) => {
      const user = await sessions.getSession()
      if (!user) return error('UNAUTHORIZED', 401)
      if (isReadonlyImpersonation(user)) return error('IMPERSONATION_READONLY', 403)
      const capability = await allowed(user)
      if (capability === 'unavailable') return error('ZAPPY_UNAVAILABLE', 503)
      if (capability !== 'allowed') return error('ZAPPY_NOT_ENABLED', 403)
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
