/**
 * Monta uma mensagem RFC 2822 (resposta) e devolve o `raw` base64url que o
 * users.messages.send do Gmail espera. PURO e testável.
 *
 * Threading: `In-Reply-To`/`References` apontam para o último inbound do cliente
 * — o cliente de e-mail dele agrupa a resposta na mesma conversa. Do NOSSO lado,
 * o `threadId` passado ao send já mantém tudo na thread do Gmail.
 */
export interface ReplyMessageInput {
  fromName: string
  fromEmail: string
  toName: string | null
  toEmail: string
  subject: string
  bodyText: string
  /** Message-ID (com `<>`) do último inbound. */
  inReplyTo: string | null
  /** Cadeia de References (já com o Message-ID do último inbound no fim). */
  references: string[]
  /** Message-ID novo desta resposta (com `<>`). */
  messageId: string
}

const CRLF = '\r\n'
// biome-ignore lint/suspicious/noControlCharactersInRegex: fronteira ASCII (0x00-0x7F) p/ decidir RFC 2047.
const ASCII_ONLY = /^[\x00-\x7F]*$/

function isAscii(text: string): boolean {
  return ASCII_ONLY.test(text)
}

/** Codifica um valor de header em encoded-word RFC 2047 quando tem não-ASCII. */
function encodeHeaderWord(text: string): string {
  if (isAscii(text)) return text
  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`
}

/** `Nome <email>` (nome codificado/entre aspas quando necessário). */
function formatAddress(name: string | null, email: string): string {
  if (!name) return email
  if (isAscii(name)) {
    // Nome ASCII com caractere especial de header precisa de aspas.
    return /[",<>@:;]/.test(name)
      ? `"${name.replace(/"/g, '\\"')}" <${email}>`
      : `${name} <${email}>`
  }
  return `${encodeHeaderWord(name)} <${email}>`
}

/** base64 com quebra a cada 76 colunas (RFC 2045). */
function base64Body(bodyText: string): string {
  const b64 = Buffer.from(bodyText, 'utf8').toString('base64')
  return (b64.match(/.{1,76}/g) ?? []).join(CRLF)
}

export function buildReplyRaw(input: ReplyMessageInput): string {
  const headers: string[] = [
    `From: ${formatAddress(input.fromName, input.fromEmail)}`,
    `To: ${formatAddress(input.toName, input.toEmail)}`,
    `Subject: ${encodeHeaderWord(input.subject)}`,
    `Message-ID: ${input.messageId}`,
  ]
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`)
  if (input.references.length > 0) headers.push(`References: ${input.references.join(' ')}`)
  headers.push(
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  )
  const raw = `${headers.join(CRLF)}${CRLF}${CRLF}${base64Body(input.bodyText)}`
  return Buffer.from(raw, 'utf8').toString('base64url')
}
