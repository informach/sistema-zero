import { expect, test } from 'bun:test'
import {
  FiltroDaMedicaoSchema,
  NumeroDaMedicaoSchema,
  RelatorioDaMedicaoSchema,
} from '../src/medicao'

test('período civil válido, bissexto, público obrigatório e teto inclusivo de 90 dias', () => {
  const f = { de: '2024-02-29', ate: '2024-05-28', publico: 'kids' }
  expect(FiltroDaMedicaoSchema.safeParse(f).success).toBe(true)
  for (const delta of [
    { ate: '2024-05-29' },
    { de: '2023-02-29' },
    { de: '2024-06-01' },
    { publico: 'adult' },
    { publico: undefined },
    { pessoa: 'alguem' },
  ]) {
    expect(FiltroDaMedicaoSchema.safeParse({ ...f, ...delta }).success).toBe(false)
  }
})
test('número oculto não aceita valor, identificador ou contagem auxiliar', () => {
  expect(NumeroDaMedicaoSchema.safeParse({ situacao: 'poucos-dados', valor: null }).success).toBe(
    true,
  )
  for (const value of [1, 0, 4])
    expect(
      NumeroDaMedicaoSchema.safeParse({ situacao: 'poucos-dados', valor: value }).success,
    ).toBe(false)
  expect(
    NumeroDaMedicaoSchema.safeParse({ situacao: 'disponivel', valor: 5, nomes: ['alguem'] })
      .success,
  ).toBe(false)
  expect(RelatorioDaMedicaoSchema.safeParse({ pessoaId: 'nao-permitido' }).success).toBe(false)
})
