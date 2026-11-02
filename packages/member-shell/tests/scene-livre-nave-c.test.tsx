import { describe, expect, test } from 'bun:test'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneId,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import {
  LivreFixedVsRead,
  proximoGestoDoNumeroDoTiro,
} from '../src/components/scene-livre/fixed-vs-read'
import { LivreGameState, proximoGestoDoEstado } from '../src/components/scene-livre/game-state'
import { LivreRestart, proximoGestoDoRecomeco } from '../src/components/scene-livre/restart'
import { LivreVariable, proximoGestoDaVariavel } from '../src/components/scene-livre/variable'
import { WalkNaBeirada } from '../src/components/scene-walk-beirada'
import { WalkEmCameraLenta } from '../src/components/scene-walk-camera-lenta'

/**
 * As telas livres de `variable`, `fixed-vs-read`, `game-state` e `restart` (Nave contra Asteroides,
 * 02/11/2026) e as telas do andar (`lighthouse-walk`) servindo à Nave sem mudar o Farol. Só a IDEIA
 * na tela; o que cada caso faz aparece depois do teste; o destaque é o gesto que o Zappy pede.
 */
const NAVE = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
} as const
const caso = (
  scene: SceneId,
  goals: string[],
  extra: Partial<NonNullable<ExperimentationActivity['setup']>> = {},
) => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene,
    cast: NAVE,
    cenario: 'nave',
    setup: { freeExploration: true, goals, ...extra },
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
/** Os rótulos dos botões em destaque (tom `gesto`). */
const destaques = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) =>
    texto(m[1] ?? '').trim(),
  )
/** Nada de bloco, regra, Se/então/senão, código nem área do Estúdio na tela livre. */
const SO_A_IDEIA =
  /\bregra\b|\bbloco|\bentão\b|\bsenão\b|\bSe o\b|Somar|Mostrar placar|Criar variável|estado do jogo|Reiniciar|centro x|x do tiro|Mudar o estado|\bcomando|\bcódigo|Ao iniciar|A cada quadro do jogo/

const segundo: SceneAction = { type: 'advance', seconds: 1 }
const segundos = (n: number): SceneAction[] => Array.from({ length: n }, () => segundo)

describe('variable: guardar e mostrar um número', () => {
  const { activity, play } = caso('variable', ['stored', 'changed-hidden', 'shown'])
  const guardar: SceneAction = { type: 'store', value: 0 }
  const acertar: SceneAction = { type: 'change', by: 1 }
  const mostrar: SceneAction = { type: 'show', on: true }
  const tirar: SceneAction = { type: 'show', on: false }
  const ver = (s: SceneState) => tela(activity, s, <LivreVariable />)

  test('só a ideia, os botões e a lista do que comparar', () => {
    for (const s of [play([]), play([guardar, acertar]), play([guardar, acertar, mostrar])]) {
      const lido = texto(ver(s))
      expect(lido).not.toMatch(SO_A_IDEIA)
      for (const rotulo of [
        'Guardar o número 0',
        'Acertar um asteroide',
        'Guarde um número e compare a caixa pontos com a tela do jogo.',
        'Com o número fora da tela, acerte um asteroide e compare a caixa com a tela.',
        'Mostre o número na tela e compare com o que estava guardado.',
      ])
        expect(lido).toContain(rotulo)
    }
    expect(texto(ver(play([])))).toContain('Mostrar o número na tela')
    expect(texto(ver(play([guardar, mostrar])))).toContain('Tirar o número da tela')
  })

  test('o que cada gesto faz só aparece depois do teste dele', () => {
    const antes = texto(ver(play([])))
    expect(antes.match(/Teste para descobrir/g)?.length).toBe(3)
    expect(antes).not.toContain('Pontos muda, e a tela continua sem número.')
    const escondido = texto(ver(play([guardar, acertar])))
    expect(escondido).toContain('Pontos muda, e a tela continua sem número.')
    expect(escondido).not.toContain('A tela mostra o mesmo número guardado')
    expect(texto(ver(play([guardar, acertar, mostrar])))).toContain(
      'A tela mostra o mesmo número guardado',
    )
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const rotulo = {
      guardar: 'Guardar o número 0',
      acertar: 'Acertar um asteroide',
      mostrar: 'Mostrar o número na tela',
      tirar: 'Tirar o número da tela',
    } as const
    const casos: [SceneAction[], keyof typeof rotulo | null][] = [
      [[], 'guardar'],
      [[guardar], 'acertar'],
      [[guardar, acertar], 'mostrar'],
      [[guardar, mostrar], 'tirar'],
      [[guardar, mostrar, tirar], 'acertar'],
      [[mostrar, guardar], 'tirar'],
      [[guardar, acertar, mostrar], null],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const g = proximoGestoDaVariavel(discoveryGuidance(activity, s)?.id, s.box)
      expect(g).toBe(esperado)
      expect(destaques(ver(s))).toEqual(esperado ? [rotulo[esperado]] : [])
    }
  })
})

