import { describe, expect, test } from 'bun:test'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  ONCE_VS_ALWAYS_PRESETS,
  oncePreset,
  openScene,
  type SceneAction,
  type SceneState,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { LivreCoordinates, proximoGestoDoEndereco } from '../src/components/scene-livre/coordinates'
import { LivreDrawLoop, proximoGestoDoDesenho } from '../src/components/scene-livre/draw-loop'
import { LivreLayers, proximoGestoDasCamadas } from '../src/components/scene-livre/layers'
import { LivreOnceVsAlways, proximoGestoDoOnce } from '../src/components/scene-livre/once-vs-always'
import { LivreWorld, proximoGestoDoMundo } from '../src/components/scene-livre/world'

/**
 * As telas livres de `once-vs-always`, `draw-loop`, `world`, `layers` e `coordinates` (Construtor,
 * 02/11/2026): só a IDEIA na tela. Nada de bloco, área do Estúdio, regra, Se/então/senão nem código;
 * o que cada caso faz só aparece depois do teste daquele caso, e o botão em destaque é o gesto que a
 * fala do Zappy pede.
 */
const nave = { hero: { name: 'nave', gender: 'f' as const } }
const caso = (
  scene: ExperimentationActivity['scene'],
  setup: Omit<NonNullable<ExperimentationActivity['setup']>, 'freeExploration'> = {},
  extra: Partial<ExperimentationActivity> = {},
) => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene,
    cenario: 'nave',
    cast: nave,
    ...extra,
    setup: { freeExploration: true, ...setup },
  }
  const start = sceneStart(activity)
  const play = (actions: SceneAction[]) =>
    actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
  return { activity, play }
}
const tela = (
  activity: ExperimentationActivity,
  state: SceneState,
  view: ReactElement,
  tools: ReactElement | null = null,
) =>
  renderToStaticMarkup(
    <DiscoveryContext.Provider
      value={{
        activity,
        state,
        dispatch: () => {},
        running: false,
        setRunning: () => {},
        tick: () => {},
        instruction: 'Fala do Zappy',
        dialogue: (text) => <p>{text}</p>,
        tools,
      }}
    >
      {view}
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const SO_A_IDEIA =
  /\bregra\b|\bbloco|\bentão\b|\bsenão\b|\bcomando|\bcódigo|Ao iniciar|Enquanto estiver rodando|Quando acontecer|Limpar a tela|sprite/i
/** O rótulo do botão que está com o tom de gesto (o destaque). */
const destaques = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
    texto(m[1] ?? '').trim(),
  )
const quadros = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'advance', seconds: 0.25 }) as SceneAction)

