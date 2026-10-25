import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const tests = fileURLToPath(new URL('./__tests__/module_test.py', import.meta.url))
const tests3d = fileURLToPath(new URL('./__tests__/module3d_test.py', import.meta.url))
const pkg = fileURLToPath(new URL('./py', import.meta.url))

/** The module is plain Python: struct semantics, loop, input and drawing run in any CPython 3.12+. */
function python() {
  for (const command of ['python3', 'python']) {
    const probe = spawnSync(command, ['-c', 'import sys; print(sys.version_info >= (3, 12))'], {
      encoding: 'utf8',
    })
    if (probe.status === 0 && probe.stdout.trim() === 'True') return command
  }
  // Never a silent skip: the Raylib module would go untested.
  throw new Error('Os testes do módulo Raylib precisam de Python 3.12 ou mais novo.')
}

test('the Raylib module keeps the cffi semantics, the loop, input and drawing (CPython)', () => {
  const run = spawnSync(python(), ['-I', '-B', tests, pkg], { encoding: 'utf8', timeout: 60_000 })
  if (run.status !== 0) console.error(run.stdout, run.stderr)
  expect(run.status).toBe(0)
  expect(run.stderr).toMatch(/Ran \d+ tests/)
}, 70_000)

test('the Raylib 3D module records raylib shapes, the camera and the rlgl state (CPython)', () => {
  const run = spawnSync(python(), ['-I', '-B', tests3d, pkg], { encoding: 'utf8', timeout: 60_000 })
  if (run.status !== 0) console.error(run.stdout, run.stderr)
  expect(run.status).toBe(0)
  expect(run.stderr).toMatch(/Ran \d+ tests/)
}, 70_000)
