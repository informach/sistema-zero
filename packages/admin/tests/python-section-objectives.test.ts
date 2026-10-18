import { expect, test } from 'bun:test'

test('Python section objectives use the real form in an isolated DOM', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/python-section-objectives.fixture.tsx'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(code, output + errors).toBe(0)
}, 30000)
