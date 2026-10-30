import { describe, expect, test } from 'bun:test'
import type { Canteiro } from '@sistemazero/arquipelago-contracts'
import { VOZ_ADULTA } from '../src/adulto/voz-adulta'
import { VOZ_KIDS } from '../src/interface/voz'
import { ilhasEmVolta } from '../src/mundo/medidas'
import { CRESCIMENTO_MS } from '../src/sistemas/horta'
import {
  comAtalhos,
  ilhaMaisPerto,
  lembretesDeAgora,
  progressoDoQuadro,
  teclaDoAtalho,
} from '../src/sistemas/hud'
import type { Quadro } from '../src/sistemas/quadro-das-cores'

const ANEL = ilhasEmVolta().map((i) => ({ id: i.ilha.id, ...i.centro }))
const AGORA = Date.parse('2026-10-29T12:00:00Z')
const BEM = { fome: 80, energia: 80, diversao: 80 }

function canteiro(c: Partial<Canteiro>): Canteiro {
  return { id: 'c', semente: null, plantadoEm: null, regadoEm: null, ...c }
}

describe('a ilha onde a pessoa está', () => {
  test('no meio do mundo é a sua ilha, no centro de cada ilha do anel é ela', () => {
    expect(ilhaMaisPerto({ x: 3, z: -4 }, ANEL)).toBe('sua-ilha')
    for (const i of ANEL) expect(ilhaMaisPerto(i, ANEL)).toBe(i.id)
  })

  test('na ponte vale a ponta mais perto', () => {
    const bosque = ANEL.find((i) => i.id === 'bosque')!
    expect(ilhaMaisPerto({ x: bosque.x * 0.3, z: bosque.z * 0.3 }, ANEL)).toBe('sua-ilha')
    expect(ilhaMaisPerto({ x: bosque.x * 0.7, z: bosque.z * 0.7 }, ANEL)).toBe('bosque')
  })
})

describe('o Quadro das Cores no alto', () => {
  const quadro = (estado: Quadro['estado'], numero: number): Quadro => ({
    numero,
    estado,
    desafio: null,
  })

  test('conta os feitos dos seis', () => {
    const q = ['feito', 'feito', 'disponivel', 'trancado', 'feito', 'vazio'] as const
    expect(progressoDoQuadro(q.map((e, i) => quadro(e, i + 1)))).toEqual({
      feitos: 3,
      total: 6,
      acesos: [true, true, false, false, true, false],
    })
  })

  test('ilha sem nenhum desafio não mostra o quadro', () => {
    expect(progressoDoQuadro(Array.from({ length: 6 }, (_, i) => quadro('vazio', i + 1)))).toBe(
      null,
    )
  })
})

