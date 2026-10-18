import { createHash, randomUUID } from 'node:crypto'
import type { CourseModality } from '@sistemazero/core/course/modality'
import { ValidationError } from '@sistemazero/core/errors'
import {
  type ExecutionObjectiveRequest,
  executionProjectChecks,
  hasSectionProgression,
  isExecutionRule,
  isFinalProjectSection,
  isLegacyMaterialLesson,
  isVideoOnlySection,
  type LessonSection,
  lessonCompletionRequirements,
  PLATFORM_ACTION_LABELS,
  type ProjectObjectiveResult,
  playbackLessonStructure,
  requiredProjectChecks,
  type SectionPendingItem,
  type SectionProgressRecord,
  type SectionProgressView,
  sectionCompletionIssues,
  sectionProgressView,
  submissionFreshness,
  submissionUpToDateWorkspace,
} from '@sistemazero/core/learning'
import { evaluateStudioSectionObjectives } from '@sistemazero/studio/server-project-checks'
import type { CourseAudience, LessonWithContent } from '../../domain/course/course'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock, MAX_STUDIO_PROJECT_CHARS } from '../../domain/course/lesson-block'
import type { CreationDraftState } from '../../domain/creations/creation'
import {
  LearningConflictError,
  ProjectCheckRejectedError,
  ProjectCheckUnavailableError,
  SectionLockedError,
  StudioProjectSyncingError,
} from '../../domain/learning/learning.errors'
import type { CertificateRepository } from '../../domain/ports/certificate-repository.port'
import type { CreationsRepository } from '../../domain/ports/creations-repository.port'
import type { LearningOwner, LearningRepository } from '../../domain/ports/learning-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type {
  ProjectExecutionChecker,
  ProjectExecutionCheckOutput,
} from '../../domain/ports/project-execution-checker.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import { stableJson } from '../../domain/shared/stable-json'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import type { GamificationDeltaView } from '../mappers/views'
import type { PlatformActionService } from './platform-action.service'

/**
 * Quando uma parte com o critério "envio em dia" pode virar CONCLUÍDA de verdade (gravada).
 *
 * ⚠️ A parte concluída fica congelada, e a leitura grava em qualquer chamada (até no progresso do
 * vídeo). Se a parte marcada fosse gravada numa leitura qualquer, a última alteração da criança,
 * ainda na fila do navegador, nunca pediria o reenvio. Por isso ela só é gravada ao AVANÇAR
 * (`before`: as partes antes da que a criança abre) ou ao concluir a fase (`all`), e o player manda
 * o rascunho para a conta logo antes. Numa leitura passiva ela aparece concluída na tela (o botão
 * de seguir acende), e nada depois dela é gravado.
 */
export type SectionSettle = 'all' | { before: string }

export class SectionProgressionService {
  constructor(
    private readonly repository: LearningRepository,
    private readonly progress: ProgressRepository,
    private readonly quizzes: QuizAttemptRepository,
    private readonly submissions: StudioSubmissionRepository,
    private readonly clock: () => Date,
    private readonly actions: PlatformActionService,
    private readonly certificates: CertificateRepository,
    /** Os rascunhos da fase guardados na conta (o "envio em dia"). Sem eles, o critério deixa passar. */
    private readonly drafts?: Pick<CreationsRepository, 'getDraftStates'>,
    /**
     * A modalidade do curso da aula. No curso AO VIVO nenhuma parte tranca a seguinte: na sala
     * quem abre as partes é a professora (uma parte aberta antes de a criança concluir a anterior
     * não pode ser recusada com `SECTION_LOCKED`), e depois do encontro tudo fica livre.
     */
    private readonly courseModality?: (courseId: string) => Promise<CourseModality>,
    /** O prêmio dos objetivos (`studio_passed` + `objective_extra`). Sem ele, verificar não premia. */
    private readonly rewards?: Pick<AwardGamificationService, 'awardSectionObjectives'>,
    /**
     * Quem RODA o jogo para os objetivos de execução (o `studio-runtime`). Sem ele, uma parte com
     * esses objetivos responde "não consegui testar agora" e nada é guardado.
     */
    private readonly executor?: ProjectExecutionChecker,
    private readonly courseAudience?: (courseId: string) => Promise<CourseAudience>,
  ) {}

