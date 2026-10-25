import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** The browser Turtle backend is plain Python: it runs in any CPython 3.12+, without Tk. */
function python() {
  for (const command of ['python3', 'python']) {
    const probe = spawnSync(command, ['-c', 'import sys; print(sys.version_info >= (3, 12))'], {
      encoding: 'utf8',
    })
    if (probe.status === 0 && probe.stdout.trim() === 'True') return command
  }
  // Never a silent skip: the backend would go untested.
  throw new Error('Os testes do Turtle precisam de Python 3.12 ou mais novo.')
}

for (const file of ['test_compound.py', 'test_backend_fidelity.py', 'test_formas_do_pinta.py'])
  test(`the Turtle backend: ${file} (CPython)`, () => {
    const path = fileURLToPath(new URL(`../../../../scripts/turtle/${file}`, import.meta.url))
    const run = spawnSync(python(), ['-I', '-B', path], { encoding: 'utf8', timeout: 60_000 })
    if (run.status !== 0) console.error(run.stdout, run.stderr)
    expect(run.status).toBe(0)
    expect(run.stderr).toMatch(/Ran \d+ tests/)
  }, 70_000)
