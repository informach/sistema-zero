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
import { moedasChecks } from './moedas-criterios'
import { MOEDAS_ETAPAS, montarProjetoMoedas } from './moedas-projeto'

function types(v: unknown, found = new Set<string>()): Set<string> {
  if (!v || typeof v !== 'object') return found
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) found.add(v.type)
  for (const c of Object.values(v)) types(c, found)
  return found
}

describe('Moedas no caminho', () => {
  for (const d of ['2d', '3d'] as const) {
    test(`${d}: todas as etapas e o roundtrip usam somente blocos do iniciante`, () => {
      for (const etapa of MOEDAS_ETAPAS) {
        const p = montarProjetoMoedas(d, etapa)
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

    test(`${d}: os objetivos de cada etapa são válidos e cabem no prazo da parte`, () => {
      for (const etapa of MOEDAS_ETAPAS) {
        const checks = moedasChecks(d, etapa)
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
            montarProjetoMoedas(d, etapa),
          ).filter((c) => !c.passed),
          etapa,
        ).toEqual([])
      }
    })

    test(`${d}: a entrada não traz contador, coleta, número na tela nem baú resolvidos`, () => {
      const js = montarProjetoMoedas(d).files['script.js']
      expect(js).not.toMatch(
        /let moedas|onTouchGroup|drawScore|hudText\("top-left"|abrir|bau-aberto/,
      )
      // O que a equipe prepara: as seis moedas no grupo, o baú e o desenho (2D) ou o giro (3D).
      expect(js).toContain('moedasDoCaminho')
      expect(
        js.match(d === '2d' ? /SZGame2D\.spawn\(moedasDoCaminho/g : /SZGame3D\.spawnCopy\(/g),
      ).toHaveLength(6)
      const placar = moedasChecks(d, 'placar').filter((c) => !isExecutionRule(c.rule))
      expect(
        evaluateStudioSectionProject(placar, montarProjetoMoedas(d, 'coleta'))[0]?.passed,
      ).toBe(false)
    })
  }

  test('2D: a coleta usa o evento novo do grupo, e o baú, o "pelo menos"', () => {
    const js = montarProjetoMoedas('2d', 'bau').files['script.js']
    expect(js).toContain(
      'SZGame2D.onTouchGroup(() => personagem, () => moedasDoCaminho, (moeda) =>',
    )
    expect(js).toContain('SZGame2D.removeFromGroup(moedasDoCaminho, moeda);')
    expect(js).toContain('moedas >= 5')
    expect(js).toContain('SZGame2D.onKey("r"')
  })
})

describe('quiz das Moedas', () => {
  test('as duas revisões são válidas, com previsões de uma só resposta certa', async () => {
    const { isManifestQuiz } = await import('../../../packages/core/src/learning/manifest-quiz')
    const { moedasQuiz2d, moedasQuiz3d } = await import('./moedas-quiz')
    expect(isManifestQuiz(moedasQuiz2d)).toBe(true)
    expect(isManifestQuiz(moedasQuiz3d)).toBe(true)
    expect(moedasQuiz2d.questions).toHaveLength(4)
    expect(moedasQuiz3d.questions).toHaveLength(2)
    // A certa não fica sempre no mesmo lugar.
    const certas = [...moedasQuiz2d.questions, ...moedasQuiz3d.questions].map(
      (q) => q.correctChoiceIds[0],
    )
    expect(new Set(certas).size).toBeGreaterThan(1)
  })

  test('as cenas 2D do quiz saem do motor da experiência', async () => {
    const { moedasQuizState } = await import(
      '../../../packages/member-shell/src/components/quiz-moedas-scene'
    )
    const poucas = moedasQuizState('moedas-poucas', true)
    expect(poucas.coins.moedas).toBe(4)
    expect(poucas.coins.chest).toBe('closed')
    expect(poucas.coins.at).toBe('chest')
    const igual = moedasQuizState('moedas-igual', true)
    expect(igual.coins.moedas).toBe(6)
    expect(igual.coins.chest).toBe('closed')
    expect(moedasQuizState('moedas-igual', true, true).coins.chest).toBe('open')
    expect(moedasQuizState('moedas-igual', false).coins.at).toBeNull()
  })
})

describe('manifestos das Moedas', () => {
  for (const [i, d] of (['2d', '3d'] as const).entries())
    test(`${d}: aula reservada, projeto contínuo, experiência só no 2D e uma entrega`, async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const { isLearningManifest } = await import('../../../packages/core/src/learning')
      const { readManifestStudioProjectExamples } = await import(
        '../../../packages/core/src/learning/studio-project-examples'
      )
      const m = JSON.parse(
        readFileSync(
          resolve(
            import.meta.dirname,
            `../../aulas-interativas/faisca/poder-moedas-no-caminho/moedas-aula-${i + 1}.manifesto.json`,
          ),
          'utf8',
        ),
      )
      expect(isLearningManifest(m)).toBe(true)
      expect(m.courseSlug).toBe('jornada-faisca-poder-1')
      expect(m.lessonSlug).toBe(`aula-${i + 1}`)
      expect(m.sections.map((s: { key: string }) => s.key)).toEqual(
        d === '2d'
          ? [
              'abertura',
              'material',
              'experiencia',
              'contador',
              'coleta',
              'placar',
              'bau',
              'revisao',
              'entrega',
            ]
          : ['abertura', 'coleta', 'placar', 'bau', 'revisao', 'entrega'],
      )
      expect(m.sections.filter((s: any) => s.completion.submissionUpToDate)).toHaveLength(1)
      const studio = m.blocks.filter((b: any) => b.content?.kind === 'studio')
      expect(studio).toHaveLength(1)
      expect(studio[0].content.chain).toBe(`jornada-faisca-poder-1-${d}`)
      expect(readManifestStudioProjectExamples(studio[0].content.projectExamples).kind).toBe(
        'valid',
      )
      const cenas = m.blocks.filter((b: any) => b.content?.activity?.type === 'experimentation')
      expect(cenas.map((b: any) => b.content.activity.scene)).toEqual(
        d === '2d' ? ['coin-counter'] : [],
      )
      expect(m.blocks.filter((b: any) => b.content?.kind === 'materials')).toHaveLength(
        d === '2d' ? 1 : 0,
      )
      expect(m.blocks.filter((b: any) => b.content?.kind === 'certificate')).toHaveLength(0)
      // A coleta não cobra o baú ainda não pedido.
      const coleta = m.sections.find((s: any) => s.key === 'coleta')
      expect(coleta.completion.projectChecks.map((c: any) => c.id)).not.toContain('meta')
    })
})
