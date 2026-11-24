/** Esquemas derivados dos snapshots e das definições oficiais do Estúdio. */
import { FRAME_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/js'
import { MATH_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/math'
import { VALUE_BLOCKS } from '../../../../packages/studio/src/blockly/blocks/values'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { criarBlocos } from '../caderno-visual/visual'

type Block = {
  type: string
  fields?: Record<string, unknown>
  inputs?: Record<string, { block?: Block; shadow?: Block }>
  next?: { block?: Block }
  extraState?: { hasElse?: boolean }
}
const definitions = [
  ...FRAME_BLOCKS,
  ...JS_BLOCKS,
  ...VALUE_BLOCKS,
  ...MATH_BLOCKS,
  ...gameTwoDBlocks,
  ...gameThreeDBlocks,
]
const byType = new Map(definitions.map((d) => [d.type, d]))
export const B = criarBlocos(definitions)
export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const child = (block: Block, key: string) =>
  block.inputs?.[key]?.block ?? block.inputs?.[key]?.shadow
const definition = (type: string): any => {
  const d = byType.get(type)
  if (!d) throw new Error(`Definição ausente no caderno: ${type}`)
  return d
}
const fields = (block: Block) =>
  Object.fromEntries(Object.entries(block.fields ?? {}).sort(([a], [b]) => a.localeCompare(b)))
function valueKey(block: Block | undefined): unknown {
  if (!block) return null
  return [
    block.type,
    fields(block),
    Object.entries(block.inputs ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key]) => [key, valueKey(child(block, key))]),
  ]
}
const args = (d: any) =>
  Object.entries(d)
    .filter(([key]) => /^args\d+$/.test(key))
    .flatMap(([, value]) => value as any[])
