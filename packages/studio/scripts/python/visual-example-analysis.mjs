// QA syntax service only: the example is parsed/compiled, never imported or executed.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'
import { canonicalJson } from '../../../core/src/creations/content-fingerprint.ts'

assert.equal(process.versions.node.split('.')[0], '24', 'Node 24 is required')
assert.equal(process.argv.length, 4, 'Expected distribution directory and SHA-256')
const distribution = resolve(process.argv[2])
const expected = process.argv[3]
assert.match(expected, /^[a-f0-9]{64}$/)
const digest = (value) => createHash('sha256').update(value).digest('hex')
const manifest = JSON.parse(await readFile(resolve(distribution, 'distribution.json'), 'utf8'))
assert.equal(digest(canonicalJson(manifest)), expected, 'Distribution manifest pin mismatch')
assert.equal(manifest.pythonVersion, '3.14.2')
assert.equal(manifest.pyodideVersion, '314.0.7')
assert.ok(manifest.files.length > 0 && manifest.files.length <= 200)
const paths = new Set()
for (const file of manifest.files) {
  assert.match(file.path, /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/)
  assert.ok(!file.path.split('/').some((part) => part === '.' || part === '..'))
  assert.ok(!paths.has(file.path), 'Duplicate distribution path')
  paths.add(file.path)
  const bytes = await readFile(resolve(distribution, file.path))
  assert.equal(bytes.length, file.bytes, `Distribution size mismatch: ${file.path}`)
  assert.equal(digest(bytes), file.sha256, `Distribution file pin mismatch: ${file.path}`)
}
for (const required of ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip'])
  assert.ok(paths.has(required), 'Required interpreter file missing')
const { loadPyodide } = await import(pathToFileURL(resolve(distribution, 'pyodide.mjs')).href)
const runtime = await loadPyodide({
  indexURL: distribution + sep,
  stdout() {
    throw new Error('Unexpected analyzer stdout')
  },
  stderr() {
    throw new Error('Unexpected analyzer stderr')
  },
})
assert.equal(runtime.version, manifest.pyodideVersion)
assert.equal(
  runtime.runPython('import platform; platform.python_version()'),
  manifest.pythonVersion,
)
const analyzer = await readFile(
  resolve(import.meta.dirname, '../../src/python/language/analyzer.py'),
  'utf8',
)
const limits = await readFile(
  resolve(import.meta.dirname, '../../src/python/language/limits.json'),
  'utf8',
)
const factory = runtime.runPython(analyzer)
const service = factory(limits)
factory.destroy()
const request = service.request
const input = createInterface({ input: process.stdin })
try {
  for await (const line of input) {
    assert.ok(Buffer.byteLength(line) <= JSON.parse(limits).requestBytes)
    const result = request(line)
    assert.equal(typeof result, 'string')
    process.stdout.write(`${result}\n`)
  }
} finally {
  request.destroy()
  service.destroy()
  input.close()
}
