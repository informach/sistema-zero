import { expect, it } from 'bun:test'
import { resolve } from 'node:path'

it('qualifies the private HTTP lifecycle in the same Node runtime used by the container', async () => {
  const outdir = resolve(
    import.meta.dirname,
    '../../../.cache/studio-language-tests',
    crypto.randomUUID(),
  )
  const build = await Bun.build({
    entrypoints: [resolve(import.meta.dirname, 'fixtures/http-node.ts')],
    outdir,
    target: 'node',
  })
  expect(build.success).toBe(true)
  const child = Bun.spawn(
    [Bun.which('node')!, '--test', '--test-timeout=6000', build.outputs[0]!.path],
    { stdout: 'pipe', stderr: 'pipe', windowsHide: true },
  )
  const deadline = setTimeout(() => child.kill(), 10_000)
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect({
      code,
      stderr,
      failed: /# fail [1-9]|not ok/.test(stdout),
      output: code ? stdout : '',
    }).toEqual({ code: 0, stderr: '', failed: false, output: '' })
  } finally {
    clearTimeout(deadline)
    child.kill()
  }
}, 15_000)
