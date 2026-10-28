import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import {
  desafiosDaSemana,
  janelaDaSemana,
  objetosCriados,
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

describe('os objetos criados por ela', () => {
  const inicial = criarSalvamentoInicial(new Date('2026-10-20T15:00:00Z'))
  const ganho = '2026-10-21T15:00:00.000Z'

  test('projetos azuis com aparência do Pinta e do Molda; galeria e sem aparência não contam', () => {
    const salvamento = {
      ...inicial,
      projetos: {
        geladeira: { ganhoEm: ganho, aparencia: { origem: 'pinta' as const, id: 'a' } },
        casinha: { ganhoEm: ganho, aparencia: { origem: 'molda' as const, id: 'b' } },
        forno: { ganhoEm: ganho, aparencia: { origem: 'galeria' as const, id: 'c' } },
        aquario: { ganhoEm: ganho, aparencia: null },
      },
    }
    expect(objetosCriados(salvamento)).toEqual({ pinta: 1, molda: 1 })
    expect(objetosCriados(inicial)).toEqual({ pinta: 0, molda: 0 })
  })

  test('salvamento ilegível: sem número', () => {
    expect(objetosCriados({ versao: 99 })).toBeNull()
  })
})
