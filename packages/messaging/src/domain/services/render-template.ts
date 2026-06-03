import type { Channel } from '../shared/channel'
import { err, ok, type Result } from '../shared/result'
import { MissingTemplateVariableError } from '../template/template.errors'

/** Forma mínima do template para renderização (desacopla do agregado/repo). */
export interface RenderableTemplate {
  channel: Channel
  subject: string | null
  body: string
  /** Variáveis OBRIGATÓRIAS declaradas no template. */
  variables: string[]
}

export interface RenderedMessage {
  subject: string | null
  body: string
}

const PLACEHOLDER = /\{\{\s*([\w.-]+)\s*\}\}/g

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)
}

function substitute(text: string, vars: Record<string, string>, escapeValues: boolean): string {
  return text.replace(PLACEHOLDER, (_match, key: string) => {
    const value = vars[key] ?? ''
    return escapeValues ? escapeHtml(value) : value
  })
}

/**
 * Renderiza um template substituindo `{{variavel}}` pelos valores fornecidos.
 *
 * - Valida que TODAS as variáveis obrigatórias declaradas vieram (senão erro).
 * - Em e-mail (corpo HTML), **escapa os VALORES** das variáveis (anti-injeção —
 *   os dados vêm de fora; o corpo do template é autorado pelo admin e pode ter HTML).
 * - WhatsApp é texto puro: sem escape. Assunto (e-mail) é texto puro: sem escape.
 * - É uma função PURA: nada de IO/relógio/aleatório → trivialmente testável.
 */
export function renderTemplate(
  template: RenderableTemplate,
  vars: Record<string, string>,
): Result<RenderedMessage, MissingTemplateVariableError> {
  const missing = template.variables.filter((name) => vars[name] === undefined)
  if (missing.length > 0) return err(new MissingTemplateVariableError(missing))

  const isEmail = template.channel === 'email'
  const subject =
    isEmail && template.subject !== null ? substitute(template.subject, vars, false) : null
  const body = substitute(template.body, vars, isEmail)

  return ok({ subject, body })
}
