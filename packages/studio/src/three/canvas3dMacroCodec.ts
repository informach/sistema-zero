import { type JSStatement, JSStatementSchema } from '#ir'

const MACRO_PREFIX = '/*__SZ_CANVAS3D_MACRO__'
const MACRO_SUFFIX = '__*/'
const MACRO_END = '/*__SZ_CANVAS3D_END__*/'
const RUNTIME_PREFIX = '/*__SZ_CANVAS3D_RUNTIME__'
const RUNTIME_END = '/*__SZ_CANVAS3D_RUNTIME_END__*/'
const PLACEHOLDER = '__szCanvas3DMacro'
const MACRO_VERSION = 'v2'

/**
 * Marcadores versionados mantêm a receita semântica dos macros quando o aluno
 * alterna entre Código/Ponte e Blocos. O checksum é do JavaScript expandido: se
 * alguém editar qualquer linha da receita, o parser preserva o código editado e
 * deixa de confiar nos metadados, em vez de restaurar silenciosamente um macro
 * desatualizado.
 */
export function wrapCanvas3DMacro(statement: JSStatement, code: string): string {
  // IDs de instância do Blockly são efêmeros. Não entram no artefato de código:
  // isso mantém a geração determinística depois de block→IR→block e evita que um
  // simples reload altere todos os marcadores.
  const payload = encodeURIComponent(
    JSON.stringify(statement, (key, value: unknown) => (key === '__id' ? undefined : value)),
  )
  const integrity = checksum(`${payload}\n${code}`)
  return `${MACRO_PREFIX}${MACRO_VERSION}:${code.length}:${integrity}:${payload}${MACRO_SUFFIX}\n${code}\n${MACRO_END}`
}

/** Kernel gerado é infraestrutura, não centenas de blocos do projeto. */
export function wrapCanvas3DRuntime(code: string): string {
  return `${RUNTIME_PREFIX}${checksum(code)}${MACRO_SUFFIX}\n${code}\n${RUNTIME_END}`
}

export interface Canvas3DPreparedSource {
  source: string
  macros: Map<string, JSStatement>
}

export interface Canvas3DInternalCodeRange {
  startLine: number
  endLine: number
  kind: 'metadata' | 'runtime'
}

/**
 * Faixas 1-based que a Ponte pode recolher sem esconder o código didático das
 * receitas. Marcadores ocupam uma linha; somente o kernel físico inteiro é
 * infraestrutura gerada.
 */
export function canvas3DInternalCodeRanges(source: string): Canvas3DInternalCodeRange[] {
  const lines = source.split(/\r?\n/)
  const ranges: Canvas3DInternalCodeRange[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? '').trim()
    if (line.startsWith(RUNTIME_PREFIX)) {
      const end = lines.findIndex(
        (candidate, candidateIndex) => candidateIndex >= index && candidate.trim() === RUNTIME_END,
      )
      if (end >= index) {
        ranges.push({ startLine: index + 1, endLine: end + 1, kind: 'runtime' })
        index = end
        continue
      }
    }
    if (line.startsWith(MACRO_PREFIX) || line === MACRO_END) {
      ranges.push({ startLine: index + 1, endLine: index + 1, kind: 'metadata' })
    }
  }
  return ranges
}

/**
 * Substitui somente marcadores íntegros por chamadas-placeholder reconhecidas
 * pelo parser. Marcadores podem estar aninhados (ex.: macro dentro de evento de
 * física); o scanner encontra o fechamento correspondente por profundidade.
 */
