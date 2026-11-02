import { describe, expect, test } from 'bun:test'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { LivreFillStroke, proximoGestoDasCores } from '../src/components/scene-livre/fill-stroke'
import { LivreFrames, proximoGestoDosQuadros } from '../src/components/scene-livre/frames'
import { LivreMotionAmount, proximoGestoDoTanto } from '../src/components/scene-livre/motion-amount'
import { LivreOnionSkin, proximoGestoDoFantasma } from '../src/components/scene-livre/onion-skin'
import { LivrePixelVector, proximoGestoDaLupa } from '../src/components/scene-livre/pixel-vector'
import { LivreShading, proximoGestoDaLuz } from '../src/components/scene-livre/shading'
import { LivreSymmetry, proximoGestoDoEspelho } from '../src/components/scene-livre/symmetry'

/**
 * O ateliê de O Jogo do Meu Jeito em exploração livre (Construtor, 02/11/2026): só a IDEIA na tela.
 * Os nomes dos controles do Pinta (Lupa, Espelho, Preenchimento, Contorno, Prévia, Fantasma…) são a
 * ferramenta da criança; bloco, regra e código não aparecem. O que cada caso faz só aparece depois do
 * teste daquele caso, e o botão em destaque é o gesto que a fala do Zappy pede.
 */
type Cena =
  | 'pixel-vector'
  | 'symmetry'
  | 'shading'
  | 'fill-stroke'
  | 'frames'
  | 'onion-skin'
  | 'motion-amount'
const METAS: Record<Cena, string[]> = {
  'pixel-vector': ['stairs', 'smooth', 'alike'],
  symmetry: ['one-side', 'two-sides', 'axis-decides', 'fill-ignores-mirror'],
  shading: ['volume', 'flat', 'side'],
  'fill-stroke': ['only-fill', 'only-stroke', 'both'],
  frames: ['two-drawings', 'movement', 'paused-one', 'slow-shows-two', 'same-frames'],
  'onion-skin': ['blind-move', 'ghost-on', 'even-step'],
  'motion-amount': ['no-change', 'local-move', 'too-much'],
}
const caso = (scene: Cena) => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene,
    cenario: 'meu-jeito',
    setup: { freeExploration: true, goals: METAS[scene] },
  }
  const start: SceneStart = { scene, setup: activity.setup }
  const play = (actions: SceneAction[]) =>
    actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
  return { activity, play }
}
const tela = (
  activity: ExperimentationActivity,
  state: SceneState,
  view: ReactElement,
  running = false,
) =>
  renderToStaticMarkup(
    <DiscoveryContext.Provider
      value={{
        activity,
        state,
        dispatch: () => {},
        running,
        setRunning: () => {},
        tick: () => {},
        instruction: 'Fala do Zappy',
        dialogue: (text) => <p>{text}</p>,
        tools: null,
      }}
    >
      {view}
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
/** Nada de bloco, regra, código, área do Estúdio nem palavra de programação na tela. */
const SO_A_IDEIA =
  /\bregra\b|\bbloco|\bc[óo]digo|\bEst[úu]dio\b|\bentão\b|\bsenão\b|\bvari[áa]vel|\bAo iniciar\b|\bEnquanto estiver\b/i
/** Os rótulos dos botões que estão com o tom de gesto (o destaque). */
const destaques = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
    texto(m[1] ?? '').trim(),
  )
const fala = (activity: ExperimentationActivity, s: SceneState) =>
  discoveryGuidance(activity, s)?.id

