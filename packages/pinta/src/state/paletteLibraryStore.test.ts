import { beforeEach, describe, expect, it } from 'bun:test'
import { MAX_SAVED_PALETTES } from '../core/paletteLibrary'
import { clearIdbMock } from '../testing/idbMock'

const { createPintaPersistence, setPintaStorageNamespace } = await import('./persistence')
const { createPaletteLibraryStore } = await import('./paletteLibraryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

const colorsOf = (hex: string) => ['', hex, ...Array.from({ length: 14 }, () => '')]

describe('paletteLibraryStore', () => {
  it('salva, renomeia e remove — persistindo a cada passo', async () => {
    const persistence = createPintaPersistence()
    const store = createPaletteLibraryStore(persistence, { now: () => 100 })
    expect(store.getState().enabled).toBe(true)
    await store.getState().load()

    const saved = await store.getState().savePalette({ name: 'Céu', colors: colorsOf('#87f2ff') })
    expect(saved?.name).toBe('Céu')
    expect(await store.getState().renamePalette(saved?.id ?? '', 'Céu de verão')).toBe(true)

    // Outra instância relê do disco o que esta gravou.
    const reread = createPaletteLibraryStore(persistence)
    await reread.getState().load()
    expect(reread.getState().palettes.map((p) => p.name)).toEqual(['Céu de verão'])

    expect(await store.getState().removePalette(saved?.id ?? '')).toBe(true)
    expect(store.getState().palettes).toEqual([])
  })

  it('teto: savePalette devolve null quando a biblioteca está cheia', async () => {
    const store = createPaletteLibraryStore(createPintaPersistence(), { now: () => 1 })
    await store.getState().load()
    for (let i = 0; i < MAX_SAVED_PALETTES; i += 1) {
      expect(
        await store.getState().savePalette({ name: `P${i}`, colors: colorsOf('#111111') }),
      ).not.toBeNull()
    }
    expect(
      await store.getState().savePalette({ name: 'excedente', colors: colorsOf('#222222') }),
    ).toBeNull()
  })

  it('disabled (modo aula) e armazenamento sem os métodos → enabled false, save inerte', async () => {
    const persistence = createPintaPersistence()
    const disabled = createPaletteLibraryStore(persistence, { disabled: true })
    expect(disabled.getState().enabled).toBe(false)
    expect(
      await disabled.getState().savePalette({ name: 'x', colors: colorsOf('#111111') }),
    ).toBeNull()
    // E NADA foi gravado no registro do perfil.
    expect(await persistence.loadPaletteLibrary?.()).toBeNull()

    const bare = createPaletteLibraryStore({
      persistAsset: async () => {},
      persistAssets: async () => {},
      deleteAsset: async () => {},
      loadAssetById: async () => null,
      listAllAssets: async () => [],
    })
    expect(bare.getState().enabled).toBe(false)
  })
})
