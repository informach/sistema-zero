import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Compartilha o MESMO Postgres dos demais serviços, mas é dono do schema
// `marketing` (isolamento por `pgSchema`). Sem FK cross-schema: `created_by`/
// `owner_user_id` etc. são snapshots do auth (equipe).
export const marketing = pgSchema('marketing')

// ── Enums ────────────────────────────────────────────────────────────────────
export const ideaStatusEnum = marketing.enum('idea_status', ['inbox', 'accepted', 'discarded'])
export const contentTypeEnum = marketing.enum('content_type', [
  'reels',
  'video_long',
  'carousel',
  'static_post',
  'story',
])
// Etapas do pipeline de produção. `scheduled`/`published` são MATERIALIZADAS a
// partir das publicações (o service sincroniza); movimentos manuais valem só
// entre idea..approved (domain/content/stage.ts).
export const contentStageEnum = marketing.enum('content_stage', [
  'idea',
  'script',
  'recording',
  'editing',
  'cover_caption',
  'review',
  'approved',
  'scheduled',
  'published',
  'canceled',
])
export const checklistOriginEnum = marketing.enum('checklist_origin', ['template', 'manual'])
export const assetKindEnum = marketing.enum('asset_kind', ['raw', 'final', 'cover', 'other'])
// `importing` = cópia Drive→R2 em andamento; `archiving`/`archived` = ciclo de
// arquivamento R2→Drive pós-publicação (media-transfer-worker, fase futura).
export const assetStatusEnum = marketing.enum('asset_status', [
  'pending_upload',
  'importing',
  'ready',
  'archiving',
  'archived',
  'failed',
])
export const networkEnum = marketing.enum('network', ['instagram', 'facebook', 'youtube', 'tiktok'])
export const accountStatusEnum = marketing.enum('account_status', [
  'connected',
  'needs_reauth',
  'revoked',
  'disabled',
])
export const pubFormatEnum = marketing.enum('pub_format', [
  'ig_feed',
  'ig_carousel',
  'ig_reels',
  'ig_story',
  'fb_post',
  'fb_reels',
  'yt_video',
  'yt_short',
  'tt_video',
])
export const publishModeEnum = marketing.enum('publish_mode', ['auto', 'manual'])
export const pubStatusEnum = marketing.enum('pub_status', [
  'draft',
  'ready',
  'scheduled',
  'publishing',
  'awaiting_manual',
  'published',
  'failed',
  'canceled',
])

