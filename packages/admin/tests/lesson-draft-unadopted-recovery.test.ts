import { expect, test } from 'bun:test'
import type { LessonDraft, LessonDraftCommand } from '@sistemazero/core/learning'
import { type DraftRecovery, LessonDraftSession } from '../src/lib/lesson-draft-session'

type Text = { kind: 'rich_text'; markdown: string }
const metadata = (title: string) => ({
  type: 'metadata' as const,
  title,
  slug: '',
  estimatedMinutes: null,
})
async function fixture() {
  const server: LessonDraft<Text> = {
    lessonId: 'lesson',
    revision: 'r2',
    publishedRevision: 'p1',
    isPublished: true,
    canUndoRestore: false,
    updatedBy: 'author',
    updatedAt: 'now',
    document: {
      title: 'A already committed',
      slug: '',
      estimatedMinutes: null,
      sections: [],
      blocks: [],
      attachments: [],
      plannedVideos: [],
    },
  }
  const exact: DraftRecovery<Text> = {
    version: 1,
    baseRevision: 'r1',
    document: { ...server.document },
    pending: [
      {
        operationId: 'uncertain-A',
        expectedRevision: 'r1',
        change: metadata('A already committed'),
      },
    ],
  }
  let local: DraftRecovery<Text> | null = structuredClone(exact)
  let offline = true
  const commands: LessonDraftCommand<Text>[] = []
  const session = new LessonDraftSession<Text>({
    read: async () => structuredClone(server),
    readLocal: async () => structuredClone(local),
    writeLocal: async (value) => {
      local = structuredClone(value)
    },
    archiveLocal: async () => {},
    send: async (command) => {
      commands.push(structuredClone(command))
      if (offline) throw new Error('Replay ACK remains unavailable')
      return { revision: command.operationId === 'uncertain-A' ? 'r2' : 'r3', updatedAt: 'now' }
    },
  })
  await session.load()
  return {
    session,
    exact,
    commands,
    local: () => local,
    reconnect: () => {
      offline = false
    },
  }
}

test('ordinary editing cannot replace an uncertain recovery that has not been adopted', async () => {
  const f = await fixture()
  expect(f.session.getSnapshot().status).toBe('error')
  expect(f.session.canEdit()).toBe(false)
  f.session.enqueue(metadata('C must wait'))
  expect(f.session.getSnapshot().draft?.document.title).toBe('A already committed')
  expect(f.session.getSnapshot().recovery).toEqual(f.exact)
  expect(f.local()).toEqual(f.exact)
  f.reconnect()
  await f.session.flush()
  expect(f.session.canEdit()).toBe(true)
  expect(f.commands[1]).toEqual(f.commands[0])
  f.session.enqueue(metadata('C after confirmed replay'))
  await f.session.flush()
  expect(f.commands[2]?.change).toEqual(metadata('C after confirmed replay'))
  expect(f.commands[2]?.expectedRevision).toBe('r2')
  expect(f.session.canEdit()).toBe(true)
  expect(f.session.getSnapshot().recovery).toBeNull()
})

test('handoff cannot turn uncertain unadopted A into a different command C', async () => {
  const f = await fixture()
  const handoff = f.session.beginHandoff()
  expect(() => handoff.capture(metadata('C must wait'))).toThrow()
  expect(handoff.seal()).toEqual(f.exact)
  await handoff.confirmLocal()
  await handoff.retire()
  expect(f.local()).toEqual(f.exact)
  expect(f.commands).toHaveLength(1)
})

test('a caller waiting to synchronize cannot publish when its flush was interrupted by handoff', async () => {
  const f = await fixture()
  f.reconnect()
  await f.session.flush()
  const server = f.session.getSnapshot().draft
  if (!server) throw new Error('Expected loaded draft')
  const response = Promise.withResolvers<Pick<LessonDraft<Text>, 'revision' | 'updatedAt'>>()
  const sent = Promise.withResolvers<void>()
  let local: DraftRecovery<Text> | null = null
  const session = new LessonDraftSession<Text>({
    read: async () => server,
    readLocal: async () => local,
    writeLocal: async (value) => {
      local = structuredClone(value)
    },
    archiveLocal: async () => {},
    send: async () => {
      sent.resolve()
      return response.promise
    },
  })
  await session.load()
  session.enqueue(metadata('Waiting to publish'))
  let published = false
  const caller = session.flush().then(
    () => {
      published = true
    },
    (error: unknown) => error,
  )
  await sent.promise
  const handoff = session.beginHandoff()
  handoff.seal()
  await handoff.confirmLocal()
  await handoff.retire()
  response.resolve({ revision: 'r3', updatedAt: 'now' })
  const result = await caller
  expect(published).toBe(false)
  expect(result).toBeInstanceOf(DOMException)
  if (result instanceof DOMException) expect(result.name).toBe('AbortError')
})

test('recovery flush checks its owner again after the shared load promise resolves', async () => {
  const f = await fixture()
  f.reconnect()
  const recovery = f.session.load()
  const intervention = recovery.then(() => f.session.beginHandoff())
  let published = false
  const caller = f.session.flush().then(
    () => {
      published = true
    },
    (error: unknown) => error,
  )
  const [handoff, result] = await Promise.all([intervention, caller])
  expect(published).toBe(false)
  expect(result).toBeInstanceOf(DOMException)
  if (result instanceof DOMException) expect(result.name).toBe('AbortError')
  handoff.seal()
  await handoff.confirmLocal()
  await handoff.retire()
})
