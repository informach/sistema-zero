import { t } from 'elysia'

// Ids que vão a colunas `uuid` validam o FORMATO na borda — um id lixo chegaria
// ao Postgres como 22P02 e viraria 500 INTERNAL_ERROR (padrão do members/hub).
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const UUID = t.String({ pattern: UUID_PATTERN })

export const IdParams = t.Object({ id: UUID })

const NULLABLE_TEXT = t.Optional(t.Union([t.String({ maxLength: 20_000 }), t.Null()]))
const NULLABLE_SHORT_TEXT = t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()]))
const NULLABLE_UUID = t.Optional(t.Union([UUID, t.Null()]))
// Datas chegam como ISO 8601 (string) e são parseadas/validadas na rota.
const NULLABLE_ISO_DATE = t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()]))
const VERSION = t.Integer({ minimum: 0 })

export const ListQuery = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

// ── Ideias ───────────────────────────────────────────────────────────────────
const IDEA_STATUS = t.Union([t.Literal('inbox'), t.Literal('accepted'), t.Literal('discarded')])

export const IdeasQuery = t.Object({
  status: t.Optional(IDEA_STATUS),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const IdeaBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 300 }),
  notes: NULLABLE_TEXT,
  source: NULLABLE_SHORT_TEXT,
  potential: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 3 }), t.Null()])),
  complexity: t.Optional(t.Union([t.String({ maxLength: 20 }), t.Null()])),
})

export const IdeaPatchBody = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
  notes: NULLABLE_TEXT,
  source: NULLABLE_SHORT_TEXT,
  status: t.Optional(IDEA_STATUS),
  potential: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 3 }), t.Null()])),
  complexity: t.Optional(t.Union([t.String({ maxLength: 20 }), t.Null()])),
})

const CONTENT_TYPE = t.Union([
  t.Literal('reels'),
  t.Literal('video_long'),
  t.Literal('carousel'),
  t.Literal('static_post'),
  t.Literal('story'),
])

export const PromoteIdeaBody = t.Object({
  contentType: CONTENT_TYPE,
  title: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
  ownerUserId: NULLABLE_UUID,
  ownerName: NULLABLE_SHORT_TEXT,
})

// ── Conteúdos ────────────────────────────────────────────────────────────────
const CONTENT_STAGE = t.Union([
  t.Literal('idea'),
  t.Literal('script'),
  t.Literal('recording'),
  t.Literal('editing'),
  t.Literal('cover_caption'),
  t.Literal('review'),
  t.Literal('approved'),
  t.Literal('scheduled'),
  t.Literal('published'),
  t.Literal('canceled'),
])

export const ContentsQuery = t.Object({
  stage: t.Optional(CONTENT_STAGE),
  ownerUserId: t.Optional(UUID),
  q: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const ContentBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 300 }),
  contentType: CONTENT_TYPE,
  brief: NULLABLE_TEXT,
  ownerUserId: NULLABLE_UUID,
  ownerName: NULLABLE_SHORT_TEXT,
  dueDate: NULLABLE_ISO_DATE,
  ideaId: NULLABLE_UUID,
})

export const ContentPatchBody = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
  brief: NULLABLE_TEXT,
  script: NULLABLE_TEXT,
  ownerUserId: NULLABLE_UUID,
  ownerName: NULLABLE_SHORT_TEXT,
  dueDate: NULLABLE_ISO_DATE,
  version: VERSION,
})

export const StageBody = t.Object({ to: CONTENT_STAGE })

export const ChecklistAddBody = t.Object({
  label: t.String({ minLength: 1, maxLength: 300 }),
})

export const ChecklistPatchBody = t.Object({
  done: t.Optional(t.Boolean()),
  label: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
})

export const CommentBody = t.Object({
  body: t.String({ minLength: 1, maxLength: 10_000 }),
})

// ── Publicações ──────────────────────────────────────────────────────────────
const PUB_FORMAT = t.Union([
  t.Literal('ig_feed'),
  t.Literal('ig_carousel'),
  t.Literal('ig_reels'),
  t.Literal('ig_story'),
  t.Literal('fb_post'),
  t.Literal('fb_reels'),
  t.Literal('yt_video'),
  t.Literal('yt_short'),
  t.Literal('tt_video'),
])

