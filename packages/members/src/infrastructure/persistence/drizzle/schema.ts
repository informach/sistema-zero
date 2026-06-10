import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { LessonBlockContent } from '../../../domain/course/lesson-block'
import type { QuizAnswers } from '../../../domain/course/quiz'
import type { EntitlementSnapshot } from '../../../domain/entitlement/entitlement-snapshot'
import type { CourseFeedbackAnswers } from '../../../domain/rating/course-rating'

// Compartilha o MESMO Postgres do payments/auth/catalog/funnel, mas é dono do
// schema `members` (isolamento por `pgSchema`). Todo o DDL gerado fica em `members.*`.
// Sem FK cross-schema: `user_id`/`product_id`/`offer_id`/`subscription_id` são
// snapshots de outros serviços (auth/catalog/payments).
export const members = pgSchema('members')

export const courseStatusEnum = members.enum('course_status', ['draft', 'published', 'archived'])
// Audiência do curso: segmenta a VITRINE entre as plataformas (adulto = community,
// kids = community-kids). É coluna (não metadata) porque participa da AUTORIZAÇÃO:
// a chave-mestra `all_courses` cobre só cursos `adult` (ver CheckAccessService).
export const courseAudienceEnum = members.enum('course_audience', ['adult', 'kids'])
export const lessonBlockKindEnum = members.enum('lesson_block_kind', [
  'rich_text',
  'video',
  'image',
  'audio',
  'quiz',
  'embed',
  'ebook',
])
export const accessTypeEnum = members.enum('access_type', [
  'download',
  'course',
  'community',
  'external',
  'none',
  // Chave-mestra: 1 matrícula cobre TODOS os cursos publicados (atuais e futuros).
  'all_courses',
])
export const entitlementStatusEnum = members.enum('entitlement_status', [
  'active',
  'revoked',
  'expired',
  'pending',
])
export const entitlementSourceKindEnum = members.enum('entitlement_source_kind', [
  'payment',
  'subscription',
  'manual',
])

// ── Conteúdo (Course → Module → Lesson → Block/Attachment) ──────────────────
export const courses = members.table(
  'courses',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    status: courseStatusEnum('status').notNull().default('draft'),
    audience: courseAudienceEnum('audience').notNull().default('adult'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('courses_slug_uq').on(t.slug)],
)

export const modules = members.table(
  'modules',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('modules_course_idx').on(t.courseId, t.sortOrder)],
)

