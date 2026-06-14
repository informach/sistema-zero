/**
 * Normalização de identificadores JS — compartilhada entre o gerador de código
 * (`expr.ts`/`js.ts`) e a camada de blocos (`paramsMutator.ts`), para que o
 * nome materializado no MODELO do bloco case com o nome emitido no código.
 */

const JS_RESERVED_WORDS = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

/**
 * Identificador JS válido por Unicode (espelha a gramática real: `ID_Start`/
 * `ID_Continue` + `$`/`_`). Usado para PRESERVAR nomes legais — inclusive os
 * acentuados em pt-BR (`número`, `posição`, `calcularÁrea`) — em vez de trocar
 * cada caractere fora de `[A-Za-z0-9_$]` por `_` (que mutilava o nome a cada
 * geração Blocos→Código).
 */
const VALID_JS_IDENTIFIER = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u

export function normalizeIdentifier(name: string): string {
  // Nome já é um identificador JS válido (mesmo com letras acentuadas): mantém
  // como está, só evita colidir com palavra reservada. Sem este atalho, um nome
  // pt-BR perfeitamente legal como `número` virava `n_mero`.
  if (VALID_JS_IDENTIFIER.test(name)) {
    return JS_RESERVED_WORDS.has(name) ? `${name}_` : name
  }
  // Nome genuinamente inválido: colapsa caracteres ilegais, prefixa dígito
  // inicial e desambigua palavra reservada.
  const cleaned = name.replace(/[^A-Za-z0-9_$]/g, '_')
  const withPrefix = /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned || '_'
  return JS_RESERVED_WORDS.has(withPrefix) ? `${withPrefix}_` : withPrefix
}

export function safeIdent(name: string): string {
  return normalizeIdentifier(name)
}
