import { expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import {
  createRegionCellReader,
  encodePintaRegionLayers,
  type PintaRegionBounds,
  type PintaRegionCells,
  parsePintaRegionLayers,
} from '@sistemazero/core/creations'
import { pythonSceneRegions } from './pythonSceneRegions'

const python = [process.env.PYTHON, 'python3', 'python'].find(
  (name) => name && spawnSync(name, ['-I', '-c', 'import array, base64, json']).status === 0,
)
function run(body: string, input: unknown): unknown {
  const result = spawnSync(python!, ['-I', '-c', `import json\n${pythonSceneRegions}\n${body}`], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
  })
  expect(result.status, result.stderr || result.error?.message).toBe(0)
  return JSON.parse(result.stdout)
}
const bounds: PintaRegionBounds = { col: -33, row: -33, cols: 99, rows: 99 }
function fixture(seed: number) {
  const chunks: PintaRegionCells['chunks'] = []
  for (const [col, row] of [
    [-2, -2],
    [1, 0],
    [0, 0],
    [-1, 1],
    [1, -1],
  ]) {
    const cells = new Int16Array(1024).fill(-1)
    for (let n = 0; n < 1024; n++) {
      const x = col! * 32 + (n % 32),
        y = row! * 32 + Math.floor(n / 32)
      if (x >= -33 && y >= -33 && x < 66 && y < 66 && (n + seed) % 11 === 0)
        cells[n] = ((n + seed) % 256) | ((seed % 8) << 12)
    }
    // The corner chunk has exactly one admissible cell.
    if (col === -2 && row === -2) cells[1023] = seed % 256
    chunks.push({ col: col!, row: row!, cells })
  }
  return encodePintaRegionLayers([{ kind: 'regions', version: 1, side: 32, chunks }], bounds)!
}
const inspect = `
results = []
for f in json.load(sys.stdin):
    plan = preparar_regioes(f['grids'], f['bounds'])
    grids = None if plan is None else plan.decode()
    results.append(None if grids is None else [list(grid.occupied(f['bounds'], True)) for grid in grids])
print(json.dumps(results))
`

it.skipIf(!python)(
  'the shared Python wire decoder matches Core for negative, partial and flagged chunks',
  () => {
    const fixtures = Array.from({ length: 32 }, (_, seed) => ({ grids: fixture(seed), bounds }))
    expect(run(inspect, fixtures)).toEqual(
      fixtures.map((f) => {
        const decoded = parsePintaRegionLayers(f.grids, f.bounds)!
        return decoded.map((grid) => {
          const cells: number[][] = []
          createRegionCellReader(grid).visitOccupied(
            f.bounds,
            (cell, col, row) => cells.push([cell, col, row]),
            'row-major',
          )
          return cells
        })
      }),
    )
  },
)

it.skipIf(!python)('malformed headers and payloads are refused rather than normalized', () => {
  type Case = { grids: unknown; bounds: unknown }
  const original = { grids: fixture(5), bounds }
  const cases: Case[] = [
    original,
    { grids: [], bounds },
    { grids: [{ ...original.grids[0], chunks: [] }], bounds },
  ]
  const add = (mutate: (copy: typeof original) => void) => {
    const copy = structuredClone(original)
    mutate(copy)
    cases.push(copy)
  }
  for (const patch of [
    { version: 2 },
    { version: true },
    { side: 16 },
    { side: true },
    { kind: 'tiles' },
    { encoding: 'future' },
    { unknown: 1 },
    { chunks: null },
  ])
    add((f) => Object.assign(f.grids[0]!, patch))
  add((f) => {
    f.grids[0]!.chunks.push(structuredClone(f.grids[0]!.chunks[0]!))
  })
  for (const patch of [
    { col: 1000 },
    { row: 0.5 },
    { col: true },
    { unknown: 0 },
    { data: null },
    { data: 'A'.repeat(2732) },
    { data: 'x' },
  ])
    add((f) => Object.assign(f.grids[0]!.chunks[0]!, patch))
  for (const patch of [
    { col: -10001 },
    { row: true },
    { cols: 10001 },
    { cols: 0 },
    { rows: 1.5 },
    { col: 9999 },
    { unknown: 0 },
  ])
    add((f) => Object.assign(f.bounds, patch))
  for (const bad of [null, true, 12, 'regions']) {
    cases.push({ grids: bad, bounds }, { grids: original.grids, bounds: bad })
  }
  cases.push({ grids: original.grids, bounds: [] })
  for (const type of ['empty', 'negative', 'outside', 'padding', 'whitespace'])
    add((f) => {
      const chunk = f.grids[0]!.chunks[0]!
      const bytes = Buffer.from(chunk.data, 'base64')
      if (type === 'empty') bytes.fill(255)
      if (type === 'negative') bytes.writeInt16LE(-2, 2046)
      if (type === 'outside') bytes.writeInt16LE(0, 0)
      chunk.data = bytes.toString('base64')
      if (type === 'padding') {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        const at = chunk.data.length - 2
        chunk.data = `${chunk.data.slice(0, at)}${alphabet[alphabet.indexOf(chunk.data[at]!) + 1]}=`
      }
      if (type === 'whitespace') chunk.data = `${chunk.data.slice(0, 10)}\n${chunk.data.slice(11)}`
    })
  const actual = run(inspect, cases) as unknown[]
  const expected = cases.map((f) => parsePintaRegionLayers(f.grids, f.bounds) !== null)
  expect(actual.map((result) => result !== null)).toEqual(expected)
  expect(expected.flatMap((accepted, index) => (accepted ? [index] : []))).toEqual([0, 1, 2])
})

