/**
 * Store da biblioteca "Minhas paletas" (por INSTÂNCIA, como as irmãs):
 * carrega/salva pelo `PintaPersistence` do app — os métodos são OPCIONAIS,
 * então `enabled` diz se a UI mostra a seção. O bloco de aula cria com
 * `disabled: true` (o desenho da aula é isolado da galeria pessoal, mesma
 * régua do clipboard `mirror: null`).
 *
 * Escrita é last-write-wins sobre o estado corrente desta instância; a
 * reconciliação entre abas/aparelhos é do wrapper da NUVEM do host, que faz o
 * merge por id + updatedAt (`mergePaletteLibraries`) antes de gravar.
 */
import { createStore } from 'zustand/vanilla'
import { newId } from '../core/id'
import { MAX_SAVED_PALETTES, type PaletteLibrary, type SavedPalette } from '../core/paletteLibrary'
import type { PintaPersistence } from './persistence'

export interface PaletteLibraryState {
  /** false = armazenamento sem os métodos, ou modo aula — a UI esconde a seção. */
  enabled: boolean
  loaded: boolean
  palettes: SavedPalette[]
  load(): Promise<void>
  /**
   * Guarda uma paleta nova (id/updatedAt carimbados) e devolve a salva —
   * `null` no teto (`MAX_SAVED_PALETTES`; quem chama avisa por toast).
   */
  savePalette(input: { name: string; colors: readonly string[] }): Promise<SavedPalette | null>
  renamePalette(id: string, name: string): Promise<boolean>
  removePalette(id: string): Promise<boolean>
}

export type PaletteLibraryStore = ReturnType<typeof createPaletteLibraryStore>

export function createPaletteLibraryStore(
  persistence: PintaPersistence,
  options: { disabled?: boolean; now?: () => number } = {},
) {
  const now = options.now ?? (() => Date.now())
  const enabled =
    options.disabled !== true &&
    typeof persistence.loadPaletteLibrary === 'function' &&
    typeof persistence.savePaletteLibrary === 'function'

  return createStore<PaletteLibraryState>()((set, get) => {
    async function write(palettes: SavedPalette[]): Promise<boolean> {
      const library: PaletteLibrary = { version: 1, updatedAt: now(), palettes }
      try {
        await persistence.savePaletteLibrary?.(library)
      } catch {
        // Best-effort: a falha de disco não pode derrubar o editor — o estado
        // em memória segue valendo para a sessão.
        set({ palettes })
        return false
      }
      set({ palettes })
      return true
    }

    return {
      enabled,
      loaded: !enabled,
      palettes: [],
      async load() {
        if (!enabled || get().loaded) return
        try {
          const library = await persistence.loadPaletteLibrary?.()
          set({ loaded: true, palettes: library?.palettes ?? [] })
        } catch {
          set({ loaded: true })
        }
      },
      async savePalette(input) {
        if (!enabled) return null
        const { palettes } = get()
        if (palettes.length >= MAX_SAVED_PALETTES) return null
        const palette: SavedPalette = {
          id: newId(),
          updatedAt: now(),
          name: input.name,
          colors: [...input.colors],
        }
        await write([...palettes, palette])
        return palette
      },
      async renamePalette(id, name) {
        const { palettes } = get()
        const target = palettes.find((p) => p.id === id)
        if (!target || !name.trim()) return false
        await write(
          palettes.map((p) => (p.id === id ? { ...p, name: name.trim(), updatedAt: now() } : p)),
        )
        return true
      },
      async removePalette(id) {
        const { palettes } = get()
        if (!palettes.some((p) => p.id === id)) return false
        await write(palettes.filter((p) => p.id !== id))
        return true
      },
    }
  })
}
