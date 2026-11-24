import { expect, test } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { finishCheckSandbox, reserveCheckSandbox } from '../src/check-container'
import {
  CHECK_SANDBOX_LEASE_MS,
  type CheckSandboxAllocation,
} from '../src/check-sandbox-pool-store'
import { checkPoolNamespace, checkPoolSqlite } from './check-pool-sqlite'

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

function lease(allocation: CheckSandboxAllocation) {
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
          async acquire(operation) {
            admitted = await pool.acquire(operation)
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
    lease(await pools.getByName('objetivos-check-acquisition-1234567890abcdef-2d').acquire('check'))
      .pooled,
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
  expect(store.release(first, false, 1100)).toBe(true)
  const current = lease(store.acquire('check', 1200))
  expect(current.sandboxId).not.toBe(first.sandboxId)
  expect(store.release({ ...current, token: first.token }, true, 1300)).toBe(false)
  expect(lease(store.acquire('check', 1400)).pooled).toBe(false)
})

test('profile and 2D/3D coordination keys have independent persisted slots', async () => {
  const pools = checkPoolNamespace()
  const allocations = await Promise.all(
    ['alice-2d', 'alice-3d', 'bob-2d'].map((name) => pools.getByName(name).acquire('check')),
  )
  expect(allocations.map((allocation) => lease(allocation).pooled)).toEqual([true, true, true])
  expect(new Set(allocations.map((allocation) => lease(allocation).sandboxId)).size).toBe(3)
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