  /**
   * Roda os objetivos de execução no executor. O tipo e o modelo Pro vêm do projeto INICIAL do
   * bloco (o que a autora montou), nunca do que a criança mandou.
   */
  private async runExecution(
    checks: readonly { id: string; rule: { type: string } }[],
    project: unknown,
    initialProject: unknown,
    requester: string,
    screenshots = false,
  ): Promise<ProjectExecutionCheckOutput | undefined> {
    const objectives = executionProjectChecks(checks).flatMap(
      (check): ExecutionObjectiveRequest[] =>
        isExecutionRule(check.rule) ? [{ id: check.id, rule: check.rule }] : [],
    )
    if (!objectives.length) return undefined
    if (!this.executor) throw new ProjectCheckUnavailableError()
    const reference = initialProject ?? project
    const kind = projectKind(reference)
    const templateId =
      kind === 'pro' &&
      typeof reference === 'object' &&
      reference !== null &&
      typeof (reference as { proMeta?: { templateId?: unknown } }).proMeta?.templateId === 'string'
        ? ((reference as { proMeta: { templateId: string } }).proMeta.templateId as string)
        : undefined
    if (kind === 'pro' && !templateId)
      throw new ValidationError('O modelo Pro desta parte não foi escolhido.')
    return this.executor.check({
      requester,
      project,
      kind,
      ...(templateId ? { templateId } : {}),
      objectives,
      ...(screenshots ? { screenshots } : {}),
    })
  }

  /**
   * "Testar agora" da autoria: os objetivos (estrutura e execução) contra um projeto, sem guardar
   * nada nem premiar. A equipe recebe o motivo de cada objetivo e as capturas da tela.
   */
  async testObjectives(input: {
    checks: readonly {
      id: string
      rule: import('@sistemazero/core/learning').SectionObjectiveRule
      optional?: true
    }[]
    project: unknown
    initialProject?: unknown
    requester: string
  }) {
    // O gabarito precisa ser do mesmo tipo (e do mesmo modelo Pro) que o projeto inicial: a
    // criança vai receber o inicial, e um teste que passa num modelo diferente não prova nada.
    if (input.initialProject !== undefined) {
      if (projectKind(input.initialProject) !== projectKind(input.project))
        throw new ValidationError('O gabarito é de outro tipo de projeto que o inicial.')
      const template = (project: unknown) =>
        typeof project === 'object' && project !== null
          ? (project as { proMeta?: { templateId?: unknown } }).proMeta?.templateId
          : undefined
      if (
        projectKind(input.initialProject) === 'pro' &&
        template(input.initialProject) !== template(input.project)
      )
        throw new ValidationError('O gabarito usa outro modelo Pro que o projeto inicial.')
    }
    let executed: ProjectExecutionCheckOutput | undefined
    try {
      executed = await this.runExecution(
        input.checks,
        input.project,
        input.initialProject,
        input.requester,
        true,
      )
    } catch (error) {
      // A equipe precisa do MOTIVO da recusa (a criança só lê "não consegui testar").
      if (error instanceof ProjectCheckRejectedError) throw new ValidationError(error.reason)
      throw error
    }
    const evaluation = evaluateStudioSectionObjectives(
      input.checks,
      input.project,
      input.initialProject,
      executed ? new Map(executed.results.map((r) => [r.id, r.passed])) : undefined,
    )
    const details = new Map(executed?.results.map((r) => [r.id, r.detail]) ?? [])
    return {
      results: evaluation.results.map((r) => ({
        id: r.checkId,
        passed: r.passed,
        ...(details.get(r.checkId) ? { detail: details.get(r.checkId) } : {}),
      })),
      passed: evaluation.passed,
      ...(executed?.screenshots ? { screenshots: executed.screenshots } : {}),
    }
  }

