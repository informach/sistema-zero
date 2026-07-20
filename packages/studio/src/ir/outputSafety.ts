/** Resultado comum usado pelo diagnóstico e pelo gerador de CSS. */
export type CSSDeclarationOutput =
  | { accepted: true; property: string; value: string }
  | { accepted: false; message: string }

export interface CSSLooseBrace {
  index: number
  brace: '{' | '}'
}

interface CSSStructuralScan {
  looseBrace: CSSLooseBrace | null
  lexicallyClosed: boolean
}

/**
 * Lê texto estrutural de CSS sem confundir chaves reais com caracteres dentro
 * de strings, comentários ou escapes. Seletor, schema, parser e gerador usam a
 * mesma máquina para não discordarem sobre onde uma regra começa.
 */
function scanCSSStructuralText(value: string, start = 0): CSSStructuralScan {
  let quote: '"' | "'" | null = null
  let inComment = false
  let escapedAtEnd = false

  for (let index = start; index < value.length; index += 1) {
    const character = value[index]
    const next = value[index + 1]
    if (inComment) {
      if (character === '*' && next === '/') {
        inComment = false
        index += 1
      }
      continue
    }
    if (character === '\\') {
      if (index + 1 >= value.length) escapedAtEnd = true
      else index += 1
      continue
    }
    if (quote) {
      if (character === quote) quote = null
      continue
    }
    if (character === '/' && next === '*') {
      inComment = true
      index += 1
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === '{' || character === '}') {
      return {
        looseBrace: { index, brace: character },
        lexicallyClosed: quote === null && !inComment && !escapedAtEnd,
      }
    }
  }

  return { looseBrace: null, lexicallyClosed: quote === null && !inComment && !escapedAtEnd }
}

export function findCSSLooseBrace(value: string, start = 0): CSSLooseBrace | null {
  return scanCSSStructuralText(value, start).looseBrace
}

/** Motivo amigável para um seletor que não pode ser delimitado com segurança. */
export function cssSelectorRejectionReason(selector: string): string | null {
  const scan = scanCSSStructuralText(selector)
  if (scan.looseBrace) {
    return 'O seletor contém uma chave solta que pode quebrar a regra CSS.'
  }
  if (!scan.lexicallyClosed) {
    return 'O seletor termina com aspas, comentário ou escape incompleto.'
  }
  return null
}

/** Motivo amigável para texto que conseguiria escapar de `/* ... *\/`. */
export function cssCommentRejectionReason(text: string): string | null {
  return text.includes('*/')
    ? 'O texto contém “*/”, que tentaria fechar o comentário CSS antes da hora.'
    : null
}

/**
 * Valida uma declaração sem confundir `;` de data URL/string com uma segunda
 * declaração. Um único `;` no fim é só a pontuação que uma criança costuma
 * copiar do CSS textual: ele é normalizado, não descartado.
 */
export function prepareCSSDeclaration(property: string, value: string): CSSDeclarationOutput {
  if (/[{};:\r\n]/.test(property)) {
    return {
      accepted: false,
      message: `A propriedade “${property}” contém pontuação que não faz parte do nome.`,
    }
  }

  let paren = 0
  let quote: '"' | "'" | null = null
  let inComment = false
  const topLevelSemicolons: number[] = []

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    const next = value[index + 1]
    if (inComment) {
      if (character === '*' && next === '/') {
        inComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (character === '\\') {
        index += 1
        continue
      }
      if (character === quote) quote = null
      continue
    }
    if (character === '/' && next === '*') {
      inComment = true
      index += 1
      continue
    }
    if (character === '"' || character === "'") quote = character
    else if (character === '(') paren += 1
    else if (character === ')' && paren > 0) paren -= 1
    else if (character === '{' || character === '}') {
      return {
        accepted: false,
        message: 'O valor contém uma chave solta que pode quebrar a regra CSS.',
      }
    } else if (character === ';' && paren === 0) {
      topLevelSemicolons.push(index)
    }
  }

  if (topLevelSemicolons.length === 0) return { accepted: true, property, value }

  const terminalIndex = value.trimEnd().length - 1
  if (topLevelSemicolons.length === 1 && topLevelSemicolons[0] === terminalIndex) {
    return {
      accepted: true,
      property,
      value: value.slice(0, terminalIndex).trimEnd(),
    }
  }

  return {
    accepted: false,
    message: 'Este valor tenta escrever mais de uma declaração CSS. Use um bloco para cada uma.',
  }
}

const VALID_HTML_ATTRIBUTE_NAME = /^[A-Za-z_:][A-Za-z0-9_:.-]*$/

const HTML_URL_ATTRIBUTES: ReadonlySet<string> = new Set([
  'href',
  'src',
  'xlink:href',
  'formaction',
  'action',
  'poster',
  'background',
  'cite',
  'longdesc',
  'data',
  'srcset',
  'ping',
  'manifest',
])

function isDangerousHTMLUrl(value: string): boolean {
  // O navegador ignora controles e espaços dentro de esquemas como
  // `java\tscript:`; normalize antes de comparar para fechar esse bypass.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: a remoção é a defesa contra controles no esquema da URL.
  const cleaned = value.replace(/[\u0000-\u0020]/g, '').toLowerCase()
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(cleaned)?.[1]
  if (!scheme) return false
  if (scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel') {
    return false
  }
  if (scheme === 'data') return !cleaned.startsWith('data:image/')
  return true
}

/** Motivo amigável para um atributo que o gerador precisa recusar. */
export function htmlAttributeRejectionReason(name: string, value: string): string | null {
  if (!VALID_HTML_ATTRIBUTE_NAME.test(name)) {
    return `O nome do atributo “${name}” contém caracteres que não são permitidos.`
  }
  if (/^on/i.test(name)) {
    return `O atributo “${name}” executaria código diretamente e não é permitido.`
  }
  if (HTML_URL_ATTRIBUTES.has(name.toLowerCase()) && isDangerousHTMLUrl(value)) {
    return `O endereço não é permitido no atributo “${name}”. Use um link seguro ou relativo.`
  }
  return null
}
