import { expect, test } from 'bun:test'

const source = await Bun.file(
  new URL('../src/app/pais/_components/ambassador-card.tsx', import.meta.url),
).text()

test('área dos pais conta os dois presentes sem prometer o Desafio', () => {
  expect(source).not.toContain('Desafio do Primeiro Jogo')
  expect(source).not.toContain('Indique e ganhe')
  expect(source).toContain('Seja um embaixador do Sistema Zero')
  expect(source).toContain('7 dias')
  expect(source).toContain('Pix')
  expect(source).toContain('sem custo')
  // Os dois públicos do presente (20/10/2026).
  expect(source).toContain('família com criança de 9 a 14 anos')
  expect(source).toContain('adulto que quer criar o próprio jogo')
  expect(source).toContain('Copiar link para uma família')
  expect(source).toContain('Copiar link para um adulto')
  expect(source).toContain('shareUrls')
})

test('o cartão segue o desenho da área dos pais e não crava valor', () => {
  // Regra da dona: a identidade da oferta adulta não entra na comunidade.
  expect(source).toContain('bg-(--band-lilas)')
  expect(source).toContain('sz-display')
  expect(source).toContain('PRIMARY_ACTION')
  expect(source).toContain('SECONDARY_ACTION')
  expect(source).not.toContain('theme-arcade')
  // O valor sai do serviço (`bonus.amountCents`); o render do cartão confere o número.
  expect(source).toContain('view.bonus?.amountCents')
  // O "?" saiu do nome do curso e o "!" saiu dos recados.
  expect(source).not.toContain('Cadê Todo Mundo?')
  expect(source).not.toMatch(/!['"`]/)
})
