import type { ComunidadeOfertaId } from './types'

/** As subpáginas de `/oferta/<id>` (a 9 a 17 é a própria `/oferta`). */
export const COMUNIDADE_SUBPAGINAS = ['criar-junto', 'continuar'] as const
export type ComunidadeSubpagina = (typeof COMUNIDADE_SUBPAGINAS)[number]

export function isComunidadeSubpagina(value: unknown): value is ComunidadeSubpagina {
  return typeof value === 'string' && (COMUNIDADE_SUBPAGINAS as readonly string[]).includes(value)
}

/**
 * As cinco páginas de perfil que existiram até 20/10/2026. Os links antigos (resultado do quiz v5,
 * anúncios, mensagens) chegam à página de 9 a 17 por redirecionamento permanente, com a query.
 */
export const COMUNIDADE_OFERTAS_ANTIGAS = [
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
  return id === '9a17' ? base : `${base}/${id}`
}
