import type { MoldaModelAsset } from '../core/model'

export const MOLDA_TEMPLATE_IDS = ['personagem', 'carro', 'arvore', 'casa', 'nave'] as const
export type MoldaTemplateId = (typeof MOLDA_TEMPLATE_IDS)[number]

export interface MoldaTemplate {
  id: MoldaTemplateId
  /** Nome kebab sugerido no passo de nome. */
  suggestedName: string
  /** Modelo montado, com ids FRESCOS a cada chamada. */
  build(): MoldaModelAsset
}
