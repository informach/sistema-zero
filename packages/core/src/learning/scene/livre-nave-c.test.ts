import { describe, expect, test } from 'bun:test'
import {
  atirar,
  CAMINHOS_LIVRES_NAVE_C,
  enter,
  lugar,
  pergunta,
  segundos,
  tudoDeNovo,
} from '../../../tests/fixtures/caminhos-livres/nave-c'
import type { SceneAction, SceneId } from './actions'
import { openScene, stepScene } from './engine'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import type { SceneStart } from './state'

/**
 * A exploração livre das cenas `variable`, `fixed-vs-read`, `game-state` e `restart` (Nave contra
 * Asteroides, 02/11/2026): a experiência trabalha só a IDEIA e convida à investigação. Antes do
 * teste, o Zappy pergunta e diz o que observar; o resultado só aparece na fala de DEPOIS dele.
 */
const NAVE = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
} as const
const caso = (
  scene: SceneId,
  goals: string[],
  preset?: NonNullable<ExperimentationActivity['setup']>['preset'],
): ExperimentationActivity => ({
  type: 'experimentation',
  scene,
  cast: NAVE,
  cenario: 'nave',
  setup: { freeExploration: true, goals, ...(preset ? { preset } : {}) },
})

export const VARIAVEL = caso('variable', ['stored', 'changed-hidden', 'shown'])
export const NUMERO_DO_TIRO = caso('fixed-vs-read', ['same-spot', 'follows', 'box-marks'])
export const ESTADO = caso('game-state', ['outside', 'waiting', 'playing'], {
  id: 'pedra-40-quadros',
  clockFrames: 40,
  waitingSeconds: 4,
  moment: 'screen',
})
export const RECOMECO = caso('restart', ['screen-only', 'back-to-menu'])

const ATIVIDADES = [VARIAVEL, NUMERO_DO_TIRO, ESTADO, RECOMECO]

