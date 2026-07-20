import {
  type CSSEntry,
  type CSSRule,
  cssDeclarationEntries,
  type GoogleFontCSS,
  type KeyframesCSS,
  type MediaQueryCSS,
} from '#ir'
import { assertGeneratorDepth } from './js'
import { countLines, SourceMapBuilder } from './sourceMap'

/**
 * Guarda de profundidade ITERATIVA para `@media` aninhados. `generateCSSWithMap`
 * recursa via `renderMediaQuery` (uma media query pode conter outra), sem guarda
 * — um aninhamento patológico estourava a pilha do motor. Pilha explícita (sem
 * recursão) abortando com {@link GeneratorDepthError}, mesmo teto único do JS.
 */
function assertCSSDepth(entries: CSSEntry[]): void {
  const stack: Array<{ list: CSSEntry[]; depth: number }> = [{ list: entries, depth: 0 }]
  while (stack.length > 0) {
    const { list, depth } = stack.pop() as { list: CSSEntry[]; depth: number }
    assertGeneratorDepth(depth)
    for (const entry of list) {
      if (isMediaQuery(entry)) stack.push({ list: entry.rules, depth: depth + 1 })
    }
  }
}

export interface GenerateCSSWithMapResult {
  code: string
  map: SourceMapBuilder
}

export function generateCSS(entries: CSSEntry[]): string {
  return generateCSSWithMap(entries).code
}

/**
 * Versão com source-map: cada entry no CSS é mapeada para a faixa de linhas
 * do arquivo `style.css`. Entries são separadas por linha em branco.
 */
interface GroupedDeclaration {
  key: string
  value: string
  /** Id do bloco `sz_css_decl` quando conhecido (vem do canvas, não do parser). */
  declId?: string
}

/**
 * Um "segmento" representa as declarações que vieram de UM `CSSRule` original
 * do IR. Quando vários `CSSRule`s consecutivos com mesmo seletor são fundidos
 * num único bloco visual no CSS, mantemos os segmentos separados — assim cada
 * id de bloco realça SÓ a faixa de declarações que ele contribuiu, em vez de
 * todos realçarem a regra inteira fundida.
 */
interface RuleSegment {
  id?: string
  declarations: GroupedDeclaration[]
}

type RenderGroup =
  | { kind: 'raw'; ids: string[]; code: string }
  | { kind: 'rule'; selector: string; segments: RuleSegment[] }
  | { kind: 'media'; entry: MediaQueryCSS }
  | { kind: 'keyframes'; entry: KeyframesCSS }

function entryDeclarations(entry: CSSRule): GroupedDeclaration[] {
  return cssDeclarationEntries(entry.declarations, entry.__declIds).map((declaration) => ({
    key: declaration.property,
    value: declaration.value,
    ...(declaration.__id ? { declId: declaration.__id } : {}),
  }))
}

