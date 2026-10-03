import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type {
  PensaArtifactType,
  PensaArtifactView,
  PensaChatMessage,
  PensaStageView,
  PensaZState,
} from '../lib/types'
import { aiQuotaMessage, consumeAiQuota } from '../server/ai-quota'
import type { MembersClient } from '../server/clients'
import { hasAiAppsLevel } from '../server/creative-apps-access'
import { auditPlan } from '../server/pensa-agents/plan-audit'
import {
  availablePlannerCatalog,
  buildTaskPlan,
  GameDesignArtifactSchema,
  IdeaArtifactSchema,
  jsonSchemaFor,
  PensaCatalogDriftError,
  type PlanReviewArtifact,
  plannerCatalogPrompt,
  type ResolvedPlanTask,
  TaskPlanArtifactSchema,
  type TaskPlanDraft,
  TaskPlanDraftSchema,
  VisualDirectionArtifactSchema,
  visualCardChecklist,
} from '../server/pensa-agents/planner-contract'
import { getPensaCapabilities } from '../server/pensa-capabilities'

export { auditPlan } from '../server/pensa-agents/plan-audit'

import { pensaSafetyClause } from '../server/pensa-agents/safety'
import { buildStageZSystem } from '../server/pensa-agents/stage-z'
import { evaluateStageZ, summarizeStageZ } from '../server/pensa-agents/stage-z-evaluator'
import {
  completePensaJson,
  PensaLlmError,
  pensaLlmAvailable,
  streamPensaChat,
} from '../server/pensa-llm'
import type { SessionModule } from '../server/session'

export type PensaAiRoutes = ReturnType<typeof createPensaAiRoutes>

const UUID = z.uuid()
const ChatBody = z.strictObject({
  projectId: UUID,
  cycleId: UUID,
  stage: z.literal('z'),
  message: z.string().trim().min(1).max(2000),
})

/** Cinco artefatos públicos; não há variantes de Estúdio, checklist ou identidade legadas. */
export const GenerateBody = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('idea'), projectId: UUID }),
  z.strictObject({
    type: z.literal('game_design'),
    projectId: UUID,
    feedback: z.string().trim().min(2).max(500).optional(),
  }),
  z.strictObject({
    type: z.literal('visual_direction'),
    projectId: UUID,
    feedback: z.string().trim().min(2).max(500).optional(),
  }),
  z.strictObject({
    type: z.literal('task_plan'),
    projectId: UUID,
    feedback: z.string().trim().min(2).max(500).optional(),
  }),
  z.strictObject({ type: z.literal('plan_review'), projectId: UUID, approved: z.boolean() }),
])

/** Resposta interna da geração — vira `done` (200 sem error) ou `error` no SSE. */
interface GenerateReply {
  status: number
  body: unknown
}

const RL_KEY = Symbol.for('@sistemazero/member-shell/pensa-chat-rl')
interface RlEntry {
  count: number
  resetAt: number
}
const globalStore = globalThis as Record<symbol, unknown>
if (!globalStore[RL_KEY]) globalStore[RL_KEY] = new Map<string, RlEntry>()
const rateLimits = globalStore[RL_KEY] as Map<string, RlEntry>
const CHAT_PER_MINUTE = 10
const PROMPT_WINDOW = 40

export function pensaChatRateLimited(key: string, now = Date.now()): boolean {
  let entry = rateLimits.get(key)
  if (!entry) {
    entry = { count: 0, resetAt: now + 60_000 }
    rateLimits.set(key, entry)
  }
  if (entry.resetAt <= now) {
    entry.count = 0
    entry.resetAt = now + 60_000
  }
  if (entry.count >= CHAT_PER_MINUTE) return true
  entry.count += 1
  return false
}

const sseHeaders = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
} as const

const error = (code: string, status: number, message?: string, details?: unknown) =>
  NextResponse.json(
    { error: { code, ...(message ? { message } : {}) }, ...(details ? { details } : {}) },
    { status },
  )

function latest(stage: PensaStageView, type: PensaArtifactType): PensaArtifactView | null {
  return stage.artifacts.find((artifact) => artifact.type === type) ?? null
}

