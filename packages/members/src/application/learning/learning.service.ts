import { createHash } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  defaultLessonSection,
  evaluateLearning,
  type InteractiveBlock,
  isLearningAnswers,
  isLegacyMaterialLesson,
  type LearningAnswers,
  type LessonLearningReport,
  type LessonSection,
  learningHints,
  playbackLessonStructure,
  publicInteractiveBlock,
  readVideoCoverage,
  validateLessonSections,
} from '@sistemazero/core/learning'
import {
  applyDemonstrationSegment,
  applyExperimentSegment,
  type DemonstrationSession,
  type ExperimentSession,
  isDemonstrationCommand,
  isExperimentCommand,
  packDemonstration,
  packExperiment,
  readDemonstrationSession,
  readExperimentSession,
  readSceneSegment,
  type SceneCheckpoint,
  SceneConflictError,
  type SceneSegment,
  type SceneStart,
  type SceneStep,
  sceneModel,
} from '@sistemazero/core/learning/scene'
import { studioSectionCompletionIssues } from '@sistemazero/studio/server-project-checks'
import type { LessonWithContent } from '../../domain/course/course'
import { LessonComingSoonError, LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import { deterministicSourceId } from '../../domain/gamification/source-id'
import { LearningConflictError, LearningGateError } from '../../domain/learning/learning.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { LearningOwner, LearningRepository } from '../../domain/ports/learning-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlockedFromState } from '../lesson-locking/lesson-locking'
import type { TeacherThreadsService } from '../teacher-threads/teacher-threads.service'
import type { SectionProgressionService } from './section-progression.service'

export interface LearningActor extends LearningOwner {
  privileged: boolean
}
export interface LearningProgressInput {
  revision: string
  answers: LearningAnswers
  hintsUsed: number
  positionSeconds: number | null
}

/**
 * Este bloco é o único lugar do servidor que sabe da diferença entre uma demonstração e uma
 * experimentação. O resto do pipeline — conflito, hash do segmento, versão esperada — é
 * idêntico para as duas, e é por isso que o roteamento por TIPO precisa cobrir as duas: por
 * `version === 3` elas vinham juntas de graça, e cobrir só uma agora pararia de gravar a
 * progressão da outra sem erro nenhum aparecer.
 */
interface Cena {
  start: SceneStart
  kind: 'demonstration' | 'experimentation'
  /** O roteiro AUTORADO da demonstração; sem ele, o do modelo da cena. */
  script: readonly SceneStep[]
}
type CenaGuardada =
  | { kind: 'demonstration'; checkpoint: SceneCheckpoint<DemonstrationSession> }
  | { kind: 'experimentation'; checkpoint: SceneCheckpoint<ExperimentSession> }

/** O bloco é uma cena? Devolve por onde ela começa e de que tipo é, ou `null`. */
function sceneStartOf(content: Partial<InteractiveBlock> & { kind?: string }): Cena | null {
  if (content.kind !== 'interactive') return null
  const a = content.activity
  if (a?.type === 'demonstration')
    return {
      start: { scene: a.scene },
      kind: 'demonstration',
      script: a.script ?? sceneModel(a.scene).script,
    }
  if (a?.type === 'experimentation')
    return {
      start: {
        scene: a.scene,
        ...(a.initialImpulse === undefined ? {} : { initialImpulse: a.initialImpulse }),
      },
      kind: 'experimentation',
      script: [],
    }
  return null
}

/** Lê o que está guardado na forma da cena certa. Formato errado devolve `null`, e quem
 *  chama trata isso como conflito em vez de recomeçar por cima do trabalho da criança. */
function readSceneCheckpointOf(cena: Cena, answers: LearningAnswers): CenaGuardada | null {
  const { sceneSequence, sceneSessionId, sceneSegmentId, sceneCheckpoint } = answers
  if (!Number.isSafeInteger(sceneSequence) || Number(sceneSequence) < 0) return null
  if (typeof sceneSessionId !== 'string' || typeof sceneSegmentId !== 'string') return null
  const comum = {
    sequence: Number(sceneSequence),
    sessionId: sceneSessionId,
    segmentId: sceneSegmentId,
  }
  if (cena.kind === 'demonstration') {
    const session = readDemonstrationSession(cena.start.scene, sceneCheckpoint)
    return session ? { kind: 'demonstration', checkpoint: { ...comum, session } } : null
  }
  const session = readExperimentSession(cena.start.scene, sceneCheckpoint)
  return session ? { kind: 'experimentation', checkpoint: { ...comum, session } } : null
}

