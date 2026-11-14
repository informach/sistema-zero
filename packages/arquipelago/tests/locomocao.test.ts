import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { AnimationClip, VectorKeyframeTrack } from 'three'
import { comOComecoMaisBaixo } from '../src/personagem/avatar-do-jogo'
import { CORPO } from '../src/sistemas/corpo'
import {
  AR_PARA_ATERRISSAR,
  CICLO_DA_ESCADA,
  CICLO_DE_ANDAR,
  CICLO_DE_CORRER,
  CICLO_DE_ESCALAR,
  CICLO_DE_NADO,
  CLIPES_DO_JOGO,
  ciclosPorSegundo,
  criarLocomocao,
  criarPoseDosClipes,
  DURACAO_DA_SAIDA_DA_AGUA,
  DURACAO_DO_CLIPE,
  duracaoDoEstado,
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
import {
  DESENHO_NA_AGUA,
  descidaDoEntrarNaAgua,
  desenhoPenduradoNaBorda,
  medidaDoLugar,
  PENDURADO_NA_BORDA,
  PENDURADO_NO_CIPO,
} from '../src/sistemas/lugares-dos-clipes'
import { BORDA } from '../src/sistemas/modos/borda'

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
    // Depois de entrar na água (um movimento só), nada.
    const l = rodar(undefined, agua, duracaoDoEstado('EntrandoNaAgua') + 1)
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
    expect(modo('escalada', 0.5).Escalar).toBeCloseTo(1)
    expect(modo('cipo').Corda).toBeCloseTo(1)
    expect(modo('borda').PendurarBorda).toBeCloseTo(1)
    // No tronco caído: parada se equilibra; andando, um pé na frente do outro.
    expect(modo('equilibrio').Equilibrar).toBeCloseTo(1)
    expect(modo('equilibrio', 0.8).Andar).toBeCloseTo(1)
  })

  test('sentar e deitar: o movimento de se acomodar uma vez, depois o laço de quem ficou', () => {
    for (const [especial, entra, fica] of [
      ['sentar', 'Sentando', 'Sentar'],
      ['deitar', 'Deitando', 'Deitar'],
    ] as const) {
      const e = { velocidade: 0, noChao: true, velY: 0, nadando: false, especial }
      // No meio do movimento, só ele; o laço ainda não começou.
      const l = rodar(undefined, e, duracaoDoEstado(entra) / 2)
      expect(l.pesos[entra]).toBeCloseTo(1)
      expect(l.pesos[fica]).toBe(0)
      expect(l.tempos[entra]).toBeCloseTo(0.5, 1)
      // Acabou de se acomodar: fica no laço, e o movimento de entrar parou no último quadro.
      rodar(l, e, duracaoDoEstado(entra) / 2 + 1)
      expect(l.pesos[fica]).toBeCloseTo(1)
      expect(l.pesos[entra]).toBe(0)
      expect(l.tempos[entra]).toBe(1)
      expect(soma(l.pesos)).toBeCloseTo(1)
      // Levantou e voltou: o movimento de se acomodar recomeça do início.
      rodar(l, { ...e, especial: null }, 0.5)
      expect(l.pesos.Parado).toBeCloseTo(1)
      rodar(l, e, 0.1)
      expect(l.tempos[entra]).toBeLessThan(0.2)
      expect(l.pesos[entra]).toBeGreaterThan(0)
    }
  })

  test('as braçadas andam pela distância, sem passar do dobro da cadência do clipe', () => {
    const agua = { velocidade: 0.5, noChao: false, velY: 0, nadando: true, especial: null }
    // Devagar: uma braçada inteira a cada passada do clipe.
    const devagar = passoDaLocomocao(criarLocomocao(), agua, 0.1)
    expect(devagar.tempos.Nado).toBeCloseTo((0.5 / CICLO_DE_NADO.passada) * 0.1, 6)
    // Na velocidade do nado do jogo, o teto.
    const rapido = passoDaLocomocao(criarLocomocao(), { ...agua, velocidade: 2.6 }, 0.1)
    expect(rapido.tempos.Nado).toBeCloseTo((RITMO_MAXIMO / CICLO_DE_NADO.duracao) * 0.1, 6)
  })
})

