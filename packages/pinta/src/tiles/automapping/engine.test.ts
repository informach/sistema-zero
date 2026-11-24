import { expect, test } from 'bun:test'
import { createTilemapAsset, type TilemapAsset, type TilemapTileLayer } from '../../core/project'
import { CELL_FLIP_H, makeCell } from '../cell'
import { expandRegionMap, prepareMapRegions } from '../regionMap'
import { cellAt, setCell } from '../tilemapOps'
import { type AutomapBook, readAutomapBook } from './book'
import { captureAutomapExample, previewAutomapping, previewAutomapStroke } from './engine'

const signature = 'a'.repeat(64)
const sheets = new Map([['arte', { sha256: signature, count: 4 }]])
const plane = (layer: string, cells: (number | null)[]) => ({
  layer,
  sheet: 'arte',
  sha256: signature,
  cells,
})
const book: AutomapBook = {
  format: 'pinta-regras',
  version: 1,
  seed: 18,
  rules: [
    {
      id: 'altar',
      name: 'Altar',
      width: 2,
      height: 1,
      input: [plane('chao', [1, 2]), plane('marca', [-1, 0])],
      outputs: [[plane('enfeite', [3, makeCell(2, CELL_FLIP_H)])], [plane('enfeite', [2, 3])]],
    },
    {
      id: 'repetir',
      name: 'Segunda',
      width: 1,
      height: 1,
      input: [plane('enfeite', [3])],
      outputs: [[plane('chao', [0])]],
    },
  ],
}
function fixture() {
  const map = createTilemapAsset({ name: 'mundo', tilesetId: 'arte', cols: 6, rows: 3 })
  const layer = map.layers[0] as TilemapTileLayer
  map.layers = ['chao', 'marca', 'enfeite'].map((id) => ({
    ...layer,
    id,
    name: id,
    cells: new Int16Array(layer.cells),
  }))
  return map
}
test('admite apenas o formato e os tetos conhecidos', () => {
  expect(readAutomapBook(JSON.stringify(book))).toEqual(book)
  for (const patch of [
    { version: 2 },
    { hack: true },
    { seed: 1.2 },
    { rules: Array(65).fill(book.rules[0]) },
    { rules: [{ ...book.rules[0], width: 17 }] },
  ]) {
    expect(readAutomapBook(JSON.stringify({ ...book, ...patch }))).toBeNull()
  }
})
test('duas entradas, vizinho tocado, variante reproduzível e nenhuma cascata em mapa denso ou regional', () => {
  const crop = { col: 1, row: 1, cols: 2, rows: 1 }
  const original = fixture()
  const region = prepareMapRegions(original)
  if (!region.ok) throw Error(region.reason)
  const grown = expandRegionMap(region.map, { col: -40, row: -4, cols: 85, rows: 11 })
  if (!grown.ok) throw Error(grown.reason)
  for (const [start, x] of [
    [original, 1],
    [grown.map, -33],
  ] as const) {
    const paint = (m: typeof start, id: string, col: number, v: number) =>
      'origin' in m ? setCell(m, id, col, 1, v) : setCell(m, id, col, 1, v)
    const map = paint(paint(paint(start, 'chao', x, 1), 'chao', x + 1, 2), 'marca', x + 1, 0)
    const area = { col: x + 1, row: 1, cols: 1, rows: 1 }
    const result = previewAutomapping(map, book, sheets, area, new Set(['marca']))
    if (!result.ok) throw Error(result.reason)
    expect(result.changes).toBe(2)
    expect(result.matches).toBe(1)
    expect(cellAt(result.map, 'chao', x, 1)).toBe(1)
    expect(cellAt(map, 'enfeite', x, 1)).toBe(-1)
    expect(previewAutomapping(map, book, sheets, area)).toMatchObject({
      ok: true,
      map: result.map,
      changes: 2,
      matches: 1,
    })
    expect(captureAutomapExample(map, { ...crop, col: x }, ['chao', 'marca'], sheets)).toEqual(
      book.rules[0]!.input,
    )
    const unrelated = previewAutomapping(map, book, sheets, area, new Set(['outro']))
    expect(unrelated).toMatchObject({ ok: true, map, changes: 0, matches: 0 })
  }
})
test('uma saída trancada ou folha diferente recusa o gesto completo', () => {
  let m = fixture()
  m = setCell(setCell(setCell(m, 'chao', 1, 1, 1), 'chao', 2, 1, 2), 'marca', 2, 1, 0)
  const area = { col: 2, row: 1, cols: 1, rows: 1 }
  const locked: TilemapAsset = {
    ...m,
    layers: [
      { id: 'grupo', name: 'grupo', kind: 'group', locked: true, visible: true },
      ...m.layers.map((l) => (l.id === 'enfeite' ? { ...l, parentId: 'grupo' } : l)),
    ],
  }
  expect(previewAutomapping(locked, book, sheets, area)).toEqual({ ok: false, reason: 'locked' })
  expect(
    previewAutomapping(m, book, new Map([['arte', { sha256: 'b'.repeat(64), count: 4 }]]), area),
  ).toEqual({ ok: false, reason: 'changed-sheet' })
  expect(
    readAutomapBook(
      JSON.stringify({ ...book, rules: [{ ...book.rules[0], input: [plane('x', [0, 50000])] }] }),
    ),
  ).toBeNull()
})

