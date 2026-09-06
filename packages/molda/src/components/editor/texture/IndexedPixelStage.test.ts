import { describe, expect, it } from 'bun:test'
import { mapIndexedPixelPoint } from './IndexedPixelStage'

describe('mapIndexedPixelPoint', () => {
  it('clamps a captured pointer to the edge when wrapping is disabled', () => {
    expect(
      mapIndexedPixelPoint({
        displayX: 20,
        displayY: 9,
        width: 16,
        height: 16,
        offset: [0, 0],
        wrap: false,
        clamp: true,
        flipX: false,
      }),
    ).toEqual({ x: 15, y: 9 })
  })

  it('returns null outside a masked face instead of joining strokes across it', () => {
    const mask = new Uint8Array(16)
    mask[5] = 1
    expect(
      mapIndexedPixelPoint({
        displayX: 0,
        displayY: 0,
        width: 4,
        height: 4,
        offset: [0, 0],
        wrap: false,
        clamp: false,
        flipX: false,
        mask,
      }),
    ).toBeNull()
  })
})
