import { randomUUID } from 'node:crypto'
import { type ConversationAction, conversationResponses } from '@sistemazero/marketing-contracts'
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import { withinWindow } from '../../../domain/engagement/policy'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { conversationView } from './engagement.repository'
import {
  channelAccess,
  channelUnavailable,
  checkVersion,
  commandHash,
  previousCommand,
  recordCommand,
  unavailable,
} from './engagement-access'
import { minimizeChildConversation } from './engagement-privacy'
import {
  engagementActivations as activations,
  engagementConversations as conversations,
  engagementInbound as inbound,
  engagementJourneys as journeys,
  engagementOutbound as outbound,
} from './engagement-schema'
import { socialAccounts } from './schema'

export class DrizzleEngagementConversations {
  constructor(
    private readonly db: Database,
    private readonly graphVersion: string,
    private readonly sendingEnabled: boolean,
  ) {}
  action(actorId: string, accountId: string, conversationId: string, input: ConversationAction) {
    return this.db.transaction(async (tx) => {
      const channel = await channelAccess(
        tx,
        accountId,
        actorId,
        input.action === 'erase' ? 'admin' : 'reply',
      )
      const hash = commandHash('conversation', { conversationId, ...input })
      const previous = await previousCommand(tx, accountId, actorId, input.operationId, hash)
      if (previous) return previous.result
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.accountId, accountId)))
        .for('update')
      if (!conversation) throw unavailable()
      checkVersion(conversation.version, input.expectedVersion)
      if (conversation.suppression === 'erased' && !['erase', 'resolve'].includes(input.action))
        throw new WorkspaceError('INVALID_OPERATION', 'Conversa excluída não pode ser reaberta')
      if (
        conversation.suppression === 'child' &&
        !['erase', 'resolve', 'close'].includes(input.action)
      )
        throw new WorkspaceError(
          'INVALID_OPERATION',
          'Identificação como criança não pode ser removida nem receber outra resposta',
        )
      const [current] = await tx
        .select({ journey: journeys, activation: activations })
        .from(journeys)
        .innerJoin(activations, eq(activations.id, journeys.activationId))
        .where(eq(journeys.conversationId, conversationId))
        .orderBy(desc(journeys.createdAt))
        .limit(1)
      const now = new Date()
      if (['reply', 'saved-reply', 'resume'].includes(input.action)) {
        const [account] = await tx
          .select()
          .from(socialAccounts)
          .where(eq(socialAccounts.id, accountId))
        if (
          !this.sendingEnabled ||
          !account ||
          channelUnavailable(channel, account, this.graphVersion, now)
        )
          throw new WorkspaceError(
            'ENGAGEMENT_UNAVAILABLE',
            'Confira a capacidade e a habilitação de envio antes de responder ou retomar',
          )
        if (
          input.action === 'saved-reply' &&
          ['platform', 'community'].includes(input.key) &&
          (!current || new Date(current.activation.plan.validUntil) <= now)
        )
          throw new WorkspaceError(
            'ENGAGEMENT_UNAVAILABLE',
            'Esta resposta comercial exige uma oferta conferida e vigente na conversa',
          )
      }
      const patch: Partial<typeof conversations.$inferInsert> = {
        version: conversation.version + 1,
        updatedAt: now,
      }
      if (input.action === 'classify') {
        if (conversation.suppression === 'erased')
          throw new WorkspaceError('INVALID_OPERATION', 'Conversa excluída')
        patch.topic = input.topic
        patch.outcome = input.outcome
      } else if (input.action === 'resume') {
        const [request] = await tx
          .select()
          .from(inbound)
          .where(
            and(eq(inbound.id, input.requestEventId), eq(inbound.conversationId, conversationId)),
          )
        const [unresolved] = await tx
          .select({ id: outbound.id })
          .from(outbound)
          .where(
            and(
              eq(outbound.conversationId, conversationId),
              inArray(outbound.state, ['sending', 'uncertain']),
            ),
          )
          .limit(1)
        if (
          unresolved ||
          !request?.event ||
          !['message', 'postback'].includes(request.event.kind) ||
          !withinWindow(new Date(request.event.at), now, channel.proof?.messageWindowHours ?? 0) ||
          (conversation.suppressedAt && new Date(request.event.at) <= conversation.suppressedAt) ||
          conversation.suppression === 'child' ||
          conversation.suppression === 'erased'
        )
          throw new WorkspaceError(
            'INVALID_OPERATION',
            'A retomada exige nova solicitação elegível, sem bloqueio de criança/exclusão ou envio incerto',
          )
        patch.state = 'automatic'
        patch.ownerId = null
        patch.suppression = null
        patch.suppressedAt = null
        const reprocessRequest =
          !current ||
          current.journey.state === 'closed' ||
          !current.journey.openedAt ||
          Boolean(current.journey.offeredAt)
        // Previously queued clicks cannot release an offer after a human interruption.
        // A new journey may consume only the specific request reviewed by the operator and later events.
        patch.automationAfter = reprocessRequest ? new Date(request.event.at) : now
        if (current && current.journey.state === 'human') {
          // A human review only releases a waiting journey; it never silently resends an opening/offer.
          await tx
            .update(journeys)
            .set({
              state: current.journey.openedAt && !current.journey.offeredAt ? 'waiting' : 'closed',
            })
            .where(eq(journeys.id, current.journey.id))
        }
        if (reprocessRequest) {
          // Human confirmation authorizes this specific new request, not future incidental words.
          await tx
            .update(inbound)
            .set({
              state: 'pending',
              availableAt: now,
              reason: 'Nova solicitação conferida pela equipe',
            })
            .where(eq(inbound.id, request.id))
        }
      } else if (input.action === 'resolve') {
        const [intent] = await tx
          .select()
          .from(outbound)
          .where(and(eq(outbound.id, input.intentId), eq(outbound.conversationId, conversationId)))
        if (intent?.state !== 'uncertain' || (input.result === 'accepted' && !input.externalId))
          throw new WorkspaceError(
            'INVALID_OPERATION',
            'Escolha um envio incerto e informe a evidência/identificador quando aceito',
          )
        await tx
          .update(outbound)
          .set({
            state: input.result === 'accepted' ? 'accepted' : 'failed',
            externalId: conversation.suppression === 'erased' ? null : input.externalId,
            error:
              conversation.suppression === 'erased' ? null : `Resolução humana: ${input.evidence}`,
            acceptedAt: input.result === 'accepted' ? now : null,
          })
          .where(eq(outbound.id, intent.id))
        if (
          input.result === 'accepted' &&
          intent.journeyId &&
          (intent.kind === 'opening' || intent.kind === 'offer')
        ) {
          await tx
            .update(journeys)
            .set(
              intent.kind === 'opening'
                ? { openedAt: now, previousState: 'waiting' }
                : intent.kind === 'offer'
                  ? { offeredAt: now, previousState: 'presented' }
                  : {},
            )
            .where(eq(journeys.id, intent.journeyId))
        }
      } else {
        patch.state =
          input.action === 'close' || input.action === 'erase' || input.action === 'suppress'
            ? 'closed'
            : 'owned'
        patch.ownerId = actorId
        if (input.action === 'close') patch.automationAfter = now
        const preserveManual =
          input.action === 'reply' ||
          (input.action === 'saved-reply' && !['stop', 'student', 'child'].includes(input.key))
        await tx
          .update(outbound)
          .set({ state: 'cancelled', error: 'Atendimento humano interrompeu a pendência' })
          .where(
            and(
              eq(outbound.conversationId, conversationId),
              eq(outbound.state, 'pending'),
              preserveManual
                ? or(isNull(outbound.createdBy), eq(outbound.kind, 'typed'))
                : undefined,
            ),
          )
        if (input.action === 'suppress' || input.action === 'erase') {
          patch.suppression = input.action === 'suppress' ? input.reason : 'erased'
          patch.suppressedAt = now
        }
        if (current && input.action !== 'reply' && input.action !== 'saved-reply')
          await tx
            .update(journeys)
            .set({
              previousState: current.journey.state,
              state: input.action === 'take' ? 'human' : 'closed',
            })
            .where(eq(journeys.id, current.journey.id))
        if (input.action === 'erase') {
          patch.recipientEnc = null
          patch.topic = null
          patch.outcome = null
          await tx
            .update(inbound)
            .set({ event: null, state: 'ignored', reason: 'Conversa excluída' })
            .where(eq(inbound.conversationId, conversationId))
          await tx
            .update(outbound)
            .set({ message: null, error: null, externalId: null, commentId: null })
            .where(eq(outbound.conversationId, conversationId))
          await tx
            .update(journeys)
            .set({ commentId: null })
            .where(eq(journeys.conversationId, conversationId))
        }
        if (input.action === 'reply' || input.action === 'saved-reply') {
          if (
            conversation.suppression === 'erased' ||
            !conversation.recipientEnc ||
            !withinWindow(conversation.lastInboundAt, now, channel.proof?.messageWindowHours ?? 0)
          )
            throw new WorkspaceError(
              'ENGAGEMENT_UNAVAILABLE',
              'A conversa não tem janela de resposta comprovada',
            )
          if (
            conversation.suppression &&
            (input.action !== 'saved-reply' || !['stop', 'child', 'student'].includes(input.key))
          )
            throw new WorkspaceError(
              'INVALID_OPERATION',
              'O contato está suprimido; não envie nova apresentação',
            )
          if (input.action === 'saved-reply' && input.key === 'typed')
            throw new WorkspaceError(
              'INVALID_OPERATION',
              'R01 é enviada apenas ao liberar uma abertura ainda válida',
            )
          const text =
            input.action === 'reply'
              ? input.text
              : (current?.activation.plan.responses ?? conversationResponses)[input.key]
          if (
            input.action === 'saved-reply' &&
            (input.key === 'stop' || input.key === 'student' || input.key === 'child')
          ) {
            patch.suppression = input.key
            patch.suppressedAt = now
            patch.state = 'closed'
          }
          await tx.insert(outbound).values({
            id: randomUUID(),
            accountId,
            conversationId,
            journeyId: current?.journey.id ?? null,
            logicalKey: `manual:${actorId}:${input.operationId}`,
            kind: input.action === 'saved-reply' ? input.key : 'manual',
            message: { text, buttons: [] },
            createdBy: actorId,
          })
          if (current)
            await tx
              .update(journeys)
              .set({
                previousState: current.journey.state,
                state: patch.suppression ? 'closed' : 'human',
              })
              .where(eq(journeys.id, current.journey.id))
        }
      }
      if (
        input.action === 'resume' &&
        current &&
        current.journey.openedAt &&
        !current.journey.offeredAt &&
        current.journey.state === 'human' &&
        !conversation.typedReplySent &&
        current.activation.state === 'active' &&
        new Date(current.activation.plan.validUntil) > now
      ) {
        await tx
          .insert(outbound)
          .values({
            id: randomUUID(),
            accountId,
            conversationId,
            journeyId: current.journey.id,
            logicalKey: `typed:${conversationId}`,
            kind: 'typed',
            message: { text: current.activation.plan.responses.typed, buttons: [] },
            createdBy: actorId,
          })
          .onConflictDoNothing()
        patch.typedReplySent = true
      }
      await tx.update(conversations).set(patch).where(eq(conversations.id, conversationId))
      if ((patch.suppression ?? conversation.suppression) === 'child')
        await minimizeChildConversation(tx, conversationId)
      const [updated] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
      if (!updated) throw unavailable()
      return recordCommand(
        tx,
        accountId,
        actorId,
        input.operationId,
        hash,
        conversationView(updated),
      )
    })
  }
}
