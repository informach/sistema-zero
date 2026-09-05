import { describe, expect, test } from 'bun:test'
import { createHistory } from './history'

describe('createHistory', () => {
  test('undo/redo em ordem e um gesto novo limpa o redo', () => {
    const h = createHistory<number>({ sizeOf: () => 1 })
    h.record(1)
    h.record(2)
    expect(h.canUndo()).toBe(true)
    expect(h.undo(3)).toBe(2)
    expect(h.redo(2)).toBe(3)
    expect(h.undo(3)).toBe(2)
    h.record(2)
    expect(h.canRedo()).toBe(false)
    expect(h.undo(9)).toBe(2)
    expect(h.undo(2)).toBe(1)
    expect(h.undo(1)).toBeNull()
  })

  test('orçamento em bytes derruba os passos mais antigos mas mantém pelo menos um', () => {
    const h = createHistory<string>({ sizeOf: (s) => s.length, byteBudget: 10 })
    h.record('aaaa')
    h.record('bbbb')
    h.record('cccc')
    expect(h.undo('x')).toBe('cccc')
    expect(h.undo('cccc')).toBe('bbbb')
    expect(h.undo('bbbb')).toBeNull()
    const single = createHistory<string>({ sizeOf: (s) => s.length, byteBudget: 2 })
    single.record('gigante')
    expect(single.undo('x')).toBe('gigante')
  })
})
