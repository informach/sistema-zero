import { t } from 'elysia'

// Ids que vão a colunas `uuid` validam o FORMATO na borda — um id lixo chegaria
// ao Postgres como 22P02 e viraria 500 INTERNAL_ERROR (padrão do members/catalog).
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const UUID = t.String({ pattern: UUID_PATTERN })

export const IdParams = t.Object({ id: UUID })
export const PlayIdParams = t.Object({ playId: UUID })
export const SpaceIdParams = t.Object({ spaceId: UUID })
/** Slug na rota do aluno (servidor) — não é uuid. */
export const SlugParams = t.Object({ slug: t.String({ minLength: 1, maxLength: 120 }) })

const AUDIENCE = t.Union([t.Literal('adult'), t.Literal('kids')])

/** Query da listagem do aluno: vitrine (ausente → adult, como no members). */
export const AudienceQuery = t.Object({ audience: t.Optional(AUDIENCE) })
const SPACE_STATUS = t.Union([t.Literal('active'), t.Literal('archived')])
const POSTING_POLICY = t.Union([t.Literal('members'), t.Literal('staff_only')])

const SLUG = t.String({ minLength: 1, maxLength: 120, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
const NAME = t.String({ minLength: 1, maxLength: 200 })
const VERSION = t.Integer({ minimum: 0 })
const NULLABLE_TEXT = t.Optional(t.Union([t.String({ maxLength: 5000 }), t.Null()]))
const HTTP_URL_PATTERN = '^https?://'
const NULLABLE_URL = t.Optional(
  t.Union([t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN }), t.Null()]),
)
// A capa da vitrine é renderizada como `<img src>` numa parede INFANTIL → só https
// (sem `http://` mixed-content). O conteúdo é produzido pelo BFF (URL pública do R2
// ou capa padrão do admin); o pino de esquema é a defesa de borda do hub.
const HTTPS_URL_PATTERN = '^https://'

// accessConfig: a coerência (course_gated exige cursos; role_gated exige cargos) é
// reforçada no service — aqui aceitamos arrays opcionais (default [] no mapper).
const COURSE_REF = t.String({ minLength: 1, maxLength: 200 })
const COMMUNITY_REF = t.String({ minLength: 1, maxLength: 200 })
const ROLE = t.String({ minLength: 1, maxLength: 50 })
export const AccessConfigSchema = t.Object(
  {
    visibility: t.Union([
      t.Literal('public'),
      t.Literal('course_gated'),
      t.Literal('community_gated'),
      t.Literal('role_gated'),
    ]),
    courses: t.Optional(t.Array(COURSE_REF, { maxItems: 200 })),
    communities: t.Optional(t.Array(COMMUNITY_REF, { maxItems: 200 })),
    roles: t.Optional(t.Array(ROLE, { maxItems: 50 })),
  },
  { additionalProperties: false },
)

/** Corpo de `POST /hub/admin/spaces`. */
export const SpaceBody = t.Object({
  slug: SLUG,
  name: NAME,
  description: NULLABLE_TEXT,
  iconUrl: NULLABLE_URL,
  audience: AUDIENCE,
  accessConfig: AccessConfigSchema,
  // Ausente → default por audiência (kids = true) no mapper.
  requiresApproval: t.Optional(t.Boolean()),
  // Aparece bloqueado no menu sem acesso (vitrine). Ausente → false no mapper.
  teaserWhenLocked: t.Optional(t.Boolean()),
  status: t.Optional(SPACE_STATUS),
})

/** Corpo de `PATCH /hub/admin/spaces/:id` — exige a versão vista pelo cliente. */
export const SpacePatchBody = t.Object({
  slug: t.Optional(SLUG),
  name: t.Optional(NAME),
  description: NULLABLE_TEXT,
  iconUrl: NULLABLE_URL,
  audience: t.Optional(AUDIENCE),
  accessConfig: t.Optional(AccessConfigSchema),
  requiresApproval: t.Optional(t.Boolean()),
  teaserWhenLocked: t.Optional(t.Boolean()),
  status: t.Optional(SPACE_STATUS),
  version: VERSION,
})

/** Corpo de `POST /hub/admin/spaces/:id/channels`. */
export const ChannelBody = t.Object({
  slug: SLUG,
  name: NAME,
  topic: NULLABLE_TEXT,
  // `null` = herda do space; objeto = acesso próprio (ANDado com o space na leitura).
  accessConfig: t.Optional(t.Union([AccessConfigSchema, t.Null()])),
  postingPolicy: t.Optional(POSTING_POLICY),
  // `null`/ausente = herda do space.
  requiresApproval: t.Optional(t.Union([t.Boolean(), t.Null()])),
  status: t.Optional(SPACE_STATUS),
})

/** Corpo de `PATCH /hub/admin/channels/:id` — exige a versão vista pelo cliente. */
export const ChannelPatchBody = t.Object({
  slug: t.Optional(SLUG),
  name: t.Optional(NAME),
  topic: NULLABLE_TEXT,
  accessConfig: t.Optional(t.Union([AccessConfigSchema, t.Null()])),
  postingPolicy: t.Optional(POSTING_POLICY),
  requiresApproval: t.Optional(t.Union([t.Boolean(), t.Null()])),
  status: t.Optional(SPACE_STATUS),
  version: VERSION,
})

