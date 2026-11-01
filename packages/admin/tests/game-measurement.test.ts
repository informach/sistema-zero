import { expect, test } from 'bun:test'
import { gameAdminRequest } from '../src/lib/arquipelago-admin'

test('BFF permite só leitura agregada com período e público explícitos', () => {
  const query = new URLSearchParams({ de: '2026-10-01', ate: '2026-10-28', publico: 'adulto' })
  expect(gameAdminRequest('GET', ['medicao'], query, undefined)).toEqual({
    path: '/arquipelago/equipe/medicao',
    query: Object.fromEntries(query),
    body: undefined,
  })
  expect(() => gameAdminRequest('POST', ['medicao'], query, {})).toThrow()
  expect(() => gameAdminRequest('GET', ['medicao', 'pessoa'], query, undefined)).toThrow()
  query.set('perfilId', 'individual')
  expect(() => gameAdminRequest('GET', ['medicao'], query, undefined)).toThrow()
  query.delete('perfilId')
  query.delete('publico')
  expect(() => gameAdminRequest('GET', ['medicao'], query, undefined)).toThrow()
})

test('a medição lida pelo Admin aceita fonte nova e campo novo; o número continua estrito', async () => {
  const { textoDaFonteQueFalta } = await import('@sistemazero/arquipelago-admin')
  const { FONTES_QUE_FALTAM, RelatorioDaMedicaoLidoSchema } = await import(
    '@sistemazero/arquipelago-contracts'
  )
  for (const fonte of FONTES_QUE_FALTAM)
    expect(textoDaFonteQueFalta(fonte)).not.toContain('Atualize o Admin')
  expect(textoDaFonteQueFalta('fonte-do-futuro')).toContain('fonte-do-futuro')
  const n = { situacao: 'aguardando', valor: null }
  const relatorio = {
    periodo: { de: '2026-10-01', ate: '2026-10-02', publico: 'adulto' },
    calculadoEm: '2026-10-03T12:00:00.000Z',
    volta: { situacao: 'disponivel', coortes: [] },
    criacao: { pintaMolda: n, criacaoGuardada: n, galeria: n, novo: n },
    desafiosAprovados: n,
    campoNovo: { qualquer: 1 },
    semFonte: ['permanencia', 'fonte-do-futuro'],
  }
  expect(RelatorioDaMedicaoLidoSchema.safeParse(relatorio).success).toBe(true)
  expect(
    RelatorioDaMedicaoLidoSchema.safeParse({ ...relatorio, desafiosAprovados: { situacao: 'x' } })
      .success,
  ).toBe(false)
})
