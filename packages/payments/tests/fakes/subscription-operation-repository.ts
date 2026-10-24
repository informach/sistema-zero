import type {
  SubscriptionOperation,
  SubscriptionOperationRepository,
} from '../../src/domain/subscription/subscription-operation'

/** Fake de persistência para a borda HTTP; concorrência real é provada em tests/db. */
export class InMemorySubscriptionOperationRepository implements SubscriptionOperationRepository {
  private readonly items = new Map<string, SubscriptionOperation>()
  async create(operation: SubscriptionOperation): Promise<boolean> {
    for (const current of this.items.values()) {
      if (current.subscriptionId !== operation.subscriptionId) continue
      if (current.state === 'READY' && current.expiresAt <= operation.createdAt)
        current.state = 'REJECTED'
      if (['READY', 'EXECUTING', 'UNKNOWN'].includes(current.state)) return false
    }
    this.items.set(operation.id, structuredClone(operation))
    return true
  }
  async findById(id: string): Promise<SubscriptionOperation | null> {
    const operation = this.items.get(id)
    return operation ? structuredClone(operation) : null
  }
  async findActiveForSubscription(
    subscriptionId: string,
    now: Date,
  ): Promise<SubscriptionOperation | null> {
    const operation = [...this.items.values()].find(
      (item) =>
        item.subscriptionId === subscriptionId &&
        ['READY', 'EXECUTING', 'UNKNOWN'].includes(item.state) &&
        (item.state !== 'READY' || item.expiresAt > now),
    )
    return operation ? structuredClone(operation) : null
  }

  async start(
    id: string,
    subscriptionId: string,
    now: Date,
  ): Promise<SubscriptionOperation | null> {
    const operation = this.items.get(id)
    if (
      !operation ||
      operation.subscriptionId !== subscriptionId ||
      operation.state !== 'READY' ||
      operation.expiresAt <= now
    )
      return null
    operation.state = 'EXECUTING'
    operation.startedAt = now
    return structuredClone(operation)
  }
  async finish(
    id: string,
    state: 'UNKNOWN' | 'SUCCEEDED' | 'REJECTED',
    result: string,
    now: Date,
  ): Promise<void> {
    const operation = this.items.get(id)
    if (operation?.state !== 'EXECUTING') throw new Error('Operation state conflict')
    Object.assign(operation, { state, result, completedAt: now })
  }
}
