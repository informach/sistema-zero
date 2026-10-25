import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** The saving side of interpreter.py is plain Python: it runs in any CPython 3.12+. */
function python() {
  for (const command of ['python3', 'python']) {
    const probe = spawnSync(command, ['-c', 'import sys; print(sys.version_info >= (3, 12))'], {
      encoding: 'utf8',
    })
    if (probe.status === 0 && probe.stdout.trim() === 'True') return command
  }
  // Never a silent skip: what the game saves would go untested.
  throw new Error('Os testes dos arquivos guardados precisam de Python 3.12 ou mais novo.')
}

test('what a program saves with open() goes to the host, within the limits (CPython)', () => {
  const tests = fileURLToPath(new URL('./__tests__/saved_files_test.py', import.meta.url))
  const source = fileURLToPath(new URL('./interpreter.py', import.meta.url))
  const run = spawnSync(python(), ['-I', '-B', tests, source], {
    encoding: 'utf8',
    timeout: 60_000,
  })
  if (run.status !== 0) console.error(run.stdout, run.stderr)
  expect(run.status).toBe(0)
  expect(run.stderr).toMatch(/Ran \d+ tests/)
}, 70_000)
