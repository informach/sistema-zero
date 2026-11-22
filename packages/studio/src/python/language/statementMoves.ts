import { nodes, pythonSemanticTree } from '../blocks/nodes'
import type { PythonSourceCopy } from './sourceCopies'
import type { PythonSourceEdit } from './sourceEdits'
import { indexPythonSourceLines, type PythonSourceLines } from './sourceLines'
import { samePythonSourceTree } from './sourceTree'
import type { PythonNode, PythonParsedDocument, PythonSourceRange } from './types'

/** Physical lines owned by a statement; inline suites/semicolon siblings need a token planner. */
export function pythonStatementLines(
  document: PythonParsedDocument,
  statement: PythonNode,
  lines: PythonSourceLines,
) {
  if (!statement.range || !statement.id) return
  let start = statement.range.start
  if (nodes(statement.fields.decorator_list) && statement.fields.decorator_list.length) {
    const first = statement.fields.decorator_list[0]!.range
    if (!first) return
    let at: number | undefined
    let low = 0,
      high = document.tokens.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (document.tokens[middle]!.range.end <= first.start) low = middle + 1
      else high = middle
    }
    for (let index = low - 1; index >= 0; index--) {
      const token = document.tokens[index]!
      if (token.range.end > first.start) continue
      if (token.kind === 'OP' && token.text === '@') {
        at = token.range.start
        break
      }
      if (!['NL', 'COMMENT'].includes(token.kind) && !(token.kind === 'OP' && token.text === '('))
        return
    }
    if (at === undefined) return
    start = at
  }
  const line = lines.lineAt(start).start
  if (!/^[\t ]*$/.test(document.source.slice(line, start))) return
  const { end, next } = lines.lineAt(statement.range.end)
  // Um `;` sozinho no fim (`x = 1;`) ainda é a linha dele; outro comando depois do `;` não é.
  const trailing = document.source.slice(statement.range.end, end)
  if (!/^[\t \f]*(?:;[\t \f]*)?(?:#[^\r\n]*)?$/.test(trailing)) return
  return { start: line, end: next }
}

/**
 * As linhas físicas de um comando que divide a linha com outro (`a = 1; b = 2`): os comandos da
 * mesma linha andam juntos, como uma peça só. Decorado não entra (o `@` é outra régua).
 */
function sharedStatementLines(statement: PythonNode, lines: PythonSourceLines) {
  if (!statement.range || !statement.id) return
  if (nodes(statement.fields.decorator_list) && statement.fields.decorator_list.length) return
  return {
    start: lines.lineAt(statement.range.start).start,
    end: lines.lineAt(statement.range.end).next,
  }
}

/** Move/delete unchanged module statements without regenerating their spelling or comments. */
export function planPythonModuleMoves(
  document: PythonParsedDocument,
  after: PythonNode,
  lines?: PythonSourceLines,
): PythonSourceEdit | undefined {
  const before = document.tree
  if (
    before?.kind !== 'Module' ||
    after.kind !== 'Module' ||
    !nodes(before.fields.body) ||
    !nodes(after.fields.body) ||
    !before.fields.body.length
  )
    return
  if (
    JSON.stringify(pythonSemanticTree(before.fields.type_ignores!)) !==
    JSON.stringify(pythonSemanticTree(after.fields.type_ignores!))
  )
    return
  const originals = before.fields.body
  const remaining = after.fields.body
  const plan = planPythonStatementMoves(document, originals, remaining, lines)
  return plan &&
    !plan.insertions.length &&
    plan.retained.every(({ before, after }) => samePythonSourceTree(before, after))
    ? plan.edit
    : undefined
}

export interface PythonStatementMove {
  edit: PythonSourceEdit
  retained: { before: PythonNode; after: PythonNode; copy: PythonSourceCopy }[]
  insertions: {
    before?: PythonSourceCopy
    nodes: PythonNode[]
    indent: string
    leadingNewline: boolean
  }[]
}

/** Existing sibling suites only; callers keep branch headers outside the edit. */
export function planPythonStatementMoves(
  document: PythonParsedDocument,
  originals: readonly PythonNode[],
  remaining: readonly PythonNode[],
  lines?: PythonSourceLines,
  transferredComments?: ReadonlySet<number>,
): PythonStatementMove | undefined {
  if (!originals.length) return
  if (
    remaining.length === originals.length &&
    remaining.every((item, index) => item.id === originals[index]!.id)
  )
    return
  const indexed = lines ?? indexPythonSourceLines(document.source)
  if (indexed.source !== document.source) throw new Error('O índice pertence a outra fonte Python.')
  const records = originals.map((value) => ({
    value,
    range: pythonStatementLines(document, value, indexed) ?? sharedStatementLines(value, indexed),
  }))
  if (records.some((record) => !record.range)) return
  // As peças que andam: cada comando na sua linha, ou os comandos que dividem uma linha juntos
  // (eles só andam juntos e na mesma ordem; se o plano os separa, só este planejador desiste).
  const units: { range: { start: number; end: number }; members: typeof records }[] = []
  for (const record of records) {
    const last = units.at(-1)
    if (last && record.range!.start < last.range.end) {
      last.range.end = Math.max(last.range.end, record.range!.end)
      last.members.push(record)
    } else units.push({ range: { ...record.range! }, members: [record] })
  }
  const unitOf = new Map(
    units.flatMap((unit) => unit.members.map((member) => [member.value.id, unit] as const)),
  )
  const ids = new Set<string>()
  const byId = new Map(records.map((record) => [record.value.id, record]))
  const ordered = remaining.filter((item) => byId.has(item.id))
  // The insertion-only planner preserves its existing module/footer placement.
  if (
    remaining.length > originals.length &&
    ordered.length === originals.length &&
    ordered.every((item, index) => item.id === originals[index]!.id)
  )
    return
  for (const item of remaining) {
    const old = byId.get(item.id)
    if (!old) continue
    if (!item.id || ids.has(item.id)) return
    ids.add(item.id)
  }
  const start = units[0]!.range.start,
    end = units.at(-1)!.range.end
  const newline = /\r\n|\r|\n/.exec(document.source)?.[0] ?? '\n'
  const indent = /^[\t ]*/.exec(document.source.slice(start))![0]
  const fragments: string[] = []
  let replacementLength = 0,
    lastCharacter = ''
  const copies: PythonSourceCopy[] = []
  const appendText = (text: string) => {
    if (!text) return
    fragments.push(text)
    replacementLength += text.length
    lastCharacter = text.at(-1)!
  }
  const append = (range: { start: number; end: number }) => {
    const copy = { source: range, target: replacementLength }
    copies.push(copy)
    appendText(document.source.slice(range.start, range.end))
    return copy
  }
  // Trivia between statements belongs to the following statement. File header
  // and footer stay outside this edit; annotations of deleted code remain visible.
  const segments = new Map(
    units.map((unit, index) => [
      unit,
      { start: index ? units[index - 1]!.range.end : start, end: unit.range.end },
    ]),
  )
  const annotations = new Map<(typeof units)[number], PythonSourceRange[]>()
  let owner = 0
  let firstToken = 0,
    highToken = document.tokens.length
  while (firstToken < highToken) {
    const middle = (firstToken + highToken) >>> 1
    if (document.tokens[middle]!.range.start < start) firstToken = middle + 1
    else highToken = middle
  }
  for (let tokenIndex = firstToken; tokenIndex < document.tokens.length; tokenIndex++) {
    const token = document.tokens[tokenIndex]!
    if (token.range.start >= end) break
    if (token.kind !== 'COMMENT' || token.range.start < start || token.range.end > end) continue
    while (owner < units.length - 1 && token.range.start >= units[owner]!.range.end) owner++
    const unit = units[owner]!
    const ranges = annotations.get(unit) ?? []
    ranges.push(token.range)
    annotations.set(unit, ranges)
  }
  // Os comentários de um comando que saiu ficam ONDE estavam: antes do próximo comando que fica
  // (na ordem do arquivo), ou no fim. Antes iam para o topo, e o desfazer não os devolvia ao
  // lado da linha (full review das áreas, 22/11/2026).
  const orphans = new Map<(typeof units)[number] | undefined, PythonSourceRange[]>()
  let waiting: PythonSourceRange[] = []
  for (const unit of units) {
    const kept = unit.members.filter((member) => ids.has(member.value.id!)).length
    // Apagar só um dos comandos da linha: a peça não pode ir pela metade.
    if (kept && kept < unit.members.length) return
    if (kept) {
      if (waiting.length) orphans.set(unit, waiting)
      waiting = []
      continue
    }
    for (const range of annotations.get(unit) ?? [])
      if (!transferredComments?.has(range.start)) waiting.push(range)
  }
  if (waiting.length) orphans.set(undefined, waiting)
  const appendOrphans = (unit: (typeof units)[number] | undefined) => {
    for (const range of orphans.get(unit) ?? []) {
      if (replacementLength && lastCharacter !== '\r' && lastCharacter !== '\n') appendText(newline)
      appendText(indent)
      append(range)
      appendText(newline)
    }
  }
  const retained: PythonStatementMove['retained'] = []
  const insertions: PythonStatementMove['insertions'] = []
  let pending: PythonNode[] = []
  for (let index = 0; index < remaining.length; index++) {
    const item = remaining[index]!
    if (!byId.has(item.id)) {
      pending.push(item)
      continue
    }
    const unit = unitOf.get(item.id)!
    // A peça entra inteira, na ordem do arquivo, a partir do primeiro comando dela.
    if (unit.members.some((member, offset) => remaining[index + offset]?.id !== member.value.id))
      return
    appendOrphans(unit)
    if (replacementLength && lastCharacter !== '\r' && lastCharacter !== '\n') appendText(newline)
    const copy = append(segments.get(unit)!)
    if (pending.length) {
      insertions.push({ before: copy, nodes: pending, indent, leadingNewline: false })
      pending = []
    }
    for (const [offset, member] of unit.members.entries())
      retained.push({ before: member.value, after: remaining[index + offset]!, copy })
    index += unit.members.length - 1
  }
  appendOrphans(undefined)
  if (pending.length)
    insertions.push({
      nodes: pending,
      indent,
      leadingNewline: replacementLength > 0 && lastCharacter !== '\r' && lastCharacter !== '\n',
    })
  return {
    edit: {
      range: { start, end },
      expected: document.source.slice(start, end),
      replacement: fragments.join(''),
      copies,
    },
    retained,
    insertions,
  }
}
