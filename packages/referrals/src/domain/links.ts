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

/**
 * Link de bolsa antigo (`/bolsa/<code>`). Continua valendo para sempre (os e-mails e as
 * mensagens já enviados o citam); desde 25/11/2026 o funil o redireciona para a página da
 * oferta no modo presente. Links novos saem por `referralLinkUrl`.
 */
export function scholarshipShareUrl(funnelPublicUrl: string, code: string): string {
  return `${funnelBase(funnelPublicUrl)}/bolsa/${code}`
}

/**
 * Link de indicação (25/11/2026): `/i/<code>` (a campanha, que já sabe a oferta) ou
 * `/i/<code>/<oferta>` (o embaixador escolhendo uma oferta da lista), com `/pagamento` para ir
 * direto ao checkout. O funil resolve no referrals e redireciona para a página certa.
 */
export function referralLinkUrl(
  funnelPublicUrl: string,
  code: string,
  options: { offerSlug?: string | null; checkout?: boolean } = {},
): string {
  const parts = [funnelBase(funnelPublicUrl), 'i', code]
  if (options.offerSlug) parts.push(options.offerSlug)
  if (options.checkout) parts.push('pagamento')
  return parts.join('/')
}