describe('entrar e sair da água, o barco e o aceno', () => {
  const agua = { velocidade: 0, noChao: false, velY: 0, nadando: true, especial: null }
  const praia = { velocidade: 1, noChao: true, velY: 0, nadando: false, especial: null }

  test('entrar na água toca uma vez, antes de nadar ou boiar', () => {
    const l = rodar(undefined, agua, duracaoDoEstado('EntrandoNaAgua') / 2)
    expect(l.pesos.EntrandoNaAgua).toBeCloseTo(1)
    expect(l.pesos.NadoParado).toBe(0)
    rodar(l, agua, duracaoDoEstado('EntrandoNaAgua') / 2 + 1)
    expect(l.pesos.NadoParado).toBeCloseTo(1)
    expect(l.pesos.EntrandoNaAgua).toBe(0)
    // Continua na água: não entra de novo.
    rodar(l, { ...agua, velocidade: 2.6 }, 2)
    expect(l.pesos.Nado).toBeCloseTo(1)
    expect(l.tempos.EntrandoNaAgua).toBe(1)
  })

  test('saindo da água pisando, o corpo se ergue uma vez e some; quem sai correndo quase não vê', () => {
    const l = rodar(undefined, agua, 4)
    passoDaLocomocao(l, praia, 1 / 60)
    expect(l.saindoDaAgua).toBeGreaterThan(0)
    rodar(l, praia, 0.3)
    expect(l.pesos.SaindoDaAgua).toBeGreaterThan(0.2)
    expect(soma(l.pesos)).toBeCloseTo(1, 1)
    rodar(l, praia, DURACAO_DA_SAIDA_DA_AGUA + 0.5)
    expect(l.pesos.SaindoDaAgua).toBeCloseTo(0)
    expect(l.pesos.Andar + l.pesos.Parado).toBeCloseTo(1)
    // Correndo, pesa menos.
    const correndo = rodar(undefined, agua, 4)
    passoDaLocomocao(correndo, { ...praia, velocidade: VELOCIDADE_DO_CORRER }, 1 / 60)
    expect(correndo.forcaDaSaidaDaAgua).toBeCloseTo(0.4)
    // Saiu da água pulando (sem pisar): nada de se erguer.
    const pulando = rodar(undefined, agua, 4)
    passoDaLocomocao(pulando, { ...praia, noChao: false, velY: 3 }, 1 / 60)
    expect(pulando.saindoDaAgua).toBe(0)
  })

  test('na viagem de barco ela vai sentada', () => {
    const l = rodar(undefined, { ...praia, velocidade: 0, especial: 'barco' }, 1)
    expect(l.pesos.NoBarco).toBeCloseTo(1)
    expect(POSE_DO_ESTADO.NoBarco.clipe).toBe('sentado_no_barco')
  })

  test('parada, acena de volta; andando, o aceno não segura o passo', () => {
    const parada = rodar(undefined, { ...praia, velocidade: 0, acenando: true }, 1)
    expect(parada.pesos.Acenar).toBeCloseTo(1)
    expect(parada.pesos.Parado).toBe(0)
    expect(parada.tempos.Acenar).toBeGreaterThan(0)
    const andando = rodar(
      undefined,
      { ...praia, velocidade: VELOCIDADE_DO_ANDAR, acenando: true },
      1,
    )
    expect(andando.pesos.Acenar).toBeCloseTo(0)
    expect(andando.pesos.Andar).toBeCloseTo(1)
    // Acabou o aceno: volta ao parado e o próximo recomeça do início.
    rodar(parada, { ...praia, velocidade: 0 }, 1)
    expect(parada.pesos.Parado).toBeCloseTo(1)
    expect(parada.tempos.Acenar).toBe(0)
  })

  test('o começo do entrar na água desce até o fundo e a descida some até o fim', () => {
    const descida = descidaDoEntrarNaAgua(0.12)
    // Em metros do clipe: a margem da arte mais a cintura (e o quanto a água passa dela).
    expect(descida * CORPO.medidas.scale).toBeCloseTo(
      medidaDoLugar('entrar_na_agua', 'margem_chao_acima_da_agua_m') + CORPO.cintura + 0.12,
      9,
    )
    const clipe = new AnimationClip('entrar', 1, [
      new VectorKeyframeTrack('Hips.position', [0, 0.5, 1], [0, 1, 0, 0, 0.6, 0, 0, 0.2, 0]),
    ])
    comOComecoMaisBaixo(clipe, 0.5)
    const y = [...(clipe.tracks[0]?.values ?? [])].filter((_, i) => i % 3 === 1)
    expect(y[0]).toBeCloseTo(0.5, 6)
    expect(y[1]).toBeCloseTo(0.35, 6)
    expect(y[2]).toBeCloseTo(0.2, 6)
  })
})

