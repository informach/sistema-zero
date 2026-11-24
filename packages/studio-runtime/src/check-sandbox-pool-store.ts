/** Longer than the 140 s execution budget plus cleanup. Expiry retires the name, not its user. */
export const CHECK_SANDBOX_LEASE_MS = 180_000

export type CheckSandboxOperation = 'check' | 'warm'
export interface CheckSandboxLease {
  kind: 'lease'
  sandboxId: string
  token: string
  pooled: boolean
}
export type CheckSandboxAllocation = CheckSandboxLease | { kind: 'skipped' }
export interface CheckSandboxPoolPort {
  acquire(operation: CheckSandboxOperation): Promise<CheckSandboxAllocation>
  release(lease: CheckSandboxLease, reusable: boolean): Promise<boolean>
}
export interface CheckSandboxPools {
  getByName(name: string): CheckSandboxPoolPort
}

/** The store needs only rows, not an SDK-specific cursor. Also used with real SQLite in tests. */
interface PoolSql {
  exec(query: string, ...bindings: (string | number | null)[]): { toArray(): unknown[] }
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function freshCheckSandboxLease(pooled: boolean): CheckSandboxLease {
  return {
    kind: 'lease',
    sandboxId: `check-${crypto.randomUUID().replaceAll('-', '')}`,
    token: crypto.randomUUID(),
    pooled,
  }
}

/** Called synchronously inside a DO storage transaction; no network or await in a transition. */
export function createCheckSandboxPoolStore(sql: PoolSql) {
  sql.exec(
    'CREATE TABLE IF NOT EXISTS check_sandbox_slot (slot INTEGER PRIMARY KEY CHECK(slot = 1), sandbox_id TEXT NOT NULL, token TEXT, expires_at INTEGER NOT NULL)',
  )
  const read = () => {
    const row = sql
      .exec('SELECT sandbox_id, token, expires_at FROM check_sandbox_slot WHERE slot = 1')
      .toArray()[0]
    if (row === undefined) return undefined
    if (
      !record(row) ||
      typeof row.sandbox_id !== 'string' ||
      (row.token !== null && typeof row.token !== 'string') ||
      typeof row.expires_at !== 'number' ||
      !Number.isSafeInteger(row.expires_at)
    )
      throw new Error('Invalid persisted sandbox reservation')
    return { sandboxId: row.sandbox_id, token: row.token, expiresAt: row.expires_at }
  }
  return {
    acquire(operation: CheckSandboxOperation, now: number): CheckSandboxAllocation {
      if (!['check', 'warm'].includes(operation) || !Number.isSafeInteger(now) || now < 0)
        throw new Error('Invalid sandbox acquisition')
      const current = read()
      if (current?.token && current.expiresAt > now)
        return operation === 'warm' ? { kind: 'skipped' } : freshCheckSandboxLease(false)
      const lease = freshCheckSandboxLease(true)
      // Only an idle, acknowledged-clean machine can be reused. Expired reservations get a new name.
      if (current && current.token === null) lease.sandboxId = current.sandboxId
      sql.exec(
        'INSERT INTO check_sandbox_slot (slot, sandbox_id, token, expires_at) VALUES (1, ?, ?, ?) ON CONFLICT(slot) DO UPDATE SET sandbox_id = excluded.sandbox_id, token = excluded.token, expires_at = excluded.expires_at',
        lease.sandboxId,
        lease.token,
        now + CHECK_SANDBOX_LEASE_MS,
      )
      return lease
    },
    release(lease: CheckSandboxLease, reusable: boolean, now: number): boolean {
      if (
        !record(lease) ||
        lease.kind !== 'lease' ||
        typeof lease.sandboxId !== 'string' ||
        typeof lease.token !== 'string' ||
        typeof lease.pooled !== 'boolean' ||
        typeof reusable !== 'boolean' ||
        !Number.isSafeInteger(now) ||
        now < 0
      )
        throw new Error('Invalid sandbox release')
      if (!lease.pooled) return false
      const current = read()
      if (!current || current.sandboxId !== lease.sandboxId || current.token !== lease.token)
        return false
      if (!reusable || current.expiresAt <= now)
        sql.exec(
          'DELETE FROM check_sandbox_slot WHERE slot = 1 AND sandbox_id = ? AND token = ?',
          lease.sandboxId,
          lease.token,
        )
      else
        sql.exec(
          'UPDATE check_sandbox_slot SET token = NULL, expires_at = 0 WHERE slot = 1 AND sandbox_id = ? AND token = ?',
          lease.sandboxId,
          lease.token,
        )
      return true
    },
  }
}
