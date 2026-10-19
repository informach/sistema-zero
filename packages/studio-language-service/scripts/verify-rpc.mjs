import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const temporaryRoot = resolve(tmpdir())
const temporary = await mkdtemp(join(temporaryRoot, 'sz-language-rpc-'))
const require = createRequire(resolve(directory, '../package.json'))
const dependencies = createRequire(require.resolve('wrangler'))
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = await import(
  pathToFileURL(dependencies.resolve('miniflare')).href
)
let mf
const failures = []
const receipt = { kind: 'real-workerd-language-command-capability', checks: [], state: 'failed' }
const record = (name) => receipt.checks.push(name)
try {
  const bundle = join(temporary, 'worker.mjs')
  const build = spawnSync(
    'bun',
    [
      '--no-env-file',
      'build',
      join(directory, 'fixtures/rpc-transport.ts'),
      '--target=browser',
      '--external',
      'cloudflare:workers',
      `--outfile=${bundle}`,
    ],
    { cwd: resolve(directory, '../../..'), encoding: 'utf8', windowsHide: true, timeout: 30_000 },
  )
  assert.equal(build.status, 0, build.stderr)
  const script = await readFile(bundle, 'utf8')
  receipt.entrySha256 = createHash('sha256').update(script).digest('hex')
  receipt.sourceSha256 = createHash('sha256')
    .update(await readFile(join(directory, '../src/language-transport.ts')))
    .digest('hex')
  mf = new Miniflare(
    convertV4MiniflareOptions({
      log: new Log(LogLevel.NONE),
      handleStructuredLogs: () => {},
      cf: false,
      rootPath: temporary,
      resourceTmpPath: temporary,
      unsafeDevRegistryPath: join(temporary, 'registry'),
      workers: [
        {
          name: 'language-transport-real-rpc',
          script,
          modules: true,
          compatibilityDate: '2026-07-01',
          compatibilityFlags: ['nodejs_compat'],
          durableObjects: { PROBE: { className: 'Probe', useSQLite: true } },
        },
      ],
    }),
  )
  const json = async (path) => {
    const response = await mf.dispatchFetch(`http://localhost/${path}`)
    assert.equal(response.status, 200)
    return response.json()
  }
  const entered = async (key, field = 'entered') => {
    for (let index = 0; index < 100; index++) {
      const state = await json(`inspect?key=${key}`)
      if (state[field]) return
    }
    throw new Error('Operation did not enter the controlled boundary')
  }
  assert.equal((await json('health')).healthy, true)
  record('health-request-signal-created-inside-rpc-destination')
  const repeat = await json('repeat')
  assert.equal(repeat.count, 1)
  assert.equal(repeat.bodies.length, 3)
  assert(repeat.bodies.every((body) => body === repeat.bodies[0]))
  assert.equal(JSON.parse(repeat.bodies[0]).authorized, true)
  record('stream-argument-and-repeated-rpc-runs-execute-once')
  const cancel = await json('cancel')
  assert.equal(cancel.rejected, true)
  assert.equal(cancel.count, 0)
  record('cancel-before-run-without-io')
  const readable = await json('single')
  assert.equal(readable.authorized, true)
  assert.equal(readable.body, 'safe-static-analysis-source')
  record('buffered-reply-readable-after-rpc-dispose')
  for (const [mode, key] of [
    ['hold', 'drain'],
    ['body', 'body-drain'],
  ]) {
    const running = mf.dispatchFetch(`http://localhost/${mode}?key=${key}`)
    await entered(key)
    let closed = false
    const closing = json(`close?key=${key}`).then((value) => {
      closed = true
      return value
    })
    await entered(key, 'closingEntered')
    if (mode === 'body') await entered(key, 'bodyCancelEntered')
    const before = await json(`inspect?key=${key}`)
    assert.equal(before.destroyed, false, `${mode}: close destroyed before actual drain`)
    assert.equal(before.completed, false)
    assert.equal(closed, false)
    record(`${mode}-cancel-awaits-actual-drain`)
    await json(`release?key=${key}`)
    assert.equal((await running).status, 410)
    assert.equal((await closing).destroyed, true)
    record(`${mode}-drained-before-destroy`)
  }
  const controller = new AbortController()
  const disconnected = mf
    .dispatchFetch('http://localhost/hold?key=disconnect', { signal: controller.signal })
    .then(
      (response) => response.status,
      () => 0,
    )
  await entered('disconnect')
  controller.abort()
  await disconnected
  const state = await json('inspect?key=disconnect')
  assert.equal(state.completed, false)
  assert.equal(state.destroyed, false)
  record('retained-after-caller-disconnect')
  let closed = false
  const closing = json('close?key=disconnect').then((value) => {
    closed = true
    return value
  })
  await entered('disconnect', 'closingEntered')
  await json('inspect?key=disconnect')
  assert.equal(closed, false)
  await json('release?key=disconnect')
  assert.equal((await closing).destroyed, true)
  record('disconnected-operation-drains-before-destroy')
  receipt.state = 'passed'
} catch (error) {
  failures.push(error)
} finally {
  let disposed = !mf,
    temporaryRemoved = false
  try {
    if (mf) {
      for (const key of ['drain', 'body-drain', 'disconnect'])
        await mf
          .dispatchFetch(`http://localhost/release?key=${key}`)
          .then((response) => response.body?.cancel())
          .catch(() => {})
      await mf.dispose()
      disposed = true
    }
  } catch (error) {
    failures.push(error)
  }
  try {
    assert.equal(dirname(resolve(temporary)), temporaryRoot)
    assert(resolve(temporary).startsWith(join(temporaryRoot, 'sz-language-rpc-')))
    await rm(temporary, { recursive: true, force: true })
    temporaryRemoved = true
  } catch (error) {
    failures.push(error)
  }
  if (failures.length) receipt.state = 'failed'
  receipt.cleanup = { disposed, temporaryRemoved }
  console.log(JSON.stringify(receipt))
}
if (failures.length) throw new AggregateError(failures, 'Real RPC verification failed')
