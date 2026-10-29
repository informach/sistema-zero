import { describe, expect, test } from 'bun:test'
import {
  executionRuleBudgetMs,
  isExecutionRule,
  isSectionExecutionRule,
  MAX_WALKABLE_RECTS,
  type SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { SZIRInputSchema } from '../../../packages/studio/src/ir/schema'
import { parseProjectFilesFromParts } from '../../../packages/studio/src/parsers/project'
import { ponteChecks } from './ponte-criterios'
import {
  montarProjetoPonte,
  PONTE_CAMINHOS_3D,
  PONTE_ETAPAS,
  PONTE_SEGUNDOS,
} from './ponte-projeto'

function types(v: unknown, found = new Set<string>()): Set<string> {
  if (!v || typeof v !== 'object') return found
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) found.add(v.type)
  for (const c of Object.values(v)) types(c, found)
  return found
}

describe('A ponte apressada', () => {
  for (const d of ['2d', '3d'] as const) {
    test(`${d}: todas as etapas e o roundtrip usam somente blocos do iniciante`, () => {
      for (const etapa of PONTE_ETAPAS) {
        const p = montarProjetoPonte(d, etapa)
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

    test(`${d}: a ponte sobe sozinha pelo "depois de segundos" dentro do encontro`, () => {
      const p = montarProjetoPonte(d, 'atravessar')
      expect(types(p.blocksState).has('sz_js_set_timeout_seconds')).toBe(true)
      expect(p.files['script.js']).toContain(`${PONTE_SEGUNDOS}`)
      expect(p.files['script.js']).toContain('ponteAberta')
    })

    test(`${d}: os objetivos de cada etapa são válidos e cabem no prazo da parte`, () => {
      for (const etapa of PONTE_ETAPAS) {
        const checks = ponteChecks(d, etapa)
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
            montarProjetoPonte(d, etapa),
          ).filter((c) => !c.passed),
          etapa,
        ).toEqual([])
      }
    })

    test(`${d}: a entrada não traz a alavanca nem o tempo resolvidos`, () => {
      const js = montarProjetoPonte(d).files['script.js']
      expect(js).not.toMatch(/ponteAberta|setTimeout/)
      const sobe = ponteChecks(d, 'sobe').filter((c) => !isExecutionRule(c.rule))
      expect(evaluateStudioSectionProject(sobe, montarProjetoPonte(d)).every((c) => c.passed)).toBe(
        false,
      )
    })
  }

  test('3d: o cenário e a pedra são sólidos, e o caminho do robô cabe no executor', () => {
    const js = montarProjetoPonte('3d', 'atravessar').files['script.js']
    expect(js).toContain('SZGame3D.setSolid(cenario)')
    expect(js).toContain('SZGame3D.setSolid(pedra)')
    expect(PONTE_CAMINHOS_3D.length).toBeLessThanOrEqual(MAX_WALKABLE_RECTS)
  })

  test('o farol continua pedindo só a chave', () => {
    for (const d of ['2d', '3d'] as const)
      expect(montarProjetoPonte(d, 'atravessar').files['script.js']).toContain('if (temChave) {')
  })
})

describe('quiz da Ponte', () => {
  test('as duas revisões são válidas, com previsões de uma só resposta certa', async () => {
    const { isManifestQuiz } = await import('../../../packages/core/src/learning/manifest-quiz')
    const { ponteQuiz2d, ponteQuiz3d } = await import('./ponte-quiz')
    expect(isManifestQuiz(ponteQuiz2d)).toBe(true)
    expect(isManifestQuiz(ponteQuiz3d)).toBe(true)
    expect(ponteQuiz2d.questions).toHaveLength(4)
    expect(ponteQuiz3d.questions).toHaveLength(2)
    // A certa não fica sempre no mesmo lugar.
    const certas = [...ponteQuiz2d.questions, ...ponteQuiz3d.questions].map(
      (q) => q.correctChoiceIds[0],
    )
    expect(new Set(certas).size).toBeGreaterThan(1)
  })

  test('as cenas 2D do quiz saem do motor da experiência', async () => {
    const { ponteQuizState } = await import(
      '../../../packages/member-shell/src/components/quiz-ponte-scene'
    )
    const aTempo = ponteQuizState('ponte-a-tempo', true)
    expect(aTempo.bridge).toMatchObject({ ponteAberta: true, at: 'stone' })
    expect(ponteQuizState('ponte-a-tempo', false).bridge.at).toBe('lever')
    const atrasado = ponteQuizState('ponte-atrasado', true)
    expect(atrasado.bridge).toMatchObject({ ponteAberta: false, at: 'bridge' })
    // Antes do teste, a cena não conta a resposta: a ponte acabou de baixar.
    expect(ponteQuizState('ponte-atrasado', false).bridge).toMatchObject({
      ponteAberta: true,
      sincePull: 0,
    })
  })
})

describe('manifestos da Ponte', () => {
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
            `../../aulas-interativas/faisca/poder-a-ponte-apressada/ponte-aula-${i + 1}.manifesto.json`,
          ),
          'utf8',
        ),
      )
      expect(isLearningManifest(m)).toBe(true)
      expect(m.courseSlug).toBe('jornada-faisca-poder-3')
      expect(m.lessonSlug).toBe(`aula-${i + 1}`)
      expect(m.sections.map((s: { key: string }) => s.key)).toEqual(
        d === '2d'
          ? [
              'abertura',
              'material',
              'experiencia',
              'alavanca',
              'sobe',
              'atravessar',
              'revisao',
              'entrega',
            ]
          : ['abertura', 'alavanca', 'atravessar', 'revisao', 'entrega'],
      )
      expect(m.sections.filter((s: any) => s.completion.submissionUpToDate)).toHaveLength(1)
      const studio = m.blocks.filter((b: any) => b.content?.kind === 'studio')
      expect(studio).toHaveLength(1)
      expect(studio[0].content.chain).toBe(`jornada-faisca-poder-3-${d}`)
      expect(studio[0].content.allowBlocks).toContain('sz_js_set_timeout_seconds')
      expect(readManifestStudioProjectExamples(studio[0].content.projectExamples).kind).toBe(
        'valid',
      )
      const cenas = m.blocks.filter((b: any) => b.content?.activity?.type === 'experimentation')
      expect(cenas.map((b: any) => b.content.activity.scene)).toEqual(
        d === '2d' ? ['timed-bridge'] : [],
      )
      expect(m.blocks.filter((b: any) => b.content?.kind === 'materials')).toHaveLength(
        d === '2d' ? 1 : 0,
      )
      expect(m.blocks.filter((b: any) => b.content?.kind === 'certificate')).toHaveLength(0)
      // A alavanca não cobra a subida ainda não pedida, e a subida não cobra a travessia.
      const ids = (key: string) =>
        m.sections.find((s: any) => s.key === key)?.completion.projectChecks.map((c: any) => c.id)
      if (d === '2d') {
        expect(ids('alavanca')).not.toContain('sobe-sozinha')
        expect(ids('sobe')).not.toContain('a-tempo')
      } else expect(ids('alavanca')).not.toContain('a-tempo')
    })
})
