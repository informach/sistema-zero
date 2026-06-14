import { t } from 'elysia'

// Ids que vão a colunas `uuid` validam o FORMATO na borda — um id lixo chegaria
// ao Postgres como 22P02 e viraria 500 INTERNAL_ERROR (padrão do catalog).
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const UUID = t.String({ pattern: UUID_PATTERN })

// ── Params de rota com ids uuid (Elysia valida ANTES do handler → 400) ──────
export const IdParams = t.Object({ id: UUID })
export const UserIdParams = t.Object({ userId: UUID })
export const CourseIdParams = t.Object({ courseId: UUID })
export const ModuleIdParams = t.Object({ moduleId: UUID })
export const LessonIdParams = t.Object({ lessonId: UUID })
export const SlugLessonParams = t.Object({ slug: t.String(), lessonId: UUID })
export const AttachmentResolveParams = t.Object({
  slug: t.String(),
  lessonId: UUID,
  attachmentId: UUID,
})
export const EbookResolveParams = t.Object({ slug: t.String(), lessonId: UUID, blockId: UUID })
export const QuizAttemptParams = t.Object({ lessonId: UUID, blockId: UUID })

// Audiência da vitrine (plataforma): `adult` (community) | `kids` (community-kids).
const AUDIENCE = t.Union([t.Literal('adult'), t.Literal('kids')])

/**
 * Query das LISTAGENS do aluno (`GET /members/courses` e `/catalog`): qual vitrine
 * o BFF chamador quer. Ausente → `adult` (zero regressão no community atual);
 * valor inválido → 400 na borda.
 */
export const AudienceQuery = t.Object({ audience: t.Optional(AUDIENCE) })

/**
 * Query de `GET /members/gamification/me`: a gamificação é SEGREGADA por
 * vitrine — `?audience=adult|kids` escolhe o perfil (ausente → `adult`, como
 * nas listagens); `?ranking=true` pede TAMBÉM a colocação no ranking de XP da
 * MESMA vitrine (cálculo extra — os widgets omitem).
 */
export const GamificationQuery = t.Object({
  audience: t.Optional(AUDIENCE),
  ranking: t.Optional(t.Literal('true')),
})

/**
 * Corpo de `POST /members/webhooks/grant` — concessão de acesso (funil → gateway →
 * members). `subscription` presente = acesso por assinatura; ausente = compra única.
 * `userId` vem do auth (ensure-buyer) e é sempre uuid — formato validado na borda.
 */
export const GrantWebhookBody = t.Object({
  userId: UUID,
  offerRef: t.String({ minLength: 1, maxLength: 200 }),
  paymentId: t.String({ minLength: 1, maxLength: 100 }),
  paidAt: t.Optional(t.String({ maxLength: 40 })),
  subscription: t.Optional(
    t.Object({
      subscriptionId: t.String({ minLength: 1, maxLength: 100 }),
      intervalMonths: t.Union([t.Integer({ minimum: 1, maximum: 120 }), t.Null()]),
    }),
  ),
})

/**
 * Corpo de `POST /members/internal/access-check` (S2S — consumido pela comunidade):
 * resolve, num passo, quais `courseRefs` o usuário acessa + se tem chave-mestra.
 */
export const AccessCheckBody = t.Object({
  userId: UUID,
  courseRefs: t.Array(t.String({ minLength: 1, maxLength: 200 }), { maxItems: 200 }),
})

/** Corpo de `POST /members/webhooks/subscription` — ciclo de vida da assinatura. */
export const SubscriptionWebhookBody = t.Object({
  event: t.Union([t.Literal('canceled'), t.Literal('expired')]),
  subscriptionId: t.String({ minLength: 1, maxLength: 100 }),
})

/** Corpo de `PUT /members/courses/:slug/lessons/:lessonId/position` (throttled no client). */
export const VideoPositionBody = t.Object({
  positionSeconds: t.Integer({ minimum: 0, maximum: 100_000 }),
})

/** Nota do curso: 1–5 em passos de 0.5 (a rota converte ×2 → `ratingHalf`). */
const RATING_VALUE = t.Union([
  t.Literal(1),
  t.Literal(1.5),
  t.Literal(2),
  t.Literal(2.5),
  t.Literal(3),
  t.Literal(3.5),
  t.Literal(4),
  t.Literal(4.5),
  t.Literal(5),
])

const FEEDBACK_ANSWER = t.Union([t.Literal('yes'), t.Literal('no'), t.Literal('unsure')])

