import { describe, expect, it } from 'bun:test'
import type { ClientCheckResult, LessonActivity } from '../../src/domain/course/studio-activity'
import {
  evaluateStructureRule,
  gradeStudioActivity,
  validateStudioActivityAuthoring,
} from '../../src/domain/course/studio-activity'

const project = (js: unknown[], blocksState: unknown = null) => ({ ir: { js }, blocksState })

describe('evaluateStructureRule (recálculo no servidor)', () => {
  it('usesLoop anda o ir.js submetido (inclusive aninhado)', () => {
    expect(evaluateStructureRule({ type: 'usesLoop' }, project([{ type: 'repeat' }]))).toBe(true)
    expect(
      evaluateStructureRule(
        { type: 'usesLoop' },
        project([{ type: 'funcDecl', name: 'f', body: [{ type: 'forRange', body: [] }] }]),
      ),
    ).toBe(true)
    expect(evaluateStructureRule({ type: 'usesLoop' }, project([{ type: 'consoleLog' }]))).toBe(
      false,
    )
  })

  it('declaresVariable / definesFunction / callsFunction casam por nome', () => {
    const p = project([
      { type: 'var', name: 'pontos' },
      { type: 'funcDecl', name: 'somar', body: [] },
      { type: 'callFunction', name: 'somar', args: [] },
    ])
    expect(evaluateStructureRule({ type: 'declaresVariable', name: 'pontos' }, p)).toBe(true)
    expect(evaluateStructureRule({ type: 'definesFunction', name: 'somar' }, p)).toBe(true)
    expect(evaluateStructureRule({ type: 'callsFunction', name: 'somar' }, p)).toBe(true)
    expect(evaluateStructureRule({ type: 'callsFunction', name: 'nope' }, p)).toBe(false)
  })

  it('usesBlock anda o blocksState', () => {
    const p = project([], { blocks: { blocks: [{ type: 'controls_repeat' }] } })
    expect(evaluateStructureRule({ type: 'usesBlock', blockType: 'controls_repeat' }, p)).toBe(true)
    expect(evaluateStructureRule({ type: 'usesBlock', blockType: 'math_number' }, p)).toBe(false)
  })

  it('projeto sem ir → nega sem quebrar', () => {
    expect(evaluateStructureRule({ type: 'usesLoop' }, {})).toBe(false)
    expect(evaluateStructureRule({ type: 'usesLoop' }, null)).toBe(false)
  })
})

describe('gradeStudioActivity (híbrido)', () => {
  const activity: LessonActivity = {
    instructions: '',
    checks: [
      { id: 's', label: 'usa laço', kind: 'structure', rule: { type: 'usesLoop' } },
      {
        id: 'b',
        label: 'loga oi',
        kind: 'behavior',
        rule: { type: 'consoleContains', text: 'oi' },
      },
    ],
    passingScore: 100,
  }

  it('RECALCULA structure no servidor — ignora o que o cliente reporta nela', () => {
    // cliente MENTE que a structure passou; servidor anda o IR (sem laço) e reprova.
    const client: ClientCheckResult[] = [
      { checkId: 's', passed: true },
      { checkId: 'b', passed: true },
    ]
    const grade = gradeStudioActivity(activity, project([{ type: 'consoleLog' }]), client)
    const s = grade.results.find((r) => r.checkId === 's')
    expect(s?.passed).toBe(false) // servidor venceu
    expect(s?.verifiedBy).toBe('server')
    expect(grade.score).toBe(50)
    expect(grade.passed).toBe(false)
  })

  it('registra o reportado pelo cliente p/ behavior (verifiedBy client) e aprova ao atingir', () => {
    const client: ClientCheckResult[] = [
      { checkId: 's', passed: false },
      { checkId: 'b', passed: true },
    ]
    const grade = gradeStudioActivity(activity, project([{ type: 'repeat' }]), client)
    const b = grade.results.find((r) => r.checkId === 'b')
    expect(b?.passed).toBe(true)
    expect(b?.verifiedBy).toBe('client')
    expect(grade.score).toBe(100)
    expect(grade.passed).toBe(true)
  })

  it('checagem não-structure sem resultado reportado → falha', () => {
    const grade = gradeStudioActivity(activity, project([{ type: 'repeat' }]), [])
    expect(grade.results.find((r) => r.checkId === 'b')?.passed).toBe(false)
    expect(grade.score).toBe(50)
  })

  it('formativa (sem passingScore) → passed true', () => {
    const formative: LessonActivity = { instructions: '', checks: activity.checks }
    const grade = gradeStudioActivity(formative, project([{ type: 'consoleLog' }]), [])
    expect(grade.passed).toBe(true)
  })
})

describe('validateStudioActivityAuthoring', () => {
  const base = (checks: LessonActivity['checks'], passingScore?: number): LessonActivity => ({
    instructions: '',
    checks,
    passingScore,
  })

  it('aceita atividade coerente', () => {
    expect(
      validateStudioActivityAuthoring(
        base([{ id: 'a', label: 'x', kind: 'structure', rule: { type: 'usesLoop' } }], 100),
      ),
    ).toBeNull()
  })

  it('nota de corte sem checagem → erro', () => {
    expect(validateStudioActivityAuthoring(base([], 100))).toContain('checagem')
  })

  it('nota de corte só com checagens client-trusted (sem structure) → erro', () => {
    // behavior/testcase/code são reportados pelo cliente e burláveis; um gate sem
    // structure (recalculada no servidor) seria trivialmente forjável.
    expect(
      validateStudioActivityAuthoring(
        base(
          [
            {
              id: 'b',
              label: 'x',
              kind: 'behavior',
              rule: { type: 'consoleContains', text: 'oi' },
            },
          ],
          100,
        ),
      ),
    ).toContain('estrutura')
  })

  it('atividade FORMATIVA (sem nota de corte) aceita só checagens client-trusted', () => {
    expect(
      validateStudioActivityAuthoring(
        base([
          { id: 'b', label: 'x', kind: 'behavior', rule: { type: 'consoleContains', text: 'oi' } },
        ]),
      ),
    ).toBeNull()
  })

  it('id duplicado → erro', () => {
    expect(
      validateStudioActivityAuthoring(
        base([
          { id: 'a', label: 'x', kind: 'structure', rule: { type: 'usesLoop' } },
          { id: 'a', label: 'y', kind: 'structure', rule: { type: 'usesLoop' } },
        ]),
      ),
    ).toContain('duplicado')
  })

  it('code sem source / testcase sem casos / structure sem nome → erro', () => {
    expect(
      validateStudioActivityAuthoring(base([{ id: 'c', label: 'x', kind: 'code', source: '  ' }])),
    ).toContain('asserção')
    expect(
      validateStudioActivityAuthoring(
        base([{ id: 't', label: 'x', kind: 'testcase', functionName: 'f', cases: [] }]),
      ),
    ).toContain('caso')
    expect(
      validateStudioActivityAuthoring(
        base([
          { id: 'v', label: 'x', kind: 'structure', rule: { type: 'declaresVariable', name: '' } },
        ]),
      ),
    ).toContain('nome')
  })
})
