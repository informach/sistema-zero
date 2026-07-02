import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitizeIconSvg } from '../lib/svg-sanitize'
import type { PensaChatMessage, PensaZState } from '../lib/types'
import type { MembersClient } from '../server/clients'
import { generateIcons, suggestIdentity } from '../server/pensa-agents/identity'
import { synthesizeSpec } from '../server/pensa-agents/stage-e-spec'
import { buildChecklistSeed } from '../server/pensa-agents/stage-o-checklist'
import { synthesizeMissions } from '../server/pensa-agents/stage-r-missions'
import { buildStageZSystem } from '../server/pensa-agents/stage-z'
import { evaluateStageZ } from '../server/pensa-agents/stage-z-evaluator'
import { synthesizeIdea } from '../server/pensa-agents/stage-z-idea'
import { PensaLlmError, pensaLlmAvailable, streamPensaChat } from '../server/pensa-llm'
import type { SessionModule } from '../server/session'

export type PensaAiRoutes = ReturnType<typeof createPensaAiRoutes>

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const ChatBody = z.object({
  projectId: z.string().regex(UUID_RE),
  cycleId: z.string().regex(UUID_RE),
  stage: z.literal('z'),
  message: z.string().trim().min(1).max(2000),
})

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const PaletteSchema = z.object({
  name: z.string().trim().min(1).max(40),
  colors: z.array(z.string().regex(HEX_RE)).min(4).max(6),
})

// Um endpoint de geração por ciclo; o `type` (e o `step` da identidade) escolhe a síntese.
const GenerateBody = z.discriminatedUnion('type', [
  z.object({ type: z.literal('idea') }),
  z.object({
    type: z.literal('friendly_spec'),
    projectId: z.string().regex(UUID_RE),
    /** Revisão: o pedido de mudança da criança sobre a versão anterior. */
    feedback: z.string().trim().min(2).max(500).optional(),
  }),
  z.object({
    type: z.literal('identity'),
    projectId: z.string().regex(UUID_RE),
    step: z.literal('suggestions'),
  }),
  z.object({
    type: z.literal('identity'),
    projectId: z.string().regex(UUID_RE),
    step: z.literal('icons'),
    name: z.string().trim().min(2).max(40),
    palette: PaletteSchema,
  }),
  z.object({
    type: z.literal('identity'),
    projectId: z.string().regex(UUID_RE),
    step: z.literal('save'),
    name: z.string().trim().min(2).max(40),
    palette: PaletteSchema,
    iconSvg: z.string().max(16_384).nullable(),
  }),
  // Plano de missões da etapa R (a criança executa no Estúdio).
  z.object({
    type: z.literal('mission_plan'),
    projectId: z.string().regex(UUID_RE),
  }),
  // Determinístico (sem LLM): semeia o checklist do Grande Lançamento na etapa O.
  z.object({
    type: z.literal('checklist_seed'),
    projectId: z.string().regex(UUID_RE),
  }),
])

// ── Rate limit in-process por SESSÃO (réplica única; estado em globalThis) ───
// Chat: 10 msgs/min + teto diário (custo/compulsão — "o Zappy precisa descansar").
const RL_KEY = Symbol.for('@sistemazero/member-shell/pensa-chat-rl')
interface RlEntry {
  count: number
  resetAt: number
  dayCount: number
  dayKey: string
}
type RlMap = Map<string, RlEntry>
const rlSlot = globalThis as Record<symbol, unknown>
if (!rlSlot[RL_KEY]) rlSlot[RL_KEY] = new Map<string, RlEntry>()
const rlStore = rlSlot[RL_KEY] as RlMap

const CHAT_PER_MINUTE = 10
const CHAT_PER_DAY = 150
/** Janela do prompt: summary + as últimas N mensagens persistidas. */
const PROMPT_WINDOW = 24

