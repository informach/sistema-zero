/**
 * Store da biblioteca "Minhas paletas" (por INSTÂNCIA, como as irmãs):
 * carrega/salva pelo `PintaPersistence` do app — os métodos são OPCIONAIS,
 * então `enabled` diz se a UI mostra a seção. O bloco de aula cria com
 * `disabled: true` (o desenho da aula é isolado da galeria pessoal, mesma
 * régua do clipboard `mirror: null`).
 *
 * Escrita é last-write-wins sobre o estado corrente desta instância; a
 * reconciliação entre abas/aparelhos é do wrapper da NUVEM do host, que faz o
 * merge por id + updatedAt (`mergePaletteLibraries`) antes de gravar. Excluir
 * grava uma LÁPIDE (`removed`) — sem ela a reconciliação do outro aparelho
 * ressuscitava a paleta (full review 25/08).
 *
 * ⚠️ `load()` RELÊ o disco a cada chamada (single-flight; o lido só entra se o
 * `updatedAt` dele não for mais velho que o da memória): a nuvem grava o
 * registro POR FORA da store, e o latch de "carregou uma vez" deixava "Minhas
 * paletas" vazio num aparelho novo até o F5. Os painéis chamam `load()` também
 * ao ABRIR o menu — o momento da exibição é o momento da leitura.
 */
import { createStore } from 'zustand/vanilla'
import { newId } from '../core/id'
import {
  MAX_SAVED_PALETTES,
  type PaletteLibrary,
  type RemovedPaletteMark,
  type SavedPalette,
} from '../core/paletteLibrary'
import type { PintaPersistence } from './persistence'

export interface PaletteLibraryState {
  /** false = armazenamento sem os métodos, ou modo aula — a UI esconde a seção. */
  enabled: boolean
  loaded: boolean
  palettes: SavedPalette[]
  /** Lápides de exclusão (viajam no registro; a UI não as mostra). */
  removed: RemovedPaletteMark[]
  /** Timestamp do registro em memória (guarda de releitura). */
  libraryUpdatedAt: number
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
  let loadInFlight: Promise<void> | null = null

  return createStore<PaletteLibraryState>()((set, get) => {
    async function write(
      palettes: SavedPalette[],
      removed: RemovedPaletteMark[],
    ): Promise<boolean> {
      const libraryUpdatedAt = now()
      const library: PaletteLibrary = { version: 1, updatedAt: libraryUpdatedAt, palettes, removed }
      try {
        await persistence.savePaletteLibrary?.(library)
      } catch {
        // Best-effort: a falha de disco não pode derrubar o editor — o estado
        // em memória segue valendo para a sessão.
        set({ palettes, removed, libraryUpdatedAt })
        return false
      }
      set({ palettes, removed, libraryUpdatedAt })
      return true
    }

    return {
      enabled,
      loaded: !enabled,
      palettes: [],
      removed: [],
      libraryUpdatedAt: 0,
      async load() {
        if (!enabled) return
        if (loadInFlight) return loadInFlight
        loadInFlight = (async () => {
          try {
            const library = await persistence.loadPaletteLibrary?.()
            // Só aplica um registro que não seja mais VELHO que a memória (um
            // save desta instância pode estar em voo na fila de escrita).
            if (library && library.updatedAt >= get().libraryUpdatedAt) {
              set({
                loaded: true,
                palettes: library.palettes,
                removed: library.removed,
                libraryUpdatedAt: library.updatedAt,
              })
            } else {
              set({ loaded: true })
            }
          } catch {
            set({ loaded: true })
          } finally {
            loadInFlight = null
          }
        })()
        return loadInFlight
      },
      async savePalette(input) {
        if (!enabled) return null
        const { palettes, removed } = get()
        if (palettes.length >= MAX_SAVED_PALETTES) return null
        const palette: SavedPalette = {
          id: newId(),
          updatedAt: now(),
          name: input.name,
          colors: [...input.colors],
        }
        await write([...palettes, palette], removed)
        return palette
      },
      async renamePalette(id, name) {
        const { palettes, removed } = get()
        const target = palettes.find((p) => p.id === id)
        if (!target || !name.trim()) return false
        await write(
          palettes.map((p) => (p.id === id ? { ...p, name: name.trim(), updatedAt: now() } : p)),
          removed,
        )
        return true
      },
      async removePalette(id) {
        const { palettes, removed } = get()
        if (!palettes.some((p) => p.id === id)) return false
        // A LÁPIDE é o que faz a exclusão valer no outro aparelho (o merge da
        // nuvem mata a cópia de lá; uma edição posterior à lápide ressuscita).
        const mark: RemovedPaletteMark = { id, removedAt: now() }
        await write(
          palettes.filter((p) => p.id !== id),
          [...removed.filter((m) => m.id !== id), mark],
        )
        return true
      },
    }
  })
}
