import { expect, test } from 'bun:test'
import {
  readCompatibilityIsolation,
  sameCompatibilityIsolation,
  sealCompatibilityInventory,
} from './localCompatibilityIsolation'

test('an exact inventory is order independent; changing a document, revision or reader revokes the exemption', () => {
  const records = new Map<string, unknown>()
  const inventory = [
    { id: 'a', revision: 'r1' },
    { id: 'b', revision: 'r2' },
  ]
  const first = sealCompatibilityInventory(records, inventory, 7)
  expect(first).toBeDefined()
  expect(
    sameCompatibilityIsolation(
      first,
      sealCompatibilityInventory(records, [...inventory].reverse(), 7),
    ),
  ).toBe(true)
  expect(sameCompatibilityIsolation(first, sealCompatibilityInventory(records, inventory, 6))).toBe(
    false,
  )
  expect(
    sameCompatibilityIsolation(
      first,
      sealCompatibilityInventory(records, [{ id: 'a', revision: 'r3' }, inventory[1]!], 7),
    ),
  ).toBe(false)
  expect(
    sameCompatibilityIsolation(first, sealCompatibilityInventory(records, inventory.slice(1), 7)),
  ).toBe(false)
  // Returning to an older inventory cannot resurrect its previous permission.
  expect(sameCompatibilityIsolation(first, sealCompatibilityInventory(records, inventory, 7))).toBe(
    false,
  )
})

test('an unversioned record, malformed ledger or foreign marker never grants overwrite permission', () => {
  const records = new Map<string, unknown>()
  expect(sealCompatibilityInventory(records, [{ id: 'a', revision: null }], 7)).toBeUndefined()
  expect(records.size).toBe(0)
  const corrupt = { version: 2, revision: 'future', documents: [] }
  records.set('pinta:local:compatibility:7', corrupt)
  expect(sealCompatibilityInventory(records, [{ id: 'a', revision: 'r1' }], 7)).toBeUndefined()
  expect(records.get('pinta:local:compatibility:7')).toBe(corrupt)
  expect(
    readCompatibilityIsolation({
      version: 1,
      readerSchema: 7,
      inventoryRevision: 'r',
      future: true,
    }),
  ).toBeUndefined()
  expect(
    readCompatibilityIsolation({ version: 2, readerSchema: 7, inventoryRevision: 'r' }),
  ).toBeUndefined()
  expect(sameCompatibilityIsolation(undefined, undefined)).toBe(false)
})

test('isolation metadata never executes getters', () => {
  let reads = 0
  expect(
    readCompatibilityIsolation({
      version: 1,
      readerSchema: 7,
      get inventoryRevision() {
        reads++
        return 'r'
      },
    }),
  ).toBeUndefined()
  expect(reads).toBe(0)
})
