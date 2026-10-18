import assert from 'node:assert/strict'
import { type ClientRequest, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { it } from 'node:test'
import { createPythonLanguageServer } from '../../runtime/http'

it('cancellation does not postpone native idle expiry, while a real query renews it', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  for (const kind of ['cancel', 'query'] as const) {
    let expired = false
    const token = 'd'.repeat(64)
    const server = createPythonLanguageServer({
      token,
      idleTtlMs: 300_000,
      onExpired() {
        expired = true
      },
      session: {
        dispose() {},
        async handle(command) {
          return { version: 1, id: command.id, kind: 'ack' }
        },
      },
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      context.mock.timers.tick(290_000)
      await new Promise<void>((resolve, reject) => {
        const client = request(
          {
            host: '127.0.0.1',
            port: (server.address() as AddressInfo).port,
            path: '/command',
            method: 'POST',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          },
          (response) => {
            assert.equal(response.statusCode, 200)
            response.resume()
            response.on('end', resolve)
            response.on('error', reject)
          },
        )
        client.on('error', reject)
        client.end(
          JSON.stringify(
            kind === 'cancel'
              ? { version: 1, id: 'cancel', kind, requestId: 'missing' }
              : {
                  version: 1,
                  id: 'query',
                  kind,
                  revision: 1,
                  path: 'main.py',
                  documentVersion: 1,
                  method: 'symbols',
                },
          ),
        )
      })
      context.mock.timers.tick(10_000)
      assert.equal(expired, kind === 'cancel')
      if (kind === 'query') {
        context.mock.timers.tick(290_000)
        assert.equal(expired, true)
      }
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }
})

it('bounds aggregate in-flight and chunked bodies, rejects encoded content and recovers capacity', async () => {
  const token = 'c'.repeat(64)
  let calls = 0
  const server = createPythonLanguageServer({
    token,
    onExpired() {},
    session: {
      dispose() {},
      async handle(command) {
        calls++
        return { version: 1, id: command.id, kind: 'ack' }
      },
    },
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const port = address.port
  const clients: ClientRequest[] = []
  function start(id: string, extra: Record<string, string> = {}) {
    let client!: ClientRequest
    const response = new Promise<{ status: number | undefined; body: string }>(
      (resolve, reject) => {
        client = request(
          {
            host: '127.0.0.1',
            port,
            path: '/command',
            method: 'POST',
            headers: {
              authorization: `Bearer ${token}`,
              'content-type': 'application/json',
              'x-test-id': id,
              ...extra,
            },
          },
          (response) => {
            let body = ''
            response.on('data', (chunk: Buffer) => {
              body += chunk.toString('utf8')
            })
            response.on('end', () => resolve({ status: response.statusCode, body }))
            response.on('error', reject)
          },
        )
        client.on('error', reject)
        clients.push(client)
      },
    )
    return { client, response }
  }
  // Observe actual ingress so the second request arrives while the first body is retained.
  const bytes = 8 * 1024 * 1024 + 256 * 1024
  const firstRead = new Promise<void>((resolve) =>
    server.on('request', (incoming) => {
      if (incoming.headers['x-test-id'] !== 'held') return
      let received = 0
      incoming.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (received >= bytes) resolve()
      })
    }),
  )
  try {
    const held = start('held')
    held.client.write(Buffer.alloc(bytes, 32))
    await firstRead
    const concurrent = start('concurrent')
    concurrent.client.write(Buffer.alloc(bytes, 32))
    assert.equal((await concurrent.response).status, 429)
    held.client.end()
    assert.equal((await held.response).status, 400)
    const encoded = start('encoded', { 'content-encoding': 'gzip' })
    encoded.client.end('{}')
    assert.equal((await encoded.response).status, 404)
    const oversized = start('oversized')
    oversized.client.write(Buffer.alloc(10 * 1024 * 1024, 32))
    oversized.client.end()
    assert.equal((await oversized.response).status, 413)
    assert.equal(calls, 0)
    const valid = start('valid')
    valid.client.end(JSON.stringify({ version: 1, id: 'valid', kind: 'cancel', requestId: 'none' }))
    assert.equal((await valid.response).status, 200)
    assert.equal(calls, 1)
  } finally {
    for (const client of clients) client.destroy()
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

it('protects the private endpoint, validates commands and bounds request bodies before dispatch', async () => {
  let calls = 0,
    disposed = false
  const token = 'a'.repeat(64)
  const server = createPythonLanguageServer({
    token,
    onExpired() {},
    session: {
      dispose() {
        disposed = true
      },
      async handle(command) {
        calls++
        return { version: 1, id: command.id, kind: 'ack' }
      },
    },
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/command`
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` }
  try {
    const unauthorized = await fetch(url, { method: 'POST', body: '{}' })
    assert.equal(unauthorized.status, 401)
    await unauthorized.body?.cancel()
    for (const body of [
      '{',
      JSON.stringify({
        version: 1,
        id: 'a',
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 0,
        revision: 1,
        changes: [{ path: 'pyrightconfig.json', version: 1, source: '{}' }],
      }),
    ]) {
      const response = await fetch(url, { method: 'POST', headers, body })
      assert.equal(response.status, 400)
      await response.body?.cancel()
    }
    const tooBig = await fetch(url, { method: 'POST', headers, body: ' '.repeat(10 * 1024 * 1024) })
    assert.equal(tooBig.status, 413)
    await tooBig.body?.cancel()
    assert.equal(calls, 0)
    const valid = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ version: 1, id: 'cancel-a', kind: 'cancel', requestId: 'a' }),
    })
    assert.deepEqual(await valid.json(), { version: 1, id: 'cancel-a', kind: 'ack' })
    assert.equal(calls, 1)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  assert.equal(disposed, true)
})

it('aborts a running analysis when its authenticated HTTP caller disconnects', async () => {
  let entered!: () => void, aborted!: () => void
  const began = new Promise<void>((resolve) => {
    entered = resolve
  })
  const ended = new Promise<void>((resolve) => {
    aborted = resolve
  })
  const token = 'b'.repeat(64)
  const server = createPythonLanguageServer({
    token,
    onExpired() {},
    session: {
      dispose() {},
      async handle(command, signal) {
        entered()
        await new Promise<void>((resolve) =>
          signal.addEventListener(
            'abort',
            () => {
              aborted()
              resolve()
            },
            { once: true },
          ),
        )
        return { version: 1, id: command.id, kind: 'ack' }
      },
    },
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const controller = new AbortController()
  try {
    const response = fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/command`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        version: 1,
        id: 'a',
        kind: 'query',
        method: 'symbols',
        path: 'main.py',
        revision: 1,
        documentVersion: 1,
      }),
      signal: controller.signal,
    }).catch(() => null)
    await began
    controller.abort()
    await ended
    assert.equal(await response, null)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
