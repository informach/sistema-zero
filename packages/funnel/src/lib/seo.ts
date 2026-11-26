// Metadados de compartilhamento (Open Graph) do funil. Regra única desde 26/11/2026: toda página
// manda um cartão JPEG 1200×630 em URL ABSOLUTA, com tipo, largura, altura e texto alternativo. O
// WhatsApp não mostra a prévia de WebP com segurança (as capas do checkout são WebP), e sem largura
// e altura algumas redes só desenham a imagem na segunda vez. Cada funil tem o seu cartão em
// `${imagesBase}/compartilhar.jpg` (gerado por `scripts/gerar-cartoes-compartilhar.ts` a partir da
// capa); página sem cartão próprio usa o do site (`/img/compartilhar.jpg`, a foto de Helena e Júlio).
// Client-safe (só monta URLs a partir do FunnelDef).
import type { FunnelDef } from '../funnels/registry'

/** O nome do cartão de compartilhamento dentro da pasta de imagens de cada funil. */
export const SHARE_IMAGE_FILE = 'compartilhar.jpg'
/** O cartão do site, para páginas sem cartão próprio (bio, presente, embaixador). */
export const DEFAULT_SHARE_IMAGE = `/img/${SHARE_IMAGE_FILE}`
export const SHARE_IMAGE_WIDTH = 1200
export const SHARE_IMAGE_HEIGHT = 630

/** URL absoluta do cartão de compartilhamento (og:image) do funil. */
export function funnelOgImage(f: FunnelDef, site: URL | string): string {
  return new URL(`${f.imagesBase}/${SHARE_IMAGE_FILE}`, site).toString()
}

/** O tipo MIME da imagem pela extensão (o `og:image:type`). */
export function shareImageType(url: string): string | null {
  const path = new URL(url, 'https://x.invalid').pathname.toLowerCase()
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webp')) return 'image/webp'
  return null
}

/** É um cartão do funil (1200×630)? Só então a página declara largura e altura. */
export function isShareCard(url: string): boolean {
  return new URL(url, 'https://x.invalid').pathname.endsWith(`/${SHARE_IMAGE_FILE}`)
}
