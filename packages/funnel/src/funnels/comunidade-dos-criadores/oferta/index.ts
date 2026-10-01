import { PAGE_B } from './criacao-de-jogos'
import { PAGE_C } from './expressao-visual'
import { PAGE_D } from './formacao-tecnologica'
import { PAGE_A } from './tempo-de-tela'
import type { ComunidadePage, ComunidadePageId, ComunidadeProfile } from './types'

export const COMUNIDADE_PAGES: Record<ComunidadePageId, ComunidadePage> = {
  'tempo-de-tela': PAGE_A,
  'criacao-de-jogos': PAGE_B,
  'expressao-visual': PAGE_C,
  'formacao-tecnologica': PAGE_D,
  continuar: PAGE_E,
}

export function isComunidadeProfile(value: unknown): value is ComunidadeProfile {
  return value !== 'continuar' && isComunidadePage(value)
}

export function isComunidadePage(value: unknown): value is ComunidadePageId {
  return typeof value === 'string' && Object.hasOwn(COMUNIDADE_PAGES, value)
}

export function comunidadeOfferPath(profile: ComunidadePageId): string {
  const base = '/kids/comunidade-dos-criadores/oferta'
  return profile === 'tempo-de-tela' ? base : `${base}/${profile}`
}

import { PAGE_E } from './continuidade'
