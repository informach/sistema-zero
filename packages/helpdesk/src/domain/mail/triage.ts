import type { TriageKind, TriageRulesView } from '@sistemazero/helpdesk-contracts'

/**
 * Triagem PURA de um e-mail na chegada: decide se ele é atendimento (`human`) ou
 * ruído que não deve abrir ticket. Sem I/O, sem relógio, idempotente.
 *
 * Sinais FORTES decidem sozinhos; sinais FRACOS só decidem em dupla, porque
 * ferramentas de CRM (HubSpot, SendGrid) põem `List-Unsubscribe`/`Feedback-ID`/
 * `Precedence: bulk` em e-mail 1:1 de gente de verdade. Errar para o lado do
 * atendimento é barato (a equipe rebaixa); errar para o lado do ruído esconde
 * um cliente.
 */

export type TriageRules = TriageRulesView

export const DEFAULT_TRIAGE_RULES: TriageRules = {
  ignoredSenders: [],
  internalDomains: ['sistemazero.com.br'],
}

export interface TriageInput {
  /** Decidida pela caixa conectada (from == contato@), nunca por dado do cliente. */
  direction: 'inbound' | 'outbound'
  fromEmail: string | null
  toEmails: string[]
  ccEmails: string[]
  /** Cabeçalhos em minúsculas (allowlist do parser); ausente = `{}`. */
  headers: Record<string, string>
  labelIds: string[]
}

export interface TriageVerdict {
  kind: TriageKind
  /** Nome estável da regra que decidiu (`kind:motivo`). */
  rule: string
  /** O valor que casou, para a equipe entender o porquê. Nunca contém corpo. */
  evidence: string | null
}

export const HUMAN_VERDICT: TriageVerdict = { kind: 'human', rule: 'human', evidence: null }

const BOUNCE_LOCAL_PARTS = new Set(['mailer-daemon', 'postmaster'])
/** Local-part com segmento típico de remetente automático (`payments-noreply` conta). */
const SYSTEM_LOCAL_PART_RE =
  /(^|[._+-])(no-?reply|do-?not-?reply|notifications?|alerts?|mailer(-daemon)?|newsletter|bounces?)([._+-]|$)/i
const BULK_WEAK_LABELS = new Set(['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS'])
const SYSTEM_WEAK_LABEL = 'CATEGORY_UPDATES'

const normalizeEmail = (email: string | null | undefined): string | null => {
  const trimmed = email?.trim().toLowerCase() ?? ''
  return trimmed || null
}

const localPartOf = (email: string): string => email.split('@')[0] ?? ''
const domainOf = (email: string): string => email.split('@')[1] ?? ''

/** `@dominio` casa o domínio e os subdomínios; endereço completo casa exato. */
function matchesSenderRule(email: string, rule: string): boolean {
  if (rule.startsWith('@')) {
    const domain = rule.slice(1)
    const senderDomain = domainOf(email)
    return senderDomain === domain || senderDomain.endsWith(`.${domain}`)
  }
  return email === rule
}

function isInternalAddress(email: string, internalDomains: string[]): boolean {
  const domain = domainOf(email)
  return internalDomains.some((internal) => domain === internal || domain.endsWith(`.${internal}`))
}

/** Primeiro token do `Auto-Submitted` (RFC 3834), sem parâmetros. */
function autoSubmittedValue(headers: Record<string, string>): string | null {
  const raw = headers['auto-submitted']
  if (!raw) return null
  const token = raw.split(';')[0]?.trim().toLowerCase() ?? ''
  return token || null
}

function precedenceValue(headers: Record<string, string>): string | null {
  const raw = headers.precedence
  return raw ? raw.trim().toLowerCase() : null
}

