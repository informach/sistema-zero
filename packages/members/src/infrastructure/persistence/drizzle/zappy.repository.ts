import { randomUUID } from 'node:crypto'
import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type {
  CompleteZappyQuestionInput,
  ReserveZappyQuestionInput,
  ReserveZappyQuestionResult,
  ZappyFailedQuestionsPage,
  ZappyFailureFilter,
  ZappyHistoryMessage,
  ZappyHistoryPage,
  ZappyMetrics,
  ZappyRepository,
  ZappyStoredResponse,
} from '../../../domain/ports/zappy-repository.port'
import type { Database } from './db'
import { zappyConversations, zappyMessages } from './schema'

interface StoredResponseJson extends Record<string, unknown> {
  text: string
  scope: ZappyStoredResponse['scope']
  blockReferences: ZappyStoredResponse['blockReferences']
  lessonReferences?: ZappyStoredResponse['lessonReferences']
  suggestions?: ZappyStoredResponse['suggestions']
  /** Motivo da reprova (auditoria) — NUNCA re-exposto pelo toResponse. */
  rejection?: string
}

function toResponse(row: {
  id: string
  response: unknown
  createdAt: Date
}): ZappyStoredResponse | undefined {
  if (!row.response || typeof row.response !== 'object' || Array.isArray(row.response))
    return undefined
  const value = row.response as StoredResponseJson
  if (typeof value.text !== 'string' || typeof value.scope !== 'string') return undefined
  return {
    id: row.id,
    text: value.text,
    scope: value.scope,
    blockReferences: Array.isArray(value.blockReferences) ? value.blockReferences : [],
    ...(Array.isArray(value.lessonReferences) ? { lessonReferences: value.lessonReferences } : {}),
    ...(Array.isArray(value.suggestions) ? { suggestions: value.suggestions } : {}),
    createdAt: row.createdAt.toISOString(),
  }
}

/** Janela mensal semiaberta com os dois Date codificados pelo tipo timestamp da coluna. */
export function zappyMetricsPeriod(from: Date, to: Date) {
  const period = and(
    eq(zappyMessages.role, 'assistant'),
    gte(zappyMessages.createdAt, from),
    lt(zappyMessages.createdAt, to),
  )
  if (!period) throw new Error('Janela de métricas do Zappy inválida')
  return period
}

export function zappyReservationReclaimable(processingUntil: Date | null, now: Date): boolean {
  return processingUntil === null || processingUntil <= now
}

export class DrizzleZappyRepository implements ZappyRepository {
  constructor(private readonly db: Database) {}

  private static readonly HISTORY_PAGE_SIZE = 50

