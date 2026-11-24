import { Database } from 'bun:sqlite'
import { afterEach } from 'bun:test'
import {
  type CheckSandboxAllocation,
  type CheckSandboxPoolPort,
  createCheckSandboxPoolStore,
} from '../src/check-sandbox-pool-store'

const databases = new Set<Database>()
afterEach(() => {
  for (const database of databases) database.close()
  databases.clear()
})

export function checkPoolSqlite() {
  const database = new Database(':memory:')
  databases.add(database)
  const sql = {
    exec(query: string, ...bindings: (string | number | null)[]) {
      const rows = database.query(query).all(...bindings)
      return { toArray: () => rows }
    },
  }
  return {
    store: createCheckSandboxPoolStore(sql),
    reopen: () => createCheckSandboxPoolStore(sql),
    transaction: database.transaction.bind(database),
  }
}

export function checkPoolNamespace() {
  const pools = new Map<string, ReturnType<typeof checkPoolSqlite>>()
  const allocations: CheckSandboxAllocation[] = []
  return {
    allocations,
    getByName(name: string): CheckSandboxPoolPort {
      let pool = pools.get(name)
      if (!pool) {
        pool = checkPoolSqlite()
        pools.set(name, pool)
      }
      const current = pool
      return {
        async acquire(operation) {
          const result = current.transaction(() => current.store.acquire(operation, Date.now()))()
          allocations.push(result)
          return result
        },
        async release(lease, reusable) {
          return current.transaction(() => current.store.release(lease, reusable, Date.now()))()
        },
      }
    },
  }
}
