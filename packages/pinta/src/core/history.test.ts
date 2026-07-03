import { describe, expect, it } from 'bun:test'
import { bitmapBytes, createHistory } from './history'

describe('createHistory (undo/redo por snapshots com orçamento)', () => {
  it('record → undo → redo', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length })
    history.record('v1')
    history.record('v2')
    expect(history.canUndo()).toBe(true)

    expect(history.undo('v3')).toBe('v2')
    expect(history.undo('v2')).toBe('v1')
    expect(history.canUndo()).toBe(false)
    expect(history.undo('v1')).toBeNull()

    expect(history.redo('v1')).toBe('v2')
    expect(history.redo('v2')).toBe('v3')
    expect(history.canRedo()).toBe(false)
  })

  it('gesto novo invalida o redo', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length })
    history.record('v1')
    expect(history.undo('v2')).toBe('v1')
    history.record('v1')
    expect(history.canRedo()).toBe(false)
  })

  it('orçamento derruba os passos mais antigos mas mantém pelo menos 1', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length, byteBudget: 5 })
    history.record('aa')
    history.record('bb')
    history.record('cc') // 6 bytes > 5 → derruba 'aa'
    expect(history.undo('dd')).toBe('cc')
    expect(history.undo('cc')).toBe('bb')
    expect(history.undo('bb')).toBeNull()
  })

  it('um snapshot sozinho maior que o orçamento ainda permite 1 undo', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length, byteBudget: 2 })
    history.record('grande-demais')
    expect(history.canUndo()).toBe(true)
    expect(history.undo('atual')).toBe('grande-demais')
  })

  it('clear zera tudo', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length })
    history.record('v1')
    history.undo('v2')
    history.clear()
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
  })

  it('bitmapBytes aproxima pelo byteLength', () => {
    expect(bitmapBytes({ data: new Uint8Array(100) })).toBe(164)
  })
})
