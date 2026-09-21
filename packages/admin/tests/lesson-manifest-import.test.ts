import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('substitui o rascunho somente depois de mostrar e confirmar todas as remoções', () => {
  // `mock.module` é global no Bun. O processo filho mantém o mock da fronteira HTTP fora das
  // outras suítes do admin, que também exercitam `apiSend` com contratos diferentes.
  const result = Bun.spawnSync(
    [process.execPath, 'test', './tests/fixtures/lesson-manifest-import.fixture.tsx'],
    {
      cwd: resolve(import.meta.dir, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  expect(new TextDecoder().decode(result.stderr)).toContain('1 pass')
  expect(result.exitCode).toBe(0)
}, 10000)
