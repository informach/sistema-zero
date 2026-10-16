import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { inventorySummary } from '@sistemazero/marketing-contracts'
import { scanInventory } from '../src/inventory-node'

// Read-only source inventory. No source script is executed, no file is uploaded.
const destination = path.resolve(import.meta.dir, '../../../.cache/import-inventory')
await mkdir(destination, { recursive: true })
for (const source of [
  { origin: 'sistema-zero', root: 'C:/Users/tocha/projects/sistema-zero' },
  { origin: 'fluxo-criativo', root: 'C:/Users/tocha/Documents/fluxo-criativo' },
] as const) {
  const inventory = await scanInventory({ ...source, signal: AbortSignal.timeout(10 * 60000) })
  await writeFile(
    path.join(destination, `${source.origin}.json`),
    JSON.stringify(inventory, null, 2),
  )
  const products: Record<string, number> = {},
    categories: Record<string, number> = {}
  for (const entry of inventory.entries) {
    products[entry.product] = (products[entry.product] ?? 0) + 1
    categories[entry.category] = (categories[entry.category] ?? 0) + 1
  }
  console.log(
    JSON.stringify({
      origin: source.origin,
      digest: inventory.digest,
      ...inventorySummary(inventory),
      products,
      categories,
    }),
  )
}
