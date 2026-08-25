import { randomUUID } from 'node:crypto'
import { and, asc, count, eq, inArray, ne, or, type SQL, sql } from 'drizzle-orm'
import type {
  Course,
  Lesson,
  LessonAttachment,
  LessonBlock,
  Module,
} from '../../../domain/course/course'
import { CareerSlotConflictError, DuplicateSlugError } from '../../../domain/course/course.errors'
import type { LessonBlockContent, LessonBlockKind } from '../../../domain/course/lesson-block'
import type {
  AttachmentFields,
  CloneCourseOverrides,
  ContentAdminRepository,
  CourseFields,
  LessonFields,
  ListCoursesAdminFilter,
  ModuleFields,
} from '../../../domain/ports/content-admin-repository.port'
import type { Database } from './db'
import {
  courses,
  lessonAttachments,
  lessonBlocks,
  lessonCompletions,
  lessons,
  modules,
  quizAttempts,
  studioSubmissions,
} from './schema'
import { JAVASCRIPT_TRIM_CHARACTERS } from './text-normalization'

type CourseRow = typeof courses.$inferSelect
type ModuleRow = typeof modules.$inferSelect
type LessonRow = typeof lessons.$inferSelect
type BlockRow = typeof lessonBlocks.$inferSelect
type AttachmentRow = typeof lessonAttachments.$inferSelect

const toCourse = (r: CourseRow): Course => ({
  id: r.id,
  version: r.version,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  description: r.description,
  coverImageUrl: r.coverImageUrl,
  status: r.status,
  audience: r.audience,
  sequentialLock: r.sequentialLock,
  level: r.level,
  track: r.track,
  careerSlot: r.careerSlot,
  metadata: r.metadata ?? null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
})
const toModule = (r: ModuleRow): Module => ({
  id: r.id,
  courseId: r.courseId,
  title: r.title,
  summary: r.summary,
  sortOrder: r.sortOrder,
})
const toLesson = (r: LessonRow): Lesson => ({
  id: r.id,
  moduleId: r.moduleId,
  courseId: r.courseId,
  slug: r.slug,
  title: r.title,
  sortOrder: r.sortOrder,
  estimatedMinutes: r.estimatedMinutes,
  isPublished: r.isPublished,
})
const toBlock = (r: BlockRow): LessonBlock => ({
  id: r.id,
  lessonId: r.lessonId,
  kind: r.kind,
  sortOrder: r.sortOrder,
  content: r.content,
  contentRevision: r.contentRevision,
})
const toAttachment = (r: AttachmentRow): LessonAttachment => ({
  id: r.id,
  lessonId: r.lessonId,
  label: r.label,
  url: r.url,
  fileType: r.fileType,
  sizeBytes: r.sizeBytes,
  sortOrder: r.sortOrder,
})

/**
 * 23505 = unique_violation. O drizzle-orm (≥ 0.44) ENVELOPA o erro do driver em
 * `DrizzleQueryError`, com o `PostgresError` original em `cause` — checar só o
 * topo deixava a corrida de slug duplicado virar 500 em vez de 409 (mesmo gotcha
 * pego no auth contra Postgres real). Caminha a cadeia de `cause` (com teto).
 */
const SORT_ORDER_UNIQUE_CONSTRAINTS = new Set([
  'modules_course_sort_order_uq',
  'lessons_module_sort_order_uq',
  'lesson_blocks_lesson_sort_order_uq',
  'lesson_attachments_lesson_sort_order_uq',
])

const SLUG_UNIQUE_CONSTRAINTS = new Set(['courses_slug_uq', 'lessons_course_slug_uq'])
const CAREER_SLOT_UNIQUE_CONSTRAINT = 'courses_career_slot_uq'

// Deslocamento p/ "estacionar" linhas num intervalo negativo disjunto durante a
// reordenação (ver os métodos `reorder*`). Maior que qualquer nº realista de
// irmãos (módulos/aulas/blocos/anexos) → o intervalo [-OFFSET, -OFFSET+n) nunca
// colide com a faixa final 0..n-1.
const REORDER_PARK_OFFSET = 1_000_000

