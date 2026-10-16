import { expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  eventSchema,
  questionSchema,
  runSchema,
  sessionSchema,
  terminalStates,
} from '@sistemazero/agent-core'
import { z } from 'zod'
import { Dispatcher } from '../src/execution/dispatcher'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { codingTools } from '../src/tools/coding'
import { hash } from '../src/tools/paths'
import { Patches } from '../src/workspace/patch'

test('coding journey fixes a real bug, runs checks with approval and denies Plan writes', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'zero-coding-'))
  const profile = await mkdtemp(join(tmpdir(), 'zero-coding-profile-'))
  const store = new Store(join(profile, 'state.sqlite'))
  const supervisor = new Supervisor(profile, store)
  await supervisor.initialize()
  const processes = new Processes(profile)
  const dispatcher = new Dispatcher(supervisor)
  for (const tool of codingTools(processes, new Patches(store, profile))) dispatcher.register(tool)
  await writeFile(join(workspace, 'add.ts'), 'export const add=(a:number,b:number)=>a-b\n')
  await writeFile(
    join(workspace, 'add.test.ts'),
    "import {test,expect} from 'bun:test';import {add} from './add';test('adds',()=>expect(add(2,3)).toBe(5))",
  )
  const signal = new AbortController().signal
  const before = await processes.run(
    { executable: process.execPath, args: ['test'], cwd: workspace },
    signal,
  )
  expect(before.code).not.toBe(0)
  const call = (method: string, params: unknown) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
  supervisor.executor = async (run, workspace, signal) => {
    const input = {
      changes: [
        {
          operation: 'replace',
          path: 'add.ts',
          expectedHash: hash(await readFile(join(workspace, 'add.ts'))),
          edits: [{ oldText: 'a-b', newText: 'a+b' }],
        },
      ],
    }
    const denied = await dispatcher.dispatch(
      { ...run, mode: 'plan' },
      workspace,
      'denied',
      'file_patch',
      input,
      signal,
    )
    expect(denied.kind).toBe('failed')
    const patch = await dispatcher.dispatch(run, workspace, 'patch', 'file_patch', input, signal)
    if (patch.kind !== 'ok') throw new Error(JSON.stringify(patch))
    const checked = await dispatcher.dispatch(
      run,
      workspace,
      'check',
      'process_run',
      { executable: process.execPath, args: ['test'] },
      signal,
    )
    if (checked.kind !== 'ok') throw new Error(JSON.stringify(checked))
    await supervisor.emit(run.id, 'checks.completed', checked.value)
  }
  try {
    const session = sessionSchema.parse(await call('session.create', { workspace }))
    const run = runSchema.parse(
      await call('run.start', {
        requestId: 'coding',
        sessionId: session.id,
        input: 'Fix add',
        mode: 'build',
      }),
    )
    let cursor = 0
    let complete = false
    let approvals = 0
    while (!complete) {
      const events = z
        .array(eventSchema)
        .parse(await call('events', { runId: run.id, after: cursor, wait: true }))
      for (const event of events) {
        cursor = event.sequence
        if (event.type === 'question.created') {
          approvals++
          await call('question.answer', {
            id: questionSchema.parse(event.payload).id,
            answer: 'approve',
          })
        }
        if (event.type === 'run.state' && terminalStates.has(runSchema.parse(event.payload).state))
          complete = true
      }
    }
    expect(runSchema.parse(await call('run.get', { id: run.id })).state).toBe('succeeded')
    expect(approvals).toBe(1)
    expect(await readFile(join(workspace, 'add.ts'), 'utf8')).toContain('a+b')
  } finally {
    await supervisor.shutdown()
  }
}, 30000)
