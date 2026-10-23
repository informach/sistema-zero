import { expect, test } from 'bun:test'
import { StudioProjectCurationSchema } from '@sistemazero/core/studio/project-capabilities'
import { studioLessonBaseline } from '../../src/domain/studio/lesson-baseline'
import { authoringFixture } from '../fakes/studio-authoring-policy'

test('Python progression belongs to the immutable lesson configuration and changes its identity', async () => {
  const { project } = await authoringFixture('python', 'classic')
  const input = {
    blockId: project.id,
    lessonId: 'lesson',
    courseId: 'course',
    configuration: { initialProject: project },
  }
  const first = studioLessonBaseline(input)
  const second = studioLessonBaseline({
    ...input,
    configuration: { ...input.configuration, pythonLevel: 2 },
  })
  expect(second.configuration.pythonLevel).toBe(2)
  expect(second.configuration.initialProject).toEqual(first.configuration.initialProject)
  expect(second.id).not.toBe(first.id)
  expect(
    studioLessonBaseline({
      ...input,
      configuration: { ...input.configuration, pythonLevel: undefined },
    }).id,
  ).toBe(first.id)
  for (const invalid of [0, 4, '2', null])
    expect(StudioProjectCurationSchema.safeParse({ pythonLevel: invalid }).success).toBe(false)
  expect(StudioProjectCurationSchema.parse({ pythonLevel: 3 })).toEqual({ pythonLevel: 3 })
})
