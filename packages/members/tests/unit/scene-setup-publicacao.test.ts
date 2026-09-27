import { describe, expect, test } from 'bun:test'
import { assertBlockCoherent } from '../../src/application/content-admin/content-admin.service'
import type { LessonBlockContent } from '../../src/domain/course/lesson-block'

/**
 * M3 do full review 2 de dados (17/09/2026): quem recusa o objetivo que a cena não tem é a
 * PUBLICAÇÃO, e a frase dela era genérica ("Configure a atividade e sua verificação"). A professora
 * lia isso sobre um bloco em que só um id estava errado, e não tinha como saber qual. Agora a
 * mensagem NOMEIA cada id e diz o caminho, na mesma voz do aviso do editor.
 */

function bloco(goals: string[]): LessonBlockContent {
  return {
    kind: 'interactive',
    title: 'A cena',
    instructions: 'Aumente só o y.',
    hints: [],
    required: true,
    activity: { type: 'experimentation', scene: 'coordinates', setup: { goals } },
  } as unknown as LessonBlockContent
}

describe('a publicação NOMEIA o objetivo que a cena não tem', () => {
  test('⚠️⚠️ um id só: a frase diz qual é e o que fazer', () => {
    expect(() => assertBlockCoherent(bloco(['cut']))).toThrow(
      'Este caso cita um objetivo que não existe nesta cena: cut. Confira se a cena certa está escolhida e tire do caso.',
    )
  })

  test('⚠️ mais de um id: todos aparecem, e a frase concorda no plural', () => {
    expect(() => assertBlockCoherent(bloco(['cut', 'same-x']))).toThrow(
      'Este caso cita objetivos que não existem nesta cena: cut, same-x. Confira se a cena certa está escolhida e tire do caso.',
    )
  })

  test('⚠️ o objetivo que EXISTE na cena publica normalmente', () => {
    expect(() => assertBlockCoherent(bloco(['down']))).not.toThrow()
  })

  test('⚠️ bloco incoerente por outro motivo continua com a frase de sempre', () => {
    const semAtividade = {
      kind: 'interactive',
      title: 'A cena',
      instructions: 'Aumente só o y.',
      hints: [],
      required: true,
    } as unknown as LessonBlockContent
    expect(() => assertBlockCoherent(semAtividade)).toThrow(
      'Configure a atividade e sua verificação',
    )
  })
})
