import { create } from 'zustand'
import type { SourceMap } from '#generators'

interface SourcemapStore {
  map: SourceMap
  setMap: (map: SourceMap) => void
  clear: () => void
}

/**
 * Mantém o último source-map produzido por `generateProjectFilesWithMap`.
 * Os hooks `useCrossHighlight` leem este store para resolver bloco ↔ linha.
 */
export const useSourcemapStore = create<SourcemapStore>((set) => ({
  map: {},
  setMap: (map) => set({ map }),
  clear: () => set({ map: {} }),
}))
