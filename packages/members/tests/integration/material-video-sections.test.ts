import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection } from '@sistemazero/core/learning'
import type { LessonDetailView } from '../../src/application/mappers/views'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

function setup(material: boolean, legacy = false) {
  const env = buildApp(),
    course = seedSampleCourse(env.courses)
  const userId = randomUUID(),
    lessonId = course.lessonIds[0],
    blockId = randomUUID(),
    sectionId = legacy ? lessonId : randomUUID(),
    videoId = randomUUID(),
    revision = 'a'.repeat(32)
  grantLifetime(env.entitlements, { userId, courseRef: course.slug })
  env.courses.blocks = env.courses.blocks.filter((block) => block.lessonId !== lessonId)
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: material ? 'ebook' : 'video',
    contentRevision: revision,
    sortOrder: 0,
    content: material
      ? { kind: 'ebook', title: 'Meu caderno', url: 'https://example.test/caderno.pdf' }
      : { kind: 'video', src: 'https://vimeo.com/123456789', provider: 'vimeo' },
  })
  if (material)
    env.courses.blocks.push({
      id: videoId,
      lessonId,
      kind: legacy ? 'rich_text' : 'video',
      sortOrder: 1,
      contentRevision: revision,
      content: legacy
        ? { kind: 'rich_text', markdown: 'O caderno do curso.' }
        : { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/987654321' },
    })
  env.learningRepository.structures.set(lessonId, {
    revision: randomUUID(),
    sections: [
      {
        ...defaultLessonSection(sectionId, 'Material', [blockId, ...(material ? [videoId] : [])]),
        ...(legacy
          ? {}
          : {
              intent: material ? ('material' as const) : ('explanation' as const),
              completion: { version: 1, blockIds: [blockId] },
            }),
      },
    ],
  })
  const request = (path: string, method = 'GET', body?: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: { 'x-auth-user-id': userId, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const save = (answers: Record<string, string | number | boolean | string[]>) =>
    request(`/lessons/${lessonId}/blocks/${blockId}/learning-progress`, 'PUT', {
      revision,
      answers,
      hintsUsed: 0,
      positionSeconds: null,
    })
  const read = (): Promise<LessonDetailView> =>
    request(`/courses/${course.slug}/lessons/${lessonId}`).then(
      (response) => response.json() as Promise<LessonDetailView>,
    )
  const complete = () => request(`/lessons/${lessonId}/complete`, 'POST')
  return { read, save, complete }
}
describe('material and watching are distinct section criteria', () => {
  test.each([
    true,
    false,
  ])('open OR download completes the material stage without a quiz or watching gate; legacy=%s', async (legacy) => {
    for (const method of ['opened', 'downloaded']) {
      const ctx = setup(true, legacy)
      expect((await ctx.read()).sections).toHaveLength(1)
      expect((await ctx.complete()).status).not.toBe(200)
      expect((await ctx.save({ passed: true })).status).toBe(400)
      expect((await ctx.save({ materialAccess: method })).status).toBe(200)
      expect((await ctx.read()).sectionProgress?.completed).toBe(1)
      expect((await ctx.complete()).status).toBe(200)
    }
  })
  test('a new isolated video requires 90% played, including after reopening', async () => {
    const ctx = setup(false)
    expect((await ctx.save({ videoDuration: 100, videoRanges: ['90:100'] })).status).toBe(200)
    expect((await ctx.read()).sectionProgress?.completed).toBe(0)
    expect((await ctx.complete()).status).not.toBe(200)
    expect((await ctx.save({ videoDuration: 100, videoRanges: ['0:80'] })).status).toBe(200)
    expect((await ctx.read()).sectionProgress?.completed).toBe(1)
    expect((await ctx.complete()).status).toBe(200)
  })
})