export function prepareCanvas3DSourceForParse(source: string): Canvas3DPreparedSource {
  const macros = new Map<string, JSStatement>()
  let nextId = 0

  const process = (segment: string): string => {
    let cursor = 0
    let output = ''
    while (cursor < segment.length) {
      const macroAt = findLinePrefix(segment, MACRO_PREFIX, cursor)
      const runtimeAt = findLinePrefix(segment, RUNTIME_PREFIX, cursor)
      const candidates = [macroAt, runtimeAt].filter((value) => value >= 0)
      if (candidates.length === 0) return output + segment.slice(cursor)
      const start = Math.min(...candidates)
      output += segment.slice(cursor, start)

      if (start === runtimeAt) {
        const markerEnd = segment.indexOf(MACRO_SUFFIX, start + RUNTIME_PREFIX.length)
        const closing = markerEnd < 0 ? -1 : findStandaloneMarker(segment, RUNTIME_END, markerEnd)
        if (markerEnd < 0 || closing < 0) {
          output += segment.slice(start)
          return output
        }
        const expected = segment.slice(start + RUNTIME_PREFIX.length, markerEnd)
        const body = unwrapBody(segment.slice(markerEnd + MACRO_SUFFIX.length, closing))
        const fullEnd = closing + RUNTIME_END.length
        if (checksum(body) === expected) {
          cursor = fullEnd
          continue
        }
        output += segment.slice(start, markerEnd + MACRO_SUFFIX.length)
        output += process(segment.slice(markerEnd + MACRO_SUFFIX.length, closing))
        output += RUNTIME_END
        cursor = fullEnd
        continue
      }

      const markerEnd = segment.indexOf(MACRO_SUFFIX, start + MACRO_PREFIX.length)
      if (markerEnd < 0) {
        output += segment.slice(start)
        return output
      }
      const header = segment.slice(start + MACRO_PREFIX.length, markerEnd)
      const metadata = parseMacroHeader(header)
      const versionedBounds =
        metadata?.bodyLength !== undefined
          ? versionedMacroBounds(segment, markerEnd + MACRO_SUFFIX.length, metadata.bodyLength)
          : null
      const closing =
        versionedBounds?.closing ?? findMatchingMacroEnd(segment, markerEnd + MACRO_SUFFIX.length)
      if (closing < 0) {
        output += segment.slice(start)
        return output
      }
      const bodyStart = versionedBounds?.bodyStart ?? markerEnd + MACRO_SUFFIX.length
      const bodyEnd = versionedBounds?.bodyEnd ?? closing
      const body = versionedBounds
        ? segment.slice(bodyStart, bodyEnd)
        : unwrapBody(segment.slice(bodyStart, bodyEnd))
      const fullEnd = closing + MACRO_END.length
      const integrityMatches = metadata
        ? metadata.version === MACRO_VERSION
          ? checksum(`${metadata.payload}\n${body}`) === metadata.expected
          : checksum(body) === metadata.expected
        : false
      const statement = integrityMatches ? decodeStatement(metadata?.payload ?? '') : null
      if (statement) {
        const id = `canvas3d_${nextId}`
        nextId += 1
        macros.set(id, statement)
        output += `${PLACEHOLDER}(${JSON.stringify(id)});`
      } else {
        output += segment.slice(start, bodyStart)
        output += process(segment.slice(bodyStart, bodyEnd))
        output += segment.slice(bodyEnd, fullEnd)
      }
      cursor = fullEnd
    }
    return output
  }

  return { source: process(source), macros }
}

interface MacroHeader {
  version: 'legacy' | typeof MACRO_VERSION
  bodyLength?: number
  expected: string
  payload: string
}

function parseMacroHeader(header: string): MacroHeader | null {
  if (header.startsWith(`${MACRO_VERSION}:`)) {
    const lengthEnd = header.indexOf(':', MACRO_VERSION.length + 1)
    const checksumEnd = lengthEnd < 0 ? -1 : header.indexOf(':', lengthEnd + 1)
    if (lengthEnd < 0 || checksumEnd < 0) return null
    const rawLength = header.slice(MACRO_VERSION.length + 1, lengthEnd)
    if (!/^\d+$/.test(rawLength)) return null
    const bodyLength = Number(rawLength)
    if (!Number.isSafeInteger(bodyLength)) return null
    return {
      version: MACRO_VERSION,
      bodyLength,
      expected: header.slice(lengthEnd + 1, checksumEnd),
      payload: header.slice(checksumEnd + 1),
    }
  }
  const separator = header.indexOf(':')
  if (separator < 0) return null
  return {
    version: 'legacy',
    expected: header.slice(0, separator),
    payload: header.slice(separator + 1),
  }
}

function skipLineBreak(source: string, index: number): number {
  if (source.startsWith('\r\n', index)) return index + 2
  if (source.startsWith('\n', index)) return index + 1
  return index
}

