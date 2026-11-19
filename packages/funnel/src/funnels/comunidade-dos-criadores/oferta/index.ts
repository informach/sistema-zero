import type { ComunidadeOfertaId } from './types'

/** A oferta principal cobre 5 a 17 anos; a continuidade mantém endereço próprio. */
export const COMUNIDADE_SUBPAGINAS = ['continuar'] as const
export type ComunidadeSubpagina = (typeof COMUNIDADE_SUBPAGINAS)[number]

export function isComunidadeSubpagina(value: unknown): value is ComunidadeSubpagina {
  return typeof value === 'string' && (COMUNIDADE_SUBPAGINAS as readonly string[]).includes(value)
}

/**
 * Os cinco perfis antigos e, desde 19/11/2026, criar-junto chegam à oferta unificada
 * de 5 a 17 anos por redirecionamento permanente, com a query e os cupons preservados.
 */
export const COMUNIDADE_OFERTAS_ANTIGAS = [
  'criar-junto',
  'tempo-de-tela',
  'criacao-de-jogos',
  'expressao-visual',
  'formacao-tecnologica',
  'habilidades-escolares',
] as const

export function isComunidadeOfertaAntiga(value: unknown): boolean {
  return (
    typeof value === 'string' && (COMUNIDADE_OFERTAS_ANTIGAS as readonly string[]).includes(value)
  )
}

export function comunidadeOfferPath(id: ComunidadeOfertaId): string {
  const base = '/kids/comunidade-dos-criadores/oferta'
  return id === 'continuar' ? `${base}/continuar` : base
}