describe('fixed-vs-read: o número escrito e o número lido', () => {
  const { activity, play } = caso('fixed-vs-read', ['same-spot', 'follows', 'box-marks'])
  const atirar: SceneAction = { type: 'shoot' }
  const lugar = (x: number): SceneAction => ({ type: 'place', x, y: 0 })
  const lido: SceneAction = { type: 'value-source', source: 'read' }
  const marcas: SceneAction = { type: 'box-marks', on: true }
  const ver = (s: SceneState) => tela(activity, s, <LivreFixedVsRead />)

  test('só a ideia: número escrito e número lido, sem "x do tiro" nem "centro x"', () => {
    for (const s of [play([]), play([lido, marcas, atirar]), play([atirar, lugar(600), atirar])]) {
      const lido_ = texto(ver(s))
      expect(lido_).not.toMatch(SO_A_IDEIA)
      for (const rotulo of [
        'Número escrito: 400',
        'Número lido da nave',
        'Esquerda',
        'Meio',
        'Direita',
        'Atirar',
        'Apagar as marcas dos tiros',
        'Com o número escrito, atire com a nave em dois lugares e compare as marcas.',
      ])
        expect(lido_).toContain(rotulo)
    }
    expect(texto(ver(play([lido, marcas])))).toContain('meio da nave')
  })

  test('o que cada número faz só aparece depois do teste dele', () => {
    const antes = texto(ver(play([])))
    expect(antes.match(/Teste para descobrir/g)?.length).toBe(3)
    const escrito = texto(ver(play([atirar, lugar(600), atirar])))
    expect(escrito).toContain('Sempre no mesmo lugar, onde quer que a nave esteja')
    expect(escrito).not.toContain('Onde a nave está na hora do tiro')
    expect(texto(ver(play([lido, atirar, lugar(600), atirar])))).toContain(
      'Onde a nave está na hora do tiro',
    )
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string | null][] = [
      [[], 'Atirar'],
      [[atirar], 'Direita'],
      [[atirar, lugar(600)], 'Atirar'],
      [[atirar, lugar(600), atirar], 'Número lido da nave'],
      [[atirar, lugar(600), atirar, lido], 'Atirar'],
      [[atirar, lugar(600), atirar, lido, atirar], 'Esquerda'],
      [[atirar, lugar(600), atirar, lido, atirar, lugar(200), atirar], 'Mostrar as marcas da nave'],
      [[lido, atirar, lugar(600), atirar], 'Número escrito: 400'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const g = proximoGestoDoNumeroDoTiro(discoveryGuidance(activity, s)?.id, s.fixedRead)
      expect(g === null).toBe(esperado === null)
      expect(destaques(ver(s))).toEqual(esperado ? [esperado] : [])
    }
  })
})

