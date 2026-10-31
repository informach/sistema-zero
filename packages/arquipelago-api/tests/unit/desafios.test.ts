import { describe, expect, test } from 'bun:test'
import { posicoesConquistadas, quadrosFeitos } from '../../src/application/servico-dos-desafios'
import {
  chaveDasMoedas,
  passouNosObrigatorios,
  semanaDeSaoPaulo,
  situacaoDoDesafio,
} from '../../src/domain/desafios'
import type { ConclusaoGuardada } from '../../src/domain/desafios.port'

describe('situacaoDoDesafio', () => {
  const base = { concluido: false, ilhaAberta: true, blocosExigidos: ['a', 'b'] }
  test('feito continua feito, mesmo sem ilha e sem blocos', () => {
    expect(
      situacaoDoDesafio({ ...base, concluido: true, ilhaAberta: false, blocos: new Set() }),
    ).toEqual({ situacao: 'concluido', faltam: [] })
  })
  test('ilha fechada vem antes dos blocos', () => {
    expect(situacaoDoDesafio({ ...base, ilhaAberta: false, blocos: new Set() }).situacao).toBe(
      'ilha-fechada',
    )
  })
  test('faltam só os blocos que a pessoa não tem; "todos" libera', () => {
    expect(situacaoDoDesafio({ ...base, blocos: new Set(['a']) })).toEqual({
      situacao: 'faltam-blocos',
      faltam: ['b'],
    })
    expect(situacaoDoDesafio({ ...base, blocos: 'todos' }).situacao).toBe('disponivel')
    expect(situacaoDoDesafio({ ...base, blocosExigidos: [], blocos: new Set() }).situacao).toBe(
      'disponivel',
    )
  })
})

describe('passouNosObrigatorios', () => {
  const objetivos = [{ id: 'o1' }, { id: 'o2' }, { id: 'x', optional: true as const }]
  test('principal = todos os obrigatórios; extra = todos os opcionais', () => {
    expect(
      passouNosObrigatorios(objetivos, [
        { id: 'o1', passou: true },
        { id: 'o2', passou: true },
        { id: 'x', passou: false },
      ]),
    ).toEqual({ principal: true, extra: false })
    expect(
      passouNosObrigatorios(objetivos, [
        { id: 'o1', passou: true },
        { id: 'x', passou: true },
      ]),
    ).toEqual({ principal: false, extra: true })
  })
  test('sem obrigatório nunca passa; sem opcional não há extra', () => {
    expect(
      passouNosObrigatorios([{ id: 'x', optional: true }], [{ id: 'x', passou: true }]),
    ).toEqual({ principal: false, extra: true })
    expect(passouNosObrigatorios([{ id: 'o1' }], [{ id: 'o1', passou: true }])).toEqual({
      principal: true,
      extra: false,
    })
  })
})

describe('chaveDasMoedas', () => {
  const j = '11111111-1111-4111-8111-111111111111'
  const d = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  test('UUID v5 estável, diferente por prêmio, jogador e desafio', () => {
    const k = chaveDasMoedas(j, d, 'principal')
    expect(k).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(chaveDasMoedas(j, d, 'principal')).toBe(k)
    expect(chaveDasMoedas(j, d, 'extra')).not.toBe(k)
    expect(chaveDasMoedas(d, j, 'principal')).not.toBe(k)
  })
})

describe('semanaDeSaoPaulo', () => {
  test('segunda-feira de São Paulo, também na virada do dia em UTC', () => {
    expect(semanaDeSaoPaulo(new Date('2026-10-27T15:00:00Z'))).toBe('2026-10-26')
    // Domingo 23h em São Paulo ainda é a semana anterior.
    expect(semanaDeSaoPaulo(new Date('2026-11-02T02:00:00Z'))).toBe('2026-10-26')
    expect(semanaDeSaoPaulo(new Date('2026-11-02T03:00:00Z'))).toBe('2026-11-02')
    expect(semanaDeSaoPaulo(new Date('2026-11-08T12:00:00Z'))).toBe('2026-11-02')
  })
})

describe('quadrosFeitos', () => {
  const c = (over: Partial<ConclusaoGuardada>): ConclusaoGuardada => ({
    desafioId: 'd',
    ilha: 'bosque',
    tipo: 'quadro-das-cores',
    quadro: 1,
    revisao: 1,
    concluidoEm: new Date(),
    extraConcluidoEm: null,
    recompensaVistaEm: null,
    moedas: 0,
    moedasSituacao: 'nenhuma',
    moedasExtra: 0,
    moedasExtraSituacao: 'nenhuma',
    moedasTetoSemana: null,
    moedasExtraTetoSemana: null,
    ...over,
  })
  test('um por número de quadro, só da ilha, só Quadro das Cores, no máximo 6', () => {
    const lista = [
      c({ quadro: 1 }),
      c({ quadro: 1, desafioId: 'outro-do-mesmo-quadro' }),
      c({ quadro: 2 }),
      c({ ilha: 'farol', quadro: 3 }),
      c({ tipo: 'desafio-do-dia', quadro: null }),
    ]
    expect(quadrosFeitos(lista, 'bosque')).toBe(2)
    expect(
      posicoesConquistadas(
        [...lista, ...[0, 7, 1.5, null].map((quadro) => c({ quadro }))],
        'bosque',
      ),
    ).toEqual([1, 2])
    expect(
      quadrosFeitos(
        [1, 2, 3, 4, 5, 6].map((q) => c({ quadro: q })),
        'bosque',
      ),
    ).toBe(6)
  })
})