export function pensaChatRateLimited(key: string, now = Date.now()): boolean {
  const dayKey = new Date(now).toISOString().slice(0, 10)
  let e = rlStore.get(key)
  if (!e || e.dayKey !== dayKey) {
    e = { count: 0, resetAt: now + 60_000, dayCount: 0, dayKey }
    rlStore.set(key, e)
  }
  if (e.resetAt <= now) {
    e.count = 0
    e.resetAt = now + 60_000
  }
  if (e.count >= CHAT_PER_MINUTE || e.dayCount >= CHAT_PER_DAY) return true
  e.count += 1
  e.dayCount += 1
  return false
}

const sseHeaders = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  // `no-transform` + X-Accel-Buffering: nada de buffering/compressão no caminho
  // (Cloudflare respeita text/event-stream; o ping cobre o corte por ociosidade).
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
} as const

/**
 * Rotas de IA do Pensa (fase da etapa Z):
 * - `POST /api/pensa/chat` — chat SSE com o agente de clareza (Zappy). Fluxo:
 *   guards → carrega projeto+conversa (members) → stream OpenRouter (event: delta)
 *   → evaluator estruturado (5 perguntas) → persiste o turno COMPLETO no members
 *   (abort = nada persiste) → `event: state` + `event: done`.
 * - `POST /api/pensa/cycles/:cycleId/artifacts/generate` — sínteses. Fase atual:
 *   `type: 'idea'` (Carta da Ideia; exige as 5 perguntas respondidas).
 *
 * A chamada ao OpenRouter NÃO passa pelo gateway; a persistência sim (members é o
 * portão de ownership). SSE mesma origem — coberto pelo `connect-src 'self'`.
 */
