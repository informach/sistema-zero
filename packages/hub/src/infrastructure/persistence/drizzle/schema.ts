import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { AccessConfig } from '../../../domain/access/access-config'

// Compartilha o MESMO Postgres do payments/auth/catalog/members/funnel, mas é dono
// do schema `hub` (isolamento por `pgSchema`). Todo o DDL gerado fica em `hub.*`.
// Sem FK cross-schema: `author_id`/`user_id`/`course_ref` são snapshots do auth/members.
export const hub = pgSchema('hub')

// ── Enums ────────────────────────────────────────────────────────────────────
export const audienceEnum = hub.enum('audience', ['adult', 'kids'])
export const spaceStatusEnum = hub.enum('space_status', ['active', 'archived'])
export const visibilityEnum = hub.enum('visibility', [
  'public',
  'course_gated',
  'community_gated',
  'role_gated',
])
export const postingPolicyEnum = hub.enum('posting_policy', ['members', 'staff_only'])
// Conteúdo (tópico/comentário): `pending` = criado por não-staff em recurso que
// exige aprovação (some p/ os colegas até um staff aprovar); `rejected` = recusado.
export const contentStatusEnum = hub.enum('content_status', [
  'pending',
  'visible',
  'hidden',
  'deleted',
  'rejected',
])
export const reactionTargetEnum = hub.enum('reaction_target', ['thread', 'comment'])
export const reportTargetEnum = hub.enum('report_target', ['thread', 'comment'])
export const reportStatusEnum = hub.enum('report_status', ['open', 'resolved', 'dismissed'])
export const moderationKindEnum = hub.enum('moderation_kind', [
  'approve',
  'reject',
  'hide',
  'delete',
  'pin',
  'unpin',
  'lock',
  'unlock',
  'mute',
  'ban',
  'unmute',
  'unban',
])
export const muteBanKindEnum = hub.enum('mute_ban_kind', ['mute', 'ban'])
export const attachmentKindEnum = hub.enum('attachment_kind', [
  'image',
  'pdf',
  'document',
  'audio',
  'video',
])
export const attachmentStatusEnum = hub.enum('attachment_status', ['pending_upload', 'ready'])

// ── Servidores (spaces) ──────────────────────────────────────────────────────
export const spaces = hub.table(
  'spaces',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),
    audience: audienceEnum('audience').notNull().default('adult'),
    accessConfig: jsonb('access_config').$type<AccessConfig>().notNull(),
    // Pré-moderação: conteúdo de não-staff nasce `pending`. Default true p/ kids
    // (a rota seta na criação do space conforme a audiência).
    requiresApproval: boolean('requires_approval').notNull().default(false),
    // Aparece BLOQUEADO no menu sem acesso (vitrine), em vez de sumir. O conteúdo
    // segue gated — isto só afeta a LISTAGEM/detalhe-teaser. Default false.
    teaserWhenLocked: boolean('teaser_when_locked').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    status: spaceStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('spaces_slug_uq').on(t.slug),
    index('spaces_audience_sort_idx').on(t.audience, t.sortOrder),
  ],
)

// ── Canais (fóruns dentro do servidor) ───────────────────────────────────────
export const channels = hub.table(
  'channels',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    topic: text('topic'),
    // null = HERDA o accessConfig do space. Quando definido, faz AND com o space.
    accessConfig: jsonb('access_config').$type<AccessConfig>(),
    postingPolicy: postingPolicyEnum('posting_policy').notNull().default('members'),
    // null = HERDA o requiresApproval do space.
    requiresApproval: boolean('requires_approval'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: spaceStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('channels_space_slug_uq').on(t.spaceId, t.slug),
    index('channels_space_sort_idx').on(t.spaceId, t.sortOrder),
  ],
)

// ── Tópicos (postagens) ──────────────────────────────────────────────────────
export const threads = hub.table(
  'threads',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    // Corpo em MARKDOWN (renderizado sanitizado no front). Sem HTML cru.
    body: text('body').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    isLocked: boolean('is_locked').notNull().default(false),
    status: contentStatusEnum('status').notNull().default('visible'),
    commentCount: integer('comment_count').notNull().default(0),
    // ── Vitrine (Mural dos Criadores) ──
    // Post de PROJETO auto-publicado pela criança. O fórum redige o `authorId` de
    // terceiros (privacidade); a vitrine mostra o PRIMEIRO NOME via este snapshot.
    isShowcase: boolean('is_showcase').notNull().default(false),
    authorDisplayName: text('author_display_name'),
    // Perfil do autor é PÚBLICO (opt-in dos pais, snapshot no create) — o BFF expõe o
    // link do nome p/ o perfil público só quando true. Default false (segurança infantil).
    authorPublic: boolean('author_public').notNull().default(false),
    // Capa do projeto (URL pública http(s)) — print do jogo ou capa padrão do admin.
    coverImageUrl: text('cover_image_url'),
    // Idempotência da auto-publicação: hash(perfil:curso:cadeia). UNIQUE (NULLs são
    // distintos no Postgres → posts normais não colidem). Re-publicar = devolve o existente.
    showcaseIdempotencyKey: text('showcase_idempotency_key'),
    // Id PÚBLICO do artefato jogável (UUID). Quando presente, o card do Mural ganha
    // "Acessar" → página pública /jogar/<play_id> (sem login). Só na vitrine do Estúdio.
    playId: text('play_id'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('threads_channel_slug_uq').on(t.channelId, t.slug),
    // Listagem: por canal+status, mais recentes primeiro (cursor por last_activity_at,id).
    index('threads_channel_status_activity_idx').on(t.channelId, t.status, t.lastActivityAt),
    // Fila de aprovação por autor (ver os próprios pendentes).
    index('threads_author_status_idx').on(t.authorId, t.status),
    // Dedupe da auto-publicação da vitrine (NULL = posts normais, distintos).
    uniqueIndex('threads_showcase_key_uq').on(t.showcaseIdempotencyKey),
  ],
)

