import { expect, test } from 'bun:test'
import { TEMAS_DE_CONSTRUCAO, temaDaSemana } from '../src/sistemas/tema-da-semana'

test('troca segunda à meia-noite de São Paulo, não domingo à meia-noite UTC', () => {
  const antes = temaDaSemana(new Date('2026-11-02T02:59:59.999Z'))!
  const depois = temaDaSemana(new Date('2026-11-02T03:00:00Z'))!
  expect(antes.semana).toBe('2026-10-26')
  expect(antes.tema.id).toBe('luz')
  expect(depois.semana).toBe('2026-11-02')
  expect(depois.tema.id).toBe('horta')
  expect(temaDaSemana(new Date('2026-10-29T15:00:00+09:00'))).toEqual(antes)
})
test('virada de ano não reinicia a sequência e o ciclo volta sem retirar temas', () => {
  expect(temaDaSemana(new Date('2026-12-31T15:00:00Z'))).toEqual(
    temaDaSemana(new Date('2027-01-01T15:00:00Z')),
  )
  const ids = Array.from(
    { length: 7 },
    (_, i) => temaDaSemana(new Date(Date.UTC(2026, 9, 26 + 7 * i, 12)))!.tema.id,
  )
  expect(new Set(ids.slice(0, 6)).size).toBe(6)
  expect(ids[6]).toBe(ids[0])
  expect(temaDaSemana(new Date('2026-10-19T12:00:00Z'))!.tema.id).toBe('visitas')
  expect(temaDaSemana(new Date(NaN))).toBeNull()
})
test('todos os convites são acessíveis sem compra ou obrigação de cumprir prazo', () => {
  expect(new Set(TEMAS_DE_CONSTRUCAO.map((t) => t.id)).size).toBe(TEMAS_DE_CONSTRUCAO.length)
  for (const tema of TEMAS_DE_CONSTRUCAO) {
    expect(tema.convite.length).toBeGreaterThan(30)
    expect(tema.alternativa.length).toBeGreaterThan(30)
    expect(`${tema.nome} ${tema.convite} ${tema.alternativa}`).not.toMatch(/[—!?]/)
  }
})
