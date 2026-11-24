import { awaitWithSignal } from '@sistemazero/core/http'
import {
  type CheckSandboxLease,
  type CheckSandboxOperation,
  type CheckSandboxPoolPort,
  type CheckSandboxPools,
  freshCheckSandboxLease,
} from './check-sandbox-pool-store'

/** A warmed slot is exclusively owned until cleanup finishes. Concurrent checks get their own VM. */

export const CHECK_SANDBOX_SLEEP_AFTER = '5m'

export const CHECK_SANDBOX_OPTIONS = {
  enableDefaultSession: false,
  transport: 'rpc',
  sleepAfter: CHECK_SANDBOX_SLEEP_AFTER,
} as const

/** O build hospedado usa o `executionId` cru como nome: o prefixo separa os dois contêineres. */
export function checkSandboxId(executionId: string): string {
  return `objetivos-${executionId}`
}

/** Abre e fecha o Chromium da imagem uma vez, para o primeiro teste não pagar a leitura a frio. */
export const CHECK_WARM_COMMAND = 'node /opt/sz-runtime/check-warm.mjs'
export const CHECK_WARM_TIMEOUT_MS = 45_000
const CHECK_POOL_RPC_BUDGET_MS = 3_000

export interface CheckSandboxReservation {
  lease: CheckSandboxLease
  pool?: CheckSandboxPoolPort
}

export async function reserveCheckSandbox(
  pools: CheckSandboxPools | undefined,
  executionId: string,
  threeD: boolean,
  operation: CheckSandboxOperation,
): Promise<CheckSandboxReservation | null> {
  try {
    if (!pools) throw new Error('Sandbox pool binding unavailable')
    const pool = pools.getByName(`objetivos-cache-${threeD ? '3d' : '2d'}`)
    const lease = await awaitWithSignal(
      () => pool.acquire(operation, executionId, threeD),
      AbortSignal.timeout(CHECK_POOL_RPC_BUDGET_MS),
    )
    if (lease.kind === 'skipped') {
      if (operation !== 'warm') throw new Error('Check acquisition was skipped')
      return null
    }
    return { lease, pool }
  } catch {
    console.warn('studio-runtime check reservation unavailable', { operation, threeD })
    if (operation === 'warm') throw new Error('Warming coordinator unavailable')
    // The LG01 path stays functional without ever touching a possibly leased warm resource.
    return { lease: freshCheckSandboxLease(false) }
  }
}

interface CheckSandbox {
  exec(command: string, options: { timeout: number }): Promise<{ success: boolean }>
  destroy(): Promise<unknown>
}

export async function finishCheckSandbox(
  sandbox: CheckSandbox,
  cwd: string | undefined,
  reusable: boolean,
  reservation: CheckSandboxReservation,
): Promise<void> {
  let cleaned = reusable && reservation.lease.pooled
  if (cleaned && cwd) {
    cleaned = await sandbox
      .exec(`rm -rf -- '${cwd}'`, { timeout: 5_000 })
      .then((result) => result.success)
      .catch(() => false)
  }
  let destructionConfirmed = false
  if (!cleaned) {
    try {
      await sandbox.destroy()
      destructionConfirmed = true
    } catch {
      console.warn('studio-runtime owned check destruction unconfirmed')
    }
  }
  // Never destroy after this RPC: its acknowledgement may be lost after a successor acquires.
  const pool = reservation.pool
  if (pool) {
    try {
      await awaitWithSignal(
        () => pool.release(reservation.lease, cleaned, destructionConfirmed),
        AbortSignal.timeout(CHECK_POOL_RPC_BUDGET_MS),
      )
    } catch {
      console.warn('studio-runtime check reservation release unconfirmed')
    }
  }
}

/** Corpo do aquecimento: `{executionId, threeD}`. O nome segue a régua do pedido de verificação. */
export function readCheckWarmRequest(
  value: unknown,
  isExecutionId: (id: unknown) => id is string,
): { executionId: string; threeD: boolean } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const { executionId, threeD, ...rest } = value as Record<string, unknown>
  if (Object.keys(rest).length || !isExecutionId(executionId) || typeof threeD !== 'boolean')
    return null
  return { executionId, threeD }
}
