import { ZAPPY_SOURCE_CONTENT_MAX_BYTES } from '@sistemazero/core/zappy'
import { Elysia, t } from 'elysia'
import type {
  AttachmentAdminService,
  BlockAdminService,
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from '../../../application/content-admin/content-admin.service'
import type { StudioSubmissionsAdminService } from '../../../application/studio-submissions-admin/studio-submissions-admin.service'
import type { ZappyHistoryService } from '../../../application/zappy/zappy-history.service'
import type { ZappyKnowledgeService } from '../../../application/zappy/zappy-knowledge.service'
import type { CourseStatus } from '../../../domain/course/course'
import type { LessonBlockContent } from '../../../domain/course/lesson-block'
import { monthBoundsUtc } from '../../../domain/gamification/missions'
import type {
  AttachmentFields,
  CourseFields,
  LessonFields,
  ModuleFields,
} from '../../../domain/ports/content-admin-repository.port'
import { assertInternalCaller, requireAdmin } from '../auth'
import {
  AdminStudioSubmissionParams,
  AttachmentBody,
  BlockBody,
  CloneCourseBody,
  CourseBody,
  CourseIdParams,
  CourseUpdateBody,
  IdParams,
  LessonBody,
  LessonIdParams,
  ListCoursesQuery,
  ModuleBody,
  ModuleIdParams,
  parseUserIds,
  ReorderBody,
  ReviewSubmissionBody,
  ReviewSubmissionParams,
} from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface ContentRoutesDeps {
  requireAdminEnabled: boolean
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
  courses: CourseAdminService
  modules: ModuleAdminService
  lessons: LessonAdminService
  blocks: BlockAdminService
  attachments: AttachmentAdminService
  studioSubmissions: StudioSubmissionsAdminService
  zappyKnowledge?: ZappyKnowledgeService
  zappyHistory?: ZappyHistoryService
}

type CourseInput = typeof CourseBody.static
type CourseUpdateInput = typeof CourseUpdateBody.static
type ModuleInput = typeof ModuleBody.static
type LessonInput = typeof LessonBody.static
type AttachmentInput = typeof AttachmentBody.static

const courseFields = (b: CourseInput | CourseUpdateInput): CourseFields => ({
  version: 'version' in b ? b.version : undefined,
  slug: b.slug,
  title: b.title,
  subtitle: b.subtitle ?? null,
  description: b.description ?? null,
  coverImageUrl: b.coverImageUrl ?? null,
  salesPageUrl: b.salesPageUrl?.trim() ? b.salesPageUrl.trim() : null,
  status: b.status as CourseStatus,
  // `null` = não informado (create → adult; update → preserva — ver CourseFields).
  audience: b.audience ?? null,
  // `null` = não informado (create → true; update → preserva). `false` é mantido.
  sequentialLock: b.sequentialLock ?? null,
  // `null` = não informado (create → iniciante; update → preserva).
  level: b.level ?? null,
  // `null` = não informado (create → 2d; update → preserva).
  track: b.track ?? null,
  // Aqui `undefined` e `null` são diferentes: ausente preserva no PATCH;
  // null explícito remove o curso da carreira.
  careerSlot: Object.hasOwn(b, 'careerSlot') ? b.careerSlot : undefined,
  // Currículo do Estúdio — MESMA distinção do `careerSlot`: ausente PRESERVA (build antigo
  // do admin não apaga o que a professora liberou), `null`/`[]` limpam de propósito.
  // ⚠️ Estar no DTO NÃO basta: este mapeador é a fronteira real, e um campo que não é
  // copiado aqui é validado e DESCARTADO em silêncio — o currículo nunca chegaria ao banco.
  studioUnlockBlocks: Object.hasOwn(b, 'studioUnlockBlocks')
    ? (b.studioUnlockBlocks ?? null)
    : undefined,
})
const moduleFields = (b: ModuleInput): ModuleFields => ({
  title: b.title,
  summary: b.summary ?? null,
})
const lessonFields = (b: LessonInput): LessonFields => ({
  slug: b.slug,
  title: b.title,
  estimatedMinutes: b.estimatedMinutes ?? null,
  isPublished: b.isPublished ?? false,
})
const attachmentFields = (b: AttachmentInput): AttachmentFields => ({
  label: b.label,
  url: b.url,
  fileType: b.fileType ?? null,
  sizeBytes: b.sizeBytes ?? null,
})

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}