  async history(
    userId: string,
    projectId: string,
    now: Date,
    expiresAt: Date,
    before?: string,
  ): Promise<ZappyHistoryPage> {
    return this.db.transaction(async (tx) => {
      const [conversation] = await tx
        .select({ id: zappyConversations.id })
        .from(zappyConversations)
        .where(
          and(
            eq(zappyConversations.userId, userId),
            eq(zappyConversations.projectId, projectId),
            gt(zappyConversations.expiresAt, now),
          ),
        )
        .limit(1)
      if (!conversation) return { messages: [], nextCursor: null }
      await tx
        .update(zappyConversations)
        .set({ updatedAt: now, expiresAt })
        .where(eq(zappyConversations.id, conversation.id))
      let cursor: { id: string; createdAt: Date } | undefined
      if (before) {
        ;[cursor] = await tx
          .select({ id: zappyMessages.id, createdAt: zappyMessages.createdAt })
          .from(zappyMessages)
          .where(
            and(eq(zappyMessages.conversationId, conversation.id), eq(zappyMessages.id, before)),
          )
          .limit(1)
        if (!cursor) return { messages: [], nextCursor: null }
      }
      const rows = await tx
        .select({
          id: zappyMessages.id,
          role: zappyMessages.role,
          content: zappyMessages.content,
          response: zappyMessages.response,
          createdAt: zappyMessages.createdAt,
        })
        .from(zappyMessages)
        .where(
          and(
            eq(zappyMessages.conversationId, conversation.id),
            cursor
              ? or(
                  lt(zappyMessages.createdAt, cursor.createdAt),
                  and(
                    eq(zappyMessages.createdAt, cursor.createdAt),
                    lt(zappyMessages.id, cursor.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(zappyMessages.createdAt), desc(zappyMessages.id))
        .limit(DrizzleZappyRepository.HISTORY_PAGE_SIZE + 1)
      const hasMore = rows.length > DrizzleZappyRepository.HISTORY_PAGE_SIZE
      const pageRows = rows.slice(0, DrizzleZappyRepository.HISTORY_PAGE_SIZE)
      const messages: ZappyHistoryMessage[] = pageRows.reverse().map((row) => {
        const response = row.role === 'assistant' ? toResponse(row) : undefined
        return {
          id: row.id,
          role: row.role === 'assistant' ? 'assistant' : 'user',
          text: row.content,
          createdAt: row.createdAt.toISOString(),
          ...(response ? { response } : {}),
        }
      })
      return {
        messages,
        nextCursor: hasMore ? (messages[0]?.id ?? null) : null,
      }
    })
  }

  async reserveQuestion(input: ReserveZappyQuestionInput): Promise<ReserveZappyQuestionResult> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        // Serializa por PERFIL (não por projeto): o rate limit precisa somar
        // perguntas simultâneas feitas em projetos/abas diferentes.
        sql`select pg_advisory_xact_lock(hashtextextended(${`zappy:${input.userId}`}, 0))`,
      )
      let [conversation] = await tx
        .select({ id: zappyConversations.id, expiresAt: zappyConversations.expiresAt })
        .from(zappyConversations)
        .where(
          and(
            eq(zappyConversations.userId, input.userId),
            eq(zappyConversations.projectId, input.projectId),
          ),
        )
        .limit(1)
      if (conversation && conversation.expiresAt <= input.now) {
        await tx.delete(zappyConversations).where(eq(zappyConversations.id, conversation.id))
        conversation = undefined
      }
      if (!conversation) {
        const id = randomUUID()
        ;[conversation] = await tx
          .insert(zappyConversations)
          .values({
            id,
            userId: input.userId,
            accountId: input.accountId,
            projectId: input.projectId,
            createdAt: input.now,
            updatedAt: input.now,
            expiresAt: input.expiresAt,
          })
          .returning({ id: zappyConversations.id, expiresAt: zappyConversations.expiresAt })
      } else {
        await tx
          .update(zappyConversations)
          .set({ updatedAt: input.now, expiresAt: input.expiresAt })
          .where(eq(zappyConversations.id, conversation.id))
      }
      if (!conversation) throw new Error('Falha ao criar conversa do Zappy')

      const [existing] = await tx
        .select({ id: zappyMessages.id, processingUntil: zappyMessages.processingUntil })
        .from(zappyMessages)
        .where(
          and(
            eq(zappyMessages.conversationId, conversation.id),
            eq(zappyMessages.clientMessageId, input.clientMessageId),
          ),
        )
        .limit(1)
      if (existing) {
        const [answer] = await tx
          .select({
            id: zappyMessages.id,
            response: zappyMessages.response,
            createdAt: zappyMessages.createdAt,
          })
          .from(zappyMessages)
          .where(eq(zappyMessages.replyToId, existing.id))
          .limit(1)
        const response = answer ? toResponse(answer) : undefined
        if (response) return { created: false, questionId: existing.id, response }
        if (zappyReservationReclaimable(existing.processingUntil, input.now)) {
          await tx
            .update(zappyMessages)
            .set({ processingUntil: input.processingUntil })
            .where(
              and(
                eq(zappyMessages.id, existing.id),
                or(
                  isNull(zappyMessages.processingUntil),
                  lte(zappyMessages.processingUntil, input.now),
                ),
              ),
            )
          return { created: true, questionId: existing.id }
        }
        return { created: false, questionId: existing.id }
      }

      const [recent] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(zappyMessages)
        .innerJoin(zappyConversations, eq(zappyConversations.id, zappyMessages.conversationId))
        .where(
          and(
            eq(zappyConversations.userId, input.userId),
            eq(zappyMessages.role, 'user'),
            gte(zappyMessages.createdAt, new Date(input.now.getTime() - 60_000)),
          ),
        )
      if ((recent?.count ?? 0) >= 10) return { created: false, rateLimited: true }

      // Memória do tutor: últimos turnos ANTES da pergunta nova (cronológico).
      // Vem na MESMA transação da reserva — zero roundtrip extra para o BFF.
      const recentRows = await tx
        .select({ role: zappyMessages.role, content: zappyMessages.content })
        .from(zappyMessages)
        .where(eq(zappyMessages.conversationId, conversation.id))
        .orderBy(desc(zappyMessages.createdAt), desc(zappyMessages.id))
        .limit(6)
      const recentMessages = recentRows
        .reverse()
        .map((row) => ({ role: row.role as 'user' | 'assistant', text: row.content }))

      const questionId = randomUUID()
      await tx.insert(zappyMessages).values({
        id: questionId,
        conversationId: conversation.id,
        role: 'user',
        content: input.question,
        clientMessageId: input.clientMessageId,
        processingUntil: input.processingUntil,
        createdAt: input.now,
      })
      return {
        created: true,
        questionId,
        ...(recentMessages.length > 0 ? { recentMessages } : {}),
      }
    })
  }