/** Aplica o segmento sobre o que estava guardado e devolve as respostas prontas para gravar. */
function applySceneSegment(
  cena: Cena,
  guardado: CenaGuardada | null,
  segment: SceneSegment,
): LearningAnswers {
  const c =
    cena.kind === 'demonstration'
      ? applyDemonstrationSegment(
          cena.start,
          cena.script,
          guardado?.kind === 'demonstration' ? guardado.checkpoint : null,
          segment,
        )
      : applyExperimentSegment(
          cena.start,
          guardado?.kind === 'experimentation' ? guardado.checkpoint : null,
          segment,
        )
  const answers: LearningAnswers = {
    sceneSequence: c.sequence,
    sceneSessionId: c.sessionId,
    sceneSegmentId: c.segmentId,
    sceneCheckpoint:
      cena.kind === 'demonstration'
        ? packDemonstration(cena.start.scene, c.session as DemonstrationSession)
        : packExperiment(cena.start.scene, c.session as ExperimentSession),
  }
  // ⚠️ O que o SERVIDOR monta também tem de caber. Numa cena cheia de cactos o checkpoint
  // passa do limite, a gravação iria ao banco em silêncio e a tentativa seguinte — que ecoa
  // estas mesmas respostas — voltaria 400 sem caminho de volta para a criança.
  if (!isLearningAnswers(answers))
    throw new ValidationError('O estado desta experiência passou do tamanho que cabe.')
  return answers
}

export class LearningService {
  constructor(
    private readonly repository: LearningRepository,
    private readonly courses: CourseRepository,
    private readonly access: CheckAccessService,
    private readonly progress: ProgressRepository,
    private readonly clock: () => Date,
    private readonly teacherThreads: TeacherThreadsService,
    readonly sections: SectionProgressionService,
  ) {}

  private async requireLesson(actor: LearningActor, lessonId: string) {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    const { course } = await this.access.requireById(
      actor.accountId,
      lesson.courseId,
      actor.privileged,
      actor.userId,
    )
    if (hasComingSoonBlock(lesson.blocks)) throw new LessonComingSoonError()
    const [completedLessonIds, outline] = await Promise.all([
      this.progress.listCompletedLessonIds(actor.userId, course.id),
      this.courses.findOutline(course.id, { publishedOnly: true }),
    ])
    assertLessonUnlockedFromState(
      course,
      lessonId,
      {
        completedLessonIds,
        orderedPublishedLessonIds: outline.flatMap((m) => m.lessons.map((l) => l.id)),
      },
      actor.privileged,
    )
    return lesson
  }

