/** Inventário editorial derivado dos blocos oficiais e dos projetos progressivos. */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS, JS_GROUPS } from '../../../../packages/studio/src/blockly/blocks/js'
import { MATH_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/math'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import {
  gameTwoDBlocks,
  gameTwoDToolboxCategory,
} from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import {
  gameThreeDBlocks,
  gameThreeDToolboxCategory,
} from '../../../../packages/studio/src/official-extensions/game-3d/blocks'

type Block = {
  type: string
  fields?: Record<string, unknown>
  inputs?: Record<string, { block?: Block; shadow?: Block }>
  next?: { block?: Block }
}
const root = resolve(import.meta.dir, '../../../..')
const definitions = new Map(
  [
    ...FRAME_BLOCKS,
    ...JS_BLOCKS,
    ...VALUE_BLOCKS,
    ...MATH_BLOCKS,
    ...gameTwoDBlocks,
    ...gameThreeDBlocks,
  ].map((block) => [block.type, block]),
)
const categories = new Map<string, string>()
const plain = (text: string) => text.replace(/^[^\p{L}\p{N}]+/u, '').trim()
function category(node: any, path: string[] = []) {
  const current = [...path, plain(node.name)]
  for (const item of node.contents) {
    if (item.kind === 'category') category(item, current)
    else if (item.kind === 'block') categories.set(item.type, current.join(' > '))
  }
}
category(gameTwoDToolboxCategory)
category(gameThreeDToolboxCategory)
for (const group of JS_GROUPS)
  for (const type of group.types) categories.set(type, `Programação > ${plain(group.name)}`)
