import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { environmentRequestSchema, runSchema } from '@sistemazero/agent-core'
import { Environments } from '../src/environments/manager'
import { Processes } from '../src/process/manager'
import { assertOwnedPort } from '../src/services/ports'
import { Services, serviceRequestSchema } from '../src/services/registry'
import { Store } from '../src/store/client'

test('service verifies its real listener, rejects occupied foreign port and never kills that server', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-service-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const processes = new Processes(directory)
  const environments = new Environments(store, processes, directory)
  const services = new Services(environments)
  const foreign = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => new Response('foreign'),
  })
  const free = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response() })
  const port = free.port
  free.stop(true)
  const run = runSchema.parse({
    id: 'fixture',
    sessionId: 'fixture',
    input: 'fixture',
    backend: 'openrouter',
    model: '',
    mode: 'build',
    state: 'running',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    maxCost: 1,
    maxSteps: 5,
  })
  const context = {
    workspace: directory,
    run,
    signal: AbortSignal.timeout(30000),
    ask: async () => 'deny',
  }
  try {
    const lease = await environments.acquire(
      environmentRequestSchema.parse({
        intentId: 'service',
        kind: 'local',
        template: { name: 'local' },
      }),
      context,
    )
    await expect(
      services.start(
        serviceRequestSchema.parse({
          lease,
          intentId: 'occupied',
          executable: process.execPath,
          args: ['-e', 'throw Error("must not start")'],
          port: foreign.port,
        }),
        context,
      ),
    ).rejects.toThrow()
    expect(await (await fetch(foreign.url)).text()).toBe('foreign')
    const input = serviceRequestSchema.parse({
      lease,
      intentId: 'owned',
      executable: process.execPath,
      args: [
        '-e',
        `await Bun.spawn([process.execPath, '-e', 'Bun.serve({hostname:process.env.HOST,port:Number(process.env.PORT),fetch:()=>new Response("owned")})'], {stdout:'inherit',stderr:'inherit'}).exited`,
      ],
      port,
    })
    const service = await services.start(input, context)
    expect(service.state).toBe('ready')
    expect((await services.start(input, context)).id).toBe(service.id)
    expect(await (await fetch(service.url ?? '')).text()).toBe('owned')
    await expect(
      assertOwnedPort(processes, directory, service.pid ?? 0, foreign.port ?? 0, context.signal),
    ).rejects.toThrow('another process')
    const result = await environments.execute(
      lease,
      process.execPath,
      ['-e', 'console.log("parallel check")'],
      5000,
      context,
    )
    expect(result.output).toContain('parallel check')
    await services.stop(service.id, context)
    expect((await services.get(service.id)).state).toBe('stopped')
    expect(await (await fetch(foreign.url)).text()).toBe('foreign')
  } finally {
    await services.close()
    await environments.close()
    await store.close()
    foreign.stop(true)
  }
}, 40000)

test('native ownership verifies IPv6 listeners and rejects foreign or exited jobs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-ipv6-owner-'))
  const processes = new Processes(directory)
  const signal = AbortSignal.timeout(10000)
  const foreign = Bun.serve({ hostname: '::1', port: 0, fetch: () => new Response('foreign') })
  const owned = await processes.start(
    {
      executable: process.execPath,
      args: [
        '-e',
        'const server=Bun.serve({hostname:"::1",port:0,fetch:()=>new Response("owned")});console.log(server.port)',
      ],
      cwd: directory,
      timeoutMs: 10000,
    },
    signal,
  )
  try {
    while (!owned.inspect().output.trim()) {
      signal.throwIfAborted()
      if (!owned.inspect().running) throw new Error('Listener exited before readiness')
      await Bun.sleep(10)
    }
    const port = Number(owned.inspect().output.trim())
    await assertOwnedPort(processes, directory, owned.pid, port, signal)
    await expect(
      assertOwnedPort(processes, directory, owned.pid, foreign.port ?? 0, signal),
    ).rejects.toThrow('another process')
    owned.cancel()
    await owned.completion
    await expect(assertOwnedPort(processes, directory, owned.pid, port, signal)).rejects.toThrow(
      'no longer owned',
    )
    expect(await (await fetch(foreign.url)).text()).toBe('foreign')
  } finally {
    owned.cancel()
    await owned.completion
    foreign.stop(true)
  }
}, 15000)
