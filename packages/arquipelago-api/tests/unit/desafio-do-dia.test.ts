import { describe, expect, test } from 'bun:test'
import { type CandidatoDoDia, diaPar, escolherDesafioDoDia } from '../../src/domain/desafio-do-dia'

// Paridade pelos dias desde 1970: 2026-10-28 é o dia 20.755 (ímpar); 2026-10-29, o 20.756 (par).
const PAR = '2026-10-29'
const IMPAR = '2026-10-28'

const candidato = (id: string, over: Partial<CandidatoDoDia> = {}): CandidatoDoDia => ({
  id,
  ilha: 'bosque',
  posicaoDaIlha: 2,
  ordem: 0,
  feitoEm: null,
  ...over,
})
const doRecife = (id: string, over: Partial<CandidatoDoDia> = {}) =>
  candidato(id, { ilha: 'recife', posicaoDaIlha: 3, ...over })

describe('diaPar', () => {
  test('conta os dias desde 1970: o dia 31 e o dia 1 seguintes não ficam iguais', () => {
    expect(diaPar(PAR)).toBe(true)
    expect(diaPar(IMPAR)).toBe(false)
    expect(diaPar('2026-10-31')).not.toBe(diaPar('2026-11-01'))
    expect(diaPar('2026-12-31')).not.toBe(diaPar('2027-01-01'))
  })
})

describe('escolherDesafioDoDia', () => {
  test('sem candidato: nenhum desafio hoje', () => {
    expect(escolherDesafioDoDia(PAR, [])).toBeNull()
  })

  test('dia par puxa a ilha mais nova; dia ímpar, as anteriores', () => {
    const banco = [candidato('b1'), doRecife('r1')]
    expect(escolherDesafioDoDia(PAR, banco)).toBe('r1')
    expect(escolherDesafioDoDia(IMPAR, banco)).toBe('b1')
  })

  test('sem candidato no grupo do dia, vale qualquer ilha', () => {
    expect(escolherDesafioDoDia(IMPAR, [doRecife('r1')])).toBe('r1')
    expect(escolherDesafioDoDia(IMPAR, [doRecife('r1'), doRecife('r2', { ordem: 1 })])).toBe('r1')
  })

  test('os ainda não feitos vêm primeiro, mesmo fora do grupo do dia', () => {
    const banco = [candidato('b1'), doRecife('r1', { feitoEm: new Date('2026-10-20T12:00:00Z') })]
    expect(escolherDesafioDoDia(PAR, banco)).toBe('b1')
  })

  test('a mais nova é a mais alta entre os não feitos', () => {
    // O Recife todo feito: no dia par, a mais nova do banco é o Bosque.
    const banco = [
      candidato('b1', { ordem: 2 }),
      candidato('b2', { ordem: 1 }),
      doRecife('r1', { feitoEm: new Date('2026-10-20T12:00:00Z') }),
    ]
    expect(escolherDesafioDoDia(PAR, banco)).toBe('b2')
  })

  test('no mesmo grupo, a ordem da equipe e depois o id', () => {
    const banco = [candidato('b2', { ordem: 1 }), candidato('b9'), candidato('b1')]
    expect(escolherDesafioDoDia(PAR, banco)).toBe('b1')
  })

  test('todos feitos: recomeça pelo feito há mais tempo', () => {
    const banco = [
      candidato('b1', { feitoEm: new Date('2026-10-25T12:00:00Z') }),
      candidato('b2', { ordem: 1, feitoEm: new Date('2026-10-21T12:00:00Z') }),
      doRecife('r1', { feitoEm: new Date('2026-10-10T12:00:00Z') }),
    ]
    expect(escolherDesafioDoDia(IMPAR, banco)).toBe('b2')
    expect(escolherDesafioDoDia(PAR, banco)).toBe('r1')
  })

  test('a mesma situação dá sempre o mesmo desafio', () => {
    const banco = [candidato('b1'), candidato('b2'), doRecife('r1'), doRecife('r2')]
    const vezes = new Set(Array.from({ length: 5 }, () => escolherDesafioDoDia(PAR, banco)))
    expect([...vezes]).toEqual(['r1'])
  })
})
