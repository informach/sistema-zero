import { and, desc, eq, gt, lt, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import {
  analyticsEvents,
  analyticsLeadLinks,
  analyticsQuizDefinitions,
  analyticsSessions,
  analyticsSnapshots,
  analyticsVisitors,
} from '../db/schema'
import type { LeadAttributionV1 } from '../lib/lead-attribution'
import {
  ANALYTICS_RETENTION_DAYS,
  ANALYTICS_SESSION_MS,
  type AnalyticsEnvironment,
  type QuizDefinition,
} from './types'

export type AnalyticsSession = typeof analyticsSessions.$inferSelect
export type StoredAnalyticsEvent = typeof analyticsEvents.$inferInsert
export interface SessionInput {
  visitorId: string | null
  environment: AnalyticsEnvironment
  path: string
  attribution: LeadAttributionV1 | null
  device: string
  referrerHost: string | null
  now: Date
}
export interface AnalyticsRepo {
  startSession(input: SessionInput): Promise<AnalyticsSession>
  session(id: string): Promise<AnalyticsSession | null>
  recentSession(
    visitorId: string,
    environment: AnalyticsEnvironment,
    now: Date,
  ): Promise<AnalyticsSession | null>
  append(events: StoredAnalyticsEvent[], now: Date): Promise<number>
  revoke(visitorId: string): Promise<void>
  linkLead(sessionId: string, leadId: string, now: Date): Promise<void>
  ownsLead(visitorId: string, leadId: string, environment: AnalyticsEnvironment): Promise<boolean>
  saveQuiz(definition: QuizDefinition): Promise<void>
  quiz(id: string): Promise<QuizDefinition | null>
  prune(now: Date): Promise<void>
}

export function createAnalyticsRepo(db: Database): AnalyticsRepo {
  return {
    async startSession(input) {
      return db.transaction(async (tx) => {
        let visitorId = input.visitorId
        if (visitorId) {
          const [visitor] = await tx
            .select()
            .from(analyticsVisitors)
            .where(eq(analyticsVisitors.id, visitorId))
            .for('update')
          if (!visitor) visitorId = null
        }
        if (!visitorId) {
          visitorId = crypto.randomUUID()
          await tx.insert(analyticsVisitors).values({
            id: visitorId,
            firstAttribution: input.attribution,
            createdAt: input.now,
            lastSeenAt: input.now,
          })
        }
        const [current] = await tx
          .select()
          .from(analyticsSessions)
          .where(
            and(
              eq(analyticsSessions.visitorId, visitorId),
              eq(analyticsSessions.environment, input.environment),
              gt(
                analyticsSessions.lastSeenAt,
                new Date(input.now.getTime() - ANALYTICS_SESSION_MS),
              ),
            ),
          )
          .orderBy(desc(analyticsSessions.lastSeenAt))
          .limit(1)
        await tx
          .update(analyticsVisitors)
          .set({ lastSeenAt: input.now })
          .where(eq(analyticsVisitors.id, visitorId))
        if (current) {
          await tx
            .update(analyticsSessions)
            .set({ lastSeenAt: input.now })
            .where(eq(analyticsSessions.id, current.id))
          return { ...current, lastSeenAt: input.now }
        }
        const [created] = await tx
          .insert(analyticsSessions)
          .values({
            id: crypto.randomUUID(),
            visitorId,
            environment: input.environment,
            entryPath: input.path,
            attribution: input.attribution,
            device: input.device,
            referrerHost: input.referrerHost,
            startedAt: input.now,
            lastSeenAt: input.now,
          })
          .returning()
        return created!
      })
    },
    async session(id) {
      const [row] = await db
        .select()
        .from(analyticsSessions)
        .where(eq(analyticsSessions.id, id))
        .limit(1)
      return row ?? null
    },
    async recentSession(visitorId, environment, now) {
      const [row] = await db
        .select()
        .from(analyticsSessions)
        .where(
          and(
            eq(analyticsSessions.visitorId, visitorId),
            eq(analyticsSessions.environment, environment),
            gt(analyticsSessions.lastSeenAt, new Date(now.getTime() - ANALYTICS_SESSION_MS)),
          ),
        )
        .orderBy(desc(analyticsSessions.lastSeenAt))
        .limit(1)
      return row ?? null
    },
    async append(events, now) {
      if (!events.length) return 0
      return db.transaction(async (tx) => {
        const sessionId = events[0]!.sessionId
        const [candidate] = await tx
          .select()
          .from(analyticsSessions)
          .where(eq(analyticsSessions.id, sessionId))
        if (!candidate) return 0
        // All writes lock visitor before session, including bootstrap and revocation.
        const [visitor] = await tx
          .select()
          .from(analyticsVisitors)
          .where(eq(analyticsVisitors.id, candidate.visitorId))
          .for('update')
        if (!visitor) return 0
        const [session] = await tx
          .select()
          .from(analyticsSessions)
          .where(eq(analyticsSessions.id, sessionId))
          .for('update')
        if (!session) return 0
        const inserted = await tx
          .insert(analyticsEvents)
          .values(events)
          .onConflictDoNothing()
          .returning({ id: analyticsEvents.id })
        await tx
          .update(analyticsSessions)
          .set({ lastSeenAt: now })
          .where(eq(analyticsSessions.id, sessionId))
        await tx
          .update(analyticsVisitors)
          .set({ lastSeenAt: now })
          .where(eq(analyticsVisitors.id, session.visitorId))
        return inserted.length
      })
    },
    async revoke(visitorId) {
      await db.delete(analyticsVisitors).where(eq(analyticsVisitors.id, visitorId))
    },
    async linkLead(sessionId, leadId, now) {
      await db
        .insert(analyticsLeadLinks)
        .values({ sessionId, leadId, linkedAt: now })
        .onConflictDoNothing()
    },
    async ownsLead(visitorId, leadId, environment) {
      const [row] = await db
        .select({ id: analyticsLeadLinks.leadId })
        .from(analyticsLeadLinks)
        .innerJoin(analyticsSessions, eq(analyticsLeadLinks.sessionId, analyticsSessions.id))
        .where(
          and(
            eq(analyticsLeadLinks.leadId, leadId),
            eq(analyticsSessions.visitorId, visitorId),
            eq(analyticsSessions.environment, environment),
          ),
        )
        .limit(1)
      return Boolean(row)
    },
    async saveQuiz(definition) {
      await db
        .insert(analyticsQuizDefinitions)
        .values({ id: definition.id, funnel: definition.funnel, definition })
        .onConflictDoNothing()
    },
    async quiz(id) {
      const [row] = await db
        .select({ definition: analyticsQuizDefinitions.definition })
        .from(analyticsQuizDefinitions)
        .where(eq(analyticsQuizDefinitions.id, id))
        .limit(1)
      return row?.definition ?? null
    },
    async prune(now) {
      await db.transaction(async (tx) => {
        const lock = await tx.execute(
          sql`select pg_try_advisory_xact_lock(47713920114418) as locked`,
        )
        if (!(lock[0] as { locked: boolean } | undefined)?.locked) return
        const cutoff = new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * 86400000)
        await tx.delete(analyticsSessions).where(lt(analyticsSessions.startedAt, cutoff))
        await tx.delete(analyticsVisitors).where(lt(analyticsVisitors.lastSeenAt, cutoff))
        await tx.delete(analyticsSnapshots).where(lt(analyticsSnapshots.createdAt, cutoff))
      })
    },
  }
}
