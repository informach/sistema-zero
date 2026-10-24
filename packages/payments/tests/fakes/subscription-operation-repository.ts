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
  async confirmPaidRetry(
    _input: Parameters<SubscriptionOperationRepository['confirmPaidRetry']>[0],
  ): Promise<SubscriptionOperation> {
    // This HTTP fake cannot prove the paid payment row or transactional locks. Those cases use PostgreSQL.
    throw new Error('Confirmation requires the database-backed repository')
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
    operation.executionId = crypto.randomUUID()
    operation.executionAttempts += 1
    return structuredClone(operation)
  }
  async finish(
    id: string,
    executionId: string,
    state: 'UNKNOWN' | 'SUCCEEDED' | 'REJECTED',
    result: string,
    now: Date,
  ): Promise<void> {
    const operation = this.items.get(id)
    if (operation?.state !== 'EXECUTING' || operation.executionId !== executionId)
      throw new Error('Operation state conflict')
    Object.assign(operation, { state, result, completedAt: now })
  }
  async rejectUnstartedForCancellation(subscriptionId: string, now: Date): Promise<void> {
    for (const item of this.items.values())
      if (
        item.subscriptionId === subscriptionId &&
        item.kind !== 'CANCEL' &&
        item.state === 'READY'
      )
        Object.assign(item, {
          state: 'REJECTED',
          result: 'CANCELLATION_REQUESTED',
          completedAt: now,
        })
  }
  async rejectWithdrawnCancellation(
    subscriptionId: string,
    _caseId: string,
    now: Date,
  ): Promise<void> {
    for (const item of this.items.values())
      if (
        item.subscriptionId === subscriptionId &&
        item.kind === 'CANCEL' &&
        item.state === 'READY'
      )
        Object.assign(item, { state: 'REJECTED', result: 'RECOVERY_PAID', completedAt: now })
  }
  async resumeCancellation(
    id: string,
    subscriptionId: string,
    now: Date,
    staleAfterMs: number,
  ): Promise<SubscriptionOperation | null> {
    const item = this.items.get(id)
    if (
      !item ||
      item.subscriptionId !== subscriptionId ||
      item.kind !== 'CANCEL' ||
      !['EXECUTING', 'UNKNOWN'].includes(item.state) ||
      !item.startedAt ||
      item.startedAt.getTime() > now.getTime() - staleAfterMs
    )
      return null
    Object.assign(item, {
      state: 'EXECUTING',
      startedAt: now,
      completedAt: null,
      executionId: crypto.randomUUID(),
      executionAttempts: item.executionAttempts + 1,
    })
    return structuredClone(item)
  }
}
