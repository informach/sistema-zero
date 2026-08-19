import { describe, expect, it } from 'bun:test'
import {
  filterGalleryAssets,
  type GalleryFilters,
  hasActiveGalleryFilters,
  matchesGalleryFilters,
  matchesGallerySearch,
  normalizeSearchText,
  searchTerms,
} from './gallerySearch'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorSpriteAsset,
} from './project'

const heroi = createPixelSpriteAsset({ name: 'heroi-azul', frameSize: 16 })
const nave = {
  ...createVectorSpriteAsset({ name: 'nave-2', frameSize: 32 }),
  projectRef: { id: 'p1', name: 'Jogo da Nave' },
}
const ceu = createPixelBackgroundAsset({ name: 'ceu-noturno', width: 16, height: 16 })
const pecas = createTilesetAsset({ name: 'pecas-castelo', tileSize: 16 })
const mapa = createTilemapAsset({ name: 'fase-1', tilesetId: pecas.id, cols: 2, rows: 2 })

describe('normalizeSearchText / searchTerms', () => {
  it('minúsculas, sem acento, espaços viram hífen, símbolos somem', () => {
    expect(normalizeSearchText('Cenário de Fundo')).toBe('cenario-de-fundo')
    expect(normalizeSearchText('  Nave  2! ')).toBe('nave-2')
    expect(searchTerms('nave   Azul')).toEqual(['nave', 'azul'])
    expect(searchTerms('   ')).toEqual([])
  })
})

describe('matchesGallerySearch', () => {
  it('casa pelo nome (com a mesma normalização do nome), pelo tipo e pelo jogo', () => {
    expect(matchesGallerySearch(heroi, 'azul')).toBe(true)
    expect(matchesGallerySearch(heroi, 'Herói')).toBe(true) // acento some
    expect(matchesGallerySearch(nave, 'nave 2')).toBe(true) // "nave 2" → nave-2
    expect(matchesGallerySearch(nave, 'personagem')).toBe(true) // tipo
    expect(matchesGallerySearch(ceu, 'cenário')).toBe(true) // tipo com acento
    expect(matchesGallerySearch(nave, 'jogo da nave')).toBe(true) // jogo do Pensa
    expect(matchesGallerySearch(heroi, 'nave')).toBe(false)
  })

  it('vários termos têm que casar TODOS; busca vazia casa tudo', () => {
    expect(matchesGallerySearch(nave, 'nave personagem')).toBe(true)
    expect(matchesGallerySearch(nave, 'nave cenario')).toBe(false)
    expect(matchesGallerySearch(heroi, '')).toBe(true)
  })
})

describe('matchesGalleryFilters', () => {
  it('estilo: pixel × vetor; o mapa aparece nos dois', () => {
    const pixel = { query: '', style: 'pixel', role: 'all' } as const
    const vector = { query: '', style: 'vector', role: 'all' } as const
    expect(matchesGalleryFilters(heroi, pixel)).toBe(true)
    expect(matchesGalleryFilters(heroi, vector)).toBe(false)
    expect(matchesGalleryFilters(nave, vector)).toBe(true)
    expect(matchesGalleryFilters(mapa, pixel)).toBe(true)
    expect(matchesGalleryFilters(mapa, vector)).toBe(true)
  })

  it('tipo: personagem × cenário × peças × mapa, combinado com a busca', () => {
    expect(matchesGalleryFilters(heroi, { query: '', style: 'all', role: 'sprite' })).toBe(true)
    expect(matchesGalleryFilters(ceu, { query: '', style: 'all', role: 'sprite' })).toBe(false)
    expect(matchesGalleryFilters(pecas, { query: '', style: 'all', role: 'tileset' })).toBe(true)
    expect(matchesGalleryFilters(mapa, { query: '', style: 'all', role: 'tilemap' })).toBe(true)
    expect(matchesGalleryFilters(nave, { query: 'nave', style: 'vector', role: 'sprite' })).toBe(
      true,
    )
    expect(matchesGalleryFilters(nave, { query: 'nave', style: 'pixel', role: 'sprite' })).toBe(
      false,
    )
  })

  it('hasActiveGalleryFilters: só busca em branco e "todos" nos dois é sem filtro', () => {
    expect(hasActiveGalleryFilters({ query: '  ', style: 'all', role: 'all' })).toBe(false)
    expect(hasActiveGalleryFilters({ query: 'a', style: 'all', role: 'all' })).toBe(true)
    expect(hasActiveGalleryFilters({ query: '', style: 'pixel', role: 'all' })).toBe(true)
    expect(hasActiveGalleryFilters({ query: '', style: 'all', role: 'tilemap' })).toBe(true)
  })
})

describe('filterGalleryAssets (a filtragem memoizada da galeria)', () => {
  it('equivale a filtrar asset a asset com matchesGalleryFilters, em todos os filtros', () => {
    const assets = [
      createPixelSpriteAsset({ name: 'heroi-azul', frameSize: 8 }),
      createPixelBackgroundAsset({ name: 'ceu-noturno', width: 8, height: 8 }),
      {
        ...createVectorSpriteAsset({ name: 'nave-2', frameSize: 16 }),
        projectRef: { id: 'p1', name: 'Jogo da Nave' },
      },
      createTilesetAsset({ name: 'pecas', tileSize: 8 }),
    ]
    const cases: GalleryFilters[] = [
      { query: '', style: 'all', role: 'all' },
      { query: 'nave', style: 'all', role: 'all' },
      { query: 'NAVE jogo', style: 'vector', role: 'all' },
      { query: '', style: 'pixel', role: 'background' },
      { query: 'xyz', style: 'all', role: 'all' },
      { query: 'peças', style: 'all', role: 'tileset' },
    ]
    for (const filters of cases) {
      expect(filterGalleryAssets(assets, filters).map((a) => a.name)).toEqual(
        assets.filter((a) => matchesGalleryFilters(a, filters)).map((a) => a.name),
      )
    }
  })
})
