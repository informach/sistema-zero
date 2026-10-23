import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'
import { getMoldaStorageNamespace, setMoldaStorageNamespace } from '../../../state/persistence'
import { useCanvasHints } from './useCanvasHints'

test('dismissed hints survive reopening, stay scoped to mode/profile, and can be restored', () => {
  const namespace = getMoldaStorageNamespace(),
    keys: string[] = []
  try {
    setMoldaStorageNamespace('hint-a')
    keys.push(moldaPreferenceKey('canvas-hints'))
    localStorage.removeItem(keys[0]!)
    let view = renderHook(() => useCanvasHints('animation'))
    act(() => view.result.current.dismiss())
    expect(view.result.current.hidden).toBe(true)
    view.unmount()
    view = renderHook(() => useCanvasHints('paint'))
    expect(view.result.current.hidden).toBe(false)
    view.unmount()
    setMoldaStorageNamespace('hint-b')
    keys.push(moldaPreferenceKey('canvas-hints'))
    localStorage.removeItem(keys[1]!)
    view = renderHook(() => useCanvasHints('animation'))
    expect(view.result.current.hidden).toBe(false)
    view.unmount()
    setMoldaStorageNamespace('hint-a')
    view = renderHook(() => useCanvasHints('animation'))
    expect(view.result.current.hidden).toBe(true)
    act(() => view.result.current.restore())
    expect(view.result.current.hidden).toBe(false)
    view.unmount()
  } finally {
    for (const key of keys) localStorage.removeItem(key)
    setMoldaStorageNamespace(namespace)
  }
})

test('unavailable preference storage still allows session dismissal and reports its limit', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error('denied')
      },
    },
  })
  const view = renderHook(() => useCanvasHints('animation'))
  try {
    act(() => view.result.current.dismiss())
    expect(view.result.current.hidden).toBe(true)
    expect(view.result.current.unavailable).toBe(true)
  } finally {
    view.unmount()
    Object.defineProperty(globalThis, 'localStorage', descriptor)
  }
})
