import { DurableObject } from 'cloudflare:workers'
import {
  type CheckSandboxLease,
  type CheckSandboxOperation,
  createCheckSandboxPoolStore,
} from './check-sandbox-pool-store'

/** One profile/class owns one idle warm slot. Active operations never share its container. */
export class CheckSandboxPool extends DurableObject {
  private readonly store = createCheckSandboxPoolStore(this.ctx.storage.sql)

  acquire(operation: CheckSandboxOperation) {
    return this.ctx.storage.transactionSync(() => this.store.acquire(operation, Date.now()))
  }

  release(lease: CheckSandboxLease, reusable: boolean) {
    return this.ctx.storage.transactionSync(() => this.store.release(lease, reusable, Date.now()))
  }
}
