import type { PythonBlockCodec } from '../blocks/contract'
import { isNode, node, nodes, pythonSemanticTree } from '../blocks/nodes'
import { type PythonBlockProjection, pythonVisualToAST } from '../blocks/projection'
import { planPythonBranchInsertion, planPythonBranchRemoval } from './branchEdits'
import { composePythonCopiedEdit } from './composeCopiedEdit'
import { planPythonIdentifierEdit } from './identifierEdits'
import type { PythonAnalysisSession } from './session'
import { assertPythonCommentsPreserved, type PythonSourceCopy } from './sourceCopies'
import { applyPythonSourceEdits, type PythonSourceEdit } from './sourceEdits'
import {
  consolidatePythonTransferredEdits,
  joinPythonSourceFragments,
  type PythonSourceFragment,
} from './sourceFragments'
import { indexPythonSourceLines, type PythonSourceLines } from './sourceLines'
import { samePythonSourceTree } from './sourceTree'
import { type PythonStatementInsertion, planPythonStatementInsertions } from './statementInsertions'
import {
  type PythonStatementMove,
  planPythonStatementMoves,
  pythonStatementLines,
} from './statementMoves'
import {
  planPythonStatementTransfers,
  pythonNodeAtTemplatePath,
  pythonTransferTemplate,
  reindentPythonTransferredFragment,
} from './statementTransfers'
import { relocatePythonTypeIgnores } from './typeIgnorePositions'
import {
  type PythonAnalysisIdentity,
  type PythonNode,
  type PythonParsedDocument,
  type PythonToken,
  type PythonValue,
  samePythonAnalysisIdentity,
} from './types'

interface Replacement {
  kind: 'replace'
  before: PythonNode
  after: PythonNode
}
type VisualChange =
  | Replacement
  | { kind: 'edit'; edit: PythonSourceEdit }
  | { kind: 'insert'; insertion: PythonStatementInsertion }
  | {
      kind: 'move'
      edit: PythonSourceEdit
      children: { copy: PythonSourceCopy; changes: VisualChange[] }[]
      insertions: PythonStatementMove['insertions']
    }
const expressions = new Set([
  'Name',
  'Constant',
  'BinOp',
  'UnaryOp',
  'BoolOp',
  'Compare',
  'IfExp',
  'Call',
  'Attribute',
  'Subscript',
  'List',
  'Tuple',
  'Set',
  'Dict',
  'JoinedStr',
  'ListComp',
  'SetComp',
  'DictComp',
  'GeneratorExp',
  'Lambda',
  'Await',
  'Yield',
  'YieldFrom',
  'NamedExpr',
])
const statements = new Set([
  'FunctionDef',
  'AsyncFunctionDef',
  'ClassDef',
  'Return',
  'Delete',
  'Assign',
  'AugAssign',
  'AnnAssign',
  'For',
  'AsyncFor',
  'While',
  'If',
  'With',
  'AsyncWith',
  'Match',
  'Raise',
  'Try',
  'TryStar',
  'Assert',
  'Import',
  'ImportFrom',
  'Global',
  'Nonlocal',
  'Expr',
  'Pass',
  'Break',
  'Continue',
])
const semantic = (value: PythonValue) => JSON.stringify(pythonSemanticTree(value))

/** Reuse surrounding parentheses instead of nesting another pair on every gesture. */
function alreadyParenthesized(source: string, start: number, end: number) {
  while (start > 0 && /[ \t\r\n\f]/.test(source[start - 1]!)) start--
  while (end < source.length && /[ \t\r\n\f]/.test(source[end]!)) end++
  return source[start - 1] === '(' && source[end] === ')'
}

/** Indent syntax, not characters that belong to a multiline Python string. */
function indentFragment(source: string, tokens: PythonToken[], newline: string, indent: string) {
  const literals = tokens
    .filter(
      (token) =>
        ['STRING', 'FSTRING_MIDDLE', 'TSTRING_MIDDLE'].includes(token.kind) &&
        token.text.includes('\n'),
    )
    .map((token) => token.range)
    .sort((a, b) => a.start - b.start)
  let literal = 0,
    previous = 0
  const parts: string[] = []
  for (let index = source.indexOf('\n'); index !== -1; index = source.indexOf('\n', index + 1)) {
    while (literal < literals.length && literals[literal]!.end <= index) literal++
    const inside =
      literal < literals.length &&
      literals[literal]!.start <= index &&
      literals[literal]!.end > index
    parts.push(source.slice(previous, index), inside ? '\n' : `${newline}${indent}`)
    previous = index + 1
  }
  parts.push(source.slice(previous))
  return parts.join('')
}