function uniqueViolationConstraint(error: unknown): string | null {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    const candidate = current as { code?: unknown; constraint?: unknown }
    if (candidate.code === '23505') {
      return typeof candidate.constraint === 'string' ? candidate.constraint : ''
    }
    current = (current as { cause?: unknown }).cause
  }
  return null
}

/**
 * Metadata do curso no CREATE: só as chaves geridas pelo form. Sem nenhuma delas o
 * campo fica `null` (o jsonb é um saco de extras livres — nunca um objeto vazio).
 */
function buildCourseMetadata(fields: CourseFields): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {}
  if (fields.salesPageUrl) metadata.salesPageUrl = fields.salesPageUrl
  // ⚠️ TRIM antes de guardar (e não só p/ filtrar): um id com espaço sobreviveria aqui e
  // nunca casaria com o catálogo do studio — bloco que a criança ganhou e nunca aparece.
  // Espelha o `normalizeUnlockBlocks` do caminho de UPDATE.
  const blocks = (fields.studioUnlockBlocks ?? [])
    .map((type) => type.trim())
    .filter((type) => type.length > 0)
  if (blocks.length > 0) metadata.studioUnlockBlocks = [...new Set(blocks)]
  return Object.keys(metadata).length > 0 ? metadata : null
}

function isSlugUniqueViolation(error: unknown): boolean {
  const constraint = uniqueViolationConstraint(error)
  return constraint === '' || (constraint !== null && SLUG_UNIQUE_CONSTRAINTS.has(constraint))
}

function isCareerSlotUniqueViolation(error: unknown): boolean {
  return uniqueViolationConstraint(error) === CAREER_SLOT_UNIQUE_CONSTRAINT
}

function isSortOrderUniqueViolation(error: unknown): boolean {
  const constraint = uniqueViolationConstraint(error)
  return constraint !== null && SORT_ORDER_UNIQUE_CONSTRAINTS.has(constraint)
}

async function retrySortOrderCollision<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (!isSortOrderUniqueViolation(error) || attempt >= 4) throw error
    }
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    )
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

/**
 * ⚠️ Editar um bloco NUNCA apaga `studio_submissions`. A entrega é TRABALHO do
 * aluno: é o "save na nuvem" que restaura o editor num navegador novo, a fonte
 * do carryover da cadeia e o registro da fila do professor. A regra antiga
 * ("qualquer mudança de conteúdo apaga as entregas do bloco") destruiu entregas
 * reais em produção (08/2026): o snapshot do `initialProject` re-serializado
 * pelo admin quase nunca é byte-igual ao salvo (normalizações/migrações do
 * editor embutido), então TODO salvar de bloco Estúdio descartava os projetos
 * enviados de TODOS os alunos do bloco — o aluno via "você ainda não enviou
 * nenhum projeto" e o professor perdia a fila.
 *
 * O que uma edição PODE invalidar é a CORREÇÃO: quando a ATIVIDADE avaliada do
 * Estúdio muda, a nota/aprovação anterior não vale mais — os campos de correção
 * (score/results/checked_at/passed_at) são ZERADOS e o gate volta a travar por
 * `STUDIO_GATE_NOT_PASSED` até o aluno reenviar; o projeto enviado fica. Quiz
 * segue apagando as TENTATIVAS quando as questões/nota de corte mudam
 * (histórico de respostas de questões que não existem mais — não é trabalho
 * autoral). Pinta não tem correção: editar o bloco não toca a entrega.
 */
function quizGateFingerprint(content: LessonBlockContent): string {
  if (content.kind !== 'quiz') return 'none'
  return stableJson({ questions: content.questions, passingScore: content.passingScore ?? null })
}

function studioActivityFingerprint(content: LessonBlockContent): string {
  if (content.kind !== 'studio') return 'none'
  return stableJson(content.activity ?? null)
}

type DatabaseTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type DatabaseExecutor = Database | DatabaseTransaction

