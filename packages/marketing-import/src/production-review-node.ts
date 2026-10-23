import type { ImportInventory } from '@sistemazero/marketing-contracts'
import { productionReviewSchema, relativeSourcePathSchema } from '@sistemazero/marketing-contracts'
import { sourceTextBytes, verifySource } from './inventory-node'
import { productionInputs, productionReviewFromTexts } from './production-inputs'

/** Offline verification reads only inventoried bytes; no scripts, remote links or inferred paths. */
export async function reviewInventoryProduction(input: {
  root: string
  inventory: ImportInventory
  folderPath: string
  signal: AbortSignal
}) {
  const { root, inventory, signal } = input
  if (inventory.origin !== 'sistema-zero')
    throw new Error('Esta origem ainda não tem um formato de montagem reconhecido')
  const { folder, selected } = productionInputs(
    inventory.entries,
    relativeSourcePathSchema.parse(input.folderPath),
  )
  const texts = new Map<string, string>()
  for (const { source: entry, kind } of selected) {
    signal.throwIfAborted()
    if (kind !== 'media') {
      const text = (await sourceTextBytes(root, entry, signal)).toString('utf8')
      texts.set(entry.path, text)
    } else {
      await verifySource(root, entry, signal)
    }
  }
  return productionReviewSchema.parse(productionReviewFromTexts(folder, inventory.entries, texts))
}