// ── Ideias (inbox) ───────────────────────────────────────────────────────────
export const ideas = marketing.table(
  'ideas',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    notes: text('notes'),
    // De onde veio (comentário de aluno, referência, brainstorm...) — texto livre.
    source: text('source'),
    status: ideaStatusEnum('status').notNull().default('inbox'),
    // Potencial (1..3) e complexidade (P/M/G) p/ priorizar o inbox.
    potential: integer('potential'),
    complexity: text('complexity'),
    createdBy: uuid('created_by').notNull(),
    createdByName: text('created_by_name'),
    promotedContentId: uuid('promoted_content_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('ideas_status_created_idx').on(t.status, t.createdAt)],
)

// ── Conteúdo-mestre (pipeline de produção) ───────────────────────────────────
export const contents = marketing.table(
  'contents',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    title: text('title').notNull(),
    contentType: contentTypeEnum('content_type').notNull(),
    stage: contentStageEnum('stage').notNull().default('idea'),
    // Briefing/ideia (markdown) e roteiro (markdown).
    brief: text('brief'),
    script: text('script'),
    ownerUserId: uuid('owner_user_id'),
    ownerName: text('owner_name'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    ideaId: uuid('idea_id'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('contents_stage_idx').on(t.stage, t.updatedAt),
    index('contents_owner_idx').on(t.ownerUserId),
    index('contents_due_idx').on(t.dueDate),
  ],
)

// ── Histórico de etapas (lead-time do dashboard) ─────────────────────────────
export const contentStageEvents = marketing.table(
  'content_stage_events',
  {
    id: uuid('id').primaryKey(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    fromStage: contentStageEnum('from_stage').notNull(),
    toStage: contentStageEnum('to_stage').notNull(),
    actorUserId: uuid('actor_user_id').notNull(),
    actorName: text('actor_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('content_stage_events_content_idx').on(t.contentId, t.createdAt)],
)

// ── Checklist por conteúdo (copiado dos templates em código + itens manuais) ─
export const checklistItems = marketing.table(
  'checklist_items',
  {
    id: uuid('id').primaryKey(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    done: boolean('done').notNull().default(false),
    doneBy: uuid('done_by'),
    doneByName: text('done_by_name'),
    doneAt: timestamp('done_at', { withTimezone: true }),
    position: integer('position').notNull().default(0),
    origin: checklistOriginEnum('origin').notNull().default('template'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('checklist_items_content_idx').on(t.contentId, t.position)],
)

// ── Comentários da equipe no conteúdo ────────────────────────────────────────
export const comments = marketing.table(
  'comments',
  {
    id: uuid('id').primaryKey(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id').notNull(),
    // Snapshot do nome (padrão hub) — o auth pode renomear depois.
    authorName: text('author_name'),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('comments_content_created_idx').on(t.contentId, t.createdAt)],
)

// ── Mídia (metadado; bytes no R2 e/ou Drive) ─────────────────────────────────
export const mediaAssets = marketing.table(
  'media_assets',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    contentId: uuid('content_id').references(() => contents.id, { onDelete: 'set null' }),
    kind: assetKindEnum('kind').notNull().default('other'),
    // Invariantes: `ready` exige r2Key; `archived` exige driveFileId.
    r2Key: text('r2_key'),
    driveFileId: text('drive_file_id'),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    status: assetStatusEnum('status').notNull().default('pending_upload'),
    // Retry do media-transfer-worker (import Drive→R2 / archive R2→Drive).
    transferAttempts: integer('transfer_attempts').notNull().default(0),
    transferNextAt: timestamp('transfer_next_at', { withTimezone: true }),
    transferError: text('transfer_error'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    r2DeletedAt: timestamp('r2_deleted_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('media_assets_content_idx').on(t.contentId),
    // Fila do worker de transferência (parcial: só o que está em trânsito).
    index('media_assets_transfer_idx')
      .on(t.status, t.transferNextAt)
      .where(sql`${t.status} in ('importing', 'archiving')`),
  ],
)

// ── Contas sociais conectadas (tokens CIFRADOS — AES-256-GCM) ────────────────
export const socialAccounts = marketing.table(
  'social_accounts',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    network: networkEnum('network').notNull(),
    // IG business id / page id / channel id / open_id — por rede.
    externalId: text('external_id').notNull(),
    displayName: text('display_name').notNull(),
    username: text('username'),
    // NUNCA em claro: formato versionado `v1.<iv>.<tag>.<ct>` (secret-box).
    accessTokenEnc: text('access_token_enc'),
    refreshTokenEnc: text('refresh_token_enc'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }),
    scopes: text('scopes').array().notNull().default([]),
    status: accountStatusEnum('status').notNull().default('connected'),
    // Meta: {pageId, igBusinessId}; Google: {channelId} — específico por rede.
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    connectedBy: uuid('connected_by').notNull(),
    lastRefreshAt: timestamp('last_refresh_at', { withTimezone: true }),
    lastRefreshError: text('last_refresh_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('social_accounts_network_external_uq').on(t.network, t.externalId)],
)

// ── Publicações (uma por rede/formato de um conteúdo-mestre) ─────────────────
export const publications = marketing.table(
  'publications',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    // Nullable: publicação em modo `manual` não precisa de conta conectada.
    socialAccountId: uuid('social_account_id').references(() => socialAccounts.id, {
      onDelete: 'set null',
    }),
    // Denormalizado do format (índice de claim do publisher-worker).
    network: networkEnum('network').notNull(),
    format: pubFormatEnum('format').notNull(),
    caption: text('caption').notNull().default(''),
    // Título (YouTube) — null nas demais redes.
    title: text('title'),
    tags: text('tags').array().notNull().default([]),
    coverAssetId: uuid('cover_asset_id'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    // ig_story é SEMPRE manual (Stories não tem API de publicação).
    publishMode: publishModeEnum('publish_mode').notNull().default('manual'),
    status: pubStatusEnum('status').notNull().default('draft'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    lastError: text('last_error'),
    // Checkpoint de idempotência do publisher (creation_id da Meta, uploadUri do
    // YouTube, publish_id do TikTok) — persistido ANTES/DEPOIS de cada side-effect.
    providerSession: jsonb('provider_session')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    externalPostId: text('external_post_id'),
    externalUrl: text('external_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    metricsLastCollectedAt: timestamp('metrics_last_collected_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('publications_content_idx').on(t.contentId),
    // Claim do publisher-worker: agendadas vencidas (espelha o messages_claim_idx).
    index('publications_claim_idx').on(t.status, t.scheduledAt),
    // Reaper de lease: presas em `publishing` com lease vencido.
    index('publications_lease_idx')
      .on(t.status, t.nextAttemptAt)
      .where(sql`${t.status} = 'publishing'`),
    // Janela do Calendário/Painel (GET /marketing/publications?from&to) — o
    // claim_idx não serve janela sem status.
    index('publications_scheduled_idx').on(t.scheduledAt),
  ],
)

// ── Ordem dos assets num carrossel ───────────────────────────────────────────
export const publicationAssets = marketing.table(
  'publication_assets',
  {
    publicationId: uuid('publication_id')
      .notNull()
      .references(() => publications.id, { onDelete: 'cascade' }),
    mediaAssetId: uuid('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [
    uniqueIndex('publication_assets_uq').on(t.publicationId, t.mediaAssetId),
    index('publication_assets_pub_idx').on(t.publicationId, t.position),
  ],
)

// ── Métricas (séries temporais, append-only) ─────────────────────────────────
export const metricPublicationSnapshots = marketing.table(
  'metric_publication_snapshots',
  {
    id: uuid('id').primaryKey(),
    publicationId: uuid('publication_id')
      .notNull()
      .references(() => publications.id, { onDelete: 'cascade' }),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
    views: bigint('views', { mode: 'number' }).notNull().default(0),
    likes: integer('likes').notNull().default(0),
    comments: integer('comments').notNull().default(0),
    shares: integer('shares').notNull().default(0),
    saves: integer('saves').notNull().default(0),
    reach: bigint('reach', { mode: 'number' }),
    watchTimeSeconds: bigint('watch_time_seconds', { mode: 'number' }),
    avgWatchRatio: real('avg_watch_ratio'),
    // Payload cru da rede — não perder nada que a API devolveu.
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('metric_pub_snapshots_idx').on(t.publicationId, t.capturedAt)],
)

export const metricAccountSnapshots = marketing.table(
  'metric_account_snapshots',
  {
    id: uuid('id').primaryKey(),
    socialAccountId: uuid('social_account_id')
      .notNull()
      .references(() => socialAccounts.id, { onDelete: 'cascade' }),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
    followers: integer('followers').notNull().default(0),
    following: integer('following'),
    mediaCount: integer('media_count'),
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('metric_account_snapshots_idx').on(t.socialAccountId, t.capturedAt)],
)

// ── OAuth: state + PKCE (single-use, TTL curto) ──────────────────────────────
export const oauthStates = marketing.table(
  'oauth_states',
  {
    state: text('state').primaryKey(),
    network: networkEnum('network').notNull(),
    codeVerifier: text('code_verifier'),
    createdBy: uuid('created_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('oauth_states_expires_idx').on(t.expiresAt)],
)

export const schema = {
  ideas,
  contents,
  contentStageEvents,
  checklistItems,
  comments,
  mediaAssets,
  socialAccounts,
  publications,
  publicationAssets,
  metricPublicationSnapshots,
  metricAccountSnapshots,
  oauthStates,
}

export type IdeaRow = typeof ideas.$inferSelect
export type ContentRow = typeof contents.$inferSelect
export type ChecklistItemRow = typeof checklistItems.$inferSelect
export type CommentRow = typeof comments.$inferSelect
export type MediaAssetRow = typeof mediaAssets.$inferSelect
export type SocialAccountRow = typeof socialAccounts.$inferSelect
export type PublicationRow = typeof publications.$inferSelect
