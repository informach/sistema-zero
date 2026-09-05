import { AiNotConfiguredError, TicketNotFoundError } from '../../domain/helpdesk-errors'
import type { LlmClient } from '../../domain/ports/llm-client.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { TicketRepository } from '../../domain/ports/ticket-repository.port'
import type { Ticket } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'
import type { TicketView } from '../views'
import { toTicketView } from '../views'
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
    const messages = await this.messages.byTicketId(ticket.id)
    const threadText = buildThreadText(ticket.subject, messages, this.config.maxThreadChars)
    const classification = await this.classifyAndPersist(ticket.id, threadText)
    const draft = await this.draftAndPersist(ticket.id, threadText, classification.summary)
    const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound') ?? null
    const hasOutbound = messages.some((m) => m.direction === 'outbound')
    return { classification, draft, lastInbound, hasOutbound }
  }

  /** On-demand: só classificar+resumir (rota summarize). Fecha com markAiDone. */
  async summarize(ticketId: string): Promise<TicketView> {
    const ticket = await this.requireTicket(ticketId)
    const messages = await this.messages.byTicketId(ticketId)
    const threadText = buildThreadText(ticket.subject, messages, this.config.maxThreadChars)
    await this.classifyAndPersist(ticketId, threadText)
    await this.tickets.markAiDone(ticketId, this.now())
    return this.viewOf(ticketId)
  }

  /** On-demand: só rascunho (rota regenerate). Fecha com markAiDone. */
  async regenerateDraft(ticketId: string): Promise<TicketView> {
    const ticket = await this.requireTicket(ticketId)
    const messages = await this.messages.byTicketId(ticketId)
    const threadText = buildThreadText(ticket.subject, messages, this.config.maxThreadChars)
    await this.draftAndPersist(ticketId, threadText, ticket.aiSummary ?? '')
    await this.tickets.markAiDone(ticketId, this.now())
    return this.viewOf(ticketId)
  }

  private async classifyAndPersist(ticketId: string, threadText: string): Promise<ClassifyResult> {
    const { system, user } = buildClassifyPrompt(threadText)
    const result = await this.llmOrThrow().complete({
      system,
      user,
      schema: ClassifySchema,
      label: 'classify',
      maxTokens: 800,
    })
    await this.tickets.applyClassification(ticketId, {
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
    return result
  }

  private async draftAndPersist(
    ticketId: string,
    threadText: string,
    summary: string,
  ): Promise<DraftResult> {
    const kbArticles = await this.kbArticles()
    const { system, user } = buildDraftPrompt({ threadText, summary, kbArticles })
    const result = await this.llmOrThrow().complete({
      system,
      user,
      schema: DraftSchema,
      label: 'draft',
      maxTokens: 1500,
    })
    await this.tickets.applyDraft(ticketId, result.reply, this.now())
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
