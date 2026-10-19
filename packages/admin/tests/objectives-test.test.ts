import { describe, expect, test } from 'bun:test'
import type { SectionJavaScriptProjectCheck } from '@sistemazero/core/learning'
import { testSectionObjectives } from '../src/lib/objectives-test'
import {
  objectiveProject,
  objectiveSectionId,
  objectiveWorkspace,
} from './fixtures/section-objective-examples'

const laco: SectionJavaScriptProjectCheck = {
  id: 'laco',
  label: 'Use um laço',
  rule: { type: 'usesLoop' },
}
const extra: SectionJavaScriptProjectCheck = {
  id: 'pular',
  label: 'Crie a função pular',
  rule: { type: 'definesFunction', name: 'pular' },
  optional: true,
}
const vazio = objectiveProject()
const comLaco = objectiveProject({ ir: { js: [{ type: 'repeat', times: 3, body: [] }] } })
const testPart = (checks: SectionJavaScriptProjectCheck[], initial: unknown, solution?: unknown) =>
  testSectionObjectives(checks, objectiveWorkspace(initial, solution), {}, objectiveSectionId)

describe('Testar agora: os objetivos contra o projeto inicial e o gabarito', () => {
  test('inicial que falta e gabarito que cumpre: nenhum problema', () => {
    const report = testPart([laco], vazio, comLaco)
    expect(report.rows).toEqual([
      {
        id: 'laco',
        label: 'Use um laço',
        optional: false,
        initial: false,
        checkpoint: null,
        solution: true,
      },
    ])
    expect(report.problems).toEqual([])
    expect(report.notes).toEqual([])
  })

  test('gabarito que não cumpre um obrigatório é problema (a publicação recusa)', () => {
    const report = testPart([laco], vazio, vazio)
    expect(report.problems.join(' ')).toContain('O gabarito não cumpre "Use um laço"')
  })

  test('repetição já presente na IR produz aviso agregado, sem reprovar o inicial', () => {
    const report = testPart([laco], comLaco, comLaco)
    expect(report.rows[0]?.initial).toBe(true)
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).toContain('já cumpre todos os objetivos obrigatórios do projeto')
  })

  test('desafio extra só avisa, nunca é problema', () => {
    const report = testPart([laco, extra], vazio, comLaco)
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).toContain('desafio extra "Crie a função pular"')
  })

  test('sem gabarito, avisa e só confere o inicial', () => {
    const report = testPart([laco], vazio)
    expect(report.rows[0]?.solution).toBeNull()
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).toContain('Sem gabarito')
  })

  test('todos extras: avisa que a parte não exige nada', () => {
    const report = testPart([extra], vazio)
    expect(report.notes.join(' ')).toContain('Todos os objetivos são desafios extras')
  })

  test('objetivo sem nome aparece numerado', () => {
    const report = testPart([{ ...laco, label: '  ' }], vazio)
    expect(report.rows[0]?.label).toBe('Objetivo 1')
  })

  test('uma análise limitada é inconclusiva na autoria, sem reprovação nem quebra da tela', () => {
    const report = testPart(
      [laco],
      objectiveProject({ kind: 'pro', tree: {}, proMeta: { templateId: 'canvas-survival' } }),
      objectiveProject({
        kind: 'pro',
        proMeta: { templateId: 'canvas-survival' },
        tree: { 'main.js': { kind: 'file', content: 'while (true) break;'.padEnd(500_001) } },
      }),
    )
    expect(report.rows[0]?.solution).toBe('inconclusive')
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).toContain('inconclusiva')
  })
})
