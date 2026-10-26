import { expect, test } from 'bun:test'
import { begin, explore, type Kind, type Action } from './exploration-model'
function trial(kind: Kind) {
  let value = begin(kind)
  return {
    get value() {
      return value
    },
    act(...actions: Action[]) {
      for (const action of actions) value = explore(kind, value, action)
      return value
    },
  }
}
test('many frames, released arrow and restarts retain only actual observations', () => {
  const t = trial('quadro')
  t.act({ type: 'movement-command', enabled: true })
  t.act({ type: 'hold-arrow', held: true }, { type: 'frames', count: 150 })
  expect(t.value.state.walk.x).toBe(658)
  expect(t.value.seen).toEqual({ movement: true })
  t.act({ type: 'hold-arrow', held: false }, { type: 'frames', count: 10 })
  expect(t.value.state.walk.x).toBe(658)
  expect(t.value.seen).toEqual({ movement: true, still: true, release: true })
  t.act({ type: 'restart-walk' })
  expect(t.value.seen.release).toBe(true)
  t.act(
    { type: 'reset-all' },
    { type: 'movement-command', enabled: true },
    { type: 'hold-arrow', held: true },
    { type: 'frames', count: 10 },
    { type: 'restart-walk' },
    { type: 'hold-arrow', held: false },
    { type: 'frames', count: 1 },
  )
  expect(t.value.seen.release).toBeUndefined()
  t.act({ type: 'reset-all' })
  expect(t.value.seen).toEqual({})
})
test('boundary discoveries require crossing and seeing the rule hold at the edge', () => {
  const t = trial('limite')
  t.act({ type: 'keep-on-screen', enabled: true })
  expect(t.value.seen['stayed-inside']).toBeUndefined()
  t.act({ type: 'hold-arrow', held: true }, { type: 'frames', count: 100 })
  expect(t.value.state.walk.x).toBe(416)
  expect(t.value.seen['stayed-inside']).toBe(true)
  t.act({ type: 'keep-on-screen', enabled: false }, { type: 'frames', count: 30 })
  expect(t.value.seen['left-the-screen']).toBe(true)
  t.act({ type: 'restart-walk' })
  expect(t.value.seen['stayed-inside']).toBe(true)
})
test('memory can be investigated with saving first and no saving last', () => {
  const t = trial('memoria')
  t.act(
    { type: 'remember-collection', enabled: true },
    { type: 'collect-key' },
    { type: 'leave-key' },
    { type: 'restart-collection' },
  )
  expect(t.value.state.collection.hasKey).toBe(false)
  t.act({ type: 'remember-collection', enabled: false }, { type: 'collect-key' })
  expect(t.value.seen).toEqual({
    'with-memory': true,
    away: true,
    restart: true,
    'without-memory': true,
  })
  t.act({ type: 'remember-collection', enabled: true })
  expect(t.value.state.collection.hasKey).toBe(false)
  t.act(
    { type: 'restart-collection' },
    { type: 'collect-key' },
    { type: 'remember-collection', enabled: false },
  )
  expect(t.value.state.collection.hasKey).toBe(true)
})
test('door permits repeated tests and either branch first; configuration alone is not evidence', () => {
  const t = trial('porta')
  t.act({ type: 'key-state', hasKey: true })
  expect(t.value.seen).toEqual({})
  t.act({ type: 'try-lighthouse-door' }, { type: 'try-lighthouse-door' })
  expect(t.value.seen).toEqual({ 'with-key': true })
  t.act({ type: 'key-state', hasKey: false })
  expect(t.value.state.lighthouse.checkedKey).toBeNull()
  t.act({ type: 'try-lighthouse-door' })
  expect(t.value.seen).toEqual({ 'with-key': true, 'without-key': true })
})
test('both axes are independent, support extremes and retain observations when reset', () => {
  const t = trial('posicao')
  t.act(
    { type: 'key-position', axis: 'y', value: 328 },
    { type: 'key-position', axis: 'y', value: 328 },
  )
  expect(t.value.seen).toEqual({ 'y-plus': true })
  t.act(
    { type: 'key-position', axis: 'y', value: 0 },
    { type: 'key-position', axis: 'x', value: 448 },
    { type: 'key-position', axis: 'x', value: 0 },
  )
  expect(t.value.seen).toEqual({ 'y-plus': true, 'y-minus': true, 'x-plus': true, 'x-minus': true })
  t.act({ type: 'restart-key-position' })
  expect(t.value.state.keyPosition.x).toBe(211)
  expect(t.value.state.keyPosition.y).toBe(53)
  expect(Object.keys(t.value.seen)).toHaveLength(4)
})

test('a key, a command and a frame are independent; editing alone never moves the character', () => {
  const t = trial('quadro')
  t.act({ type: 'hold-arrow', held: true }, { type: 'frames', count: 10 })
  expect(t.value.state.walk.x).toBe(208)
  expect(t.value.state.walk.arrow).toBe(true)
  expect(t.value.seen).toEqual({ 'no-command': true })
  t.act({ type: 'movement-command', enabled: true })
  expect(t.value.state.walk.x).toBe(208)
  t.act({ type: 'frames', count: 1 })
  expect(t.value.state.walk.x).toBe(211)
  t.act({ type: 'movement-command', enabled: false }, { type: 'frames', count: 10 })
  expect(t.value.state.walk.x).toBe(211)
  expect(t.value.seen.release).toBeUndefined()
  t.act(
    { type: 'movement-command', enabled: true },
    { type: 'hold-arrow', held: false },
    { type: 'frames', count: 1 },
  )
  expect(t.value.state.walk.x).toBe(211)
  expect(t.value.command).toBe(true)
  expect(t.value.seen.still).toBe(true)
  expect(t.value.seen.release).toBe(true)
})
