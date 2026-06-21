import 'server-only'
import { getEnv } from '../lib/env'

/** Teto da descrição (≤1 parágrafo numa parede infantil). */
const MAX_DESCRIPTION = 280
const TIMEOUT_MS = 12_000

export interface DescribeProjectInput {
  /** Os 3 arquivos canônicos do projeto (já clampados pelo handler). */
  files: { html?: string; css?: string; js?: string }
  title?: string
}

export interface DescribeProjectResult {
  /** Descrição PT curta; vazia quando a IA não está disponível/falhou. */
  description: string
  /** `true` quando caiu no fallback (sem chave / erro / vazio) → a criança escreve. */
  fallback: boolean
}

// Cláusula de segurança infantil — sempre no system. Espelha o espírito do painel
// de IA do Studio, porém com a chave NO SERVIDOR (a criança não tem BYOK).
const SYSTEM_PROMPT = [
  'Você descreve jogos e programas feitos por CRIANÇAS de 8 a 13 anos para uma vitrine pública.',
  'Escreva em português do Brasil, tom alegre e simples, na 3ª pessoa ("Este jogo...").',
  'UM parágrafo curto (no máximo 2 frases, ~280 caracteres).',
  'Descreva o que o jogo FAZ e como se joga.',
  'NUNCA inclua nomes de pessoas, dados pessoais, links, palavrões ou conteúdo assustador.',
  'Não invente recursos que não estão no código. Não use markdown nem emojis em excesso.',
].join(' ')

/** Limpa a saída do modelo: sem markdown/HTML, espaços normais, ≤280 no limite de palavra. */
function sanitize(raw: string): string {
  let s = raw.trim()
  // Tira blocos/aspas de código, marcadores de markdown, `<` `>` e colapsa espaços.
  s = s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`#>]+/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length <= MAX_DESCRIPTION) return s
  // Trunca no último espaço antes do limite (não corta palavra no meio).
  const cut = s.slice(0, MAX_DESCRIPTION)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()
}

/**
 * Gera um rascunho curto da descrição do projeto via OpenRouter (chave NO
 * SERVIDOR). FAIL-SOFT: sem chave, timeout, não-2xx ou resposta vazia → devolve
 * `{ description: '', fallback: true }` — a publicação NUNCA depende da IA.
 */
export async function generateProjectDescription(
  input: DescribeProjectInput,
): Promise<DescribeProjectResult> {
  const env = getEnv()
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) return { description: '', fallback: true }

  const user = [
    input.title ? `Título do projeto: ${input.title}` : '',
    input.files.html ? `HTML:\n${input.files.html}` : '',
    input.files.css ? `CSS:\n${input.files.css}` : '',
    input.files.js ? `JS:\n${input.files.js}` : '',
    'Descreva este projeto em um parágrafo curto.',
  ]
    .filter(Boolean)
    .join('\n\n')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Sistema Zero Studio',
        ...(env.OPENROUTER_REFERER ? { 'HTTP-Referer': env.OPENROUTER_REFERER } : {}),
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: user },
        ],
        temperature: 0.5,
        max_tokens: 160,
      }),
      signal: controller.signal,
    })
    if (!res.ok) return { description: '', fallback: true }
    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[]
    }
    const content = data.choices?.[0]?.message?.content
    const text = typeof content === 'string' ? sanitize(content) : ''
    return text ? { description: text, fallback: false } : { description: '', fallback: true }
  } catch {
    return { description: '', fallback: true }
  } finally {
    clearTimeout(timer)
  }
}
