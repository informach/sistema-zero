import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { MUNDO_ATUAL } from '../src/mundo/mundo-do-jogo'
import { MUNDO, mundoPedido } from '../src/mundo/mundo-escolhido'
import { CORPO, corpoDoMundo } from '../src/sistemas/corpo'
import { RITMO_MAXIMO } from '../src/sistemas/locomocao'
import {
  FATORES_DA_AVENTURA,
  GRAVIDADE_DE_VERDADE,
  MUNDO_DA_AVENTURA,
  mundoPelaAnimacao,
  velocidadeNatural,
} from '../src/sistemas/mundo-pela-animacao'

const clipe = (id: string) => {
  const c = AVATAR_CATALOG.base.skeleton.game.clips.find((x) => x.id === id)
  if (!c) throw new Error(id)
  return c
}

describe('o mundo novo pelas animações do pack', () => {
  test('o avatar no tamanho de verdade, com a gravidade de verdade', () => {
    expect(MUNDO_DA_AVENTURA.escalaDoHeroi).toBe(1)
    expect(MUNDO_DA_AVENTURA.gravidade).toBe(GRAVIDADE_DE_VERDADE)
  })

  test('andar, correr e nadar: a velocidade natural do clipe vezes o fator do jogo', () => {
    const andar = clipe('andar_frente')
    expect(velocidadeNatural(AVATAR_CATALOG, 'andar_frente')).toBeCloseTo(
      andar.stride / andar.duration,
      9,
    )
    expect(MUNDO_DA_AVENTURA.andar).toBeCloseTo(
      velocidadeNatural(AVATAR_CATALOG, 'andar_frente') * FATORES_DA_AVENTURA.andar,
      9,
    )
    expect(MUNDO_DA_AVENTURA.correr).toBeGreaterThan(MUNDO_DA_AVENTURA.andar)
    expect(MUNDO_DA_AVENTURA.nadar).toBeGreaterThan(0)
    // Nenhum passa do ritmo em que as pernas acompanham (o pé não escorrega).
    for (const [id, v] of [
      ['andar_frente', MUNDO_DA_AVENTURA.andar],
      ['correr_frente', MUNDO_DA_AVENTURA.correr],
      ['nadar', MUNDO_DA_AVENTURA.nadar],
    ] as const) {
      const c = clipe(id)
      expect(v / c.stride, id).toBeLessThanOrEqual(RITMO_MAXIMO / c.duration + 1e-9)
    }
  })

  test('o pulo chega à altura que o quadril sobe no clipe', () => {
    const altura = MUNDO_DA_AVENTURA.pulo ** 2 / (2 * MUNDO_DA_AVENTURA.gravidade)
    expect(altura).toBeCloseTo(clipe('pulo_inicio').rise, 6)
  })

  test('degrau, rampas, folga e mãos: os de hoje, na proporção do corpo', () => {
    const p = 1 / MUNDO_ATUAL.escalaDoHeroi
    expect(MUNDO_DA_AVENTURA.degrau).toBeCloseTo(MUNDO_ATUAL.degrau * p, 9)
    expect(MUNDO_DA_AVENTURA.folga).toBeCloseTo(MUNDO_ATUAL.folga * p, 9)
    expect(MUNDO_DA_AVENTURA.maosNaBorda).toBeCloseTo(MUNDO_ATUAL.maosNaBorda * p, 9)
    expect(MUNDO_DA_AVENTURA.sobeAte).toBe(MUNDO_ATUAL.sobeAte)
    // O corpo do mundo novo é o de hoje encolhido na mesma proporção.
    const corpo = corpoDoMundo(AVATAR_CATALOG, MUNDO_DA_AVENTURA)
    expect(corpo.meiaAltura).toBeCloseTo(CORPO.meiaAltura * p, 6)
    expect(corpo.raio).toBeCloseTo(CORPO.raio * p, 6)
  })

  test('fatores e escala são parâmetros (um mundo noutra escala)', () => {
    const dobro = mundoPelaAnimacao(AVATAR_CATALOG, 'x', 2, { ...FATORES_DA_AVENTURA, correr: 1 })
    expect(dobro.correr).toBeCloseTo(velocidadeNatural(AVATAR_CATALOG, 'correr_frente') * 2, 9)
  })

  test('o jogo roda no mundo de hoje; só o playground pede o novo', () => {
    expect(MUNDO).toBe(MUNDO_ATUAL)
    expect(mundoPedido('aventura')).toBe(MUNDO_DA_AVENTURA)
    for (const outro of [null, undefined, '', 'outro', 1, 'constructor'])
      expect(mundoPedido(outro)).toBe(MUNDO_ATUAL)
  })
})
