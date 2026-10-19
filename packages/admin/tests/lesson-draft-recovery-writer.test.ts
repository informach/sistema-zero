import { expect, test } from 'bun:test'
import { LessonDraftRecoveryWriter } from '../src/lib/lesson-draft-recovery-writer'
import type { DraftRecovery } from '../src/lib/lesson-draft-session'

type Text = { kind: 'rich_text'; markdown: string }
function recovery(title: string): DraftRecovery<Text> {
  return {
    version: 1,
    baseRevision: 'r1',
    document: {
      title,
      slug: 'aula',
      estimatedMinutes: null,
      blocks: [],
      sections: [],
      attachments: [],
      plannedVideos: [],
    },
    pending: [
      {
        operationId: title,
        expectedRevision: 'r1',
        change: { type: 'metadata', title, slug: 'aula', estimatedMinutes: null },
      },
    ],
  }
}

test('slow storage writes A and the latest C, without writing superseded intermediate recoveries', async () => {
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const writes: (DraftRecovery<Text> | null)[] = []
  const writer = new LessonDraftRecoveryWriter<Text>(
    async (value) => {
      writes.push(structuredClone(value))
      if (writes.length === 1) {
        started.resolve()
        await release.promise
      }
    },
    () => {},
  )
  writer.request(recovery('A'))
  await started.promise
  for (let i = 0; i < 100; i++) writer.request(recovery(`B${i}`))
  const latest = writer.request(recovery('C'))
  const confirmed = writer.wait(latest)
  expect(writes).toHaveLength(1)
  release.resolve()
  await confirmed
  await writer.drain()
  expect(writes.map((value) => value?.document.title)).toEqual(['A', 'C'])
})

test('a newer complete recovery can confirm the exact frozen operation, never a changed body', async () => {
  const writes: (DraftRecovery<Text> | null)[] = []
  const writer = new LessonDraftRecoveryWriter<Text>(
    async (value) => {
      writes.push(value)
    },
    () => {},
  )
  const a = recovery('A')
  const barrier = writer.request(a)
  const waiting = writer.wait(barrier, { operation: a.pending[0]! })
  const newer = recovery('B')
  newer.pending.unshift(a.pending[0]!)
  writer.request(newer)
  await waiting
  expect(writes).toHaveLength(1)
  expect(writes[0]?.pending.map((operation) => operation.operationId)).toEqual(['A', 'B'])

  const changed = recovery('changed-body')
  changed.pending[0]!.operationId = 'A'
  const next = writer.request(changed)
  const rejected = writer.wait(next, { operation: a.pending[0]! }).catch((error: unknown) => error)
  expect(await rejected).toBeInstanceOf(Error)
  await writer.drain()
})

test('a retired epoch/tombstone cancels an old barrier, including a physical write still in progress', async () => {
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const writes: (DraftRecovery<Text> | null)[] = []
  const writer = new LessonDraftRecoveryWriter<Text>(
    async (value) => {
      writes.push(value)
      if (writes.length === 1) {
        started.resolve()
        await release.promise
      }
    },
    () => {},
  )
  const a = recovery('A')
  const first = writer.request(a)
  const oldResult = writer.wait(first, { operation: a.pending[0]! }).then(
    () => 'incorrectly-confirmed',
    (error: unknown) => error,
  )
  await started.promise
  writer.request(recovery('superseded-old-epoch'))
  writer.advanceEpoch()
  const cleared = writer.request(null)
  const current = writer.wait(cleared, { empty: true })
  release.resolve()
  expect(await oldResult).toBeInstanceOf(Error)
  await current
  await writer.drain()
  expect(writes.map((value) => value?.document.title ?? null)).toEqual(['A', null])
})

test('storage failure rejects the barrier and a later request can retry without replaying every old write', async () => {
  const failure = new Error('quota')
  let failing = true
  const failures: unknown[] = []
  const writes: string[] = []
  const writer = new LessonDraftRecoveryWriter<Text>(
    async (value) => {
      writes.push(value?.document.title ?? 'clear')
      if (failing) throw failure
    },
    (error) => {
      failures.push(error)
    },
  )
  const a = writer.request(recovery('A'))
  expect(await writer.wait(a).catch((error: unknown) => error)).toBe(failure)
  expect(failures).toEqual([failure])
  failing = false
  const c = writer.request(recovery('C'))
  await writer.wait(c)
  await writer.drain()
  expect(writes).toEqual(['A', 'C'])
})

test('a resolved barrier may immediately request another write without stranding the new job', async () => {
  const writes: string[] = []
  const writer = new LessonDraftRecoveryWriter<Text>(
    async (value) => {
      writes.push(value?.document.title ?? 'clear')
    },
    () => {},
  )
  const a = writer.request(recovery('A'))
  await writer.wait(a)
  const b = writer.request(recovery('B'))
  await writer.wait(b)
  await writer.drain()
  expect(writes).toEqual(['A', 'B'])
})
