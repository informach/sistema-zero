import { expect, test } from 'bun:test'
import { beginProjectOpening, isProjectOpening } from './projectOpening'

test('overlapping owners release only themselves; namespaces and ids stay independent', () => {
  const scope = { identity: 'opening-overlap' }
  const other = { identity: 'opening-other' }
  const first = beginProjectOpening(scope, 'same')
  const second = beginProjectOpening(scope, 'same')
  const third = beginProjectOpening(other, 'same')
  expect(isProjectOpening(scope, 'same')).toBe(true)
  expect(isProjectOpening(scope, 'different')).toBe(false)
  first()
  first()
  expect(isProjectOpening(scope, 'same')).toBe(true)
  second()
  expect(isProjectOpening(scope, 'same')).toBe(false)
  expect(isProjectOpening(other, 'same')).toBe(true)
  third()
  expect(isProjectOpening(other, 'same')).toBe(false)
})

test('caller and captured scope cancellation release owners without affecting a later opening', () => {
  const lifetime = new AbortController()
  const caller = new AbortController()
  const scope = { identity: 'opening-cancellation', signal: lifetime.signal }
  const old = beginProjectOpening(scope, 'project', caller.signal)
  caller.abort()
  expect(isProjectOpening(scope, 'project')).toBe(false)
  const newer = beginProjectOpening(scope, 'project')
  old()
  expect(isProjectOpening(scope, 'project')).toBe(true)
  lifetime.abort()
  expect(isProjectOpening(scope, 'project')).toBe(false)
  newer()
  beginProjectOpening(scope, 'project')()
  expect(isProjectOpening(scope, 'project')).toBe(false)
})
