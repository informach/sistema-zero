import { expect, test } from 'bun:test'

test('Python rehearsal retires inspections when its context changes', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/python-rehearsal-lifecycle.fixture.tsx'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(code, output + errors).toBe(0)
}, 30000)
