import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { CORPO } from '../src/sistemas/corpo'
import {
  AR_PARA_ATERRISSAR,
  CICLO_DA_ESCADA,
  CICLO_DE_ANDAR,
  CICLO_DE_CORRER,
  CICLO_DE_ESCALAR,
  CLIPES_DO_JOGO,
  ciclosPorSegundo,
  criarLocomocao,
  criarPoseDosClipes,
  DURACAO_DO_CLIPE,
  type EntradaDaLocomocao,
  ESTADOS,
  POSE_DO_ESTADO,
  passoDaLocomocao,
  pesosNoChao,
  poseDosClipes,
  QUEDA_LONGA,
  RITMO_MAXIMO,
  VELOCIDADE_DO_ANDAR,
  VELOCIDADE_DO_CORRER,
} from '../src/sistemas/locomocao'

const soma = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0)
const chao = (velocidade: number): EntradaDaLocomocao => ({
  velocidade,
  noChao: true,
  velY: 0,
  nadando: false,
  especial: null,
})
const ar = (velY: number, velocidade = 0): EntradaDaLocomocao => ({
  velocidade,
  noChao: false,
  velY,
  nadando: false,
  especial: null,
})

function rodar(l = criarLocomocao(), e: EntradaDaLocomocao, segundos: number) {
  for (let t = 0; t < segundos; t += 1 / 60) passoDaLocomocao(l, e, 1 / 60)
  return l
}

describe('os clipes do pack no catálogo', () => {
  test('cada estado toca um clipe que o catálogo tem, num pedaço válido dele', () => {
    const doCatalogo = new Set(AVATAR_CATALOG.base.skeleton.game.clips.map((c) => c.id))
    for (const c of CLIPES_DO_JOGO) expect(doCatalogo.has(c)).toBe(true)
    for (const estado of ESTADOS) {
      const p = POSE_DO_ESTADO[estado]
      expect(CLIPES_DO_JOGO).toContain(p.clipe)
      expect(p.de).toBeGreaterThanOrEqual(0)
      expect(p.ate).toBeLessThanOrEqual(1)
      expect(p.ate).toBeGreaterThanOrEqual(p.de)
    }
  })

  test('as passadas são as medidas no clipe vezes a escala do herói', () => {
    const andar = AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === 'andar_frente')
    expect(CICLO_DE_ANDAR.passada).toBeCloseTo((andar?.stride ?? 0) * CORPO.medidas.scale, 6)
    expect(CICLO_DE_ANDAR.duracao).toBe(DURACAO_DO_CLIPE.andar_frente)
    expect(CICLO_DE_CORRER.passada).toBeGreaterThan(CICLO_DE_ANDAR.passada)
    expect(CICLO_DA_ESCADA.passada).toBeGreaterThan(0)
    expect(CICLO_DE_ESCALAR).toBe(CICLO_DA_ESCADA)
  })
})

describe('pesos no chão', () => {
  test('parado é só o Parado; andar e correr inteiros nas velocidades do mundo', () => {
    expect(VELOCIDADE_DO_ANDAR).toBe(CORPO.andar)
    expect(VELOCIDADE_DO_CORRER).toBe(CORPO.correr)
    expect(pesosNoChao(0)).toEqual({ Parado: 1, Andar: 0, Correr: 0 })
    expect(pesosNoChao(VELOCIDADE_DO_ANDAR).Andar).toBeCloseTo(1)
    expect(pesosNoChao(VELOCIDADE_DO_CORRER).Correr).toBeCloseTo(1)
    for (const v of [0.3, 1, 2.2, 3, 4.6, 7]) expect(soma(pesosNoChao(v))).toBeCloseTo(1)
  })

  test('a fase anda pela distância, até o dobro da cadência do clipe', () => {
    // Devagar, um ciclo a cada passada: o pé não patina.
    expect(ciclosPorSegundo(1)).toBeCloseTo(1 / CICLO_DE_ANDAR.passada, 3)
    // Andando no mundo de hoje, ainda sem escorregar (abaixo do teto).
    expect(ciclosPorSegundo(VELOCIDADE_DO_ANDAR)).toBeCloseTo(
      VELOCIDADE_DO_ANDAR / CICLO_DE_ANDAR.passada,
      3,
    )
    // Muito rápido: as pernas não giram além do teto (a passada estica).
    expect(ciclosPorSegundo(20)).toBeCloseTo(RITMO_MAXIMO / CICLO_DE_CORRER.duracao, 6)
  })
})

