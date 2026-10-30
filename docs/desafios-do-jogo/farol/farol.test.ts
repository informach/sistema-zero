import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isSectionExecutionRule } from '../../../packages/core/src/learning/project-execution'
import {
  isSectionCompletion,
  type SectionJavaScriptProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { evaluateStudioProjectStructure } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { Project } from '../../../packages/studio/src/core/project'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { criarManifesto } from './gerar-manifesto'

const manifesto = criarManifesto()
const [desafio] = manifesto.desafios
if (!desafio) throw new Error('sem desafio')
const checks = desafio.conteudo.objetivos as SectionJavaScriptProjectCheck[]
const raiz = new URL('../../aulas-interativas/', import.meta.url)
const blocosDoFaisca = new Set(
  ['faisca/desafio-primeiro-jogo', 'faisca/o-jardim-secreto'].flatMap((curso) => {
    const dados = JSON.parse(readFileSync(new URL(`${curso}/blocos.json`, raiz), 'utf8'))
    return dados.blocks ?? dados['2d']
  }),
)
function tipos(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(tipos)
  const o = value as Record<string, unknown>
  return [
    ...(typeof o.type === 'string' && o.type.startsWith('sz_') ? [o.type] : []),
    ...Object.values(o).flatMap(tipos),
  ]
}

test('os arquivos importáveis correspondem à fonte, um quadro do Farol que não pinta', async () => {
  expect(await Bun.file(new URL('./farol.manifesto.json', import.meta.url)).json()).toEqual(
    manifesto,
  )
  expect(await Bun.file(new URL('./farol-adulto.manifesto.json', import.meta.url)).json()).toEqual(
    criarManifesto('adulto'),
  )
  expect(desafio.ilha).toBe('farol')
  expect(desafio.quadro).toBe(1)
  expect(desafio.conteudo.recompensa.cor).toBe(false)
  for (const p of [desafio.conteudo.projetoInicial, desafio.conteudo.gabarito]) {
    const project = p as { ir: unknown; blocksState: unknown }
    expect(SZIRV2Schema.safeParse(project.ir).success).toBe(true)
    expect([...new Set(tipos(project.blocksState))].filter((t) => !blocosDoFaisca.has(t))).toEqual(
      [],
    )
  }
  expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks })).toBe(true)
})

test('os critérios de estrutura valem no exemplo e faltam no projeto inicial', () => {
  for (const c of checks) {
    if (isSectionExecutionRule(c.rule)) continue
    expect(evaluateStudioProjectStructure(c.rule, desafio.conteudo.gabarito), c.id).toBe(true)
    expect(evaluateStudioProjectStructure(c.rule, desafio.conteudo.projetoInicial), c.id).toBe(
      false,
    )
  }
})

test('outra ideia, com outros nomes e desenhos, também cumpre: nada de resposta pronta', () => {
  const outro = structuredClone(desafio.conteudo.gabarito) as Project
  const trocar = (json: string) =>
    json
      .replaceAll('"temEstrela"', '"achouOLumi"')
      .replaceAll('"aceso"', '"festa"')
      .replaceAll('"estrela"', '"lumi"')
      .replaceAll('"farol"', '"concha"')
  const ir = JSON.parse(trocar(JSON.stringify(outro.ir)))
  expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
  const projeto = { ...outro, ir, blocksState: buildWorkspaceStateFromIR(ir) }
  for (const c of checks) {
    if (isSectionExecutionRule(c.rule)) continue
    expect(evaluateStudioProjectStructure(c.rule, projeto), c.id).toBe(true)
  }
})

test('textos sem travessão e sem exclamação', () => {
  const textos = [
    desafio.conteudo.titulo,
    desafio.conteudo.enunciado,
    ...desafio.conteudo.dicas,
    desafio.conteudo.desafioExtra?.texto ?? '',
    ...checks.map((c) => c.label),
  ]
  for (const t of textos) expect(t).not.toMatch(/[—–!]/)
})