/** Query de `GET /hub/admin/spaces`. */
export const ListSpacesQuery = t.Object({
  q: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  audience: t.Optional(AUDIENCE),
  status: t.Optional(SPACE_STATUS),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

/** Reordenação de canais de um servidor: ids na nova ordem (filhos atuais exatos). */
export const ReorderBody = t.Object({
  orderedIds: t.Array(UUID, { maxItems: 1000 }),
})

/** Reordenação de servidores DE UMA audiência. */
export const ReorderSpacesBody = t.Object({
  audience: AUDIENCE,
  orderedIds: t.Array(UUID, { maxItems: 1000 }),
})

// ── Tópicos / comentários (aluno) ────────────────────────────────────────────
const MARKDOWN_BODY = t.String({ minLength: 1, maxLength: 50_000 })
/** Ids de anexos já registrados (pending_upload) a vincular ao post. */
const ATTACHMENT_IDS = t.Optional(t.Array(UUID, { maxItems: 50 }))

export const CreateThreadBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 300 }),
  body: MARKDOWN_BODY,
  /** Referência opcional a um jogo do Mural (`play_id`) — o service valida a visibilidade. */
  playId: t.Optional(t.Union([UUID, t.Null()])),
  attachmentIds: ATTACHMENT_IDS,
})

export const CreateCommentBody = t.Object({
  body: MARKDOWN_BODY,
  replyToId: t.Optional(t.Union([UUID, t.Null()])),
  attachmentIds: ATTACHMENT_IDS,
})

/** Edição (autor): corpo Markdown + versão vista pelo cliente. */
export const EditBody = t.Object({ body: MARKDOWN_BODY, version: VERSION })

/**
 * Corpo de `POST /hub/internal/showcase-thread` (BFF → hub, em nome da criança). O
 * corpo só diz QUAL projeto (`lessonId`/`blockId`) e a capa capturada; título, resumo,
 * audiência, nome do autor e idempotência são resolvidos no hub (S2S ao members +
 * header de perfil do gateway) — NUNCA confiados do corpo (a rota é alcançável na borda).
 */
export const ShowcaseThreadBody = t.Object({
  spaceSlug: SLUG,
  lessonId: UUID,
  blockId: UUID,
  coverImageUrl: t.Optional(
    t.Union([t.String({ maxLength: 2000, pattern: HTTPS_URL_PATTERN }), t.Null()]),
  ),
})

/**
 * Corpo de `POST /hub/internal/showcase-thread-studio` (BFF → hub, em nome da
 * criança) — variação KID-DRIVEN do "Compartilhar" do Estúdio: a `description` é
 * escrita/editada pela criança e o projeto ganha um `playId` (link público de
 * jogar). Título/elegibilidade/nome continuam autoritativos do members/header (a
 * rota é alcançável na borda — o corpo não é confiável). `clientIdempotencyKey`
 * dedup-a duplo-clique; republicar depois = post novo (imutável).
 */
export const ShowcaseThreadStudioBody = t.Object({
  spaceSlug: SLUG,
  lessonId: UUID,
  blockId: UUID,
  description: t.String({ minLength: 1, maxLength: 280 }),
  coverImageUrl: t.Optional(
    t.Union([t.String({ maxLength: 2000, pattern: HTTPS_URL_PATTERN }), t.Null()]),
  ),
  playId: UUID,
  clientIdempotencyKey: UUID,
})

/**
 * Corpo de `POST /hub/internal/showcase-thread-studio-standalone` (BFF → hub) — o
 * "Compartilhar" do ESTÚDIO COMPLETO (produto vendável, SEM aula): não há
 * `lessonId`/`blockId` nem payload autoritativo do members, então `title` e
 * `description` vêm da criança (sanitizados). A elegibilidade é "a CONTA possui o
 * produto do Estúdio" (re-validada no hub via `members.checkAccess`); nome do autor
 * do header confiável; `clientIdempotencyKey` dedup-a duplo-clique (republicar = post novo).
 */
export const ShowcaseThreadStudioStandaloneBody = t.Object({
  spaceSlug: SLUG,
  title: t.String({ minLength: 1, maxLength: 200 }),
  description: t.String({ minLength: 1, maxLength: 280 }),
  coverImageUrl: t.Optional(
    t.Union([t.String({ maxLength: 2000, pattern: HTTPS_URL_PATTERN }), t.Null()]),
  ),
  playId: UUID,
  clientIdempotencyKey: UUID,
  // Tag do DESAFIO do mês — string FROUXA de propósito: a validação (formato +
  // mês corrente + posse Clube+Estúdio) é do service, com drop SILENCIOSO da tag
  // (um 400 aqui falharia a publicação da criança por causa do desafio).
  challengeKey: t.Optional(t.Union([t.String({ maxLength: 16 }), t.Null()])),
})

