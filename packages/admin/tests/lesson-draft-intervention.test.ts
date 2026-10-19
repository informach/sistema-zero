import { expect, test } from 'bun:test'
import {
  applyLessonDraftChange,
  type LessonDraft,
  type LessonDraftCommand,
} from '@sistemazero/core/learning'
import { type DraftRecovery, LessonDraftSession } from '../src/lib/lesson-draft-session'

type Text = { kind: 'rich_text'; markdown: string }
function fixture() {
  let server: LessonDraft<Text> = {
    lessonId: 'lesson',
    revision: 'r1',
    publishedRevision: 'p1',
    isPublished: true,
    canUndoRestore: false,
    updatedBy: 'author',
    updatedAt: 'now',
    document: {
      title: 'Before',
      slug: 'before',
      estimatedMinutes: null,
      sections: [],
      blocks: [],
      attachments: [],
      plannedVideos: [],
    },
  }
  let local: DraftRecovery<Text> | null = null
  const archived: DraftRecovery<Text>[] = []
  const faults = { archive: false, clear: false, read: false }
  const commands: LessonDraftCommand<Text>[] = []
  let transport = async (command: LessonDraftCommand<Text>) => {
    server = {
      ...server,
      revision: 'r2',
      document: applyLessonDraftChange(server.document, command.change),
    }
    return { revision: server.revision, updatedAt: server.updatedAt }
  }
  const session = new LessonDraftSession<Text>({
    read: async () => {
      if (faults.read) throw new Error('read failed')
      return structuredClone(server)
    },
    readLocal: async () => structuredClone(local),
    writeLocal: async (value) => {
      if (faults.clear && value === null) throw new Error('clear failed')
      local = structuredClone(value)
    },
    archiveLocal: async (value) => {
      if (faults.archive) throw new Error('archive failed')
      archived.push(structuredClone(value))
    },
    send: async (command) => {
      commands.push(structuredClone(command))
      return transport(command)
    },
  })
  return {
    session,
    commands,
    faults,
    archived,
    local: () => local,
    server: () => server,
    seedRecovery: (value: DraftRecovery<Text>) => {
      local = structuredClone(value)
    },
    transport: (next: typeof transport) => {
      transport = next
    },
    commit: (command: LessonDraftCommand<Text>) => {
      server = {
        ...server,
        revision: 'r2',
        document: applyLessonDraftChange(server.document, command.change),
      }
    },
  }
}
const metadata = {
  type: 'metadata' as const,
  title: 'A pending',
  slug: 'before',
  estimatedMinutes: null,
}

test.each([
  'before-commit',
  'after-commit-before-ack',
] as const)('restore cannot discard an in-flight command at %s', async (holdAt) => {
  const f = fixture()
  const sent = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  f.transport(async (command) => {
    if (holdAt === 'after-commit-before-ack') f.commit(command)
    sent.resolve()
    await release.promise
    if (holdAt === 'before-commit') f.commit(command)
    return { revision: 'r2', updatedAt: 'now' }
  })
  await f.session.load()
  f.session.enqueue(metadata)
  const flushing = f.session.flush()
  await sent.promise
  try {
    expect(await f.session.restoreServerVersion().catch((error: unknown) => error)).toBeInstanceOf(
      Error,
    )
    expect(f.local()?.pending[0]?.operationId).toBe(f.commands[0]?.operationId)
    expect(f.session.getSnapshot().status).not.toBe('saved')
    expect(f.archived).toEqual([])
  } finally {
    release.resolve()
    await flushing
  }
  expect(f.session.getSnapshot().draft?.document.title).toBe('A pending')
  expect(f.server().document.title).toBe('A pending')
})