function versionedMacroBounds(
  source: string,
  afterHeader: number,
  bodyLength: number,
): { bodyStart: number; bodyEnd: number; closing: number } | null {
  const bodyStart = skipLineBreak(source, afterHeader)
  const bodyEnd = bodyStart + bodyLength
  if (bodyEnd > source.length) return null
  const closing = skipLineBreak(source, bodyEnd)
  if (!isStandaloneMarkerAt(source, MACRO_END, closing)) return null
  return { bodyStart, bodyEnd, closing }
}

export function canvas3DMacroFromPlaceholder(
  callee: unknown,
  argument: unknown,
  macros: ReadonlyMap<string, JSStatement>,
): JSStatement | null {
  if (callee !== PLACEHOLDER || typeof argument !== 'string') return null
  return macros.get(argument) ?? null
}

function decodeStatement(payload: string): JSStatement | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(payload))
    const result = JSStatementSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    // Metadado é entrada editável do usuário. Qualquer corrupção degrada para o
    // JavaScript visível, que o parser normal já preserva.
    return null
  }
}

function unwrapBody(value: string): string {
  let body = value
  if (body.startsWith('\r\n')) body = body.slice(2)
  else if (body.startsWith('\n')) body = body.slice(1)
  if (body.endsWith('\r\n')) body = body.slice(0, -2)
  else if (body.endsWith('\n')) body = body.slice(0, -1)
  return body
}

function findMatchingMacroEnd(source: string, from: number): number {
  let depth = 1
  let cursor = from
  while (cursor < source.length) {
    const child = findLinePrefix(source, MACRO_PREFIX, cursor)
    const end = findStandaloneMarker(source, MACRO_END, cursor)
    if (end < 0) return -1
    if (child >= 0 && child < end) {
      depth += 1
      cursor = child + MACRO_PREFIX.length
      continue
    }
    depth -= 1
    if (depth === 0) return end
    cursor = end + MACRO_END.length
  }
  return -1
}

function lineStartAt(source: string, index: number): number {
  const previousBreak = source.lastIndexOf('\n', Math.max(0, index - 1))
  return previousBreak < 0 ? 0 : previousBreak + 1
}

function lineEndAt(source: string, index: number): number {
  const nextBreak = source.indexOf('\n', index)
  return nextBreak < 0 ? source.length : nextBreak
}

function isLinePrefixAt(source: string, index: number): boolean {
  return source.slice(lineStartAt(source, index), index).trim().length === 0
}

function findLinePrefix(source: string, prefix: string, from: number): number {
  let cursor = from
  while (cursor < source.length) {
    const found = source.indexOf(prefix, cursor)
    if (found < 0) return -1
    if (isLinePrefixAt(source, found)) return found
    cursor = found + prefix.length
  }
  return -1
}

function isStandaloneMarkerAt(source: string, marker: string, index: number): boolean {
  if (!source.startsWith(marker, index) || !isLinePrefixAt(source, index)) return false
  return source.slice(index + marker.length, lineEndAt(source, index)).trim().length === 0
}

function findStandaloneMarker(source: string, marker: string, from: number): number {
  let cursor = from
  while (cursor < source.length) {
    const found = source.indexOf(marker, cursor)
    if (found < 0) return -1
    if (isStandaloneMarkerAt(source, marker, found)) return found
    cursor = found + marker.length
  }
  return -1
}

/**
 * FNV-1a de 32 bits, determinístico em navegador e Bun. Em macros v2, cobre
 * payload canônico + JavaScript expandido; metadado e receita não podem divergir.
 *
 * ⚠️ Invariantes de solidez (aceitas para uma IDE kids, mas conscientes):
 * (a) o checksum tem 32 bits — uma COLISÃO (~2⁻³² por edição) faria o parser confiar no
 *     metadado e restaurar a receita antiga por cima de uma edição real do aluno;
 * (b) `decodeStatement` valida com `JSStatementSchema.safeParse` — se um dia um campo de
 *     nó semântico de macro virar OBRIGATÓRIO no schema, marcadores JÁ SALVOS falham o
 *     parse e decaem silenciosamente para o JavaScript visível (nunca quebram, mas perdem
 *     o bloco-macro). Toda evolução do schema desses nós deve ser retrocompatível.
 */
function checksum(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}
