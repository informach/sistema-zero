import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { GetBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

const railway = {
  project: '415d5a1c-5f75-432c-8445-b395d0977ce3',
  environment: 'f634cff6-aafb-4804-8b69-172fad4e946e',
  adultService: '9df1b493-4cea-4b36-bec8-7299f054c17d',
}
const bucket = 'testes-ugc'
const communities = [
  { audience: 'adult', origin: 'https://community-staging-66f2.up.railway.app' },
  { audience: 'kids', origin: 'https://community-kids-staging.up.railway.app' },
]
const format = 'application/gzip'
const prefix = `qa/pinta-causal/${randomUUID()}/`
const run = {
  environment: 'staging',
  provider: 'Cloudflare R2',
  bucket,
  preflights: [],
  checks: [],
}
const owned = new Set()
const signal = () => AbortSignal.timeout(15_000)
const digest = (body) => createHash('sha256').update(body).digest('hex')
const list = (value) => (value ?? '').split(',').map((item) => item.trim().toLowerCase())
const objectRoot = (endpoint) => `${endpoint.origin}/${bucket}/`
const readHeader = (response, name) => response.headers.get(name)
const report = process.stdout.write.bind(process.stdout)

function stagingVariables() {
  const command = [
    'railway variable list --json',
    '--project',
    railway.project,
    '--environment',
    railway.environment,
    '--service',
    railway.adultService,
  ].join(' ')
  const raw = execFileSync('pwsh', ['-NoProfile', '-Command', command], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20_000,
  })
  const settings = JSON.parse(raw)
  assert.equal(settings.RAILWAY_ENVIRONMENT_NAME, 'staging')
  assert.equal(settings.RAILWAY_ENVIRONMENT_ID, railway.environment)
  assert.equal(settings.RAILWAY_PUBLIC_DOMAIN, new URL(communities[0].origin).hostname)
  assert.equal(settings.R2_UGC_BUCKET, bucket)
  assert.ok(!settings.R2_S3_ENDPOINT && /^[a-f0-9]{32}$/.test(settings.R2_ACCOUNT_ID))
  assert.ok(settings.R2_ACCESS_KEY_ID && settings.R2_SECRET_ACCESS_KEY)
  return settings
}

async function preflight(url, origin) {
  const response = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type,if-none-match',
    },
    redirect: 'error',
    signal: signal(),
  })
  const allowed = list(readHeader(response, 'access-control-allow-headers'))
  const result = {
    origin,
    status: response.status,
    exactOrigin: readHeader(response, 'access-control-allow-origin') === origin,
    put: list(readHeader(response, 'access-control-allow-methods')).includes('put'),
    conditionalHeader: allowed.includes('if-none-match') || allowed.includes('*'),
    typeHeader: allowed.includes('content-type') || allowed.includes('*'),
  }
  await response.body?.cancel()
  return result
}

function approvedObject(url, endpoint, keys) {
  const decoded = decodeURIComponent(url.pathname)
  if (url.origin === endpoint.origin)
    return keys.has(decoded.slice(bucket.length + 2)) && decoded.startsWith(`/${bucket}/`)
  return url.origin === `https://${bucket}.${endpoint.hostname}` && keys.has(decoded.slice(1))
}

async function absent(api, key) {
  const found = await api.r2GetObjectUgc(key, signal())
  await found?.body.cancel()
  return !found
}

