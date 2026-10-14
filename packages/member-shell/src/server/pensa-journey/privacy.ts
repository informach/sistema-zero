import 'server-only'
import { redactStudioTutorSecrets } from '@sistemazero/studio/tutor-safety'
import { isZappySelfHarmText } from '../zappy-safety'

/**
 * Privacidade e segurança da NARRATIVA do Pensa (full review de 14/10/2026).
 *
 * ⚠️⚠️ Não é o filtro do tutor do Estúdio, e não pode ser. O tutor responde dúvida de
 * programação, então recusa assunto que não é programação e apaga a frase inteira depois de
 * "meu nome é" (lá, redigir demais é inofensivo). No Pensa a criança CONTA UMA IDEIA DE JOGO:
 * "Oi Zappy, meu nome é Pedro e quero um jogo de dragão" virava um 422 com a frase do tutor
 * ("voltar para a dúvida de programação"), "placar até 9999 9999" virava telefone e "o boneco
 * faz uma bomba" (Bomberman) reprovava a resposta inteira do modelo. A régua daqui:
 * - dado pessoal é REDIGIDO só no trecho (o nome, o número), e a mensagem segue;
 * - "fora de programação" não existe: ideia de jogo é o assunto;
 * - só o que é inseguro DE VERDADE continua recusado (troca de contato, segredo com adulto,
 *   pedido de foto, conteúdo sexual, violência contra pessoas reais, arma de verdade), com
 *   uma frase do Pensa, curta e de criança.
 */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu
/** CPF só com a pontuação: onze dígitos soltos são pontuação de jogo com a mesma frequência. */
const CPF_RE = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g
const BIRTH_DATE_RE = /\b(?:0?[1-9]|[12]\d|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}\b/g
const CEP_RE = /\b\d{5}-\d{3}\b/g
/**
 * Telefone com cara de telefone: DDD presente. O regex largo do tutor casava QUALQUER par de
 * blocos de quatro dígitos ("placar até 9999 9999"). Número sem DDD só é telefone quando vem
 * com o rótulo ("meu zap é 99999-8888"), e quem pega esse caso é o `LABELED_RE`.
 */
const PHONE_RE = /(?<!\d)(?:\+?55[\s.-]*)?\(?[1-9]\d\)?[\s.-]*9?\d{4}[\s.-]?\d{4}(?!\d)/g
/** "1000000000 pontos" tem o formato, mas não é telefone: número de verdade varia os dígitos. */
function looksLikePhone(candidate: string): boolean {
  return new Set(candidate.replace(/\D/g, '')).size >= 3
}
/** Um @usuário solto (o e-mail já saiu antes). */
const HANDLE_RE = /(?<![\w@])@[a-z0-9_.]{2,30}\b/giu
/**
 * O RÓTULO de um dado pessoal. O valor que vem depois é medido por `valueEnd`, e só ele sai:
 * o resto da frase é a ideia do jogo.
 */
const LABELED_RE =
  /\b(?:(?:meu|minha)\s+(nome(?:\s+completo)?|sobrenome|endere[cç]o|escola|col[eé]gio|telefone|celular|n[uú]mero|zap|whats(?:app)?|e-?mail|cidade|bairro|rua|cep|insta(?:gram)?|tiktok|discord|canal|nick|usu[aá]rio)\s*(?:(?:[eé]|fica\s+(?:em|na|no))\s+|[:=]\s*)|(me\s+chamo)\s+|(?:eu\s+)?(moro|estudo)\s+(?:na|no|em|numa|num)\s+)/giu

/** Artigo antes do valor ("minha escola é A Escola…"): não conta como palavra do valor. */
const LEADING_ARTICLE = /^(?:o|a|os|as|um|uma|na|no|em|da|do)$/iu
/** Onde o valor acaba: a conversa continua ("…Pedro E quero um jogo"). */
const VALUE_STOP =
  /^(?:e|mas|que|quero|queria|quer|eu|porque|pq|entao|então|ai|aí|pra|para|tenho|sou|gosto|adoro|amo|moro|estudo|meu|minha|um|uma|com|onde|quando|se|tambem|também|jogo|jogos|faz|fazer|vou|vai|tipo|oi|ola|olá)$/iu
