import { expect, test } from 'bun:test'
import {
  defaultLessonSection,
  ProjectStructureAnalysisLimitError,
} from '@sistemazero/core/learning'
import { PlatformActionService } from '../../src/application/learning/platform-action.service'
import { SectionProgressionService } from '../../src/application/learning/section-progression.service'
import type { LessonWithContent } from '../../src/domain/course/course'
import {
  InMemoryAvatarRepository,
  InMemoryCertificateRepository,
  InMemoryProgressRepository,
  InMemoryQuizAttemptRepository,
  InMemoryRoomRepository,
  InMemoryStudioSubmissionRepository,
} from '../fakes/in-memory'
import { InMemoryLearningRepository } from '../fakes/learning-in-memory'
import { InMemoryProfilePreferencesRepository } from '../fakes/profile-preferences-in-memory'

const pro = (files: Record<string, string>) => ({
  kind: 'pro',
  tree: Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, { kind: 'file', content }]),
  ),
})

test.each([
  ['single file', pro({ 'main.js': 'while (true) break;'.padEnd(500_001) }), pro({})],
  [
    'multiple files',
    pro({ 'a.js': '/* a */'.padEnd(250_000), 'b.js': 'while (true) break;'.padEnd(250_001) }),
    pro({}),
  ],
  ['node budget', pro({ 'main.js': 'x;'.repeat(100_001) }), pro({})],
  [
    'initial project',
    pro({ 'main.js': 'while (true) break;' }),
    pro({ 'main.js': '/* a */'.padEnd(500_001) }),
  ],
] as const)('an incomplete %s analysis cannot persist objectives or award XP', async (_case, project, initial) => {
  const repository = new InMemoryLearningRepository()
  const section = {
    ...defaultLessonSection('section', 'Parte', ['workspace']),
    workspaceBlockId: 'workspace',
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [
        { id: 'loop', label: 'Acrescente uma repetição', rule: { type: 'usesLoop' as const } },
      ],
    },
  }
  repository.structures.set('lesson', { revision: 'revision', sections: [section] })
  const lesson: LessonWithContent = {
    id: 'lesson',
    moduleId: 'module',
    courseId: 'course',
    slug: 'lesson',
    title: 'Aula',
    sortOrder: 0,
    estimatedMinutes: null,
    isPublished: true,
    attachments: [],
    blocks: [
      {
        id: 'workspace',
        lessonId: 'lesson',
        sortOrder: 0,
        kind: 'studio',
        contentRevision: 'block-revision',
        content: { kind: 'studio', initialProject: initial },
      },
    ],
  }
  let awards = 0
  const service = new SectionProgressionService(
    repository,
    new InMemoryProgressRepository(),
    new InMemoryQuizAttemptRepository(),
    new InMemoryStudioSubmissionRepository(),
    () => new Date('2026-10-18T00:00:00Z'),
    new PlatformActionService(
      new InMemoryAvatarRepository(),
      new InMemoryRoomRepository(),
      new InMemoryProfilePreferencesRepository(),
    ),
    new InMemoryCertificateRepository(),
    undefined,
    undefined,
    {
      awardSectionObjectives: async () => {
        awards++
        throw new Error('Unexpected award')
      },
    },
  )
  const error = await service
    .checkProject(
      { userId: 'student', accountId: 'account' },
      lesson,
      'section',
      'revision',
      project,
      { audience: 'kids', privileged: false },
    )
    .then(
      () => null,
      (failure: unknown) => failure,
    )
  expect(error).toBeInstanceOf(ProjectStructureAnalysisLimitError)
  expect(repository.sectionProgress.size).toBe(0)
  expect(repository.evidence.size).toBe(0)
  expect(awards).toBe(0)
})
