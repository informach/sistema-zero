import { expect, test } from 'bun:test'

test('Admin refresh cancellation isolates callers without cancelling the shared rotation', () => {
  const result = Bun.spawnSync(
    [process.execPath, 'test', './tests/fixtures/gateway-refresh-cancellation.fixture.ts'],
    { cwd: import.meta.dir.replace(/[\\/]tests$/, ''), stdout: 'pipe', stderr: 'pipe' },
  )
  const output = `${result.stdout.toString()}\n${result.stderr.toString()}`
  expect(result.exitCode, output).toBe(0)
})