export function generateCSSWithMap(entries: CSSEntry[]): GenerateCSSWithMapResult {
  const map = new SourceMapBuilder()
  if (entries.length === 0) return { code: '', map }
  assertCSSDepth(entries)

  // Agrupa entradas `CSSRule` CONSECUTIVAS de mesmo seletor num único bloco
  // visual (`.container {…}` não se repete quando o seletor virou vários
  // blocos — tipados + verbatim). Só funde adjacentes, então a cascata não
  // muda. Dentro do grupo, mantemos um SEGMENTO por `CSSRule` original para
  // que o realce por bloco mire apenas as declarações daquele bloco.
  const groups: RenderGroup[] = []
  // @imports do Google Fonts são coletados e emitidos no TOPO (regra do @import).
  const fontImports: { id?: string; code: string }[] = []
  for (const entry of entries) {
    if (isGoogleFont(entry)) {
      fontImports.push({ id: entry.__id, code: googleFontImport(entry.family) })
      continue
    }
    if (isRawCSS(entry)) {
      groups.push({ kind: 'raw', ids: entry.__id ? [entry.__id] : [], code: entry.code.trim() })
      continue
    }
    if (isCommentCSS(entry)) {
      groups.push({ kind: 'raw', ids: entry.__id ? [entry.__id] : [], code: `/*${entry.text}*/` })
      continue
    }
    if (isMediaQuery(entry)) {
      groups.push({ kind: 'media', entry })
      continue
    }
    if (isKeyframes(entry)) {
      groups.push({ kind: 'keyframes', entry })
      continue
    }
    const segment: RuleSegment = {
      ...(entry.__id ? { id: entry.__id } : {}),
      declarations: entryDeclarations(entry),
    }
    const last = groups[groups.length - 1]
    if (last && last.kind === 'rule' && last.selector === entry.selector) {
      last.segments.push(segment)
    } else {
      groups.push({ kind: 'rule', selector: entry.selector, segments: [segment] })
    }
  }

  if (fontImports.length > 0) {
    groups.unshift({
      kind: 'raw',
      ids: fontImports.map((f) => f.id).filter((x): x is string => !!x),
      code: fontImports.map((f) => f.code).join('\n'),
    })
  }

  const pieces: string[] = []
  let line = 1
  for (const group of groups) {
    let rendered: string
    if (group.kind === 'media') {
      rendered = renderMediaQuery(group.entry, line, map)
    } else if (group.kind === 'keyframes') {
      rendered = renderKeyframes(group.entry)
      map.record(group.entry.__id, 'style.css', line, line + countLines(rendered) - 1)
    } else if (group.kind === 'raw') {
      rendered = group.code
      // Sem este `map.record`, o bloco `sz_adv_raw_css` ficava sem entrada no
      // sourcemap e a seleção no canvas não realçava o trecho correspondente.
      const lines = countLines(rendered)
      for (const id of group.ids) map.record(id, 'style.css', line, line + lines - 1)
    } else {
      const allDeclarations = group.segments.flatMap((s) => s.declarations)
      rendered = renderRule(group.selector, allDeclarations)
      const lines = countLines(rendered)
      // Faixas por segmento:
      //  - Quando há UM segmento, o id da regra cobre `selector { … }` inteiro
      //    (mesma UX de antes: clicar num bloco "Regra CSS" realça a regra).
      //  - Quando há VÁRIOS segmentos (regras fundidas), cada id cobre só as
      //    linhas das suas declarações — caso contrário todos os blocos do
      //    seletor realçavam o bloco fundido e ficavam indistinguíveis.
      let declOffset = 0
      for (const segment of group.segments) {
        if (segment.id) {
          if (group.segments.length === 1) {
            map.record(segment.id, 'style.css', line, line + lines - 1)
          } else if (segment.declarations.length > 0) {
            const segStart = line + 1 + declOffset
            const segEnd = segStart + segment.declarations.length - 1
            map.record(segment.id, 'style.css', segStart, segEnd)
          }
        }
        // Por declaração: cada `sz_css_decl` com id próprio (vindo do canvas,
        // via `__declIds`) recebe a linha exata da sua declaração.
        segment.declarations.forEach((decl, indexInSegment) => {
          if (decl.declId) {
            const declLine = line + 1 + declOffset + indexInSegment
            map.record(decl.declId, 'style.css', declLine, declLine)
          }
        })
        declOffset += segment.declarations.length
      }
    }
    const lines = countLines(rendered)
    pieces.push(rendered)
    // Entries unidas por '\n\n' (1 linha em branco entre elas).
    line += lines + 1
  }
  const code = `${pieces.join('\n\n')}\n`
  return { code, map }
}

/**
 * Renderiza `@media (feature: Npx) { ...regras indentadas... }`. As regras
 * internas são geradas reaproveitando {@link generateCSSWithMap} e indentadas em
 * 2 espaços; o source map interno é deslocado para as linhas absolutas dentro do
 * documento. O próprio bloco @media é registrado na faixa completa.
 */
function renderMediaQuery(entry: MediaQueryCSS, startLine: number, map: SourceMapBuilder): string {
  const inner = generateCSSWithMap(entry.rules)
  const innerBody = inner.code.replace(/\n$/, '')
  const indented = innerBody
    .split('\n')
    .map((l) => (l.length > 0 ? `  ${l}` : l))
    .join('\n')
  const rendered = `@media (${entry.feature}: ${entry.px}px) {\n${indented}\n}`
  // Conteúdo interno começa na linha seguinte ao `@media ... {` (offset = startLine).
  for (const [id, e] of Object.entries(inner.map.build())) {
    map.record(id, 'style.css', startLine + e.startLine, startLine + e.endLine)
  }
  map.record(entry.__id, 'style.css', startLine, startLine + countLines(rendered) - 1)
  return rendered
}

/**
 * Defesa em profundidade contra injeção de CSS (o esquema Zod é a correção
 * durável; isto é o cinto-e-suspensório do gerador). Um seletor/nome com `{`
 * ou `}` poderia fechar a regra atual e abrir outra (`}`+nova regra → exfil via
 * `background:url(...)`). Remove as chaves para que o texto nunca quebre a
 * estrutura `selector { … }`.
 */
