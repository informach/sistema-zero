import { expect, test } from 'bun:test'
import { SymbolNames } from '../symbolNames'

test('parent and sibling writes cannot change an earlier lexical snapshot', () => {
  const parent = new SymbolNames(['window', 'score'])
  const first = parent.fork()
  const second = parent.fork()
  parent.add('later')
  first.add('parameter').delete('score')
  second.clear()
  expect([...parent]).toEqual(['window', 'score', 'later'])
  expect([...first]).toEqual(['window', 'parameter'])
  expect([...second]).toEqual([])
  const nested = first.fork()
  first.add('another')
  nested.delete('window')
  expect([...nested]).toEqual(['parameter'])
  expect([...first]).toEqual(['window', 'parameter', 'another'])
})

test('independent snapshots match eager sets through deterministic branching edits', () => {
  const scopes = [{ names: new SymbolNames<string>(), eager: new Set<string>() }]
  let seed = 42
  for (let i = 0; i < 1000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const scope = scopes[seed % scopes.length]
    if (!scope) throw new Error('Scope fixture missing')
    const value = `name${seed % 23}`
    switch (seed % 5) {
      case 0:
        scopes.push({ names: scope.names.fork(), eager: new Set(scope.eager) })
        break
      case 1:
        scope.names.delete(value)
        scope.eager.delete(value)
        break
      case 2:
        scope.names.clear()
        scope.eager.clear()
        break
      default:
        scope.names.add(value)
        scope.eager.add(value)
    }
    for (const item of scopes) expect([...item.names]).toEqual([...item.eager])
  }
})

test('insertion order, delete/reinsert, no-op writes and readonly iteration match names', () => {
  const names = new SymbolNames(['first', 'second'])
  const snapshot = names.fork()
  names.add('first')
  expect(names.delete('missing')).toBe(false)
  expect(names.delete('first')).toBe(true)
  names.add('first')
  expect(names.size).toBe(2)
  expect([...names.keys()]).toEqual(['second', 'first'])
  expect([...names.entries()]).toEqual([
    ['second', 'second'],
    ['first', 'first'],
  ])
  const receiver: { seen: string[] } = { seen: [] }
  names.forEach(function (this: typeof receiver, value, key, set) {
    expect(key).toBe(value)
    expect(set === names).toBe(true)
    this.seen.push(value)
  }, receiver)
  expect(receiver.seen).toEqual(['second', 'first'])
  expect([...snapshot]).toEqual(['first', 'second'])
})
