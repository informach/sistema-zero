/**
 * A biblioteca "Minhas paletas" vive num registro ÚNICO (`pinta:palettes`)
 * FORA do prefixo dos assets — estes testes provam o isolamento: ela nunca
 * aparece na galeria, não entra no orçamento/backup e o load é defensivo.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { emptyPaletteLibrary, type PaletteLibrary } from '../core/paletteLibrary'
import { createPixelSpriteAsset } from '../core/projectConfig'
import { galleryToPintaJson } from '../export/projectJson'
import { clearIdbMock } from '../testing/idbMock'

const { createPintaPersistence, setPintaStorageNamespace } = await import('./persistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

function libraryOf(): PaletteLibrary {
  return {
    version: 1,
    updatedAt: 42,
    palettes: [
      {
        id: 'p1',
        updatedAt: 42,
        name: 'Céu',
        colors: ['', '#87f2ff', ...Array.from({ length: 14 }, () => '')],
      },
    ],
    removed: [],
  }
}

describe('biblioteca de paletas na persistência local', () => {
  it('salva e recarrega saneada; ausente → null', async () => {
    const persistence = createPintaPersistence()
    expect(await persistence.loadPaletteLibrary?.()).toBeNull()
    await persistence.savePaletteLibrary?.(libraryOf())
    const loaded = await persistence.loadPaletteLibrary?.()
    expect(loaded?.palettes.map((p) => [p.id, p.name, p.colors[1]])).toEqual([
      ['p1', 'Céu', '#87f2ff'],
    ])
  })

  it('NÃO vaza para a galeria nem para o backup', async () => {
    const persistence = createPintaPersistence()
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    await persistence.persistAssets([sprite])
    await persistence.savePaletteLibrary?.(libraryOf())

    const assets = await persistence.listAllAssets()
    expect(assets.map((a) => a.id)).toEqual([sprite.id])
    // O backup canônico serializa SÓ a galeria — a biblioteca fica fora.
    expect(galleryToPintaJson(assets)).not.toContain('Céu')
  })

  it('registro corrompido no disco não derruba: load devolve null', async () => {
    const persistence = createPintaPersistence()
    await persistence.savePaletteLibrary?.({ lixo: true } as unknown as PaletteLibrary)
    expect(await persistence.loadPaletteLibrary?.()).toBeNull()
    // E dá para recomeçar do zero por cima.
    await persistence.savePaletteLibrary?.(emptyPaletteLibrary())
    expect((await persistence.loadPaletteLibrary?.())?.palettes).toEqual([])
  })

  it('namespaces diferentes têm bibliotecas diferentes (perfil isolado)', async () => {
    const a = createPintaPersistence({ namespace: 'perfil-a' })
    const b = createPintaPersistence({ namespace: 'perfil-b' })
    await a.savePaletteLibrary?.(libraryOf())
    expect(await a.loadPaletteLibrary?.()).not.toBeNull()
    expect(await b.loadPaletteLibrary?.()).toBeNull()
  })
})
