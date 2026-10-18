const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const localRequire = createRequire(
  require.resolve('wrangler/package.json', { paths: [process.cwd()] }),
)
const { unstable_dev } = localRequire('wrangler')
async function main() {
  const seed = JSON.parse(await fs.readFile(process.argv[3], 'utf8'))
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
  const send = async (route, body, status = 200) => {
    const response = await fetch(`${origin}/${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const text = await response.text()
    assert.equal(response.status, status, text)
    return JSON.parse(text).result
  }
  try {
    assert.equal(await send('claim', seed), true)
    assert.equal(await send('claim', seed), false)
    assert.deepEqual(await send('read'), seed)
    const admitted = await send('update', { expected: seed, changes: { sandboxCreated: true } })
    const competing = await Promise.all([
      send('update', { expected: admitted, changes: { status: 'failed' } }),
      send('update', { expected: admitted, changes: { status: 'cancelled' } }),
    ])
    assert.equal(competing.filter(Boolean).length, 1, 'Two requests won the same state version')
    let state = await send('read')
    assert.equal(state.stateVersion, 3)
    assert.ok(['failed', 'cancelled'].includes(state.status))
    const forged = structuredClone(state)
    forged.input.owner = 'f'.repeat(64)
    state = await send('update', { expected: forged, changes: { cleanupConfirmed: true } })
    assert.equal(
      state.input.owner,
      seed.input.owner,
      'Mutable caller state replaced persisted ownership',
    )
    assert.equal(state.cleanupConfirmed, true)
    assert.equal(
      await send('update', { expected: seed, changes: { cleanupConfirmed: true } }),
      undefined,
    )
    await send('update', { expected: state, changes: { status: 'running' } }, 409)
    await send('update', { expected: state, changes: { sandboxCreated: false } }, 409)
    await send('update', { expected: state, changes: { cleanupConfirmed: false } }, 409)
    await send('update', { expected: state, changes: { input: forged.input } }, 409)
    await send('restart', {}, 409)
    assert.deepEqual(await send('read'), state, 'SQLite ownership was lost after actual DO reset')
    assert.equal(await send('claim', seed), false, 'Reset allowed a closed job to be readmitted')
    const early = structuredClone(state)
    early.input.expiresAt = early.deadline
    await send('purge', { expected: early, now: early.deadline + 1 }, 409)
    assert.deepEqual(await send('read'), state)
    assert.equal(await send('purge', { expected: state, now: state.input.expiresAt }), true)
    assert.equal(await send('read'), undefined)
    const prestart = { ...seed, status: 'cancelled', cleanupConfirmed: true }
    assert.equal(await send('claim?probe=prestart', prestart), true)
    await send(
      'update?probe=prestart',
      { expected: prestart, changes: { sandboxCreated: true } },
      409,
    )
    assert.deepEqual(await send('read?probe=prestart'), prestart)
    const cleaned = { ...seed, cleanupConfirmed: true }
    assert.equal(await send('claim?probe=cleaned', cleaned), true)
    await send(
      'update?probe=cleaned',
      { expected: cleaned, changes: { sandboxCreated: true } },
      409,
    )
    console.log(
      JSON.stringify({
        verified: true,
        sqliteCas: true,
        resetPreserved: true,
        terminalFence: true,
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