describe('máquina de estados', () => {
  test('os pesos somam 1 e chegam ao alvo no tempo da transição', () => {
    const l = rodar(undefined, chao(4.6), 0.5)
    expect(l.pesos.Correr).toBeCloseTo(1)
    expect(soma(l.pesos)).toBeCloseTo(1)
    rodar(l, chao(0), 0.5)
    expect(l.pesos.Parado).toBeCloseTo(1)
  })

  test('pulo: o empurrão, a pose no ar até descer, e a aterrissagem', () => {
    const l = rodar(undefined, chao(0), 0.3)
    passoDaLocomocao(l, ar(8), 1 / 60)
    expect(l.pulou).toBe(true)
    rodar(l, ar(6), 0.1)
    expect(l.pesos.Pulo).toBeGreaterThan(0.6)
    rodar(l, ar(2), 0.4)
    expect(l.pesos.NoAr).toBeGreaterThan(0.9)
    rodar(l, ar(-6), 0.3)
    // Um pulo comum desce na pose do ar (a queda é só para quedas longas).
    expect(l.pesos.NoAr).toBeGreaterThan(0.9)
    expect(l.pesos.Queda).toBe(0)
    passoDaLocomocao(l, chao(0), 1 / 60)
    expect(l.pesos.Aterrissagem).toBeGreaterThan(0.8)
    rodar(l, chao(0), 0.6)
    expect(l.pesos.Aterrissagem).toBe(0)
    expect(l.pesos.Parado).toBeCloseTo(1)
  })

  test('caindo de longe: depois de um tempo descendo, a queda', () => {
    const l = rodar(undefined, ar(-8), QUEDA_LONGA + 0.3)
    expect(l.pesos.Queda).toBeGreaterThan(0.9)
    expect(soma(l.pesos)).toBeCloseTo(1)
  })

  test('descer um degrau (pouco tempo no ar) não troca a animação nem aterrissa', () => {
    const l = rodar(undefined, chao(2.2), 0.5)
    rodar(l, ar(-2, 2.2), 0.1)
    expect(l.pesos.NoAr).toBe(0)
    expect(l.pesos.Queda).toBe(0)
    passoDaLocomocao(l, chao(2.2), 1 / 60)
    expect(l.noAr).toBe(0)
    expect(l.pesos.Aterrissagem).toBe(0)
    expect(AR_PARA_ATERRISSAR).toBeGreaterThan(0.1)
  })

  test('pendurada no cipó, e soltar cai e aterrissa', () => {
    const l = rodar(
      undefined,
      { velocidade: 0, noChao: true, velY: 0, nadando: false, especial: 'cipo' },
      0.5,
    )
    expect(l.pesos.Corda).toBeCloseTo(1)
    rodar(l, ar(-5, 3), 0.5)
    expect(l.pesos.NoAr).toBeGreaterThan(0.9)
    passoDaLocomocao(l, chao(0), 1 / 60)
    expect(l.pesos.Aterrissagem).toBeGreaterThan(0)
  })

  test('na escada: o ciclo de subir anda pela distância e para quando ela para', () => {
    const subindo = {
      velocidade: 0.3,
      noChao: true,
      velY: 0,
      nadando: false,
      especial: 'escada' as const,
    }
    const l = rodar(undefined, subindo, 0.5)
    expect(l.pesos.SubirEscada).toBeCloseTo(1)
    const antes = l.tempos.SubirEscada
    rodar(l, { ...subindo, velocidade: 0 }, 0.5)
    expect(l.tempos.SubirEscada).toBeCloseTo(antes)
    rodar(l, subindo, CICLO_DA_ESCADA.passada / 0.3 / 2)
    expect((l.tempos.SubirEscada - antes + 1) % 1).toBeCloseTo(0.5, 1)
  })

  test('na água: nadando para a frente ou boiando', () => {
    const agua = { velocidade: 2.6, noChao: false, velY: 0, nadando: true, especial: null }
    const l = rodar(undefined, agua, 1)
    expect(l.pesos.Nado).toBeCloseTo(1)
    expect(soma(l.pesos)).toBeCloseTo(1)
    rodar(l, { ...agua, velocidade: 0 }, 1)
    expect(l.pesos.NadoParado).toBeCloseTo(1)
    expect(soma(l.pesos)).toBeCloseTo(1)
  })

  test('cada modo especial tem o estado dele (planador, montaria, descanso, tronco caído)', () => {
    const modo = (especial: EntradaDaLocomocao['especial'], velocidade = 0) =>
      rodar(undefined, { velocidade, noChao: true, velY: 0, nadando: false, especial }, 1).pesos
    expect(modo('planar').Planar).toBeCloseTo(1)
    expect(modo('montar').Montar).toBeCloseTo(1)
    expect(modo('sentar').Sentar).toBeCloseTo(1)
    expect(modo('deitar').Deitar).toBeCloseTo(1)
    expect(modo('escalada', 0.5).Escalar).toBeCloseTo(1)
    // No tronco caído: parada se equilibra; andando, um pé na frente do outro.
    expect(modo('equilibrio').Equilibrar).toBeCloseTo(1)
    expect(modo('equilibrio', 0.8).Andar).toBeCloseTo(1)
  })
})

describe('dos estados aos clipes', () => {
  test('o peso de cada clipe é a soma dos estados dele, no instante do mais pesado', () => {
    const l = criarLocomocao()
    l.pesos.Parado = 0
    l.pesos.Nado = 0.7
    l.pesos.NadoParado = 0.3
    l.tempos.Nado = 0.5
    l.tempos.NadoParado = 0.1
    const pose = poseDosClipes(l, criarPoseDosClipes())
    expect(pose.pulo_no_ar.peso).toBeCloseTo(1)
    expect(pose.pulo_no_ar.tempo).toBeCloseTo(0.5 * DURACAO_DO_CLIPE.pulo_no_ar, 6)
    expect(pose.parado_relaxado.peso).toBe(0)
  })

  test('o pulo começa no empurrão e o pouso no pé tocando, não no começo do clipe', () => {
    const l = criarLocomocao()
    l.pesos.Parado = 0
    l.pesos.Pulo = 1
    l.tempos.Pulo = 0
    const pose = poseDosClipes(l, criarPoseDosClipes())
    expect(pose.pulo_inicio.tempo).toBeCloseTo(
      POSE_DO_ESTADO.Pulo.de * DURACAO_DO_CLIPE.pulo_inicio,
      6,
    )
    expect(POSE_DO_ESTADO.Pulo.de).toBeGreaterThan(0)
    expect(POSE_DO_ESTADO.Aterrissagem.de).toBeGreaterThan(0)
  })

  test('numa corrida a soma dos clipes continua 1', () => {
    const l = rodar(undefined, chao(3.4), 1)
    const pose = poseDosClipes(l, criarPoseDosClipes())
    expect(soma(Object.fromEntries(CLIPES_DO_JOGO.map((c) => [c, pose[c].peso])))).toBeCloseTo(1)
  })
})
