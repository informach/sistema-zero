/** Longer than the 140 s execution budget plus cleanup. Expiry retires the name, not its user. */
export const CHECK_SANDBOX_LEASE_MS = 180_000
export const CHECK_SANDBOX_CACHE_IDLE_MS = 300_000
export const CHECK_SANDBOX_CACHE_SLOTS = { twoD: 10, threeD: 2 } as const

export type CheckSandboxOperation = 'check' | 'warm'
export interface CheckSandboxLease {
  kind: 'lease'
  sandboxId: string
  token: string
  pooled: boolean
}
export type CheckSandboxAllocation = CheckSandboxLease | { kind: 'skipped' }
export interface CheckSandboxRetirement {
  kind: 'retire'
  sandboxId: string
  token: string
}
export interface CheckSandboxPoolPort {
  acquire(
    operation: CheckSandboxOperation,
    profileId?: string,
    threeD?: boolean,
  ): Promise<CheckSandboxAllocation>
  release(
    lease: CheckSandboxLease,
    reusable: boolean,
    destructionConfirmed?: boolean,
  ): Promise<boolean>
}
export interface CheckSandboxPools {
  getByName(name: string): CheckSandboxPoolPort
}
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
export function uncachedCheckSandbox(operation: CheckSandboxOperation): CheckSandboxAllocation {
  return operation === 'warm' ? { kind: 'skipped' } : freshCheckSandboxLease(false)
}
/** Synchronous transitions only. A retiring VM still counts until destruction is acknowledged. */
export function createCheckSandboxPoolStore(sql: PoolSql) {
  sql.exec(
    'CREATE TABLE IF NOT EXISTS check_sandbox_cache (profile_id TEXT PRIMARY KEY, sandbox_id TEXT NOT NULL UNIQUE, token TEXT, expires_at INTEGER NOT NULL, retirement_token TEXT)',
  )
  const rows = () =>
    sql
      .exec(
        'SELECT profile_id, sandbox_id, token, expires_at, retirement_token FROM check_sandbox_cache ORDER BY expires_at, profile_id',
      )
      .toArray()
      .map((row) => {
        if (
          !record(row) ||
          typeof row.profile_id !== 'string' ||
          typeof row.sandbox_id !== 'string' ||
          (row.token !== null && typeof row.token !== 'string') ||
          (row.retirement_token !== null && typeof row.retirement_token !== 'string') ||
          typeof row.expires_at !== 'number' ||
          !Number.isSafeInteger(row.expires_at)
        )
          throw new Error('Invalid persisted sandbox reservation')
        return {
          profileId: row.profile_id,
          sandboxId: row.sandbox_id,
          token: row.token,
          expiresAt: row.expires_at,
          retirementToken: row.retirement_token,
        }
      })
  const retire = (current: ReturnType<typeof rows>[number]): CheckSandboxRetirement => {
    const token = current.retirementToken ?? crypto.randomUUID()
    sql.exec(
      'UPDATE check_sandbox_cache SET token = NULL, retirement_token = ? WHERE sandbox_id = ?',
      token,
      current.sandboxId,
    )
    return { kind: 'retire', sandboxId: current.sandboxId, token }
  }
  return {
    acquire(
      operation: CheckSandboxOperation,
      now: number,
      profileId = 'default',
      capacity = 1,
    ): CheckSandboxAllocation | CheckSandboxRetirement {
      if (
        !['check', 'warm'].includes(operation) ||
        !Number.isSafeInteger(now) ||
        now < 0 ||
        typeof profileId !== 'string' ||
        !profileId ||
        profileId.length > 256 ||
        !Number.isSafeInteger(capacity) ||
        capacity < 1 ||
        capacity > CHECK_SANDBOX_CACHE_SLOTS.twoD
      )
        throw new Error('Invalid sandbox acquisition')
      const all = rows()
      const current = all.find((row) => row.profileId === profileId)
      if (current?.retirementToken) return retire(current)
      if (current?.token && current.expiresAt > now) return uncachedCheckSandbox(operation)
      if (current && current.expiresAt <= now) return retire(current)
      if (!current && all.length >= capacity) {
        // Discarding a VM need not immediately free its scheduler capacity. A cache miss
        // must not churn healthy idle generations just to prewarm another profile.
        const victim = all.find((row) => row.retirementToken || row.expiresAt <= now)
        return victim ? retire(victim) : uncachedCheckSandbox(operation)
      }
      const lease = freshCheckSandboxLease(true)
      // A VM is reused only by its own profile, after acknowledged cleanup.
      if (current) lease.sandboxId = current.sandboxId
      sql.exec(
        'INSERT INTO check_sandbox_cache (profile_id, sandbox_id, token, expires_at, retirement_token) VALUES (?, ?, ?, ?, NULL) ON CONFLICT(profile_id) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at',
        profileId,
        lease.sandboxId,
        lease.token,
        now + CHECK_SANDBOX_LEASE_MS,
      )
      return lease
    },
    completeRetirement(retirement: CheckSandboxRetirement): boolean {
      const current = rows().find((row) => row.sandboxId === retirement.sandboxId)
      if (!current || current.retirementToken !== retirement.token) return false
      sql.exec(
        'DELETE FROM check_sandbox_cache WHERE sandbox_id = ? AND retirement_token = ?',
        retirement.sandboxId,
        retirement.token,
      )
      return true
    },
    release(
      lease: CheckSandboxLease,
      reusable: boolean,
      now: number,
      destructionConfirmed = false,
    ): boolean {
      if (
        !record(lease) ||
        lease.kind !== 'lease' ||
        typeof lease.sandboxId !== 'string' ||
        typeof lease.token !== 'string' ||
        typeof lease.pooled !== 'boolean' ||
        typeof reusable !== 'boolean' ||
        typeof destructionConfirmed !== 'boolean' ||
        !Number.isSafeInteger(now) ||
        now < 0
      )
        throw new Error('Invalid sandbox release')
      if (!lease.pooled) return false
      const current = rows().find((row) => row.sandboxId === lease.sandboxId)
      if (!current || current.token !== lease.token || current.retirementToken) return false
      if (!reusable && destructionConfirmed)
        sql.exec(
          'DELETE FROM check_sandbox_cache WHERE sandbox_id = ? AND token = ?',
          lease.sandboxId,
          lease.token,
        )
      else if (!reusable || current.expiresAt <= now) retire(current)
      else
        sql.exec(
          'UPDATE check_sandbox_cache SET token = NULL, expires_at = ? WHERE sandbox_id = ? AND token = ?',
          now + CHECK_SANDBOX_CACHE_IDLE_MS,
          lease.sandboxId,
          lease.token,
        )
      return true
    },
  }
}
