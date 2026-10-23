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
      title: 'Before',
      slug: '',
      estimatedMinutes: null,
      sections: [],
      blocks: [],
      attachments: [],
      plannedVideos: [],
    },
  }
  let local: DraftRecovery<Text> | null = null
  const writes: (DraftRecovery<Text> | null)[] = []
  const commands: LessonDraftCommand<Text>[] = []
  const ledger = new Map<string, { body: string; revision: string; updatedAt: string }>()
  const sent = Promise.withResolvers<void>()
  const response = Promise.withResolvers<Pick<LessonDraft<Text>, 'revision' | 'updatedAt'>>()
  let quotaFailure = false
  const ports = {
    read: async () => structuredClone(server),
    readLocal: async () => structuredClone(local),
    writeLocal: async (value: DraftRecovery<Text> | null) => {
      if (quotaFailure) throw new Error('quota failed')
      local = structuredClone(value)
      writes.push(structuredClone(value))
    },
    archiveLocal: async () => {},
    send: (command: LessonDraftCommand<Text>) => {
      commands.push(structuredClone(command))
      sent.resolve()
      return response.promise
    },
  }
  const session = new LessonDraftSession<Text>(ports)
  await session.load()
  return {
    session,
    ports,
    commands,
    writes,
    sent,
    response,
    local: () => local,
    failWrites: (value: boolean) => {
      quotaFailure = value
    },
    commit: (command = commands[0]) => {
      if (!command) throw new Error('Expected an actual sent operation')
      const body = JSON.stringify(command)
      const previous = ledger.get(command.operationId)
      if (previous) {
        if (body !== previous.body) throw new Error('Operation bytes changed')
        return { revision: previous.revision, updatedAt: previous.updatedAt }
      }
      if (server.revision !== command.expectedRevision)
        throw { code: 'LESSON_DRAFT_CONFLICT', message: 'Conflict' }
      server = {
        ...server,
        revision: `r${ledger.size + 2}`,
        document: applyLessonDraftChange(server.document, command.change),
      }
      const result = { revision: server.revision, updatedAt: server.updatedAt }
      ledger.set(command.operationId, { body, ...result })
      return result
    },
  }
}

test('handoff interrupts the local flush without waiting for a retained remote ACK', async () => {
  const f = await fixture()
  f.session.enqueue(metadata('A exact uncertain envelope'))
  const flushing = f.session.flush().catch((error: unknown) => error)
  await f.sent.promise
  const first = structuredClone(f.commands[0])
  let locallyInterrupted = false
  void flushing.then((error: unknown) => {
    locallyInterrupted = error instanceof DOMException && error.name === 'AbortError'
  })
  const handoff = f.session.beginHandoff()
  handoff.seal()
  await handoff.confirmLocal()
  await handoff.retire()
  // The terminal local retirement is the observation barrier, not an arbitrary sleep or
  // an unresolved Bun matcher. Release the remote response only AFTER recording it.
  const interruptedBeforeRemoteReply = locallyInterrupted
  const capturedBeforeRemoteReply = structuredClone(f.local()?.pending[0])
  const count = f.writes.length
  f.response.resolve(f.commit())
  await f.response.promise
  const interrupted = await flushing
  expect(interruptedBeforeRemoteReply).toBe(true)
  expect(interrupted).toBeInstanceOf(DOMException)
  if (!(interrupted instanceof DOMException)) throw new Error('Expected interrupted local flush')
  expect(interrupted.name).toBe('AbortError')
  expect(capturedBeforeRemoteReply).toEqual(first)
  expect(f.writes).toHaveLength(count)
  expect(f.local()?.pending[0]).toEqual(first)
})