describe('game-state: a partida já começou?', () => {
  const { activity, play } = caso('game-state', ['outside', 'waiting', 'playing'], {
    preset: { id: 'pedra-40-quadros', clockFrames: 40, waitingSeconds: 4, moment: 'screen' },
  })
  const pergunta = (enabled: boolean): SceneAction => ({
    type: 'connect',
    port: 'condition',
    enabled,
  })
  const comecar: SceneAction = { type: 'start', input: 'tap' }
  const ver = (s: SceneState, rodando = false) => tela(activity, s, <LivreGameState />, rodando)

  test('a pergunta com sim e não, sem Se, então nem senão', () => {
    for (const s of [play([]), play([pergunta(true), ...segundos(4)]), play([comecar])]) {
      const lido = texto(ver(s))
      expect(lido).not.toMatch(SO_A_IDEIA)
      for (const rotulo of [
        'A pergunta do jogo',
        'a partida já começou?',
        'Deixar o tempo passar',
        'Começar a partida',
        'Voltar à tela de início',
        'Sem a pergunta, deixe o tempo passar na tela de início e observe o contador.',
      ])
        expect(lido).toContain(rotulo)
    }
    expect(texto(ver(play([])))).toContain('Ligar a pergunta')
    expect(texto(ver(play([pergunta(true)])))).toContain('Desligar a pergunta')
    expect(texto(ver(play([]), true))).toContain('Pausar o tempo')
  })

  test('o que cada resposta faz só aparece depois do teste dela', () => {
    const antes = texto(ver(play([])))
    expect(antes.match(/Teste para descobrir/g)?.length).toBe(3)
    const nao = texto(ver(play([pergunta(true), ...segundos(4)])))
    expect(nao).toContain('Nada nasce: o jogo espera')
    expect(nao).not.toContain('Nasce um asteroide')
    expect(texto(ver(play([pergunta(true), comecar, ...segundos(2)])))).toContain(
      'Nasce um asteroide',
    )
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], boolean, string | null][] = [
      [[], false, 'Deixar o tempo passar'],
      [[], true, null],
      [segundos(2), false, 'Ligar a pergunta'],
      [[...segundos(2), pergunta(true)], false, 'Deixar o tempo passar'],
      [[...segundos(2), pergunta(true), ...segundos(4)], false, 'Começar a partida'],
      [[pergunta(true), comecar, ...segundos(2)], false, 'Voltar à tela de início'],
      [[pergunta(true), ...segundos(4), comecar, ...segundos(2)], false, 'Desligar a pergunta'],
    ]
    for (const [acoes, rodando, esperado] of casos) {
      const s = play(acoes)
      const g = proximoGestoDoEstado(discoveryGuidance(activity, s)?.id, s.match, rodando)
      expect(g === null).toBe(esperado === null)
      expect(destaques(ver(s, rodando))).toEqual(esperado ? [esperado] : [])
    }
  })
})

describe('restart: jogar outra vez', () => {
  const { activity, play } = caso('restart', ['screen-only', 'back-to-menu'])
  const enter: SceneAction = { type: 'start', input: 'key' }
  const tudo = (enabled: boolean): SceneAction => ({ type: 'connect', port: 'restart', enabled })
  const ver = (s: SceneState, rodando = false) => tela(activity, s, <LivreRestart />, rodando)

  test('os dois jeitos com palavras da ideia, sem Reiniciar nem o estado do jogo', () => {
    for (const s of [
      play([]),
      play([enter, ...segundos(3)]),
      play([enter, ...segundos(3), enter, enter]),
    ]) {
      const lido = texto(ver(s))
      expect(lido).not.toMatch(SO_A_IDEIA)
      for (const rotulo of [
        'Apertar Enter',
        'Só voltar para a tela de início',
        'Começar tudo de novo',
        'Com Começar tudo de novo, jogue até bater, comece outra partida e compare os asteroides e a tela.',
      ])
        expect(lido).toContain(rotulo)
    }
  })

  test('o que cada jeito faz só aparece depois do teste dele', () => {
    const antes = texto(ver(play([])))
    expect(antes.match(/Teste para descobrir/g)?.length).toBe(2)
    const tela1 = texto(ver(play([enter, ...segundos(3), enter, enter])))
    expect(tela1).toContain('Os asteroides da partida anterior ficam na tela')
    expect(tela1).not.toContain('Os asteroides saem da tela')
    expect(texto(ver(play([tudo(true), enter, ...segundos(3), enter, enter])))).toContain(
      'Os asteroides saem da tela',
    )
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], boolean, string | null][] = [
      [[], false, 'Apertar Enter'],
      [[enter], true, null],
      [[enter], false, 'Deixar o tempo passar'],
      [[enter, ...segundos(3)], false, 'Apertar Enter'],
      [[enter, ...segundos(3), enter], false, 'Apertar Enter'],
      [[enter, ...segundos(3), enter, enter], false, 'Começar tudo de novo'],
      [[enter, ...segundos(3), enter, enter, tudo(true)], false, 'Apertar Enter'],
      [
        [tudo(true), enter, ...segundos(3), enter, enter, ...segundos(3)],
        false,
        'Só voltar para a tela de início',
      ],
    ]
    for (const [acoes, rodando, esperado] of casos) {
      const s = play(acoes)
      const g = proximoGestoDoRecomeco(discoveryGuidance(activity, s)?.id, s, rodando)
      expect(g === null).toBe(esperado === null)
      expect(destaques(ver(s, rodando))).toEqual(esperado ? [esperado] : [])
    }
  })
})

