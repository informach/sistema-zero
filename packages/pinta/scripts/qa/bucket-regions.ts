/** Run alone: bun packages/pinta/scripts/qa/bucket-regions.ts [unique-output-label] */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createTilemapAsset } from '../../src/core/project'
import { floodFillCells, tileLayerById } from '../../src/tiles/tilemapOps'

const root = resolve(import.meta.dir, '../../../..')
const label = process.argv[2] ?? String(Date.now())
assert(
  /^[a-z0-9-]+$/.test(label),
  'Use a unique output label containing letters, digits and dashes',
)
const output = resolve(root, '.cache', `pinta-bucket-${label}`)
assert(!existsSync(output), 'Choose a new output label; existing evidence is never overwritten')
mkdirSync(output, { recursive: true })
const baseline = '59c562ac8ed2fbfa519ab19f80976e0a25fdaadc'
const modulePath = 'packages/pinta/src/tiles/tilemapOps.ts'
const original = execFileSync('git', ['show', `${baseline}:${modulePath}`], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
})
const adapted = original.replace(/from '(\.{1,2}\/[^']+)'/g, (_, specifier: string) => {
  const base = resolve(root, dirname(modulePath), specifier)
  return `from ${JSON.stringify(pathToFileURL(existsSync(`${base}.ts`) ? `${base}.ts` : base).href)}`
})
const baselineModule = resolve(output, 'baseline.ts')
writeFileSync(baselineModule, adapted, { flag: 'wx' })
const previous = await import(pathToFileURL(baselineModule).href)
const samples = []
for (const side of [32, 128, 256]) {
  const map = createTilemapAsset({
    name: 'Bucket benchmark',
    tilesetId: 'tiles',
    cols: side,
    rows: side,
  })
  const id = map.layers[0]!.id
  assert.deepEqual(floodFillCells(map, id, 0, 0, 3), previous.floodFillCells(map, id, 0, 0, 3))
  assert(tileLayerById(map, id)?.cells.every((cell) => cell === -1))
  for (let index = 0; index < 5; index++) {
    previous.floodFillCells(map, id, 0, 0, 3)
    floodFillCells(map, id, 0, 0, 3)
  }
  const oldMs: number[] = [],
    nextMs: number[] = []
  const run = (operation: typeof floodFillCells, times: number[]) => {
    Bun.gc(true)
    const start = performance.now()
    operation(map, id, 0, 0, 3)
    times.push(performance.now() - start)
  }
  for (let index = 0; index < 30; index++) {
    if (index % 2) {
      run(floodFillCells, nextMs)
      run(previous.floodFillCells, oldMs)
    } else {
      run(previous.floodFillCells, oldMs)
      run(floodFillCells, nextMs)
    }
  }
  const stats = (raw: number[]) => {
    const sorted = raw.toSorted((a, b) => a - b)
    return { median: sorted[15], p95: sorted[28], min: sorted[0], max: sorted[29] }
  }
  samples.push({
    side,
    cells: side * side,
    identicalResult: true,
    oldMs,
    nextMs,
    old: stats(oldMs),
    next: stats(nextMs),
  })
}
const report = {
  at: new Date().toISOString(),
  runtime: Bun.version,
  baseline,
  scope: 'isolated pure dense bucket; no browser, FPS or peak-memory claim',
  rounds: 30,
  warmups: 5,
  samples,
}
writeFileSync(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, {
  flag: 'wx',
})
console.log(
  JSON.stringify({ output, results: samples.map(({ side, old, next }) => ({ side, old, next })) }),
)