  async completeQuestion(input: CompleteZappyQuestionInput): Promise<ZappyStoredResponse> {
    return this.db.transaction(async (tx) => {
      const [question] = await tx
        .select({ id: zappyMessages.id, conversationId: zappyMessages.conversationId })
        .from(zappyMessages)
        .innerJoin(zappyConversations, eq(zappyConversations.id, zappyMessages.conversationId))
        .where(
          and(
            eq(zappyMessages.id, input.questionId),
            eq(zappyConversations.userId, input.userId),
            eq(zappyConversations.projectId, input.projectId),
          ),
        )
        .limit(1)
      if (!question) throw new Error('Pergunta do Zappy não encontrada')
      const [existing] = await tx
        .select({
          id: zappyMessages.id,
          response: zappyMessages.response,
          createdAt: zappyMessages.createdAt,
        })
        .from(zappyMessages)
        .where(eq(zappyMessages.replyToId, question.id))
        .limit(1)
      if (existing) {
        await tx
          .update(zappyMessages)
          .set({ processingUntil: null })
          .where(eq(zappyMessages.id, question.id))
        return toResponse(existing) ?? input.response
      }

      const id = input.response.id || randomUUID()
      const responseJson: StoredResponseJson = {
        text: input.response.text,
        scope: input.response.scope,
        blockReferences: input.response.blockReferences,
        ...(input.response.lessonReferences
          ? { lessonReferences: input.response.lessonReferences }
          : {}),
        ...(input.response.suggestions ? { suggestions: input.response.suggestions } : {}),
        ...(input.rejection ? { rejection: input.rejection } : {}),
      }
      const [answer] = await tx
        .insert(zappyMessages)
        .values({
          id,
          conversationId: question.conversationId,
          replyToId: question.id,
          role: 'assistant',
          content: input.response.text,
          response: responseJson,
          scope: input.response.scope,
          latencyMs: Math.max(0, Math.floor(input.latencyMs)),
          outcome: input.outcome ?? 'normal',
          createdAt: input.now,
        })
        .returning({
          id: zappyMessages.id,
          response: zappyMessages.response,
          createdAt: zappyMessages.createdAt,
        })
      await tx
        .update(zappyMessages)
        .set({ processingUntil: null })
        .where(eq(zappyMessages.id, question.id))
      await tx
        .update(zappyConversations)
        .set({ updatedAt: input.now, expiresAt: input.expiresAt })
        .where(eq(zappyConversations.id, question.conversationId))
      return answer ? (toResponse(answer) ?? input.response) : input.response
    })
  }

  async deleteHistory(userId: string, projectId: string): Promise<void> {
    await this.db
      .delete(zappyConversations)
      .where(
        and(eq(zappyConversations.userId, userId), eq(zappyConversations.projectId, projectId)),
      )
  }

