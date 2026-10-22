import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalJson } from '@sistemazero/core/creations'
import { type PythonPromotionPlan, verifyPythonPromotionPlan } from './python-promotion-plan'

type Wire = { status: number; headers: Headers; bytes: number; sha256: string; text?: string }
const deliveryMime: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  wasm: 'application/wasm',
  json: 'application/json',
  zip: 'application/zip',
  txt: 'text/plain; charset=utf-8',
}
type ReadWire = (
  url: URL,
  options: {
    method: 'GET' | 'HEAD'
    headers: Record<string, string>
    maximum: number
    text?: boolean
    signal: AbortSignal
  },
) => Promise<Wire>

/** Native HTTP preserves compressed bytes: fetch may transparently decompress them. */
export const readRuntimeWire: ReadWire = async (url, options) => {
  assert(url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === '127.0.0.1'))
  const request = url.protocol === 'https:' ? httpsRequest : httpRequest
  let requestClosed!: Promise<void>
  let outgoing!: ReturnType<typeof request>
  const response = new Promise<import('node:http').IncomingMessage>((accept, reject) => {
    outgoing = request(
      url,
      { method: options.method, headers: options.headers, agent: false, signal: options.signal },
      accept,
    )
    requestClosed = new Promise((done) => outgoing.once('close', done))
    outgoing.once('error', reject)
    outgoing.end()
  })
  let incoming: import('node:http').IncomingMessage | undefined
  let incomingClosed: Promise<void> | undefined
  try {
    incoming = await response
    incomingClosed = new Promise((done) => incoming!.once('close', done))
    const headers = new Headers()
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) for (const item of value) headers.append(name, item)
      else if (value !== undefined) headers.set(name, value)
    }
    const chunks: Buffer[] = []
    const hash = createHash('sha256')
    let bytes = 0
    for await (const chunk of incoming) {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += data.byteLength
      assert(bytes <= options.maximum, 'Response exceeds its pinned byte budget')
      hash.update(data)
      if (options.text) chunks.push(data)
    }
    return {
      status: incoming.statusCode ?? 0,
      headers,
      bytes,
      sha256: hash.digest('hex'),
      ...(options.text ? { text: Buffer.concat(chunks).toString('utf8') } : {}),
    }
  } finally {
    incoming?.destroy()
    outgoing.destroy()
    await Promise.all([incomingClosed, requestClosed])
  }
}

/** Read-only delivery proof. It does not create projects or qualify public game execution. */
export async function qualifyPythonDelivery(
  input: Pick<PythonPromotionPlan, 'deployment'> & { origin: string; parentOrigins: string[] },
  read: ReadWire = readRuntimeWire,
  signal = AbortSignal.timeout(240_000),
  onPhase: (phase: string) => void = () => {},
) {
  const origin = new URL(input.origin)
  assert(
    origin.protocol === 'https:' &&
      origin.origin === input.origin &&
      !origin.username &&
      !origin.password,
  )
  const manifest = input.deployment.release.manifestSha256
  const results: { path: string; encoding: 'identity' | 'gzip'; bytes: number; sha256: string }[] =
    []
  const hidden: string[] = []
  const get = (path: string, maximum: number, extra: Partial<Parameters<ReadWire>[1]> = {}) => {
    onPhase(
      `${extra.method ?? 'GET'} ${path} ${extra.headers?.['Accept-Encoding'] ?? 'identity'}${extra.headers?.['If-None-Match'] ? ' conditional' : ''}`,
    )
    return read(new URL(path, origin), {
      method: 'GET',
      headers: { 'Accept-Encoding': 'identity' },
      maximum,
      signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
      ...extra,
    })
  }
  const metadata = await get(`/v1/runtime-deployments/${manifest}`, 2_000_000, { text: true })
  assert.equal(metadata.status, 200)
  assert.equal(metadata.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(metadata.headers.get('cache-control'), 'no-store')
  assert.equal(
    canonicalJson(JSON.parse(metadata.text!)),
    canonicalJson({
      release: input.deployment.release,
      distribution: input.deployment.distribution,
    }),
  )
  for (const file of input.deployment.distribution.files) {
    const path = `/v1/runtimes/${manifest}/${file.path}`
    if (file.path.startsWith('_http/gzip/')) {
      const response = await get(path, 16_384)
      assert.equal(response.status, 404)
      hidden.push(file.path)
      continue
    }
    const representations = [{ encoding: 'identity' as const, artifact: file }]
    const gzip = input.deployment.distribution.httpRepresentations?.find(
      (item) => item.path === file.path,
    )
    const compressed =
      gzip && input.deployment.distribution.files.find((item) => item.path === gzip.artifactPath)
    const checks: { encoding: 'identity' | 'gzip'; artifact: typeof file }[] = representations
    if (compressed) checks.push({ encoding: 'gzip', artifact: compressed })
    for (const { encoding, artifact } of checks) {
      const headers = { 'Accept-Encoding': encoding }
      const response = await get(path, Math.max(artifact.bytes, 16_384), { headers })
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('etag'), `"${artifact.sha256}"`)
      assert.equal(response.headers.get('content-encoding'), encoding === 'gzip' ? 'gzip' : null)
      assert.equal(response.headers.get('content-length'), String(artifact.bytes))
      assert.equal(response.headers.get('vary'), 'Accept-Encoding')
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
      assert.equal(
        response.headers.get('content-type'),
        deliveryMime[file.path.split('.').at(-1)!] ?? 'application/octet-stream',
      )
      assert.equal(response.headers.get('access-control-allow-origin'), '*')
      assert.equal(response.bytes, artifact.bytes)
      assert.equal(response.sha256, artifact.sha256)
      if (file.path.endsWith('.html')) {
        assert.equal(response.headers.get('cache-control'), 'no-store')
        const csp = response.headers.get('content-security-policy') ?? ''
        const ancestors = csp
          .split(';')
          .map((part) => part.trim())
          .find((part) => part.startsWith('frame-ancestors '))
        assert(ancestors)
        assert.deepEqual(
          new Set(ancestors.split(/\s+/).slice(1)),
          new Set(["'self'", ...input.parentOrigins]),
        )
      } else
        assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable')
      for (const method of ['HEAD', 'GET'] as const) {
        const conditional = await get(path, 16_384, {
          method,
          headers: {
            ...headers,
            ...(method === 'GET' ? { 'If-None-Match': `W/"${artifact.sha256}"` } : {}),
          },
        })
        assert.equal(conditional.status, method === 'HEAD' ? 200 : 304)
        assert.equal(conditional.headers.get('etag'), `"${artifact.sha256}"`)
        assert.equal(
          conditional.headers.get('content-encoding'),
          encoding === 'gzip' ? 'gzip' : null,
        )
        assert.equal(conditional.bytes, 0)
      }
      results.push({ path: file.path, encoding, bytes: response.bytes, sha256: response.sha256 })
    }
  }
  return {
    metadataVerified: true,
    gzipWireBytesVerified: results.some((item) => item.encoding === 'gzip'),
    gzipRepresentationsVerified: results.filter((item) => item.encoding === 'gzip').length,
    results,
    hiddenRepresentations: hidden,
    publicGameExecutionQualified: false,
    hostedUiQualified: false,
    mutationsPerformed: false,
  }
}

