import { expect, test } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { finishCheckSandbox, reserveCheckSandbox } from '../src/check-container'
import {
  CHECK_SANDBOX_LEASE_MS,
  type CheckSandboxAllocation,
  type CheckSandboxRetirement,
} from '../src/check-sandbox-pool-store'
import { checkPoolNamespace, checkPoolSqlite } from './check-pool-sqlite'

test('the shared 3D cache stays bounded across profiles and leaves new checks on the exclusive path', async () => {
  const pools = checkPoolNamespace()
  const first = await reserveCheckSandbox(pools, 'profile-a', true, 'warm')
  const second = await reserveCheckSandbox(pools, 'profile-b', true, 'warm')
  expect(first?.lease.pooled).toBe(true)
  expect(second?.lease.pooled).toBe(true)
  expect(await reserveCheckSandbox(pools, 'profile-c', true, 'warm')).toBeNull()
  const newcomer = await reserveCheckSandbox(pools, 'profile-c', true, 'check')
  expect(newcomer?.lease.pooled).toBe(false)
  expect(newcomer?.lease.sandboxId).not.toBe(first?.lease.sandboxId)
  expect(newcomer?.lease.sandboxId).not.toBe(second?.lease.sandboxId)
})

test('actual workerd RPC and SQLite preserve exclusive reservations across concurrent requests and DO reset', async () => {
  const directory = resolve(
    import.meta.dirname,
    '../../../.cache/lg02/check-pool',
    crypto.randomUUID(),
  )
  await mkdir(directory, { recursive: true })
  const worker = resolve(import.meta.dirname, 'fixtures/check-sandbox-pool-worker.ts')
  const config = resolve(directory, 'wrangler.json')
  await Bun.write(
    config,
    JSON.stringify({
      name: 'check-sandbox-pool-proof',
      main: worker,
      compatibility_date: '2026-07-01',
      compatibility_flags: ['nodejs_compat'],
      durable_objects: { bindings: [{ class_name: 'CheckPoolProbe', name: 'Pools' }] },
      migrations: [{ new_sqlite_classes: ['CheckPoolProbe'], tag: 'v1' }],
    }),
  )
  const child = Bun.spawn(
    [
      process.env.STUDIO_PYTHON_TEST_NODE ?? 'node',
      resolve(import.meta.dirname, 'fixtures/check-sandbox-pool-workerd.cjs'),
      worker,
      config,
    ],
    {
      cwd: resolve(import.meta.dirname, '..'),
      windowsHide: true,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_LOG_PATH: resolve(directory, 'wrangler.log'),
      },
    },
  )
  const timer = setTimeout(() => child.kill(), 40_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    await Bun.write(resolve(directory, 'result.json'), JSON.stringify({ exit, stdout, stderr }))
    if (exit !== 0) throw new Error(`Native check pool proof failed: ${stdout}${stderr}`)
    expect(stdout).toContain('"verified":true')
    expect(stdout).toContain('"resetPreserved":true')
    expect(stdout).toContain('"concurrentRequests":12')
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}, 45_000)

function lease(allocation: CheckSandboxAllocation | CheckSandboxRetirement) {
  if (allocation.kind !== 'lease') throw new Error('Expected lease')
  return allocation
}

test('an acquisition whose response is lost keeps its reservation fenced and uses a separate cold container', async () => {
  const pools = checkPoolNamespace()
  let admitted: CheckSandboxAllocation | undefined
  const reservation = await reserveCheckSandbox(
    {
      getByName(name) {
        const pool = pools.getByName(name)
        return {
          release: pool.release,
          async acquire(operation, profileId, threeD) {
            admitted = await pool.acquire(operation, profileId, threeD)
            throw new Error('Acquisition response lost')
          },
        }
      },
    },
    'check-acquisition-1234567890abcdef',
    false,
    'check',
  )
  expect(reservation?.lease.pooled).toBe(false)
  expect(reservation?.lease.sandboxId).not.toBe(admitted?.kind === 'lease' && admitted.sandboxId)
  expect(
    lease(
      await pools
        .getByName('objetivos-cache-2d')
        .acquire('check', 'check-acquisition-1234567890abcdef', false),
    ).pooled,
  ).toBe(false)
})

