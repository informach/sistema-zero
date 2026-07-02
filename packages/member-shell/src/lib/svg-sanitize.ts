/**
 * Sanitizador de SVG gerado por LLM (ícone do jogo no Pensa) — allowlist ESTRITA.
 * Roda no BFF ANTES de persistir o artefato; o pacote pensa ainda renderiza via
 * `<img src="data:image/svg+xml...">` (sem execução de script) como defesa em
 * profundidade. PURO (sem DOM — regex/parse manual) p/ rodar no server e em teste.
 *
 * Política: um ícone é DESENHO (formas + gradientes). Qualquer coisa executável,
 * externa ou interativa é REMOVIDA; documento que não sobreviver vira `null`.
 */

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'title',
])

const ALLOWED_ATTRS = new Set([
  'xmlns',
  'viewbox',
  'width',
  'height',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'fill-rule',
  'clip-rule',
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'transform',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientunits',
  'gradienttransform',
  'id',
])

/** Teto do documento (ícone legítimo é pequeno). */
export const SVG_MAX_CHARS = 8_192

/** `url(#id)` interno é permitido em fill/stroke (gradiente); qualquer outra url não. */
const SAFE_URL_REF = /^url\(#[A-Za-z0-9_-]{1,64}\)$/

function attrValueIsSafe(name: string, value: string): boolean {
  const v = value.trim().toLowerCase()
  // Nada de scripts/dados/urls externas em NENHUM atributo.
  if (v.includes('javascript:') || v.includes('data:') || v.includes('&#')) return false
  if (v.includes('url(')) {
    return (name === 'fill' || name === 'stroke') && SAFE_URL_REF.test(value.trim())
  }
  if (name === 'id') return /^[A-Za-z0-9_-]{1,64}$/.test(value)
  return true
}

/**
 * Sanitiza um SVG de ícone. Devolve o documento reescrito só com elementos e
 * atributos da allowlist, ou `null` quando o resultado não é um ícone utilizável
 * (sem `<svg>`, grande demais, sem nenhuma forma).
 */
export function sanitizeIconSvg(raw: string): string | null {
  if (typeof raw !== 'string') return null
  const input = raw.trim()
  if (!input || input.length > SVG_MAX_CHARS) return null
  // Comentários/CDATA/doctype/instruções fora — nada disso pertence a um ícone.
  const stripped = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')

  const tagRe = /<\s*(\/?)([A-Za-z][A-Za-z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)\s*>/g
  const out: string[] = []
  const openStack: string[] = []
  let sawSvg = false
  let sawShape = false
  let match: RegExpExecArray | null = tagRe.exec(stripped)
  while (match !== null) {
    const closing = match[1] ?? ''
    const rawName = match[2] ?? ''
    const rawAttrs = match[3] ?? ''
    const selfClosing = match[4] ?? ''
    const name = rawName.toLowerCase()
    if (ALLOWED_ELEMENTS.has(name)) {
      if (closing) {
        // Fecha só o que está aberto (descarta fechamento desequilibrado).
        const idx = openStack.lastIndexOf(name)
        if (idx !== -1) {
          // Fecha implicitamente elementos internos abertos fora de ordem.
          while (openStack.length > idx) {
            const top = openStack.pop()
            out.push(`</${top}>`)
          }
        }
      } else {
        if (name === 'svg') sawSvg = true
        if (['path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon'].includes(name)) {
          sawShape = true
        }
        const attrs = sanitizeAttrs(rawAttrs)
        const original = rawName === 'linearGradient' || rawName === 'radialGradient'
        // Preserva o camelCase dos gradientes (SVG é case-sensitive nesses nomes).
        const emitName = original ? rawName : name
        if (selfClosing) {
          out.push(`<${emitName}${attrs}/>`)
        } else {
          out.push(`<${emitName}${attrs}>`)
          openStack.push(emitName)
        }
      }
    }
    // Elemento fora da allowlist: some (inclusive script/foreignObject/image/use).
    match = tagRe.exec(stripped)
  }
  while (openStack.length > 0) out.push(`</${openStack.pop()}>`)

  if (!sawSvg || !sawShape) return null
  const doc = out.join('')
  // `<title>` sobrevive só como container vazio (o conteúdo textual foi descartado
  // junto com todo texto fora de tags) — inofensivo; formas são o que importa.
  return doc.length <= SVG_MAX_CHARS ? doc : null
}

function sanitizeAttrs(rawAttrs: string): string {
  const attrRe = /([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g
  const parts: string[] = []
  let m: RegExpExecArray | null = attrRe.exec(rawAttrs)
  while (m !== null) {
    const name = (m[1] ?? '').toLowerCase()
    const value = m[3] ?? m[4] ?? ''
    // on* (handlers), href/xlink:href, style, class — todos fora da allowlist.
    if (ALLOWED_ATTRS.has(name) && !name.startsWith('on') && attrValueIsSafe(name, value)) {
      // Emite o nome canônico (viewBox/gradientUnits são case-sensitive no SVG).
      const canonical =
        name === 'viewbox'
          ? 'viewBox'
          : name === 'gradientunits'
            ? 'gradientUnits'
            : name === 'gradienttransform'
              ? 'gradientTransform'
              : name
      parts.push(`${canonical}="${value.replace(/[<>&"]/g, '')}"`)
    }
    m = attrRe.exec(rawAttrs)
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : ''
}