let phase = 'staging identity'
let browser
let api
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
// Send only the bounded report from this process, including on SDK/browser failures.
console.error = () => {}
console.warn = () => {}
try {
  const args = process.argv.slice(2)
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--probe'))
  const settings = stagingVariables()
  const endpoint = new URL(`https://${settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`)
  const corsClient = new S3Client({
    region: 'auto',
    endpoint: endpoint.origin,
    forcePathStyle: true,
    maxAttempts: 1,
    credentials: {
      accessKeyId: settings.R2_ACCESS_KEY_ID,
      secretAccessKey: settings.R2_SECRET_ACCESS_KEY,
    },
  })

  phase = 'bucket rules'
  try {
    const policy = await corsClient.send(new GetBucketCorsCommand({ Bucket: bucket }), {
      abortSignal: signal(),
    })
    run.rules = communities.map(({ origin }) => {
      const matches = (policy.CORSRules ?? []).filter((rule) =>
        rule.AllowedOrigins?.includes(origin),
      )
      return {
        origin,
        exactRules: matches.length,
        get: matches.some((rule) => rule.AllowedMethods?.includes('GET')),
        put: matches.some((rule) => rule.AllowedMethods?.includes('PUT')),
      }
    })
  } finally {
    corsClient.destroy()
  }

  phase = 'direct preflights'
  for (const { origin } of communities) {
    const result = await preflight(`${objectRoot(endpoint) + prefix}options-only`, origin)
    run.preflights.push(result)
    assert.ok(
      result.status === 204 &&
        result.exactOrigin &&
        result.put &&
        result.conditionalHeader &&
        result.typeHeader,
    )
  }
  const denied = await preflight(
    `${objectRoot(endpoint) + prefix}options-only`,
    'https://pinta-causal-qa.invalid',
  )
  run.deniedOriginStatus = denied.status
  assert.ok(denied.status === 403 && !denied.exactOrigin && !denied.put)

  if (args[0] === '--probe') {
    phase = 'prepare native fixture'
    process.env.NODE_ENV = 'test'
    process.env.JWT_HS256_SECRET = randomUUID()
    delete process.env.R2_S3_ENDPOINT
    for (const name of [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_UGC_BUCKET',
    ])
      process.env[name] = settings[name]
    api = await import('../.cache/pinta-causal-r2-entry.mjs')
    const { gzip, expected } = api.stagingPintaSheet()
    const replaced = Buffer.from(gzip)
    replaced[replaced.length - 1] ^= 255
    assert.ok(gzip.length <= 4096)

    phase = 'launch ephemeral Chrome'
    const { chromium } = createRequire(
      new URL('../../molda-cenarios/package.json', import.meta.url),
    )('playwright-core')
    browser = await chromium.launch({ channel: 'chrome', headless: true })

    for (const { origin, audience } of communities) {
      const record = { origin }
      run.checks.push(record)
      const upload = `${prefix + audience}/1.upload.gz`
      const seal = `${prefix + audience}/1.sealed.gz`
      const keys = new Set([upload, seal])
      phase = `${audience} fresh keys`
      assert.ok((await absent(api, upload)) && (await absent(api, seal)))
      const pageContext = await browser.newContext({ serviceWorkers: 'block' })
      try {
        await pageContext.route('**/*', async (route) => {
          const req = route.request()
          const url = new URL(req.url())
          const method = req.method()
          if (
            (url.origin === origin && req.isNavigationRequest() && method === 'GET') ||
            (['OPTIONS', 'PUT', 'GET'].includes(method) && approvedObject(url, endpoint, keys))
          )
            await route.continue()
          else await route.abort()
        })
        const page = await pageContext.newPage()
        phase = `${audience} public navigation`
        const navigation = await page.goto(`${origin}/login`, {
          waitUntil: 'domcontentloaded',
          timeout: 15_000,
        })
        assert.ok(navigation?.ok() && new URL(page.url()).origin === origin)

        phase = `${audience} signed preflight`
        const put = await api.r2PresignPutUgc({
          key: upload,
          contentType: format,
          contentLength: gzip.length,
          criarUmaVez: true,
          expiresInSeconds: 120,
        })
        assert.ok(approvedObject(new URL(put), endpoint, keys))
        owned.add(upload)
        const signed = await preflight(put, origin)
        record.signedPreflightStatus = signed.status
        assert.ok(
          signed.status === 204 &&
            signed.exactOrigin &&
            signed.put &&
            signed.conditionalHeader &&
            signed.typeHeader,
        )

        phase = `${audience} unsigned condition denied`
        const denied = await fetch(put, {
          method: 'PUT',
          headers: { Origin: origin, 'content-type': format },
          body: gzip,
          redirect: 'error',
          signal: signal(),
        })
        record.missingConditionStatus = denied.status
        await denied.body?.cancel()
        assert.ok([400, 403].includes(denied.status) && (await absent(api, upload)))

        phase = `${audience} Chrome PUT and retry`
        const statuses = await page.evaluate(
          async ({ url, original, changed, contentType }) => {
            const headers = { 'content-type': contentType, 'if-none-match': '*' }
            const statuses = []
            for (const bytes of [original, original, changed]) {
              const response = await fetch(url, {
                method: 'PUT',
                headers,
                body: new Uint8Array(bytes),
                credentials: 'omit',
                redirect: 'error',
                signal: AbortSignal.timeout(15_000),
              })
              statuses.push(response.status)
              await response.body?.cancel()
            }
            return statuses
          },
          { url: put, original: [...gzip], changed: [...replaced], contentType: format },
        )
        record.browserPutStatuses = statuses
        assert.deepEqual(statuses, [200, 412, 412])

        phase = `${audience} read and seal`
        const object = await api.r2GetObjectUgc(upload, signal())
        assert.ok(object)
        const admitted = await api.readPintaCausalBlob(object, expected, signal())
        assert.deepEqual(admitted.gzip, gzip)
        assert.equal(admitted.sha256, expected.sha256)
        assert.deepEqual(admitted.manifest.sheet, { tileSize: 16, count: 1 })
        owned.add(seal)
        assert.equal(
          await api.r2CreateObjectUgc(
            { key: seal, body: admitted.gzip, contentType: format },
            signal(),
          ),
          true,
        )
        assert.equal(
          await api.r2CreateObjectUgc({ key: seal, body: replaced, contentType: format }, signal()),
          false,
        )
        record.secondSealRejected = true

        phase = `${audience} Chrome GET`
        const disposition = 'attachment; filename="terra-qa.pinta.json.gz"'
        const get = await api.r2PresignGetUgc(seal, {
          expiresInSeconds: 120,
          responseContentType: format,
          responseContentDisposition: disposition,
        })
        assert.ok(approvedObject(new URL(get), endpoint, keys))
        const attached = await fetch(get, {
          headers: { Origin: origin },
          redirect: 'error',
          signal: signal(),
        })
        assert.equal(attached.status, 200)
        assert.equal(readHeader(attached, 'access-control-allow-origin'), origin)
        assert.equal(readHeader(attached, 'content-disposition'), disposition)
        assert.equal(digest(Buffer.from(await attached.arrayBuffer())), expected.sha256)
        const result = await page.evaluate(async (url) => {
          const response = await fetch(url, {
            credentials: 'omit',
            redirect: 'error',
            signal: AbortSignal.timeout(15_000),
          })
          const bytes = await response.arrayBuffer()
          const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
          return {
            status: response.status,
            bytes: bytes.byteLength,
            sha256: Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join(''),
          }
        }, get)
        record.browserGet = result
        assert.deepEqual(result, { status: 200, bytes: expected.bytes, sha256: expected.sha256 })
      } finally {
        await pageContext.close()
      }
    }
  }
} catch {
  run.failure = phase
  process.exitCode = 1
} finally {
  let removed = 0
  for (const key of owned) {
    try {
      const tail = key.slice(prefix.length)
      assert.ok(key.startsWith(prefix) && /^(adult|kids)\/1\.(upload|sealed)\.gz$/.test(tail))
      await api.r2DeleteObjectUgc(key)
      assert.ok(await absent(api, key))
      removed++
    } catch {
      run.cleanupIncomplete = true
      process.exitCode = 1
    }
  }
  await browser?.close().catch(() => {
    run.browserCleanupIncomplete = true
    process.exitCode = 1
  })
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
  run.disposableObjects = { attempted: owned.size, confirmedAbsent: removed }
  report(`${JSON.stringify(run, null, 2)}\n`)
}
