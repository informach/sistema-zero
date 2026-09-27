import { expect, test } from 'bun:test'

test('gestão de embaixadores mostra o curso atual sem rebatizar resgates históricos', async () => {
  const source = await Bun.file(
    new URL('../src/app/admin/embaixadores/embaixadores-client.tsx', import.meta.url),
  ).text()
  expect(source).toContain('Cadê Todo Mundo?')
  expect(source).not.toContain('Desafio do Primeiro Jogo')
  expect(source).toContain('Sem assinatura')
})
