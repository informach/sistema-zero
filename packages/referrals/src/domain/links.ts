/**
 * Dono ÚNICO dos links do funil que o referrals emite. O shape
 * (`/embaixador/<token>` e `/bolsa/<code>`) é CONTRATO com as landings — um
 * ponto de construção esquecido numa mudança de path viraria capability-URL
 * morta em e-mail, e link morto tranca o embaixador para fora da própria
 * página. Todo produtor (admin service, invites, rotas me/internal, sweep)
 * passa por aqui.
 */

export function funnelBase(funnelPublicUrl: string): string {
  return funnelPublicUrl.replace(/\/$/, '')
}

/** Capability-URL da página do embaixador (magic-link do e-mail). */
export function ambassadorPageUrl(funnelPublicUrl: string, pageToken: string): string {
  return `${funnelBase(funnelPublicUrl)}/embaixador/${pageToken}`
}

/** Link de bolsa que o embaixador compartilha. */
export function scholarshipShareUrl(funnelPublicUrl: string, code: string): string {
  return `${funnelBase(funnelPublicUrl)}/bolsa/${code}`
}
