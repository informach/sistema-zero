import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('descanso Morada recupera energia pelo relógio real e termina ao levantar, construir ou sair', async () => {
  const child = Bun.spawn(
    [process.execPath, fileURLToPath(new URL('./fixtures/morada-descanso.tsx', import.meta.url))],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const timer = setTimeout(() => child.kill(), 12000)
  try {
    const [code, out, err] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(code, `${out}\n${err}`).toBe(0)
    expect(out).toContain('PASS relógio real')
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}, 15000)
