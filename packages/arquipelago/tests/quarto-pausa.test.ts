import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('o móvel conserva a pose na pausa, retoma e respeita menos movimento', async () => {
  // O DOM e os hooks do renderizador ficam isolados das outras suites Three.
  const processo = Bun.spawn(
    [process.execPath, fileURLToPath(new URL('./fixtures/quarto-pausa.tsx', import.meta.url))],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const prazo = setTimeout(() => processo.kill(), 12_000)
  try {
    const [codigo, saida, erros] = await Promise.all([
      processo.exited,
      new Response(processo.stdout).text(),
      new Response(processo.stderr).text(),
    ])
    expect(codigo, `${saida}\n${erros}`).toBe(0)
    expect(saida).toContain('PASS pausa do quarto')
  } finally {
    clearTimeout(prazo)
    if (processo.exitCode === null) processo.kill()
  }
}, 15_000)
