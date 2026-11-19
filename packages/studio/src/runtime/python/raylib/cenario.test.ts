import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('cenário compilado no módulo Raylib real: desenho, matriz, alturas, limites e descarte', () => {
  const script = fileURLToPath(new URL('./__tests__/cenario_test.py', import.meta.url)),
    pkg = fileURLToPath(new URL('./py', import.meta.url)),
    run = spawnSync('python', ['-I', '-B', script, pkg], { encoding: 'utf8', timeout: 60_000 })
  if (run.status !== 0) console.error(run.stdout, run.stderr)
  expect(run.status).toBe(0)
  expect(run.stderr).toMatch(/Ran \d+ tests/)
}, 70_000)
