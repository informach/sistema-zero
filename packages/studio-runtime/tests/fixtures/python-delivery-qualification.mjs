import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const [entry, seedPath, reportPath] = process.argv.slice(2)
const { qualifyPythonDelivery, readRuntimeWire, runPythonDeliveryQualification } = await import(
  pathToFileURL(entry).href
)
const seed = JSON.parse(await readFile(seedPath, 'utf8'))
const files = new Map(
  Object.entries(seed.files).map(([path, value]) => [path, Buffer.from(value, 'base64')]),
)
const parents = ['https://app.example', 'https://play.example']
const checks = [],
  failures = [],
  socketClosures = [],
  sockets = new Set()
let closedSockets = 0
let entered
const pendingResponse = new Promise((done) => {
  entered = done
})
const server = createServer((request, response) => {
  if (request.url === '/oversize') {
    response.end('too much')
    return
  }
  if (request.url === '/pending') {
    response.writeHead(200)
    response.write('partial')
    entered()
    return
  }
  if (request.url.startsWith('/v1/runtime-deployments/')) {
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    })
    response.end(
      JSON.stringify({
        release: seed.deployment.release,
        distribution: seed.deployment.distribution,
      }),
    )
    return
  }
  const path = request.url.split('/').slice(4).join('/')
  if (path.startsWith('_http/gzip/')) {
    response.writeHead(404)
    response.end()
    return
  }
  const gzip = request.headers['accept-encoding'] === 'gzip'
  const representation = seed.deployment.distribution.httpRepresentations?.find(
    (row) => row.path === path,
  )
  const artifact = seed.deployment.distribution.files.find(
    (row) => row.path === (gzip ? representation?.artifactPath : path),
  )
  if (!artifact) {
    response.writeHead(404)
    response.end()
    return
  }
  const headers = {
    'Content-Type':
      {
        html: 'text/html; charset=utf-8',
        mjs: 'text/javascript; charset=utf-8',
        js: 'text/javascript; charset=utf-8',
        wasm: 'application/wasm',
        json: 'application/json',
        zip: 'application/zip',
        txt: 'text/plain; charset=utf-8',
      }[path.split('.').at(-1)] ?? 'application/octet-stream',
    ETag: `"${artifact.sha256}"`,
    Vary: 'Accept-Encoding',
    'Content-Length': String(artifact.bytes),
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
    ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    'Cache-Control': path.endsWith('.html') ? 'no-store' : 'public, max-age=31536000, immutable',
    ...(path.endsWith('.html')
      ? {
          'Cache-Control': 'no-store',
          'Content-Security-Policy': `default-src 'none'; frame-ancestors 'self' ${parents.join(' ')}`,
        }
      : {}),
  }
  const status = request.headers['if-none-match'] ? 304 : 200
  response.writeHead(status, headers)
  response.end(request.method === 'HEAD' || status === 304 ? undefined : files.get(artifact.path))
})
server.on('connection', (socket) => {
  sockets.add(socket)
  socketClosures.push(
    new Promise((done) => {
      socket.once('close', () => {
        sockets.delete(socket)
        closedSockets++
        done()
      })
    }),
  )
})
await new Promise((done, fail) => {
  server.once('error', fail)
  server.listen(0, '127.0.0.1', done)
})
const origin = `http://127.0.0.1:${server.address().port}`
const read = (url, options) => readRuntimeWire(new URL(url.pathname, origin), options)
const input = {
  deployment: seed.deployment,
  origin: 'https://runtime.example',
  parentOrigins: parents,
}
async function check(name, run) {
  try {
    await run()
    checks.push(name)
  } catch (error) {
    failures.push({ name, error: error.name, message: error.message })
  }
}
try {
  await check('identity-gzip-head-conditional-hidden', async () => {
    const result = await qualifyPythonDelivery(input, read)
    assert(result.metadataVerified && result.gzipWireBytesVerified)
    assert(result.results.some((row) => row.encoding === 'gzip'))
    assert.equal(result.hiddenRepresentations.length, 1)
    assert.equal(result.publicGameExecutionQualified, false)
    assert.equal(result.hostedUiQualified, false)
    assert.equal(result.mutationsPerformed, false)
  })
  await check('corrupted-gzip-rejected', async () => {
    let reached = false
    await assert.rejects(
      qualifyPythonDelivery(input, async (url, options) => {
        const wire = await read(url, options)
        if (
          options.method === 'GET' &&
          wire.status === 200 &&
          wire.headers.get('content-encoding') === 'gzip'
        ) {
          reached = true
          return { ...wire, sha256: '0'.repeat(64) }
        }
        return wire
      }),
    )
    assert(reached)
  })
  await check('unexpected-frame-ancestor-rejected', async () => {
    await assert.rejects(
      qualifyPythonDelivery(input, async (url, options) => {
        const wire = await read(url, options)
        if (url.pathname.endsWith('frame.html'))
          wire.headers.set(
            'content-security-policy',
            `${wire.headers.get('content-security-policy')} https://unexpected.example`,
          )
        return wire
      }),
    )
  })
  await check('wrong-module-mime-rejected-despite-identical-bytes', async () => {
    let reached = false
    await assert.rejects(
      qualifyPythonDelivery(input, async (url, options) => {
        const wire = await read(url, options)
        if (url.pathname.endsWith('frame.mjs') && wire.status === 200) {
          reached = true
          wire.headers.set('content-type', 'text/html; charset=utf-8')
        }
        return wire
      }),
    )
    assert(reached)
  })
  await check('bounded-response-closes', async () => {
    await assert.rejects(
      readRuntimeWire(new URL('/oversize', origin), {
        method: 'GET',
        headers: {},
        maximum: 2,
        signal: AbortSignal.timeout(5000),
      }),
      /byte budget/,
    )
  })
  await check('pending-body-cancellation-settles', async () => {
    const controller = new AbortController()
    const pending = readRuntimeWire(new URL('/pending', origin), {
      method: 'GET',
      headers: {},
      maximum: 100,
      signal: controller.signal,
    })
    const rejected = assert.rejects(pending)
    await pendingResponse
    controller.abort()
    await rejected
  })
  await check('inert-cli-and-no-default-target', async () => {
    for (const args of [
      [],
      ['--environment', 'staging'],
      ['--environment', 'staging', '--plan', 'x', '--out', 'x', '--unknown', 'x'],
      ['--environment', 'staging', '--plan', 'x', '--out', 'x', '--out', 'y'],
    ])
      await assert.rejects(runPythonDeliveryQualification(args))
    await assert.rejects(
      qualifyPythonDelivery({ ...input, origin: 'http://runtime.example' }, () => {
        throw new Error('Must not connect')
      }),
    )
  })
} finally {
  await new Promise((done, fail) => server.close((error) => (error ? fail(error) : done())))
  // server.close's callback can precede the final socket's own close event.
  // Register ACKs at connection time, then await physical closure under the parent deadline.
  const pendingAtServerClose = sockets.size
  await Promise.all(socketClosures)
  assert.equal(sockets.size, 0)
  await writeFile(
    reportPath,
    JSON.stringify({
      checks,
      failures,
      node: process.version,
      cleanupConfirmed: true,
      socketCleanup: {
        accepted: socketClosures.length,
        closed: closedSockets,
        pendingAtServerClose,
      },
      sourceSha256: createHash('sha256')
        .update(await readFile(entry))
        .digest('hex'),
    }),
    { flag: 'wx' },
  )
}
if (failures.length) process.exitCode = 1
