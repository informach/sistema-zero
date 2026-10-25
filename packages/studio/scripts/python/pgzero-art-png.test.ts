import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { inflateSync } from 'node:zlib'
import { png } from './pgzero-art'

async function probe(command: string[]) {
  const child = Bun.spawn(command, { stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const deadline = setTimeout(() => child.kill(), 5_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(exit, stderr).toBe(0)
    return JSON.parse(stdout) as { bytes: number; sha256: string }
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
    await child.exited
  }
}

test('PNG generation has identical bytes in real Node and Bun processes', async () => {
  const temporaryRoot = path.resolve(tmpdir())
  const directory = await mkdtemp(path.join(temporaryRoot, 'sz-pgzero-png-'))
  if (
    path.dirname(path.resolve(directory)) !== temporaryRoot ||
    !path.basename(directory).startsWith('sz-pgzero-png-')
  )
    throw new Error('PNG test output is outside its owned temporary directory')
  try {
    const fixture = path.join(import.meta.dirname, 'fixtures/pgzero-png-probe.ts')
    const build = await Bun.build({
      entrypoints: [fixture],
      outdir: directory,
      naming: 'probe.mjs',
      target: 'node',
      format: 'esm',
    })
    expect(build.success, JSON.stringify(build.logs)).toBe(true)
    const node = Bun.which('node')
    if (!node) throw new Error('The PNG portability proof requires Node as well as Bun')
    const bunResult = await probe([process.execPath, fixture])
    const nodeResult = await probe([node, path.join(directory, 'probe.mjs')])
    expect(bunResult).toEqual(nodeResult)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 15_000)

test('PNG compression preserves every RGBA byte and transparent pixel', () => {
  const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 0, 0, 0, 255, 127, 17, 23, 41, 255])
  const encoded = png(2, 2, rgba)
  expect([...encoded.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength)
  expect(view.getUint32(16)).toBe(2)
  expect(view.getUint32(20)).toBe(2)
  const idat = encoded.findIndex(
    (_, index) => String.fromCharCode(...encoded.subarray(index, index + 4)) === 'IDAT',
  )
  expect(idat).toBeGreaterThan(0)
  const length = view.getUint32(idat - 4)
  const raw = inflateSync(encoded.subarray(idat + 4, idat + 4 + length))
  expect([...raw]).toEqual([0, ...rgba.subarray(0, 8), 0, ...rgba.subarray(8)])
})
