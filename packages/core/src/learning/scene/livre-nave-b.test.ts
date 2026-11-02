import { describe, expect, test } from 'bun:test'
import {
  alvo,
  CAMINHOS_LIVRES_NAVE_B,
  espera,
  limpeza,
  nascer,
  protecao,
  proxima,
  segundo,
  segundos,
  sortear,
  tresPedras,
  vy,
} from '../../../tests/fixtures/caminhos-livres/nave-b'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  isSceneSetup,
  sceneTargets,
} from './index'
import { CLEANUP_PRESETS, RANDOM_PRESETS, SPAWN_PRESETS } from './presets'
import { isSceneState, type SceneStart, type SceneState } from './state'

/**
 * As seis cenas da Nave contra Asteroides em exploração livre (02/11/2026, frente B): `velocity`,
 * `spawn`, `cleanup`, `random`, `collision-pair` e `invincibility`. A experiência trabalha só a IDEIA
 * (nada de bloco, área do Estúdio, regra, Se, então, senão nem código), o Zappy pergunta antes do teste
 * e explica depois, e as metas do bloco de cada aula caem pela exploração livre, em mais de uma ordem.
 */

/** O caso de cada bloco da Nave, como está no manifesto, com a exploração livre ligada. */
export const ATIVIDADES_LIVRES_NAVE_B = {
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

type CenaB = keyof typeof ATIVIDADES_LIVRES_NAVE_B
const CENAS = Object.keys(ATIVIDADES_LIVRES_NAVE_B) as CenaB[]

/** Ordens diferentes da sugerida: as metas caem do mesmo jeito. */
const ORDENS_ALTERNATIVAS: Record<CenaB, SceneAction[]> = {
  velocity: [vy(3), segundo, vy(-3), segundo],
  spawn: [
    espera(true),
    nascer(20),
    ...segundos(3),
    nascer(40),
    ...segundos(4),
    espera(false),
    segundo,
  ],
  cleanup: [limpeza(true), ...segundos(2), limpeza(false), ...segundos(5)],
  random: [segundo, sortear(0.95), sortear(0.05)],
  'collision-pair': [
    alvo('shot', 'alias'),
    alvo('rock', 'alias'),
    ...segundos(3),
    alvo('shot', 'group'),
    alvo('rock', 'group'),
    segundo,
  ],
  invincibility: [
    protecao(15),
    ...tresPedras,
    protecao(0),
    ...segundos(1),
    protecao(45),
    ...segundos(1),
  ],
}

const inicio = (cena: CenaB): SceneStart => ({
  scene: cena,
  setup: ATIVIDADES_LIVRES_NAVE_B[cena].setup,
})
const jogar = (cena: CenaB, acoes: readonly SceneAction[]): SceneState => {
  const start = inicio(cena)
  return acoes.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const fala = (cena: CenaB, acoes: readonly SceneAction[]) =>
  discoveryGuidance(ATIVIDADES_LIVRES_NAVE_B[cena], jogar(cena, acoes))?.id
const metas = (cena: CenaB) => sceneTargets(ATIVIDADES_LIVRES_NAVE_B[cena])

const falas = new Map(
  CENAS.flatMap((cena) => discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const)),
)

/** O que a exploração livre não diz: bloco, área do Estúdio, regra, condição e os nomes dos blocos. */
export const SO_A_IDEIA_NAVE_B =
  /\bregra|\bbloco|\bent[aã]o\b|\bsen[aã]o\b|\bcomando|\bc[oó]digo|\bEst[uú]dio|(^|\s)áreas?\b|Ao iniciar|Enquanto estiver|\bA cada (\d+ )?quadros?\b|Criar (asteroide|cacto|pedra|tiro)|Tirar do grupo quem sair|Para cada sprite|\bapelido|\bchamar\b|\bvx\b|\bvy\b|Sortear lugar|Mover os sprites/i

describe('Nave B: os casos dos manifestos ligam a exploração livre', () => {
  test.each(CENAS)('%s: o caso é válido e cobra as metas do bloco', (cena) => {
    expect(isSceneSetup(ATIVIDADES_LIVRES_NAVE_B[cena].setup, cena)).toBe(true)
    expect(metas(cena).length).toBeGreaterThan(1)
  })
})

describe('Nave B: o Zappy fala só da ideia', () => {
  test.each(CENAS)('%s tem falas próprias, com o prefixo da cena', (cena) => {
    const ids = discoverySpeechSteps(cena).map((s) => s.id)
    expect(ids.length).toBeGreaterThanOrEqual(5)
    for (const id of ids) expect(id.startsWith(`${cena}-`)).toBe(true)
  })

  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, área, regra, Se, então, senão nem código', (id) => {
    expect(falas.get(id)).not.toMatch(SO_A_IDEIA_NAVE_B)
    // O "Se" da condição, com maiúscula como no bloco; o "se" da frase comum fica.
    expect(falas.get(id)).not.toMatch(/\bSe\b/)
    // Sem pronome solto nem frase vazia.
    expect((falas.get(id) ?? '').length).toBeGreaterThan(40)
  })

  /** A fala de ANTES de um teste não pode contar o resultado dele. */
  const ANTES: [string, RegExp][] = [
    ['velocity-start', /\bsob|\bdesc|diminu|aument/i],
    ['velocity-negative', /\bsob|\bdesc|diminu|aument/i],
    ['velocity-positive', /\bsob|\bdesc|diminu|aument/i],
    ['velocity-up', /\bdesc|aument/i],
    ['velocity-down', /\bsub|\bsob|diminu/i],
    ['spawn-start', /trinta|\b30\b|colad|parede|amontoad/i],
    ['spawn-wait', /espaço entre|uma de cada vez|separad/i],
    ['spawn-wall', /espaço|uma de cada vez|separad/i],
    ['spawn-gap', /trinta|\b30\b|colad|parede/i],
    ['spawn-fall', /mesm[ao] (velocidade|jeito)|180|igual/i],
    ['spawn-fall-40', /mesm[ao] (velocidade|jeito)|igual|também/i],
    ['spawn-fall-20', /mesm[ao] (velocidade|jeito)|igual|também/i],
    ['spawn-same-wall', /trinta|\b30\b|colad|parede/i],
    ['cleanup-start', /continu|guarda e move|removid|ainda/i],
    ['cleanup-on-first', /continu|removid|saiu do grupo/i],
    ['cleanup-stored', /removid|saiu do grupo/i],
    ['cleanup-removed', /continu|ainda guarda/i],
    ['random-start', /diferente|muda|acima|fora da tela/i],
    ['random-once', /diferente|repet|acima|fora da tela/i],
    ['random-places', /acima da borda|entra caindo/i],
    ['random-above', /diferente|muda de lugar/i],
    ['collision-pair-start', /todos|todas|\b0\b|nenhum|sobra/i],
    ['collision-pair-start-alias', /continu|seguem|sobra|ficam/i],
    ['collision-pair-group', /seguem|sobra|continu|ficaram/i],
    ['collision-pair-watch', /seguem|seguiram|borda de baixo|continuam o caminho/i],
    ['collision-pair-alias', /saíram todos|todas as pedras sa/i],
    ['invincibility-start', /três vidas|cada pedra tirou|nenhuma vida|0 vidas/i],
    ['invincibility-try', /só a primeira|acabou antes|sobram duas|sobra uma/i],
    ['invincibility-running', /só a primeira|acabou antes|tirou/i],
    ['invincibility-none', /só a primeira|acabou antes/i],
    ['invincibility-long', /cada pedra tirou|as três vidas|acabou antes/i],
    ['invincibility-short', /cada pedra tirou|as três vidas|só a primeira/i],
    ['invincibility-none-long', /acabou antes|antes de (a proteção )?acabar,/i],
    ['invincibility-none-short', /só a primeira/i],
    ['invincibility-long-short', /cada pedra tirou|as três vidas/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('Nave B: a exploração livre completa as metas do bloco', () => {
  for (const [nome, caminhos] of [
    ['o caminho sugerido', CAMINHOS_LIVRES_NAVE_B],
    ['outra ordem', ORDENS_ALTERNATIVAS],
  ] as const)
    test.each(CENAS)(`%s: ${nome}`, (cena) => {
      const acoes = caminhos[cena] ?? []
      for (const a of acoes) if (a.type === 'advance') expect(a.seconds).toBeLessThanOrEqual(1)
      const s = jogar(cena, acoes)
      for (const meta of metas(cena)) expect(s.evidence.discoveries).toContain(meta)
      const atividade = ATIVIDADES_LIVRES_NAVE_B[cena]
      expect(evaluateExperimentation(cena, s, true, atividade.cast, metas(cena)).passed).toBe(true)
      expect(isSceneState(s)).toBe(true)
      expect(fala(cena, acoes)).toBe(`${cena}-complete`)
    })

  test('a fala de cada cena começa pelo convite e acompanha o que foi testado', () => {
    expect(fala('velocity', [])).toBe('velocity-start')
    expect(fala('velocity', [vy(-9)])).toBe('velocity-negative')
    expect(fala('velocity', [vy(-9), segundo])).toBe('velocity-up')
    expect(fala('velocity', [vy(9), segundo])).toBe('velocity-down')

    expect(fala('spawn', [])).toBe('spawn-start')
    expect(fala('spawn', [espera(true)])).toBe('spawn-wait')
    expect(fala('spawn', [segundo])).toBe('spawn-wall')
    expect(fala('spawn', [espera(true), ...segundos(3)])).toBe('spawn-gap')
    expect(fala('spawn', [segundo, espera(true), ...segundos(3)])).toBe('spawn-fall')
    expect(fala('spawn', [segundo, espera(true), ...segundos(4)])).toBe('spawn-fall-40')
    expect(fala('spawn', [segundo, espera(true), nascer(20), ...segundos(3)])).toBe('spawn-fall-20')

    expect(fala('cleanup', [])).toBe('cleanup-start')
    expect(fala('cleanup', [limpeza(true)])).toBe('cleanup-on-first')
    expect(fala('cleanup', segundos(2))).toBe('cleanup-stored')
    expect(fala('cleanup', [limpeza(true), ...segundos(2)])).toBe('cleanup-removed')

    expect(fala('random', [])).toBe('random-start')
    expect(fala('random', [sortear(0.5)])).toBe('random-once')
    expect(fala('random', [sortear(0.1), sortear(0.7)])).toBe('random-places')
    expect(fala('random', [segundo])).toBe('random-above')

    expect(fala('collision-pair', [])).toBe('collision-pair-start')
    expect(fala('collision-pair', [alvo('shot', 'alias')])).toBe('collision-pair-mixed')
    expect(fala('collision-pair', [alvo('shot', 'alias'), alvo('rock', 'alias')])).toBe(
      'collision-pair-start-alias',
    )
    expect(fala('collision-pair', [segundo])).toBe('collision-pair-group')
    const doisApelidos = [alvo('shot', 'alias'), alvo('rock', 'alias')]
    expect(fala('collision-pair', [...doisApelidos, segundo])).toBe('collision-pair-watch')
    expect(fala('collision-pair', [...doisApelidos, ...segundos(3)])).toBe('collision-pair-alias')
    expect(fala('collision-pair', [...doisApelidos, segundo, alvo('shot', 'group')])).toBe(
      'collision-pair-watch-again',
    )

    expect(fala('invincibility', [])).toBe('invincibility-start')
    expect(fala('invincibility', [protecao(45)])).toBe('invincibility-try')
    expect(fala('invincibility', [proxima])).toBe('invincibility-running')
    expect(fala('invincibility', tresPedras)).toBe('invincibility-none')
    expect(fala('invincibility', [protecao(45), ...tresPedras])).toBe('invincibility-long')
    expect(fala('invincibility', [protecao(15), ...tresPedras])).toBe('invincibility-short')
    expect(fala('invincibility', [...tresPedras, protecao(45), ...tresPedras])).toBe(
      'invincibility-none-long',
    )
    expect(fala('invincibility', [...tresPedras, protecao(15), ...tresPedras])).toBe(
      'invincibility-none-short',
    )
    expect(fala('invincibility', [protecao(45), ...tresPedras, protecao(15), ...tresPedras])).toBe(
      'invincibility-long-short',
    )
  })
})

describe('Nave B: a meta só cai quando a criança VIU (as mudanças do motor no modo livre)', () => {
  test('invincibility: trocar a proteção recomeça as batidas, e a troca no meio não fecha meta', () => {
    // 45 até depois da terceira pedra, e então 15: antes, `expires` caía sem 15 quadros acabarem.
    const s = jogar('invincibility', [
      protecao(0),
      { type: 'advance', seconds: 5 / 30 },
      protecao(45),
      segundo,
      protecao(15),
      segundo,
    ])
    expect(s.evidence.discoveries).toContain('window')
    // Com a troca recomeçando, o segundo de 15 quadros É um teste de 15 inteiro.
    expect(s.evidence.discoveries).toContain('expires')
    const trocou = jogar('invincibility', [
      protecao(45),
      { type: 'advance', seconds: 20 / 30 },
      protecao(15),
    ])
    expect(trocou.invincibility.frames).toBe(0)
    expect(trocou.invincibility.hearts).toBe(3)
    expect(trocou.evidence.discoveries).not.toContain('expires')
  })

  test('invincibility: sem a exploração livre, a troca segue sem recomeçar (Corre Dino e bancada antiga)', () => {
    const start: SceneStart = { scene: 'invincibility', setup: { goals: ['no-shield'] } }
    const s = [
      protecao(45),
      { type: 'advance', seconds: 20 / 30 } as SceneAction,
      protecao(15),
    ].reduce((e, a) => stepScene(start, e, a), openScene(start))
    expect(s.invincibility.frames).toBe(20)
  })

  test('collision-pair: trocar a escolha depois do tempo recomeça a trombada com a escolha nova', () => {
    const s = jogar('collision-pair', [segundo, alvo('shot', 'alias')])
    expect(s.collisionPair.frames).toBe(0)
    expect(s.collisionPair.collided).toBe(false)
    expect(s.collisionPair.shotTarget).toBe('alias')
    expect(s.collisionPair.rockTarget).toBe('group')
    expect(s.evidence.discoveries).toContain('whole-group')
    const start: SceneStart = { scene: 'collision-pair' }
    const antigo = [segundo, alvo('shot', 'alias')].reduce(
      (e, a) => stepScene(start, e, a),
      openScene(start),
    )
    expect(antigo.collisionPair.frames).toBe(10)
  })

  test('spawn: a queda medida de 20 em 20 antes de 40 em 40 também compara (só no modo livre)', () => {
    const vinteAntes = [espera(true), nascer(20), ...segundos(3), nascer(40), ...segundos(4)]
    const livre = jogar('spawn', vinteAntes)
    expect(livre.crowd.fallComparison).toBe(180)
    expect(livre.crowd.fallBaseline).toBe(180)
    expect(livre.evidence.discoveries).toContain('same-fall')
    // Uma só medida não fecha a comparação.
    expect(
      jogar('spawn', [espera(true), nascer(20), ...segundos(3)]).evidence.discoveries,
    ).not.toContain('same-fall')
    const start: SceneStart = { scene: 'spawn', setup: { preset: SPAWN_PRESETS['pedra-quadros'] } }
    const antigo = vinteAntes.reduce((e, a) => stepScene(start, e, a), openScene(start))
    expect(antigo.evidence.discoveries).not.toContain('same-fall')
  })

  test('as metas não caem sem o gesto que as mostra', () => {
    expect(jogar('velocity', [vy(-9)]).evidence.discoveries).not.toContain('up')
    expect(jogar('velocity', segundos(2)).evidence.discoveries).toEqual([])
    expect(jogar('cleanup', [limpeza(true)]).evidence.discoveries).toEqual([])
    expect(jogar('random', [sortear(0.5)]).evidence.discoveries).toEqual([])
    expect(
      jogar('collision-pair', [alvo('shot', 'alias'), alvo('rock', 'alias')]).evidence.discoveries,
    ).toEqual([])
    expect(jogar('invincibility', [proxima, proxima]).evidence.discoveries).toEqual([])
  })
})
