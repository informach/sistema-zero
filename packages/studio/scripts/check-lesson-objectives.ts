/**
 * Confere os objetivos de ESTRUTURA de uma parte de aula contra um projeto, com a mesma régua do
 * servidor (`evaluateStudioSectionProject`). Usado pelo e2e dos cursos gravados.
 *
 *   bun scripts/check-lesson-objectives.ts <manifesto.json> <chave-da-parte> <projeto.json>
 *
 * Saída (JSON): `[{ checkId, label, passed, execucao }]`. Objetivo que RODA o jogo sai com
 * `execucao: true` e `passed: null`: só o executor do servidor responde por ele.
 */
import { readFileSync } from 'node:fs'
import { isExecutionRule } from '../../core/src/learning/project-execution'
import { evaluateStudioProjectStructure } from '../src/blockly/projectCheckAuthoring'

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
const saida = (parte.completion?.projectChecks ?? []).map((objetivo) => {
  const rule = objetivo.rule as Parameters<typeof evaluateStudioProjectStructure>[0]
  // O avaliador de estrutura devolve falso para regra de execução: aqui ela sai marcada, sem nota.
  const execucao = isExecutionRule(objetivo.rule)
  const passed = execucao ? null : evaluateStudioProjectStructure(rule, projeto, inicial)
  return { checkId: objetivo.id, label: objetivo.label, passed, execucao }
})
console.log(JSON.stringify(saida))
