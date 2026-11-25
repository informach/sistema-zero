import type { OfertaDoEmbaixador } from '../content/embaixador'
import { apelidoDoProduto } from '../funnels/registry'

/**
 * Os links curtos das ofertas do painel do embaixador (25/11/2026): `/i/<código>/<apelido>` (página
 * de venda), `/pagamento` (checkout) e `/presente` (presente), com o código do público tirado do
 * link que o referrals montou (`/i/<código>/<oferta>`). Sem apelido para o produto, com o mesmo
 * produto duas vezes na lista (lista antiga, de antes da regra de uma por curso) ou com um link
 * fora do formato, fica o link do referrals.
 */
export function comLinksCurtos(offers: OfertaDoEmbaixador[]): OfertaDoEmbaixador[] {
  const vezes = new Map<string, number>()
  for (const o of offers) {
    if (!o.productSku) continue
    const chave = `${o.kind}:${o.audience}:${o.productSku}`
    vezes.set(chave, (vezes.get(chave) ?? 0) + 1)
  }
  return offers.map((o) => {
    const apelido = apelidoDoProduto(o.productSku)
    if (!apelido || vezes.get(`${o.kind}:${o.audience}:${o.productSku}`) !== 1) return o
    const base = baseDoCodigo(o.link)
    if (!base) return o
    return o.kind === 'gift'
      ? { ...o, link: `${base}/${apelido}/presente`, checkoutLink: null }
      : { ...o, link: `${base}/${apelido}`, checkoutLink: `${base}/${apelido}/pagamento` }
  })
}

/** `https://site/i/<código>/<oferta>[/pagamento]` → `https://site/i/<código>`; null fora disso. */
function baseDoCodigo(link: string): string | null {
  try {
    const url = new URL(link)
    const match = url.pathname.match(/^\/i\/([a-z0-9-]{1,64})(?:\/|$)/i)
    return match ? `${url.origin}/i/${match[1]}` : null
  } catch {
    return null
  }
}