/** Recado de etapa que a CRIANÇA pode ler; todo outro erro da geração vai ao log, não à tela. */
class PensaStepError extends Error {}

const PLAN_OUT_OF_PLACE =
  'O plano saiu com algumas peças fora do lugar. Tente gerar de novo que a IA monta outro.'
const NOT_SAVED = 'Não deu para guardar agora. Espere um pouquinho e tente de novo.'

/**
 * Passado este tempo na 1ª geração do plano, a 2ª não acontece: a criança já esperou demais, e
 * cada geração pode levar 3 minutos (o corpo do task_plan chega inteiro no fim).
 */
const PLAN_RETRY_DEADLINE_MS = 150_000

/** Os nomes que a tela do Pensa dá a cada artefato (`ARTIFACT_LABELS` do pacote). */
const ARTIFACT_NAMES: Record<PensaArtifactType, string> = {
  idea: 'a Carta da Ideia',
  game_design: 'a Visão do Jogo',
  visual_direction: 'a Bíblia Visual',
  task_plan: 'o Plano de Tarefas',
  plan_review: 'a Revisão do Plano',
}

function requireValidated(stage: PensaStageView, type: PensaArtifactType): PensaArtifactView {
  const artifact = latest(stage, type)
  if (artifact?.status !== 'validated')
    throw new PensaStepError(`Aprove ${ARTIFACT_NAMES[type]} antes de seguir.`)
  return artifact
}

/**
 * O artefato aprovado, conferido pelo schema de hoje. Um guardado que não passa mais não melhora
 * tentando de novo (e o ZodError cru não é frase para a tela): a saída é refazer aquela etapa.
 */
function validatedContent<T>(stage: PensaStageView, type: PensaArtifactType, schema: z.ZodType<T>) {
  const parsed = schema.safeParse(requireValidated(stage, type).content)
  if (!parsed.success)
    throw new PensaStepError(`Gere ${ARTIFACT_NAMES[type]} de novo e aprove para seguir.`)
  return parsed.data
}

const json = (value: unknown) => JSON.stringify(value, null, 2)

function plannerSystem(label: string) {
  return [
    pensaSafetyClause('kids'),
    `Você cocria ${label} para uma criança de 8 a 13 anos dentro do planejador de jogos Pensa.`,
    'Não invente decisões que contradigam os artefatos aprovados. Use linguagem curta, concreta, executável e apropriada para crianças.',
    'Responda somente o JSON exigido pelo schema.',
  ].join('\n\n')
}

async function generateJson<T>(
  complete: typeof completePensaJson,
  input: {
    schema: z.ZodType<T>
    schemaName: string
    label: string
    user: string
    maxTokens?: number
    bodyTimeoutMs?: number
    maxAttempts?: 1 | 2
  },
) {
  return complete({
    system: plannerSystem(input.label),
    user: input.user,
    schema: input.schema,
    jsonSchema: jsonSchemaFor(input.schema),
    schemaName: input.schemaName,
    maxTokens: input.maxTokens ?? 2400,
    temperature: 0.25,
    bodyTimeoutMs: input.bodyTimeoutMs,
    ...(input.maxAttempts ? { maxAttempts: input.maxAttempts } : {}),
  })
}

