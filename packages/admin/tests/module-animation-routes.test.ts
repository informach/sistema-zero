import { expect, test } from 'bun:test'

// Bun module mocks are process-global. Keep auth/storage doubles isolated from other BFF suites.
test('ediSVG upload and preview exercise real HTTP boundaries in an isolated process', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/module-animation-routes.fixture.ts'],
    {
      cwd: `${import.meta.dir}/..`,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (code !== 0) throw new Error(`${stdout}\n${stderr}`)
  expect(code).toBe(0)
  expect(stderr).toContain('7 pass')
  expect(stderr).toContain('0 fail')
}, 30000)
