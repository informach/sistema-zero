import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { setupHooks } from '../src/context/hooks'
import { Dispatcher } from '../src/execution/dispatcher'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { codingTools } from '../src/tools/coding'
import { Patches } from '../src/workspace/patch'

test('hook discovery never executes, Plan refuses and changed manifest invalidates execution', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-hooks-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  const dispatcher = new Dispatcher(supervisor)
  for (const tool of codingTools(new Processes(directory), new Patches(store, directory)))
    dispatcher.register(tool)
  setupHooks(dispatcher)
  await mkdir(join(directory, '.sistemazero'))
  const hook = {
    name: 'check',
    executable: process.execPath,
    args: ['-e', 'await Bun.write("marker.txt","executed")'],
    cwd: '.',
    timeoutMs: 10000,
  }
  const path = join(directory, '.sistemazero', 'hooks.json')
  await writeFile(path, JSON.stringify({ version: 1, hooks: [hook] }))
  const run = runSchema.parse({
    id: 'fixture',
    sessionId: 'fixture',
    input: 'check',
    backend: 'openrouter',
    model: 'fixture',
    mode: 'plan',
    state: 'running',
    createdAt: 'now',
    updatedAt: 'now',
    maxCost: 1,
    maxSteps: 3,
  })
  const signal = new AbortController().signal
  try {
    const listing = await dispatcher.dispatch(run, directory, 'list', 'hooks_list', {}, signal)
    if (listing.kind !== 'ok') throw new Error('Hook discovery failed')
    const { sha256 } = z.object({ sha256: z.string() }).parse(listing.value)
    expect(await Bun.file(join(directory, 'marker.txt')).exists()).toBe(false)
    expect(
      (await dispatcher.dispatch(run, directory, 'denied', 'hook_run', { ...hook, sha256 }, signal))
        .kind,
    ).toBe('failed')
    supervisor.ask = async () => 'approve'
    expect(
      (
        await dispatcher.dispatch(
          { ...run, mode: 'build' },
          directory,
          'approved',
          'hook_run',
          { ...hook, sha256 },
          signal,
        )
      ).kind,
    ).toBe('ok')
    expect(await readFile(join(directory, 'marker.txt'), 'utf8')).toBe('executed')
    await writeFile(
      path,
      JSON.stringify({
        version: 1,
        hooks: [{ ...hook, args: ['-e', 'throw new Error("must not execute")'] }],
      }),
    )
    const changed = await dispatcher.dispatch(
      { ...run, mode: 'build' },
      directory,
      'changed',
      'hook_run',
      { ...hook, sha256 },
      signal,
    )
    expect(changed.kind).toBe('failed')
    if (changed.kind === 'failed') expect(changed.message).toContain('changed')
  } finally {
    await supervisor.shutdown()
  }
}, 20000)
