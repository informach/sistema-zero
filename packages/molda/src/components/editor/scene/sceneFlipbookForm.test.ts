import { expect, test } from 'bun:test'
import type { SceneImage } from '../../../scene/document'
import { readSceneFlipbookForm } from './sceneFlipbookForm'

const image: SceneImage = {
  id: 'sheet',
  name: 'Quadros',
  width: 6,
  height: 4,
  encoding: 'rgba',
  layers: [],
}
function form(patch: Record<string, string> = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({
    frameWidth: '2',
    frameHeight: '2',
    frameSequence: '',
    frameFps: '2.7',
    frameLoop: 'on',
    ...patch,
  }))
    data.set(key, value)
  return data
}

test('flipbook form generates every cell only after dimensions validation and preserves explicit repeated one-based steps', () => {
  expect(readSceneFlipbookForm(form(), image)).toEqual({
    frameWidth: 2,
    frameHeight: 2,
    frames: [0, 1, 2, 3, 4, 5],
    fps: 2.7,
    loop: true,
  })
  expect(
    readSceneFlipbookForm(form({ frameSequence: ' 6, 2; 2 1 ', frameLoop: '' }), image),
  ).toEqual({ frameWidth: 2, frameHeight: 2, frames: [5, 1, 1, 0], fps: 2.7, loop: false })
})

test('flipbook form rejects cropped cells, excessive grids and invalid sequence tokens rather than repairing them', () => {
  const cases: Array<Record<string, string>> = [
    { frameWidth: '4' },
    { frameHeight: '0' },
    { frameFps: 'NaN' },
    { frameSequence: '0' },
    { frameSequence: '2.5' },
    { frameSequence: '1e0' },
    { frameSequence: '7' },
    { frameSequence: `${'1,'.repeat(257)}1` },
  ]
  for (const patch of cases) expect(() => readSceneFlipbookForm(form(patch), image)).toThrow()
  expect(() =>
    readSceneFlipbookForm(form({ frameWidth: '1', frameHeight: '1' }), {
      ...image,
      width: 1024,
      height: 1024,
    }),
  ).toThrow('256')
})
