import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

for (const fixture of ['subscription-recovery-ui.tsx', 'subscription-recovery-bff.ts']) {
  test(`subscription recovery isolated boundary: ${fixture}`, async () => {
    const child = Bun.spawn([process.execPath, 'test', `./tests/fixtures/${fixture}`], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect({ code, output: code === 0 ? '' : stdout + stderr }).toEqual({ code: 0, output: '' })
  }, 30_000)
}