  /** Impressão e hora do rascunho guardado de cada espaço de trabalho das partes marcadas. */
  private async draftStates(
    userId: string,
    workspaces: ReadonlyArray<{ blockId: string; kind: 'studio' | 'pinta' }>,
    audience: CourseAudience,
  ): Promise<Map<string, CreationDraftState>> {
    const states = new Map<string, CreationDraftState>()
    if (!this.drafts || workspaces.length === 0) return states
    const studio = workspaces.filter((w) => w.kind === 'studio').map((w) => w.blockId)
    const pinta = workspaces.filter((w) => w.kind === 'pinta').map((w) => w.blockId)
    const found = await Promise.all([
      studio.length ? this.drafts.getDraftStates(userId, 'lesson-studio', studio, audience) : [],
      pinta.length ? this.drafts.getDraftStates(userId, 'lesson-pinta', pinta, audience) : [],
    ])
    for (const state of found.flat()) states.set(state.itemId, state)
    return states
  }

  private revision(section: LessonSection, lesson: LessonWithContent) {
    return createHash('md5')
      .update(
        stableJson({
          completion: section.completion,
          blocks: lesson.blocks
            .filter((b) => section.blockIds.includes(b.id) || b.id === section.workspaceBlockId)
            .map((b) => [b.id, b.contentRevision]),
        }),
      )
      .digest('hex')
  }

  private blockRevisions(lesson: LessonWithContent) {
    return lesson.blocks.map((block) => {
      if (!block.contentRevision) throw new LearningConflictError()
      return { id: block.id, revision: block.contentRevision }
    })
  }
  /**
   * O certificado do curso já foi emitido para este perfil? Só consulta quando a aula tem o bloco.
   * Os requisitos calculados BLOCO A BLOCO (equipe, que não tem progresso por seção, e aula sem
   * critério de seção) precisam disto: sem o estado, o bloco de certificado ficava pendente para
   * sempre e o "Concluir aula" nunca destravava, mesmo depois de emitido.
   */
  async certificateIssued(userId: string, lesson: LessonWithContent): Promise<boolean> {
    if (!lesson.blocks.some((block) => block.kind === 'certificate')) return false
    return (await this.certificates.findByUserAndCourse(userId, lesson.courseId)) !== null
  }

  async isCriterion(lessonId: string, blockId: string) {
    const structure = await this.repository.getStructure(lessonId)
    return (
      structure?.sections.some((section) => section.completion?.blockIds.includes(blockId)) ?? false
    )
  }

