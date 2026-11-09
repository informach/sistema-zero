import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import type { SceneStart } from './state'

/**
 * A Ilha do Farol. Desde 08/11/2026 (proposta "Experiências do Faísca", aprovada) a câmera é um
 * controle (Frente, Lado, Cima), cada número tem − e + na cor do eixo, e no contato o jogo confere
 * o encontro o tempo todo. O Zappy fala curto, uma coisa por vez, e o papel de cada número só
 * aparece depois de a criança ir para os dois lados dele.
 */
const falas = new Map(discoverySpeechSteps('island-3d').map(({ id, text }) => [id, text] as const))

describe('Ilha do Farol: o Zappy fala curto, só da ideia', () => {
  test.each([...falas.keys()])('%s é curta e não fala de bloco, botão nem sinal', (id) => {
    const texto = falas.get(id) ?? ''
    if (!/-(?:idea|bridge)$/.test(id)) expect(texto.split(/\s+/).length).toBeLessThanOrEqual(12)
    expect(texto).not.toMatch(
      /\bbloco|\bregra|(^|\s)área|(^|\s)código|\bcomando|[Cc]lique em|Ver de|Testar o encontro|[−+]/,
    )
  })

  test('cada modo tem a ideia e o "No seu jogo"', () => {
    for (const modo of ['view', 'position', 'contact']) {
      expect(falas.get(`island-${modo}-idea`)).toBeString()
      expect(falas.get(`island-${modo}-bridge`)).toStartWith('No seu jogo: ')
    }
  })

  const ANTES: [string, RegExp][] = [
    ['island-view-start', /mesmo lugar|continu|não (se )?mexeu/i],
    ['island-view-compare', /mesmo lugar|continu|não (se )?mexeu/i],
    ['island-position-start', /\bchão\b|altura|sobe|desce|para os lados|frente e para trás/i],
    ['island-position-other-side', /\bchão\b|altura|sobe|desce|para os lados/i],
    ['island-position-next', /\bchão\b|altura|sobe|desce|para os lados/i],
  ]
  test.each(ANTES)('%s não conta o resultado antes do teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })

  test('depois de investigar, o Zappy diz a ideia', () => {
    expect(falas.get('island-position-complete')).toMatch(/chão/)
    expect(falas.get('island-position-complete')).toMatch(/altura/)
    expect(falas.get('island-view-complete')).toMatch(/câmera/)
    expect(falas.get('island-contact-complete')).toMatch(/encostar/)
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

  test('posição: pede o outro lado do número que a criança começou', () => {
    const tocar = caso(['axis-x', 'axis-y', 'axis-z'])
    expect(tocar([])).toBe('island-position-start')
    expect(tocar([eixo('y', 2)])).toBe('island-position-other-side')
    expect(tocar([eixo('y', 2), eixo('y', 0)])).toBe('island-position-next')
    expect(tocar([eixo('y', 2), eixo('y', 0), eixo('z', -4)])).toBe('island-position-other-side')
    const todos = [eixo('x', 4), eixo('x', -4), eixo('z', 4), eixo('z', -4), eixo('y', 4)]
    expect(tocar(todos)).toBe('island-position-other-side')
    expect(tocar([...todos, eixo('y', 0)])).toBe('island-position-complete')
  })

  test('ponto de vista: a resposta errada volta para a frente; a certa conclui', () => {
    const vista = caso(['other-view', 'same-place'])
    expect(vista([])).toBe('island-view-start')
    const lado: SceneAction = { type: 'island-view', view: 'side' }
    expect(vista([lado])).toBe('island-view-compare')
    expect(vista([lado, { type: 'island-answer', answer: 'key' }])).toBe('island-view-wrong')
    expect(vista([lado, { type: 'island-answer', answer: 'camera' }])).toBe('island-view-complete')
  })

  test('contato: de cima parece junto; de lado aparece o espaço; baixar a chave encosta', () => {
    const contato = caso(['contact-apart', 'contact-touch'])
    const testar: SceneAction = { type: 'island-test' }
    const lado: SceneAction = { type: 'island-view', view: 'side' }
    expect(contato([])).toBe('island-contact-start')
    // Na tela, trocar a câmera também confere o encontro (o jogo confere o tempo todo).
    expect(contato([lado, testar])).toBe('island-contact-space')
    // Ainda olhando de cima: a fala pede o lado.
    expect(contato([testar])).toBe('island-contact-top')
    expect(contato([lado, testar, eixo('y', 2), testar])).toBe('island-contact-complete')
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
