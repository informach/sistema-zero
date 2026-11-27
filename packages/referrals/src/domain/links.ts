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
 * Segmento final que leva direto ao pagamento. É reservado: nenhuma oferta pode se chamar
 * assim no link (o funil lê `/i/<code>/pagamento` como "a campanha, direto ao pagamento").
 */
export const CHECKOUT_SEGMENT = 'pagamento'

/**
 * Link de indicação (25/11/2026): `/i/<code>` (a campanha, que já sabe a oferta) ou
 * `/i/<code>/<oferta>` (o embaixador escolhendo uma oferta da lista), com `/pagamento` para ir
 * direto ao checkout. O funil resolve no referrals e redireciona para a página certa.
 * ⚠️ Código de embaixador sempre leva a oferta: `checkout` sem oferta só vale para campanha.
 */
export function referralLinkUrl(
  funnelPublicUrl: string,
  code: string,
  options: {
    offerSlug?: string | null
    checkout?: boolean
    /**
     * O tipo da lista (27/11/2026): a oferta única de um curso pode ser venda e presente, e o link
     * por slug precisa dizer qual (`?tipo=presente|indicacao`). Só com `offerSlug` e sem checkout.
     */
    kind?: 'gift' | 'referral'
  } = {},
): string {
  if (options.offerSlug === CHECKOUT_SEGMENT)
    throw new Error(`"${CHECKOUT_SEGMENT}" é reservado no link de indicação`)
  const parts = [funnelBase(funnelPublicUrl), 'i', encodeURIComponent(code)]
  if (options.offerSlug) parts.push(encodeURIComponent(options.offerSlug))
  if (options.checkout) parts.push(CHECKOUT_SEGMENT)
  const url = parts.join('/')
  if (!options.kind || !options.offerSlug || options.checkout) return url
  return `${url}?tipo=${options.kind === 'gift' ? 'presente' : 'indicacao'}`
}
