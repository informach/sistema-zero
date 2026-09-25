import { expect, test } from 'bun:test'

test('área dos pais oferece Cadê Todo Mundo? sem prometer o Desafio', async () => {
  const source = await Bun.file(
    new URL('../src/app/perfis/ambassador-card.tsx', import.meta.url),
  ).text()
  expect(source).toContain('Cadê Todo Mundo?')
  expect(source).not.toContain('Desafio do Primeiro Jogo')
  expect(source).not.toContain('Indique e ganhe')
  expect(source).toContain('Seja um embaixador do Sistema Zero')
  expect(source).toContain('7 dias')
  expect(source).toContain('Pix')
  expect(source).toContain('sem custo')
})
