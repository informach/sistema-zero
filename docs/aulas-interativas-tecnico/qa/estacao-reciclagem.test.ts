/**
 * A missão do Construtor, A Estação de Reciclagem: manifestos nas duas aulas reservadas, projetos
 * de cada etapa (blocos básicos, ida e volta código ⇄ blocos), objetivos de blocos no gabarito e na
 * entrada, a meta nova que precisa da variável, os gestos do roteiro e os projetos portáteis.
 * Os objetivos que rodam o jogo são provados no executor de verdade, com mutações, por
 * `estacao-objetivos-navegador.ts`; o padrão comum das missões fica em `missao-padrao.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../packages/core/src/learning'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import {
  EXECUTION_LIMITS,
  isExecutionRule,
  isSectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { readManifestStudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { agir } from '../../../packages/palco-gravacao/src/lib/verbos'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { isCourseModelStub } from '../../../packages/studio/src/core/courseModels'
import { sanitizeProjectAssets } from '../../../packages/studio/src/core/projectAssets'
import { SZIRInputSchema } from '../../../packages/studio/src/ir/schema'
import { parseProjectFilesFromParts } from '../../../packages/studio/src/parsers/project'
import { exportFromSource } from './construtor-base-projetos'
import { estacaoAulas } from './estacao-conteudo'
import { estacaoChecks } from './estacao-criterios'
import {
  ESTACAO_ETAPAS,
  ESTACAO_REGRAS,
  estacaoAssets2D,
  fonteEstacao2D,
  fonteEstacao3D,
  montarProjetoEstacao,
} from './estacao-projeto'

const dir = resolve(import.meta.dirname, '../../aulas-interativas/construtor/estacao-de-reciclagem')
function types(v: unknown, found = new Set<string>()): Set<string> {
  if (!v || typeof v !== 'object') return found
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) found.add(v.type)
  for (const c of Object.values(v)) types(c, found)
  return found
}
const estruturais = (d: '2d' | '3d', etapa: (typeof ESTACAO_ETAPAS)[number]) =>
  estacaoChecks(d, etapa).filter((c) => !isExecutionRule(c.rule))

describe('A Estação de Reciclagem', () => {
  for (const [i, d] of (['2d', '3d'] as const).entries()) {
    test(`${d}: manifesto da aula reservada, projeto contínuo e uma entrega`, () => {
      const m = JSON.parse(readFileSync(resolve(dir, `aula-${i + 1}.manifesto.json`), 'utf8'))
      expect(isLearningManifest(m)).toBe(true)
      expect(m.courseSlug).toBe('jornada-construtor-missao')
      expect(m.lessonSlug).toBe(`aula-${i + 1}`)
      expect(m.sections.map((s: { key: string }) => s.key)).toEqual([
        'abertura',
        'esteira',
        'coleta',
        'resultado',
        'meta-nova',
        'missao-cumprida',
      ])
      expect(m.sections.find((s: { key: string }) => s.key === 'meta-nova').intent).toBe('delivery')
      expect(
        learningImportBodyBytes(
          m,
          'preserve',
          'a'.repeat(64),
          '00000000-0000-4000-8000-000000000000',
        ),
      ).toBeLessThanOrEqual(LEARNING_IMPORT_BODY_MAX_BYTES)
      expect(m.blocks.filter((b: any) => b.content?.kind === 'certificate')).toHaveLength(0)
      const studio = m.blocks.filter((b: any) => b.content?.kind === 'studio')
      expect(studio).toHaveLength(1)
      expect(studio[0].content.chain).toBe(`jornada-construtor-missao-${d}`)
      expect(readManifestStudioProjectExamples(studio[0].content.projectExamples).kind).toBe(
        'valid',
      )
      expect(m.sections.every((s: any) => isSectionCompletion(s.completion))).toBe(true)
      // Os objetivos que rodam o jogo cabem no tempo do executor em cada parte.
      for (const s of m.sections) {
        const exec = (s.completion.projectChecks ?? []).filter((c: any) => isExecutionRule(c.rule))
        expect(exec.length, s.key).toBeLessThanOrEqual(EXECUTION_LIMITS.maxObjectives)
        const espera = exec
          .flatMap((c: any) => c.rule.steps)
          .reduce(
            (t: number, p: any) =>
              t + (p.action === 'wait' ? p.ms : p.action === 'press' ? (p.holdMs ?? 0) : 0),
            0,
          )
        expect(espera, s.key).toBeLessThanOrEqual(EXECUTION_LIMITS.maxSectionWaitMs)
      }
    })

    test(`${d}: todas as etapas e a ida e volta usam só blocos que o curso da trilha liberou`, () => {
      // A missão não traz bloco novo: tudo é da Nave Contra Asteroides (2D) ou da Patrulha
      // Espacial (3D). A Patrulha já usa blocos do nível intermediário (câmera, percursos).
      const base = new Set<string>(
        JSON.parse(
          readFileSync(
            resolve(
              dir,
              '..',
              d === '2d' ? 'nave-contra-asteroides' : 'patrulha-espacial',
              'blocos.json',
            ),
            'utf8',
          ),
        ).allowBlocks,
      )
      for (const etapa of ESTACAO_ETAPAS) {
        const p = montarProjetoEstacao(d, etapa)
        expect(SZIRInputSchema.safeParse(p.ir).success, etapa).toBe(true)
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
            expect(base.has(type), `${d}/${etapa}/${type}`).toBe(true)
            if (d === '2d')
              expect(
                resolveBlockLevel(type).startsWith('iniciante-'),
                `${d}/${etapa}/${type}`,
              ).toBe(true)
            expect(type).not.toMatch(/^sz_(html|css|canvas|adv|js_raw|js_object|js_array)/)
          }
        const checks = estacaoChecks(d, etapa)
        expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks })).toBe(true)
        for (const c of checks)
          if (isExecutionRule(c.rule)) expect(isSectionExecutionRule(c.rule), c.id).toBe(true)
        // O gabarito de cada etapa cumpre os objetivos de blocos dela.
        expect(
          evaluateStudioSectionProject(estruturais(d, etapa), p)
            .filter((c) => !c.passed)
            .map((c) => c.id),
          etapa,
        ).toEqual([])
      }
    })

    test(`${d}: a entrada não traz as regras da criança resolvidas`, () => {
      const p = montarProjetoEstacao(d, 'inicio')
      expect(p.files['script.js']).not.toMatch(
        /everySeconds|spawnCopy|SZGame2D\.spawn\(|overlapSpriteGroup|onTouchGroup|healthDepleted|lifeOf|endGame\("|setScene\("(?:vitoria|derrota)"\)/,
      )
      const regras = estruturais(d, 'meta-nova')
      expect(
        evaluateStudioSectionProject(regras, p)
          .filter((c) => c.passed)
          .map((c) => c.id),
      ).toEqual([])
      // Cada etapa começa sem a regra dela: a entrada de uma etapa é o gabarito da anterior.
      for (const [n, etapa] of ESTACAO_ETAPAS.entries()) {
        if (n === 0) continue
        const antes = montarProjetoEstacao(d, ESTACAO_ETAPAS[n - 1]!)
        const novas = estruturais(d, etapa).filter(
          (c) => !estruturais(d, ESTACAO_ETAPAS[n - 1]!).some((x) => x.id === c.id),
        )
        expect(novas.length, etapa).toBeGreaterThan(0)
        expect(
          evaluateStudioSectionProject(novas, antes)
            .filter((c) => c.passed)
            .map((c) => c.id),
          etapa,
        ).toEqual([])
      }
    })

    test(`${d}: a meta nova pede a vitória pela variável, não um número escrito`, () => {
      const r = ESTACAO_REGRAS[d]
      const fonte = d === '2d' ? fonteEstacao2D('meta-nova') : fonteEstacao3D('meta-nova')
      // A criança que escreveu o número na condição: a vitória chega cedo, e o objetivo reprova.
      const numero = fonte.replace('pontos >= meta', `pontos >= ${r.metaNova}`)
      expect(numero).not.toBe(fonte)
      const p = exportFromSource({
        projectId: 'estacao-teste-meta',
        name: 'teste',
        extensionId: d === '2d' ? 'game-2d' : 'game-3d',
        source: numero,
        assets: d === '2d' ? estacaoAssets2D() : [],
      })
      const vitoria = estruturais(d, 'meta-nova').filter((c) => c.id === 'vitoria-pela-meta')
      expect(evaluateStudioSectionProject(vitoria, p)[0]?.passed).toBe(false)
      // "igual" também é um jeito certo (o placar sobe de um em um).
      const igual = exportFromSource({
        projectId: 'estacao-teste-igual',
        name: 'teste',
        extensionId: d === '2d' ? 'game-2d' : 'game-3d',
        source: fonte.replace('pontos >= meta', 'pontos === meta'),
        assets: d === '2d' ? estacaoAssets2D() : [],
      })
      expect(evaluateStudioSectionProject(vitoria, igual)[0]?.passed).toBe(true)
    })

    test(`${d}: projetos portáteis não dependem de cache nem de referências compactas`, () => {
      for (const sufixo of ['', '-inicio']) {
        const p = JSON.parse(
          readFileSync(resolve(dir, `estacao-${d}${sufixo}.szproject.json`), 'utf8'),
        )
        const assets = sanitizeProjectAssets(p.assets)
        expect(assets.length).toBe(p.assets.length)
        expect(assets.length).toBe(16)
        for (const a of assets.filter((a) => a.kind === 'model3d')) {
          expect(isCourseModelStub(a), a.name).toBe(false)
          const bytes = Buffer.from(a.dataUrl.split(',')[1]!, 'base64')
          const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))
          expect(gltf.meshes.length, a.name).toBeGreaterThan(0)
          expect(gltf.meshes.length, a.name).toBeLessThanOrEqual(48)
        }
      }
    })
  }

  test('os gestos do roteiro são do Palco ou da página', () => {
    const pagina = [
      /^(?:clicar|apontar|passar o mouse|clique duplo|clique direito) ["“][^"”]+["”]$/i,
      /^tecla (?:[A-Za-z][A-Za-z0-9+_-]*|[0-9])$/i,
      /^segurar tecla [A-Za-z][A-Za-z0-9+_-]* por \d+(?:[.,]\d+)? s$/i,
      /^na edição: .+$/i,
    ]
    const desconhecidos: string[] = []
    for (const aula of estacaoAulas)
      for (const t of aula.trechos)
        for (const m of t.screen.matchAll(/\[([^\]\n]+)\]/g)) {
          const gesto = m[1]!
          if (pagina.some((r) => r.test(gesto))) continue
          try {
            agir(gesto, [{ stage: { width: 960, height: 600 }, targets: [] }])
          } catch (error) {
            const msg = String((error as Error).message)
            if (
              msg === 'Este gesto precisa da página do palco aberta.' ||
              msg.startsWith('A pré-visualização do Estúdio não está na tela.')
            )
              continue
            desconhecidos.push(`${aula.slug}/${t.key}: [${gesto}] ${msg}`)
          }
        }
    expect(desconhecidos).toEqual([])
  })
})
