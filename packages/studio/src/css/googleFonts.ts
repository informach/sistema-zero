/** Limite suficiente para nomes reais sem permitir payloads arbitrariamente grandes. */
const MAX_GOOGLE_FONT_FAMILY_LENGTH = 120

/**
 * Nomes de famílias, não sintaxe CSS nem parâmetros da API. Pontuação comum em
 * nomes humanos continua disponível; caracteres estruturais ficam de fora.
 */
const GOOGLE_FONT_FAMILY_NAME = /^[\p{L}\p{N}](?:[\p{L}\p{N} .&'_-]*[\p{L}\p{N}])?$/u

export function normalizeGoogleFontFamily(value: string): string | null {
  const family = value.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (family.length === 0 || family.length > MAX_GOOGLE_FONT_FAMILY_LENGTH) return null
  return GOOGLE_FONT_FAMILY_NAME.test(family) ? family : null
}

/** Codifica inclusive a pontuação que encodeURIComponent deixa sem escape. */
export function encodeGoogleFontFamily(value: string): string | null {
  const family = normalizeGoogleFontFamily(value)
  if (!family) return null
  return encodeURIComponent(family)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+')
}

/** Forma canônica única emitida pelo bloco e reconhecida pelo parser. */
export function googleFontImportRule(value: string): string | null {
  const family = encodeGoogleFontFamily(value)
  return family ? `@import url("https://fonts.googleapis.com/css?family=${family}");` : null
}

/**
 * Reconhece somente a forma exata produzida pelo Studio. Imports arbitrários,
 * parâmetros extras e hosts parecidos continuam como CSS avançado.
 */
export function parseGoogleFontImportRule(source: string): string | null {
  const match = /^@import url\("https:\/\/fonts\.googleapis\.com\/css\?family=([^"?#&]+)"\);$/.exec(
    source,
  )
  if (!match?.[1]) return null
  try {
    const family = normalizeGoogleFontFamily(decodeURIComponent(match[1].replace(/\+/g, ' ')))
    if (!family || googleFontImportRule(family) !== source) return null
    return family
  } catch {
    return null
  }
}
