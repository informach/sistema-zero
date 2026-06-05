import { t } from 'elysia'

/**
 * Corpo de `POST /members/webhooks/grant` — concessão de acesso (funil → gateway →
 * members). `subscription` presente = acesso por assinatura; ausente = compra única.
 */
export const GrantWebhookBody = t.Object({
  userId: t.String({ minLength: 1, maxLength: 64 }),
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

const USER_ID = t.String({ minLength: 1, maxLength: 64 })
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
const NULLABLE_URL = t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()]))

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
})

/** Query de `GET /members/admin/courses`. */
export const ListCoursesQuery = t.Object({
  q: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  status: t.Optional(COURSE_STATUS),
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
  url: t.String({ minLength: 1, maxLength: 2000 }),
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
  src: t.String({ minLength: 1, maxLength: 2000 }),
  posterUrl: t.Optional(t.String({ maxLength: 2000 })),
  durationSeconds: t.Optional(t.Number({ minimum: 0 })),
  captions: t.Optional(
    t.Array(t.Object({ lang: t.String({ maxLength: 20 }), url: t.String({ maxLength: 2000 }) })),
  ),
})
const ImageBlockSchema = t.Object({
  kind: t.Literal('image'),
  url: t.String({ minLength: 1, maxLength: 2000 }),
  alt: t.Optional(t.String({ maxLength: 500 })),
  caption: t.Optional(t.String({ maxLength: 500 })),
})
const AudioBlockSchema = t.Object({
  kind: t.Literal('audio'),
  url: t.String({ minLength: 1, maxLength: 2000 }),
  durationSeconds: t.Optional(t.Number({ minimum: 0 })),
})
const QuizBlockSchema = t.Object({
  kind: t.Literal('quiz'),
  questions: t.Array(
    t.Object({
      id: t.String({ minLength: 1, maxLength: 64 }),
      prompt: t.String({ minLength: 1, maxLength: 2000 }),
      choices: t.Array(
        t.Object({
          id: t.String({ minLength: 1, maxLength: 64 }),
          label: t.String({ minLength: 1, maxLength: 500 }),
        }),
      ),
      correctChoiceIds: t.Array(t.String({ maxLength: 64 })),
      explanation: t.Optional(t.String({ maxLength: 2000 })),
    }),
  ),
  passingScore: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
})
// Autoria v3: interativo é SEMPRE iframe sandbox com HTML (embedType/src/height
// viraram legado — só existem em blocos antigos, nunca em escrita nova).
const EmbedBlockSchema = t.Object({
  kind: t.Literal('embed'),
  html: t.String({ minLength: 1, maxLength: 200_000 }),
  sandbox: t.Optional(t.String({ maxLength: 200 })),
})
/** PDF no bucket R2 privado (`r2priv:<key>`) — vira livro 3D no front do aluno. */
const EbookBlockSchema = t.Object({
  kind: t.Literal('ebook'),
  url: t.String({ minLength: 1, maxLength: 2000 }),
  title: t.Optional(t.String({ maxLength: 300 })),
})

export const LessonBlockContentSchema = t.Union([
  RichTextBlockSchema,
  VideoBlockSchema,
  ImageBlockSchema,
  AudioBlockSchema,
  QuizBlockSchema,
  EmbedBlockSchema,
  EbookBlockSchema,
])

/** Corpo de `POST/PATCH /members/admin/...blocks`. */
export const BlockBody = t.Object({ content: LessonBlockContentSchema })