test('unavailable coordination preserves exclusive per-request checking and refuses warming', async () => {
  const first = await reserveCheckSandbox(
    undefined,
    'check-fallback-1234567890abcdef',
    false,
    'check',
  )
  const second = await reserveCheckSandbox(
    undefined,
    'check-fallback-1234567890abcdef',
    false,
    'check',
  )
  expect(first?.lease.pooled).toBe(false)
  expect(second?.lease.pooled).toBe(false)
  expect(second?.lease.sandboxId).not.toBe(first?.lease.sandboxId)
  await expect(
    reserveCheckSandbox(undefined, 'check-fallback-1234567890abcdef', false, 'warm'),
  ).rejects.toThrow('Warming coordinator unavailable')
})

test('only an acknowledged-clean idle sandbox is reused, with a new ownership token', () => {
  const { store } = checkPoolSqlite()
  const first = lease(store.acquire('warm', 1000))
  expect(store.release(first, true, 1100)).toBe(true)
  const next = lease(store.acquire('check', 1200))
  expect(next.sandboxId).toBe(first.sandboxId)
  expect(next.token).not.toBe(first.token)
  expect(store.release(first, true, 1300)).toBe(false)
  expect(lease(store.acquire('check', 1400)).pooled).toBe(false)
})

test('overlapping checks own different containers and overlapping warm is skipped', () => {
  const { store } = checkPoolSqlite()
  const first = lease(store.acquire('check', 1000))
  const second = lease(store.acquire('check', 1100))
  expect(first.pooled).toBe(true)
  expect(second.pooled).toBe(false)
  expect(second.sandboxId).not.toBe(first.sandboxId)
  expect(store.acquire('warm', 1200)).toEqual({ kind: 'skipped' })
  expect(store.release(second, false, 1300)).toBe(false)
  expect(lease(store.acquire('check', 1400)).pooled).toBe(false)
})

test('expired ownership rotates the container name and fences a late release', () => {
  const { store } = checkPoolSqlite()
  const old = lease(store.acquire('check', 1000))
  const retirement = store.acquire('check', 1000 + CHECK_SANDBOX_LEASE_MS)
  expect(retirement.kind).toBe('retire')
  if (retirement.kind !== 'retire') throw new Error('Expected retirement')
  expect(store.completeRetirement(retirement)).toBe(true)
  const current = lease(store.acquire('check', 1000 + CHECK_SANDBOX_LEASE_MS))
  expect(current.pooled).toBe(true)
  expect(current.sandboxId).not.toBe(old.sandboxId)
  expect(store.release(old, false, 1001 + CHECK_SANDBOX_LEASE_MS)).toBe(false)
  expect(lease(store.acquire('check', 1002 + CHECK_SANDBOX_LEASE_MS)).pooled).toBe(false)
})

test('a cleaned operation released after expiry never makes its old name reusable', () => {
  const { store } = checkPoolSqlite()
  const old = lease(store.acquire('check', 1000))
  expect(store.release(old, true, 1000 + CHECK_SANDBOX_LEASE_MS)).toBe(true)
  const retirement = store.acquire('check', 1001 + CHECK_SANDBOX_LEASE_MS)
  if (retirement.kind !== 'retire') throw new Error('Expected retirement')
  expect(retirement.sandboxId).toBe(old.sandboxId)
  expect(store.completeRetirement(retirement)).toBe(true)
  expect(lease(store.acquire('check', 1001 + CHECK_SANDBOX_LEASE_MS)).sandboxId).not.toBe(
    old.sandboxId,
  )
})

test('recreating the store preserves an active reservation in SQLite', () => {
  const pool = checkPoolSqlite()
  const active = lease(pool.store.acquire('check', 1000))
  const reopened = pool.reopen()
  expect(lease(reopened.acquire('check', 1100)).pooled).toBe(false)
  expect(reopened.release(active, true, 1200)).toBe(true)
  expect(lease(reopened.acquire('check', 1300)).sandboxId).toBe(active.sandboxId)
})

test('failure retires the name; a forged token cannot release a successor', () => {
  const { store } = checkPoolSqlite()
  const first = lease(store.acquire('check', 1000))
  expect(store.release(first, false, 1100, true)).toBe(true)
  const current = lease(store.acquire('check', 1200))
  expect(current.sandboxId).not.toBe(first.sandboxId)
  expect(store.release({ ...current, token: first.token }, true, 1300)).toBe(false)
  expect(lease(store.acquire('check', 1400)).pooled).toBe(false)
})