// ── Comentários ──────────────────────────────────────────────────────────────
export const comments = hub.table(
  'comments',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull(),
    // Snapshot do primeiro nome + flag pública do autor (exibido/clicável no fórum).
    authorDisplayName: text('author_display_name'),
    authorPublic: boolean('author_public').notNull().default(false),
    body: text('body').notNull(),
    status: contentStatusEnum('status').notNull().default('visible'),
    replyToId: uuid('reply_to_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  // Listagem cronológica por thread (cursor por created_at,id).
  (t) => [index('comments_thread_status_created_idx').on(t.threadId, t.status, t.createdAt, t.id)],
)

// ── Anexos (UGC) ─────────────────────────────────────────────────────────────
// O storage real vive no R2 (BFF/member-shell); aqui guardamos só o metadado +
// `storage_ref` (`r2ugc:<key>`, nunca exposto ao browser). `pending_upload` →
// `ready` após o HEAD confirmar o upload direto. thread_id/comment_id nulos até o
// conteúdo ser submetido (presign acontece antes).
export const attachments = hub.table(
  'attachments',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    threadId: uuid('thread_id').references(() => threads.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
    kind: attachmentKindEnum('kind').notNull(),
    storageRef: text('storage_ref').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: integer('duration_seconds'),
    originalName: text('original_name').notNull(),
    status: attachmentStatusEnum('status').notNull().default('pending_upload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('attachments_thread_idx').on(t.threadId),
    index('attachments_comment_idx').on(t.commentId),
    index('attachments_owner_status_idx').on(t.ownerId, t.status),
  ],
)

// ── Reações (toggle por emoji por usuário) ───────────────────────────────────
export const reactions = hub.table(
  'reactions',
  {
    id: uuid('id').primaryKey(),
    targetType: reactionTargetEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    userId: uuid('user_id').notNull(),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('reactions_target_user_emoji_uq').on(t.targetType, t.targetId, t.userId, t.emoji),
    index('reactions_target_idx').on(t.targetType, t.targetId),
  ],
)

// ── Estado de leitura (badge "novidades" — calculado na carga, NÃO ao vivo) ──
export const readState = hub.table(
  'read_state',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('read_state_user_channel_uq').on(t.userId, t.channelId)],
)

// ── Moderação: denúncias ─────────────────────────────────────────────────────
export const reports = hub.table(
  'reports',
  {
    id: uuid('id').primaryKey(),
    targetType: reportTargetEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    spaceId: uuid('space_id').notNull(),
    reporterId: uuid('reporter_id').notNull(),
    reason: text('reason').notNull(),
    status: reportStatusEnum('status').notNull().default('open'),
    resolvedBy: uuid('resolved_by'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('reports_space_status_created_idx').on(t.spaceId, t.status, t.createdAt)],
)

// ── Moderação: auditoria de ações ────────────────────────────────────────────
export const moderationActions = hub.table(
  'moderation_actions',
  {
    id: uuid('id').primaryKey(),
    kind: moderationKindEnum('kind').notNull(),
    spaceId: uuid('space_id'),
    channelId: uuid('channel_id'),
    targetUserId: uuid('target_user_id'),
    targetId: uuid('target_id'),
    moderatorId: uuid('moderator_id').notNull(),
    reason: text('reason'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('moderation_actions_space_created_idx').on(t.spaceId, t.createdAt)],
)

// ── Moderação: silenciamentos/banimentos ativos ──────────────────────────────
export const mutesBans = hub.table(
  'mutes_bans',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    spaceId: uuid('space_id').notNull(),
    // null = vale no servidor inteiro; preenchido = só no canal.
    channelId: uuid('channel_id'),
    kind: muteBanKindEnum('kind').notNull(),
    // null = permanente.
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    reason: text('reason'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('mutes_bans_user_space_idx').on(t.userId, t.spaceId)],
)

// ── Deduplicação de webhooks de entrada ──────────────────────────────────────
export const processedWebhooks = hub.table(
  'processed_webhooks',
  {
    deliveryId: text('delivery_id').primaryKey(),
    eventName: text('event_name').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('processed_webhooks_processed_at_idx').on(t.processedAt)],
)

export const schema = {
  spaces,
  channels,
  threads,
  comments,
  attachments,
  reactions,
  readState,
  reports,
  moderationActions,
  mutesBans,
  processedWebhooks,
}

export type SpaceRow = typeof spaces.$inferSelect
export type ChannelRow = typeof channels.$inferSelect
export type ThreadRow = typeof threads.$inferSelect
export type CommentRow = typeof comments.$inferSelect
export type AttachmentRow = typeof attachments.$inferSelect
export type ReactionRow = typeof reactions.$inferSelect
export type ReportRow = typeof reports.$inferSelect
export type MuteBanRow = typeof mutesBans.$inferSelect
