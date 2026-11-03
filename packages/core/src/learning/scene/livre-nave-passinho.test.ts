import { describe, expect, test } from 'bun:test'
import { CAMINHO_DO_PASSINHO } from '../../../tests/fixtures/caminhos-livres/nave-passinho'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  lighthouseWalkStrideCase,
  sceneStart,
  sceneTargets,
} from './index'
import { initialExperiment, stepExperiment } from './session'
import { LIGHTHOUSE_WALK, type SceneStart } from './state'

/**
 * "O tamanho do passinho" (Nave contra Asteroides, Dia 1, 02/11/2026): a velocidade em exploração
 * livre, só com a ideia. Em cada quadro a nave dá um passinho, pequeno ou grande; o Zappy pergunta
 * antes de cada teste e explica depois; a meta só cai com os passinhos VISTOS em câmera lenta.
 */
export const BLOCO_DO_PASSINHO: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'lighthouse-walk',
  cenario: 'nave',
  setup: { freeExploration: true, goals: ['step-speed-1', 'step-speed-3'] },
}
const start: SceneStart = sceneStart(BLOCO_DO_PASSINHO)
const jogar = (actions: SceneAction[], s: SceneStart = start) =>
  actions.reduce((e, a) => stepScene(s, e, a), openScene(s))
const fala = (actions: SceneAction[]) => discoveryGuidance(BLOCO_DO_PASSINHO, jogar(actions)).id
const QUADRO: SceneAction = { type: 'advance', seconds: 1 / 30 }
const quadros = (n: number): SceneAction[] => Array.from({ length: n }, () => QUADRO)
const SETA: SceneAction = { type: 'hold-arrow', held: true }
const LENTA: SceneAction = { type: 'walk-pace', pace: 'lenta' }
const REAL: SceneAction = { type: 'walk-pace', pace: 'real' }
const passinho = (speed: 1 | 3): SceneAction => ({ type: 'walk-speed', speed })

const falas = new Map(
  discoverySpeechSteps('lighthouse-walk')
    .filter(({ id }) => id.startsWith('stride-'))
    .map(({ id, text }) => [id, text] as const),
)

describe('o tamanho do passinho: o Zappy fala só da ideia', () => {
  test('seis falas, todas com o prefixo stride-', () => {
    expect([...falas.keys()].sort()).toEqual([
      'stride-big',
      'stride-complete',
      'stride-small',
      'stride-start',
      'stride-try-big',
      'stride-try-small',
    ])
  })

  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, regra, comando, sprite, Mover nem número da velocidade', (id) => {
    expect(falas.get(id)).not.toMatch(
      /\bregra|\bbloco|\bentão\b|\bsenão\b|\bcomando|\bcódigo|sprite|\bMover\b|velocidade \d|\baperte\b/i,
    )
  })

  const ANTES: [string, RegExp][] = [
    ['stride-start', /juntinh|separad|mais longe|depressa|pouquinho|devagar/i],
    ['stride-try-big', /mais longe|separad|depressa/i],
    ['stride-try-small', /juntinh|pouquinho|devagar/i],
    // Depois de um teste, a fala explica ESTE e não conta o do outro passinho.
    ['stride-small', /mais longe|separad|depressa/i],
    ['stride-big', /juntinh|pouquinho|devagar/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
  test.each(['stride-try-big', 'stride-try-small'])('%s pergunta antes de mandar testar', (id) => {
    expect(falas.get(id)).toMatch(/O que você acha que muda[^?.]*\?.*Clique em/)
  })
})

