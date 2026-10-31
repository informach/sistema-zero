import { useCallback, useEffect, useState } from 'react'
import {
  type CharacterMotionData,
  readCharacterMotionData,
} from '../../../scene/characterMotionLibrary'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'

export interface SavedCharacterMotion {
  id: string
  data: CharacterMotionData
}

/** Cada movimento guardado tem uns 20 KB: 24 cabem com folga no espaço do navegador. */
export const MAX_SAVED_MOTIONS = 24

function readLibrary(key: string): SavedCharacterMotion[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    return parsed
      .flatMap((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return []
        const row = entry as Record<string, unknown>
        if (typeof row.id !== 'string' || !row.id || row.id.length > 64 || seen.has(row.id))
          return []
        try {
          const data = readCharacterMotionData(row.data)
          seen.add(row.id)
          return [{ id: row.id, data }]
        } catch {
          return []
        }
      })
      .slice(0, MAX_SAVED_MOTIONS)
  } catch {
    return []
  }
}

/**
 * Meus movimentos: movimentos feitos à mão num personagem, guardados para usar em qualquer outro
 * (de qualquer criação deste perfil, neste aparelho), como as paletas guardadas.
 */
export function useCharacterMotionLibrary() {
  const [key] = useState(() => moldaPreferenceKey('scene.motions'))
  const [motions, setMotions] = useState(() => readLibrary(key))
  const [error, setError] = useState(false)

  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === key) setMotions(readLibrary(key))
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [key])

  const update = useCallback(
    (change: (current: SavedCharacterMotion[]) => SavedCharacterMotion[]) => {
      const next = change(readLibrary(key))
      try {
        localStorage.setItem(key, JSON.stringify(next))
        setMotions(next)
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
    motions,
    error,
    full: motions.length >= MAX_SAVED_MOTIONS,
    /**
     * Guarda; com o mesmo nome, troca o de antes (como guardar de novo um movimento pronto). Diz
     * por que não deu: dados fora do formato, coleção cheia ou espaço do navegador.
     */
    save(data: CharacterMotionData): 'saved' | 'invalid' | 'full' | 'storage' {
      let clean: CharacterMotionData
      try {
        clean = readCharacterMotionData(data)
      } catch {
        return 'invalid'
      }
      const current = readLibrary(key)
      const same = current.find((entry) => entry.data.name === clean.name)
      if (!same && current.length >= MAX_SAVED_MOTIONS) return 'full'
      const saved = { id: same?.id ?? crypto.randomUUID(), data: clean }
      return update((list) =>
        same
          ? list.map((entry) => (entry.id === same.id ? saved : entry))
          : [...list, saved].slice(0, MAX_SAVED_MOTIONS),
      )
        ? 'saved'
        : 'storage'
    },
    remove(id: string) {
      return update((current) => current.filter((entry) => entry.id !== id))
    },
  }
}
