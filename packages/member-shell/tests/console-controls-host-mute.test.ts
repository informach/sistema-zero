import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('public control DOM checks run in an isolated realm', async () => {
  const studio = resolve(import.meta.dirname, '../../studio')
  const child = Bun.spawn(
    [
      process.execPath,
      'test',
      '--preload',
      resolve(studio, 'test-setup.ts'),
      resolve(studio, 'src/components/preview/publicHostMute.cases.tsx'),
    ],
    {
      cwd: studio,
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    },
  )
  const deadline = setTimeout(() => child.kill(), 10000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    if (exit !== 0) throw new Error(`Public controls child failed ${exit}:\n${stdout}\n${stderr}`)
    expect(exit).toBe(0)
    expect(Bun.stripANSI(stdout + stderr)).toMatch(/\b0 fail\b/)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 12000)