describe('pixel-vector: a tela livre', () => {
  const { activity, play } = caso('pixel-vector')
  const lupa = (zoom: number): SceneAction => ({ type: 'inspect', kind: 'pixel', zoom })
  const perto = [lupa(2), lupa(3), lupa(4)]

  test('rótulos com a Lupa, sem bloco nem regra', () => {
    for (const s of [play([]), play(perto), play([...perto, lupa(6), lupa(2)])])
      expect(texto(tela(activity, s, <LivrePixelVector />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <LivrePixelVector />))
    for (const rotulo of [
      'Lupa: 1 vez',
      'Aproximar',
      'Afastar',
      'Aproxime as duas pedras e compare as bordas.',
    ])
      expect(lido).toContain(rotulo)
  })

  test('o que cada borda faz só aparece depois de aproximar', () => {
    const antes = texto(tela(activity, play([]), <LivrePixelVector />))
    // ⚠️ A descrição do PALCO diz o que está desenhado (de perto, "em degraus" e "continua lisa"); a
    // figura da ideia só fala de cada caso depois do teste dele.
    expect(antes).not.toContain('degraus')
    expect(antes).not.toContain('com os pontos da curva')
    expect(antes).not.toContain('Parecem a mesma pedra')
    const quatro = texto(tela(activity, play(perto), <LivrePixelVector />))
    expect(quatro).toContain('A borda vira degraus de quadradinhos')
    expect(quatro).not.toContain('com os pontos da curva')
    const longe = texto(tela(activity, play([...perto, lupa(3), lupa(2)]), <LivrePixelVector />))
    expect(longe).toContain('Parecem a mesma pedra')
    expect(longe).not.toContain('com os pontos da curva')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Aproximar'],
      [perto, 'Aproximar'],
      [[...perto, lupa(5), lupa(6)], 'Afastar'],
      [[...perto, lupa(3), lupa(2)], 'Aproximar'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDaLupa(fala(activity, s), s.pixels.zoom)).not.toBeNull()
      expect([fala(activity, s), destaques(tela(activity, s, <LivrePixelVector />))]).toEqual([
        fala(activity, s),
        [esperado],
      ])
    }
  })
})

describe('symmetry: a tela livre', () => {
  const { activity, play } = caso('symmetry')
  const asa: SceneAction = { type: 'trace', piece: 'asa' }
  const espelho = (mode: 'off' | 'x' | 'y' | 'xy'): SceneAction => ({ type: 'mirror-mode', mode })
  const balde: SceneAction = { type: 'fill' }

  test('rótulos com os espelhos do Pinta, sem bloco nem regra', () => {
    for (const s of [play([]), play([asa, espelho('x'), asa]), play([espelho('x'), balde])])
      expect(texto(tela(activity, s, <LivreSymmetry />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <LivreSymmetry />))
    for (const rotulo of [
      'Espelho lado a lado: desligado',
      'Espelho de cima e de baixo: desligado',
      'Abre depois que você pintar a asa com o Espelho lado a lado.',
      'Pintar a asa',
      'Pintar a ponta',
      'Pintar a cabine',
      'Balde de tinta: encher a asa',
      'Apagar o papel',
    ])
      expect(lido).toContain(rotulo)
  })

  test('onde o traço aparece só depois de pintar com cada espelho', () => {
    const antes = texto(tela(activity, play([]), <LivreSymmetry />))
    expect(antes).not.toContain('só onde você pintou')
    expect(antes).not.toContain('Uma cópia')
    expect(antes).not.toContain('Enche só a asa')
    const desligado = texto(tela(activity, play([asa]), <LivreSymmetry />))
    expect(desligado).toContain('A asa fica só onde você pintou')
    expect(desligado).not.toContain('Uma cópia')
    const lado = texto(tela(activity, play([asa, espelho('x'), asa]), <LivreSymmetry />))
    expect(lado).toContain('Uma cópia do outro lado da linha do meio, em pé')
    expect(lado).not.toContain('deitada')
    expect(lado).not.toContain('Abre depois')
    expect(texto(tela(activity, play([espelho('x'), balde]), <LivreSymmetry />))).toContain(
      'Enche só a asa em que você clicou',
    )
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Pintar a asa'],
      [[espelho('x')], 'Espelho lado a lado: ligado'],
      [[asa], 'Espelho lado a lado: desligado'],
      [[asa, espelho('x')], 'Pintar a asa'],
      [[asa, espelho('x'), asa], 'Espelho lado a lado: ligado'],
      [[asa, espelho('x'), asa, espelho('y')], 'Pintar a asa'],
      [[asa, espelho('x'), asa, espelho('y'), asa], 'Espelho de cima e de baixo: ligado'],
      [[asa, espelho('x'), asa, espelho('y'), asa, espelho('x')], 'Balde de tinta: encher a asa'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDoEspelho(fala(activity, s), s.mirror)).not.toBeNull()
      expect([fala(activity, s), destaques(tela(activity, s, <LivreSymmetry />))]).toEqual([
        fala(activity, s),
        [esperado],
      ])
    }
  })
})