export const lessons = members.table(
  'lessons',
  {
    id: uuid('id').primaryKey(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    // Denormalizado p/ agregação de progresso (FK ao curso, mesmo schema).
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    estimatedMinutes: integer('estimated_minutes'),
    // Default true = backfill das aulas já em produção (continuam visíveis).
    // A API admin sempre manda o valor explícito (aula NOVA nasce rascunho).
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('lessons_course_slug_uq').on(t.courseId, t.slug),
    index('lessons_module_idx').on(t.moduleId, t.sortOrder),
  ],
)

export const lessonBlocks = members.table(
  'lesson_blocks',
  {
    id: uuid('id').primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    kind: lessonBlockKindEnum('kind').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    // União discriminada por `kind` (ver domain/course/lesson-block.ts).
    content: jsonb('content').$type<LessonBlockContent>().notNull(),
  },
  (t) => [index('lesson_blocks_lesson_idx').on(t.lessonId, t.sortOrder)],
)

export const lessonAttachments = members.table(
  'lesson_attachments',
  {
    id: uuid('id').primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    url: text('url').notNull(),
    fileType: text('file_type'),
    sizeBytes: integer('size_bytes'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('lesson_attachments_lesson_idx').on(t.lessonId, t.sortOrder)],
)

// ── Matrícula / Entitlement (visão materializada de acesso) ─────────────────
export const entitlements = members.table(
  'entitlements',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    userId: uuid('user_id').notNull(),
    productId: uuid('product_id').notNull(),
    productKind: text('product_kind').notNull(),
    accessType: accessTypeEnum('access_type').notNull(),
    courseRef: text('course_ref'),
    offerId: uuid('offer_id'),
    snapshot: jsonb('snapshot').$type<EntitlementSnapshot>().notNull(),
    status: entitlementStatusEnum('status').notNull().default('active'),
    sourceKind: entitlementSourceKindEnum('source_kind').notNull(),
    sourceId: text('source_id').notNull(),
    subscriptionId: text('subscription_id'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('entitlements_idem_uq').on(t.idempotencyKey),
    uniqueIndex('entitlements_user_product_source_uq').on(
      t.userId,
      t.productId,
      t.sourceKind,
      t.sourceId,
    ),
    index('entitlements_user_idx').on(t.userId),
    index('entitlements_user_courseref_idx').on(t.userId, t.courseRef),
    index('entitlements_subscription_idx').on(t.subscriptionId),
  ],
)

// ── Progresso (fato leve por aluno) ─────────────────────────────────────────
export const lessonCompletions = members.table(
  'lesson_completions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    lessonId: uuid('lesson_id').notNull(),
    courseId: uuid('course_id').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('lesson_completions_user_lesson_uq').on(t.userId, t.lessonId),
    index('lesson_completions_user_course_idx').on(t.userId, t.courseId),
  ],
)

// ── Tentativas de quiz (histórico; score calculado NO SERVIDOR) ─────────────
// Sem UNIQUE: cada submit é uma linha. O estado derivado (última nota, cooldown,
// já aprovou) é agregado por (user_id, block_id) ordenado por created_at.
export const quizAttempts = members.table(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    blockId: uuid('block_id')
      .notNull()
      .references(() => lessonBlocks.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    /** 0–100, inteiro. */
    score: integer('score').notNull(),
    passed: boolean('passed').notNull(),
    /** questionId → choiceIds marcados (auditoria/correção). */
    answers: jsonb('answers').$type<QuizAnswers>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('quiz_attempts_user_block_idx').on(t.userId, t.blockId, t.createdAt)],
)

// ── Posição de reprodução / última aula acessada (1 linha por aluno+aula) ───
// `positionSeconds` = retomar o vídeo de onde parou; `updatedAt` = last-accessed
// do curso (alimenta o "continuar de onde parou" no detalhe do curso).
export const lessonProgress = members.table(
  'lesson_progress',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    positionSeconds: integer('position_seconds').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('lesson_progress_user_lesson_uq').on(t.userId, t.lessonId),
    index('lesson_progress_user_course_updated_idx').on(t.userId, t.courseId, t.updatedAt),
  ],
)

// ── Classificação do curso pelo aluno (1 linha por aluno+curso, upsert) ─────
// `rating_half` = nota×2 (inteiro 2..10 → 1.0..5.0 em passos de 0.5) — evita
// float/numeric-string. Cada passo do fluxo da UI persiste o estado acumulado.
export const courseRatings = members.table(
  'course_ratings',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    ratingHalf: smallint('rating_half').notNull(),
    comment: text('comment'),
    feedbackAnswers: jsonb('feedback_answers').$type<CourseFeedbackAnswers>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('course_ratings_user_course_uq').on(t.userId, t.courseId)],
)

// ── Deduplicação de webhooks de entrada ─────────────────────────────────────
export const processedWebhooks = members.table(
  'processed_webhooks',
  {
    deliveryId: text('delivery_id').primaryKey(),
    eventName: text('event_name').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Cobre o prune da retenção (`processed_at < cutoff`) — sem ele cada ciclo
  // faria seq scan da tabela inteira no banco compartilhado.
  (t) => [index('processed_webhooks_processed_at_idx').on(t.processedAt)],
)

export const schema = {
  courses,
  modules,
  lessons,
  lessonBlocks,
  lessonAttachments,
  entitlements,
  lessonCompletions,
  lessonProgress,
  quizAttempts,
  courseRatings,
  processedWebhooks,
}

// Linha-tipo (importado por testes/seed se útil).
export type EntitlementRow = typeof entitlements.$inferSelect
export type CourseRow = typeof courses.$inferSelect
