import { describe, expect, test } from 'bun:test'
import type { PintaImageSelectionSummary } from '@sistemazero/core/studio/pinta-image'
import {
  defaultPintaImageScale,
  initialPintaImageMode,
  pintaImageModeSelection,
  pintaImageModeSize,
  pintaImageModesFor,
} from './pintaImageModes'

const sprite: PintaImageSelectionSummary = {
  kind: 'frame',
  width: 32,
  height: 32,
  animations: [{ id: 'a', name: 'parado', frameCount: 4 }],
  sheet: { width: 128, height: 32 },
}
const tiles: PintaImageSelectionSummary = {
  kind: 'tile',
  width: 16,
  height: 16,
  tileCount: 10,
  sheet: { width: 128, height: 32 },
}
const map: PintaImageSelectionSummary = {
  kind: 'tilemap',
  width: 720,
  height: 400,
  sheet: { width: 128, height: 48 },
}
const background: PintaImageSelectionSummary = { kind: 'background', width: 320, height: 180 }

describe('what a Python project brings from a Pinta drawing', () => {
  test('pygame: the whole drawing with its data is the default, the single image an option', () => {
    expect(pintaImageModesFor(sprite, true)).toEqual(['spritesheet', 'frame'])
    expect(pintaImageModesFor(tiles, true)).toEqual(['tileset', 'tile'])
    expect(pintaImageModesFor(map, true)).toEqual(['map', 'tilemap'])
    expect(pintaImageModesFor(background, true)).toEqual(['background'])
    expect(pintaImageModesFor({ kind: 'unavailable', reason: 'needs-tileset' }, true)).toEqual([])
  })

  test('Turtle / Pygame Zero, or a host without sheet facts, keep exactly the single image', () => {
    expect(pintaImageModesFor(sprite, false)).toEqual(['frame'])
    expect(pintaImageModesFor(tiles, false)).toEqual(['tile'])
    expect(pintaImageModesFor(map, false)).toEqual(['tilemap'])
    const { sheet: _sheet, ...legacy } = sprite as Extract<typeof sprite, { kind: 'frame' }>
    expect(pintaImageModesFor(legacy, true)).toEqual(['frame'])
  })

  test('a reviewed material keeps its kind when still offered', () => {
    const modes = pintaImageModesFor(sprite, true)
    expect(initialPintaImageMode(modes)).toBe('spritesheet')
    expect(
      initialPintaImageMode(modes, {
        selection: { kind: 'frame', animationId: 'a', frameIndex: 1 },
      }),
    ).toBe('frame')
    expect(initialPintaImageMode(['frame'], { selection: { kind: 'spritesheet' } })).toBe('frame')
  })

  test('pygame pixel art starts at scale 2 (draw at 32, play at 64); the rest at 1', () => {
    expect(defaultPintaImageScale(sprite, true)).toBe(2)
    expect(defaultPintaImageScale(map, true)).toBe(2)
    expect(defaultPintaImageScale({ ...tiles, vector: true }, true)).toBe(1)
    expect(defaultPintaImageScale(sprite, false)).toBe(1)
    expect(defaultPintaImageScale(sprite, true, { scale: 0.5 })).toBe(0.5)
  })

  test('size and selection follow the mode', () => {
    expect(pintaImageModeSize(sprite, 'spritesheet')).toEqual({ width: 128, height: 32 })
    expect(pintaImageModeSize(sprite, 'frame')).toEqual({ width: 32, height: 32 })
    expect(pintaImageModeSize(map, 'map')).toEqual({ width: 128, height: 48 })
    expect(pintaImageModeSize(map, 'tilemap')).toEqual({ width: 720, height: 400 })
    expect(pintaImageModeSelection('frame', { animationId: 'a', index: 2 })).toEqual({
      kind: 'frame',
      animationId: 'a',
      frameIndex: 2,
    })
    expect(pintaImageModeSelection('tile', { animationId: '', index: 3 })).toEqual({
      kind: 'tile',
      tileIndex: 3,
    })
    expect(pintaImageModeSelection('map', { animationId: '', index: 3 })).toEqual({ kind: 'map' })
  })
})
