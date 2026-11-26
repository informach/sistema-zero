import { expect, test } from 'bun:test'

test('gestão de embaixadores mostra o curso atual sem rebatizar resgates históricos', async () => {
  const source = await Bun.file(
    new URL('../src/app/admin/embaixadores/embaixadores-client.tsx', import.meta.url),
  ).text()
  // O nome do curso sem o "?", como nas campanhas (a copy do Canvas).
  expect(source).toContain('Quem manda presentes e indica ofertas com o próprio link')
  expect(source).not.toContain('Desafio do Primeiro Jogo')
  expect(source).toContain('Sem assinatura')
})

test('campanhas falam dos dois públicos com a copy do Canvas', async () => {
  // Lote 7 (25/11/2026): a lista, o formulário em passos e o detalhe moram em arquivos próprios.
  const files = ['convites-client', 'campaign-editor', 'campaign-detail', 'campaign-shared']
  const source = (
    await Promise.all(
      files.map((f) =>
        Bun.file(new URL(`../src/app/admin/embaixadores/${f}.tsx`, import.meta.url)).text(),
      ),
    )
  ).join('\n')
  expect(source).toContain('Comunidade dos Criadores · famílias com criança de 5 a 17 anos.')
  expect(source).toContain('Comunidade Sistema Zero · pessoas de 18 anos ou mais.')
  // O curso e o prazo vêm da oferta de presente, não de um texto fixo.
  expect(source).not.toContain('Cadê Todo Mundo e Mural Kids')
  expect(source).not.toContain('SCHOLARSHIP_')
  expect(source).toContain('Cada campanha tem o seu link, o seu')
  // Sem travessão, sem "!" e sem o "?" no nome do curso.
  expect(source).not.toContain('—')
  expect(source).not.toMatch(/!['"`]/)
  expect(source).not.toContain('Cadê Todo Mundo?')
})
