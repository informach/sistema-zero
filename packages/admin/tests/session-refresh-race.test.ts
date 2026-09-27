import { expect, test } from 'bun:test'

test('o Admin não revoga a sessão quando uma requisição chega após a rotação', () => {
  const result = Bun.spawnSync(
    [process.execPath, 'test', './tests/fixtures/session-refresh-race.fixture.ts'],
    { cwd: import.meta.dir.replace(/[\\/]tests$/, ''), stdout: 'pipe', stderr: 'pipe' },
  )
  const output = `${new TextDecoder().decode(result.stdout)}\n${new TextDecoder().decode(result.stderr)}`
  expect(result.exitCode, output).toBe(0)
})
