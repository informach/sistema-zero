import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../packages/core/src/learning'
import { isManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'
import {
  executionRuleBudgetMs,
  isExecutionRule,
  isSectionExecutionRule,
  type SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { readManifestStudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { SZIRInputSchema } from '../../../packages/studio/src/ir/schema'
import { parseProjectFilesFromParts } from '../../../packages/studio/src/parsers/project'
import { armaAulas } from './arma-conteudo'
import { armaChecks } from './arma-criterios'
import { ARMA_ETAPAS, montarProjetoArma } from './arma-projeto'
import { armaQuiz2d, armaQuiz3d } from './arma-quiz'
import { montarProjetoPatrulha } from './patrulha-espacial-projeto'

function types(v: unknown, found = new Set<string>()): Set<string> {
  if (!v || typeof v !== 'object') return found
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) found.add(v.type)
  for (const c of Object.values(v)) types(c, found)
  return found
}

/** Mexe no código do gabarito e devolve o projeto com os blocos refeitos (o que a criança teria). */
function comMudanca(d: '2d' | '3d', de: RegExp, para: string) {
  const p = montarProjetoArma(d, 'disparo')
  const js = p.files['script.js'].replace(de, para)
  if (js === p.files['script.js']) throw Error(`Mudança não aplicada: ${de}`)
  const ir = parseProjectFilesFromParts({ html: [], cssSource: '', jsSource: js }).ir
  return {
    ...p,
    files: { ...p.files, 'script.js': js },
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
  }
}

const daTrilha = {
  '2d': types(
    JSON.parse(
      readFileSync(
        resolve(
          import.meta.dirname,
          '../../aulas-interativas/construtor/prototipos-base/2d/nave-2d-completo.szproject.json',
        ),
        'utf8',
      ),
    ).blocksState,
  ),
  '3d': types(montarProjetoPatrulha('completo').blocksState),
}

describe('Troca de arma', () => {
  for (const d of ['2d', '3d'] as const) {
    test(`${d}: todas as etapas fazem o roundtrip só com blocos de jogo e de programação`, () => {
      for (const etapa of ARMA_ETAPAS) {
        const p = montarProjetoArma(d, etapa)
        expect(SZIRInputSchema.safeParse(p.ir).success, etapa).toBe(true)
        expect(p.files['script.js']).not.toContain('rawJS')
        const roundtrip = buildWorkspaceStateFromIR(
          parseProjectFilesFromParts({
            html: [],
            cssSource: p.files['style.css'],
            jsSource: p.files['script.js'],
          }).ir,
        )
        for (const state of [p.blocksState, roundtrip])
          for (const type of types(state)) {
            expect(type, `${d}/${etapa}`).not.toMatch(
              /^sz_(html|css|canvas|adv|js_raw|js_object|js_array)/,
            )
            // os blocos do jogo da trilha (a Nave e a Patrulha), os de iniciante e o piscar do 3D
            // (intermediário, liberado pelo inventário da aula, como os da Patrulha)
            expect(
              daTrilha[d].has(type) || resolveBlockLevel(type).startsWith('iniciante-') || false,
              `${etapa}/${type}`,
            ).toBe(true)
          }
      }
    })

    test(`${d}: os objetivos de cada etapa são válidos, cabem no prazo e o gabarito cumpre os de blocos`, () => {
      for (const etapa of ARMA_ETAPAS) {
        const checks = armaChecks(d, etapa)
        if (etapa === 'inicio') {
          expect(checks).toEqual([])
          continue
        }
        expect(
          isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks }),
          etapa,
        ).toBe(true)
        const exec = checks.filter((c) => isExecutionRule(c.rule))
        expect(exec.length).toBeLessThanOrEqual(8)
        for (const c of exec) expect(isSectionExecutionRule(c.rule), `${etapa}/${c.id}`).toBe(true)
        const total = exec.reduce(
          (s, c) => s + executionRuleBudgetMs(c.rule as SectionExecutionRule),
          0,
        )
        expect(total, etapa).toBeLessThanOrEqual(40_000)
        expect(
          evaluateStudioSectionProject(
            checks.filter((c) => !isExecutionRule(c.rule)),
            montarProjetoArma(d, etapa),
          ).filter((c) => !c.passed),
          etapa,
        ).toEqual([])
      }
    })

    test(`${d}: o projeto de cada etapa ainda não cumpre os objetivos de blocos da etapa seguinte`, () => {
      for (let i = 1; i < ARMA_ETAPAS.length - 1; i++) {
        const antes = ARMA_ETAPAS[i]!,
          depois = ARMA_ETAPAS[i + 1]!
        const novos = armaChecks(d, depois).filter(
          (c) => !isExecutionRule(c.rule) && !armaChecks(d, antes).some((x) => x.id === c.id),
        )
        expect(novos.length, depois).toBeGreaterThan(0)
        const r = evaluateStudioSectionProject(novos, montarProjetoArma(d, antes))
        expect(
          r.some((c) => !c.passed),
          `${antes} → ${depois}`,
        ).toBe(true)
      }
    })

    test(`${d}: a entrada traz as variáveis e os grupos, sem relógio, troca nem pergunta no Espaço`, () => {
      const js = montarProjetoArma(d).files['script.js']
      expect(js).toContain('let arma = "laser";')
      expect(js).toContain('let plasmaLiberado = false;')
      expect(js).toContain('tirosPlasma')
      expect(js).not.toMatch(/onKey\("(e|KeyE)"|arma === "plasma"|plasmaLiberado = true/)
    })

    test(`${d}: os objetivos de blocos reprovam a troca sem guarda, o item que não libera e o Espaço que não pergunta`, () => {
      const blocos = armaChecks(d, 'disparo').filter((c) => !isExecutionRule(c.rule))
      const falhas = (p: ReturnType<typeof comMudanca>) =>
        evaluateStudioSectionProject(blocos, p)
          .filter((c) => !c.passed)
          .map((c) => c.checkId)
      expect(falhas(comMudanca(d, /if \(plasmaLiberado === true\) \{/, 'if (true) {'))).toContain(
        'troca-com-guarda',
      )
      expect(falhas(comMudanca(d, /\n\s*plasmaLiberado = true;/, ''))).toContain('item-libera')
      expect(
        falhas(comMudanca(d, /if \(arma === "plasma"\) \{/, 'if (arma === "nenhuma") {')),
      ).toContain('espaco-com-a-arma')
    })
  }
})

describe('quiz da Troca de arma', () => {
  test('as duas revisões são válidas e a certa muda de lugar', () => {
    expect(isManifestQuiz(armaQuiz2d)).toBe(true)
    expect(isManifestQuiz(armaQuiz3d)).toBe(true)
    expect(armaQuiz2d.questions).toHaveLength(4)
    expect(armaQuiz3d.questions).toHaveLength(2)
    const certas = [...armaQuiz2d.questions, ...armaQuiz3d.questions].map(
      (q) => q.correctChoiceIds[0],
    )
    expect(new Set(certas).size).toBeGreaterThan(1)
  })
})

describe('conteúdo da Troca de arma', () => {
  test('o Na tela só cita frases que estão na fala', () => {
    for (const aula of armaAulas())
      for (const t of aula.trechos) {
        const fala = t.text.replace(/\[[^\]]+\]\s*/g, '')
        for (const [, ancora] of t.screen.matchAll(/No "([^"]+)"/g))
          expect(fala.includes(ancora!), `${aula.slug}/${t.key}: ${ancora}`).toBe(true)
      }
  })
})

const pasta = resolve(import.meta.dirname, '../../aulas-interativas/construtor/poder-troca-de-arma')
describe.skipIf(!existsSync(resolve(pasta, 'arma-aula-1.manifesto.json')))(
  'manifestos da Troca de arma',
  () => {
    for (const [i, d] of (['2d', '3d'] as const).entries())
      test(`${d}: aula reservada, projeto contínuo, experiência só no 2D e uma entrega`, () => {
        const m = JSON.parse(
          readFileSync(resolve(pasta, `arma-aula-${i + 1}.manifesto.json`), 'utf8'),
        )
        expect(isLearningManifest(m)).toBe(true)
        expect(m.courseSlug).toBe('jornada-construtor-poder-5')
        expect(m.lessonSlug).toBe(`aula-${i + 1}`)
        expect(m.sections.map((s: { key: string }) => s.key)).toEqual(
          d === '2d'
            ? [
                'abertura',
                'material',
                'experiencia',
                'item',
                'troca',
                'placar',
                'disparo',
                'revisao',
              ]
            : ['abertura', 'item', 'troca', 'placar', 'disparo', 'revisao'],
        )
        expect(
          m.sections.filter((s: any) => s.completion.submissionUpToDate).map((s: any) => s.key),
        ).toEqual(['disparo'])
        expect(m.sections.at(-1)).toMatchObject({ key: 'revisao', intent: 'closing' })
        const studio = m.blocks.filter((b: any) => b.content?.kind === 'studio')
        expect(studio).toHaveLength(1)
        expect(studio[0].content.chain).toBe(`jornada-construtor-poder-5-${d}`)
        expect(readManifestStudioProjectExamples(studio[0].content.projectExamples).kind).toBe(
          'valid',
        )
        const cenas = m.blocks.filter((b: any) => b.content?.activity?.type === 'experimentation')
        expect(cenas.map((b: any) => b.content.activity.scene)).toEqual(
          d === '2d' ? ['weapon-swap'] : [],
        )
        expect(m.blocks.filter((b: any) => b.content?.kind === 'materials')).toHaveLength(
          d === '2d' ? 1 : 0,
        )
      })
  },
)
