import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('suspender a orientação limpa só a tela e retoma o tutorial e as dicas', async () => {
  const processo = Bun.spawn(
    [
      process.execPath,
      fileURLToPath(new URL('./fixtures/passos-desmontagem.tsx', import.meta.url)),
    ],
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
    expect(saida).toContain('PASS retomada')
  } finally {
    clearTimeout(prazo)
    if (processo.exitCode === null) processo.kill()
  }
}, 15_000)
