import { expect, test } from 'bun:test'

test('Python gallery races through the real BFF and Members consumers in an isolated process', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', '../member-shell/qa/python-gallery-races.fixture.ts'],
    {
      cwd: new URL('../..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect({ code, output: stdout + stderr }).toMatchObject({ code: 0 })
}, 30_000)
