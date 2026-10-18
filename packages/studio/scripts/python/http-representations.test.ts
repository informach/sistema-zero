import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { createPythonHTTPRepresentations } from './http-representations'

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

test('gzip packaging is deterministic, preserves original modules and executes identical decoded ESM', async () => {
  const source = `export const values = ${JSON.stringify(Array.from({ length: 1000 }, (_, i) => i % 17))};\n`
  const bytes = new TextEncoder().encode(source)
  const contents = new Map([
    ['frame.mjs', bytes],
    ['small.mjs', new TextEncoder().encode('export const value = 1;')],
    ['python_stdlib.zip', bytes],
    ['pyodide.asm.wasm', bytes],
    ['turtle/turtle.py', bytes],
  ])
  const first = createPythonHTTPRepresentations(contents)
  const second = createPythonHTTPRepresentations(contents)
  expect(first.representations).toEqual(second.representations)
  expect([...first.files]).toEqual([...second.files])
  expect(first.representations).toHaveLength(1)
  const representation = first.representations[0]!
  expect(representation).toMatchObject({ path: 'frame.mjs', encoding: 'gzip' })
  const gzip = first.files.get(representation.artifactPath)!
  expect(representation.artifactPath).toBe(`_http/gzip/${hash(gzip)}.gz`)
  expect(gzip.byteLength).toBeLessThan(bytes.byteLength)
  expect([...gzip.slice(4, 8)]).toEqual([0, 0, 0, 0])
  const decoded = new Uint8Array(gunzipSync(gzip))
  expect(decoded).toEqual(bytes)
  expect(hash(decoded)).toBe(hash(bytes))
  expect(contents.size).toBe(5)
  expect(contents.get('frame.mjs')).toBe(bytes)
  expect(new TextDecoder().decode(contents.get('frame.mjs'))).toBe(source)
  const directory = await mkdtemp(join(tmpdir(), 'sz-python-http-'))
  const originalPath = join(directory, 'original.mjs')
  const transportedPath = join(directory, 'transported.mjs')
  try {
    await writeFile(originalPath, bytes)
    await writeFile(transportedPath, decoded)
    const original = await import(pathToFileURL(originalPath).href)
    const transported = await import(pathToFileURL(transportedPath).href)
    expect(transported.values).toEqual(original.values)
  } finally {
    await unlink(originalPath)
    await unlink(transportedPath)
    await rmdir(directory)
  }
})

test('does not grow incompressible artifacts or accept existing reserved transport paths', () => {
  let state = 123456789
  const noise = Uint8Array.from({ length: 4096 }, () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return state & 255
  })
  const result = createPythonHTTPRepresentations(new Map([['noise.mjs', noise]]))
  expect(result.files.size).toBe(0)
  expect(result.representations).toEqual([])
  expect(() =>
    createPythonHTTPRepresentations(new Map([['_http/gzip/occupied.gz', noise]])),
  ).toThrow('reservado')
})
