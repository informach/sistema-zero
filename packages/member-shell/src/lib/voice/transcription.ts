/**
 * Regras puras da transcrição da fala (voz → texto para a equipe), sem rede.
 *
 * Moram fora do `server/` para a sondagem (`scripts/sondar-transcricao.ts`) e os testes usarem
 * as MESMAS regras que o BFF: o formato lido dos bytes, o prompt, as palavras-chave e o filtro
 * de frases que os modelos inventam quando o áudio é silêncio.
 */

/** Formatos que o OpenRouter aceita em `input_audio.format` e que o navegador grava. */
export type SpokenAudioFormat = 'webm' | 'm4a' | 'ogg' | 'wav'

/** Teto do áudio recebido: 60 s a 64 kbps dão ~480 KB; o resto é folga para o Safari. */
export const SPOKEN_AUDIO_MAX_BYTES = 2 * 1024 * 1024

/** Menos que isso não é fala (um clique, um pedaço de cabeçalho). */
export const SPOKEN_AUDIO_MIN_BYTES = 1024

/** Teto do texto devolvido: 60 s de fala dão ~900 caracteres. */
export const SPOKEN_TEXT_MAX_CHARS = 1000

/**
 * Teto MAIOR, só para quem pede explicitamente: a ideia de jogo do Pensa (caixa de 4.000, e ela
 * revisa antes de enviar). Recados, ajuda da aula e tutor ficam nos 1000 de sempre (full review de
 * 14/10/2026: o servidor tinha tirado o teto de TODOS os formulários para servir só o Pensa).
 */
export const PENSA_SPOKEN_TEXT_MAX_CHARS = 4000

/** O cabeçalho em que o formulário pede o teto maior (só `4000` vale; o resto é o padrão). */
export const SPOKEN_MAX_CHARS_HEADER = 'x-sz-voice-max-chars'

/** O teto pedido pelo formulário: o padrão, ou o do Pensa quando pedido EXATAMENTE. */
export function spokenTextMaxChars(requested: string | null | undefined): number {
  return requested?.trim() === String(PENSA_SPOKEN_TEXT_MAX_CHARS)
    ? PENSA_SPOKEN_TEXT_MAX_CHARS
    : SPOKEN_TEXT_MAX_CHARS
}

/** Teto do contexto da aula mandado pelo navegador. */
export const SPOKEN_CONTEXT_MAX_CHARS = 200

/**
 * O formato pelos BYTES, nunca pelo MIME do navegador: o Safari grava `audio/mp4` (que o
 * OpenRouter chama de `m4a`) e o MIME pode vir com parâmetros ou faltar.
 */
export function audioFormatFromBytes(bytes: Uint8Array): SpokenAudioFormat | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
    return 'webm'
  if (ascii(bytes, 4, 8) === 'ftyp') return 'm4a'
  if (ascii(bytes, 0, 4) === 'OggS') return 'ogg'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WAVE') return 'wav'
  return null
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.subarray(from, to))
}

/**
 * Vocabulário da plataforma que a criança fala e que um modelo genérico escreve errado. Cada
 * item tem no máximo cinco palavras e nenhum `<`, `>` ou quebra de linha (o provedor recusa o
 * pedido inteiro por um item torto).
 */
export const TRANSCRIBE_KEYWORDS: readonly string[] = [
  'Zappy',
  'Estúdio',
  'Pinta',
  'Pensa',
  'Molda',
  'Mural dos Criadores',
  'Clube dos Criadores',
  'Recados',
  'sprite',
  'bloco',
  'blocos',
  'fase',
  'Mundo',
  'cenário',
  'personagem',
  'colisão',
  'pontuação',
  'placar',
  'variável',
  'gravidade',
  'plataforma',
  'pular',
  'inimigo',
  'moedas',
  'vidas',
  'Jogo 2D',
  'Jogo 3D',
  'Farol',
  'Cadê Todo Mundo',
  'Corre Dino',
  'avatar',
]

/** Limpa o contexto que veio do navegador: sem controle, sem `<>`, espaços simples, ≤200. */
export function sanitizeSpokenContext(raw: string | null | undefined): string {
  if (!raw) return ''
  // Caractere de controle e sinal de marcação viram espaço (sem regex de controle, que o lint barra).
  const clean = Array.from(raw, (ch) => {
    const code = ch.codePointAt(0) ?? 0
    return code < 0x20 || code === 0x7f || '<>{}[]\\'.includes(ch) ? ' ' : ch
  })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(clean).slice(0, SPOKEN_CONTEXT_MAX_CHARS).join('').trim()
}

/**
 * O prompt da transcrição. Ele não é uma instrução: os modelos de transcrição o usam como o
 * texto que veio ANTES da fala, então ele descreve a situação e o vocabulário provável.
 * `comVocabulario` põe as palavras-chave no texto (o modelo reserva não tem `keywords`).
 */
export function transcribePrompt(contexto?: string, comVocabulario = false): string {
  const partes = [
    'Uma criança brasileira de 8 a 13 anos fala com a equipe da plataforma onde ela cria jogos.',
    'Ela explica uma dúvida sobre o jogo que está montando, com as palavras dela.',
  ]
  const lugar = sanitizeSpokenContext(contexto)
  if (lugar) partes.push(`Ela está em: ${lugar}.`)
  if (comVocabulario) partes.push(`Palavras que ela pode usar: ${TRANSCRIBE_KEYWORDS.join(', ')}.`)
  return partes.join(' ')
}

/**
 * Frases que os modelos da família Whisper escrevem quando o áudio é silêncio ou ruído (vêm das
 * legendas de vídeo do treino). Comparadas com o texto INTEIRO, já normalizado: uma fala de
 * verdade que contenha uma delas nunca perde um pedaço.
 */
const ALUCINACOES = new Set([
  'legendas pela comunidade amara org',
  'legenda pela comunidade amara org',
  'obrigado por assistir',
  'obrigada por assistir',
  'obrigado por assistirem',
  'inscreva se no canal',
  'inscrevase no canal',
  'se inscreva no canal',
  'legenda adriana zanotto',
])

function normalizarParaComparar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** O texto é só uma alucinação conhecida (ou a assinatura do Amara.org, que nunca é fala). */
export function isHallucinatedTranscript(texto: string): boolean {
  const normal = normalizarParaComparar(texto)
  if (!normal) return true
  // A assinatura como PALAVRAS inteiras: "a Samara organizou" vira "samara organizou" e não pode cair.
  if (/(^| )amara org( |$)/.test(normal)) return true
  return ALUCINACOES.has(normal)
}

/** Espaços simples, sem bordas, cortado por caractere (um emoji não sai partido) no teto pedido. */
export function tidyTranscript(texto: string, maxChars: number = SPOKEN_TEXT_MAX_CHARS): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return Array.from(limpo).slice(0, maxChars).join('').trim()
}
