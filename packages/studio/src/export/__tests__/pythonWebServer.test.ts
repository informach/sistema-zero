import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

for (const dns of ['normal', 'unavailable'])
  test(`generated static server provides opaque-frame headers, MIME and path confinement over real HTTP: DNS ${dns}`, async () => {
    const child = Bun.spawn(
      [process.execPath, 'run', resolve(import.meta.dirname, 'fixtures/pythonWebServer.ts')],
      {
        cwd: resolve(import.meta.dirname, '../../..'),
        stdout: 'pipe',
        stderr: 'pipe',
        windowsHide: true,
        env: { ...process.env, STUDIO_EXPORT_BLOCK_DNS: dns === 'unavailable' ? '1' : '0' },
      },
    )
    const deadline = setTimeout(() => child.kill(), 12_000)
    try {
      const [exit, output, errors] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      if (exit !== 0) throw new Error(`Generated server proof exited ${exit}: ${output}\n${errors}`)
      expect(output).toContain('"verified":true')
      expect(exit).toBe(0)
    } finally {
      clearTimeout(deadline)
      if (child.exitCode === null) child.kill()
    }
  }, 15_000)
