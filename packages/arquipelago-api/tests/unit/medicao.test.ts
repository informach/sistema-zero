import { expect, test } from 'bun:test'
import {
  PeriodoDaMedicaoInvalidoError,
  ServicoDaMedicao,
} from '../../src/application/servico-da-medicao'
import {
  type AgregadosDaMedicao,
  montarMedicao,
  protegerContagem,
  protegerCoorte,
} from '../../src/domain/medicao'

const c = { dia: '2026-10-01', pessoas: 10, seguinte: 5, dia7: 5 }
test('coorte pequena e complementar pequeno não revelam nenhuma parte da linha', () => {
  for (const delta of [
    { pessoas: 4, seguinte: 4, dia7: 4 },
    { seguinte: 1 },
    { seguinte: 9 },
    { dia7: 6 },
  ]) {
    const linha = protegerCoorte({ ...c, ...delta }, '2026-10-28')
    expect([linha.dia1.valor, linha.diaSeguinte.valor, linha.dia7.valor]).toEqual([
      null,
      null,
      null,
    ])
  }
  expect(protegerCoorte(c, '2026-10-28').dia7.valor).toBe(5)
  expect(protegerCoorte({ ...c, seguinte: 0, dia7: 10 }, '2026-10-28').diaSeguinte.valor).toBe(0)
})
test('retorno aguarda o encerramento do dia local e dia 7 significa D+6', () => {
  expect(protegerCoorte(c, '2026-10-02').diaSeguinte.situacao).toBe('aguardando')
  expect(protegerCoorte(c, '2026-10-03').diaSeguinte.valor).toBe(5)
  expect(protegerCoorte(c, '2026-10-07').dia7.situacao).toBe('aguardando')
  expect(protegerCoorte(c, '2026-10-08').dia7.valor).toBe(5)
})
test('muitos objetos de poucas pessoas continuam protegidos', () => {
  expect(protegerContagem({ quantidade: 100, pessoas: 4 }).valor).toBeNull()
  expect(protegerContagem({ quantidade: 10, pessoas: 5 }).valor).toBe(10)
})
const contagem = { quantidade: 10, pessoas: 5 }
const dados: AgregadosDaMedicao = {
  coortes: [c],
  pintaMolda: contagem,
  galeria: contagem,
  criacaoGuardada: contagem,
  desafiosAprovados: contagem,
}
test('adulto não herda o histórico de tempo do Kids', () => {
  const r = montarMedicao(
    { de: '2026-10-01', ate: '2026-10-28', publico: 'adulto' },
    dados,
    '2026-10-28',
    new Date('2026-10-28T12:00:00Z'),
  )
  expect(r.volta).toEqual({ situacao: 'sem-fonte', coortes: [] })
  expect(r.semFonte).toContain('volta-adulto')
})
test('data futura é recusada antes do banco, pelo dia de São Paulo', async () => {
  let chamadas = 0
  const service = new ServicoDaMedicao(
    {
      async agregar() {
        chamadas++
        return dados
      },
    },
    () => new Date('2026-10-28T02:59:59Z'),
  )
  await expect(
    service.ler({ de: '2026-10-01', ate: '2026-10-28', publico: 'kids' }),
  ).rejects.toBeInstanceOf(PeriodoDaMedicaoInvalidoError)
  expect(chamadas).toBe(0)
  expect(
    (await service.ler({ de: '2026-10-01', ate: '2026-10-27', publico: 'kids' })).periodo.ate,
  ).toBe('2026-10-27')
})
