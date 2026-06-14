import type { CSSEntry, CSSRule, KeyframesCSS, MediaQueryCSS } from '#ir'
import { countLines, SourceMapBuilder } from './sourceMap'

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
  const declIds = entry.__declIds
  return Object.entries(entry.declarations).map(([key, value]) => ({
    key,
    value,
    ...(declIds?.[key] ? { declId: declIds[key] } : {}),
  }))
}

export function generateCSSWithMap(entries: CSSEntry[]): GenerateCSSWithMapResult {
  const map = new SourceMapBuilder()
  if (entries.length === 0) return { code: '', map }

  // Agrupa entradas `CSSRule` CONSECUTIVAS de mesmo seletor num único bloco
  // visual (`.container {…}` não se repete quando o seletor virou vários
  // blocos — tipados + verbatim). Só funde adjacentes, então a cascata não
  // muda. Dentro do grupo, mantemos um SEGMENTO por `CSSRule` original para
  // que o realce por bloco mire apenas as declarações daquele bloco.
  const groups: RenderGroup[] = []
  for (const entry of entries) {
    if (isRawCSS(entry)) {
      groups.push({ kind: 'raw', ids: entry.__id ? [entry.__id] : [], code: entry.code.trim() })
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

function renderRule(selector: string, declarations: GroupedDeclaration[]): string {
  const decls = declarations.map(({ key, value }) => `  ${key}: ${value};`).join('\n')
  return `${selector} {\n${decls}\n}`
}

/** Renderiza `@keyframes nome { at { decls } … }` (2 níveis de indentação). */
function renderKeyframes(entry: KeyframesCSS): string {
  const steps = entry.steps
    .map((step) => {
      const decls = Object.entries(step.declarations)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join('\n')
      return `  ${step.at} {\n${decls}\n  }`
    })
    .join('\n')
  return `@keyframes ${entry.name} {\n${steps}\n}`
}

function isRawCSS(entry: CSSEntry): entry is Extract<CSSEntry, { type: 'rawCSS' }> {
  return 'type' in entry && entry.type === 'rawCSS'
}

function isMediaQuery(entry: CSSEntry): entry is MediaQueryCSS {
  return 'type' in entry && entry.type === 'mediaQuery'
}

function isKeyframes(entry: CSSEntry): entry is KeyframesCSS {
  return 'type' in entry && entry.type === 'keyframes'
}
