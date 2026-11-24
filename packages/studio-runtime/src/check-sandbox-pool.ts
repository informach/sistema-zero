import { DurableObject } from 'cloudflare:workers'
import { getSandbox, type Sandbox } from '@cloudflare/sandbox'
import {
  CHECK_SANDBOX_CACHE_SLOTS,
  type CheckSandboxLease,
  type CheckSandboxOperation,
  createCheckSandboxPoolStore,
  uncachedCheckSandbox,
} from './check-sandbox-pool-store'

interface PoolEnv {
  ProBuildSandbox: DurableObjectNamespace<Sandbox>
  ThreeDCheckSandbox?: DurableObjectNamespace<Sandbox>
  /** Qualification may lower the cache bound; it may never exceed the product bound. */
  STUDIO_CHECK_CACHE_SLOTS?: string
}
/** One bounded cache per physical executor class. Network I/O never holds a storage transaction. */
export class CheckSandboxPool extends DurableObject<PoolEnv> {
  private readonly store = createCheckSandboxPoolStore(this.ctx.storage.sql)
  async acquire(operation: CheckSandboxOperation, profileId = 'default', threeD = false) {
    const maximum = threeD ? CHECK_SANDBOX_CACHE_SLOTS.threeD : CHECK_SANDBOX_CACHE_SLOTS.twoD
    const configured =
      this.env.STUDIO_CHECK_CACHE_SLOTS === undefined
        ? maximum
        : Number(this.env.STUDIO_CHECK_CACHE_SLOTS)
    if (!Number.isSafeInteger(configured) || configured < 1 || configured > maximum)
      throw new Error('Invalid check cache bound')
    for (let attempt = 0; attempt < 2; attempt++) {
      const allocation = this.ctx.storage.transactionSync(() =>
        this.store.acquire(operation, Date.now(), profileId, configured),
      )
      if (allocation.kind !== 'retire') return allocation
      try {
        const namespace = threeD ? this.env.ThreeDCheckSandbox : this.env.ProBuildSandbox
        if (!namespace) throw new Error('Check namespace unavailable')
        await getSandbox(namespace, allocation.sandboxId, {
          enableDefaultSession: false,
          transport: 'rpc',
        }).destroy()
        this.ctx.storage.transactionSync(() => this.store.completeRetirement(allocation))
      } catch {
        console.warn('studio-runtime cached check retirement unconfirmed', { threeD })
        return uncachedCheckSandbox(operation)
      }
    }
    return uncachedCheckSandbox(operation)
  }
  release(lease: CheckSandboxLease, reusable: boolean, destructionConfirmed = false) {
    return this.ctx.storage.transactionSync(() =>
      this.store.release(lease, reusable, Date.now(), destructionConfirmed),
    )
  }
}