export function triageEmail(input: TriageInput, rules: TriageRules): TriageVerdict {
  const headers = input.headers
  const from = normalizeEmail(input.fromEmail)
  const localPart = from ? localPartOf(from) : ''
  const verdict = (kind: TriageKind, rule: string, evidence: string | null): TriageVerdict => ({
    kind,
    rule,
    evidence,
  })

  // 1. Devolução de entrega (sinais fortes).
  const returnPath = headers['return-path']?.trim()
  if (returnPath !== undefined && (returnPath === '' || returnPath === '<>')) {
    return verdict('bounce', 'bounce:return-path-empty', 'Return-Path: <>')
  }
  if (from && BOUNCE_LOCAL_PARTS.has(localPart)) {
    return verdict('bounce', 'bounce:mailer-daemon', from)
  }
  const contentType = headers['content-type']?.toLowerCase() ?? ''
  if (contentType.startsWith('multipart/report') && contentType.includes('delivery-status')) {
    return verdict(
      'bounce',
      'bounce:delivery-status',
      'multipart/report; report-type=delivery-status',
    )
  }
  if (headers['x-failed-recipients'] !== undefined) {
    return verdict('bounce', 'bounce:failed-recipients', headers['x-failed-recipients'] ?? null)
  }

  // 2. Resposta automática (sinais fortes).
  const autoSubmitted = autoSubmittedValue(headers)
  const precedence = precedenceValue(headers)
  if (autoSubmitted === 'auto-replied') {
    return verdict('auto_reply', 'auto_reply:auto-submitted', `Auto-Submitted: ${autoSubmitted}`)
  }
  if (headers['x-autoreply'] !== undefined) {
    return verdict('auto_reply', 'auto_reply:header', 'X-Autoreply')
  }
  if (headers['x-auto-response-suppress'] !== undefined) {
    return verdict('auto_reply', 'auto_reply:header', 'X-Auto-Response-Suppress')
  }
  if (precedence === 'auto_reply') {
    return verdict('auto_reply', 'auto_reply:header', 'Precedence: auto_reply')
  }

  // 3. Sistema (sinais fortes).
  if (autoSubmitted !== null && autoSubmitted !== 'no') {
    return verdict('system', 'system:auto-submitted', `Auto-Submitted: ${autoSubmitted}`)
  }
  if (from && SYSTEM_LOCAL_PART_RE.test(localPart)) {
    return verdict('system', 'system:sender-local-part', from)
  }
  if (from && rules.ignoredSenders.some((rule) => matchesSenderRule(from, rule))) {
    return verdict('system', 'system:ignored-sender', from)
  }

  // 4. Lista/newsletter (sinais fortes).
  if (headers['list-id'] !== undefined) {
    return verdict('bulk', 'bulk:list-header', `List-Id: ${headers['list-id']}`)
  }
  if (headers['list-post'] !== undefined) {
    return verdict('bulk', 'bulk:list-header', 'List-Post')
  }
  if (precedence === 'list' || precedence === 'junk') {
    return verdict('bulk', 'bulk:list-header', `Precedence: ${precedence}`)
  }

  // 3b/4b. Sinais fracos: só decidem em dupla. Um sozinho é atendimento.
  const weakBulk: string[] = []
  if (headers['list-unsubscribe'] !== undefined) weakBulk.push('List-Unsubscribe')
  if (headers['feedback-id'] !== undefined) weakBulk.push('Feedback-ID')
  if (precedence === 'bulk') weakBulk.push('Precedence: bulk')
  for (const label of input.labelIds) {
    if (BULK_WEAK_LABELS.has(label)) weakBulk.push(label)
  }
  const weakSystem = input.labelIds.includes(SYSTEM_WEAK_LABEL)
  if (weakSystem && weakBulk.length >= 1) {
    return verdict('system', 'system:weak-signals', [SYSTEM_WEAK_LABEL, ...weakBulk].join(' + '))
  }
  if (weakBulk.length >= 2) {
    return verdict('bulk', 'bulk:weak-signals', weakBulk.join(' + '))
  }

  // 5. Interno: SÓ mensagem enviada por nós cujos destinatários são TODOS internos.
  // Inbound vindo do domínio interno (equipe encaminhando e-mail de cliente para
  // contato@) é atendimento, de propósito.
  if (input.direction === 'outbound') {
    const recipients = [...input.toEmails, ...input.ccEmails]
      .map(normalizeEmail)
      .filter((email): email is string => email !== null)
    if (
      recipients.length > 0 &&
      recipients.every((email) => isInternalAddress(email, rules.internalDomains))
    ) {
      return verdict('internal', 'internal:all-recipients-internal', recipients.join(', '))
    }
  }

  return HUMAN_VERDICT
}

/** Só a regra de endereço/direção (sem cabeçalhos) — o que o banco sabe sem o Gmail. */
export function triageByAddressOnly(
  input: Omit<TriageInput, 'headers' | 'labelIds'>,
  rules: TriageRules,
): TriageVerdict {
  return triageEmail({ ...input, headers: {}, labelIds: [] }, rules)
}

const MAX_RULE_ENTRIES = 200
const MAX_INTERNAL_DOMAINS = 50
const DOMAIN_RE =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/
const ADDRESS_RE = /^[^\s@]+@[^\s@]+$/

export interface TriageRulesProblem {
  field: keyof TriageRules
  value: string
  reason: string
}

/**
 * Normaliza (minúsculas, sem espaços, sem duplicata) e valida as regras. Devolve
 * os problemas em vez de lançar: o service traduz em erro de domínio 400.
 */
export function normalizeTriageRules(input: TriageRules): {
  rules: TriageRules
  problems: TriageRulesProblem[]
} {
  const problems: TriageRulesProblem[] = []
  const ignoredSenders: string[] = []
  for (const raw of input.ignoredSenders) {
    const value = raw.trim().toLowerCase()
    if (!value) continue
    if (value.startsWith('@')) {
      if (!DOMAIN_RE.test(value.slice(1))) {
        problems.push({ field: 'ignoredSenders', value, reason: 'domínio inválido' })
        continue
      }
    } else if (!ADDRESS_RE.test(value) || !DOMAIN_RE.test(domainOf(value))) {
      problems.push({
        field: 'ignoredSenders',
        value,
        reason: 'use endereco@dominio ou @dominio',
      })
      continue
    }
    if (!ignoredSenders.includes(value)) ignoredSenders.push(value)
  }
  if (ignoredSenders.length > MAX_RULE_ENTRIES) {
    problems.push({
      field: 'ignoredSenders',
      value: String(ignoredSenders.length),
      reason: `no máximo ${MAX_RULE_ENTRIES} remetentes`,
    })
  }

  const internalDomains: string[] = []
  for (const raw of input.internalDomains) {
    const value = raw.trim().toLowerCase().replace(/^@/, '')
    if (!value) continue
    if (!DOMAIN_RE.test(value)) {
      problems.push({ field: 'internalDomains', value, reason: 'domínio inválido' })
      continue
    }
    if (!internalDomains.includes(value)) internalDomains.push(value)
  }
  if (internalDomains.length === 0) {
    problems.push({
      field: 'internalDomains',
      value: '',
      reason: 'informe ao menos um domínio interno',
    })
  }
  if (internalDomains.length > MAX_INTERNAL_DOMAINS) {
    problems.push({
      field: 'internalDomains',
      value: String(internalDomains.length),
      reason: `no máximo ${MAX_INTERNAL_DOMAINS} domínios`,
    })
  }
  return { rules: { ignoredSenders, internalDomains }, problems }
}
