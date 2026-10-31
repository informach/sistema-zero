import { describe, expect, test } from 'bun:test'
import {
  type Canteiro,
  CRESCIMENTO_DO_PRIMEIRO_PEDIDO_MS,
  CRESCIMENTO_MS,
  criarSalvamentoInicial,
  estagio,
  ilha,
  noTempoDoPrimeiroPedido,
  progresso,
} from '@sistemazero/arquipelago-contracts'
import {
  CHANCE_DO_CLIMA_NATURAL,
  climaEfetivo,
  climaNatural,
  FALA_DO_CLIMA,
} from '../src/sistemas/clima'
import { geladeiraEm } from '../src/sistemas/horta'
import { primeiroPedido } from '../src/sistemas/primeiro-pedido'
import { DURACAO_DO_DIA_MS } from '../src/sistemas/tempo-do-dia'

const HORA = 60 * 60 * 1000
const AGORA = Date.parse('2026-10-30T12:00:00Z')
const regadoHa = (ms: number): Canteiro => ({
  id: 'c1',
  semente: 'alface',
  plantadoEm: new Date(AGORA - ms).toISOString(),
  regadoEm: new Date(AGORA - ms).toISOString(),
})

describe('a horta: planta hoje, colhe amanhã', () => {
  test('os tempos são de horas de verdade', () => {
    expect(CRESCIMENTO_MS).toEqual({ alface: 4 * HORA, tomate: 8 * HORA, milho: 16 * HORA })
    expect(estagio(regadoHa(3 * HORA), AGORA)).toBe('crescendo')
    expect(estagio(regadoHa(4 * HORA), AGORA)).toBe('maduro')
  })

  test('com o primeiro pedido aberto, a horta cresce no tempo do tutorial', () => {
    const c = regadoHa(CRESCIMENTO_DO_PRIMEIRO_PEDIDO_MS.alface)
    expect(estagio(c, AGORA, null)).toBe('maduro')
    expect(estagio(c, AGORA)).toBe('brotando')
    // O guia do primeiro pedido vê a planta madura e pede para colher.
    const s = { ...criarSalvamentoInicial(new Date(AGORA)), horta: [c] }
    s.casa = { portaNova: true }
    expect(primeiroPedido(s, AGORA)?.etapa).toBe('colher')
  })

  test('o que foi regado antes de ganhar a geladeira não encolhe depois', () => {
    const c = regadoHa(10 * 60 * 1000)
    const ganhaAgora = new Date(AGORA).toISOString()
    expect(noTempoDoPrimeiroPedido(c, ganhaAgora)).toBe(true)
    expect(progresso(c, AGORA, ganhaAgora)).toBe(1)
    // Regado depois da geladeira: o tempo de sempre.
    const depois = new Date(AGORA - 20 * 60 * 1000).toISOString()
    expect(noTempoDoPrimeiroPedido(c, depois)).toBe(false)
    expect(progresso(c, AGORA, depois)).toBeLessThan(0.1)
    expect(geladeiraEm(criarSalvamentoInicial(new Date(AGORA)))).toBeNull()
  })
})

describe('o clima natural antes das Nuvens', () => {
  test('um clima por dia do jogo, igual em qualquer aparelho, com mais sol que chuva', () => {
    const conta = { sol: 0, nublado: 0, chuva: 0 }
    for (let dia = 1; dia <= 2000; dia++) {
      const c = climaNatural(dia)
      expect(c).toBe(climaNatural(dia))
      conta[c]++
    }
    for (const c of ['sol', 'nublado', 'chuva'] as const)
      expect(Math.abs(conta[c] / 2000 - CHANCE_DO_CLIMA_NATURAL[c])).toBeLessThan(0.05)
  })

  test('antes das Nuvens vale o natural; depois, o escolhido; na visita, sol', () => {
    const s = criarSalvamentoInicial(new Date(AGORA))
    s.clima = 'chuva'
    const abre = ilha('nuvens').posicao
    const dias = Array.from({ length: 30 }, (_, i) => AGORA + i * DURACAO_DO_DIA_MS)
    const antes = dias.map((t) =>
      climaEfetivo({ jornada: abre - 1, visita: null, salvamento: s }, t),
    )
    expect(new Set(antes).size).toBeGreaterThan(1)
    for (const t of dias) {
      expect(climaEfetivo({ jornada: abre, visita: null, salvamento: s }, t)).toBe('chuva')
      expect(climaEfetivo({ jornada: abre, visita: { casa: 1 }, salvamento: s }, t)).toBe('sol')
    }
  })

  test('as falas do clima seguem as regras da casa', () => {
    for (const t of Object.values(FALA_DO_CLIMA)) expect(t).not.toMatch(/[—–!]/)
  })
})
