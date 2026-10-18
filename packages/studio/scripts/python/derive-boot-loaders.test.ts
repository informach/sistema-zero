import { expect, test } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { derivePythonBootLoaders } from './derive-boot-loaders'

test('lexical derivation is deterministic, shares its private reader and preserves native and shadowed fetch', async () => {
  const root = resolve(
    import.meta.dirname,
    '../../../../.cache/studio-python-l0/boot-loader-derivation',
    crypto.randomUUID(),
  )
  const source = new TextEncoder().encode(`
export function read() { return fetch('public-resource'); }
export function shadowed() { const fetch = () => 'local'; return fetch(); }
export function native() { return globalThis.fetch; }
`)
  const inputs = new Map(['pyodide.mjs', 'pyodide.asm.mjs'].map((name) => [name, source]))
  const reader = new TextEncoder().encode(
    'export async function resourceFetch(value) { return value; }\n',
  )
  const first = await derivePythonBootLoaders({ inputs, reader, temporaryRoot: resolve(root, 'a') })
  const second = await derivePythonBootLoaders({
    inputs,
    reader,
    temporaryRoot: resolve(root, 'b'),
  })
  expect(first.provenance).toEqual(second.provenance)
  const output = resolve(root, 'actual-modules')
  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, 'boot-reader.mjs'), reader)
  const nativeFetch = globalThis.fetch
  for (const [name, bytes] of first.files) {
    const repeated = second.files.get(name),
      original = inputs.get(name)
    if (!repeated || !original) throw new Error('Missing derivation input or repeated output')
    expect(bytes).toEqual(repeated)
    expect(original).toEqual(source)
    await writeFile(resolve(output, name), bytes)
    const module = await import(pathToFileURL(resolve(output, name)).href)
    expect(await module.read()).toBe('public-resource')
    expect(module.shadowed()).toBe('local')
    expect(module.native()).toBe(nativeFetch)
    expect(globalThis.fetch).toBe(nativeFetch)
  }
})
