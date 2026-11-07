import { describe, expect, test } from 'bun:test'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import { ADULT_ENGINES } from '../../src/funnels/adulto-autonomia/engine'
import { buildNarrative } from '../../src/funnels/adulto-autonomia/narrative'
import type { AdultMode, CompleteAnswers } from '../../src/funnels/adulto-autonomia/types'
import { adminFunnelList, getFunnelByKey } from '../../src/funnels/registry'
import { adminQuizAnswers } from '../../src/lib/admin-quiz-answers'
import { buildFunnelSteps, stepConversions } from '../../src/server/admin'
import approved from '../fixtures/adulto-autonomia-approved.json'
import { adultJourney } from '../helpers/adulto-autonomia'

for (const mode of ['desafio', 'comunidade'] as AdultMode[])
  describe(`Adulto autonomia: ${mode}`, () => {
    const e = ADULT_ENGINES[mode]
    const funnel = getFunnelByKey(
      `pro/${mode === 'desafio' ? 'desafio-primeiro-jogo' : 'comunidade-dos-criadores'}`,
    )!
    test('admin: dez etapas, numeração correta, variantes exatas e múltiplas opções legíveis', () => {
      const definition = quizDefinition(funnel)!,
        info = adminFunnelList().find((f) => f.key === funnel.key)
      expect(definition.version).toBe(e.version)
      expect(definition.questions).toHaveLength(20)
      for (const sample of approved.filter((s) => s.mode === mode)) {
        const { answers, responses } = adultJourney(mode, sample.answers)
        const rows = adminQuizAnswers(answers, definition, info)
        expect(rows.map((r) => r.key)).toEqual(responses.map((r) => r.key))
        for (const [i, row] of rows.entries()) {
          const question = definition.questions.find((q) => q.id === row.key)!
          expect(question.position).toBe(i + 1)
          expect(question.displayPosition).toBe(i + 1)
          expect(row.label).toBe(e.activeSteps(answers)[i]!.titulo)
          for (const value of Array.isArray(answers[row.key])
            ? (answers[row.key] as string[])
            : [String(answers[row.key])])
            expect(row.options?.[value]).toBeTruthy()
        }
      }
      const steps = buildFunnelSteps(funnel),
        questions = steps.filter((s) => s.name.startsWith('respondeu_'))
      expect(questions).toHaveLength(10)
      questions.forEach((s, i) => {
        expect(s.label).toStartWith(`Pergunta ${i + 1} · `)
      })
      const rates = stepConversions(steps, () => 1)
      expect(rates.find((r) => r.step.name === 'viu_resultado')?.fromPrev).toBe(1)
      const old = adminQuizAnswers(
        { _quiz_version: `${mode}-adulto-v1`, cena: 'B', computador: 'meu' },
        null,
        info,
      )
      expect(old).toHaveLength(2)
      for (const row of old) {
        expect(row.label).toStartWith('(quiz anterior) ')
        expect(row.options?.[row.key === 'cena' ? 'B' : 'meu']).toBeTruthy()
      }
    })
    test('dez perguntas e resultados fiéis às 16 situações aprovadas', () => {
      for (const sample of approved.filter((s) => s.mode === mode)) {
        const { answers, responses } = adultJourney(mode, sample.answers)
        expect(responses).toHaveLength(10)
        expect(e.isComplete(answers)).toBe(true)
        expect(e.computePerfil(answers)).toBe(`autonomia-${sample.answers.conquista}`)
        const narrative = buildNarrative(mode, e.normalize(answers) as CompleteAnswers)
        expect(narrative as unknown).toEqual({
          ...sample.expected,
          href: sample.expected.productionHref,
        })
        expect(e.steps.every((s) => s.lastStep.length <= 64 && s.eventName.length <= 64)).toBe(true)
      }
    })
    test('recusa versão antiga, avanço fora de ordem e condições inválidas', () => {
      expect(e.applyAnswer({}, 'autonomia_conquista', 'comecar')).toBeNull()
      const { answers } = adultJourney(mode)
      expect(e.isComplete({ ...answers, _quiz_version: 'adulto-v1' })).toBe(false)
      expect(
        e.applyAnswer({ ...answers, _quiz_version: 'adulto-v1' }, 'autonomia_interesse', 'prazer'),
      ).toBeNull()
      for (const value of [[], ['nenhuma', 'tempo'], ['tempo', 'tempo'], ['inexistente'], 'apoio'])
        expect(e.applyAnswer(answers, 'autonomia_condicao', value)).toBeNull()
      expect(e.applyAnswer(answers, 'autonomia_condicao', ['ao_vivo', 'livre'])).not.toBeNull()
      const multiple = buildNarrative(
        mode,
        e.normalize(
          e.applyAnswer(answers, 'autonomia_condicao', ['ao_vivo', 'livre'])!,
        ) as CompleteAnswers,
      )
      expect(multiple.flags).toContain('ao_vivo')
      expect(multiple.flags).toContain('livre')
    })
    test('edição mantém respostas independentes e remove variantes incompatíveis', () => {
      const { answers } = adultJourney(mode)
      const simple = e.applyAnswer(answers, 'autonomia_interesse', 'prazer')!
      expect(e.isComplete(simple)).toBe(true)
      const next = e.applyAnswer(answers, 'autonomia_experiencia', 'nunca')!
      expect(e.isComplete(next)).toBe(false)
      expect(next.autonomia_computador).toBe('meu')
      expect(next.autonomia_condicao).toEqual(['apoio'])
      expect(next.autonomia_conquista).toBe('compreender')
      expect(next.autonomia_beneficio_compreender).toBe('capacidade')
      expect(next.autonomia_trava_experiente).toBeUndefined()
      expect(next.autonomia_ajuda_experiente).toBeUndefined()
      expect(next.autonomia_efeito_experiente).toBeUndefined()
      expect(next.autonomia_peso_experiente_adiado).toBeUndefined()
      expect(e.applyAnswer(next, 'autonomia_trava_experiente', 'testar')).toBeNull()
      const goal = e.applyAnswer(answers, 'autonomia_conquista', 'concluir')!
      expect(goal.autonomia_beneficio_compreender).toBeUndefined()
      expect(e.activeSteps(goal).at(-1)?.key).toBe('autonomia_beneficio_concluir')
    })
  })