  async read(
    owner: LearningOwner,
    lesson: LessonWithContent,
    options: { settle?: SectionSettle } = {},
  ): Promise<SectionProgressView | undefined> {
    if (hasComingSoonBlock(lesson.blocks)) return undefined
    const structure = playbackLessonStructure(lesson, await this.repository.getStructure(lesson.id))
    if (!hasSectionProgression(structure.sections)) return undefined
    const freeOrder = (await this.courseModality?.(lesson.courseId)) === 'live'
    const hasCertificateCriterion = structure.sections.some((section) =>
      section.completion?.blockIds.some((id) =>
        lesson.blocks.some((block) => block.id === id && block.kind === 'certificate'),
      ),
    )
    const [completedLessons, records, learning, quizzes, submissions, certificate] =
      await Promise.all([
        this.progress.listCompletedLessonIds(owner.userId, lesson.courseId),
        this.repository.getSectionProgress(owner, lesson.id),
        this.repository.getProgress(owner, lesson.id),
        this.quizzes.summarizeByBlockIds(
          owner.userId,
          lesson.blocks.filter((b) => b.kind === 'quiz').map((b) => b.id),
        ),
        this.submissions.summarizeByBlockIds(
          owner.userId,
          lesson.blocks.filter((b) => b.kind === 'studio' || b.kind === 'pinta').map((b) => b.id),
        ),
        hasCertificateCriterion
          ? this.certificates.findByUserAndCourse(owner.userId, lesson.courseId)
          : Promise.resolve(null),
      ])
    const completed = new Set(
      structure.legacyLayout ? [] : records.filter((r) => r.completedAt).map((r) => r.sectionId),
    )
    // A memória da lista: o último resultado de cada objetivo, só o da revisão atual da parte
    // (mudou a regra ou um bloco da parte, o resultado guardado era de outra pergunta).
    const objectiveResults = new Map<string, ProjectObjectiveResult[]>()
    for (const section of structure.sections) {
      const saved = records.find(
        (r) => r.sectionId === section.id && r.revision === this.revision(section, lesson),
      )
      if (saved?.objectiveResults?.length) objectiveResults.set(section.id, saved.objectiveResults)
    }
    if (completedLessons.includes(lesson.id)) {
      return sectionProgressView(
        structure.revision,
        structure.sections,
        new Set(structure.sections.map((s) => s.id)),
        new Map(),
        { objectiveResults },
      )
    }
    const issues = structure.legacyLayout
      ? []
      : sectionCompletionIssues(structure.sections, lesson.blocks)
    const upToDateWorkspaces = new Map(
      structure.sections.flatMap((section) => {
        if (!section.completion?.submissionUpToDate || completed.has(section.id)) return []
        const workspace = submissionUpToDateWorkspace(structure.sections, lesson.blocks, section.id)
        return workspace ? [[section.id, workspace] as const] : []
      }),
    )
    const drafts = await this.draftStates(
      owner.userId,
      [...upToDateWorkspaces.values()],
      (await this.courseAudience?.(lesson.courseId)) ?? 'kids',
    )
    const settle = options.settle
    const settleBefore =
      settle === 'all'
        ? structure.sections.length
        : settle
          ? structure.sections.findIndex((s) => s.id === settle.before)
          : -1
    const pending = new Map<string, SectionPendingItem[]>()
    const newlyComplete: SectionProgressRecord[] = []
    let reachable = true
    // Depois de uma parte "envio em dia" que fechou só na tela, nada mais é gravado nesta leitura.
    let persist = true
    for (const [index, section] of structure.sections.entries()) {
      if (completed.has(section.id)) continue
      const revision = this.revision(section, lesson)
      const criteria = section.completion
      const blocks = lesson.blocks
        .filter((b) => section.blockIds.includes(b.id) && criteria?.blockIds.includes(b.id))
        .map((b) => ({
          ...b,
          blockRevision: b.contentRevision,
          content:
            !structure.legacyLayout &&
            b.content.kind === 'interactive' &&
            criteria?.blockIds.includes(b.id)
              ? { ...b.content, required: true }
              : b.content,
          quizState: { passed: quizzes.get(b.id)?.everPassed ?? false },
          studioState: { submitted: submissions.has(b.id) },
          pintaState: { submitted: submissions.has(b.id) },
          certificateState: { issued: certificate !== null },
        }))
      const missing: SectionPendingItem[] = lessonCompletionRequirements({
        completed: false,
        blocks,
        learningProgress: learning,
        videoBlockIds: structure.legacyLayout
          ? isVideoOnlySection(section, lesson.blocks)
            ? criteria?.blockIds
            : []
          : criteria?.blockIds.filter((id) =>
              lesson.blocks.some((block) => block.id === id && block.kind === 'video'),
            ),
        materialItems: criteria?.materialItems,
        materialBlockIds:
          (structure.legacyLayout && isLegacyMaterialLesson(lesson.blocks)) ||
          (!structure.legacyLayout && section.intent === 'material')
            ? criteria?.blockIds
            : [],
      })
        .filter((r) => !r.complete)
        .map((r) => ({ kind: r.reason, text: r.action }))
      // ⚠️ Mensagem de AUTORIA (`authoring`): é para o professor; a faixa do rodapé a troca por
      // "Esta parte ainda está sendo preparada" fora do ensaio do admin.
      if (
        !structure.legacyLayout &&
        (!criteria ||
          (!criteria.blockIds.length &&
            !requiredProjectChecks(criteria.projectChecks ?? []).length &&
            !criteria.platformAction &&
            !criteria.submissionUpToDate))
      )
        missing.push({
          kind: 'authoring',
          text: 'A verificação desta seção precisa ser configurada pelo professor.',
        })
      if (criteria?.platformAction)
        missing.push({
          kind: 'platform-action',
          // Os rótulos das ações são infinitivos ("Personalizar o avatar"): a frase os leva sem
          // conjugar, e o botão citado é o do `SectionPlatformAction` do member-shell.
          text: `Depois de ${minuscula(PLATFORM_ACTION_LABELS[criteria.platformAction])}, toque em "Verificar minha ação"`,
        })
      // Só os OBRIGATÓRIOS trancam: uma parte só com desafios extras (mais outro critério, como
      // um quiz) fecharia nunca, porque sem obrigatório a verificação nunca "passa".
      if (
        requiredProjectChecks(criteria?.projectChecks ?? []).length &&
        !records.some(
          (r) => r.sectionId === section.id && r.revision === revision && r.projectPassed,
        )
      )
        missing.push({
          kind: 'project-check',
          // Neutro: o botão é "Verificar esta parte" no Kids e "Verificar esta etapa" no adulto.
          text: 'Cumpra os objetivos e verifique o seu projeto',
        })
      const workspace = upToDateWorkspaces.get(section.id)
      if (workspace) {
        const sent = submissions.get(workspace.blockId)
        const freshness = submissionFreshness({
          submission: sent
            ? { fingerprint: sent.contentFingerprint ?? null, submittedAt: sent.submittedAt }
            : null,
          draft: drafts.get(workspace.blockId) ?? null,
        })
        const trabalho = workspace.kind === 'studio' ? 'projeto' : 'desenho'
        if (freshness === 'missing')
          missing.push({
            kind:
              workspace.kind === 'studio'
                ? 'STUDIO_GATE_NOT_SUBMITTED'
                : 'PINTA_GATE_NOT_SUBMITTED',
            text: `Envie seu ${trabalho} para o professor`,
          })
        else if (freshness === 'outdated')
          missing.push({
            kind: 'submission-outdated',
            text: `Você mudou o ${trabalho} depois de enviar. Envie de novo`,
          })
      }
      missing.push(
        ...issues
          .filter((i) => i.sectionId === section.id)
          .map((i) => ({ kind: 'authoring' as const, text: i.message })),
      )
      pending.set(section.id, missing)
      if (reachable && !missing.length) {
        completed.add(section.id)
        const settles = !workspace || index < settleBefore
        if (persist && settles)
          newlyComplete.push({
            sectionId: section.id,
            revision,
            completedAt: this.clock().toISOString(),
            projectPassed: requiredProjectChecks(criteria?.projectChecks ?? []).length > 0,
          })
        if (!settles) persist = false
      } else if (!freeOrder) reachable = false
    }
    // Persist validated evidence, never the current navigation position. CAS prevents stale publication writes.
    if (!structure.legacyLayout && newlyComplete.length)
      await this.repository.saveSectionProgress(
        owner,
        lesson.id,
        structure.revision,
        newlyComplete,
        this.blockRevisions(lesson),
      )
    return sectionProgressView(structure.revision, structure.sections, completed, pending, {
      freeOrder,
      objectiveResults,
    })
  }