test('opening replay can end its local wait without replacing unadopted recovery A', async () => {
  const f = await fixture()
  f.session.enqueue(metadata('A committed with lost ACK'))
  const original = f.session.flush().catch(() => {})
  await f.sent.promise
  const committed = f.commit()
  const previous = f.session.beginHandoff()
  previous.seal()
  await previous.confirmLocal()
  await previous.retire()
  await original
  const savedA = structuredClone(f.local())
  const replayStarted = Promise.withResolvers<void>()
  const replayReply = Promise.withResolvers<typeof committed>()
  let replaySignal: AbortSignal | undefined
  const reopening = new LessonDraftSession<Text>({
    ...f.ports,
    send: (_command, signal) => {
      replaySignal = signal
      replayStarted.resolve()
      return replayReply.promise
    },
  })
  const opening = reopening.load()
  await replayStarted.promise
  reopening.interruptOpeningTransport()
  await opening
  expect(replaySignal?.aborted).toBe(true)
  expect(reopening.getSnapshot().status).toBe('error')
  expect(reopening.getSnapshot().recovery).toEqual(savedA)
  expect(reopening.canEdit()).toBe(false)
  const handoff = reopening.beginHandoff()
  expect(handoff.seal()).toEqual(savedA)
  await handoff.confirmLocal()
  await handoff.retire()
  const count = f.writes.length
  replayReply.resolve(committed)
  f.response.resolve(committed)
  await replayReply.promise
  await f.response.promise
  expect(f.writes).toHaveLength(count)
  expect(f.local()).toEqual(savedA)
})

test('interrupting opening before first send preserves A instead of starting a PATCH after disk releases', async () => {
  const f = await fixture()
  f.session.enqueue(metadata('A adopted while storage waits'))
  const firstAttempt = f.session.flush().catch(() => {})
  await f.sent.promise
  const previous = f.session.beginHandoff()
  previous.seal()
  await previous.confirmLocal()
  await previous.retire()
  await firstAttempt
  const savedA = structuredClone(f.local())
  const writeStarted = Promise.withResolvers<void>()
  const releaseWrite = Promise.withResolvers<void>()
  let held = false
  let sends = 0
  const reopening = new LessonDraftSession<Text>({
    ...f.ports,
    writeLocal: async (value) => {
      if (value && !held) {
        held = true
        writeStarted.resolve()
        await releaseWrite.promise
      }
      await f.ports.writeLocal(value)
    },
    send: async () => {
      sends++
      return { revision: 'r2', updatedAt: 'now' }
    },
  })
  const opening = reopening.load()
  await writeStarted.promise
  reopening.interruptOpeningTransport()
  releaseWrite.resolve()
  await opening
  expect(sends).toBe(0)
  expect(reopening.getSnapshot().status).toBe('error')
  const handoff = reopening.beginHandoff()
  expect(handoff.seal()).toEqual(savedA)
  await handoff.confirmLocal()
  await handoff.retire()
  expect(f.local()).toEqual(savedA)
  f.response.resolve({ revision: 'r2', updatedAt: 'now' })
  await f.response.promise
})

test.each([
  'ACK',
  'rejection',
] as const)('late %s cannot write after a confirmed handoff snapshot', async (reply) => {
  const f = await fixture()
  f.session.enqueue(metadata('A frozen'))
  const flushing = f.session.flush().catch(() => {})
  await f.sent.promise
  const handoff = f.session.beginHandoff()
  handoff.capture(metadata('C complete capture'))
  const captured = handoff.seal()
  await handoff.confirmLocal()
  await handoff.retire()
  const count = f.writes.length
  const beforeReply = f.session.getSnapshot()
  if (reply === 'ACK') f.response.resolve(f.commit())
  else f.response.reject(new Error('Uncertain transport rejection'))
  await f.response.promise.catch(() => {})
  await flushing
  expect(f.writes).toHaveLength(count)
  expect(f.session.getSnapshot()).toBe(beforeReply)
  expect(f.local()).toEqual(captured)
  expect(f.local()?.document.title).toBe('C complete capture')
  const first = f.commands[0]
  if (!first) throw new Error('Expected the actual frozen request')
  expect(f.local()?.pending[0]).toMatchObject(first)
})

