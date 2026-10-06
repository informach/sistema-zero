import { describe, expect, test } from 'bun:test'
import { isInteractiveBlock } from '../index'
import { isSceneAction, LIGHTHOUSE_POSITION, type SceneAction, sceneFrameRate } from './actions'
import { sceneCenario } from './cast'
import { sceneGoalIds } from './catalog'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { isExperimentationActivity } from './index'
import { sceneReadout, sceneSituation } from './readout'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'
import { hydrateSceneState, isSceneState, type SceneState } from './state'

const start = { scene: 'lighthouse-position' } as const
const horizontal: SceneAction = { type: 'key-position', axis: 'x', value: 160 }
const vertical: SceneAction = { type: 'key-position', axis: 'y', value: 250 }
const play = (actions: SceneAction[], from = openScene(start)) =>
  actions.reduce((state, action) => stepScene(start, state, action), from)

describe('o lugar da chave no mapa do Farol', () => {
  test('abre no lugar do jogo e só conclui depois de mudar os dois eixos', () => {
    const initial = openScene(start)
    expect(initial.keyPosition).toEqual({ x: 211, y: 53, before: null })
    expect(initial.evidence.discoveries).toEqual([])
    expect(isSceneState(initial)).toBe(true)
    expect(sceneCenario(undefined, start.scene)).toBe('farol')
    expect(sceneFrameRate(start.scene)).toBeNull()

    const sideways = stepScene(start, initial, horizontal)
    expect(sideways.keyPosition).toEqual({ x: 160, y: 53, before: { x: 211, y: 53 } })
    expect(sideways.evidence.discoveries).toEqual(['mover-horizontal'])
    expect(evaluateExperimentation(start.scene, sideways).passed).toBe(false)
    expect(sideways.caption).toBe(
      'A chave foi para a esquerda. x mudou de 211 para 160; y continuou 53.',
    )

    const down = stepScene(start, sideways, vertical)
    expect(down.keyPosition).toEqual({ x: 160, y: 250, before: { x: 160, y: 53 } })
    expect(down.evidence.discoveries).toEqual(['mover-horizontal', 'mover-vertical'])
    expect(evaluateExperimentation(start.scene, down).passed).toBe(true)
    expect(isSceneState(down)).toBe(true)
    expect(sceneReadout(start.scene, down).map(({ label, value }) => [label, value])).toEqual([
      ['x da chave', '160'],
      ['y da chave', '250'],
    ])
    expect(sceneSituation(start.scene, down)).toBe(
      'A chave foi para baixo. y mudou de 53 para 250; x continuou 160.',
    )
    expect(initial.keyPosition).toEqual({ x: 211, y: 53, before: null })
    expect(sideways.keyPosition.before).toEqual({ x: 211, y: 53 })
  })

  test('o mesmo número, o reinício e ações de outra cena não concedem metas', () => {
    const still = play([
      { type: 'key-position', axis: 'x', value: 211 },
      { type: 'key-position', axis: 'y', value: 53 },
      { type: 'restart-key-position' },
    ])
    expect(still.evidence.discoveries).toEqual([])
    expect(still.keyPosition.before).toBeNull()
    expect(stepScene(start, still, { type: 'try-lighthouse-door' })).toBe(still)
    // Mudar a altura primeiro não pode contar movimento horizontal.
    expect(play([vertical]).evidence.discoveries).toEqual(['mover-vertical'])
    const moved = play([horizontal, vertical])
    const reset = stepScene(start, moved, { type: 'restart-key-position' })
    expect(reset.keyPosition).toEqual({ ...LIGHTHOUSE_POSITION.start, before: null })
    expect(reset.evidence.discoveries).toEqual(moved.evidence.discoveries)
  })

  test('aceita só inteiros em que a chave cabe na tela e ações da própria cena', () => {
    for (const axis of ['x', 'y'] as const) {
      const { min, max } = LIGHTHOUSE_POSITION[axis]
      for (const value of [min, max]) {
        const action = { type: 'key-position', axis, value } as const
        expect(isSceneAction(action, start.scene)).toBe(true)
        expect(isSceneState(play([action]))).toBe(true)
      }
      for (const value of [min - 1, max + 1, 2.5, '160', NaN, Infinity])
        expect(isSceneAction({ type: 'key-position', axis, value }, start.scene)).toBe(false)
    }
    expect(isSceneAction({ type: 'key-position', axis: 'z', value: 160 }, start.scene)).toBe(false)
    for (const scene of ['coordinates', 'lighthouse-key', 'lighthouse-walk'] as const) {
      expect(isSceneAction(horizontal, scene)).toBe(false)
      expect(isSceneAction({ type: 'restart-key-position' }, scene)).toBe(false)
    }
  })

  test('o setup troca o lugar inicial, sem histórico nem descobertas da criança', () => {
    const prepared = openScene({ ...start, setup: { actions: [horizontal, vertical] } })
    expect(prepared.keyPosition).toEqual({ x: 160, y: 250, before: null })
    expect(prepared.evidence.discoveries).toEqual([])
    expect(isSceneState(prepared)).toBe(true)
  })

  test('Recomeçar volta para onde o caso abriu, e a frase diz esse lugar', () => {
    const caso = { ...start, setup: { actions: [horizontal, vertical] } }
    const moved = stepScene(caso, openScene(caso), { type: 'key-position', axis: 'x', value: 300 })
    const reset = stepScene(caso, moved, { type: 'restart-key-position' })
    expect(reset.keyPosition).toEqual({ x: 160, y: 250, before: null })
    expect(reset.caption).toBe('A chave voltou ao começo: x 160, y 250.')
    expect(isSceneState(reset)).toBe(true)
    // Sem caso, o mesmo de antes: 211/53.
    const fabrica = stepScene(start, play([horizontal]), { type: 'restart-key-position' })
    expect(fabrica.keyPosition).toEqual({ ...LIGHTHOUSE_POSITION.start, before: null })
    expect(fabrica.caption).toBe('A chave voltou ao começo: x 211, y 53.')
  })

  test('um caso que recomeça no meio abre e recomeça no lugar final, sem chamar a si mesmo', () => {
    const caso = {
      ...start,
      setup: {
        actions: [horizontal, { type: 'restart-key-position' }, vertical] satisfies SceneAction[],
      },
    }
    const aberto = openScene(caso)
    expect(aberto.keyPosition).toEqual({ x: 211, y: 250, before: null })
    const reset = stepScene(caso, play([horizontal], aberto), { type: 'restart-key-position' })
    expect(reset.keyPosition).toEqual({ x: 211, y: 250, before: null })
  })

  test('hidrata sessões anteriores sem o grupo novo e rejeita retratos incoerentes', () => {
    const old = JSON.parse(JSON.stringify(openScene({ scene: 'lighthouse-key' })))
    delete old.keyPosition
    expect(isSceneState(hydrateSceneState(old))).toBe(true)
    const changed = play([horizontal])
    const withPosition = (keyPosition: unknown) => ({ ...changed, keyPosition })
    expect(isSceneState(withPosition({ x: 160, y: 53 }))).toBe(false)
    expect(isSceneState(withPosition({ x: -1, y: 53, before: null }))).toBe(false)
    expect(isSceneState(withPosition({ x: 160, y: 53, before: { x: 160, y: 53 } }))).toBe(false)
    expect(isSceneState(withPosition({ x: 160, y: 53, before: { x: 211, y: 100 } }))).toBe(false)
    expect((hydrateSceneState(changed) as SceneState).keyPosition).toEqual(changed.keyPosition)
  })

  test('o retrato guardado só leva o lugar da chave quando ele saiu do padrão', () => {
    // Nas outras cenas o grupo é sempre o de fábrica: guardá-lo em cada retrato estourava o teto
    // de bytes das respostas na `coordinates` (ver o `pack` da sessão).
    const outra = { scene: 'coordinates' } as const
    let coordenadas = initialExperiment(outra)
    coordenadas = stepExperiment(outra, coordenadas, { type: 'place', x: 130, y: 150 }).session
    const guardado = packExperiment(outra.scene, coordenadas)
    expect(guardado.join('')).not.toContain('keyPosition')
    expect(readExperimentSession(outra.scene, guardado)?.state.keyPosition).toEqual({
      ...LIGHTHOUSE_POSITION.start,
      before: null,
    })
    let chave = initialExperiment(start)
    expect(packExperiment(start.scene, chave).join('')).not.toContain('keyPosition')
    chave = stepExperiment(start, chave, horizontal).session
    const comChave = packExperiment(start.scene, chave)
    expect(comChave.join('')).toContain('keyPosition')
    const lido = readExperimentSession(start.scene, comChave)
    expect(lido?.state.keyPosition).toEqual(chave.state.keyPosition)
    // O retrato do Desfazer (a chave ainda no começo) volta inteiro também.
    expect(lido?.past.at(-1)?.keyPosition).toEqual({ ...LIGHTHOUSE_POSITION.start, before: null })
  })

  test('desfazer e recarregar conservam as coordenadas, o rastro e as descobertas', () => {
    let session = initialExperiment(start)
    session = stepExperiment(start, session, horizontal).session
    session = stepExperiment(start, session, vertical).session
    const saved = readExperimentSession(start.scene, packExperiment(start.scene, session))
    expect(saved?.state.keyPosition).toEqual(session.state.keyPosition)
    expect(saved?.state.evidence.discoveries).toEqual(session.state.evidence.discoveries)
    const undone = stepExperiment(start, session, { type: 'undo' }).session
    expect(undone.state.keyPosition).toEqual({ x: 160, y: 53, before: { x: 211, y: 53 } })
    // Desfazer volta o mundo; a criança continua tendo visto os dois movimentos.
    expect(undone.state.evidence.discoveries).toEqual(['mover-horizontal', 'mover-vertical'])
  })

  test('o catálogo e o bloco da aula aceitam as duas metas', () => {
    const activity = {
      type: 'experimentation',
      scene: start.scene,
      cenario: 'farol',
      setup: { goals: ['mover-horizontal', 'mover-vertical'] },
    } as const
    expect(sceneGoalIds(start.scene)).toEqual(['mover-horizontal', 'mover-vertical'])
    expect(isExperimentationActivity(activity)).toBe(true)
    expect(
      isInteractiveBlock({
        kind: 'interactive',
        required: true,
        title: 'Onde fica a chave?',
        semPerguntaFinal: true,
        instructions: 'Mude um número por vez.',
        hints: [],
        activity,
      }),
    ).toBe(true)
  })
})
