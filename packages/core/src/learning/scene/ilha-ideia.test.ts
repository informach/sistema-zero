import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import type { SceneStart } from './state'

/**
 * A Ilha do Farol (02/11/2026): as três experiências só com a ideia e com o convite à investigação
 * do Cadê e do Farol. Antes do teste, o Zappy pergunta e diz o que observar; o resultado (o objeto
 * ficou no lugar, o papel de cada número, se encostou) só aparece na fala de DEPOIS dele.
 */
const falas = new Map(discoverySpeechSteps('island-3d').map(({ id, text }) => [id, text] as const))

describe('Ilha do Farol: o Zappy fala da ideia', () => {
  test.each([...falas.keys()])('%s não fala de bloco, regra, área nem código', (id) => {
    expect(falas.get(id)).not.toMatch(/\bbloco|\bregra|(^|\s)área|(^|\s)código|\bcomando/i)
  })

  const ANTES: [string, RegExp][] = [
    ['island-view-start', /mesmo lugar|continu|não (se )?mexeu|câmera/i],
    ['island-view-compare', /mesmo lugar|continu|não (se )?mexeu|câmera/i],
    ['island-position-start', /\bchão\b|altura|sobe|desce|para os lados|frente e para trás/i],
    ...(['x', 'y', 'z'] as const).flatMap((a) =>
      (['plus', 'minus'] as const).map((step): [string, RegExp] => [
        `island-position-${a}-${step}`,
        /\bchão\b|altura|sobe|desce|para os lados|frente e para trás/i,
      ]),
    ),
    ['island-contact-start', /não encost|separad|espaço entre|alta demais|na altura/i],
    // A fala que explica um caso já testado não entrega o PRÓXIMO teste.
    ['island-contact-other', /abaix|diminu|desç|na altura/i],
    ['island-contact-touch-first', /ficam separados porque|alta demais/i],
  ]
  test.each(ANTES)('%s não conta o resultado antes do teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })

  test('depois de investigar um número, o Zappy explica o papel dele', () => {
    expect(falas.get('island-position-x-found')).toMatch(/chão/)
    expect(falas.get('island-position-z-found')).toMatch(/chão/)
    expect(falas.get('island-position-y-found')).toMatch(/altura/)
    expect(falas.get('island-view-complete')).toMatch(/câmera/)
    expect(falas.get('island-contact-complete')).toMatch(/altura/)
  })
})

describe('Ilha do Farol: a fala acompanha a ordem que a criança escolheu', () => {
  const caso = (goals: string[]) => {
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'island-3d',
      setup: { goals, freeExploration: true },
    }
    const start: SceneStart = { scene: activity.scene, setup: activity.setup }
    return (actions: SceneAction[]) =>
      discoveryGuidance(
        activity,
        actions.reduce((s, a) => stepScene(start, s, a), openScene(start)),
      )?.id
  }
  const eixo = (axis: 'x' | 'y' | 'z', value: number): SceneAction => ({
    type: 'island-axis',
    axis,
    value,
  })

  test('posição: pergunta antes, explica depois, no número em que a criança está', () => {
    const tocar = caso(['axis-x', 'axis-y', 'axis-z'])
    expect(tocar([])).toBe('island-position-start')
    // Começar pelo y: a fala acompanha o y, não sugere o x.
    expect(tocar([eixo('y', 2)])).toBe('island-position-y-minus')
    expect(tocar([eixo('y', 2), eixo('y', 0)])).toBe('island-position-y-found')
    // Repetir o mesmo número não muda a explicação.
    expect(tocar([eixo('y', 2), eixo('y', 0), eixo('y', 3)])).toBe('island-position-y-found')
    // Ir primeiro para menos: falta o mais.
    expect(tocar([eixo('y', 2), eixo('y', 0), eixo('z', -4)])).toBe('island-position-z-plus')
    const todos = [eixo('x', 4), eixo('x', -4), eixo('z', 4), eixo('z', -4), eixo('y', 4)]
    expect(tocar(todos)).toBe('island-position-y-minus')
    expect(tocar([...todos, eixo('y', 0)])).toBe('island-position-complete')
  })

  test('ponto de vista e contato: a explicação só vem depois da comparação', () => {
    const vista = caso(['other-view', 'same-place'])
    expect(vista([])).toBe('island-view-start')
    expect(vista([{ type: 'island-view', view: 'side' }])).toBe('island-view-compare')
    expect(
      vista([
        { type: 'island-view', view: 'side' },
        { type: 'island-answer', answer: 'camera' },
      ]),
    ).toBe('island-view-complete')

    const contato = caso(['contact-apart', 'contact-touch'])
    const testar: SceneAction = { type: 'island-test' }
    expect(contato([])).toBe('island-contact-start')
    expect(contato([testar])).toBe('island-contact-other')
    expect(contato([eixo('y', 1), testar])).toBe('island-contact-touch-first')
    expect(contato([testar, eixo('y', 1), testar])).toBe('island-contact-complete')
  })

  test('a legenda da troca de vista pede para observar, sem afirmar o resultado', () => {
    const start: SceneStart = {
      scene: 'island-3d',
      setup: { goals: ['other-view', 'same-place'], freeExploration: true },
    }
    const s = stepScene(start, openScene(start), { type: 'island-view', view: 'top' })
    expect(s.caption).toMatch(/\?$/)
    expect(s.caption).not.toMatch(/mesmo lugar|continuam/i)
  })

  test('o resultado do encontro fala de encostar, sem "áreas", e o número sai em português', () => {
    const start: SceneStart = {
      scene: 'island-3d',
      setup: { goals: ['contact-apart', 'contact-touch'], freeExploration: true },
    }
    let s = stepScene(start, openScene(start), { type: 'island-test' })
    expect(s.caption).toBe('Não estão encostando: há um espaço entre eles.')
    s = stepScene(start, s, { type: 'island-axis', axis: 'y', value: 2.5 })
    expect(s.caption).toStartWith('y: 3 → 2,5.')
    s = stepScene(start, stepScene(start, s, { type: 'island-axis', axis: 'y', value: 1 }), {
      type: 'island-test',
    })
    expect(s.caption).toBe('Estão encostando.')
  })
})
