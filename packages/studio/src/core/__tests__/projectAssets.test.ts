import { describe, expect, it } from 'bun:test'
import { ASSET_LIBRARY } from '../../asset-library/catalog'
import {
  assetManifest,
  createEmptyProject,
  isValidAssetDataUrl,
  normalizeAssetName,
  type ProjectAsset,
  sanitizeProjectAssets,
} from '../project'

const PNG = 'data:image/png;base64,AAAA'
const WEBP = 'data:image/webp;base64,BBBB'

describe('normalizeAssetName', () => {
  it('kebabiza, remove acento e minúsculiza', () => {
    expect(normalizeAssetName('Herói do Mar')).toBe('heroi-do-mar')
    expect(normalizeAssetName('Hero_01')).toBe('hero-01')
    expect(normalizeAssetName('  --espaços--  ')).toBe('espacos')
  })

  it('rejeita nomes vazios ou só de símbolos', () => {
    expect(normalizeAssetName('   ')).toBeNull()
    expect(normalizeAssetName('!@#$')).toBeNull()
    expect(normalizeAssetName('---')).toBeNull()
  })

  it('rejeita nome longo demais', () => {
    expect(normalizeAssetName('a'.repeat(49))).toBeNull()
    expect(normalizeAssetName('a'.repeat(48))).toBe('a'.repeat(48))
  })
})

describe('isValidAssetDataUrl', () => {
  it('aceita só data:image/ dentro do teto', () => {
    expect(isValidAssetDataUrl(PNG)).toBe(true)
    expect(isValidAssetDataUrl('http://x/img.png')).toBe(false)
    expect(isValidAssetDataUrl('data:text/html;base64,AAAA')).toBe(false)
    expect(isValidAssetDataUrl(`data:image/png;base64,${'A'.repeat(500_000)}`)).toBe(false)
  })
})

describe('sanitizeProjectAssets', () => {
  it('normaliza, deduplica por nome e descarta dataUrl inválido', () => {
    const out = sanitizeProjectAssets([
      { kind: 'image', name: 'Herói', dataUrl: PNG, source: 'upload' },
      { kind: 'image', name: 'herói', dataUrl: PNG }, // duplicado pós-normalização
      { kind: 'image', name: 'mau', dataUrl: 'http://evil' }, // dataUrl inválido
      {
        kind: 'image',
        name: 'mapa',
        dataUrl: WEBP,
        source: 'library',
        libId: 'lib-1',
        width: 64,
        height: 64,
      },
      { kind: 'audio', name: 'som', dataUrl: PNG }, // kind não suportado
    ])
    expect(out.map((a) => a.name)).toEqual(['heroi', 'mapa'])
    const mapa = out.find((a) => a.name === 'mapa') as ProjectAsset
    expect(mapa.source).toBe('library')
    expect(mapa.libId).toBe('lib-1')
    expect(mapa.width).toBe(64)
  })

  it('respeita o orçamento total (descarta o que estoura)', () => {
    const big = `data:image/png;base64,${'A'.repeat(350_000)}`
    const many = Array.from({ length: 30 }, (_, i) => ({
      kind: 'image' as const,
      name: `img-${i}`,
      dataUrl: big,
    }))
    const out = sanitizeProjectAssets(many)
    // ~5.6 MB de orçamento / ~350 KB cada → não cabem todos os 30.
    expect(out.length).toBeLessThan(30)
    expect(out.length).toBeGreaterThan(0)
  })

  it('tolera entradas não-array/lixo', () => {
    expect(sanitizeProjectAssets(undefined)).toEqual([])
    expect(sanitizeProjectAssets('x')).toEqual([])
    expect(sanitizeProjectAssets([null, 1, 'a'])).toEqual([])
  })
})

describe('assetManifest', () => {
  it('mapeia nome → dataUrl, ignorando ausência', () => {
    const assets = sanitizeProjectAssets([
      { kind: 'image', name: 'heroi', dataUrl: PNG },
      { kind: 'image', name: 'mapa', dataUrl: WEBP },
    ])
    expect(assetManifest(assets)).toEqual({ heroi: PNG, mapa: WEBP })
    expect(assetManifest(undefined)).toEqual({})
  })
})

describe('createEmptyProject', () => {
  it('nasce com assets: [] (retrocompatível)', () => {
    expect(createEmptyProject('id', 'Nome').assets).toEqual([])
  })
})

describe('starter pack (asset-library)', () => {
  it('todo item é um data:image válido com nome kebab normalizado e id único', () => {
    const ids = new Set<string>()
    const names = new Set<string>()
    for (const lib of ASSET_LIBRARY) {
      expect(isValidAssetDataUrl(lib.dataUrl)).toBe(true)
      expect(normalizeAssetName(lib.name)).toBe(lib.name)
      expect(ids.has(lib.id)).toBe(false)
      expect(names.has(lib.name)).toBe(false)
      ids.add(lib.id)
      names.add(lib.name)
    }
  })

  it('o pack inteiro sobrevive ao sanitizeProjectAssets (entra no projeto sem perdas)', () => {
    const asProjectShape = ASSET_LIBRARY.map((lib) => ({
      kind: 'image' as const,
      name: lib.name,
      dataUrl: lib.dataUrl,
      source: 'library' as const,
      libId: lib.id,
      width: lib.width,
      height: lib.height,
    }))
    expect(sanitizeProjectAssets(asProjectShape)).toHaveLength(ASSET_LIBRARY.length)
  })
})
