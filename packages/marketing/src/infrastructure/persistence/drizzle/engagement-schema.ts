import type {
  CapabilityProof,
  ChannelPermission,
  ConversationPlan,
  IntentState,
  JourneyState,
} from '@sistemazero/marketing-contracts'
import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { IncomingEvent } from '../../../domain/engagement/policy'
import type { OutboundMessage } from '../../../domain/ports/engagement-provider.port'
import { marketing, publications, socialAccounts } from './schema'
import { editorialProjects, editorialRevisions } from './workspace-schema'

export const engagementChannels = marketing.table('engagement_channels', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => socialAccounts.id),
  version: integer('version').notNull().default(1),
  enabled: boolean('enabled').notNull().default(false),
  connectionId: text('connection_id').notNull(),
  graphVersion: text('graph_version').notNull(),
  proof: jsonb('proof').$type<CapabilityProof>(),
  retentionDays: integer('retention_days').notNull().default(90),
  maxSendsPerHour: integer('max_sends_per_hour').notNull().default(30),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
export const engagementMembers = marketing.table(
  'engagement_members',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => engagementChannels.accountId),
    userId: uuid('user_id').notNull(),
    permissions: jsonb('permissions').$type<ChannelPermission[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.userId] })],
)
export const engagementReceipts = marketing.table(
  'engagement_receipts',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => engagementChannels.accountId),
    actorId: uuid('actor_id').notNull(),
    operationId: uuid('operation_id').notNull(),
    hash: text('hash').notNull(),
    result: jsonb('result').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.actorId, t.operationId] })],
)
export const engagementApprovals = marketing.table('engagement_approvals', {
  revisionId: uuid('revision_id')
    .primaryKey()
    .references(() => editorialRevisions.id),
  projectId: uuid('project_id')
    .notNull()
    .references(() => editorialProjects.id),
  pieceId: uuid('piece_id').notNull(),
  approvedBy: uuid('approved_by').notNull(),
  approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
})
export const engagementActivations = marketing.table(
  'engagement_activations',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    pieceId: uuid('piece_id').notNull(),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => engagementApprovals.revisionId),
    publicationId: uuid('publication_id')
      .notNull()
      .references(() => publications.id),
    accountId: uuid('account_id')
      .notNull()
      .references(() => engagementChannels.accountId),
    plan: jsonb('plan').$type<ConversationPlan>().notNull(),
    version: integer('version').notNull().default(1),
    state: text('state')
      .$type<'awaiting-link' | 'active' | 'paused' | 'blocked' | 'retired'>()
      .notNull(),
    reason: text('reason'),
    externalPostId: text('external_post_id'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('engagement_activation_project_idx').on(t.projectId, t.pieceId),
    uniqueIndex('engagement_activation_live_post_idx')
      .on(t.accountId, t.externalPostId)
      .where(sql`${t.state}='active'`),
    uniqueIndex('engagement_activation_identity_idx').on(
      t.accountId,
      t.publicationId,
      t.revisionId,
    ),
  ],
)
export const engagementConversations = marketing.table(
  'engagement_conversations',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => engagementChannels.accountId),
    recipientKey: text('recipient_key').notNull(),
    recipientEnc: text('recipient_enc'),
    version: integer('version').notNull().default(1),
    state: text('state')
      .$type<'automatic' | 'waiting-human' | 'owned' | 'closed'>()
      .notNull()
      .default('automatic'),
    ownerId: uuid('owner_id'),
    suppression: text('suppression').$type<'stop' | 'student' | 'child' | 'erased'>(),
    suppressedAt: timestamp('suppressed_at', { withTimezone: true }),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    typedReplySent: boolean('typed_reply_sent').notNull().default(false),
    topic: text('topic').$type<'access' | 'project' | 'tools' | 'price' | 'continuity' | 'other'>(),
    outcome: text('outcome').$type<
      'needs-reply' | 'helped' | 'interested' | 'not-now' | 'closed'
    >(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('engagement_recipient_idx').on(t.accountId, t.recipientKey),
    index('engagement_inbox_idx').on(t.accountId, t.updatedAt, t.id),
  ],
)
export const engagementJourneys = marketing.table(
  'engagement_journeys',
  {
    id: uuid('id').primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => engagementConversations.id),
    activationId: uuid('activation_id')
      .notNull()
      .references(() => engagementActivations.id),
    state: text('state').$type<JourneyState>().notNull(),
    previousState: text('previous_state').$type<JourneyState>(),
    commentId: text('comment_id'),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    interactedAt: timestamp('interacted_at', { withTimezone: true }),
    offeredAt: timestamp('offered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('engagement_one_journey_idx')
      .on(t.conversationId)
      .where(sql`${t.state} <> 'closed'`),
  ],
)
export const engagementInbound = marketing.table(
  'engagement_inbound',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => engagementChannels.accountId),
    eventKey: text('event_key').notNull(),
    event: jsonb('event').$type<IncomingEvent>(),
    conversationId: uuid('conversation_id').references(() => engagementConversations.id),
    state: text('state').$type<'pending' | 'processed' | 'ignored'>().notNull().default('pending'),
    reason: text('reason'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('engagement_event_idx').on(t.accountId, t.eventKey),
    index('engagement_pending_idx').on(t.state, t.receivedAt),
  ],
)
export const engagementOutbound = marketing.table(
  'engagement_outbound',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => engagementChannels.accountId),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => engagementConversations.id),
    journeyId: uuid('journey_id').references(() => engagementJourneys.id),
    logicalKey: text('logical_key').notNull(),
    kind: text('kind').notNull(),
    message: jsonb('message').$type<OutboundMessage>(),
    commentId: text('comment_id'),
    state: text('state').$type<IntentState>().notNull().default('pending'),
    leaseId: uuid('lease_id'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    externalId: text('external_id'),
    error: text('error'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('engagement_intent_idx').on(t.accountId, t.logicalKey),
    index('engagement_dispatch_idx').on(t.state, t.availableAt),
  ],
)
