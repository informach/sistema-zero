import { describe, expect, test } from 'bun:test'
import {
  evaluateSectionObjectives,
  isSectionCompletion,
  type LessonSection,
  PROJECT_CHECK_HINT_MAX,
  projectObjectiveView,
  requiredProjectChecks,
  type SectionCompletion,
  sectionCompletionIssues,
  sectionCompletionView,
  sectionProgressView,
} from '../src/learning'

const laco = { type: 'usesLoop' as const }
const bloco = {
  type: 'usesBlock' as const,
  blockType: 'sz_g2d_set_opacity',
  area: 'events' as const,
}

describe('objetivos da parte: o modelo', () => {
  test('dica e extra são opcionais e validados', () => {
    const base = { version: 1 as const, blockIds: [] }
    expect(
      isSectionCompletion({
        ...base,
        projectChecks: [
          { id: 'a', label: 'Use um laço', rule: laco, hint: 'Procure em Laços', optional: true },
        ],
      }),
    ).toBe(true)
    expect(
      isSectionCompletion({
        ...base,
        projectChecks: [
          { id: 'a', label: 'x', rule: laco, hint: 'x'.repeat(PROJECT_CHECK_HINT_MAX + 1) },
        ],
      }),
    ).toBe(false)
    expect(
      isSectionCompletion({
        ...base,
        projectChecks: [{ id: 'a', label: 'x', rule: laco, optional: false }],
      }),
    ).toBe(false)
  })

  test('a criança recebe a vista: nunca a regra', () => {
    const completion: SectionCompletion = {
      version: 1,
      blockIds: ['video'],
      submissionUpToDate: true,
      projectChecks: [
        { id: 'a', label: 'Deixe o esconderijo invisível', rule: bloco, hint: 'Troque 50 por 0' },
        { id: 'b', label: 'Use um laço', rule: laco, optional: true },
      ],
    }
    const view = sectionCompletionView(completion)
    expect(view).toEqual({
      version: 1,
      blockIds: ['video'],
      submissionUpToDate: true,
      projectChecks: [
        { id: 'a', label: 'Deixe o esconderijo invisível', hint: 'Troque 50 por 0', kind: 'block' },
        { id: 'b', label: 'Use um laço', optional: true, kind: 'idea' },
      ],
    })
    expect(JSON.stringify(view)).not.toContain('sz_g2d_set_opacity')
    expect(projectObjectiveView({ id: 'c', label: 'x', rule: laco })).toEqual({
      id: 'c',
      label: 'x',
      kind: 'idea',
    })
  })

  test('só os obrigatórios trancam', () => {
    expect(
      requiredProjectChecks([{ id: 'a', optional: true }, { id: 'b' }]).map((c) => c.id),
    ).toEqual(['b'])
  })
})

describe('objetivos da parte: a verificação', () => {
  const projeto = {
    ir: {
      version: 2,
      behavior: { molds: [], start: [{ type: 'repeat', body: [] }], events: [], loops: [] },
    },
    blocksState: null,
  }

  test('a parte passa com os obrigatórios, e o extra que falta não tranca', () => {
    const result = evaluateSectionObjectives(
      [
        { id: 'laco', rule: laco },
        { id: 'func', rule: { type: 'definesFunction', name: 'pular' }, optional: true },
      ],
      projeto,
    )
    expect(result).toEqual({
      results: [
        { checkId: 'laco', passed: true, optional: false },
        { checkId: 'func', passed: false, optional: true },
      ],
      passed: true,
    })
  })

  test('obrigatório que falta reprova; parte só com extras nunca passa', () => {
    expect(
      evaluateSectionObjectives(
        [{ id: 'func', rule: { type: 'definesFunction', name: 'pular' } }],
        projeto,
      ).passed,
    ).toBe(false)
    expect(
      evaluateSectionObjectives([{ id: 'laco', rule: laco, optional: true }], projeto).passed,
    ).toBe(false)
  })
})

describe('objetivos da parte: a publicação', () => {
  const section = (completion: SectionCompletion): LessonSection =>
    ({
      id: 's1',
      title: 'Monte',
      objective: '',
      intent: 'build',
      blockIds: ['studio'],
      workspaceBlockId: 'studio',
      externalTool: null,
      completion,
    }) as unknown as LessonSection
  const blocks = [
    { id: 'studio', content: { kind: 'studio', purpose: 'experiment', initialProject: {} } },
  ]

  test('parte só com extras não tem critério', () => {
    const issues = sectionCompletionIssues(
      [
        section({
          version: 1,
          blockIds: [],
          projectChecks: [{ id: 'a', label: 'Use um laço', rule: laco, optional: true }],
        }),
      ],
      blocks,
    ).map((i) => i.message)
    expect(issues).toContain(
      'Objetivos extras não trancam a parte. Marque ao menos um objetivo como obrigatório ou escolha outro critério.',
    )
  })

  test('com um obrigatório, o critério existe', () => {
    const issues = sectionCompletionIssues(
      [
        section({
          version: 1,
          blockIds: [],
          projectChecks: [{ id: 'a', label: 'Use um laço', rule: laco }],
        }),
      ],
      blocks,
    ).map((i) => i.message)
    expect(issues).not.toContain('Esta seção precisa de uma checagem ou objetivo verificável.')
    expect(issues.some((m) => m.startsWith('Objetivos extras'))).toBe(false)
  })
})

describe('objetivos da parte: a memória do resultado', () => {
  test('o progresso devolve o último resultado de cada objetivo, menos na parte trancada', () => {
    const view = sectionProgressView(
      'rev',
      [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
      ],
      new Set(['a']),
      new Map(),
      {
        objectiveResults: new Map([
          ['a', [{ id: 'o1', passed: true }]],
          ['b', [{ id: 'o2', passed: false }]],
        ]),
      },
    )
    expect(view.sections[0]?.objectives).toEqual([{ id: 'o1', passed: true }])
    expect(view.sections[1]?.status).toBe('available')
    expect(view.sections[1]?.objectives).toEqual([{ id: 'o2', passed: false }])
    const trancada = sectionProgressView(
      'rev',
      [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
      ],
      new Set(),
      new Map(),
      { objectiveResults: new Map([['b', [{ id: 'o2', passed: false }]]]) },
    )
    expect(trancada.sections[1]?.status).toBe('locked')
    expect(trancada.sections[1]?.objectives).toBeUndefined()
  })
})
