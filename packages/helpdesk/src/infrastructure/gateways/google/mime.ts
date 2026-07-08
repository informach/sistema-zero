import type { ParsedEmail } from '../../../domain/ports/gmail-client.port'
import type { AttachmentMeta } from '../../../domain/ticket/ticket-message'

/**
 * Parser PURO do payload de users.messages.get(format=full) do Gmail → ParsedEmail.
 * MIME é hostil (charsets, multipart aninhado, encoded-words RFC 2047, HTML-only):
 * o corpo NUNCA é pré-requisito — mensagem imparseável cai no snippet, nunca quebra.
 *
 * ⚠️ O `body.data` do Gmail já vem com o Content-Transfer-Encoding DECODIFICADO
 * (base64url dos bytes do corpo) — aqui só desfazemos o base64url e aplicamos o
 * charset. Encoded-words (RFC 2047) aparecem só em HEADERS (Subject/From).
 */

export interface GmailRawHeader {
  name: string
  value: string
}

export interface GmailRawPart {
  partId?: string
  mimeType?: string
  filename?: string
  headers?: GmailRawHeader[]
  body?: { attachmentId?: string; size?: number; data?: string }
  parts?: GmailRawPart[]
}

export interface GmailRawMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailRawPart
}

// ── Charset ──────────────────────────────────────────────────────────────────
function decodeCharset(bytes: Buffer, charset: string | null): string {
  const cs = (charset ?? 'utf-8').toLowerCase().trim()
  if (cs === 'utf-8' || cs === 'utf8') return bytes.toString('utf8')
  if (cs === 'us-ascii' || cs === 'ascii') return bytes.toString('ascii')
  if (
    cs === 'iso-8859-1' ||
    cs === 'latin1' ||
    cs === 'windows-1252' ||
    cs === 'cp1252' ||
    cs === 'iso-8859-15'
  ) {
    return bytes.toString('latin1')
  }
  // Fallback: utf8 (cobre a maioria; bytes inválidos viram replacement char).
  return bytes.toString('utf8')
}

// ── RFC 2047 encoded-words (headers) ─────────────────────────────────────────
const ENCODED_WORD_RE = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g

function decodeQ(text: string): Buffer {
  const out: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string
    if (ch === '_') {
      out.push(0x20)
    } else if (ch === '=' && i + 2 < text.length) {
      const code = Number.parseInt(text.slice(i + 1, i + 3), 16)
      if (Number.isNaN(code)) {
        out.push(ch.charCodeAt(0))
      } else {
        out.push(code)
        i += 2
      }
    } else {
      out.push(ch.charCodeAt(0))
    }
  }
  return Buffer.from(out)
}

export function decodeEncodedWords(input: string): string {
  if (!input.includes('=?')) return input.trim()
  // Espaço entre encoded-words adjacentes é irrelevante (RFC 2047) → remove.
  const collapsed = input.replace(/\?=\s+=\?/g, '?==?')
  return collapsed
    .replace(ENCODED_WORD_RE, (match, charset: string, enc: string, text: string) => {
      try {
        const bytes = enc.toLowerCase() === 'b' ? Buffer.from(text, 'base64') : decodeQ(text)
        return decodeCharset(bytes, charset)
      } catch {
        return match
      }
    })
    .trim()
}

