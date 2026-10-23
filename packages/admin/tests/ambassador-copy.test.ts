import { expect, test } from 'bun:test'

test('gestão de embaixadores mostra o curso atual sem rebatizar resgates históricos', async () => {
  const source = await Bun.file(
    new URL('../src/app/admin/embaixadores/embaixadores-client.tsx', import.meta.url),
  ).text()
  expect(source).toContain('Cadê Todo Mundo?')
  expect(source).not.toContain('Desafio do Primeiro Jogo')
  expect(source).toContain('Sem assinatura')
})

test('campanhas falam dos dois públicos com a copy do Canvas', async () => {
  const source = await Bun.file(
    new URL('../src/app/admin/embaixadores/convites-client.tsx', import.meta.url),
  ).text()
  expect(source).toContain('Público do presente')
  expect(source).toContain('Família com criança de 9 a 14 anos. Cadê Todo Mundo e Mural Kids.')
  expect(source).toContain('18 anos ou mais. Cadê Todo Mundo na versão adulta e Mural adulto.')
  expect(source).toContain('Cada campanha tem seu link, seu')
  // Sem travessão, sem "!" e sem o "?" no nome do curso.
  expect(source).not.toContain('—')
  expect(source).not.toMatch(/!['"`]/)
  expect(source).not.toContain('Cadê Todo Mundo?')
})
