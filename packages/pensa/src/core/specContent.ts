/**
 * Conteúdo dos artefatos da ETAPA E (contrato "Shapes de CONTEÚDO"):
 * `friendly_spec` = { flows, screens } (tirinhas + wireframes) e `identity` =
 * { name, palette, iconSvg }. Módulo PURO: schemas zod + parsers seguros
 * (o `content` chega como unknown do transport) — nada de rede/estado aqui.
 */
import { z } from 'zod'

export const SCREEN_ELEMENT_KINDS = [
  'title',
  'button',
  'score',
  'hero',
  'enemy',
  'item',
  'background',
  'text',
] as const
export type PensaScreenElementKind = (typeof SCREEN_ELEMENT_KINDS)[number]

export const SCREEN_ZONES = ['top', 'middle', 'bottom'] as const
export type PensaScreenZone = (typeof SCREEN_ZONES)[number]

const flowSchema = z.object({
  id: z.string(),
  title: z.string(),
  input: z.string(),
  processing: z.string(),
  output: z.string(),
  screens: z.array(z.string()),
})

const screenElementSchema = z.object({
  kind: z.enum(SCREEN_ELEMENT_KINDS),
  label: z.string(),
  zone: z.enum(SCREEN_ZONES),
})

const screenSchema = z.object({
  name: z.string(),
  elements: z.array(screenElementSchema),
})

const friendlySpecContentSchema = z.object({
  flows: z.array(flowSchema),
  screens: z.array(screenSchema),
})

export type PensaSpecFlow = z.infer<typeof flowSchema>
export type PensaScreenElement = z.infer<typeof screenElementSchema>
export type PensaSpecScreen = z.infer<typeof screenSchema>
export type PensaFriendlySpecContent = z.infer<typeof friendlySpecContentSchema>

/** Extrai o conteúdo do friendly_spec (unknown) com segurança (malformado → null). */
export function parseFriendlySpecContent(content: unknown): PensaFriendlySpecContent | null {
  const result = friendlySpecContentSchema.safeParse(content)
  return result.success ? result.data : null
}

const paletteSchema = z.object({ name: z.string(), colors: z.array(z.string()) })

const identityContentSchema = z.object({
  name: z.string(),
  palette: paletteSchema,
  iconSvg: z.string().nullable(),
})

export type PensaIdentityPalette = z.infer<typeof paletteSchema>
export type PensaIdentityContent = z.infer<typeof identityContentSchema>

/** Extrai o conteúdo do identity (unknown) com segurança (malformado → null). */
export function parseIdentityContent(content: unknown): PensaIdentityContent | null {
  const result = identityContentSchema.safeParse(content)
  return result.success ? result.data : null
}

/** Resposta do generate `{type:'identity', step:'suggestions'}` (nada é salvo). */
export interface PensaIdentitySuggestions {
  names: string[]
  palettes: PensaIdentityPalette[]
}
