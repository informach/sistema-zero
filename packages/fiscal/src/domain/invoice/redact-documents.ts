/**
 * Sanitiza texto que pode cruzar as fronteiras de observabilidade (banco, logs,
 * timeline e Sentry). Respostas externas podem ecoar CPF/CNPJ com pontuação ou
 * e-mail; não basta mascarar apenas sequências numéricas contínuas.
 */
export function redactSensitiveText(text: string): string {
  return text
    .replace(/\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g, '***')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '***')
    .replace(/\d{11,}/g, '***')
}

/** Mascara dados pessoais que a Sefin pode ecoar em mensagens de erro. */
export function redactDocuments<T extends { message: string }>(errors: T[]): T[] {
  return errors.map((error) => ({
    ...error,
    message: redactSensitiveText(error.message),
  }))
}
