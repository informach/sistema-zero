import type {
  Course,
  CourseAudience,
  CourseLevel,
  CourseStatus,
  CourseTrack,
  Lesson,
  LessonAttachment,
  LessonBlock,
  Module,
} from '../course/course'
import type { LessonBlockContent, LessonBlockKind } from '../course/lesson-block'

// ── Inputs de autoria ───────────────────────────────────────────────────────

export interface CourseFields {
  /** Versão devolvida pelo GET/POST anterior; obrigatória no PATCH para evitar lost updates. */
  version?: number
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  /** Página de vendas (funil) — persiste em `metadata.salesPageUrl` (jsonb). */
  salesPageUrl: string | null
  /**
   * Blocos que este curso LIBERA no Estúdio livre ao satisfazer o critério atual
   * (bônus Kids: conclusão; demais: conclusão + Mural). Persiste em
   * `metadata.studioUnlockBlocks` (jsonb, sem migração).
   * ⚠️ AUSENTE (`undefined`) **PRESERVA** a lista atual (régua do `audience`/`level`,
   * não a do `salesPageUrl`): um PATCH de build antigo do admin não pode apagar o
   * currículo do Estúdio em silêncio. `null`/`[]` LIMPA de propósito.
   */
  studioUnlockBlocks?: string[] | null
  status: CourseStatus
  /**
   * Audiência da plataforma. `null` = "não informado": no CREATE vira `adult`;
   * no UPDATE **preserva a atual** (≠ do `salesPageUrl`, que limpa quando ausente)
   * — um PATCH de build antigo do admin não pode rebaixar um curso kids em silêncio.
   */
  audience: CourseAudience | null
  /**
   * Trava sequencial (estilo Duolingo). `null` = "não informado": no CREATE vira
   * `true` (padrão LIGADO); no UPDATE **preserva a atual** (mesma régua do `audience`).
   */
  sequentialLock: boolean | null
  /**
   * Nível (dificuldade) do curso. `null` = "não informado": no CREATE vira
   * `iniciante`; no UPDATE **preserva a atual** (mesma régua do `audience`).
   */
  level: CourseLevel | null
  /**
   * Eixo 2D/3D (par com `level` = degrau pedagógico). `null` = "não informado":
   * no CREATE vira `2d`; no UPDATE **preserva o atual** (régua do `audience`).
   */
  track: CourseTrack | null
  /** Ausente no PATCH preserva; `null` remove da carreira; número define o slot. */
  careerSlot?: number | null
}

export interface ModuleFields {
  title: string
  summary: string | null
}

export interface LessonFields {
  slug: string
  title: string
  estimatedMinutes: number | null
  isPublished: boolean
}

export interface AttachmentFields {
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
}

export interface ListCoursesAdminFilter {
  q?: string
  status?: CourseStatus
  audience?: CourseAudience
  limit: number
  offset: number
}

/** Overrides do CLONE de curso para a outra plataforma (o resto copia da origem). */
export interface CloneCourseOverrides {
  slug: string
  title: string
  audience: CourseAudience
  /** `studioUnlockBlocks` é conceito kids — clone p/ adulto não o carrega. */
  dropStudioUnlockBlocks: boolean
}

/**
 * Persistência de AUTORIA (CRUD de cursos/módulos/aulas/blocos/anexos) — separada
 * do `CourseRepository` (leitura do aluno). Slug duplicado (índice único) → lança
 * `DuplicateSlugError`. Ordenação reescrita por índice em transação. `delete*` conta
 * com `onDelete: cascade` no schema; cursos/aulas também podam `lesson_completions`.
 */
