import { z } from 'zod'

export const artRecipeIdSchema = z.enum([
  'cdc-cover-v1',
  'cdc-evidence-v1',
  'cdc-comparison-v1',
  'cdc-quote-v1',
])
export type ArtRecipeId = z.infer<typeof artRecipeIdSchema>
/** Curated from the team's P01/P07/P34 montagens. Labels require explicit recipe selection. */
export const ART_RECIPES: Record<ArtRecipeId, { label: string; guidance: string }> = {
  'cdc-cover-v1': {
    label: 'Comunidade · abertura',
    guidance:
      'Abertura tipográfica forte. Use a copy inteira, sem acrescentar uma promessa. Imagem de apoio é opcional.',
  },
  'cdc-evidence-v1': {
    label: 'Comunidade · demonstração',
    guidance:
      'Copy acima de uma captura real, com contain para não cortar controles, vida ou placar. Use somente o arquivo referenciado.',
  },
  'cdc-comparison-v1': {
    label: 'Comunidade · comparação',
    guidance:
      'Duas imagens reais em colunas, ou empilhadas quando a leitura exigir. Preserve antes/depois e não invente rótulos ou resultados.',
  },
  'cdc-quote-v1': {
    label: 'Comunidade · relato',
    guidance:
      'Copy em painel claro com destaque azul. Preserve literalmente falas e atribuições; não crie aspas, nomes ou resultados.',
  },
}
export const CDC_ART_LABELS = ['CRIE COM HELENA E JÚLIO', 'COMUNIDADE DOS CRIADORES'] as const
