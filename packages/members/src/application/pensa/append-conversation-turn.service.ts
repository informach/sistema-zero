import type { CourseAudience } from '../../domain/course/course'
import { trimConversation } from '../../domain/pensa/conversation'
import {
  MAX_CONVERSATION_CHARS,
  MAX_CONVERSATION_MESSAGES,
  type PensaChatMessage,
  type PensaWorkStage,
} from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'

export interface AppendPensaConversationTurnInput {
  userMessage: { content: string }
  assistantMessage: { content: string }
  /** Presente = SUBSTITUI o state inteiro; ausente preserva o atual. */
  state?: Record<string, unknown>
  /** Presente = substitui a sumarização (quando o cap cortou mensagens antigas). */
  summary?: string
}

export interface AppendPensaConversationTurnResult {
  state: Record<string, unknown>
  messageCount: number
}

/**
 * Grava UM turno (user + assistant) na conversa da etapa — upsert por
 * (cycle, stage). Aplica o TRIM do contrato (últimas 80 mensagens E ≤262K chars,
 * corte do início) preservando o `messageCount` TOTAL histórico (+2 por turno).
 */
export class AppendPensaConversationTurnService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    cycleId: string,
    stage: PensaWorkStage,
    input: AppendPensaConversationTurnInput,
  ): Promise<AppendPensaConversationTurnResult> {
    const found = await this.repo.findCycleWithProject(cycleId, userId, audience)
    if (!found) throw new PensaNotFoundError()

    const existing = (await this.repo.getConversation(cycleId, stage)) ?? {
      messages: [] as PensaChatMessage[],
      summary: null,
      state: {},
      messageCount: 0,
    }

    const now = this.clock()
    const at = now.toISOString()
    const messages = trimConversation(
      [
        ...existing.messages,
        { role: 'user', content: input.userMessage.content, at },
        { role: 'assistant', content: input.assistantMessage.content, at },
      ],
      { maxMessages: MAX_CONVERSATION_MESSAGES, maxChars: MAX_CONVERSATION_CHARS },
    )
    const state = input.state ?? existing.state
    const summary = input.summary ?? existing.summary
    const messageCount = existing.messageCount + 2

    await this.repo.upsertConversation(
      found.project.id,
      { cycleId, stage, messages, summary, state, messageCount },
      now,
    )
    return { state, messageCount }
  }
}
