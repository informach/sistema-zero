import { afterAll, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rmdir, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import {
  parsePythonReproductionCommand,
  runPythonReproductionCommand,
} from '../reproduce-python-runtime'
import {
  assertPinnedBytes,
  expectedPythonDistribution,
  fetchPythonReproductionInputs,
  PYTHON_REPRODUCTION_SHA256,
  reproducePythonDistribution,
  verifyPythonReproduction,
  verifyPythonReproductionInputs,
} from './reproduction'

const directories: string[] = []
const files: string[] = []
async function directory() {
  const path = await mkdtemp(resolve(tmpdir(), 'sz-python-reproduction-'))
  directories.push(path)
  return path
}
async function put(directory: string, name: string, bytes: string | Uint8Array) {
  const path = resolve(directory, name)
  await writeFile(path, bytes)
  if (!files.includes(path)) files.push(path)
}
afterAll(async () => {
  for (const path of files.reverse()) await unlink(path)
  for (const path of directories.reverse()) await rmdir(path)
})

test('import is inert; explicit CLI parsing rejects ambiguous or unknown commands', async () => {
  expect(await runPythonReproductionCommand(['--help'])).toContain('admissão serial')
  expect(parsePythonReproductionCommand(['verify', '--directory', 'artifact'])).toEqual({
    command: 'verify',
    directory: 'artifact',
  })
  for (const args of [
    [],
    ['upload'],
    ['build', '--vendor', 'input'],
    ['build', '--vendor', 'input', '--output', 'out', '--output', 'other'],
    ['verify', '--directory'],
    ['verify', '--directory', 'artifact', '--expected-sha', '0'.repeat(64)],
    ['--help', '--vendor', 'input'],
  ])
    expect(() => parsePythonReproductionCommand(args)).toThrow()
})

test('the committed descriptor is the fixed 41-file current candidate, independent of its build path', async () => {
  const distribution = await expectedPythonDistribution()
  expect(distribution.files).toHaveLength(41)
  expect(PYTHON_REPRODUCTION_SHA256).toBe(
    '476d32e78da6b528730b8b0535ad026f64fe4e61c03f20a195a7438bc56ace2c',
  )
  expect('directory' in distribution).toBe(false)
})

test('pins reject both length changes and same-length tampering', () => {
  const bytes = new TextEncoder().encode('original')
  const pin = {
    path: 'input.mjs',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
  expect(() => assertPinnedBytes(bytes, pin)).not.toThrow()
  expect(() => assertPinnedBytes(bytes.slice(1), pin)).toThrow('Integridade')
  const changed = bytes.slice()
  changed[0] = changed[0]! ^ 1
  expect(() => assertPinnedBytes(changed, pin)).toThrow('Integridade')
  expect(() => assertPinnedBytes(bytes, { ...pin, sha256: '0'.repeat(64) })).toThrow('Integridade')
})

test('missing input stops before any build output is created', async () => {
  const input = await directory()
  const output = resolve(input, 'not-created')
  await expect(verifyPythonReproductionInputs(input)).rejects.toThrow('ENOENT')
  await expect(
    reproducePythonDistribution({ vendorDirectory: input, outputDirectory: output }),
  ).rejects.toThrow()
  await expect(stat(output)).rejects.toThrow('ENOENT')
})

test('fetch never replaces a corrupt existing input or retries it from the network', async () => {
  const input = await directory()
  const bytes = new Uint8Array(17931) // Same length as the first pinned input, incorrect SHA.
  await put(input, 'pyodide.mjs', bytes)
  await expect(fetchPythonReproductionInputs(input)).rejects.toThrow('Integridade')
  expect(new Uint8Array(await readFile(resolve(input, 'pyodide.mjs')))).toEqual(bytes)
})

test('verification rejects a changed manifest before accepting any declared files', async () => {
  const input = await directory()
  const distribution = await expectedPythonDistribution()
  distribution.files[0]!.sha256 = '0'.repeat(64)
  await put(input, 'distribution.json', JSON.stringify(distribution))
  await expect(verifyPythonReproduction(input)).rejects.toThrow('SHA da distribuição')
})

test('the exact manifest is insufficient when a pinned output is missing', async () => {
  const input = await directory()
  await put(input, 'distribution.json', JSON.stringify(await expectedPythonDistribution()))
  await expect(verifyPythonReproduction(input)).rejects.toThrow('ENOENT')
})

test('a previous output is not removed or re-used on an invalid invocation', async () => {
  const input = await directory()
  const output = resolve(input, 'previous')
  await mkdir(output)
  directories.push(output)
  await put(output, 'keep.txt', 'earlier evidence')
  await expect(
    reproducePythonDistribution({ vendorDirectory: input, outputDirectory: output }),
  ).rejects.toThrow()
  expect(await readFile(resolve(output, 'keep.txt'), 'utf8')).toBe('earlier evidence')
})
