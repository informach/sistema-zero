import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { CRESCIMENTO_MS, colher, estagio, plantar, regar } from '../src/sistemas/horta'
import { adicionar, ITENS, itensVisiveis, quantidade, remover } from '../src/sistemas/itens'
import { comer, humor, passarTempo, ritmo } from '../src/sistemas/necessidades'
import { cozinhar, RECEITAS, receitasConhecidas, receitasPossiveis } from '../src/sistemas/receitas'
import { DURACAO_DO_DIA_MS, momentoDoDia, relogio } from '../src/sistemas/tempo-do-dia'
import { minutosRestantes } from '../src/sistemas/tempo-livre'

describe('tempo do dia', () => {
  const comeco = Date.parse('2026-10-27T12:00:00Z')

  test('começa às 6h do dia 1 e escurece aos 12 minutos', () => {
    expect(relogio(momentoDoDia(comeco, comeco))).toBe('06:00')
    expect(momentoDoDia(comeco, comeco).dia).toBe(1)
    expect(momentoDoDia(comeco + 11 * 60_000, comeco).noite).toBe(false)
    expect(momentoDoDia(comeco + 12 * 60_000, comeco).noite).toBe(true)
    expect(relogio(momentoDoDia(comeco + 12 * 60_000, comeco))).toBe('18:00')
  })

  test('a luz é máxima ao meio-dia e zero no meio da noite', () => {
    expect(momentoDoDia(comeco + 6 * 60_000, comeco).luz).toBeCloseTo(1, 2)
    expect(momentoDoDia(comeco + 14 * 60_000, comeco).luz).toBe(0)
  })

  test('o dia vira depois de 16 minutos', () => {
    expect(momentoDoDia(comeco + DURACAO_DO_DIA_MS, comeco).dia).toBe(2)
  })
})

describe('itens e receitas', () => {
  test('adicionar e remover sem ficar negativo', () => {
    const inv = adicionar({}, 'alface', 2)
    expect(quantidade(inv, 'alface')).toBe(2)
    expect(remover(inv, 'alface', 3)).toBeNull()
    expect(remover(inv, 'alface', 2)).toEqual({})
  })

  test('item desconhecido não aparece na mochila', () => {
    expect(itensVisiveis({ alface: 1, 'coisa-do-futuro': 4 }).map((x) => x.item.id)).toEqual([
      'alface',
    ])
  })

  test('salada gasta alface e tomate e faz uma salada', () => {
    const salada = RECEITAS.find((r) => r.id === 'salada')
    if (!salada) throw new Error('sem salada')
    expect(
      receitasPossiveis(
        { alface: 1 },
        'bancada',
        receitasConhecidas(criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))),
      ),
    ).toEqual([])
    expect(cozinhar({ alface: 1, tomate: 2 }, salada)).toEqual({ tomate: 1, salada: 1 })
    expect(cozinhar({ alface: 1 }, salada)).toBeNull()
  })
})

describe('horta', () => {
  const agora = new Date('2026-10-27T12:00:00Z')
  const vazio = { id: 'c1', semente: null, plantadoEm: null, regadoEm: null }

  test('planta, espera ser regada, cresce e colhe', () => {
    const plantado = plantar(vazio, 'alface', agora)
    if (!plantado) throw new Error('não plantou')
    expect(estagio(plantado, agora.getTime() + CRESCIMENTO_MS.alface * 2)).toBe('semente')
    const regado = regar(plantado, agora)
    if (!regado) throw new Error('não regou')
    expect(estagio(regado, agora.getTime() + 1000)).toBe('brotando')
    expect(colher(regado, agora.getTime() + 1000)).toBeNull()
    const maduro = agora.getTime() + CRESCIMENTO_MS.alface
    expect(estagio(regado, maduro)).toBe('maduro')
    const r = colher(regado, maduro)
    expect(r?.item).toBe('alface')
    expect(r?.qtd).toBeGreaterThan(0)
    expect(r?.canteiro.semente).toBeNull()
  })

  test('não planta em cima de outra planta nem rega duas vezes', () => {
    const plantado = plantar(vazio, 'milho', agora)
    if (!plantado) throw new Error('não plantou')
    expect(plantar(plantado, 'tomate', agora)).toBeNull()
    const regado = regar(plantado, agora)
    if (!regado) throw new Error('não regou')
    expect(regar(regado, agora)).toBeNull()
  })
})

describe('necessidades', () => {
  const n = criarSalvamentoInicial(new Date()).necessidades

  test('caem com o tempo, mais rápido correndo, sem passar de 0', () => {
    const andando = passarTempo(n, 60, false)
    const correndo = passarTempo(n, 60, true)
    expect(andando.fome).toBeLessThan(n.fome)
    expect(correndo.energia).toBeLessThan(andando.energia)
    expect(passarTempo(n, 60 * 60 * 10, true).energia).toBe(0)
  })

  test('comer repõe, sem passar de 100', () => {
    const salada = ITENS.salada
    if (!salada) throw new Error('sem salada')
    expect(comer({ fome: 90, energia: 50, diversao: 50 }, salada).fome).toBe(100)
  })

  test('cuidado dá um bônus, mas cansaço conserva o ritmo básico', () => {
    expect(humor({ fome: 80, energia: 80, diversao: 80 })).toBe('otimo')
    expect(ritmo({ fome: 80, energia: 80, diversao: 80 })).toBeGreaterThan(1)
    expect(ritmo({ fome: 80, energia: 5, diversao: 80 })).toBe(1)
    expect(ritmo({ fome: 5, energia: 80, diversao: 80 })).toBe(1)
    for (const fome of [0, 14, 15, 69, 70, 100])
      for (const energia of [0, 14, 15, 69, 70, 100])
        for (const diversao of [0, 14, 15, 69, 70, 100]) {
          const velocidade = ritmo({ fome, energia, diversao })
          expect(velocidade).toBeGreaterThanOrEqual(1)
          expect(velocidade).toBeLessThanOrEqual(1.1)
        }
  })
})

describe('tempo livre', () => {
  test('minutos que faltam (adulto não tem limite)', () => {
    expect(minutosRestantes(30, 0)).toBe(30)
    expect(minutosRestantes(30, 29 * 60 + 1)).toBe(1)
    expect(minutosRestantes(30, 40 * 60)).toBe(0)
    expect(minutosRestantes(null, 999)).toBeNull()
  })
})
