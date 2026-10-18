import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

const target = process.env.STUDIO_BUILDER_TEST_DATABASE_URL
if (target !== undefined && !target.trim()) throw new Error('Explicitly empty SQL target')
test.skipIf(!target)(
  'Python builder lost acknowledgements settle in real SQL without deleting accepted previews',
  async () => {
    const child = Bun.spawn(
      [process.execPath, 'test', '../member-shell/qa/python-builder-ack.fixture.ts'],
      {
        cwd: resolve(import.meta.dirname, '../..'),
        stdout: 'pipe',
        stderr: 'pipe',
        windowsHide: true,
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      },
    )
    const deadline = setTimeout(() => child.kill(), 30000)
    try {
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ])
      const output = Bun.stripANSI(`${stdout}\n${stderr}`)
      if (code !== 0) throw new Error(`SQL acknowledgement cases failed (${code}):\n${output}`)
      expect(output).toContain('2 pass')
      expect(output).toContain('0 fail')
      expect(output).toMatch(/\b[1-9]\d* expect\(\) calls\b/)
    } finally {
      clearTimeout(deadline)
      if (child.exitCode === null) child.kill()
      await child.exited
    }
  },
  32000,
)
