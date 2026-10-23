const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const localRequire = createRequire(
  require.resolve('wrangler/package.json', { paths: [process.cwd()] }),
)
const { unstable_dev } = localRequire('wrangler')
async function main() {
  const input = JSON.parse(await fs.readFile(process.argv[3], 'utf8'))
  const worker = await unstable_dev(process.argv[2], {
    config: process.argv[4],
    ip: '127.0.0.1',
    port: 0,
    local: true,
    persist: false,
    envFiles: [],
    logLevel: 'error',
    experimental: {
      disableExperimentalWarning: true,
      disableDevRegistry: true,
      watch: false,
      forceLocal: true,
      enableContainers: false,
    },
  })
  const origin = `http://${worker.address}:${worker.port}`
  async function send(probe, route, body, status = 200) {
    const response = await fetch(`${origin}/${route}?probe=${probe}`, {
      method: body === undefined ? 'GET' : 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const raw = await response.text()
    assert.equal(response.status, status, raw)
    return JSON.parse(raw)
  }
  try {
    const prestart = await send('prestart', 'cancel', input)
    assert.deepEqual(prestart.result, { retired: true, cleanupConfirmed: true })
    const tombstone = (await send('prestart', 'read')).result
    assert.equal(tombstone.status, 'cancelled')
    assert.equal(tombstone.sandboxCreated, false)
    assert.equal(tombstone.cleanupConfirmed, true)
    await send('prestart', 'inspect', { version: 1, input, structure: false }, 410)
    await send('prestart', 'restart', {}, 409)
    assert.deepEqual((await send('prestart', 'read')).result, tombstone)
    await send('prestart', 'inspect', { version: 1, input, structure: false }, 410)
    assert.deepEqual((await send('prestart', 'cancel', input)).result, prestart.result)
    await send('prestart', 'cancel', { ...input, generation: crypto.randomUUID() }, 409)
    assert.deepEqual((await send('prestart', 'read')).result, tombstone)

    // No configured distribution/bucket: terminal failure must still close its
    // ownership and reject duplicate starts, without touching the SDK at all.
    await send('unconfigured', 'inspect', { version: 1, input, structure: false }, 503)
    const failed = (await send('unconfigured', 'read')).result
    assert.equal(failed.status, 'failed')
    assert.equal(failed.sandboxCreated, false)
    assert.equal(failed.cleanupConfirmed, true)
    await send('unconfigured', 'inspect', { version: 1, input, structure: false }, 410)
    await send('unconfigured', 'alarm')
    assert.deepEqual((await send('unconfigured', 'read')).result, failed)
    await send('unconfigured', 'restart', {}, 409)
    assert.deepEqual((await send('unconfigured', 'read')).result, failed)

    const duplicates = await Promise.all(
      Array.from({ length: 8 }, async () => {
        const response = await fetch(`${origin}/inspect?probe=duplicates`, {
          method: 'POST',
          body: JSON.stringify({ version: 1, input, structure: false }),
          signal: AbortSignal.timeout(5000),
        })
        await response.text()
        return response.status
      }),
    )
    assert.equal(duplicates.filter((status) => status === 503).length, 1)
    assert.ok(duplicates.every((status) => [409, 410, 503].includes(status)))
    const expired = { ...input, expiresAt: Date.now() - 1 }
    await send('expired', 'inspect', { version: 1, input: expired, structure: false }, 410)
    assert.equal((await send('expired', 'read')).result, undefined)
    assert.deepEqual((await send('expired', 'cancel', expired)).result, prestart.result)
    assert.equal((await send('expired', 'read')).result, undefined)
    await send(
      'invalid',
      'inspect',
      { version: 1, input: { ...input, jobId: 'f'.repeat(64) }, structure: false },
      409,
    )
    assert.equal((await send('invalid', 'read')).result, undefined)
    // Seeded terminal state qualifies real SQLite/RPC/retention decisions, not SDK execution.
    const now = Date.now()
    const previewInput = { ...input, expiresAt: now - 30_000 }
    const jobId = createHash('sha256').update(JSON.stringify(previewInput)).digest('hex')
    const seeded = {
      version: 1,
      stateVersion: 1,
      jobId,
      input: previewInput,
      structure: false,
      operation: {
        mode: 'validate',
        recipe: {
          version: 1,
          observeMs: 1000,
          stdin: [],
          keys: [],
          clicks: [],
          requireGraphics: false,
        },
        preview: { parentOrigin: 'https://app.example' },
      },
      status: 'succeeded',
      createdAt: now - 120_000,
      deadline: now - 60_000,
      sandboxCreated: true,
      cleanupConfirmed: true,
    }
    assert.equal((await send('preview', 'seed-preview', seeded)).result, true)
    const scope = {
      jobId,
      projectId: input.projectId,
      revision: input.revision,
      parentOrigin: 'https://app.example',
      expiresAt: seeded.deadline + 24 * 60 * 60_000 - 1000,
    }
    assert.equal((await send('preview', 'preview-available', scope)).result, true)
    await send('preview', 'alarm')
    assert.deepEqual((await send('preview', 'read')).result, seeded)
    await send(
      'preview',
      'purge-preview',
      { expected: seeded, now: previewInput.expiresAt + 1 },
      409,
    )
    await send('preview', 'cancel', previewInput)
    assert.equal((await send('preview', 'preview-available', scope)).result, true)
    await send('preview', 'restart', {}, 409)
    assert.equal((await send('preview', 'preview-available', scope)).result, true)
    await send(
      'preview',
      'discard-preview',
      { ...previewInput, generation: crypto.randomUUID() },
      409,
    )
    assert.equal((await send('preview', 'preview-available', scope)).result, true)
    await send('preview', 'discard-preview', previewInput)
    assert.equal((await send('preview', 'preview-available', scope)).result, false)
    await send('preview', 'restart', {}, 409)
    assert.equal((await send('preview', 'preview-available', scope)).result, false)
    const discarded = (await send('preview', 'read')).result
    assert.equal(discarded.previewRetired, true)
    await send('preview', 'purge-preview', {
      expected: discarded,
      now: seeded.deadline + 24 * 60 * 60_000 + 1,
    })
    assert.equal((await send('preview', 'preview-available', scope)).result, false)
    console.log(
      JSON.stringify({
        verified: true,
        controller: true,
        sdk: false,
        resetPreserved: true,
        previewDecision: true,
        previewRetention: true,
        previewDiscardReset: true,
      }),
    )
  } finally {
    await worker.stop()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
