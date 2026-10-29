import { describe, expect, test } from 'bun:test'
import {
  executionRuleBudgetMs,
  isExecutionRule,
  isSectionExecutionRule,
  type SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { SZIRInputSchema } from '../../../packages/studio/src/ir/schema'
import { parseProjectFilesFromParts } from '../../../packages/studio/src/parsers/project'
import { cabanaChecks } from './cabana-criterios'
import { CABANA_ETAPAS, montarProjetoCabana } from './cabana-projeto'

function types(v: unknown, found = new Set<string>()): Set<string> {
  if (!v || typeof v !== 'object') return found
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) found.add(v.type)
  for (const c of Object.values(v)) types(c, found)
  return found
}

describe('O segredo da cabana', () => {
  for (const d of ['2d', '3d'] as const) {
    test(`${d}: todas as etapas e o roundtrip usam somente blocos do iniciante`, () => {
      for (const etapa of CABANA_ETAPAS) {
        const p = montarProjetoCabana(d, etapa)
        expect(SZIRInputSchema.safeParse(p.ir).success, etapa).toBe(true)
        expect(p.ir!.html).toEqual([])
        expect(p.ir!.css).toEqual([])
        expect(p.files['script.js']).not.toContain('rawJS')
        for (const state of [
          p.blocksState,
          buildWorkspaceStateFromIR(
            parseProjectFilesFromParts({
              html: [],
              cssSource: p.files['style.css'],
              jsSource: p.files['script.js'],
            }).ir,
          ),
        ])
          for (const type of types(state)) {
            expect(resolveBlockLevel(type).startsWith('iniciante-'), `${d}/${etapa}/${type}`).toBe(
              true,
            )
            expect(type).not.toMatch(/^sz_(html|css|canvas|adv|js_raw|js_object|js_array)/)
          }
      }
    })

    test(`${d}: a pergunta da cabana usa o bloco "e" do iniciante`, () => {
      const p = montarProjetoCabana(d, 'porta')
      expect(types(p.blocksState).has('sz_val_logic')).toBe(true)
      expect(p.files['script.js']).toContain('if (temChave && temEmblema)')
    })

    test(`${d}: os objetivos de cada etapa são válidos e cabem no prazo da parte`, () => {
      for (const etapa of CABANA_ETAPAS) {
        const checks = cabanaChecks(d, etapa)
        if (etapa === 'inicio') {
          expect(checks).toEqual([])
          continue
        }
        expect(
          isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks }),
          etapa,
        ).toBe(true)
        const exec = checks.filter((c) => isExecutionRule(c.rule))
        for (const c of exec) expect(isSectionExecutionRule(c.rule), `${etapa}/${c.id}`).toBe(true)
        const total = exec.reduce(
          (s, c) => s + executionRuleBudgetMs(c.rule as SectionExecutionRule),
          0,
        )
        expect(total, etapa).toBeLessThanOrEqual(40_000)
        // O projeto da própria etapa cumpre os objetivos de bloco dela.
        expect(
          evaluateStudioSectionProject(
            checks.filter((c) => !isExecutionRule(c.rule)),
            montarProjetoCabana(d, etapa),
          ).filter((c) => !c.passed),
          etapa,
        ).toEqual([])
      }
    })

    test(`${d}: a entrada não traz a variável, a coleta nem a pergunta resolvidas`, () => {
      const js = montarProjetoCabana(d).files['script.js']
      expect(js).not.toMatch(
        /temEmblema|cabana-aberta|"abrir"|destroySprite\(emblema|"hide"\);\s*temEmblema/,
      )
      // O que a equipe prepara: o emblema e a cabana fechada, no lugar.
      expect(js).toContain(d === '2d' ? 'image: "cabana-fechada"' : '"cabana-do-faroleiro"')
      expect(js).toContain(d === '2d' ? 'image: "emblema"' : '"emblema-do-farol"')
      const recolher = cabanaChecks(d, 'emblema').filter((c) => !isExecutionRule(c.rule))
      expect(evaluateStudioSectionProject(recolher, montarProjetoCabana(d))[0]?.passed).toBe(false)
    })
  }

  test('o farol continua pedindo só a chave', () => {
    for (const d of ['2d', '3d'] as const) {
      const js = montarProjetoCabana(d, 'porta').files['script.js']
      expect(js).toContain('if (temChave) {')
    }
  })
})

describe('quiz da Cabana', () => {
  test('as duas revisões são válidas, com previsões de uma só resposta certa', async () => {
    const { isManifestQuiz } = await import('../../../packages/core/src/learning/manifest-quiz')
    const { cabanaQuiz2d, cabanaQuiz3d } = await import('./cabana-quiz')
    expect(isManifestQuiz(cabanaQuiz2d)).toBe(true)
    expect(isManifestQuiz(cabanaQuiz3d)).toBe(true)
    expect(cabanaQuiz2d.questions).toHaveLength(4)
    expect(cabanaQuiz3d.questions).toHaveLength(2)
    // A certa não fica sempre no mesmo lugar.
    const certas = [...cabanaQuiz2d.questions, ...cabanaQuiz3d.questions].map(
      (q) => q.correctChoiceIds[0],
    )
    expect(new Set(certas).size).toBeGreaterThan(1)
  })

  test('as cenas 2D do quiz saem do motor da experiência', async () => {
    const { cabanaQuizState } = await import(
      '../../../packages/member-shell/src/components/quiz-cabana-scene'
    )
    const soChave = cabanaQuizState('cabana-so-chave', true)
    expect(soChave.pieces).toMatchObject({ temChave: true, temEmblema: false, door: 'closed' })
    expect(soChave.pieces.at).toBe('door')
    const ou = cabanaQuizState('cabana-ou', true)
    expect(ou.pieces).toMatchObject({ rule: 'or', temEmblema: true, door: 'open' })
    expect(cabanaQuizState('cabana-ou', false).pieces.at).toBe('emblem')
  })
})
