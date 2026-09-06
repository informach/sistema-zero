import type { CatalogClient, OfferSnapshot } from '../../domain/ports/clients.port'

/**
 * Cliente da leitura pública do catalog — `GET /catalog/offers/:id` (aceita
 * slug OU UUID; o consumer só conhece o `metadata.offerId` do pagamento).
 * Porte do client do fiscal; aqui o que importa é o SLUG (classifica a oferta
 * contra a allowlist de conversão). 404 → null.
 */
export class CatalogHttpClient implements CatalogClient {
  constructor(private readonly opts: { baseUrl: string; timeoutMs: number }) {}

  async getOfferById(offerId: string): Promise<OfferSnapshot | null> {
    const res = await fetch(`${this.opts.baseUrl}/catalog/offers/${encodeURIComponent(offerId)}`, {
      signal: AbortSignal.timeout(this.opts.timeoutMs),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`catalog respondeu ${res.status}`)

    const body = (await res.json()) as Record<string, unknown>
    const id = typeof body.id === 'string' ? body.id : offerId
    const slug = typeof body.slug === 'string' ? body.slug : ''
    const name = typeof body.name === 'string' ? body.name : ''
    if (!slug) throw new Error('catalog: slug ausente na view da oferta')
    return { id, slug, name }
  }
}
