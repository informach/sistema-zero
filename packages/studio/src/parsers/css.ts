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
/**
 * Profundidade máxima de @media aninhados que estruturamos. `@media`s mais
 * fundos que isso degradam para `rawCSS advanced` (preservados verbatim) em vez
 * de continuar a recursão `parseCSS → tryParseMediaQuery → parseCSS`, que num
 * aninhamento patológico estouraria a pilha (RangeError). Mesmo espírito da
 * guarda de profundidade do `parsers/html.ts`.
 */
const MAX_MEDIA_NESTING = 64

export function parseCSS(source: string): CSSEntry[] {
  return parseCSSAtDepth(source, 0)
}

function parseCSSAtDepth(source: string, depth: number): CSSEntry[] {
  if (!source.trim()) return []
  // Acima do limite, paramos de recursar: o trecho inteiro vira um único nó
  // avançado, preservado verbatim — nunca crasha (honra "código é sagrado").
  if (depth > MAX_MEDIA_NESTING) {
    const code = source.trim()
    return code ? [{ type: 'rawCSS', code, advanced: true }] : []
  }
  const entries: CSSEntry[] = []

  let index = 0
  while (index < source.length) {
    const beforeSkip = index
    index = skipWhitespaceAndComments(source, index)
    // Comentário SOLTO entre regras: preserva verbatim como rawCSS avançado
    // (igual a rawHTML/rawJS) — senão some no round-trip código→IR→código. O
    // trecho pulado é só espaço+comentário, então `trim()` devolve o(s) comentário(s).
    if (index > beforeSkip) {
      const skipped = source.slice(beforeSkip, index)
      if (skipped.includes('/*')) {
        const code = skipped.trim()
        if (code) entries.push({ type: 'rawCSS', code, advanced: true })
      }
    }
    if (index >= source.length) break

    if (source[index] === '@') {
      const end = readAtRuleEnd(source, index)
      // Tenta reconhecer `@media (max-width|min-width: Npx) { ... }` como bloco
      // estruturado; qualquer outra @-rule (ou condição fora desse formato)
      // continua como rawCSS avançado, preservada verbatim.
      const media = tryParseMediaQuery(source, index, end, depth)
      const keyframes = media ? null : tryParseKeyframes(source, index, end)
      if (media) {
        entries.push(media)
      } else if (keyframes) {
        entries.push(keyframes)
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
    const declBlock = source.slice(open + 1, close)
    const declarations = parseDeclarations(declBlock)
    if (selector) {
      // Regra VAZIA (placeholder `.x {}` / só com declarações inválidas) ou com
      // PROPRIEDADE DUPLICADA (fallback de progressive enhancement, ex.:
      // `display: flex; display: grid`) não cabe no Record do IR (chave única,
      // última vence) — preserva a regra INTEIRA verbatim como rawCSS avançado,
      // honrando "código é sagrado" sem mudar o schema. Senão, regra estruturada.
      if (Object.keys(declarations).length === 0 || hasDuplicateDeclKeys(declBlock)) {
        const code = source.slice(index, close + 1).trim()
        if (code) entries.push({ type: 'rawCSS', code, advanced: true })
      } else {
        entries.push({ selector, declarations })
      }
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
function tryParseMediaQuery(
  source: string,
  start: number,
  end: number,
  depth: number,
): CSSEntry | null {
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
  const rules = parseCSSAtDepth(slice.slice(open + 1, close), depth + 1)
  return {
    type: 'mediaQuery',
    feature: match[1] as 'max-width' | 'min-width',
    px: Number(match[2]),
    rules,
  }
}

/**
 * Reconhece `@keyframes nome { 0% { … } 100% { … } }` como {@link KeyframesCSS}.
 * O nome precisa ser um identificador simples; cada passo é `at { decls }` com
 * `at` = `from`/`to`/`N%`. Reaproveita {@link findMatchingBrace}/
 * {@link parseDeclarations}. Devolve `null` se não casar (mantém rawCSS).
 */
function tryParseKeyframes(source: string, start: number, end: number): CSSEntry | null {
  const slice = source.slice(start, end)
  if (!/^@keyframes\b/.test(slice)) return null
  const open = slice.indexOf('{')
  if (open < 0) return null
  const name = slice.slice('@keyframes'.length, open).trim()
  if (!/^[A-Za-z_-][\w-]*$/.test(name)) return null
  const close = findMatchingBrace(slice, open)
  if (close < 0) return null
  const inner = slice.slice(open + 1, close)

  const steps: Array<{ at: string; declarations: Record<string, string> }> = []
  let i = 0
  while (i < inner.length) {
    i = skipWhitespaceAndComments(inner, i)
    if (i >= inner.length) break
    const stepOpen = inner.indexOf('{', i)
    if (stepOpen < 0) break
    const stepClose = findMatchingBrace(inner, stepOpen)
    if (stepClose < 0) break
    const at = inner.slice(i, stepOpen).trim().toLowerCase()
    const declarations = parseDeclarations(inner.slice(stepOpen + 1, stepClose))
    if (at && Object.keys(declarations).length > 0) steps.push({ at, declarations })
    i = stepClose + 1
  }
  if (steps.length === 0) return null
  return { type: 'keyframes', name, steps }
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

/**
 * Acha o primeiro `{` ou `;` em PROFUNDIDADE 0 a partir de `start`, ignorando
 * ocorrências dentro de strings (`@import "a;b.css"`) e de comentários
 * (`/* ; *​/`) — um `indexOf` cru pegaria esses por engano e cortaria a @-rule no
 * lugar errado. Devolve `{ index, char }` do delimitador, ou `null` se não houver.
 */
function findAtRuleDelimiter(
  source: string,
  start: number,
): { index: number; char: '{' | ';' } | null {
  let quote: '"' | "'" | null = null
  let inComment = false
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i]
    const next = source[i + 1]
    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false
        i += 1
      }
      continue
    }
    if (quote) {
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === quote) quote = null
      continue
    }
    if (ch === '/' && next === '*') {
      inComment = true
      i += 1
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '{' || ch === ';') return { index: i, char: ch }
  }
  return null
}

function readAtRuleEnd(source: string, start: number): number {
  const delim = findAtRuleDelimiter(source, start)
  if (!delim) return source.length
  if (delim.char === ';') return delim.index + 1
  const close = findMatchingBrace(source, delim.index)
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

/**
 * Um segmento de declaração já delimitado pelo {@link scanDeclarationSegments}:
 * `[segStart, segEnd)` no texto-fonte e o offset do PRIMEIRO `:` em profundidade
 * 0 (`-1` quando não há, ex.: segmento só com espaços ou sem dois-pontos).
 */
interface DeclSegment {
  segStart: number
  segEnd: number
  colon: number
}

/**
 * Scanner ÚNICO de declarações: varre `[start, end)` e devolve um segmento por
 * declaração, quebrando SÓ nos `;` em profundidade 0 (fora de parênteses, fora
 * de strings e fora de comentários) e marcando o PRIMEIRO `:` em profundidade 0
 * de cada segmento. É a fonte da verdade compartilhada por
 * {@link parseDeclarations} (IR) e {@link parseDeclarationsWithSpans} (posições)
 * para que os dois NUNCA divirjam — ex.: `background: url(data:image/png;base64,
 * AAAA)` e `content: "a;b"` sobrevivem intactos em ambos.
 */
function scanDeclarationSegments(source: string, start: number, end: number): DeclSegment[] {
  const segments: DeclSegment[] = []
  let segStart = start
  let colon = -1
  let paren = 0
  let quote: '"' | "'" | null = null
  let i = start

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
      segments.push({ segStart, segEnd: i, colon })
      segStart = i + 1
      colon = -1
      i += 1
      continue
    }
    i += 1
  }
  segments.push({ segStart, segEnd: end, colon })
  return segments
}

