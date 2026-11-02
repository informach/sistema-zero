import { describe, expect, test } from 'bun:test'
import { CAMINHOS_LIVRES_NAVE_A, quadros } from '../../../tests/fixtures/caminhos-livres/nave-a'
import type { SceneAction, SceneId } from './actions'
import { openScene, stepScene } from './engine'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  sceneStart,
  sceneTargets,
} from './index'
import { ONCE_VS_ALWAYS_PRESETS } from './presets'
import { initialExperiment, stepExperiment } from './session'
import type { SceneStart } from './state'

/**
 * A exploração livre de cinco cenas da Nave contra Asteroides (e da aula 5 do Meu Jeito), 02/11/2026:
 * `once-vs-always`, `draw-loop`, `world`, `layers` e `coordinates`. A experiência trabalha só a IDEIA
 * e convida à investigação: antes do teste, o Zappy pergunta e diz o que observar; o resultado só
 * aparece na fala de DEPOIS dele.
 */
const CENAS = ['once-vs-always', 'draw-loop', 'world', 'layers', 'coordinates'] as const
const falas = new Map(
  CENAS.flatMap((cena) => discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const)),
)

const livre = (
  scene: SceneId,
  setup: Omit<NonNullable<ExperimentationActivity['setup']>, 'freeExploration'> = {},
  extra: Partial<ExperimentationActivity> = {},
): ExperimentationActivity => ({
  type: 'experimentation',
  scene,
  cenario: 'nave',
  cast: { hero: { name: 'nave', gender: 'f' } },
  ...extra,
  setup: { freeExploration: true, ...setup },
})

/** Os blocos dos manifestos, com o caso de cada um e a exploração livre ligada. */
export const BLOCOS_LIVRES_NAVE_A: Record<string, ExperimentationActivity> = {
  'primeira-nave/once': livre('once-vs-always', {
    goals: ['once', 'always'],
    preset: ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave'],
  }),
  'dia-2/once': livre('once-vs-always', {
    goals: ['on-event', 'key-fires', 'flood'],
    preset: ONCE_VS_ALWAYS_PRESETS['tres-caixas-tiro'],
  }),
  'dia-4/once': livre('once-vs-always', {
    goals: ['once', 'lives-loop'],
    preset: ONCE_VS_ALWAYS_PRESETS['uma-ficha-vidas'],
  }),
  'primeira-nave/coordinates': livre('coordinates', {
    actions: [
      { type: 'stage', width: 800, height: 480 },
      { type: 'place', x: 400, y: 40 },
    ],
    goals: ['right', 'down', 'origin'],
  }),
  'primeira-nave/world': livre('world'),
  'primeira-nave/draw-loop': livre('draw-loop', { goals: ['frozen', 'trail', 'moving'] }),
  'dia-1/layers': livre(
    'layers',
    { goals: ['front', 'covered', 'back-in-front'] },
    {
      cast: {
        hero: { name: 'nave', gender: 'f' },
        scenery: { name: 'fundo de estrelas', gender: 'm', figure: 'estrelas' },
      },
    },
  ),
  'meu-jeito-5/layers': livre(
    'layers',
    { goals: ['front', 'covered', 'back-in-front'] },
    {
      pilha: 'camadas',
      cenario: 'meu-jeito',
      cast: { hero: { name: 'pedra', gender: 'f' }, scenery: { name: 'chama', gender: 'f' } },
    },
  ),
}

