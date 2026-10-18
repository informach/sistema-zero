import { expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { structuredBytes } from '../core/structuredBytes'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { sceneStorageCapacity, sceneStorageCapacityForStore } from './sceneStorageCapacity'

test('gallery capacity adds back its own stored bytes without borrowing space used by other apps', async () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'storage')
  const db = await nativeDatabase()
  try {
    const model = makeModel()
    await db.seed(`molda:record:${model.id}`, model)
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: async () => ({ quota: 80 * 1024 ** 2, usage: 20 * 1024 ** 2 }) },
    })
    expect(await sceneStorageCapacityForStore(db.store, model.id)).toBe(
      52 * 1024 ** 2 + structuredBytes(model),
    )
  } finally {
    if (original) Object.defineProperty(navigator, 'storage', original)
    else Reflect.deleteProperty(navigator, 'storage')
    db.close()
  }
})

test('capacity reserves origin space, accounts for other tools, bounds large disks and tolerates denied estimates', async () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'storage')
  try {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: async () => ({ quota: 80 * 1024 ** 2, usage: 20 * 1024 ** 2 }) },
    })
    expect(await sceneStorageCapacity(10 * 1024 ** 2)).toBe(62 * 1024 ** 2)
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: async () => ({ quota: 10 * 1024 ** 3, usage: 0 }) },
    })
    expect(await sceneStorageCapacity()).toBe(2 * 1024 ** 3)
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => {
          throw new Error('Denied')
        },
      },
    })
    expect(await sceneStorageCapacity()).toBe(MOLDA_LIMITS.maxGalleryBytes)
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
    expect(await sceneStorageCapacity()).toBe(MOLDA_LIMITS.maxGalleryBytes)
  } finally {
    if (original) Object.defineProperty(navigator, 'storage', original)
    else Reflect.deleteProperty(navigator, 'storage')
  }
})
