import { describe, expect, test } from 'bun:test'
import {
  CAMINHOS_LIVRES_DINO_A,
  lado,
  quadroDaVelocidade,
  segundos,
  sortearLugar,
  sortearVelocidade,
  tocar,
} from '../../../tests/fixtures/caminhos-livres/dino-a'
import { quadros } from '../../../tests/fixtures/caminhos-livres/nave-a'
import { freeExplorationPaths } from '../../../tests/fixtures/free-exploration-paths'
import type { SceneAction, SceneId } from './actions'
import { openScene, stepScene } from './engine'
import { GUIAS_LIVRES } from './guia-livre'
import { guia as coordinatesNave } from './guia-livre/coordinates'
import { GUIAS_DINO_A } from './guia-livre/dino'
import { guia as drawLoopNave } from './guia-livre/draw-loop'
import { guia as worldNave } from './guia-livre/world'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  isSceneSetup,
  sceneStart,
  sceneTargets,
} from './index'
import { ONCE_VS_ALWAYS_PRESETS } from './presets'
import { initialExperiment, stepExperiment } from './session'

/**
 * A exploração livre das 12 experiências do Corre Dino que usam cenas da Nave contra Asteroides
 * (frente A, 02/11/2026): a variante do Dino de cada cena compartilhada, escolhida pelo cenário do
 * bloco. Só a IDEIA; antes do teste o Zappy pergunta, depois explica; a fala acompanha a ordem que a
 * criança escolhe; o caminho livre completa as metas que os blocos do Dino devem pedir.
 */

const dino = (
  scene: SceneId,
  setup: Omit<NonNullable<ExperimentationActivity['setup']>, 'freeExploration'>,
  extra: Partial<ExperimentationActivity> = {},
): ExperimentationActivity => ({
  type: 'experimentation',
  scene,
  cenario: 'corre-dino',
  ...extra,
  setup: { freeExploration: true, ...setup },
})

/** Os blocos do Corre Dino como devem ficar nos manifestos (o `setup` do relatório da frente A). */
export const BLOCOS_LIVRES_DINO_A: Record<string, ExperimentationActivity> = {
  'aula-01/experiencia-uma-vez-e-sempre': dino(
    'once-vs-always',
    {
      preset: {
        ...ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave'],
        cards: [{ id: 'move', kind: 'move', label: 'Mover o Dino um pouquinho' }],
      },
      goals: ['once', 'always'],
    },
    {
      cast: {
        hero: { name: 'Dino', gender: 'm', figure: 'dino' },
        obstacle: { name: 'cacto', gender: 'm', figure: 'cacto' },
      },
    },
  ),
  'aula-01/experiencia-coordenadas': dino('coordinates', { goals: ['right', 'down', 'origin'] }),
  'aula-01/descoberta': dino('world', { goals: ['hidden', 'visible'] }),
  'aula-02/experiencia-laco': dino('draw-loop', { goals: ['frozen', 'trail', 'moving'] }),
  'aula-02/experiencia-camadas': dino('layers', { goals: ['front', 'covered', 'back-in-front'] }),
  'aula-04/experiencia-tres-areas': dino('once-vs-always', {
    preset: ONCE_VS_ALWAYS_PRESETS['tres-caixas-som'],
    goals: ['on-event', 'key-fires'],
  }),
  'aula-05/experiencia-ritmo': dino('spawn', { goals: ['every-frame', 'with-timer'] }),
  'aula-05/experiencia-velocidade': dino(
    'velocity',
    { goals: ['moves', 'left', 'stopped'] },
    { cast: { hero: { name: 'cacto', gender: 'm' } } },
  ),
  'aula-06/experiencia-visivel-guardado': dino('cleanup', {
    goals: ['invisible-stored', 'rule-removes'],
  }),
  'aula-07/experiencia-condicao': dino('game-state', { goals: ['outside', 'waiting', 'playing'] }),
  'aula-09/experiencia-restart': dino('restart', { goals: ['screen-only', 'clean-track'] }),
  'aula-11/experiencia-variavel': dino('variable', {
    goals: ['stored', 'changed-hidden', 'shown'],
  }),
  'aula-12/experiencia-random': dino(
    'random',
    { goals: ['positions', 'repeat', 'velocities'] },
    { cast: { obstacle: { name: 'cacto', gender: 'm' } } },
  ),
}

const CENAS = Object.keys(GUIAS_DINO_A) as SceneId[]
const FALAS_DO_DINO = new Map(
  CENAS.flatMap((cena) => Object.entries(GUIAS_DINO_A[cena]?.speech ?? {})),
)