describe('shading: a tela livre', () => {
  const { activity, play } = caso('shading')
  const sombra = (on: boolean): SceneAction => ({ type: 'shade', on })
  const sol = (side: 'left' | 'right'): SceneAction => ({ type: 'light', side })

  test('rótulos do Pinta, sem bloco nem regra', () => {
    for (const s of [play([]), play([sombra(true)]), play([sombra(true), sol('right')])])
      expect(texto(tela(activity, s, <LivreShading />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <LivreShading />))
    for (const rotulo of ['A sombra e a luz: desligadas', 'O sol: na esquerda'])
      expect(lido).toContain(rotulo)
  })

  test('o que a luz faz só aparece depois do teste', () => {
    const antes = texto(tela(activity, play([]), <LivreShading />))
    expect(antes).not.toContain('redonda')
    expect(antes).not.toContain('chapada')
    expect(antes).not.toContain('trocam de lado')
    const ligou = texto(tela(activity, play([sombra(true)]), <LivreShading />))
    expect(ligou).toContain('a bola parece redonda')
    expect(ligou).not.toContain('chapada')
    expect(ligou).not.toContain('trocam de lado')
    expect(texto(tela(activity, play([sombra(true), sol('right')]), <LivreShading />))).toContain(
      'O azul claro e o escuro trocam de lado',
    )
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'A sombra e a luz: desligadas'],
      [[sombra(true)], 'A sombra e a luz: ligadas'],
      [[sombra(true), sombra(false)], 'A sombra e a luz: desligadas'],
      [[sombra(true), sombra(false), sombra(true)], 'O sol: na esquerda'],
      [[sombra(true), sol('right')], 'A sombra e a luz: ligadas'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDaLuz(fala(activity, s), s.light)).not.toBeNull()
      expect([fala(activity, s), destaques(tela(activity, s, <LivreShading />))]).toEqual([
        fala(activity, s),
        [esperado],
      ])
    }
  })
})

describe('fill-stroke: a tela livre', () => {
  const { activity, play } = caso('fill-stroke')
  const tinta = (part: 'fill' | 'stroke', on: boolean): SceneAction => ({ type: 'ink', part, on })

  test('rótulos do Pinta, sem bloco nem regra', () => {
    for (const s of [play([]), play([tinta('stroke', false)]), play([tinta('fill', false)])])
      expect(texto(tela(activity, s, <LivreFillStroke />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <LivreFillStroke />))
    for (const rotulo of ['Preenchimento: com cor', 'Contorno: com cor'])
      expect(lido).toContain(rotulo)
    expect(texto(tela(activity, play([tinta('fill', false)]), <LivreFillStroke />))).toContain(
      'Preenchimento: Sem cor',
    )
  })

  test('o que sobra da pedra só aparece depois do teste', () => {
    const antes = texto(tela(activity, play([]), <LivreFillStroke />))
    expect(antes).not.toContain('sem a linha da borda')
    expect(antes).not.toContain('vazia por dentro')
    expect(antes).not.toContain('juntas')
    const semContorno = texto(tela(activity, play([tinta('stroke', false)]), <LivreFillStroke />))
    expect(semContorno).toContain('Fica a cor de dentro, sem a linha da borda')
    expect(semContorno).not.toContain('vazia por dentro')
    expect(semContorno).not.toContain('juntas')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Contorno: com cor'],
      [[tinta('stroke', false)], 'Contorno: Sem cor'],
      [[tinta('stroke', false), tinta('stroke', true)], 'Preenchimento: com cor'],
      [[tinta('fill', false)], 'Preenchimento: Sem cor'],
      [
        [tinta('stroke', false), tinta('fill', false), tinta('stroke', true)],
        'Preenchimento: Sem cor',
      ],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDasCores(fala(activity, s), s.ink)).not.toBeNull()
      expect([fala(activity, s), destaques(tela(activity, s, <LivreFillStroke />))]).toEqual([
        fala(activity, s),
        [esperado],
      ])
    }
  })
})