/** Find the smallest independently renderable changed ranges, preserving everything else. */
function createPythonVisualPlanner(
  document: PythonParsedDocument,
  sourceLines: PythonSourceLines,
  transferredComments: ReadonlySet<number>,
) {
  function compare(a: PythonNode, b: PythonNode): VisualChange[] | null {
    if (samePythonSourceTree(a, b)) return []
    const whole = (): VisualChange[] | null =>
      (a.range && (expressions.has(a.kind) || statements.has(a.kind))) || a.kind === 'Module'
        ? [{ kind: 'replace', before: a, after: b }]
        : null
    if (
      a.kind !== b.kind ||
      a.kind === 'JoinedStr' ||
      (a.id && b.id && a.id !== b.id) ||
      Object.keys(a.fields).length !== Object.keys(b.fields).length
    )
      return whole()
    const changes: VisualChange[] = []
    for (const [key, oldValue] of Object.entries(a.fields)) {
      const newValue = b.fields[key]
      if (newValue === undefined) return whole()
      if (samePythonSourceTree(oldValue, newValue)) continue
      const identifier = planPythonIdentifierEdit(document, a, key, newValue)
      if (identifier) {
        changes.push({ kind: 'edit', edit: identifier })
        continue
      }
      if (
        ['body', 'orelse', 'finalbody'].includes(key) &&
        nodes(oldValue) &&
        nodes(newValue) &&
        oldValue.every((value) => statements.has(value.kind)) &&
        newValue.every((value) => statements.has(value.kind))
      ) {
        const removedBranch = planPythonBranchRemoval(
          document,
          a,
          key,
          newValue,
          sourceLines,
          transferredComments,
        )
        if (removedBranch) {
          changes.push({ kind: 'edit', edit: removedBranch })
          continue
        }
        const insertedBranch = planPythonBranchInsertion(document, a, key, newValue, sourceLines)
        if (insertedBranch) {
          changes.push({ kind: 'insert', insertion: insertedBranch })
          continue
        }
        const moved = planPythonStatementMoves(
          document,
          oldValue,
          newValue,
          sourceLines,
          transferredComments,
        )
        if (moved) {
          const children: { copy: PythonSourceCopy; changes: VisualChange[] }[] = []
          for (const retained of moved.retained) {
            const edits = compare(retained.before, retained.after)
            if (!edits) return whole()
            if (edits.length) children.push({ copy: retained.copy, changes: edits })
          }
          changes.push({ kind: 'move', edit: moved.edit, children, insertions: moved.insertions })
          continue
        }
        const inserted = planPythonStatementInsertions(
          document,
          oldValue,
          newValue,
          sourceLines,
          a.kind === 'Module',
        )
        if (inserted) {
          for (const { before, after } of inserted.retained) {
            const children = compare(before, after)
            if (!children) return whole()
            changes.push(...children)
          }
          changes.push(
            ...inserted.insertions.map((insertion) => ({ kind: 'insert' as const, insertion })),
          )
          continue
        }
      }
      if (isNode(oldValue) && isNode(newValue)) {
        const children = compare(oldValue, newValue)
        if (!children) return whole()
        changes.push(...children)
      } else if (
        Array.isArray(oldValue) &&
        Array.isArray(newValue) &&
        oldValue.length === newValue.length
      ) {
        for (let index = 0; index < oldValue.length; index++) {
          const oldChild = oldValue[index]!,
            newChild = newValue[index]!
          if (samePythonSourceTree(oldChild, newChild)) continue
          if (
            !isNode(oldChild) ||
            !isNode(newChild) ||
            (oldChild.id && newChild.id && oldChild.id !== newChild.id)
          )
            return whole()
          const children = compare(oldChild, newChild)
          if (!children) return whole()
          changes.push(...children)
        }
      } else return whole()
    }
    return changes
  }
  return (before: PythonNode, after: PythonNode) => {
    const changes = compare(before, after)
    if (!changes) throw new Error('Este trecho precisa ser editado no modo fonte.')
    return changes
  }
}