export function createPensaAiRoutes(deps: {
  members: MembersClient
  session: SessionModule
  /** Só os testes trocam: é a chamada ao modelo. */
  completeJson?: typeof completePensaJson
}) {
  const { members, session } = deps
  const complete = deps.completeJson ?? completePensaJson
  const generate = <T>(input: Parameters<typeof generateJson<T>>[1]) =>
    generateJson(complete, input)

  const pensaChat = {
    POST: async (req: Request) => {
      const user = await session.getSession()
      if (!user) return error('UNAUTHENTICATED', 401)
      if (isReadonlyImpersonation(user))
        return error('IMPERSONATION_READONLY', 403, 'Sessão de suporte é só leitura.')
      if (!(await hasAiAppsLevel(members, user.role))) {
        return error(
          'CAREER_LEVEL_REQUIRED',
          403,
          'O Pensa abre quando você chegar no nível Inventor(a).',
        )
      }
      if (!pensaLlmAvailable())
        return error(
          'PENSA_AI_UNAVAILABLE',
          503,
          'O Zappy está descansando agora. Tente mais tarde.',
        )
      if (pensaChatRateLimited(user.id))
        return error('RATE_LIMITED', 429, 'O Zappy precisa descansar um pouquinho. Já volto!')
      const parsed = ChatBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return error('VALIDATION_ERROR', 400)
      const { projectId, cycleId, stage, message } = parsed.data
      const projectRes = await members.pensaGetProject(projectId)
      if (projectRes.status !== 200 || !projectRes.body)
        return error('PENSA_NOT_FOUND', projectRes.status === 200 ? 502 : projectRes.status)
      const project = projectRes.body.project
      const cycle = project.cycles.find((item) => item.id === cycleId)
      if (!cycle) return error('PENSA_NOT_FOUND', 404)
      if (cycle.stage !== stage) return error('PENSA_STAGE_MISMATCH', 409)
      const stageRes = await members.pensaGetStage(cycleId, stage)
      if (stageRes.status !== 200 || !stageRes.body)
        return error('PENSA_NOT_FOUND', stageRes.status === 200 ? 502 : stageRes.status)
      const conversation = stageRes.body.conversation
      const rawState = stageRes.body.state
      const zState =
        rawState && 'answered' in rawState ? (rawState as unknown as PensaZState) : null
      const quota = await consumeAiQuota(members, 'pensa-chat')
      if (!quota.allowed)
        // O `credits` viaja junto para a tela do "acabou" já saber quando volta,
        // sem um GET extra (o caminho de erro não passa pelo refresh do stage).
        return error('AI_QUOTA_EXCEEDED', 429, aiQuotaMessage(quota.scope), {
          scope: quota.scope,
          credits: quota.credits ?? null,
        })
      const system = buildStageZSystem({
        mode: 'kids',
        projectName: project.name,
        cycleNumber: cycle.number,
        cycleGoal: cycle.goal,
        summary: conversation.summary,
        state: zState,
      })
      const wire = [
        { role: 'system' as const, content: system },
        ...conversation.messages
          .slice(-PROMPT_WINDOW)
          .map((item) => ({ role: item.role, content: item.content })),
        { role: 'user' as const, content: message },
      ]
      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          let closed = false
          const send = (event: string, data: unknown) => {
            if (!closed)
              controller.enqueue(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              )
          }
          const ping = setInterval(() => {
            if (!closed) controller.enqueue(encoder.encode(': ping\n\n'))
          }, 15_000)
          void (async () => {
            try {
              const assistantText = await streamPensaChat({
                messages: wire,
                signal: req.signal,
                onDelta: (text) => send('delta', text),
              })
              if (req.signal.aborted || !assistantText.trim()) return
              const updated: PensaChatMessage[] = [
                ...conversation.messages,
                { role: 'user', content: message, at: '' },
                { role: 'assistant', content: assistantText, at: '' },
              ]
              let state: Record<string, unknown> | undefined
              let summary: string | undefined
              try {
                state = (await evaluateStageZ(updated, conversation.summary)) as unknown as Record<
                  string,
                  unknown
                >
              } catch {}
              if (updated.length > PROMPT_WINDOW) {
                try {
                  summary = await summarizeStageZ(updated)
                } catch {}
              }
              const saved = await members.pensaAppendTurn(cycleId, stage, {
                userMessage: { content: message },
                assistantMessage: { content: assistantText },
                ...(state ? { state } : {}),
                ...(summary ? { summary } : {}),
              })
              if (saved.status !== 200 || !saved.body)
                return send('error', { code: 'PENSA_TURN_NOT_SAVED' })
              send('state', saved.body.state)
              send('done', { messageCount: saved.body.messageCount })
            } catch (cause) {
              if (!req.signal.aborted)
                send('error', {
                  code: cause instanceof PensaLlmError ? 'PENSA_AI_UNAVAILABLE' : 'PENSA_AI_FAILED',
                })
            } finally {
              clearInterval(ping)
              closed = true
              try {
                controller.close()
              } catch {}
            }
          })()
        },
      })
      return new Response(stream, { headers: sseHeaders })
    },
  }

  const pensaGenerateArtifact = {
    POST: async (req: Request, ctx: { params: Promise<{ cycleId: string }> }) => {
      const user = await session.getSession()
      if (!user) return error('UNAUTHENTICATED', 401)
      if (isReadonlyImpersonation(user))
        return error('IMPERSONATION_READONLY', 403, 'Sessão de suporte é só leitura.')
      if (!(await hasAiAppsLevel(members, user.role))) {
        return error(
          'CAREER_LEVEL_REQUIRED',
          403,
          'O Pensa abre quando você chegar no nível Inventor(a).',
        )
      }
      const { cycleId } = await ctx.params
      if (!UUID.safeParse(cycleId).success) return error('NOT_FOUND', 404)
      const parsed = GenerateBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return error('VALIDATION_ERROR', 400)
      const body = parsed.data
      const projectRes = await members.pensaGetProject(body.projectId)
      if (projectRes.status !== 200 || !projectRes.body)
        return error('PENSA_NOT_FOUND', projectRes.status === 200 ? 502 : projectRes.status)
      const project = projectRes.body.project
      const cycle = project.cycles.find((item) => item.id === cycleId)
      if (!cycle) return error('PENSA_NOT_FOUND', 404)
      // Pré-voo rápido segue em JSON (mesmos envelopes de sempre): quota e
      // disponibilidade recusam ANTES de abrir o stream, como no chat.
      if (body.type !== 'plan_review') {
        if (!pensaLlmAvailable()) return error('PENSA_AI_UNAVAILABLE', 503)
        const quota = await consumeAiQuota(members, 'pensa-synthesis')
        if (!quota.allowed)
          return error('AI_QUOTA_EXCEEDED', 429, aiQuotaMessage(quota.scope), {
            scope: quota.scope,
            credits: quota.credits ?? null,
          })
      }
      const getStage = async (stage: 'z' | 'e' | 'r' | 'o') => {
        const result = await members.pensaGetStage(cycleId, stage)
        if (result.status !== 200 || !result.body)
          throw new PensaStepError('Não consegui abrir o plano agora. Tente de novo.')
        return result.body
      }
      // Mesmo envelope do error(), como objeto plano — o miolo da geração roda
      // DENTRO do stream SSE e devolve {status, body} p/ virar done/error.
      const fail = (code: string, status: number, message?: string): GenerateReply => ({
        status,
        body: { error: { code, ...(message ? { message } : {}) } },
      })
      // Recusa do members: as de REGRA (403, 409, 429: plano de outro dono, tarefa já começada,
      // teto) já vêm escritas para a criança. O resto (validação que cita ids, plano que sumiu,
      // servidor fora) vira frase, e o detalhe vai ao log.
      const membersFailure = (
        result: { status: number; body: unknown },
        code: string,
        invalid: string,
      ): GenerateReply => {
        if (
          (result.status === 403 || result.status === 409 || result.status === 429) &&
          result.body
        )
          return { status: result.status, body: result.body }
        if (result.status === 404)
          return fail('PENSA_NOT_FOUND', 404, 'Esse plano não está mais aqui.')
        console.error('[pensa-ai] o members recusou', {
          code,
          status: result.status,
          body: result.body,
        })
        return result.status === 400 || result.status === 422
          ? fail(code, 422, invalid)
          : fail(code, 502, NOT_SAVED)
      }
      const runGenerate = async (): Promise<GenerateReply> => {
        let content: unknown
        if (body.type === 'idea') {
          const zStage = await getStage('z')
          const state = zStage.state as unknown as Partial<PensaZState>
          if (!state.ready)
            return fail('PENSA_GATE_NOT_READY', 409, 'Conclua as cinco decisões da etapa Z.')
          content = await generate({
            schema: IdeaArtifactSchema,
            schemaName: 'pensa_idea_v2',
            label: 'a Carta da Ideia',
            user: `Nome do plano: ${project.name}\nConversa:\n${json(zStage.conversation)}`,
          })
        } else if (body.type === 'game_design') {
          const zStage = await getStage('z')
          const idea = requireValidated(zStage, 'idea').content
          content = await generate({
            schema: GameDesignArtifactSchema,
            schemaName: 'pensa_game_design_v1',
            label: 'o loop, cenas, telas e câmera do jogo',
            user: `IDEIA APROVADA:\n${json(idea)}\nPEDIDO DE REVISÃO: ${body.feedback ?? 'nenhum'}`,
          })
        } else if (body.type === 'visual_direction') {
          const [zStage, eStage] = await Promise.all([getStage('z'), getStage('e')])
          const idea = requireValidated(zStage, 'idea').content
          const design = latest(eStage, 'game_design')
          if (!design) throw new PensaStepError('Crie a Visão do Jogo antes da Bíblia Visual.')
          content = await generate({
            schema: VisualDirectionArtifactSchema,
            schemaName: 'pensa_visual_direction_v1',
            label: 'uma Bíblia Visual executável',
            user: `IDEIA:\n${json(idea)}\nGAME DESIGN:\n${json(design.content)}\nInclua papéis na paleta e um item para CADA asset. Em 3D, modelos, mundo e materiais continuam no inventário, mas serão tarefas do Estúdio.\nPEDIDO: ${body.feedback ?? 'nenhum'}`,
            maxTokens: 4200,
            bodyTimeoutMs: 90_000,
          })
        } else if (body.type === 'task_plan') {
          const [zStage, eStage] = await Promise.all([getStage('z'), getStage('e')])
          const idea = validatedContent(zStage, 'idea', IdeaArtifactSchema)
          const design = requireValidated(eStage, 'game_design').content
          const visual = validatedContent(eStage, 'visual_direction', VisualDirectionArtifactSchema)
          // Item repetido na Bíblia reprova QUALQUER plano: conferir antes poupa as gerações, e o
          // conserto é refazer a Bíblia, não gerar de novo.
          if (new Set(visual.assets.map((asset) => asset.id)).size !== visual.assets.length)
            throw new PensaStepError(
              'A Bíblia Visual tem itens repetidos. Gere a Bíblia Visual de novo e aprove para seguir.',
            )
          const gamification = await members.getGamification()
          if (gamification.status !== 200) return fail('PENSA_TIER_UNAVAILABLE', 503)
          const capabilities = await getPensaCapabilities(
            members,
            gamification.body?.level?.slug,
            user.role,
          )
          if (!capabilities) return fail('PENSA_TIER_UNAVAILABLE', 503)
          const { tier, moldaAvailable } = capabilities
          if (
            !capabilities.studioAvailable ||
            (!capabilities.pintaAvailable &&
              visual.assets.some((asset) =>
                ['sprite', 'background', 'tileset', 'tilemap'].includes(asset.kind),
              ))
          )
            return fail(
              'PENSA_TOOLS_UNAVAILABLE',
              403,
              'Este plano precisa de ferramentas que ainda não estão disponíveis para seu perfil. Seu planejamento continua guardado.',
            )
          // Num jogo 2D o Molda nunca é destino, mesmo liberado: o `resolveTaskPlan` recusa.
          const moldaUsable = moldaAvailable && idea.dimension === '3d'
          const prompt = [
            `IDEIA:\n${json(idea)}`,
            `GAME DESIGN:\n${json(design)}`,
            `BÍBLIA VISUAL:\n${json(visual)}`,
            'Gere o plano completo na ordem de execução.',
            'Crie uma tarefa Pinta para CADA sprite/background/tileset/tilemap usando assetId. A tarefa do Estúdio que usa uma arte apenas DEPENDE da tarefa que a cria; não repete seu ID em visualAssetIds.',
            moldaUsable
              ? 'Molda disponível: crie tarefas molda para model, material e sky da Bíblia Visual, com artKind model, texture e sky respectivamente. World continua no studio. Cada criação tem um cartão; a tarefa studio que a usa depende desse cartão, sem repetir a cobertura em visualAssetIds.'
              : 'Molda indisponível: use apenas Pinta e Estúdio. Modelos, mundo e materiais são tarefas studio com visualAssetIds. Não proponha criação de céu HDR no Molda.',
            visualCardChecklist(visual, moldaUsable),
            'Tarefas studio devem usar somente IDs do catálogo abaixo. IDs de steps e criteria precisam ser estáveis e únicos por tarefa.',
            `PEDIDO: ${body.feedback ?? 'nenhum'}`,
            plannerCatalogPrompt(tier, idea.dimension),
          ]
          const generatePlan = (problem: string | null) =>
            generate({
              schema: TaskPlanDraftSchema,
              schemaName: 'pensa_task_plan_v1',
              label: 'Cartões de Criação pequenos, ordenados e com dependências',
              user: [
                ...prompt,
                ...(problem
                  ? [
                      `O PLANO ANTERIOR FOI RECUSADO: ${problem}.\nGere o plano completo de novo, sem esse problema, seguindo a lista de CARTÕES DA BÍBLIA VISUAL.`,
                    ]
                  : []),
              ].join('\n\n'),
              maxTokens: 8000,
              // O plano inteiro sai numa geração só (sem stream): o corpo chega no
              // FIM — 30s derrubava o task_plan real ("pendurou o corpo", 08/2026).
              bodyTimeoutMs: 180_000,
              // A 2ª geração não ganha, por dentro, o reparo de JSON (outra chamada de 3 min).
              ...(problem ? { maxAttempts: 1 as const } : {}),
            })
          const build = (raw: TaskPlanDraft, switchTools = false) =>
            buildTaskPlan(raw, {
              visual,
              tier,
              dimension: idea.dimension,
              moldaAvailable,
              switchTools,
            })
          const startedAt = Date.now()
          let tasks: ResolvedPlanTask[]
          try {
            tasks = build(await generatePlan(null))
          } catch (cause) {
            // Uma segunda chance, com o motivo: sabendo o que errou, o modelo costuma acertar.
            // Só para plano recusado pela validação (falha da IA, timeout ou JSON não repete) e
            // só se a 1ª não demorou demais.
            if (!(cause instanceof PensaCatalogDriftError)) throw cause
            if (Date.now() - startedAt > PLAN_RETRY_DEADLINE_MS) throw cause
            console.warn('[pensa-ai] plano recusado, gerando de novo', { problem: cause.message })
            // Na 2ª o cartão na ferramenta errada troca de ferramenta (último recurso).
            tasks = build(await generatePlan(cause.message), true)
          }
          const written = await members.pensaReplaceTasks(cycleId, tasks)
          if (written.status !== 200 || !written.body)
            return membersFailure(written, 'PENSA_TASKS_NOT_SAVED', PLAN_OUT_OF_PLACE)
          content = TaskPlanArtifactSchema.parse({
            taskIds: written.body.tasks.map((task) => task.id),
            generatedAt: new Date().toISOString(),
            catalog: 'studio-official',
          })
        } else {
          const [rStage, zStage, eStage, gamification] = await Promise.all([
            getStage('r'),
            getStage('z'),
            getStage('e'),
            members.getGamification(),
          ])
          if (gamification.status !== 200) return fail('PENSA_TIER_UNAVAILABLE', 503)
          const gameDimension = validatedContent(zStage, 'idea', IdeaArtifactSchema).dimension
          const visual = validatedContent(eStage, 'visual_direction', VisualDirectionArtifactSchema)
          const capabilities = await getPensaCapabilities(
            members,
            gamification.body?.level?.slug,
            user.role,
          )
          if (!capabilities) return fail('PENSA_TIER_UNAVAILABLE', 503)
          const { tier } = capabilities
          content = auditPlan(
            rStage,
            availablePlannerCatalog(tier, gameDimension),
            gameDimension,
            body.approved,
            visual,
            capabilities,
          )
        }

        const stage =
          body.type === 'idea'
            ? 'z'
            : body.type === 'game_design' || body.type === 'visual_direction'
              ? 'e'
              : body.type === 'task_plan'
                ? 'r'
                : 'o'
        const saved = await members.pensaSaveArtifact(cycleId, { stage, type: body.type, content })
        if (saved.status !== 200 || !saved.body)
          return membersFailure(saved, 'PENSA_ARTIFACT_NOT_SAVED', NOT_SAVED)
        if (body.type === 'plan_review' && (content as PlanReviewArtifact).approved) {
          const validated = await members.pensaValidateArtifact(cycleId, 'plan_review')
          if (validated.status !== 200)
            return membersFailure(validated, 'PENSA_ARTIFACT_NOT_VALIDATED', NOT_SAVED)
          return { status: 200, body: validated.body ?? saved.body }
        }
        return { status: 200, body: saved.body }
      }
      // A mensagem do erro vai INTEIRA para a tela da criança. Só o `PensaStepError` foi escrito
      // para ela; todo o resto (provider, parser, validação do plano, Zod) vai ao LOG e a tela
      // recebe uma frase gentil. Antes a validação do plano chegava crua ("A tarefa
      // molda_tela_vitoria_background não corresponde à criação 3D da Bíblia Visual", QA 02/10).
      const mapGenerateError = (cause: unknown): GenerateReply => {
        if (cause instanceof PensaStepError)
          return fail('PENSA_GENERATION_FAILED', 409, cause.message)
        console.error('[pensa-ai] geração falhou', { type: body.type, cause })
        if (cause instanceof PensaCatalogDriftError) return fail(cause.code, 422, PLAN_OUT_OF_PLACE)
        if (cause instanceof PensaLlmError)
          return fail(
            'PENSA_AI_UNAVAILABLE',
            cause.status ?? 502,
            'A IA demorou ou tropeçou agora. Espere um pouquinho e tente de novo.',
          )
        if (cause instanceof SyntaxError)
          // JSON quebrado do modelo, mesmo após o pedido de reparo.
          return fail(
            'PENSA_GENERATION_FAILED',
            409,
            'A IA se atrapalhou com o plano agora. Espere um pouquinho e tente de novo.',
          )
        return fail(
          'PENSA_GENERATION_FAILED',
          409,
          'Não deu para criar isso agora. Espere um pouquinho e tente de novo.',
        )
      }

      // A geração leva MINUTOS sem stream (o corpo do task_plan só chega no
      // fim) e a borda (Railway; Cloudflare em prod) derruba POST mudo com 502.
      // A resposta vira SSE com TTFB imediato + ping 15s (padrão do chat) e o
      // resultado final sai num único evento done/error.
      const encoder = new TextEncoder()
      let closed = false
      let ping: ReturnType<typeof setInterval> | undefined
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const write = (chunk: string) => {
            if (closed) return
            try {
              controller.enqueue(encoder.encode(chunk))
            } catch {
              closed = true
            }
          }
          const send = (event: string, data: unknown) =>
            write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          write(': ok\n\n')
          ping = setInterval(() => write(': ping\n\n'), 15_000)
          void (async () => {
            try {
              const reply = await runGenerate().catch(mapGenerateError)
              const envelope = (reply.body ?? {}) as { error?: { code?: string; message?: string } }
              if (reply.status === 200 && !envelope.error) send('done', reply.body)
              else
                send('error', {
                  status: reply.status,
                  code: envelope.error?.code ?? 'PENSA_GENERATION_FAILED',
                  ...(envelope.error?.message ? { message: envelope.error.message } : {}),
                })
            } finally {
              if (ping) clearInterval(ping)
              closed = true
              try {
                controller.close()
              } catch {}
            }
          })()
        },
        // Desconexão do cliente NÃO aborta a geração (≠ chat): se ela terminar,
        // tasks/artefato persistem no members e um F5 mostra o resultado —
        // abortar no meio poderia deixar pensaReplaceTasks aplicado sem o
        // artefato salvo. Daqui em diante o write() vira no-op.
        cancel() {
          closed = true
          if (ping) clearInterval(ping)
        },
      })
      return new Response(stream, { headers: sseHeaders })
    },
  }

  return { pensaChat, pensaGenerateArtifact }
}
