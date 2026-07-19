import type { CSSEntry, CSSRule } from '#ir'
import { normalizeDeclKey, normalizeSelector, parseCSSWithSpans } from '#parsers'

/**
 * Estrutura simples de source-map: para cada __id de nó da IR registramos
 * em qual arquivo, linha inicial e linha final ele foi emitido.
 *
 * Não é o source-map.json padrão da Web (esse rastreia colunas e nomes
 * minificados). Aqui o objetivo é cruzar bloco visual ↔ linha de código
 * num cenário didático: o aluno seleciona um bloco e a IDE rola até a
 * linha; cursor numa linha → highlight no bloco.
 */

export type SourceMappedFile = 'index.html' | 'style.css' | 'script.js'

export interface SourceMapEntry {
  file: SourceMappedFile
  startLine: number
  endLine: number
  startColumn?: number
  endColumn?: number
}

export type SourceMap = Record<string, SourceMapEntry>

export class SourceMapBuilder {
  private map: SourceMap = {}

  /** Registra (ou sobrescreve) a entrada para um id. Aceita 1-indexed lines. */
  record(
    id: string | undefined,
    file: SourceMappedFile,
    startLine: number,
    endLine: number,
    startColumn?: number,
    endColumn?: number,
  ): void {
    if (!id) return
    // se múltiplas chamadas registram o mesmo id, expandimos o intervalo
    const existing = this.map[id]
    if (existing && existing.file === file) {
      const startsBefore =
        startLine < existing.startLine ||
        (startLine === existing.startLine && (startColumn ?? 1) < (existing.startColumn ?? 1))
      const endsAfter =
        endLine > existing.endLine ||
        (endLine === existing.endLine &&
          (endColumn ?? Number.POSITIVE_INFINITY) >
            (existing.endColumn ?? Number.POSITIVE_INFINITY))
      this.map[id] = {
        file,
        startLine: startsBefore ? startLine : existing.startLine,
        endLine: endsAfter ? endLine : existing.endLine,
        startColumn: startsBefore ? startColumn : existing.startColumn,
        endColumn: endsAfter ? endColumn : existing.endColumn,
      }
      return
    }
    this.map[id] = { file, startLine, endLine, startColumn, endColumn }
  }

  /** Desloca entradas já registradas dentro de uma faixa (ex.: cabeçalho de macro). */
  shiftEntriesInRange(
    file: SourceMappedFile,
    startLine: number,
    endLine: number,
    deltaLines: number,
  ): void {
    if (deltaLines === 0) return
    for (const entry of Object.values(this.map)) {
      if (entry.file !== file || entry.startLine < startLine || entry.endLine > endLine) continue
      entry.startLine += deltaLines
      entry.endLine += deltaLines
    }
  }

  build(): SourceMap {
    return { ...this.map }
  }
}

/**
 * Conta as linhas de conteúdo. Trecho vazio = 0. Trecho que termina com `\n`
 * não soma uma "linha extra vazia" — `'a\n'` conta como 1, `'a\nb'` conta
 * como 2, `'a\nb\n'` ainda 2. Útil para geradores incrementais.
 */
export function countLines(snippet: string): number {
  if (!snippet) return 0
  // `indexOf` nativo (C++) é muito mais rápido que iterar code-point a code-point
  // (`for…of`) — esta função é chamada várias vezes por geração, sobre o texto
  // INTEIRO de cada statement. Contamos só `\n` (BMP, sem surrogate), então a
  // varredura por código de caractere é exata.
  let n = 0
  let i = snippet.indexOf('\n')
  while (i !== -1) {
    n++
    i = snippet.indexOf('\n', i + 1)
  }
  // 10 = '\n'. Snippet não-vazio aqui (guard acima); se não termina em quebra,
  // a última linha de conteúdo conta como +1 (semântica de gerador incremental).
  if (snippet.charCodeAt(snippet.length - 1) !== 10) n++
  return n
}