export const PublicationsCreateBody = t.Object({
  formats: t.Array(PUB_FORMAT, { minItems: 1, maxItems: 9 }),
  caption: t.Optional(t.String({ maxLength: 10_000 })),
})

export const PublicationPatchBody = t.Object({
  caption: t.Optional(t.String({ maxLength: 10_000 })),
  title: t.Optional(t.Union([t.String({ maxLength: 300 }), t.Null()])),
  tags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 100 }), { maxItems: 50 })),
  coverAssetId: NULLABLE_UUID,
  scheduledAt: NULLABLE_ISO_DATE,
  publishMode: t.Optional(t.Union([t.Literal('auto'), t.Literal('manual')])),
  // Conta do modo automático (obrigatória quando há mais de uma conta apta).
  socialAccountId: NULLABLE_UUID,
  version: VERSION,
})

export const ScheduleBody = t.Object({
  scheduledAt: t.String({ minLength: 10, maxLength: 40 }),
})

// Carrossel do IG: 1..10 imagens (teto da Graph API), na ordem do post.
export const PublicationAssetsBody = t.Object({
  assetIds: t.Array(UUID, { minItems: 1, maxItems: 10 }),
})

export const MarkPublishedBody = t.Object({
  externalUrl: t.Optional(
    t.Union([t.String({ maxLength: 2000, pattern: '^https?://' }), t.Null()]),
  ),
  externalPostId: t.Optional(t.Union([t.String({ maxLength: 200 }), t.Null()])),
})

// ── Mídia ────────────────────────────────────────────────────────────────────
const ASSET_KIND = t.Union([
  t.Literal('raw'),
  t.Literal('final'),
  t.Literal('cover'),
  t.Literal('other'),
])

export const PresignBody = t.Object({
  filename: t.String({ minLength: 1, maxLength: 300 }),
  contentType: t.String({ minLength: 1, maxLength: 100 }),
  sizeBytes: t.Integer({ minimum: 1 }),
  contentId: NULLABLE_UUID,
  kind: t.Optional(ASSET_KIND),
})

export const AssetsQuery = t.Object({
  contentId: t.Optional(UUID),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const AssetPatchBody = t.Object({
  contentId: NULLABLE_UUID,
  kind: t.Optional(ASSET_KIND),
})

// ── OAuth / Contas / Drive ───────────────────────────────────────────────────
export const NetworkParams = t.Object({
  network: t.String({ minLength: 1, maxLength: 20, pattern: '^[a-z]+$' }),
})

// O Google anexa params extras (scope/authuser/prompt) — não rejeitar.
export const OAuthCallbackQuery = t.Object(
  {
    code: t.Optional(t.String({ maxLength: 2000 })),
    state: t.Optional(t.String({ maxLength: 200 })),
    error: t.Optional(t.String({ maxLength: 200 })),
  },
  { additionalProperties: true },
)

export const DriveFilesQuery = t.Object({
  q: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  pageToken: t.Optional(t.String({ maxLength: 1000 })),
})

export const MediaImportBody = t.Object({
  driveFileId: t.Optional(t.String({ minLength: 10, maxLength: 200, pattern: '^[A-Za-z0-9_-]+$' })),
  driveUrl: t.Optional(t.String({ minLength: 10, maxLength: 2000 })),
  contentId: NULLABLE_UUID,
  kind: t.Optional(ASSET_KIND),
})

const PUB_STATUS = t.Union([
  t.Literal('draft'),
  t.Literal('ready'),
  t.Literal('scheduled'),
  t.Literal('publishing'),
  t.Literal('awaiting_manual'),
  t.Literal('published'),
  t.Literal('failed'),
  t.Literal('canceled'),
])

const NETWORK = t.Union([
  t.Literal('instagram'),
  t.Literal('facebook'),
  t.Literal('youtube'),
  t.Literal('tiktok'),
])

// `status` chega como CSV (ex.: scheduled,awaiting_manual) — validado na rota
// token a token contra o enum (CSV inválido → 400, nunca filtro silencioso).
export const PublicationsListQuery = t.Object({
  from: t.Optional(t.String({ minLength: 10, maxLength: 40 })),
  to: t.Optional(t.String({ minLength: 10, maxLength: 40 })),
  status: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  network: t.Optional(NETWORK),
  format: t.Optional(PUB_FORMAT),
  contentId: t.Optional(UUID),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 200 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})
export { PUB_STATUS }