it.skipIf(!python)(
  'indexed access and both traversal orders match Core for clipped windows',
  () => {
    const grids = fixture(7),
      decoded = parsePintaRegionLayers(grids, bounds)![0]!
    const reader = createRegionCellReader(decoded)
    const rects = [
      bounds,
      { ...bounds, label: 'viewport with metadata' },
      { col: -1, row: -1, cols: 34, rows: 36 },
      { col: 3, row: 6, cols: 1, rows: 1 },
      { col: 4000, row: 4000, cols: 1000, rows: 1000 },
    ]
    const points = Array.from({ length: 512 }, (_, n) => [
      ((n * 29) % 150) - 70,
      ((n * 17) % 150) - 70,
    ])
    points.push([-32, -32], [-33, -33], [0, 0], [1.5, 0])
    const actual = run(
      `f=json.load(sys.stdin)
grid=preparar_regioes(f['grids'],f['bounds']).decode()[0]
print(json.dumps({'points':[grid.at(*p) for p in f['points']], 'visits':[[list(grid.occupied(r, order)) for order in (False,True)] for r in f['rects']]}))`,
      { grids, bounds, rects, points },
    )
    expect(actual).toEqual({
      points: points.map(([col, row]) => reader.at(col!, row!)),
      visits: rects.map((rect) =>
        [undefined, 'row-major'].map((order) => {
          const result: number[][] = []
          reader.visitOccupied(
            rect,
            (cell, col, row) => result.push([cell, col, row]),
            order as 'row-major' | undefined,
          )
          return result
        }),
      ),
    })
  },
)

it.skipIf(!python)(
  'all headers and cumulative per-map budget precede the first base64 decode',
  () => {
    const grids = fixture(0)
    const result = run(
      `f=json.load(sys.stdin)
original=base64.b64decode
calls=[]
def watched(*args,**kwargs):
    calls.append(1)
    return original(*args,**kwargs)
base64.b64decode=watched
grid=f['grids'][0]
chunk=grid['chunks'][-1]
layers=[]
for layer in range(_REGION_MAX_LAYERS):
    layers.append(dict(grid,chunks=[dict(chunk,col=col,row=0) for col in range(64)]))
bounds={'col':0,'row':0,'cols':10000,'rows':10000}
exact=preparar_regioes(layers,bounds)
assert exact is not None and exact.index_bytes==4194304
layers[-1]['chunks'].append(dict(chunk,col=64,row=0))
assert preparar_regioes(layers,bounds) is None
assert preparar_regioes([grid]*33,f['bounds']) is None
assert preparar_regioes([grid,dict(grid,chunks=[dict(chunk,col=1000)])],f['bounds']) is None
assert calls==[]
control=preparar_regioes(f['grids'],f['bounds'])
assert control.decode() is not None and len(calls)==5
print(json.dumps({'headers':True,'indexBytes':exact.index_bytes,'decodedControl':len(calls)}))`,
      { grids, bounds },
    )
    expect(result).toEqual({ headers: true, indexBytes: 4_194_304, decodedControl: 5 })
  },
)

it.skipIf(!python)('plans capture payloads and permit one atomic decoding attempt', () => {
  const result = run(
    `f=json.load(sys.stdin)
plan=preparar_regioes(f['grids'],f['bounds'])
f['grids'][0]['chunks'][0]['data']='broken'
f['grids'][0]['chunks'].clear()
f['bounds']['cols']=1
grids=plan.decode()
assert grids is not None and grids[0].at(-33,-33)==3
assert plan.decode() is None
assert list(grids[0].occupied({'col':-33,'row':-33,'cols':1,'rows':1}))==[(3,-33,-33)]
bad=preparar_regioes([{'kind':'regions','version':1,'side':32,'encoding':'i16le-base64-v1','chunks':[{'col':0,'row':0,'data':'broken'}]}],{'col':0,'row':0,'cols':1,'rows':1})
assert bad is not None and bad.decode() is None and bad.decode() is None
print(json.dumps({'captured':True,'singleAttempt':True}))`,
    { grids: fixture(3), bounds },
  )
  expect(result).toEqual({ captured: true, singleAttempt: true })
})

it.skipIf(!python)('a 10000-square world retains only its stored i16 chunks', () => {
  const b = { col: -5000, row: -5000, cols: 10000, rows: 10000 }
  const chunks = [
    [-156, -156],
    [155, 155],
  ].map(([col, row]) => {
    const cells = new Int16Array(1024).fill(-1)
    cells[0] = 2
    return { col: col!, row: row!, cells }
  })
  const grids = encodePintaRegionLayers([{ kind: 'regions', version: 1, side: 32, chunks }], b)!
  expect(
    run(
      `f=json.load(sys.stdin)
import tracemalloc
tracemalloc.start()
plan=preparar_regioes(f['grids'],f['bounds'])
grid=plan.decode()[0]
cells=list(grid.occupied(f['bounds'],True))
current,peak=tracemalloc.get_traced_memory()
assert peak<262144,(current,peak)
print(json.dumps({'indexBytes':plan.index_bytes,'cells':cells,'under256KiB':True}))`,
      { grids, bounds: b },
    ),
  ).toEqual({
    indexBytes: 4096,
    cells: [
      [2, -4992, -4992],
      [2, 4960, 4960],
    ],
    under256KiB: true,
  })
})