/**
 * Normaliza a CHAVE de uma declaração. Propriedades padrão são case-insensitive
 * (`COLOR` ≡ `color`) e viram minúsculas para casar com o IR. Já as CUSTOM
 * PROPERTIES (`--Nome`, variáveis CSS) são CASE-SENSITIVE pela spec — `--Cor` e
 * `--cor` são variáveis distintas, e `var(--Cor)` só resolve com a mesma caixa —
 * então preservamos a caixa original delas. Compartilhado por
 * {@link parseDeclarations} e {@link parseDeclarationsWithSpans} para não divergir.
 */
export function normalizeDeclKey(key: string): string {
  return key.startsWith('--') ? key : key.toLowerCase()
}

/**
 * Mascara comentários `/* *​/` no NOME de uma propriedade trocando-os por espaços
 * do mesmo tamanho (preserva offsets para o parser de posições). Compartilhado
 * por {@link parseDeclarations} (chave do IR) e {@link parseDeclarationsWithSpans}
 * (prop do span) para que os dois NUNCA divirjam — `.box { /* nota *​/ color: red }`
 * vira a chave `color` em AMBOS, não `/* nota *​/ color` só num lado.
 */
function maskPropComments(propRaw: string): string {
  return propRaw.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
}

/**
 * Há propriedade REPETIDA em profundidade 0 dentro deste bloco de declarações?
 * Usa a MESMA segmentação/normalização do {@link parseDeclarations}, então o que
 * o parser veria como uma chave colapsada é exatamente o que conta como duplicata
 * — o chamador então preserva a regra inteira verbatim em vez de perder o fallback.
 */
