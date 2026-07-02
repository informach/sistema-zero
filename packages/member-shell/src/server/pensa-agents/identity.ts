import 'server-only'
import { z } from 'zod'
import { sanitizeIconSvg } from '../../lib/svg-sanitize'
import { completePensaJson } from '../pensa-llm'
import { pensaSafetyClause } from './safety'

/**
 * Agente de IDENTIDADE do jogo (etapa E, funil em 3 passos):
 * 1. `suggestIdentity` — 3 nomes + 4 paletas com nomes divertidos (a criança escolhe
 *    ou inventa o próprio nome). Nada é salvo aqui.
 * 2. `generateIcons` — 3 ícones SVG simples (formas chapadas, SEM texto) na paleta
 *    escolhida; cada um passa pelo `sanitizeIconSvg` (allowlist) — só sobreviventes
 *    voltam. Nada é salvo.
 * 3. O SAVE é da rota (`pensa-ai.ts`): sanitiza de novo e grava o artefato
 *    `identity {name, palette, iconSvg}`.
 *
 * Cortados do kids (decisão de produto): tipografia, tokens shadcn, logo composto,
 * favicon .ico — ficam para o modo adulto.
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/

const SuggestionsSchema = z.object({
  names: z.array(z.string()),
  palettes: z.array(
    z.object({
      name: z.string(),
      colors: z.array(z.string()),
    }),
  ),
})

const SUGGESTIONS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['names', 'palettes'],
  properties: {
    names: { type: 'array', items: { type: 'string' } },
    palettes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'colors'],
        properties: {
          name: { type: 'string' },
          colors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const

export interface IdentitySuggestions {
  names: string[]
  palettes: Array<{ name: string; colors: string[] }>
}

/** Passo 1: nomes + paletas a partir da ideia clarificada. */
export async function suggestIdentity(input: {
  mode: 'kids' | 'adult'
  projectName: string
  ideaText: string
}): Promise<IdentitySuggestions> {
  const system = [
    pensaSafetyClause(input.mode),
    `Você sugere a identidade visual de um jogo criado por uma criança.
Responda com:
- names: exatamente 3 sugestões de NOME para o jogo — curtos (1 a 3 palavras), divertidos, fáceis de lembrar, em português (nome próprio inventado é ok). NUNCA use marca registrada.
- palettes: exatamente 4 paletas de cores que combinam com o tema do jogo. Cada paleta tem um nome divertido em português (ex.: "Floresta Radical", "Espaço Neon") e 5 cores em hex (#RRGGBB): fundo, cor principal, cor de destaque, e 2 de apoio. Cores vivas e alegres, com bom contraste entre fundo e principal.`,
  ].join('\n\n')

  const raw = await completePensaJson({
    system,
    user: `Nome provisório: "${input.projectName}". Ideia do jogo: ${input.ideaText}`,
    schema: SuggestionsSchema,
    jsonSchema: SUGGESTIONS_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'pensa_identity_suggestions',
    maxTokens: 900,
    temperature: 0.8,
  })
  // Clamps + validação de hex em código (strict schema não cobre formato/tamanho).
  const names = raw.names
    .map((n) => n.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 3)
  const palettes = raw.palettes
    .map((p) => ({
      name: p.name.trim().slice(0, 40),
      colors: p.colors.filter((c) => HEX_RE.test(c.trim())).map((c) => c.trim()),
    }))
    .filter((p) => p.name && p.colors.length >= 4)
    .slice(0, 4)
  if (names.length === 0 || palettes.length === 0) {
    throw new Error('Sugestões de identidade fora do contrato')
  }
  return { names, palettes }
}

const IconsSchema = z.object({ icons: z.array(z.string()) })
const ICONS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['icons'],
  properties: { icons: { type: 'array', items: { type: 'string' } } },
} as const

/** Passo 2: 3 ícones SVG na paleta escolhida — devolve SÓ os que passam na allowlist. */
export async function generateIcons(input: {
  mode: 'kids' | 'adult'
  gameName: string
  ideaText: string
  palette: { name: string; colors: string[] }
}): Promise<string[]> {
  const system = [
    pensaSafetyClause(input.mode),
    `Você desenha ÍCONES de jogo em SVG. Regras TÉCNICAS estritas:
- Responda com icons: exatamente 3 strings, cada uma um documento SVG completo e DIFERENTE.
- Cada SVG: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"> ... </svg>, no máximo 6000 caracteres.
- SOMENTE estes elementos: svg, g, path, circle, rect, ellipse, line, polyline, polygon, defs, linearGradient, radialGradient, stop.
- PROIBIDO: text, image, use, script, style, class, animação, href, filtros. Sem atributos on*.
- Estilo: formas chapadas e simples (flat), silhueta clara do tema do jogo, legível PEQUENO (vira o ícone do card). Fundo = um rect cobrindo o viewBox com cantos arredondados (rx 24).
- Use SOMENTE as cores desta paleta (hex exatos): ${input.palette.colors.join(', ')}.`,
  ].join('\n\n')

  const raw = await completePensaJson({
    system,
    user: `Jogo: "${input.gameName}". Ideia: ${input.ideaText.slice(0, 600)}. Desenhe 3 opções de ícone.`,
    schema: IconsSchema,
    jsonSchema: ICONS_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'pensa_identity_icons',
    maxTokens: 8_000,
    temperature: 0.7,
  })
  const survivors: string[] = []
  for (const candidate of raw.icons.slice(0, 3)) {
    const clean = sanitizeIconSvg(candidate)
    if (clean) survivors.push(clean)
  }
  return survivors
}