/**
 * Inverte o source map para lookup por linha. Devolve, para cada arquivo,
 * uma lista de `{ id, startLine, endLine }` ordenada por startLine.
 */
export interface ReverseSourceMapEntry {
  id: string
  startLine: number
  endLine: number
  startColumn?: number
  endColumn?: number
}

export interface ReverseSourceMapFileIndex {
  entries: ReverseSourceMapEntry[]
  /**
   * Prefix max of `endLine`. During lookup, if maxEndLinePrefix[i] < target line,
   * no earlier interval can contain the line and the scan can stop.
   */
  maxEndLinePrefix: number[]
}

export type ReverseSourceMap = Record<SourceMappedFile, ReverseSourceMapFileIndex>

export function reverseSourceMap(map: SourceMap): ReverseSourceMap {
  const out: ReverseSourceMap = {
    'index.html': { entries: [], maxEndLinePrefix: [] },
    'style.css': { entries: [], maxEndLinePrefix: [] },
    'script.js': { entries: [], maxEndLinePrefix: [] },
  }
  for (const [id, entry] of Object.entries(map)) {
    out[entry.file].entries.push({
      id,
      startLine: entry.startLine,
      endLine: entry.endLine,
      startColumn: entry.startColumn,
      endColumn: entry.endColumn,
    })
  }
  for (const file of Object.keys(out) as SourceMappedFile[]) {
    const index = out[file]
    index.entries.sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine)
    let maxEndLine = 0
    index.maxEndLinePrefix = index.entries.map((entry) => {
      maxEndLine = Math.max(maxEndLine, entry.endLine)
      return maxEndLine
    })
  }
  return out
}

/**
 * Encontra o id cujo intervalo contém a linha (1-indexed). Devolve o
 * intervalo mais estreito quando há aninhamento (ex.: consoleLog dentro de
 * event).
 */
export function findIdAtLine(
  rev: ReverseSourceMap,
  file: SourceMappedFile,
  line: number,
  column?: number,
): string | null {
  const index = rev[file]
  const entries = index.entries
  let bestId: string | null = null
  let bestSpan = Number.POSITIVE_INFINITY
  let bestHasColumns = false
  let cursor = upperBoundStartLine(entries, line) - 1
  while (cursor >= 0) {
    if ((index.maxEndLinePrefix[cursor] ?? 0) < line) break
    const entry = entries[cursor]
    cursor -= 1
    if (!entry) continue
    if (line >= entry.startLine && line <= entry.endLine && columnMatches(entry, line, column)) {
      const span = entry.endLine - entry.startLine
      const hasColumns = entry.startColumn !== undefined || entry.endColumn !== undefined
      // Span mais estreito vence. No empate, preferimos a entrada COM colunas
      // (statements) sobre as sem colunas (expressões linha-única) — assim
      // clicar numa linha seleciona o bloco do statement, não o valor interno.
      if (span < bestSpan || (span === bestSpan && hasColumns && !bestHasColumns)) {
        bestSpan = span
        bestHasColumns = hasColumns
        bestId = entry.id
      }
    }
  }
  return bestId
}

function columnMatches(
  entry: ReverseSourceMapEntry,
  line: number,
  column: number | undefined,
): boolean {
  if (column === undefined) return true
  if (line === entry.startLine && entry.startColumn !== undefined && column < entry.startColumn) {
    return false
  }
  if (line === entry.endLine && entry.endColumn !== undefined && column > entry.endColumn) {
    return false
  }
  return true
}

function upperBoundStartLine(entries: ReverseSourceMapEntry[], line: number): number {
  let low = 0
  let high = entries.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const entry = entries[mid]
    if (entry && entry.startLine <= line) low = mid + 1
    else high = mid
  }
  return low
}

