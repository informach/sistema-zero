const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const localRequire = createRequire(
  require.resolve('wrangler/package.json', { paths: [process.cwd()] }),
)
const { unstable_dev } = localRequire('wrangler')

async function main() {
  const worker = await unstable_dev(process.argv[2], {
    config: process.argv[3],
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
  async function send(route, body, status = 200) {
    const response = await fetch(`${origin}/${route}`, {
      method: 'POST',
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const text = await response.text()
    assert.equal(response.status, status, text)
    return JSON.parse(text).result
  }
  try {
    const concurrent = await Promise.all(
      Array.from({ length: 12 }, () => send('acquire', { operation: 'check' })),
    )
    assert.equal(
      concurrent.filter((lease) => lease.pooled).length,
      1,
      'Two requests owned the same warm slot',
    )
    assert.equal(new Set(concurrent.map((lease) => lease.sandboxId)).size, 12)
    const active = concurrent.find((lease) => lease.pooled)
    assert.deepEqual(await send('acquire', { operation: 'warm' }), { kind: 'skipped' })
    await send('restart', {}, 409)
    assert.equal(
      (await send('acquire', { operation: 'check' })).pooled,
      false,
      'Real DO reset lost active ownership',
    )
    assert.deepEqual(await send('acquire', { operation: 'warm' }), { kind: 'skipped' })
    assert.equal(
      await send('release', { lease: { ...active, token: 'forged' }, reusable: true }),
      false,
    )
    assert.equal(await send('release', { lease: active, reusable: true }), true)
    const successor = await send('acquire', { operation: 'check' })
    assert.equal(successor.sandboxId, active.sandboxId)
    assert.notEqual(successor.token, active.token)
    assert.equal(await send('release', { lease: active, reusable: false }), false)
    assert.equal((await send('acquire', { operation: 'check' })).pooled, false)
    const other = await send('acquire?profile=other-2d', { operation: 'check' })
    const threeD = await send('acquire?profile=profile-3d', { operation: 'check' })
    assert.equal(other.pooled, true)
    assert.equal(threeD.pooled, true)
    assert.notEqual(other.sandboxId, successor.sandboxId)
    assert.notEqual(threeD.sandboxId, successor.sandboxId)
    assert.equal(await send('release', { lease: successor, reusable: false }), true)
    assert.notEqual((await send('acquire', { operation: 'check' })).sandboxId, successor.sandboxId)
    const extra = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        send(`acquire?profile=capacity-${index}-2d`, { operation: 'warm' }),
      ),
    )
    assert.ok(extra.every((lease) => lease.pooled))
    assert.deepEqual(await send('acquire?profile=capacity-new-2d', { operation: 'warm' }), {
      kind: 'skipped',
    })
    assert.equal(
      (await send('acquire?profile=capacity-new-2d', { operation: 'check' })).pooled,
      false,
    )
    const forwarded = await send('proxy-acquire?profile=proxy-contract-3d', { operation: 'warm' })
    assert.equal(forwarded.kind, 'lease')
    assert.equal(forwarded.pooled, true)
    console.log(
      JSON.stringify({
        verified: true,
        concurrentRequests: 12,
        uniqueOwners: true,
        resetPreserved: true,
        staleReleaseFenced: true,
        profileAndClassIsolation: true,
        sharedCacheBounded: true,
        nativeRpcProxyVerified: true,
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
