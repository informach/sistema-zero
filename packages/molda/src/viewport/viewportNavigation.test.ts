import { describe, expect, spyOn, test } from 'bun:test'
import { MOUSE, TOUCH, Vector3 } from 'three'
import { ViewportCamera } from './viewportCamera'
import { VIEW_DIRECTIONS } from './viewportMath'
import { createViewportOrbit } from './viewportNavigation'

describe('viewport navigation with real OrbitControls, without a GPU', () => {
  test('disposing a detached canvas removes document keyboard listeners, including a held Control key', () => {
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    const added = spyOn(document, 'addEventListener'),
      removed = spyOn(document, 'removeEventListener')
    const orbit = createViewportOrbit(canvas, new ViewportCamera(), false, () => {})
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
      const listeners = added.mock.calls.filter(([type]) => type === 'keydown' || type === 'keyup')
      expect(listeners.map(([type]) => type)).toEqual(['keydown', 'keyup'])
      canvas.remove()
      orbit.dispose()
      for (const [type, listener] of listeners)
        expect(
          removed.mock.calls.some(
            (call) =>
              call[0] === type &&
              call[1] === listener &&
              typeof call[2] === 'object' &&
              call[2]?.capture,
          ),
        ).toBe(true)
    } finally {
      canvas.remove()
      orbit.dispose()
      added.mockRestore()
      removed.mockRestore()
    }
  })

  test('named views stay exact after damping updates, including top with its own up-axis', () => {
    const canvas = document.createElement('canvas')
    const rig = new ViewportCamera()
    for (const view of ['front', 'top', 'back', 'left', 'right', 'free'] as const) {
      rig.setView(view, null)
      const changes: number[] = []
      const orbit = createViewportOrbit(canvas, rig, false, () => changes.push(1))
      for (let i = 0; i < 20; i += 1) expect(orbit.update()).toBe(false)
      expect(changes).toEqual([])
      expect(orbit.target).toBe(rig.target)
      if (view !== 'free') {
        const direction = rig.camera.getWorldDirection(new Vector3()).negate()
        expect(direction.distanceTo(new Vector3(...VIEW_DIRECTIONS[view]))).toBeLessThan(1e-10)
        expect(orbit.enableRotate).toBe(false)
        expect(orbit.mouseButtons.LEFT).toBe(MOUSE.PAN)
        expect(orbit.touches.ONE).toBe(TOUCH.PAN)
      } else {
        expect(orbit.enableRotate).toBe(true)
        expect(orbit.mouseButtons.LEFT).toBe(MOUSE.ROTATE)
      }
      orbit.dispose()
    }
  })

  test('reduced motion disables damping and pan shares the camera framing target', () => {
    const rig = new ViewportCamera()
    rig.setView('top', null)
    const orbit = createViewportOrbit(document.createElement('canvas'), rig, true, () => {})
    expect(orbit.enableDamping).toBe(false)
    orbit.target.add(new Vector3(3, 0, 2))
    rig.camera.position.add(new Vector3(3, 0, 2))
    orbit.update()
    const before = rig.camera.getWorldDirection(new Vector3())
    rig.frame({ min: [5, 5, 5], max: [7, 7, 7] })
    expect(rig.target.toArray()).toEqual([6, 6, 6])
    expect(rig.camera.getWorldDirection(new Vector3()).distanceTo(before)).toBeLessThan(1e-10)
    orbit.dispose()
  })
})
