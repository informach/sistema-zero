import { expect, test } from 'bun:test'
import { GALERIA, IDS_DA_GALERIA } from '@sistemazero/arquipelago-contracts'
import { podeVerAparenciaNaFeira, vitrineDaSemana } from '../src/sistemas/feira'

test('feira destaca três por semana sem retirar os outros nem alterar o preço', () => {
  const antes = JSON.stringify(GALERIA)
  const vistos = new Set<string>()
  for (let semana = 0; semana < 3; semana++) {
    const vitrine = vitrineDaSemana(new Date(Date.UTC(2026, 9, 26 + 7 * semana, 12)))!
    expect(vitrine.destaques).toHaveLength(3)
    expect([...vitrine.destaques, ...vitrine.demais].sort()).toEqual([...IDS_DA_GALERIA].sort())
    for (const id of vitrine.destaques) vistos.add(id)
  }
  expect(vistos.size).toBe(IDS_DA_GALERIA.length)
  expect(JSON.stringify(GALERIA)).toBe(antes)
  expect(vitrineDaSemana(new Date(NaN))).toBeNull()
})
test('vitrine troca na segunda de São Paulo, sem zerar ao virar o ano', () => {
  expect(vitrineDaSemana(new Date('2026-11-02T02:59:59Z'))!.semana).toBe('2026-10-26')
  expect(vitrineDaSemana(new Date('2026-11-02T03:00:00Z'))!.semana).toBe('2026-11-02')
  expect(vitrineDaSemana(new Date('2026-12-31T12:00:00Z'))).toEqual(
    vitrineDaSemana(new Date('2027-01-01T12:00:00Z')),
  )
})
test('aparência só oferece compra quando o projeto funcional existe', () => {
  expect(podeVerAparenciaNaFeira('geladeira-classica', {})).toBe(false)
  expect(podeVerAparenciaNaFeira('geladeira-classica', { geladeira: null })).toBe(false)
  expect(
    podeVerAparenciaNaFeira('geladeira-classica', { geladeira: { ganhoEm: '2026-10-29' } }),
  ).toBe(true)
  expect(podeVerAparenciaNaFeira('forno-classico', { geladeira: {} })).toBe(false)
})