describe('frames: a tela livre', () => {
  const { activity, play } = caso('frames')
  const quadro = (index: 1 | 2): SceneAction => ({ type: 'frame', index })
  const previa = (on: boolean): SceneAction => ({ type: 'play', on })
  const velocidade = (perSecond: number): SceneAction => ({ type: 'rate', perSecond })
  const iguais = (on: boolean): SceneAction => ({ type: 'same-frames', on })
  const tempo = (seconds: number): SceneAction => ({ type: 'advance', seconds })
  const rapida = [quadro(2), velocidade(8), previa(true), tempo(0.5)]

  test('rótulos do Pinta, sem bloco nem regra', () => {
    for (const s of [play([]), play(rapida), play([...rapida, previa(false)])])
      expect(texto(tela(activity, s, <LivreFrames />, s.animation.playing))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <LivreFrames />))
    for (const rotulo of [
      'Quadro 1',
      'Quadro 2',
      'Tocar a Prévia',
      'Velocidade, em quadros por segundo',
      'Quadro 2 igual ao quadro 1: desligado',
    ])
      expect(lido).toContain(rotulo)
    const tocando = texto(tela(activity, play(rapida), <LivreFrames />, true))
    expect(tocando).toContain('Parar a Prévia')
    expect(tocando).toContain('Pare a Prévia para escolher um quadro.')
  })

  test('o que a Prévia faz só aparece depois de cada teste', () => {
    const antes = texto(tela(activity, play([]), <LivreFrames />))
    for (const resposta of [
      'só o fogo muda',
      'parece pulsar',
      'Fica um quadro só',
      'depois o outro',
      'nada se mexe',
    ])
      expect(antes).not.toContain(resposta)
    const parados = texto(tela(activity, play([quadro(2)]), <LivreFrames />))
    expect(parados).toContain('Dois desenhos: o corpo igual, só o fogo muda')
    expect(parados).not.toContain('parece pulsar')
    const pulsou = texto(tela(activity, play(rapida), <LivreFrames />, true))
    expect(pulsou).toContain('O fogo parece pulsar')
    expect(pulsou).not.toContain('Fica um quadro só')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Quadro 2'],
      [[quadro(2)], '8'],
      [[quadro(2), velocidade(8)], 'Tocar a Prévia'],
      [rapida, 'Parar a Prévia'],
      [[...rapida, previa(false)], '2'],
      [[...rapida, previa(false), velocidade(2)], 'Tocar a Prévia'],
      [
        [...rapida, previa(false), velocidade(2), previa(true), tempo(1)],
        'Quadro 2 igual ao quadro 1: desligado',
      ],
      [[...rapida, previa(false), velocidade(2), previa(true), tempo(1), iguais(true)], '8'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDosQuadros(fala(activity, s), s.animation)).not.toBeNull()
      expect([
        fala(activity, s),
        destaques(tela(activity, s, <LivreFrames />, s.animation.playing)),
      ]).toEqual([fala(activity, s), [esperado]])
    }
  })

  test('olhando a Prévia tocar, nada fica em destaque', () => {
    const s = play([quadro(2), velocidade(8), previa(true)])
    expect(proximoGestoDosQuadros(fala(activity, s), s.animation)).toBeNull()
    expect(destaques(tela(activity, s, <LivreFrames />, true))).toEqual([])
  })
})

