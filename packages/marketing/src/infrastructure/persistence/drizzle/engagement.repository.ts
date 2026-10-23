import { randomUUID } from 'node:crypto'
import {
  type activateConversationSchema,
  type activationActionSchema,
  activationViewSchema,
  type approveConversationSchema,
  approvedEditionSchema,
  type channelMemberSchema,
  channelViewSchema,
  type configureChannelSchema,
  conversationDetailSchema,
  conversationPlanSchema,
  conversationViewSchema,
  engagementSummarySchema,
} from '@sistemazero/marketing-contracts'
import { and, desc, eq, gte, inArray, lt, or, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import {
  channelAccess,
  channelUnavailable,
  checkVersion,
  commandHash,
  connectionIdentity,
  previousCommand,
  recordCommand,
  unavailable,
} from './engagement-access'
import {
  engagementActivations as activations,
  engagementApprovals as approvals,
  engagementChannels as channels,
  engagementConversations as conversations,
  engagementInbound as inbound,
  engagementJourneys as journeys,
  engagementMembers as members,
  engagementOutbound as outbound,
} from './engagement-schema'
import { publications, socialAccounts } from './schema'
import { projectAccess, receipt, recordChange } from './workspace.repository'
import {
  editorialDeliveries as deliveries,
  editorialEditions as editions,
  editorialReceipts,
  editorialItems as items,
  editorialRevisions as revisions,
} from './workspace-schema'

export const activationView = (row: typeof activations.$inferSelect) =>
  activationViewSchema.parse({
    id: row.id,
    projectId: row.projectId,
    pieceId: row.pieceId,
    revisionId: row.revisionId,
    publicationId: row.publicationId,
    accountId: row.accountId,
    version: row.version,
    state: row.state,
    reason: row.reason,
    externalPostId: row.externalPostId,
    createdAt: row.createdAt.toISOString(),
  })
export const conversationView = (row: typeof conversations.$inferSelect) =>
  conversationViewSchema.parse({
    id: row.id,
    accountId: row.accountId,
    version: row.version,
    state: row.state,
    ownerId: row.ownerId,
    suppression: row.suppression,
    lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    recipient: `Contato ${row.id.slice(0, 8)}`,
    topic: row.topic,
    outcome: row.outcome,
  })
export class DrizzleEngagementRepository {
  constructor(
    readonly db: Database,
    readonly graphVersion: string,
    readonly sendingEnabled: boolean,
  ) {}
  channelMembers(actorId: string, admin: boolean, accountId: string) {
    return this.db.transaction(async (tx) => {
      await channelAccess(tx, accountId, actorId, 'admin', admin)
      return tx
        .select({ userId: members.userId, permissions: members.permissions })
        .from(members)
        .where(eq(members.accountId, accountId))
    })
  }
  approval(actorId: string, projectId: string, pieceId: string, revisionId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const [row] = await tx
        .select({ id: approvals.revisionId })
        .from(approvals)
        .where(
          and(
            eq(approvals.projectId, projectId),
            eq(approvals.pieceId, pieceId),
            eq(approvals.revisionId, revisionId),
          ),
        )
      return { revisionId, approved: Boolean(row) }
    })
  }
  health(actorId: string, accountId: string) {
    return this.db.transaction(async (tx) => {
      await channelAccess(tx, accountId, actorId, 'read')
      const now = new Date()
      const [incoming] = await tx
        .select({
          count: sql<number>`count(*)::int`,
          oldest: sql<string | null>`min(${inbound.receivedAt})`,
        })
        .from(inbound)
        .where(and(eq(inbound.accountId, accountId), eq(inbound.state, 'pending')))
      const states = await tx
        .select({ state: outbound.state, count: sql<number>`count(*)::int` })
        .from(outbound)
        .where(
          and(
            eq(outbound.accountId, accountId),
            inArray(outbound.state, ['pending', 'sending', 'uncertain']),
          ),
        )
        .groupBy(outbound.state)
      const [failed] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(outbound)
        .where(
          and(
            eq(outbound.accountId, accountId),
            eq(outbound.state, 'failed'),
            gte(outbound.createdAt, new Date(now.getTime() - 86400000)),
          ),
        )
      const [human] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(
          and(
            eq(conversations.accountId, accountId),
            inArray(conversations.state, ['waiting-human', 'owned']),
          ),
        )
      const count = (state: string) => states.find((r) => r.state === state)?.count ?? 0
      return {
        asOf: now.toISOString(),
        pendingInbound: incoming?.count ?? 0,
        oldestPendingAt: incoming?.oldest ? new Date(incoming.oldest).toISOString() : null,
        pendingOutbound: count('pending'),
        sending: count('sending'),
        uncertain: count('uncertain'),
        failed24h: failed?.count ?? 0,
        waitingHuman: human?.count ?? 0,
      }
    })
  }
  commercialOrigins(actorId: string, projectId: string, pieceId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const [piece] = await tx
        .select()
        .from(items)
        .where(and(eq(items.id, pieceId), eq(items.projectId, projectId)))
      if (piece?.document.kind !== 'piece') throw unavailable()
      const rows = await tx
        .select({ plan: activations.plan })
        .from(activations)
        .where(and(eq(activations.projectId, projectId), eq(activations.pieceId, pieceId)))
      // Draft text is user-editable; it cannot grant access to an arbitrary analytical origin.
      const plans = rows.map((row) => row.plan)
      const unique = new Map(
        plans.map((plan) => [
          `${plan.campaign}:${plan.contentKey}`,
          { campaign: plan.campaign, content: plan.contentKey },
        ]),
      )
      if (unique.size > 20)
        throw new WorkspaceError(
          'CONTEXT_TOO_LARGE',
          'A peça tem mais de vinte origens; consulte o relatório do funil',
        )
      return [...unique.values()]
    })
  }
  async channels(actorId: string, admin: boolean) {
    const accounts = await this.db
      .select({ account: socialAccounts, member: members })
      .from(socialAccounts)
      .leftJoin(members, and(eq(members.accountId, socialAccounts.id), eq(members.userId, actorId)))
      .where(
        and(
          eq(socialAccounts.network, 'instagram'),
          admin ? undefined : sql`jsonb_array_length(${members.permissions}) > 0`,
        ),
      )
      .limit(100)
    const result = []
    for (const { account, member } of accounts) {
      const [channel] = await this.db
        .select()
        .from(channels)
        .where(eq(channels.accountId, account.id))
      if (!admin && !member?.permissions.length) continue
      const reason = !this.sendingEnabled
        ? 'Envio global desligado; preparação disponível'
        : channel
          ? channelUnavailable(channel, account, this.graphVersion, new Date())
          : 'Configure a equipe e comprove a capacidade'
      result.push(
        channelViewSchema.parse({
          id: account.id,
          name: account.displayName,
          version: channel?.version ?? 0,
          enabled: channel?.enabled ?? false,
          permissions: member?.permissions ?? [],
          canConfigure: admin || Boolean(member?.permissions.includes('admin')),
          proof: channel?.proof ?? null,
          available: reason === null,
          reason,
          retentionDays: channel?.retentionDays ?? 90,
          maxSendsPerHour: channel?.maxSendsPerHour ?? 30,
        }),
      )
    }
    return result
  }
  configure(
    actorId: string,
    admin: boolean,
    accountId: string,
    input: z.infer<typeof configureChannelSchema>,
  ) {
    return this.db.transaction(async (tx) => {
      const [account] = await tx
        .select()
        .from(socialAccounts)
        .where(and(eq(socialAccounts.id, accountId), eq(socialAccounts.network, 'instagram')))
        .for('update')
      if (!account) throw unavailable()
      const [channel] = await tx
        .select()
        .from(channels)
        .where(eq(channels.accountId, accountId))
        .for('update')
      if (!channel && !admin) throw unavailable()
      if (channel) await channelAccess(tx, accountId, actorId, 'admin', admin)
      const hash = commandHash('configure', input)
      if (channel) {
        const previous = await previousCommand(tx, accountId, actorId, input.operationId, hash)
        if (previous) return previous.result
      }
      checkVersion(channel?.version ?? 0, input.expectedVersion)
      const now = new Date()
      if (
        input.proof &&
        (new Date(input.proof.validUntil) <= now ||
          new Date(input.proof.validUntil).getTime() > now.getTime() + 7 * 86400000)
      )
        throw new WorkspaceError('VALIDATION_ERROR', 'A prova precisa vencer em até sete dias')
      if (input.enabled && (!this.sendingEnabled || !input.proof))
        throw new WorkspaceError(
          'ENGAGEMENT_UNAVAILABLE',
          'Envio global e prova de capacidade são obrigatórios',
        )
      const values = {
        accountId,
        version: (channel?.version ?? 0) + 1,
        enabled: input.enabled,
        connectionId: connectionIdentity(account),
        graphVersion: this.graphVersion,
        proof: input.proof,
        retentionDays: input.retentionDays,
        maxSendsPerHour: input.maxSendsPerHour,
        updatedAt: now,
      }
      if (input.enabled && channelUnavailable(values, account, this.graphVersion, now))
        throw new WorkspaceError(
          'ENGAGEMENT_UNAVAILABLE',
          'A conta ainda não tem todas as permissões necessárias',
        )
      if (channel) await tx.update(channels).set(values).where(eq(channels.accountId, accountId))
      else {
        await tx.insert(channels).values(values)
        await tx.insert(members).values({
          accountId,
          userId: actorId,
          permissions: ['read', 'reply', 'activate', 'admin'],
        })
      }
      if (!input.enabled) {
        await tx
          .update(outbound)
          .set({ state: 'cancelled', error: 'Conta pausada' })
          .where(and(eq(outbound.accountId, accountId), eq(outbound.state, 'pending')))
        await tx
          .update(activations)
          .set({ state: 'paused', reason: 'Conta pausada', version: sql`${activations.version}+1` })
          .where(
            and(
              eq(activations.accountId, accountId),
              inArray(activations.state, ['active', 'awaiting-link']),
            ),
          )
      }
      return recordCommand(tx, accountId, actorId, input.operationId, hash, {
        version: values.version,
      })
    })
  }
  setMember(
    actorId: string,
    admin: boolean,
    accountId: string,
    input: z.infer<typeof channelMemberSchema>,
  ) {
    return this.db.transaction(async (tx) => {
      const channel = await channelAccess(tx, accountId, actorId, 'admin', admin)
      const hash = commandHash('member', input),
        previous = await previousCommand(tx, accountId, actorId, input.operationId, hash)
      if (previous) return previous.result
      checkVersion(channel.version, input.expectedVersion)
      if (input.userId === actorId && !input.permissions.includes('admin'))
        throw new WorkspaceError(
          'INVALID_OPERATION',
          'Mantenha sua administração ao alterar a própria permissão',
        )
      await tx
        .insert(members)
        .values({ accountId, userId: input.userId, permissions: input.permissions })
        .onConflictDoUpdate({
          target: [members.accountId, members.userId],
          set: { permissions: input.permissions },
        })
      await tx
        .update(channels)
        .set({ version: channel.version + 1, updatedAt: new Date() })
        .where(eq(channels.accountId, accountId))
      return recordCommand(tx, accountId, actorId, input.operationId, hash, {
        version: channel.version + 1,
      })
    })
  }
  approve(actorId: string, projectId: string, input: z.infer<typeof approveConversationSchema>) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'approve')
      const hash = commandHash('approve-conversation', input),
        previous = await receipt(tx, projectId, actorId, input.operationId, hash)
      if (previous) return previous.result
      const [revision] = await tx
        .select()
        .from(revisions)
        .where(and(eq(revisions.id, input.revisionId), eq(revisions.projectId, projectId)))
      if (revision?.document.kind !== 'piece' || !revision.document.conversation)
        throw unavailable()
      const [item] = await tx
        .select()
        .from(items)
        .where(
          and(
            eq(items.id, revision.entityId),
            eq(items.revisionId, revision.id),
            eq(items.archived, false),
          ),
        )
      const plan = conversationPlanSchema.parse(revision.document.conversation)
      if (
        !item ||
        revision.document.state === 'historical' ||
        revision.document.state === 'incomplete' ||
        new Date(plan.validUntil) <= new Date() ||
        new Date(plan.validUntil).getTime() > Date.now() + 7 * 86400000
      )
        throw new WorkspaceError(
          'CONTEXT_CHANGED',
          'Conclua a revisão vigente e confira a oferta com validade de até sete dias antes de aprovar',
        )
      await tx
        .insert(approvals)
        .values({
          revisionId: revision.id,
          pieceId: revision.entityId,
          projectId,
          approvedBy: actorId,
        })
        .onConflictDoNothing()
      const result = { revisionId: revision.id, approved: true }
      await tx
        .insert(editorialReceipts)
        .values({ projectId, actorId, operationId: input.operationId, hash, result })
      await recordChange(tx, projectId, actorId, 'approval', revision.entityId, revision.id)
      return result
    })
  }
  async listActivations(actorId: string, projectId: string, pieceId: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const rows = await tx
        .select()
        .from(activations)
        .where(and(eq(activations.projectId, projectId), eq(activations.pieceId, pieceId)))
        .orderBy(desc(activations.createdAt))
        .limit(100)
      return rows.map(activationView)
    })
  }
  activate(actorId: string, projectId: string, input: z.infer<typeof activateConversationSchema>) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'publish')
      const channel = await channelAccess(tx, input.accountId, actorId, 'activate')
      const hash = commandHash('activate', { projectId, ...input }),
        previous = await previousCommand(tx, input.accountId, actorId, input.operationId, hash)
      if (previous) return previous.result
      const [approved] = await tx
        .select()
        .from(approvals)
        .where(and(eq(approvals.revisionId, input.revisionId), eq(approvals.projectId, projectId)))
      const [revision] = await tx.select().from(revisions).where(eq(revisions.id, input.revisionId))
      const [binding] = await tx
        .select()
        .from(deliveries)
        .where(
          and(
            eq(deliveries.publicationId, input.publicationId),
            eq(deliveries.projectId, projectId),
          ),
        )
      const [publication] = await tx
        .select()
        .from(publications)
        .where(eq(publications.id, input.publicationId))
      const [account] = await tx
        .select()
        .from(socialAccounts)
        .where(eq(socialAccounts.id, input.accountId))
      if (
        !approved ||
        revision?.document.kind !== 'piece' ||
        !revision.document.conversation ||
        !binding ||
        !publication ||
        !account
      )
        throw unavailable()
      const [edition] = await tx.select().from(editions).where(eq(editions.id, binding.editionId))
      const [piece] = await tx.select().from(items).where(eq(items.id, approved.pieceId))
      if (
        !piece ||
        piece.archived ||
        piece.document.kind !== 'piece' ||
        ['historical', 'incomplete'].includes(piece.document.state)
      )
        throw new WorkspaceError('INVALID_OPERATION', 'A peça precisa estar completa e disponível')
      if (
        !input.checkedPublication ||
        !edition ||
        approvedEditionSchema.parse(edition.edition).snapshot.pieceId !== approved.pieceId ||
        publication.network !== 'instagram' ||
        publication.format === 'ig_story' ||
        publication.socialAccountId !== input.accountId
      )
        throw new WorkspaceError(
          'INVALID_OPERATION',
          'Escolha a publicação da mesma peça e conta explícita',
        )
      const plan = conversationPlanSchema.parse(revision.document.conversation)
      if (
        new Date(plan.validUntil) <= new Date() ||
        !this.sendingEnabled ||
        channelUnavailable(channel, account, this.graphVersion, new Date())
      )
        throw new WorkspaceError(
          'ENGAGEMENT_UNAVAILABLE',
          'Confira validade da oferta, capacidade e habilitação de envio',
        )
      if (['canceled', 'failed'].includes(publication.status))
        throw new WorkspaceError('INVALID_OPERATION', 'A publicação precisa estar disponível')
      const [duplicate] = await tx
        .select({ id: activations.id })
        .from(activations)
        .where(
          and(
            eq(activations.accountId, input.accountId),
            eq(activations.publicationId, input.publicationId),
            eq(activations.revisionId, input.revisionId),
          ),
        )
      if (duplicate)
        throw new WorkspaceError(
          'CONCURRENCY_CONFLICT',
          'Esta revisão já tem ativação; use pausar ou retomar',
        )
      const [row] = await tx
        .insert(activations)
        .values({
          id: randomUUID(),
          projectId,
          pieceId: approved.pieceId,
          revisionId: input.revisionId,
          publicationId: input.publicationId,
          accountId: input.accountId,
          plan,
          state: 'awaiting-link',
          reason: 'Aguardando publicação e verificação de posse do post',
          createdBy: actorId,
        })
        .returning()
      if (!row) throw new Error('Ativação não persistida')
      await recordChange(tx, projectId, actorId, 'observation', approved.pieceId, input.revisionId)
      return recordCommand(
        tx,
        input.accountId,
        actorId,
        input.operationId,
        hash,
        activationView(row),
      )
    })
  }
  activationAction(
    actorId: string,
    projectId: string,
    id: string,
    input: z.infer<typeof activationActionSchema>,
  ) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'publish')
      const [found] = await tx
        .select()
        .from(activations)
        .where(and(eq(activations.id, id), eq(activations.projectId, projectId)))
      if (!found) throw unavailable()
      await channelAccess(tx, found.accountId, actorId, 'activate')
      const [row] = await tx.select().from(activations).where(eq(activations.id, id)).for('update')
      if (!row) throw unavailable()
      const hash = commandHash('activation-action', { id, ...input }),
        previous = await previousCommand(tx, row.accountId, actorId, input.operationId, hash)
      if (previous) return previous.result
      checkVersion(row.version, input.expectedVersion)
      if (row.state === 'retired')
        throw new WorkspaceError(
          'INVALID_OPERATION',
          'Uma ativação encerrada não pode ser retomada',
        )
      const state =
        input.action === 'resume'
          ? 'awaiting-link'
          : input.action === 'retire'
            ? 'retired'
            : 'paused'
      const [updated] = await tx
        .update(activations)
        .set({ state, reason: input.reason, version: row.version + 1, verifiedAt: null })
        .where(eq(activations.id, id))
        .returning()
      const linked = await tx
        .select({ id: journeys.id })
        .from(journeys)
        .where(eq(journeys.activationId, id))
      if (linked.length)
        await tx
          .update(outbound)
          .set({ state: 'cancelled', error: 'Ativação alterada' })
          .where(
            and(
              inArray(
                outbound.journeyId,
                linked.map((j) => j.id),
              ),
              eq(outbound.state, 'pending'),
            ),
          )
      if (!updated) throw unavailable()
      return recordCommand(
        tx,
        row.accountId,
        actorId,
        input.operationId,
        hash,
        activationView(updated),
      )
    })
  }
  async listConversations(actorId: string, accountId: string, before?: string) {
    return this.db.transaction(async (tx) => {
      await channelAccess(tx, accountId, actorId, 'read')
      const [cursor] = before
        ? await tx
            .select()
            .from(conversations)
            .where(and(eq(conversations.accountId, accountId), eq(conversations.id, before)))
        : []
      if (before && !cursor) throw unavailable()
      const rows = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.accountId, accountId),
            cursor
              ? or(
                  lt(conversations.updatedAt, cursor.updatedAt),
                  and(
                    eq(conversations.updatedAt, cursor.updatedAt),
                    lt(conversations.id, cursor.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(conversations.updatedAt), desc(conversations.id))
        .limit(51)
      return {
        items: rows.slice(0, 50).map(conversationView),
        nextCursor: rows.length > 50 ? (rows[49]?.id ?? null) : null,
      }
    })
  }
  detail(actorId: string, accountId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await channelAccess(tx, accountId, actorId, 'read')
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.accountId, accountId)))
      if (!conversation) throw unavailable()
      const incoming = await tx
        .select()
        .from(inbound)
        .where(eq(inbound.conversationId, id))
        .orderBy(desc(inbound.receivedAt))
        .limit(100)
      const outgoing = await tx
        .select()
        .from(outbound)
        .where(eq(outbound.conversationId, id))
        .orderBy(desc(outbound.createdAt))
        .limit(100)
      const unresolved = await tx
        .select()
        .from(outbound)
        .where(and(eq(outbound.conversationId, id), eq(outbound.state, 'uncertain')))
        .limit(100)
      const [current] = await tx
        .select({ journey: journeys, activation: activations })
        .from(journeys)
        .innerJoin(activations, eq(activations.id, journeys.activationId))
        .where(eq(journeys.conversationId, id))
        .orderBy(desc(journeys.createdAt))
        .limit(1)
      const messages = [
        ...incoming
          .filter((row) => row.event !== null)
          .map((row) => ({
            id: row.id,
            direction: 'in',
            text: row.event?.text ?? null,
            kind: row.event?.kind ?? 'unsupported',
            state: row.state,
            at: row.receivedAt.toISOString(),
            externalId: row.event?.externalId ?? null,
          })),
        ...outgoing.map((row) => ({
          id: row.id,
          direction: 'out',
          text: row.message?.text ?? null,
          kind: row.kind,
          state: row.state,
          at: row.createdAt.toISOString(),
          externalId: row.externalId,
        })),
      ]
        .sort((a, b) => a.at.localeCompare(b.at))
        .slice(-100)
      // An old unresolved delivery must remain actionable even when outside the recent history.
      const visible = [
        ...messages,
        ...unresolved
          .filter((row) => !messages.some((m) => m.id === row.id))
          .map((row) => ({
            id: row.id,
            direction: 'out',
            text: row.message?.text ?? null,
            kind: row.kind,
            state: row.state,
            at: row.createdAt.toISOString(),
            externalId: row.externalId,
          })),
      ].sort((a, b) => a.at.localeCompare(b.at))
      return conversationDetailSchema.parse({
        conversation: conversationView(conversation),
        messages: visible,
        journey: current
          ? {
              id: current.journey.id,
              state: current.journey.state,
              campaign: current.activation.plan.campaign,
              contentKey: current.activation.plan.contentKey,
              plan: current.activation.plan,
              createdAt: current.journey.createdAt.toISOString(),
            }
          : null,
      })
    })
  }
  summary(actorId: string, projectId: string, pieceId: string, from: Date, to: Date) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const rows = await tx
        .select({
          journey: journeys,
          suppression: conversations.suppression,
          topic: conversations.topic,
          outcome: conversations.outcome,
        })
        .from(journeys)
        .innerJoin(activations, eq(activations.id, journeys.activationId))
        .innerJoin(conversations, eq(conversations.id, journeys.conversationId))
        .where(
          and(
            eq(activations.projectId, projectId),
            eq(activations.pieceId, pieceId),
            gte(journeys.createdAt, from),
            lt(journeys.createdAt, to),
          ),
        )
        .limit(10000)
      if (rows.length >= 10000)
        throw new WorkspaceError('CONTEXT_TOO_LARGE', 'Reduza o período do relatório')
      const ids = rows.map((r) => r.journey.id)
      const sends = ids.length
        ? await tx
            .select({ state: outbound.state })
            .from(outbound)
            .where(inArray(outbound.journeyId, ids))
        : []
      return engagementSummarySchema.parse({
        from: from.toISOString(),
        to: to.toISOString(),
        journeys: rows.length,
        topics: [...new Set(rows.flatMap((r) => (r.topic ? [r.topic] : [])))].map((topic) => ({
          topic,
          count: new Set(rows.filter((r) => r.topic === topic).map((r) => r.journey.conversationId))
            .size,
        })),
        outcomes: [...new Set(rows.flatMap((r) => (r.outcome ? [r.outcome] : [])))].map(
          (outcome) => ({
            outcome,
            count: new Set(
              rows.filter((r) => r.outcome === outcome).map((r) => r.journey.conversationId),
            ).size,
          }),
        ),
        openingAccepted: rows.filter((r) => r.journey.openedAt).length,
        interacted: rows.filter((r) => r.journey.interactedAt).length,
        offerAccepted: rows.filter((r) => r.journey.offeredAt).length,
        human: rows.filter((r) => r.journey.state === 'human').length,
        suppressed: rows.filter((r) => r.suppression !== null).length,
        uncertain: sends.filter((s) => s.state === 'uncertain').length,
        failed: sends.filter((s) => s.state === 'failed').length,
        pending: sends.filter((s) => s.state === 'pending' || s.state === 'sending').length,
      })
    })
  }
}
