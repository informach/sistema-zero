import { expect, test } from 'bun:test'
import {
  applyLessonDraftChange,
  type DraftBlockContent,
  defaultLessonSection,
  type LessonDraft,
  type LessonDraftCommand,
  type StudioProjectExampleChange,
} from '@sistemazero/core/learning'
import { type DraftRecovery, LessonDraftSession } from '../src/lib/lesson-draft-session'

const blockId = '11111111-1111-4111-8111-111111111111'
const sectionId = '22222222-2222-4222-8222-222222222222'
const otherSectionId = '22222222-2222-4222-8222-222222222223'
const exampleId = (n: number) => `33333333-3333-4333-8333-${String(n).padStart(12, '0')}`
const project = (code: string) => ({
  formatVersion: 2,
  id: 'one-working-project',
  kind: 'classic',
  name: 'Criar',
  files: { 'index.html': '', 'style.css': '', 'script.js': code },
  installedExtensions: [],
})
const save = (
  n: number,
  role: 'entry' | 'solution' = 'solution',
  part = sectionId,
): StudioProjectExampleChange => ({
  type: 'studio-example',
  blockId,
  sectionId: part,
  role,
  action: { type: 'save', exampleId: exampleId(n), project: project(`version ${n}`) },
})

/** Real Session + shared reducer; this models port timing, not a PostgreSQL ledger proof. */
async function fixture() {
  let server: LessonDraft<DraftBlockContent> = {
    lessonId: 'lesson',
    revision: 'r1',
    publishedRevision: 'published',
    isPublished: true,
    canUndoRestore: false,
    updatedBy: 'author',
    updatedAt: 'now',
    document: {
      title: 'Criar',
      slug: 'criar',
      estimatedMinutes: null,
      attachments: [],
      plannedVideos: [],
      blocks: [{ id: blockId, content: { kind: 'studio', initialProject: project('initial') } }],
      sections: [sectionId, otherSectionId].map((id) => ({
        ...defaultLessonSection(id, 'Criar', [blockId]),
        workspaceBlockId: blockId,
      })),
    },
  }
  let local: DraftRecovery<DraftBlockContent> | null = null
  let writeFailure = false
  const attempts: LessonDraftCommand<DraftBlockContent>[] = []
  const ledger = new Map<
    string,
    { body: string; result: Pick<LessonDraft<DraftBlockContent>, 'revision' | 'updatedAt'> }
  >()
  const commit = (command: LessonDraftCommand<DraftBlockContent>) => {
    const body = JSON.stringify(command)
    const previous = ledger.get(command.operationId)
    if (previous) {
      if (previous.body !== body) throw new Error('Operation body changed')
      return previous.result
    }
    if (command.expectedRevision !== server.revision)
      throw { code: 'LESSON_DRAFT_CONFLICT', message: 'Conflito' }
    server = {
      ...server,
      revision: `r${ledger.size + 2}`,
      document: applyLessonDraftChange(server.document, command.change),
    }
    const result = { revision: server.revision, updatedAt: server.updatedAt }
    ledger.set(command.operationId, { body, result })
    return result
  }
  let send = async (command: LessonDraftCommand<DraftBlockContent>) => commit(command)
  const session = new LessonDraftSession<DraftBlockContent>({
    read: async () => structuredClone(server),
    readLocal: async () => structuredClone(local),
    writeLocal: async (value) => {
      if (writeFailure) throw new Error('Quota exceeded')
      local = structuredClone(value)
    },
    archiveLocal: async () => {},
    send: async (command) => {
      attempts.push(structuredClone(command))
      return send(command)
    },
  })
  await session.load()
  return {
    session,
    attempts,
    commit,
    server: () => server,
    local: () => local,
    failWrites: (value: boolean) => {
      writeFailure = value
    },
    transport: (next: typeof send) => {
      send = next
    },
  }
}

test('consecutive unsent snapshots send only the latest equivalent intent and produce the same document', async () => {
  const f = await fixture()
  const expected = [save(1), save(2), save(3)].reduce(
    (document, change) => applyLessonDraftChange(document, change),
    f.server().document,
  )
  f.session.enqueue(save(1))
  f.session.enqueue(save(2))
  f.session.enqueue(save(3))
  expect(f.session.getSnapshot().draft?.document).toEqual(expected)
  await f.session.flush()
  expect(f.attempts).toHaveLength(1)
  expect(f.attempts[0]?.change).toEqual(save(3))
  expect(f.server().document).toEqual(expected)
  expect(f.session.getSnapshot().draft?.document).toEqual(f.server().document)
  expect(f.local()).toBeNull()
})