test('captured bytes and confirmed local bytes are separate; failures keep retry available without sending', async () => {
  const f = await fixture()
  const handoff = f.session.beginHandoff()
  handoff.capture(metadata('Captured before quota failure'))
  const captured = handoff.seal()
  f.failWrites(true)
  expect(await handoff.confirmLocal().catch((error: unknown) => error)).toBeInstanceOf(Error)
  expect(await handoff.retire().catch((error: unknown) => error)).toBeInstanceOf(Error)
  expect(f.commands).toHaveLength(0)
  expect(f.session.getSnapshot().status).not.toBe('saved')
  f.failWrites(false)
  await handoff.confirmLocal()
  expect(f.local()).toEqual(captured)
  await handoff.retire()
  expect(f.commands).toHaveLength(0)
})

test('ordinary callbacks cannot edit a handed-off session, and sealed capture cannot change bytes', async () => {
  const f = await fixture()
  const handoff = f.session.beginHandoff()
  handoff.capture(metadata('Captured'))
  const captured = handoff.seal()
  f.session.enqueue(metadata('Late SDK callback'))
  expect(f.session.getSnapshot().draft?.document.title).toBe('Captured')
  expect(() => handoff.capture(metadata('Too late'))).toThrow()
  await handoff.confirmLocal()
  await handoff.retire()
  f.session.enqueue(metadata('After retirement'))
  expect(f.local()).toEqual(captured)
  expect(f.session.getSnapshot().draft?.document.title).toBe('Captured')
})

test.each([
  'before-commit',
  'after-commit',
] as const)('a new owner reconciles the frozen envelope at %s without the old owner writing again', async (stage) => {
  const f = await fixture()
  f.session.enqueue(metadata('A frozen'))
  const flushing = f.session.flush().catch(() => {})
  await f.sent.promise
  if (stage === 'after-commit') f.commit()
  const handoff = f.session.beginHandoff()
  handoff.capture(metadata('C complete capture'))
  handoff.seal()
  await handoff.confirmLocal()
  await handoff.retire()
  const attempts: LessonDraftCommand<Text>[] = []
  const current = new LessonDraftSession<Text>({
    ...f.ports,
    send: async (command) => {
      attempts.push(structuredClone(command))
      return f.commit(command)
    },
  })
  await current.load()
  expect(attempts[0]).toEqual(f.commands[0])
  expect(current.getSnapshot().status).toBe('saved')
  expect(current.getSnapshot().draft?.document.title).toBe('C complete capture')
  expect(current.getSnapshot().draft?.revision).toBe('r3')
  const count = f.writes.length
  f.response.resolve(f.commit())
  await f.response.promise
  await flushing
  expect(f.writes).toHaveLength(count)
  expect(f.local()).toBeNull()
})

test('handoff fences a request still waiting on local durability before its first send', async () => {
  const f = await fixture()
  const writing = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const session = new LessonDraftSession<Text>({
    ...f.ports,
    writeLocal: async (value) => {
      if (value?.pending.length) {
        writing.resolve()
        await release.promise
      }
      await f.ports.writeLocal(value)
    },
  })
  await session.load()
  session.enqueue(metadata('A frozen before wire'))
  const flushing = session.flush().catch((error: unknown) => {
    expect(error).toBeInstanceOf(DOMException)
    if (error instanceof DOMException) expect(error.name).toBe('AbortError')
  })
  await writing.promise
  const handoff = session.beginHandoff()
  handoff.capture(metadata('C complete capture'))
  handoff.seal()
  const confirming = handoff.confirmLocal()
  release.resolve()
  await Promise.all([flushing, confirming])
  await handoff.retire()
  expect(f.commands).toHaveLength(0)
  expect(f.local()?.document.title).toBe('C complete capture')
  expect(f.local()?.pending).toHaveLength(2)
})

test('a consumer cannot mutate sealed recovery bytes through the download snapshot', async () => {
  const f = await fixture()
  const handoff = f.session.beginHandoff()
  handoff.capture(metadata('Captured immutable bytes'))
  const downloaded = handoff.seal()
  if (!downloaded) throw new Error('Expected captured changes')
  downloaded.document.title = 'Changed external copy'
  downloaded.pending.length = 0
  await handoff.confirmLocal()
  expect(f.local()?.document.title).toBe('Captured immutable bytes')
  expect(f.local()?.pending).toHaveLength(1)
  await handoff.retire()
})

