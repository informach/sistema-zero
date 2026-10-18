import { expect, test } from 'bun:test'
import { OrthographicCamera, Vector3 } from 'three'
import type { AffineMatrix } from '../scene/matrix'
import { SceneBodyMove } from './SceneBodyMove'

function fixture() {
  const canvas = document.createElement('canvas')
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect
  const camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const deltas: AffineMatrix[] = [],
    ends: boolean[] = []
  let begins = 0
  const mover = new SceneBodyMove(canvas, () => camera, {
    begin: () => {
      begins++
      return true
    },
    preview: (delta) => {
      deltas.push(delta)
      return true
    },
    end: (commit) => ends.push(commit),
  })
  return { mover, camera, deltas, ends, begins: () => begins }
}
test('body movement has a threshold, fixed front plane, snapped deltas and one commit', () => {
  const f = fixture()
  expect(f.mover.begin(new Vector3(), 100, 100, 'front')).toBe(true)
  f.mover.move(103, 100, null)
  expect(f.begins()).toBe(0)
  f.mover.move(133, 120, 0.5)
  expect(f.deltas[0]![12]).toBe(1.5)
  expect(f.deltas[0]![13]).toBe(-1)
  expect(f.deltas[0]![14]).toBe(0)
  f.mover.move(140, 130, null)
  f.mover.end(true)
  expect(f.begins()).toBe(1)
  expect(f.ends).toEqual([true])
})
test('near-parallel ground view refuses movement and cancellation never commits', () => {
  const f = fixture()
  expect(f.mover.begin(new Vector3(), 100, 100, 'free')).toBe(false)
  f.mover.move(140, 100, null)
  f.mover.end(true)
  expect(f.begins()).toBe(0)
  expect(f.ends).toEqual([])
  expect(f.mover.begin(new Vector3(), 100, 100, 'front')).toBe(true)
  f.mover.move(140, 100, null)
  f.mover.end(false)
  f.mover.end(true)
  expect(f.ends).toEqual([false])
})

test('body movement snaps the resulting position and leaves untouched fractional axes in place', () => {
  const f = fixture()
  expect(f.mover.begin(new Vector3(), 100, 100, 'front', [0.25, 0.35, 0.45])).toBe(true)
  f.mover.move(133, 100, 1)
  expect(f.deltas.at(-1)![12] + 0.25).toBe(2)
  expect(f.deltas.at(-1)![13]).toBe(0)
  expect(f.deltas.at(-1)![14]).toBe(0)
  f.mover.end(true)
  expect(f.mover.begin(new Vector3(), 100, 100, 'front', [0.25, 0.35, 0.45])).toBe(true)
  f.mover.move(121, 100, 0.1)
  expect(f.deltas.at(-1)![12] + 0.25).toBeCloseTo(1.3, 12)
  f.mover.end(true)
})