const jogar = (activity: ExperimentationActivity, actions: readonly SceneAction[]) => {
  const start = sceneStart(activity)
  return actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const fala = (activity: ExperimentationActivity, actions: readonly SceneAction[]) =>
  discoveryGuidance(activity, jogar(activity, actions))?.id
const bloco = (onde: string) => BLOCOS_LIVRES_DINO_A[onde] as ExperimentationActivity

/** Bloco, área do Estúdio, regra, condição, código e os nomes dos blocos do Corre Dino. */
const SO_A_IDEIA_DINO =
  /\bregra|\bbloco|\bent[aã]o\b|\bsen[aã]o\b|\bcomando|\bc[oó]digo|\bEst[uú]dio|(^|\s)áreas?\b|Ao iniciar|Enquanto estiver|Quando acontecer|\bA cada (\d+ )?quadros?\b|Criar (asteroide|cacto|pedra|tiro)b|Tirar do grupo quem sair|Limpar a tela|sprite|\bação\b|\bações\b|\bvx\b|\bvy\b|Sortear lugar|Somar|Mostrar placar|Criar variável|estado do jogo|Reiniciar|inicio\b|Tocar efeito|Desenhar o sprite|\bcampo\b/i

describe('Dino A: os blocos ligam a exploração livre', () => {
  test.each(Object.entries(BLOCOS_LIVRES_DINO_A))('%s: o caso é válido', (_onde, activity) => {
    expect(isSceneSetup(activity.setup, activity.scene)).toBe(true)
    expect(sceneTargets(activity).length).toBeGreaterThan(1)
  })
})

describe('Dino A: o Zappy fala só da ideia', () => {
  test('cada cena compartilhada tem a variante do Dino no registro, com ids <cena>-dino-', () => {
    for (const cena of CENAS) {
      const ids = Object.keys(GUIAS_DINO_A[cena]?.speech ?? {})
      expect(ids.length).toBeGreaterThan(3)
      for (const id of ids) expect(id.startsWith(`${cena}-dino-`)).toBe(true)
      // O registro tem as duas variantes juntas (a voz grava e o Admin ajusta pelo registro).
      for (const id of ids) expect(GUIAS_LIVRES[cena]?.speech[id]).toBe(FALAS_DO_DINO.get(id))
    }
  })

  test.each([
    ...FALAS_DO_DINO.keys(),
  ])('%s não fala de bloco, área, regra, Se, então, senão nem código', (id) => {
    const texto = FALAS_DO_DINO.get(id) ?? ''
    expect(texto).not.toMatch(SO_A_IDEIA_DINO)
    // O "Se" do bloco, com maiúscula; o "se" no meio da frase é português.
    expect(texto).not.toMatch(/\bSe\b/)
    expect(texto).not.toMatch(/\baperte\b|você apertar|ninguém apertar/i)
    if (/Apertar a tecla/.test(texto))
      expect(texto).toMatch(/clicar em Apertar a tecla|Clique em Apertar a tecla/)
    expect(texto.length).toBeGreaterThan(40)
  })

  /** A fala de ANTES de um teste não pode contar o resultado dele. */
  const ANTES: [string, RegExp][] = [
    ['once-vs-always-dino-start', /parou|ficou parado|sair da tela|mais um pouquinho/i],
    ['once-vs-always-dino-try-once', /parou|ficou parado|uma vez só/i],
    ['once-vs-always-dino-try-always', /sair da tela|mais um pouquinho|continuou/i],
    ['once-vs-always-dino-som-start', /nenhuma vez|esperando\.|tocou/i],
    ['once-vs-always-dino-som-try-event', /não tocou|nenhuma vez|ficou esperando/i],
    ['once-vs-always-dino-som-event', /o som tocou\b(?!; sem)/i],
    ['once-vs-always-dino-som-try-loop', /tocou|de novo em todo/i],
    ['once-vs-always-dino-som-try-start', /tocou|mais nenhuma/i],
    ['coordinates-dino-start', /direita|para baixo|canto/i],
    ['coordinates-dino-y', /para baixo/i],
    ['coordinates-dino-x', /direita/i],
    ['coordinates-dino-origin', /canto de cima|à esquerda/i],
    ['world-dino-start', /continuou vazia|não é o mesmo/i],
    ['world-dino-created', /mesmo Dino|no mesmo lugar/i],
    ['world-dino-shown', /continuou nos bastidores|existe no jogo mesmo/i],
    ['draw-loop-dino-start', /continuou igual|parada|ficaram|juntando/i],
    ['draw-loop-dino-try-once', /continuou igual|parada/i],
    ['draw-loop-dino-try-every', /ficaram|juntando|desenhos velhos/i],
    ['draw-loop-dino-try-erase', /um Dino só|andando/i],
    ['draw-loop-dino-try-clear', /vazia/i],
    ['layers-dino-start', /inteiro|na frente/i],
    ['layers-dino-front', /escondido|apagado/i],
    ['spawn-dino-start', /trinta|\b30\b|colad|parede/i],
    ['spawn-dino-wait', /espaço entre|um de cada vez|separad/i],
    ['spawn-dino-wall', /espaço|um de cada vez|separad/i],
    ['spawn-dino-gap', /trinta|\b30\b|colad|parede/i],
    ['velocity-dino-start', /direita|esquerda|aument|diminu/i],
    ['velocity-dino-positive', /direita|esquerda|aument|diminu/i],
    ['velocity-dino-negative', /direita|esquerda|aument|diminu/i],
    ['velocity-dino-right', /esquerda|diminu/i],
    ['velocity-dino-left', /direita|aument/i],
    ['velocity-dino-zero', /parado|não muda|nada muda/i],
    ['velocity-dino-stopped', /esquerda|diminu/i],
    ['cleanup-dino-start', /continu|guarda e move|removid|ainda/i],
    ['cleanup-dino-on-first', /continu|removid|saiu do grupo/i],
    ['cleanup-dino-stored', /removid|saiu do grupo/i],
    ['cleanup-dino-removed', /continu|ainda guarda/i],
    ['game-state-dino-start', /nasceram|nascem até|nenhum cacto/i],
    ['game-state-dino-start-question', /resposta foi|nenhum cacto nasceu|nada nasce/i],
    ['game-state-dino-outside', /resposta foi|nenhum cacto nasceu|esperou/i],
    ['game-state-dino-waiting', /resposta foi sim|cactos nasceram/i],
    ['game-state-dino-playing-first', /resposta foi não|nenhum cacto nasceu|esperou/i],
    ['game-state-dino-without', /cactos nasceram|nascem até/i],
    ['restart-dino-start', /ficaram na pista|acabou na hora|saíram da pista|começou limpa/i],
    ['restart-dino-screen-only', /saíram da pista|abertura volt|começou limpa/i],
    ['restart-dino-everything', /ficaram na pista|acabou na hora/i],
    ['variable-dino-start', /continuou sem número|guardar não é mostrar|ficou guardado/i],
    ['variable-dino-stored', /pontos mudou|nem ficou sabendo|muda mesmo escondido/i],
    ['variable-dino-hidden', /mostrou|mesmo número|continuou igual|sem mudar/i],
    ['random-dino-start', /diferente|repet|500|560/i],
    ['random-dino-once', /diferente|repet/i],
    ['random-dino-places', /repetiu|saiu duas vezes/i],
    ['random-dino-repeat', /−6|mais longe|mais rápido/i],
    ['random-dino-speed-once', /mais longe|−6 chegou/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(FALAS_DO_DINO.get(id)).toBeString()
    expect(FALAS_DO_DINO.get(id)).not.toMatch(resultado)
  })

  test('as comparações do fim são as do vídeo: os gols de cabeça e o placar, e o dado', () => {
    const variavel = FALAS_DO_DINO.get('variable-dino-complete') ?? ''
    expect(variavel).toContain('gols de cabeça')
    expect(variavel).toContain('placar')
    expect(FALAS_DO_DINO.get('random-dino-complete')).toContain('dado')
    // A casa não usa "caderno", e o vídeo do sorteio não usa o papel do saco.
    for (const id of ['variable-dino-complete', 'random-dino-complete'])
      expect(FALAS_DO_DINO.get(id)).not.toMatch(/caderno|saco/i)
  })
})

describe('Dino A: a variante segue o cenário do bloco', () => {
  test('o mesmo estado dá a fala da Nave no bloco da Nave e a do Dino no bloco do Dino', () => {
    const naveBloco: ExperimentationActivity = {
      ...bloco('aula-01/experiencia-coordenadas'),
      cenario: 'nave',
    }
    const estado = jogar(bloco('aula-01/experiencia-coordenadas'), [])
    expect(discoveryGuidance(naveBloco, estado)?.id).toBe('coordinates-start')
    expect(discoveryGuidance(bloco('aula-01/experiencia-coordenadas'), estado)?.id).toBe(
      'coordinates-dino-start',
    )
  })

  test('as variantes espelho têm a fala do Dino para cada passo da Nave', () => {
    const espelhos: [string, Record<string, string>][] = [
      ['coordinates', { ...coordinatesNave.speech }],
      ['world', { ...worldNave.speech }],
      ['draw-loop', { ...drawLoopNave.speech }],
    ]
    for (const [cena, falasDaNave] of espelhos)
      for (const id of Object.keys(falasDaNave))
        expect(FALAS_DO_DINO.has(id.replace(`${cena}-`, `${cena}-dino-`))).toBe(true)
  })
})

describe('Dino A: um caminho livre completa as metas de cada bloco', () => {
  const completa = (activity: ExperimentationActivity, caminho: readonly SceneAction[]) => {
    const start = sceneStart(activity)
    let sessao = initialExperiment(start)
    for (const acao of caminho) {
      if (acao.type === 'advance') expect(acao.seconds).toBeLessThanOrEqual(1)
      sessao = stepExperiment(start, sessao, acao).session
    }
    for (const meta of sceneTargets(activity))
      expect([meta, sessao.state.evidence.discoveries]).toEqual([
        meta,
        expect.arrayContaining([meta]),
      ])
    expect(discoveryGuidance(activity, sessao.state)?.id).toMatch(/-dino-(som-)?complete$/)
  }
  test.each(Object.entries(BLOCOS_LIVRES_DINO_A))('%s (o caminho do Dino)', (_onde, activity) =>
    completa(activity, CAMINHOS_LIVRES_DINO_A[activity.scene] ?? []))
  // A fixture compartilhada põe o caminho do Dino depois do da Nave: serve aos dois cursos.
  test.each(Object.entries(BLOCOS_LIVRES_DINO_A))('%s (a fixture compartilhada)', (_o, activity) =>
    completa(activity, freeExplorationPaths[activity.scene] ?? []))
})

describe('Dino A: a fala acompanha a ordem que a criança escolhe', () => {
  test('once-vs-always (Aula 1): começando por sempre, a fala propõe uma vez', () => {
    const b = bloco('aula-01/experiencia-uma-vez-e-sempre')
    const mover = (area: 'start' | 'loop'): SceneAction => ({
      type: 'place-in-area',
      card: 'move',
      area,
    })
    expect(fala(b, [])).toBe('once-vs-always-dino-start')
    expect(fala(b, [mover('loop')])).toBe('once-vs-always-dino-try-always')
    expect(fala(b, [mover('loop'), ...quadros(24)])).toBe('once-vs-always-dino-always')
    expect(fala(b, [mover('loop'), ...quadros(24), mover('start')])).toBe(
      'once-vs-always-dino-try-once',
    )
    expect(fala(b, [mover('loop'), ...quadros(24), mover('start'), ...quadros(3)])).toBe(
      'once-vs-always-dino-complete',
    )
  })

  test('once-vs-always (Aula 4): a tecla primeiro, depois sem a tecla; o sempre é só comparação', () => {
    const b = bloco('aula-04/experiencia-tres-areas')
    const som = (area: 'start' | 'loop' | 'event'): SceneAction => ({
      type: 'place-in-area',
      card: 'event',
      area,
    })
    expect(fala(b, [])).toBe('once-vs-always-dino-som-start')
    expect(fala(b, [som('event')])).toBe('once-vs-always-dino-som-try-event')
    expect(fala(b, [som('event'), { type: 'trigger' }])).toBe('once-vs-always-dino-som-key')
    expect(fala(b, [som('loop')])).toBe('once-vs-always-dino-som-try-loop')
    expect(fala(b, [som('loop'), ...quadros(5)])).toBe('once-vs-always-dino-som-loop')
    expect(fala(b, [som('start'), ...quadros(5)])).toBe('once-vs-always-dino-som-once')
    // Sem a chuva no bloco, esperar e a tecla bastam.
    expect(
      fala(b, [som('event'), { type: 'trigger' }, som('loop'), som('event'), ...quadros(3)]),
    ).toBe('once-vs-always-dino-som-complete')
  })

  test('coordinates: começando pelo y', () => {
    const b = bloco('aula-01/experiencia-coordenadas')
    expect(fala(b, [{ type: 'place', x: 110, y: 200 }])).toBe('coordinates-dino-x')
  })

  test('spawn: começando pelo relógio', () => {
    const b = bloco('aula-05/experiencia-ritmo')
    const relogio: SceneAction[] = [
      { type: 'connect', port: 'timer', enabled: true },
      { type: 'interval', seconds: 1.4 },
    ]
    expect(fala(b, relogio)).toBe('spawn-dino-wait')
    expect(fala(b, [...relogio, ...segundos(3)])).toBe('spawn-dino-gap')
    expect(
      fala(b, [
        ...relogio,
        ...segundos(3),
        { type: 'connect', port: 'timer', enabled: false },
        ...segundos(1),
      ]),
    ).toBe('spawn-dino-complete')
  })

  test('velocity: começando pelo −5, depois o 5 e o 0', () => {
    const b = bloco('aula-05/experiencia-velocidade')
    const tres = [quadroDaVelocidade, quadroDaVelocidade, quadroDaVelocidade]
    expect(fala(b, [lado(-5)])).toBe('velocity-dino-negative')
    expect(fala(b, [lado(-5), ...tres])).toBe('velocity-dino-left')
    expect(fala(b, [lado(-5), ...tres, lado(5), ...tres])).toBe('velocity-dino-zero')
    expect(fala(b, [lado(-5), ...tres, lado(5), ...tres, lado(0), quadroDaVelocidade])).toBe(
      'velocity-dino-complete',
    )
    // O zero antes de ver o cacto andar não conta.
    expect(fala(b, [lado(0), quadroDaVelocidade])).toBe('velocity-dino-start')
  })

  test('cleanup e game-state: ligando primeiro', () => {
    expect(
      fala(bloco('aula-06/experiencia-visivel-guardado'), [
        { type: 'connect', port: 'cleanup', enabled: true },
      ]),
    ).toBe('cleanup-dino-on-first')
    expect(
      fala(bloco('aula-07/experiencia-condicao'), [
        { type: 'connect', port: 'condition', enabled: true },
      ]),
    ).toBe('game-state-dino-start-question')
  })

  test('restart: começando tudo de novo primeiro', () => {
    const b = bloco('aula-09/experiencia-restart')
    const tudo: SceneAction[] = [
      { type: 'connect', port: 'restart', enabled: true },
      tocar,
      ...segundos(3),
      tocar,
      tocar,
    ]
    expect(fala(b, tudo)).toBe('restart-dino-everything')
    expect(
      fala(b, [
        ...tudo,
        ...segundos(3),
        { type: 'connect', port: 'restart', enabled: false },
        tocar,
        tocar,
      ]),
    ).toBe('restart-dino-complete')
  })

  test('random: começando pela velocidade', () => {
    const b = bloco('aula-12/experiencia-random')
    expect(fala(b, [sortearVelocidade(0.1)])).toBe('random-dino-speed-once')
    expect(fala(b, [sortearVelocidade(0.1), sortearVelocidade(0.9)])).toBe('random-dino-speeds')
    expect(fala(b, [sortearLugar(0.1), sortearLugar(0.12)])).toBe('random-dino-repeat-first')
  })
})

describe('Dino A: o motor no modo livre', () => {
  const livre = bloco('aula-05/experiencia-velocidade')
  const guiado: ExperimentationActivity = { ...livre, setup: { goals: ['moves', 'left'] } }
  test('velocity livre: o −5 não fecha a meta do positivo, e cada sentido pede três quadros', () => {
    const um = jogar(livre, [lado(-5), quadroDaVelocidade])
    expect(um.evidence.discoveries).toEqual([])
    const tres = jogar(livre, [
      lado(-5),
      quadroDaVelocidade,
      quadroDaVelocidade,
      quadroDaVelocidade,
    ])
    expect(tres.evidence.discoveries).toEqual(['left'])
  })
  test('velocity fora do modo livre continua como era', () => {
    expect(jogar(guiado, [lado(-5), quadroDaVelocidade]).evidence.discoveries).toEqual([
      'moves',
      'left',
    ])
  })
  test('restart livre: a pista limpa vale sem ter visto só voltar antes', () => {
    const b = bloco('aula-09/experiencia-restart')
    const caminho: SceneAction[] = [
      { type: 'connect', port: 'restart', enabled: true },
      tocar,
      ...segundos(3),
      tocar,
      tocar,
    ]
    expect(jogar(b, caminho).evidence.discoveries).toContain('clean-track')
    const guiadoRestart: ExperimentationActivity = { ...b, setup: { goals: ['clean-track'] } }
    expect(jogar(guiadoRestart, caminho).evidence.discoveries).not.toContain('clean-track')
  })
})