test('conflicting recovery not adopted into the queue is preserved by a read-only handoff', async () => {
  const f = await fixture()
  const draft = f.session.getSnapshot().draft
  if (!draft) throw new Error('Expected loaded draft')
  const previous: DraftRecovery<Text> = {
    version: 1,
    baseRevision: 'another-revision',
    document: { ...draft.document, title: 'Unmerged local copy' },
    pending: [{ operationId: 'unfrozen-command', change: metadata('Unmerged local copy') }],
  }
  await f.ports.writeLocal(previous)
  const current = new LessonDraftSession<Text>(f.ports)
  await current.load()
  expect(current.getSnapshot().status).toBe('conflict')
  const handoff = current.beginHandoff()
  expect(() => handoff.capture(metadata('Invalid overwrite'))).toThrow()
  expect(handoff.seal()).toEqual(previous)
  await handoff.confirmLocal()
  await handoff.retire()
  expect(f.local()).toEqual(previous)
  expect(f.commands).toHaveLength(0)
})

test('an unopened owner can retire pending reads without erasing recovery or sending a command', async () => {
  const f = await fixture()
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const current = new LessonDraftSession<Text>({
    ...f.ports,
    read: async () => {
      started.resolve()
      await release.promise
      return f.ports.read()
    },
  })
  const count = f.writes.length
  const loading = current.load()
  await started.promise
  await current.retireUnopened()
  release.resolve()
  await loading
  expect(current.getSnapshot().draft).toBeNull()
  expect(f.writes).toHaveLength(count)
  expect(f.commands).toHaveLength(0)
  expect(await f.session.retireUnopened().catch((error: unknown) => error)).toBeInstanceOf(Error)
})

test('handoff started by a saved-state subscriber still interrupts the original flush caller', async () => {
  const f = await fixture()
  let interrupted = false
  const unsubscribe = f.session.subscribe(() => {
    if (!interrupted && f.session.getSnapshot().status === 'saved') {
      interrupted = true
      f.session.beginHandoff()
    }
  })
  f.session.enqueue(metadata('Captured by subscriber transition'))
  let published = false
  const caller = f.session.flush().then(
    () => {
      published = true
    },
    (error: unknown) => error,
  )
  await f.sent.promise
  f.response.resolve(f.commit())
  const result = await caller
  unsubscribe()
  expect(interrupted).toBe(true)
  expect(published).toBe(false)
  expect(result).toBeInstanceOf(DOMException)
  if (result instanceof DOMException) expect(result.name).toBe('AbortError')
})

test('handoff preserves a last SDK capture behind an adopted conflicted command without sending it', async () => {
  const f = await fixture()
  f.ports.send = async (command) => {
    f.commands.push(structuredClone(command))
    return f.commit(command)
  }
  f.commit({
    operationId: 'another-author',
    expectedRevision: 'r1',
    change: metadata('Other server version'),
  })
  f.session.enqueue(metadata('A conflicted local edit'))
  const failure = await f.session.flush().catch((error: unknown) => error)
  expect(failure).toMatchObject({ code: 'LESSON_DRAFT_CONFLICT' })
  expect(f.session.getSnapshot().status).toBe('conflict')
  expect(f.session.canEdit()).toBe(false)
  const handoff = f.session.beginHandoff()
  handoff.capture(metadata('C last SDK buffer'))
  const captured = handoff.seal()
  await handoff.confirmLocal()
  await handoff.retire()
  expect(f.commands).toHaveLength(1)
  expect(f.local()).toEqual(captured)
  expect(f.local()?.pending).toHaveLength(2)
  expect(f.local()?.document.title).toBe('C last SDK buffer')
  const current = new LessonDraftSession<Text>(f.ports)
  await current.load()
  expect(current.getSnapshot().status).toBe('conflict')
  expect(current.getSnapshot().draft?.document.title).toBe('Other server version')
  expect(current.getSnapshot().recovery?.document.title).toBe('C last SDK buffer')
  expect(f.local()).toEqual(captured)
})