function stripBraces(text: string): string {
  return text.replace(/[{}]/g, '')
}

/**
 * Uma DECLARAÇÃO cujo valor escapa da estrutura `selector { … }` é descartada.
 * `{`/`}` e `;` rompem a regra (ex.: `red } body { background:url(...) }` ou
 * `red; background:url(...)`) — mas só quando estão FORA de aspas, comentários e
 * parênteses. DENTRO de uma string (`content:"a{b}c"`, `content:"a;b"`), de um
 * comentário (`/* a;b *​/`) ou de `url(data:…;base64,…)` esses caracteres fazem
 * parte do valor e são legítimos. Reusa a mesma máquina de estados de
 * aspas/comentários do {@link findMatchingBrace}/{@link scanDeclarationSegments}
 * do parser, então o que o parser separou em profundidade 0 nunca é rejeitado
 * por engano — e valores de IR importada/IA com chave/`;` "soltos" caem aqui.
 */
function isSafeDeclarationValue(value: string): boolean {
  let paren = 0
  let quote: '"' | "'" | null = null
  let inComment = false
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    const next = value[i + 1]
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
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '(') paren += 1
    else if (ch === ')') {
      if (paren > 0) paren -= 1
    } else if (ch === '{' || ch === '}') return false
    else if (ch === ';' && paren === 0) return false
  }
  return true
}

/**
 * Uma CHAVE (propriedade) de declaração só pode conter o NOME da propriedade —
 * nunca os caracteres que estruturam o CSS. `stripBraces` removia só `{`/`}`,
 * mas `:` e `;` numa chave injetam uma declaração-fantasma: a chave
 * `color:red;x` saía como `color:red;x: <value>;`, "vazando" um `color:red`
 * extra (ou pior, exfil via `background:url(...)`). Recusamos a declaração
 * inteira quando a chave traz `{`, `}`, `:`, `;` ou quebra de linha — análogo
 * ao {@link isSafeDeclarationValue} no lado do valor. Vale para IR
 * importada/gerada por IA com chaves "soltas".
 */
function isSafeDeclarationKey(key: string): boolean {
  return !/[{};:\r\n]/.test(key)
}

function renderRule(selector: string, declarations: GroupedDeclaration[]): string {
  const decls = declarations
    .filter(({ key, value }) => isSafeDeclarationKey(key) && isSafeDeclarationValue(value))
    .map(({ key, value }) => `  ${stripBraces(key)}: ${value};`)
    .join('\n')
  return `${stripBraces(selector)} {\n${decls}\n}`
}

/** Renderiza `@keyframes nome { at { decls } … }` (2 níveis de indentação). */
function renderKeyframes(entry: KeyframesCSS): string {
  const steps = entry.steps
    .map((step) => {
      const decls = cssDeclarationEntries(step.declarations)
        .filter(
          ({ property, value }) => isSafeDeclarationKey(property) && isSafeDeclarationValue(value),
        )
        .map(({ property, value }) => `    ${stripBraces(property)}: ${value};`)
        .join('\n')
      return `  ${stripBraces(step.at)} {\n${decls}\n  }`
    })
    .join('\n')
  return `@keyframes ${stripBraces(entry.name)} {\n${steps}\n}`
}

function isGoogleFont(entry: CSSEntry): entry is GoogleFontCSS {
  return 'type' in entry && entry.type === 'googleFont'
}

/** Monta o @import do Google Fonts (espaços viram +, ex.: "Press Start 2P"). */
function googleFontImport(family: string): string {
  const fam = family.trim().replace(/\s+/g, '+')
  return `@import url("https://fonts.googleapis.com/css?family=${fam}");`
}

function isRawCSS(entry: CSSEntry): entry is Extract<CSSEntry, { type: 'rawCSS' }> {
  return 'type' in entry && entry.type === 'rawCSS'
}

function isCommentCSS(entry: CSSEntry): entry is Extract<CSSEntry, { type: 'comment' }> {
  return 'type' in entry && entry.type === 'comment'
}

function isMediaQuery(entry: CSSEntry): entry is MediaQueryCSS {
  return 'type' in entry && entry.type === 'mediaQuery'
}

function isKeyframes(entry: CSSEntry): entry is KeyframesCSS {
  return 'type' in entry && entry.type === 'keyframes'
}