describe('as animações da arte no lugar', () => {
  test('nadar, boiar, sentar, deitar, o cipó e a borda tocam os clipes que a arte fez', () => {
    expect(POSE_DO_ESTADO.Nado.clipe).toBe('nadar')
    expect(POSE_DO_ESTADO.NadoParado.clipe).toBe('boiar')
    expect(POSE_DO_ESTADO.Sentando.clipe).toBe('sentar')
    expect(POSE_DO_ESTADO.Sentar.clipe).toBe('sentado')
    expect(POSE_DO_ESTADO.Deitando.clipe).toBe('deitar')
    expect(POSE_DO_ESTADO.Deitar.clipe).toBe('deitado')
    expect(POSE_DO_ESTADO.Corda.clipe).toBe('pendurar_cipo')
    expect(POSE_DO_ESTADO.PendurarBorda.clipe).toBe('pendurar_borda')
    expect(POSE_DO_ESTADO.SubirBorda.clipe).toBe('subir_borda')
  })

  test('pendurada na borda, as mãos do clipe caem na quina; a origem do desenho sobe e recua', () => {
    const { sobe, recua } = desenhoPenduradoNaBorda(BORDA)
    // A quina fica `maosAcimaDoCentro` acima do meio do corpo: a origem do desenho, `maos` abaixo
    // dela. De pé, a origem fica nos pés (o fim da cápsula mais a folga).
    const origem = -CORPO.doCentroAoPe - CORPO.folga + sobe
    expect(origem + PENDURADO_NA_BORDA.maos).toBeCloseTo(BORDA.maosAcimaDoCentro, 9)
    // E a quina fica `aFrente` da origem: o corpo do jogo está a `daParede` dela.
    expect(BORDA.daParede + recua).toBeCloseTo(PENDURADO_NA_BORDA.aFrente, 9)
    // O boneco do pack é baixo: pendurado, ele sobe bastante, mas menos que a própria altura.
    expect(sobe).toBeGreaterThan(0.3)
    expect(sobe).toBeLessThan(CORPO.medidas.height)
    expect(Math.abs(recua)).toBeLessThan(0.2)
  })

  test('no cipó a corda passa à frente do corpo, na altura das mãos do clipe', () => {
    expect(PENDURADO_NO_CIPO.cordaAFrente).toBeGreaterThan(0.2)
    expect(PENDURADO_NO_CIPO.cordaAFrente).toBeLessThan(0.6)
    expect(PENDURADO_NO_CIPO.maos).toBeGreaterThan(CORPO.cintura)
    expect(PENDURADO_NO_CIPO.maos).toBeLessThan(CORPO.medidas.height)
  })

  test('na água a origem do desenho sobe dos pés até a cintura (a superfície do clipe)', () => {
    expect(DESENHO_NA_AGUA.sobe).toBeCloseTo(CORPO.cintura + CORPO.folga, 9)
    expect(() => medidaDoLugar('nadar', 'nao-existe')).toThrow()
  })
})

describe('dos estados aos clipes', () => {
  test('o peso de cada clipe é a soma dos estados dele, no instante do mais pesado', () => {
    const l = criarLocomocao()
    l.pesos.Parado = 0
    l.pesos.Planar = 0.7
    l.pesos.NoAr = 0.3
    l.tempos.Planar = 0.5
    l.tempos.NoAr = 0.1
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