describe('o "Agora"', () => {
  const base = {
    portaNova: true,
    necessidades: BEM,
    horta: [] as Canteiro[],
    agoraMs: AGORA,
    desafioDeHoje: null,
  }

  test('sem nada esperando, fica vazio (e o cartão some)', () => {
    expect(lembretesDeAgora(base)).toEqual([])
  })

  test('lembra a porta, a fome e o cansaço antes da horta, no máximo três', () => {
    const lista = lembretesDeAgora({
      ...base,
      portaNova: false,
      necessidades: { fome: 10, energia: 10, diversao: 80 },
      horta: [canteiro({ semente: 'alface', plantadoEm: new Date(AGORA).toISOString() })],
      desafioDeHoje: 'pronto',
    })
    expect(lista.map((l) => l.id)).toEqual(['porta', 'fome', 'energia'])
  })

  test('a horta: regar o que foi plantado e colher o que amadureceu', () => {
    const plantado = new Date(AGORA - 1000).toISOString()
    const regadoHaMuito = new Date(AGORA - CRESCIMENTO_MS.alface - 1000).toISOString()
    const lista = lembretesDeAgora({
      ...base,
      horta: [
        canteiro({ semente: 'alface', plantadoEm: plantado }),
        canteiro({ semente: 'milho', plantadoEm: plantado }),
        canteiro({ semente: 'alface', plantadoEm: regadoHaMuito, regadoEm: regadoHaMuito }),
      ],
      desafioDeHoje: 'pronto',
    })
    expect(lista).toEqual([
      { id: 'regar', texto: 'Regar os 2 canteiros plantados' },
      { id: 'colher', texto: 'Colher o que amadureceu na horta' },
      { id: 'desafio', texto: 'Fazer o desafio de hoje no Quadro das Cores' },
    ])
  })

  test('desafio de hoje feito ou sem lista não vira lembrete', () => {
    expect(lembretesDeAgora({ ...base, desafioDeHoje: 'feito' })).toEqual([])
    expect(lembretesDeAgora({ ...base, desafioDeHoje: 'nenhum' })).toEqual([])
  })

  test('primeiro pedido precede o desafio sem duplicar a instrução da horta', () => {
    const lista = lembretesDeAgora({
      ...base,
      primeiroPedido: 'Regue o canteiro que você plantou na sua horta.',
      horta: [canteiro({ semente: 'alface', plantadoEm: new Date(AGORA).toISOString() })],
      desafioDeHoje: 'pronto',
    })
    expect(lista.map((l) => l.id)).toEqual(['primeiro-pedido', 'desafio'])
    expect(
      lembretesDeAgora({ ...base, portaNova: false, primeiroPedido: 'Abra a porta.' })[0]?.id,
    ).toBe('porta')
  })

  test('os textos seguem as regras da casa (sem travessão, sem exclamação, sem pergunta)', () => {
    const tudo = lembretesDeAgora({
      ...base,
      portaNova: false,
      necessidades: { fome: 0, energia: 0, diversao: 0 },
    })
    for (const l of tudo) expect(l.texto).not.toMatch(/[—!?]/)
  })
})

describe('os atalhos da mochila', () => {
  test('o que faz alguma coisa vem primeiro, com as teclas de 1 a 5', () => {
    const itens = ['semente', 'maca', 'patins', 'tomate', 'pao', 'lanterna', 'bolo', 'suco']
    const usaveis = new Set(['maca', 'patins', 'pao', 'lanterna', 'bolo', 'suco'])
    const lista = comAtalhos(itens, (i) => usaveis.has(i))
    expect(lista.map((l) => [l.item, l.tecla])).toEqual([
      ['maca', 1],
      ['patins', 2],
      ['pao', 3],
      ['lanterna', 4],
      ['bolo', 5],
      ['suco', null],
      ['semente', null],
      ['tomate', null],
    ])
  })

  test('as teclas: fileira de cima e teclado numérico, só de 1 a 5', () => {
    expect(teclaDoAtalho('Digit1')).toBe(1)
    expect(teclaDoAtalho('Numpad5')).toBe(5)
    expect(teclaDoAtalho('Digit6')).toBe(null)
    expect(teclaDoAtalho('Digit0')).toBe(null)
    expect(teclaDoAtalho('KeyE')).toBe(null)
  })
})

describe('o marco da jornada no cartão de quem joga', () => {
  test('no Kids é o nome do posto; no adulto, a etapa', () => {
    expect(VOZ_KIDS.marcoDaJornada(1)).toBe('Faísca')
    expect(VOZ_KIDS.marcoDaJornada(3)).toBe('Inventor(a)')
    expect(VOZ_KIDS.marcoDaJornada(8)).toBe('Lenda')
    expect(VOZ_ADULTA.marcoDaJornada(4)).toBe('Etapa 4')
  })

  test('posição fora da régua fica na beirada', () => {
    expect(VOZ_KIDS.marcoDaJornada(0)).toBe('Faísca')
    expect(VOZ_KIDS.marcoDaJornada(99)).toBe('Lenda')
    expect(VOZ_ADULTA.marcoDaJornada(Number.NaN)).toBe('Etapa 1')
  })
})
