import type { EditorialDocument, Permission } from '@sistemazero/marketing-contracts'
import {
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { contents, marketing, publications } from './schema'
export const editorialHandoffs = marketing.table(
  'editorial_handoffs',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),
    selection: jsonb('selection')
      .$type<import('@sistemazero/marketing-contracts').Handoff>()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('editorial_handoffs_expiry_idx').on(t.expiresAt)],
)
export const editorialProjects = marketing.table('editorial_projects', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  product: text('product').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  sequence: bigint('sequence', { mode: 'number' }).notNull().default(0),
})
export const editorialMembers = marketing.table(
  'editorial_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    userId: uuid('user_id').notNull(),
    permissions: jsonb('permissions').$type<Permission[]>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId] }),
    index('editorial_members_user_idx').on(t.userId),
  ],
)
export const editorialImports = marketing.table(
  'editorial_imports',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    origin: text('origin')
      .$type<import('@sistemazero/marketing-contracts').ImportStart['origin']>()
      .notNull(),
    digest: text('digest').notNull(),
    policyVersion: text('policy_version')
      .$type<import('@sistemazero/marketing-contracts').ImportInventory['policyVersion']>()
      .notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
    entryCount: integer('entry_count').notNull(),
    state: text('state')
      .$type<import('@sistemazero/marketing-contracts').ImportRun['state']>()
      .notNull()
      .default('receiving'),
    received: integer('received').notNull().default(0),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('editorial_imports_project_idx').on(t.projectId, t.id)],
)
export const editorialImportEntries = marketing.table(
  'editorial_import_entries',
  {
    runId: uuid('run_id')
      .notNull()
      .references(() => editorialImports.id),
    ordinal: integer('ordinal').notNull(),
    sourcePath: text('source_path').notNull(),
    source: jsonb('source')
      .$type<import('@sistemazero/marketing-contracts').InventoryEntry>()
      .notNull(),
    result: jsonb('result').$type<import('@sistemazero/marketing-contracts').ImportSourceResult>(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.ordinal] }),
    uniqueIndex('editorial_import_path_idx').on(t.runId, t.sourcePath),
  ],
)
export const editorialImportSourceVersions = marketing.table(
  'editorial_import_source_versions',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id').notNull(),
    origin: text('origin')
      .$type<import('@sistemazero/marketing-contracts').ImportInventory['origin']>()
      .notNull(),
    sourcePath: text('source_path').notNull(),
    sourceHash: text('source_hash').notNull(),
    previousSourceVersion: boolean('previous_source_version').notNull(),
    destinations: jsonb('destinations')
      .$type<import('@sistemazero/marketing-contracts').ImportSourceResult['destinations']>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'editorial_import_sources_project_fk',
      columns: [t.projectId],
      foreignColumns: [editorialProjects.id],
    }),
    uniqueIndex('editorial_import_source_identity_idx').on(
      t.projectId,
      t.origin,
      t.sourcePath,
      t.sourceHash,
    ),
  ],
)
export const editorialItems = marketing.table(
  'editorial_items',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    kind: text('kind').$type<EditorialDocument['kind']>().notNull(),
    revisionId: uuid('revision_id').notNull(),
    document: jsonb('document').$type<EditorialDocument>().notNull(),
    archived: boolean('archived').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('editorial_items_project_idx').on(t.projectId),
    uniqueIndex('editorial_items_project_id_idx').on(t.projectId, t.id),
  ],
)
export const editorialRevisions = marketing.table(
  'editorial_revisions',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => editorialItems.id),
    parentRevisionId: uuid('parent_revision_id'),
    document: jsonb('document').$type<EditorialDocument>().notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('editorial_revisions_entity_idx').on(t.projectId, t.entityId)],
)
export const editorialReceipts = marketing.table(
  'editorial_receipts',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    actorId: uuid('actor_id').notNull(),
    operationId: uuid('operation_id').notNull(),
    hash: text('hash').notNull(),
    result: jsonb('result').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.actorId, t.operationId] })],
)
export const editorialChanges = marketing.table(
  'editorial_changes',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    sequence: bigint('sequence', { mode: 'number' }).notNull(),
    type: text('type')
      .$type<import('@sistemazero/marketing-contracts').ChangeEvent['type']>()
      .notNull(),
    entityId: uuid('entity_id'),
    revisionId: uuid('revision_id'),
    actorId: uuid('actor_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.sequence] })],
)
export const editorialAssets = marketing.table(
  'editorial_assets',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    manifest: jsonb('manifest')
      .$type<import('@sistemazero/marketing-contracts').AssetManifest>()
      .notNull(),
    storageKey: text('storage_key').notNull(),
    confirmed: boolean('confirmed').notNull().default(false),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('editorial_assets_project_idx').on(t.projectId)],
)
export const editorialEditions = marketing.table(
  'editorial_editions',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    representationId: uuid('representation_id')
      .notNull()
      .references(() => editorialItems.id),
    hash: text('hash').notNull(),
    edition: jsonb('edition')
      .$type<import('@sistemazero/marketing-contracts').ApprovedEdition>()
      .notNull(),
    approvedBy: uuid('approved_by').notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('editorial_editions_representation_idx').on(t.projectId, t.representationId, t.id)],
)
export const editorialDeliveries = marketing.table(
  'editorial_deliveries',
  {
    publicationId: uuid('publication_id')
      .primaryKey()
      .references(() => publications.id),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editorialEditions.id),
    representationId: uuid('representation_id')
      .notNull()
      .references(() => editorialItems.id),
    sourcePublicationId: uuid('source_publication_id').references(() => publications.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('editorial_deliveries_content_idx').on(t.contentId),
    index('editorial_deliveries_representation_idx').on(
      t.projectId,
      t.representationId,
      t.createdAt,
      t.publicationId,
    ),
  ],
)
export const editorialRuns = marketing.table(
  'editorial_runs',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    request: jsonb('request')
      .$type<import('@sistemazero/marketing-contracts').ExecutionRequest>()
      .notNull(),
    context: jsonb('context')
      .$type<import('@sistemazero/marketing-contracts').ExecutionContext>()
      .notNull(),
    state: text('state')
      .$type<import('@sistemazero/marketing-contracts').ExecutionRun['state']>()
      .notNull(),
    epoch: integer('epoch').notNull().default(0),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    currentAttemptId: uuid('current_attempt_id'),
    outcome: jsonb('outcome').$type<import('@sistemazero/marketing-contracts').ExecutionOutcome>(),
    application:
      jsonb('application').$type<import('@sistemazero/marketing-contracts').EditorialApplication>(),
  },
  (t) => [
    index('editorial_runs_project_idx').on(t.projectId, t.createdAt),
    index('editorial_runs_owner_idx').on(t.createdBy, t.state),
  ],
)
export const editorialAttempts = marketing.table(
  'editorial_attempts',
  {
    id: uuid('id').primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => editorialRuns.id),
    epoch: integer('epoch').notNull(),
    deviceId: uuid('device_id').notNull(),
    state: text('state')
      .$type<import('@sistemazero/marketing-contracts').ExecutionRun['state']>()
      .notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }).notNull(),
    deadline: timestamp('deadline', { withTimezone: true }).notNull(),
    checkpoint: jsonb('checkpoint')
      .$type<import('@sistemazero/marketing-contracts').Heartbeat['checkpoint']>()
      .notNull(),
    outcome: jsonb('outcome').$type<import('@sistemazero/marketing-contracts').ExecutionOutcome>(),
  },
  (t) => [uniqueIndex('editorial_attempts_epoch_idx').on(t.runId, t.epoch)],
)
export const editorialUploads = marketing.table(
  'editorial_uploads',
  {
    assetId: uuid('asset_id')
      .primaryKey()
      .references(() => editorialAssets.id),
    uploadId: text('upload_id'),
    state: text('state')
      .$type<import('@sistemazero/marketing-contracts').UploadView['state']>()
      .notNull(),
    error: text('error'),
    verificationToken: uuid('verification_token'),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    attempts: integer('attempts').notNull().default(0),
  },
  (t) => [index('editorial_uploads_verify_idx').on(t.state, t.nextAttemptAt)],
)
