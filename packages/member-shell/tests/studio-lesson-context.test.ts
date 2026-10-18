import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { createEmptyProject } from '@sistemazero/studio/project'
import { IDBFactory } from 'fake-indexeddb'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'
import { apiSend } from '../src/lib/api'
import {
  confirmStudioLessonContext,
  lessonContextScope,
  resolveStudioLessonContext,
  type StudioLessonContext,
  studioLessonContextCache,
} from '../src/lib/studio-lesson-context'

const originalIndexedDB = globalThis.indexedDB
const originalFetch = globalThis.fetch
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})
afterEach(() => {
  globalThis.indexedDB = originalIndexedDB
  globalThis.fetch = originalFetch
})
const context: StudioLessonContext = {
  id: 'a'.repeat(64),
  lessonId: 'lesson',
  blockId: 'block',
  bound: true,
  configuration: { initialProject: createEmptyProject('initial', 'Aula'), pythonLevel: 2 },
}
const key = lessonContextScope('learner', 'lesson', 'block')
const input = {
  key,
  lessonId: 'lesson',
  blockId: 'block',
  cache: studioLessonContextCache,
  readLocal: async () => createEmptyProject('local', 'Meu jogo'),
  fetchCurrent: async () => context,
}

test('preparation cannot create an offline baseline; admission follows compatibility and server confirmation', async () => {
  const proposed = { ...context, bound: false }
  await resolveStudioLessonContext({ ...input, fetchCurrent: async () => proposed })
  expect(await studioLessonContextCache.read(key)).toBeNull()
  let calls = 0
  const confirm = {
    context: proposed,
    accountAvailable: true,
    key,
    cache: studioLessonContextCache,
    project: createEmptyProject('local', 'Trabalho'),
    send: async (hint: { baselineId: string; environment: unknown }) => {
      calls++
      expect(hint).toEqual({
        baselineId: context.id,
        environment: {
          formatVersion: 2,
          programmingLanguage: 'javascript',
          kind: 'classic',
        },
      })
      return context
    },
  }
  await expect(
    confirmStudioLessonContext({ ...confirm, project: documentFixture('python', 'classic') }),
  ).rejects.toThrow('outro ambiente')
  expect(calls).toBe(0)
  await confirmStudioLessonContext(confirm)
  expect(calls).toBe(1)
  expect(await studioLessonContextCache.read(key)).toEqual(context)
})

test('body connection failures recover offline, but malformed JSON and received denials do not', async () => {
  await resolveStudioLessonContext(input)
  const viaApi = {
    ...input,
    fetchCurrent: () => apiSend<StudioLessonContext>('/studio-context', 'POST'),
  }
  for (const cause of [
    new TypeError('Connection lost'),
    new DOMException('Timed out', 'TimeoutError'),
  ]) {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(cause)
          },
        }),
        { status: 200 },
      ),
    )
    expect(await resolveStudioLessonContext(viaApi)).toEqual({ context, offline: true })
  }
  spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{', { status: 200 }))
  await expect(resolveStudioLessonContext(viaApi)).rejects.toThrow(
    'Não foi possível conferir este projeto.',
  )
  spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new TypeError('Connection lost'))
        },
      }),
      { status: 403 },
    ),
  )
  await expect(resolveStudioLessonContext(viaApi)).rejects.toMatchObject({ status: 403 })
})

test('an unavailable account cannot admit a first project, but bound work still opens locally', async () => {
  let confirmations = 0
  const unavailable = {
    context: { ...context, bound: false },
    accountAvailable: false,
    project: createEmptyProject('local', 'Meu trabalho'),
    key,
    cache: studioLessonContextCache,
    send: async () => {
      confirmations++
      return context
    },
  }
  await expect(confirmStudioLessonContext(unavailable)).rejects.toThrow('navegador atualizado')
  expect(confirmations).toBe(0)
  expect(await studioLessonContextCache.read(key)).toBeNull()
  await confirmStudioLessonContext({ ...unavailable, context })
  await confirmStudioLessonContext({
    ...unavailable,
    context: { ...context, bound: false, readOnly: true },
  })
  expect(confirmations).toBe(0)
})

test('offline resumes only existing work with its previously authorized environment and owner cache', async () => {
  expect(await resolveStudioLessonContext(input)).toEqual({ context, offline: false })
  const offline = {
    ...input,
    fetchCurrent: async (): Promise<StudioLessonContext> => {
      throw new TypeError('Failed to fetch')
    },
  }
  expect(await resolveStudioLessonContext(offline)).toEqual({ context, offline: true })
  await expect(
    resolveStudioLessonContext({
      ...offline,
      key: lessonContextScope('sibling', 'lesson', 'block'),
    }),
  ).rejects.toThrow('Failed to fetch')
  await expect(
    resolveStudioLessonContext({ ...offline, readLocal: async () => null }),
  ).rejects.toThrow('Failed to fetch')
  await expect(
    resolveStudioLessonContext({
      ...offline,
      readLocal: async () => documentFixture('python', 'classic'),
    }),
  ).rejects.toThrow('Failed to fetch')
})

test.each([
  401, 403, 404, 409, 422,
])('a cached baseline never hides server denial %i', async (status) => {
  await resolveStudioLessonContext(input)
  const denied = { status, message: 'server denied' }
  await expect(
    resolveStudioLessonContext({
      ...input,
      fetchCurrent: async () => {
        throw denied
      },
    }),
  ).rejects.toBe(denied)
})

test('broken online data does not fall back; a cache write failure does not block an authorized editor', async () => {
  await resolveStudioLessonContext(input)
  await expect(
    resolveStudioLessonContext({
      ...input,
      fetchCurrent: async () => ({ ...context, blockId: 'other' }),
    }),
  ).rejects.toThrow('conferir')
  expect(
    await resolveStudioLessonContext({
      ...input,
      cache: {
        read: async () => null,
        write: async () => {
          throw new Error('quota')
        },
      },
    }),
  ).toEqual({ context, offline: false })
})

test('the authoring cache evicts old entries without storing student work', async () => {
  for (let index = 0; index < 22; index++)
    await studioLessonContextCache.write(String(index), context)
  expect(await studioLessonContextCache.read('0')).toBeNull()
  expect(await studioLessonContextCache.read('1')).toBeNull()
  expect(await studioLessonContextCache.read('21')).toEqual(context)
})
