/**
 * Catálogo dos MODELOS PRONTOS ("Modelos prontos" no Criar novo): cada template
 * sabe o nome sugerido e um `build()` que devolve o modelo JÁ montado (ids
 * frescos = cópia independente). Sem rede, sem codec: tudo é dado embutido
 * (peças na grade + arte ASCII das peles). Só modelos na v1: textura e céu já
 * nascem prontos pelos presets do próprio "Criar novo".
 */
import { arvoreTemplate } from './data/arvore'
import { carroTemplate } from './data/carro'
import { casaTemplate } from './data/casa'
import { naveTemplate } from './data/nave'
import { personagemTemplate } from './data/personagem'
import type { MoldaTemplate } from './types'

export { MOLDA_TEMPLATE_IDS, type MoldaTemplate, type MoldaTemplateId } from './types'

export const MOLDA_TEMPLATES: readonly MoldaTemplate[] = [
  personagemTemplate,
  carroTemplate,
  arvoreTemplate,
  casaTemplate,
  naveTemplate,
]

export function findTemplate(id: string): MoldaTemplate | null {
  return MOLDA_TEMPLATES.find((template) => template.id === id) ?? null
}
