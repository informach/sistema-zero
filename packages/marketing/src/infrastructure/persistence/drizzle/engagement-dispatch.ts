import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNotNull, lt, lte, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { withinWindow } from '../../../domain/engagement/policy'
import type { Dispatch } from '../../../domain/ports/engagement-engine.port'
import type { SendOutcome } from '../../../domain/ports/engagement-provider.port'
import { channelUnavailable } from './engagement-access'
import type { DrizzleEngagementEngine } from './engagement-engine.repository'
import { minimizeChildConversation } from './engagement-privacy'
import {
  engagementActivations as activations,
  engagementChannels as channels,
  engagementConversations as conversations,
  engagementInbound as inbound,
  engagementJourneys as journeys,
  engagementMembers as members,
  engagementOutbound as outbound,
} from './engagement-schema'
import { publications, socialAccounts } from './schema'
import { editorialItems as items } from './workspace-schema'

export async function claimEngagement(
  engine: DrizzleEngagementEngine,
  now: Date,
): Promise<Dispatch | null> {
  if (!engine.sendingEnabled) return null
  const pending = await engine.db
    .select({ id: outbound.id, accountId: outbound.accountId, createdBy: outbound.createdBy })
    .from(outbound)
    .where(and(eq(outbound.state, 'pending'), lte(outbound.availableAt, now)))
    .orderBy(asc(outbound.createdAt))
    .limit(50)
  const actorIds = [...new Set(pending.flatMap((row) => (row.createdBy ? [row.createdBy] : [])))]
  // Resolve staff before the SQL lock. A directory outage leaves manual sends pending.
  const activeOperators = actorIds.length
    ? await engine.directory
        .lookup({ ids: actorIds })
        .then((people) => new Set(people.filter((p) => p.active).map((p) => p.id)))
        .catch(() => null)
    : new Set<string>()
  for (const candidate of pending) {
    if (candidate.createdBy && !activeOperators) continue
    const dispatch = await engine.db.transaction(async (tx) => {
      const [channel] = await tx
        .select()
        .from(channels)
        .where(eq(channels.accountId, candidate.accountId))
        .for('update')
      const [intent] = await tx
        .select()
        .from(outbound)
        .where(and(eq(outbound.id, candidate.id), eq(outbound.state, 'pending')))
        .for('update')
      if (!channel || !intent) return null
      const [account] = await tx
        .select()
        .from(socialAccounts)
        .where(eq(socialAccounts.id, intent.accountId))
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, intent.conversationId))
      const [current] = intent.journeyId
        ? await tx
            .select({ journey: journeys, activation: activations })
            .from(journeys)
            .innerJoin(activations, eq(activations.id, journeys.activationId))
            .where(eq(journeys.id, intent.journeyId))
        : []
      const [publication] = current
        ? await tx
            .select()
            .from(publications)
            .where(eq(publications.id, current.activation.publicationId))
        : []
      const [piece] = current
        ? await tx.select().from(items).where(eq(items.id, current.activation.pieceId))
        : []
      const commercial =
        intent.kind === 'opening' || intent.kind === 'offer' || intent.kind === 'typed'
      const savedCommercial = intent.kind === 'platform' || intent.kind === 'community'
      const serviceExit = ['stop', 'child', 'student'].includes(intent.kind)
      const [operator] = intent.createdBy
        ? await tx
            .select()
            .from(members)
            .where(
              and(eq(members.accountId, intent.accountId), eq(members.userId, intent.createdBy)),
            )
        : []
      const reason =
        !account || !conversation?.recipientEnc || !intent.message
          ? 'Conta, destinatário ou conteúdo indisponível'
          : (channelUnavailable(channel, account, engine.graphVersion, now) ??
            (conversation.suppression && !serviceExit
              ? 'Contato suprimido'
              : conversation.suppression === 'erased'
                ? 'Conversa excluída'
                : intent.createdBy && !activeOperators?.has(intent.createdBy)
                  ? 'Pessoa da equipe desativada'
                  : intent.createdBy &&
                      !operator?.permissions.some((p) => p === 'reply' || p === 'admin')
                    ? 'Permissão do operador revogada'
                    : savedCommercial &&
                        (!current || new Date(current.activation.plan.validUntil) <= now)
                      ? 'Validade da resposta comercial encerrada'
                      : commercial &&
                          (current?.activation.state !== 'active' ||
                            new Date(current.activation.plan.validUntil) <= now ||
                            !piece ||
                            piece.archived ||
                            piece.document.kind !== 'piece' ||
                            ['historical', 'incomplete'].includes(piece.document.state) ||
                            publication?.status !== 'published' ||
                            publication.externalPostId !== current.activation.externalPostId ||
                            publication.socialAccountId !== intent.accountId)
                        ? 'Campanha, publicação ou oferta deixou de ser elegível'
                        : commercial && conversation.state !== 'automatic'
                          ? 'Atendimento interrompeu a automação'
                          : intent.kind === 'opening' &&
                              current?.journey.state !== 'opening-pending'
                            ? 'Abertura já processada ou interrompida'
                            : intent.kind === 'offer' && current?.journey.state !== 'offer-pending'
                              ? 'Apresentação já processada ou interrompida'
                              : !withinWindow(
                                    intent.commentId
                                      ? (current?.journey.createdAt ?? null)
                                      : conversation.lastInboundAt,
                                    now,
                                    intent.commentId
                                      ? (channel.proof?.privateReplyHours ?? 0)
                                      : (channel.proof?.messageWindowHours ?? 0),
                                  )
                                ? 'Janela encerrada'
                                : null))
      if (reason || !account || !conversation?.recipientEnc || !intent.message) {
        await tx
          .update(outbound)
          .set({ state: 'cancelled', error: reason ?? 'Conteúdo indisponível' })
          .where(eq(outbound.id, intent.id))
        if (conversation?.suppression === 'child')
          await minimizeChildConversation(tx, conversation.id)
        return null
      }
      // A queued request to stop or take over must be interpreted before any later send.
      const [unread] = await tx
        .select({ id: inbound.id })
        .from(inbound)
        .where(
          and(
            eq(inbound.accountId, intent.accountId),
            eq(inbound.state, 'pending'),
            sql`${inbound.event}->>'recipient' = ${engine.box.open(conversation.recipientEnc)}`,
          ),
        )
        .limit(1)
      if (unread) {
        await tx
          .update(outbound)
          .set({ availableAt: new Date(now.getTime() + 2000) })
          .where(eq(outbound.id, intent.id))
        return null
      }
      const earlier = alias(outbound, 'earlier')
      const [unresolved] = await tx
        .select({ id: earlier.id })
        .from(earlier)
        .innerJoin(outbound, eq(outbound.id, intent.id))
        .where(
          and(
            eq(earlier.conversationId, intent.conversationId),
            sql`(${earlier.state} in ('sending', 'uncertain') or (${earlier.state} = 'pending' and (${earlier.createdAt}, ${earlier.id}) < (${outbound.createdAt}, ${outbound.id})))`,
          ),
        )
        .limit(1)
      if (unresolved) {
        await tx
          .update(outbound)
          .set({ availableAt: new Date(now.getTime() + 60000) })
          .where(eq(outbound.id, intent.id))
        return null
      }
      const [usage] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(outbound)
        .where(
          and(
            eq(outbound.accountId, account.id),
            inArray(outbound.state, ['sending', 'accepted', 'uncertain']),
            sql`coalesce(${outbound.acceptedAt}, ${outbound.lastAttemptAt}, ${outbound.createdAt}) >= ${new Date(now.getTime() - 3600000).toISOString()}`,
          ),
        )
      if ((usage?.count ?? 0) >= channel.maxSendsPerHour) {
        await tx
          .update(outbound)
          .set({ availableAt: new Date(now.getTime() + 60000) })
          .where(eq(outbound.id, intent.id))
        return null
      }
      const leaseId = randomUUID()
      await tx
        .update(outbound)
        .set({
          state: 'sending',
          leaseId,
          leaseUntil: new Date(now.getTime() + 60_000),
          attempts: intent.attempts + 1,
          lastAttemptAt: now,
        })
        .where(eq(outbound.id, intent.id))
      return {
        id: intent.id,
        leaseId,
        account,
        recipient: engine.box.open(conversation.recipientEnc),
        commentId: intent.commentId,
        message: intent.message,
      }
    })
    if (dispatch) return dispatch
  }
  return null
}
export async function finishEngagement(
  engine: DrizzleEngagementEngine,
  dispatch: Dispatch,
  outcome: SendOutcome,
  now: Date,
) {
  await engine.db.transaction(async (tx) => {
    await tx
      .select()
      .from(channels)
      .where(eq(channels.accountId, dispatch.account.id))
      .for('update')
    const [intent] = await tx
      .select()
      .from(outbound)
      .where(
        and(
          eq(outbound.id, dispatch.id),
          eq(outbound.leaseId, dispatch.leaseId),
          inArray(outbound.state, ['sending', 'uncertain']),
        ),
      )
    if (!intent) return
    const [conversation] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, intent.conversationId))
    const erased = conversation?.suppression === 'erased'
    const retry = outcome.status === 'retryable' && intent.attempts < 3
    await tx
      .update(outbound)
      .set({
        state:
          outcome.status === 'accepted'
            ? 'accepted'
            : retry
              ? 'pending'
              : outcome.status === 'uncertain'
                ? 'uncertain'
                : 'failed',
        externalId: outcome.status === 'accepted' && !erased ? outcome.externalId : null,
        error: outcome.status === 'accepted' || erased ? null : outcome.reason,
        acceptedAt: outcome.status === 'accepted' ? now : null,
        leaseUntil: null,
        availableAt: new Date(now.getTime() + Math.min(300000, 10000 * 2 ** intent.attempts)),
      })
      .where(eq(outbound.id, intent.id))
    if (intent.journeyId) {
      const [journey] = await tx.select().from(journeys).where(eq(journeys.id, intent.journeyId))
      if (journey && outcome.status === 'accepted') {
        const patch: Partial<typeof journeys.$inferInsert> = {}
        if (intent.kind === 'opening') {
          patch.openedAt = now
          if (journey.state === 'opening-pending') patch.state = 'waiting'
        }
        if (intent.kind === 'offer') {
          patch.offeredAt = now
          if (journey.state === 'offer-pending') patch.state = 'presented'
        }
        if (Object.keys(patch).length)
          await tx.update(journeys).set(patch).where(eq(journeys.id, journey.id))
      }
      if (journey && outcome.status === 'uncertain')
        await tx
          .update(journeys)
          .set({ previousState: journey.state, state: 'human' })
          .where(and(eq(journeys.id, journey.id), ne(journeys.state, 'closed')))
    }
    if (outcome.status === 'uncertain')
      await tx
        .update(conversations)
        .set({ state: 'waiting-human', version: sql`${conversations.version}+1`, updatedAt: now })
        .where(
          and(
            eq(conversations.id, intent.conversationId),
            sql`${conversations.suppression} is null`,
          ),
        )
    if (outcome.status === 'failed' || (outcome.status === 'retryable' && !retry)) {
      if (intent.journeyId)
        await tx
          .update(journeys)
          .set({ state: 'human' })
          .where(and(eq(journeys.id, intent.journeyId), ne(journeys.state, 'closed')))
      await tx
        .update(conversations)
        .set({ state: 'waiting-human', version: sql`${conversations.version}+1`, updatedAt: now })
        .where(
          and(
            eq(conversations.id, intent.conversationId),
            sql`${conversations.suppression} is null`,
          ),
        )
    }
    if (conversation?.suppression === 'child') await minimizeChildConversation(tx, conversation.id)
  })
}
export async function maintainEngagement(
  engine: Pick<DrizzleEngagementEngine, 'db' | 'sendingEnabled' | 'graphVersion'>,
  now: Date,
) {
  const configured = await engine.db.select().from(channels)
  for (const config of configured) {
    await engine.db.transaction(async (tx) => {
      const [channel] = await tx
        .select()
        .from(channels)
        .where(eq(channels.accountId, config.accountId))
        .for('update')
      const [account] = await tx
        .select()
        .from(socialAccounts)
        .where(eq(socialAccounts.id, config.accountId))
      if (!channel) return
      const blocked = !engine.sendingEnabled
        ? 'Envio global desligado'
        : !account
          ? 'Conta indisponível'
          : channelUnavailable(channel, account, engine.graphVersion, now)
      if (blocked) {
        await tx
          .update(outbound)
          .set({ state: 'cancelled', error: blocked })
          .where(and(eq(outbound.accountId, config.accountId), eq(outbound.state, 'pending')))
        await tx
          .update(activations)
          .set({ state: 'blocked', reason: blocked, version: sql`${activations.version}+1` })
          .where(
            and(
              eq(activations.accountId, config.accountId),
              inArray(activations.state, ['active', 'awaiting-link']),
            ),
          )
      }
      const expiredPlans = await tx
        .update(activations)
        .set({
          state: 'blocked',
          reason: 'Validade da conferência da oferta encerrada',
          version: sql`${activations.version}+1`,
        })
        .where(
          and(
            eq(activations.accountId, config.accountId),
            inArray(activations.state, ['active', 'awaiting-link']),
            sql`(${activations.plan}->>'validUntil')::timestamptz <= ${now.toISOString()}`,
          ),
        )
        .returning({ id: activations.id })
      if (expiredPlans.length) {
        const affected = await tx
          .select({ id: journeys.id })
          .from(journeys)
          .where(
            inArray(
              journeys.activationId,
              expiredPlans.map((p) => p.id),
            ),
          )
        if (affected.length)
          await tx
            .update(outbound)
            .set({ state: 'cancelled', error: 'Validade da oferta encerrada' })
            .where(
              and(
                inArray(
                  outbound.journeyId,
                  affected.map((j) => j.id),
                ),
                eq(outbound.state, 'pending'),
              ),
            )
      }
      const expired = await tx
        .update(outbound)
        .set({
          state: 'uncertain',
          error: 'Executor perdeu a posse após iniciar o envio',
          leaseUntil: null,
        })
        .where(
          and(
            eq(outbound.accountId, config.accountId),
            eq(outbound.state, 'sending'),
            lte(outbound.leaseUntil, now),
          ),
        )
        .returning({ conversationId: outbound.conversationId, journeyId: outbound.journeyId })
      const expiredJourneyIds = expired.flatMap((row) => (row.journeyId ? [row.journeyId] : []))
      if (expiredJourneyIds.length)
        await tx
          .update(journeys)
          .set({ previousState: sql`${journeys.state}`, state: 'human' })
          .where(and(inArray(journeys.id, expiredJourneyIds), ne(journeys.state, 'closed')))
      const childRows = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.accountId, config.accountId),
            eq(conversations.suppression, 'child'),
          ),
        )
      for (const child of childRows) await minimizeChildConversation(tx, child.id)
      if (expired.length)
        await tx
          .update(conversations)
          .set({ state: 'waiting-human', version: sql`${conversations.version}+1` })
          .where(
            and(
              inArray(
                conversations.id,
                expired.map((r) => r.conversationId),
              ),
              sql`${conversations.suppression} is null`,
            ),
          )
      const cutoff = new Date(now.getTime() - channel.retentionDays * 86400000)
      await tx
        .update(inbound)
        .set({ event: null, state: 'ignored', reason: 'Prazo de retenção encerrado' })
        .where(
          and(
            eq(inbound.accountId, config.accountId),
            lt(inbound.receivedAt, cutoff),
            isNotNull(inbound.event),
          ),
        )
      await tx
        .update(outbound)
        .set({ message: null, externalId: null, error: null, commentId: null, state: 'cancelled' })
        .where(
          and(
            eq(outbound.accountId, config.accountId),
            lt(outbound.createdAt, cutoff),
            eq(outbound.state, 'pending'),
          ),
        )
      await tx
        .update(outbound)
        .set({ message: null, externalId: null, error: null, commentId: null })
        .where(
          and(
            eq(outbound.accountId, config.accountId),
            lt(outbound.createdAt, cutoff),
            inArray(outbound.state, ['accepted', 'failed', 'cancelled', 'uncertain']),
          ),
        )
      // Preserve only keyed suppression/deduplication identities beyond the content retention period.
      await tx
        .update(conversations)
        .set({ recipientEnc: null })
        .where(
          and(eq(conversations.accountId, config.accountId), lt(conversations.updatedAt, cutoff)),
        )
      const oldJourneys = await tx
        .select({ id: journeys.id })
        .from(journeys)
        .innerJoin(conversations, eq(conversations.id, journeys.conversationId))
        .where(and(eq(conversations.accountId, config.accountId), lt(journeys.createdAt, cutoff)))
      if (oldJourneys.length)
        await tx
          .update(journeys)
          .set({ commentId: null })
          .where(
            inArray(
              journeys.id,
              oldJourneys.map((r) => r.id),
            ),
          )
      // Opaque event identities outlive payloads to prevent replay; old events also fail the temporal gate.
      await tx
        .delete(inbound)
        .where(
          and(
            eq(inbound.accountId, config.accountId),
            lt(inbound.receivedAt, new Date(now.getTime() - 180 * 86400000)),
          ),
        )
      const stale = await tx
        .select({ id: journeys.id })
        .from(journeys)
        .innerJoin(conversations, eq(conversations.id, journeys.conversationId))
        .where(
          and(
            eq(conversations.accountId, config.accountId),
            inArray(journeys.state, ['waiting', 'presented']),
            lt(journeys.createdAt, new Date(now.getTime() - 7 * 86400000)),
          ),
        )
      if (stale.length)
        await tx
          .update(journeys)
          .set({ state: 'closed' })
          .where(
            inArray(
              journeys.id,
              stale.map((j) => j.id),
            ),
          )
    })
  }
}