  async setFeedback(
    userId: string,
    projectId: string,
    responseId: string,
    useful: boolean,
    now: Date,
  ): Promise<boolean> {
    const rows = await this.db
      .update(zappyMessages)
      .set({ useful, feedbackAt: now })
      .from(zappyConversations)
      .where(
        and(
          eq(zappyMessages.id, responseId),
          eq(zappyMessages.conversationId, zappyConversations.id),
          eq(zappyConversations.userId, userId),
          eq(zappyConversations.projectId, projectId),
          isNotNull(zappyMessages.response),
        ),
      )
      .returning({ id: zappyMessages.id })
    return rows.length > 0
  }

  async metrics(from: Date, to: Date): Promise<ZappyMetrics> {
    const [row] = await this.db
      .select({
        questions: sql<number>`count(*)::int`,
        useful: sql<number>`count(*) filter (where ${zappyMessages.useful} = true)::int`,
        notUseful: sql<number>`count(*) filter (where ${zappyMessages.useful} = false)::int`,
        refusals: sql<number>`count(*) filter (where ${zappyMessages.outcome} = 'refusal')::int`,
        needsContext: sql<number>`count(*) filter (where ${zappyMessages.outcome} = 'needs-context')::int`,
        quota: sql<number>`count(*) filter (where ${zappyMessages.outcome} = 'quota')::int`,
        errors: sql<number>`count(*) filter (where ${zappyMessages.outcome} = 'error')::int`,
        rejected: sql<number>`count(*) filter (where ${zappyMessages.outcome} = 'rejected')::int`,
        averageLatencyMs: sql<number>`coalesce(round(avg(${zappyMessages.latencyMs})), 0)::int`,
      })
      .from(zappyMessages)
      .where(zappyMetricsPeriod(from, to))
    return {
      questions: row?.questions ?? 0,
      useful: row?.useful ?? 0,
      notUseful: row?.notUseful ?? 0,
      refusals: row?.refusals ?? 0,
      needsContext: row?.needsContext ?? 0,
      quota: row?.quota ?? 0,
      errors: row?.errors ?? 0,
      rejected: row?.rejected ?? 0,
      averageLatencyMs: row?.averageLatencyMs ?? 0,
    }
  }

  async listFailedQuestions(
    from: Date,
    to: Date,
    filter: ZappyFailureFilter,
    limit: number,
    offset: number,
  ): Promise<ZappyFailedQuestionsPage> {
    const question = alias(zappyMessages, 'zappy_question')
    const failure =
      filter === 'rejected'
        ? eq(zappyMessages.outcome, 'rejected')
        : filter === 'error'
          ? eq(zappyMessages.outcome, 'error')
          : filter === 'not-useful'
            ? eq(zappyMessages.useful, false)
            : or(
                inArray(zappyMessages.outcome, ['rejected', 'error']),
                eq(zappyMessages.useful, false),
              )
    const where = and(zappyMetricsPeriod(from, to), failure)
    const rows = await this.db
      .select({
        question: question.content,
        answerText: zappyMessages.content,
        response: zappyMessages.response,
        outcome: zappyMessages.outcome,
        useful: zappyMessages.useful,
        createdAt: zappyMessages.createdAt,
      })
      .from(zappyMessages)
      .innerJoin(question, eq(question.id, zappyMessages.replyToId))
      .where(where)
      .orderBy(desc(zappyMessages.createdAt), desc(zappyMessages.id))
      .limit(Math.max(1, Math.min(100, limit)))
      .offset(Math.max(0, offset))
    const [count] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(zappyMessages)
      .innerJoin(question, eq(question.id, zappyMessages.replyToId))
      .where(where)
    return {
      items: rows.map((row) => {
        const rejection =
          row.response && typeof row.response === 'object' && !Array.isArray(row.response)
            ? (row.response as StoredResponseJson).rejection
            : undefined
        return {
          question: row.question,
          answerText: row.answerText,
          ...(typeof rejection === 'string' ? { rejection } : {}),
          outcome: row.outcome ?? 'normal',
          useful: row.useful,
          createdAt: row.createdAt.toISOString(),
        }
      }),
      total: count?.total ?? 0,
    }
  }

  async pruneExpired(now: Date): Promise<number> {
    const deleted = await this.db
      .delete(zappyConversations)
      .where(lte(zappyConversations.expiresAt, now))
      .returning({ id: zappyConversations.id })
    return deleted.length
  }
}
