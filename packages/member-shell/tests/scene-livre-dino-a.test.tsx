import { describe, expect, test } from 'bun:test'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  ONCE_VS_ALWAYS_PRESETS,
  openScene,
  type SceneAction,
  type SceneId,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { TELAS_LIVRES } from '../src/components/scene-livre'
import { proximoGestoDoCacto } from '../src/components/scene-livre/dino/spawn'
import { proximoGestoDaVelocidadeDino } from '../src/components/scene-livre/dino/velocity'

/**
 * As telas livres do Corre Dino nas cenas que a Nave contra Asteroides também usa (02/11/2026, frente
 * A). A tela vem do REGISTRO (`TELAS_LIVRES`), que escolhe a variante pelo cenário do bloco: só a
 * IDEIA na tela; o que cada caso faz só aparece depois de testado; e o botão em destaque é o gesto
 * que a fala do Zappy pede.
 */
const dino = (
  scene: SceneId,
  goals: string[],
  extra: Partial<ExperimentationActivity> = {},
  preset?: NonNullable<ExperimentationActivity['setup']>['preset'],
): ExperimentationActivity => ({
  type: 'experimentation',
  scene,
  cenario: 'corre-dino',
  ...extra,
  setup: { freeExploration: true, goals, ...(preset ? { preset } : {}) },
})

const ATIVIDADES = {
  anda: dino(
    'once-vs-always',
    ['once', 'always'],
    { cast: { hero: { name: 'Dino', gender: 'm', figure: 'dino' } } },
    {
      ...ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave'],
      cards: [{ id: 'move', kind: 'move', label: 'Mover o Dino um pouquinho' }],
    },
  ),
  som: dino(
    'once-vs-always',
    ['on-event', 'key-fires'],
    {},
    ONCE_VS_ALWAYS_PRESETS['tres-caixas-som'],
  ),
  coordinates: dino('coordinates', ['right', 'down', 'origin']),
  world: dino('world', ['hidden', 'visible']),
  'draw-loop': dino('draw-loop', ['frozen', 'trail', 'moving']),
  layers: dino('layers', ['front', 'covered', 'back-in-front']),
  spawn: dino('spawn', ['every-frame', 'with-timer']),
  velocity: dino('velocity', ['moves', 'left', 'stopped'], {
    cast: { hero: { name: 'cacto', gender: 'm' } },
  }),
  cleanup: dino('cleanup', ['invisible-stored', 'rule-removes']),
  'game-state': dino('game-state', ['outside', 'waiting', 'playing']),
  restart: dino('restart', ['screen-only', 'clean-track']),
  variable: dino('variable', ['stored', 'changed-hidden', 'shown']),
  random: dino('random', ['positions', 'repeat', 'velocities'], {
    cast: { obstacle: { name: 'cacto', gender: 'm' } },
  }),
} satisfies Record<string, ExperimentationActivity>
type Caso = keyof typeof ATIVIDADES

const jogar = (caso: Caso, acoes: SceneAction[]): SceneState => {
  const a = ATIVIDADES[caso]
  const start: SceneStart = { scene: a.scene, setup: a.setup }
  return acoes.reduce((s, x) => stepScene(start, s, x), openScene(start))
}
const tela = (
  caso: Caso,
  state: SceneState,
  activity: ExperimentationActivity = ATIVIDADES[caso],
) => {
  const Tela = TELAS_LIVRES[activity.scene]
  if (!Tela) throw new Error(`sem tela livre: ${activity.scene}`)
  return renderToStaticMarkup(
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
        tools: null,
      }}
    >
      <Tela />
    </DiscoveryContext.Provider>,
  )
}
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
const semPalco = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
    texto(m[1] ?? '').trim(),
  )
const SO_A_IDEIA =
  /\bregra|\bbloco|\bent[aã]o\b|\bsen[aã]o\b|\bcomando|\bc[oó]digo|\bEst[uú]dio|(^|\s)áreas?\b|Ao iniciar|Enquanto estiver|Quando acontecer|\bA cada (\d+ )?quadros?\b|Criar (asteroide|cacto|pedra|tiro)\b|Tirar do grupo quem sair|Limpar a tela|sprite|Sortear lugar|Somar|Mostrar placar|Criar variável|estado do jogo|Reiniciar|Mudar o estado|Tocar efeito|\btiro|asteroide|\bnave\b/i