export interface ContentAdminRepository {
  // ── Cursos ──
  listCoursesAdmin(filter: ListCoursesAdminFilter): Promise<{ items: Course[]; total: number }>
  createCourse(fields: CourseFields): Promise<Course>
  /**
   * CLONA a árvore completa (curso → módulos → aulas → blocos → anexos) numa
   * TRANSAÇÃO, para a plataforma destino: o clone nasce `draft`, `careerSlot`
   * null (a operadora etiqueta depois), `metadata.clonedFrom` = slug de origem;
   * sortOrders e `is_published` das aulas copiados; anexos apontam os MESMOS
   * storageRefs do R2 (objetos nunca são apagados por cascade — seguro). NÃO
   * copia dado de aluno (conclusões/entregas/ratings/threads). `null` = curso
   * de origem não existe; slug em uso → `DuplicateSlugError`.
   */
  cloneCourseTree(sourceCourseId: string, overrides: CloneCourseOverrides): Promise<Course | null>
  /** `UPDATE ... WHERE id = ? AND version = ?` → `false` se conflito. 23505 → DuplicateSlugError. */
  updateCourse(course: Course): Promise<boolean>
  deleteCourse(id: string): Promise<boolean>
  /**
   * Aulas publicadas do curso (guard: curso `published` exige ≥1 aula publicada).
   * As exclusões respondem "quantas SOBRAM se eu tirar esta aula/este módulo" —
   * usadas pelos guards de despublicar/excluir a última aula publicada.
   */
  countPublishedLessons(
    courseId: string,
    opts?: { excludeLessonId?: string; excludeModuleId?: string },
  ): Promise<number>
  /**
   * Dos cursos pedidos, quais têm ≥1 aula PUBLICADA com bloco de Estúdio de
   * vitrine (`showcase.enabled`)? Sem ela o aluno nunca publica no Mural — um
   * curso-base assim nunca qualifica o slot 1 e a etapa não destrava (o painel
   * usa isso p/ avisar o operador).
   */
  listCourseIdsWithShowcaseBlock(courseIds: string[]): Promise<string[]>

  // ── Módulos ──
  findModuleById(id: string): Promise<Module | null>
  createModule(courseId: string, fields: ModuleFields): Promise<Module>
  updateModule(id: string, fields: ModuleFields): Promise<Module | null>
  deleteModule(id: string): Promise<boolean>
  listModuleIds(courseId: string): Promise<string[]>
  reorderModules(courseId: string, orderedIds: string[]): Promise<void>

  // ── Aulas ──
  findLessonById(id: string): Promise<Lesson | null>
  createLesson(moduleId: string, courseId: string, fields: LessonFields): Promise<Lesson>
  updateLesson(id: string, fields: LessonFields): Promise<Lesson | null>
  deleteLesson(id: string): Promise<boolean>
  listLessonIds(moduleId: string): Promise<string[]>
  reorderLessons(moduleId: string, orderedIds: string[]): Promise<void>

  // ── Blocos ──
  createBlock(
    lessonId: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock>
  updateBlock(
    id: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock | null>
  deleteBlock(id: string): Promise<boolean>
  listBlockIds(lessonId: string): Promise<string[]>
  reorderBlocks(lessonId: string, orderedIds: string[]): Promise<void>
  /** Curso dono do bloco (join bloco→aula). */
  findBlockCourseId(id: string): Promise<string | null>
  /** Aula dona do bloco (join bloco→aula). */
  findBlockLessonId(id: string): Promise<string | null>
  /** Quantos blocos de certificado existem no curso (com exclusão p/ update). */
  countCertificateBlocks(courseId: string, opts?: { excludeBlockId?: string }): Promise<number>
  /** A aula contém algum bloco de certificado? (uma aula tem no máximo um certificado.) */
  lessonHasCertificateBlock(lessonId: string): Promise<boolean>
  /** A aula contém algum bloco que TRAVA a conclusão (estúdio, ou quiz com nota de corte)? */
  lessonHasGatingBlock(lessonId: string, opts?: { excludeBlockId?: string }): Promise<boolean>
  /**
   * Blocos de Pinta do curso que já usam a cadeia `chain` — em ordem de curso (módulo, aula),
   * com o TIPO do desenho inicial lido do snapshot. Usado pela autoria para recusar a cadeia
   * com tipos misturados (ver `PintaChainTypeMismatchError`).
   *
   * `assetKind` é `null` quando o snapshot é ilegível — a autoria trata como "não conflita",
   * porque um bloco quebrado não deve impedir o autor de consertar a cadeia.
   */
  listPintaChainBlocks(
    courseId: string,
    chain: string,
    opts?: { excludeBlockId?: string },
  ): Promise<{ blockId: string; lessonTitle: string; assetKind: string | null }[]>
  /**
   * Serializa a validação e a escrita de uma cadeia do Pinta. O callback recebe um
   * repositório preso à MESMA transação do lock; consultar pelo repositório externo
   * reabriria a janela de check-then-write.
   */
  withPintaChainLock<T>(
    courseId: string,
    chain: string,
    operation: (repository: ContentAdminRepository) => Promise<T>,
  ): Promise<T>

  // ── Anexos ──
  createAttachment(lessonId: string, fields: AttachmentFields): Promise<LessonAttachment>
  updateAttachment(id: string, fields: AttachmentFields): Promise<LessonAttachment | null>
  deleteAttachment(id: string): Promise<boolean>
  listAttachmentIds(lessonId: string): Promise<string[]>
  reorderAttachments(lessonId: string, orderedIds: string[]): Promise<void>
}
