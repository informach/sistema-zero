import { expect, test } from 'bun:test'
import { OrthographicCamera } from 'three'
import type { Vec3 } from '../core/model'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
  transformPoint,
} from '../scene/matrix'
import { sceneTransformFrame } from '../scene/transformFrame'
import { SceneTransformGizmo } from './SceneTransformGizmo'

function setup() {
  const canvas = document.createElement('canvas'),
    host = document.createElement('div')
  host.append(canvas)
  document.body.append(host)
  Object.defineProperties(canvas, { clientWidth: { value: 1000 }, clientHeight: { value: 800 } })
  canvas.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 800)
  const camera = new OrthographicCamera(-10, 10, 8, -8, 0.01, 1000)
  camera.position.set(0, 0, 30)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  const previews: AffineMatrix[] = [],
    ends: boolean[] = []
  const gizmo = new SceneTransformGizmo(
    canvas,
    camera,
    {
      begin: () => true,
      preview: (delta) => {
        previews.push(delta)
        return true
      },
      end: (commit) => ends.push(commit),
    },
    () => {},
    () => {},
  )
  const handle = (label: string) => {
    const result = host.querySelector<SVGGElement>(`[aria-label="${label}"]`)!
    result.setPointerCapture = () => {}
    result.hasPointerCapture = () => false
    return result
  }
  const pointer = (target: Element, type: string, x: number, y: number, pointerId = 1) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
      }),
    )
  return {
    host,
    camera,
    gizmo,
    previews,
    ends,
    handle,
    pointer,
    close() {
      gizmo.dispose()
      host.remove()
    },
  }
}

test('local scale preserves a custom pivot and affine ancestry, stays positive across the origin and cancels a second pointer', () => {
  const f = setup()
  const parent: AffineMatrix = [2, 0, 0, 0, 0.3, 3, 0, 0, 0.2, 0.4, 1, 0, 0, 0, 0, 1]
  const local = composeTransform({
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: quaternionFromEulerXYZ([15, 20, 30]),
    scale: [2, 3, 4],
  })
  const world = affineMultiply(parent, local),
    point = transformPoint(world, [0.2, 0.3, 0.1])
  try {
    f.gizmo.setTarget(point, sceneTransformFrame(world, parent))
    f.gizmo.setTool('scale')
    f.gizmo.draw()
    const h = f.handle('Tamanho no eixo X')
    const center = h.getAttribute('transform')!.slice(10, -1).split(' ').map(Number)
    const rect = h.querySelector('rect')!,
      ex = Number(rect.getAttribute('x')) + 12,
      ey = Number(rect.getAttribute('y')) + 12
    expect(Math.hypot(ex, ey)).toBeCloseTo(175, 8)
    f.pointer(h, 'pointerdown', center[0]! + ex, center[1]! + ey)
    f.pointer(h, 'pointermove', center[0]! - ex, center[1]! - ey)
    const delta = f.previews.at(-1)!
    transformPoint(delta, point).forEach((n, i) => {
      expect(n).toBeCloseTo(point[i]!, 10)
    })
    const result = affineMultiply(affineInverse(world)!, affineMultiply(delta, world))
    expect(result[0]).toBeGreaterThan(0)
    expect(result[0]).toBeLessThan(1)
    expect(result[5]).toBeCloseTo(1, 10)
    expect(result[10]).toBeCloseTo(1, 10)
    f.pointer(h, 'pointerup', center[0]! - ex, center[1]! - ey)
    expect(f.ends).toEqual([true])
    f.pointer(h, 'pointerdown', center[0]! + ex, center[1]! + ey)
    f.pointer(f.host, 'pointerdown', 10, 10, 2)
    f.pointer(h, 'pointerup', center[0]!, center[1]!)
    expect(f.ends).toEqual([true, false])
  } finally {
    f.close()
  }
})

test('rotation rings keep their CSS radius across zoom, follow local parent axes and unwrap a drag with one confirmation', () => {
  const f = setup()
  try {
    const parent = composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: quaternionFromEulerXYZ([0, 0, 20]),
      scale: [2, 3, 4],
    })
    const rotation = composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: quaternionFromEulerXYZ([0, 0, 30]),
      scale: [1, 1, 1],
    })
    const local = composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: quaternionFromEulerXYZ([0, 0, 30]),
      scale: [2, 3, 4],
    })
    const world = affineMultiply(parent, local)
    f.gizmo.setTarget([0, 0, 0], sceneTransformFrame(world, parent))
    f.gizmo.setSpace('local')
    f.gizmo.setTool('rotate')
    const h = f.handle('Girar no eixo Z')
    const samples = () =>
      h
        .querySelector('path')!
        .getAttribute('d')!
        .match(/[-\d.e+]+/g)!
        .map(Number)
    for (const zoom of [0.5, 1, 8]) {
      f.camera.zoom = zoom
      f.camera.updateProjectionMatrix()
      f.gizmo.draw()
      const values = samples(),
        distances = values
          .filter((_, i) => i % 2 === 0)
          .map((x, i) => Math.hypot(x, values[i * 2 + 1]!))
      expect(Math.max(...distances)).toBeCloseTo(118, 2)
    }
    const values = samples()
    f.pointer(h, 'pointerdown', 500 + values[0]!, 400 + values[1]!)
    f.pointer(h, 'pointermove', 500 + values[48]!, 400 + values[49]!)
    f.pointer(h, 'pointerup', 500 + values[48]!, 400 + values[49]!)
    expect(f.ends).toEqual([true])
    const spin = composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: quaternionFromEulerXYZ([0, 0, 90]),
      scale: [2, 3, 4],
    })
    const expected = affineMultiply(parent, affineMultiply(rotation, spin)),
      actual = affineMultiply(f.previews.at(-1)!, world)
    expected.forEach((n, i) => {
      expect(actual[i]).toBeCloseTo(n, 10)
    })
    h.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight', shiftKey: true }),
    )
    expect(f.ends).toEqual([true, true])
    f.gizmo.setSpace('world')
    f.gizmo.setTool('move')
    f.gizmo.setTarget([0, 0, 0], identityMatrix())
    const x = f.handle('Mover no eixo X')
    x.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
    expect(transformPoint(f.previews.at(-1)!, [0, 0, 0] as Vec3)).toEqual([0.1, 0, 0])
  } finally {
    f.close()
  }
})