/** A standalone target fragment renders as a load; its parent restores Store/Del in the full AST. */
function expressionForRendering(value: PythonNode): PythonNode {
  if (!['Name', 'Attribute', 'Subscript', 'List', 'Tuple', 'Starred'].includes(value.kind))
    return value
  return node(value.kind, {
    ...value.fields,
    ctx: node('Load'),
    ...(value.kind === 'Starred' && isNode(value.fields.value)
      ? { value: expressionForRendering(value.fields.value) }
      : {}),
    ...(['List', 'Tuple'].includes(value.kind) && Array.isArray(value.fields.elts)
      ? {
          elts: value.fields.elts.map((item) =>
            isNode(item) ? expressionForRendering(item) : item,
          ),
        }
      : {}),
  })
}

export interface PreparedPythonVisualTransaction {
  expected: { identity: PythonAnalysisIdentity; source: string }
  parsed: PythonParsedDocument
  edits: PythonSourceEdit[]
}

/** Produces a verified candidate. The editor must compare expected again at synchronous commit. */
export async function preparePythonVisualTransaction(options: {
  document: PythonParsedDocument
  projection: PythonBlockProjection
  codecs?: readonly PythonBlockCodec[]
  nextIdentity: PythonAnalysisIdentity
  current(): { identity: PythonAnalysisIdentity; source: string }
  analysis: Pick<PythonAnalysisSession, 'parse' | 'render'>
  signal?: AbortSignal
}): Promise<PreparedPythonVisualTransaction> {
  const document = structuredClone(options.document)
  const projection = structuredClone(options.projection)
  const codecs = options.codecs ? [...options.codecs] : undefined
  const nextIdentity = structuredClone(options.nextIdentity)
  const { current, analysis, signal } = options
  if (!document.tree || document.diagnostics.length)
    throw new Error('Corrija a sintaxe antes de alterar os blocos.')
  if (
    nextIdentity.projectId !== document.identity.projectId ||
    nextIdentity.instanceId !== document.identity.instanceId ||
    nextIdentity.path !== document.identity.path ||
    nextIdentity.generation <= document.identity.generation
  )
    throw new Error('A edição precisa de uma nova geração do mesmo arquivo.')
  const expected = { identity: document.identity, source: document.source }
  function checkCurrent() {
    if (signal?.aborted) throw new DOMException('Edição cancelada.', 'AbortError')
    assertPythonVisualTransactionCurrent(expected, current())
  }
  checkCurrent()
  const tree = pythonVisualToAST(projection, codecs)
  const sourceLines = indexPythonSourceLines(document.source)
  const { transfers, comments } = planPythonStatementTransfers(document, tree, sourceLines)
  const copyScope = transfers.size ? { start: 0, end: document.source.length } : undefined
  const findChanges = createPythonVisualPlanner(document, sourceLines, comments)
  const changes = findChanges(document.tree, tree)
  const newline = /\r\n|\r|\n/.exec(document.source)?.[0] ?? '\n'
  async function renderInsertion(
    insertion: Pick<PythonStatementInsertion, 'nodes' | 'indent' | 'leadingNewline' | 'header'>,
  ): Promise<PythonSourceFragment> {
    const header = insertion.header
      ? `${insertion.header.indent}${insertion.header.keyword}:${newline}`
      : ''
    const fragments: PythonSourceFragment[] = [
      { text: `${insertion.leadingNewline ? newline : ''}${header}`, copies: [] },
    ]
    let pending: PythonNode[] = []
    const appendNew = async () => {
      if (!pending.length) return
      fragments.push(await renderNewCommands(pending, insertion.indent))
      pending = []
    }
    for (const value of insertion.nodes) {
      const transferred = value.id && transfers.get(value.id)
      if (!transferred) {
        pending.push(value)
        continue
      }
      await appendNew()
      fragments.push(await renderTransferredCommand(value, insertion.indent))
    }
    await appendNew()
    return joinPythonSourceFragments(fragments)
  }
  async function renderTransferredCommand(
    value: PythonNode,
    destinationIndent: string,
  ): Promise<PythonSourceFragment> {
    const transferred = value.id && transfers.get(value.id)
    if (!transferred) throw new Error('A origem do comando transferido não está disponível.')
    const { before, range, indent } = transferred
    const copy = { source: range, target: 0 }
    const original = document.source.slice(range.start, range.end)
    const changed = composePythonCopiedEdit(
      document.source,
      {
        range,
        expected: original,
        replacement: original,
        copies: [copy],
      },
      [
        {
          copy,
          edits: [
            ...(transferred.elif
              ? [{ range: transferred.elif, expected: 'elif', replacement: 'if' }]
              : []),
            ...(await renderChanges(findChanges(before, value))),
          ],
        },
      ],
      [],
      copyScope,
    )
    let fragment: PythonSourceFragment = {
      text: changed.replacement,
      copies: [...(changed.copies ?? [])],
    }
    if (indent !== destinationIndent) {
      const prefix = indent ? 'if True:\n' : ''
      const parsed = await analysis.parse(nextIdentity, prefix + fragment.text, signal)
      checkCurrent()
      if (!parsed.tree || parsed.diagnostics.length)
        throw new Error('Não foi possível mover este comando Python.')
      fragment = reindentPythonTransferredFragment(
        document.source,
        fragment,
        parsed.tokens,
        prefix.length,
        indent,
        destinationIndent,
      )
    }
    return /[\r\n]$/.test(fragment.text)
      ? fragment
      : joinPythonSourceFragments([fragment, { text: newline, copies: [] }])
  }
  async function renderNewCommands(
    nodes: PythonNode[],
    indent: string,
  ): Promise<PythonSourceFragment> {
    checkCurrent()
    const template = pythonTransferTemplate(
      node('Module', { body: nodes, type_ignores: [] }),
      transfers,
    )
    let rendered = await analysis.render(template.tree, signal)
    checkCurrent()
    if (rendered.includes('\n')) {
      const fragment = await analysis.parse(nextIdentity, rendered, signal)
      checkCurrent()
      if (!fragment.tree || fragment.diagnostics.length)
        throw new Error('Não foi possível inserir o comando Python.')
      rendered = indentFragment(rendered, fragment.tokens, newline, indent)
    }
    const text = `${indent}${rendered}${newline}`
    if (!template.slots.length) return { text, copies: [] }
    const prefix = indent ? 'if True:\n' : ''
    const generated = await analysis.parse(nextIdentity, prefix + text, signal)
    checkCurrent()
    if (!generated.tree || generated.diagnostics.length)
      throw new Error('Não foi possível gerar a estrutura do novo comando Python.')
    const body = indent
      ? pythonNodeAtTemplatePath(generated.tree, ['body', 0]).fields.body
      : generated.tree.fields.body
    const generatedModule = node('Module', { body: body!, type_ignores: [] })
    if (semantic(generatedModule) !== semantic(template.tree))
      throw new Error('A estrutura do novo comando Python mudou durante a geração.')
    const indexed = indexPythonSourceLines(generated.source)
    const replacements = template.slots
      .map((slot) => {
        const placeholder = pythonNodeAtTemplatePath(generatedModule, slot.path)
        const range = pythonStatementLines(generated, placeholder, indexed)
        if (!range || placeholder.kind !== 'Pass')
          throw new Error('A posição do comando transferido não está disponível.')
        return {
          value: slot.value,
          range,
          indent: generated.source.slice(range.start, placeholder.range!.start),
        }
      })
      .sort((a, b) => a.range.start - b.range.start)
    const fragments: PythonSourceFragment[] = []
    let position = 0
    for (const replacement of replacements) {
      const start = replacement.range.start - prefix.length
      const end = replacement.range.end - prefix.length
      if (start < position || end > text.length)
        throw new Error('As posições dos comandos transferidos se sobrepõem.')
      fragments.push({ text: text.slice(position, start), copies: [] })
      fragments.push(await renderTransferredCommand(replacement.value, replacement.indent))
      position = end
    }
    fragments.push({ text: text.slice(position), copies: [] })
    return joinPythonSourceFragments(fragments)
  }
  async function renderChanges(changes: readonly VisualChange[]): Promise<PythonSourceEdit[]> {
    const replacements = changes.filter((change) => change.kind === 'replace')
    const insertions = changes
      .filter((change) => change.kind === 'insert')
      .map((change) => change.insertion)
    const edits = changes.filter((change) => change.kind === 'edit').map((change) => change.edit)
    for (const move of changes.filter((change) => change.kind === 'move')) {
      checkCurrent()
      const children: { copy: PythonSourceCopy; edits: PythonSourceEdit[] }[] = []
      for (const child of move.children) {
        children.push({ copy: child.copy, edits: await renderChanges(child.changes) })
        checkCurrent()
      }
      const additions: ({ before?: PythonSourceCopy } & PythonSourceFragment)[] = []
      for (const insertion of move.insertions)
        additions.push({ before: insertion.before, ...(await renderInsertion(insertion)) })
      edits.push(
        composePythonCopiedEdit(document.source, move.edit, children, additions, copyScope),
      )
    }
    for (const replacement of replacements) {
      checkCurrent()
      const range =
        replacement.before.kind === 'Module'
          ? { start: 0, end: document.source.length }
          : replacement.before.range!
      const original = document.source.slice(range.start, range.end)
      // Reject comment loss before asking the worker to generate anything.
      applyPythonSourceEdits(document, expected, [{ range, expected: original, replacement: '' }])
      const expression =
        expressions.has(replacement.before.kind) && expressions.has(replacement.after.kind)
      let rendered = await analysis.render(
        expression ? expressionForRendering(replacement.after) : replacement.after,
        signal,
      )
      checkCurrent()
      if (expression) {
        // The final full-program AST comparison still proves precedence/meaning.
        if (!alreadyParenthesized(document.source, range.start, range.end))
          rendered = `(${rendered})`
      } else {
        const lineStart = sourceLines.lineAt(range.start).start
        const prefix = document.source.slice(lineStart, range.start)
        const indent = /^[\t ]*$/.test(prefix) ? prefix : ''
        if (rendered.includes('\n')) {
          const fragment = await analysis.parse(nextIdentity, rendered, signal)
          checkCurrent()
          if (!fragment.tree || fragment.diagnostics.length)
            throw new Error('O trecho gerado precisa ser editado no modo fonte.')
          rendered = indentFragment(rendered, fragment.tokens, newline, indent)
        }
        if (replacement.before.kind === 'Module' && /[\r\n]$/.test(original)) rendered += newline
      }
      edits.push({ range, expected: original, replacement: rendered })
    }
    const insertionText = new Map<number, PythonSourceFragment[]>()
    for (const insertion of insertions) {
      const rendered = await renderInsertion(insertion)
      const pieces = insertionText.get(insertion.offset) ?? []
      pieces.push(rendered)
      insertionText.set(insertion.offset, pieces)
    }
    // Nested and enclosing appends can share a line boundary. Traversal yields
    // inner statements first; coalesce once, preserving both order and copy offsets.
    for (const [offset, pieces] of insertionText) {
      const rendered = joinPythonSourceFragments(pieces)
      const following = edits.find((edit) => edit.range.start === offset && edit.range.end > offset)
      if (following) {
        following.replacement = rendered.text + following.replacement
        following.copies = [
          ...rendered.copies,
          ...(following.copies ?? []).map((copy) => ({
            ...copy,
            target: copy.target + rendered.text.length,
          })),
        ]
      } else
        edits.push({
          range: { start: offset, end: offset },
          expected: '',
          replacement: rendered.text,
          copies: rendered.copies,
        })
    }
    return edits
  }
  const renderedEdits = await renderChanges(changes)
  const edits = transfers.size
    ? [consolidatePythonTransferredEdits(document.source, renderedEdits)]
    : renderedEdits
  checkCurrent()
  const source = applyPythonSourceEdits(document, current(), edits)
  const parsed = await analysis.parse(nextIdentity, source, signal)
  checkCurrent()
  if (
    !parsed.tree ||
    parsed.diagnostics.length ||
    parsed.source !== source ||
    !samePythonAnalysisIdentity(parsed.identity, nextIdentity)
  )
    throw new Error('A alteração visual não produziu um programa Python válido.')
  assertPythonCommentsPreserved(document, parsed, edits)
  if (semantic(parsed.tree) !== semantic(relocatePythonTypeIgnores(document, tree, edits, source)))
    throw new Error(
      'A alteração mudaria outro significado do programa. Edite este trecho no modo fonte.',
    )
  return { expected, parsed, edits }
}

export function assertPythonVisualTransactionCurrent(
  expected: PreparedPythonVisualTransaction['expected'],
  current: PreparedPythonVisualTransaction['expected'],
) {
  if (
    !samePythonAnalysisIdentity(expected.identity, current.identity) ||
    expected.source !== current.source
  )
    throw new Error('O código mudou. Atualize os blocos antes de aplicar esta edição.')
}