function hasDuplicateDeclKeys(block: string): boolean {
  const seen = new Set<string>()
  for (const { segStart, segEnd, colon } of scanDeclarationSegments(block, 0, block.length)) {
    if (colon < 0) continue
    const key = normalizeDeclKey(maskPropComments(block.slice(segStart, colon)).trim())
    const value = block.slice(colon + 1, segEnd).trim()
    if (!key || !value) continue
    if (seen.has(key)) return true
    seen.add(key)
  }
  return false
}

/**
 * Declarações para o IR (sem posições). Roteia pelo {@link scanDeclarationSegments}
 * para enxergar parênteses/strings/comentários do mesmo jeito que o parser de
 * posições — `;`/`:` dentro de `url(data:…;base64,…)`, `calc()` ou strings não
 * truncam mais o valor. Mantém a semântica de Record (última duplicata vence).
 */
function parseDeclarations(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const { segStart, segEnd, colon } of scanDeclarationSegments(raw, 0, raw.length)) {
    if (colon < 0) continue
    // Mascara comentários no NOME da prop (mesma fonte da verdade dos spans) — sem
    // isto a chave do IR virava `/* nota */ color` e divergia do span `color`,
    // quebrando o realce bloco↔código de toda declaração precedida de comentário.
    const key = normalizeDeclKey(maskPropComments(raw.slice(segStart, colon)).trim())
    const value = raw.slice(colon + 1, segEnd).trim()
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
  /**
   * Propriedade normalizada (igual ao IR): minúsculas para props padrão,
   * mas com a CAIXA PRESERVADA para custom properties `--Nome` (case-sensitive).
   */
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
 * Varre as declarações em [start, end) preservando posições. Reaproveita o
 * {@link scanDeclarationSegments} (mesma quebra de segmentos do
 * {@link parseDeclarations}, então os dois nunca divergem) e, por cima, mantém
 * DUPLICATAS (cada `prop: valor` é uma entrada) e ancora a `line` no nome da
 * propriedade. Ignora `:`/`;` dentro de strings, comentários e parênteses
 * (ex.: `url()`, `calc()`, gradientes, `url(data:...;base64,...)`).
 */
function parseDeclarationsWithSpans(
  source: string,
  start: number,
  end: number,
  lineStarts: number[],
): CssDeclSpan[] {
  const decls: CssDeclSpan[] = []
  for (const { segStart, segEnd, colon } of scanDeclarationSegments(source, start, end)) {
    if (colon < 0) continue
    const propRaw = source.slice(segStart, colon)
    // Mascara comentários do nome da prop preservando offsets (comentário →
    // espaços do mesmo tamanho), p/ a prop e a linha não incluírem o `/* */`
    // (ex.: `\n  /* c */\n  color: …` → prop `color`, na linha do `color`).
    // Mesmo helper do parseDeclarations (chave do IR) — os dois NUNCA divergem.
    const propMasked = maskPropComments(propRaw)
    const value = source.slice(colon + 1, segEnd).trim()
    const prop = normalizeDeclKey(propMasked.trim())
    if (!prop || !value) continue
    const rel = propMasked.search(/\S/)
    const propOffset = segStart + (rel < 0 ? 0 : rel)
    decls.push({ prop, value, line: lineOf(lineStarts, propOffset) })
  }
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
