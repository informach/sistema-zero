import { expect, test } from 'bun:test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { browserOpenSchema, browserSnapshotSchema } from '@sistemazero/agent-integrations/browser'
import { z } from 'zod'
import { startBrowserWorker } from '../src/browser/worker'
import { Processes } from '../src/process/manager'
import { ProcessRpc } from '../src/process/rpc'

test('owned browser worker observes, acts, captures and blocks ungranted loopback', async () => {
  let foreignRequests = 0
  const foreign = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => {
      foreignRequests++
      return new Response('must not read')
    },
  })
  const fixture = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () =>
      new Response(
        '<!doctype html><title>Fixture</title><h1>Before</h1><button id="change" onclick="document.querySelector(\'h1\').textContent=\'After\'">Change</button><input type="password" value="secret-fixture"><img src="' +
          foreign.url.href +
          '">',
        { headers: { 'content-type': 'text/html' } },
      ),
  })
  const directory = await mkdtemp(join(tmpdir(), 'zero-browser-worker-'))
  const owned = await startBrowserWorker(
    new Processes(directory),
    directory,
    AbortSignal.timeout(30000),
  )
  const rpc = new ProcessRpc(owned, true)
  rpc.onRequest = async (method, params) => ({
    allowed:
      method === 'network.local' &&
      z.object({ origin: z.string() }).parse(params).origin === fixture.url.origin,
  })
  try {
    await rpc.request(
      'open',
      browserOpenSchema.parse({
        mode: 'build',
        publicWeb: false,
        localOrigins: [fixture.url.origin],
      }),
    )
    const before = browserSnapshotSchema.parse(
      await rpc.request('navigate', { url: fixture.url.href }),
    )
    expect(before.text).toContain('Before')
    expect(before.text).not.toContain('secret-fixture')
    const action = z.object({ snapshot: browserSnapshotSchema }).parse(
      await rpc.request('action', {
        expectedRevision: before.revision,
        action: 'click',
        target: { by: 'css', value: '#change' },
      }),
    )
    expect(action.snapshot.text).toContain('After')
    let rejection: unknown
    // Explicitly await process I/O. Bun 1.3.11's .rejects matcher stalled this request
    // until its deadline, while the same rejection arrives normally through await.
    try {
      await rpc.request('action', {
        expectedRevision: before.revision,
        action: 'click',
        target: { by: 'css', value: '#change' },
      })
    } catch (error) {
      rejection = error
    }
    expect(String(rejection)).toContain('stale')
    const shot = z
      .object({ file: z.string(), bytes: z.number() })
      .parse(await rpc.request('screenshot'))
    expect((await readFile(join(directory, shot.file))).subarray(1, 4).toString()).toBe('PNG')
    expect(shot.bytes).toBeGreaterThan(100)
    expect(foreignRequests).toBe(0)
    await rpc.request('close')
  } finally {
    await rpc.close()
    fixture.stop(true)
    foreign.stop(true)
  }
}, 40000)
