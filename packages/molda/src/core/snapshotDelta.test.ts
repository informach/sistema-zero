import { describe, expect, test } from 'bun:test'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { createHistory } from './history'
import type { MoldaAsset, MoldaModelAsset } from './model'
import { retainSnapshotDelta } from './snapshotDelta'

describe('snapshot deltas', () => {
  test('one changed pixel retains a run, not the full bitmap, and never mutates the base', () => {
    const before = { pixels: new Uint8Array(1024 * 1024), label: 'pintura' }
    const after = { ...before, pixels: before.pixels.slice() }
    after.pixels[500] = 7
    const delta = retainSnapshotDelta(before, after)
    expect(delta.bytes).toBeLessThan(256)
    const restored = delta.restore(after)
    expect(restored).toEqual(before)
    expect(after.pixels[500]).toBe(7)
    expect(restored.pixels).not.toBe(after.pixels)
    expect(before.pixels[500]).toBe(0)
  })

  test('dense painting uses a bounded replacement instead of millions of tiny runs', () => {
    const before = new Uint8Array(1024)
    const after = before.map((_, i) => i % 2)
    const delta = retainSnapshotDelta(before, after)
    expect(delta.bytes).toBeLessThanOrEqual(before.byteLength + 32)
    expect(delta.restore(after)).toEqual(before)
  })

  test('restores all asset kinds, added/deleted fields and structural list edits exactly', () => {
    const before: MoldaAsset[] = [makeModel(), makeSky(), makeTexture()]
    const after: MoldaAsset[] = before.map((asset) => ({
      ...asset,
      name: 'editado',
      thumb: 'foto',
    }))
    const model = after[0] as MoldaModelAsset
    model.parts = [...model.parts.slice(1), { ...model.parts[0]!, id: 'new-part' }]
    for (let i = 0; i < before.length; i += 1) {
      const original = structuredClone(before[i])
      expect(retainSnapshotDelta(before[i], after[i]).restore(after[i])).toEqual(original)
      expect(retainSnapshotDelta(after[i], before[i]).restore(before[i])).toEqual(after[i])
      expect(before[i]).toEqual(original)
    }
    for (const [a, b] of [
      [[], [1]],
      [[1, 2], []],
      [[undefined], [4]],
    ] as const) {
      expect(retainSnapshotDelta<readonly (number | undefined)[]>(a, b).restore(b)).toEqual(a)
    }
    const delta = retainSnapshotDelta({ present: undefined }, { removed: 1 })
    expect(delta.restore({ removed: 1 })).toEqual({ present: undefined })
  })

  test('many undo/redo transitions reproduce independent snapshots without retaining whole images', () => {
    const snapshots = [{ pixels: new Uint8Array(4096), name: 'imagem' }]
    const h = createHistory({
      sizeOf: () => 4096,
      byteBudget: 16_000,
      retain: retainSnapshotDelta<(typeof snapshots)[number]>,
    })
    for (let i = 0; i < 50; i += 1) {
      const previous = snapshots.at(-1)!
      const next = { ...previous, pixels: previous.pixels.slice() }
      next.pixels[i * 11] = i + 1
      h.record(previous, next)
      snapshots.push(next)
    }
    let current = snapshots.at(-1)!
    for (let i = snapshots.length - 2; i >= 0; i -= 1) {
      current = h.undo(current)!
      expect(current).toEqual(snapshots[i]!)
    }
    expect(h.canUndo()).toBe(false)
    for (let i = 1; i < snapshots.length; i += 1) {
      current = h.redo(current)!
      expect(current).toEqual(snapshots[i]!)
    }
    expect(h.canRedo()).toBe(false)
  })
})
