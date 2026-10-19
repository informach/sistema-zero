import { expect, test } from 'bun:test'
import {
  applyLessonDraftChange,
  type LessonDraft,
  type LessonDraftCommand,
} from '@sistemazero/core/learning'
import { type DraftRecovery, LessonDraftSession } from '../src/lib/lesson-draft-session'

type Text = { kind: 'rich_text'; markdown: string }
const metadata = (title: string) => ({
  type: 'metadata' as const,
  title,
  slug: '',
  estimatedMinutes: null,
})

/** Real Session/Core with retained-response memory ports; not native HTTP/SQL/IDB. */
async function fixture() {
  let server: LessonDraft<Text> = {
    lessonId: 'lesson',
    revision: 'r1',
    publishedRevision: 'p1',
    isPublished: true,
    canUndoRestore: false,
    updatedBy: 'author',
    updatedAt: 'now',
    document: {
      title: 'before',
      slug: '',
      estimatedMinutes: null,
      sections: [],
      blocks: [],
      attachments: [],
      plannedVideos: [],
    },
  }
  let local: DraftRecovery<Text> | null = null
  const sent = Promise.withResolvers<void>()
  const response = Promise.withResolvers<Pick<LessonDraft<Text>, 'revision' | 'updatedAt'>>()
  const commands: LessonDraftCommand<Text>[] = []
  const writes: (DraftRecovery<Text> | null)[] = []
  const ledger = new Map<
    string,
    { body: string; result: Pick<LessonDraft<Text>, 'revision' | 'updatedAt'> }
  >()
  function commit(command: LessonDraftCommand<Text>) {
    const body = JSON.stringify(command)
    const previous = ledger.get(command.operationId)
    if (previous) {
      if (previous.body !== body) throw new Error('Changed operation identity/body')
      return previous.result
    }
    if (command.expectedRevision !== server.revision)
      throw { code: 'LESSON_DRAFT_CONFLICT', message: 'conflict' }
    server = {
      ...server,
      revision: `r${ledger.size + 2}`,
      document: applyLessonDraftChange(server.document, command.change),
    }
    const result = { revision: server.revision, updatedAt: 'now' }
    ledger.set(command.operationId, { body, result })
    return result
  }
  const ports = {
    read: async () => structuredClone(server),
    readLocal: async () => structuredClone(local),
    writeLocal: async (value: DraftRecovery<Text> | null) => {
      local = structuredClone(value)
      writes.push(structuredClone(value))
    },
    archiveLocal: async () => {},
    send: (command: LessonDraftCommand<Text>) => {
      commands.push(structuredClone(command))
      if (commands.length === 1) {
        sent.resolve()
        return response.promise
      }
      return Promise.resolve(commit(command))
    },
  }
  const session = new LessonDraftSession<Text>(ports)
  await session.load()
  return { session, ports, sent, response, commands, writes, local: () => local, commit }
}

test.each([
  'before-commit',
  'after-commit',
] as const)('pre-seal resume preserves uncertain A and valid captured C at %s', async (when) => {
  const f = await fixture()
  f.session.enqueue(metadata('A uncertain'))
  const originalFlush = f.session.flush().catch((error: unknown) => error)
  await f.sent.promise
  const first = f.commands[0]
  if (!first) throw new Error('Expected frozen operation A')
  if (when === 'after-commit') f.commit(first)
  const capture = f.session.beginHandoff()
  capture.capture(metadata('C captured before a later form failed'))
  if (!('resume' in capture) || typeof capture.resume !== 'function')
    throw new Error('Expected an explicit pre-seal resume capability')
  await capture.resume()
  expect(await originalFlush).toBeInstanceOf(DOMException)
  expect(f.session.canEdit()).toBe(true)
  expect(() => capture.capture(metadata('stale callback'))).toThrow()
  await f.session.flush()
  expect(f.commands[1]).toEqual(first)
  expect(f.commands[2]?.change).toEqual(metadata('C captured before a later form failed'))
  expect(f.session.getSnapshot().draft?.document.title).toBe(
    'C captured before a later form failed',
  )
  expect(f.session.getSnapshot().status).toBe('saved')
  const count = f.writes.length
  f.response.resolve(f.commit(first))
  await f.response.promise
  expect(f.writes).toHaveLength(count)
  expect(f.local()).toBeNull()
})

test('pre-seal resume never turns unadopted uncertain recovery A into editable C', async () => {
  const f = await fixture()
  f.session.enqueue(metadata('A lost response'))
  const original = f.session.flush().catch(() => {})
  await f.sent.promise
  const first = f.commands[0]
  if (!first) throw new Error('Expected operation A')
  const committed = f.commit(first)
  const previous = f.session.beginHandoff()
  previous.seal()
  await previous.confirmLocal()
  await previous.retire()
  await original
  const savedA = structuredClone(f.local())
  const reopening = new LessonDraftSession<Text>({
    ...f.ports,
    send: () => Promise.reject(new Error('replay outcome still unknown')),
  })
  await reopening.load()
  const capture = reopening.beginHandoff()
  await capture.resume()
  expect(reopening.canEdit()).toBe(false)
  expect(reopening.getSnapshot().status).toBe('error')
  reopening.enqueue(metadata('C must not replace A'))
  expect(reopening.getSnapshot().recovery).toEqual(savedA)
  expect(() => capture.capture(metadata('old capability'))).toThrow()
  const next = reopening.beginHandoff()
  expect(next.seal()).toEqual(savedA)
  await next.confirmLocal()
  await next.retire()
  f.response.resolve(committed)
  await f.response.promise
})

test('a sealed capture refuses resume and keeps its immutable bytes', async () => {
  const f = await fixture()
  const capture = f.session.beginHandoff()
  const sealed = capture.seal()
  if (!('resume' in capture) || typeof capture.resume !== 'function')
    throw new Error('Expected an explicit pre-seal resume capability')
  const rejected = await capture.resume().catch((error: unknown) => error)
  expect(rejected).toBeInstanceOf(Error)
  expect(capture.seal()).toEqual(sealed)
  expect(f.session.canEdit()).toBe(false)
  await capture.confirmLocal()
  await capture.retire()
})
