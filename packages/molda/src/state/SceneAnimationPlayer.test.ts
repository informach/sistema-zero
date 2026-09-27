import { expect, test } from 'bun:test'
import { animatedScene, sceneAnimationClip } from '../testing/sceneAnimation'
import { SceneAnimationPlayer } from './SceneAnimationPlayer'

function setup(loop = true) {
  let now = 0,
    id = 0
  const pending = new Map<number, () => void>()
  const player = new SceneAnimationPlayer({
    now: () => now,
    request: (callback) => {
      pending.set(++id, callback)
      return id
    },
    cancel: (id) => {
      pending.delete(id)
    },
  })
  const source = animatedScene()
  source.animations[0]!.loop = loop
  return {
    player,
    source,
    pending,
    time: (time: number) => {
      now = time
    },
    tick: (time: number) => {
      now = time
      const callbacks = [...pending.values()]
      pending.clear()
      for (const callback of callbacks) callback()
    },
  }
}

test('seek remains bound when passed directly to a timeline control', () => {
  const { player, source } = setup()
  player.setClip(source, 'clip')
  const seek = player.seek
  seek(1.123456789123)
  expect(player.getSnapshot().time).toBe(1.123456789123)
  expect(player.getSnapshot().pose?.source).toBe(source)
  expect(player.getSnapshot().playing).toBe(false)
})

test('owned preview clips never replace the source and cancel restores the previous fractional cursor paused', () => {
  const { player, source, time, pending } = setup()
  player.setClip(source, 'clip')
  player.seek(0.25)
  player.play()
  time(500)
  const draft = { ...sceneAnimationClip('wing'), id: 'draft' }
  player.setPreview(source, draft)
  expect(player.getSnapshot().source?.preview).toBe(true)
  expect(player.getSnapshot().source?.document).toBe(source)
  expect(player.getSnapshot().source?.clip).not.toBe(draft)
  expect(player.getSnapshot().pose?.source).toBe(source)
  expect(source.animations).toHaveLength(1)
  expect(pending.size).toBe(0)
  player.seek(1.5)
  player.setPreview(source, { ...draft, name: 'Outra prévia' })
  player.cancelPreview()
  expect(player.getSnapshot()).toMatchObject({
    source: { clip: { id: 'clip' } },
    time: 0.75,
    playing: false,
  })
  expect(player.getSnapshot().source?.preview).toBeUndefined()
  player.setPreview(source, draft)
  const current = player.getSnapshot()
  expect(() => player.setPreview(source, { ...draft, duration: -1 })).toThrow()
  expect(player.getSnapshot()).toBe(current)
  player.setClip(source, 'clip')
  player.cancelPreview()
  expect(player.getSnapshot().source?.clip.id).toBe('clip')
  player.setClip(null, null)
  player.setPreview(source, draft)
  player.cancelPreview()
  expect(player.getSnapshot().source).toBeNull()
})

test('canceling a preview cannot seek a different clip chosen reentrantly during restoration', () => {
  const { player, source } = setup()
  source.animations.push({ ...sceneAnimationClip(), id: 'other', duration: 0.1, tracks: [] })
  player.setClip(source, 'clip')
  player.seek(1)
  player.setPreview(source, { ...sceneAnimationClip(), id: 'draft' })
  const off = player.subscribe(() => {
    const selected = player.getSnapshot().source
    if (selected?.clip.id === 'clip' && !selected.preview) player.setClip(source, 'other')
  })
  player.cancelPreview()
  expect(player.getSnapshot()).toMatchObject({
    source: { clip: { id: 'other' } },
    time: 0,
    error: null,
  })
  off()
})

test('animation clocks start only explicitly, keep stable snapshots and never mutate the source', () => {
  const f = setup(),
    original = structuredClone(f.source)
  let updates = 0
  const off = f.player.subscribe(() => updates++)
  f.player.play()
  expect(f.pending.size).toBe(0)
  f.player.setClip(f.source, 'clip')
  const before = f.player.getSnapshot()
  expect(f.player.getSnapshot()).toBe(before)
  expect(f.pending.size).toBe(0)
  f.player.play()
  expect(f.pending.size).toBe(1)
  f.player.play()
  f.tick(0)
  expect(updates).toBe(2)
  f.tick(123.456789123)
  expect(f.player.getSnapshot().time).toBe(123.456789123 / 1000)
  expect(f.player.getSnapshot().pose?.source).toBe(f.source)
  expect(f.pending.size).toBe(1)
  expect(f.source).toEqual(original)
  off()
  f.player.setClip(null, null)
  expect(updates).toBe(3)
  expect(f.pending.size).toBe(0)
  expect(f.player.getSnapshot()).toEqual({
    source: null,
    pose: null,
    time: 0,
    playing: false,
    error: null,
  })
})