export function createPensaAiRoutes(deps: { members: MembersClient; session: SessionModule }) {
  const { members, session } = deps

  const pensaChat = {
    POST: async (req: Request) => {
      // Impersonação é SOMENTE-LEITURA (suporte não conversa pelo aluno) e o chat
      // exige sessão viva (o gateway 401aria depois, mas falhar cedo é mais claro).
      const user = await session.getSession()
      if (!user) {
        return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
      }
      if (user.act) {
        return NextResponse.json(
          { error: { code: 'IMPERSONATION_READONLY', message: 'Sessão de suporte é só leitura.' } },
          { status: 403 },
        )
      }
      if (!pensaLlmAvailable()) {
        return NextResponse.json(
          {
            error: {
              code: 'PENSA_AI_UNAVAILABLE',
              message: 'O Zappy está descansando agora. Tente mais tarde.',
            },
          },
          { status: 503 },
        )
      }
      if (pensaChatRateLimited(user.id)) {
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'O Zappy precisa descansar um pouquinho. Já volto!',
            },
          },
          { status: 429 },
        )
      }
      const parsed = ChatBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
      }
      const { projectId, cycleId, stage, message } = parsed.data

      // Pré-voo FORA do stream (erros viram JSON com status certo, não SSE quebrado):
      // projeto (nome/kind/goal p/ o prompt) + conversa/estado da etapa. O members é
      // o portão de ownership em ambos.
      const projectRes = await members.pensaGetProject(projectId)
      if (projectRes.status !== 200 || !projectRes.body) {
        return NextResponse.json(projectRes.body ?? { error: { code: 'PENSA_NOT_FOUND' } }, {
          status: projectRes.status === 200 ? 502 : projectRes.status,
        })
      }
      const project = projectRes.body.project
      const cycle = project.cycles.find((c) => c.id === cycleId)
      if (!cycle) {
        return NextResponse.json({ error: { code: 'PENSA_NOT_FOUND' } }, { status: 404 })
      }
      // Conversa só na etapa CORRENTE do ciclo (voltar a etapas fechadas é leitura).
      if (cycle.stage !== stage) {
        return NextResponse.json({ error: { code: 'PENSA_STAGE_MISMATCH' } }, { status: 409 })
      }
      const stageRes = await members.pensaGetStage(cycleId, stage)
      if (stageRes.status !== 200 || !stageRes.body) {
        return NextResponse.json(stageRes.body ?? { error: { code: 'PENSA_NOT_FOUND' } }, {
          status: stageRes.status === 200 ? 502 : stageRes.status,
        })
      }
      const conversation = stageRes.body.conversation
      const prevState = stageRes.body.state as unknown as PensaZState | Record<string, never>
      const zState: PensaZState | null =
        prevState && typeof prevState === 'object' && 'answered' in prevState
          ? (prevState as PensaZState)
          : null

      const system = buildStageZSystem({
        mode: 'kids',
        projectName: project.name,
        projectKind: project.kind,
        cycleNumber: cycle.number,
        cycleGoal: cycle.goal,
        summary: conversation.summary,
        state: zState,
      })
      const windowMessages = conversation.messages.slice(-PROMPT_WINDOW)
      const wire = [
        { role: 'system' as const, content: system },
        ...windowMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: message },
      ]

      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          let closed = false
          const safeEnqueue = (bytes: Uint8Array) => {
            if (closed) return
            try {
              controller.enqueue(bytes)
            } catch {
              closed = true
            }
          }
          const send = (event: string, data: unknown) =>
            safeEnqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          // Cloudflare derruba conexão ociosa (~100s sem bytes) — ping a cada 15s.
          const ping = setInterval(() => safeEnqueue(encoder.encode(': ping\n\n')), 15_000)

          void (async () => {
            try {
              const assistantText = await streamPensaChat({
                messages: wire,
                signal: req.signal,
                onDelta: (text) => send('delta', text),
              })
              if (req.signal.aborted) return // abort = nada persiste
              if (!assistantText.trim()) {
                send('error', {
                  code: 'PENSA_AI_EMPTY',
                  message: 'O Zappy se enrolou. Tente de novo.',
                })
                return
              }

              // Evaluator (juiz das 5 perguntas) sobre o transcript ATUALIZADO.
              // Falha do juiz NÃO derruba o turno: mantém o estado anterior.
              const updated: PensaChatMessage[] = [
                ...conversation.messages,
                { role: 'user', content: message, at: '' },
                { role: 'assistant', content: assistantText, at: '' },
              ]
              let state: Record<string, unknown> | undefined
              try {
                state = (await evaluateStageZ(updated, conversation.summary)) as unknown as Record<
                  string,
                  unknown
                >
              } catch {
                state = undefined
              }

              // Persiste o turno COMPLETO (user+assistant+state numa chamada).
              const saved = await members.pensaAppendTurn(cycleId, stage, {
                userMessage: { content: message },
                assistantMessage: { content: assistantText },
                ...(state ? { state } : {}),
              })
              if (saved.status !== 200 || !saved.body) {
                send('error', {
                  code: 'PENSA_TURN_NOT_SAVED',
                  message: 'Não consegui guardar essa conversa. Tente de novo.',
                })
                return
              }
              send('state', saved.body.state)
              send('done', { messageCount: saved.body.messageCount })
            } catch (err) {
              if (req.signal.aborted) return
              send('error', {
                code: 'PENSA_AI_UNAVAILABLE',
                message:
                  err instanceof PensaLlmError && err.status === 503
                    ? 'O Zappy está descansando agora. Tente mais tarde.'
                    : 'O Zappy tropeçou aqui. Tente de novo.',
              })
            } finally {
              clearInterval(ping)
              closed = true
              try {
                controller.close()
              } catch {
                // já fechado (cliente foi embora) — nada a fazer.
              }
            }
          })()
        },
        cancel() {
          // Reader do cliente cancelou — o abort do req.signal já corta o upstream.
        },
      })
      return new Response(stream, { headers: sseHeaders })
    },
  }

  const pensaGenerateArtifact = {
    POST: async (req: Request, ctx: { params: Promise<{ cycleId: string }> }) => {
      const user = await session.getSession()
      if (!user) {
        return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
      }
      if (user.act) {
        return NextResponse.json(
          { error: { code: 'IMPERSONATION_READONLY', message: 'Sessão de suporte é só leitura.' } },
          { status: 403 },
        )
      }
      const { cycleId } = await ctx.params
      if (!UUID_RE.test(cycleId)) {
        return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
      }
      const parsed = GenerateBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
      }
      const body = parsed.data
      // `identity/save` e `checklist_seed` NÃO chamam IA — dispensam disponibilidade e teto.
      const callsLlm =
        body.type !== 'checklist_seed' && !(body.type === 'identity' && body.step === 'save')
      if (callsLlm && !pensaLlmAvailable()) {
        return NextResponse.json({ error: { code: 'PENSA_AI_UNAVAILABLE' } }, { status: 503 })
      }
      // Reusa o teto do chat (síntese também é chamada de IA).
      if (callsLlm && pensaChatRateLimited(user.id)) {
        return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 })
      }

      /** Ideia clarificada (latest do type `idea` na etapa z) — insumo das sínteses da E. */
      const loadIdeaText = async (): Promise<string | NextResponse> => {
        const zRes = await members.pensaGetStage(cycleId, 'z')
        if (zRes.status !== 200 || !zRes.body) {
          return NextResponse.json(zRes.body ?? { error: { code: 'PENSA_NOT_FOUND' } }, {
            status: zRes.status === 200 ? 502 : zRes.status,
          })
        }
        const idea = zRes.body.artifacts.find((a) => a.type === 'idea')
        const text =
          idea && typeof idea.content === 'object' && idea.content !== null
            ? (idea.content as { text?: unknown }).text
            : null
        if (typeof text !== 'string' || !text.trim()) {
          return NextResponse.json(
            { error: { code: 'PENSA_NOT_READY', message: 'A Carta da Ideia ainda não existe.' } },
            { status: 409 },
          )
        }
        return text
      }

      /** Projeto + ciclo (contexto de prompt) com checagem de etapa corrente. */
      const loadProjectCycle = async (projectId: string, requiredStage: 'e' | 'r' | 'o') => {
        const projectRes = await members.pensaGetProject(projectId)
        if (projectRes.status !== 200 || !projectRes.body) {
          return NextResponse.json(projectRes.body ?? { error: { code: 'PENSA_NOT_FOUND' } }, {
            status: projectRes.status === 200 ? 502 : projectRes.status,
          })
        }
        const project = projectRes.body.project
        const cycle = project.cycles.find((c) => c.id === cycleId)
        if (!cycle) {
          return NextResponse.json({ error: { code: 'PENSA_NOT_FOUND' } }, { status: 404 })
        }
        if (cycle.stage !== requiredStage) {
          return NextResponse.json({ error: { code: 'PENSA_STAGE_MISMATCH' } }, { status: 409 })
        }
        return { project, cycle }
      }

      const aiFailed = (message: string) =>
        NextResponse.json({ error: { code: 'PENSA_AI_UNAVAILABLE', message } }, { status: 502 })

      // ── type: 'idea' — a Carta da Ideia (etapa Z) ─────────────────────────
      if (body.type === 'idea') {
        // Exige as 5 perguntas respondidas (estado do evaluator).
        const stageRes = await members.pensaGetStage(cycleId, 'z')
        if (stageRes.status !== 200 || !stageRes.body) {
          return NextResponse.json(stageRes.body ?? { error: { code: 'PENSA_NOT_FOUND' } }, {
            status: stageRes.status === 200 ? 502 : stageRes.status,
          })
        }
        const state = stageRes.body.state as unknown as PensaZState | Record<string, never>
        const ready = state && typeof state === 'object' && 'ready' in state && state.ready === true
        if (!ready) {
          return NextResponse.json(
            {
              error: {
                code: 'PENSA_NOT_READY',
                message: 'Ainda faltam perguntas para clarear a ideia.',
              },
            },
            { status: 409 },
          )
        }
        try {
          const idea = await synthesizeIdea(
            'kids',
            stageRes.body.conversation.messages,
            stageRes.body.conversation.summary,
          )
          const saved = await members.pensaSaveArtifact(cycleId, {
            stage: 'z',
            type: 'idea',
            content: idea,
          })
          return NextResponse.json(saved.body ?? { ok: saved.status === 200 }, {
            status: saved.status,
          })
        } catch {
          return aiFailed('Não consegui montar a Carta agora. Tente de novo.')
        }
      }

      // ── type: 'friendly_spec' — PRD interno + tirinhas/wireframes (etapa E) ─
      if (body.type === 'friendly_spec') {
        const loaded = await loadProjectCycle(body.projectId, 'e')
        if (loaded instanceof NextResponse) return loaded
        const ideaText = await loadIdeaText()
        if (ideaText instanceof NextResponse) return ideaText

        // Revisão: a spec anterior vem do latest da etapa E + o pedido da criança.
        let previousSpec: unknown
        if (body.feedback) {
          const eRes = await members.pensaGetStage(cycleId, 'e')
          if (eRes.status === 200 && eRes.body) {
            previousSpec = eRes.body.artifacts.find((a) => a.type === 'friendly_spec')?.content
          }
        }
        try {
          const spec = await synthesizeSpec({
            mode: 'kids',
            projectName: loaded.project.name,
            cycleNumber: loaded.cycle.number,
            cycleGoal: loaded.cycle.goal,
            ideaText,
            ...(previousSpec && body.feedback ? { previousSpec, feedback: body.feedback } : {}),
          })
          // O PRD interno acompanha a spec (mesma chamada = consistentes); a criança
          // valida SÓ a friendly_spec (o gate e→r exige friendly_spec + identity).
          const prdSaved = await members.pensaSaveArtifact(cycleId, {
            stage: 'e',
            type: 'prd',
            content: { markdown: spec.prdMarkdown },
          })
          if (prdSaved.status !== 200) {
            return NextResponse.json(prdSaved.body ?? { ok: false }, { status: prdSaved.status })
          }
          const saved = await members.pensaSaveArtifact(cycleId, {
            stage: 'e',
            type: 'friendly_spec',
            content: spec.friendly,
          })
          return NextResponse.json(saved.body ?? { ok: saved.status === 200 }, {
            status: saved.status,
          })
        } catch {
          return aiFailed('Não consegui desenhar o jogo agora. Tente de novo.')
        }
      }

      // ── type: 'mission_plan' — missões da etapa R (criança constrói no Estúdio) ─
      if (body.type === 'mission_plan') {
        const onR = await loadProjectCycle(body.projectId, 'r')
        if (onR instanceof NextResponse) return onR
        const eRes = await members.pensaGetStage(cycleId, 'e')
        if (eRes.status !== 200 || !eRes.body) {
          return NextResponse.json(eRes.body ?? { error: { code: 'PENSA_NOT_FOUND' } }, {
            status: eRes.status === 200 ? 502 : eRes.status,
          })
        }
        const prd = eRes.body.artifacts.find((a) => a.type === 'prd')?.content as
          | { markdown?: unknown }
          | undefined
        const friendly = eRes.body.artifacts.find((a) => a.type === 'friendly_spec')?.content
        const identity = eRes.body.artifacts.find((a) => a.type === 'identity')?.content as
          | { name?: string; palette?: { colors?: string[] } }
          | undefined
        if (typeof prd?.markdown !== 'string' || !friendly) {
          return NextResponse.json(
            { error: { code: 'PENSA_NOT_READY', message: 'O desenho do jogo ainda não existe.' } },
            { status: 409 },
          )
        }
        try {
          const tasks = await synthesizeMissions({
            mode: 'kids',
            projectName: onR.project.name,
            cycleNumber: onR.cycle.number,
            cycleGoal: onR.cycle.goal,
            prdMarkdown: prd.markdown,
            friendlySpec: friendly,
            identity: identity ?? null,
          })
          const replaced = await members.pensaReplaceTasks(cycleId, tasks)
          if (replaced.status !== 200 || !replaced.body) {
            return NextResponse.json(replaced.body ?? { ok: false }, { status: replaced.status })
          }
          // Espelho auditável do plano como artefato da etapa R.
          await members.pensaSaveArtifact(cycleId, {
            stage: 'r',
            type: 'mission_plan',
            content: { tasks },
          })
          return NextResponse.json(replaced.body, { status: 200 })
        } catch {
          return aiFailed('Não consegui montar as missões agora. Tente de novo.')
        }
      }

      // ── type: 'checklist_seed' — template determinístico do Grande Lançamento ─
      if (body.type === 'checklist_seed') {
        const seeded = await loadProjectCycle(body.projectId, 'o')
        if (seeded instanceof NextResponse) return seeded
        const items = buildChecklistSeed({
          mode: 'kids',
          gameName: seeded.project.name,
          cycleNumber: seeded.cycle.number,
        })
        const replaced = await members.pensaReplaceChecklist(cycleId, items)
        if (replaced.status !== 200 || !replaced.body) {
          return NextResponse.json(replaced.body ?? { ok: false }, { status: replaced.status })
        }
        // Espelho auditável do seed como artefato da etapa O.
        await members.pensaSaveArtifact(cycleId, {
          stage: 'o',
          type: 'checklist_seed',
          content: { items },
        })
        return NextResponse.json(replaced.body, { status: 200 })
      }

      // ── type: 'identity' — funil nome → paleta → ícone (etapa E) ───────────
      const loaded = await loadProjectCycle(body.projectId, 'e')
      if (loaded instanceof NextResponse) return loaded

      if (body.step === 'suggestions') {
        const ideaText = await loadIdeaText()
        if (ideaText instanceof NextResponse) return ideaText
        try {
          const suggestions = await suggestIdentity({
            mode: 'kids',
            projectName: loaded.project.name,
            ideaText,
          })
          return NextResponse.json({ suggestions }, { status: 200 })
        } catch {
          return aiFailed('Não consegui sugerir nomes agora. Tente de novo.')
        }
      }

      if (body.step === 'icons') {
        const ideaText = await loadIdeaText()
        if (ideaText instanceof NextResponse) return ideaText
        try {
          const icons = await generateIcons({
            mode: 'kids',
            gameName: body.name,
            ideaText,
            palette: body.palette,
          })
          if (icons.length === 0) {
            return aiFailed('Os ícones não saíram bons. Tente gerar de novo.')
          }
          return NextResponse.json({ icons }, { status: 200 })
        } catch {
          return aiFailed('Não consegui desenhar os ícones agora. Tente de novo.')
        }
      }

      // step: 'save' — sem IA: sanitiza o ícone escolhido e grava o artefato.
      // A escolha da criança no funil É a validação → valida o latest em seguida
      // (o gate e→r exige `identity` validated).
      const iconSvg = body.iconSvg === null ? null : sanitizeIconSvg(body.iconSvg)
      if (body.iconSvg !== null && iconSvg === null) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
      }
      const saved = await members.pensaSaveArtifact(cycleId, {
        stage: 'e',
        type: 'identity',
        content: { name: body.name, palette: body.palette, iconSvg },
      })
      if (saved.status !== 200 || !saved.body) {
        return NextResponse.json(saved.body ?? { ok: false }, { status: saved.status })
      }
      const validated = await members.pensaValidateArtifact(cycleId, 'identity')
      return NextResponse.json(validated.body ?? saved.body, {
        status: validated.status === 200 ? 200 : validated.status,
      })
    },
  }

  return { pensaChat, pensaGenerateArtifact }
}
