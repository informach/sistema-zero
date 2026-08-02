import { randomUUID } from 'node:crypto'
import { and, asc, eq, gt, gte, isNotNull, lt, lte, sql } from 'drizzle-orm'
import type {
  CompleteZappyQuestionInput,
  ReserveZappyQuestionInput,
  ReserveZappyQuestionResult,
  ZappyHistoryMessage,
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

export class DrizzleZappyRepository implements ZappyRepository {
  constructor(private readonly db: Database) {}

  async history(
    userId: string,
    projectId: string,
    now: Date,
    expiresAt: Date,
  ): Promise<ZappyHistoryMessage[]> {
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
      if (!conversation) return []
      await tx
        .update(zappyConversations)
        .set({ updatedAt: now, expiresAt })
        .where(eq(zappyConversations.id, conversation.id))
      const rows = await tx
        .select({
          id: zappyMessages.id,
          role: zappyMessages.role,
          content: zappyMessages.content,
          response: zappyMessages.response,
          createdAt: zappyMessages.createdAt,
        })
        .from(zappyMessages)
        .where(eq(zappyMessages.conversationId, conversation.id))
        .orderBy(asc(zappyMessages.createdAt), asc(zappyMessages.id))
      return rows.map((row) => {
        const response = row.role === 'assistant' ? toResponse(row) : undefined
        return {
          id: row.id,
          role: row.role === 'assistant' ? 'assistant' : 'user',
          text: row.content,
          createdAt: row.createdAt.toISOString(),
          ...(response ? { response } : {}),
        }
      })
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
        .select({ id: zappyMessages.id })
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
        return {
          created: false,
          questionId: existing.id,
          ...(answer ? { response: toResponse(answer) } : {}),
        }
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

      const questionId = randomUUID()
      await tx.insert(zappyMessages).values({
        id: questionId,
        conversationId: conversation.id,
        role: 'user',
        content: input.question,
        clientMessageId: input.clientMessageId,
        createdAt: input.now,
      })
      return { created: true, questionId }
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
      if (existing) return toResponse(existing) ?? input.response

      const id = input.response.id || randomUUID()
      const responseJson: StoredResponseJson = {
        text: input.response.text,
        scope: input.response.scope,
        blockReferences: input.response.blockReferences,
        ...(input.response.lessonReferences
          ? { lessonReferences: input.response.lessonReferences }
          : {}),
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
      averageLatencyMs: row?.averageLatencyMs ?? 0,
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
