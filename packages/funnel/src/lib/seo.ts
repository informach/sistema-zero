// Metadados de compartilhamento (Open Graph) por funil. A imagem de share é a MESMA
// capa que aparece no checkout (`checkoutImage`), resolvida em URL ABSOLUTA (redes
// sociais exigem absoluta). Cada funil tem a sua; sem isto o compartilhamento cai no
// favicon. Client-safe (só monta uma URL a partir do FunnelDef).
import type { FunnelDef } from '../funnels/registry'

/** URL absoluta da imagem de compartilhamento (og:image) do funil = a capa do checkout. */
export function funnelOgImage(f: FunnelDef, site: URL | string): string {
  const path = `${f.imagesBase}/${f.checkoutImage ?? 'produto-capa.webp'}`
  return new URL(path, site).toString()
}
