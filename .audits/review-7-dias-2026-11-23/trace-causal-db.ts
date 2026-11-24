import { DrizzlePintaGraphRepository } from '../../packages/members/src/infrastructure/persistence/drizzle/pinta-causal-store'

const ids = new WeakMap<object, number>()
let next = 0
for (const key of ['page', 'backfillAttest'] as const) {
  const original = DrizzlePintaGraphRepository.prototype[key]
  DrizzlePintaGraphRepository.prototype[key] = function (...args: unknown[]) {
    if (!ids.has(this)) ids.set(this, ++next)
    const id = ids.get(this)
    const database = (this as any).db.$client.options.database
    return (original as Function).apply(this, args).catch((error: Error) => {
      console.error('CAUSAL_DB_TRACE', { key, id, database, message: error.message })
      throw error
    })
  } as never
}