describe('lighthouse-walk: as telas do andar servem à Nave sem mudar o Farol', () => {
  const andar = (cenario: 'farol' | 'nave', goals: string[]) => {
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'lighthouse-walk',
      cenario,
      setup: { freeExploration: true, goals },
    }
    const start: SceneStart = { scene: 'lighthouse-walk', setup: activity.setup }
    const play = (actions: SceneAction[]) =>
      actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
    return { activity, play }
  }
  const QUADRO: SceneAction = { type: 'advance', seconds: 1 / 30 }
  const SETA: SceneAction = { type: 'hold-arrow', held: true }
  const LENTA = ['moves-each-frame', 'stopped-after-release', 'walked-real-speed']
  const BEIRADA = ['left-the-screen', 'came-back-inside', 'stayed-inside']

  test('câmera lenta: a Nave no espaço, sem a chave nem o farol; o Farol com tudo', () => {
    const nave = andar('nave', LENTA)
    const s = nave.play([SETA, QUADRO, QUADRO])
    const html = tela(nave.activity, s, <WalkEmCameraLenta />)
    // O espaço da Nave: nenhuma imagem do mapa do Farol (praia, farol, chave, aventureiro).
    expect(html).toContain('data-mundo="nave"')
    expect(html).not.toContain('<image')
    expect(texto(html)).toContain('A nave já deu 2 passinhos, e cada um deixou uma marca.')
    expect(texto(html)).not.toMatch(/\bbloco|\bregra\b|comando|sprite/i)

    const farol = andar('farol', LENTA)
    const htmlFarol = tela(
      farol.activity,
      farol.play([SETA, QUADRO, QUADRO]),
      <WalkEmCameraLenta />,
    )
    expect(htmlFarol).toContain('data-mundo="farol"')
    expect(htmlFarol.match(/<image/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
    expect(texto(htmlFarol)).toContain(
      'O personagem já deu 2 passinhos, e cada um deixou uma pegada.',
    )
  })

  test('câmera lenta: a mesma tela, sem cenário declarado, é a do Farol', () => {
    const { play } = andar('farol', LENTA)
    const sem: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'lighthouse-walk',
      setup: { freeExploration: true, goals: LENTA },
    }
    expect(tela(sem, play([]), <WalkEmCameraLenta />)).toBe(
      tela(andar('farol', LENTA).activity, play([]), <WalkEmCameraLenta />),
    )
  })

  test('beirada: a Nave com o palco do espaço e o nome dela; o Farol como antes', () => {
    const nave = andar('nave', BEIRADA)
    const longe = Array.from({ length: 100 }, () => QUADRO)
    const fora = nave.play([SETA, ...longe])
    const html = tela(nave.activity, fora, <WalkNaBeirada />)
    expect(html).not.toContain('data-fundo="farol"')
    expect(texto(html)).toContain('Leve a nave até a beirada com o limite desligado.')
    expect(texto(html)).toContain('Ligue o limite com a nave fora da tela.')
    expect(texto(html)).toContain('A nave saiu da janela do jogo.')

    const farol = andar('farol', BEIRADA)
    const htmlFarol = tela(farol.activity, farol.play([SETA, ...longe]), <WalkNaBeirada />)
    expect(htmlFarol).toContain('data-fundo="farol"')
    expect(texto(htmlFarol)).toContain('Leve o personagem até a beirada com o limite desligado.')
    expect(texto(htmlFarol)).toContain('Ligue o limite com o personagem fora da tela.')
    expect(texto(htmlFarol)).toContain('Ele saiu da janela do jogo.')
  })

  test('as metas da câmera lenta e da beirada caem com a Nave como no Farol', () => {
    for (const cenario of ['farol', 'nave'] as const) {
      const lenta = andar(cenario, LENTA)
      const s = lenta.play([
        { type: 'walk-pace', pace: 'lenta' },
        SETA,
        QUADRO,
        QUADRO,
        { type: 'hold-arrow', held: false },
        QUADRO,
        { type: 'walk-pace', pace: 'real' },
        SETA,
        ...Array.from({ length: 30 }, () => QUADRO),
      ])
      for (const meta of LENTA) expect(s.evidence.discoveries).toContain(meta)
    }
  })
})