// Fila GLOBAL de entregas (Sala do Professor). Local (não em dtos.ts): consumido
// só por esta rota. `courseId` uuid validado na borda (id lixo → 400, nunca 22P02;
// mesmo pattern do `UUID` de dtos.ts).
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const GlobalStudioSubmissionsQuery = t.Object({
  courseId: t.Optional(t.String({ pattern: UUID_PATTERN })),
  audience: t.Optional(t.Union([t.Literal('adult'), t.Literal('kids')])),
  status: t.Optional(t.Union([t.Literal('pending'), t.Literal('answered'), t.Literal('reviewed')])),
  // CSV de userIds/accountIds (filtro por aluno, 24/07) — uuids válidos, teto 20.
  userIds: t.Optional(t.String({ maxLength: 800 })),
  limit: t.Optional(t.Numeric({ minimum: 1 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
})

/**
 * Rotas ADMIN de AUTORIA de conteúdo (cursos → módulos → aulas → blocos/anexos).
 * Mesmo gating do resto do admin (`requireAdmin` + `x-internal-token`; RBAC real
 * no gateway). Prefixo `/members/admin` (coexiste com `admin.routes` de gestão de
 * acesso — paths distintos).
 */
export function contentRoutes(deps: ContentRoutesDeps) {
  const guard = (headers: Record<string, string | undefined>) =>
    requireAdmin(headers, deps.requireAdminEnabled)

  return (
    new Elysia({ prefix: '/members/admin' })
      .onTransform(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      .get('/zappy/knowledge/report', ({ headers }) => {
        guard(headers)
        if (!deps.zappyKnowledge) throw new Error('Base de conhecimento do Zappy não configurada')
        return deps.zappyKnowledge.report()
      })
      .get(
        '/zappy/metrics',
        ({ headers, query }) => {
          guard(headers)
          if (!deps.zappyHistory) throw new Error('Zappy não configurado')
          const bounds = monthBoundsUtc(query.month)
          return deps.zappyHistory.metrics(bounds.from, bounds.to)
        },
        { query: t.Object({ month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }) }) },
      )
      // Perguntas que FALHARAM (reprovadas/erro/👎) — SEM userId/projectId: a
      // listagem mostra só o texto (já PII-redigido na gravação), nunca quem.
      .get(
        '/zappy/questions',
        ({ headers, query }) => {
          guard(headers)
          if (!deps.zappyHistory) throw new Error('Zappy não configurado')
          const bounds = monthBoundsUtc(query.month)
          return deps.zappyHistory.failedQuestions(
            bounds.from,
            bounds.to,
            query.filter ?? 'all',
            query.limit ?? 50,
            query.offset ?? 0,
          )
        },
        {
          query: t.Object({
            month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
            filter: t.Optional(
              t.Union([
                t.Literal('all'),
                t.Literal('rejected'),
                t.Literal('error'),
                t.Literal('not-useful'),
              ]),
            ),
            limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            offset: t.Optional(t.Numeric({ minimum: 0, maximum: 100000 })),
          }),
        },
      )
      .post(
        '/zappy/knowledge/backfill',
        ({ headers, body }) => {
          guard(headers)
          if (!deps.zappyKnowledge) throw new Error('Base de conhecimento do Zappy não configurada')
          return deps.zappyKnowledge.backfill(body)
        },
        {
          body: t.Object({
            cursor: t.Optional(t.String({ pattern: UUID_PATTERN })),
            limit: t.Optional(t.Numeric({ minimum: 1, maximum: 25 })),
          }),
        },
      )
      .post(
        '/zappy/knowledge/sources',
        ({ headers, body }) => {
          guard(headers)
          if (!deps.zappyKnowledge) throw new Error('Base de conhecimento do Zappy não configurada')
          return deps.zappyKnowledge.sync(body)
        },
        {
          body: t.Object({
            lessonId: t.String({ pattern: UUID_PATTERN }),
            sourceType: t.Union([
              t.Literal('video-vtt'),
              t.Literal('rich-text'),
              t.Literal('student-notebook'),
            ]),
            sourceRef: t.String({ minLength: 1, maxLength: 500 }),
            expectedBlockRevision: t.String({ minLength: 1, maxLength: 64 }),
            content: t.Optional(t.String({ maxLength: ZAPPY_SOURCE_CONTENT_MAX_BYTES })),
            error: t.Optional(t.String({ maxLength: 2_000 })),
          }),
        },
      )
      .delete(
        '/zappy/knowledge/sources/:sourceRef',
        async ({ headers, params }) => {
          guard(headers)
          if (!deps.zappyKnowledge) throw new Error('Base de conhecimento do Zappy não configurada')
          await deps.zappyKnowledge.deleteSource(params.sourceRef)
          return { ok: true }
        },
        { params: t.Object({ sourceRef: t.String({ minLength: 1, maxLength: 500 }) }) },
      )
      // ── Cursos ──
      .get(
        '/courses',
        async ({ query, headers }) => {
          guard(headers)
          return deps.courses.list({
            q: query.q,
            status: query.status as CourseStatus | undefined,
            audience: query.audience,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListCoursesQuery },
      )
      .post(
        '/courses',
        async ({ body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.courses.create(courseFields(body))
        },
        { body: CourseBody },
      )
      .get(
        '/courses/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.courses.get(params.id)
        },
        { params: IdParams },
      )
      // CLONE p/ a outra plataforma (fork — edições não sincronizam): árvore
      // inteira numa transação; nasce draft, fora da carreira, com clonedFrom.
      // ⚠️ `:courseId` (não `:id`): o Elysia exige o MESMO nome de param quando o
      // segmento tem FILHOS (`/courses/:courseId/modules` já existe).
      .post(
        '/courses/:courseId/clone',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.courses.clone(params.courseId, body)
        },
        { params: CourseIdParams, body: CloneCourseBody },
      )
      .patch(
        '/courses/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.courses.update(params.id, courseFields(body))
        },
        { body: CourseUpdateBody, params: IdParams },
      )
      .delete(
        '/courses/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.courses.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Módulos ──
      .post(
        '/courses/:courseId/modules',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.modules.create(params.courseId, moduleFields(body))
        },
        { body: ModuleBody, params: CourseIdParams },
      )
      .post(
        '/courses/:courseId/modules/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.modules.reorder(params.courseId, body.orderedIds)
        },
        { body: ReorderBody, params: CourseIdParams },
      )
      .patch(
        '/modules/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.modules.update(params.id, moduleFields(body))
        },
        { body: ModuleBody, params: IdParams },
      )
      .delete(
        '/modules/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.modules.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Aulas ──
      .post(
        '/modules/:moduleId/lessons',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.lessons.create(params.moduleId, lessonFields(body))
        },
        { body: LessonBody, params: ModuleIdParams },
      )
      .post(
        '/modules/:moduleId/lessons/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.lessons.reorder(params.moduleId, body.orderedIds)
        },
        { body: ReorderBody, params: ModuleIdParams },
      )
      .get(
        '/lessons/:id/content',
        async ({ params, headers }) => {
          guard(headers)
          return deps.lessons.getContent(params.id)
        },
        { params: IdParams },
      )
      .patch(
        '/lessons/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.lessons.update(params.id, lessonFields(body))
        },
        { body: LessonBody, params: IdParams },
      )
      .delete(
        '/lessons/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.lessons.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Blocos ──
      .post(
        '/lessons/:lessonId/blocks',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.blocks.create(params.lessonId, body.content as LessonBlockContent)
        },
        { body: BlockBody, params: LessonIdParams },
      )
      .post(
        '/lessons/:lessonId/blocks/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.blocks.reorder(params.lessonId, body.orderedIds)
        },
        { body: ReorderBody, params: LessonIdParams },
      )
      .patch(
        '/blocks/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.blocks.update(params.id, body.content as LessonBlockContent)
        },
        { body: BlockBody, params: IdParams },
      )
      .delete(
        '/blocks/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.blocks.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Anexos ──
      .post(
        '/lessons/:lessonId/attachments',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.attachments.create(params.lessonId, attachmentFields(body))
        },
        { body: AttachmentBody, params: LessonIdParams },
      )
      .post(
        '/lessons/:lessonId/attachments/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.attachments.reorder(params.lessonId, body.orderedIds)
        },
        { body: ReorderBody, params: LessonIdParams },
      )
      .patch(
        '/attachments/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.attachments.update(params.id, attachmentFields(body))
        },
        { body: AttachmentBody, params: IdParams },
      )
      .delete(
        '/attachments/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.attachments.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Entregas do Estúdio (acompanhamento do professor) ──
      // `/blocks/:id/...` reusa o param `:id` das rotas de bloco (sem reintroduzir
      // `:lessonId` aqui — colidiria com `/lessons/:id/...` no roteador). `id` = blockId.
      // Lista quem entregou + quando (nomes são hidratados no BFF do admin via auth).
      .get(
        '/blocks/:id/studio-submissions',
        async ({ params, headers }) => {
          guard(headers)
          return { submissions: await deps.studioSubmissions.list(params.id) }
        },
        { params: IdParams },
      )
      // Entrega de um aluno (projeto inteiro) — abrir no Estúdio embutido do admin.
      .get(
        '/blocks/:id/studio-submissions/:userId',
        async ({ params, headers }) => {
          guard(headers)
          return deps.studioSubmissions.getOne(params.userId, params.id)
        },
        { params: AdminStudioSubmissionParams },
      )
      // A versão ANTERIOR da entrega (backup do último reenvio) — rota dedicada
      // porque a resposta tem outra forma (score/results da linha são da versão
      // ATUAL) e o payload é pesado (não vai no detalhe). 404 sem reenvio.
      .get(
        '/blocks/:id/studio-submissions/:userId/previous',
        async ({ params, headers }) => {
          guard(headers)
          return deps.studioSubmissions.getPreviousVersion(params.userId, params.id)
        },
        { params: AdminStudioSubmissionParams },
      )
      // Entregas de TODAS as aulas do curso (aba "Entregas" por curso). Centraliza
      // o acompanhamento sem drilar aula→bloco; o detalhe reusa a rota por-bloco
      // acima (as linhas carregam `blockId` + `userId`). `id` = courseId.
      .get(
        '/courses/:id/studio-submissions',
        async ({ params, headers }) => {
          guard(headers)
          return { submissions: await deps.studioSubmissions.listByCourse(params.id) }
        },
        { params: IdParams },
      )
      // Fila GLOBAL de entregas (todos os cursos) — página "Entregas" da Sala do
      // Professor. Pendentes (sem resposta do professor após o último envio)
      // primeiro; filtros curso/vitrine/status; paginada com `total`. O detalhe
      // segue reusando a rota por-bloco (linhas carregam `blockId` + `userId`).
      .get(
        '/studio-submissions',
        async ({ query, headers }) => {
          guard(headers)
          return deps.studioSubmissions.listAll({
            courseId: query.courseId,
            audience: query.audience,
            status: query.status,
            userIds: parseUserIds(query.userIds),
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: GlobalStudioSubmissionsQuery },
      )
      // "Já conferi esta entrega": o único jeito de fechar uma entrega SEM recado
      // (a conversa só existe quando a criança escreve algo no envio, então não
      // havia o que responder). Não manda recado, não toca XP, não destrava aula:
      // só carimba. `reviewed: false` desfaz um clique errado.
      .post(
        '/studio-submissions/:blockId/:userId/review',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.studioSubmissions.markReviewed({
            userId: params.userId,
            blockId: params.blockId,
            reviewed: body.reviewed,
            staffId: headers['x-user-id'] ?? null,
          })
        },
        { params: ReviewSubmissionParams, body: ReviewSubmissionBody },
      )
      // Restaurar a versão anterior: TROCA atual↔anterior (reversível — 2× volta),
      // zera a correção e preserva o sticky/carimbo/recado. É o undo do professor
      // para o reenvio acidental do template por cima da entrega boa. 404 sem
      // versão anterior. ⚠️ `submitted_at` volta no tempo → a entrega pode sair
      // da fila de pendentes (as réguas comparam com `>= submitted_at`).
      .post(
        '/studio-submissions/:blockId/:userId/restore-previous',
        async ({ params, headers }) => {
          guard(headers)
          return deps.studioSubmissions.restorePrevious({
            userId: params.userId,
            blockId: params.blockId,
          })
        },
        { params: ReviewSubmissionParams },
      )
      // Contagem de entregas por bloco/aula do curso — alimenta o aviso "este
      // bloco/aula tem N entregas que serão apagadas junto" dos confirms de
      // exclusão do admin (as FKs em cascata apagam studio_submissions em
      // silêncio). `id` = courseId; módulo = soma das aulas dele no cliente.
      .get(
        '/courses/:id/submission-counts',
        async ({ params, headers }) => {
          guard(headers)
          return deps.studioSubmissions.countByCourse(params.id)
        },
        { params: IdParams },
      )
  )
}
