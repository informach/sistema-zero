import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const version = '314.0.7'
export const runtimeDirectory = resolve(import.meta.dir, '../../.cache/studio-python-l0/runtime')
export const runtimeFiles = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
] as const

interface RuntimeManifest {
  version: string
  files: { path: string; bytes: number; sha256: string }[]
}

export async function prepareRuntime() {
  await mkdir(runtimeDirectory, { recursive: true })
  const manifestPath = resolve(import.meta.dir, 'runtime-manifest.json')
  const manifestFile = Bun.file(manifestPath)
  const prior: RuntimeManifest | undefined = (await manifestFile.exists())
    ? await manifestFile.json()
    : undefined
  if (prior && prior.version !== version)
    throw new Error('Runtime version differs from pinned manifest')
  const files: RuntimeManifest['files'] = []
  for (const name of runtimeFiles) {
    const target = resolve(runtimeDirectory, name)
    const local = Bun.file(target)
    let bytes: Uint8Array
    if (await local.exists()) bytes = new Uint8Array(await readFile(target))
    else {
      const response = await fetch(`https://cdn.jsdelivr.net/pyodide/v${version}/full/${name}`)
      if (!response.ok) throw new Error(`Runtime download ${name}: HTTP ${response.status}`)
      bytes = new Uint8Array(await response.arrayBuffer())
    }
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const expected = prior?.files.find((file) => file.path === name)
    if (prior && (!expected || expected.sha256 !== sha256 || expected.bytes !== bytes.byteLength)) {
      throw new Error(`Integrity mismatch: ${name}`)
    }
    if (!(await local.exists())) await writeFile(target, bytes)
    files.push({ path: name, bytes: bytes.byteLength, sha256 })
    console.log(`${name}: ${bytes.byteLength} bytes ${sha256}`)
  }
  if (!prior) await writeFile(manifestPath, `${JSON.stringify({ version, files }, null, 2)}\n`)
  return { version, files }
}

if (import.meta.main) await prepareRuntime()
