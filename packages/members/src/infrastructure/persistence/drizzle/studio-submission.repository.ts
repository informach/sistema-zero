import { and, asc, count, desc, eq, gte, inArray, isNotNull, lt, or, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type { StudioCheckResult } from '../../../domain/course/studio-activity'
import type {
  RecentStudioSubmission,
  StudioSubmissionCourseRow,
  StudioSubmissionDetail,
  StudioSubmissionGlobalFilter,
  StudioSubmissionGlobalRow,
  StudioSubmissionRecord,
  StudioSubmissionRepository,
  StudioSubmissionState,
  StudioSubmissionSummary,
} from '../../../domain/ports/studio-submission-repository.port'
import type { Database } from './db'
import {
  courses,
  lessonBlocks,
  lessons,
  modules,
  studioSubmissions,
  teacherMessages,
  teacherThreads,
} from './schema'

export class DrizzleStudioSubmissionRepository implements StudioSubmissionRepository {
  constructor(private readonly db: Database) {}

  async upsert(
    submission: StudioSubmissionRecord,
    options?: { preservePassedAt?: boolean },
  ): Promise<void> {
    // Reenvio = último vence: atualiza projeto + data + correção, preservando a
    // linha (e o id). `passed_at` é STICKY — o service já calcula o valor a
    // gravar (existente ?? agora-se-passou), então o set abaixo só persiste.
    const values = {
      ...submission,
      score: submission.score ?? null,
      results: submission.results ?? null,
      checkedAt: submission.checkedAt ?? null,
      passedAt: submission.passedAt ?? null,
      message: submission.message ?? null,
    }

    // ⭐ Backup de 1 passo: o SET do ON CONFLICT copia o projeto/data que estavam
    // na linha para `previous_*` ANTES de sobrescrever. Referenciar a COLUNA DA
    // TABELA dentro do SET lê o valor ANTIGO da linha (≠ `excluded.*`, que é o
    // valor proposto) — é o que torna a cópia atômica, sem SELECT prévio. O
    // INSERT novo deixa `previous_*` null (nunca houve reenvio).
    const previousBackupSet = {
      previousProject: sql`${studioSubmissions.project}`,
      previousSubmittedAt: sql`${studioSubmissions.submittedAt}`,
    }

    if (!options?.preservePassedAt) {
      await this.db
        .insert(studioSubmissions)
        .values(values)
        .onConflictDoUpdate({
          target: [studioSubmissions.userId, studioSubmissions.blockId],
          set: {
            ...previousBackupSet,
            project: values.project,
            submittedAt: values.submittedAt,
            score: values.score,
            results: values.results,
            checkedAt: values.checkedAt,
            passedAt: values.passedAt,
            message: values.message,
          },
        })
      return
    }

    await this.db.transaction(async (tx) => {
      // serializa concorrência de submit por aluno+bloco; evita perda de `passedAt` sticky.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${submission.userId}:${submission.blockId}`}, 0))`,
      )

      const rows = await tx
        .select({ passedAt: studioSubmissions.passedAt })
        .from(studioSubmissions)
        .where(
          and(
            eq(studioSubmissions.userId, submission.userId),
            eq(studioSubmissions.blockId, submission.blockId),
          ),
        )
        .limit(1)

      const nextPassedAt = rows[0]?.passedAt ?? values.passedAt ?? null

      await tx
        .insert(studioSubmissions)
        .values({ ...values, passedAt: nextPassedAt })
        .onConflictDoUpdate({
          target: [studioSubmissions.userId, studioSubmissions.blockId],
          set: {
            ...previousBackupSet,
            project: values.project,
            submittedAt: values.submittedAt,
            score: values.score,
            results: values.results,
            checkedAt: values.checkedAt,
            passedAt: nextPassedAt,
            message: values.message,
          },
        })
    })
  }

  async summarizeByBlockIds(
    userId: string,
    blockIds: string[],
  ): Promise<Map<string, StudioSubmissionState>> {
    if (blockIds.length === 0) return new Map()
    const rows = await this.db
      .select({
        blockId: studioSubmissions.blockId,
        submittedAt: studioSubmissions.submittedAt,
        score: studioSubmissions.score,
        passedAt: studioSubmissions.passedAt,
        reviewedAt: studioSubmissions.reviewedAt,
      })
      .from(studioSubmissions)
      .where(
        and(eq(studioSubmissions.userId, userId), inArray(studioSubmissions.blockId, blockIds)),
      )
    const map = new Map<string, StudioSubmissionState>()
    for (const r of rows) {
      map.set(r.blockId, {
        submittedAt: r.submittedAt,
        score: r.score ?? null,
        passed: r.passedAt != null,
        reviewedAt: r.reviewedAt ?? null,
      })
    }
    return map
  }

  async listByBlock(blockId: string): Promise<StudioSubmissionSummary[]> {
    const rows = await this.db
      .select({
        userId: studioSubmissions.userId,
        accountId: studioSubmissions.accountId,
        submittedAt: studioSubmissions.submittedAt,
        score: studioSubmissions.score,
        checkedAt: studioSubmissions.checkedAt,
        passedAt: studioSubmissions.passedAt,
        message: studioSubmissions.message,
      })
      .from(studioSubmissions)
      .where(eq(studioSubmissions.blockId, blockId))
      .orderBy(asc(studioSubmissions.submittedAt))
    return rows.map((r) => ({
      userId: r.userId,
      accountId: r.accountId ?? null,
      submittedAt: r.submittedAt,
      score: r.score ?? null,
      checkedAt: r.checkedAt ?? null,
      passed: r.passedAt != null,
      message: r.message ?? null,
    }))
  }

  async listByCourse(courseId: string): Promise<StudioSubmissionCourseRow[]> {
    // Entregas de TODAS as aulas do curso numa ida (aba "Entregas" do curso).
    // Joins com lessons/modules para o título da aula/módulo e a ORDEM do curso;
    // o BFF abre a entrega pelo endpoint por-bloco existente (por isso `blockId`).
    const rows = await this.db
      .select({
        userId: studioSubmissions.userId,
        accountId: studioSubmissions.accountId,
        blockId: studioSubmissions.blockId,
        lessonId: studioSubmissions.lessonId,
        lessonTitle: lessons.title,
        moduleTitle: modules.title,
        submittedAt: studioSubmissions.submittedAt,
        score: studioSubmissions.score,
        checkedAt: studioSubmissions.checkedAt,
        passedAt: studioSubmissions.passedAt,
        message: studioSubmissions.message,
      })
      .from(studioSubmissions)
      .innerJoin(lessons, eq(lessons.id, studioSubmissions.lessonId))
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .where(eq(studioSubmissions.courseId, courseId))
      .orderBy(asc(modules.sortOrder), asc(lessons.sortOrder), asc(studioSubmissions.submittedAt))
    return rows.map((r) => ({
      userId: r.userId,
      accountId: r.accountId ?? null,
      blockId: r.blockId,
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle,
      moduleTitle: r.moduleTitle,
      submittedAt: r.submittedAt,
      score: r.score ?? null,
      checkedAt: r.checkedAt ?? null,
      passed: r.passedAt != null,
      message: r.message ?? null,
    }))
  }

  /**
   * `answered` = há mensagem do PROFESSOR na conversa desta entrega APÓS o
   * último envio — um reenvio do aluno REABRE a pendência. A conversa é ancorada
   * por contexto (user_id + context_ref = blockId), o mesmo elo do viewer/
   * `by-context` do teacher-threads. ⚠️ `context_ref` é TEXT (snapshot — também
   * guarda ids do hub); o `block_id` uuid precisa do cast, senão o PG recusa
   * `text = uuid` (achado da QA integrada).
   */
  private answeredSql() {
    return sql<boolean>`exists (
      select 1 from ${teacherThreads} tt
      join ${teacherMessages} tm on tm.thread_id = tt.id
      where tt.user_id = ${studioSubmissions.userId}
        and tt.context_type = 'studio_submission'
        and tt.context_ref = ${studioSubmissions.blockId}::text
        and tm.author_role = 'teacher'
        and tm.created_at >= ${studioSubmissions.submittedAt}
    )`
  }

  /**
   * `reviewed` = o professor carimbou "já conferi" APÓS o último envio. Mesma
   * régua do `answered`: comparar com submitted_at faz o reenvio reabrir sozinho.
   */
  private reviewedSql() {
    return sql<boolean>`(
      ${studioSubmissions.reviewedAt} is not null
      and ${studioSubmissions.reviewedAt} >= ${studioSubmissions.submittedAt}
    )`
  }

  /**
   * FECHADA = respondida OU conferida — a régua ÚNICA de "pendente" (a fila
   * global E as contagens por aluno derivam DESTE fragmento; duplicar a régua
   * seria drift silencioso entre o badge e a fila).
   */
  private closedSql() {
    return sql<boolean>`(${this.answeredSql()} or ${this.reviewedSql()})`
  }

  async countPendingByUsers(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map()
    const rows = await this.db
      .select({ userId: studioSubmissions.userId, c: count() })
      .from(studioSubmissions)
      .where(and(inArray(studioSubmissions.userId, userIds), sql`not ${this.closedSql()}`))
      .groupBy(studioSubmissions.userId)
    return new Map(rows.map((r) => [r.userId, r.c]))
  }

  async listAll(
    filter: StudioSubmissionGlobalFilter,
  ): Promise<{ items: StudioSubmissionGlobalRow[]; total: number }> {
    // Fila GLOBAL (página "Entregas" da Sala do Professor) — réguas nos helpers acima.
    const answered = this.answeredSql()
    const reviewed = this.reviewedSql()
    const closed = this.closedSql()

    const where = and(
      filter.courseId ? eq(studioSubmissions.courseId, filter.courseId) : undefined,
      filter.audience ? eq(courses.audience, filter.audience) : undefined,
      filter.status === 'pending' ? sql`not ${closed}` : undefined,
      filter.status === 'answered' ? answered : undefined,
      filter.status === 'reviewed' ? reviewed : undefined,
      // Filtro por aluno (24/07): accountId pega a família; profileId estreita.
      filter.userIds?.length
        ? or(
            inArray(studioSubmissions.userId, filter.userIds),
            inArray(studioSubmissions.accountId, filter.userIds),
          )
        : undefined,
    )

    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select({
          userId: studioSubmissions.userId,
          accountId: studioSubmissions.accountId,
          blockId: studioSubmissions.blockId,
          lessonId: studioSubmissions.lessonId,
          lessonTitle: lessons.title,
          moduleTitle: modules.title,
          courseId: studioSubmissions.courseId,
          courseTitle: courses.title,
          audience: courses.audience,
          submittedAt: studioSubmissions.submittedAt,
          score: studioSubmissions.score,
          checkedAt: studioSubmissions.checkedAt,
          passedAt: studioSubmissions.passedAt,
          message: studioSubmissions.message,
          answered,
          reviewed,
        })
        .from(studioSubmissions)
        .innerJoin(lessons, eq(lessons.id, studioSubmissions.lessonId))
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .innerJoin(courses, eq(courses.id, studioSubmissions.courseId))
        .where(where)
        // Pendentes primeiro (false < true), depois as mais recentes.
        .orderBy(asc(closed), desc(studioSubmissions.submittedAt))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db
        .select({ value: count() })
        .from(studioSubmissions)
        .innerJoin(lessons, eq(lessons.id, studioSubmissions.lessonId))
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .innerJoin(courses, eq(courses.id, studioSubmissions.courseId))
        .where(where),
    ])

    return {
      items: rows.map((r) => ({
        userId: r.userId,
        accountId: r.accountId ?? null,
        blockId: r.blockId,
        lessonId: r.lessonId,
        lessonTitle: r.lessonTitle,
        moduleTitle: r.moduleTitle,
        courseId: r.courseId,
        courseTitle: r.courseTitle,
        audience: r.audience,
        submittedAt: r.submittedAt,
        score: r.score ?? null,
        checkedAt: r.checkedAt ?? null,
        passed: r.passedAt != null,
        message: r.message ?? null,
        answered: r.answered,
        reviewed: r.reviewed,
      })),
      total: totalRow?.value ?? 0,
    }
  }

  async getOne(userId: string, blockId: string): Promise<StudioSubmissionDetail | null> {
    const rows = await this.db
      .select({
        project: studioSubmissions.project,
        submittedAt: studioSubmissions.submittedAt,
        score: studioSubmissions.score,
        results: studioSubmissions.results,
        checkedAt: studioSubmissions.checkedAt,
        passedAt: studioSubmissions.passedAt,
        message: studioSubmissions.message,
        reviewedAt: studioSubmissions.reviewedAt,
        // ⚠️ SÓ o timestamp da versão anterior — o jsonb `previous_project` fica de
        // fora de propósito: este detalhe alimenta também o seed do aluno e o
        // carryover (projetos de até 1,5M chars; dois jsonb dobrariam o payload).
        previousSubmittedAt: studioSubmissions.previousSubmittedAt,
      })
      .from(studioSubmissions)
      .where(and(eq(studioSubmissions.userId, userId), eq(studioSubmissions.blockId, blockId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return {
      project: row.project,
      submittedAt: row.submittedAt,
      score: row.score ?? null,
      results: (row.results as StudioCheckResult[] | null) ?? null,
      checkedAt: row.checkedAt ?? null,
      passedAt: row.passedAt ?? null,
      message: row.message ?? null,
      reviewedAt: row.reviewedAt ?? null,
      previousSubmittedAt: row.previousSubmittedAt ?? null,
    }
  }

  async getPrevious(
    userId: string,
    blockId: string,
  ): Promise<{ project: unknown; submittedAt: Date } | null> {
    const rows = await this.db
      .select({
        project: studioSubmissions.previousProject,
        submittedAt: studioSubmissions.previousSubmittedAt,
      })
      .from(studioSubmissions)
      .where(and(eq(studioSubmissions.userId, userId), eq(studioSubmissions.blockId, blockId)))
      .limit(1)
    const row = rows[0]
    // Sem linha OU sem backup (nunca houve reenvio) → null, o service resolve o 404.
    if (!row || row.project == null || row.submittedAt == null) return null
    return { project: row.project, submittedAt: row.submittedAt }
  }

  async restorePrevious(input: { userId: string; blockId: string }): Promise<boolean> {
    // ⭐ TROCA atômica num UPDATE só: todas as expressões do SET leem a linha
    // ANTIGA (semântica do UPDATE), então project↔previous e submitted↔previous
    // trocam de lugar sem SELECT prévio nem lock — restaurar 2× volta ao estado
    // inicial (reversível de propósito: o "desfazer" do próprio restaurar).
    // Zera a correção (score/results/checked_at pertenciam à versão sobrescrita);
    // PRESERVA passed_at (sticky — a restauração do professor não pune a criança),
    // reviewed_at/by e message (não listados no SET).
    const rows = await this.db
      .update(studioSubmissions)
      .set({
        project: sql`${studioSubmissions.previousProject}`,
        previousProject: sql`${studioSubmissions.project}`,
        submittedAt: sql`${studioSubmissions.previousSubmittedAt}`,
        previousSubmittedAt: sql`${studioSubmissions.submittedAt}`,
        score: null,
        results: null,
        checkedAt: null,
      })
      .where(
        and(
          eq(studioSubmissions.userId, input.userId),
          eq(studioSubmissions.blockId, input.blockId),
          isNotNull(studioSubmissions.previousProject),
          isNotNull(studioSubmissions.previousSubmittedAt),
        ),
      )
      .returning({ blockId: studioSubmissions.blockId })
    return rows.length > 0
  }

  async countByCourseGrouped(
    courseId: string,
  ): Promise<{ blockId: string; lessonId: string; count: number }[]> {
    // Sem joins: block_id/lesson_id são colunas da própria tabela (snapshot no
    // submit). Alimenta o aviso "este bloco/aula tem N entregas" dos confirms de
    // exclusão do admin — as FKs em cascata apagariam essas linhas junto.
    const rows = await this.db
      .select({
        blockId: studioSubmissions.blockId,
        lessonId: studioSubmissions.lessonId,
        value: count(),
      })
      .from(studioSubmissions)
      .where(eq(studioSubmissions.courseId, courseId))
      .groupBy(studioSubmissions.blockId, studioSubmissions.lessonId)
    return rows.map((r) => ({ blockId: r.blockId, lessonId: r.lessonId, count: r.value }))
  }

  async markReviewed(input: {
    userId: string
    blockId: string
    reviewed: boolean
    staffId: string | null
    now: Date
  }): Promise<boolean> {
    // Uma coluna só, pela chave única (user_id, block_id) — sem advisory lock: o
    // pior caso de dois cliques concorrentes é gravar o mesmo carimbo duas vezes.
    // Desmarcar limpa os DOIS campos (não guardamos histórico de revisão).
    const rows = await this.db
      .update(studioSubmissions)
      .set(
        input.reviewed
          ? { reviewedAt: input.now, reviewedBy: input.staffId }
          : { reviewedAt: null, reviewedBy: null },
      )
      .where(
        and(
          eq(studioSubmissions.userId, input.userId),
          eq(studioSubmissions.blockId, input.blockId),
        ),
      )
      .returning({ blockId: studioSubmissions.blockId })
    return rows.length > 0
  }

  async countByUserAndAudience(userId: string, audience: CourseAudience): Promise<number> {
    // Escopa por audiência via o curso da entrega (paridade com xp/badges/cursos do
    // dashboard dos pais — um perfil que tocasse curso de outra vitrine não infla).
    const [row] = await this.db
      .select({ value: count() })
      .from(studioSubmissions)
      .innerJoin(courses, eq(courses.id, studioSubmissions.courseId))
      .where(and(eq(studioSubmissions.userId, userId), eq(courses.audience, audience)))
    return row?.value ?? 0
  }

  async countSubmittedInPeriodByAudience(
    userId: string,
    audience: CourseAudience,
    from: Date,
    to: Date,
  ): Promise<number> {
    // "Esta semana" do report dos pais — mesma régua de audiência do count total.
    const [row] = await this.db
      .select({ value: count() })
      .from(studioSubmissions)
      .innerJoin(courses, eq(courses.id, studioSubmissions.courseId))
      .where(
        and(
          eq(studioSubmissions.userId, userId),
          eq(courses.audience, audience),
          gte(studioSubmissions.submittedAt, from),
          lt(studioSubmissions.submittedAt, to),
        ),
      )
    return row?.value ?? 0
  }

  async listAccountsSubmittedInPeriod(
    audience: CourseAudience,
    from: Date,
    to: Date,
  ): Promise<string[]> {
    // Enumeração do report: entrega na janela = atividade mesmo sem XP novo
    // (reenvio de projeto já pontuado). `account_id` legado null é descartado.
    const rows = await this.db
      .selectDistinct({ accountId: studioSubmissions.accountId })
      .from(studioSubmissions)
      .innerJoin(courses, eq(courses.id, studioSubmissions.courseId))
      .where(
        and(
          eq(courses.audience, audience),
          gte(studioSubmissions.submittedAt, from),
          lt(studioSubmissions.submittedAt, to),
        ),
      )
    return rows.map((r) => r.accountId).filter((id): id is string => Boolean(id))
  }

  async listRecentByUser(userId: string, limit: number): Promise<RecentStudioSubmission[]> {
    const rows = await this.db
      .select({
        blockId: studioSubmissions.blockId,
        blockKind: lessonBlocks.kind,
        lessonId: studioSubmissions.lessonId,
        lessonTitle: lessons.title,
        courseTitle: courses.title,
        score: studioSubmissions.score,
        checkedAt: studioSubmissions.checkedAt,
        passedAt: studioSubmissions.passedAt,
        submittedAt: studioSubmissions.submittedAt,
        message: studioSubmissions.message,
      })
      .from(studioSubmissions)
      .innerJoin(lessonBlocks, eq(lessonBlocks.id, studioSubmissions.blockId))
      .leftJoin(lessons, eq(lessons.id, studioSubmissions.lessonId))
      .leftJoin(courses, eq(courses.id, studioSubmissions.courseId))
      .where(
        and(eq(studioSubmissions.userId, userId), inArray(lessonBlocks.kind, ['studio', 'pinta'])),
      )
      .orderBy(desc(studioSubmissions.submittedAt))
      .limit(limit)
    return rows.flatMap((r) => {
      if (r.blockKind !== 'studio' && r.blockKind !== 'pinta') return []
      return [
        {
          blockId: r.blockId,
          blockKind: r.blockKind,
          lessonId: r.lessonId,
          lessonTitle: r.lessonTitle ?? null,
          courseTitle: r.courseTitle ?? null,
          score: r.score ?? null,
          passed: r.checkedAt == null ? null : r.passedAt != null,
          submittedAt: r.submittedAt,
          message: r.message ?? null,
        },
      ]
    })
  }
}
