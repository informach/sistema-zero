export interface TrechoComLink {
  texto: string
  href?: string
}

/** Links internos e de atendimento da copy editorial, renderizados como texto pelo Astro. */
export function comLinks(texto: string): TrechoComLink[] {
  const trechos: TrechoComLink[] = []
  let cursor = 0
  for (const match of texto.matchAll(/\[([^\]]+)\]\(([^\s)]+)\)/g)) {
    const [literal, label, href] = match
    if (!label || !href || !/^(?:#[\w-]+$|\/(?!\/)|mailto:)/.test(href)) continue
    if (match.index > cursor) trechos.push({ texto: texto.slice(cursor, match.index) })
    trechos.push({ texto: label, href })
    cursor = match.index + literal.length
  }
  if (cursor < texto.length) trechos.push({ texto: texto.slice(cursor) })
  return trechos
}
