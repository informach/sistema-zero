import { describe, expect, it } from 'bun:test'
import { createEmptyProject, type Project, type ProjectAsset } from '#core'
import { MAP_TWO_D_FRAGMENT_MAX_CHARS } from '../../official-extensions/map-2d/bootstrap'
import { buildAssetsRuntime } from '../assetsBridge'
import { renderProjectToPreviewDocAsync } from '../renderProject'

/**
 * Bytes do documento que a criança baixa a cada prévia, medidos pelo caminho do jogar
 * (`renderProjectToPreviewDocAsync`): a cena do Pinta e o motor do cenário só entram quando o
 * jogo usa um bloco de cenário. Jogo de blocos antigos não paga por eles.
 */
const PNG = 'data:image/png;base64,AAAA'
const FOLHA = `data:image/png;base64,${'F'.repeat(60_000)}`
const MAPA = {
  tileSize: 16,
  cols: 2,
  rows: 1,
  grid: '0 0',
  solid: [0],
  tileset: { dataUrl: FOLHA, width: 16, height: 16 },
}
const CENA = {
  version: 1 as const,
  id: 'vila',
  name: 'vila',
  tileSize: 16,
  cols: 2,
  rows: 1,
  tilesets: [
    { id: 'ts', name: 'ts', image: FOLHA, columns: 1, count: 1, solid: [0], platform: [] },
  ],
  layers: [
    {
      id: 't',
      kind: 'tiles' as const,
      name: 'Chão',
      visible: true,
      tilesetId: 'ts',
      cells: [0, 0],
    },
  ],
}
const ANTIGO = 'const mapa = SZGame2D.createTileMapFromAsset("vila");'
const NOVO = 'SZGame2D.createMapScene("mapa", "vila");'

function jogo(script: string, asset: Partial<ProjectAsset>): Project {
  return {
    ...createEmptyProject('p1', 'Meu Jogo'),
    files: {
      'index.html': '<body><canvas id="tela"></canvas></body>',
      'style.css': '',
      'script.js': script,
    },
    installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 1 }],
    assets: [{ id: 'a', name: 'vila', kind: 'image', source: 'library', dataUrl: PNG, ...asset }],
  }
}
const bytes = (doc: string) => new TextEncoder().encode(doc).byteLength
/** O manifesto de metadados como o documento o semeia (texto JSON dentro de um literal). */
function metaDoDocumento(doc: string): Record<string, Record<string, unknown>> {
  const inicio = doc.indexOf('META = JSON.parse(')
  if (inicio < 0) return {}
  const literal = doc.slice(
    inicio + 'META = JSON.parse('.length,
    doc.indexOf('); } catch (e) { META = {}; }', inicio),
  )
  return JSON.parse(JSON.parse(literal))
}

describe('bytes do documento com e sem cenário', () => {
  it('jogo de blocos antigos não leva a cena, a frente repetida nem o motor do cenário', async () => {
    const material = { tilemap: MAPA, tilemapFront: MAPA, scene: CENA }
    const semCena = await renderProjectToPreviewDocAsync(jogo(ANTIGO, { tilemap: MAPA }))
    const antigo = await renderProjectToPreviewDocAsync(jogo(ANTIGO, material))
    const novo = await renderProjectToPreviewDocAsync(jogo(NOVO, material))

    expect(metaDoDocumento(antigo).vila).toEqual({ tilemap: MAPA, hasScene: true })
    expect(antigo).not.toContain('createMap2D')
    // Mesmo código, com e sem a cena guardada no material: só o sinal curto de diferença.
    expect(bytes(antigo) - bytes(semCena)).toBe(bytes(',\\"hasScene\\":true'))

    expect(metaDoDocumento(novo).vila).toEqual({ tilemap: MAPA, scene: CENA })
    expect(novo).toContain('createMap2D')
    // A cena (uma folha de 60 mil) e o motor entram só aqui. O teto do fragmento
    // acompanha o contrato já medido do runtime; 1.000 bytes cobrem o pequeno
    // manifesto desta fixture e a ligação ao host. Não amplia o teto do motor.
    const diferenca = bytes(novo) - bytes(antigo)
    expect(diferenca).toBeGreaterThan(60_000 + 9_000)
    expect(diferenca).toBeLessThan(60_000 + MAP_TWO_D_FRAGMENT_MAX_CHARS + 1_000)
    for (const doc of [semCena, antigo, novo]) expect(doc).not.toContain('tilemapFront')
  })

  it('documento de projeto sem cena não ganha chave nenhuma', async () => {
    const doc = await renderProjectToPreviewDocAsync(jogo(ANTIGO, { tilemap: MAPA }))
    expect(metaDoDocumento(doc)).toEqual({ vila: { tilemap: MAPA } })
    expect(JSON.stringify(metaDoDocumento(doc))).not.toMatch(/hasScene|"scene"|tilemapFront/)
    expect(doc).not.toContain('tilemapFront')
    // Sem metadado nenhum, o script dos materiais é o de sempre, sem o bloco META.
    expect(buildAssetsRuntime({ vila: PNG }, {})).toBe(buildAssetsRuntime({ vila: PNG }))
    expect(buildAssetsRuntime({ vila: PNG }, {})).not.toContain('META')
  })

  it('o filtro do documento não deixa a frente antiga passar, venha de onde vier', () => {
    const script = buildAssetsRuntime(
      { vila: PNG },
      { vila: { tilemap: MAPA, tilemapFront: MAPA, hasScene: true } as never },
    )
    expect(script).not.toContain('tilemapFront')
    expect(script).toContain('hasScene')
    expect(script.split(FOLHA).length - 1).toBe(1)
  })
})
