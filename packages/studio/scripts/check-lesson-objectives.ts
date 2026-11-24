/**
 * Confere os objetivos de ESTRUTURA de uma parte de aula contra um projeto, com a mesma régua do
 * servidor (`evaluateStudioSectionProject`). Usado pelo e2e dos cursos gravados.
 *
 *   bun scripts/check-lesson-objectives.ts <manifesto.json> <chave-da-parte> <projeto.json>
 *
 * Saída (JSON): `[{ checkId, label, passed, execucao }]`. Objetivo que RODA o jogo sai com
 * `execucao: true` e `passed: null`: só o executor do servidor responde por ele.
 */
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type ExecutionObservation,
  isExecutionRule,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../core/src/learning/project-execution'
import { evaluateStudioProjectStructure } from '../src/blockly/projectCheckAuthoring'
import { createCheckScope, prepareClassicCheckDocument } from '../src/check/serverCheck'

const [arquivoDoManifesto, chave, arquivoDoProjeto] = process.argv.slice(2)
if (!arquivoDoManifesto || !chave || !arquivoDoProjeto)
  throw new Error(
    'Uso: check-lesson-objectives.ts <manifesto.json> <chave-da-parte> <projeto.json>',
  )

interface Objetivo {
  id: string
  label: string
  rule: { type: string } & Record<string, unknown>
}
const manifesto = JSON.parse(readFileSync(arquivoDoManifesto, 'utf8')) as {
  blocks: { key: string; content?: { kind?: string; initialProject?: unknown } }[]
  sections: { key: string; workspaceKey?: string; completion?: { projectChecks?: Objetivo[] } }[]
}
const parte = manifesto.sections.find((section) => section.key === chave)
if (!parte) throw new Error(`Parte não encontrada: ${chave}`)
const inicial = manifesto.blocks.find((block) => block.key === parte.workspaceKey)?.content
  ?.initialProject
const projeto: unknown = JSON.parse(readFileSync(arquivoDoProjeto, 'utf8'))
const objetivos = parte.completion?.projectChecks ?? []
const deExecucao = objetivos.filter((objetivo) => isExecutionRule(objetivo.rule))

/**
 * Os objetivos que RODAM o jogo, no executor do servidor (`studio-runtime/runtime/
 * check-objectives.mjs`) com o documento que o Members monta (`prepareClassicCheckDocument`), num
 * Chromium de verdade. É o caminho inteiro menos o Worker e o contêiner. Só com
 * `SZ_CHECK_CHROMIUM` apontando o navegador; sem ele, esses objetivos saem sem nota.
 */
async function executar(): Promise<Map<string, boolean>> {
  const chromium = process.env.SZ_CHECK_CHROMIUM
  const executor = resolve(import.meta.dir, '../../studio-runtime/runtime/check-objectives.mjs')
  if (!chromium || !existsSync(chromium) || deExecucao.length === 0) return new Map()
  const pasta = mkdtempSync(join(tmpdir(), 'sz-aula-check-'))
  const runtime = mkdtempSync(join(tmpdir(), 'sz-aula-check-rt-'))
  const playwright = dirname(
    dirname(fileURLToPath(import.meta.resolve('playwright-core/package.json'))),
  )
  // Windows directory symlinks require privileges; junctions provide the same local
  // directory resolution for the copied executor without elevating the test process.
  symlinkSync(
    playwright,
    join(runtime, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  for (const nome of readdirSync(dirname(executor)).filter((n) => n.endsWith('.mjs')))
    writeFileSync(join(runtime, nome), readFileSync(join(dirname(executor), nome)))
  const scope = createCheckScope()
  writeFileSync(join(pasta, 'game.html'), await prepareClassicCheckDocument(projeto, scope))
  writeFileSync(
    join(pasta, 'check-options.json'),
    JSON.stringify({
      mode: 'classic',
      scope,
      objectives: deExecucao.map(({ id, rule }) => ({ id, rule })),
      deadlineMs: 120_000,
      screenshots: false,
    }),
  )
  const rodou = spawnSync('node', [join(runtime, 'check-objectives.mjs')], {
    cwd: pasta,
    env: { ...process.env, SZ_CHECK_CHROMIUM: chromium },
    encoding: 'utf8',
    timeout: 180_000,
  })
  if (rodou.status !== 0) throw new Error(`O executor falhou: ${rodou.stderr || rodou.error}`)
  const { observations } = JSON.parse(readFileSync(join(pasta, 'check-result.json'), 'utf8')) as {
    observations: ExecutionObservation[]
  }
  return new Map(
    deExecucao.map((objetivo) => [
      objetivo.id,
      judgeExecutionObservation(
        objetivo.rule as unknown as SectionExecutionRule,
        observations.find((item) => item.id === objetivo.id),
      ).passed,
    ]),
  )
}

const executado = await executar()
const saida = objetivos.map((objetivo) => {
  const rule = objetivo.rule as Parameters<typeof evaluateStudioProjectStructure>[0]
  const execucao = isExecutionRule(objetivo.rule)
  // Sem o executor, o objetivo de execução sai marcado e sem nota.
  const passed = execucao
    ? (executado.get(objetivo.id) ?? null)
    : evaluateStudioProjectStructure(rule, projeto, inicial)
  return { checkId: objetivo.id, label: objetivo.label, passed, execucao }
})
console.log(JSON.stringify(saida))