  async assertSection(
    owner: LearningOwner,
    lesson: LessonWithContent,
    sectionId: string,
    privileged = false,
    options: { settle?: SectionSettle } = {},
  ) {
    const state = await this.read(owner, lesson, options)
    if (!state || privileged) return state
    const section = state.sections.find((s) => s.id === sectionId)
    if (!section) throw new LessonNotFoundError('Seção não encontrada')
    if (section.status === 'locked') throw new SectionLockedError()
    return state
  }

  async accessibleBlockIds(lesson: LessonWithContent, state: SectionProgressView) {
    const structure = playbackLessonStructure(lesson, await this.repository.getStructure(lesson.id))
    if (structure.revision !== state.revision) throw new LearningConflictError()
    const ids = new Set<string>()
    for (const s of structure.sections) {
      if (state.sections.some((p) => p.id === s.id && p.status !== 'locked')) {
        for (const id of s.blockIds) ids.add(id)
        if (s.workspaceBlockId) ids.add(s.workspaceBlockId)
      }
    }
    return ids
  }

  async assertBlock(
    owner: LearningOwner,
    lesson: LessonWithContent,
    blockId: string,
    privileged = false,
    submission = false,
  ) {
    if (privileged) return
    const state = await this.read(owner, lesson)
    if (!state) return
    if (submission) {
      const structure = playbackLessonStructure(
        lesson,
        await this.repository.getStructure(lesson.id),
      )
      if (structure.revision !== state.revision) throw new LearningConflictError()
      const section = structure.sections.find((s) => s.blockIds.includes(blockId))
      if (
        !section ||
        !isFinalProjectSection(structure.sections, section.id) ||
        state.sections.find((s) => s.id === section.id)?.status === 'locked'
      )
        throw new SectionLockedError()
    } else if (!(await this.accessibleBlockIds(lesson, state)).has(blockId))
      throw new SectionLockedError()
  }

