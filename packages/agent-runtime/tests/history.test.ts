import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  artifactSchema,
  questionSchema,
  runSchema,
  runSummarySchema,
  sessionSchema,
} from '@sistemazero/agent-core'
import { z } from 'zod'
import { ContextBuilder } from '../src/context/builder'
import { setupSessions } from '../src/sessions'
import { Artifacts } from '../src/store/artifacts'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'

test('paged history, active child questions and frozen fork remain consistent', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-history-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  setupSessions(supervisor)
  const signal = AbortSignal.timeout(10000)
  const call = (method: string, params: unknown = {}) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
  const source = sessionSchema.parse(
    await call('session.create', { workspace: directory, title: 'Fonte' }),
  )
  const other = sessionSchema.parse(
    await call('session.create', { workspace: directory, title: 'Filho' }),
  )
  const create = async (id: string, sessionId: string, parentId?: string) =>
    runSchema.parse(
      await store.call({
        op: 'run.put',
        requestId: id,
        digest: id,
        value: runSchema.parse({
          id,
          sessionId,
          parentId,
          input: `Entrada ${id}`,
          model: '',
          backend: 'codex',
          mode: 'plan',
          state: 'queued',
          maxCost: 2,
          maxSteps: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      }),
    )
  try {
    const root = await create('root', source.id)
    await store.call({ op: 'run.state', id: root.id, state: 'running' })
    const child = await create('child', other.id, root.id)
    await store.call({ op: 'run.state', id: child.id, state: 'running' })
    await store.call({ op: 'run.state', id: child.id, state: 'waiting_approval' })
    const question = questionSchema.parse({
      id: 'approval',
      runId: child.id,
      kind: 'approval',
      prompt: 'Revisar patch do filho',
      options: ['approve', 'deny'],
      createdAt: new Date().toISOString(),
    })
    await store.call({ op: 'question.put', value: question })
    const snapshot = z
      .object({
        runs: z.array(runSummarySchema),
        questions: z.array(questionSchema),
        revision: z.number(),
      })
      .parse(await call('session.snapshot', { sessionId: source.id }))
    expect(snapshot.runs.map((run) => run.id)).toContain(child.id)
    expect(snapshot.questions.map((item) => item.id)).toEqual(['approval'])
    const watch = call('session.snapshot', {
      sessionId: source.id,
      afterRevision: snapshot.revision,
    })
    await call('question.answer', { id: question.id, answer: 'deny' })
    expect(
      z.object({ questions: z.array(questionSchema) }).parse(await watch).questions,
    ).toHaveLength(0)
    await store.call({ op: 'run.state', id: child.id, state: 'running' })
    await store.call({ op: 'run.state', id: child.id, state: 'succeeded' })
    for (let i = 0; i < 305; i++) await supervisor.emit(root.id, 'assistant.delta', `token-${i}`)
    await supervisor.emit(root.id, 'assistant.final', 'Resposta congelada')
    await store.call({ op: 'run.state', id: root.id, state: 'succeeded' })
    const tail = z
      .object({
        events: z.array(z.object({ sequence: z.number(), type: z.string() })),
        previousCursor: z.number(),
      })
      .parse(await call('events.tail', { runId: root.id, limit: 100 }))
    expect(tail.events).toHaveLength(100)
    expect(tail.events.at(-1)?.type).toBe('run.state')
    const previous = z
      .object({ events: z.array(z.object({ sequence: z.number() })) })
      .parse(await call('events.tail', { runId: root.id, before: tail.previousCursor, limit: 100 }))
    expect(previous.events.at(-1)?.sequence).toBeLessThan(tail.events[0]?.sequence ?? 0)
    for (let i = 0; i < 4; i++) await create(`next-${i}`, source.id)
    const first = z
      .object({ values: z.array(runSchema), nextCursor: z.number() })
      .parse(await call('history.page', { namespace: 'runs', sessionId: source.id, limit: 2 }))
    await create('newest', source.id)
    const next = z.object({ values: z.array(runSchema) }).parse(
      await call('history.page', {
        namespace: 'runs',
        sessionId: source.id,
        limit: 2,
        before: first.nextCursor,
      }),
    )
    expect(new Set([...first.values, ...next.values].map((run) => run.id)).size).toBe(4)
    expect(next.values.map((run) => run.id)).not.toContain('newest')
    const fork = sessionSchema.parse(
      await call('session.fork', { sessionId: source.id, throughRunId: root.id }),
    )
    await supervisor.emit(root.id, 'assistant.final', 'Resposta posterior não deve alterar o fork')
    const context = await new ContextBuilder(store).build(directory, fork.id, 'continua')
    const frozen = context.items.find((item) => item.source.startsWith('session-fork:'))
    expect(frozen?.text).toContain('Resposta congelada')
    expect(frozen?.text).not.toContain('Resposta posterior')
    expect(
      await store.call({
        op: 'document.get',
        namespace: 'native.sessions',
        id: `codex:${fork.id}`,
      }),
    ).toBeNull()
    const exported = z
      .object({ manifest: artifactSchema, parts: z.array(artifactSchema), events: z.number() })
      .parse(await call('session.export', { sessionId: source.id }))
    expect(exported.events).toBeGreaterThan(305)
    const archive = (
      await new Artifacts(directory).read(exported.parts[0] ?? exported.manifest)
    ).toString('utf8')
    expect(archive).toContain('token-0')
    expect(archive).toContain('token-304')
    supervisor.readiness = 'recovering'
    await expect(
      call('run.start', {
        requestId: 'blocked',
        sessionId: source.id,
        input: 'unsafe during recovery',
      }),
    ).rejects.toThrow('recovering')
    expect(await call('ping')).toMatchObject({ readiness: 'recovering' })
  } finally {
    await supervisor.shutdown()
  }
})
