import { useState } from 'react'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'

type Mode = 'model' | 'paint' | 'animation'
const MODES: readonly Mode[] = ['model', 'paint', 'animation']

/** Dismissal belongs to the profile, never the scene, undo stack or saved file. */
export function useCanvasHints(mode: Mode) {
  const [key] = useState(() => moldaPreferenceKey('canvas-hints'))
  const [hidden, setHidden] = useState<readonly Mode[]>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(value) ? MODES.filter((entry) => value.includes(entry)) : []
    } catch {
      return []
    }
  })
  const [unavailable, setUnavailable] = useState(false)
  const change = (next: readonly Mode[]) => {
    setHidden(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    }
  }
  return {
    hidden: hidden.includes(mode),
    unavailable,
    dismiss: () => change([...new Set([...hidden, mode])]),
    restore: () => change(hidden.filter((entry) => entry !== mode)),
  }
}