test('prioridade escolhe um padrão inteiro, até quando as saídas disputam apenas uma casa', () => {
  const base = fixture(),
    area = { col: 0, row: 0, cols: 1, rows: 1 }
  const input = [plane('chao', [-1])]
  const first = {
    id: 'primeira',
    name: 'Primeira',
    width: 1,
    height: 1,
    input,
    outputs: [[plane('marca', [1])]],
  }
  const second = {
    ...first,
    id: 'segunda',
    name: 'Segunda',
    outputs: [[plane('enfeite', [3]), plane('marca', [2])]],
  }
  const a = previewAutomapping(base, { ...book, rules: [first, second] }, sheets, area)
  const b = previewAutomapping(base, { ...book, rules: [second, first] }, sheets, area)
  if (!a.ok || !b.ok) throw Error('priority')
  expect([cellAt(a.map, 'marca', 0, 0), cellAt(a.map, 'enfeite', 0, 0)]).toEqual([1, -1])
  expect([cellAt(b.map, 'marca', 0, 0), cellAt(b.map, 'enfeite', 0, 0)]).toEqual([2, 3])
  expect([a.matches, b.matches]).toEqual([1, 1])
})
test('semente escolhe variação reproduzível e o traço descontínuo só aciona casas realmente editadas', () => {
  const base = fixture()
  const rules = [
    {
      id: 'v',
      name: 'Variação',
      width: 1,
      height: 1,
      input: [plane('chao', [-1])],
      outputs: [[plane('marca', [0])], [plane('marca', [1])], [plane('marca', [2])]],
    },
  ]
  const area = { col: 0, row: 0, cols: 6, rows: 3 }
  const edited = new Set([0, 17])
  const values = new Set<string>()
  for (let seed = 0; seed < 12; seed++) {
    const result = previewAutomapping(
      base,
      { ...book, seed, rules },
      sheets,
      area,
      new Set(['chao']),
      edited,
    )
    if (!result.ok) throw Error(result.reason)
    expect(result.changes).toBe(2)
    expect(cellAt(result.map, 'marca', 2, 1)).toBe(-1)
    values.add([cellAt(result.map, 'marca', 0, 0), cellAt(result.map, 'marca', 5, 2)].join(','))
  }
  expect(values.size).toBeGreaterThan(1)
})
test('tetos de comparações e escritas recusam tudo, incluindo a primeira camada já prevista', () => {
  const base = createTilemapAsset({ name: 'limites', tilesetId: 'arte', cols: 256, rows: 256 })
  const layer = base.layers[0] as TilemapTileLayer
  base.layers = ['chao', 'marca', 'enfeite'].map((id) => ({
    ...layer,
    id,
    name: id,
    cells: layer.cells.slice(),
  }))
  const area = { col: 0, row: 0, cols: 256, rows: 256 }
  const empty = plane('chao', [-1])
  const one = {
    id: 'uma',
    name: 'Uma',
    width: 1,
    height: 1,
    input: [empty],
    outputs: [[plane('marca', [0]), plane('enfeite', [0])]],
  }
  expect(previewAutomapping(base, { ...book, rules: [one] }, sheets, area)).toEqual({
    ok: false,
    reason: 'work-budget',
  })
  const misses = Array.from({ length: 10 }, (_, i) => ({
    ...one,
    id: String(i),
    input: [plane('chao', [2])],
  }))
  expect(previewAutomapping(base, { ...book, rules: misses }, sheets, area)).toEqual({
    ok: false,
    reason: 'work-budget',
  })
  expect(cellAt(base, 'marca', 0, 0)).toBe(-1)
  const noChange = { ...one, outputs: [[plane('chao', [-1]), plane('enfeite', [0])]] }
  const allowed = previewAutomapping(base, { ...book, rules: [noChange] }, sheets, area)
  expect(allowed.ok && allowed.changes).toBe(65536)
})

test('o teto de um gesto inclui a pincelada e desconta a casa que as regras sobrescreveram', () => {
  const base = createTilemapAsset({ name: 'gesto', tilesetId: 'arte', cols: 256, rows: 256 })
  const first = base.layers[0] as TilemapTileLayer
  base.layers = [
    { ...first, id: 'chao' },
    { ...first, id: 'frente', cells: first.cells.slice() },
  ]
  const painted = {
    ...base,
    layers: [{ ...first, id: 'chao', cells: new Int16Array(65536).fill(1) }, base.layers[1]!],
  }
  const source = {
    id: 'm',
    name: 'Marca',
    width: 1,
    height: 1,
    input: [plane('chao', [1])],
    outputs: [[plane('frente', [2])]],
  }
  expect(previewAutomapStroke(base, painted, 'chao', { ...book, rules: [source] }, sheets)).toEqual(
    { ok: false, reason: 'work-budget' },
  )
  const target = { ...source, outputs: [[plane('chao', [2])]] }
  const ok = previewAutomapStroke(base, painted, 'chao', { ...book, rules: [target] }, sheets)
  expect(ok.ok && cellAt(ok.map, 'chao', 255, 255)).toBe(2)
  expect(cellAt(base, 'frente', 255, 255)).toBe(-1)
})

test('o gesto regional visita o chunk tocado em coordenada negativa numa extensão de 100 milhões de casas', () => {
  const region = prepareMapRegions(fixture())
  if (!region.ok) throw Error(region.reason)
  const expanded = expandRegionMap(region.map, { col: -2048, row: -2048, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const source = expanded.map,
    painted = setCell(source, 'chao', -1025, -1025, 0)
  const rule = {
    ...book,
    rules: [
      {
        id: 'r',
        name: 'r',
        width: 1,
        height: 1,
        input: [plane('chao', [0])],
        outputs: [[plane('enfeite', [2])]],
      },
    ],
  }
  const r = previewAutomapStroke(source, painted, 'chao', rule, sheets)
  expect(r.ok && cellAt(r.map, 'enfeite', -1025, -1025)).toBe(2)
  expect(r.ok && r.matches).toBe(1)
  expect(cellAt(source, 'enfeite', -1025, -1025)).toBe(-1)
  expect(r.ok && r.comparisons).toBeLessThan(8)
})