test('lost ACK keeps exact retry intent and does not turn restore into a hidden replay', async () => {
  const f = fixture()
  f.transport(async (command) => {
    f.commit(command)
    throw new Error('lost ACK')
  })
  await f.session.load()
  f.session.enqueue(metadata)
  await f.session.flush().catch(() => {})
  const before = f.local()
  expect(await f.session.restoreServerVersion().catch((error: unknown) => error)).toBeInstanceOf(
    Error,
  )
  expect(f.commands).toHaveLength(1)
  expect(f.local()).toEqual(before)
  f.transport(async () => ({ revision: 'r2', updatedAt: 'now' }))
  await f.session.flush()
  expect(f.commands[1]).toEqual(f.commands[0])
  expect(f.session.getSnapshot().status).toBe('saved')
})

test.each([
  'archive',
  'clear',
  'read',
] as const)('failed intervention at %s retains the local intent and never reports saved', async (stage) => {
  const f = fixture()
  await f.session.load()
  f.transport(async () => {
    throw { code: 'LESSON_DRAFT_CONFLICT', message: 'conflict' }
  })
  f.session.enqueue(metadata)
  await f.session.flush().catch(() => {})
  const before = f.session.getSnapshot().recovery
  if (!before) throw new Error('Expected the conflict recovery')
  f.faults[stage] = true
  expect(await f.session.restoreServerVersion().catch((error: unknown) => error)).toBeInstanceOf(
    Error,
  )
  expect(f.session.getSnapshot().status).toBe('conflict')
  expect(f.session.getSnapshot().recovery).toEqual(before)
  expect(f.session.getSnapshot().draft?.document.title).toBe('A pending')
  if (stage !== 'archive') expect(f.archived[0]).toEqual(before)
  if (stage !== 'read') expect(f.local()).toEqual(before)
  f.faults[stage] = false
  await f.session.restoreServerVersion()
  expect(f.session.getSnapshot().draft?.document.title).toBe('Before')
  expect(f.session.getSnapshot().status).toBe('saved')
  expect(f.local()).toBeNull()
})

test('unknown recovery replay can be explicitly retried without silently dropping it as saved', async () => {
  const f = fixture()
  const recovery: DraftRecovery<Text> = {
    version: 1,
    baseRevision: 'old-revision',
    document: { ...f.server().document, title: 'A pending' },
    pending: [{ operationId: 'exact-replay', expectedRevision: 'old-revision', change: metadata }],
  }
  f.seedRecovery(recovery)
  f.transport(async (command) => {
    f.commit(command)
    throw new Error('lost ACK')
  })
  await f.session.load()
  expect(f.session.getSnapshot().status).toBe('error')
  expect(f.local()).toEqual(recovery)
  expect(await f.session.restoreServerVersion().catch((error: unknown) => error)).toBeInstanceOf(
    Error,
  )
  expect(f.commands).toHaveLength(1)
  // The normal retry rechecks the fresh revision, instead of treating an empty adopted queue as saved.
  f.transport(async () => ({ revision: 'r2', updatedAt: 'now' }))
  await f.session.flush()
  expect(f.commands[1]).toEqual(f.commands[0])
  expect(f.session.getSnapshot().status).toBe('saved')
  expect(f.session.getSnapshot().draft?.document.title).toBe('A pending')
  expect(f.local()).toBeNull()
})

test('concurrent loads share their recovery send; dispose followed by load waits for the retired owner', async () => {
  const f = fixture()
  const recovery: DraftRecovery<Text> = {
    version: 1,
    baseRevision: 'old-revision',
    document: { ...f.server().document, title: 'A pending' },
    pending: [{ operationId: 'exact-replay', expectedRevision: 'old-revision', change: metadata }],
  }
  f.commit({ operationId: 'exact-replay', expectedRevision: 'old-revision', change: metadata })
  f.seedRecovery(recovery)
  const sent = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  f.transport(async () => {
    sent.resolve()
    await release.promise
    return { revision: 'r2', updatedAt: 'now' }
  })
  const first = f.session.load()
  const second = f.session.load()
  expect(second).toBe(first)
  await sent.promise
  f.session.dispose()
  const current = f.session.load()
  release.resolve()
  await Promise.all([first, second, current])
  expect(f.commands).toHaveLength(2)
  expect(f.commands[1]).toEqual(f.commands[0])
  expect(f.session.getSnapshot().status).toBe('saved')
})
