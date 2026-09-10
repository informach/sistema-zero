import { expect, test } from 'bun:test'
import type { SceneImage } from '../scene/document'
import { SceneFlipbookPlayer } from './SceneFlipbookPlayer'

function setup(loop = true, fps = 2.5) {
  let now = 0,
    id = 0
  const pending = new Map<number, () => void>()
  const player = new SceneFlipbookPlayer({
    now: () => now,
    request: (callback) => {
      pending.set(++id, callback)
      return id
    },
    cancel: (id) => {
      pending.delete(id)
    },
  })
  const image: SceneImage = {
    id: 'sheet',
    name: 'Quadros',
    width: 4,
    height: 4,
    encoding: 'rgba',
    layers: [],
    flipbook: { frameWidth: 2, frameHeight: 2, frames: [3, 0, 0, 2], fps, loop },
  }
  return {
    player,
    image,
    pending,
    time: (value: number) => {
      now = value
    },
    tick: (value: number) => {
      now = value
      const callbacks = [...pending.values()]
      pending.clear()
      for (const callback of callbacks) callback()
    },
  }
}

test('flipbook player schedules nothing until explicit play, emits only changed steps and owns no image bytes', () => {
  const f = setup()
  let updates = 0
  const unsubscribe = f.player.subscribe(() => updates++)
  f.player.play()
  expect(f.pending.size).toBe(0)
  f.player.setImage(f.image)
  expect(f.player.getSnapshot().source).not.toHaveProperty('layers')
  expect(f.pending.size).toBe(0)
  f.player.play()
  expect(updates).toBe(2)
  expect(f.pending.size).toBe(1)
  f.player.play()
  for (const time of [10, 100, 200, 399]) f.tick(time)
  expect(updates).toBe(2)
  f.tick(400)
  expect(f.player.getSnapshot().step).toBe(1)
  f.tick(800)
  expect(f.player.getSnapshot().step).toBe(2)
  f.tick(1600)
  expect(f.player.getSnapshot().step).toBe(0)
  expect(updates).toBe(5)
  f.player.pause()
  expect(f.pending.size).toBe(0)
  unsubscribe()
  f.player.setImage(null)
  expect(updates).toBe(6)
})

test('pause retains fractional frame time, resume ignores paused wall time and non-loop playback finishes and restarts', () => {
  const f = setup(false)
  f.player.setImage(f.image)
  f.player.play()
  f.time(250)
  f.player.pause()
  expect(f.player.getSnapshot().step).toBe(0)
  f.time(10_000)
  f.player.play()
  f.tick(10_150)
  expect(f.player.getSnapshot().step).toBe(1)
  f.tick(11_350)
  expect(f.player.getSnapshot()).toMatchObject({ step: 3, playing: false })
  expect(f.pending.size).toBe(0)
  f.player.play()
  expect(f.player.getSnapshot()).toMatchObject({ step: 0, playing: true })
  f.player.seek(3)
  expect(f.pending.size).toBe(0)
  f.player.play()
  f.tick(11_750)
  expect(f.player.getSnapshot()).toMatchObject({ step: 3, playing: false })
  expect(f.pending.size).toBe(0)
})

test('seeking has exact sequence-slot identity at arbitrary Double speeds, without seconds-to-step roundtrip', () => {
  for (const fps of [0.1, 1 / 7, 2.7, 3.7, 13.3, 59.99, 60]) {
    const f = setup(true, fps)
    f.player.setImage(f.image)
    for (const step of [0, 1, 2, 3]) {
      f.player.seek(step)
      f.player.play()
      expect(f.player.getSnapshot().step).toBe(step)
      f.tick(0)
      expect(f.player.getSnapshot().step).toBe(step)
    }
    f.player.pause()
  }
})

test('cancelled and superseded callbacks cannot publish or create a second clock; invalid edits leave playback untouched', () => {
  const f = setup()
  f.player.setImage(f.image)
  f.player.play()
  const late = [...f.pending.values()][0]!
  expect(() => f.player.seek(4)).toThrow()
  expect(() =>
    f.player.setImage({ ...f.image, flipbook: { ...f.image.flipbook!, frameWidth: 3 } }),
  ).toThrow()
  expect(f.player.getSnapshot().playing).toBe(true)
  f.player.seek(2)
  f.player.play()
  late()
  expect(f.pending.size).toBe(1)
  expect(f.player.getSnapshot().step).toBe(2)
  const nextLate = [...f.pending.values()][0]!
  f.player.setImage({ ...f.image, flipbook: { ...f.image.flipbook!, frames: [1] } })
  expect(f.pending.size).toBe(0)
  nextLate()
  expect(f.pending.size).toBe(0)
  expect(f.player.getSnapshot()).toMatchObject({ step: 0, playing: false })
  f.player.setImage(null)
  expect(f.player.getSnapshot().source).toBeNull()
})
