// Trusted build process only. Never accepts project sources or executes learner programs.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const directory = dirname(fileURLToPath(import.meta.url))
assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'The Python build requires Node 24+')
// This build uses synchronous runPython only; interactive browser execution has
// a separate JSPI gate. Node 24.15 can compile this archive without JSPI enabled.
assert.equal(process.argv.length, 4, 'Expected vendor directory and owned output file')
const vendorDirectory = resolve(process.argv[2])
const output = resolve(process.argv[3])
const manifest = JSON.parse(await readFile(resolve(directory, 'stdlib-manifest.json'), 'utf8'))
const vendor = JSON.parse(
  await readFile(resolve(directory, '../../src/runtime/python/vendor-manifest.json'), 'utf8'),
)
assert.equal(vendor.pyodideVersion, manifest.pyodideVersion)
assert.equal(vendor.pythonVersion, manifest.pythonVersion)
assert.equal(
  vendor.files.find((file) => file.path === 'python_stdlib.zip')?.sha256,
  manifest.sourceSha256,
)
// Hash checks precede importing vendor JavaScript, not just running the Python recipe.
for (const file of vendor.files) {
  assert.equal(
    resolve(vendorDirectory, file.path),
    resolve(vendorDirectory, file.path.split('/').at(-1)),
  )
  assert.notEqual(
    output,
    resolve(vendorDirectory, file.path),
    'Output must not overwrite vendor files',
  )
  const bytes = await readFile(resolve(vendorDirectory, file.path))
  assert.equal(bytes.length, file.bytes, `Invalid size: ${file.path}`)
  assert.equal(digest(bytes), file.sha256, `Invalid checksum: ${file.path}`)
}
// Git checkouts may use CRLF. The reviewed recipe pin refers to UTF-8 with LF.
const recipe = (await readFile(resolve(directory, 'precompile-stdlib.py'), 'utf8')).replace(
  /\r\n/g,
  '\n',
)
assert.equal(digest(recipe), manifest.recipeSha256, 'Invalid compilation recipe')
const { loadPyodide } = await import(pathToFileURL(resolve(vendorDirectory, 'pyodide.mjs')).href)
const lines = []
let stdoutBytes = 0
const interpreter = await loadPyodide({
  indexURL: vendorDirectory + sep,
  stdout: (line) => {
    stdoutBytes += Buffer.byteLength(line)
    assert.ok(stdoutBytes <= 16384, 'Unexpected compiler output')
    lines.push(line)
  },
  stderr: (line) => console.error(line),
})
assert.equal(interpreter.version, manifest.pyodideVersion)
interpreter.FS.writeFile(
  '/source.zip',
  await readFile(resolve(vendorDirectory, 'python_stdlib.zip')),
)
interpreter.FS.writeFile('/recipe.py', new TextEncoder().encode(recipe))
interpreter.runPython(
  "import sys, runpy; sys.argv = ['recipe.py', '/source.zip', '/compiled.zip']; runpy.run_path('/recipe.py', run_name='__main__')",
)
assert.equal(lines.length, 1, 'Expected one compiler receipt')
const receipt = JSON.parse(lines[0])
for (const key of [
  'recipe',
  'pythonVersion',
  'magic',
  'sourceSha256',
  'compiledModules',
  'bytes',
  'sha256',
])
  assert.equal(receipt[key], manifest[key], `Invalid compiler receipt: ${key}`)
assert.equal(receipt.sourcesPreserved, true)
const bytes = interpreter.FS.readFile('/compiled.zip')
assert.equal(bytes.length, manifest.bytes)
assert.equal(digest(bytes), manifest.sha256, 'The compiled library differs from its reviewed pin')
await writeFile(output, bytes, { flag: 'wx' })
// No physical machine paths enter the receipt or the runtime distribution.
delete receipt.path
console.log(JSON.stringify(receipt))
