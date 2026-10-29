import { expect, test } from 'bun:test'

test('Jogo Admin autoriza no servidor antes de encaminhar pedidos', () => {
  const result = Bun.spawnSync(
    [process.execPath, 'test', './tests/fixtures/game-admin-route.fixture.ts'],
    {
      cwd: import.meta.dir.replace(/[\\/]tests$/, ''),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  expect(result.exitCode, `${result.stdout.toString()}\n${result.stderr.toString()}`).toBe(0)
})