/**
 * Corpo de `PUT /members/courses/:slug/rating` — cada passo do fluxo manda o
 * estado ACUMULADO (a nota está sempre presente; comment/feedback são opcionais).
 * Chaves de feedback espelham `COURSE_FEEDBACK_QUESTION_KEYS` (domain/rating).
 * Chave desconhecida é REMOVIDA pelo `normalize` default do Elysia (exact
 * mirror, não rejeita); VALOR inválido continua dando 400.
 */
export const CourseRatingBody = t.Object({
  rating: RATING_VALUE,
  comment: t.Optional(t.Union([t.String({ maxLength: 5000 }), t.Null()])),
  feedbackAnswers: t.Optional(
    t.Union([
      t.Object(
        {
          importantInfo: t.Optional(FEEDBACK_ANSWER),
          clearExplanations: t.Optional(FEEDBACK_ANSWER),
          engagingInstructor: t.Optional(FEEDBACK_ANSWER),
          enoughPractice: t.Optional(FEEDBACK_ANSWER),
          meetsExpectations: t.Optional(FEEDBACK_ANSWER),
          knowledgeable: t.Optional(FEEDBACK_ANSWER),
        },
        { additionalProperties: false },
      ),
      t.Null(),
    ]),
  ),
})

/**
 * Corpo de `POST /members/lessons/:lessonId/blocks/:blockId/quiz-attempts`:
 * questionId → choiceIds marcados. Score é calculado NO SERVIDOR.
 */
export const QuizAttemptBody = t.Object({
  answers: t.Record(
    t.String({ minLength: 1, maxLength: 64 }),
    t.Array(t.String({ minLength: 1, maxLength: 64 }), { maxItems: 20 }),
    { maxProperties: 100 },
  ),
})

// ── Admin (painel `@sistemazero/admin`) ─────────────────────────────────────

const ENTITLEMENT_STATUS = t.Union([
  t.Literal('active'),
  t.Literal('revoked'),
  t.Literal('expired'),
  t.Literal('pending'),
])

/** Query de `GET /members/admin/members`. `t.Numeric` coage a string da query. */
export const ListMembersQuery = t.Object({
  status: t.Optional(ENTITLEMENT_STATUS),
  courseRef: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

// `userId` do grant manual vai à coluna uuid `entitlements.user_id`.
const USER_ID = UUID
const EXPIRES_AT = t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()]))

/**
 * Corpo de `POST /members/admin/entitlements` — concessão manual. União discriminada
 * por `mode`: `offer` (resolve a oferta no catálogo), `course` (direto por curso) ou
 * `all_courses` (chave-mestra — todos os cursos, atuais e futuros).
 */
export const GrantEntitlementBody = t.Union([
  t.Object({
    mode: t.Literal('offer'),
    userId: USER_ID,
    offerRef: t.String({ minLength: 1, maxLength: 200 }),
    expiresAt: EXPIRES_AT,
  }),
  t.Object({
    mode: t.Literal('course'),
    userId: USER_ID,
    courseRef: t.String({ minLength: 1, maxLength: 200 }),
    expiresAt: EXPIRES_AT,
  }),
  t.Object({
    mode: t.Literal('all_courses'),
    userId: USER_ID,
    expiresAt: EXPIRES_AT,
  }),
])

/** Corpo de `PATCH /members/admin/entitlements/:id` — revogar/expirar/estender. */
export const ManageEntitlementBody = t.Object({
  action: t.Union([t.Literal('revoke'), t.Literal('expire'), t.Literal('extend')]),
  expiresAt: t.Optional(t.String({ maxLength: 40 })),
})

// ── Autoria de conteúdo (cursos/módulos/aulas/blocos/anexos) ─────────────────

const COURSE_STATUS = t.Union([t.Literal('draft'), t.Literal('published'), t.Literal('archived')])
const SLUG = t.String({ minLength: 1, maxLength: 200, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
const TITLE = t.String({ minLength: 1, maxLength: 300 })
const NULLABLE_TEXT = t.Optional(t.Union([t.String({ maxLength: 20_000 }), t.Null()]))
// URLs escritas pelo admin exigem esquema http(s) — sem isto um `javascript:`
// chegaria intacto ao browser do aluno via views member-facing (o painel já
// valida; aqui é defesa em profundidade na borda do serviço).
const HTTP_URL_PATTERN = '^https?://'
// Mídia que pode viver no bucket R2 PRIVADO: URL http(s) OU `r2priv:<key>`.
const MEDIA_REF_PATTERN = '^(?:https?://|r2priv:).'
const NULLABLE_URL = t.Optional(
  t.Union([t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN }), t.Null()]),
)

