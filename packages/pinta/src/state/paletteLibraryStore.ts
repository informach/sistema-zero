/**
 * Store da biblioteca "Minhas paletas" (por INSTÂNCIA, como as irmãs):
 * carrega/salva pelo `PintaPersistence` do app — os métodos são OPCIONAIS,
 * então `enabled` diz se a UI mostra a seção. O bloco de aula cria com
 * `disabled: true` (o desenho da aula é isolado da galeria pessoal, mesma
 * régua do clipboard `mirror: null`).
 *
 * Escritas e releituras são serializadas sobre o estado desta instância; a
 * reconciliação entre abas/aparelhos é do wrapper da NUVEM do host, que faz o
 * merge por id + updatedAt (`mergePaletteLibraries`) antes de gravar. Excluir
 * grava uma LÁPIDE (`removed`) — sem ela a reconciliação do outro aparelho
 * ressuscitava a paleta (full review 25/08).
 *
 * ⚠️ `load()` RELÊ o disco a cada chamada (o lido só entra se o
 * `updatedAt` dele não for mais velho que o da memória): a nuvem grava o
 * registro POR FORA da store, e o latch de "carregou uma vez" deixava "Minhas
 * paletas" vazio num aparelho novo até o F5. O evento do host recarrega após o
 * merge; abrir o menu continua sendo uma revalidação adicional.
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
  /** Liga a releitura quando o host terminar de fundir a biblioteca da nuvem. */
  attachPersistence(): () => void
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
  let mutationTail = Promise.resolve()
  let lastLogicalTimestamp = 0

  function enqueueMutation<T>(task: () => Promise<T>): Promise<T> {
    const result = mutationTail.then(task, task)
    mutationTail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  const store = createStore<PaletteLibraryState>()((set, get) => {
    function nextTimestamp(): number {
      lastLogicalTimestamp = Math.max(now(), lastLogicalTimestamp + 1, get().libraryUpdatedAt + 1)
      return lastLogicalTimestamp
    }

    async function write(
      palettes: SavedPalette[],
      removed: RemovedPaletteMark[],
      libraryUpdatedAt: number,
    ): Promise<boolean> {
      const library: PaletteLibrary = { version: 1, updatedAt: libraryUpdatedAt, palettes, removed }
      try {
        const saved = await persistence.savePaletteLibrary?.(library)
        if (!saved) throw new Error('Persistência não devolveu a biblioteca gravada')
        lastLogicalTimestamp = Math.max(lastLogicalTimestamp, saved.updatedAt)
        set({
          palettes: saved.palettes,
          removed: saved.removed,
          libraryUpdatedAt: saved.updatedAt,
        })
      } catch {
        // Best-effort: a falha de disco não pode derrubar o editor — o estado
        // em memória segue valendo para a sessão.
        set({ palettes, removed, libraryUpdatedAt })
        return false
      }
      return true
    }

    return {
      enabled,
      loaded: !enabled,
      palettes: [],
      removed: [],
      libraryUpdatedAt: 0,
      attachPersistence: () => () => {},
      async load() {
        if (!enabled) return
        if (loadInFlight) return loadInFlight
        loadInFlight = (async () => {
          try {
            const library = await persistence.loadPaletteLibrary?.()
            // Só aplica um registro que não seja mais VELHO que a memória (um
            // save desta instância pode estar em voo na fila de escrita).
            if (library && library.updatedAt >= get().libraryUpdatedAt) {
              lastLogicalTimestamp = Math.max(lastLogicalTimestamp, library.updatedAt)
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
          updatedAt: nextTimestamp(),
          name: input.name,
          colors: [...input.colors],
        }
        await write([...palettes, palette], removed, palette.updatedAt)
        return palette
      },
      async renamePalette(id, name) {
        // Mesmo portão do savePalette: numa store desabilitada (aula) nada
        // pode chegar ao disco do perfil, nem por um chamador futuro.
        if (!enabled) return false
        const { palettes, removed } = get()
        const target = palettes.find((p) => p.id === id)
        if (!target || !name.trim()) return false
        const updatedAt = nextTimestamp()
        await write(
          palettes.map((p) => (p.id === id ? { ...p, name: name.trim(), updatedAt } : p)),
          removed,
          updatedAt,
        )
        return true
      },
      async removePalette(id) {
        if (!enabled) return false
        const { palettes, removed } = get()
        if (!palettes.some((p) => p.id === id)) return false
        // A LÁPIDE é o que faz a exclusão valer no outro aparelho (o merge da
        // nuvem mata a cópia de lá; uma edição posterior à lápide ressuscita).
        const removedAt = nextTimestamp()
        const mark: RemovedPaletteMark = { id, removedAt }
        await write(
          palettes.filter((p) => p.id !== id),
          [...removed.filter((m) => m.id !== id), mark],
          removedAt,
        )
        return true
      },
    }
  })

  const actions = store.getState()
  store.setState({
    load: () => enqueueMutation(actions.load),
    savePalette: (input) => enqueueMutation(() => actions.savePalette(input)),
    renamePalette: (id, name) => enqueueMutation(() => actions.renamePalette(id, name)),
    removePalette: (id) => enqueueMutation(() => actions.removePalette(id)),
  })

  let detach: (() => void) | null = null
  store.setState({
    attachPersistence: () => {
      if (detach || !persistence.subscribe) return () => {}
      const unsubscribe = persistence.subscribe((event) => {
        if (event.type === 'palette-library-changed') void store.getState().load()
      })
      detach = () => {
        detach = null
        unsubscribe()
      }
      return () => detach?.()
    },
  })

  return store
}