export async function runPythonDeliveryQualification(args: readonly string[]) {
  assert(
    !('bun' in process.versions) && Number(process.versions.node.split('.')[0]) >= 24,
    'Compile the qualifier and run it with Node 24 or newer for native HTTP wire semantics',
  )
  assert.equal(
    args.length,
    8,
    'Use --environment staging|production --plan JSON --expect-plan-sha256 SHA --out NEW_DIRECTORY',
  )
  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]!,
      value = args[index + 1]!
    assert(
      ['--environment', '--plan', '--expect-plan-sha256', '--out'].includes(flag) &&
        value &&
        !value.startsWith('--') &&
        !values.has(flag),
      'Invalid or repeated argument',
    )
    values.set(flag, value)
  }
  assert(['staging', 'production'].includes(values.get('--environment')!))
  const planPath = resolve(values.get('--plan')!)
  const info = await lstat(planPath)
  assert(info.isFile() && !info.isSymbolicLink() && info.size <= 12_000_000)
  const source = await readFile(planPath, 'utf8')
  assert(Buffer.byteLength(source) <= 12_000_000)
  const plan = await verifyPythonPromotionPlan(
    JSON.parse(source),
    values.get('--expect-plan-sha256')!,
  )
  assert.equal(plan.input.environment, values.get('--environment'))
  const directory = resolve(values.get('--out')!)
  await mkdir(directory, { recursive: false })
  const receiptPath = resolve(directory, 'receipt.json')
  const receipt: Record<string, unknown> = {
    kind: 'python-remote-runtime-delivery',
    state: 'RUNNING',
    startedAt: new Date().toISOString(),
    environment: plan.input.environment,
    planSha256: plan.planSha256,
    manifestSha256: plan.deployment.release.manifestSha256,
    distributionSha256: plan.input.distribution.sha256,
    mutationsPerformed: false,
  }
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
  let failed = false
  let phase = 'metadata'
  try {
    Object.assign(
      receipt,
      await qualifyPythonDelivery(
        {
          deployment: plan.deployment,
          origin: plan.input.target.runtimeOrigin,
          parentOrigins: plan.configuration.worker.parentOrigins,
        },
        readRuntimeWire,
        AbortSignal.timeout(240_000),
        (value) => {
          phase = value
        },
      ),
      { state: 'PASSED' },
    )
  } catch {
    failed = true
    receipt.state = 'FAILED'
    receipt.phase = phase
    receipt.failure = 'Delivery did not satisfy the pinned HTTP contract; no activation performed'
  } finally {
    receipt.completedAt = new Date().toISOString()
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
  }
  if (failed) throw new Error('Remote delivery qualification failed; inspect the safe receipt')
  return { state: receipt.state, receiptPath }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await runPythonDeliveryQualification(process.argv.slice(2))))
  } catch {
    console.error(
      'Python delivery qualification not completed. Verify arguments, pins, receipt and deployment.',
    )
    process.exitCode = 1
  }
}
