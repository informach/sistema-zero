import { expect, test } from 'bun:test'

test('full editor regression scenarios use real state and isolated storage/HTTP boundaries', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/lesson-editor-review.fixture.tsx'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [output, errors, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(status, output + errors).toBe(0)
})