/** Partícula de nome próprio ("Pedro DA Silva"). */
const NAME_PARTICLE = /^(?:de|da|do|dos|das)$/iu
/** Ponto, hífen e apóstrofo só por DENTRO da palavra ("99999-8888"): o ponto final é da frase. */
const WORD = /^[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/u
const PUNCTUATION = /^[,.;!?()\n]/u

type LabelKind = 'nome' | 'local' | 'escola' | 'telefone' | 'e-mail' | 'rede social'

function labelKind(field: string | undefined, verb: string | undefined): LabelKind {
  const value = (field ?? verb ?? '').toLowerCase()
  if (/nome|chamo/.test(value)) return 'nome'
  if (/escola|col[eé]gio|estudo/.test(value)) return 'escola'
  if (/telefone|celular|n[uú]mero|zap|whats/.test(value)) return 'telefone'
  if (/mail/.test(value)) return 'e-mail'
  if (/insta|tiktok|discord|canal|nick|usu/.test(value)) return 'rede social'
  return 'local'
}

const PLACEHOLDER: Record<LabelKind, string> = {
  nome: '[nome removido]',
  local: '[local removido]',
  escola: '[escola removida]',
  telefone: '[telefone removido]',
  'e-mail': '[e-mail removido]',
  'rede social': '[rede social removida]',
}

/**
 * Onde termina o valor de um dado rotulado, a partir de `start`. Pula o artigo, pega a primeira
 * palavra sempre e segue enquanto parecer o mesmo dado: um NOME que começa com maiúscula segue
 * só em palavras com maiúscula (ou "da/de/do" antes de uma delas); escrito todo em minúsculas,
 * segue até a palavra que retoma a conversa. Para em pontuação e no teto de palavras.
 */
function valueEnd(text: string, start: number, kind: LabelKind): number {
  const maxWords = kind === 'nome' ? 5 : 6
  let cursor = start
  let end = start
  let taken = 0
  let properNoun: boolean | null = null
  while (taken < maxWords) {
    const spaces = /^[ \t]*/.exec(text.slice(cursor))?.[0] ?? ''
    const rest = text.slice(cursor + spaces.length)
    if (!rest || PUNCTUATION.test(rest)) break
    const word = WORD.exec(rest)?.[0]
    if (!word) break
    const at = cursor + spaces.length
    if (taken === 0 && end === start && LEADING_ARTICLE.test(word)) {
      cursor = at + word.length
      continue
    }
    if (taken > 0) {
      if (VALUE_STOP.test(word) && !(properNoun && NAME_PARTICLE.test(word))) break
      if (properNoun) {
        const capitalized = /^\p{Lu}/u.test(word) || /^\d/.test(word)
        if (!capitalized && !NAME_PARTICLE.test(word)) break
        if (NAME_PARTICLE.test(word)) {
          // A partícula só entra se o nome continua depois dela ("da Silva"), nunca no fim.
          const next = /^[ \t]+([\p{L}\p{N}]+)/u.exec(text.slice(at + word.length))?.[1]
          if (!next || !/^\p{Lu}/u.test(next)) break
        }
      }
    } else if (VALUE_STOP.test(word)) {
      break
    }
    if (properNoun === null) properNoun = /^\p{Lu}/u.test(word)
    taken += 1
    cursor = at + word.length
    end = cursor
  }
  return end
}

function redactLabeled(value: string, mark: () => void): string {
  let out = ''
  let last = 0
  LABELED_RE.lastIndex = 0
  for (let match = LABELED_RE.exec(value); match; match = LABELED_RE.exec(value)) {
    const labelEnd = match.index + match[0].length
    if (labelEnd < last) continue
    const kind = labelKind(match[1], match[2] ?? match[3])
    const end = valueEnd(value, labelEnd, kind)
    if (end <= labelEnd) continue
    // O valor pode já ter virado placeholder por um regex anterior ("[telefone removido]").
    const original = value.slice(labelEnd, end)
    if (original.startsWith('[')) continue
    mark()
    out += value.slice(last, labelEnd) + PLACEHOLDER[kind]
    last = end
    LABELED_RE.lastIndex = end
  }
  return out + value.slice(last)
}

/** Redige SÓ o dado pessoal da narrativa da criança. O resto da frase é a ideia do jogo. */
export function redactPensaText(value: string): { text: string; hadPii: boolean } {
  let hadPii = false
  const mark = () => {
    hadPii = true
  }
  let text = value
  const replace = (pattern: RegExp, placeholder: string) => {
    text = text.replace(pattern, () => {
      mark()
      return placeholder
    })
  }
  replace(EMAIL_RE, '[e-mail removido]')
  replace(CPF_RE, '[documento removido]')
  replace(BIRTH_DATE_RE, '[data removida]')
  replace(CEP_RE, '[local removido]')
  text = text.replace(PHONE_RE, (match) => {
    if (!looksLikePhone(match)) return match
    mark()
    return '[telefone removido]'
  })
  replace(HANDLE_RE, '[rede social removida]')
  text = redactLabeled(text, mark)
  const secrets = redactStudioTutorSecrets(text)
  return { text: secrets.text, hadPii }
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const CONTACT_TERMS =
  '(?:zap|whats(?:app)?|telefone|numero|celular|insta(?:gram)?|tiktok|discord|e-?mail|endereco)'
/** Troca de contato e encontro: nunca é ideia de jogo. */
const CONTACT_EXCHANGE = [
  new RegExp(
    `\\b(?:me (?:adiciona|add|chama|liga|segue|manda mensagem)|(?:passa|manda|me da|me de|qual (?:e )?)(?: o| a)? (?:seu|sua|teu|tua))\\b.{0,30}\\b${CONTACT_TERMS}\\b`,
  ),
  new RegExp(
    `\\b(?:vamos|bora) (?:conversar|falar|teclar) (?:no|na|pelo|pela|por) ${CONTACT_TERMS}\\b`,
  ),
  /\b(?:vamos nos encontrar|me encontra (?:na|no|em)|te encontrar pessoalmente|encontrar pessoalmente)\b/,
]
/** O que o tutor já recusava e continua inseguro numa ideia de jogo. */
const UNSAFE = [
  /\b(?:sexo|sexual|pornografia|porno|nudes?|estupro)\b/,
  /\b(?:manda|mande|envie|me mostra|mostre) (?:uma )?(?:foto|nude)\b/,
  /\b(?:nao conte|nao conta (?:pra|para) ninguem|fica em segredo|segredo nosso|esconda dos seus pais|nao fala (?:pros|para os) seus pais)\b/,
  /\bcomo (?:matar|ferir|machucar|envenenar) (?:uma pessoa|alguem|gente|uma crianca)\b/,
  /\b(?:matar|ferir|machucar|bater (?:em|no|na)) (?:meus pais|meu pai|minha mae|meu professor|minha professora|meu irmao|minha irma|meu colega|minha colega|meus colegas)\b/,
  /\b(?:fazer|montar|construir|fabricar|comprar|conseguir) (?:uma )?(?:bomba|arma) de verdade\b/,
  /\bbomba caseira\b/,
]

export const PENSA_SELF_HARM_REPLY =
  'Sinto muito que você esteja passando por isso. Fale agora com um adulto de confiança perto de você. Se houver risco, ligue 192 (SAMU). Você também pode ligar 188 (CVV), de graça, a qualquer hora.'
export const PENSA_CONTACT_REPLY =
  'Aqui a gente não troca contatos. Me conte só a ideia do seu jogo!'
export const PENSA_UNSAFE_REPLY =
  'Essa parte eu não posso ajudar a planejar. Que tal me contar outra ideia de jogo?'

/**
 * A frase do Pensa quando a mensagem é insegura de verdade; `null` quando ela segue. A régua
 * roda sobre o texto ORIGINAL (a troca de contato precisa ver "zap" e "número").
 */
export function pensaNarrativeRefusal(value: string): string | null {
  if (isZappySelfHarmText(value)) return PENSA_SELF_HARM_REPLY
  const text = normalized(value)
  if (CONTACT_EXCHANGE.some((pattern) => pattern.test(text))) return PENSA_CONTACT_REPLY
  if (UNSAFE.some((pattern) => pattern.test(text))) return PENSA_UNSAFE_REPLY
  return null
}

/** O texto PEDE um dado da criança ("qual é a sua escola?"). Falar da escola do jogo, não. */
const ASKS_PERSONAL_DATA =
  /\b(?:qual|diga|conte|envie|mande|me passa|me fala|escreva)\b.{0,25}\b(?:seu|sua|teu|tua)\b.{0,15}\b(?:nome completo|sobrenome|endereco|telefone|celular|e-?mail|escola|foto|rede social|instagram|whatsapp|zap)\b/

/** O que o modelo escreveu para a criança pode ir à tela (mesma régua da narrativa). */
export function isSafePensaText(value: string): boolean {
  if (pensaNarrativeRefusal(value)) return false
  for (const pattern of [EMAIL_RE, CPF_RE, BIRTH_DATE_RE]) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return false
  }
  if ((value.match(PHONE_RE) ?? []).some(looksLikePhone)) return false
  return !ASKS_PERSONAL_DATA.test(normalized(value))
}

// Sanitize narrative fields at the provider boundary, including data saved through older
// clients. IDs, revision strings and catalog identifiers must remain byte-for-byte intact.
const narrativeFields = new Set([
  'idea',
  'text',
  'title',
  'summary',
  'result',
  'name',
  'assetName',
  'note',
  'firstResult',
  'essentials',
  'suggestions',
  'description',
  'action',
  'expected',
  'where',
  'effect',
  'request',
  'hint',
  'builtResults',
  'question',
  'testAction',
  'steps',
])

export function privateJourneyInput(value: unknown, key = ''): unknown {
  if (typeof value === 'string')
    return narrativeFields.has(key) ? redactPensaText(value).text : value
  if (Array.isArray(value)) return value.map((item) => privateJourneyInput(item, key))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [field, privateJourneyInput(item, field)]),
    )
  return value
}
