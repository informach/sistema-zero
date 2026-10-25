import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { MoldaCustomPalette } from '../../../core/model'
import { PALETTE_SIZE } from '../../../core/palette'
import { sanitizeCustomPalette } from '../../../core/sanitize'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'
import { useOptionalMoldaApp } from '../../appContext'

export interface SavedScenePalette extends MoldaCustomPalette {
  id: string
}

const MAX_PALETTES = 24

function readLibrary(key: string): SavedScenePalette[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    return parsed
      .flatMap((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return []
        const row = entry as Record<string, unknown>
        const palette = sanitizeCustomPalette(row)
        if (
          !palette ||
          typeof row.id !== 'string' ||
          !row.id ||
          row.id.length > 64 ||
          seen.has(row.id)
        )
          return []
        seen.add(row.id)
        return [{ id: row.id, ...palette }]
      })
      .slice(0, MAX_PALETTES)
  } catch {
    return []
  }
}

export function useScenePaletteLibrary() {
  const [key] = useState(() => moldaPreferenceKey('scene.palettes'))
  const [palettes, setPalettes] = useState(() => readLibrary(key))
  const [error, setError] = useState(false)

  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === key) setPalettes(readLibrary(key))
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [key])

  const update = useCallback(
    (change: (current: SavedScenePalette[]) => SavedScenePalette[]) => {
      const next = change(readLibrary(key))
      try {
        localStorage.setItem(key, JSON.stringify(next))
        setPalettes(next)
        setError(false)
        return true
      } catch {
        setError(true)
        return false
      }
    },
    [key],
  )

  return {
    loaded: true,
    palettes,
    error,
    full: palettes.length >= MAX_PALETTES,
    create(palette: MoldaCustomPalette): SavedScenePalette | null {
      const clean = sanitizeCustomPalette(palette)
      if (!clean || readLibrary(key).length >= MAX_PALETTES) return null
      const saved = { id: crypto.randomUUID(), ...clean }
      return update((current) => (current.length >= MAX_PALETTES ? current : [...current, saved]))
        ? saved
        : null
    },
    rename(id: string, name: string) {
      const trimmed = name.trim()
      if (!trimmed) return false
      return update((current) =>
        current.map((entry) =>
          entry.id === id
            ? { ...entry, name: sanitizeCustomPalette({ ...entry, name: trimmed })!.name }
            : entry,
        ),
      )
    },
    remove(id: string) {
      return update((current) => current.filter((entry) => entry.id !== id))
    },
  }
}

/** Paletas de 32 cores pertencem ao Molda; as de 16 continuam compartilhadas com o Pinta. */
export function useAvailableScenePaletteLibrary() {
  const local = useScenePaletteLibrary()
  const shared = useOptionalMoldaApp()?.adapter.paletteLibrary
  const state = useSyncExternalStore(
    (listener) => shared?.subscribe(listener) ?? (() => {}),
    () => shared?.getState() ?? null,
    () => null,
  )
  useEffect(() => {
    if (shared) void shared.getState().load()
  }, [shared])
  if (!shared || !state) return local
  const ownPalettes = local.palettes.filter((palette) => palette.colors.length > PALETTE_SIZE)
  const palettes: readonly SavedScenePalette[] = [...state.palettes, ...ownPalettes]
  const isOwn = (id: string) => ownPalettes.some((palette) => palette.id === id)
  return {
    palettes,
    loaded: state.loaded,
    error: local.error,
    full: palettes.length >= MAX_PALETTES,
    create: (palette: MoldaCustomPalette) =>
      palette.colors.length > PALETTE_SIZE ? local.create(palette) : state.savePalette(palette),
    rename: (id: string, name: string) =>
      isOwn(id) ? local.rename(id, name) : state.renamePalette(id, name),
    remove: (id: string) => (isOwn(id) ? local.remove(id) : state.removePalette(id)),
  }
}