const s1: SceneAction = { type: 'advance', seconds: 1 }
const q: SceneAction = { type: 'advance', seconds: 0.2 }
const quadros = (n: number): SceneAction[] =>
  Array.from({ length: Math.ceil(n / 4) }, (_, i) => ({
    type: 'advance' as const,
    seconds: Math.min(4, n - i * 4) / 4,
  }))
const lado = (vx: number): SceneAction => ({ type: 'velocity', vx, vy: 0 })
const relogio: SceneAction = { type: 'connect', port: 'timer', enabled: true }
const limpeza: SceneAction = { type: 'connect', port: 'cleanup', enabled: true }
const pergunta: SceneAction = { type: 'connect', port: 'condition', enabled: true }
const tocar: SceneAction = { type: 'start', input: 'tap' }
const tudo: SceneAction = { type: 'connect', port: 'restart', enabled: true }
const lugar = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'position',
  unit,
  guided: false,
})
const velocidade = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'velocity',
  unit,
  guided: false,
})
const som = (area: 'start' | 'loop' | 'event'): SceneAction => ({
  type: 'place-in-area',
  card: 'event',
  area,
})
const mover = (area: 'start' | 'loop'): SceneAction => ({
  type: 'place-in-area',
  card: 'move',
  area,
})

const ESTADOS: Record<Caso, SceneAction[][]> = {
  anda: [[], [mover('start'), ...quadros(3)], [mover('loop'), ...quadros(24)]],
  som: [[], [som('event'), ...quadros(5)], [som('event'), { type: 'trigger' }]],
  coordinates: [[], [{ type: 'place', x: 200, y: 150 }]],
  world: [
    [],
    [{ type: 'create' }],
    [{ type: 'create' }, { type: 'connect', port: 'draw', enabled: true }],
  ],
  'draw-loop': [[], [{ type: 'advance', seconds: 0.25 }]],
  layers: [[], [{ type: 'layer', front: true }]],
  spawn: [[], [s1], [relogio, s1, s1, s1]],
  velocity: [[], [lado(5), q, q, q], [lado(5), q, q, q, lado(-5), q, q, q]],
  cleanup: [[], [s1, s1], [s1, s1, limpeza, s1, s1]],
  'game-state': [[], [s1], [pergunta, s1, s1, tocar, s1]],
  restart: [[], [tocar, s1, s1, s1], [tocar, s1, s1, s1, tocar, tocar]],
  variable: [
    [],
    [{ type: 'store', value: 0 }],
    [
      { type: 'store', value: 0 },
      { type: 'change', by: 1 },
    ],
  ],
  random: [[], [lugar(0.1), lugar(0.5)], [velocidade(0.1), velocidade(0.9)]],
}

const ROTULOS: Partial<Record<Caso, string[]>> = {
  anda: [
    'Uma vez, no começo',
    'Sempre, em todo quadro',
    'Começar o jogo',
    'Quando o Dino anda um pouquinho?',
  ],
  som: [
    'Uma vez, no começo',
    'Sempre, em todo quadro',
    'Na hora em que algo acontece',
    'Apertar a tecla',
    'Quando toca o som do pulo?',
    'Sons',
  ],
  world: ['Criar o Dino nos bastidores', 'Mostrar o Dino na tela'],
  'draw-loop': [
    'Desenhar só no começo',
    'Desenhar em todo quadro',
    'Apagar a tela antes de desenhar',
    'Avançar 1 quadro',
  ],
  layers: ['Desenhar o Dino por último', 'Desenhar a floresta por último'],
  spawn: [
    'Em todo quadro',
    'A cada 0,5 segundo',
    'A cada 1 segundo',
    'A cada 1,4 segundo',
    'A cada 2 segundos',
    'Passar 1 segundo',
    'Deixar o tempo passar',
  ],
  velocity: ['−5', '0', '5', 'Avançar 1 quadro', 'Deixar o tempo passar', 'Voltar ao começo'],
  cleanup: ['Tirar do jogo quem sai da tela', 'Passar 1 segundo', 'Cactos no grupo'],
  'game-state': [
    'Ligar a pergunta',
    'Deixar o tempo passar',
    'Começar a partida',
    'Voltar à tela de início',
  ],
  restart: ['Tocar na tela', 'Só voltar para a tela de início', 'Começar tudo de novo'],
  variable: ['Guardar o número 0', 'Ganhar 1 ponto', 'Mostrar o número na tela'],
  random: ['Sortear um lugar', 'Sortear uma velocidade'],
}

