import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('real Studio hosts keep opening owners across asynchronous handoffs in an isolated browser realm', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      resolve(import.meta.dirname, 'fixtures/studio-project-opening.fixture.tsx'),
    ],
    {
      cwd: resolve(import.meta.dirname, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
    },
  )
  const deadline = setTimeout(() => child.kill(), 15_000)
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(code, stdout + stderr).toBe(0)
    expect(stdout + stderr).toMatch(/\b10 pass\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
    await child.exited
  }
}, 18_000)
