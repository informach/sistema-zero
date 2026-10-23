import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'
import { getMoldaStorageNamespace, setMoldaStorageNamespace } from '../../../state/persistence'
import { usePaintFavorites } from './usePaintFavorites'

test('saved paint colors survive remounts, deduplicate, and stay isolated by profile', () => {
  const original = getMoldaStorageNamespace()
  const keys: string[] = []
  try {
    setMoldaStorageNamespace('paint-profile-a')
    keys.push(moldaPreferenceKey('paint.colors'))
    localStorage.removeItem(keys[0]!)
    let view = renderHook(usePaintFavorites)
    act(() => view.result.current.remember([12, 34, 56, 255]))
    act(() => view.result.current.remember([12, 34, 56, 255]))
    expect(view.result.current.colors).toEqual([[12, 34, 56, 255]])
    view.unmount()
    setMoldaStorageNamespace('paint-profile-b')
    keys.push(moldaPreferenceKey('paint.colors'))
    localStorage.removeItem(keys[1]!)
    view = renderHook(usePaintFavorites)
    expect(view.result.current.colors).toEqual([])
    act(() => view.result.current.remember([90, 80, 70, 255]))
    view.unmount()
    setMoldaStorageNamespace('paint-profile-a')
    view = renderHook(usePaintFavorites)
    expect(view.result.current.colors).toEqual([[12, 34, 56, 255]])
    expect(view.result.current.unavailable).toBe(false)
    view.unmount()
  } finally {
    for (const key of keys) localStorage.removeItem(key)
    setMoldaStorageNamespace(original)
  }
})

test('invalid saved colors are reported without rewriting their source', () => {
  const original = getMoldaStorageNamespace()
  setMoldaStorageNamespace('paint-invalid-profile')
  const key = moldaPreferenceKey('paint.colors')
  try {
    for (const raw of ['{', '[[1,2,3,0]]', '[[1,2,999,255]]', '{"colors":[]}']) {
      localStorage.setItem(key, raw)
      const view = renderHook(usePaintFavorites)
      expect(view.result.current.colors).toEqual([])
      expect(view.result.current.unavailable).toBe(true)
      expect(localStorage.getItem(key)).toBe(raw)
      view.unmount()
    }
  } finally {
    localStorage.removeItem(key)
    setMoldaStorageNamespace(original)
  }
})
