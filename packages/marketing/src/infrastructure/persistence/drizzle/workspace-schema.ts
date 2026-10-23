import type { EditorialDocument, Permission } from '@sistemazero/marketing-contracts'
import { sql } from 'drizzle-orm'
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
import { editorialItemReferences } from './editorial-reference-expression'
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
export const editorialImportProducts = marketing.table(
  'editorial_import_products',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    origin: text('origin')
      .$type<import('@sistemazero/marketing-contracts').ImportProductBinding['origin']>()
      .notNull(),
    product: text('product').notNull(),
    includeShared: boolean('include_shared').notNull(),
    revisionId: uuid('revision_id').notNull(),
    updatedBy: uuid('updated_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.origin] })],
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
export const editorialImportReleases = marketing.table(
  'editorial_import_releases',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    runId: uuid('run_id')
      .notNull()
      .references(() => editorialImports.id),
    verifiedRunId: uuid('verified_run_id')
      .notNull()
      .references(() => editorialImports.id),
    release: jsonb('release')
      .$type<import('@sistemazero/marketing-contracts').ImportRelease>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('editorial_import_releases_run_idx').on(t.projectId, t.runId, t.createdAt, t.id)],
)
export const editorialImportDecisions = marketing.table(
  'editorial_import_decisions',
  {
    runId: uuid('run_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    decision: jsonb('decision')
      .$type<import('@sistemazero/marketing-contracts').ImportDecision>()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.ordinal] }),
    foreignKey({
      name: 'editorial_import_decision_entry_fk',
      columns: [t.runId, t.ordinal],
      foreignColumns: [editorialImportEntries.runId, editorialImportEntries.ordinal],
    }),
  ],
)
export const editorialImportProductionReports = marketing.table(
  'editorial_import_production_reports',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    runId: uuid('run_id')
      .notNull()
      .references(() => editorialImports.id),
    report: jsonb('report')
      .$type<import('@sistemazero/marketing-contracts').ProductionReport>()
      .notNull(),
  },
  (t) => [index('editorial_import_production_reports_run_idx').on(t.projectId, t.runId, t.id)],
)
export const editorialImportProductionLinks = marketing.table(
  'editorial_import_production_links',
  {
    reportId: uuid('report_id').primaryKey(),
    projectId: uuid('project_id').notNull(),
    link: jsonb('link')
      .$type<import('@sistemazero/marketing-contracts').ProductionLink>()
      .notNull(),
  },
  (t) => [
    foreignKey({
      name: 'editorial_production_link_report_fk',
      columns: [t.reportId],
      foreignColumns: [editorialImportProductionReports.id],
    }),
    foreignKey({
      name: 'editorial_production_link_project_fk',
      columns: [t.projectId],
      foreignColumns: [editorialProjects.id],
    }),
    index('editorial_production_links_project_idx').on(t.projectId),
  ],
)
export const editorialImportSourceTexts = marketing.table('editorial_import_source_texts', {
  sourceVersionId: uuid('source_version_id')
    .primaryKey()
    .references(() => editorialImportSourceVersions.id),
  text: text('text').notNull(),
})
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
    uniqueIndex('editorial_import_source_project_idx').on(t.projectId, t.id),
  ],
)
export const editorialImportOfficeTexts = marketing.table(
  'editorial_import_office_texts',
  {
    projectId: uuid('project_id').notNull(),
    sourceVersionId: uuid('source_version_id').notNull(),
    parserVersion: text('parser_version').notNull(),
    textHash: text('text_hash').notNull(),
    destinations: jsonb('destinations')
      .$type<import('@sistemazero/marketing-contracts').ImportOfficeView['destinations']>()
      .notNull(),
    notes: jsonb('notes').$type<string[]>().notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.sourceVersionId, t.parserVersion] }),
    foreignKey({
      name: 'editorial_import_office_source_fk',
      columns: [t.projectId, t.sourceVersionId],
      foreignColumns: [editorialImportSourceVersions.projectId, editorialImportSourceVersions.id],
    }),
  ],
)
export const editorialImportStructures = marketing.table(
  'editorial_import_structures',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    sourceVersionId: uuid('source_version_id').notNull(),
    pieceId: uuid('piece_id').notNull(),
    sectionKey: text('section_key').notNull(),
    parserVersion: text('parser_version').notNull(),
    sequence: bigint('sequence', { mode: 'number' }).notNull(),
    destinations: jsonb('destinations')
      .$type<Array<{ entityId: string; revisionId: string }>>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'editorial_structure_source_fk',
      columns: [t.projectId, t.sourceVersionId],
      foreignColumns: [editorialImportSourceVersions.projectId, editorialImportSourceVersions.id],
    }),
    uniqueIndex('editorial_structure_version_idx').on(
      t.sourceVersionId,
      t.sectionKey,
      t.parserVersion,
    ),
    index('editorial_structure_piece_idx').on(t.projectId, t.pieceId, t.sequence),
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
    index('editorial_items_references_idx').using('gin', editorialItemReferences(t.document)),
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
  (t) => [
    index('editorial_revisions_entity_idx').on(t.projectId, t.entityId),
    index('editorial_revisions_history_idx').on(
      t.projectId,
      t.entityId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
  ],
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
  (t) => [
    primaryKey({ columns: [t.projectId, t.sequence] }),
    index('editorial_changes_snapshot_idx')
      .on(t.projectId, t.entityId, t.sequence.desc())
      .where(sql`${t.type} in ('revision', 'archive')`),
  ],
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
export const editorialProductionRecords = marketing.table(
  'editorial_production_records',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    actorId: uuid('actor_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    replacesId: uuid('replaces_id'),
    replacedBy: uuid('replaced_by'),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidedBy: uuid('voided_by'),
    body: jsonb('body')
      .$type<import('@sistemazero/marketing-contracts').ProductionRecordBody>()
      .notNull(),
  },
  (t) => [
    index('editorial_production_project_idx').on(t.projectId, t.createdAt),
    index('editorial_production_actor_idx').on(t.actorId),
  ],
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
export const editorialMonitors = marketing.table(
  'editorial_monitors',
  {
    watchlistId: uuid('watchlist_id')
      .primaryKey()
      .references(() => editorialItems.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    ownerId: uuid('owner_id').notNull(),
    version: integer('version').notNull(),
    sourceHash: text('source_hash').notNull(),
    config: jsonb('config')
      .$type<import('@sistemazero/marketing-contracts').MonitoringConfig>()
      .notNull(),
    state: text('state')
      .$type<import('@sistemazero/marketing-contracts').MonitoringView['state']>()
      .notNull(),
    nextAt: timestamp('next_at', { withTimezone: true }).notNull(),
    leaseToken: uuid('lease_token'),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    budgetDay: text('budget_day'),
    callsToday: integer('calls_today').notNull().default(0),
    lastCollectedAt: timestamp('last_collected_at', { withTimezone: true }),
    error: text('error'),
    etag: text('etag'),
    observedEntries: integer('observed_entries').notNull().default(0),
    truncated: boolean('truncated').notNull().default(false),
  },
  (t) => [
    index('editorial_monitors_due_idx').on(t.state, t.nextAt),
    index('editorial_monitors_project_idx').on(t.projectId),
  ],
)
export const editorialMonitorEntries = marketing.table(
  'editorial_monitor_entries',
  {
    id: uuid('id').primaryKey(),
    watchlistId: uuid('watchlist_id')
      .notNull()
      .references(() => editorialMonitors.watchlistId),
    projectId: uuid('project_id')
      .notNull()
      .references(() => editorialProjects.id),
    evidenceId: uuid('evidence_id')
      .notNull()
      .references(() => editorialItems.id),
    evidenceRevisionId: uuid('evidence_revision_id')
      .notNull()
      .references(() => editorialRevisions.id),
    sourceKey: text('source_key').notNull(),
    contentHash: text('content_hash').notNull(),
    title: text('title').notNull(),
    url: text('url'),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    change: text('change').$type<'new' | 'changed'>().notNull(),
    sourceType: text('source_type').$type<'public' | 'imported'>().notNull(),
  },
  (t) => [
    index('editorial_monitor_entries_page_idx').on(t.watchlistId, t.observedAt, t.id),
    index('editorial_monitor_entries_source_idx').on(
      t.watchlistId,
      t.sourceKey,
      t.observedAt.desc(),
      t.id.desc(),
    ),
  ],
)