  async structure(lesson: LessonWithContent) {
    const structure = await this.repository.getStructure(lesson.id)
    return (
      structure ?? {
        revision: null,
        supportBlockIds: [],
        sections: [
          defaultLessonSection(
            lesson.id,
            lesson.title,
            lesson.blocks.map((b) => b.id),
          ),
        ],
      }
    )
  }
  async read(owner: LearningOwner, lesson: LessonWithContent) {
    const [structure, saved] = await Promise.all([
      this.structure(lesson).then((stored) => playbackLessonStructure(lesson, stored)),
      this.repository.getProgress(owner, lesson.id),
    ])
    return {
      ...structure,
      progress: {
        sectionId: structure.sections.some((s) => s.id === saved.sectionId)
          ? saved.sectionId
          : null,
        blocks: saved.blocks.filter((p) =>
          lesson.blocks.some((b) => b.id === p.blockId && b.contentRevision === p.revision),
        ),
      },
    }
  }
  async navigation(actor: LearningActor, lessonId: string, sectionId: string) {
    const lesson = await this.requireLesson(actor, lessonId)
    await this.sections.assertSection(actor, lesson, sectionId, actor.privileged)
    const structure = playbackLessonStructure(lesson, await this.structure(lesson))
    if (!structure.sections.some((s) => s.id === sectionId))
      throw new LessonNotFoundError('Seção não encontrada')
    await this.repository.saveNavigation(actor, lessonId, sectionId)
    return { ok: true }
  }
  async help(
    actor: LearningActor,
    lessonId: string,
    sectionId: string,
    body: string,
    requestId?: string,
  ) {
    const lesson = await this.requireLesson(actor, lessonId)
    await this.sections.assertSection(actor, lesson, sectionId, actor.privileged)
    const section = playbackLessonStructure(lesson, await this.structure(lesson)).sections.find(
      (s) => s.id === sectionId,
    )
    if (!section) throw new LessonNotFoundError('Seção não encontrada')
    const course = await this.courses.findCourseById(lesson.courseId)
    if (!course) throw new LessonNotFoundError()
    const progress = await this.sections.read(actor, lesson)
    const threadId = await this.teacherThreads.studentPostByContext({
      dedupeId: requestId
        ? deterministicSourceId(
            '899563d8-62ce-4e0c-8c59-40da6e90d047',
            `${actor.userId}:${lessonId}:${sectionId}:${requestId}`,
          )
        : undefined,
      helpContext: {
        courseSlug: course.slug,
        lessonId,
        sectionId,
        sectionTitle: section.title,
        revision: progress?.revision ?? null,
        pending: progress?.sections.find((s) => s.id === sectionId)?.pending ?? [],
      },
      ...actor,
      audience: course.audience,
      contextType: 'lesson_section',
      contextRef: `${lessonId}:${sectionId}`,
      lessonId,
      courseId: lesson.courseId,
      title: `${lesson.title} · ${section.title}`.slice(0, 300),
      authorName: null,
      body,
    })
    return { threadId }
  }
  async save(
    actor: LearningActor,
    lessonId: string,
    blockId: string,
    input: LearningProgressInput,
  ) {
    const lesson = await this.requireLesson(actor, lessonId)
    await this.sections.assertBlock(actor, lesson, blockId, actor.privileged)
    const block = lesson.blocks.find((b) => b.id === blockId)
    if (!block || !['interactive', 'video', 'ebook'].includes(block.content.kind))
      throw new LessonNotFoundError()
    if (block.contentRevision !== input.revision) throw new LearningConflictError()
    if (!isLearningAnswers(input.answers)) throw new ValidationError('Respostas inválidas.')
    if (block.kind === 'ebook') {
      const structure = playbackLessonStructure(lesson, await this.structure(lesson))
      const material =
        (structure.legacyLayout && isLegacyMaterialLesson(lesson.blocks)) ||
        (!structure.legacyLayout &&
          structure.sections.some(
            (s) => s.intent === 'material' && s.completion?.blockIds.includes(blockId),
          ))
      if (
        !material ||
        Object.keys(input.answers).length !== 1 ||
        !['opened', 'downloaded'].includes(String(input.answers.materialAccess))
      )
        throw new ValidationError('O acesso a este livro não é um critério desta aula.')
    }
    if (
      block.kind === 'video' &&
      Object.keys(input.answers).length &&
      (Object.keys(input.answers).some((key) => key !== 'videoDuration' && key !== 'videoRanges') ||
        !readVideoCoverage(input.answers))
    )
      throw new ValidationError('Trechos assistidos inválidos.')
    if (
      input.positionSeconds !== null &&
      (!Number.isInteger(input.positionSeconds) ||
        input.positionSeconds < 0 ||
        input.positionSeconds > 86_400)
    )
      throw new ValidationError('Posição de vídeo inválida.')
    const hintLimit = block.content.kind === 'interactive' ? learningHints(block.content).length : 0
    if (!Number.isInteger(input.hintsUsed) || input.hintsUsed < 0 || input.hintsUsed > hintLimit)
      throw new ValidationError('Quantidade de pistas inválida.')
    let answers = input.answers
    let expectedExperienceSequence: number | null | undefined
    // ⚠️ Vale para os DOIS tipos de cena. Antes a condição era `version === 3`, que cobria
    // demonstração e experimentação de uma vez; roteando só por um dos tipos irmãos, a
    // progressão do outro deixaria de ser gravada em silêncio.
    const cena = block.content.kind === 'interactive' ? sceneStartOf(block.content) : null
    if (cena) {
      const segment = readSceneSegment(input.answers)
      if (!segment) throw new ValidationError('Segmento de experiência inválido.')
      // ⚠️ Validar ANTES de aplicar. Uma demonstração não aceita gesto de criança e uma
      // experimentação não aceita comando de roteiro: mandar o comando errado é pedido mal
      // formado (400), não falha do servidor.
      const aceita = cena.kind === 'demonstration' ? isDemonstrationCommand : undefined
      for (const comando of segment.commands)
        if (aceita ? !aceita(comando) : !isExperimentCommand(comando, cena.start))
          throw new ValidationError('Comando de experiência inválido para esta atividade.')
      const saved = (await this.repository.getProgress(actor, lessonId)).blocks.find(
        (p) => p.blockId === blockId && p.revision === input.revision,
      )
      const hash = createHash('sha256').update(JSON.stringify(segment)).digest('hex')
      const guardado = saved ? readSceneCheckpointOf(cena, saved.answers) : null
      if (saved && !guardado) throw new LearningConflictError()
      // O mesmo segmento reenviado (a rede piscou) devolve o que já foi gravado, em vez de
      // aplicar duas vezes; um segmento DIFERENTE com o mesmo id é conflito de verdade.
      if (saved && guardado?.checkpoint.segmentId === segment.segmentId) {
        if (saved.answers.segmentHash !== hash) throw new LearningConflictError()
        return saved
      }
      // A base que o cliente diz conhecer tem de ser a versão atual. Duas abas abertas, ou
      // um pedido fora de ordem, caem aqui — e perder o trabalho da outra ponta seria pior
      // que recusar este.
      if (segment.baseSequence !== (guardado?.checkpoint.sequence ?? 0))
        throw new LearningConflictError()
      expectedExperienceSequence = guardado?.checkpoint.sequence ?? null
      try {
        answers = { ...applySceneSegment(cena, guardado, segment), segmentHash: hash }
      } catch (error) {
        if (error instanceof SceneConflictError) throw new LearningConflictError()
        throw error
      }
    }
    return this.repository.saveProgress({
      ...actor,
      lessonId,
      expectedExperienceSequence,
      progress: {
        blockId,
        revision: input.revision,
        answers,
        hintsUsed: input.hintsUsed,
        positionSeconds: input.positionSeconds,
        attemptsCount: 0,
        result: null,
        updatedAt: this.clock().toISOString(),
      },
    })
  }
  async attempt(
    actor: LearningActor,
    lessonId: string,
    blockId: string,
    input: Omit<LearningProgressInput, 'positionSeconds'> & { id: string },
  ) {
    const lesson = await this.requireLesson(actor, lessonId)
    await this.sections.assertBlock(actor, lesson, blockId, actor.privileged)
    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'interactive') throw new LessonNotFoundError()
    if (block.contentRevision !== input.revision) throw new LearningConflictError()
    if (
      !isLearningAnswers(input.answers) ||
      !Number.isInteger(input.hintsUsed) ||
      input.hintsUsed < 0 ||
      input.hintsUsed > learningHints(block.content).length
    )
      throw new ValidationError('Respostas inválidas.')
    const existing = await this.repository.findAttempt(actor, input.id)
    if (existing && (existing.blockId !== blockId || existing.revision !== input.revision))
      throw new LearningConflictError()
    let answers = input.answers
    if (!existing && sceneStartOf(block.content)) {
      const saved = (await this.repository.getProgress(actor, lessonId)).blocks.find(
        (p) => p.blockId === blockId && p.revision === input.revision,
      )
      // ⚠️ A tentativa de uma cena NÃO usa as respostas que o cliente mandou: ela usa o que
      // o servidor guardou. O cliente só diz QUAL versão está conferindo; se ele mandar
      // outra, é porque está atrás (ou forjando), e o certo é recusar em vez de avaliar.
      if (
        !saved ||
        saved.answers.sceneSequence !== answers.sceneSequence ||
        saved.answers.sceneSessionId !== answers.sceneSessionId ||
        saved.answers.sceneSegmentId !== answers.sceneSegmentId
      )
        throw new LearningConflictError()
      // ⚠️⚠️ A SESSÃO vem do servidor; o que a CRIANÇA respondeu vem do cliente.
      //
      // Trocar o objeto inteiro descartava `checkpoint` e `prediction` — e como a pergunta
      // anexa é justamente o que dá a palavra final sobre a conclusão, a cena com pergunta
      // ficava IMPOSSÍVEL de fechar: a criança respondia, o servidor jogava a resposta fora e
      // devolvia "agora escolha a frase", para sempre. Passou despercebido enquanto só 8 dos
      // 52 blocos tinham pergunta; com a pergunta herdada do modelo, valeria para todos.
      //
      // ⚠️ E não é furo de segurança: a sessão (`sceneSequence`, `sceneSessionId`,
      // `sceneSegmentId`, `sceneCheckpoint`) continua sendo só a do servidor, que é o que o
      // cliente poderia forjar. A resposta de múltipla escolha é o que o servidor CORRIGE — é
      // o mesmo caminho de todos os outros tipos de bloco.
      const respondido: LearningAnswers = {}
      for (const chave of ['checkpoint', 'prediction'] as const)
        if (input.answers[chave] !== undefined) respondido[chave] = input.answers[chave]
      answers = { ...saved.answers, ...respondido }
    }
    const attempt = existing ?? {
      id: input.id,
      blockId,
      revision: input.revision,
      answers,
      hintsUsed: input.hintsUsed,
      result: evaluateLearning(block.content, answers),
      createdAt: this.clock().toISOString(),
    }
    const progress = await this.repository.recordAttempt(actor, lessonId, attempt)
    const recorded = await this.repository.findAttempt(actor, input.id)
    if (!recorded) throw new LearningConflictError()
    return { attempt: recorded, progress, sectionProgress: await this.sections.read(actor, lesson) }
  }
  async checkAction(actor: LearningActor, lessonId: string, sectionId: string, revision: string) {
    const lesson = await this.requireLesson(actor, lessonId)
    const course = await this.courses.findCourseById(lesson.courseId)
    if (!course) throw new LessonNotFoundError()
    return this.sections.checkAction(actor, lesson, sectionId, revision, course.audience)
  }
  async checkProject(
    actor: LearningActor,
    lessonId: string,
    sectionId: string,
    revision: string,
    project: unknown,
  ) {
    const lesson = await this.requireLesson(actor, lessonId)
    return this.sections.checkProject(actor, lesson, sectionId, revision, project)
  }
  async assertComplete(owner: LearningOwner, lesson: LessonWithContent) {
    const required = lesson.blocks.filter(
      (b) => b.content.kind === 'interactive' && b.content.required,
    )
    if (required.length === 0) return
    const progress = await this.repository.getProgress(owner, lesson.id)
    if (
      required.some(
        (b) =>
          !progress.blocks.some(
            (p) => p.blockId === b.id && p.revision === b.contentRevision && p.result?.passed,
          ),
      )
    )
      throw new LearningGateError()
  }
  async adminStructure(lessonId: string) {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    return this.structure(lesson)
  }
  async saveStructure(
    lessonId: string,
    expectedRevision: string | null,
    sections: LessonSection[],
  ) {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    const invalid = validateLessonSections(sections, lesson.blocks)
    if (invalid) throw new ValidationError(invalid)
    if (lesson.isPublished && sections.some((s) => s.pendingMedia.length))
      throw new ValidationError('Despublique a aula antes de marcar mídias pendentes.')
    const saved = await this.repository.saveStructure(lessonId, expectedRevision, sections)
    if (!saved) throw new LearningConflictError()
    return saved
  }
  async report(owner: LearningOwner, lessonId: string): Promise<LessonLearningReport> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    const [current, attempts, sectionProgress, milestones, evidence] = await Promise.all([
      this.read(owner, lesson),
      this.repository.listAttempts(owner, lessonId),
      this.sections.read(owner, lesson),
      this.repository.getSectionProgress(owner, lessonId),
      this.evidencePage(owner, lessonId),
    ])
    return {
      ...current.progress,
      lessonId,
      lessonTitle: lesson.title,
      userId: owner.userId,
      attempts,
      sectionProgress,
      milestones,
      evidence: evidence.items,
      evidenceNextCursor: evidence.nextCursor,
      sections: current.sections,
      activities: lesson.blocks.flatMap((block) =>
        block.content.kind === 'interactive' && block.contentRevision
          ? [
              {
                id: block.id,
                revision: block.contentRevision,
                content: publicInteractiveBlock(block.content),
              },
            ]
          : [],
      ),
    }
  }
  async evidence(owner: LearningOwner, lessonId: string, id: string) {
    const evidence = await this.repository.getEvidence(owner, lessonId, id)
    if (!evidence) throw new LessonNotFoundError('Evidência não encontrada.')
    return evidence
  }
  async evidencePage(owner: LearningOwner, lessonId: string, beforeId?: string) {
    const rows = await this.repository.listEvidence(owner, lessonId, beforeId)
    const items = rows.slice(0, 100)
    return { items, nextCursor: rows.length > 100 ? (items.at(-1)?.id ?? null) : null }
  }
  async assertPublishable(lessonId: string) {
    const structure = await this.repository.getStructure(lessonId)
    if (structure?.sections.some((s) => s.pendingMedia.length))
      throw new ValidationError('Produza e vincule as mídias pendentes antes de publicar a aula.')
    if (structure) {
      const lesson = await this.courses.findLessonWithContent(lessonId)
      if (!lesson) throw new LessonNotFoundError()
      const issues = studioSectionCompletionIssues(structure.sections, lesson.blocks)
      if (issues.length) throw new ValidationError(issues.map((issue) => issue.message).join(' '))
    }
  }
}