/** Paginação por cursor opaco (listagem de tópicos). */
export const ThreadListQuery = t.Object({
  cursor: t.Optional(t.String({ maxLength: 500 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  /** Prateleira do desafio mensal: só posts com este `challenge_key` (`m:YYYY-MM`). */
  challenge: t.Optional(t.String({ pattern: '^m:\\d{4}-\\d{2}$' })),
})

/** Query do resolve do /jogar: `count=1` = conta a jogada (hit fundido no UPDATE). */
export const PlayResolveQuery = t.Object({
  count: t.Optional(t.Literal('1')),
})

/**
 * `POST /hub/internal/showcase-by-authors` (members→hub S2S, HMAC — report dos
 * pais). `authorIds` = perfis dos filhos (o members garante a posse da conta).
 */
export const ShowcaseByAuthorsBody = t.Object({
  authorIds: t.Array(UUID, { minItems: 1, maxItems: 50 }),
  from: t.String({ maxLength: 40 }),
  to: t.String({ maxLength: 40 }),
})

/**
 * `POST /hub/internal/play-check` (members→hub S2S, HMAC — validação do REMIX):
 * o playId existe/está visível no Mural? Devolve também o `authorId` (perfil) p/ o
 * members recusar self-remix. Anti-farm do marco `studio_remix`.
 */
export const PlayCheckBody = t.Object({
  playId: UUID,
})

/** Paginação por cursor opaco (comentários, cronológico). */
export const CommentListQuery = t.Object({
  after: t.Optional(t.String({ maxLength: 500 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
})

// ── Moderação ────────────────────────────────────────────────────────────────
const REPORT_STATUS = t.Union([t.Literal('open'), t.Literal('resolved'), t.Literal('dismissed')])

/** Denúncia do aluno (motivo livre). */
export const ReportBody = t.Object({ reason: t.String({ minLength: 1, maxLength: 1000 }) })

export const ResolveReportBody = t.Object({
  action: t.Union([t.Literal('resolve'), t.Literal('dismiss')]),
})

/** Fila de aprovação (admin). */
export const PendingQuery = t.Object({
  spaceId: t.Optional(UUID),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const ReportsQuery = t.Object({
  spaceId: t.Optional(UUID),
  status: t.Optional(REPORT_STATUS),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const SpaceIdQuery = t.Object({ spaceId: UUID })

/** Query da purga de usuário: `?profileIds=<csv de uuids>` (perfis kids da conta). */
export const PurgeUserDataQuery = t.Object({
  profileIds: t.Optional(t.String({ maxLength: 2000 })),
})

const UUID_RE = new RegExp(UUID_PATTERN)
/** Quebra o CSV de `profileIds` em uuids válidos (descarta lixo; teto de 50). */
export function parseProfileIds(csv: string | undefined): string[] {
  if (!csv) return []
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, 50)
}

/** Silenciar/banir um usuário num servidor. */
export const MuteBanBody = t.Object({
  userId: UUID,
  spaceId: UUID,
  channelId: t.Optional(t.Union([UUID, t.Null()])),
  expiresAt: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])),
  reason: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
})

/** Remover silenciamento/banimento (un-mute/un-ban). */
export const UnMuteBanBody = t.Object({ userId: UUID, spaceId: UUID })

// ── Reações ──────────────────────────────────────────────────────────────────
export const ReactBody = t.Object({ emoji: t.String({ minLength: 1, maxLength: 16 }) })
/** DELETE de reação: emoji vai no path (o cliente faz encodeURIComponent). */
export const EmojiParams = t.Object({ id: UUID, emoji: t.String({ minLength: 1, maxLength: 64 }) })

// ── Webhooks (entrada via gateway) ───────────────────────────────────────────
/**
 * Concessão/revogação de acesso (funil/members → gateway → hub): invalida o
 * micro-cache de acesso a cursos do usuário. Só o `userId` importa aqui; demais
 * campos do payload são ignorados (contrato tolerante).
 */
export const GrantWebhookBody = t.Object(
  {
    userId: UUID,
    event: t.Optional(t.String({ maxLength: 100 })),
  },
  { additionalProperties: true },
)

// ── Anexos ───────────────────────────────────────────────────────────────────
const ATTACHMENT_KIND = t.Union([
  t.Literal('image'),
  t.Literal('pdf'),
  t.Literal('document'),
  t.Literal('audio'),
  t.Literal('video'),
])
/**
 * Registro de metadado de anexo (o BFF já mintou o presigned PUT + gerou a key).
 * O hub valida tipo/tamanho e devolve o id para vincular ao post.
 */
export const RegisterAttachmentBody = t.Object({
  kind: ATTACHMENT_KIND,
  mime: t.String({ minLength: 1, maxLength: 255 }),
  sizeBytes: t.Integer({ minimum: 1, maximum: 1_000_000_000 }),
  originalName: t.String({ minLength: 1, maxLength: 300 }),
  // `r2ugc:<key>` — opaco para o hub; nunca vai ao browser.
  storageRef: t.String({ minLength: 1, maxLength: 1024 }),
})
