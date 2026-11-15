import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { camadasDoBraco } from '../src/personagem/objeto-na-mao'
import { giroDaRoda, RAIO_DA_RODA, sentidoDaRoda } from '../src/personagem/rodas-dos-patins'
import { CORPO } from '../src/sistemas/corpo'
import {
  AGUA_RASA_A_PARTIR_DE,
  CLIPES_DO_JOGO,
  criarLocomocao,
  duracaoDoEstado,
  type EntradaDaLocomocao,
  POSE_DO_ESTADO,
  passoDaLocomocao,
  pesosDaDirecao,
} from '../src/sistemas/locomocao'

const soma = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0)
const chao = (velocidade: number, extra: Partial<EntradaDaLocomocao> = {}): EntradaDaLocomocao => ({
  velocidade,
  noChao: true,
  velY: 0,
  nadando: false,
  especial: null,
  ...extra,
})
function rodar(l = criarLocomocao(), e: EntradaDaLocomocao, segundos: number) {
  for (let t = 0; t < segundos; t += 1 / 60) passoDaLocomocao(l, e, 1 / 60)
  return l
}

describe('os movimentos que a arte e o pack já tinham', () => {
  test('cada estado novo toca a animação dele, que o catálogo tem', () => {
    const doCatalogo = new Set(AVATAR_CATALOG.base.skeleton.game.clips.map((c) => c.id))
    for (const [estado, clipe] of [
      ['AndarTras', 'andar_tras'],
      ['AndarEsquerda', 'andar_esquerda'],
      ['CorrerDireita', 'correr_direita'],
      ['PenduradoEsquerda', 'andar_pendurado_esquerda'],
      ['AndarNaAgua', 'andar_na_agua'],
      ['Acender', 'acender'],
      ['Empurrar', 'empurrar'],
    ] as const) {
      expect(POSE_DO_ESTADO[estado].clipe, estado).toBe(clipe)
      expect(doCatalogo.has(clipe), clipe).toBe(true)
    }
    for (const c of CLIPES_DO_JOGO) expect(doCatalogo.has(c), c).toBe(true)
  })

  test('a direção dos passos: frente, costas e lados somam 1', () => {
    expect(pesosDaDirecao(2, 0)).toEqual({ frente: 1, tras: 0, direita: 0, esquerda: 0 })
    expect(pesosDaDirecao(-2, 0).tras).toBeCloseTo(1)
    expect(pesosDaDirecao(0, 2).direita).toBeCloseTo(1)
    expect(pesosDaDirecao(0, -2).esquerda).toBeCloseTo(1)
    expect(soma(pesosDaDirecao(1, 1))).toBeCloseTo(1)
    expect(pesosDaDirecao(0, 0).frente).toBe(1)
  })

  test('na virada, andando para trás e para o lado, os passos de costas e de lado', () => {
    const tras = rodar(undefined, chao(2.2, { frente: -2.2, deLado: 0 }), 1)
    expect(tras.pesos.AndarTras).toBeCloseTo(1, 1)
    expect(soma(tras.pesos)).toBeCloseTo(1)
    const lado = rodar(undefined, chao(4.6, { frente: 0, deLado: -4.6 }), 1)
    expect(lado.pesos.CorrerEsquerda).toBeCloseTo(1, 1)
    // Andando para a frente, como sempre.
    const frente = rodar(undefined, chao(2.2, { frente: 2.2, deLado: 0 }), 1)
    expect(frente.pesos.Andar).toBeCloseTo(1, 1)
  })

  test('pendurada, andar pela quina toca as mãos passando; parada, pendurada', () => {
    const borda = (deLado: number): EntradaDaLocomocao => ({
      ...chao(Math.abs(deLado), { deLado }),
      especial: 'borda',
    })
    expect(rodar(undefined, borda(0.8), 1).pesos.PenduradoDireita).toBeCloseTo(1)
    expect(rodar(undefined, borda(-0.8), 1).pesos.PenduradoEsquerda).toBeCloseTo(1)
    expect(rodar(undefined, borda(0), 1).pesos.PendurarBorda).toBeCloseTo(1)
  })

  test('na água rasa, empurrando e acendendo, o estado de cada um', () => {
    expect(AGUA_RASA_A_PARTIR_DE).toBeGreaterThan(0)
    expect(rodar(undefined, chao(2.2, { naAguaRasa: true }), 1).pesos.AndarNaAgua).toBeCloseTo(1)
    expect(rodar(undefined, chao(1.5, { empurrando: true }), 1).pesos.Empurrar).toBeCloseTo(1)
    // Empurrar vence a água rasa (ela empurra o tronco dentro do lago).
    expect(
      rodar(undefined, chao(1.5, { empurrando: true, naAguaRasa: true }), 1).pesos.Empurrar,
    ).toBeCloseTo(1)
    // Acender: parada, o gesto no lugar do "Parado", uma vez (o tempo para no fim).
    const l = rodar(undefined, chao(0, { acendendo: true }), duracaoDoEstado('Acender') + 0.5)
    expect(l.pesos.Acender).toBeCloseTo(1)
    expect(l.tempos.Acender).toBe(1)
    rodar(l, chao(0), 1)
    expect(l.pesos.Parado).toBeCloseTo(1)
    expect(l.tempos.Acender).toBe(0)
  })
})

describe('as rodas dos patins, o braço com a lanterna e os encaixes', () => {
  test('as rodas giram pela distância, em sentidos opostos pela tampa', () => {
    expect(sentidoDaRoda('Roda_E_frente_fora')).toBe(1)
    expect(sentidoDaRoda('Roda_E_tras_dentro')).toBe(-1)
    expect(sentidoDaRoda('Roda_D_frente_fora')).toBe(-1)
    expect(sentidoDaRoda('Roda_D_tras_dentro')).toBe(1)
    // Uma volta inteira a cada perímetro da roda (na escala do mundo).
    const perimetro = 2 * Math.PI * RAIO_DA_RODA * CORPO.medidas.scale
    expect(giroDaRoda(perimetro)).toBeCloseTo(2 * Math.PI, 9)
  })

  test('a lanterna tem as camadas do braço, cada uma presa a um clipe do jogo', () => {
    const camadas = camadasDoBraco('mao_lanterna')
    expect(camadas.length).toBeGreaterThan(0)
    for (const c of camadas) {
      expect(CLIPES_DO_JOGO as readonly string[], c.id).toContain(c.clipe)
      expect(c.bones).toContain('RightArm')
    }
    expect(camadas.map((c) => c.clipe)).toContain('parado_relaxado')
    expect(camadasDoBraco('mao_barra_planador')).toEqual([])
  })

  test('a câmera mira os olhos e o passarinho pousa no topo, pelos encaixes da arte', () => {
    const s = AVATAR_CATALOG.base.skeleton.sockets
    const escala = CORPO.medidas.scale
    expect(CORPO.doCentro.olhos + CORPO.doCentroAoPe).toBeCloseTo(
      (s.olhos?.rest?.[1] ?? 0) * escala,
      9,
    )
    expect(CORPO.doCentro.topo + CORPO.doCentroAoPe).toBeCloseTo(
      (s.cabeca_topo?.rest?.[1] ?? 0) * escala,
      9,
    )
    expect(CORPO.doCentro.olhos).toBeLessThan(CORPO.doCentro.topo)
  })
})
