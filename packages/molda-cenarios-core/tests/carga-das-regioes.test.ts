import { describe, expect, test } from 'bun:test'
import { criarPlanoDaCarga, type RegiaoDaCarga } from '../src/compilar/carga-das-regioes'

/**
 * Que regiões ficam carregadas enquanto o personagem anda (lote 6 da conclusão, 22/11/2026).
 * Em fila, de oeste a leste: Vila (0 a 100), Floresta (100 a 200), Caverna (200 a 300) e, depois de
 * um vão de 30 m, a Montanha (330 a 430), que não é vizinha de ninguém.
 */
const r = (id: string, nome: string, x0: number, vizinhas: string[]): RegiaoDaCarga => ({
  id,
  nome,
  caixa: { x0, z0: 0, x1: x0 + 100, z1: 100 },
  vizinhas,
})
const REGIOES = [
  r('vila', 'Vila', 0, ['floresta']),
  r('floresta', 'Floresta', 100, ['vila', 'caverna']),
  r('caverna', 'Caverna', 200, ['floresta']),
  r('montanha', 'Montanha', 330, []),
]
const em = (x: number, z = 50) => ({ x, z })

describe('a região atual e as entradas', () => {
  test('começando dentro, a entrada dispara uma vez', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    expect(plano.atualizar(em(50), 0)).toMatchObject({ atual: 'vila', entradas: ['Vila'] })
    expect(plano.atualizar(em(60), 0.1).entradas).toEqual([])
  })

  test('meio metro de tolerância na borda; depois dela, a vizinha', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    plano.atualizar(em(99), 0)
    expect(plano.atualizar(em(100.4), 0.1)).toMatchObject({ atual: 'vila', entradas: [] })
    expect(plano.atualizar(em(100.6), 0.2)).toMatchObject({
      atual: 'floresta',
      entradas: ['Floresta'],
    })
    // Voltar meio metro não devolve à Vila: a Floresta também tem tolerância.
    expect(plano.atualizar(em(99.7), 0.3).atual).toBe('floresta')
  })

  test('fora de todas, a atual é nenhuma e a segura é a última; entrar de novo dispara de novo', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    plano.atualizar(em(150), 0)
    expect(plano.atualizar(em(150, 120), 0.1)).toMatchObject({ atual: null, segura: 'floresta' })
    expect(plano.atualizar(em(150, 90), 0.2)).toMatchObject({
      atual: 'floresta',
      entradas: ['Floresta'],
    })
  })

  test('começando fora, a segura é a mais perto e não há entrada', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    expect(plano.atualizar(em(250, 150), 0)).toMatchObject({
      atual: null,
      segura: 'caverna',
      entradas: [],
    })
  })

  test('reiniciar faz a primeira entrada disparar de novo', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    plano.atualizar(em(50), 0)
    plano.reiniciar()
    expect(plano.atualizar(em(50), 1).entradas).toEqual(['Vila'])
  })
})

describe('o que fica carregado', () => {
  test('a segura e as vizinhas sempre; o resto só perto', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    const estado = plano.atualizar(em(50), 0)
    expect([...estado.obrigatorias].sort()).toEqual(['floresta', 'vila'])
    expect([...estado.carregadas].sort()).toEqual(['floresta', 'vila'])
    // Na Floresta, a 30 m da Caverna: as três vizinhas são obrigatórias, a Montanha longe fica fora.
    expect([...plano.atualizar(em(170), 0.1).carregadas].sort()).toEqual([
      'caverna',
      'floresta',
      'vila',
    ])
  })

  test('a pré-carga entra a até 40 m, ou até a distância da câmera', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    // Na Caverna a 70 m da Montanha: longe demais.
    expect(plano.atualizar(em(260), 0).carregadas.has('montanha')).toBe(false)
    // A 35 m: entra.
    expect(plano.atualizar(em(295), 0.1).carregadas.has('montanha')).toBe(true)
    // A câmera longe (100 m atrás) estica o raio.
    const outro = criarPlanoDaCarga(REGIOES)
    expect(outro.atualizar(em(260), 0, em(160)).carregadas.has('montanha')).toBe(true)
  })

  test('o descarte espera 20 m além do raio e 2 s seguidos longe', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    plano.atualizar(em(295), 0) // na Caverna, a Montanha entra (35 m)
    // 50 m (dentro de 40 + 20): fica.
    expect(plano.atualizar(em(280), 1).carregadas.has('montanha')).toBe(true)
    // 70 m: começa a contar.
    expect(plano.atualizar(em(260), 2).carregadas.has('montanha')).toBe(true)
    expect(plano.atualizar(em(260), 3.9).carregadas.has('montanha')).toBe(true)
    // Chegou perto de novo antes dos 2 s: o relógio zera.
    plano.atualizar(em(275), 3.95)
    expect(plano.atualizar(em(260), 4).carregadas.has('montanha')).toBe(true)
    expect(plano.atualizar(em(260), 5.9).carregadas.has('montanha')).toBe(true)
    expect(plano.atualizar(em(260), 6.01).carregadas.has('montanha')).toBe(false)
  })

  test('foco ou tempo que não é número é recusado', () => {
    const plano = criarPlanoDaCarga(REGIOES)
    expect(() => plano.atualizar(em(Number.NaN), 0)).toThrow()
    expect(() => plano.atualizar(em(1), Number.POSITIVE_INFINITY)).toThrow()
    expect(() => criarPlanoDaCarga([])).toThrow()
  })
})
