import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

for (const fixture of ['mastery-evidence', 'mastery-gallery-route'])
  test(`${fixture} preserves immutable evidence without mocks leaking into other suites`, async () => {
    const child = Bun.spawn([process.execPath, 'test', `./tests/fixtures/${fixture}.fixture.tsx`], {
      cwd: resolve(import.meta.dir, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [status, output, errors] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(status, output + errors).toBe(0)
  }, 30000)
