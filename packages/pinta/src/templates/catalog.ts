/**
 * Catálogo dos MODELOS PRONTOS ("Começar de um modelo"): cada template sabe seu
 * estilo/papel/nome sugerido e um `build()` que devolve os assets JÁ montados
 * (ids frescos = cópia independente). Um mapa vem com o tileset companheiro no
 * MESMO build (o `primaryIndex` aponta o asset principal). Sem rede, sem codec:
 * tudo é dado embutido (arte ASCII + shapes).
 */
import type { PintaAsset, PintaAssetRole, PintaAssetStyle } from '../core/project'
import { ceuComSolTemplate } from './data/ceu-com-sol'
import { chaoDeGramaTemplate } from './data/chao-de-grama'
import { fantasminhaTemplate } from './data/fantasminha'
import { fasePlataformaTemplate } from './data/fase-plataforma'
import { heroiTemplate } from './data/heroi'
import { moedaTemplate } from './data/moeda'
import { naveTemplate } from './data/nave'
import { slimeTemplate } from './data/slime'

export type PintaTemplateId =
  | 'heroi'
  | 'slime'
  | 'moeda'
  | 'nave'
  | 'chao-de-grama'
  | 'fase-plataforma'
  | 'fantasminha'
  | 'ceu-com-sol'

export interface TemplateBuildResult {
  /** Um ou mais assets (mapa vem com o tileset). Ids FRESCOS a cada chamada. */
  assets: PintaAsset[]
  /** Índice do asset PRINCIPAL (o que a criança abre). */
  primaryIndex: number
}

export interface PintaTemplate {
  id: PintaTemplateId
  /** Estilo do passo de criação (o mapa é autorado em pixel → 'pixel'). */
  style: PintaAssetStyle
  /** Papel do asset principal (filtra a lista na missão de arte do Pensa). */
  role: PintaAssetRole
  /** Nome kebab sugerido no passo de nome. */
  suggestedName: string
  build(): TemplateBuildResult
}

export const PINTA_TEMPLATES: readonly PintaTemplate[] = [
  heroiTemplate,
  slimeTemplate,
  moedaTemplate,
  naveTemplate,
  chaoDeGramaTemplate,
  fasePlataformaTemplate,
  fantasminhaTemplate,
  ceuComSolTemplate,
]

export function findTemplate(id: string): PintaTemplate | null {
  return PINTA_TEMPLATES.find((t) => t.id === id) ?? null
}
