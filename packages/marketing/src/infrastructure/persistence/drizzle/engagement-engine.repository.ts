import { createHmac, randomUUID } from 'node:crypto'
import { conversationUrl } from '@sistemazero/marketing-contracts'
import { and, asc, eq, lte, ne } from 'drizzle-orm'
import {
  decideIncoming,
  type IncomingEvent,
  keywordMatches,
  withinWindow,
} from '../../../domain/engagement/policy'
import type { EngagementEngine, PendingBinding } from '../../../domain/ports/engagement-engine.port'
import type { OutboundMessage } from '../../../domain/ports/engagement-provider.port'
import type { SecretBox } from '../../../domain/ports/secret-box.port'
import type { StaffDirectory } from '../../../domain/ports/staff-directory.port'
import type { Database } from './db'
import { channelUnavailable } from './engagement-access'
import { claimEngagement, finishEngagement, maintainEngagement } from './engagement-dispatch'
import {
  engagementActivations as activations,
  engagementChannels as channels,
  engagementConversations as conversations,
  engagementInbound as inbound,
  engagementJourneys as journeys,
  engagementOutbound as outbound,
} from './engagement-schema'
import { publications, socialAccounts } from './schema'
import { editorialItems as items } from './workspace-schema'

export class DrizzleEngagementEngine implements EngagementEngine {
  constructor(
    readonly db: Database,
    readonly box: SecretBox,
    readonly identityKey: string,
    readonly graphVersion: string,
    readonly sendingEnabled: boolean,
    readonly directory: StaffDirectory,
  ) {}
  recipientKey(accountId: string, recipient: string) {
    return createHmac('sha256', this.identityKey).update(`${accountId}:${recipient}`).digest('hex')
  }
  ingest(events: IncomingEvent[]) {
    return this.db.transaction(async (tx) => {
      let inserted = 0
      for (const event of events) {
        const [account] = await tx
          .select({ id: socialAccounts.id })
          .from(socialAccounts)
          .innerJoin(channels, eq(channels.accountId, socialAccounts.id))
          .where(
            and(
              eq(socialAccounts.network, 'instagram'),
              eq(socialAccounts.externalId, event.accountExternalId),
            ),
          )
        if (!account) continue
        const eventKey = createHmac('sha256', this.identityKey)
          .update(`event:${account.id}:${event.key}`)
          .digest('hex')
        const rows = await tx
          .insert(inbound)
          .values({ id: randomUUID(), accountId: account.id, eventKey, event })
          .onConflictDoNothing()
          .returning({ id: inbound.id })
        inserted += rows.length
      }
      return inserted
    })
  }
  async process(now: Date) {
    const pending = await this.db
      .select({ id: inbound.id, accountId: inbound.accountId })
      .from(inbound)
      .where(and(eq(inbound.state, 'pending'), lte(inbound.availableAt, now)))
      .orderBy(asc(inbound.receivedAt))
      .limit(50)
    let processed = 0
    for (const candidate of pending) {
      const done = await this.db.transaction(async (tx) => {
        // Same account lock as all operator actions and dispatch decisions.
        const [channel] = await tx
          .select()
          .from(channels)
          .where(eq(channels.accountId, candidate.accountId))
          .for('update')
        const [row] = await tx
          .select()
          .from(inbound)
          .where(and(eq(inbound.id, candidate.id), eq(inbound.state, 'pending')))
          .for('update')
        if (!channel || !row?.event) return false
        const event = row.event,
          eventAt = new Date(event.at)
        const [account] = await tx
          .select()
          .from(socialAccounts)
          .where(eq(socialAccounts.id, row.accountId))
        if (!account || !withinWindow(eventAt, now, 168)) {
          await tx
            .update(inbound)
            .set({
              state: 'ignored',
              reason: 'Conta ausente ou evento fora do período aceito',
              event: null,
            })
            .where(eq(inbound.id, row.id))
          return true
        }
        const live =
          this.sendingEnabled && !channelUnavailable(channel, account, this.graphVersion, now)
        const available = live
          ? await tx
              .select()
              .from(activations)
              .where(and(eq(activations.accountId, row.accountId), eq(activations.state, 'active')))
          : []
        const matches = available.filter(
          (a) =>
            new Date(a.plan.validUntil) > now &&
            event.text &&
            (event.kind === 'comment'
              ? a.externalPostId === event.mediaId &&
                keywordMatches(event.text, a.plan.keyword, false)
              : event.kind === 'message' && keywordMatches(event.text, a.plan.keyword, true)),
        )
        if (event.kind === 'comment' && matches.length === 0) {
          const [waiting] = await tx
            .select({ id: activations.id })
            .from(activations)
            .innerJoin(publications, eq(publications.id, activations.publicationId))
            .where(
              and(
                eq(activations.accountId, row.accountId),
                eq(activations.state, 'awaiting-link'),
                eq(publications.externalPostId, event.mediaId ?? ''),
              ),
            )
            .limit(1)
          await tx
            .update(inbound)
            .set(
              waiting && withinWindow(eventAt, now, 24)
                ? {
                    availableAt: new Date(now.getTime() + 30_000),
                    reason: 'Aguardando vínculo solicitado',
                  }
                : { state: 'ignored', reason: 'Sem campanha elegível para este comentário' },
            )
            .where(eq(inbound.id, row.id))
          return !waiting
        }
        const recipientKey = this.recipientKey(row.accountId, event.recipient)
        await tx
          .insert(conversations)
          .values({
            id: randomUUID(),
            accountId: row.accountId,
            recipientKey,
            recipientEnc: this.box.seal(event.recipient),
            updatedAt: now,
          })
          .onConflictDoNothing()
        const [conversation] = await tx
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.accountId, row.accountId),
              eq(conversations.recipientKey, recipientKey),
            ),
          )
          .for('update')
        if (!conversation) throw new Error('Conversa não persistida')
        if (conversation.suppression === 'erased' || conversation.suppression === 'child') {
          await tx
            .update(inbound)
            .set({
              event: null,
              conversationId: conversation.id,
              state: 'ignored',
              reason: 'Contato excluído ou identificado como criança',
            })
            .where(eq(inbound.id, row.id))
          return true
        }
        // A postback/echo can arrive before the HTTP send has been committed.
        const [inFlight] = await tx
          .select({ id: outbound.id })
          .from(outbound)
          .where(and(eq(outbound.conversationId, conversation.id), eq(outbound.state, 'sending')))
          .limit(1)
        if (inFlight && (event.kind === 'echo' || event.kind === 'postback')) {
          await tx
            .update(inbound)
            .set({
              conversationId: conversation.id,
              availableAt: new Date(now.getTime() + 2000),
              reason: 'Aguardando resultado de envio iniciado',
            })
            .where(eq(inbound.id, row.id))
          return false
        }
        if (event.kind === 'echo' && event.externalId) {
          const [ours] = await tx
            .select({ id: outbound.id })
            .from(outbound)
            .where(
              and(eq(outbound.accountId, row.accountId), eq(outbound.externalId, event.externalId)),
            )
            .limit(1)
          if (ours) {
            await tx
              .update(inbound)
              .set({
                state: 'ignored',
                conversationId: conversation.id,
                reason: 'Eco de envio já registrado',
              })
              .where(eq(inbound.id, row.id))
            return true
          }
        }
        const [current] = await tx
          .select({ journey: journeys, activation: activations })
          .from(journeys)
          .innerJoin(activations, eq(activations.id, journeys.activationId))
          .where(and(eq(journeys.conversationId, conversation.id), ne(journeys.state, 'closed')))
          .limit(1)
        const activation = current?.activation ?? (matches.length === 1 ? matches[0] : undefined)
        const parts = event.postback?.split(':')
        const validPostback = Boolean(
          current &&
            parts?.length === 3 &&
            parts[0] === 'sz' &&
            parts[1] === current.journey.id &&
            ['offer', 'help', 'student', 'stop'].includes(parts[2] ?? ''),
        )
        let decision = decideIncoming({
          event,
          plan: activation?.plan ?? null,
          state: current?.journey.state ?? null,
          blocked: Boolean(conversation.suppression),
          human: conversation.state === 'owned' || conversation.state === 'waiting-human',
          validPostback,
        })
        if (
          (decision === 'opening' || decision === 'offer') &&
          (!live || activation?.state !== 'active' || new Date(activation.plan.validUntil) <= now)
        )
          decision = 'none'
        // A fresh comment must not restart a private reply already attempted on this post.
        if (decision === 'opening' && event.kind === 'comment' && activation) {
          const [previous] = await tx
            .select({ id: journeys.id })
            .from(journeys)
            .innerJoin(activations, eq(activations.id, journeys.activationId))
            .where(
              and(
                eq(journeys.conversationId, conversation.id),
                eq(activations.externalPostId, activation.externalPostId ?? ''),
              ),
            )
            .limit(1)
          if (previous) decision = 'human'
        }
        const inboundAt =
          ['message', 'postback', 'unsupported'].includes(event.kind) &&
          eventAt <= now &&
          (!conversation.lastInboundAt || eventAt > conversation.lastInboundAt)
            ? eventAt
            : conversation.lastInboundAt
        const patch: Partial<typeof conversations.$inferInsert> = {
          version: conversation.version + 1,
          updatedAt: now,
          lastInboundAt: inboundAt,
          ...(!conversation.recipientEnc ? { recipientEnc: this.box.seal(event.recipient) } : {}),
        }
        let journey = current?.journey
        if (decision === 'opening' && activation && live) {
          patch.state = 'automatic'
          patch.ownerId = null
          const [created] = await tx
            .insert(journeys)
            .values({
              id: randomUUID(),
              conversationId: conversation.id,
              activationId: activation.id,
              state: 'opening-pending',
              commentId: event.commentId,
              createdAt: eventAt,
            })
            .returning()
          journey = created
        }
        if (decision === 'human' || decision === 'help') {
          patch.state = 'waiting-human'
          if (journey)
            await tx
              .update(journeys)
              .set({ previousState: journey.state, state: 'human' })
              .where(eq(journeys.id, journey.id))
        }
        if (decision === 'stop' || decision === 'student' || decision === 'child') {
          patch.suppression = decision
          patch.suppressedAt = now
          patch.state = 'closed'
          if (journey)
            await tx
              .update(journeys)
              .set({ previousState: journey.state, state: 'closed' })
              .where(eq(journeys.id, journey.id))
        }
        if (['human', 'help', 'stop', 'student', 'child'].includes(decision))
          await tx
            .update(outbound)
            .set({ state: 'cancelled', error: 'Conversa interrompida' })
            .where(and(eq(outbound.conversationId, conversation.id), eq(outbound.state, 'pending')))
        if (journey && activation && live && decision !== 'none' && decision !== 'human') {
          let message: OutboundMessage
          if (decision === 'opening')
            message = {
              text: activation.plan.opening,
              buttons: [
                { type: 'postback', title: 'Ver o projeto', payload: `sz:${journey.id}:offer` },
              ],
            }
          else if (decision === 'offer') {
            message = {
              text: activation.plan.offer,
              buttons: [
                {
                  type: 'web_url',
                  title: 'Conhecer o Desafio',
                  url: conversationUrl(activation.plan),
                },
                { type: 'postback', title: 'Tenho uma dúvida', payload: `sz:${journey.id}:help` },
                { type: 'postback', title: 'Já somos alunos', payload: `sz:${journey.id}:student` },
              ],
            }
            await tx
              .update(journeys)
              .set({ state: 'offer-pending', interactedAt: eventAt })
              .where(eq(journeys.id, journey.id))
          } else message = { text: activation.plan.responses[decision], buttons: [] }
          await tx
            .insert(outbound)
            .values({
              id: randomUUID(),
              accountId: row.accountId,
              conversationId: conversation.id,
              journeyId: journey.id,
              logicalKey: `${journey.id}:${decision}`,
              kind: decision,
              message,
              commentId: decision === 'opening' ? event.commentId : null,
              createdAt: now,
            })
            .onConflictDoNothing()
        }
        await tx.update(conversations).set(patch).where(eq(conversations.id, conversation.id))
        await tx
          .update(inbound)
          .set({ state: 'processed', conversationId: conversation.id, reason: decision })
          .where(eq(inbound.id, row.id))
        return true
      })
      if (done) processed++
    }
    return processed
  }
  async bindings(): Promise<PendingBinding[]> {
    const rows = await this.db
      .select({ activation: activations, publication: publications, account: socialAccounts })
      .from(activations)
      .innerJoin(publications, eq(publications.id, activations.publicationId))
      .innerJoin(socialAccounts, eq(socialAccounts.id, activations.accountId))
      .where(and(eq(activations.state, 'awaiting-link'), eq(publications.status, 'published')))
      .limit(20)
    return rows.flatMap((r) =>
      r.publication.externalPostId
        ? [
            {
              id: r.activation.id,
              version: r.activation.version,
              account: r.account,
              mediaId: r.publication.externalPostId,
              publicationVersion: r.publication.version,
            },
          ]
        : [],
    )
  }
  async bind(candidate: PendingBinding, verified: boolean) {
    await this.db.transaction(async (tx) => {
      const [channel] = await tx
        .select()
        .from(channels)
        .where(eq(channels.accountId, candidate.account.id))
        .for('update')
      const [activation] = await tx
        .select()
        .from(activations)
        .where(eq(activations.id, candidate.id))
      const [account] = await tx
        .select()
        .from(socialAccounts)
        .where(eq(socialAccounts.id, candidate.account.id))
      if (
        !channel ||
        !activation ||
        !account ||
        activation.state !== 'awaiting-link' ||
        activation.version !== candidate.version
      )
        return
      const [publication] = await tx
        .select()
        .from(publications)
        .where(eq(publications.id, activation.publicationId))
      const [piece] = await tx.select().from(items).where(eq(items.id, activation.pieceId))
      const [collision] = await tx
        .select({ id: activations.id })
        .from(activations)
        .where(
          and(
            eq(activations.accountId, account.id),
            eq(activations.externalPostId, candidate.mediaId),
            eq(activations.state, 'active'),
            ne(activations.id, activation.id),
          ),
        )
        .limit(1)
      const reason = !this.sendingEnabled
        ? 'Envio global desligado'
        : (channelUnavailable(channel, account, this.graphVersion, new Date()) ??
          (!verified
            ? 'Posse do post não comprovada'
            : publication?.version !== candidate.publicationVersion ||
                publication.externalPostId !== candidate.mediaId ||
                publication.socialAccountId !== account.id
              ? 'A publicação mudou durante a verificação'
              : !piece ||
                  piece.archived ||
                  piece.document.kind !== 'piece' ||
                  ['historical', 'incomplete'].includes(piece.document.state) ||
                  new Date(activation.plan.validUntil) <= new Date()
                ? 'Peça ou oferta indisponível'
                : collision
                  ? 'Outra revisão já está ativa neste post'
                  : null))
      await tx
        .update(activations)
        .set({
          state: reason ? 'blocked' : 'active',
          reason,
          version: activation.version + 1,
          externalPostId: candidate.mediaId,
          verifiedAt: reason ? null : new Date(),
        })
        .where(eq(activations.id, activation.id))
    })
  }
  claim(now: Date) {
    return claimEngagement(this, now)
  }
  finish(...args: Parameters<EngagementEngine['finish']>) {
    return finishEngagement(this, ...args)
  }
  maintain(now: Date) {
    return maintainEngagement(this, now)
  }
}