test('pause captures fractional time; resume excludes paused wall time and non-loop end restarts explicitly', () => {
  const f = setup(false)
  f.player.setClip(f.source, 'clip')
  f.player.play()
  f.time(123.456789)
  f.player.pause()
  expect(f.player.getSnapshot().time).toBe(0.123456789)
  expect(f.pending.size).toBe(0)
  f.time(10_000)
  f.player.play()
  f.tick(10_500)
  expect(f.player.getSnapshot().time).toBeCloseTo(0.623456789, 14)
  f.tick(12_000)
  expect(f.player.getSnapshot()).toMatchObject({ time: 2, playing: false, error: null })
  expect(f.pending.size).toBe(0)
  f.player.play()
  expect(f.player.getSnapshot()).toMatchObject({ time: 0, playing: true })
  f.player.pause()
})

test('looping, exact final seek and subnormal seeks do not round to the fps grid', () => {
  const f = setup()
  f.player.setClip(f.source, 'clip')
  f.player.seek(Number.MIN_VALUE)
  f.player.play()
  f.tick(0)
  expect(f.player.getSnapshot().time).toBe(Number.MIN_VALUE)
  f.tick(2250)
  expect(f.player.getSnapshot().time).toBe(0.25)
  f.time(4500)
  f.player.pause()
  expect(f.player.getSnapshot().time).toBe(0.5)
  f.player.seek(2)
  expect(f.player.getSnapshot()).toMatchObject({ time: 2, playing: false })
  f.player.play()
  expect(f.player.getSnapshot().time).toBe(0)
  f.player.pause()
})

test('old callbacks cannot cross seek, revision, clip change or cleanup; invalid explicit inputs leave the session intact', () => {
  const f = setup()
  f.player.setClip(f.source, 'clip')
  f.player.play()
  const late = [...f.pending.values()][0]!
  const before = f.player.getSnapshot()
  expect(() => f.player.seek(NaN)).toThrow()
  expect(() => f.player.seek(2.01)).toThrow()
  expect(() => f.player.setClip(f.source, 'absent')).toThrow()
  expect(f.player.getSnapshot()).toBe(before)
  f.player.seek(1.23456789123)
  late()
  expect(f.pending.size).toBe(0)
  const revised = { ...f.source, name: 'Outra revisão' }
  f.player.setClip(revised, 'clip')
  expect(f.player.getSnapshot().time).toBe(1.23456789123)
  expect(f.player.getSnapshot().pose?.source).toBe(revised)
  const newClip = {
    ...revised,
    animations: [...revised.animations, { ...sceneAnimationClip(), id: 'new' }],
  }
  f.player.setClip(newClip, 'new')
  expect(f.player.getSnapshot().time).toBe(0)
  f.player.play()
  const last = [...f.pending.values()][0]!
  f.player.setClip(null, null)
  last()
  expect(f.pending.size).toBe(0)
  expect(f.player.getSnapshot().source).toBeNull()
})

test('mathematical and render-boundary failures stop the clock and report an error without rewriting data', () => {
  const f = setup(false)
  const node = f.source.nodes[0]!
  if (node.transform.kind !== 'trs') throw new Error('Missing TRS')
  node.transform.scale = [2, 1, 1]
  f.source.animations[0]!.tracks[0]!.keys = [
    { time: 0, value: [0, 0, 0], interpolation: 'linear' },
    { time: 2, value: [Number.MAX_VALUE, 0, 0], interpolation: 'linear' },
  ]
  const original = structuredClone(f.source)
  f.player.setClip(f.source, 'clip')
  f.player.play()
  f.tick(100)
  const lastGood = f.player.getSnapshot().pose
  f.tick(2000)
  expect(f.player.getSnapshot().pose).toBe(lastGood)
  expect(f.player.getSnapshot().error).not.toBeNull()
  expect(f.pending.size).toBe(0)
  f.player.seek(0)
  expect(f.player.getSnapshot().error).toBeNull()
  f.player.play()
  f.player.reportError(new Error('Posição fora da precisão de desenho.'))
  expect(f.player.getSnapshot()).toMatchObject({
    playing: false,
    error: 'Posição fora da precisão de desenho.',
  })
  expect(f.pending.size).toBe(0)
  expect(f.source).toEqual(original)
  f.player.setClip(null, null)
})

test('subscriber interruption during a tick cannot restart scheduling or publish an older source', () => {
  const f = setup()
  f.player.setClip(f.source, 'clip')
  const off = f.player.subscribe(() => {
    if (f.player.getSnapshot().time > 0) f.player.setClip(null, null)
  })
  f.player.play()
  f.tick(1000)
  expect(f.pending.size).toBe(0)
  expect(f.player.getSnapshot().source).toBeNull()
  off()
})
