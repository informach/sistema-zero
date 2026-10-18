import { describe, expect, test } from 'bun:test'
import type { SectionProjectCheck } from '@sistemazero/core/learning'
import { testSectionObjectives } from '../src/lib/objectives-test'

const laco: SectionProjectCheck = { id: 'laco', label: 'Use um laço', rule: { type: 'usesLoop' } }
const extra: SectionProjectCheck = {
  id: 'pular',
  label: 'Crie a função pular',
  rule: { type: 'definesFunction', name: 'pular' },
  optional: true,
}
const vazio = { ir: { js: [] } }
const comLaco = { ir: { js: [{ type: 'repeat', times: 3, body: [] }] } }

describe('Testar agora: os objetivos contra o projeto inicial e o gabarito', () => {
  test('inicial que falta e gabarito que cumpre: nenhum problema', () => {
    const report = testSectionObjectives([laco], {
      initialProject: vazio,
      solutionProject: comLaco,
    })
    expect(report.rows).toEqual([
      { id: 'laco', label: 'Use um laço', optional: false, initial: false, solution: true },
    ])
    expect(report.problems).toEqual([])
    expect(report.notes).toEqual([])
  })

  test('gabarito que não cumpre um obrigatório é problema (a publicação recusa)', () => {
    const report = testSectionObjectives([laco], { initialProject: vazio, solutionProject: vazio })
    expect(report.problems.join(' ')).toContain('O gabarito não cumpre "Use um laço"')
  })

  test('projeto inicial que já cumpre um obrigatório é problema', () => {
    const report = testSectionObjectives([laco], {
      initialProject: comLaco,
      solutionProject: comLaco,
    })
    expect(report.problems.join(' ')).toContain('já cumpre "Use um laço"')
  })

  test('desafio extra só avisa, nunca é problema', () => {
    const report = testSectionObjectives([laco, extra], {
      initialProject: vazio,
      solutionProject: comLaco,
    })
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).toContain('desafio extra "Crie a função pular"')
  })

  test('sem gabarito, avisa e só confere o inicial', () => {
    const report = testSectionObjectives([laco], { initialProject: vazio })
    expect(report.rows[0]?.solution).toBeNull()
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).toContain('Sem gabarito')
  })

  test('todos extras: avisa que a parte não exige nada', () => {
    const report = testSectionObjectives([extra], { initialProject: vazio })
    expect(report.notes.join(' ')).toContain('Todos os objetivos são desafios extras')
  })

  test('objetivo sem nome aparece numerado', () => {
    const report = testSectionObjectives([{ ...laco, label: '  ' }], { initialProject: vazio })
    expect(report.rows[0]?.label).toBe('Objetivo 1')
  })

  test('uma análise limitada é inconclusiva na autoria, sem reprovação nem quebra da tela', () => {
    const report = testSectionObjectives([laco], {
      initialProject: { kind: 'pro', tree: {} },
      solutionProject: {
        kind: 'pro',
        tree: { 'main.js': { kind: 'file', content: 'while (true) break;'.padEnd(500_001) } },
      },
    })
    expect(report.rows[0]?.solution).toBe('error')
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).toContain('inconclusiva')
  })
})
