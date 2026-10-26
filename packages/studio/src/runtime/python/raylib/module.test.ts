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

test('a lista de funções da Raylib 3D é a dos módulos 3D do motor (gen-3d-functions.py)', async () => {
  const { RAYLIB_3D_FUNCTIONS, RAYLIB_3D_C_FUNCTIONS } = await import('./threeDFunctions.generated')
  const script = [
    'import json, sys',
    'sys.path.insert(0, sys.argv[1])',
    'from _szraylib import _api',
    'from _szraylib._names import C_NAMES, FUNCTION_PARAMS',
    'names = set()',
    'for m in _api._MODULES_3D:',
    "    module = __import__(f'_szraylib.{m}', fromlist=['_'])",
    "    names |= {n for n, v in vars(module).items() if callable(v) and not n.startswith('_') and n in FUNCTION_PARAMS}",
    'print(json.dumps([sorted(names), sorted(C_NAMES[n] for n in names if n in C_NAMES)]))',
  ].join('\n')
  const run = spawnSync(python(), ['-I', '-B', '-c', script, pkg], { encoding: 'utf8' })
  expect(run.status).toBe(0)
  const [names, cNames] = JSON.parse(run.stdout) as [string[], string[]]
  // Desatualizada, a troca da Raylib 3D pela 2D deixaria passar um código que daria erro no 2D.
  expect([...RAYLIB_3D_FUNCTIONS]).toEqual(names)
  expect([...RAYLIB_3D_C_FUNCTIONS]).toEqual(cNames)
  expect(names.length).toBeGreaterThan(80)
})
