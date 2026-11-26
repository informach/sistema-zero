import { comunidadeAdultoContinuarUrl } from '@sistemazero/member-shell/lib/adult-links'

/** Oferta de continuidade para famílias que já conhecem a plataforma (página pública). */
export const COMUNIDADE_OFERTA_URL =
  'https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta/continuar'
/** Apresentação pública do programa; a inscrição continua na conta do adulto. */
export const EMBAIXADORES_URL = new URL('/kids/embaixadores', COMUNIDADE_OFERTA_URL).href
/** A Política de Privacidade do Kids (publicada pelo funil). */
export const POLITICA_PRIVACIDADE_URL = new URL('/kids/privacidade', COMUNIDADE_OFERTA_URL).href

/** O mesmo trio de UTM em todo link que sai do app; `origem` diz de qual tela ele saiu. */
function comOrigem(base: string, origem: string): string {
  const url = new URL(base)
  url.searchParams.set('utm_source', 'plataforma')
  url.searchParams.set('utm_medium', 'app')
  url.searchParams.set('utm_content', origem)
  return url.href
}

/**
 * O botão da plataforma que levou à página de venda (`?lugar=`, 25/11/2026): o funil grava o
 * lugar no cookie de origem e ele chega à Origem das vendas no Admin. Endereço que não é URL
 * completa volta como veio.
 */
export type PlatformPlace = 'crianca-curso-fechado' | 'crianca-produto-fechado'
export function comLugar(href: string, lugar: PlatformPlace): string {
  try {
    const url = new URL(href)
    url.searchParams.set('lugar', lugar)
    return url.href
  } catch {
    return href
  }
}

/**
 * A página de continuidade da Comunidade dos Criadores Kids, com a tela de origem no
 * `utm_content` (ex.: `ferramenta-pinta`, `pais-assinatura`).
 */
export function comunidadeContinuarUrl(origem: string): string {
  return comOrigem(COMUNIDADE_OFERTA_URL, origem)
}

/**
 * A página de continuidade da área adulta (conta própria, para quem fez 18 anos), com a tela de
 * origem no `utm_content`. A URL e o UTM são os do app adulto (`member-shell/lib/adult-links`):
 * uma fonte só para os dois apps.
 */
export function areaAdultaContinuarUrl(origem: string): string {
  return comunidadeAdultoContinuarUrl(origem)
}