function signature(block: Block): string {
  const values = args(definition(block.type))
    .filter((arg) => arg.type === 'input_value')
    .map((arg) => [arg.name, valueKey(child(block, arg.name))])
  return JSON.stringify([block.type, fields(block), values])
}
function chain(start?: Block): Block[] {
  const result: Block[] = []
  for (let current = start; current; current = current.next?.block) result.push(current)
  return result
}
function statements(block: Block): string[] {
  const listed = args(definition(block.type))
    .filter((arg) => arg.type === 'input_statement')
    .map((arg) => arg.name)
  // O mutator oficial acrescenta senão ao schema base do Se.
  if (block.type === 'sz_js_if_else' && (block.inputs?.ELSE || block.extraState?.hasElse))
    listed.push('ELSE')
  return [...new Set(listed)]
}
function walk(block: Block | undefined, visit: (b: Block) => void) {
  for (const current of chain(block)) {
    visit(current)
    for (const key of statements(current)) walk(child(current, key), visit)
  }
}
function walkInContext(
  block: Block | undefined,
  visit: (b: Block, key: string) => void,
  context: string[] = [],
) {
  for (const current of chain(block)) {
    const own = signature(current)
    visit(current, JSON.stringify([...context, own]))
    for (const key of statements(current))
      walkInContext(child(current, key), visit, [...context, own, key])
  }
}
function containsValue(block: Block | undefined, types: Set<string>): boolean {
  if (!block) return false
  return (
    types.has(block.type) ||
    Object.keys(block.inputs ?? {}).some((key) => containsValue(child(block, key), types))
  )
}
function value(block: Block | undefined): string {
  if (!block) return B.campo('…')
  if (block.type === 'sz_val_number') return B.numero(escapeHtml(block.fields?.NUM))
  if (block.type === 'sz_val_text') return B.texto(block.type, escapeHtml(block.fields?.TEXT))
  return B.valor(block.type, header(block))
}
function argument(block: Block, arg: any): string {
  if (arg.type === 'input_value') return value(child(block, arg.name))
  if (arg.type === 'input_dummy' || arg.type === 'input_statement') return ''
  let raw = block.fields?.[arg.name] ?? arg.value ?? arg.text ?? arg.colour ?? ''
  if (arg.type === 'field_dropdown' && Array.isArray(arg.options))
    raw = arg.options.find((option: any) => String(option[1]) === String(raw))?.[0] ?? raw
  if (arg.type === 'field_number') return B.numero(escapeHtml(raw))
  const field = B.campo(escapeHtml(raw), {
    lista: arg.type === 'field_dropdown' || arg.type.includes('picker'),
  })
  return arg.type === 'field_input' && String(raw).length > 70
    ? field.replace('class="bk-campo"', 'class="bk-campo bk-campo--texto"')
    : field
}
function header(block: Block): string {
  const d = definition(block.type)
  return escapeHtml(d.message0 ?? block.type).replace(/%(\d+)/g, (_, number) =>
    argument(block, d.args0[Number(number) - 1]),
  )
}
function render(block: Block, include: Set<Block>, changed: Set<Block>, compact = true): string {
  // As camadas fornecidas de grupos 3D não podem estreitar o encaixe novo até ficar ilegível.
  // Conservamos seus nomes como caminho e desenhamos a última boca junto da mudança.
  if (compact && !block.type.startsWith('sz_frame_') && !changed.has(block)) {
    const trail: Block[] = []
    let cursor = block
    while (!changed.has(cursor)) {
      const relevant = statements(cursor).flatMap((key) =>
        chain(child(cursor, key)).filter((b) => include.has(b)),
      )
      if (relevant.length !== 1) break
      trail.push(cursor)
      cursor = relevant[0]
    }
    if (trail.length >= 3) {
      const last = trail.pop()!
      const path = trail
        .map((b) =>
          header(b)
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .join(' → ')
      return `<div class="contexto-do-desenho"><b>Dentro de:</b> ${path}</div>${render(last, include, changed, false)}`
    }
  }
  const body = (key: string) => {
    const blocks = chain(child(block, key))
    const pieces: string[] = []
    let omitted = false
    for (const b of blocks) {
      if (include.has(b)) {
        if (omitted) pieces.push(B.pronto('Blocos anteriores', B.cor(block.type)))
        omitted = false
        pieces.push(render(b, include, changed))
      } else omitted = true
    }
    if (omitted) pieces.push(B.pronto('Outros blocos', B.cor(block.type)))
    return pieces.join('') || B.vazio('Encaixe vazio nesta parte')
  }
  if (block.type.startsWith('sz_frame_')) {
    const area = (
      {
        sz_frame_start: 'Ao iniciar',
        sz_frame_events: 'Quando acontecer',
        sz_frame_loops: 'Enquanto estiver rodando',
      } as Record<string, string>
    )[block.type]
    if (!area) throw new Error(`Área desconhecida: ${block.type}`)
    return B.area(area, body('CHILDREN'))
  }
  if (block.type === 'sz_js_if_else') {
    const branches = [{ rotulo: 'então', explica: '', corpo: body('THEN') }]
    if (statements(block).includes('ELSE'))
      branches.push({ rotulo: 'senão', explica: '', corpo: body('ELSE') })
    return B.se(block.type, value(child(block, 'COND')), branches)
  }
  const keys = statements(block)
  if (keys.length) return B.comBoca(block.type, header(block), keys.map(body).join(''))
  return B.bloco(block.type, header(block))
}

export type Drawing = { area: string; html: string; newBlocks: number }
/** Esquemas dos caminhos alterados; uma sequência nova continua sempre inteira. */
export function desenhosDaMudanca(before: any, after: any, focus: string[] = []): Drawing[] {
  const counts = new Map<string, number>()
  const rootsBefore: Block[] = before.blocksState.blocks.blocks
  const rootsAfter: Block[] = after.blocksState.blocks.blocks
  // Um som de vitória não pode consumir a ocorrência idêntica do som de acerto.
  // A identidade da comparação inclui o acontecimento e cada ramo ancestral.
  for (const root of rootsBefore)
    walkInContext(root, (_b, key) => counts.set(key, (counts.get(key) ?? 0) + 1))
  const changed = new Set<Block>()
  for (const root of rootsAfter)
    walkInContext(root, (b, key) => {
      const remaining = counts.get(key) ?? 0
      if (remaining) counts.set(key, remaining - 1)
      else if (!b.type.startsWith('sz_frame_')) changed.add(b)
    })
  if (!changed.size && focus.length) {
    const focusedValues = new Set(focus.filter((type) => definition(type).output))
    for (const root of rootsAfter)
      walk(root, (b) => {
        if (
          focus.includes(b.type) &&
          (b.type !== 'sz_js_if_else' ||
            !focusedValues.size ||
            containsValue(child(b, 'COND'), focusedValues))
        )
          changed.add(b)
      })
  }
  const descendants = (block: Block): Set<Block> => {
    const result = new Set<Block>()
    if (changed.has(block)) result.add(block)
    for (const key of statements(block))
      walk(child(block, key), (b) => {
        if (changed.has(b)) result.add(b)
      })
    return result
  }
  const groups = (block: Block): Set<Block>[] => {
    const selected = descendants(block)
    if (!selected.size) return []
    // Um bloco que a criança acabou de montar leva todo o seu conteúdo consigo.
    if (changed.has(block)) return [selected]
    const relevant = statements(block)
      .flatMap((key) => chain(child(block, key)))
      .filter((b) => descendants(b).size)
    if (relevant.length === 1) return groups(relevant[0])
    // Dois caminhos de controle fornecidos ficam em desenhos separados. Assim uma
    // condição de vitória e um encontro de objetos não disputam a mesma folha.
    if (relevant.filter((b) => statements(b).length).length >= 2) return relevant.flatMap(groups)
    return [selected]
  }
  return rootsAfter.flatMap((root) =>
    groups(root).map((selection) => {
      const include = new Set(selection)
      const propagate = (b?: Block): boolean => {
        let any = false
        for (const current of chain(b)) {
          let relevant = selection.has(current)
          for (const key of statements(current))
            relevant = propagate(child(current, key)) || relevant
          if (relevant) {
            include.add(current)
            any = true
          }
        }
        return any
      }
      // Só percorremos esta raiz; não precisamos incluir a próxima área.
      for (const key of statements(root)) propagate(child(root, key))
      include.add(root)
      const area = (
        {
          sz_frame_start: 'Ao iniciar',
          sz_frame_events: 'Quando acontecer',
          sz_frame_loops: 'Enquanto estiver rodando',
        } as Record<string, string>
      )[root.type]
      return { area, html: render(root, include, selection), newBlocks: selection.size }
    }),
  )
}
