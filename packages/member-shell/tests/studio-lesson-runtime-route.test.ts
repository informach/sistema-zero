import { expect, mock, test } from 'bun:test'
import type { StudioLessonRuntimeRequest } from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'

mock.module('server-only', () => ({}))
const { createStudioLessonRuntimeRoutes } = await import('../src/routes/studio-lesson-runtime')
const context = { params: Promise.resolve({ lessonId: 'lesson', blockId: 'block' }) }
const input: StudioLessonRuntimeRequest = {
  baselineId: 'a'.repeat(64),
  operation: 'execute',
  revision: 'b'.repeat(64),
  subject: studioRuntimeSubject(documentFixture('python', 'pro')),
}
const request = (value: unknown) =>
  new Request('https://app.test/api/studio-runtime', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  })

test('runtime BFF forwards only the compact candidate and preserves server denials without caching', async () => {
  const calls: { lessonId: string; blockId: string; input: StudioLessonRuntimeRequest }[] = []
  const body = { error: { code: 'ACCESS_DENIED', message: 'Acesso revogado.' } }
  const routes = createStudioLessonRuntimeRoutes({
    async authorizeLessonRuntime(lessonId, blockId, input) {
      calls.push({ lessonId, blockId, input })
      return { status: 403, body }
    },
  })
  const response = await routes.POST(request(input), context)
  expect(response.status).toBe(403)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.json()).toEqual(body)
  expect(calls).toEqual([{ lessonId: 'lesson', blockId: 'block', input }])
  const injected = await routes.POST(request({ ...input, actor: { userId: 'other' } }), context)
  expect(injected.status).toBe(400)
  expect(calls.length).toBe(1)
})

test('runtime BFF bounds JSON and refuses whole-project transport and malformed bodies', async () => {
  let calls = 0
  const routes = createStudioLessonRuntimeRoutes({
    async authorizeLessonRuntime() {
      calls++
      return { status: 200, body: {} }
    },
  })
  expect(
    (await routes.POST(request({ ...input, project: documentFixture('python', 'pro') }), context))
      .status,
  ).toBe(400)
  expect(
    (await routes.POST(request({ ...input, ignored: 'x'.repeat(2_000_000) }), context)).status,
  ).toBe(413)
  expect(
    (
      await routes.POST(
        new Request('https://app.test', {
          method: 'POST',
          body: '{',
          headers: { 'content-type': 'application/json' },
        }),
        context,
      )
    ).status,
  ).toBe(400)
  expect(
    (await routes.POST(new Request('https://app.test', { method: 'POST', body: '{}' }), context))
      .status,
  ).toBe(400)
  expect(calls).toBe(0)
})
