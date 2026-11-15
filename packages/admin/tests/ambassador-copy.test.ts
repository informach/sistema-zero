import { expect, test } from 'bun:test'

test('gestão de embaixadores mostra o curso atual sem rebatizar resgates históricos', async () => {
  const source = await Bun.file(
    new URL('../src/app/admin/embaixadores/embaixadores-client.tsx', import.meta.url),
  ).text()
  // O nome do curso sem o "?", como nas campanhas (a copy do Canvas).
  expect(source).toContain('indica o curso Cadê Todo Mundo sem custo')
  expect(source).not.toContain('Desafio do Primeiro Jogo')
  expect(source).toContain('Sem assinatura')
})

test('campanhas falam dos dois públicos com a copy do Canvas', async () => {
  const source = await Bun.file(
    new URL('../src/app/admin/embaixadores/convites-client.tsx', import.meta.url),
  ).text()
  expect(source).toContain('Público do presente')
  expect(source).toContain('Comunidade Kids: famílias com criança de 5 a 17 anos.')
  expect(source).toContain('Comunidade adulta: pessoas de 18 anos ou mais.')
  // O curso e o prazo vêm da oferta de presente, não de um texto fixo.
  expect(source).not.toContain('Cadê Todo Mundo e Mural Kids')
  expect(source).not.toContain('SCHOLARSHIP_')
  expect(source).toContain('Cada campanha tem seu link, seu')
  // Sem travessão, sem "!" e sem o "?" no nome do curso.
  expect(source).not.toContain('—')
  expect(source).not.toMatch(/!['"`]/)
  expect(source).not.toContain('Cadê Todo Mundo?')
})
