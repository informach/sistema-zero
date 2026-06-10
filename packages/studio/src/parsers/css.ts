import type { CSSEntry } from '#ir'

/**
 * Parser CSS parcial baseado em regex (suficiente para regras planas). Qualquer
 * seletor (incluindo descendentes e pseudo-classes como `.nav a:hover`,
 * `.card:last-child`) e qualquer propriedade viram uma `CSSRule` — que o editor
 * reconstrói como bloco genérico "Regra CSS" + "propriedade: valor".
 *
 * Apenas as @-rules (`@media`, `@keyframes`, …) têm estrutura aninhada que o
 * regex não modela; elas continuam como `rawCSS advanced`, preservadas verbatim.
 */
export function parseCSS(source: string): CSSEntry[] {
  if (!source.trim()) return []
  const entries: CSSEntry[] = []

  let index = 0
  while (index < source.length) {
    index = skipWhitespaceAndComments(source, index)
    if (index >= source.length) break

    if (source[index] === '@') {
      const end = readAtRuleEnd(source, index)
      // Tenta reconhecer `@media (max-width|min-width: Npx) { ... }` como bloco
      // estruturado; qualquer outra @-rule (ou condição fora desse formato)
      // continua como rawCSS avançado, preservada verbatim.
      const media = tryParseMediaQuery(source, index, end)
      if (media) {
        entries.push(media)
      } else {
        const code = source.slice(index, end).trim()
        if (code) entries.push({ type: 'rawCSS', code, advanced: true })
      }
      index = end
      continue
    }

    const open = source.indexOf('{', index)
    if (open < 0) {
      const code = source.slice(index).trim()
      if (code) entries.push({ type: 'rawCSS', code, advanced: true })
      break
    }

    const close = findMatchingBrace(source, open)
    if (close < 0) {
      const code = source.slice(index).trim()
      if (code) entries.push({ type: 'rawCSS', code, advanced: true })
      break
    }

    const selector = source.slice(index, open).trim()
    const declarations = parseDeclarations(source.slice(open + 1, close))
    if (selector && Object.keys(declarations).length > 0) {
      entries.push({ selector, declarations })
    }
    index = close + 1
  }

  return entries
}

/**
 * Reconhece `@media (max-width: Npx) { ... }` / `(min-width: Npx)` como
 * {@link MediaQueryCSS}. As regras internas são parseadas reaproveitando
 * {@link parseCSS}. Devolve `null` se a condição não casar o formato simples
 * (uma única feature de largura em px inteiros) — aí o chamador mantém o
 * `@media` original como rawCSS avançado.
 */
function tryParseMediaQuery(source: string, start: number, end: number): CSSEntry | null {
  const slice = source.slice(start, end)
  const open = slice.indexOf('{')
  if (open < 0) return null
  const condition = slice.slice('@media'.length, open).trim()
  const match = /^\(\s*(max-width|min-width)\s*:\s*(\d+)px\s*\)$/.exec(condition)
  if (!match) return null
  // Só estrutura se o bloco @media estiver bem-formado (chaves balanceadas);
  // caso contrário o chamador o mantém verbatim como rawCSS avançado.
  const close = findMatchingBrace(slice, open)
  if (close < 0) return null
  const rules = parseCSS(slice.slice(open + 1, close))
  return {
    type: 'mediaQuery',
    feature: match[1] as 'max-width' | 'min-width',
    px: Number(match[2]),
    rules,
  }
}

function skipWhitespaceAndComments(source: string, start: number): number {
  let index = start
  while (index < source.length) {
    if (/\s/.test(source[index] ?? '')) {
      index += 1
      continue
    }
    if (source[index] === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2)
      index = end < 0 ? source.length : end + 2
      continue
    }
    break
  }
  return index
}