test('profiles share a bounded class cache but keep independent VM identities', async () => {
  const pools = checkPoolNamespace()
  const allocations = await Promise.all([
    reserveCheckSandbox(pools, 'alice', false, 'check'),
    reserveCheckSandbox(pools, 'alice', true, 'check'),
    reserveCheckSandbox(pools, 'bob', false, 'check'),
  ])
  expect(allocations.map((allocation) => allocation?.lease.pooled)).toEqual([true, true, true])
  expect(new Set(allocations.map((allocation) => allocation?.lease.sandboxId)).size).toBe(3)
})

test('a full cache does not retire a healthy idle VM to prewarm another profile', () => {
  const { store } = checkPoolSqlite()
  const first = lease(store.acquire('warm', 1000, 'alice', 1))
  expect(store.release(first, true, 1100)).toBe(true)
  expect(store.acquire('warm', 1200, 'bob', 1)).toEqual({ kind: 'skipped' })
  expect(lease(store.acquire('check', 1300, 'bob', 1)).pooled).toBe(false)
  expect(lease(store.acquire('check', 1400, 'alice', 1)).sandboxId).toBe(first.sandboxId)
})

test('eviction fences an expired idle profile and counts its VM until destruction is confirmed', () => {
  const { store } = checkPoolSqlite()
  const first = lease(store.acquire('warm', 1000, 'alice', 1))
  expect(store.release(first, true, 1100)).toBe(true)
  const retirement = store.acquire('warm', 301100, 'bob', 1)
  if (retirement.kind !== 'retire') throw new Error('Expected retirement')
  expect(retirement.sandboxId).toBe(first.sandboxId)
  expect(store.release(first, true, 301200)).toBe(false)
  expect(store.acquire('check', 301300, 'alice', 1).kind).toBe('retire')
  expect(store.completeRetirement({ ...retirement, token: 'forged' })).toBe(false)
  expect(store.acquire('warm', 301400, 'bob', 1)).toEqual(retirement)
  expect(store.completeRetirement(retirement)).toBe(true)
  const successor = lease(store.acquire('warm', 301500, 'bob', 1))
  expect(successor.sandboxId).not.toBe(first.sandboxId)
  expect(store.completeRetirement(retirement)).toBe(false)
  expect(lease(store.acquire('check', 301600, 'charlie', 1)).pooled).toBe(false)
})

test('unconfirmed destruction quarantines the slot instead of freeing warm capacity', () => {
  const { store } = checkPoolSqlite()
  const first = lease(store.acquire('check', 1000))
  expect(store.release(first, false, 1100, false)).toBe(true)
  const retirement = store.acquire('warm', 1200)
  if (retirement.kind !== 'retire') throw new Error('Expected retirement')
  expect(retirement.sandboxId).toBe(first.sandboxId)
  expect(store.acquire('warm', 1300, 'other', 1)).toEqual(retirement)
})

test('idle cache expiry requires retirement before a new VM is admitted', () => {
  const { store } = checkPoolSqlite()
  const first = lease(store.acquire('warm', 1000))
  store.release(first, true, 1100)
  expect(lease(store.acquire('check', 1200)).sandboxId).toBe(first.sandboxId)
  const active = store.acquire('check', 1300)
  expect(active.kind === 'lease' && active.pooled).toBe(false)
  // A separate idle generation expires without being handed back to an owner.
  const secondPool = checkPoolSqlite().store
  const idle = lease(secondPool.acquire('warm', 1000))
  secondPool.release(idle, true, 1100)
  const retirement = secondPool.acquire('check', 301100)
  expect(retirement.kind).toBe('retire')
})

test('lost release acknowledgement never destroys a sandbox already acquired by its successor', async () => {
  const pool = checkPoolNamespace().getByName('lost-ack')
  const first = lease(await pool.acquire('check'))
  let successor: CheckSandboxAllocation | undefined
  let destroyed = false
  await finishCheckSandbox(
    {
      exec: async () => ({ success: true }),
      destroy: async () => {
        destroyed = true
      },
    },
    '/workspace/builds/test',
    true,
    {
      lease: first,
      pool: {
        acquire: pool.acquire,
        async release(lease, reusable) {
          await pool.release(lease, reusable)
          successor = await pool.acquire('check')
          throw new Error('Response lost after commit')
        },
      },
    },
  )
  expect(destroyed).toBe(false)
  expect(successor?.kind === 'lease' && successor.sandboxId).toBe(first.sandboxId)
  expect(lease(await pool.acquire('check')).pooled).toBe(false)
})
