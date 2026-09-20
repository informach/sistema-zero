import { describe, expect, test } from 'bun:test'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS } from '@sistemazero/core/learning/scene'
import {
  casoAoTrocarCena,
  lembrar,
  textoAoTrocarCena,
  trocarCena,
  trocarTipo,
} from '../src/lib/scene-authoring-rules'

const base: InteractiveBlock = {
  kind: 'interactive',
  title: SCENE_MODELS.world.title,
  instructions: SCENE_MODELS.world.instruction,
  hints: [...SCENE_MODELS.world.hints],
  required: false,
  activity: { type: 'experimentation', scene: 'world' },
}

describe('autoria de experimentação e HTML', () => {
  test('texto do modelo acompanha a cena, texto próprio permanece', () => {
    expect(textoAoTrocarCena(base, 'world', 'layers')).toEqual({
      title: SCENE_MODELS.layers.title,
      instructions: SCENE_MODELS.layers.instruction,
      hints: [...SCENE_MODELS.layers.hints],
    })
    expect(
      textoAoTrocarCena(
        { title: 'Minha cena', instructions: 'Minha instrução', hints: ['Minha pista'] },
        'world',
        'layers',
      ),
    ).toEqual({ title: 'Minha cena', instructions: 'Minha instrução', hints: ['Minha pista'] })
  })

  test('caso de outra cena é aparado com aviso, sem invalidar a atividade', () => {
    const source: InteractiveBlock = {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'velocity',
        setup: { actions: [{ type: 'velocity', vx: 5, vy: 0 }], goals: ['moves'] },
      },
    }
    const { bloco, aviso } = trocarCena(source, 'variable')
    expect(aviso).toContain('outra cena')
    expect(bloco.activity.type).toBe('experimentation')
    if (bloco.activity.type !== 'experimentation') return
    expect(bloco.activity.setup).toBeUndefined()
    expect(isInteractiveBlock(bloco)).toBe(true)
  })

  test('ação que serve na nova cena permanece', () => {
    const setup = { actions: [{ type: 'advance' as const, seconds: 1 }] }
    expect(casoAoTrocarCena(setup, 'velocity')).toEqual({ setup, descartado: 'nada' })
  })

  test('troca para HTML mantém pergunta escrita e tira o palpite da cena', () => {
    const custom: InteractiveBlock = {
      ...base,
      checkpoint: {
        prompt: 'O que aconteceu?',
        choices: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        correctChoiceId: 'a',
        explanation: 'Foi A.',
      },
      prediction: {
        context: { label: 'Cena', explanation: 'Veja a cena antes de responder.' },
        prompt: 'Qual será o resultado?',
        choices: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
      },
    }
    const { bloco, aviso } = trocarTipo(custom, 'html', lembrar({}, custom))
    expect(bloco.activity.type).toBe('html')
    expect(bloco.checkpoint?.prompt).toBe('O que aconteceu?')
    expect(bloco.prediction).toBeUndefined()
    expect(aviso).toContain('palpite')
    expect(isInteractiveBlock(bloco)).toBe(true)
  })

  test('voltar do HTML restaura cena, caso e impulso guardados no editor', () => {
    const salto: InteractiveBlock = {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'impulse',
        initialImpulse: 14,
        setup: { actions: [{ type: 'impulse', force: 14 }] },
      },
    }
    const memoria = lembrar({}, salto)
    const html = trocarTipo(salto, 'html', memoria).bloco
    const volta = trocarTipo(html, 'experimentation', memoria).bloco
    expect(volta.activity).toMatchObject({
      type: 'experimentation',
      scene: 'impulse',
      initialImpulse: 14,
      setup: { actions: [{ type: 'impulse', force: 14 }] },
    })
    expect(isInteractiveBlock(volta)).toBe(true)
  })

  test('dispensar a pergunta do fim só permanece na experimentação', () => {
    const source: InteractiveBlock = {
      ...base,
      semPerguntaFinal: true,
    }
    expect(trocarTipo(source, 'html').bloco.semPerguntaFinal).toBeUndefined()
    expect(trocarCena(source, 'layers').bloco.semPerguntaFinal).toBe(true)
  })
})
