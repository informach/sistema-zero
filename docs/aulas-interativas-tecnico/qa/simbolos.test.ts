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
import { ILHA_CAMINHOS } from './ilha-do-farol-observacao'
import { simbolosChecks } from './simbolos-criterios'
import {
  montarProjetoSimbolos,
  PEDRAS_2D,
  PEDRAS_3D,
  SIMBOLOS,
  SIMBOLOS_ETAPAS,
} from './simbolos-projeto'

function types(v: unknown, found = new Set<string>()): Set<string> {
  if (!v || typeof v !== 'object') return found
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) found.add(v.type)
  for (const c of Object.values(v)) types(c, found)
  return found
}

describe('O baú dos símbolos', () => {
  for (const d of ['2d', '3d'] as const) {
    test(`${d}: todas as etapas e o roundtrip usam somente blocos do iniciante`, () => {
      for (const etapa of SIMBOLOS_ETAPAS) {
        const p = montarProjetoSimbolos(d, etapa)
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

    test(`${d}: a ordem é lembrada por passo e conferida com o "=" de Programação`, () => {
      const p = montarProjetoSimbolos(d, 'estrela')
      expect(types(p.blocksState).has('sz_val_compare')).toBe(true)
      expect(types(p.blocksState).has('sz_js_if_else')).toBe(true)
      expect(p.files['script.js']).toContain('passo === 1')
      expect(p.files['script.js']).toContain('passo === 2')
    })

    test(`${d}: os objetivos de cada etapa são válidos e cabem no prazo da parte`, () => {
      for (const etapa of SIMBOLOS_ETAPAS) {
        const checks = simbolosChecks(d, etapa)
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
            montarProjetoSimbolos(d, etapa),
          ).filter((c) => !c.passed),
          etapa,
        ).toEqual([])
      }
    })

    test(`${d}: a entrada não traz o passo nem as perguntas resolvidas`, () => {
      const js = montarProjetoSimbolos(d).files['script.js']
      expect(js).not.toMatch(/\bpasso\b/)
      const lua = simbolosChecks(d, 'lua').filter((c) => !isExecutionRule(c.rule))
      expect(
        evaluateStudioSectionProject(lua, montarProjetoSimbolos(d)).every((c) => c.passed),
      ).toBe(false)
    })
  }

  test('2d: entre duas pedras cabe o corpo do personagem (30 px) com folga', () => {
    const [sol, lua, estrela] = SIMBOLOS.map((s) => PEDRAS_2D[s])
    expect(lua.x - (sol.x + sol.w)).toBeGreaterThanOrEqual(30)
    expect(estrela.x - (lua.x + lua.w)).toBeGreaterThanOrEqual(30)
  })

  test('3d: as pedras ficam no chão de andar, com a lua um passo à frente', () => {
    const noChao = (x: number, z: number) =>
      ILHA_CAMINHOS.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ)
    for (const s of SIMBOLOS) expect(noChao(...PEDRAS_3D[s]), s).toBe(true)
    expect(PEDRAS_3D.lua[1]).toBeGreaterThan(PEDRAS_3D.sol[1])
    expect(ILHA_CAMINHOS.length).toBeLessThanOrEqual(MAX_WALKABLE_RECTS)
  })

  test('o farol continua pedindo só a chave', () => {
    for (const d of ['2d', '3d'] as const)
      expect(montarProjetoSimbolos(d, 'estrela').files['script.js']).toContain('if (temChave) {')
  })
})

describe('quiz dos símbolos', () => {
  test('as duas revisões são válidas, com previsões de uma só resposta certa', async () => {
    const { isManifestQuiz } = await import('../../../packages/core/src/learning/manifest-quiz')
    const { simbolosQuiz2d, simbolosQuiz3d } = await import('./simbolos-quiz')
    expect(isManifestQuiz(simbolosQuiz2d)).toBe(true)
    expect(isManifestQuiz(simbolosQuiz3d)).toBe(true)
    expect(simbolosQuiz2d.questions).toHaveLength(4)
    expect(simbolosQuiz3d.questions).toHaveLength(2)
    // A certa não fica sempre no mesmo lugar.
    const certas = [...simbolosQuiz2d.questions, ...simbolosQuiz3d.questions].map(
      (q) => q.correctChoiceIds[0],
    )
    expect(new Set(certas).size).toBeGreaterThan(1)
  })

  test('as cenas 2D do quiz saem do motor da experiência', async () => {
    const { simbolosQuizState } = await import(
      '../../../packages/member-shell/src/components/quiz-simbolos-scene'
    )
    expect(simbolosQuizState('simbolos-ordem', false).sequence).toMatchObject({
      passo: 2,
      chest: 'closed',
    })
    expect(simbolosQuizState('simbolos-ordem', true).sequence.chest).toBe('open')
    // Antes do teste, a cena não conta a resposta: só o sol aceso.
    expect(simbolosQuizState('simbolos-fora', false).sequence).toMatchObject({
      passo: 1,
      lit: ['sol'],
    })
    expect(simbolosQuizState('simbolos-fora', true).sequence).toMatchObject({
      passo: 0,
      lit: [],
      chest: 'closed',
    })
  })
})

describe('manifestos dos símbolos', () => {
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
            `../../aulas-interativas/faisca/poder-o-bau-dos-simbolos/simbolos-aula-${i + 1}.manifesto.json`,
          ),
          'utf8',
        ),
      )
      expect(isLearningManifest(m)).toBe(true)
      expect(m.courseSlug).toBe('jornada-faisca-poder-4')
      expect(m.lessonSlug).toBe(`aula-${i + 1}`)
      expect(m.sections.map((s: { key: string }) => s.key)).toEqual(
        d === '2d'
          ? ['abertura', 'material', 'experiencia', 'sol', 'lua', 'estrela', 'revisao', 'entrega']
          : ['abertura', 'lua', 'estrela', 'revisao', 'entrega'],
      )
      expect(m.sections.filter((s: any) => s.completion.submissionUpToDate)).toHaveLength(1)
      const studio = m.blocks.filter((b: any) => b.content?.kind === 'studio')
      expect(studio).toHaveLength(1)
      expect(studio[0].content.chain).toBe(`jornada-faisca-poder-4-${d}`)
      expect(studio[0].content.allowBlocks).toContain('sz_val_compare')
      expect(readManifestStudioProjectExamples(studio[0].content.projectExamples).kind).toBe(
        'valid',
      )
      const cenas = m.blocks.filter((b: any) => b.content?.activity?.type === 'experimentation')
      expect(cenas.map((b: any) => b.content.activity.scene)).toEqual(
        d === '2d' ? ['symbol-sequence'] : [],
      )
      expect(m.blocks.filter((b: any) => b.content?.kind === 'materials')).toHaveLength(
        d === '2d' ? 1 : 0,
      )
      expect(m.blocks.filter((b: any) => b.content?.kind === 'certificate')).toHaveLength(0)
      // O sol não cobra a lua ainda não pedida, e a lua não cobra o baú.
      const ids = (key: string) =>
        m.sections.find((s: any) => s.key === key)?.completion.projectChecks.map((c: any) => c.id)
      if (d === '2d') {
        expect(ids('sol')).not.toContain('lua-depois')
        expect(ids('lua')).not.toContain('ordem-certa')
      } else expect(ids('lua')).not.toContain('ordem-certa')
    })
})