for (const block of VALUE_BLOCKS) categories.set(block.type, 'Programação > Valores')
for (const block of MATH_BLOCKS) categories.set(block.type, 'Programação > Matemática')
for (const block of FRAME_BLOCKS) categories.set(block.type, 'Áreas do projeto')
function walk(block: Block, visit: (block: Block) => void) {
  visit(block)
  for (const input of Object.values(block.inputs ?? {})) {
    // O shadow encoberto continua permitido, mas o exemplo usa o valor encaixado.
    if (input.shadow) walk(input.shadow, visit)
    if (input.block) walk(input.block, visit)
  }
  if (block.next?.block) walk(block.next.block, visit)
}
function blocks(project: any): Block[] {
  const result: Block[] = []
  for (const block of project.blocksState.blocks.blocks) walk(block, (b) => result.push(b))
  return result
}
function signature(block: Block): string {
  return JSON.stringify([
    block.type,
    Object.entries(block.fields ?? {}).sort(),
    Object.entries(block.inputs ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, input]) => [
        key,
        input.block ? signature(input.block) : input.shadow ? signature(input.shadow) : null,
      ]),
  ])
}
function label(block: Block): string {
  const definition: any = definitions.get(block.type)
  if (!definition) throw new Error(`Tipo sem definição oficial: ${block.type}`)
  return definition.message0
    .replace(/%(\d+)/g, (_: string, n: string) => {
      const arg = definition.args0[Number(n) - 1]
      if (arg.type === 'input_statement' || arg.type === 'input_dummy') return ''
      if (arg.type === 'input_value') {
        const input = block.inputs?.[arg.name]
        const nested = input?.block ?? input?.shadow
        return nested ? label(nested) : '[valor]'
      }
      const raw = block.fields?.[arg.name] ?? arg.value ?? arg.text ?? arg.colour ?? '[campo]'
      if (arg.type === 'field_dropdown' && Array.isArray(arg.options))
        return (
          arg.options.find((option: any) => String(option[1]) === String(raw))?.[0] ?? String(raw)
        )
      return String(raw)
    })
    .replace(/\s+/g, ' ')
    .trim()
}
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
for (const course of ['nave-contra-asteroides', 'patrulha-espacial']) {
  const folder = resolve(root, 'docs/aulas-interativas/construtor', course)
  const read = (file: string) => JSON.parse(readFileSync(resolve(folder, file), 'utf8'))
  const authored = read('curso-autoria.json')
  const allowed = new Set<string>(read('blocos.json').allowBlocks)
  const initial = blocks(read('projeto-inicial.szproject.json'))
  const final = blocks(read('projeto-final.szproject.json'))
  const initialTypes = new Set(initial.map((b) => b.type))
  const examples = new Map(final.map((b) => [b.type, b]))
  const firstStage = new Map<string, string>()
  type Destination = {
    lesson: number
    part: number
    title: string
    slug: string
    beforeStage: string
    afterStage: string
  }
  const stageParts = new Map<string, Destination>()
  const explicitParts = new Map<string, Destination[]>()
  authored.aulas.forEach((lesson: any, index: number) => {
    let stage = lesson.entryStage
    lesson.trechos.forEach((part: any, partIndex: number) => {
      const next = part.etapa ?? stage
      const destination = {
        lesson: index + 1,
        part: partIndex + 1,
        title: part.title,
        slug: lesson.slug,
        beforeStage: stage,
        afterStage: next,
      }
      if (part.etapa && !stageParts.has(part.etapa)) stageParts.set(part.etapa, destination)
      for (const type of part.blockTypes ?? []) {
        const parts = explicitParts.get(type) ?? []
        parts.push(destination)
        explicitParts.set(type, parts)
      }
      stage = next
    })
  })
  const stageBlocks = new Map<string, Block[]>(
    authored.etapas.map((stage: string) => [
      stage,
      blocks(read(`projetos/${stage}.szproject.json`)),
    ]),
  )
  for (const [stage, entries] of stageBlocks)
    for (const block of entries) {
      if (!firstStage.has(block.type)) firstStage.set(block.type, stage)
      if (!examples.has(block.type)) examples.set(block.type, block)
      if (!allowed.has(block.type))
        throw new Error(`${course}: ${block.type} aparece no projeto, mas não está liberado.`)
    }
  for (const type of explicitParts.keys())
    if (!allowed.has(type))
      throw new Error(`${course}: ${type} citado na autoria fora da lista de blocos.`)
  const rows = [...allowed]
    .sort((a, b) => `${categories.get(a)} ${a}`.localeCompare(`${categories.get(b)} ${b}`, 'pt-BR'))
    .map((type) => {
      const prepared = initialTypes.has(type)
      const parts = explicitParts.get(type) ?? []
      const first = parts[0] ?? (!prepared ? stageParts.get(firstStage.get(type) ?? '') : undefined)
      const role = parts.length
        ? prepared
          ? 'Retomado ou aplicado na montagem'
          : 'Construído no curso'
        : prepared
          ? 'Apoio fornecido no projeto inicial'
          : 'Valor ou apoio acrescentado na construção'
      let example = examples.get(type)
      if (first) {
        const before = (stageBlocks.get(first.beforeStage) ?? []).filter((b) => b.type === type)
        const after = (stageBlocks.get(first.afterStage) ?? []).filter((b) => b.type === type)
        const counts = new Map<string, number>()
        for (const b of before) counts.set(signature(b), (counts.get(signature(b)) ?? 0) + 1)
        const changed = after.filter((b) => {
          const key = signature(b),
            remaining = counts.get(key) ?? 0
          if (remaining) {
            counts.set(key, remaining - 1)
            return false
          }
          return true
        })
        example = changed[0] ?? after[0] ?? example
      }
      const definition: any = definitions.get(type)
      if (!definition || !categories.has(type))
        throw new Error(`${course}: definição/categoria ausente para ${type}`)
      return {
        type,
        label: example ? label(example) : label({ type }),
        category: categories.get(type)!,
        role,
        inInitial: prepared,
        initialCount: initial.filter((b) => b.type === type).length,
        finalCount: final.filter((b) => b.type === type).length,
        firstStage: firstStage.get(type) ?? null,
        firstConstruction: first ?? null,
        parts,
      }
    })
  const summary = {
    types: rows.length,
    inInitial: rows.filter((r) => r.inInitial).length,
    appliedInLessons: rows.filter((r) => r.parts.length).length,
    initialInstances: initial.length,
    finalInstances: final.length,
  }
  const inventory = {
    version: 1,
    course,
    source: 'Definições e paletas oficiais; curso-autoria.json; todos os projetos progressivos.',
    interpretation:
      'Tipos liberados não equivalem a conceitos novos. Um tipo pode apoiar a infraestrutura inicial e também ser usado na montagem da criança. As contagens incluem valores e sombras de encaixe.',
    summary,
    blocks: rows,
  }
  writeFileSync(resolve(folder, 'blocos-usados.json'), `${JSON.stringify(inventory, null, 2)}\n`)
  const table = (list: typeof rows) =>
    [
      '| Bloco (exemplo preenchido) | Onde encontrar | Papel no curso | Primeira montagem |',
      '|---|---|---|---|',
      ...list.map(
        (row) =>
          `| ${cell(row.label)}<br>\`${row.type}\` | ${cell(row.category)} | ${row.role} | ${row.firstConstruction ? `[Aula ${row.firstConstruction.lesson}, parte ${row.firstConstruction.part}](${authored.prefixo}-${row.firstConstruction.slug}.md)` : 'Já vem pronto; não é uma tarefa de reconstrução.'} |`,
      ),
    ].join('\n')
  const construction = rows.filter((row) => row.parts.length || !row.inInitial)
  const support = rows.filter((row) => row.inInitial && !row.parts.length)
  const text = `# Blocos usados · ${authored.nome}

Inventário conferido com as definições oficiais e com todas as etapas do projeto. Os nomes abaixo mostram **exemplos preenchidos reais**; o bloco que sai da paleta pode começar com outros valores. Os roteiros ensinam essas trocas e os destinos dos encaixes.

## Como ler

Há **${summary.types} tipos liberados**, dos quais **${summary.inInitial} já aparecem no projeto inicial**. A autoria aponta explicitamente **${summary.appliedInLessons} tipos** nas montagens. Isso não é uma contagem de conceitos novos: áreas, valores e um mesmo bloco reutilizado em vários lugares têm papéis diferentes.

As telas, o estado inicial e o retorno ficam preparados. Um tipo usado nesse apoio pode reaparecer no que a criança constrói, por exemplo para conferir \`jogando\` ou decidir o resultado. Leia o papel e a parte indicada, em vez de interpretar a lista como uma tarefa de refazer toda a infraestrutura.

## Montagens e valores usados pela criança

${table(construction)}

## Apoio que já vem no projeto

${table(support)}

## Arquivos e reprodução

- [Lista técnica de liberação](blocos.json): IDs aceitos nas aulas.
- [Inventário detalhado](blocos-usados.json): contagens, primeira etapa e todas as partes que citam cada tipo.
- [Mapa das aulas](mapa-de-aulas.md): sequência de construção.
- [Projeto inicial](projeto-inicial.szproject.json) e [projeto final](projeto-final.szproject.json): exemplos usados neste inventário.

As contagens técnicas incluem valores e sombras de encaixe; não são o número de ações que o aluno executa. Para regenerar, execute \`bun docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-inventario-blocos.ts\` depois do gerador dos cursos.
`
  writeFileSync(resolve(folder, 'blocos-usados.md'), text)
  console.log(JSON.stringify({ course, ...summary }))
}
