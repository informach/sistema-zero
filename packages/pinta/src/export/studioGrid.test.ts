import { describe, expect, it } from 'bun:test'
import { createTilemapAsset, createTilesetAsset } from '../core/project'
import { packTileset } from '../tiles/packTileset'
import { addLayer, setCell } from '../tiles/tilemapOps'
import { addTile, cycleCollision } from '../tiles/tilesetOps'
import {
  tilemapExportJson,
  tilemapToStudioGrid,
  tilesetPlatformList,
  tilesetSolidList,
} from './studioGrid'

function makeMap() {
  const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 4, rows: 2 })
  const layerId = tilemap.layers[0]?.id
  if (!layerId) throw new Error('camada esperada')
  let out = setCell(tilemap, layerId, 0, 0, 0)
  out = setCell(out, layerId, 1, 0, 1)
  out = setCell(out, layerId, 2, 0, 1)
  out = setCell(out, layerId, 2, 1, 2)
  return out
}

describe('tilemapToStudioGrid', () => {
  it('gera o texto colável no bloco (linhas por ";", "." = vazio)', () => {
    expect(tilemapToStudioGrid(makeMap())).toBe('0 1 1 .;. . 2 .')
  })

  it('camadas visíveis são achatadas (a de cima vence)', () => {
    let map = makeMap()
    map = addLayer(map, 'topo')
    const top = map.layers[1]
    if (!top) throw new Error('camada esperada')
    map = setCell(map, top.id, 0, 0, 9)
    expect(tilemapToStudioGrid(map)).toBe('9 1 1 .;. . 2 .')
  })
})

describe('tilesetSolidList', () => {
  it('lista os índices sólidos no formato do bloco', () => {
    let tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    tileset = addTile(tileset, 0)
    tileset = addTile(tileset, 1)
    tileset = cycleCollision(tileset, 1)
    tileset = cycleCollision(tileset, 2)
    expect(tilesetSolidList(tileset)).toBe('1, 2')
  })
})

describe('tilesetPlatformList', () => {
  it('lista só os índices PLATAFORMA (ciclo 2× = plataforma); sólidos ficam fora', () => {
    let tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    tileset = addTile(tileset, 0)
    tileset = addTile(tileset, 1)
    tileset = cycleCollision(tileset, 0) // sólido
    tileset = cycleCollision(cycleCollision(tileset, 2), 2) // plataforma
    expect(tilesetSolidList(tileset)).toBe('0')
    expect(tilesetPlatformList(tileset)).toBe('2')
  })

  it('nenhuma plataforma = string vazia', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    expect(tilesetPlatformList(tileset)).toBe('')
  })
})

describe('GUARDA de compatibilidade com o parseGrid/parseSolidList do runtime', () => {
  // Reimplementação FIEL de packages/studio/src/official-extensions/game-2d/
  // runtime.ts (tokenização na mão, sem regex — ver comentário lá).
  function parseGrid(text: string): number[][] {
    const rows: number[][] = []
    let row: number[] = []
    let token = ''
    const pushToken = () => {
      if (token === '') return
      if (token === '.' || token === '-') row.push(-1)
      else {
        const n = Number.parseInt(token, 10)
        row.push(Number.isNaN(n) ? -1 : n)
      }
      token = ''
    }
    const pushRow = () => {
      pushToken()
      if (row.length > 0) rows.push(row)
      row = []
    }
    for (let i = 0; i < text.length; i += 1) {
      const ch = text.charAt(i)
      const code = text.charCodeAt(i)
      if (ch === ';' || code === 10 || code === 13) pushRow()
      else if (code === 32 || code === 9 || ch === ',') pushToken()
      else token += ch
    }
    pushRow()
    return rows
  }

  function parseSolidList(text: string): number[] {
    const out: number[] = []
    let token = ''
    const flush = () => {
      if (token === '') return
      const n = Number.parseInt(token, 10)
      if (!Number.isNaN(n)) out.push(n)
      token = ''
    }
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i)
      if (code === 32 || code === 9 || code === 10 || code === 13 || code === 44 || code === 59) {
        flush()
      } else {
        token += text.charAt(i)
      }
    }
    flush()
    return out
  }

  it('a grade exportada round-trippa pelo parser do runtime', () => {
    const map = makeMap()
    const parsed = parseGrid(tilemapToStudioGrid(map))
    expect(parsed).toEqual([
      [0, 1, 1, -1],
      [-1, -1, 2, -1],
    ])
  })

  it('a lista de sólidos round-trippa pelo parser do runtime', () => {
    let tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    tileset = addTile(tileset, 0)
    tileset = cycleCollision(tileset, 0)
    tileset = cycleCollision(tileset, 1)
    expect(parseSolidList(tilesetSolidList(tileset))).toEqual([0, 1])
  })

  it('o índice do tile no ARRAY é o índice row-major na folha (conta do drawFrame)', () => {
    let tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    for (let i = 0; i < 9; i += 1) tileset = addTile(tileset, i)
    const pack = packTileset(tileset)
    expect(pack.columns).toBe(8)
    const sheetW = pack.columns * pack.tileSize
    const cols = Math.max(1, Math.floor(sheetW / pack.tileSize))
    pack.cells.forEach((cell, index) => {
      const sx = (index % cols) * pack.tileSize
      const sy = Math.floor(index / cols) * pack.tileSize
      expect(cell.col * pack.tileSize).toBe(sx)
      expect(cell.row * pack.tileSize).toBe(sy)
    })
  })
})

describe('tilemapExportJson', () => {
  it('carrega grade + sólidos + camadas', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const parsed = JSON.parse(tilemapExportJson(makeMap(), tileset))
    expect(parsed.tileSize).toBe(16)
    expect(parsed.grid).toBe('0 1 1 .;. . 2 .')
    expect(parsed.layers).toHaveLength(1)
    expect(parsed.layers[0].cells).toHaveLength(8)
  })
})