// ── Endereços ("Nome <email>", separados por vírgula) ────────────────────────
function splitAddressList(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let inAngle = false
  for (const ch of value) {
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === '<') inAngle = true
    else if (ch === '>') inAngle = false
    if (ch === ',' && !inQuotes && !inAngle) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

function parseAddress(raw: string): { name: string | null; email: string | null } {
  const angle = raw.match(/<([^>]*)>/)
  if (angle) {
    const email = (angle[1] ?? '').trim() || null
    const namePart = raw.slice(0, angle.index).trim().replace(/^"|"$/g, '')
    const name = namePart ? decodeEncodedWords(namePart) : null
    return { name, email }
  }
  const email = raw.trim() || null
  return { name: null, email }
}

function parseAddressList(value: string | null): string[] {
  if (!value) return []
  return splitAddressList(value)
    .map((a) => parseAddress(a).email)
    .filter((e): e is string => e !== null)
}

// ── Headers ──────────────────────────────────────────────────────────────────
function headerLookup(headers: GmailRawHeader[] | undefined): (name: string) => string | null {
  const map = new Map<string, string>()
  for (const h of headers ?? []) {
    const key = h.name.toLowerCase()
    // Primeiro valor vence (Received etc. repetem; os que nos importam não).
    if (!map.has(key)) map.set(key, h.value)
  }
  return (name: string) => map.get(name.toLowerCase()) ?? null
}

function charsetOf(headers: GmailRawHeader[] | undefined): string | null {
  const ct = headerLookup(headers)('content-type')
  if (!ct) return null
  const m = ct.match(/charset=("?)([^";]+)\1/i)
  return m ? (m[2] ?? null) : null
}

// ── HTML → texto (fallback quando não há text/plain) ─────────────────────────
function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

// ── Walk recursivo do corpo/anexos ───────────────────────────────────────────
interface BodyAcc {
  text: string | null
  html: string | null
  attachments: AttachmentMeta[]
}

function decodePartBody(part: GmailRawPart): string {
  const data = part.body?.data
  if (!data) return ''
  return decodeCharset(Buffer.from(data, 'base64url'), charsetOf(part.headers))
}

function walkParts(part: GmailRawPart, acc: BodyAcc): void {
  const mime = (part.mimeType ?? '').toLowerCase()
  const filename = (part.filename ?? '').trim()
  if (filename) {
    acc.attachments.push({
      filename: decodeEncodedWords(filename),
      mimeType: part.mimeType ?? 'application/octet-stream',
      sizeBytes: part.body?.size ?? 0,
      gmailAttachmentId: part.body?.attachmentId ?? '',
    })
    return
  }
  if (mime === 'text/plain' && part.body?.data && acc.text === null) {
    acc.text = decodePartBody(part)
  } else if (mime === 'text/html' && part.body?.data && acc.html === null) {
    acc.html = decodePartBody(part)
  }
  for (const child of part.parts ?? []) walkParts(child, acc)
}

/** Converte a mensagem crua do Gmail em ParsedEmail (nunca lança). */
export function parseGmailMessage(raw: GmailRawMessage): ParsedEmail {
  const payload = raw.payload ?? {}
  const header = headerLookup(payload.headers)
  const acc: BodyAcc = { text: null, html: null, attachments: [] }
  walkParts(payload, acc)

  const snippet = raw.snippet ? decodeHtmlEntities(raw.snippet) : null
  const bodyText = (acc.text ?? (acc.html ? htmlToText(acc.html) : (snippet ?? ''))).trim()

  const internalDate =
    raw.internalDate && /^\d+$/.test(raw.internalDate) ? new Date(Number(raw.internalDate)) : null

  const from = parseAddress(header('from') ?? '')
  const references = (header('references') ?? '')
    .split(/\s+/)
    .map((r) => r.trim())
    .filter(Boolean)

  return {
    gmailMessageId: raw.id,
    gmailThreadId: raw.threadId,
    rfc822MessageId: (header('message-id') ?? '').trim() || null,
    inReplyTo: (header('in-reply-to') ?? '').trim() || null,
    references,
    fromEmail: from.email,
    fromName: from.name,
    toEmails: parseAddressList(header('to')),
    ccEmails: parseAddressList(header('cc')),
    subject: decodeEncodedWords(header('subject') ?? ''),
    bodyText,
    bodyHtml: acc.html,
    snippet,
    attachments: acc.attachments,
    internalDate,
    labelIds: raw.labelIds ?? [],
    autoSubmitted: header('auto-submitted'),
    listUnsubscribe: header('list-unsubscribe'),
    isAutoreply: header('x-autoreply') !== null || header('x-auto-response-suppress') !== null,
  }
}

/** O `snippet` do Gmail vem com entidades HTML (`&amp;` etc.). */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
}