describe('Dino A: as telas livres falam só da ideia, com o Dino e os cactos', () => {
  test.each(Object.keys(ATIVIDADES) as Caso[])('%s: rótulos sem bloco, regra nem nave', (caso) => {
    for (const acoes of ESTADOS[caso]) {
      const lido = texto(semPalco(tela(caso, jogar(caso, acoes))))
      expect(lido).not.toMatch(SO_A_IDEIA)
      expect(lido).not.toMatch(/\bSe\b/)
    }
    const lido = texto(tela(caso, jogar(caso, [])))
    for (const rotulo of ROTULOS[caso] ?? []) expect(lido).toContain(rotulo)
    expect(lido).toContain('Recomeçar experiência')
  })

  test('o registro escolhe a tela pelo cenário: o bloco da Nave continua com a tela da Nave', () => {
    const naNave: ExperimentationActivity = { ...ATIVIDADES.variable, cenario: 'nave' }
    expect(texto(tela('variable', jogar('variable', []), naNave))).toContain('Acertar um asteroide')
    expect(texto(tela('variable', jogar('variable', [])))).toContain('Ganhar 1 ponto')
  })
})

describe('Dino A: o que cada caso faz só aparece depois do teste', () => {
  const casos: [Caso, SceneAction[], string, SceneAction[]][] = [
    [
      'anda',
      [mover('start')],
      'nos outros quadros não sai do lugar',
      [mover('start'), ...quadros(3)],
    ],
    [
      'som',
      [som('event')],
      'Sem a tecla, o som não toca nenhuma vez',
      [som('event'), ...quadros(5)],
    ],
    ['som', [som('loop')], 'O som toca de novo em todo quadro', [som('loop'), ...quadros(5)]],
    ['spawn', [], 'um colado no outro, como uma parede', [s1]],
    ['spawn', [relogio], 'sobra espaço para o Dino pular', [relogio, s1, s1, s1]],
    ['velocity', [lado(5), q, q], 'o cacto vai para a direita', [lado(5), q, q, q]],
    ['velocity', [lado(-5), q, q], 'o cacto vai para a esquerda', [lado(-5), q, q, q]],
    ['velocity', [lado(0), q], 'o cacto fica parado', [lado(5), q, q, q, lado(0), q]],
    ['cleanup', [s1], 'mas continua no grupo', [s1, s1]],
    ['cleanup', [limpeza, s1], 'sai do grupo assim que passa da borda', [limpeza, s1, s1]],
    ['game-state', [], 'Nasce um cacto, até na tela de início', [s1]],
    [
      'restart',
      [tocar, s1, s1, s1, tocar],
      'Os cactos da partida anterior ficam na pista',
      [tocar, s1, s1, s1, tocar, tocar],
    ],
    [
      'restart',
      [tudo, tocar, s1, s1, s1, tocar],
      'A pista fica vazia',
      [tudo, tocar, s1, s1, s1, tocar, tocar],
    ],
    [
      'variable',
      [{ type: 'store', value: 0 }],
      'Pontos muda, e a tela continua sem número',
      [
        { type: 'store', value: 0 },
        { type: 'change', by: 1 },
      ],
    ],
    ['random', [lugar(0.1)], 'Cada sorteio pode dar um lugar diferente', [lugar(0.1), lugar(0.5)]],
    ['random', [lugar(0.1)], 'num sorteio, um resultado pode repetir', [lugar(0.1), lugar(0.12)]],
    ['random', [velocidade(0.1)], 'chega mais longe', [velocidade(0.1), velocidade(0.9)]],
  ]
  test.each(
    casos,
  )('%s: "%s" antes não mostra, depois do teste mostra', (caso, antes, frase, depois) => {
    expect(texto(tela(caso, jogar(caso, antes)))).not.toContain(frase)
    expect(texto(tela(caso, jogar(caso, depois)))).toContain(frase)
  })
})

