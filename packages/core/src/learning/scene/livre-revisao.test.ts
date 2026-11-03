import { describe, expect, test } from 'bun:test'
import { CAMINHOS_LIVRES_DINO_C } from '../../../tests/fixtures/caminhos-livres/dino-c'
import { CAMINHOS_LIVRES_MEU_JEITO_E } from '../../../tests/fixtures/caminhos-livres/meu-jeito-e'
import {
  CAMINHOS_LIVRES_NAVE_B,
  espera as esperar,
  segundo,
  segundos,
} from '../../../tests/fixtures/caminhos-livres/nave-b'
import { isSceneAction, RESTART_CASE_SCENES, type SceneAction, type SceneId } from './actions'
import { openScene, stepScene } from './engine'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  isSceneSetup,
  isSceneSetupAction,
} from './index'
import { SPAWN_PRESETS } from './presets'
import { initialExperiment, stepExperiment } from './session'
import type { SceneStart } from './state'
import { falasDaCena, SCENE_SPEECH_SLOTS, VOZ_LIMITS } from './voz'

/**
 * Full review do Construtor (02/11/2026): os consertos que a revisão independente pediu.
 */
const CAMINHOS: Partial<Record<SceneId, SceneAction[]>> = {
  ...CAMINHOS_LIVRES_NAVE_B,
  ...CAMINHOS_LIVRES_MEU_JEITO_E,
  // A reta e a aceleração do Corre Dino (frente C) também têm o "Voltar ao começo".
  ...CAMINHOS_LIVRES_DINO_C,
}
const livre = (scene: SceneId): SceneStart => ({ scene, setup: { freeExploration: true } })
const percorrer = (start: SceneStart, acoes: readonly SceneAction[]) =>
  acoes.reduce((s, a) => stepExperiment(start, s, a).session, initialExperiment(start))

describe('reiniciar o caso não pode fazer parte da própria abertura', () => {
  test.each([...RESTART_CASE_SCENES])('%s recusa reinício nas ações iniciais', (scene) => {
    const action: SceneAction = { type: 'restart-case' }
    expect(isSceneSetupAction(action, scene)).toBe(false)
    expect(isSceneSetup({ freeExploration: true, actions: [action] }, scene)).toBe(false)
  })
  test.each([
    ...RESTART_CASE_SCENES,
  ])('%s abre sem recursão mesmo com configuração inválida', (scene) => {
    const start: SceneStart = {
      scene,
      setup: { freeExploration: true, actions: [{ type: 'restart-case' }] },
    }
    expect(openScene(start)).toEqual(openScene(livre(scene)))
  })
})

describe('"Voltar ao começo" no meio dos controles guarda as descobertas', () => {
  test.each([...RESTART_CASE_SCENES])('%s', (scene) => {
    const start = livre(scene)
    const acoes = CAMINHOS[scene]
    if (!acoes) throw new Error(`Percurso ausente: ${scene}`)
    const antes = percorrer(start, acoes)
    expect(antes.state.evidence.discoveries.length).toBeGreaterThan(0)
    const voltou = stepExperiment(start, antes, { type: 'restart-case' }).session
    expect(voltou.state.evidence.discoveries).toEqual(antes.state.evidence.discoveries)
    // O "Recomeçar experiência" do rodapé (o `reset` livre) continua apagando tudo.
    const recomecou = stepExperiment(start, antes, { type: 'reset' }).session
    expect(recomecou.state.evidence.discoveries).toEqual([])
  })

  test('a ação só existe nas cenas que têm o botão, e fora do modo livre não faz nada', () => {
    expect(isSceneAction({ type: 'restart-case' }, 'spawn')).toBe(false)
    const guiada: SceneStart = { scene: 'velocity' }
    const aberta = openScene(guiada)
    expect(stepScene(guiada, aberta, { type: 'restart-case' })).toBe(aberta)
  })

  test('a trombada e a proteção guardam a escolha da criança ao voltar', () => {
    const trombada = livre('collision-pair')
    const t = percorrer(trombada, CAMINHOS['collision-pair'] ?? [])
    const tv = stepExperiment(trombada, t, { type: 'restart-case' }).session.state
    expect(tv.collisionPair.frames).toBe(0)
    expect(tv.collisionPair.shotTarget).toBe(t.state.collisionPair.shotTarget)
    const protecao = livre('invincibility')
    const p = percorrer(protecao, CAMINHOS.invincibility ?? [])
    const pv = stepExperiment(protecao, p, { type: 'restart-case' }).session.state
    expect(pv.invincibility.frames).toBe(0)
    expect(pv.invincibility.protection).toBe(p.state.invincibility.protection)
  })
})

describe('trocar a escolha no caso do próprio bloco não entra em recursão', () => {
  test('proteção nas ações do caso', () => {
    const start: SceneStart = {
      scene: 'invincibility',
      setup: { freeExploration: true, actions: [{ type: 'shield', frames: 15 }] },
    }
    expect(openScene(start).invincibility.protection).toBe(15)
  })
  test('alvo da trombada depois de o tempo andar, nas ações do caso', () => {
    const start: SceneStart = {
      scene: 'collision-pair',
      setup: {
        freeExploration: true,
        actions: [
          { type: 'advance', seconds: 1 },
          { type: 'command-target', subject: 'shot', target: 'alias' },
        ],
      },
    }
    expect(openScene(start).collisionPair.shotTarget).toBe('alias')
  })
})