/** Corpo de `POST/PATCH /members/admin/courses[/:id]`. */
export const CourseBody = t.Object({
  slug: SLUG,
  title: TITLE,
  subtitle: NULLABLE_TEXT,
  description: NULLABLE_TEXT,
  coverImageUrl: NULLABLE_URL,
  // Página de vendas (funil): vira `metadata.salesPageUrl` — é para onde o
  // cadeado do catálogo "Todos os cursos" leva quem não tem acesso.
  salesPageUrl: NULLABLE_URL,
  status: COURSE_STATUS,
  // Plataforma do curso. AUSENTE: create → `adult`; update → PRESERVA a atual
  // (build antigo do admin sem o campo não rebaixa curso kids em silêncio).
  audience: t.Optional(t.Union([AUDIENCE, t.Null()])),
})

/** Query de `GET /members/admin/courses`. */
export const ListCoursesQuery = t.Object({
  q: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  status: t.Optional(COURSE_STATUS),
  audience: t.Optional(AUDIENCE),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const ModuleBody = t.Object({ title: TITLE, summary: NULLABLE_TEXT })

export const LessonBody = t.Object({
  slug: SLUG,
  title: TITLE,
  estimatedMinutes: t.Optional(t.Union([t.Integer({ minimum: 0, maximum: 100_000 }), t.Null()])),
  /** Ausente → `false` (aula nova nasce RASCUNHO; o admin publica quando pronta). */
  isPublished: t.Optional(t.Boolean()),
})

export const AttachmentBody = t.Object({
  label: t.String({ minLength: 1, maxLength: 200 }),
  // `r2priv:<key>` (bucket privado, caminho padrão) ou URL http(s) externa/legada.
  url: t.String({ minLength: 1, maxLength: 2000, pattern: MEDIA_REF_PATTERN }),
  fileType: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  sizeBytes: t.Optional(t.Union([t.Integer({ minimum: 0 }), t.Null()])),
})

/** Reordenação: ids na nova ordem (devem ser exatamente os filhos atuais). */
export const ReorderBody = t.Object({
  orderedIds: t.Array(t.String({ minLength: 1, maxLength: 64 }), { maxItems: 1000 }),
})

// Conteúdo do bloco: união discriminada por `kind` (espelha domain/course/lesson-block.ts).
const RichTextBlockSchema = t.Object({
  kind: t.Literal('rich_text'),
  html: t.Optional(t.String({ maxLength: 200_000 })),
  markdown: t.Optional(t.String({ maxLength: 200_000 })),
  codeLanguageHints: t.Optional(t.Array(t.String({ maxLength: 40 }))),
})
const VideoBlockSchema = t.Object({
  kind: t.Literal('video'),
  provider: t.Union([
    t.Literal('mux'),
    t.Literal('youtube'),
    t.Literal('vimeo'),
    t.Literal('file'),
  ]),
  src: t.String({ minLength: 1, maxLength: 2000, pattern: HTTP_URL_PATTERN }),
  posterUrl: t.Optional(t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN })),
  durationSeconds: t.Optional(t.Number({ minimum: 0 })),
  captions: t.Optional(
    t.Array(
      t.Object({
        lang: t.String({ maxLength: 20 }),
        url: t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN }),
      }),
    ),
  ),
})
const ImageBlockSchema = t.Object({
  kind: t.Literal('image'),
  url: t.String({ minLength: 1, maxLength: 2000, pattern: HTTP_URL_PATTERN }),
  alt: t.Optional(t.String({ maxLength: 500 })),
  caption: t.Optional(t.String({ maxLength: 500 })),
})
const AudioBlockSchema = t.Object({
  kind: t.Literal('audio'),
  url: t.String({ minLength: 1, maxLength: 2000, pattern: HTTP_URL_PATTERN }),
  durationSeconds: t.Optional(t.Number({ minimum: 0 })),
})
const QuizBlockSchema = t.Object({
  kind: t.Literal('quiz'),
  questions: t.Array(
    t.Object({
      id: t.String({ minLength: 1, maxLength: 64 }),
      // prompt/label/explanation são MARKDOWN (formatação rica + imagens `![](url)`
      // do editor TipTap do admin) — limites folgados p/ caber URLs de imagem do R2.
      prompt: t.String({ minLength: 1, maxLength: 5000 }),
      choices: t.Array(
        t.Object({
          id: t.String({ minLength: 1, maxLength: 64 }),
          label: t.String({ minLength: 1, maxLength: 2000 }),
        }),
      ),
      correctChoiceIds: t.Array(t.String({ maxLength: 64 })),
      explanation: t.Optional(t.String({ maxLength: 5000 })),
    }),
  ),
  // Nota de corte é % inteira (o score do aluno é inteiro 0–100; 99.5 só "passaria"
  // com 100 e confundiria a autoria).
  passingScore: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
})
// Autoria v3: interativo é SEMPRE iframe sandbox com HTML (embedType/src/height
// viraram legado — só existem em blocos antigos, nunca em escrita nova).
// `sandbox` aceita SÓ tokens seguros: `allow-same-origin` faria o srcDoc rodar na
// ORIGIN do community (HTML do bloco vira XSS no app do aluno); top-navigation e
// popups-to-escape-sandbox furam o isolamento. Allowlist > blocklist.
const SAFE_SANDBOX_TOKEN =
  'allow-(?:scripts|forms|modals|popups|pointer-lock|downloads|presentation|orientation-lock)'
