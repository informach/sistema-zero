import { CheckSandboxPool } from '../../src/check-sandbox-pool'
import type { CheckSandboxLease } from '../../src/check-sandbox-pool-store'

/** Loopback-only qualification. Production has no reset or state-editing route. */
export class CheckPoolProbe extends CheckSandboxPool {
  restart() {
    this.ctx.abort('EXPECTED_LOCAL_CHECK_POOL_RESTART')
  }
}
interface Env {
  Pools: DurableObjectNamespace<CheckPoolProbe>
}
function readLease(value: unknown): CheckSandboxLease | undefined {
  if (
    !value ||
    typeof value !== 'object' ||
    !('kind' in value) ||
    value.kind !== 'lease' ||
    !('sandboxId' in value) ||
    typeof value.sandboxId !== 'string' ||
    !('token' in value) ||
    typeof value.token !== 'string' ||
    !('pooled' in value) ||
    typeof value.pooled !== 'boolean'
  )
    return undefined
  return { kind: 'lease', sandboxId: value.sandboxId, token: value.token, pooled: value.pooled }
}
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const pool = env.Pools.getByName(url.searchParams.get('profile') ?? 'profile-2d')
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') return new Response(null, { status: 400 })
    try {
      if (
        url.pathname === '/acquire' &&
        'operation' in body &&
        (body.operation === 'check' || body.operation === 'warm')
      )
        return Response.json({ result: await pool.acquire(body.operation) })
      if (
        url.pathname === '/release' &&
        'lease' in body &&
        'reusable' in body &&
        typeof body.reusable === 'boolean'
      ) {
        const lease = readLease(body.lease)
        if (lease) return Response.json({ result: await pool.release(lease, body.reusable) })
      }
      if (url.pathname === '/restart') await pool.restart()
      return new Response(null, { status: 400 })
    } catch {
      return Response.json({ rejected: true }, { status: 409 })
    }
  },
} satisfies ExportedHandler<Env>
