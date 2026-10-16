import { and, eq, inArray, ne, notInArray, or } from 'drizzle-orm'
import {
  engagementConversations as conversations,
  engagementInbound as inbound,
  engagementJourneys as journeys,
  engagementOutbound as outbound,
} from './engagement-schema'
import type { WorkspaceTransaction } from './workspace.repository'

/** A child exit may finish once; no other private content remains available to operators. */
export async function minimizeChildConversation(tx: WorkspaceTransaction, id: string) {
  const allowedExit = and(
    eq(outbound.kind, 'child'),
    inArray(outbound.state, ['pending', 'sending']),
  )
  await tx
    .update(inbound)
    .set({ event: null, state: 'ignored', reason: 'Contato identificado como criança' })
    .where(eq(inbound.conversationId, id))
  await tx
    .update(outbound)
    .set({ message: null, externalId: null, error: null, commentId: null })
    .where(
      and(
        eq(outbound.conversationId, id),
        or(ne(outbound.kind, 'child'), notInArray(outbound.state, ['pending', 'sending'])),
      ),
    )
  await tx.update(journeys).set({ commentId: null }).where(eq(journeys.conversationId, id))
  const [exit] = await tx
    .select({ id: outbound.id })
    .from(outbound)
    .where(and(eq(outbound.conversationId, id), allowedExit))
    .limit(1)
  await tx
    .update(conversations)
    .set({ topic: null, outcome: null, ...(!exit ? { recipientEnc: null } : {}) })
    .where(eq(conversations.id, id))
}