  async checkAction(
    owner: LearningOwner,
    lesson: LessonWithContent,
    sectionId: string,
    revision: string,
    audience: import('../../domain/course/course').CourseAudience,
  ) {
    await this.assertSection(owner, lesson, sectionId)
    const structure = await this.repository.getStructure(lesson.id)
    if (!structure || structure.revision !== revision) throw new LearningConflictError()
    const section = structure.sections.find((s) => s.id === sectionId)
    const action = section?.completion?.platformAction
    if (!section || !action)
      throw new ValidationError('Esta seção não possui uma ação da plataforma.')
    if (sectionCompletionIssues([section], lesson.blocks).length)
      throw new ValidationError('Os critérios desta seção precisam ser ajustados pelo professor.')
    const result = await this.actions.check(owner.userId, audience, action)
    await this.repository.saveSectionProgress(
      owner,
      lesson.id,
      revision,
      [
        {
          sectionId,
          revision: this.revision(section, lesson),
          completedAt: result.passed ? this.clock().toISOString() : null,
          projectPassed: false,
        },
      ],
      this.blockRevisions(lesson),
      {
        id: randomUUID(),
        kind: 'platform_action',
        blockId: null,
        sectionId,
        revision: this.revision(section, lesson),
        createdAt: this.clock().toISOString(),
        payload: { ...result, sectionTitle: section.title, structureRevision: revision },
      },
    )
    return { ...result, sectionProgress: await this.read(owner, lesson) }
  }

