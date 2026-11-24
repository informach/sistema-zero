import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: import.meta.dir,
  encoding: 'utf8',
  windowsHide: true,
}).trim()
const source = 'packages/core/src/creations/pinta-regions.ts'
const read = (ref: string) =>
  execFileSync('git', ['show', `${ref}:${source}`], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  })
const refs = [process.argv[2] ?? '57dd5ee14', process.argv[3] ?? 'HEAD']
await mkdir(join(root, '.cache'), { recursive: true })
const directory = await mkdtemp(join(root, '.cache', 'pinta-codec-benchmark-'))
const files = [join(directory, 'before.ts'), join(directory, 'after.ts')]
try {
  for (let i = 0; i < 2; i++) await writeFile(files[i]!, read(refs[i]!))
  const before = await import(pathToFileURL(files[0]!).href)
  const after = await import(pathToFileURL(files[1]!).href)
  const chunks = Array.from({ length: 2048 }, (_, i) => ({
    col: (i % 64) - 2,
    row: Math.floor(i / 64) - 2,
    cells: Int16Array.from({ length: 1024 }, (_, j) => ((i * 1024 + j) % 32769) - 1),
  }))
  const grid = [{ kind: 'regions', version: 1, side: 32, chunks }]
  const bounds = { col: -64, row: -64, cols: 10000, rows: 10000 }
  const oldBytes = JSON.stringify(before.encodePintaRegionLayers(grid, bounds))
  const newBytes = JSON.stringify(after.encodePintaRegionLayers(grid, bounds))
  if (oldBytes !== newBytes || oldBytes === 'null') throw Error('A representação JSON mudou.')
  const run = (encode: typeof before.encodePintaRegionLayers) => {
    const start = performance.now()
    if (!encode(grid, bounds)) throw Error('O encoder recusou a amostra.')
    return performance.now() - start
  }
  for (let i = 0; i < 3; i++) {
    run(before.encodePintaRegionLayers)
    run(after.encodePintaRegionLayers)
  }
  const a: number[] = []
  const b: number[] = []
  for (let i = 0; i < 10; i++) {
    a.push(run(before.encodePintaRegionLayers))
    b.push(run(after.encodePintaRegionLayers))
    b.push(run(after.encodePintaRegionLayers))
    a.push(run(before.encodePintaRegionLayers))
  }
  const stats = (samples: number[]) => {
    const sorted = [...samples].sort((x, y) => x - y)
    const percentile = (q: number) => {
      const index = (sorted.length - 1) * q
      const lower = Math.floor(index)
      return sorted[lower]! + (sorted[Math.ceil(index)]! - sorted[lower]!) * (index - lower)
    }
    return { p50: percentile(0.5), p95: percentile(0.95), samples }
  }
  console.log(
    JSON.stringify({
      refs,
      bun: Bun.version,
      chunks: chunks.length,
      cells: chunks.length * 1024,
      wireBytes: oldBytes.length,
      wireSha256: createHash('sha256').update(oldBytes).digest('hex'),
      before: stats(a),
      after: stats(b),
    }),
  )
} finally {
  for (const file of files) await unlink(file).catch(() => {})
  await rmdir(directory)
}
