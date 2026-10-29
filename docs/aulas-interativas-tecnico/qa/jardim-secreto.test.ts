import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../packages/core/src/learning'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import {
  isManifestQuiz,
  validatePredictionQuiz,
} from '../../../packages/core/src/learning/manifest-quiz'
import {
  isExecutionRule,
  isSectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { readManifestStudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { isCourseModelStub } from '../../../packages/studio/src/core/courseModels'
import { sanitizeProjectAssets } from '../../../packages/studio/src/core/projectAssets'
import { SZIRInputSchema } from '../../../packages/studio/src/ir/schema'
import { parseProjectFilesFromParts } from '../../../packages/studio/src/parsers/project'
import { jardimChecks } from './jardim-criterios'
import { JARDIM_ETAPAS, montarProjetoJardim } from './jardim-projeto'
import { jardimQuiz } from './jardim-quiz'

const dir = resolve(import.meta.dirname, '../../aulas-interativas/faisca/o-jardim-secreto')
function types(v: unknown, found = new Set<string>()): Set<string> {
  if (!v || typeof v !== 'object') return found
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) found.add(v.type)
  for (const c of Object.values(v)) types(c, found)
  return found
}
describe('O Jardim Secreto', () => {
  for (const [i, d] of (['2d', '3d'] as const).entries()) {
    test(`${d}: manifesto preserva aula reservada, projeto contínuo e uma entrega`, () => {
      const m = JSON.parse(readFileSync(resolve(dir, `aula-${i + 1}.manifesto.json`), 'utf8'))
      expect(isLearningManifest(m)).toBe(true)
      expect(m.courseSlug).toBe('jornada-faisca-missao')
      expect(m.lessonSlug).toBe(`aula-${i + 1}`)
      expect(m.sections.length).toBe(i === 0 ? 8 : 7)
      expect(
        learningImportBodyBytes(
          m,
          'preserve',
          'a'.repeat(64),
          '00000000-0000-4000-8000-000000000000',
        ),
      ).toBeLessThanOrEqual(LEARNING_IMPORT_BODY_MAX_BYTES)
      expect(m.blocks.filter((b: any) => b.content?.kind === 'certificate')).toHaveLength(0)
      expect(m.sections.filter((s: any) => s.completion.submissionUpToDate)).toHaveLength(1)
      const studio = m.blocks.filter((b: any) => b.content?.kind === 'studio')
      expect(studio).toHaveLength(1)
      expect(studio[0].content.chain).toBe(`jornada-faisca-missao-${d}`)
      expect(readManifestStudioProjectExamples(studio[0].content.projectExamples).kind).toBe(
        'valid',
      )
      expect(m.sections.every((s: any) => isSectionCompletion(s.completion))).toBe(true)
      const collect = m.sections.find((s: any) => s.key === 'coleta')
      expect(collect.completion.projectChecks.map((c: any) => c.id)).not.toContain('sem-regador')
    })
    test(`${d}: todas as etapas e o roundtrip usam somente blocos básicos`, () => {
      for (const stage of JARDIM_ETAPAS) {
        const p = montarProjetoJardim(d, stage)
        expect(SZIRInputSchema.safeParse(p.ir).success, stage).toBe(true)
        expect(p.ir!.html).toEqual([])
        expect(p.ir!.css).toEqual([])
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
            expect(resolveBlockLevel(type).startsWith('iniciante-'), `${d}/${stage}/${type}`).toBe(
              true,
            )
            expect(type).not.toMatch(/^sz_(html|css|canvas|adv|js_raw|js_object|js_array)/)
          }
        const checks = jardimChecks(d, stage)
        expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks })).toBe(true)
        for (const c of checks)
          if (isExecutionRule(c.rule)) expect(isSectionExecutionRule(c.rule), c.id).toBe(true)
        expect(
          evaluateStudioSectionProject(
            checks.filter((c) => !isExecutionRule(c.rule)),
            p,
          ).filter((c) => !c.passed),
          stage,
        ).toEqual([])
      }
    })
    test(`${d}: entrada não traz movimento, coleta, memória ou decisão resolvidos`, () => {
      const p = montarProjetoJardim(d)
      expect(p.files['script.js']).not.toMatch(
        /topDown|temRegador|onTouch|onOverlap|playAnimation\(flor|setImage\(flor/,
      )
      const rules = jardimChecks(d, 'posicao').filter((c) => !isExecutionRule(c.rule))
      expect(evaluateStudioSectionProject(rules, p).every((c) => !c.passed)).toBe(true)
      const before = montarProjetoJardim(d, 'decisao')
      expect(
        evaluateStudioSectionProject(
          rules.filter((c) => c.id === 'posicao'),
          before,
        )[0]?.passed,
      ).toBe(false)
    })
    test(`${d}: projetos portáteis não dependem de cache nem referências compactas`, () => {
      for (const suffix of ['', '-inicio']) {
        const p = JSON.parse(
          readFileSync(resolve(dir, `jardim-${d}${suffix}.szproject.json`), 'utf8'),
        )
        const assets = sanitizeProjectAssets(p.assets)
        expect(assets.length).toBe(p.assets.length)
        for (const a of assets.filter((a) => a.kind === 'model3d')) {
          expect(isCourseModelStub(a), a.name).toBe(false)
          const bytes = Buffer.from(a.dataUrl.split(',')[1]!, 'base64')
          const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))
          expect(gltf.meshes.length, a.name).toBeGreaterThan(0)
          expect(gltf.meshes.length, a.name).toBeLessThanOrEqual(48)
          if (a.name === 'flor-do-jardim')
            expect(gltf.animations.map((a: any) => a.name)).toContain('florescer')
        }
      }
    })
  }
  test('quiz misto mantém resposta única, demonstrações 1/3/4 e pergunta 2 sem cena', () => {
    expect(isManifestQuiz(jardimQuiz)).toBe(true)
    expect(validatePredictionQuiz(jardimQuiz.questions)).toBeNull()
    expect(jardimQuiz.questions.map((q) => q.predictionScene)).toEqual([
      'jardim-memory',
      undefined,
      'jardim-view',
      'jardim-height',
    ])
    expect(
      validatePredictionQuiz([{ predictionScene: 'jardim-memory', correctChoiceIds: ['a', 'b'] }]),
    ).not.toBeNull()
    expect(
      validatePredictionQuiz([{ predictionScene: 'inventada', correctChoiceIds: ['a'] }]),
    ).not.toBeNull()
  })
})
