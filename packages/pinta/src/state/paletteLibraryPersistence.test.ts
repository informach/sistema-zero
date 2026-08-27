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

  it('gravar com uma leitura VELHA não apaga a paleta da outra aba (merge no save)', async () => {
    // Duas abas do mesmo perfil escrevem o MESMO registro (o Estúdio abre o
    // Pinta em aba nova). Antes o save era cego: last-write-wins.
    const tabA = createPintaPersistence()
    const tabB = createPintaPersistence()
    await tabA.savePaletteLibrary?.(libraryOf())
    // A outra aba partiu de uma biblioteca SEM p1 (leitura anterior) e salva p2.
    const merged = await tabB.savePaletteLibrary?.({
      version: 1,
      updatedAt: 50,
      palettes: [
        {
          id: 'p2',
          updatedAt: 50,
          name: 'Festa',
          colors: ['', '#ff8800', ...Array.from({ length: 14 }, () => '')],
        },
      ],
      removed: [],
    })
    // O retorno é o que a transação REALMENTE gravou; a store não precisa
    // adivinhar se outra aba acrescentou algo entre a leitura e o save.
    expect(merged?.palettes.map((p) => p.id).sort()).toEqual(['p1', 'p2'])
    const loaded = await tabA.loadPaletteLibrary?.()
    expect(loaded?.palettes.map((p) => p.id).sort()).toEqual(['p1', 'p2'])
  })

  it('a LÁPIDE continua matando no merge do save (exclusão não ressuscita)', async () => {
    const persistence = createPintaPersistence()
    await persistence.savePaletteLibrary?.(libraryOf())
    // A store exclui: grava sem p1 e com a lápide mais nova que a edição.
    await persistence.savePaletteLibrary?.({
      version: 1,
      updatedAt: 60,
      palettes: [],
      removed: [{ id: 'p1', removedAt: 60 }],
    })
    expect((await persistence.loadPaletteLibrary?.())?.palettes).toEqual([])
    // Uma regravação VELHA (outra aba com leitura anterior à exclusão) também
    // não a traz de volta: a lápide do disco vence a edição mais antiga.
    await persistence.savePaletteLibrary?.(libraryOf())
    expect((await persistence.loadPaletteLibrary?.())?.palettes).toEqual([])
  })
})