describe('o Zappy da chuva segue as metas do bloco', () => {
  const nave: ExperimentationActivity = {
    type: 'experimentation',
    scene: 'spawn',
    setup: {
      freeExploration: true,
      preset: SPAWN_PRESETS['pedra-quadros'],
      goals: ['every-frame', 'with-timer'],
    },
  }
  const fala = (activity: ExperimentationActivity, acoes: readonly SceneAction[]) => {
    const start: SceneStart = { scene: activity.scene, setup: activity.setup }
    return discoveryGuidance(activity, percorrer(start, acoes).state)?.id
  }
  const parede: SceneAction[] = [segundo]
  const espera: SceneAction[] = [esperar(true), ...segundos(4)]

  test('com as duas metas da Nave, a fala final chega sem pedir a queda', () => {
    expect(fala(nave, [...parede, ...espera])).toBe('spawn-complete-two')
  })
  test('com espera e sem a parede, a fala não afirma a queda que ninguém mediu', () => {
    expect(fala(nave, espera)).toBe('spawn-gap')
  })
  test('quem pede a queda segue pedindo a medida', () => {
    const comQueda: ExperimentationActivity = {
      ...nave,
      setup: { ...nave.setup, goals: ['every-frame', 'with-timer', 'same-fall'] },
    }
    expect(fala(comQueda, [...parede, ...espera])).toMatch(/^spawn-fall/)
  })
})

test('as falas das telas livres podem ter a pronúncia ajustada no Admin', () => {
  const slots = new Set<string>(SCENE_SPEECH_SLOTS)
  for (const id of ['velocity-up', 'spawn-complete-two', 'spawn-start'])
    expect(slots.has(`discovery:${id}`)).toBe(true)
})

describe('a voz do Zappy só lista as falas que o bloco pode tocar', () => {
  const ids = (activity: Parameters<typeof falasDaCena>[0]['activity']) =>
    falasDaCena({ activity })
      .map((f) => f.slot)
      .filter((s) => s.startsWith('discovery:'))
  test('porta do Farol × porta do não da Ilha', () => {
    const farol = ids({
      type: 'experimentation',
      scene: 'lighthouse-key',
      setup: { freeExploration: true },
    })
    expect(farol.length).toBeGreaterThan(0)
    expect(farol.some((s) => s.startsWith('discovery:door-not-'))).toBe(false)
    const ilha = ids({
      type: 'experimentation',
      scene: 'lighthouse-key',
      setup: { freeExploration: true, goals: ['not-flips-with-key', 'not-flips-without-key'] },
    })
    expect(ilha.length).toBeGreaterThan(0)
    expect(ilha.every((s) => s.startsWith('discovery:door-not-'))).toBe(true)
  })
  test('caminhada do Farol sem as falas da Nave nem do passinho', () => {
    const farol = ids({
      type: 'experimentation',
      scene: 'lighthouse-walk',
      cenario: 'farol',
      setup: { freeExploration: true },
    })
    expect(farol.some((s) => s.endsWith('-nave') || s.includes(':stride-'))).toBe(false)
  })
  test.each([
    { goals: ['moves-each-frame', 'stopped-after-release', 'walked-real-speed'], prefix: 'slow' },
    { goals: ['left-the-screen', 'came-back-inside', 'stayed-inside'], prefix: 'border' },
    { goals: ['left-the-screen', 'stayed-inside', 'compared-command-order'], prefix: 'edge' },
    { goals: ['step-speed-1', 'step-speed-3'], prefix: 'stride' },
    { goals: ['moves-each-frame', 'still-without-arrow'], prefix: 'walk' },
  ])('caminhada grava apenas o caso $prefix', ({ goals, prefix }) => {
    const slots = ids({
      type: 'experimentation',
      scene: 'lighthouse-walk',
      cenario: 'farol',
      setup: { freeExploration: true, goals: [...goals] },
    })
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((slot) => slot.startsWith(`discovery:${prefix}-`))).toBe(true)
    // Incluindo a instrução, o dicionário deve caber no contrato de publicação.
    expect(slots.length + 1).toBeLessThanOrEqual(VOZ_LIMITS.entradas)
  })
  test('a beirada da Nave grava a variante que o player usa, sem duplicar a fala do Farol', () => {
    const slots = ids({
      type: 'experimentation',
      scene: 'lighthouse-walk',
      cenario: 'nave',
      setup: {
        freeExploration: true,
        goals: ['left-the-screen', 'came-back-inside', 'stayed-inside'],
      },
    })
    expect(slots).toHaveLength(9)
    expect(
      slots.every((slot) => slot.startsWith('discovery:border-') && slot.endsWith('-nave')),
    ).toBe(true)
  })
  test('variante do Dino × da Nave na mesma cena', () => {
    const dino = ids({
      type: 'experimentation',
      scene: 'velocity',
      cenario: 'corre-dino',
      setup: { freeExploration: true },
    })
    const nave = ids({
      type: 'experimentation',
      scene: 'velocity',
      cenario: 'nave',
      setup: { freeExploration: true },
    })
    expect(dino.length).toBeGreaterThan(0)
    expect(dino.every((s) => s.includes('-dino-'))).toBe(true)
    expect(nave.some((s) => s.includes('-dino-'))).toBe(false)
  })
})