function readAtRuleEnd(source: string, start: number): number {
  const firstBlock = source.indexOf('{', start)
  const firstSemicolon = source.indexOf(';', start)
  if (firstSemicolon >= 0 && (firstBlock < 0 || firstSemicolon < firstBlock)) {
    return firstSemicolon + 1
  }
  if (firstBlock < 0) return source.length
  const close = findMatchingBrace(source, firstBlock)
  return close < 0 ? source.length : close + 1
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0
  let quote: '"' | "'" | null = null
  let inComment = false

  for (let index = openIndex; index < source.length; index += 1) {
    const ch = source[index]
    const next = source[index + 1]

    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      if (ch === '\\') {
        index += 1
        continue
      }
      if (ch === quote) quote = null
      continue
    }

    if (ch === '/' && next === '*') {
      inComment = true
      index += 1
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '{') {
      depth += 1
      continue
    }
    if (ch === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function parseDeclarations(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  const parts = raw.split(';')
  for (const part of parts) {
    const idx = part.indexOf(':')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim().toLowerCase()
    const value = part.slice(idx + 1).trim()
    if (key && value) out[key] = value
  }
  return out
}

// ---------------------------------------------------------------------------
// Parser COM POSIÇÕES (linhas) — usado SÓ pelo realce bloco↔código do modo
// Ponte. Diferente de parseCSS (que produz o IR e descarta posições), devolve a
// linha do seletor, a de fechamento e a de CADA declaração no espaço do TEXTO
// EXIBIDO ao aluno. Reaproveita a mesma máquina de chaves/strings/comentários
// para não divergir do parser principal.
// ---------------------------------------------------------------------------

export interface CssDeclSpan {
  /** Propriedade em minúsculas (igual ao IR). */
  prop: string
  value: string
  /** Linha 1-indexed do NOME da propriedade no texto exibido. */
  line: number
}

export interface CssRuleSpan {
  /** Seletor cru (trim das pontas; pode conter quebras internas). */
  selector: string
  /** Seletor normalizado para casar com o IR (ver {@link normalizeSelector}). */
  selectorNormalized: string
  /** Linha 1-indexed onde o seletor começa. */
  startLine: number
  /** Linha 1-indexed da chave de fechamento. */
  endLine: number
  declarations: CssDeclSpan[]
}

export interface ParseCssSpansResult {
  rules: CssRuleSpan[]
}

/**
 * Normaliza um seletor para comparação estável entre o texto exibido e o IR:
 * colapsa espaços/quebras num único espaço e padroniza o espaçamento ao redor
 * das vírgulas. Assim `html,\nbody`, `html,body` e `html, body` viram todos
 * `html, body`. Aplicar nos DOIS lados (texto e IR) ao correlacionar.
 */
export function normalizeSelector(selector: string): string {
  return selector
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim()
}

function buildLineStarts(source: string): number[] {
  const starts = [0]
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') starts.push(i + 1)
  }
  return starts
}

function lineOf(lineStarts: number[], offset: number): number {
  let lo = 0
  let hi = lineStarts.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if ((lineStarts[mid] ?? 0) <= offset) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans + 1
}

/**
 * Linha 1-indexed (conta só `\n`, consistente com o Monaco) de um offset.
 * Conveniência para testes; o parser usa a tabela pré-computada internamente.
 */
export function offsetToLine(source: string, offset: number): number {
  return lineOf(buildLineStarts(source), offset)
}

/**
 * Varre as declarações em [start, end) preservando posições. Diferente de
 * {@link parseDeclarations}, mantém DUPLICATAS (cada `prop: valor` é uma
 * entrada) e ancora a `line` no nome da propriedade. Ignora `:`/`;` dentro de
 * strings, comentários e parênteses (ex.: `url()`, `calc()`, gradientes,
 * `url(data:...;base64,...)`).
 */
function parseDeclarationsWithSpans(
  source: string,
  start: number,
  end: number,
  lineStarts: number[],
): CssDeclSpan[] {
  const decls: CssDeclSpan[] = []
  let segStart = start
  let colon = -1
  let paren = 0
  let quote: '"' | "'" | null = null
  let i = start

  const pushSegment = (segEnd: number): void => {
    if (colon < 0) return
    const propRaw = source.slice(segStart, colon)
    // Mascara comentários do nome da prop preservando offsets (comentário →
    // espaços do mesmo tamanho), p/ a prop e a linha não incluírem o `/* */`
    // (ex.: `\n  /* c */\n  color: …` → prop `color`, na linha do `color`).
    const propMasked = propRaw.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    const value = source.slice(colon + 1, segEnd).trim()
    const prop = propMasked.trim().toLowerCase()
    if (!prop || !value) return
    const rel = propMasked.search(/\S/)
    const propOffset = segStart + (rel < 0 ? 0 : rel)
    decls.push({ prop, value, line: lineOf(lineStarts, propOffset) })
  }

  while (i < end) {
    const ch = source[i]
    const next = source[i + 1]
    if (quote) {
      if (ch === '\\') {
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i += 1
      continue
    }
    if (ch === '/' && next === '*') {
      const ce = source.indexOf('*/', i + 2)
      i = ce < 0 ? end : ce + 2
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      i += 1
      continue
    }
    if (ch === '(') {
      paren += 1
      i += 1
      continue
    }
    if (ch === ')') {
      if (paren > 0) paren -= 1
      i += 1
      continue
    }
    if (ch === ':' && paren === 0 && colon < 0) {
      colon = i
      i += 1
      continue
    }
    if (ch === ';' && paren === 0) {
      pushSegment(i)
      segStart = i + 1
      colon = -1
      i += 1
      continue
    }
    i += 1
  }
  pushSegment(end)
  return decls
}

/**
 * Versão de {@link parseCSS} que rastreia linhas (1-indexed). Emite só regras
 * planas; @-rules (@media, @keyframes, …) são SALTADAS — a varredura passa por
 * elas para manter corretas as linhas das regras seguintes, mas os blocos
 * dessas @-rules mantêm o mapa canônico como fallback. Falha suave: entrada
 * vazia/inválida → `{ rules: [] }`.
 */
export function parseCSSWithSpans(source: string): ParseCssSpansResult {
  const rules: CssRuleSpan[] = []
  if (!source.trim()) return { rules }
  const lineStarts = buildLineStarts(source)

  let index = 0
  while (index < source.length) {
    index = skipWhitespaceAndComments(source, index)
    if (index >= source.length) break

    if (source[index] === '@') {
      index = readAtRuleEnd(source, index)
      continue
    }

    const open = source.indexOf('{', index)
    if (open < 0) break
    const close = findMatchingBrace(source, open)
    if (close < 0) break

    const selector = source.slice(index, open).trim()
    if (selector) {
      rules.push({
        selector,
        selectorNormalized: normalizeSelector(selector),
        startLine: lineOf(lineStarts, index),
        endLine: lineOf(lineStarts, close),
        declarations: parseDeclarationsWithSpans(source, open + 1, close, lineStarts),
      })
    }
    index = close + 1
  }

  return { rules }
}
