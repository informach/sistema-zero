import { describe, expect, test } from 'bun:test'
import {
  criacoesDaSemana,
  desafiosDaSemana,
  diasDeVoltaAoCurso,
  janelaDaSemana,
  posicaoDaIlhaMaisNova,
} from '../../src/domain/semana-da-familia'

describe('a janela da semana', () => {
  test('hoje e os 6 dias anteriores, no dia de São Paulo', () => {
    // 28/10 às 01h em São Paulo ainda é 28; às 02h59 UTC ainda é 27 lá.
    expect(janelaDaSemana(new Date('2026-10-28T15:00:00Z'))).toEqual({
      inicio: '2026-10-22',
      fim: '2026-10-28',
    })
    expect(janelaDaSemana(new Date('2026-10-28T02:59:00Z'))).toEqual({
      inicio: '2026-10-21',
      fim: '2026-10-27',
    })
    // Atravessa o mês e o ano.
    expect(janelaDaSemana(new Date('2027-01-03T15:00:00Z'))).toEqual({
      inicio: '2026-12-28',
      fim: '2027-01-03',
    })
  })
})

describe('os desafios da semana', () => {
  const janela = { inicio: '2026-10-22', fim: '2026-10-28' }
  const c = (iso: string, ilha: 'bosque' | 'vila-doce' | 'recife') => ({
    concluidoEm: new Date(iso),
    ilha,
  })

  test('a ilha mais nova aberta pela posição da jornada', () => {
    expect(posicaoDaIlhaMaisNova(1)).toBe(1)
    expect(posicaoDaIlhaMaisNova(3)).toBe(3)
    expect(posicaoDaIlhaMaisNova(8)).toBe(8)
  })

  test('conta só os aprovados na janela; os de ilhas antes da mais nova', () => {
    const conclusoes = [
      c('2026-10-21T15:00:00Z', 'bosque'), // antes da janela
      c('2026-10-22T03:30:00Z', 'bosque'), // 22 às 00h30 em São Paulo: dentro
      c('2026-10-25T15:00:00Z', 'vila-doce'),
      c('2026-10-28T15:00:00Z', 'vila-doce'),
    ]
    // Posição 3: a mais nova é a Vila Doce; o Bosque é anterior.
    expect(desafiosDaSemana(conclusoes, janela, 3)).toEqual({ aprovados: 3, deIlhasAnteriores: 1 })
    // Posição 4: o Recife abriu, então a Vila Doce também virou anterior.
    expect(desafiosDaSemana(conclusoes, janela, 4)).toEqual({ aprovados: 3, deIlhasAnteriores: 3 })
  })

  test('sem a jornada da criança, "de ilhas anteriores" fica sem número', () => {
    expect(desafiosDaSemana([c('2026-10-25T15:00:00Z', 'bosque')], janela, null)).toEqual({
      aprovados: 1,
      deIlhasAnteriores: null,
    })
  })
})

describe('as criações da semana (A33)', () => {
  const janela = { inicio: '2026-10-22', fim: '2026-10-28' }
  const em = (dia: string) => new Date(`${dia}T15:00:00Z`)
  const aplicada = (
    origem: string,
    criacao: string | null,
    registradoEm: Date,
    objeto = 'geladeira',
    revisao = 2,
  ) => ({ objeto, revisao, origem, criacao, registradoEm })

  test('cada criação conta uma vez, mesmo em dois objetos ou posta de novo', () => {
    expect(
      criacoesDaSemana(
        [
          aplicada('pinta', 'a', em('2026-10-23')),
          aplicada('pinta', 'a', em('2026-10-24'), 'forno', 3),
          aplicada('pinta', 'b', em('2026-10-25')),
          aplicada('molda', 'm', em('2026-10-26'), 'casinha', 4),
          // Galeria e criação guardada não são feitas no Pinta nem no Molda.
          aplicada('galeria', 'forno-classico', em('2026-10-26')),
          aplicada('criacao', 'c', em('2026-10-26')),
        ],
        janela,
      ),
    ).toEqual({ pinta: 2, molda: 1 })
  })

  test('só a janela, pelo dia de São Paulo', () => {
    expect(
      criacoesDaSemana(
        [
          // 22/10 às 02h59 UTC ainda é 21/10 em São Paulo: fica de fora.
          aplicada('pinta', 'velha', new Date('2026-10-22T02:59:00Z')),
          aplicada('pinta', 'nova', new Date('2026-10-22T03:00:00Z')),
          aplicada('molda', 'depois', em('2026-10-29')),
        ],
        janela,
      ),
    ).toEqual({ pinta: 1, molda: 0 })
    expect(criacoesDaSemana([], janela)).toEqual({ pinta: 0, molda: 0 })
  })

  test('linhas de antes da 0024 (sem o id) contam por objeto e revisão', () => {
    expect(
      criacoesDaSemana(
        [
          aplicada('pinta', null, em('2026-10-23'), 'geladeira', 2),
          aplicada('pinta', null, em('2026-10-23'), 'forno', 2),
          aplicada('pinta', null, em('2026-10-24'), 'geladeira', 5),
        ],
        janela,
      ),
    ).toEqual({ pinta: 3, molda: 0 })
  })
})

describe('dias de volta ao curso', () => {
  const janela = { inicio: '2026-10-22', fim: '2026-10-28' }
  const fim = new Date('2026-10-26T20:00:00Z')
  const h = (horas: number) => new Date(fim.getTime() + horas * 3_600_000)

  test('aula depois do fim e até 24 h conta; no fim exato ou depois do prazo, não', () => {
    expect(diasDeVoltaAoCurso([fim], [h(1)], janela)).toBe(1)
    expect(diasDeVoltaAoCurso([fim], [h(24)], janela)).toBe(1)
    expect(diasDeVoltaAoCurso([fim], [new Date(h(24).getTime() + 1)], janela)).toBe(0)
    expect(diasDeVoltaAoCurso([fim], [fim, h(-2)], janela)).toBe(0)
  })

  test('duas sessões no mesmo dia contam uma vez; o dia é o de São Paulo', () => {
    expect(diasDeVoltaAoCurso([fim, h(1)], [h(2)], janela)).toBe(1)
    // 23 h em São Paulo do dia 21: fora da janela, mesmo sendo dia 22 em UTC.
    const vespera = new Date('2026-10-22T02:00:00Z')
    expect(diasDeVoltaAoCurso([vespera], [new Date('2026-10-22T05:00:00Z')], janela)).toBe(0)
  })
})
