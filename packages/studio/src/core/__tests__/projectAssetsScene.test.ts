import { describe, expect, it, spyOn } from 'bun:test'
import {
  assetMetaManifest,
  PROJECT_ASSET_LIMITS,
  type ProjectAsset,
  projectAssetBudgetChars,
  sanitizeProjectAssets,
} from '../project'

const PNG = 'data:image/png;base64,AAAA'
const MAPA = {
  tileSize: 16,
  cols: 1,
  rows: 1,
  grid: '0',
  solid: [0],
  tileset: { dataUrl: PNG, width: 16, height: 16 },
}
function cena(nome = 'vila') {
  return {
    version: 1 as const,
    id: nome,
    name: nome,
    tileSize: 16,
    cols: 1,
    rows: 1,
    tilesets: [{ id: 'ts', name: 'ts', image: PNG, columns: 1, count: 1, solid: [], platform: [] }],
    layers: [
      { id: 't', kind: 'tiles' as const, name: 'Chão', visible: true, tilesetId: 'ts', cells: [0] },
    ],
  }
}
function imagem(over: Partial<ProjectAsset> = {}): ProjectAsset {
  return { id: 'a', name: 'vila', kind: 'image', source: 'library', dataUrl: PNG, ...over }
}

describe('metadados que vão ao documento', () => {
  const comCena = [imagem({ scene: cena(), tilemap: MAPA, tilemapFront: MAPA })]

  it('a cena só viaja quando o código usa um bloco de cenário', () => {
    const antigo = assetMetaManifest(comCena, { code: 'SZGame2D.createTileMapFromAsset("vila");' })
    expect(antigo.vila).toEqual({ tilemap: MAPA, hasScene: true })
    const novo = assetMetaManifest(comCena, { code: 'SZGame2D.createMapScene("mapa", "vila");' })
    expect(novo.vila).toEqual({ tilemap: MAPA, scene: cena() })
    // Sem contexto (chamador antigo, teste): a cena vai, é o lado seguro.
    expect(assetMetaManifest(comCena).vila).toEqual({ tilemap: MAPA, scene: cena() })
  })

  it('a camada da frente do envelope antigo nunca viaja: nenhum motor a lê', () => {
    for (const context of [undefined, { code: '' }, { code: 'drawMapScene' }])
      expect(JSON.stringify(assetMetaManifest(comCena, context))).not.toContain('tilemapFront')
  })

  it('desenho só com cena, em jogo de blocos antigos, leva só o sinal curto', () => {
    const manifesto = assetMetaManifest([imagem({ scene: cena() })], { code: 'SZGame2D.clear();' })
    expect(manifesto).toEqual({ vila: { hasScene: true } })
    expect(JSON.stringify(manifesto).length).toBeLessThan(40)
  })

  it('projeto sem cena: o manifesto é o de sempre, com ou sem contexto', () => {
    const semCena = [
      imagem({ tilemap: MAPA }),
      imagem({
        id: 'b',
        name: 'heroi',
        sprite: { frameW: 16, frameH: 16, animations: [], hitbox: { x: 0, y: 0, w: 1, h: 1 } },
      }),
      imagem({ id: 'c', name: 'fundo' }),
    ]
    const esperado = { vila: { tilemap: MAPA }, heroi: { hitbox: { x: 0, y: 0, w: 1, h: 1 } } }
    for (const context of [undefined, { code: 'SZGame2D.clear();' }, { code: 'createMapScene' }]) {
      const manifesto = assetMetaManifest(semCena, context)
      expect(manifesto).toEqual(esperado)
      expect(JSON.stringify(manifesto)).toBe(JSON.stringify(esperado))
      expect(JSON.stringify(manifesto)).not.toMatch(/scene|hasScene|tilemapFront/)
    }
  })
})

describe('orçamento do projeto com cena', () => {
  const limites = { ...PROJECT_ASSET_LIMITS, maxAssetsTotalChars: 2_000 }
  const cheia = `data:image/png;base64,${'A'.repeat(1_800)}`

  it('a cena pesa no total, do mesmo jeito na escrita e na leitura', () => {
    const asset = imagem({ scene: cena() })
    expect(projectAssetBudgetChars(asset)).toBe(PNG.length + JSON.stringify(cena()).length)
    expect(projectAssetBudgetChars(imagem())).toBe(PNG.length)
  })

  it('cena que não cabe sai sozinha: a imagem fica e a criança é avisada', () => {
    const aviso = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const warnings: string[] = []
      const lidos = sanitizeProjectAssets(
        [imagem({ id: 'f', name: 'fundo', dataUrl: cheia }), imagem({ scene: cena() })],
        { dataLimits: limites, warnings },
      )
      // Antes: o desenho INTEIRO sumia, em silêncio, mesmo com a imagem cabendo.
      expect(lidos.map((a) => a.name)).toEqual(['fundo', 'vila'])
      expect(lidos[1]?.dataUrl).toBe(PNG)
      expect(lidos[1]?.scene).toBeUndefined()
      expect(warnings).toEqual([
        'O cenário do desenho "vila" não coube neste projeto e ficou de fora. A imagem foi mantida.',
      ])
      expect(aviso).toHaveBeenCalledTimes(1)
    } finally {
      aviso.mockRestore()
    }
  })

  it('o teto é o do chamador (`dataLimits`), não a constante global', () => {
    const folgado = sanitizeProjectAssets(
      [imagem({ id: 'f', name: 'fundo', dataUrl: cheia }), imagem({ scene: cena() })],
      { dataLimits: { ...limites, maxAssetsTotalChars: 4_000 } },
    )
    expect(folgado[1]?.scene).toEqual(cena())
    // E a cena aceita conta para o material seguinte.
    const terceiro = sanitizeProjectAssets(
      [imagem({ scene: cena() }), imagem({ id: 'f', name: 'fundo', dataUrl: cheia })],
      { dataLimits: { ...limites, maxAssetsTotalChars: PNG.length + cheia.length + 10 } },
    )
    expect(terceiro.map((a) => a.name)).toEqual(['vila'])
  })
})
