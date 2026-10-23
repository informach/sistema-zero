import { expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { environmentRequestSchema, runSchema } from '@sistemazero/agent-core'
import { Browsers } from '../src/browser/manager'
import { Environments } from '../src/environments/manager'
import { Previews } from '../src/preview/manager'
import { sourceRevision } from '../src/preview/revision'
import { createViewer } from '../src/preview/viewer'
import { Processes } from '../src/process/manager'
import { Services, serviceRequestSchema } from '../src/services/registry'
import { Artifacts } from '../src/store/artifacts'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'

test('preview binds real browser evidence to source and reporter, stops no-progress and invalidates changed code', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-preview-'))
  const workspace = await mkdtemp(join(tmpdir(), 'zero-preview-source-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  const processes = new Processes(directory)
  const environments = new Environments(store, processes, directory)
  const services = new Services(environments)
  const browsers = new Browsers(supervisor, processes, services)
  const previews = new Previews(supervisor, browsers, services)
  const reserve = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response() })
  const port = reserve.port
  reserve.stop(true)
  const now = new Date().toISOString()
  const run = runSchema.parse({
    id: 'run',
    sessionId: 'session',
    input: 'fixture',
    backend: 'openrouter',
    model: '',
    mode: 'build',
    state: 'running',
    createdAt: now,
    updatedAt: now,
    maxCost: 1,
    maxSteps: 10,
  })
  await store.call({
    op: 'session.put',
    value: { id: 'session', workspace, title: 'fixture', createdAt: now, archived: false },
  })
  await store.call({ op: 'run.put', value: run, requestId: 'fixture', digest: 'fixture' })
  const context = { workspace, run, signal: AbortSignal.timeout(40000), ask: async () => 'deny' }
  await writeFile(join(workspace, 'source.txt'), 'first revision')
  const digest = (await sourceRevision(workspace, context.signal)).digest
  try {
    const lease = await environments.acquire(
      environmentRequestSchema.parse({
        intentId: 'preview',
        kind: 'local',
        template: { name: 'local' },
      }),
      context,
    )
    const service = await services.start(
      serviceRequestSchema.parse({
        lease,
        intentId: 'preview',
        executable: process.execPath,
        port,
        args: [
          '-e',
          'Bun.serve({hostname:process.env.HOST,port:Number(process.env.PORT),fetch:r=>new URL(r.url).pathname==="/report"?Response.json({sourceDigest:' +
            JSON.stringify(digest) +
            ',success:true,checks:[{name:"fixture",success:true}]}):new Response("<!doctype html><title>Preview</title><h1>Ready</h1>",{headers:{"content-type":"text/html"}})})',
        ],
      }),
      context,
    )
    const browser = await browsers.open(
      { serviceId: service.id, publicWeb: false, readOnly: true },
      context,
    )
    const input = { browserId: browser.id, sourceDigest: digest, includes: ['Ready'] }
    const absent = await previews.verify(input, context)
    expect(absent.state).toBe('unverified')
    const verified = await previews.verify({ ...input, reporterPath: '/report' }, context)
    expect(verified.state).toBe('verified')
    expect((await previews.candidate(browser.id, context)).state).toBe('verified')
    expect((await previews.verify({ ...input, reporterPath: '/report' }, context)).state).toBe(
      'verified',
    )
    let stopped: unknown
    try {
      await previews.verify(input, context)
    } catch (error) {
      stopped = error
    }
    expect(String(stopped)).toContain('stopped')
    await writeFile(join(workspace, 'source.txt'), 'second revision')
    expect((await previews.candidate(browser.id, context)).state).toBe('stale')
    let stale: unknown
    try {
      await previews.verify(input, context)
    } catch (error) {
      stale = error
    }
    expect(String(stale)).toContain('changed')
    await browsers.closeOwned(browser.id, context)
  } finally {
    await browsers.shutdown()
    await services.close()
    await environments.close()
    await supervisor.shutdown()
  }
}, 50000)

test('viewer grants only explicit artifacts, authenticates content and separates its control origin', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-viewer-'))
  const artifactStore = new Store(join(directory, 'state.sqlite'))
  const artifacts = new Artifacts(directory)
  const reference = await artifacts.put('<script>hostile()</script>', 'text/html')
  const viewer = createViewer((ref) => artifacts.read(ref), [reference])
  try {
    const url = new URL(viewer.url)
    const headers = { authorization: `Bearer ${url.hash.slice(1)}`, origin: url.origin }
    expect(viewer.contentOrigin).not.toBe(url.origin)
    expect((await fetch(`${viewer.contentOrigin}/manifest`)).status).toBe(401)
    expect(
      (
        await fetch(`${viewer.contentOrigin}/manifest`, {
          headers: { ...headers, origin: 'https://evil.invalid' },
        })
      ).status,
    ).toBe(403)
    expect((await fetch(`${viewer.contentOrigin}/artifact/1`, { headers })).status).toBe(404)
    expect(
      (await fetch(`${viewer.contentOrigin}/artifact/0`, { headers })).headers.get('content-type'),
    ).toBe('application/octet-stream')
    expect((await fetch(url)).headers.get('content-security-policy')).toContain(
      "frame-ancestors 'none'",
    )
    expect(await (await fetch(`${viewer.contentOrigin}/artifact/0`, { headers })).text()).toBe(
      '<script>hostile()</script>',
    )
  } finally {
    viewer.close()
    await artifactStore.close()
  }
})
