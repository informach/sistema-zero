import { canonical, ToolRejected } from '@sistemazero/agent-core'
import { ApiError } from '@sistemazero/agent-integrations/sistemazero'
import { z } from 'zod'
import { Locks } from '../execution/locks'
import type { Store } from '../store/client'
import { hash } from '../tools/paths'

export const receiptSchema = z.object({
  id: z.string(),
  digest: z.string(),
  runId: z.string(),
  kind: z.string(),
  state: z.enum(['prepared', 'dispatched', 'confirmed', 'unknown', 'failed']),
  createdAt: z.string(),
  value: z.unknown().optional(),
  evidence: z.string().optional(),
})
export class Outbound {
  private locks = new Locks()
  constructor(private store: Store) {}
  async execute(
    kind: string,
    scope: string,
    intentId: string,
    input: unknown,
    runId: string,
    action: (marker: string) => Promise<unknown>,
  ) {
    const id = hash(canonical({ kind, scope, intentId }))
    const digest = hash(canonical(input))
    return this.locks.with(id, async () => {
      const raw = await this.store.call({ op: 'document.get', namespace: 'outbound', id })
      let receipt = raw
        ? receiptSchema.parse(raw)
        : receiptSchema.parse({
            id,
            digest,
            kind,
            runId,
            state: 'prepared',
            createdAt: new Date().toISOString(),
          })
      if (receipt.digest !== digest)
        throw new ToolRejected(
          'INTENT_CHANGED',
          'Intent was already used for different content or destination',
        )
      if (receipt.state === 'confirmed')
        return { receiptId: id, duplicate: true, value: receipt.value }
      if (receipt.state === 'unknown' || receipt.state === 'dispatched')
        throw new Error(`Uncertain outbound receipt ${id}; inspect provider before another attempt`)
      if (receipt.state === 'failed')
        throw new ToolRejected(
          'OUTBOUND_REJECTED',
          `Receipt ${id} was rejected; inspect it before explicitly retrying`,
        )
      const save = () =>
        this.store.call({ op: 'document.put', namespace: 'outbound', id, value: receipt })
      await save()
      receipt = { ...receipt, state: 'dispatched' }
      await save()
      try {
        const value = await action(id)
        receipt = { ...receipt, state: 'confirmed', value }
        await save()
        return { receiptId: id, duplicate: false, value }
      } catch (error) {
        const rejected =
          error instanceof ToolRejected ||
          (error instanceof ApiError &&
            ([400, 401, 403, 404, 409, 422, 429].includes(error.status) ||
              error.code === 'CIRCUIT_OPEN'))
        receipt = { ...receipt, state: rejected ? 'failed' : 'unknown' }
        await save()
        if (rejected)
          throw new ToolRejected(
            'OUTBOUND_REJECTED',
            error instanceof Error ? error.message : 'Provider rejected the operation',
          )
        throw error
      }
    })
  }
  async reconcile(
    id: string,
    resolution: 'confirmed' | 'not_applied',
    evidence: string,
    value?: unknown,
  ) {
    return this.locks.with(id, async () => {
      const receipt = receiptSchema.parse(
        await this.store.call({ op: 'document.get', namespace: 'outbound', id }),
      )
      if (!['unknown', 'dispatched', 'failed'].includes(receipt.state))
        throw new Error('Receipt does not need reconciliation')
      const updated = {
        ...receipt,
        state: resolution === 'confirmed' ? 'confirmed' : 'prepared',
        evidence: z.string().min(10).max(8000).parse(evidence),
        ...(value === undefined ? {} : { value }),
      }
      await this.store.call({
        op: 'document.batch',
        documents: [
          { namespace: 'outbound', id, value: updated },
          {
            namespace: 'outbound-resolutions',
            id: crypto.randomUUID(),
            value: {
              receiptId: id,
              resolution,
              evidence,
              actor: 'local-user',
              at: new Date().toISOString(),
            },
          },
        ],
      })
      return updated
    })
  }
}