const EmbedBlockSchema = t.Object({
  kind: t.Literal('embed'),
  html: t.String({ minLength: 1, maxLength: 200_000 }),
  sandbox: t.Optional(
    t.String({
      maxLength: 200,
      pattern: `^${SAFE_SANDBOX_TOKEN}(?: ${SAFE_SANDBOX_TOKEN})*$`,
    }),
  ),
})
/** PDF no bucket R2 privado (`r2priv:<key>`) — vira livro 3D no front do aluno. */
const EbookBlockSchema = t.Object({
  kind: t.Literal('ebook'),
  url: t.String({ minLength: 1, maxLength: 2000, pattern: MEDIA_REF_PATTERN }),
  title: t.Optional(t.String({ maxLength: 300 })),
})

const StudioLevelSchema = t.Union([
  t.Literal('iniciante'),
  t.Literal('intermediario'),
  t.Literal('avancado'),
])
const StudioModeSchema = t.Union([t.Literal('blocks'), t.Literal('bridge'), t.Literal('code')])
/**
 * Snapshot `Project` do Estúdio (autoria do admin = `initialProject`; entrega do
 * aluno = corpo do submit). Validado de forma DEFENSIVA — só exigimos `name`+`files`,
 * o resto passa (`additionalProperties`): o @sistemazero/studio sanitiza o shape inteiro
 * na autoria (export) e DE NOVO no aluno (`sanitizeProjectForHost`). O TETO DE TAMANHO
 * (anti-DoS no jsonb) é aplicado no service — TypeBox não limita bytes do agregado.
 */
const StudioProjectSchema = t.Object(
  {
    name: t.String({ maxLength: 200 }),
    files: t.Record(t.String({ maxLength: 200 }), t.String({ maxLength: 2_000_000 })),
  },
  { additionalProperties: true },
)
/** Bloco Estúdio: editor pré-configurado embutido na aula (ver domain/course/lesson-block.ts). */
const StudioBlockSchema = t.Object({
  kind: t.Literal('studio'),
  initialProject: StudioProjectSchema,
  level: t.Optional(StudioLevelSchema),
  allowBlocks: t.Optional(t.Array(t.String({ maxLength: 80 }), { maxItems: 500 })),
  allowCategories: t.Optional(t.Array(t.String({ maxLength: 80 }), { maxItems: 100 })),
  allowedModes: t.Optional(t.Array(StudioModeSchema, { maxItems: 3 })),
  allowLevelReveal: t.Optional(t.Boolean()),
})

export const LessonBlockContentSchema = t.Union([
  RichTextBlockSchema,
  VideoBlockSchema,
  ImageBlockSchema,
  AudioBlockSchema,
  QuizBlockSchema,
  EmbedBlockSchema,
  EbookBlockSchema,
  StudioBlockSchema,
])

/** Params da rota de entrega do Estúdio (aluno) — espelha o quiz-attempts. */
export const StudioSubmissionParams = t.Object({ lessonId: UUID, blockId: UUID })
/** Params da rota admin de UMA entrega (por bloco + aluno). `id` = blockId. */
export const AdminStudioSubmissionParams = t.Object({ id: UUID, userId: UUID })

/** Corpo de `POST /members/lessons/:lessonId/blocks/:blockId/studio-submission` (aluno). */
export const StudioSubmissionBody = t.Object({ project: StudioProjectSchema })

/** Corpo de `POST/PATCH /members/admin/...blocks`. */
export const BlockBody = t.Object({ content: LessonBlockContentSchema })
