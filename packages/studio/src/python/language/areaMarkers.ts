/**
 * Os comentários de área (`# 📦 Bibliotecas`, `# ⚙️ Ao iniciar`…) no código Python.
 *
 * Cada área com conteúdo começa com o comentário dela, logo acima da primeira linha da área (e
 * acima dos comentários colados a essa linha). O comentário é só para ler: a área de cada linha
 * vem do tipo da linha, nunca do comentário. Este é o único comentário que o Estúdio escreve ou
 * apaga sozinho; as proteções de comentário (sourceEdits/sourceCopies) só aceitam soltar um
 * comentário cujo texto é exatamente um destes.
 */
import { PYTHON_AREA_BY_KIND, PYTHON_AREA_MARKERS, type PythonAreaKind } from '../blocks/areas'
import { nodes } from '../blocks/nodes'
import type { PythonSourceEdit } from './sourceEdits'
import {
  indexPythonSourceLines,
  type PythonSourceLines,
  pythonModuleHeaderEnd,
} from './sourceLines'
import { pythonStatementLines } from './statementMoves'
import type { PythonNode, PythonParsedDocument, PythonToken } from './types'

export interface PythonAreaMarkerPlan {
  edits: PythonSourceEdit[]
  /** Início (offset no documento) de cada comentário de área que sai. */
  dropped: Set<number>
}

const NONE: PythonAreaMarkerPlan = { edits: [], dropped: new Set() }

/** Comentário de área: linha inteira, coluna 0, texto exato (espaço no fim não conta). */
export function isPythonAreaMarkerToken(token: PythonToken, lines: PythonSourceLines): boolean {
  if (token.kind !== 'COMMENT' || !PYTHON_AREA_MARKERS.has(token.text.trimEnd())) return false
  const line = lines.lineAt(token.range.start)
  return line.start === token.range.start && line.end === token.range.end
}

/** Os comentários de área do documento (para soltá-los numa troca do módulo inteiro). */
export function pythonAreaMarkerOffsets(document: PythonParsedDocument): Set<number> {
  const lines = indexPythonSourceLines(document.source)
  return new Set(
    document.tokens
      .filter((token) => isPythonAreaMarkerToken(token, lines))
      .map((token) => token.range.start),
  )
}

/**
 * As linhas inteiras de um comando que divide uma linha com outro (`a = 1; b = 2`), onde
 * `pythonStatementLines` não serve (ela é a régua de mover comandos, e um pedaço de linha não se
 * move sozinho). Comando com decorador fica de fora: a linha dele começa no `@`.
 */
function sharedLines(statement: PythonNode, lines: PythonSourceLines) {
  if (!statement.range) return undefined
  if (nodes(statement.fields.decorator_list) && statement.fields.decorator_list.length) return
  return {
    start: lines.lineAt(statement.range.start).start,
    end: lines.lineAt(statement.range.end).next,
  }
}

/**
 * Acerta os comentários de área para a divisão `areas` (paralela às linhas de topo): um no começo
 * de cada área com conteúdo; os repetidos, os de áreas vazias e os do rodapé saem.
 */
