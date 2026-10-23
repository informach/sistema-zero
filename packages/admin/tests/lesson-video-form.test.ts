import { expect, test } from 'bun:test'

test('video presentation uses the real registry, Session, form and React before commit', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/lesson-video-form.fixture.tsx'],
    {
      cwd: import.meta.dir.replace(/[\\/]tests$/, ''),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(status, stdout + stderr).toBe(0)
})