test('a frozen snapshot keeps its bytes while later equivalent snapshots coalesce behind it', async () => {
  const f = await fixture()
  const sent = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  f.transport(async (command) => {
    if (f.attempts.length === 1) {
      sent.resolve()
      await release.promise
    }
    return f.commit(command)
  })
  f.session.enqueue(save(1))
  const flushing = f.session.flush()
  await sent.promise
  const frozen = structuredClone(f.attempts[0])
  f.session.enqueue(save(2))
  f.session.enqueue(save(3))
  release.resolve()
  await flushing
  expect(f.attempts).toHaveLength(2)
  expect(f.attempts[0]).toEqual(frozen)
  expect(f.attempts[1]?.change).toEqual(save(3))
  expect(f.attempts[1]?.expectedRevision).toBe('r2')
  expect(f.attempts[1]?.operationId).not.toBe(f.attempts[0]?.operationId)
  expect(f.session.getSnapshot().draft?.document).toEqual(f.server().document)
})

test('invalid replacement is rejected before it can replace a valid pending snapshot', async () => {
  const f = await fixture()
  f.session.enqueue(save(1))
  const valid = structuredClone(f.session.getSnapshot().draft)
  if (!valid) throw new Error('Expected the loaded draft')
  expect(() => f.session.enqueue(save(1))).toThrow('imutável')
  expect(f.session.getSnapshot().draft).toEqual(valid)
  await f.session.flush()
  expect(f.attempts).toHaveLength(1)
  expect(f.attempts[0]?.change).toEqual(save(1))
  expect(f.server().document).toEqual(valid.document)
})

test('part, role, reuse and clear form barriers and preserve every ordered intention', async () => {
  const f = await fixture()
  const changes: StudioProjectExampleChange[] = [
    save(1),
    save(2, 'entry'),
    { ...save(2, 'entry'), action: { type: 'reuse', exampleId: exampleId(1) } },
    save(3, 'entry'),
    { ...save(3, 'entry'), action: { type: 'clear' } },
    save(4, 'entry'),
    save(5, 'entry', otherSectionId),
    save(6, 'entry'),
  ]
  const expected = changes.reduce(
    (document, change) => applyLessonDraftChange(document, change),
    f.server().document,
  )
  for (const change of changes) f.session.enqueue(change)
  await f.session.flush()
  expect(f.attempts.map((command) => command.change)).toEqual(changes)
  expect(f.server().document).toEqual(expected)
  expect(f.session.getSnapshot().draft?.document).toEqual(expected)
})

test('failed local confirmation prevents wire transmission and retry sends the captured snapshot', async () => {
  const f = await fixture()
  f.failWrites(true)
  f.session.enqueue(save(1))
  const failure = await f.session.flush().catch((error: unknown) => error)
  expect(failure).toBeInstanceOf(Error)
  expect(f.attempts).toHaveLength(0)
  expect(f.session.getSnapshot().status).toBe('error')
  expect(f.local()).toBeNull()
  f.failWrites(false)
  await f.session.flush()
  expect(f.attempts).toHaveLength(1)
  expect(f.attempts[0]?.change).toEqual(save(1))
  expect(f.session.getSnapshot().draft?.document).toEqual(f.server().document)
})

test('lost ACK retries the exact frozen command before sending the latest pending snapshot', async () => {
  const f = await fixture()
  f.transport(async (command) => {
    f.commit(command)
    throw new Error('Lost ACK')
  })
  f.session.enqueue(save(1))
  await f.session.flush().catch(() => {})
  const frozen = structuredClone(f.attempts[0])
  f.session.enqueue(save(2))
  f.session.enqueue(save(3))
  f.transport(async (command) => f.commit(command))
  await f.session.flush()
  expect(f.attempts).toHaveLength(3)
  expect(f.attempts[1]).toEqual(frozen)
  expect(f.attempts[2]?.change).toEqual(save(3))
  expect(f.attempts[2]?.expectedRevision).toBe('r2')
  expect(f.session.getSnapshot().draft?.document).toEqual(f.server().document)
  expect(f.session.getSnapshot().status).toBe('saved')
  expect(f.local()).toBeNull()
})