export function planPythonAreaMarkers(
  document: PythonParsedDocument,
  areas: readonly PythonAreaKind[],
): PythonAreaMarkerPlan {
  const body =
    document.tree && nodes(document.tree.fields.body) ? document.tree.fields.body : undefined
  if (!body || body.length !== areas.length) return NONE
  const source = document.source
  const lines = indexPythonSourceLines(source)
  const ranges = body.map(
    (statement) =>
      pythonStatementLines(document, statement, lines) ?? sharedLines(statement, lines),
  )
  if (ranges.some((range) => !range)) return NONE
  const newline = /\r\n|\r|\n/.exec(source)?.[0] ?? '\n'
  const markers = document.tokens.filter((token) => isPythonAreaMarkerToken(token, lines))
  const header = pythonModuleHeaderEnd(source, lines)
  const removals: { start: number; end: number; token: number; blankAbove?: number }[] = []
  const insertions: { offset: number; text: string }[] = []
  const markersIn = (start: number, end: number) =>
    markers.filter((token) => token.range.start >= start && token.range.start < end)
  const blankLine = (line: { start: number; end: number }) =>
    /^[\t \f]*$/.test(source.slice(line.start, line.end))
  const removeLine = (token: PythonToken) => {
    const line = lines.lineAt(token.range.start)
    const start = line.start
    let end = line.next
    const before = line.start > 0 ? lines.lineAt(line.start - 1) : undefined
    const after = end < source.length ? lines.lineAt(end) : undefined
    // A separação que vinha depois dele também sai quando sobraria no começo do arquivo ou
    // grudada em outra linha em branco (organizar e desfazer não deixam buraco).
    if (
      after &&
      blankLine(after) &&
      after.next > end &&
      (line.start <= header || !before || blankLine(before))
    )
      end = after.next
    // A linha em branco de cima é a separação que o comentário trouxe quando entrou: com o
    // código logo embaixo, ela sobraria no meio da área (trocar a primeira linha e desfazer).
    // Decidido no fim: se outro comentário de área entra ali, ela continua sendo a separação.
    const blankAbove =
      end === line.next && before && blankLine(before) && before.start >= header && after
        ? !blankLine(after)
          ? before.start
          : undefined
        : undefined
    removals.push({ start, end, token: token.range.start, blankAbove })
  }
  let previousEnd = 0
  // O comentário de uma área que começou no meio de uma linha, à espera da próxima linha dela.
  let deferred: string | undefined
  body.forEach((_, index) => {
    const range = ranges[index]!
    const opens = index === 0 || areas[index] !== areas[index - 1]
    if (opens) deferred = undefined
    // `A = 1; b = 2`: o segundo divide a linha com o de cima, e não cabe comentário entre eles.
    // Se uma área começa nele, o comentário dela vai para a próxima linha própria da área.
    const shared = range.start < previousEnd
    const own = opens ? PYTHON_AREA_BY_KIND.get(areas[index]!)!.marker : deferred
    if (shared) deferred = own
    const wanted = shared ? undefined : own
    if (!shared) deferred = undefined
    const region = shared ? [] : markersIn(previousEnd, range.start)
    let kept = false
    for (const token of region) {
      if (!kept && token.text === wanted) {
        kept = true
        continue
      }
      removeLine(token)
    }
    if (wanted && !kept) {
      // Os comentários de área desta região saem todos: contam como linhas que não existem.
      const removed = new Set(region.map((token) => lines.lineAt(token.range.start).start))
      // Acima do bloco de comentários colado à primeira linha da área. Só os da coluna 0: um
      // comentário recuado é o fim do bloco de cima (o corpo de uma função), e fica com ele.
      let offset = range.start
      while (offset > Math.max(previousEnd, header)) {
        const above = lines.lineAt(offset - 1)
        const text = source.slice(above.start, above.end)
        if (!removed.has(above.start) && !text.startsWith('#')) break
        offset = above.start
      }
      offset = Math.max(offset, header)
      let probe = offset
      while (probe > 0 && removed.has(lines.lineAt(probe - 1).start))
        probe = lines.lineAt(probe - 1).start
      const before = probe > 0 ? lines.lineAt(probe - 1) : undefined
      const blank = !before || /^[\t \f]*$/.test(source.slice(before.start, before.end))
      insertions.push({ offset, text: `${blank ? '' : newline}${wanted}${newline}` })
    }
    previousEnd = Math.max(previousEnd, range.end)
  })
  for (const token of markersIn(previousEnd, source.length + 1)) removeLine(token)
  // O arquivo não começa com linha em branco antes do primeiro comentário de área: é a sobra da
  // separação de uma área que mudou (organizar e desfazer). Só no começo do arquivo, nunca depois
  // de shebang ou codificação, e só quando o que vem depois é (ou vai ser) um comentário de área.
  if (header === 0) {
    let end = 0
    while (end < source.length) {
      const line = lines.lineAt(end)
      if (line.next <= end || !/^[\t \f]*$/.test(source.slice(line.start, line.end))) break
      end = line.next
    }
    const markerNext =
      markers.some(
        (token) =>
          token.range.start === end &&
          !removals.some((removal) => removal.token === token.range.start),
      ) || insertions.some((insertion) => insertion.offset === end)
    if (end > 0 && markerNext) removals.push({ start: 0, end, token: -1 })
  }
  if (!removals.length && !insertions.length) return NONE
  // A separação de cima sai junto só onde nada entra nem sai no caminho dela.
  for (const removal of removals) {
    const above = removal.blankAbove
    if (above === undefined) continue
    const free =
      !insertions.some(
        (insertion) => insertion.offset >= above && insertion.offset <= removal.start,
      ) &&
      !removals.some(
        (other) => other !== removal && other.start < removal.start && other.end > above,
      )
    if (free) removal.start = above
  }
  // Uma remoção e uma inserção no mesmo lugar viram uma troca só.
  const byStart = new Map<number, PythonSourceEdit>()
  for (const removal of removals)
    byStart.set(removal.start, {
      range: { start: removal.start, end: removal.end },
      expected: source.slice(removal.start, removal.end),
      replacement: '',
    })
  for (const insertion of insertions) {
    const existing = byStart.get(insertion.offset)
    if (existing) existing.replacement = insertion.text + existing.replacement
    else
      byStart.set(insertion.offset, {
        range: { start: insertion.offset, end: insertion.offset },
        expected: '',
        replacement: insertion.text,
      })
  }
  const edits = [...byStart.values()].sort((a, b) => a.range.start - b.range.start)
  return {
    edits,
    dropped: new Set(removals.map((removal) => removal.token).filter((token) => token >= 0)),
  }
}
