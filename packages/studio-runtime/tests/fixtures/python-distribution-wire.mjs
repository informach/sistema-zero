import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { createRequire } from 'node:module'
import { gunzipSync } from 'node:zlib'

const [workerPath, seedPath, reportPath] = process.argv.slice(2)
const seed = JSON.parse(await readFile(seedPath, 'utf8'))
const require = createRequire(import.meta.url)
const { Miniflare, convertV4MiniflareOptions } = createRequire(
  require.resolve('wrangler/package.json'),
)('miniflare')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = {
  node: process.version,
  compatibilityDate: '2026-07-01',
  results: [],
  failures: [],
  cleanupConfirmed: false,
  scope:
    'Actual production distribution registry/upload, native local workerd/R2 and Node raw HTTP. No cloud resources or performance qualification.',
}
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: await readFile(workerPath, 'utf8'),
    compatibilityDate: report.compatibilityDate,
    compatibilityFlags: ['nodejs_compat'],
    host: '127.0.0.1',
    port: 0,
    unsafeDirectSockets: [{ host: '127.0.0.1', port: 0, entrypoint: 'default', proxy: false }],
    r2Buckets: ['QA_BUCKET'],
    bindings: {
      QA_DEPLOYMENT: JSON.stringify(seed.deployment),
      QA_FILES: JSON.stringify(seed.files),
    },
  }),
)
// The parent owns the deadline and can retire this complete tree even if dispose hangs.

function read(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      { method, headers, agent: false, signal: AbortSignal.timeout(15000) },
      (res) => {
        const chunks = []
        let size = 0
        res.on('data', (chunk) => {
          size += chunk.length
          if (size > 1024 * 1024)
            req.destroy(new Error('Fixture response exceeded bounded wire size'))
          else chunks.push(chunk)
        })
        res.once('error', reject)
        res.once('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            bytes: Buffer.concat(chunks, size),
          }),
        )
      },
    )
    req.once('error', reject)
    req.end()
  })
}