describe('Dino A: o botão em destaque é o gesto que o Zappy pede', () => {
  const casos: [Caso, SceneAction[], string][] = [
    ['anda', [], 'Uma vez, no começo'],
    ['anda', [mover('start')], 'Começar o jogo'],
    ['anda', [mover('start'), ...quadros(3)], 'Sempre, em todo quadro'],
    ['som', [], 'Na hora em que algo acontece'],
    ['som', [som('event')], 'Começar o jogo'],
    ['som', [som('event'), ...quadros(5)], 'Apertar a tecla'],
    ['som', [som('loop'), ...quadros(5)], 'Na hora em que algo acontece'],
    ['world', [], 'Criar o Dino nos bastidores'],
    ['world', [{ type: 'create' }], 'Mostrar o Dino na tela'],
    ['draw-loop', [], 'Avançar 1 quadro'],
    ['draw-loop', [{ type: 'advance', seconds: 0.25 }], 'Desenhar em todo quadro'],
    ['layers', [], 'Desenhar o Dino por último'],
    ['layers', [{ type: 'layer', front: true }], 'Desenhar a floresta por último'],
    ['spawn', [], 'Passar 1 segundo'],
    ['spawn', [s1], 'A cada 1,4 segundo'],
    ['spawn', [relogio, s1, s1, s1], 'Em todo quadro'],
    ['velocity', [], '5'],
    ['velocity', [lado(5)], 'Avançar 1 quadro'],
    ['velocity', [lado(5), q, q, q], '−5'],
    ['velocity', [lado(5), q, q, q, lado(-5), q, q, q], '0'],
    ['cleanup', [], 'Passar 1 segundo'],
    ['cleanup', [s1, s1], 'Tirar do jogo quem sai da tela'],
    ['game-state', [], 'Deixar o tempo passar'],
    ['game-state', [s1], 'Ligar a pergunta'],
    ['game-state', [pergunta, s1, s1], 'Começar a partida'],
    ['restart', [], 'Tocar na tela'],
    ['restart', [tocar, s1, s1, s1, tocar, tocar], 'Começar tudo de novo'],
    ['variable', [], 'Guardar o número 0'],
    ['variable', [{ type: 'store', value: 0 }], 'Ganhar 1 ponto'],
    [
      'variable',
      [
        { type: 'store', value: 0 },
        { type: 'change', by: 1 },
      ],
      'Mostrar o número na tela',
    ],
    ['random', [], 'Sortear um lugar'],
    ['random', [lugar(0.1), lugar(0.5), lugar(0.12)], 'Sortear uma velocidade'],
  ]
  test.each(casos)('%s depois de %j: destaque em "%s"', (caso, acoes, esperado) => {
    const s = jogar(caso, acoes)
    const fala = discoveryGuidance(ATIVIDADES[caso], s)?.id
    expect(fala).toContain('-dino-')
    expect([fala, destaques(tela(caso, s))]).toEqual([fala, [esperado]])
  })

  test('as coordenadas destacam o campo que a fala pede', () => {
    const html = tela('coordinates', jogar('coordinates', []))
    expect(html).toContain('data-gesto="true"')
  })

  test('as funções de gesto do Dino não destacam nada depois de concluir', () => {
    expect(proximoGestoDoCacto('spawn-dino-complete', { timer: false, interval: 1 })).toBeNull()
    expect(proximoGestoDaVelocidadeDino('velocity-dino-complete', { vx: 0 })).toBeNull()
    expect(proximoGestoDoCacto('spawn-dino-wall', { timer: false, interval: 1 })).toBe(1.4)
  })

  test('com tudo descoberto, nada fica em destaque', () => {
    const fim: [Caso, SceneAction[]][] = [
      ['velocity', [lado(5), q, q, q, lado(-5), q, q, q, lado(0), q]],
      ['cleanup', [s1, s1, limpeza, s1, s1]],
      ['random', [lugar(0.1), lugar(0.5), lugar(0.12), velocidade(0.1), velocidade(0.9)]],
      ['restart', [tocar, s1, s1, s1, tocar, tocar, tudo, tocar, tocar]],
    ]
    for (const [caso, acoes] of fim)
      expect([caso, destaques(tela(caso, jogar(caso, acoes)))]).toEqual([caso, []])
  })
})
