import { cpus } from 'node:os'
import { type ObjDocument, readObjDocument } from '../src/import/objDocument'

// Includes the reviewed objectLine identity; rechecked on both sides of the lexer optimization.
const goldens: Record<string, string> = {
  triangle: '0b69a30cb8e6eb1f97d56d3d94b1471697c9ce34de720368ca85695b9ed75307',
  'comments-1MiB': 'ea789410e53ae8fe393353cf86a7684f6e8621f648a9ab04267fa7a2cee3f1b1',
  'mesh-16k': '791580d14543e65d0f9e5ae47bf5d0fc62506abc015de70e18b8762ea6d598e0',
}
const record = Bun.argv.includes('--record-goldens')
function digest(source: ObjDocument) {
  const hash = new Bun.CryptoHasher('sha256')
  hash.update(
    JSON.stringify({
      elements: source.elements,
      states: source.states,
      libraries: source.libraries,
    }),
  )
  for (const data of [source.positions, source.texcoords, source.normals, source.corners])
    hash.update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return hash.digest('hex')
}
function mesh() {
  const lines: string[] = []
  for (let i = 0; i < 16_384; i++)
    lines.push(`v ${i % 32} ${Math.floor(i / 32) % 32} ${Math.floor(i / 1024)}`)
  for (let i = 1; i < 16_382; i += 3) lines.push(`f ${i} ${i + 1} ${i + 2}`)
  return `${lines.join('\n')}\n`
}
const cases = [
  { name: 'triangle', text: 'v 0 0 0\nv 2 0 0\nv 0 3 0\nf 1 2 3\n' },
  { name: 'comments-1MiB', text: `#${'x'.repeat(65_534)}\n`.repeat(16) },
  { name: 'mesh-16k', text: mesh() },
]
console.log(
  JSON.stringify({
    bun: process.versions.bun,
    cpu: cpus()[0]?.model,
    platform: process.platform,
    warmup: 3,
    samples: 10,
  }),
)
for (const fixture of cases) {
  const input = new TextEncoder().encode(fixture.text),
    before = input.slice(),
    times: number[] = []
  let sha256 = '',
    sampledRssBytes = 0
  for (let run = 0; run < 13; run++) {
    Bun.gc(true)
    const start = performance.now(),
      source = readObjDocument(input),
      done = performance.now()
    if (run >= 3) times.push(done - start)
    const hash = digest(source)
    if ((!record && hash !== goldens[fixture.name]) || (sha256 && hash !== sha256))
      throw new Error('Golden result changed')
    sha256 = hash
    sampledRssBytes = Math.max(sampledRssBytes, process.memoryUsage().rss)
  }
  if (!Bun.deepEquals(input, before)) throw new Error('Source changed')
  times.sort((a, b) => a - b)
  const quantile = (q: number) => Number(times[Math.ceil(times.length * q) - 1]!.toFixed(3))
  console.log(
    JSON.stringify({
      name: fixture.name,
      bytes: input.byteLength,
      milliseconds: { p50: quantile(0.5), p95: quantile(0.95) },
      sha256,
      sourceUnchanged: true,
      sampledRssBytes,
    }),
  )
}
