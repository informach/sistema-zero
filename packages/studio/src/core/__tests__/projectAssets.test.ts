import { describe, expect, it } from 'bun:test'
import { ASSET_LIBRARY } from '../../asset-library/catalog'
import {
  assetManifest,
  createEmptyProject,
  isValidAssetDataUrl,
  normalizeAssetName,
  PROJECT_ASSET_LIMITS,
  type ProjectAsset,
  sanitizeProjectAssets,
  soundManifest,
} from '../project'

const PNG = 'data:image/png;base64,AAAA'
const WEBP = 'data:image/webp;base64,BBBB'
const MP3 = 'data:audio/mpeg;base64,CCCC'

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
  it('aceita data:image/ e data:audio/ dentro do teto de cada um', () => {
    expect(isValidAssetDataUrl(PNG)).toBe(true)
    expect(isValidAssetDataUrl(MP3)).toBe(true)
    expect(isValidAssetDataUrl('http://x/img.png')).toBe(false)
    expect(isValidAssetDataUrl('data:text/html;base64,AAAA')).toBe(false)
    // Estoura o teto por-imagem (dinâmico p/ sobreviver a aumentos de cota).
    expect(
      isValidAssetDataUrl(
        `data:image/png;base64,${'A'.repeat(PROJECT_ASSET_LIMITS.maxAssetDataUrlChars)}`,
      ),
    ).toBe(false)
  })

  it('o parâmetro kind exige o prefixo casado', () => {
    expect(isValidAssetDataUrl(PNG, 'image')).toBe(true)
    expect(isValidAssetDataUrl(PNG, 'audio')).toBe(false) // imagem não passa como som
    expect(isValidAssetDataUrl(MP3, 'audio')).toBe(true)
    expect(isValidAssetDataUrl(MP3, 'image')).toBe(false)
  })

  it('áudio tem teto próprio (bem maior que o de imagem)', () => {
    // Tamanho > teto de imagem mas < teto de áudio: só vale como áudio.
    const size = PROJECT_ASSET_LIMITS.maxAssetDataUrlChars + 1000
    expect(isValidAssetDataUrl(`data:audio/mpeg;base64,${'A'.repeat(size)}`, 'audio')).toBe(true)
    expect(
      isValidAssetDataUrl(
        `data:audio/mpeg;base64,${'A'.repeat(PROJECT_ASSET_LIMITS.maxAudioDataUrlChars)}`,
        'audio',
      ),
    ).toBe(false)
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
      { kind: 'audio', name: 'som-ruim', dataUrl: PNG }, // áudio com dataUrl de IMAGEM: prefixo errado, descartado
      { kind: 'audio', name: 'Explosão', dataUrl: MP3 }, // áudio válido: sobrevive
    ])
    expect(out.map((a) => a.name)).toEqual(['heroi', 'mapa', 'explosao'])
    const mapa = out.find((a) => a.name === 'mapa') as ProjectAsset
    expect(mapa.source).toBe('library')
    expect(mapa.libId).toBe('lib-1')
    expect(mapa.width).toBe(64)
    const som = out.find((a) => a.name === 'explosao') as ProjectAsset
    expect(som.kind).toBe('audio')
    expect(som.dataUrl).toBe(MP3)
  })

  it('respeita o orçamento total (descarta o que estoura)', () => {
    // Dinâmico sobre os tetos: cada imagem ~metade do limite por-imagem (válida),
    // e quantidade suficiente para a SOMA estourar o orçamento total — sem encostar
    // no teto de QUANTIDADE (senão seria esse o limitante, não o orçamento).
    const each = Math.floor(PROJECT_ASSET_LIMITS.maxAssetDataUrlChars / 2)
    const big = `data:image/png;base64,${'A'.repeat(each)}`
    const count = Math.min(
      PROJECT_ASSET_LIMITS.maxAssetsCount,
      Math.ceil(PROJECT_ASSET_LIMITS.maxAssetsTotalChars / big.length) + 4,
    )
    const many = Array.from({ length: count }, (_, i) => ({
      kind: 'image' as const,
      name: `img-${i}`,
      dataUrl: big,
    }))
    const out = sanitizeProjectAssets(many)
    // A soma estoura o orçamento → não cabem todos.
    expect(out.length).toBeLessThan(count)
    expect(out.length).toBeGreaterThan(0)
  })

  it('tolera entradas não-array/lixo', () => {
    expect(sanitizeProjectAssets(undefined)).toEqual([])
    expect(sanitizeProjectAssets('x')).toEqual([])
    expect(sanitizeProjectAssets([null, 1, 'a'])).toEqual([])
  })
})

describe('assetManifest', () => {
  it('mapeia nome → dataUrl, só imagens (ignora áudio e ausência)', () => {
    const assets = sanitizeProjectAssets([
      { kind: 'image', name: 'heroi', dataUrl: PNG },
      { kind: 'image', name: 'mapa', dataUrl: WEBP },
      { kind: 'audio', name: 'som', dataUrl: MP3 },
    ])
    expect(assetManifest(assets)).toEqual({ heroi: PNG, mapa: WEBP })
    expect(assetManifest(undefined)).toEqual({})
  })
})

describe('soundManifest', () => {
  it('mapeia nome → dataUrl, só áudio (ignora imagem e ausência)', () => {
    const assets = sanitizeProjectAssets([
      { kind: 'image', name: 'heroi', dataUrl: PNG },
      { kind: 'audio', name: 'explosao', dataUrl: MP3 },
      { kind: 'audio', name: 'moeda', dataUrl: 'data:audio/wav;base64,DDDD' },
    ])
    expect(soundManifest(assets)).toEqual({
      explosao: MP3,
      moeda: 'data:audio/wav;base64,DDDD',
    })
    expect(soundManifest(undefined)).toEqual({})
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
