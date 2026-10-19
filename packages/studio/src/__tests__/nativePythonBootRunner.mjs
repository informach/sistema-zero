import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

assert.equal(
  process.versions.bun,
  undefined,
  'Native stream tests require actual Node, not Bun compatibility APIs',
)
assert.equal(
  Number(process.versions.node.split('.')[0]),
  24,
  'Native stream tests require the CI Node24 toolchain',
)
const suite = process.argv[2]
assert(['web-files', 'reader-ownership'].includes(suite), 'Explicit native suite required')
const require = createRequire(import.meta.url)
const esbuild = require('esbuild')
const temporaryRoot = resolve(tmpdir())
const directory = resolve(process.argv[3] ?? '')
assert.equal(dirname(directory), temporaryRoot, 'Parent-owned temporary directory required')
assert(
  /^studio-native-python-[\w-]+$/.test(basename(directory)),
  'Owned native fixture directory required',
)
// The Bun parent owns/removes this directory even if this process must be terminated.
const output = join(directory, 'nativeBoot.mjs')
// A fresh Node process builds the actual source, outside Bun's shared mock/resolver registry.
await esbuild.build({
  entryPoints: [
    fileURLToPath(new URL('../runtime/python/__tests__/nativeBoot.cases.ts', import.meta.url)),
  ],
  outfile: output,
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  logLevel: 'silent',
})
const { runNativePythonBootCases } = await import(pathToFileURL(output).href)
await runNativePythonBootCases(suite)