describe('o tamanho do passinho: a fala acompanha a ordem escolhida', () => {
  test('começando pelo passinho grande (o de fábrica)', () => {
    expect(fala([])).toBe('stride-start')
    expect(fala([LENTA, SETA, ...quadros(2)])).toBe('stride-big')
    expect(fala([LENTA, SETA, ...quadros(2), passinho(1)])).toBe('stride-try-small')
    expect(fala([LENTA, SETA, ...quadros(2), passinho(1), ...quadros(2)])).toBe('stride-complete')
  })

  test('começando pelo passinho pequeno', () => {
    expect(fala([passinho(1)])).toBe('stride-start')
    expect(fala([passinho(1), LENTA, SETA, ...quadros(2)])).toBe('stride-small')
    expect(fala([passinho(1), LENTA, SETA, ...quadros(2), passinho(3)])).toBe('stride-try-big')
    expect(fala([passinho(1), LENTA, SETA, ...quadros(2), passinho(3), ...quadros(2)])).toBe(
      'stride-complete',
    )
  })
})

describe('o tamanho do passinho: a meta só cai quando a criança VIU', () => {
  test('um passinho só não basta: são dois seguidos', () => {
    expect(jogar([LENTA, SETA, ...quadros(1)]).evidence.discoveries).not.toContain('step-speed-3')
    expect(jogar([LENTA, SETA, ...quadros(2)]).evidence.discoveries).toContain('step-speed-3')
  })

  test('na velocidade de verdade (33 ms por quadro) o passinho não conta', () => {
    const s = jogar([REAL, SETA, ...quadros(10)])
    expect(s.evidence.discoveries).not.toContain('step-speed-3')
  })

  test('trocar o passinho volta ao começo, e as marcas contam um tamanho só', () => {
    const s = jogar([LENTA, SETA, ...quadros(5), passinho(1)])
    expect(s.walk).toMatchObject({ speed: 1, frame: 0, x: LIGHTHOUSE_WALK.start, run: 0 })
    expect(s.walk.trail).toEqual([LIGHTHOUSE_WALK.start])
    // As escolhas ficam: a seta continua segurada e o ritmo, em câmera lenta.
    expect(s.walk.arrow).toBe(true)
    expect(s.walk.pace).toBe('lenta')
    expect(s.evidence.discoveries).toContain('step-speed-3')
  })

  test('sem a exploração livre, o motor segue como era (um quadro, sem recomeçar)', () => {
    const antigo = sceneStart({
      type: 'experimentation',
      scene: 'lighthouse-walk',
      cenario: 'nave',
    })
    const s = jogar([SETA, QUADRO, passinho(1)], antigo)
    expect(s.evidence.discoveries).toContain('step-speed-3')
    expect(s.walk.x).toBe(LIGHTHOUSE_WALK.start + 3)
    expect(jogar([SETA, QUADRO, passinho(1), QUADRO], antigo).evidence.discoveries).toContain(
      'step-speed-1',
    )
  })
})

describe('o tamanho do passinho: o caso e o caminho livre', () => {
  test('só este caso escolhe as falas do passinho', () => {
    expect(lighthouseWalkStrideCase(BLOCO_DO_PASSINHO)).toBe(true)
    const outro = (goals: string[], freeExploration = true) =>
      lighthouseWalkStrideCase({ ...BLOCO_DO_PASSINHO, setup: { freeExploration, goals } })
    expect(outro(['step-speed-1', 'step-speed-3'], false)).toBe(false)
    expect(outro(['moves-each-frame', 'stopped-after-release', 'walked-real-speed'])).toBe(false)
    expect(outro(['left-the-screen', 'came-back-inside', 'stayed-inside'])).toBe(false)
    // O caso antigo do Dia 1 (a bancada de antes) também não.
    expect(outro(['still-without-arrow', 'moves-each-frame', 'step-speed-3', 'step-speed-1'])).toBe(
      false,
    )
  })

  test('o caminho livre completa as metas do bloco e fecha com stride-complete', () => {
    let sessao = initialExperiment(start)
    for (const acao of CAMINHO_DO_PASSINHO) sessao = stepExperiment(start, sessao, acao).session
    for (const meta of sceneTargets(BLOCO_DO_PASSINHO))
      expect(sessao.state.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(BLOCO_DO_PASSINHO, sessao.state).id).toBe('stride-complete')
  })
})
