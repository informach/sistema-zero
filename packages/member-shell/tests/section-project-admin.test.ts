import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('equipe vê a verificação no player completo mesmo sem sectionProgress', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/section-project-admin.fixture.tsx'],
    { cwd: fileURLToPath(new URL('..', import.meta.url)), stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, out, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(code, out + error).toBe(0)
}, 30000)