/**
 * Constrói as entradas de sourcemap do CSS a partir do TEXTO EXIBIDO ao aluno
 * (não do CSS canônico do gerador). Conserta o realce bloco↔código no modo
 * Ponte quando a formatação do aluno difere da canônica (seletor multilinha,
 * linhas em branco, comentários, indentação): as linhas vêm do texto REAL.
 *
 * Correlaciona cada `CSSRule` do IR (com `__id`/`__declIds`) às posições do
 * texto por (seletor normalizado, propriedade), consumindo ocorrências em ordem
 * documental (cursor por (seletor, prop)) — nunca por índice, pois o matcher de
 * blocos reordena/divide a regra (ex.: `width %` tipado + `Regra CSS` genérica
 * no mesmo seletor). Cada `__declIds[prop]` recebe a linha exata da declaração;
 * cada `rule.__id` recebe a faixa [min..max] das suas declarações.
 *
 * Propriedade ausente do texto → não registra (o chamador deve mesclar como
 * `{ ...canônico, ...posicional }`, mantendo o canônico só para ids ausentes
 * daqui — p.ex. `@media`/rawCSS, ignorados aqui — e NUNCA realçar linha errada).
 */
export function buildCssSourceMapFromText(
  displayedCss: string,
  cssIr: CSSEntry[],
  file: SourceMappedFile = 'style.css',
): SourceMap {
  const builder = new SourceMapBuilder()
  if (!displayedCss.trim()) return builder.build()

  const { rules } = parseCSSWithSpans(displayedCss)

  // (seletor normalizado) → (prop) → filas de linhas em ordem documental.
  const queues = new Map<string, Map<string, number[]>>()
  for (const rule of rules) {
    let byProp = queues.get(rule.selectorNormalized)
    if (!byProp) {
      byProp = new Map()
      queues.set(rule.selectorNormalized, byProp)
    }
    for (const decl of rule.declarations) {
      const existing = byProp.get(decl.prop)
      if (existing) existing.push(decl.line)
      else byProp.set(decl.prop, [decl.line])
    }
  }

  const cursors = new Map<string, number>()
  const nextLine = (selector: string, prop: string): number | null => {
    const queue = queues.get(selector)?.get(prop)
    if (!queue) return null
    const key = `${selector}\u0000${prop}`
    const idx = cursors.get(key) ?? 0
    if (idx >= queue.length) return null
    cursors.set(key, idx + 1)
    return queue[idx] ?? null
  }

  for (const entry of cssIr) {
    if ('type' in entry) continue // rawCSS / mediaQuery → fallback canônico
    const rule = entry as CSSRule
    const selector = normalizeSelector(rule.selector)
    const declRecords: Array<{ id: string; line: number }> = []
    let minLine = Number.POSITIVE_INFINITY
    let maxLine = 0
    for (const prop of Object.keys(rule.declarations)) {
      // Mesma normalização do parser: minúscula para props padrão, caixa
      // PRESERVADA para custom properties (`--Cor` é case-sensitive). Casa com
      // as chaves dos spans, que agora também preservam a caixa das custom props.
      const line = nextLine(selector, normalizeDeclKey(prop))
      if (line == null) continue
      if (line < minLine) minLine = line
      if (line > maxLine) maxLine = line
      const declId = rule.__declIds?.[prop]
      if (declId) declRecords.push({ id: declId, line })
    }
    if (maxLine === 0) continue // nenhuma declaracao casou no texto exibido
    // Registra a REGRA primeiro e as DECLARACOES depois: quando a regra tem uma
    // unica declaracao, a faixa da regra coincide com a da declaracao; gravando a
    // declaracao por ultimo (indice maior no sourcemap) o findIdAtLine desempata
    // a favor do bloco mais especifico (a declaracao) na direcao codigo->bloco.
    if (rule.__id) builder.record(rule.__id, file, minLine, maxLine)
    for (const record of declRecords) builder.record(record.id, file, record.line, record.line)
  }

  return builder.build()
}