const jogar = (activity: ExperimentationActivity, actions: SceneAction[]) => {
  const start: SceneStart = { scene: activity.scene, setup: activity.setup }
  return actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const fala = (activity: ExperimentationActivity, actions: SceneAction[]) =>
  discoveryGuidance(activity, jogar(activity, actions))?.id

const falas = new Map(
  ATIVIDADES.flatMap(({ scene }) =>
    discoverySpeechSteps(scene).map(({ id, text }) => [id, text] as const),
  ),
)

describe('Nave (frente C): o Zappy fala só da ideia', () => {
  test('cada cena tem as falas próprias, com o id da cena na frente', () => {
    for (const { scene } of ATIVIDADES) {
      const ids = discoverySpeechSteps(scene).map((f) => f.id)
      expect(ids.length).toBeGreaterThan(3)
      for (const id of ids) expect(id.startsWith(`${scene}-`)).toBe(true)
    }
  })

  test.each([...falas.keys()])('%s não fala de bloco, regra, Se, então, senão nem código', (id) => {
    const texto = falas.get(id) ?? ''
    expect(texto).not.toMatch(
      /\bregra|\bbloco|\bentão\b|\bsenão\b|comando|código|\bcampo\b|Somar|Mostrar placar|Criar variável|estado do jogo|Reiniciar|centro x|inicio\b|\bx do tiro/i,
    )
    // "Se" com maiúscula é o nome do bloco; "se" no meio da frase é português.
    expect(texto).not.toMatch(/\bSe\b/)
  })

  const ANTES: [string, RegExp][] = [
    ['variable-start', /continuou sem número|guardar não é mostrar|ficou guardado/i],
    ['variable-stored', /pontos mudou|nem ficou sabendo|muda mesmo escondido/i],
    ['variable-hide', /pontos mudou|nem ficou sabendo|muda mesmo escondido/i],
    ['variable-shown', /pontos mudou|nem ficou sabendo|muda mesmo escondido/i],
    ['variable-shown-hidden', /pontos mudou|nem ficou sabendo|muda mesmo escondido/i],
    ['variable-hidden', /mostrou|mesmo número|continuou igual|sem mudar/i],
    ['fixed-vs-read-start', /mesmo lugar|onde a nave estava|sempre o mesmo/i],
    ['fixed-vs-read-start-read', /mesmo lugar|onde a nave estava|sempre o mesmo/i],
    ['fixed-vs-read-after-marks', /mesmo lugar|onde a nave estava|sempre o mesmo/i],
    ['fixed-vs-read-read', /onde a nave estava|segue a nave|lugares diferentes/i],
    ['fixed-vs-read-fixed', /mesmo lugar|sempre o mesmo|400 é sempre/i],
    ['fixed-vs-read-marks', /meio da nave|beirada de cima/i],
    ['game-state-start', /nasceram|nascem até|nenhum asteroide/i],
    ['game-state-start-question', /resposta foi|nenhum asteroide nasceu|nada nasce/i],
    ['game-state-outside', /resposta foi|nenhum asteroide nasceu|esperou/i],
    ['game-state-waiting', /resposta foi sim|asteroides nasceram/i],
    ['game-state-playing-first', /resposta foi não|nenhum asteroide nasceu|esperou/i],
    ['game-state-without', /asteroides nasceram|nascem até/i],
    ['restart-start', /ficaram na tela|acabou na hora|saíram da tela|outro Enter/i],
    ['restart-screen-only', /saíram da tela|outro Enter|abertura volt/i],
    ['restart-everything', /ficaram na tela|acabou na hora/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('Nave (frente C): os caminhos completam as metas', () => {
  test.each(ATIVIDADES.map((a) => [a.scene, a] as const))('%s', (scene, activity) => {
    const caminho = CAMINHOS_LIVRES_NAVE_C[scene] ?? []
    for (const a of caminho) if (a.type === 'advance') expect(a.seconds).toBeLessThanOrEqual(1)
    const s = jogar(activity, caminho)
    for (const meta of activity.setup?.goals ?? []) expect(s.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(activity, s)?.id).toBe(`${scene}-complete`)
  })
})

describe('variable: guardar e mostrar', () => {
  test('a fala segue a ordem do jogo', () => {
    expect(fala(VARIAVEL, [])).toBe('variable-start')
    expect(fala(VARIAVEL, [{ type: 'store', value: 0 }])).toBe('variable-stored')
    expect(
      fala(VARIAVEL, [
        { type: 'store', value: 0 },
        { type: 'change', by: 1 },
      ]),
    ).toBe('variable-hidden')
  })

  test('quem mostra antes de mudar é convidada a tirar o número da tela', () => {
    const guardar: SceneAction = { type: 'store', value: 0 }
    const mostrar: SceneAction = { type: 'show', on: true }
    const tirar: SceneAction = { type: 'show', on: false }
    const acertar: SceneAction = { type: 'change', by: 1 }
    // Mostrar antes de guardar não conta: mostrar ainda não foi testado com um número guardado.
    expect(fala(VARIAVEL, [mostrar, guardar])).toBe('variable-hide')
    expect(jogar(VARIAVEL, [mostrar, guardar]).evidence.discoveries).not.toContain('shown')
    expect(fala(VARIAVEL, [guardar, mostrar])).toBe('variable-shown')
    expect(fala(VARIAVEL, [guardar, mostrar, tirar])).toBe('variable-shown-hidden')
    expect(fala(VARIAVEL, [guardar, mostrar, tirar, acertar])).toBe('variable-complete')
    // Acertar com o número na tela não é "mudar escondido".
    expect(jogar(VARIAVEL, [guardar, mostrar, acertar]).evidence.discoveries).not.toContain(
      'changed-hidden',
    )
  })
})

describe('fixed-vs-read: o número escrito e o lido', () => {
  const lido: SceneAction = { type: 'value-source', source: 'read' }
  const escrito: SceneAction = { type: 'value-source', source: 'fixed' }
  const marcas: SceneAction = { type: 'box-marks', on: true }

  test('⚠️ livre: um tiro lido só não mostra que o tiro segue a nave; dois em lugares diferentes, sim', () => {
    expect(jogar(NUMERO_DO_TIRO, [lido, lugar(600), atirar]).evidence.discoveries).not.toContain(
      'follows',
    )
    expect(
      jogar(NUMERO_DO_TIRO, [lido, lugar(600), atirar, atirar]).evidence.discoveries,
    ).not.toContain('follows')
    expect(
      jogar(NUMERO_DO_TIRO, [lido, atirar, lugar(600), atirar]).evidence.discoveries,
    ).toContain('follows')
  })

  test('⚠️ livre: as marcas da nave com o número escrito no 400 são coincidência, não contam', () => {
    expect(jogar(NUMERO_DO_TIRO, [marcas, atirar]).evidence.discoveries).not.toContain('box-marks')
    expect(jogar(NUMERO_DO_TIRO, [marcas, lido, atirar]).evidence.discoveries).toContain(
      'box-marks',
    )
  })

  test('sem a exploração livre, o motor segue igual (Corre Dino e bancada antiga)', () => {
    const antigo: ExperimentationActivity = { ...NUMERO_DO_TIRO, setup: { goals: ['follows'] } }
    expect(jogar(antigo, [lido, lugar(600), atirar]).evidence.discoveries).toContain('follows')
    expect(jogar(antigo, [marcas, atirar]).evidence.discoveries).toContain('box-marks')
  })

  test('a fala explica só o que já foi testado, nas duas ordens', () => {
    expect(fala(NUMERO_DO_TIRO, [])).toBe('fixed-vs-read-start')
    expect(fala(NUMERO_DO_TIRO, [lido])).toBe('fixed-vs-read-start-read')
    expect(fala(NUMERO_DO_TIRO, [atirar, lugar(600), atirar])).toBe('fixed-vs-read-read')
    expect(fala(NUMERO_DO_TIRO, [lido, atirar, lugar(600), atirar])).toBe('fixed-vs-read-fixed')
    expect(
      fala(NUMERO_DO_TIRO, [lido, atirar, lugar(600), atirar, escrito, atirar, lugar(200), atirar]),
    ).toBe('fixed-vs-read-marks')
    expect(fala(NUMERO_DO_TIRO, [marcas, lido, atirar])).toBe('fixed-vs-read-after-marks')
  })
})

describe('game-state: a partida já começou?', () => {
  const comecar: SceneAction = { type: 'start', input: 'tap' }
  test('a fala segue o curso: sem a pergunta, com ela no início, jogando', () => {
    expect(fala(ESTADO, [])).toBe('game-state-start')
    expect(fala(ESTADO, segundos(2))).toBe('game-state-outside')
    expect(fala(ESTADO, [...segundos(2), pergunta(true), ...segundos(4)])).toBe(
      'game-state-waiting',
    )
  })

  test('a espera pede os 4 segundos inteiros na tela de início', () => {
    expect(jogar(ESTADO, [pergunta(true), ...segundos(3)]).evidence.discoveries).not.toContain(
      'waiting',
    )
    expect(jogar(ESTADO, [pergunta(true), ...segundos(4)]).evidence.discoveries).toContain(
      'waiting',
    )
  })

  test('quem liga a pergunta primeiro compara depois sem ela', () => {
    expect(fala(ESTADO, [pergunta(true)])).toBe('game-state-start-question')
    expect(fala(ESTADO, [pergunta(true), comecar, ...segundos(2)])).toBe('game-state-playing-first')
    const comAPergunta = [pergunta(true), ...segundos(4), comecar, ...segundos(2)]
    expect(fala(ESTADO, comAPergunta)).toBe('game-state-without')
    expect(fala(ESTADO, [...comAPergunta, pergunta(false), { type: 'home' }, ...segundos(2)])).toBe(
      'game-state-complete',
    )
  })
})

describe('restart: jogar outra vez', () => {
  test('a fala segue o jeito testado, nas duas ordens', () => {
    expect(fala(RECOMECO, [])).toBe('restart-start')
    const soATela = [enter, ...segundos(3), enter, enter]
    expect(jogar(RECOMECO, soATela).evidence.discoveries).toContain('screen-only')
    expect(fala(RECOMECO, soATela)).toBe('restart-screen-only')
    const tudo = [tudoDeNovo(true), enter, ...segundos(3), enter, enter]
    expect(jogar(RECOMECO, tudo).evidence.discoveries).toContain('back-to-menu')
    expect(fala(RECOMECO, tudo)).toBe('restart-everything')
    expect(fala(RECOMECO, [...tudo, ...segundos(3), tudoDeNovo(false), enter, enter])).toBe(
      'restart-complete',
    )
  })

  test('o primeiro Enter da partida não é o da abertura depois de começar tudo de novo', () => {
    expect(jogar(RECOMECO, [tudoDeNovo(true), enter]).evidence.discoveries).not.toContain(
      'back-to-menu',
    )
  })
})