  /**
   * "Verificar esta parte": confere no SERVIDOR cada objetivo da parte no projeto enviado. A parte
   * passa quando todos os OBRIGATÓRIOS passam numa mesma verificação (`projectPassed`, pegajoso
   * dentro da revisão); os extras nunca trancam. O último resultado de cada objetivo fica guardado
   * (a lista se lembra ao reabrir a fase) e a criança recebe só `{id, passed}`, nunca a regra.
   */
  async checkProject(
    owner: LearningOwner,
    lesson: LessonWithContent,
    sectionId: string,
    revision: string,
    project: unknown,
    context: { audience: CourseAudience; privileged: boolean },
  ): Promise<{
    results: ProjectObjectiveResult[]
    passed: boolean
    sectionProgress: SectionProgressView | undefined
    gamification: GamificationDeltaView | null
  }> {
    await this.assertSection(owner, lesson, sectionId)
    const structure = await this.repository.getStructure(lesson.id)
    if (!structure || structure.revision !== revision) throw new LearningConflictError()
    const section = structure.sections.find((s) => s.id === sectionId)
    const checks = section?.completion?.projectChecks
    if (!section || !checks?.length)
      throw new ValidationError('Esta seção não possui verificação de projeto.')
    if (project === undefined || JSON.stringify(project).length > MAX_STUDIO_PROJECT_CHARS)
      throw new ValidationError('Projeto inválido ou muito grande.')
    // Conferir pelo tipo do projeto que a AULA montou: um Pro enviado a uma parte clássica (ou o
    // contrário) seria avaliado por outra régua.
    const workspace = lesson.blocks.find((b) => b.id === section.workspaceBlockId)
    const initialProject =
      workspace?.content.kind === 'studio' ? workspace.content.initialProject : undefined
    if (initialProject !== undefined && projectKind(initialProject) !== projectKind(project))
      throw new ValidationError('Este projeto não é do tipo desta parte.')
    // Código da Ponte mais novo que os blocos: os blocos ainda não refletem o que a criança
    // digitou, e o código gerado traz laços do próprio motor. O cartão espera o Estúdio terminar.
    if (
      typeof project === 'object' &&
      project !== null &&
      (project as { bridgeCodeAhead?: unknown }).bridgeCodeAhead
    )
      throw new StudioProjectSyncingError()
    // Os objetivos que RODAM o jogo vão ao executor; se ele não responder, nada é guardado.
    const executed = await this.runExecution(checks, project, initialProject, owner.userId)
    const evaluation = evaluateStudioSectionObjectives(
      checks,
      project,
      initialProject,
      executed ? new Map(executed.results.map((r) => [r.id, r.passed])) : undefined,
    )
    const results = evaluation.results.map((r) => ({ id: r.checkId, passed: r.passed }))
    const sectionRevision = this.revision(section, lesson)
    await this.repository.saveSectionProgress(
      owner,
      lesson.id,
      revision,
      [
        {
          sectionId,
          revision: sectionRevision,
          completedAt: null,
          projectPassed: evaluation.passed,
          objectiveResults: results,
        },
      ],
      this.blockRevisions(lesson),
      {
        id: randomUUID(),
        kind: 'section_project',
        blockId: section.workspaceBlockId ?? null,
        sectionId,
        revision: sectionRevision,
        createdAt: this.clock().toISOString(),
        payload: {
          sectionTitle: section.title,
          project,
          checks,
          results: evaluation.results,
          passed: evaluation.passed,
          structureRevision: revision,
        },
      },
    )
    // O prêmio pede TUDO o que passou agora e quem deduplica é o ledger (índice único por
    // usuário, tipo e fonte). Filtrar aqui pelo resultado guardado perdia o XP para sempre quando
    // o prêmio falhava uma vez: o progresso já registrava "passou" e a próxima verificação não
    // pedia de novo.
    const extraPassed = evaluation.results
      .filter((r) => r.optional && r.passed)
      .map((r) => r.checkId)
    const requiredPassed = evaluation.passed
    const gamification =
      this.rewards && (requiredPassed || extraPassed.length)
        ? await this.rewards.awardSectionObjectives({
            userId: owner.userId,
            accountId: owner.accountId,
            lessonId: lesson.id,
            sectionId,
            workspaceBlockId: section.workspaceBlockId ?? null,
            requiredPassed,
            extraPassed,
            audience: context.audience,
            privileged: context.privileged,
          })
        : null
    return {
      results,
      passed: evaluation.passed,
      sectionProgress: await this.read(owner, lesson),
      gamification,
    }
  }
}

function projectKind(value: unknown): 'classic' | 'pro' {
  return typeof value === 'object' && value !== null && (value as { kind?: unknown }).kind === 'pro'
    ? 'pro'
    : 'classic'
}

/** "Personalizar o avatar" → "personalizar o avatar", para entrar no meio da frase. */
function minuscula(texto: string) {
  return texto.charAt(0).toLowerCase() + texto.slice(1)
}