describe('onion-skin: a tela livre', () => {
  const { activity, play } = caso('onion-skin')
  const quadro = (index: 1 | 2): SceneAction => ({ type: 'frame', index })
  const fantasma = (on: boolean): SceneAction => ({ type: 'onion', on })
  const fogo = (offset: number): SceneAction => ({ type: 'shift', offset })

  test('rótulos do Pinta, sem bloco nem regra, e sem a medida do fogo', () => {
    for (const s of [play([]), play([quadro(2), fogo(36)]), play([quadro(2), fantasma(true)])])
      expect(texto(tela(activity, s, <LivreOnionSkin />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <LivreOnionSkin />))
    for (const rotulo of [
      'Quadro 1',
      'Quadro 2',
      'Fantasma: desligado',
      'Tamanho do fogo 2',
      'Fogo 2 menor',
      'Fogo 2 maior',
      'Vá para o quadro 2 para mudar o fogo dele.',
    ])
      expect(lido).toContain(rotulo)
    expect(lido).not.toMatch(/\d+ quadradinhos/)
  })

  test('o que o Fantasma mostra só aparece depois do teste', () => {
    const antes = texto(tela(activity, play([]), <LivreOnionSkin />))
    expect(antes).not.toContain('memória')
    expect(antes).not.toContain('tracejado')
    expect(antes).not.toContain('cabe no quadro')
    const cego = texto(tela(activity, play([quadro(2), fogo(36)]), <LivreOnionSkin />))
    expect(cego).toContain('Só o fogo 2 na tela: o fogo 1 fica na memória')
    expect(cego).not.toContain('O fogo 1 aparece tracejado')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Quadro 2'],
      [[quadro(2)], 'Fogo 2 menor'],
      [[quadro(2), fantasma(true)], 'Fantasma: ligado'],
      [[quadro(2), fogo(36)], 'Fantasma: desligado'],
      [[quadro(2), fogo(36), fantasma(true)], 'Fogo 2 menor'],
      [[quadro(2), fogo(4), fantasma(true)], 'Fogo 2 maior'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDoFantasma(fala(activity, s), s.animation)).not.toBeNull()
      expect([fala(activity, s), destaques(tela(activity, s, <LivreOnionSkin />))]).toEqual([
        fala(activity, s),
        [esperado],
      ])
    }
  })
})

describe('motion-amount: a tela livre', () => {
  const { activity, play } = caso('motion-amount')
  const previa = (on: boolean): SceneAction => ({ type: 'play', on })
  const tempo = (seconds: number): SceneAction => ({ type: 'advance', seconds })
  const cratera = (amount: number): SceneAction => ({ type: 'nudge', piece: 'crater', amount })
  const pedra = (amount: number): SceneAction => ({ type: 'nudge', piece: 'body', amount })

  test('rótulos da bancada, sem bloco nem regra', () => {
    for (const s of [play([]), play([previa(true), tempo(0.5)])])
      expect(texto(tela(activity, s, <LivreMotionAmount />, s.motionAmount.playing))).not.toMatch(
        SO_A_IDEIA,
      )
    const lido = texto(tela(activity, play([]), <LivreMotionAmount />))
    for (const rotulo of [
      'O tanto que a cratera anda',
      'O tanto que a pedra inteira anda',
      'Tocar a Prévia',
    ])
      expect(lido).toContain(rotulo)
  })

  test('a Prévia abre parada, e o que cada caso faz só aparece depois de ver', () => {
    const aberta = play([])
    expect(aberta.motionAmount.playing).toBe(false)
    const antes = texto(tela(activity, aberta, <LivreMotionAmount />))
    expect(antes).not.toContain('a pedra fica parada')
    expect(antes).not.toContain('parece girar')
    expect(antes).not.toContain('pula')
    const iguais = texto(
      tela(activity, play([previa(true), tempo(0.5)]), <LivreMotionAmount />, true),
    )
    expect(iguais).toContain('A Prévia troca, mas a pedra fica parada')
    expect(iguais).not.toContain('parece girar')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Tocar a Prévia'],
      [[cratera(4)], '0'],
      [[previa(true), tempo(0.5)], '4'],
      [[previa(true), tempo(0.5), pedra(2)], '0'],
      [[previa(true), tempo(0.5), cratera(4), tempo(0.5)], '10'],
      [
        [previa(true), tempo(0.5), cratera(4), tempo(0.5), previa(false), pedra(10)],
        'Tocar a Prévia',
      ],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const tocando = s.motionAmount.playing
      expect(proximoGestoDoTanto(fala(activity, s), s.motionAmount)).not.toBeNull()
      expect([
        fala(activity, s),
        destaques(tela(activity, s, <LivreMotionAmount />, tocando)),
      ]).toEqual([fala(activity, s), [esperado]])
    }
  })

  test('com o relógio do player parado por fora, a tela não diz que a Prévia toca', () => {
    const s = play([previa(true)])
    const lido = texto(tela(activity, s, <LivreMotionAmount />, false))
    expect(lido).toContain('Tocar a Prévia')
    expect(destaques(tela(activity, s, <LivreMotionAmount />, false))).toEqual(['Tocar a Prévia'])
  })
})