try {
  await mf.ready
  // Read actual workerd bytes. Miniflare's outer dev proxy negotiates/transforms encoding
  // itself, so its public URL is a separate integration surface, not an origin wire probe.
  const origin = await mf.unsafeGetDirectURL()
  const setup = await read(new URL('/setup', origin), 'POST')
  if (setup.status !== 200)
    throw new Error(`Native R2 upload failed: ${setup.status} ${setup.bytes}`)
  const path = `/v1/runtimes/${seed.deployment.release.manifestSha256}/frame.mjs`
  const logical = seed.deployment.distribution.files.find((file) => file.path === 'frame.mjs')
  const representation = seed.deployment.distribution.httpRepresentations.find(
    (item) => item.path === 'frame.mjs',
  )
  const encoded = seed.deployment.distribution.files.find(
    (file) => file.path === representation.artifactPath,
  )
  const cases = [
    {
      name: 'gzip',
      method: 'GET',
      headers: { 'Accept-Encoding': 'gzip' },
      status: 200,
      expected: encoded,
    },
    {
      name: 'identity',
      method: 'GET',
      headers: { 'Accept-Encoding': 'identity' },
      status: 200,
      expected: logical,
    },
    {
      name: 'head-gzip',
      method: 'HEAD',
      headers: { 'Accept-Encoding': 'gzip' },
      status: 200,
      expected: encoded,
    },
    {
      name: 'conditional-gzip',
      method: 'GET',
      headers: { 'Accept-Encoding': 'gzip', 'If-None-Match': `W/"${encoded.sha256}"` },
      status: 304,
      expected: encoded,
    },
    { name: 'unacceptable', method: 'GET', headers: { 'Accept-Encoding': '*;q=0' }, status: 406 },
  ]
  for (const item of cases) {
    const response = await read(new URL(path, origin), item.method, item.headers)
    const errors = []
    if (response.status !== item.status)
      errors.push(`status ${response.status}, expected ${item.status}`)
    if (item.expected) {
      if (response.headers.etag !== `"${item.expected.sha256}"`)
        errors.push('wrong representation ETag')
      if (response.headers.vary !== 'Accept-Encoding') errors.push('missing negotiation Vary')
      if (item.name.includes('gzip') && response.headers['content-encoding'] !== 'gzip')
        errors.push('wrong encoding')
      if (item.status === 200 && response.headers['content-length'] !== String(item.expected.bytes))
        errors.push(
          `wrong Content-Length ${response.headers['content-length']}, expected ${item.expected.bytes}`,
        )
      if (item.method === 'GET' && item.status === 200) {
        if (
          response.bytes.length !== item.expected.bytes ||
          hash(response.bytes) !== item.expected.sha256
        )
          errors.push('wire differs from stored representation')
        const decoded = item.name === 'gzip' ? gunzipSync(response.bytes) : response.bytes
        if (decoded.length !== logical.bytes || hash(decoded) !== logical.sha256)
          errors.push('single decoded body differs from logical module')
      } else if (response.bytes.length !== 0) errors.push('HEAD/304 has body')
    }
    const result = {
      name: item.name,
      status: response.status,
      headers: response.headers,
      wireBytes: response.bytes.length,
      wireSha256: hash(response.bytes),
      errors,
    }
    report.results.push(result)
    report.failures.push(...errors.map((error) => `${item.name}: ${error}`))
  }
  // Observe the actual dev edge separately. It can rewrite request encoding and transcode
  // responses, so these observations must never be substituted for origin wire assertions.
  report.proxyObservations = []
  for (const item of [
    ...cases,
    {
      name: 'identity-with-gzip-validator',
      method: 'GET',
      headers: { 'Accept-Encoding': 'identity', 'If-None-Match': `W/"${encoded.sha256}"` },
      status: 200,
      expected: logical,
    },
  ]) {
    const response = await read(new URL(path, await mf.ready), item.method, item.headers)
    let decodedSha256
    const errors = []
    if (item.expected) {
      if (response.status !== item.status) errors.push('wrong proxy response status')
      if (response.headers.etag !== `"${item.expected.sha256}"`)
        errors.push('proxy validator differs from original client representation')
      if (response.headers['content-encoding'] !== (item.expected === encoded ? 'gzip' : undefined))
        errors.push('proxy encoding differs from original client preference')
    }
    if (item.method === 'GET' && response.status === 200)
      try {
        decodedSha256 = hash(
          response.headers['content-encoding'] === 'gzip'
            ? gunzipSync(response.bytes)
            : response.bytes,
        )
      } catch (error) {
        decodedSha256 = String(error)
      }
    if (
      item.expected &&
      item.method === 'GET' &&
      response.status === 200 &&
      decodedSha256 !== logical.sha256
    )
      errors.push('proxy decoded bytes differ from logical module')
    report.failures.push(...errors.map((error) => `proxy ${item.name}: ${error}`))
    report.proxyObservations.push({
      name: item.name,
      status: response.status,
      headers: response.headers,
      wireBytes: response.bytes.length,
      wireSha256: hash(response.bytes),
      decodedSha256,
      errors,
    })
  }
  await read(new URL('/retire', origin), 'POST')
  const retired = await read(new URL(path, origin), 'GET', { 'Accept-Encoding': 'identity' })
  if (retired.status !== 200) report.failures.push('retired release became unavailable')
  await read(new URL('/revoke', origin), 'POST')
  const revoked = await read(new URL(path, origin), 'GET', { 'Accept-Encoding': 'gzip' })
  if (revoked.status !== 404 || revoked.headers['cache-control'] !== 'no-store')
    report.failures.push('revoked release remained available')
  report.policy = { retired: retired.status, revoked: revoked.status }
} catch (error) {
  report.failures.push(String(error))
} finally {
  try {
    await mf.dispose()
    report.cleanupConfirmed = true
  } catch (error) {
    report.failures.push(`Cleanup failed: ${error}`)
  }
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report))
  if (report.failures.length) process.exitCode = 1
}
