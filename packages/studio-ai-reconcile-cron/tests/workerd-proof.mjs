import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Use the installed Wrangler dependency tree, never install or invoke a provider CLI.
const require = createRequire(import.meta.url)
const local = createRequire(require.resolve('wrangler/package.json'))
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = local('miniflare')
const engine = local('workerd')
assert.equal(process.env.MINIFLARE_WORKERD_PATH, undefined, 'Engine override is not permitted')
assert.equal(process.env.MINIFLARE_WORKERD_CONFIG_DEBUG, undefined, 'Config dump is not permitted')
assert(process.argv.length <= 3, 'Only an optional explicit source path is accepted')
const sourcePath = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL('../src/index.ts', import.meta.url))
const source = await readFile(sourcePath, 'utf8')
const compiled = stripTypeScriptTypes(source, { mode: 'strip' })
const report = {
  kind: 'studio-ai-reconcile-native-workerd-proof',
  node: process.version,
  miniflare: local('miniflare/package.json').version,
  workerd: engine.version,
  engineSha256: createHash('sha256')
    .update(await readFile(engine.default))
    .digest('hex'),
  compatibilityDate: engine.compatibilityDate,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  checks: [],
  results: [],
  disposeAcknowledged: false,
  externalNetworkCalls: 0,
  hostedQualified: false,
}
const origin = 'https://community-kids-staging.up.railway.app'
const secret = 'local-workerd-test-secret-not-a-real-credential'
let responseMode = 'redirect'
let calls = 0
let followed = 0
let stage = 'startup'
const mf = new Miniflare(
  convertV4MiniflareOptions({
    host: '127.0.0.1',
    port: 0,
    cf: false,
    log: new Log(LogLevel.NONE),
    compatibilityDate: engine.compatibilityDate,
    compatibilityFlags: ['nodejs_compat'],
    modules: [
      {
        type: 'ESModule',
        path: 'entry.mjs',
        contents: `
          import { runReconciliation } from './cron.mjs';
          export default {
            async fetch(request, env) {
              const path = new URL(request.url).pathname;
              if (path.startsWith('/construct/')) {
                const redirect = path.slice('/construct/'.length);
                try {
                  const value = new Request('https://never-resolved.invalid/', { redirect });
                  return Response.json({ threw: false, redirect: value.redirect });
                } catch (error) {
                  return Response.json({ threw: true, typeError: error instanceof TypeError });
                }
              }
              return Response.json(await runReconciliation(env));
            }
          }`,
      },
      { type: 'ESModule', path: 'cron.mjs', contents: compiled },
    ],
    bindings: {
      ENVIRONMENT: 'staging',
      KIDS_ORIGIN: origin,
      STUDIO_AI_RECONCILE_CRON_SECRET: secret,
    },
    // All native fetch egress terminates here. Never forward or resolve DNS.
    outboundService: async (request) => {
      calls++
      if (request.url === 'https://must-not-follow.invalid/redirect-target') {
        followed++
        return Response.json({ confirmed: 0, pending: 0, expiredBuilderJobs: 0 })
      }
      assert.equal(request.url, `${origin}/api/internal/studio-ai/reconcile`)
      assert.equal(request.method, 'POST')
      assert.equal(request.headers.get('authorization'), `Bearer ${secret}`)
      if (responseMode === 'redirect')
        return new Response(null, {
          status: 302,
          headers: { location: 'https://must-not-follow.invalid/redirect-target' },
        })
      return Response.json({ confirmed: 0, pending: 0, expiredBuilderJobs: 0 })
    },
  }),
)
async function send(path) {
  const response = await mf.dispatchFetch(`http://proof.invalid${path}`, {
    signal: AbortSignal.timeout(5000),
  })
  assert.equal(response.status, 200)
  return response.json()
}
try {
  stage = 'native-error-constructor'
  assert.deepEqual(await send('/construct/error'), { threw: true, typeError: true })
  assert.equal(calls, 0)
  report.checks.push('native-error-TypeError-before-egress')

  stage = 'native-manual-constructor'
  assert.deepEqual(await send('/construct/manual'), { threw: false, redirect: 'manual' })
  assert.equal(calls, 0)
  report.checks.push('native-manual-constructor-valid')

  stage = 'real-source-redirect'
  const redirect = await send('/run')
  report.results.push({ case: 'redirect', result: redirect, calls, followed })
  assert.deepEqual(redirect, { environment: 'staging', state: 'http-error', status: 302 })
  assert.equal(calls, 1)
  assert.equal(followed, 0)
  report.checks.push('real-source-302-rejected-with-one-egress-no-follow')

  stage = 'real-source-counts'
  responseMode = 'counts'
  calls = 0
  const counts = await send('/run')
  report.results.push({ case: 'counts', result: counts, calls, followed })
  assert.deepEqual(counts, {
    environment: 'staging',
    state: 'reconciled',
    confirmed: 0,
    pending: 0,
    expiredBuilderJobs: 0,
  })
  assert.equal(calls, 1)
  assert.equal(followed, 0)
  report.checks.push('real-source-200-exact-counts-one-egress')
} catch {
  report.failureStage = stage
  process.exitCode = 1
} finally {
  try {
    await mf.dispose()
    report.disposeAcknowledged = true
  } catch {
    report.cleanupFailure = true
    process.exitCode = 1
  }
  console.log(JSON.stringify(report))
}
