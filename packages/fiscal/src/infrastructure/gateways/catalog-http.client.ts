import type { CatalogClient, OfferSnapshot } from '../../domain/ports/clients.port'

/**
 * Cliente da leitura pública do catalog — `GET /catalog/offers/:id` (a rota
 * aceita slug OU UUID desde 06/2026; o fiscal só conhece o `metadata.offerId`).
 * Rota pública: sem token. 404 (incl. draft) → null.
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
    const name = typeof body.name === 'string' ? body.name : ''
    const guaranteeDays = parseGuaranteeDays(body.guaranteeDays)
    // O nome do PRODUTO principal (discriminação da nota) vem em product.name;
    // fallback no nome da oferta (parse defensivo contra drift).
    const product = body.product as { name?: unknown } | undefined
    const productName = typeof product?.name === 'string' ? product.name : null

    return { id, name, productName, guaranteeDays }
  }
}

function parseGuaranteeDays(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 365) {
    return value
  }
  throw new Error('catalog: guaranteeDays inválido na view')
}