export class DrizzleContentAdminRepository implements ContentAdminRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  // ── Cursos ──────────────────────────────────────────────────────────────
  async listCoursesAdmin(
    filter: ListCoursesAdminFilter,
  ): Promise<{ items: Course[]; total: number }> {
    const clauses: SQL[] = []
    const q = filter.q?.trim()
    if (q) {
      // Escapa os curingas do LIKE (`%`/`_`) e o próprio escape (`\`) — um `q`
      // com `%` viraria match-tudo (busca literal, não padrão).
      const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`
      const m = sql`(${courses.title} ilike ${like} or ${courses.slug} ilike ${like})`
      clauses.push(m)
    }
    if (filter.status) clauses.push(eq(courses.status, filter.status))
    if (filter.audience) clauses.push(eq(courses.audience, filter.audience))
    const where = clauses.length > 0 ? and(...clauses) : undefined

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(courses)
        .where(where)
        .orderBy(asc(courses.title))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ c: count() }).from(courses).where(where),
    ])
    return { items: rows.map(toCourse), total: counted?.c ?? 0 }
  }

  async listCourseIdsWithShowcaseBlock(courseIds: string[]): Promise<string[]> {
    if (courseIds.length === 0) return []
    const rows = await this.db
      .selectDistinct({ courseId: lessons.courseId })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessonBlocks.lessonId, lessons.id))
      .where(
        and(
          inArray(lessons.courseId, courseIds),
          eq(lessons.isPublished, true),
          eq(lessonBlocks.kind, 'studio'),
          // `enabled` é boolean no jsonb → `->>` devolve o texto 'true'.
          sql`${lessonBlocks.content} -> 'showcase' ->> 'enabled' = 'true'`,
        ),
      )
    return rows.map((row) => row.courseId)
  }

  async createCourse(fields: CourseFields): Promise<Course> {
    const now = new Date()
    const row = {
      id: randomUUID(),
      version: 0,
      slug: fields.slug,
      title: fields.title,
      subtitle: fields.subtitle,
      description: fields.description,
      coverImageUrl: fields.coverImageUrl,
      status: fields.status,
      // O service normaliza `audience` no create; o `?? 'adult'` cobre chamadas diretas.
      audience: fields.audience ?? ('adult' as const),
      // Idem: o service normaliza; `?? true` cobre chamada direta (padrão LIGADO).
      sequentialLock: fields.sequentialLock ?? true,
      // Idem: o service normaliza; `?? 'iniciante'` cobre chamada direta.
      level: fields.level ?? ('iniciante' as const),
      // Idem: `?? '2d'` cobre chamada direta.
      track: fields.track ?? ('2d' as const),
      careerSlot: fields.careerSlot ?? null,
      // `salesPageUrl` e `studioUnlockBlocks` moram no metadata (jsonb) — as duas
      // chaves geridas pelo form do curso (a 2ª é o currículo do Estúdio livre).
      metadata: buildCourseMetadata(fields),
      createdAt: now,
      updatedAt: now,
    }
    try {
      await this.db.insert(courses).values(row)
    } catch (error) {
      if (isCareerSlotUniqueViolation(error)) throw new CareerSlotConflictError()
      if (isSlugUniqueViolation(error))
        throw new DuplicateSlugError('Já existe um curso com esse slug')
      throw error
    }
    return toCourse(row as CourseRow)
  }

  async cloneCourseTree(
    sourceCourseId: string,
    overrides: CloneCourseOverrides,
  ): Promise<Course | null> {
    // Transação única: ou a árvore inteira nasce, ou nada. Queries SEQUENCIAIS
    // (mesma sessão do postgres.js — sem Promise.all dentro da txn).
    return this.db.transaction(async (tx) => {
      const [src] = await tx.select().from(courses).where(eq(courses.id, sourceCourseId)).limit(1)
      if (!src) return null

      const now = new Date()
      const metadata: Record<string, unknown> = {
        ...((src.metadata as Record<string, unknown> | null) ?? {}),
        clonedFrom: src.slug,
      }
      if (overrides.dropStudioUnlockBlocks) delete metadata.studioUnlockBlocks

      const row = {
        id: randomUUID(),
        version: 0,
        slug: overrides.slug,
        title: overrides.title,
        subtitle: src.subtitle,
        description: src.description,
        coverImageUrl: src.coverImageUrl,
        status: 'draft' as const,
        audience: overrides.audience,
        sequentialLock: src.sequentialLock,
        level: src.level,
        track: src.track,
        // Fora da carreira até a operadora etiquetar (evita conflito de posição
        // e a armadilha de um clone virar curso-base sem querer).
        careerSlot: null,
        metadata,
        createdAt: now,
        updatedAt: now,
      }
      try {
        await tx.insert(courses).values(row)
      } catch (error) {
        if (isSlugUniqueViolation(error))
          throw new DuplicateSlugError('Já existe um curso com esse slug')
        throw error
      }

      const srcModules = await tx.select().from(modules).where(eq(modules.courseId, src.id))
      const srcLessons = await tx.select().from(lessons).where(eq(lessons.courseId, src.id))
      const lessonIds = srcLessons.map((l) => l.id)
      const srcBlocks =
        lessonIds.length > 0
          ? await tx.select().from(lessonBlocks).where(inArray(lessonBlocks.lessonId, lessonIds))
          : []
      const srcAttachments =
        lessonIds.length > 0
          ? await tx
              .select()
              .from(lessonAttachments)
              .where(inArray(lessonAttachments.lessonId, lessonIds))
          : []

      const moduleIdMap = new Map(srcModules.map((m) => [m.id, randomUUID()]))
      const lessonIdMap = new Map(srcLessons.map((l) => [l.id, randomUUID()]))
      if (srcModules.length > 0) {
        await tx.insert(modules).values(
          srcModules.map((m) => ({
            id: moduleIdMap.get(m.id) as string,
            courseId: row.id,
            title: m.title,
            summary: m.summary,
            sortOrder: m.sortOrder,
            createdAt: now,
            updatedAt: now,
          })),
        )
      }
      if (srcLessons.length > 0) {
        await tx.insert(lessons).values(
          srcLessons.map((l) => ({
            id: lessonIdMap.get(l.id) as string,
            moduleId: moduleIdMap.get(l.moduleId) as string,
            courseId: row.id,
            slug: l.slug,
            title: l.title,
            sortOrder: l.sortOrder,
            estimatedMinutes: l.estimatedMinutes,
            isPublished: l.isPublished,
            createdAt: now,
            updatedAt: now,
          })),
        )
      }
      if (srcBlocks.length > 0) {
        await tx.insert(lessonBlocks).values(
          srcBlocks.map((b) => ({
            id: randomUUID(),
            lessonId: lessonIdMap.get(b.lessonId) as string,
            kind: b.kind,
            sortOrder: b.sortOrder,
            content: b.content,
            // Conteúdo idêntico = mesma revisão (o Zappy não re-extrai à toa).
            contentRevision: b.contentRevision,
          })),
        )
      }
      if (srcAttachments.length > 0) {
        await tx.insert(lessonAttachments).values(
          srcAttachments.map((a) => ({
            id: randomUUID(),
            lessonId: lessonIdMap.get(a.lessonId) as string,
            label: a.label,
            url: a.url,
            fileType: a.fileType,
            sizeBytes: a.sizeBytes,
            sortOrder: a.sortOrder,
          })),
        )
      }
      return toCourse(row as CourseRow)
    })
  }

  async updateCourse(course: Course): Promise<boolean> {
    // O caso de uso recebe a versão que o editor leu e a propaga até aqui. Não
    // reler a versão: isso aceitaria um payload velho e perderia a edição alheia.
    const expectedVersion = course.version
    try {
      const updated = await this.db
        .update(courses)
        .set({
          slug: course.slug,
          title: course.title,
          subtitle: course.subtitle,
          description: course.description,
          coverImageUrl: course.coverImageUrl,
          status: course.status,
          audience: course.audience,
          sequentialLock: course.sequentialLock,
          level: course.level,
          track: course.track,
          careerSlot: course.careerSlot,
          metadata: course.metadata,
          updatedAt: new Date(),
          version: expectedVersion + 1,
        })
        .where(and(eq(courses.id, course.id), eq(courses.version, expectedVersion)))
        .returning({ id: courses.id })
      return updated.length > 0
    } catch (error) {
      if (isCareerSlotUniqueViolation(error)) throw new CareerSlotConflictError()
      if (isSlugUniqueViolation(error))
        throw new DuplicateSlugError('Já existe um curso com esse slug')
      throw error
    }
  }

  async countPublishedLessons(
    courseId: string,
    opts?: { excludeLessonId?: string; excludeModuleId?: string },
  ): Promise<number> {
    const clauses: SQL[] = [eq(lessons.courseId, courseId), eq(lessons.isPublished, true)]
    if (opts?.excludeLessonId) clauses.push(ne(lessons.id, opts.excludeLessonId))
    if (opts?.excludeModuleId) clauses.push(ne(lessons.moduleId, opts.excludeModuleId))
    const [row] = await this.db
      .select({ c: count() })
      .from(lessons)
      .where(and(...clauses))
    return row?.c ?? 0
  }

  async deleteCourse(id: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx.delete(lessonCompletions).where(eq(lessonCompletions.courseId, id))
      const deleted = await tx
        .delete(courses)
        .where(eq(courses.id, id))
        .returning({ id: courses.id })
      return deleted.length > 0
    })
  }

  // ── Módulos ─────────────────────────────────────────────────────────────
  async findModuleById(id: string): Promise<Module | null> {
    const [row] = await this.db.select().from(modules).where(eq(modules.id, id)).limit(1)
    return row ? toModule(row) : null
  }

  async createModule(courseId: string, fields: ModuleFields): Promise<Module> {
    return retrySortOrderCollision(async () => {
      const now = new Date()
      // `max+1` computado DENTRO do INSERT (1 statement). O índice único por
      // pai+sortOrder transforma a corrida concorrente em retry explícito.
      const [row] = await this.db
        .insert(modules)
        .values({
          id: randomUUID(),
          courseId,
          title: fields.title,
          summary: fields.summary,
          sortOrder: sql`coalesce((select max(${modules.sortOrder}) + 1 from ${modules} where ${modules.courseId} = ${courseId}), 0)`,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      if (!row) throw new Error('insert de módulo não retornou a linha')
      return toModule(row)
    })
  }

  async updateModule(id: string, fields: ModuleFields): Promise<Module | null> {
    const [row] = await this.db
      .update(modules)
      .set({ title: fields.title, summary: fields.summary, updatedAt: new Date() })
      .where(eq(modules.id, id))
      .returning()
    return row ? toModule(row) : null
  }

  async deleteModule(id: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const lessonRows = await tx
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.moduleId, id))
      const lessonIds = lessonRows.map((r) => r.id)
      if (lessonIds.length > 0) {
        await tx.delete(lessonCompletions).where(inArray(lessonCompletions.lessonId, lessonIds))
      }
      const deleted = await tx
        .delete(modules)
        .where(eq(modules.id, id))
        .returning({ id: modules.id })
      return deleted.length > 0
    })
  }

  async listModuleIds(courseId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderModules(courseId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      // O índice único (course_id, sort_order) é NÃO-deferível: o Postgres o checa
      // por LINHA, não no fim do statement. Reatribuir 0..n-1 com um UPDATE por
      // linha colidiria com o irmão ainda não movido (ex.: [a:0,b:1]→[b,a] tentaria
      // b:0 com `a` ainda em 0 → 23505 → 500). Fase 1: desloca TODAS as linhas (o
      // serviço garante orderedIds = conjunto completo via assertSameSet) p/ um
      // intervalo negativo disjunto num único statement (shift uniforme = sem
      // colisão); fase 2: atribui a ordem final (nada mais ocupa 0..n-1).
      await tx
        .update(modules)
        .set({ sortOrder: sql`${modules.sortOrder} - ${REORDER_PARK_OFFSET}` })
        .where(eq(modules.courseId, courseId))
      const now = new Date()
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(modules)
          .set({ sortOrder: i, updatedAt: now })
          .where(and(eq(modules.id, orderedIds[i] as string), eq(modules.courseId, courseId)))
      }
    })
  }

  // ── Aulas ───────────────────────────────────────────────────────────────
  async findLessonById(id: string): Promise<Lesson | null> {
    const [row] = await this.db.select().from(lessons).where(eq(lessons.id, id)).limit(1)
    return row ? toLesson(row) : null
  }

  async createLesson(moduleId: string, courseId: string, fields: LessonFields): Promise<Lesson> {
    return retrySortOrderCollision(async () => {
      const now = new Date()
      try {
        // `max+1` dentro do INSERT (1 statement) + retry em colisão — ver createModule.
        const [row] = await this.db
          .insert(lessons)
          .values({
            id: randomUUID(),
            moduleId,
            courseId,
            slug: fields.slug,
            title: fields.title,
            sortOrder: sql`coalesce((select max(${lessons.sortOrder}) + 1 from ${lessons} where ${lessons.moduleId} = ${moduleId}), 0)`,
            estimatedMinutes: fields.estimatedMinutes,
            isPublished: fields.isPublished,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
        if (!row) throw new Error('insert de aula não retornou a linha')
        return toLesson(row)
      } catch (error) {
        if (isSlugUniqueViolation(error)) {
          throw new DuplicateSlugError('Já existe uma aula com esse slug neste curso')
        }
        throw error
      }
    })
  }

  async updateLesson(id: string, fields: LessonFields): Promise<Lesson | null> {
    try {
      const [row] = await this.db
        .update(lessons)
        .set({
          slug: fields.slug,
          title: fields.title,
          estimatedMinutes: fields.estimatedMinutes,
          isPublished: fields.isPublished,
          updatedAt: new Date(),
        })
        .where(eq(lessons.id, id))
        .returning()
      return row ? toLesson(row) : null
    } catch (error) {
      if (isSlugUniqueViolation(error)) {
        throw new DuplicateSlugError('Já existe uma aula com esse slug neste curso')
      }
      throw error
    }
  }

  async deleteLesson(id: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx.delete(lessonCompletions).where(eq(lessonCompletions.lessonId, id))
      const deleted = await tx
        .delete(lessons)
        .where(eq(lessons.id, id))
        .returning({ id: lessons.id })
      return deleted.length > 0
    })
  }

  async listLessonIds(moduleId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(asc(lessons.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderLessons(moduleId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Fase 1 estaciona em faixa negativa, fase 2 atribui a ordem final — sem
      // colidir com o índice único (module_id, sort_order). Ver reorderModules.
      await tx
        .update(lessons)
        .set({ sortOrder: sql`${lessons.sortOrder} - ${REORDER_PARK_OFFSET}` })
        .where(eq(lessons.moduleId, moduleId))
      const now = new Date()
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(lessons)
          .set({ sortOrder: i, updatedAt: now })
          .where(and(eq(lessons.id, orderedIds[i] as string), eq(lessons.moduleId, moduleId)))
      }
    })
  }

  // ── Blocos ──────────────────────────────────────────────────────────────
  async createBlock(
    lessonId: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock> {
    return retrySortOrderCollision(async () => {
      // Cada tentativa ganha uma transação própria — ou um SAVEPOINT quando este repositório
      // já está dentro de `withPintaChainLock`. Assim uma colisão 23505 não envenena a
      // transação externa antes de o retry recalcular `max+1`.
      return this.db.transaction(async (tx) => {
        // O lock é por AULA, que é exatamente o agregado da ordenação. Ele cobre também
        // cadeias diferentes e criações sem cadeia, eliminando a corrida de `max+1` entre
        // todos os escritores que passam por este repositório.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`lesson-block-order:${lessonId}`}, 0))`,
        )
        const [row] = await tx
          .insert(lessonBlocks)
          .values({
            id: randomUUID(),
            lessonId,
            kind,
            sortOrder: sql`coalesce((select max(${lessonBlocks.sortOrder}) + 1 from ${lessonBlocks} where ${lessonBlocks.lessonId} = ${lessonId}), 0)`,
            content,
          })
          .returning()
        if (!row) throw new Error('insert de bloco não retornou a linha')
        return toBlock(row)
      })
    })
  }

  async updateBlock(
    id: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock | null> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(lessonBlocks).where(eq(lessonBlocks.id, id)).limit(1)
      if (!current) return null

      const quizGateChanged = quizGateFingerprint(current.content) !== quizGateFingerprint(content)
      const studioActivityChanged =
        studioActivityFingerprint(current.content) !== studioActivityFingerprint(content)
      const [row] = await tx
        .update(lessonBlocks)
        .set({ kind, content, contentRevision: randomUUID().replaceAll('-', '') })
        .where(eq(lessonBlocks.id, id))
        .returning()
      if (!row) return null

      if (quizGateChanged) {
        await tx.delete(quizAttempts).where(eq(quizAttempts.blockId, id))
      }
      if (studioActivityChanged) {
        // Zera SÓ a correção (o projeto do aluno FICA — ver o comentário dos
        // fingerprints). `passed_at` é o sticky do gate: sem zerá-lo, a
        // atividade nova nasceria "aprovada" pela versão antiga.
        await tx
          .update(studioSubmissions)
          .set({ score: null, results: null, checkedAt: null, passedAt: null })
          .where(eq(studioSubmissions.blockId, id))
      }
      return toBlock(row)
    })
  }

  async deleteBlock(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(lessonBlocks)
      .where(eq(lessonBlocks.id, id))
      .returning({ id: lessonBlocks.id })
    return deleted.length > 0
  }

  async listBlockIds(lessonId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: lessonBlocks.id })
      .from(lessonBlocks)
      .where(eq(lessonBlocks.lessonId, lessonId))
      .orderBy(asc(lessonBlocks.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderBlocks(lessonId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Fase 1 estaciona em faixa negativa, fase 2 atribui a ordem final — sem
      // colidir com o índice único (lesson_id, sort_order). Ver reorderModules.
      await tx
        .update(lessonBlocks)
        .set({ sortOrder: sql`${lessonBlocks.sortOrder} - ${REORDER_PARK_OFFSET}` })
        .where(eq(lessonBlocks.lessonId, lessonId))
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(lessonBlocks)
          .set({ sortOrder: i })
          .where(
            and(eq(lessonBlocks.id, orderedIds[i] as string), eq(lessonBlocks.lessonId, lessonId)),
          )
      }
    })
  }

  async findBlockCourseId(id: string): Promise<string | null> {
    const [row] = await this.db
      .select({ courseId: lessons.courseId })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessonBlocks.lessonId, lessons.id))
      .where(eq(lessonBlocks.id, id))
      .limit(1)
    return row?.courseId ?? null
  }

  async findBlockLessonId(id: string): Promise<string | null> {
    const [row] = await this.db
      .select({ lessonId: lessonBlocks.lessonId })
      .from(lessonBlocks)
      .where(eq(lessonBlocks.id, id))
      .limit(1)
    return row?.lessonId ?? null
  }

  async lessonHasCertificateBlock(lessonId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: lessonBlocks.id })
      .from(lessonBlocks)
      .where(and(eq(lessonBlocks.lessonId, lessonId), eq(lessonBlocks.kind, 'certificate')))
      .limit(1)
    return row !== undefined
  }

  async lessonHasGatingBlock(
    lessonId: string,
    opts: { excludeBlockId?: string } = {},
  ): Promise<boolean> {
    // Espelha `isCompletionGatingBlock` (domain) em SQL: estúdio, Pinta e "em breve" SEMPRE
    // travam; quiz só com `passingScore` (extração JSONB `->>` devolve NULL quando a
    // chave falta/é null). Mexeu num, mexa no outro — o fake in-memory usa a função do
    // domínio, então uma divergência aqui passaria batida nos testes.
    const gating = or(
      eq(lessonBlocks.kind, 'studio'),
      eq(lessonBlocks.kind, 'pinta'),
      eq(lessonBlocks.kind, 'coming_soon'),
      and(
        eq(lessonBlocks.kind, 'quiz'),
        sql`${lessonBlocks.content} ->> 'passingScore' is not null`,
      ),
    ) as SQL
    const clauses: SQL[] = [eq(lessonBlocks.lessonId, lessonId), gating]
    if (opts.excludeBlockId) clauses.push(ne(lessonBlocks.id, opts.excludeBlockId))
    const [row] = await this.db
      .select({ id: lessonBlocks.id })
      .from(lessonBlocks)
      .where(and(...clauses))
      .limit(1)
    return row !== undefined
  }

  async listPintaChainBlocks(
    courseId: string,
    chain: string,
    opts: { excludeBlockId?: string } = {},
  ): Promise<{ blockId: string; lessonTitle: string; assetKind: string | null }[]> {
    // `trim` nos DOIS lados, mesma régua do carryover: o `chain` do serviço já vem trimado, e
    // sem o trim no valor armazenado uma cadeia autorada com espaço sobrando não casaria — a
    // guarda passaria batida e o estado quebrado nasceria mesmo assim.
    const clauses: SQL[] = [
      eq(lessons.courseId, courseId),
      eq(lessonBlocks.kind, 'pinta'),
      sql`btrim(${lessonBlocks.content}->>'chain', ${JAVASCRIPT_TRIM_CHARACTERS}) = ${chain}`,
    ]
    if (opts.excludeBlockId) clauses.push(ne(lessonBlocks.id, opts.excludeBlockId))
    // ⚠️ Espelha `pintaAssetKindOf` (domínio) em SQL: o tipo é LIDO do snapshot, não de um campo
    // próprio. Mexeu num, mexa no outro. Aulas RASCUNHO entram de propósito — a cadeia é da
    // autoria, e deixar nascer o conflito para ele aparecer só na publicação seria pior.
    return await this.db
      .select({
        blockId: lessonBlocks.id,
        lessonTitle: lessons.title,
        assetKind: sql<string | null>`${lessonBlocks.content}->'initialAsset'->>'kind'`,
      })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessonBlocks.lessonId, lessons.id))
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(and(...clauses))
      .orderBy(asc(modules.sortOrder), asc(lessons.sortOrder), asc(lessonBlocks.sortOrder))
  }

  async withPintaChainLock<T>(
    courseId: string,
    chain: string,
    operation: (repository: ContentAdminRepository) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`pinta-chain:${courseId}:${chain}`}, 0))`,
      )
      return operation(new DrizzleContentAdminRepository(tx))
    })
  }

  async countCertificateBlocks(
    courseId: string,
    opts: { excludeBlockId?: string } = {},
  ): Promise<number> {
    const clauses: SQL[] = [eq(lessons.courseId, courseId), eq(lessonBlocks.kind, 'certificate')]
    if (opts.excludeBlockId) clauses.push(ne(lessonBlocks.id, opts.excludeBlockId))
    const [row] = await this.db
      .select({ c: count() })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessonBlocks.lessonId, lessons.id))
      .where(and(...clauses))
    return row?.c ?? 0
  }

  // ── Anexos ──────────────────────────────────────────────────────────────
  async createAttachment(lessonId: string, fields: AttachmentFields): Promise<LessonAttachment> {
    return retrySortOrderCollision(async () => {
      // `max+1` dentro do INSERT (1 statement) + retry em colisão — ver createModule.
      const [row] = await this.db
        .insert(lessonAttachments)
        .values({
          id: randomUUID(),
          lessonId,
          label: fields.label,
          url: fields.url,
          fileType: fields.fileType,
          sizeBytes: fields.sizeBytes,
          sortOrder: sql`coalesce((select max(${lessonAttachments.sortOrder}) + 1 from ${lessonAttachments} where ${lessonAttachments.lessonId} = ${lessonId}), 0)`,
        })
        .returning()
      if (!row) throw new Error('insert de anexo não retornou a linha')
      return toAttachment(row)
    })
  }

  async updateAttachment(id: string, fields: AttachmentFields): Promise<LessonAttachment | null> {
    const [row] = await this.db
      .update(lessonAttachments)
      .set({
        label: fields.label,
        url: fields.url,
        fileType: fields.fileType,
        sizeBytes: fields.sizeBytes,
      })
      .where(eq(lessonAttachments.id, id))
      .returning()
    return row ? toAttachment(row) : null
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(lessonAttachments)
      .where(eq(lessonAttachments.id, id))
      .returning({ id: lessonAttachments.id })
    return deleted.length > 0
  }

  async listAttachmentIds(lessonId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: lessonAttachments.id })
      .from(lessonAttachments)
      .where(eq(lessonAttachments.lessonId, lessonId))
      .orderBy(asc(lessonAttachments.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderAttachments(lessonId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Fase 1 estaciona em faixa negativa, fase 2 atribui a ordem final — sem
      // colidir com o índice único (lesson_id, sort_order). Ver reorderModules.
      await tx
        .update(lessonAttachments)
        .set({ sortOrder: sql`${lessonAttachments.sortOrder} - ${REORDER_PARK_OFFSET}` })
        .where(eq(lessonAttachments.lessonId, lessonId))
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(lessonAttachments)
          .set({ sortOrder: i })
          .where(
            and(
              eq(lessonAttachments.id, orderedIds[i] as string),
              eq(lessonAttachments.lessonId, lessonId),
            ),
          )
      }
    })
  }
}
