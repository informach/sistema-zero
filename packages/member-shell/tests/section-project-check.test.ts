import { expect, test } from 'bun:test'

test('section project feedback owns source and context lifetime in an isolated DOM', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/section-project-check.fixture.tsx'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(code, output + errors).toBe(0)
}, 30000)
