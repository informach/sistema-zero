/**
 * Sonda a transcrição pelo OpenRouter com gravações LOCAIS (nunca voz de criança).
 *
 * Mostra, lado a lado, o que o modelo principal devolve com e sem o prompt e as palavras-chave, e
 * o que a reserva devolve, na MESMA configuração do servidor. Serve para conferir o vocabulário
 * antes de mexer no prompt (gravações de adultos da equipe imitando dúvidas reais).
 *
 *   bun --env-file=../community-kids/.env scripts/sondar-transcricao.ts fala.webm fala.m4a
 *
 * A chave vem de `OPENROUTER_API_KEY` e nunca é impressa.
 */
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import {
  audioFormatFromBytes,
  TRANSCRIBE_KEYWORDS,
  transcribePrompt,
} from '../src/lib/voice/transcription'

const ENDPOINT = 'https://openrouter.ai/api/v1/audio/transcriptions'

const key = process.env.OPENROUTER_API_KEY
if (!key) {
  console.error('OPENROUTER_API_KEY ausente (passe --env-file).')
  process.exit(1)
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Uso: bun scripts/sondar-transcricao.ts <arquivo> [arquivo…]')
  process.exit(1)
}

type Variant = { label: string; body: (data: string, format: string) => Record<string, unknown> }

// A configuração que o servidor usa (`server/openrouter-transcribe.ts`): `deny` sem `zdr` (com
// ele o OpenRouter não acha rota para os modelos da OpenAI, sondagem de 14/10/2026).
const contexto = 'Farol · O sprite na plataforma'
const variants: Variant[] = [
  {
    label: 'gpt-transcribe, sem dicas',
    body: (data, format) => ({
      model: 'openai/gpt-transcribe',
      input_audio: { data, format },
      language: 'pt',
      temperature: 0,
      provider: { data_collection: 'deny' },
    }),
  },
  {
    label: 'gpt-transcribe, prompt + keywords (o principal do servidor)',
    body: (data, format) => ({
      model: 'openai/gpt-transcribe',
      input_audio: { data, format },
      language: 'pt',
      temperature: 0,
      provider: {
        data_collection: 'deny',
        options: {
          openai: { prompt: transcribePrompt(contexto), keywords: [...TRANSCRIBE_KEYWORDS] },
        },
      },
    }),
  },
  {
    label: 'gpt-4o-mini-transcribe, vocabulário no prompt (a reserva do servidor)',
    body: (data, format) => ({
      model: 'openai/gpt-4o-mini-transcribe',
      input_audio: { data, format },
      language: 'pt',
      temperature: 0,
      provider: {
        data_collection: 'deny',
        options: { openai: { prompt: transcribePrompt(contexto, true) } },
      },
    }),
  },
]

for (const file of files) {
  const bytes = new Uint8Array(await readFile(file))
  const format = audioFormatFromBytes(bytes)
  console.log(
    `\n=== ${basename(file)} (${bytes.length} bytes, formato ${format ?? 'desconhecido'})`,
  )
  if (!format) continue
  const data = Buffer.from(bytes).toString('base64')
  for (const variant of variants) {
    const started = Date.now()
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': 'Sistema Zero (sondagem de transcricao)',
      },
      body: JSON.stringify(variant.body(data, format)),
    })
    const ms = Date.now() - started
    const raw = await res.text()
    let parsed: { text?: string; usage?: { cost?: number }; error?: { message?: string } } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      // resposta não-JSON: mostra o começo do corpo abaixo
    }
    console.log(`\n-- ${variant.label}: HTTP ${res.status} em ${ms} ms`)
    if (res.ok) {
      console.log(`   custo: ${parsed.usage?.cost ?? '?'}`)
      console.log(`   texto: ${parsed.text ?? '(vazio)'}`)
    } else {
      console.log(`   erro: ${parsed.error?.message ?? raw.slice(0, 300)}`)
    }
  }
}
