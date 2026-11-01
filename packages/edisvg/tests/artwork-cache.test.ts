import assert from 'node:assert/strict'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { test } from 'node:test'
import { acquireArtwork } from '../src/artwork-cache.ts'

async function serve(
  handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
) {
  const server = createServer((request, response) => {
    void Promise.resolve(handler(request, response)).catch(() => response.destroy())
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  return {
    url: new URL(`http://127.0.0.1:${address.port}/`),
    stop: async () => {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    },
  }
}

test('two consumers share one real download and releasing one preserves the other', async () => {
  let count = 0
  let finish!: () => void
  let seen!: () => void
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  const requested = new Promise<void>((resolve) => {
    seen = resolve
  })
  const server = await serve(async (_request, response) => {
    count++
    seen()
    await pending
    response.end('arte compartilhada')
  })
  try {
    const a = acquireArtwork(server.url.href)
    const b = acquireArtwork(server.url.href)
    await requested
    a.release()
    finish()
    assert.equal(await b.content, 'arte compartilhada')
    b.release()
    b.release()
    const c = acquireArtwork(server.url.href)
    assert.equal(await c.content, 'arte compartilhada')
    c.release()
    assert.equal(count, 1)
  } finally {
    finish()
    await server.stop()
  }
})

test('leaving the last consumer aborts a pending request and a later mount can retry', async () => {
  let seen!: () => void
  let count = 0
  const requested = new Promise<void>((resolve) => {
    seen = resolve
  })
  const server = await serve((_request, response) => {
    count++
    if (count === 1) {
      response.writeHead(200)
      response.write('inicio')
      seen()
      return
    }
    response.end('nova arte')
  })
  try {
    const a = acquireArtwork(server.url.href)
    const rejection = assert.rejects(a.content)
    await requested
    a.release()
    await rejection
    const b = acquireArtwork(server.url.href)
    assert.equal(await b.content, 'nova arte')
    assert.equal(count, 2)
    b.release()
  } finally {
    await server.stop()
  }
})

test('oversize declarations and streams, malformed UTF-8 and upstream failures never enter the cache', async () => {
  const calls = new Map<string, number>()
  const server = await serve((request, response) => {
    const path = request.url ?? ''
    calls.set(path, (calls.get(path) ?? 0) + 1)
    if (path === '/declared') {
      response.writeHead(200, { 'content-length': '10000001' })
      response.end('a')
      return
    }
    if (path === '/utf8') {
      response.end(new Uint8Array([0xc3, 0x28]))
      return
    }
    if (path === '/failure') {
      response.writeHead(503)
      response.end('bad')
      return
    }
    response.writeHead(200, { 'transfer-encoding': 'chunked' })
    response.end(Buffer.alloc(10_000_001, 65))
  })
  try {
    for (const path of ['declared', 'streamed', 'utf8', 'failure']) {
      for (let n = 0; n < 2; n++) {
        const request = acquireArtwork(new URL(path, server.url).href)
        await assert.rejects(request.content, `A requisicao ${path} deve ser recusada`)
        request.release()
      }
      assert.equal(calls.get(`/${path}`), 2)
    }
  } finally {
    await server.stop()
  }
})

test('idle downloads are evicted in recency order instead of retaining every art', async () => {
  let count = 0
  const server = await serve((_request, response) => {
    count++
    response.end('arte')
  })
  try {
    for (let n = 0; n < 30; n++) {
      const request = acquireArtwork(new URL(String(n), server.url).href)
      assert.equal(await request.content, 'arte')
      request.release()
    }
    const old = acquireArtwork(new URL('0', server.url).href)
    assert.equal(await old.content, 'arte')
    old.release()
    assert.equal(count, 31)
  } finally {
    await server.stop()
  }
})

test('a new content-hash URL loads fresh bytes while the previous version remains cached', async () => {
  const calls = new Map<string, number>()
  const server = await serve((request, response) => {
    const path = request.url ?? ''
    calls.set(path, (calls.get(path) ?? 0) + 1)
    response.setHeader('cache-control', 'public, max-age=31536000, immutable')
    response.end(path.includes('bbbb') ? 'arte nova' : 'arte anterior')
  })
  try {
    const oldUrl = new URL('happy.aaaaaaaaaaaa.edi-animation.json', server.url).href
    const newUrl = new URL('happy.bbbbbbbbbbbb.edi-animation.json', server.url).href
    for (const [url, content] of [
      [oldUrl, 'arte anterior'],
      [newUrl, 'arte nova'],
      [oldUrl, 'arte anterior'],
      [newUrl, 'arte nova'],
    ]) {
      const artwork = acquireArtwork(url!)
      assert.equal(await artwork.content, content)
      artwork.release()
    }
    assert.equal(calls.get('/happy.aaaaaaaaaaaa.edi-animation.json'), 1)
    assert.equal(calls.get('/happy.bbbbbbbbbbbb.edi-animation.json'), 1)
  } finally {
    await server.stop()
  }
})
