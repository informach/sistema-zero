import { describe, expect, test } from 'bun:test'
import {
  CLEANUP_PRESETS,
  discoveryGuidance,
  type ExperimentationActivity,
  openScene,
  RANDOM_PRESETS,
  type SceneAction,
  type SceneStart,
  type SceneState,
  SPAWN_PRESETS,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { LivreCleanup, proximoGestoDaLimpeza } from '../src/components/scene-livre/cleanup'
import {
  LivreCollisionPair,
  proximoGestoDaTrombada,
} from '../src/components/scene-livre/collision-pair'
import {
  LivreInvincibility,
  proximoGestoDaProtecao,
} from '../src/components/scene-livre/invincibility'
import { LivreRandom, proximoGestoDoSorteio } from '../src/components/scene-livre/random'
import { LivreSpawn, proximoGestoDoNascimento } from '../src/components/scene-livre/spawn'
import { LivreVelocity, proximoGestoDaVelocidade } from '../src/components/scene-livre/velocity'

/**
 * As seis telas livres da Nave contra Asteroides (02/11/2026, frente B): só a IDEIA na tela (nada de
 * bloco, regra, Se, então, senão, área do Estúdio nem nome de bloco); o que cada caso faz só aparece
 * depois de testado; e o botão em destaque é o gesto que a fala do Zappy pede.
 */
const ATIVIDADES = {
  velocity: {
    type: 'experimentation',
    scene: 'velocity',
    cast: { hero: { name: 'tiro', gender: 'm' } },
    cenario: 'nave',
    setup: {
      freeExploration: true,
      actions: [
        { type: 'velocity', vx: 5, vy: 0 },
        { type: 'advance', seconds: 1.5 },
        { type: 'velocity', vx: 0, vy: 0 },
      ],
      goals: ['up', 'down'],
    },
  },
  spawn: {
    type: 'experimentation',
    scene: 'spawn',
    cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
    cenario: 'nave',
    setup: { freeExploration: true, preset: SPAWN_PRESETS['pedra-quadros'] },
  },
  cleanup: {
    type: 'experimentation',
    scene: 'cleanup',
    cast: { obstacle: { name: 'tiro', gender: 'm' } },
    cenario: 'nave',
    setup: {
      freeExploration: true,
      preset: CLEANUP_PRESETS['tiro-cima'],
      goals: ['invisible-stored', 'rule-removes'],
    },
  },
  random: {
    type: 'experimentation',
    scene: 'random',
    cast: { obstacle: { name: 'asteroide', gender: 'm' } },
    cenario: 'nave',
    setup: { freeExploration: true, preset: RANDOM_PRESETS['pedra-acima'] },
  },
  'collision-pair': {
    type: 'experimentation',
    scene: 'collision-pair',
    cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
    cenario: 'nave',
    setup: { freeExploration: true, goals: ['whole-group', 'just-the-pair', 'others-stay'] },
  },
  invincibility: {
    type: 'experimentation',
    scene: 'invincibility',
    cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
    cenario: 'nave',
    setup: { freeExploration: true, goals: ['no-shield', 'window', 'expires'] },
  },
} satisfies Record<string, ExperimentationActivity>
type Cena = keyof typeof ATIVIDADES

const TELAS: Record<Cena, () => ReactElement> = {
  velocity: () => <LivreVelocity />,
  spawn: () => <LivreSpawn />,
  cleanup: () => <LivreCleanup />,
  random: () => <LivreRandom />,
  'collision-pair': () => <LivreCollisionPair />,
  invincibility: () => <LivreInvincibility />,
}

const jogar = (cena: Cena, acoes: SceneAction[]): SceneState => {
  const start: SceneStart = { scene: cena, setup: ATIVIDADES[cena].setup }
  return acoes.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const tela = (cena: Cena, state: SceneState) =>
  renderToStaticMarkup(
    <DiscoveryContext.Provider
      value={{
        activity: ATIVIDADES[cena],
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
      {TELAS[cena]()}
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
/** Só os controles, a lista e a figura da ideia: o palco é o de sempre, reaproveitado. */
const semPalco = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, ' ')
/** O rótulo de cada botão com o tom de gesto (o destaque). */
const destaques = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
    texto(m[1] ?? '').trim(),
  )
const SO_A_IDEIA =
  /\bregra|\bbloco|\bent[aã]o\b|\bsen[aã]o\b|\bcomando|\bc[oó]digo|\bEst[uú]dio|(^|\s)áreas?\b|Ao iniciar|Enquanto estiver|\bA cada (\d+ )?quadros?\b|Criar (asteroide|cacto|pedra|tiro)|Tirar do grupo quem sair|Para cada sprite|\bapelido|\bchamar\b|Sortear lugar|Mover os sprites/i

const s1: SceneAction = { type: 'advance', seconds: 1 }
const vy = (v: number): SceneAction => ({ type: 'velocity', vx: 0, vy: v })
const espera: SceneAction = { type: 'connect', port: 'timer', enabled: true }
const limpeza: SceneAction = { type: 'connect', port: 'cleanup', enabled: true }
const sortear = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'position',
  unit,
  guided: false,
})
const alvo = (subject: 'shot' | 'rock', target: 'group' | 'alias'): SceneAction => ({
  type: 'command-target',
  subject,
  target,
})
const proxima: SceneAction = { type: 'advance-to' }
const tres = [proxima, proxima, proxima]

/** Estados de cada cena que a tela precisa atravessar sem falar de bloco. */
const ESTADOS: Record<Cena, SceneAction[][]> = {
  velocity: [[], [vy(-9), s1], [vy(-9), s1, vy(9), s1]],
  spawn: [[], [s1], [s1, espera, s1, s1, s1, s1]],
  cleanup: [[], [s1, s1], [s1, s1, limpeza, s1]],
  random: [[], [sortear(0.1), sortear(0.7)], [s1]],
  'collision-pair': [[], [s1], [alvo('shot', 'alias'), alvo('rock', 'alias'), s1, s1, s1]],
  invincibility: [[], tres, [{ type: 'shield', frames: 45 }, ...tres]],
}

const ROTULOS: Record<Cena, string[]> = {
  velocity: [
    '−9',
    '−3',
    '0',
    '3',
    '9',
    'Avançar 1 quadro',
    'Deixar o tempo passar',
    'Voltar ao começo',
  ],
  spawn: [
    'Em todo quadro',
    'De 20 em 20 quadros',
    'De 40 em 40 quadros',
    'De 80 em 80 quadros',
    'Passar 1 segundo',
    'Deixar o tempo passar',
  ],
  cleanup: ['Tirar do jogo quem sai da tela', 'Passar 1 segundo', 'Deixar o tempo passar'],
  random: ['Sortear um lugar', 'Passar 1 segundo', 'Deixar o tempo passar'],
  'collision-pair': [
    'O grupo dos tiros',
    'O tiro que encostou',
    'O grupo das pedras',
    'A pedra que encostou',
    'Passar 1 segundo',
    'Voltar ao começo',
  ],
  invincibility: [
    'Nenhuma',
    '15 quadros',
    '45 quadros',
    'Avançar até a próxima pedra',
    'Avançar 1 quadro',
    'Voltar ao começo',
  ],
}

describe('Nave B: as telas livres falam só da ideia', () => {
  test.each(Object.keys(ATIVIDADES) as Cena[])('%s: rótulos sem bloco, regra nem área', (cena) => {
    for (const acoes of ESTADOS[cena]) {
      const lido = texto(semPalco(tela(cena, jogar(cena, acoes))))
      expect(lido).not.toMatch(SO_A_IDEIA)
      expect(lido).not.toMatch(/\bSe\b/)
    }
    const lido = texto(tela(cena, jogar(cena, [])))
    for (const rotulo of ROTULOS[cena]) expect(lido).toContain(rotulo)
    expect(lido).toContain('Recomeçar experiência')
  })
})

describe('Nave B: o que cada caso faz só aparece depois do teste', () => {
  const casos: [Cena, SceneAction[], string, SceneAction[]][] = [
    ['velocity', [vy(-9)], 'o tiro sobe', [vy(-9), s1]],
    ['velocity', [vy(9)], 'o tiro desce', [vy(9), s1]],
    ['spawn', [], 'uma colada na outra', [s1]],
    ['spawn', [espera], 'sobra espaço entre elas', [espera, s1, s1, s1]],
    ['cleanup', [s1], 'mas continua no grupo', [s1, s1]],
    ['cleanup', [limpeza], 'sai do grupo assim que passa da borda', [limpeza, s1, s1]],
    [
      'random',
      [sortear(0.3)],
      'cada pedra pode nascer num x diferente',
      [sortear(0.3), sortear(0.8)],
    ],
    ['random', [], 'a pedra entra caindo', [s1]],
    ['collision-pair', [], 'Sai todo mundo dos grupos', [s1]],
    [
      'collision-pair',
      [alvo('shot', 'alias'), alvo('rock', 'alias')],
      'Saem só os dois que se bateram',
      [alvo('shot', 'alias'), alvo('rock', 'alias'), s1],
    ],
    ['invincibility', [proxima, proxima], 'as três batidas levaram as três vidas', tres],
    [
      'invincibility',
      [{ type: 'shield', frames: 45 }, proxima],
      'Só a primeira pedra tirou vida',
      [{ type: 'shield', frames: 45 }, ...tres],
    ],
    [
      'invincibility',
      [{ type: 'shield', frames: 15 }, proxima, proxima],
      'A proteção acabou antes da terceira pedra',
      [{ type: 'shield', frames: 15 }, ...tres],
    ],
  ]
  test.each(
    casos,
  )('%s: "%s" antes não mostra, depois do teste mostra', (cena, antes, frase, depois) => {
    expect(texto(tela(cena, jogar(cena, antes)))).not.toContain(frase)
    expect(texto(tela(cena, jogar(cena, depois)))).toContain(frase)
  })

  test('a medida da queda só aparece depois de medida', () => {
    const antes = texto(semPalco(tela('spawn', jogar('spawn', [s1, espera, s1, s1, s1]))))
    expect(antes).not.toContain('De 40 em 40: 180')
    const depois = texto(semPalco(tela('spawn', jogar('spawn', [s1, espera, s1, s1, s1, s1]))))
    expect(depois).toContain('De 40 em 40: 180 · De 20 em 20: ?')
    expect(depois).not.toContain('Igual: cada pedra cai 3 por quadro')
  })
})

describe('Nave B: o botão em destaque é o gesto que o Zappy pede', () => {
  const casos: [Cena, SceneAction[], string][] = [
    ['velocity', [], '−9'],
    ['velocity', [vy(-9)], 'Avançar 1 quadro'],
    ['velocity', [vy(-9), s1], '9'],
    ['velocity', [vy(9), s1], '−9'],
    ['velocity', [vy(9), s1, vy(-3)], 'Avançar 1 quadro'],
    ['spawn', [], 'Passar 1 segundo'],
    ['spawn', [s1], 'De 40 em 40 quadros'],
    ['spawn', [espera, s1, s1, s1], 'Em todo quadro'],
    ['spawn', [s1, espera, s1, s1, s1], 'Passar 1 segundo'],
    ['spawn', [s1, espera, s1, s1, s1, s1], 'De 20 em 20 quadros'],
    ['cleanup', [], 'Passar 1 segundo'],
    ['cleanup', [s1, s1], 'Tirar do jogo quem sai da tela'],
    ['cleanup', [limpeza, s1, s1], 'Parar de tirar do jogo quem sai da tela'],
    ['random', [], 'Sortear um lugar'],
    ['random', [sortear(0.1), sortear(0.7)], 'Passar 1 segundo'],
    ['random', [s1], 'Sortear um lugar'],
    ['collision-pair', [], 'Passar 1 segundo'],
    ['collision-pair', [s1], 'O tiro que encostou'],
    ['collision-pair', [alvo('shot', 'alias')], 'O grupo dos tiros'],
    ['collision-pair', [alvo('shot', 'alias'), alvo('rock', 'alias'), s1], 'Passar 1 segundo'],
    [
      'collision-pair',
      [alvo('shot', 'alias'), alvo('rock', 'alias'), s1, s1, s1],
      'O grupo dos tiros',
    ],
    ['invincibility', [], 'Avançar até a próxima pedra'],
    ['invincibility', tres, '45 quadros'],
    ['invincibility', [...tres, { type: 'shield', frames: 45 }], 'Avançar até a próxima pedra'],
    ['invincibility', [...tres, { type: 'shield', frames: 45 }, ...tres], '15 quadros'],
    ['invincibility', [{ type: 'shield', frames: 15 }, ...tres], 'Nenhuma'],
  ]
  test.each(casos)('%s depois de %j: destaque em "%s"', (cena, acoes, esperado) => {
    const s = jogar(cena, acoes)
    const fala = discoveryGuidance(ATIVIDADES[cena], s)?.id
    expect([fala, destaques(tela(cena, s))]).toEqual([fala, [esperado]])
  })

  test('as funções de gesto devolvem algo em toda fala de antes de concluir', () => {
    expect(proximoGestoDaVelocidade('velocity-start', { vy: 0 })).toBe('negativo')
    expect(proximoGestoDoNascimento('spawn-wall', { timer: false, interval: 40 / 30 })).toBe(40)
    expect(proximoGestoDaLimpeza('cleanup-stored', { cleanup: false })).toBe('limpeza')
    expect(proximoGestoDoSorteio('random-places')).toBe('passar')
    expect(
      proximoGestoDaTrombada('collision-pair-watch', {
        shotTarget: 'alias',
        rockTarget: 'alias',
        frames: 30,
      }),
    ).toBe('voltar')
    expect(proximoGestoDaProtecao('invincibility-none-long', { protection: 0, struck: [] })).toBe(
      15,
    )
    for (const [cena, gesto] of [
      ['velocity', proximoGestoDaVelocidade('velocity-complete', { vy: 0 })],
      ['spawn', proximoGestoDoNascimento('spawn-complete', { timer: false, interval: 1 })],
      ['cleanup', proximoGestoDaLimpeza('cleanup-complete', { cleanup: false })],
      ['random', proximoGestoDoSorteio('random-complete')],
    ] as const)
      expect([cena, gesto]).toEqual([cena, null])
  })

  test('com tudo descoberto, nada fica em destaque', () => {
    const fim: [Cena, SceneAction[]][] = [
      ['velocity', [vy(-9), s1, vy(9), s1]],
      ['cleanup', [s1, s1, limpeza, s1]],
      ['random', [sortear(0.1), sortear(0.7), s1]],
      ['collision-pair', [s1, alvo('shot', 'alias'), alvo('rock', 'alias'), s1, s1, s1]],
    ]
    for (const [cena, acoes] of fim)
      expect([cena, destaques(tela(cena, jogar(cena, acoes)))]).toEqual([cena, []])
  })
})
