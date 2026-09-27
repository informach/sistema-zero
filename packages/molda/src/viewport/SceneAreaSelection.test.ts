import { describe, expect, test } from 'bun:test'
import type { Vec2 } from '../scene/document'
import type { SceneSelectionRegion } from '../scene/regionSelection'
import { SceneAreaSelection } from './SceneAreaSelection'

function setup() {
  const canvas = document.createElement('canvas')
  canvas.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100)
  canvas.setPointerCapture = () => {}
  canvas.releasePointerCapture = () => {}
  const commits: SceneSelectionRegion[] = []
  const modifiers: boolean[] = []
  let overlay: readonly Vec2[] = []
  const area = new SceneAreaSelection(
    canvas,
    (points) => {
      overlay = points
    },
    (region, additive) => {
      commits.push(region)
      modifiers.push(additive)
    },
    () => {},
  )
  const send = (type: string, x: number, y: number, pointerId = 1) =>
    canvas.dispatchEvent(
      new PointerEvent(type, { clientX: x, clientY: y, pointerId, button: 0, shiftKey: true }),
    )
  return { area, commits, modifiers, send, overlay: () => overlay }
}
describe('area selection pointer ownership', () => {
  test('box uses final pointerup and captured modifier, clamps outside bounds and leaves no overlay', () => {
    const f = setup()
    try {
      f.area.setTool('box')
      f.send('pointerdown', 80, 90)
      f.send('pointerup', -10, 20)
      expect(f.commits).toEqual([{ kind: 'box', from: [0.8, 0.9], to: [0, 0.2] }])
      expect(f.modifiers).toEqual([true])
      expect(f.overlay()).toHaveLength(0)
    } finally {
      f.area.dispose()
    }
  })
  test('lasso path is bounded; second pointer, cancellation, tool change and disable never commit', () => {
    const f = setup()
    try {
      f.area.setTool('lasso')
      f.send('pointerdown', 10, 10)
      for (let i = 0; i < 2000; i++)
        f.send('pointermove', 50 + 40 * Math.cos(i / 10), 50 + 40 * Math.sin(i / 10))
      expect(f.overlay().length).toBeLessThanOrEqual(512)
      expect(f.overlay().length).toBeGreaterThan(10)
      f.send('pointerdown', 90, 90, 2)
      f.send('pointerup', 90, 90, 2)
      f.send('pointerup', 90, 90, 1)
      expect(f.commits).toHaveLength(0)
      f.send('pointerdown', 10, 10)
      f.send('pointermove', 90, 90)
      f.area.setEnabled(false)
      f.area.setEnabled(true)
      f.send('pointerup', 90, 90)
      expect(f.commits).toHaveLength(0)
      f.send('pointerdown', 10, 10)
      f.send('pointermove', 90, 90)
      f.area.setTool('point')
      f.send('pointerup', 90, 90)
      expect(f.commits).toHaveLength(0)
      expect(f.overlay()).toHaveLength(0)
    } finally {
      f.area.dispose()
    }
  })
})