const jogar = (activity: ExperimentationActivity, actions: SceneAction[]) => {
  const start: SceneStart = sceneStart(activity)
  return actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const fala = (activity: ExperimentationActivity, actions: SceneAction[]) =>
  discoveryGuidance(activity, jogar(activity, actions))?.id

const SO_A_IDEIA =
  /\bregra|\bbloco|\bentão\b|\bsenão\b|\bcomando|\bcódigo|Ao iniciar|Enquanto estiver rodando|Quando acontecer|Limpar a tela|sprite|\bação\b|\bações\b/i

describe('Nave A: o Zappy fala só da ideia', () => {
  test('as cinco cenas têm falas próprias, com o prefixo da cena', () => {
    for (const cena of CENAS) {
      const ids = discoverySpeechSteps(cena).map((s) => s.id)
      expect(ids.length).toBeGreaterThan(3)
      for (const id of ids) expect(id.startsWith(`${cena}-`)).toBe(true)
    }
  })

  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, área, regra, Se/então/senão nem código', (id) => {
    expect(falas.get(id)).not.toMatch(SO_A_IDEIA)
  })

  test('as falas pedem o gesto pelo rótulo do botão: clique em, nunca "aperte"', () => {
    for (const [id, texto] of falas) {
      expect([id, texto]).not.toEqual([
        id,
        expect.stringMatching(/\baperte\b|você apertar|ninguém apertar/i),
      ])
      if (/Apertar a tecla/.test(texto ?? ''))
        expect(texto).toMatch(/clicar em Apertar a tecla|Clique em Apertar a tecla/)
    }
  })

  const ANTES: [string, RegExp][] = [
    ['once-vs-always-nave-start', /parou|ficou parada|sair da tela|mais um pouquinho/i],
    ['once-vs-always-nave-try-once', /parou|ficou parada|uma vez só/i],
    ['once-vs-always-nave-try-always', /sair da tela|mais um pouquinho|continuou/i],
    ['once-vs-always-vidas-start', /tirou|voltaram|encher/i],
    ['once-vs-always-vidas-try-once', /tirou|acabar|encher/i],
    ['once-vs-always-vidas-try-always', /voltaram|encher|três, mesmo/i],
    ['once-vs-always-tiro-start', /nenhum|esperando\.|tiro novo|chuva/i],
    ['once-vs-always-tiro-try-event', /nenhum tiro|não saiu|ficou esperando/i],
    ['once-vs-always-tiro-event', /saiu um tiro\b(?!; sem)/i],
    ['once-vs-always-tiro-try-loop', /mais um tiro|tiro novo|chuva/i],
    ['once-vs-always-tiro-try-start', /saiu um tiro|mais nenhum|um tiro só/i],
    ['draw-loop-start', /continuou igual|parada|ficaram|juntando/i],
    ['draw-loop-try-once', /continuou igual|parada/i],
    ['draw-loop-try-every', /ficaram|juntando|desenhos velhos/i],
    ['draw-loop-try-erase', /uma nave só|andando/i],
    ['draw-loop-try-clear', /vazia/i],
    ['world-start', /continuou vazia|não é o mesmo/i],
    ['world-created', /mesma nave|no mesmo lugar/i],
    ['world-shown', /continuou nos bastidores|existe no jogo mesmo/i],
    ['coordinates-start', /direita|para baixo|canto/i],
    ['coordinates-y', /para baixo/i],
    ['coordinates-x', /direita/i],
    ['coordinates-origin', /canto de cima|à esquerda/i],
    ['layers-start', /inteira|na frente/i],
    ['layers-front', /escondida|apagado/i],
    ['layers-camadas-start', /inteira|na frente/i],
    ['layers-camadas-front', /escondida|apagado/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('Nave A: um caminho da exploração livre completa as metas de cada bloco', () => {
  test.each(Object.entries(BLOCOS_LIVRES_NAVE_A))('%s', (_onde, activity) => {
    const start = sceneStart(activity)
    let sessao = initialExperiment(start)
    for (const acao of CAMINHOS_LIVRES_NAVE_A[activity.scene] ?? [])
      sessao = stepExperiment(start, sessao, acao).session
    const metas = sceneTargets(activity)
    expect(metas.length).toBeGreaterThan(0)
    for (const meta of metas)
      expect([meta, sessao.state.evidence.discoveries]).toEqual([
        meta,
        expect.arrayContaining([meta]),
      ])
    expect(discoveryGuidance(activity, sessao.state)?.id).toMatch(/-complete$/)
  })
})

describe('once-vs-always livre: a fala acompanha a ordem e o motor', () => {
  const nave = BLOCOS_LIVRES_NAVE_A['primeira-nave/once'] as ExperimentationActivity
  const tiro = BLOCOS_LIVRES_NAVE_A['dia-2/once'] as ExperimentationActivity
  const vidas = BLOCOS_LIVRES_NAVE_A['dia-4/once'] as ExperimentationActivity
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

  test('a nave: começando por sempre, a fala propõe uma vez no começo', () => {
    expect(fala(nave, [])).toBe('once-vs-always-nave-start')
    expect(fala(nave, [mover('loop')])).toBe('once-vs-always-nave-try-always')
    expect(fala(nave, [mover('loop'), ...quadros(24)])).toBe('once-vs-always-nave-always')
    expect(fala(nave, [mover('loop'), ...quadros(24), mover('start')])).toBe(
      'once-vs-always-nave-try-once',
    )
    expect(fala(nave, [mover('loop'), ...quadros(24), mover('start'), ...quadros(3)])).toBe(
      'once-vs-always-nave-complete',
    )
    expect(fala(nave, [mover('start'), ...quadros(3)])).toBe('once-vs-always-nave-once')
  })

  test('as vidas: a mesma comparação, com as batidas', () => {
    const vidasEm = (area: 'start' | 'loop'): SceneAction => ({
      type: 'place-in-area',
      card: 'lives',
      area,
    })
    expect(fala(vidas, [])).toBe('once-vs-always-vidas-start')
    expect(fala(vidas, [vidasEm('loop'), ...quadros(9)])).toBe('once-vs-always-vidas-always')
    expect(fala(vidas, [vidasEm('start'), ...quadros(9)])).toBe('once-vs-always-vidas-once')
  })

  test('o tiro: só a ficha do tiro é escolha; o resto abre no lugar do jogo', () => {
    const aberta = openScene(sceneStart(tiro))
    expect(aberta.once.placement).toMatchObject({
      paint: 'start',
      create: 'start',
      move: 'loop',
      event: 'outside',
    })
    // Sem a exploração livre, o caso do Corre Dino e o bloco antigo continuam como eram.
    const antigo = openScene({
      scene: 'once-vs-always',
      setup: { ...tiro.setup, freeExploration: undefined },
    })
    expect(Object.values(antigo.once.placement).every((a) => a === 'outside')).toBe(true)
  })

  test('o tiro: começando por sempre, depois a tecla antes da hora e Jogar de novo', () => {
    expect(fala(tiro, [])).toBe('once-vs-always-tiro-start')
    expect(fala(tiro, [evento('loop')])).toBe('once-vs-always-tiro-try-loop')
    expect(fala(tiro, [evento('loop'), ...quadros(5)])).toBe('once-vs-always-tiro-flood')
    const cedo = [evento('loop'), ...quadros(5), evento('event'), { type: 'trigger' } as const]
    expect(fala(tiro, cedo)).toBe('once-vs-always-tiro-key')
    // Escolher de novo o mesmo jeito é uma partida nova, e o tiro de antes sai da conta.
    const deNovo = jogar(tiro, [...cedo, evento('event')])
    expect(deNovo.once.fires.event).toBe(0)
    expect(deNovo.once.frames).toBe(0)
    expect(fala(tiro, [...cedo, evento('event'), ...quadros(3)])).toBe(
      'once-vs-always-tiro-complete',
    )
  })

  test('o tiro: esperando, a tecla, e a fala propõe sempre', () => {
    expect(fala(tiro, [evento('event')])).toBe('once-vs-always-tiro-try-event')
    expect(fala(tiro, [evento('event'), ...quadros(3)])).toBe('once-vs-always-tiro-event')
    expect(fala(tiro, [evento('event'), ...quadros(3), { type: 'trigger' }])).toBe(
      'once-vs-always-tiro-event-flood',
    )
    expect(fala(tiro, [evento('start')])).toBe('once-vs-always-tiro-try-start')
    expect(fala(tiro, [evento('start'), ...quadros(5)])).toBe('once-vs-always-tiro-once')
  })

  test('Jogar de novo só existe na exploração livre', () => {
    const start: SceneStart = {
      scene: 'once-vs-always',
      setup: { preset: ONCE_VS_ALWAYS_PRESETS['tres-caixas-tiro'] },
    }
    const s = [evento('event'), { type: 'trigger' } as const, evento('event')].reduce(
      (e, a) => stepScene(start, e, a),
      openScene(start),
    )
    expect(s.once.fires.event).toBe(1)
  })
})

describe('draw-loop livre: a fala acompanha o jeito escolhido', () => {
  const d = BLOCOS_LIVRES_NAVE_A['primeira-nave/draw-loop'] as ExperimentationActivity
  const passo: SceneAction = { type: 'advance', seconds: 0.25 }
  const cada = (on: boolean): SceneAction => ({ type: 'loop', on })
  const apagar = (on: boolean): SceneAction => ({ type: 'erase', on })
  test('a ordem da história', () => {
    expect(fala(d, [])).toBe('draw-loop-start')
    expect(fala(d, [passo])).toBe('draw-loop-frozen')
    expect(fala(d, [passo, cada(true)])).toBe('draw-loop-try-every')
    expect(fala(d, [passo, cada(true), passo])).toBe('draw-loop-trail')
    expect(fala(d, [passo, cada(true), passo, apagar(true)])).toBe('draw-loop-try-erase')
    expect(fala(d, [passo, cada(true), passo, apagar(true), passo])).toBe('draw-loop-complete')
  })
  test('começando por apagar e desenhar em todo quadro', () => {
    expect(fala(d, [cada(true), apagar(true)])).toBe('draw-loop-try-erase')
    expect(fala(d, [cada(true), apagar(true), passo])).toBe('draw-loop-moving-once')
    expect(fala(d, [cada(true), apagar(true), passo, apagar(false)])).toBe('draw-loop-try-every')
    expect(fala(d, [cada(true), apagar(true), passo, apagar(false), passo])).toBe(
      'draw-loop-trail-once',
    )
    expect(fala(d, [cada(true), apagar(true), passo, apagar(false), passo, cada(false)])).toBe(
      'draw-loop-try-once',
    )
  })
  test('apagar sem desenhar de novo deixa a tela vazia, e a fala diz como a nave volta', () => {
    expect(fala(d, [apagar(true)])).toBe('draw-loop-try-clear')
    expect(fala(d, [apagar(true), passo])).toBe('draw-loop-empty')
    expect(fala(d, [apagar(true), passo, apagar(false)])).toBe('draw-loop-empty')
    expect(
      jogar(d, [apagar(true), passo, apagar(false), passo]).evidence.discoveries,
    ).not.toContain('frozen')
  })
})

describe('world livre', () => {
  const w = BLOCOS_LIVRES_NAVE_A['primeira-nave/world'] as ExperimentationActivity
  const mostrar = (enabled: boolean): SceneAction => ({ type: 'connect', port: 'draw', enabled })
  test('a fala acompanha criar, mostrar e tirar', () => {
    expect(fala(w, [])).toBe('world-start')
    expect(fala(w, [{ type: 'create' }])).toBe('world-created')
    expect(fala(w, [{ type: 'create' }, mostrar(true)])).toBe('world-shown')
    expect(fala(w, [{ type: 'create' }, mostrar(true), mostrar(false)])).toBe('world-complete')
  })
  test('mostrar o que ainda não existe não faz nada', () => {
    expect(jogar(w, [mostrar(true)]).evidence.discoveries).toEqual([])
    expect(fala(w, [mostrar(true)])).toBe('world-start')
  })
})

describe('layers livre', () => {
  const nave = BLOCOS_LIVRES_NAVE_A['dia-1/layers'] as ExperimentationActivity
  const pinta = BLOCOS_LIVRES_NAVE_A['meu-jeito-5/layers'] as ExperimentationActivity
  const frente = (front: boolean): SceneAction => ({ type: 'layer', front })
  test('a ordem desenhada (Nave) e a lista Camadas (Meu Jeito)', () => {
    expect(fala(nave, [])).toBe('layers-start')
    expect(fala(nave, [frente(true)])).toBe('layers-front')
    expect(fala(nave, [frente(true), frente(false)])).toBe('layers-covered')
    expect(fala(pinta, [])).toBe('layers-camadas-start')
    expect(fala(pinta, [frente(true)])).toBe('layers-camadas-front')
    expect(fala(pinta, [frente(true), frente(false)])).toBe('layers-camadas-covered')
    expect(fala(pinta, [frente(true), frente(false), frente(true)])).toBe('layers-camadas-complete')
  })
  test('as falas das Camadas usam os nomes do Pinta; as da Nave, não', () => {
    for (const [id, texto] of falas)
      if (id.startsWith('layers-camadas-')) {
        if (!id.endsWith('complete')) expect(texto).toMatch(/Uma camada para/)
      } else if (id.startsWith('layers-')) expect(texto).not.toMatch(/camada/i)
  })
})

describe('coordinates livre', () => {
  const c = BLOCOS_LIVRES_NAVE_A['primeira-nave/coordinates'] as ExperimentationActivity
  const lugar = (x: number, y: number): SceneAction => ({ type: 'place', x, y })
  test('começando pelo x', () => {
    expect(fala(c, [])).toBe('coordinates-start')
    expect(fala(c, [lugar(440, 40)])).toBe('coordinates-y')
    expect(fala(c, [lugar(440, 40), lugar(440, 80)])).toBe('coordinates-origin')
  })
  test('começando pelo y, ou pelo canto', () => {
    expect(fala(c, [lugar(400, 80)])).toBe('coordinates-x')
    expect(fala(c, [lugar(0, 40), lugar(0, 0)])).toBe('coordinates-origin-first')
    expect(fala(c, [lugar(0, 40), lugar(0, 0), lugar(40, 0), lugar(40, 40)])).toBe(
      'coordinates-complete',
    )
  })
})