describe('once-vs-always: a tela livre', () => {
  const primeira = caso('once-vs-always', {
    goals: ['once', 'always'],
    preset: ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave'],
  })
  const tiro = caso('once-vs-always', {
    goals: ['on-event', 'key-fires', 'flood'],
    preset: ONCE_VS_ALWAYS_PRESETS['tres-caixas-tiro'],
  })
  const vidas = caso('once-vs-always', {
    goals: ['once', 'lives-loop'],
    preset: ONCE_VS_ALWAYS_PRESETS['uma-ficha-vidas'],
  })
  const mover = (area: 'start' | 'loop'): SceneAction => ({
    type: 'place-in-area',
    card: 'move',
    area,
  })
  const evento = (area: 'start' | 'loop' | 'event'): SceneAction => ({
    type: 'place-in-area',
    card: 'event',
    area,
  })

  test('rótulos só com a ideia, nos três casos', () => {
    for (const { activity, play } of [primeira, tiro, vidas])
      for (const s of [play([]), play([evento('event'), ...quadros(3)]), play([mover('loop')])])
        expect(texto(tela(activity, s, <LivreOnceVsAlways />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(tiro.activity, tiro.play([]), <LivreOnceVsAlways />))
    for (const rotulo of [
      'Quando sai um tiro?',
      'Uma vez, no começo',
      'Sempre, em todo quadro',
      'Na hora em que algo acontece',
      'Começar o jogo',
      'Apertar a tecla',
    ])
      expect(lido).toContain(rotulo)
    expect(texto(tela(primeira.activity, primeira.play([]), <LivreOnceVsAlways />))).toContain(
      'Quando a nave anda um pouquinho?',
    )
    expect(texto(tela(primeira.activity, primeira.play([]), <LivreOnceVsAlways />))).not.toContain(
      'Apertar a tecla',
    )
    expect(
      texto(
        tela(
          primeira.activity,
          primeira.play([mover('start'), ...quadros(3)]),
          <LivreOnceVsAlways />,
        ),
      ),
    ).toContain('Jogar de novo')
  })

  test('o que cada jeito faz só aparece depois do teste', () => {
    const antes = texto(tela(primeira.activity, primeira.play([]), <LivreOnceVsAlways />))
    expect(antes).not.toContain('não sai do lugar')
    expect(antes).not.toContain('até sair da tela')
    const vez = texto(
      tela(
        primeira.activity,
        primeira.play([mover('start'), ...quadros(3)]),
        <LivreOnceVsAlways />,
      ),
    )
    expect(vez).toContain(
      'A nave anda um pouquinho no primeiro quadro, e nos outros quadros não sai do lugar.',
    )
    expect(vez).not.toContain('até sair da tela')
    const espera = texto(
      tela(tiro.activity, tiro.play([evento('event'), ...quadros(3)]), <LivreOnceVsAlways />),
    )
    expect(espera).toContain('Sem a tecla, nenhum tiro sai.')
    expect(espera).not.toContain('Sai um tiro novo em todo quadro.')
    const vidasAntes = texto(tela(vidas.activity, vidas.play([]), <LivreOnceVsAlways />))
    expect(vidasAntes).not.toContain('voltam a três')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [typeof primeira, SceneAction[], string][] = [
      [primeira, [], 'Uma vez, no começo'],
      [primeira, [mover('start')], 'Começar o jogo'],
      [primeira, [mover('start'), ...quadros(3)], 'Sempre, em todo quadro'],
      [primeira, [mover('loop'), ...quadros(24)], 'Uma vez, no começo'],
      [tiro, [], 'Na hora em que algo acontece'],
      [tiro, [evento('event'), ...quadros(3)], 'Apertar a tecla'],
      [tiro, [evento('event'), { type: 'trigger' }], 'Jogar de novo'],
      [tiro, [evento('event'), ...quadros(3), { type: 'trigger' }], 'Sempre, em todo quadro'],
      [tiro, [evento('loop'), ...quadros(5)], 'Na hora em que algo acontece'],
      [vidas, [], 'Uma vez, no começo'],
    ]
    for (const [{ activity, play }, acoes, esperado] of casos) {
      const s = play(acoes)
      const fala = discoveryGuidance(activity, s)?.id
      const preset = oncePreset(activity.setup?.preset)
      expect(
        proximoGestoDoOnce(fala, s.once, preset, (m) => s.evidence.discoveries.includes(m)),
      ).not.toBeNull()
      expect([fala, destaques(tela(activity, s, <LivreOnceVsAlways />))]).toEqual([
        fala,
        [expect.stringContaining(esperado)],
      ])
    }
  })

  test('as ferramentas do player (Desfazer, Uma pista) ficam na tela', () => {
    const html = tela(
      primeira.activity,
      primeira.play([]),
      <LivreOnceVsAlways />,
      <button type="button">Desfazer</button>,
    )
    expect(texto(html)).toContain('Desfazer')
  })
})

describe('draw-loop: a tela livre', () => {
  const { activity, play } = caso('draw-loop', { goals: ['frozen', 'trail', 'moving'] })
  const passo: SceneAction = { type: 'advance', seconds: 0.25 }
  const cada: SceneAction = { type: 'loop', on: true }
  const apagar: SceneAction = { type: 'erase', on: true }

  test('rótulos só com a ideia', () => {
    for (const s of [play([]), play([passo]), play([cada, apagar, passo])])
      expect(texto(tela(activity, s, <LivreDrawLoop />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <LivreDrawLoop />))
    for (const rotulo of [
      'Quando desenhar a nave?',
      'Desenhar só no começo',
      'Desenhar em todo quadro',
      'Não apagar a tela',
      'Apagar a tela antes de desenhar',
      'Avançar 1 quadro',
      'Passar os quadros',
    ])
      expect(lido).toContain(rotulo)
  })

  test('o que cada jeito mostra só aparece depois do teste', () => {
    const antes = texto(tela(activity, play([]), <LivreDrawLoop />))
    expect(antes).not.toContain('a tela continua igual')
    expect(antes).not.toContain('juntando')
    const parada = texto(tela(activity, play([passo]), <LivreDrawLoop />))
    expect(parada).toContain('O x da nave muda, e a tela continua igual.')
    expect(parada).not.toContain('juntando')
    // O elenco não flexiona particípio solto: a tela diz "o jogo desenha a nave".
    for (const s of [play([]), play([cada])])
      expect(texto(tela(activity, s, <LivreDrawLoop />))).not.toMatch(/nave (não )?é desenhado/)
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Avançar 1 quadro'],
      [[passo], 'Desenhar em todo quadro'],
      [[passo, cada], 'Avançar 1 quadro'],
      [[passo, cada, passo], 'Apagar a tela antes de desenhar'],
      [[cada, apagar, passo], 'Não apagar a tela'],
      [[apagar, passo], 'Desenhar em todo quadro'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const fala = discoveryGuidance(activity, s)?.id
      expect(proximoGestoDoDesenho(fala, s.render)).not.toBeNull()
      expect([fala, destaques(tela(activity, s, <LivreDrawLoop />))]).toEqual([
        fala,
        [expect.stringContaining(esperado)],
      ])
    }
  })
})

describe('world: a tela livre', () => {
  const { activity, play } = caso('world')
  const mostrar = (enabled: boolean): SceneAction => ({ type: 'connect', port: 'draw', enabled })

  test('rótulos só com a ideia, e a revelação depois do teste', () => {
    const antes = texto(tela(activity, play([]), <LivreWorld />))
    expect(antes).not.toMatch(SO_A_IDEIA)
    for (const rotulo of ['Criar a nave nos bastidores', 'Mostrar a nave na tela'])
      expect(antes).toContain(rotulo)
    expect(antes).not.toContain('mesmo sem aparecer')
    const criada = texto(tela(activity, play([{ type: 'create' }]), <LivreWorld />))
    expect(criada).toContain('A nave existe no jogo, com nome e lugar, mesmo sem aparecer.')
    expect(criada).not.toContain('que já existia nos bastidores')
    const mostrada = texto(
      tela(activity, play([{ type: 'create' }, mostrar(true)]), <LivreWorld />),
    )
    expect(mostrada).toContain('Tirar a nave da tela')
    expect(mostrada).toContain('Aparece a mesma nave que já existia nos bastidores.')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Criar a nave nos bastidores'],
      [[{ type: 'create' }], 'Mostrar a nave na tela'],
      [[{ type: 'create' }, mostrar(true)], 'Tirar a nave da tela'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const fala = discoveryGuidance(activity, s)?.id
      expect(proximoGestoDoMundo(fala, s.world)).not.toBeNull()
      expect(destaques(tela(activity, s, <LivreWorld />))).toEqual([
        expect.stringContaining(esperado),
      ])
    }
    expect(
      destaques(
        tela(activity, play([{ type: 'create' }, mostrar(true), mostrar(false)]), <LivreWorld />),
      ),
    ).toEqual([])
  })
})

describe('layers: a tela livre', () => {
  const metas = { goals: ['front', 'covered', 'back-in-front'] }
  const naveDia1 = caso('layers', metas, {
    cast: { ...nave, scenery: { name: 'fundo de estrelas', gender: 'm', figure: 'estrelas' } },
  })
  const meuJeito = caso('layers', metas, {
    pilha: 'camadas',
    cenario: 'meu-jeito',
    cast: { hero: { name: 'pedra', gender: 'f' }, scenery: { name: 'chama', gender: 'f' } },
  })
  const frente = (front: boolean): SceneAction => ({ type: 'layer', front })

  test('rótulos só com a ideia; o Meu Jeito usa os nomes do Pinta', () => {
    const n = texto(tela(naveDia1.activity, naveDia1.play([]), <LivreLayers />))
    expect(n).not.toMatch(SO_A_IDEIA)
    expect(n).toContain('Desenhar a nave por último')
    expect(n).toContain('Desenhar o fundo de estrelas por último')
    expect(n).not.toMatch(/camada/i)
    const p = texto(tela(meuJeito.activity, meuJeito.play([]), <LivreLayers />))
    expect(p).not.toMatch(SO_A_IDEIA)
    expect(p).toContain('Camadas')
    expect(p).toContain('Uma camada para a frente')
    expect(p).toContain('Uma camada para trás')
  })

  test('quem fica na frente só aparece depois de comparar', () => {
    const antes = texto(tela(naveDia1.activity, naveDia1.play([]), <LivreLayers />))
    expect(antes).not.toContain('Nada fica na frente da nave.')
    expect(antes).not.toContain('Quem é desenhado por último fica na frente.')
    const umLado = texto(tela(naveDia1.activity, naveDia1.play([frente(true)]), <LivreLayers />))
    expect(umLado).toContain('Nada fica na frente da nave.')
    expect(umLado).not.toContain('Quem é desenhado por último fica na frente.')
    expect(
      texto(tela(naveDia1.activity, naveDia1.play([frente(true), frente(false)]), <LivreLayers />)),
    ).toContain('Quem é desenhado por último fica na frente.')
    expect(
      texto(tela(meuJeito.activity, meuJeito.play([frente(true), frente(false)]), <LivreLayers />)),
    ).toContain('A de cima na lista Camadas fica na frente.')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [typeof naveDia1, SceneAction[], string][] = [
      [naveDia1, [], 'Desenhar a nave por último'],
      [naveDia1, [frente(true)], 'Desenhar o fundo de estrelas por último'],
      [naveDia1, [frente(true), frente(false)], 'Desenhar a nave por último'],
      [meuJeito, [], 'Uma camada para a frente'],
      [meuJeito, [frente(true)], 'Uma camada para trás'],
    ]
    for (const [{ activity, play }, acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDasCamadas(discoveryGuidance(activity, s)?.id)).not.toBeNull()
      expect(destaques(tela(activity, s, <LivreLayers />))).toEqual([
        expect.stringContaining(esperado),
      ])
    }
    // No Meu Jeito o destaque fica na linha da pedra, como a fala pede.
    const html = tela(meuJeito.activity, meuJeito.play([]), <LivreLayers />)
    expect(html).toMatch(
      /data-tom="gesto"[^>]*aria-label="Uma camada para a frente: Pedra"|aria-label="Uma camada para a frente: Pedra"[^>]*data-tom="gesto"/,
    )
  })
})

describe('coordinates: a tela livre', () => {
  const { activity, play } = caso('coordinates', {
    actions: [
      { type: 'stage', width: 800, height: 480 },
      { type: 'place', x: 400, y: 40 },
    ],
    goals: ['right', 'down', 'origin'],
  })
  const lugar = (x: number, y: number): SceneAction => ({ type: 'place', x, y })
  const destaqueDoCampo = (html: string) =>
    [...html.matchAll(/data-gesto="true"[\s\S]*?<label[^>]*>([^<]*)<\/label>/g)].map((m) => m[1])

  test('rótulos só com a ideia, e a revelação depois do teste', () => {
    const antes = texto(tela(activity, play([]), <LivreCoordinates />))
    expect(antes).not.toMatch(SO_A_IDEIA)
    expect(antes).not.toContain('Leva a nave para a direita.')
    expect(antes).not.toContain('O canto de cima, à esquerda.')
    const direita = texto(tela(activity, play([lugar(440, 40)]), <LivreCoordinates />))
    expect(direita).toContain('Leva a nave para a direita.')
    expect(direita).not.toContain('Leva a nave para baixo')
  })

  test('o campo em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string[]][] = [
      [[], ['x']],
      [[lugar(440, 40)], ['y']],
      [
        [lugar(440, 40), lugar(440, 80)],
        ['x', 'y'],
      ],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDoEndereco(discoveryGuidance(activity, s)?.id)).not.toBeNull()
      expect(destaqueDoCampo(tela(activity, s, <LivreCoordinates />))).toEqual(esperado)
    }
  })
})
