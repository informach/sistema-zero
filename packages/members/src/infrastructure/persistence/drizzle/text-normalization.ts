/**
 * Conjunto de caracteres removidos por `String.prototype.trim()` no JavaScript.
 *
 * `trim(text)` no PostgreSQL remove apenas espaço ASCII. Usar o segundo argumento de
 * `btrim` mantém as consultas de dados legados com a mesma régua da canonicalização
 * feita na entrada da aplicação.
 */
export const JAVASCRIPT_TRIM_CHARACTERS =
  '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'
