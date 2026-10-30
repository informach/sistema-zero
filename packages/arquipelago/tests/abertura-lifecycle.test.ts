import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('a abertura real distingue fechar de desmontar e cancela a saída descartada', async () => {
  // DOM em processo próprio para não alterar o ambiente das regras puras e do Three.
  const processo = Bun.spawn(
    [
      process.execPath,
      fileURLToPath(new URL('./fixtures/abertura-lifecycle.tsx', import.meta.url)),
    ],
    {
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const prazo = setTimeout(() => processo.kill(), 12_000)
  try {
    const [codigo, saida, erros] = await Promise.all([
      processo.exited,
      new Response(processo.stdout).text(),
      new Response(processo.stderr).text(),
    ])
    expect(codigo, `${saida}\n${erros}`).toBe(0)
    expect(saida).toContain('PASS descarte')
  } finally {
    clearTimeout(prazo)
    if (processo.exitCode === null) processo.kill()
  }
}, 15_000)
