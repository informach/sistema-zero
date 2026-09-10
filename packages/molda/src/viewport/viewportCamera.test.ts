import { describe, expect, test } from 'bun:test'
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { createPart } from '../core/model'
import { makeModel } from '../testing/fixtures'
import { framingBounds, ViewportCamera } from './viewportCamera'
import { VIEW_DIRECTIONS } from './viewportMath'

test('unrepresentable bounds cannot corrupt either camera or change the selected view', () => {
  const snapshot = (rig: ViewportCamera) => ({
    perspective: rig.perspective.toJSON(),
    orthographic: rig.orthographic.toJSON(),
    target: rig.target.toArray(),
    view: rig.view,
  })
  for (const view of ['free', 'front', 'top'] as const) {
    const rig = new ViewportCamera()
    rig.frame({ min: [-1, 0, 0], max: [2, 3, 4] })
    const before = snapshot(rig)
    for (const value of [1e308, -1e308, Infinity, NaN]) {
      expect(() => rig.setView(view, { min: [value, 0, 0], max: [value, 1, 1] })).toThrow()
      expect(snapshot(rig)).toEqual(before)
      expect(() => rig.frame({ min: [-value, 0, 0], max: [value, 1, 1] })).toThrow()
      expect(snapshot(rig)).toEqual(before)
    }
    // All positions fit Float32, but a camera fitting this entire box does not.
    expect(() =>
      rig.setView(view, { min: [-3e38, -3e38, -3e38], max: [3e38, 3e38, 3e38] }),
    ).toThrow()
    expect(snapshot(rig)).toEqual(before)
    rig.setView(view, { min: [0, 0, 0], max: [3, 2, 1] })
    expect(rig.camera.position.toArray().every(Number.isFinite)).toBe(true)
    expect(rig.camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true)
  }
})

test('invalid resize projections leave both existing projection matrices unchanged', () => {
  const rig = new ViewportCamera()
  rig.setView('front', null)
  const before = [
    rig.perspective.projectionMatrix.toArray(),
    rig.orthographic.projectionMatrix.toArray(),
  ]
  for (const aspect of [0, -1, NaN, Infinity, 1e-300, 1e300]) {
    rig.aspect = aspect
    expect(() => rig.updateProjectionMatrix()).toThrow()
    expect([
      rig.perspective.projectionMatrix.toArray(),
      rig.orthographic.projectionMatrix.toArray(),
    ]).toEqual(before)
  }
  rig.aspect = 1
  rig.updateProjectionMatrix()
  expect([
    rig.perspective.projectionMatrix.toArray(),
    rig.orthographic.projectionMatrix.toArray(),
  ]).toEqual(before)
})

describe('viewport camera', () => {
  test('named views are exactly orthogonal and fit every corner in portrait and landscape', () => {
    const rig = new ViewportCamera()
    const bounds = { min: [-12, 0, -3], max: [20, 8, 4] } as const
    for (const aspect of [0.4, 1, 2.4]) {
      rig.aspect = aspect
      for (const view of ['front', 'back', 'left', 'right', 'top'] as const) {
        rig.setView(view, { min: [...bounds.min], max: [...bounds.max] })
        expect(rig.camera).toBeInstanceOf(OrthographicCamera)
        const direction = rig.camera.getWorldDirection(new Vector3()).negate()
        expect(direction.distanceTo(new Vector3(...VIEW_DIRECTIONS[view]))).toBeLessThan(1e-10)
        for (const x of [bounds.min[0], bounds.max[0]]) {
          for (const y of [bounds.min[1], bounds.max[1]]) {
            for (const z of [bounds.min[2], bounds.max[2]]) {
              const projected = new Vector3(x, y, z).project(rig.camera)
              expect(Math.abs(projected.x)).toBeLessThan(1)
              expect(Math.abs(projected.y)).toBeLessThan(1)
              expect(Math.abs(projected.z)).toBeLessThan(1)
            }
          }
        }
      }
    }
  })

  test('orthographic projected sizes do not depend on depth and resize preserves zoom', () => {
    const rig = new ViewportCamera()
    rig.setView('front', null)
    const near = new Vector3(1, 1, 1).project(rig.camera)
    const far = new Vector3(1, 1, -10).project(rig.camera)
    expect(near.x).toBeCloseTo(far.x, 12)
    expect(near.y).toBeCloseTo(far.y, 12)
    rig.camera.zoom = 3
    rig.aspect = 2
    rig.updateProjectionMatrix()
    expect(rig.camera.zoom).toBe(3)
    expect(rig.orthographic.right / rig.orthographic.top).toBe(2)
    rig.setView('free', null)
    expect(rig.camera).toBeInstanceOf(PerspectiveCamera)
    expect(rig.camera.zoom).toBe(1)
  })

  test('selection framing includes its twin, excludes hidden parts and falls back safely', () => {
    const source = createPart({
      id: 'a',
      name: 'a',
      shape: 'box',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 1,
    })
    const twin = {
      ...source,
      id: 'twin',
      mirrorOf: 'a',
      from: [-2, 0, 0] as [number, number, number],
      to: [0, 2, 2] as [number, number, number],
    }
    const other = {
      ...source,
      id: 'other',
      from: [20, 0, 0] as [number, number, number],
      to: [22, 2, 2] as [number, number, number],
    }
    const hidden = {
      ...other,
      id: 'hidden',
      hidden: true as const,
      to: [100, 2, 2] as [number, number, number],
    }
    const model = makeModel({ parts: [source, twin, other, hidden] })
    expect(framingBounds(model, ['a'])).toEqual({ min: [-2, 0, 0], max: [2, 2, 2] })
    expect(framingBounds(model, ['deleted'])).toEqual(framingBounds(model))
    expect(framingBounds(model)?.max[0]).toBe(22)
    expect(model.parts).toEqual([source, twin, other, hidden])
  })
})
