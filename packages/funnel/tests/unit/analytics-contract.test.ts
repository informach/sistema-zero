import { describe, expect, test } from 'bun:test'
import { analyticsPage } from '../../src/analytics/page-context'
import { EventBatch } from '../../src/analytics/protocol'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import { COMUNIDADE_DOS_CRIADORES } from '../../src/funnels/comunidade-dos-criadores'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'

describe('contrato de medição', () => {
  test('fotografia estável e separada por produto', () => {
    const f = COMUNIDADE_DOS_CRIADORES
    expect(quizDefinition(f)).toEqual(quizDefinition(f))
    expect(quizDefinition(f)?.id).not.toBe(quizDefinition(DESAFIO_PRIMEIRO_JOGO)?.id)
    expect(quizDefinition(f)?.questions[0]?.id).toBe(f.content.quiz?.steps[0]?.key)
  })

  test('texto, opções e ordem novos não reescrevem a versão antiga', () => {
    const f = COMUNIDADE_DOS_CRIADORES
    const original = quizDefinition(f)!
    const quiz = f.content.quiz!
    const changed = {
      ...f,
      content: {
        ...f.content,
        quiz: {
          ...quiz,
          steps: quiz.steps.map((s, i) => (i ? s : { ...s, titulo: 'Nova pergunta' })),
        },
      },
    }
    const reordered = {
      ...f,
      content: { ...f.content, quiz: { ...quiz, steps: [...quiz.steps].reverse() } },
    }
    expect(quizDefinition(changed)?.id).not.toBe(original.id)
    expect(quizDefinition(reordered)?.id).not.toBe(original.id)
    expect(original.questions[0]?.title).toBe(quiz.steps[0]?.titulo)
    expect(quizDefinition(changed)?.questions[0]?.id).toBe(original.questions[0]?.id)
  })

  test('áreas privadas excluídas e nova variante da oferta reconhecida', () => {
    expect(analyticsPage('/admin')).toBeNull()
    expect(analyticsPage('/api/leads')).toBeNull()
    expect(analyticsPage('/kids/comunidade-dos-criadores/oferta/nova-variante')?.funnel).toBe(
      'kids/comunidade-dos-criadores',
    )
    expect(analyticsPage('/')).toMatchObject({ kind: 'bio', publicText: true })
    expect(analyticsPage('/kids/comunidade-dos-criadores/checkout')?.publicText).toBe(false)
    expect(analyticsPage('/?email=pessoa@example.com')).toBeNull()
  })

  test('eventos comerciais, propriedades livres e URLs completas não entram', () => {
    const base = {
      sessionId: crypto.randomUUID(),
      events: [
        {
          id: crypto.randomUUID(),
          pageViewId: crypto.randomUUID(),
          name: 'page_view',
          path: '/',
          revision: 'a'.repeat(64),
          at: new Date().toISOString(),
        },
      ],
    }
    expect(EventBatch.safeParse(base).success).toBe(true)
    expect(
      EventBatch.safeParse({ ...base, events: [{ ...base.events[0], name: 'payment_approved' }] })
        .success,
    ).toBe(false)
    expect(
      EventBatch.safeParse({
        ...base,
        events: [{ ...base.events[0], email: 'pessoa@example.com' }],
      }).success,
    ).toBe(false)
    expect(
      EventBatch.safeParse({
        ...base,
        events: [{ ...base.events[0], path: '/checkout?email=pessoa@example.com' }],
      }).success,
    ).toBe(false)
    expect(EventBatch.safeParse({ ...base, events: Array(41).fill(base.events[0]) }).success).toBe(
      false,
    )
  })
})
