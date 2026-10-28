import { describe, expect, test } from 'bun:test'
import {
  BEIRADAS,
  BLOCOS,
  DEGRAUS,
  ESTACOES,
  FIM_DAS_PLATAFORMAS,
  LAGUINHO,
  METADE_DA_SALA,
  RAMPAS,
  VAOS,
} from '../playground/sala-de-movimento'
import { GRAVIDADE } from '../src/mundo/medidas'
import {
  alcanceDoPulo,
  alcanceMaximoDoPulo,
  alturaDoPulo,
  beiradaMaximaDoPulo,
  CORPO,
} from '../src/sistemas/corpo'
import { RITMO } from '../src/sistemas/necessidades'

describe('o alcance do pulo', () => {
  test('a altura e o alcance sem ajuda saem da velocidade do pulo e da gravidade', () => {
    // 8,5 m/s para cima com gravidade 24: sobe 1,5 m e fica 0,71 s no ar.
    expect(alturaDoPulo(GRAVIDADE)).toBeCloseTo(1.505, 3)
    expect(alcanceDoPulo(CORPO.correr, GRAVIDADE)).toBeCloseTo(4.6 * (17 / 24), 6)
  })

  test('com as ajudas do corpo, alcança mais longe e mais alto', () => {
    expect(alcanceMaximoDoPulo(CORPO.correr, GRAVIDADE)).toBeGreaterThan(
      alcanceDoPulo(CORPO.correr, GRAVIDADE) + 2 * CORPO.raio,
    )
    expect(beiradaMaximaDoPulo(GRAVIDADE)).toBeCloseTo(alturaDoPulo(GRAVIDADE) + CORPO.degrau, 6)
  })
})

describe('a sala de testes do movimento: cada estação tem um que passa e um que não passa', () => {
  test('degraus: o último que sobe fica abaixo do degrau automático, o outro acima', () => {
    expect(DEGRAUS[2]).toBeLessThan(CORPO.degrau)
    expect(DEGRAUS[3]).toBeGreaterThan(CORPO.degrau)
  })

  test('rampas: uma abaixo do limite de subir e uma entre subir e escorregar', () => {
    expect(RAMPAS[1]).toBeLessThan(CORPO.sobeAte)
    expect(RAMPAS[2]).toBeGreaterThan(CORPO.sobeAte)
    expect(RAMPAS[2]).toBeLessThan(CORPO.escorregaAcimaDe)
  })

  test('beiradas: o pulo sozinho, o pulo com o degrau no ar e alta demais', () => {
    const pulo = alturaDoPulo(GRAVIDADE)
    expect(BEIRADAS[0]).toBeLessThan(pulo)
    expect(BEIRADAS[1]).toBeGreaterThan(pulo)
    expect(BEIRADAS[1]).toBeLessThan(beiradaMaximaDoPulo(GRAVIDADE))
    expect(BEIRADAS[2]).toBeGreaterThan(beiradaMaximaDoPulo(GRAVIDADE))
  })

  test('vãos: andando, só correndo e nem correndo (com o humor mais rápido)', () => {
    const andando = CORPO.andar * RITMO.otimo
    const correndo = CORPO.correr * RITMO.otimo
    expect(VAOS[0]).toBeLessThan(alcanceDoPulo(CORPO.andar, GRAVIDADE))
    expect(VAOS[1]).toBeGreaterThan(alcanceMaximoDoPulo(andando, GRAVIDADE))
    expect(VAOS[1]).toBeLessThan(alcanceDoPulo(CORPO.correr, GRAVIDADE))
    expect(VAOS[2]).toBeGreaterThan(alcanceMaximoDoPulo(correndo, GRAVIDADE))
  })

  test('o laguinho é fundo o bastante para nadar e tudo cabe dentro das paredes', () => {
    // De pé no fundo, a água passa da cintura (0,55 m do pé) com folga.
    expect(LAGUINHO.fundo - -LAGUINHO.agua).toBeGreaterThan(0.55 + 0.12)
    expect(FIM_DAS_PLATAFORMAS).toBeLessThan(METADE_DA_SALA)
    for (const b of BLOCOS) {
      // As paredes de fora encostam no limite; o resto fica dentro.
      expect(Math.abs(b.centro[0])).toBeLessThanOrEqual(METADE_DA_SALA + 0.5)
      expect(Math.abs(b.centro[2])).toBeLessThanOrEqual(METADE_DA_SALA + 0.5)
    }
    for (const e of ESTACOES) {
      expect(Math.abs(e.x)).toBeLessThan(METADE_DA_SALA - 1)
      expect(Math.abs(e.z)).toBeLessThan(METADE_DA_SALA - 1)
    }
  })
})
