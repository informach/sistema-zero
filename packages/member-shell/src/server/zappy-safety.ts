import 'server-only'
import { redactStudioTutorSecrets } from '@sistemazero/studio/tutor-safety'

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu
const CPF_RE = /\b\d{3}[.-]?\d{3}[.-]?\d{3}-?\d{2}\b/g
const BIRTH_DATE_RE = /\b(?:0?[1-9]|[12]\d|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}\b/g
const PHONE_RE = /(?<!\d)(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?9?\d{4}[\s.-]*\d{4}(?!\d)/g
const SOCIAL_HANDLE_RE =
  /\b(?:instagram|insta|tiktok|discord|rede social)\s*(?:e|é|:)?\s*@?[a-z0-9_.-]{2,32}/giu
const LABELED_PII_RE =
  /\b(?:meu|minha)\s+(?:nome(?: completo)?|endereço|endereco|escola|telefone|celular|e-mail|email)\s*(?:é|e|:|fica em)\s*[^,.!?\n]{2,120}/giu
const CHILD_IDENTITY_RE = /\bme chamo\s+[^,.!?\n]{2,80}/giu
const CHILD_LOCATION_RE = /\b(?:moro|estudo)\s+(?:na|no|em)\s+[^.!?\n]{2,160}/giu

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function redactZappyPii(value: string): { text: string; hadPii: boolean } {
  let hadPii = false
  const redact = (pattern: RegExp, replacement: string) => {
    const next = valueAfter.replace(pattern, () => {
      hadPii = true
      return replacement
    })
    valueAfter = next
  }
  let valueAfter = value
  redact(EMAIL_RE, '[e-mail removido]')
  redact(CPF_RE, '[documento removido]')
  redact(BIRTH_DATE_RE, '[data removida]')
  redact(PHONE_RE, '[telefone removido]')
  redact(SOCIAL_HANDLE_RE, '[rede social removida]')
  redact(LABELED_PII_RE, '[dado pessoal removido]')
  redact(CHILD_IDENTITY_RE, '[nome removido]')
  redact(CHILD_LOCATION_RE, '[local removido]')
  return { text: valueAfter, hadPii }
}

export function redactZappySensitiveText(value: string): {
  text: string
  hadPii: boolean
  hadSecret: boolean
} {
  const pii = redactZappyPii(value)
  const secret = redactStudioTutorSecrets(pii.text)
  return { text: secret.text, hadPii: pii.hadPii, hadSecret: secret.hadSecret }
}

export function isZappySelfHarmText(value: string): boolean {
  const text = normalized(value)
  return /\b(?:suicid[a-z]*|autoagressao|automutilacao|me matar|me machucar|me ferir|me cortar|cortar (?:meus )?pulsos|tirar (?:a )?minha vida|acabar com (?:a )?minha vida|quero morrer|queria morrer|nao quero (?:mais )?viver|nao aguento mais (?:viver|a vida)|queria estar mort[oa]|sumir para sempre)\b/.test(
    text,
  )
}

export function isUnsafeZappyText(value: string): boolean {
  const text = normalized(value)
  return (
    /\b(?:sexo|sexual|pornografia|porno|nudes?|estupro)\b/.test(text) ||
    isZappySelfHarmText(text) ||
    /\b(?:como )?(?:matar|ferir) (?:uma pessoa|alguem|meus pais|meu professor)\b/.test(text) ||
    /\b(?:fazer|montar|construir) (?:uma )?(?:bomba|arma de verdade)\b/.test(text) ||
    /\b(?:manda|mande|envie|me mostra|mostre) (?:uma )?(?:foto|nude)\b/.test(text) ||
    /\b(?:nao conte|fica em segredo|esconda dos seus pais)\b/.test(text)
  )
}

/**
 * Telefone na RESPOSTA exige cara de telefone (DDD presente, ≥10 dígitos): o
 * PHONE_RE largo reprovava qualquer sequência de 8 dígitos (pontuação, id,
 * tamanho) e derrubava respostas boas do modelo. A redação da PERGUNTA da
 * criança continua com o regex largo — lá, redigir demais é inofensivo.
 */
const ANSWER_PHONE_RE = /(?<!\d)(?:\+?55[\s.-]*)?\(?[1-9]\d\)?[\s.-]*9?\d{4}[\s.-]?\d{4}(?!\d)/g

function answerHasPii(value: string): boolean {
  for (const pattern of [
    EMAIL_RE,
    CPF_RE,
    BIRTH_DATE_RE,
    ANSWER_PHONE_RE,
    SOCIAL_HANDLE_RE,
    LABELED_PII_RE,
    CHILD_IDENTITY_RE,
    CHILD_LOCATION_RE,
  ]) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return true
  }
  return false
}

export function isSafeZappyAnswer(value: string): boolean {
  if (isUnsafeZappyText(value) || answerHasPii(value)) return false
  const text = normalized(value)
  return !/\b(?:qual|diga|conte|envie|mande)\b.{0,40}\b(?:nome completo|endereco|telefone|e-mail|email|escola|foto|rede social)\b/.test(
    text,
  )
}
