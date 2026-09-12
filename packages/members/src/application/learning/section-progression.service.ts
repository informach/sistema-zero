import { createHash, randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  hasSectionProgression,
  isFinalProjectSection,
  isLegacyMaterialLesson,
  isVideoOnlySection,
  type LessonSection,
  lessonCompletionRequirements,
  PLATFORM_ACTION_LABELS,
  playbackLessonStructure,
  type SectionProgressRecord,
  type SectionProgressView,
  sectionCompletionIssues,
  sectionProgressView,
} from '@sistemazero/core/learning'
import type { LessonWithContent } from '../../domain/course/course'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock, MAX_STUDIO_PROJECT_CHARS } from '../../domain/course/lesson-block'
import { gradeStudioActivity } from '../../domain/course/studio-activity'
import { LearningConflictError, SectionLockedError } from '../../domain/learning/learning.errors'
import type { LearningOwner, LearningRepository } from '../../domain/ports/learning-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import { stableJson } from '../../domain/shared/stable-json'
import type { PlatformActionService } from './platform-action.service'

export class SectionProgressionService {
  constructor(
    private readonly repository: LearningRepository,
    private readonly progress: ProgressRepository,
    private readonly quizzes: QuizAttemptRepository,
    private readonly submissions: StudioSubmissionRepository,
    private readonly clock: () => Date,
    private readonly actions: PlatformActionService,
  ) {}

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
  async isCriterion(lessonId: string, blockId: string) {
    const structure = await this.repository.getStructure(lessonId)
    return (
      structure?.sections.some((section) => section.completion?.blockIds.includes(blockId)) ?? false
    )
  }

  async read(
    owner: LearningOwner,
    lesson: LessonWithContent,
  ): Promise<SectionProgressView | undefined> {
    if (hasComingSoonBlock(lesson.blocks)) return undefined
    const structure = playbackLessonStructure(lesson, await this.repository.getStructure(lesson.id))
    if (!hasSectionProgression(structure.sections)) return undefined
    const [completedLessons, records, learning, quizzes, submissions] = await Promise.all([
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
    ])
    const completed = new Set(
      structure.legacyLayout ? [] : records.filter((r) => r.completedAt).map((r) => r.sectionId),
    )
    if (completedLessons.includes(lesson.id)) {
      return sectionProgressView(
        structure.revision,
        structure.sections,
        new Set(structure.sections.map((s) => s.id)),
        new Map(),
      )
    }
    // Publication enforces the new authoring policy; existing hybrid activities keep
    // their published grading contract until the author publishes a compatible revision.
    const issues = structure.legacyLayout
      ? []
      : sectionCompletionIssues(structure.sections, lesson.blocks, {
          purpose: 'playback',
        })
    const pending = new Map<string, string[]>()
    const newlyComplete: SectionProgressRecord[] = []
    let reachable = true
    for (const section of structure.sections) {
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
          studioState: {
            submitted: submissions.has(b.id),
            passed: submissions.get(b.id)?.passed ?? false,
          },
          pintaState: { submitted: submissions.has(b.id) },
        }))
      const missing = lessonCompletionRequirements({
        completed: false,
        blocks,
        learningProgress: learning,
        videoBlockIds: isVideoOnlySection(section, lesson.blocks) ? criteria?.blockIds : [],
        materialBlockIds:
          (structure.legacyLayout && isLegacyMaterialLesson(lesson.blocks)) ||
          (!structure.legacyLayout && section.intent === 'material')
            ? criteria?.blockIds
            : [],
      })
        .filter((r) => !r.complete)
        .map((r) => r.action)
      if (
        !structure.legacyLayout &&
        (!criteria ||
          (!criteria.blockIds.length &&
            !criteria.projectChecks?.length &&
            !criteria.platformAction))
      )
        missing.push('A verificação desta seção precisa ser configurada pelo professor.')
      if (criteria?.platformAction)
        missing.push(`${PLATFORM_ACTION_LABELS[criteria.platformAction]} e verificar a ação.`)
      if (
        criteria?.projectChecks?.length &&
        !records.some(
          (r) => r.sectionId === section.id && r.revision === revision && r.projectPassed,
        )
      )
        missing.push('Verifique o objetivo desta etapa no seu projeto.')
      missing.push(...issues.filter((i) => i.sectionId === section.id).map((i) => i.message))
      pending.set(section.id, missing)
      if (reachable && !missing.length) {
        completed.add(section.id)
        newlyComplete.push({
          sectionId: section.id,
          revision,
          completedAt: this.clock().toISOString(),
          projectPassed: Boolean(criteria?.projectChecks?.length),
        })
      } else reachable = false
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
    return sectionProgressView(structure.revision, structure.sections, completed, pending)
  }

  async assertSection(
    owner: LearningOwner,
    lesson: LessonWithContent,
    sectionId: string,
    privileged = false,
  ) {
    const state = await this.read(owner, lesson)
    if (!state || privileged) return state
    const section = state.sections.find((s) => s.id === sectionId)
    if (!section) throw new LessonNotFoundError('Seção não encontrada')
    if (section.status === 'locked') throw new SectionLockedError()
    return state
  }

  async accessibleBlockIds(lesson: LessonWithContent, state: SectionProgressView) {
    const structure = playbackLessonStructure(lesson, await this.repository.getStructure(lesson.id))
    if (structure.revision !== state.revision) throw new LearningConflictError()
    const ids = new Set(structure.supportBlockIds ?? [])
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

  async checkProject(
    owner: LearningOwner,
    lesson: LessonWithContent,
    sectionId: string,
    revision: string,
    project: unknown,
  ) {
    await this.assertSection(owner, lesson, sectionId)
    const structure = await this.repository.getStructure(lesson.id)
    if (!structure || structure.revision !== revision) throw new LearningConflictError()
    const section = structure.sections.find((s) => s.id === sectionId)
    const checks = section?.completion?.projectChecks
    if (!section || !checks?.length)
      throw new ValidationError('Esta seção não possui verificação de projeto.')
    if (project === undefined || JSON.stringify(project).length > MAX_STUDIO_PROJECT_CHARS)
      throw new ValidationError('Projeto inválido ou muito grande.')
    const result = gradeStudioActivity(
      {
        instructions: section.objective,
        passingScore: 100,
        checks: checks.map((c) => ({ ...c, kind: 'structure' })),
      },
      project,
      [],
    )
    await this.repository.saveSectionProgress(
      owner,
      lesson.id,
      revision,
      [
        {
          sectionId,
          revision: this.revision(section, lesson),
          completedAt: null,
          projectPassed: result.passed,
        },
      ],
      this.blockRevisions(lesson),
      {
        id: randomUUID(),
        kind: 'section_project',
        blockId: section.workspaceBlockId ?? null,
        sectionId,
        revision: this.revision(section, lesson),
        createdAt: this.clock().toISOString(),
        payload: {
          sectionTitle: section.title,
          project,
          checks,
          results: result.results,
          passed: result.passed,
          structureRevision: revision,
        },
      },
    )
    return {
      results: result.results,
      passed: result.passed,
      sectionProgress: await this.read(owner, lesson),
    }
  }
}
