import {
  AiNotConfiguredError,
  ConcurrencyConflictError,
  TicketNotFoundError,
} from '../../domain/helpdesk-errors'
import type { LlmClient } from '../../domain/ports/llm-client.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { AiWriteGuard, TicketRepository } from '../../domain/ports/ticket-repository.port'
import type { Ticket } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'
import type { TicketView } from '../views'
import { toTicketView } from '../views'
import { selectRelevantKbArticles } from './kb-context'
import {
  buildClassifyPrompt,
  buildDraftPrompt,
  buildThreadText,
  type ClassifyResult,
  ClassifySchema,
  type DraftResult,
  DraftSchema,
} from './prompts'

export interface TicketAiConfig {
  maxThreadChars: number
  maxKbChars: number
  onKbContextSelected?: (stats: { articles: number; chars: number }) => void
}

/** Provedor de artigos do KB p/ o prompt de rascunho (vazio na F3; F4 injeta os publicados). */
export type KbArticlesProvider = () => Promise<{ title: string; content: string }[]>

export interface AiPipelineResult {
  classification: ClassifyResult
  draft: DraftResult
  /** Fatos da thread para classificação, resumo e rascunho do copiloto (F4). */
  lastInbound: TicketMessage | null
  hasOutbound: boolean
}

/** Controle de fluxo: a conversa mudou enquanto o modelo respondia. */
export class AiGenerationSupersededError extends Error {
  constructor() {
    super('A conversa mudou durante o processamento da IA')
    this.name = 'AiGenerationSupersededError'
  }
}

/**
 * Orquestra a IA de um ticket: classifica+resume e rascunha. Persiste via os
 * métodos de IA do repo (sem tocar em `version`; categoria manual e prioridade
 * humana são preservadas). A gestão de `ai_status` (claim/done/backoff) é do
 * ai-worker; as rotas on-demand (summarize/regenerate) fecham com `markAiDone`.
 */
export class TicketAiService {
  constructor(
    private readonly llm: LlmClient | null,
    private readonly tickets: TicketRepository,
    private readonly messages: MessageRepository,
    private readonly kbArticles: KbArticlesProvider,
    private readonly config: TicketAiConfig,
    private readonly now: () => Date,
  ) {}

  /** Pipeline completo (worker): classifica+resume e rascunha. NÃO mexe em ai_status. */
  async runPipeline(ticket: Ticket): Promise<AiPipelineResult> {
    const guard = {
      generation: ticket.aiGeneration,
      ...(ticket.aiStatus === 'processing' ? { processingAttempt: ticket.aiAttempts } : {}),
    } satisfies AiWriteGuard
    const messages = await this.messages.byTicketId(ticket.id)
    const threadText = buildThreadText(ticket.subject, messages, this.config.maxThreadChars)
    const classification = await this.classifyAndPersist(ticket.id, guard, threadText)
    const draft = await this.draftAndPersist(ticket.id, guard, threadText, classification.summary)
    const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound') ?? null
    const hasOutbound = messages.some((m) => m.direction === 'outbound')
    return { classification, draft, lastInbound, hasOutbound }
  }

  /** On-demand: só classificar+resumir (rota summarize). Fecha com markAiDone. */
  async summarize(ticketId: string): Promise<TicketView> {
    const ticket = await this.requireTicket(ticketId)
    const messages = await this.messages.byTicketId(ticketId)
    const threadText = buildThreadText(ticket.subject, messages, this.config.maxThreadChars)
    const guard = { generation: ticket.aiGeneration }
    try {
      await this.classifyAndPersist(ticketId, guard, threadText)
      const completed = await this.tickets.markAiDone(ticketId, guard, this.now())
      if (!completed) throw new AiGenerationSupersededError()
    } catch (error) {
      if (error instanceof AiGenerationSupersededError) {
        throw new ConcurrencyConflictError('A conversa mudou durante o resumo; tente novamente')
      }
      throw error
    }
    return this.viewOf(ticketId)
  }

  /** On-demand: só rascunho (rota regenerate). Fecha com markAiDone. */
  async regenerateDraft(ticketId: string): Promise<TicketView> {
    const ticket = await this.requireTicket(ticketId)
    const messages = await this.messages.byTicketId(ticketId)
    const threadText = buildThreadText(ticket.subject, messages, this.config.maxThreadChars)
    const guard = { generation: ticket.aiGeneration }
    try {
      await this.draftAndPersist(ticketId, guard, threadText, ticket.aiSummary ?? '')
      const completed = await this.tickets.markAiDone(ticketId, guard, this.now())
      if (!completed) throw new AiGenerationSupersededError()
    } catch (error) {
      if (error instanceof AiGenerationSupersededError) {
        throw new ConcurrencyConflictError('A conversa mudou durante o rascunho; tente novamente')
      }
      throw error
    }
    return this.viewOf(ticketId)
  }

  private async classifyAndPersist(
    ticketId: string,
    guard: AiWriteGuard,
    threadText: string,
  ): Promise<ClassifyResult> {
    const { system, user } = buildClassifyPrompt(threadText)
    const result = await this.llmOrThrow().complete({
      system,
      user,
      schema: ClassifySchema,
      label: 'classify',
      maxTokens: 800,
    })
    const persisted = await this.tickets.applyClassification(ticketId, guard, {
      category: result.category,
      priority: result.priority,
      classification: {
        category: result.category,
        priority: result.priority,
        confidence: result.confidence,
        sentiment: result.sentiment,
        flags: result.flags,
      },
      summary: result.summary,
      at: this.now(),
    })
    if (!persisted) throw new AiGenerationSupersededError()
    return result
  }

  private async draftAndPersist(
    ticketId: string,
    guard: AiWriteGuard,
    threadText: string,
    summary: string,
  ): Promise<DraftResult> {
    const kbArticles = selectRelevantKbArticles(
      `${summary}\n${threadText}`,
      await this.kbArticles(),
      this.config.maxKbChars,
    )
    this.config.onKbContextSelected?.({
      articles: kbArticles.length,
      chars: kbArticles.map((article) => `# ${article.title}\n${article.content}`).join('\n\n')
        .length,
    })
    const { system, user } = buildDraftPrompt({ threadText, summary, kbArticles })
    const result = await this.llmOrThrow().complete({
      system,
      user,
      schema: DraftSchema,
      label: 'draft',
      maxTokens: 1500,
    })
    const persisted = await this.tickets.applyDraft(ticketId, guard, result.reply, this.now())
    if (!persisted) throw new AiGenerationSupersededError()
    return result
  }

  private llmOrThrow(): LlmClient {
    if (!this.llm?.isConfigured()) throw new AiNotConfiguredError()
    return this.llm
  }

  private async requireTicket(id: string): Promise<Ticket> {
    const ticket = await this.tickets.byId(id)
    if (!ticket) throw new TicketNotFoundError()
    return ticket
  }

  private async viewOf(id: string): Promise<TicketView> {
    const ticket = await this.tickets.byId(id)
    if (!ticket) throw new TicketNotFoundError()
    return toTicketView(ticket)
  }
}
